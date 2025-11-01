#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);

const issues = [];

function checkTableFormatting(filePath, content) {
  const lines = content.split('\n');
  let inTable = false;
  let inCodeBlock = false;
  let tableStartLine = -1;
  let headerColumns = 0;
  let currentTableIssues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Track code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }

    // Check if this is a table line
    if (trimmed.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableStartLine = lineNum;
        currentTableIssues = [];
      }

      // Count columns in this row
      const columns = trimmed.split('|').filter(col => col.trim() !== '');
      const columnCount = columns.length;

      // Check for missing spaces around pipes
      if (!/^\|\s/.test(trimmed) && trimmed.length > 1) {
        currentTableIssues.push(`Line ${lineNum}: Missing space after opening pipe`);
      }
      if (!/\s\|$/.test(trimmed) && trimmed.length > 1 && trimmed !== '|') {
        currentTableIssues.push(`Line ${lineNum}: Missing space before closing pipe`);
      }

      // Check for spacing around internal pipes
      const internalPipePattern = /\|[^\s|]/;
      const internalPipePattern2 = /[^\s|]\|/;
      if (internalPipePattern.test(trimmed)) {
        currentTableIssues.push(`Line ${lineNum}: Missing space after internal pipe`);
      }
      if (internalPipePattern2.test(trimmed.replace(/\|-+\|/g, ''))) {
        currentTableIssues.push(`Line ${lineNum}: Missing space before internal pipe`);
      }

      // Track header columns
      if (tableStartLine === lineNum) {
        headerColumns = columnCount;
      }

      // Check separator row (should be second row)
      if (lineNum === tableStartLine + 1) {
        const isSeparator = /^[\|\s:-]+$/.test(trimmed);
        if (!isSeparator) {
          currentTableIssues.push(`Line ${lineNum}: Missing or malformed separator row`);
        } else {
          // Check separator has correct column count
          const sepColumns = trimmed.split('|').filter(col => col.trim() !== '');
          if (sepColumns.length !== headerColumns) {
            currentTableIssues.push(`Line ${lineNum}: Separator has ${sepColumns.length} columns but header has ${headerColumns}`);
          }
        }
      }

      // Check column count consistency (skip separator row)
      if (lineNum > tableStartLine + 1) {
        if (columnCount !== headerColumns) {
          currentTableIssues.push(`Line ${lineNum}: Has ${columnCount} columns but header has ${headerColumns}`);
        }
      }

    } else if (inTable && trimmed !== '') {
      // We've exited the table
      inTable = false;

      // Report issues for this table
      if (currentTableIssues.length > 0) {
        const relativePath = path.relative(ROOT, filePath);
        issues.push({
          file: relativePath,
          startLine: tableStartLine,
          issues: currentTableIssues
        });
      }
    }
  }

  // Handle table at end of file
  if (inTable && currentTableIssues.length > 0) {
    const relativePath = path.relative(ROOT, filePath);
    issues.push({
      file: relativePath,
      startLine: tableStartLine,
      issues: currentTableIssues
    });
  }
}

let allMarkdownFiles;

// Check if file arguments were provided
if (args.length > 0) {
  // Use provided files (convert to absolute paths)
  allMarkdownFiles = args.map(f => {
    const absPath = path.isAbsolute(f) ? f : path.join(ROOT, f);
    return absPath;
  }).filter(f => fs.existsSync(f));

  if (allMarkdownFiles.length === 0) {
    console.log('✅ No valid markdown files to check');
    process.exit(0);
  }
} else {
  // Find all markdown files
  allMarkdownFiles = glob.sync('**/*.md', {
    cwd: ROOT,
    ignore: [
      'node_modules/**',
      '**/node_modules/**',
      'client/dist/**',
      'server/dist/**',
      '.vercel/**',
    ],
    absolute: true,
  });
}

console.log(`\nChecking ${allMarkdownFiles.length} markdown file(s) for table formatting issues...\n`);

for (const file of allMarkdownFiles) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  Skipping non-existent file: ${file}`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  checkTableFormatting(file, content);
}

// Report results
if (issues.length === 0) {
  console.log('✅ All tables are properly formatted!\n');
  process.exit(0);
} else {
  console.log(`❌ Found table formatting issues in ${issues.length} table(s):\n`);
  console.log('='.repeat(70));

  for (const issue of issues) {
    console.log(`\n📄 ${issue.file}`);
    console.log(`   Table starting at line ${issue.startLine}:`);
    for (const msg of issue.issues) {
      console.log(`   • ${msg}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\nTotal issues found: ${issues.reduce((sum, i) => sum + i.issues.length, 0)}`);
  console.log(`Files affected: ${issues.length}\n`);
  process.exit(1);
}
