#!/usr/bin/env tsx
/**
 * Test Kitchen User Login Flow
 * Simulates the exact flow from the LandingPage kitchen button
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const apiBaseUrl = 'https://july25.onrender.com'; // Production backend

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KITCHEN_EMAIL = 'kitchen@restaurant.com';
const KITCHEN_PASSWORD = 'Demo123!';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function testKitchenLogin() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 TESTING KITCHEN USER LOGIN FLOW');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Authenticate with Supabase (same as AuthContext.login)
    console.log('1️⃣ Authenticating with Supabase...');
    console.log(`   Email: ${KITCHEN_EMAIL}`);
    console.log(`   Restaurant: ${RESTAURANT_ID}\n`);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: KITCHEN_EMAIL,
      password: KITCHEN_PASSWORD
    });

    if (authError || !authData.session) {
      console.error('❌ Supabase authentication failed:', authError);
      return;
    }

    console.log('✅ Supabase authentication successful');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Access Token: ${authData.session.access_token.substring(0, 50)}...`);
    console.log(`   Expires In: ${authData.session.expires_in} seconds\n`);

    // Step 2: Call /auth/me endpoint (same as AuthContext after login)
    console.log('2️⃣ Calling /api/v1/auth/me endpoint...\n');

    const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ /auth/me request failed');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Response: ${errorText}\n`);
      return;
    }

    const userData = await response.json();
    console.log('✅ /auth/me successful');
    console.log('   User Data:', JSON.stringify(userData, null, 2));
    console.log('');

    // Step 3: Verify user object structure (what AuthContext receives)
    console.log('3️⃣ Verifying user object structure...\n');

    const user = userData.user;
    if (!user) {
      console.error('❌ No user object in response!');
      return;
    }

    console.log('✅ User object present');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role} ${user.role === 'kitchen' ? '✅' : '❌ WRONG!'}`);
    console.log(`   Scopes: ${user.scopes ? user.scopes.join(', ') : '❌ MISSING!'}`);
    console.log(`   Restaurant ID: ${userData.restaurantId}\n`);

    // Step 4: Test canAccess logic (from AuthContext)
    console.log('4️⃣ Testing canAccess logic...\n');

    const requiredRoles = ['owner', 'manager', 'kitchen', 'expo'];
    const hasRequiredRole = requiredRoles.includes(user.role || '');

    console.log(`   Required Roles: ${requiredRoles.join(', ')}`);
    console.log(`   User Role: ${user.role}`);
    console.log(`   Has Required Role: ${hasRequiredRole ? '✅ YES' : '❌ NO'}`);

    if (!hasRequiredRole) {
      console.error('\n❌ PROBLEM FOUND: User role is not in required roles!');
      console.error('   This would cause "Access Denied" on /kitchen route');
    } else {
      console.log('\n✅ User SHOULD have access to /kitchen route');
    }

    // Step 5: Check for any missing fields
    console.log('\n5️⃣ Checking for potential issues...\n');

    const issues: string[] = [];

    if (!user.role) issues.push('❌ user.role is missing or undefined');
    if (!user.scopes || user.scopes.length === 0) issues.push('⚠️  user.scopes is empty (may not cause access denied)');
    if (!userData.restaurantId) issues.push('❌ restaurantId is missing');
    if (user.role && !['owner', 'manager', 'kitchen', 'expo'].includes(user.role)) {
      issues.push(`❌ user.role='${user.role}' is not valid for kitchen access`);
    }

    if (issues.length > 0) {
      console.log('⚠️  Issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('✅ No issues found - login flow should work correctly!');
    }

    // Cleanup
    await supabase.auth.signOut();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (issues.length === 0 && hasRequiredRole) {
      console.log('✅ ALL CHECKS PASSED');
      console.log('   Kitchen user should be able to access /kitchen route');
      console.log('   If access is still denied, the issue is in the frontend AuthContext or ProtectedRoute component');
    } else {
      console.log('❌ ISSUES DETECTED');
      console.log('   See details above');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testKitchenLogin().catch(console.error);
