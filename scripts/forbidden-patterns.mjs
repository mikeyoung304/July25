#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const FORBIDDEN_PATTERNS = [
  { pattern: /\.(only|skip)\s*\(/, name: '.only/.skip in tests', severity: 'error' },
  { pattern: /@ts-ignore(?!\s+eslint)/, name: '@ts-ignore', severity: 'error' },
  { pattern: /console\.log\s*\(/, name: 'console.log', severity: 'error', excludePaths: ['debug', 'scripts', '.config', 'tools'] },
];

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git', 'coverage', 'build', '.next'];

function findFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(item) && !item.startsWith('.')) {
        findFiles(fullPath, files);
      }
    } else if (EXTENSIONS.includes(extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];
  
  // Strip comments and strings to avoid false positives
  const strippedContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/'[^']*'/g, "''") // Remove single-quoted strings
    .replace(/"[^"]*"/g, '""'); // Remove double-quoted strings
  
  for (const { pattern, name, severity, excludePaths = [] } of FORBIDDEN_PATTERNS) {
    // Check if file should be excluded
    const shouldExclude = excludePaths.some(exclude => filePath.includes(exclude));
    if (shouldExclude) continue;
    
    const matches = strippedContent.match(pattern);
    if (matches) {
      // Find line number for each match
      let index = 0;
      for (let i = 0; i < lines.length; i++) {
        if (strippedContent.slice(index, index + lines[i].length).match(pattern)) {
          violations.push({
            file: filePath,
            line: i + 1,
            pattern: name,
            severity
          });
        }
        index += lines[i].length + 1; // +1 for newline
      }
    }
  }
  
  return violations;
}

function main() {
  const files = [
    ...findFiles('client'),
    ...findFiles('server'),
    ...findFiles('shared'),
  ];
  
  let violations = [];
  for (const file of files) {
    violations = violations.concat(checkFile(file));
  }
  
  if (violations.length > 0) {
    console.error('❌ Forbidden patterns detected:');
    violations.forEach(v => {
      console.error(`  ${v.file}:${v.line} - ${v.pattern} (${v.severity})`);
    });
    process.exit(1);
  } else {
    console.log('✅ No forbidden patterns found');
    process.exit(0);
  }
}

main();
