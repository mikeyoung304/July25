#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Files to update (passed as arguments or from list)
const filesToUpdate = process.argv.slice(2);

if (filesToUpdate.length === 0) {
  console.log('Usage: node scripts/add-timestamps.js <file1> <file2> ...');
  process.exit(1);
}

let updatedCount = 0;
let skippedCount = 0;
const updatedFiles = [];

for (const file of filesToUpdate) {
  const fullPath = path.isAbsolute(file) ? file : path.join(ROOT, file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  SKIP: ${file} does not exist`);
    skippedCount++;
    continue;
  }

  // Get last commit date for this file (content changes only)
  let gitDate;
  try {
    // Get last commit that modified this file (not just moves)
    const cmd = `git log -1 --format="%ai" --follow -- "${fullPath}"`;
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();

    if (!output) {
      console.log(`⚠️  SKIP: ${file} - no git history found`);
      skippedCount++;
      continue;
    }

    // Parse date: "2025-10-31 14:30:45 -0700" -> "2025-10-31"
    gitDate = output.split(' ')[0];
  } catch (err) {
    console.log(`⚠️  SKIP: ${file} - error reading git log: ${err.message}`);
    skippedCount++;
    continue;
  }

  // Read file content
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Check if already has timestamp
  if (/\*\*Last Updated:\*\*\s*\d{4}-\d{2}-\d{2}/i.test(content)) {
    console.log(`⚠️  SKIP: ${file} - already has timestamp`);
    skippedCount++;
    continue;
  }

  // Find where to insert timestamp (after title, before content)
  let insertIndex = 0;
  let foundTitle = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines at start
    if (!line) continue;

    // Found title (# or ##)
    if (line.match(/^#{1,2}\s+/)) {
      foundTitle = true;
      insertIndex = i + 1;
      // Skip empty lines after title
      while (insertIndex < lines.length && !lines[insertIndex].trim()) {
        insertIndex++;
      }
      break;
    }
  }

  // If no title found, insert at top
  if (!foundTitle) {
    insertIndex = 0;
  }

  // Insert timestamp
  const timestamp = `**Last Updated:** ${gitDate}`;
  lines.splice(insertIndex, 0, '', timestamp, '');

  // Write back
  const newContent = lines.join('\n');
  fs.writeFileSync(fullPath, newContent, 'utf8');

  console.log(`✅ UPDATED: ${file} (${gitDate})`);
  updatedFiles.push(file);
  updatedCount++;
}

console.log('\n=== SUMMARY ===');
console.log(`Updated: ${updatedCount}`);
console.log(`Skipped: ${skippedCount}`);
console.log(`Total: ${filesToUpdate.length}`);

if (updatedFiles.length > 0) {
  console.log('\n=== UPDATED FILES ===');
  updatedFiles.forEach(f => console.log(f));
}
