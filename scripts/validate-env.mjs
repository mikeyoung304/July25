#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that actual .env file has required variables set
 * Checks presence only, NOT values (for security)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
config({ path: join(rootDir, '.env') });

// Critical variables that MUST be set (not exhaustive)
const CRITICAL_VARS = {
  'Server Core': [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_JWT_SECRET'
  ],
  'Database': [
    'DATABASE_URL'
  ],
  'Security': [
    'PIN_PEPPER',
    'DEVICE_FINGERPRINT_SALT',
    'FRONTEND_URL'
  ],
  'Client Core': [
    'VITE_API_BASE_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ]
};

// Optional but recommended variables
const RECOMMENDED_VARS = {
  'AI Features': [
    'OPENAI_API_KEY',
    'VITE_OPENAI_API_KEY'
  ],
  'Payments': [
    'SQUARE_ACCESS_TOKEN',
    'SQUARE_ENVIRONMENT',
    'VITE_SQUARE_APP_ID'
  ],
  'Monitoring': [
    'LOG_LEVEL',
    'CACHE_TTL_SECONDS'
  ]
};

function validateEnv() {
  const envPath = join(rootDir, '.env');

  if (!existsSync(envPath)) {
    console.error('❌ .env file not found in project root');
    console.error('   Copy .env.example to .env and fill in your values');
    process.exit(1);
  }

  console.log('🔍 Validating environment configuration...\n');

  let hasErrors = false;
  const missingCritical = [];
  const missingRecommended = [];

  // Check critical variables
  console.log('📋 CRITICAL Variables:');
  for (const [category, vars] of Object.entries(CRITICAL_VARS)) {
    console.log(`\n  ${category}:`);
    for (const varName of vars) {
      const value = process.env[varName];
      if (value && value.trim() !== '') {
        console.log(`    ✅ ${varName} is set`);
      } else {
        console.log(`    ❌ ${varName} is NOT set`);
        missingCritical.push(varName);
        hasErrors = true;
      }
    }
  }

  // Check recommended variables
  console.log('\n📋 RECOMMENDED Variables:');
  for (const [category, vars] of Object.entries(RECOMMENDED_VARS)) {
    console.log(`\n  ${category}:`);
    for (const varName of vars) {
      const value = process.env[varName];
      if (value && value.trim() !== '') {
        console.log(`    ✅ ${varName} is set`);
      } else {
        console.log(`    ⚠️  ${varName} is not set (optional)`);
        missingRecommended.push(varName);
      }
    }
  }

  // Environment-specific checks
  console.log('\n📋 Environment Checks:');
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production') {
    console.log('  🏭 Running in PRODUCTION mode');

    // Production-specific checks
    if (process.env.AI_DEGRADED_MODE === 'true') {
      console.warn('  ⚠️  AI_DEGRADED_MODE is enabled in production');
    }

    if (process.env.SQUARE_ENVIRONMENT !== 'production') {
      console.error('  ❌ SQUARE_ENVIRONMENT should be "production" in production mode');
      hasErrors = true;
    }

    if (process.env.VITE_USE_MOCK_DATA === 'true') {
      console.error('  ❌ VITE_USE_MOCK_DATA should not be true in production');
      hasErrors = true;
    }
  } else {
    console.log(`  🔧 Running in ${nodeEnv || 'development'} mode`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));

  if (hasErrors) {
    console.error('\n❌ Environment validation FAILED');
    console.error(`\n   Missing ${missingCritical.length} critical variable(s):`);
    console.error(`   ${missingCritical.join(', ')}`);
    console.error('\n💡 Set these in your .env file before running the application');
    process.exit(1);
  }

  if (missingRecommended.length > 0) {
    console.warn(`\n⚠️  Missing ${missingRecommended.length} recommended variable(s):`);
    console.warn(`   ${missingRecommended.join(', ')}`);
    console.warn('   Some features may be limited without these');
  }

  console.log('\n✅ Environment validation PASSED');
  console.log('   All critical variables are set');

  process.exit(0);
}

validateEnv();