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

const users = [
  { email: 'manager@restaurant.com', password: 'Dev!7419', role: 'manager' },
  { email: 'server1@restaurant.com', password: 'Dev!4831', role: 'server' },
  { email: 'kitchen@restaurant.com', password: 'Dev!2605', role: 'kitchen' },
  { email: 'expo@restaurant.com', password: 'Dev!9154', role: 'expo' },
  { email: 'cashier@restaurant.com', password: 'Dev!3728', role: 'cashier' }
];

async function testSessions() {
  console.log('Testing user sessions with anon key...\n');
  const sessions = [];
  
  for (const user of users) {
    // Create a new client for each user to avoid session conflicts
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    try {
      console.log(`Logging in ${user.email}...`);
      
      const { data, error } = await client.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (error) {
        console.error(`✗ Login failed for ${user.email}: ${error.message}`);
        sessions.push({
          email: user.email,
          role: user.role,
          status: 'error',
          error: error.message
        });
      } else {
        console.log(`✓ Logged in ${user.email}`);
        sessions.push({
          email: user.email,
          role: user.role,
          status: 'success',
          userId: data.user?.id,
          tokenLength: data.session?.access_token?.length || 0,
          expiresAt: data.session?.expires_at,
          // Redacted token - only show first/last few chars
          tokenPreview: data.session?.access_token 
            ? `${data.session.access_token.substring(0, 20)}...${data.session.access_token.slice(-10)}`
            : null
        });
        
        // Sign out to clean up
        await client.auth.signOut();
      }
    } catch (err) {
      console.error(`✗ Error testing ${user.email}: ${err.message}`);
      sessions.push({
        email: user.email,
        role: user.role,
        status: 'error',
        error: err.message
      });
    }
  }
  
  // Save results
  const outputPath = join(__dirname, '../../docs/reports/auth/sessions.json');
  writeFileSync(outputPath, JSON.stringify(sessions, null, 2));
  console.log(`\n✓ Results saved to docs/reports/auth/sessions.json`);
  
  return sessions;
}

testSessions().catch(console.error);