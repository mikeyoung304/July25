#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const stagedMode = args.includes('--staged');

let allMarkdownFiles;

if (stagedMode) {
  // Get only staged markdown files from git
  try {
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(f => f.trim() !== '' && f.endsWith('.md'));
    allMarkdownFiles = stagedFiles;

    if (allMarkdownFiles.length === 0) {
      console.log('✅ No staged markdown files to check');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error getting staged files:', error.message);
    process.exit(1);
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
      'test-results/**',
      'coverage/**',
      'e2e/**',
      'examples/**',
    ],
    absolute: false,
  });
}

const missingTimestamps = [];
const hasTimestamps = [];

// Check each file for timestamp
for (const mdFile of allMarkdownFiles) {
  // Skip certain auto-generated or special files
  if (mdFile.includes('/reports/') || mdFile.includes('/scans/')) {
    continue;
  }

  const fullPath = path.join(ROOT, mdFile);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Check for "Last Updated" timestamp in various formats
  const hasTimestamp = /\*\*Last Updated:\*\*\s*\d{4}-\d{2}-\d{2}/i.test(content) ||
                      /Last Updated:\s*\d{4}-\d{2}-\d{2}/i.test(content);

  if (hasTimestamp) {
    hasTimestamps.push(mdFile);
  } else {
    missingTimestamps.push(mdFile);
  }
}

if (stagedMode) {
  // In staged mode, only warn about missing timestamps (don't block commit)
  console.log('\n=== STAGED FILES TIMESTAMP CHECK ===\n');
  console.log(`Staged markdown files: ${allMarkdownFiles.length}`);
  console.log(`Files with timestamps: ${hasTimestamps.length}`);
  console.log(`Files missing timestamps: ${missingTimestamps.length}`);

  if (missingTimestamps.length > 0) {
    console.log('\n⚠️  WARNING: Some staged files are missing timestamps:\n');
    missingTimestamps.forEach(f => console.log(`  • ${f}`));
    console.log('\nConsider adding timestamps to modified documentation files.');
    console.log('Format: **Last Updated:** YYYY-MM-DD\n');
  } else {
    console.log('\n✅ All staged files have timestamps!');
  }

  // Always exit 0 in staged mode (warning only)
  process.exit(0);
} else {
  // Full audit mode - block on missing timestamps
  console.log('\n=== TIMESTAMP AUDIT ===\n');
  console.log(`Total files: ${allMarkdownFiles.length}`);
  console.log(`Files with timestamps: ${hasTimestamps.length}`);
  console.log(`Files missing timestamps: ${missingTimestamps.length}`);

  if (missingTimestamps.length > 0) {
    console.log('\n=== FILES MISSING TIMESTAMPS ===\n');
    missingTimestamps.forEach(f => console.log(f));
    process.exit(1);
  } else {
    console.log('\n✅ All files have timestamps!');
    process.exit(0);
  }
}
