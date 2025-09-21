#!/usr/bin/env node
/**
 * Fix all TypeScript errors systematically
 * Target: 146 errors → 0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript errors
function getTypeScriptErrors() {
  try {
    execSync('npm run typecheck --workspaces --silent', { encoding: 'utf8' });
    return [];
  } catch (error) {
    const output = error.stdout || '';
    const errors = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
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

// Fix unused variables (TS6133)
function fixUnusedVariables(file, line, varName) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // Prefix with underscore to indicate intentionally unused
  if (lines[line - 1]) {
    // Handle various declaration patterns
    lines[line - 1] = lines[line - 1]
      .replace(new RegExp(`\\b${varName}\\b`), `_${varName}`)
      .replace(/_+/g, '_'); // Avoid double underscores
  }

  fs.writeFileSync(file, lines.join('\n'));
}

// Fix property access from index signature (TS4111)
function fixIndexSignatureAccess(file, line, property) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  if (lines[line - 1]) {
    // Convert dot notation to bracket notation
    lines[line - 1] = lines[line - 1]
      .replace(new RegExp(`\\.${property}\\b`), `['${property}']`);
  }

  fs.writeFileSync(file, lines.join('\n'));
}

// Fix exactOptionalPropertyTypes issues (TS2375, TS2379)
function fixOptionalProperties(file, line) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  if (lines[line - 1]) {
    // Look for property assignments that need conditional spread
    const match = lines[line - 1].match(/(\s*)(\w+):\s*(.+?)(,?)$/);
    if (match) {
      const [, indent, prop, value, comma] = match;

      // If value could be undefined, use conditional spread
      if (value.includes('undefined') || value.includes('?')) {
        const condition = value.replace(/\s*\|\s*undefined/, '');
        lines[line - 1] = `${indent}...(${condition} && { ${prop}: ${condition} })${comma}`;
      }
    }
  }

  fs.writeFileSync(file, lines.join('\n'));
}

// Main function
async function main() {
  console.log('🔧 Starting TypeScript error fixes...\n');

  let errors = getTypeScriptErrors();
  console.log(`Found ${errors.length} TypeScript errors\n`);

  // Group errors by type
  const errorsByCode = {};
  for (const error of errors) {
    if (!errorsByCode[error.code]) {
      errorsByCode[error.code] = [];
    }
    errorsByCode[error.code].push(error);
  }

  // Display error summary
  console.log('Error summary:');
  for (const [code, errs] of Object.entries(errorsByCode)) {
    console.log(`  ${code}: ${errs.length} errors`);
  }
  console.log();

  // Fix TS6133 (unused variables)
  if (errorsByCode['TS6133']) {
    console.log('Fixing TS6133 (unused variables)...');
    for (const error of errorsByCode['TS6133']) {
      const match = error.message.match(/'(\w+)'/);
      if (match) {
        const varName = match[1];
        if (!varName.startsWith('_')) {
          console.log(`  Fixing unused ${varName} in ${path.basename(error.file)}`);
          fixUnusedVariables(error.file, error.line, varName);
        }
      }
    }
  }

  // Fix TS4111 (index signature access)
  if (errorsByCode['TS4111']) {
    console.log('\nFixing TS4111 (index signature access)...');
    for (const error of errorsByCode['TS4111']) {
      const match = error.message.match(/'(\w+)'/);
      if (match) {
        const property = match[1];
        console.log(`  Fixing ${property} access in ${path.basename(error.file)}`);
        fixIndexSignatureAccess(error.file, error.line, property);
      }
    }
  }

  // Re-check errors
  console.log('\n📊 Re-checking TypeScript...');
  errors = getTypeScriptErrors();
  console.log(`Remaining errors: ${errors.length}`);

  if (errors.length === 0) {
    console.log('✅ All TypeScript errors fixed!');
  } else {
    console.log('\nRemaining error types:');
    const remaining = {};
    for (const error of errors) {
      remaining[error.code] = (remaining[error.code] || 0) + 1;
    }
    for (const [code, count] of Object.entries(remaining)) {
      console.log(`  ${code}: ${count}`);
    }
  }
}

main().catch(console.error);