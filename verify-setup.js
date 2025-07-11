#!/usr/bin/env node

/**
 * Quick verification script to ensure the app is properly configured
 */

import fs from 'fs';
import { config } from 'dotenv';

console.log('🔍 Verifying Macon Restaurant OS Setup...\n');

// Load environment variables
config();

// Check for required files
const requiredFiles = [
  '.env',
  'ai-gateway-websocket.js',
  'ai-gateway-voiceHandler.js',
  'start-unified-dev.js'
];

console.log('📁 Checking required files:');
let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

// Check environment variables
console.log('\n🔑 Checking API keys:');
const apiKeys = {
  'OpenAI API Key': process.env.OPENAI_API_KEY,
  'Supabase URL': process.env.VITE_SUPABASE_URL,
  'Supabase Anon Key': process.env.VITE_SUPABASE_ANON_KEY
};

let allKeysSet = true;
for (const [name, value] of Object.entries(apiKeys)) {
  if (value) {
    console.log(`  ✅ ${name}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`  ❌ ${name}: NOT SET`);
    allKeysSet = false;
  }
}

// Check Node.js version
console.log('\n💻 System requirements:');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 18) {
  console.log(`  ✅ Node.js version: ${nodeVersion}`);
} else {
  console.log(`  ❌ Node.js version: ${nodeVersion} (requires 18+)`);
}

// Check if dependencies are installed
if (fs.existsSync('node_modules')) {
  console.log('  ✅ Dependencies installed');
} else {
  console.log('  ❌ Dependencies not installed - run: npm install');
}

// Summary
console.log('\n📊 Summary:');
if (allFilesExist && allKeysSet && majorVersion >= 18) {
  console.log('  ✅ Everything looks good! You can run: npm run dev:ai');
} else {
  console.log('  ❌ Some issues need to be fixed before running the app');
  if (!allFilesExist) console.log('     - Missing required files');
  if (!allKeysSet) console.log('     - Missing API keys in .env');
  if (majorVersion < 18) console.log('     - Node.js version too old');
}

console.log('\n🚀 To start the app, run: npm run dev:ai');