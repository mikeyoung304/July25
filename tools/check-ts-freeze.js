#!/usr/bin/env node

/**
 * TypeScript Error Freeze CI Check
 * 
 * This script ensures no NEW TypeScript errors are introduced.
 * It compares current errors against an allowlist and fails if:
 * 1. New errors appear that aren't in the allowlist
 * 2. Error count for any file increases
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ALLOWLIST_PATH = path.join(__dirname, 'ts-error-allowlist.json');
const TEMP_OUTPUT = path.join(__dirname, 'current-errors.txt');

// Color codes for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function getCurrentErrors() {
  try {
    // Run typecheck and capture output
    execSync('npm run typecheck 2>&1', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return []; // No errors if typecheck succeeds
  } catch (error) {
    // Parse errors from output
    const output = error.stdout || '';
    const errors = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^([^(]+)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5]
        });
      }
    }
    
    return errors;
  }
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    console.error(`${RED}Error: Allowlist not found at ${ALLOWLIST_PATH}${RESET}`);
    console.log('Run "npm run typecheck:baseline" to create it.');
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
}

function compareErrors(current, allowed) {
  const newErrors = [];
  const fixedErrors = [];
  const currentByFile = {};
  const allowedByFile = {};
  
  // Group by file for counting
  for (const error of current) {
    const key = `${error.file}:${error.line}:${error.column}:${error.code}`;
    currentByFile[error.file] = currentByFile[error.file] || new Set();
    currentByFile[error.file].add(key);
  }
  
  for (const error of allowed) {
    const key = `${error.file}:${error.line}:${error.column}:${error.code}`;
    allowedByFile[error.file] = allowedByFile[error.file] || new Set();
    allowedByFile[error.file].add(key);
  }
  
  // Find new errors (not in allowlist)
  for (const error of current) {
    const key = `${error.file}:${error.line}:${error.column}:${error.code}`;
    const fileAllowed = allowedByFile[error.file] || new Set();
    if (!fileAllowed.has(key)) {
      newErrors.push(error);
    }
  }
  
  // Find fixed errors (in allowlist but not current)
  for (const error of allowed) {
    const key = `${error.file}:${error.line}:${error.column}:${error.code}`;
    const fileCurrent = currentByFile[error.file] || new Set();
    if (!fileCurrent.has(key)) {
      fixedErrors.push(error);
    }
  }
  
  // Count changes per file
  const fileChanges = {};
  const allFiles = new Set([...Object.keys(currentByFile), ...Object.keys(allowedByFile)]);
  
  for (const file of allFiles) {
    const currentCount = (currentByFile[file] || new Set()).size;
    const allowedCount = (allowedByFile[file] || new Set()).size;
    
    if (currentCount !== allowedCount) {
      fileChanges[file] = {
        before: allowedCount,
        after: currentCount,
        delta: currentCount - allowedCount
      };
    }
  }
  
  return { newErrors, fixedErrors, fileChanges };
}

function main() {
  console.log('🔍 Checking TypeScript error freeze...\n');
  
  const currentErrors = getCurrentErrors();
  const allowedErrors = loadAllowlist();
  const { newErrors, fixedErrors, fileChanges } = compareErrors(currentErrors, allowedErrors);
  
  // Report statistics
  console.log(`📊 Error Statistics:`);
  console.log(`   Allowed: ${allowedErrors.length}`);
  console.log(`   Current: ${currentErrors.length}`);
  console.log(`   Net Change: ${currentErrors.length - allowedErrors.length}\n`);
  
  // Report fixed errors (good news!)
  if (fixedErrors.length > 0) {
    console.log(`${GREEN}✅ Fixed ${fixedErrors.length} errors!${RESET}`);
    const fixedByFile = {};
    for (const error of fixedErrors) {
      fixedByFile[error.file] = (fixedByFile[error.file] || 0) + 1;
    }
    for (const [file, count] of Object.entries(fixedByFile)) {
      console.log(`   ${file}: -${count}`);
    }
    console.log();
  }
  
  // Report new errors (bad news!)
  if (newErrors.length > 0) {
    console.log(`${RED}❌ Found ${newErrors.length} NEW TypeScript errors!${RESET}\n`);
    
    // Group by file for better readability
    const errorsByFile = {};
    for (const error of newErrors) {
      if (!errorsByFile[error.file]) {
        errorsByFile[error.file] = [];
      }
      errorsByFile[error.file].push(error);
    }
    
    for (const [file, errors] of Object.entries(errorsByFile)) {
      console.log(`${YELLOW}${file}:${RESET}`);
      for (const error of errors) {
        console.log(`  Line ${error.line}: ${error.code} - ${error.message || 'See full output'}`);
      }
      console.log();
    }
    
    console.log(`${RED}FAILED: New TypeScript errors detected!${RESET}`);
    console.log('Fix these errors or update the allowlist if intentional.\n');
    process.exit(1);
  }
  
  // Check for files with increased error counts
  const increasedFiles = Object.entries(fileChanges).filter(([_, change]) => change.delta > 0);
  if (increasedFiles.length > 0) {
    console.log(`${RED}❌ Error count increased in ${increasedFiles.length} files:${RESET}`);
    for (const [file, change] of increasedFiles) {
      console.log(`   ${file}: ${change.before} → ${change.after} (+${change.delta})`);
    }
    console.log();
    process.exit(1);
  }
  
  console.log(`${GREEN}✅ TypeScript error freeze check passed!${RESET}`);
  
  if (fixedErrors.length > 0) {
    console.log(`\n💡 Tip: Run "npm run typecheck:update-allowlist" to update the allowlist.`);
  }
}

// Run the check
main();