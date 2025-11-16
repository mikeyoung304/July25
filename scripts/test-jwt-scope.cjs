#!/usr/bin/env node

/**
 * Test JWT Scope Field in Production
 *
 * This script tests if the JWT token has the scope field
 * when authenticating through the production app.
 */

const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://july25-client.vercel.app';
const SERVER_EMAIL = 'server@restaurant.com';
const SERVER_PASSWORD = 'Demo123!';

async function testJWTScope() {
  console.log('🚀 Starting JWT scope test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Go to production site
    console.log('📍 Navigating to:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle2' });

    // Click Server workspace
    console.log('🖱️  Clicking Server workspace...');
    await page.click('text/Server');
    await page.waitForTimeout(2000);

    // Fill login form
    console.log('📝 Filling login credentials...');
    await page.type('input[type="email"]', SERVER_EMAIL);
    await page.type('input[type="password"]', SERVER_PASSWORD);

    // Submit login
    console.log('🔐 Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for authentication
    await page.waitForTimeout(5000);

    // Extract token from localStorage
    console.log('🔍 Extracting JWT token...\n');
    const authData = await page.evaluate(() => {
      const authSession = localStorage.getItem('auth_session');
      if (authSession) {
        try {
          return JSON.parse(authSession);
        } catch (e) {
          return null;
        }
      }

      // Check Supabase auth token
      const supabaseToken = localStorage.getItem('sb-xiwfhcikfdoshxwbtjxt-auth-token');
      if (supabaseToken) {
        try {
          return JSON.parse(supabaseToken);
        } catch (e) {
          return null;
        }
      }

      return null;
    });

    if (!authData) {
      console.error('❌ No auth data found in localStorage');
      return;
    }

    // Extract the actual token
    const token = authData.access_token || authData.session?.accessToken || authData.token;

    if (!token) {
      console.error('❌ No token found in auth data');
      console.log('Auth data structure:', JSON.stringify(authData, null, 2));
      return;
    }

    console.log('✅ Token found!\n');

    // Decode JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT structure');
      return;
    }

    // Decode payload
    let payload = parts[1];
    // Add padding if needed
    while (payload.length % 4 !== 0) {
      payload += '=';
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());

    console.log('📋 JWT Payload:');
    console.log(JSON.stringify(decodedPayload, null, 2));
    console.log('\n' + '='.repeat(50));

    // Check for scope field
    if (decodedPayload.scope) {
      console.log('✅✅✅ SUCCESS: JWT has scope field!');
      console.log('Scopes:', decodedPayload.scope);

      if (Array.isArray(decodedPayload.scope) && decodedPayload.scope.includes('orders:create')) {
        console.log('✅ Has orders:create scope');
      }
    } else {
      console.log('❌❌❌ FAILURE: JWT is missing scope field!');
      console.log('\nThis means the JWT scope fix is NOT working in production.');
      console.log('The backend needs to add the scope field when generating tokens.');
    }

    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testJWTScope().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test error:', error);
  process.exit(1);
});