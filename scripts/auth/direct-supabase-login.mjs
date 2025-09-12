#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// Create client with anon key
const client = createClient(SUPABASE_URL, ANON_KEY);

async function loginAndSaveTable() {
  console.log('1. Logging in as server1...');
  
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: 'server1@restaurant.com',
    password: 'Dev!4831'
  });
  
  if (authError) {
    console.error('Login failed:', authError);
    return;
  }
  
  console.log('✓ Logged in successfully');
  console.log('  Token length:', authData.session?.access_token?.length);
  console.log('  User ID:', authData.session?.user?.id);
  
  // Save token for curl testing
  const token = authData.session?.access_token;
  if (!token) {
    console.error('No token received');
    return;
  }
  
  writeFileSync(join(__dirname, '../../test-token.txt'), token);
  console.log('\n2. Token saved to test-token.txt');
  
  // Now test saving a table directly with Supabase client
  console.log('\n3. Testing table save with user token...');
  
  const tableData = {
    label: 'A1',
    seats: 4,
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    x_pos: 100,
    y_pos: 100,
    width: 50,
    height: 50,
    shape: 'rectangle',
    active: true,
    status: 'available'
  };
  
  const { data: tableResult, error: tableError } = await client
    .from('tables')
    .insert([tableData])
    .select()
    .single();
    
  if (tableError) {
    console.error('Table save failed:', tableError);
    console.error('Error code:', tableError.code);
    console.error('Error details:', tableError.details);
    console.error('Error hint:', tableError.hint);
  } else {
    console.log('✓ Table saved successfully!');
    console.log('  Table ID:', tableResult.id);
    console.log('  Table name:', tableResult.name);
  }
  
  // Sign out
  await client.auth.signOut();
}

loginAndSaveTable().catch(console.error);