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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Create admin client with service role key
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
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

async function seedPasswords() {
  console.log('Setting passwords for test users...\n');
  const results = [];
  
  for (const user of users) {
    try {
      // Get the user ID first
      const { data: userData, error: userError } = await adminClient.auth.admin.listUsers();
      
      if (userError) {
        console.error(`Failed to list users: ${userError.message}`);
        continue;
      }
      
      const existingUser = userData?.users?.find(u => u.email === user.email);
      
      if (existingUser) {
        // Update existing user's password
        const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
          existingUser.id,
          { password: user.password }
        );
        
        if (updateError) {
          console.error(`✗ Failed to update ${user.email}: ${updateError.message}`);
          results.push({ email: user.email, status: 'error', error: updateError.message });
        } else {
          console.log(`✓ Updated password for ${user.email}`);
          results.push({ email: user.email, status: 'updated', id: existingUser.id });
        }
      } else {
        // Create new user
        const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { email_verified: true }
        });
        
        if (createError) {
          console.error(`✗ Failed to create ${user.email}: ${createError.message}`);
          results.push({ email: user.email, status: 'error', error: createError.message });
        } else {
          console.log(`✓ Created user ${user.email}`);
          results.push({ email: user.email, status: 'created', id: createData.user?.id });
        }
      }
    } catch (err) {
      console.error(`✗ Error processing ${user.email}: ${err.message}`);
      results.push({ email: user.email, status: 'error', error: err.message });
    }
  }
  
  // Save results
  const outputPath = join(__dirname, '../../docs/reports/auth/seed_passwords.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Results saved to docs/reports/auth/seed_passwords.json`);
  
  return results;
}

seedPasswords().catch(console.error);