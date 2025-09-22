#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all ESLint errors in JSON format
const eslintOutput = execSync('npx eslint client server shared --format=json', {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'ignore']
}).trim();

const results = JSON.parse(eslintOutput);
const filesToFix = new Map();

// Process each file with errors
results.forEach(result => {
  if (result.errorCount === 0) return;

  const filePath = result.filePath;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fixes = [];

  result.messages.forEach(message => {
    if (message.severity !== 2) return; // Only process errors

    const line = message.line - 1; // Convert to 0-indexed
    const column = message.column - 1;

    if (message.ruleId === '@typescript-eslint/no-unused-vars') {
      const lineContent = lines[line];

      // Extract the variable name from the message
      const match = message.message.match(/'([^']+)' is (defined but never used|assigned a value but never used)/);
      if (match) {
        const varName = match[1];

        // Skip if already prefixed with underscore
        if (varName.startsWith('_')) return;

        fixes.push({
          line,
          column,
          varName,
          newName: '_' + varName
        });
      }
    }
  });

  if (fixes.length > 0) {
    filesToFix.set(filePath, { lines, fixes });
  }
});

// Apply fixes
filesToFix.forEach(({ lines, fixes }, filePath) => {
  // Sort fixes by line and column in reverse order to avoid position shifts
  fixes.sort((a, b) => {
    if (a.line !== b.line) return b.line - a.line;
    return b.column - a.column;
  });

  fixes.forEach(fix => {
    const line = lines[fix.line];

    // Create regex to match the variable name as a whole word
    const regex = new RegExp(`\\b${fix.varName}\\b`, 'g');

    // Only replace first occurrence on the line (the declaration)
    let replaced = false;
    lines[fix.line] = line.replace(regex, (match, offset) => {
      if (!replaced && offset >= fix.column - 10 && offset <= fix.column + 10) {
        replaced = true;
        return fix.newName;
      }
      return match;
    });
  });

  // Write the fixed content back
  fs.writeFileSync(filePath, lines.join('\n'));
});

