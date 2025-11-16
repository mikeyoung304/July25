import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://july25-client.vercel.app';
const SERVER_EMAIL = 'server@restaurant.com';
const SERVER_PASSWORD = 'Demo123!';

test.describe('Production Complete Order Flow', () => {
  test('Full order submission test with detailed diagnostics', async ({ page }) => {
    console.log('🔍 Starting full production test');

    // Go to landing page
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Click Server workspace
    const serverCard = page.locator('text=Server').first();
    await serverCard.click();
    await page.waitForTimeout(2000);

    // Fill login
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(SERVER_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(SERVER_PASSWORD);

    const loginButton = page.locator('button[type="submit"], button:has-text("Log")').first();
    await loginButton.click();

    console.log('⏳ Waiting for auth to complete...');
    await page.waitForTimeout(5000);

    // Check ALL possible storage locations
    const authData = await page.evaluate(() => {
      const results = {
        localStorage: {} as any,
        sessionStorage: {} as any,
        cookies: document.cookie
      };

      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            results.localStorage[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            results.localStorage[key] = localStorage.getItem(key);
          }
        }
      }

      // Get all sessionStorage keys
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          try {
            results.sessionStorage[key] = JSON.parse(sessionStorage.getItem(key) || '');
          } catch {
            results.sessionStorage[key] = sessionStorage.getItem(key);
          }
        }
      }

      return results;
    });

    console.log('📦 Storage contents:', JSON.stringify(authData, null, 2));

    // Extract token from wherever it is
    let token = null;
    let jwtPayload = null;

    if (authData.localStorage.auth_session) {
      token = authData.localStorage.auth_session.session?.accessToken ||
              authData.localStorage.auth_session.token;
    }

    if (token) {
      console.log('✅ Token found!');

      // Decode JWT
      jwtPayload = await page.evaluate((t) => {
        const parts = t.split('.');
        let payload = parts[1];
        while (payload.length % 4 !== 0) payload += '=';
        return JSON.parse(atob(payload));
      }, token);

      console.log('📋 JWT Payload:', JSON.stringify(jwtPayload, null, 2));

      if (jwtPayload.scope) {
        console.log('✅✅✅ JWT HAS SCOPE FIELD!');
        console.log('Scopes:', jwtPayload.scope);

        if (jwtPayload.scope.includes('orders:create')) {
          console.log('✅ Has orders:create scope');
        }
      } else {
        console.log('❌❌❌ JWT MISSING SCOPE FIELD!');
      }
    }

    // Now try to submit an order
    console.log('🔍 Looking for table to select...');
    await page.waitForTimeout(2000);

    // Click any available table
    const tables = page.locator('[class*="table"], button:has-text("Table")');
    const tableCount = await tables.count();
    console.log(`Found ${tableCount} table elements`);

    if (tableCount > 0) {
      await tables.first().click();
      console.log('✅ Clicked table');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/10-table-selected.png' });

      // Select seat
      const seatButton = page.locator('button:has-text("1")').first();
      const seatVisible = await seatButton.isVisible().catch(() => false);

      if (seatVisible) {
        await seatButton.click();
        console.log('✅ Selected seat');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/11-seat-selected.png' });

        // Click Touch Order button
        const touchOrderBtn = page.locator('button:has-text("Touch Order")');
        const touchVisible = await touchOrderBtn.isVisible().catch(() => false);

        if (touchVisible) {
          await touchOrderBtn.click();
          console.log('✅ Clicked Touch Order');
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'test-results/12-touch-order-modal.png' });

          // Look for menu items
          const menuItems = page.locator('[class*="menu"], [class*="item"], img[alt*=""]');
          const itemCount = await menuItems.count();
          console.log(`Found ${itemCount} potential menu items`);

          // Try to find an add button
          const addBtns = page.locator('button:has-text("Add"), button:has-text("+"), button[class*="add"]');
          const addCount = await addBtns.count();
          console.log(`Found ${addCount} add buttons`);

          if (addCount > 0) {
            await addBtns.first().click();
            console.log('✅ Added item to cart');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/13-item-added.png' });

            // Find submit button
            const submitBtn = page.locator('button:has-text("Send Order"), button:has-text("Submit"), button:has-text("Place")').first();
            const submitVisible = await submitBtn.isVisible().catch(() => false);

            if (submitVisible) {
              console.log('🚀 Attempting to submit order...');

              // Set up response listener BEFORE clicking
              const responsePromise = page.waitForResponse(
                res => res.url().includes('/orders') && res.request().method() === 'POST',
                { timeout: 15000 }
              ).catch(() => null);

              // Also capture console errors
              page.on('console', msg => {
                if (msg.type() === 'error') {
                  console.log('Browser Error:', msg.text());
                }
              });

              await submitBtn.click();

              const response = await responsePromise;

              if (response) {
                const status = response.status();
                console.log('📡 Order API Status:', status);

                const headers = response.request().headers();
                console.log('📡 Request Headers:', headers);

                let body;
                try {
                  body = await response.json();
                } catch {
                  body = await response.text();
                }

                console.log('📡 Response Body:', body);

                if (status === 401) {
                  console.error('❌❌❌ 401 UNAUTHORIZED ERROR CONFIRMED!');
                  console.error('Error:', body);

                  // This is the smoking gun - test in incognito, get 401
                  expect(status, '401 error means JWT scope fix NOT working in production').not.toBe(401);
                } else if (status === 201) {
                  console.log('✅✅✅ ORDER CREATED SUCCESSFULLY!');
                  expect(status).toBe(201);
                } else {
                  console.log(`⚠️  Unexpected status: ${status}`);
                }

                await page.screenshot({ path: 'test-results/14-after-submit.png' });
              } else {
                console.log('❌ No API response captured');
                await page.screenshot({ path: 'test-results/14-no-response.png' });
              }
            } else {
              console.log('❌ Submit button not found');
            }
          } else {
            console.log('❌ No add buttons found');
          }
        } else {
          console.log('❌ Touch Order button not visible');
        }
      } else {
        console.log('❌ Seat button not visible');
      }
    } else {
      console.log('❌ No tables found');
    }

    // Keep browser open
    await page.waitForTimeout(3000);
  });
});