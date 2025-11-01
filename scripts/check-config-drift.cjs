#!/usr/bin/env node

/**
 * Config Drift Detection
 *
 * Compares documented environment variables in docs/reference/config/ENVIRONMENT.md
 * with actual variables in .env.example
 *
 * Exit codes:
 * - 0: No drift detected
 * - 1: Drift detected or error
 */

const fs = require('fs');
const path = require('path');

const DOCS_PATH = path.join(__dirname, '../docs/reference/config/ENVIRONMENT.md');
const ENV_EXAMPLE_PATH = path.join(__dirname, '../.env.example');

// Parse documented variables from ENVIRONMENT.md
function parseDocumentedVars() {
  const content = fs.readFileSync(DOCS_PATH, 'utf-8');
  const documented = new Map();

  // Extract variable tables (markdown format)
  const tableRegex = /\|\s*([A-Z_]+)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const varName = match[1].trim();
    const type = match[2].trim();
    const required = match[3].trim();
    const defaultValue = match[4].trim();
    const description = match[5].trim();

    // Skip header rows
    if (varName === 'Variable' || varName === '---') continue;

    documented.set(varName, {
      type,
      required: required.includes('Yes'),
      default: defaultValue === '-' ? null : defaultValue,
      description
    });
  }

  return documented;
}

// Parse actual variables from .env.example
function parseEnvExample() {
  const content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
  const variables = new Map();

  const lines = content.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') continue;

    // Match VAR_NAME=value pattern
    const match = line.match(/^([A-Z_]+)=/);
    if (match) {
      const varName = match[1];
      variables.set(varName, {
        line: line.trim()
      });
    }
  }

  return variables;
}

// Check for drift
function checkDrift() {
  console.log('🔍 Checking config drift...\n');

  const documented = parseDocumentedVars();
  const envExample = parseEnvExample();

  let driftCount = 0;

  // Check for undocumented variables
  console.log('📝 Checking for undocumented environment variables...\n');

  envExample.forEach((info, varName) => {
    if (!documented.has(varName)) {
      console.log(`⚠️  UNDOCUMENTED VARIABLE: ${varName}`);
      console.log(`   Found in: .env.example`);
      console.log(`   Line: ${info.line}`);
      console.log(`   Action: Add to ENVIRONMENT.md with type, required status, and description\n`);
      driftCount++;
    }
  });

  // Check for documented but missing variables
  console.log('📝 Checking for missing variables in .env.example...\n');

  let missingCount = 0;
  documented.forEach((info, varName) => {
    if (!envExample.has(varName)) {
      console.log(`⚠️  MISSING FROM .env.example: ${varName}`);
      console.log(`   Documented as: ${info.required ? 'Required' : 'Optional'}`);
      console.log(`   Description: ${info.description}`);
      console.log(`   Action: Add to .env.example or remove from ENVIRONMENT.md\n`);
      missingCount++;
    }
  });

  // Check for required/optional mismatches
  console.log('📝 Checking variable metadata consistency...\n');

  let metadataIssues = 0;
  documented.forEach((docInfo, varName) => {
    if (envExample.has(varName)) {
      const envLine = envExample.get(varName).line;

      // Check if variable has a placeholder value in .env.example
      const hasPlaceholder = envLine.includes('your_') ||
                            envLine.includes('YOUR_') ||
                            envLine.includes('generate-');

      // Required variables should have placeholder values
      if (docInfo.required && !hasPlaceholder) {
        // Check if it has a real default
        if (!docInfo.default || docInfo.default === '-') {
          console.log(`⚠️  REQUIRED VARIABLE WITHOUT PLACEHOLDER: ${varName}`);
          console.log(`   Current: ${envLine}`);
          console.log(`   Should have placeholder like: your_${varName.toLowerCase()}_here`);
          console.log(`   Action: Update .env.example with clear placeholder\n`);
          metadataIssues++;
        }
      }
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Total variables documented: ${documented.size}`);
  console.log(`Total variables in .env.example: ${envExample.size}`);
  console.log(`Undocumented variables: ${driftCount}`);
  console.log(`Missing variables: ${missingCount}`);
  console.log(`Metadata issues: ${metadataIssues}`);
  console.log('='.repeat(60) + '\n');

  const totalIssues = driftCount + missingCount + metadataIssues;

  if (totalIssues === 0) {
    console.log('✅ No config drift detected\n');
    console.log('All environment variables are documented and consistent.');
    return 0;
  } else {
    console.log(`❌ Found ${totalIssues} config drift issue(s)\n`);
    console.log('Action required:');
    console.log('1. Update docs/reference/config/ENVIRONMENT.md');
    console.log('2. Add missing variable documentation');
    console.log('3. Update .env.example with placeholders');
    console.log('4. Ensure required/optional status is accurate');
    return 1;
  }
}

// Run
try {
  if (!fs.existsSync(DOCS_PATH)) {
    console.error(`❌ Documentation file not found: ${DOCS_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    console.error(`❌ .env.example file not found: ${ENV_EXAMPLE_PATH}`);
    process.exit(1);
  }

  process.exit(checkDrift());
} catch (error) {
  console.error('❌ Error checking config drift:', error.message);
  console.error(error.stack);
  process.exit(1);
}
