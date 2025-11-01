/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let filesFixed = 0;
let tablesFixed = 0;

function fixTableFormatting(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  let inTable = false;
  let inCodeBlock = false;
  let tableLines = [];
  let tableStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      fixedLines.push(line);
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) {
      fixedLines.push(line);
      continue;
    }

    // Check if this is a table line
    if (trimmed.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableStartIndex = i;
        tableLines = [];
      }
      tableLines.push(line);
    } else if (inTable) {
      // End of table - process and fix it
      inTable = false;
      const fixedTable = fixTable(tableLines);
      fixedLines.push(...fixedTable);
      fixedLines.push(line);
      tableLines = [];
    } else {
      fixedLines.push(line);
    }
  }

  // Handle table at end of file
  if (inTable && tableLines.length > 0) {
    const fixedTable = fixTable(tableLines);
    fixedLines.push(...fixedTable);
  }

  return fixedLines.join('\n');
}

function fixTable(tableLines) {
  if (tableLines.length === 0) return tableLines;

  const fixed = [];

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i];
    let fixedLine = line;

    // Determine if this is a separator row
    const isSeparator = /^[\s|:-]+$/.test(line.trim());

    if (isSeparator) {
      // Fix separator row
      fixedLine = fixSeparatorRow(line);
    } else {
      // Fix data/header row
      fixedLine = fixDataRow(line);
    }

    fixed.push(fixedLine);
  }

  return fixed;
}

function fixSeparatorRow(line) {
  // Extract leading/trailing whitespace
  const leadingSpace = line.match(/^(\s*)/)[1];
  const trimmed = line.trim();

  // Split by pipe, keeping empty strings
  let parts = trimmed.split('|');

  // Remove first and last if empty (typical for tables)
  if (parts[0] === '') parts.shift();
  if (parts[parts.length - 1] === '') parts.pop();

  // Clean up each separator cell
  const cleaned = parts.map(cell => {
    const c = cell.trim();
    // Ensure at least 3 dashes, preserve alignment markers
    if (c.startsWith(':') && c.endsWith(':')) {
      return ':---:';
    } else if (c.endsWith(':')) {
      return '---:';
    } else if (c.startsWith(':')) {
      return ':---';
    } else {
      return '---';
    }
  });

  return leadingSpace + '| ' + cleaned.join(' | ') + ' |';
}

function fixDataRow(line) {
  // Extract leading/trailing whitespace
  const leadingSpace = line.match(/^(\s*)/)[1];
  const trimmed = line.trim();

  // Split by pipe
  let parts = trimmed.split('|');

  // Remove first and last if empty
  if (parts[0] === '') parts.shift();
  if (parts[parts.length - 1] === '') parts.pop();

  // Trim each cell but preserve internal content
  const cleaned = parts.map(cell => cell.trim());

  return leadingSpace + '| ' + cleaned.join(' | ') + ' |';
}

// Find all markdown files
const allMarkdownFiles = glob.sync('**/*.md', {
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

console.log(`\nFixing table formatting in ${allMarkdownFiles.length} markdown files...\n`);

for (const file of allMarkdownFiles) {
  const originalContent = fs.readFileSync(file, 'utf8');

  // Only process files with tables
  if (!originalContent.includes('|')) {
    continue;
  }

  const fixedContent = fixTableFormatting(originalContent);

  // Only write if changed
  if (fixedContent !== originalContent) {
    fs.writeFileSync(file, fixedContent, 'utf8');
    filesFixed++;

    // Count tables fixed in this file
    const tableCount = (originalContent.match(/^\|/gm) || []).length;
    tablesFixed += tableCount;

    const relativePath = path.relative(ROOT, file);
    console.log(`✓ Fixed ${relativePath}`);
  }
}

console.log('\n' + '='.repeat(70));
console.log(`✅ Table formatting complete!`);
console.log(`   Files modified: ${filesFixed}`);
console.log(`   Tables fixed: ${tablesFixed}`);
console.log('='.repeat(70) + '\n');
