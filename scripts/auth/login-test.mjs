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

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing SUPABASE_URL or ANON_KEY in environment');
  process.exit(1);
}

console.log('Using ANON key for authentication (not service key)');

// Create client with anon key (public client)
const client = createClient(SUPABASE_URL, ANON_KEY, {
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

const sessions = [];

async function testLogin() {
  console.log('Testing login for 5 users with anon key...\n');
  
  for (const userData of users) {
    const { email, password } = userData;
    console.log(`Logging in ${email}...`);
    
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error(`  ✗ Login failed: ${error.message}`);
        sessions.push({
          email,
          token_len: 0,
          error: error.message,
          success: false
        });
      } else if (data?.session) {
        const tokenLen = data.session.access_token?.length || 0;
        console.log(`  ✓ Login successful (token length: ${tokenLen})`);
        sessions.push({
          email,
          token_len: tokenLen,
          token_preview: data.session.access_token ? 
            data.session.access_token.substring(0, 12) + `...[${tokenLen} chars]` : 
            null,
          user_id: data.session.user?.id,
          expires_at: data.session.expires_at,
          error: null,
          success: true
        });
      } else {
        console.log(`  ⚠ Login returned no session`);
        sessions.push({
          email,
          token_len: 0,
          error: 'No session returned',
          success: false
        });
      }
      
      // Sign out to clean up
      await client.auth.signOut();
      
    } catch (err) {
      console.error(`  ✗ Unexpected error: ${err.message}`);
      sessions.push({
        email,
        token_len: 0,
        error: err.message,
        success: false
      });
    }
  }
  
  // Write sessions report
  const reportPath = join(__dirname, '../../docs/reports/auth/sessions.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    auth_method: 'anon_key',
    sessions
  }, null, 2));
  
  console.log(`\nLogin test complete!`);
  console.log(`Report saved to: docs/reports/auth/sessions.json`);
  
  // Summary
  const successful = sessions.filter(s => s.success).length;
  const failed = sessions.filter(s => !s.success).length;
  console.log(`\nSummary: ${successful} successful logins, ${failed} failed`);
}

// Run the test
testLogin().catch(console.error);