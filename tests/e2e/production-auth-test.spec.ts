import { test, expect } from '@playwright/test';

/**
 * Production Authentication & Order Flow Test
 *
 * This test directly tests the production deployment to verify:
 * 1. Login with server credentials
 * 2. JWT token has scope field
 * 3. Touch order submission works (no 401 errors)
 * 4. Voice order modal loads
 */

const PRODUCTION_URL = 'https://july25-client.vercel.app';
const SERVER_EMAIL = 'server@restaurant.com';
const SERVER_PASSWORD = 'Demo123!';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

test.describe('Production Auth & Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage to simulate fresh session
    await page.context().clearCookies();
    await page.goto(PRODUCTION_URL);
  });

  test('Login flow and JWT scope verification', async ({ page }) => {
    console.log('🔍 Step 1: Navigate to server view');
    await page.goto(`${PRODUCTION_URL}/server`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('🔍 Step 2: Find and fill login form');
    // Look for email and password inputs
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10000 });

    await emailInput.fill(SERVER_EMAIL);
    await passwordInput.fill(SERVER_PASSWORD);

    console.log('🔍 Step 3: Submit login');
    // Find submit button
    const submitButton = page.locator('button:has-text("Log"), button:has-text("Sign"), button[type="submit"]').first();
    await submitButton.click();

    // Wait for navigation or auth completion
    await page.waitForLoadState('networkidle');

    console.log('🔍 Step 4: Verify we reached server view');
    // Should see server view elements
    await expect(page.locator('text=/Server View|Dashboard|Tables/i')).toBeVisible({ timeout: 10000 });

    console.log('🔍 Step 5: Extract and decode JWT token');
    const token = await page.evaluate(() => {
      const authSession = localStorage.getItem('auth_session');
      if (!authSession) return null;

      try {
        const session = JSON.parse(authSession);
        return session.session?.accessToken || session.token;
      } catch {
        return null;
      }
    });

    expect(token).toBeTruthy();
    console.log('✅ Token found:', token?.substring(0, 50) + '...');

    // Decode JWT payload
    const jwtPayload = await page.evaluate((token) => {
      if (!token) return null;

      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Add padding if needed
        let payload = parts[1];
        while (payload.length % 4 !== 0) {
          payload += '=';
        }

        const decoded = atob(payload);
        return JSON.parse(decoded);
      } catch (error) {
        return { error: error.message };
      }
    }, token);

    console.log('📋 JWT Payload:', JSON.stringify(jwtPayload, null, 2));

    // CRITICAL: Verify scope field exists
    expect(jwtPayload).toHaveProperty('scope');
    expect(Array.isArray(jwtPayload.scope)).toBe(true);
    expect(jwtPayload.scope).toContain('orders:create');

    console.log('✅ JWT has scope field with orders:create!');
    console.log('Scopes:', jwtPayload.scope);
  });

  test('Touch order submission with auth', async ({ page }) => {
    console.log('🔍 Starting touch order test');

    // Login first
    await page.goto(`${PRODUCTION_URL}/server`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(SERVER_EMAIL);
    await passwordInput.fill(SERVER_PASSWORD);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    console.log('🔍 Looking for table selection');
    // Wait for table selection to appear
    await expect(page.locator('text=/Table|Select/i')).toBeVisible({ timeout: 10000 });

    // Click first available table
    const firstTable = page.locator('[data-testid*="table"], button:has-text("Table"), div[class*="table"]').first();
    await firstTable.click();

    console.log('🔍 Looking for seat selection');
    // Select a seat - wait for it to be visible
    const firstSeat = page.locator('button:has-text("1"), [data-testid*="seat"]').first();
    await firstSeat.waitFor({ state: 'visible', timeout: 5000 });
    await firstSeat.click();

    console.log('🔍 Looking for Touch Order button');
    // Click Touch Order and wait for menu to load
    const touchOrderButton = page.locator('button:has-text("Touch Order")');
    await expect(touchOrderButton).toBeVisible({ timeout: 5000 });
    await touchOrderButton.click();

    await page.waitForLoadState('networkidle');

    console.log('🔍 Looking for menu items');
    // Should see menu items
    await expect(page.locator('text=/Menu|Items|Order/i')).toBeVisible({ timeout: 10000 });

    // Try to add an item to cart
    const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      console.log('✅ Added item to cart');
    }

    // Look for Send Order / Submit button
    const submitOrderButton = page.locator('button:has-text("Send Order"), button:has-text("Submit"), button:has-text("Place Order")').first();

    console.log('🔍 Attempting to submit order');

    // Listen for network responses
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/orders') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    await submitOrderButton.click();

    try {
      const response = await responsePromise;
      const status = response.status();
      const body = await response.json();

      console.log('📡 Order API Response Status:', status);
      console.log('📡 Response Body:', JSON.stringify(body, null, 2));

      if (status === 401) {
        console.error('❌ STILL GETTING 401 ERROR!');
        console.error('Error:', body);

        // Get the actual token being sent
        const sentToken = await page.evaluate(() => {
          const authSession = localStorage.getItem('auth_session');
          if (!authSession) return null;
          const session = JSON.parse(authSession);
          return session.session?.accessToken || session.token;
        });

        const sentPayload = await page.evaluate((token) => {
          if (!token) return null;
          const parts = token.split('.');
          let payload = parts[1];
          while (payload.length % 4 !== 0) payload += '=';
          return JSON.parse(atob(payload));
        }, sentToken);

        console.log('Token being sent:', sentPayload);

        expect(status).not.toBe(401);
      } else if (status === 201) {
        console.log('✅ Order created successfully!');
        expect(status).toBe(201);
      } else {
        console.log(`⚠️  Unexpected status: ${status}`);
      }
    } catch (error) {
      console.error('❌ Error during order submission:', error);

      // Capture console errors
      const consoleLogs = await page.evaluate(() => {
        // @ts-ignore
        return window.__consoleLogs || [];
      });
      console.log('Browser console logs:', consoleLogs);

      // Take screenshot for debugging
      await page.screenshot({ path: 'order-submission-error.png', fullPage: true });

      throw error;
    }
  });

  test('Voice order modal loading', async ({ page }) => {
    console.log('🔍 Testing voice order modal');

    // Login
    await page.goto(`${PRODUCTION_URL}/server`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(SERVER_EMAIL);
    await passwordInput.fill(SERVER_PASSWORD);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Select table and seat
    const firstTable = page.locator('[data-testid*="table"], button:has-text("Table")').first();
    await firstTable.click();

    const firstSeat = page.locator('button:has-text("1")').first();
    await firstSeat.waitFor({ state: 'visible', timeout: 5000 });
    await firstSeat.click();

    // Click Voice Order
    console.log('🔍 Clicking Voice Order button');
    const voiceOrderButton = page.locator('button:has-text("Voice Order")');
    await expect(voiceOrderButton).toBeVisible({ timeout: 5000 });

    // Check for React errors before clicking
    page.on('pageerror', error => {
      console.error('❌ React Error:', error.message);
    });

    await voiceOrderButton.click();

    // Check if voice order modal opened
    const voiceModal = page.locator('text=/Voice Order|Recording|Microphone/i');
    const modalVisible = await voiceModal.isVisible().catch(() => false);

    if (modalVisible) {
      console.log('✅ Voice order modal opened successfully!');
      expect(modalVisible).toBe(true);

      // Check for Voice Debug Panel
      const debugPanel = page.locator('text=/Debug Panel|Messages|Recording/i');
      const debugVisible = await debugPanel.isVisible().catch(() => false);
      console.log('Voice Debug Panel visible:', debugVisible);

      // Take screenshot
      await page.screenshot({ path: 'voice-order-modal.png', fullPage: true });
    } else {
      console.error('❌ Voice order modal did not open!');
      await page.screenshot({ path: 'voice-order-failed.png', fullPage: true });
      expect(modalVisible).toBe(true);
    }
  });
});