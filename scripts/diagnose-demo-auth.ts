#!/usr/bin/env tsx
/**
 * Demo User Authentication Diagnostic Script
 *
 * This script checks the complete auth flow for demo users:
 * 1. Verifies users exist in Supabase auth.users
 * 2. Checks user_restaurants associations
 * 3. Validates role_scopes mappings
 * 4. Tests JWT token generation
 * 5. Simulates full login flow
 *
 * Run: npx tsx scripts/diagnose-demo-auth.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAuth = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_PASSWORD = 'Demo123!';

const demoUsers = [
  { email: 'manager@restaurant.com', role: 'manager' },
  { email: 'server@restaurant.com', role: 'server' },
  { email: 'kitchen@restaurant.com', role: 'kitchen' },
  { email: 'expo@restaurant.com', role: 'expo' },
  { email: 'cashier@restaurant.com', role: 'cashier' }
];

interface DiagnosticResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function checkAuthUser(email: string): Promise<DiagnosticResult> {
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      return {
        passed: false,
        message: `User ${email} NOT FOUND in auth.users`,
        details: null
      };
    }

    return {
      passed: true,
      message: `✓ User ${email} exists in auth.users`,
      details: {
        id: user.id,
        email: user.email,
        email_confirmed: user.email_confirmed_at ? 'Yes' : 'No',
        created_at: user.created_at
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Error checking auth user: ${error.message}`,
      details: error
    };
  }
}

async function checkUserRestaurant(email: string, expectedRole: string): Promise<DiagnosticResult> {
  try {
    // Get user ID first
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      return {
        passed: false,
        message: `Cannot check restaurant - user ${email} not found`,
        details: null
      };
    }

    // Check user_restaurants
    const { data: userRestaurant, error } = await supabase
      .from('user_restaurants')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', DEMO_RESTAURANT_ID)
      .single();

    if (error || !userRestaurant) {
      return {
        passed: false,
        message: `❌ ${email} NOT in user_restaurants table`,
        details: { error: error?.message, user_id: user.id }
      };
    }

    if (userRestaurant.role !== expectedRole) {
      return {
        passed: false,
        message: `❌ ${email} has wrong role: ${userRestaurant.role} (expected: ${expectedRole})`,
        details: userRestaurant
      };
    }

    if (!userRestaurant.is_active) {
      return {
        passed: false,
        message: `❌ ${email} is INACTIVE in user_restaurants`,
        details: userRestaurant
      };
    }

    return {
      passed: true,
      message: `✓ ${email} has correct role (${expectedRole}) and is active`,
      details: {
        role: userRestaurant.role,
        is_active: userRestaurant.is_active,
        restaurant_id: userRestaurant.restaurant_id
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Error checking user_restaurants: ${error.message}`,
      details: error
    };
  }
}

async function checkRoleScopes(role: string): Promise<DiagnosticResult> {
  try {
    const { data: scopes, error } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', role);

    if (error) {
      return {
        passed: false,
        message: `❌ Error fetching scopes for ${role}: ${error.message}`,
        details: error
      };
    }

    if (!scopes || scopes.length === 0) {
      return {
        passed: false,
        message: `❌ Role '${role}' has NO scopes defined`,
        details: null
      };
    }

    return {
      passed: true,
      message: `✓ Role '${role}' has ${scopes.length} scopes`,
      details: {
        scopes: scopes.map(s => s.scope).sort()
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Error checking role scopes: ${error.message}`,
      details: error
    };
  }
}

async function testLogin(email: string, role: string): Promise<DiagnosticResult> {
  try {
    // Attempt login using anon client
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD
    });

    if (authError || !authData.session) {
      return {
        passed: false,
        message: `❌ Login FAILED for ${email}: ${authError?.message}`,
        details: {
          error: authError,
          email,
          password_used: 'Demo123!'
        }
      };
    }

    // Get user role from database
    const { data: userRole, error: roleError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('restaurant_id', DEMO_RESTAURANT_ID)
      .single();

    if (roleError || !userRole) {
      return {
        passed: false,
        message: `❌ Login succeeded but user has NO access to restaurant`,
        details: {
          user_id: authData.user.id,
          restaurant_id: DEMO_RESTAURANT_ID,
          error: roleError
        }
      };
    }

    // Get scopes
    const { data: scopesData } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', userRole.role);

    const scopes = scopesData?.map(s => s.scope) || [];

    // Sign out
    await supabaseAuth.auth.signOut();

    return {
      passed: true,
      message: `✓ Login SUCCESS for ${email}`,
      details: {
        user_id: authData.user.id,
        email: authData.user.email,
        role: userRole.role,
        scopes_count: scopes.length,
        scopes: scopes.sort(),
        session_expires_in: authData.session.expires_in
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Error testing login: ${error.message}`,
      details: error
    };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 DEMO USER AUTHENTICATION DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Configuration:');
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Restaurant ID: ${DEMO_RESTAURANT_ID}`);
  console.log(`  JWT Secret: ${supabaseJwtSecret ? 'Configured ✓' : 'MISSING ✗'}\n`);

  let totalTests = 0;
  let passedTests = 0;

  // Test each demo user
  for (const user of demoUsers) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Testing: ${user.email} (expected role: ${user.role})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 1. Check auth.users
    const authCheck = await checkAuthUser(user.email);
    totalTests++;
    if (authCheck.passed) passedTests++;
    console.log(authCheck.message);
    if (authCheck.details) {
      console.log('  Details:', JSON.stringify(authCheck.details, null, 2));
    }

    if (!authCheck.passed) {
      console.log('  ⚠️  Skipping remaining tests for this user\n');
      continue;
    }

    // 2. Check user_restaurants
    const restaurantCheck = await checkUserRestaurant(user.email, user.role);
    totalTests++;
    if (restaurantCheck.passed) passedTests++;
    console.log(restaurantCheck.message);
    if (restaurantCheck.details) {
      console.log('  Details:', JSON.stringify(restaurantCheck.details, null, 2));
    }

    // 3. Check role scopes
    const scopesCheck = await checkRoleScopes(user.role);
    totalTests++;
    if (scopesCheck.passed) passedTests++;
    console.log(scopesCheck.message);
    if (scopesCheck.details?.scopes) {
      console.log('  Scopes:', scopesCheck.details.scopes.join(', '));
    }

    // 4. Test actual login
    console.log('\nTesting login flow...');
    const loginCheck = await testLogin(user.email, user.role);
    totalTests++;
    if (loginCheck.passed) passedTests++;
    console.log(loginCheck.message);
    if (loginCheck.details) {
      if (loginCheck.passed) {
        console.log('  User ID:', loginCheck.details.user_id);
        console.log('  Role:', loginCheck.details.role);
        console.log('  Scopes:', loginCheck.details.scopes_count, 'permissions');
        console.log('  Token expires in:', loginCheck.details.session_expires_in, 'seconds');
      } else {
        console.log('  Error details:', JSON.stringify(loginCheck.details, null, 2));
      }
    }
  }

  // Final summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';
  console.log(`Tests passed: ${passedTests}/${totalTests} (${successRate}%)`);

  if (passedTests === totalTests) {
    console.log('\n✅ ALL TESTS PASSED - Demo users are configured correctly!');
  } else {
    console.log('\n❌ SOME TESTS FAILED - See details above');
    console.log('\nCommon fixes:');
    console.log('  1. Run: npx tsx scripts/seed-demo-users.js');
    console.log('  2. Check SUPABASE_JWT_SECRET in .env matches Supabase dashboard');
    console.log('  3. Verify RLS policies are not blocking access');
    console.log('  4. Check that default restaurant exists:');
    console.log(`     SELECT * FROM restaurants WHERE id = '${DEMO_RESTAURANT_ID}';`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
