import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://july25-client.vercel.app';
const SERVER_EMAIL = 'server@restaurant.com';
const SERVER_PASSWORD = 'Demo123!';

test.describe('Production Auth Test - Real Flow', () => {
  test('Complete login and order submission flow', async ({ page }) => {
    console.log('🔍 Step 1: Navigate to production');
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Take screenshot of landing
    await page.screenshot({ path: 'test-results/01-landing.png' });

    console.log('🔍 Step 2: Look for Server workspace card');
    const serverCard = page.locator('text=Server').first();
    await expect(serverCard).toBeVisible({ timeout: 10000 });
    await serverCard.click();

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/02-after-server-click.png' });

    console.log('🔍 Step 3: Wait for login modal or form');
    // Could be modal or redirect
    await page.waitForTimeout(2000);

    // Look for email input (could be in modal or page)
    const emailInput = page.locator('input[type="email"]').first();
    const emailVisible = await emailInput.isVisible().catch(() => false);

    if (emailVisible) {
      console.log('✅ Login form found, filling credentials');
      await emailInput.fill(SERVER_EMAIL);

      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(SERVER_PASSWORD);

      await page.screenshot({ path: 'test-results/03-credentials-filled.png' });

      // Click login button
      const loginButton = page.locator('button:has-text("Log"), button:has-text("Sign"), button[type="submit"]').first();
      await loginButton.click();

      console.log('🔍 Step 4: Wait for auth to complete');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/04-after-login.png' });

      // Extract token
      const token = await page.evaluate(() => {
        const authSession = localStorage.getItem('auth_session');
        if (!authSession) return null;
        const session = JSON.parse(authSession);
        return session.session?.accessToken || session.token;
      });

      if (token) {
        console.log('✅ Token found!');

        // Decode JWT
        const jwtPayload = await page.evaluate((token) => {
          const parts = token.split('.');
          let payload = parts[1];
          while (payload.length % 4 !== 0) payload += '=';
          return JSON.parse(atob(payload));
        }, token);

        console.log('📋 JWT Payload:', JSON.stringify(jwtPayload, null, 2));

        // Check for scope field
        if (jwtPayload.scope) {
          console.log('✅✅✅ JWT HAS SCOPE FIELD!');
          console.log('Scopes:', jwtPayload.scope);
        } else {
          console.log('❌❌❌ JWT MISSING SCOPE FIELD!');
        }

        console.log('🔍 Step 5: Try to submit an order');

        // Look for table selection
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/05-server-view.png' });

        // Try to find and click a table
        const tableElement = page.locator('[data-testid*="table"], button:has-text("Table"), div:has-text("Table")').first();
        const tableVisible = await tableElement.isVisible().catch(() => false);

        if (tableVisible) {
          console.log('✅ Table found, clicking...');
          await tableElement.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'test-results/06-table-selected.png' });

          // Select seat
          const seatButton = page.locator('button:has-text("1"), button:has-text("Seat 1")').first();
          const seatVisible = await seatButton.isVisible().catch(() => false);

          if (seatVisible) {
            await seatButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'test-results/07-seat-selected.png' });

            // Click Touch Order
            const touchOrderButton = page.locator('button:has-text("Touch Order")');
            const touchVisible = await touchOrderButton.isVisible().catch(() => false);

            if (touchVisible) {
              await touchOrderButton.click();
              await page.waitForTimeout(3000);
              await page.screenshot({ path: 'test-results/08-touch-order-modal.png' });

              // Try to add item and submit
              const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
              const addVisible = await addButton.isVisible().catch(() => false);

              if (addVisible) {
                await addButton.click();
                await page.waitForTimeout(2000);
                await page.screenshot({ path: 'test-results/09-item-added.png' });

                // Find submit button
                const submitButton = page.locator('button:has-text("Send Order"), button:has-text("Submit")').first();
                const submitVisible = await submitButton.isVisible().catch(() => false);

                if (submitVisible) {
                  console.log('🔍 Submitting order...');

                  // Listen for API response
                  const responsePromise = page.waitForResponse(
                    res => res.url().includes('/api/v1/orders') && res.request().method() === 'POST',
                    { timeout: 15000 }
                  ).catch(() => null);

                  await submitButton.click();

                  const response = await responsePromise;

                  if (response) {
                    const status = response.status();
                    console.log('📡 API Response Status:', status);

                    const body = await response.json().catch(() => ({}));
                    console.log('📡 Response Body:', JSON.stringify(body, null, 2));

                    if (status === 401) {
                      console.error('❌❌❌ STILL GETTING 401 ERROR!');
                      console.error('Error message:', body.error?.message || body.message);

                      // This is the critical finding
                      if (body.error?.message?.includes('scope')) {
                        console.error('❌ SCOPE ISSUE CONFIRMED IN PRODUCTION!');
                      }
                    } else if (status === 201) {
                      console.log('✅✅✅ ORDER CREATED SUCCESSFULLY!');
                    }

                    await page.screenshot({ path: 'test-results/10-after-submit.png' });
                  } else {
                    console.log('⚠️  No API response captured');
                  }
                }
              }
            }
          }
        }
      } else {
        console.log('❌ No token found in localStorage');
      }
    } else {
      console.log('❌ Login form not found');
      await page.screenshot({ path: 'test-results/ERROR-no-login-form.png' });

      // Check console for errors
      const consoleLogs = await page.evaluate(() => {
        return (window as any).__consoleLogs || [];
      });
      console.log('Console logs:', consoleLogs);
    }

    // Keep browser open for inspection
    await page.waitForTimeout(5000);
  });
});