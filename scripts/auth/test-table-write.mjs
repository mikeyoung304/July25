#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
const envPath = join(__dirname, '../../.env');
const envContent = readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function testTableWrite() {
  console.log('Testing table write with server1 user...\n');
  
  // Step 1: Login as server1
  console.log('1. Logging in as server1@restaurant.com...');
  const client = createClient(SUPABASE_URL, ANON_KEY);
  
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: 'server1@restaurant.com',
    password: 'Dev!4831'
  });
  
  if (authError) {
    console.error('✗ Login failed:', authError.message);
    return;
  }
  
  const token = authData.session?.access_token;
  console.log('✓ Logged in successfully');
  console.log(`  Token length: ${token?.length}`);
  console.log(`  User ID: ${authData.user?.id}\n`);
  
  // Save login response
  writeFileSync(
    join(__dirname, '../../docs/reports/http/floorplan_login.json'),
    JSON.stringify({
      status: 'success',
      email: 'server1@restaurant.com',
      userId: authData.user?.id,
      tokenLength: token?.length,
      expiresAt: authData.session?.expires_at
    }, null, 2)
  );
  
  // Step 2: Test table write via backend API
  console.log('2. Testing table write via backend API...');
  
  // Send a single table, not an array
  const tableData = {
    label: 'Test-A1',
    seats: 4,
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    type: 'rectangle'
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/tables', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': RESTAURANT_ID,
        'X-CSRF-Token': 'dev',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tableData)
    });
    
    const result = await response.json();
    
    console.log(`  Response status: ${response.status}`);
    
    // Save response
    writeFileSync(
      join(__dirname, '../../docs/reports/http/floorplan_save.json'),
      JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: result
      }, null, 2)
    );
    
    if (response.ok) {
      console.log('✓ Table save succeeded!');
      console.log(`  Table ID: ${result.id || result[0]?.id || 'unknown'}`);
    } else {
      console.log('✗ Table save failed:', result.error || result);
    }
    
  } catch (error) {
    console.error('✗ Request failed:', error.message);
    writeFileSync(
      join(__dirname, '../../docs/reports/http/floorplan_save.json'),
      JSON.stringify({
        status: 'error',
        error: error.message
      }, null, 2)
    );
  }
  
  // Sign out
  await client.auth.signOut();
  console.log('\n✓ Test complete');
}

testTableWrite().catch(console.error);