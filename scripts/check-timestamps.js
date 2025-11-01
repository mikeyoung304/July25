#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Find all markdown files
const allMarkdownFiles = glob.sync('**/*.md', {
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
