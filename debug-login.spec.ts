import { test, expect } from '@playwright/test';

test('Debug: Server login and navigation', async ({ page }) => {
  console.log('\n========== STARTING DEBUG TEST ==========\n');

  // Track all console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('canAccess') ||
        text.includes('Authorization') ||
        text.includes('🔐') ||
        text.includes('role') ||
        text.includes('scopes')) {
      console.log(`[BROWSER CONSOLE] ${text}`);
    }
  });

  // Track network requests
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/me')) {
      console.log(`\n[API RESPONSE] ${response.status()} ${url}`);
      try {
        const json = await response.json();
        console.log('[API DATA]', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('[API ERROR] Could not parse JSON');
      }
    }
  });

  // Step 1: Load login page
  console.log('\n[STEP 1] Loading login page...');
  await page.goto('https://july25-client.vercel.app/login');
  await page.waitForLoadState('networkidle');
  console.log('[STEP 1] ✓ Login page loaded');

  // Step 2: Find and click Server button
  console.log('\n[STEP 2] Looking for Server button...');
  const serverButton = page.locator('button:has-text("Server")').first();
  await expect(serverButton).toBeVisible({ timeout: 10000 });
  console.log('[STEP 2] ✓ Server button found');

  // Step 3: Click the button
  console.log('\n[STEP 3] Clicking Server button...');
  await serverButton.click();
  console.log('[STEP 3] ✓ Clicked');

  // Step 4: Wait for navigation
  console.log('\n[STEP 4] Waiting for navigation...');
  await page.waitForURL(url => {
    const pathname = new URL(url).pathname;
    console.log(`[STEP 4] Current URL: ${url} (pathname: ${pathname})`);
    return pathname !== '/login';
  }, { timeout: 20000 });

  const currentURL = page.url();
  const pathname = new URL(currentURL).pathname;
  console.log(`[STEP 4] ✓ Navigated to: ${currentURL}`);

  // Step 5: Check what page we're on
  console.log('\n[STEP 5] Analyzing current page...');
  await page.waitForLoadState('networkidle');

  const bodyText = await page.textContent('body');
  const hasAccessDenied = bodyText?.includes('Access Denied');
  const hasUnauthorized = bodyText?.includes('Unauthorized');
  const isUnauthorizedPage = pathname === '/unauthorized';

  console.log(`[STEP 5] Is unauthorized page: ${isUnauthorizedPage}`);
  console.log(`[STEP 5] Has "Access Denied": ${hasAccessDenied}`);
  console.log(`[STEP 5] Has "Unauthorized": ${hasUnauthorized}`);

  // Step 6: Get localStorage
  console.log('\n[STEP 6] Checking localStorage...');
  const localStorage = await page.evaluate(() => {
    const auth = window.localStorage.getItem('auth_session');
    return auth ? JSON.parse(auth) : null;
  });
  console.log('[STEP 6] Auth session:', JSON.stringify(localStorage, null, 2));

  // Step 7: Take screenshot
  await page.screenshot({
    path: '/tmp/server-login-debug.png',
    fullPage: true
  });
  console.log('\n[STEP 7] Screenshot saved to: /tmp/server-login-debug.png');

  // Step 8: Check page content
  console.log('\n[STEP 8] Page content preview:');
  console.log(bodyText?.substring(0, 300));

  console.log('\n========== DEBUG TEST COMPLETE ==========\n');

  // Assertions
  if (isUnauthorizedPage || hasAccessDenied || hasUnauthorized) {
    console.error('\n❌ PROBLEM FOUND: User is being blocked from accessing the page!');
    console.error(`   Expected: /server page to load`);
    console.error(`   Actual: ${pathname} with unauthorized message`);

    if (localStorage) {
      console.error('\n   User IS logged in:');
      console.error(`   - Role: ${localStorage.user?.role}`);
      console.error(`   - Scopes: ${JSON.stringify(localStorage.user?.scopes)}`);
    }

    throw new Error('Server role cannot access /server page - authorization issue!');
  }

  console.log('\n✅ SUCCESS: Server role can access the page!');
});
