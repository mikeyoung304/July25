#!/usr/bin/env node
import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:3001/api/v1';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

const users = [
  { email: 'manager@restaurant.com', password: 'Password123!' },
  { email: 'server1@restaurant.com', password: 'Password123!' },
  { email: 'kitchen@restaurant.com', password: 'Password123!' },
  { email: 'expo@restaurant.com', password: 'Password123!' },
  { email: 'cashier@restaurant.com', password: 'Password123!' }
];

async function testEmailAuth() {
  const sessions = [];
  
  for (const user of users) {
    try {
      console.log(`Testing login for ${user.email}...`);
      
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...user,
          restaurantId: RESTAURANT_ID
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.session) {
        console.log(`✅ ${user.email} - Success`);
        sessions.push({
          email: user.email,
          userId: data.user?.id,
          role: data.user?.role,
          sessionToken: data.session.access_token ? 'REDACTED' : undefined,
          expiresIn: data.session.expires_in
        });
      } else {
        console.log(`❌ ${user.email} - Failed: ${data.error || response.statusText}`);
        sessions.push({
          email: user.email,
          error: data.error || response.statusText
        });
      }
    } catch (error) {
      console.error(`❌ ${user.email} - Error:`, error.message);
      sessions.push({
        email: user.email,
        error: error.message
      });
    }
  }
  
  // Save sessions report
  writeFileSync('docs/reports/auth/EMAIL_SESSIONS.json', JSON.stringify(sessions, null, 2));
  console.log('\n📝 Sessions saved to docs/reports/auth/EMAIL_SESSIONS.json');
  
  return sessions;
}

async function testPinAuth() {
  console.log('\nTesting PIN authentication...');
  
  try {
    // Test with server1's PIN
    const response = await fetch(`${BASE_URL}/auth/pin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': RESTAURANT_ID
      },
      body: JSON.stringify({
        pin: '1234',
        restaurantId: RESTAURANT_ID
      })
    });
    
    const data = await response.json();
    
    const result = {
      endpoint: '/api/v1/auth/pin-login',
      method: 'POST',
      request: {
        pin: '1234',
        restaurantId: RESTAURANT_ID
      },
      response: {
        status: response.status,
        success: response.ok,
        hasSession: !!data.session,
        isSupabaseSession: data.session?.access_token && !data.session?.access_token.startsWith('local_'),
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role
        } : null,
        error: data.error
      }
    };
    
    // Save PIN auth result
    writeFileSync('docs/reports/http/PIN_LOGIN.json', JSON.stringify(result, null, 2));
    console.log('📝 PIN auth result saved to docs/reports/http/PIN_LOGIN.json');
    
    if (result.response.isSupabaseSession) {
      console.log('✅ PIN auth returns Supabase session');
    } else if (data.session?.access_token?.startsWith('local_')) {
      console.log('⚠️ PIN auth returns local JWT - needs fixing');
      
      // Write blocker report
      writeFileSync('docs/reports/auth/PIN_BLOCKER.md', `# PIN Authentication Blocker

**Date**: ${new Date().toISOString()}
**Status**: ⚠️ Returns local JWT instead of Supabase session

## Issue
The PIN login endpoint at server/src/routes/auth.routes.ts returns a locally-generated JWT instead of a Supabase session.

## Evidence
- Response token starts with: \`local_\`
- File: server/src/routes/auth.routes.ts
- Line: Likely in the PIN login handler

## Fix Required
Update PIN login to:
1. Verify PIN against user_pins table
2. Get user's email from auth.users
3. Use Supabase admin auth.signInWithEmail() with the user's email
4. Return the Supabase session
`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ PIN auth error:', error.message);
    return { error: error.message };
  }
}

async function main() {
  console.log('🔐 Testing Authentication Flows\n');
  
  // Ensure directories exist
  const { execSync } = await import('child_process');
  execSync('mkdir -p docs/reports/auth docs/reports/http');
  
  // Test email/password auth
  await testEmailAuth();
  
  // Test PIN auth
  await testPinAuth();
  
  console.log('\n✅ Auth testing complete');
}

main().catch(console.error);