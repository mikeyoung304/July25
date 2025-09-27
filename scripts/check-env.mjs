#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * Verifies that .env.example includes all required keys
 * Does NOT check actual values (for security)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Required environment variables by category
const REQUIRED_VARS = {
  server: [
    'NODE_ENV',
    'PORT',
    'DEFAULT_RESTAURANT_ID',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_JWT_SECRET',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'PIN_PEPPER',
    'DEVICE_FINGERPRINT_SALT',
    'FRONTEND_URL'
  ],
  client: [
    'VITE_API_BASE_URL',
    'VITE_DEFAULT_RESTAURANT_ID',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ],
  payments: [
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_ENVIRONMENT',
    'VITE_SQUARE_APP_ID',
    'VITE_SQUARE_LOCATION_ID',
    'VITE_SQUARE_ENVIRONMENT'
  ]
};

function checkEnvExample() {
  const envExamplePath = join(rootDir, '.env.example');

  if (!existsSync(envExamplePath)) {
    console.error('❌ .env.example not found in project root');
    process.exit(1);
  }

  const envContent = readFileSync(envExamplePath, 'utf-8');
  const missingVars = [];

  console.log('🔍 Checking .env.example for required variables...\n');

  for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
    console.log(`📋 ${category.toUpperCase()} variables:`);

    for (const varName of vars) {
      // Check if the variable is mentioned in the file (key=value or # commented examples)
      const regex = new RegExp(`^${varName}=`, 'm');
      const found = regex.test(envContent);

      if (found) {
        console.log(`  ✅ ${varName}`);
      } else {
        console.log(`  ❌ ${varName} - MISSING`);
        missingVars.push(varName);
      }
    }
    console.log('');
  }

  if (missingVars.length > 0) {
    console.error(`\n❌ Missing ${missingVars.length} required variable(s) in .env.example:`);
    console.error(`   ${missingVars.join(', ')}`);
    console.error('\n💡 Add these variables to .env.example with placeholder values');
    process.exit(1);
  }

  console.log('✅ All required variables are present in .env.example');

  // Check for duplicate .env.example files
  const duplicatePaths = [
    join(rootDir, 'client', '.env.example'),
    join(rootDir, 'server', '.env.example')
  ];

  const duplicates = duplicatePaths.filter(path => existsSync(path));
  if (duplicates.length > 0) {
    console.warn('\n⚠️  Found duplicate .env.example files:');
    duplicates.forEach(path => console.warn(`   - ${path}`));
    console.warn('   Consider removing these to avoid confusion');
  }

  process.exit(0);
}

checkEnvExample();