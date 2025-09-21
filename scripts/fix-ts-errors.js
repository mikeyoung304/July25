#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common TypeScript error fixes
const fixes = [
  // Fix unused vars by prefixing with underscore
  {
    pattern: /^(\s*)(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm,
    replacement: (match, indent, keyword, varName, offset, str) => {
      // Check if this var is used later in the file
      const afterVar = str.substring(offset + match.length);
      const varRegex = new RegExp(`\\b${varName}\\b`);
      if (!varRegex.test(afterVar) && !varName.startsWith('_')) {
        return `${indent}${keyword} _${varName} =`;
      }
      return match;
    },
    description: 'Prefix unused variables with underscore'
  },

  // Fix optional property assignments
  {
    pattern: /:\s*(string|number|boolean)\s*\|\s*undefined/g,
    replacement: '?: $1',
    description: 'Convert union with undefined to optional property'
  },

  // Fix property access from index signature
  {
    pattern: /process\.env\.([A-Z_]+)/g,
    replacement: "process.env['$1']",
    description: 'Use bracket notation for env vars'
  },

  // Fix @ts-ignore comments
  {
    pattern: /\/\/\s*@ts-ignore/g,
    replacement: '// @ts-expect-error - TODO: Fix typing',
    description: 'Replace @ts-ignore with @ts-expect-error'
  }
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const fix of fixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      console.log(`  Applied: ${fix.description}`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${filePath}`);
  }

  return modified;
}

// Get files to fix from command line or use defaults
const files = process.argv.slice(2);
if (files.length === 0) {
  console.log('Usage: node fix-ts-errors.js <file1> <file2> ...');
  console.log('Or use with find: find server/src -name "*.ts" -exec node fix-ts-errors.js {} \\;');
  process.exit(1);
}

let totalFixed = 0;
for (const file of files) {
  if (fs.existsSync(file) && file.endsWith('.ts')) {
    console.log(`Processing ${file}...`);
    if (fixFile(file)) {
      totalFixed++;
    }
  }
}

console.log(`\nFixed ${totalFixed} files`);