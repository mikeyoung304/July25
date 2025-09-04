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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
  process.exit(1);
}

// Create admin client with service key
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  { email: 'manager@restaurant.com', password: 'Dev!7419' },
  { email: 'server1@restaurant.com', password: 'Dev!4831' },
  { email: 'kitchen@restaurant.com', password: 'Dev!2605' },
  { email: 'expo@restaurant.com', password: 'Dev!9154' },
  { email: 'cashier@restaurant.com', password: 'Dev!3728' }
];

const results = [];

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage
    });
    
    if (error) {
      console.error(`Error listing users page ${page}:`, error);
      return null;
    }
    
    const user = data.users.find(u => u.email === email);
    if (user) return user;
    
    // If we got fewer users than perPage, we've reached the end
    if (data.users.length < perPage) break;
    
    page++;
  }
  
  return null;
}

async function seedPasswords() {
  console.log('Starting password seeding for 5 users...\n');
  
  for (const userData of users) {
    const { email, password } = userData;
    console.log(`Processing ${email}...`);
    
    try {
      // Try to find existing user
      const existingUser = await findUserByEmail(email);
      
      if (existingUser) {
        // Update existing user's password
        const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true
        });
        
        if (error) {
          console.error(`  ✗ Error updating: ${error.message}`);
          results.push({ email, action: 'update_failed', ok: false, error: error.message });
        } else {
          console.log(`  ✓ Updated password`);
          results.push({ email, action: 'updated', ok: true, error: null });
        }
      } else {
        // Create new user
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });
        
        if (error) {
          console.error(`  ✗ Error creating: ${error.message}`);
          results.push({ email, action: 'create_failed', ok: false, error: error.message });
        } else {
          console.log(`  ✓ Created new user`);
          results.push({ email, action: 'created', ok: true, error: null });
        }
      }
    } catch (err) {
      console.error(`  ✗ Unexpected error: ${err.message}`);
      results.push({ email, action: 'error', ok: false, error: err.message });
    }
  }
  
  // Write results to JSON report
  const reportPath = join(__dirname, '../../docs/reports/auth/seed_passwords.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results
  }, null, 2));
  
  console.log(`\nPassword seeding complete!`);
  console.log(`Report saved to: docs/reports/auth/seed_passwords.json`);
  
  // Summary
  const successful = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nSummary: ${successful} successful, ${failed} failed`);
}

// Run the seeding
seedPasswords().catch(console.error);