/**
 * Production ServerView Flow Test
 * Tests the complete ServerView flow on production deployment
 *
 * Purpose: Verify ServerView loads correctly in production and identify any React errors
 *
 * Test Flow:
 * 1. Navigate to production URL
 * 2. Click Server workspace button
 * 3. Verify ServerView loads (or capture error)
 * 4. Test table selection
 * 5. Test seat selection
 * 6. Capture all console errors including React #318
 */

import { test, expect, Page } from '@playwright/test';

// Production URL
const PRODUCTION_URL = 'https://july25-client.vercel.app';

// Helper to capture console errors
interface ConsoleError {
  type: string;
  text: string;
  timestamp: string;
}

const consoleErrors: ConsoleError[] = [];
const consoleWarnings: ConsoleError[] = [];

function setupConsoleListeners(page: Page) {
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    const timestamp = new Date().toISOString();

    if (type === 'error') {
      consoleErrors.push({ type, text, timestamp });
      console.log(`[CONSOLE ERROR] ${text}`);
    } else if (type === 'warning') {
      consoleWarnings.push({ type, text, timestamp });
      console.log(`[CONSOLE WARNING] ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    const timestamp = new Date().toISOString();
    consoleErrors.push({
      type: 'pageerror',
      text: error.message,
      timestamp
    });
    console.log(`[PAGE ERROR] ${error.message}`);
  });
}

test.describe('Production ServerView Flow Test', () => {
  test.beforeEach(() => {
    // Clear errors before each test
    consoleErrors.length = 0;
    consoleWarnings.length = 0;
  });

  test('Complete ServerView flow on production', async ({ page }) => {
    // Setup console error listeners
    setupConsoleListeners(page);

    console.log('\n=== STEP 1: Navigate to production URL ===');
    await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded' });

    // Take initial screenshot
    await page.screenshot({
      path: 'test-results/production-1-dashboard.png',
      fullPage: true
    });
    console.log('Screenshot saved: test-results/production-1-dashboard.png');

    // Wait for dashboard to load
    console.log('\n=== STEP 2: Wait for dashboard to load ===');
    try {
      await page.waitForSelector('[data-testid="workspace-dashboard"]', { timeout: 10000 });
      console.log('✓ Dashboard loaded successfully');
    } catch (error) {
      console.log('✗ Dashboard did not load within 10 seconds');
      await page.screenshot({
        path: 'test-results/production-2-dashboard-timeout.png',
        fullPage: true
      });
    }

    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    console.log('\n=== STEP 3: Click Server workspace button ===');

    // Look for Server workspace tile
    const serverTile = page.locator('[data-testid="workspace-tile-server"]');

    try {
      await expect(serverTile).toBeVisible({ timeout: 5000 });
      console.log('✓ Server tile found');

      await page.screenshot({
        path: 'test-results/production-3-before-server-click.png',
        fullPage: true
      });

      await serverTile.click();
      console.log('✓ Server tile clicked');

    } catch (error) {
      console.log(`✗ Server tile not found or not clickable: ${error}`);
      await page.screenshot({
        path: 'test-results/production-3-server-tile-error.png',
        fullPage: true
      });
      throw error;
    }

    // Wait a moment for any modal or navigation
    await page.waitForTimeout(2000);

    console.log('\n=== STEP 4: Check if authentication modal appears ===');

    const authModal = page.locator('text=Authentication Required');
    const isModalVisible = await authModal.isVisible().catch(() => false);

    if (isModalVisible) {
      console.log('✓ Authentication modal appeared');
      await page.screenshot({
        path: 'test-results/production-4-auth-modal.png',
        fullPage: true
      });

      // Check if demo credentials are pre-filled
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      const emailValue = await emailInput.inputValue().catch(() => '');
      const passwordValue = await passwordInput.inputValue().catch(() => '');

      console.log(`Email pre-filled: ${emailValue || '(empty)'}`);
      console.log(`Password pre-filled: ${passwordValue ? '(yes)' : '(no)'}`);

      // Try to sign in
      const signInButton = page.locator('button:has-text("Sign In")');

      if (await signInButton.isEnabled().catch(() => false)) {
        console.log('Attempting to sign in...');
        await signInButton.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('Sign In button not enabled, filling demo credentials');
        await emailInput.fill('server@restaurant.com');
        await passwordInput.fill('Demo123!');
        await signInButton.click();
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('No authentication modal appeared');
    }

    console.log('\n=== STEP 5: Wait for ServerView to load ===');

    // Wait for URL to change to /server
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    await page.screenshot({
      path: 'test-results/production-5-after-auth.png',
      fullPage: true
    });

    // Check if ServerView loaded successfully
    console.log('\n=== STEP 6: Check ServerView state ===');

    // Look for error messages
    const errorMessage = page.locator('text=This section couldn\'t be loaded');
    const hasError = await errorMessage.isVisible().catch(() => false);

    if (hasError) {
      console.log('✗ ERROR: "This section couldn\'t be loaded" message appeared');
      await page.screenshot({
        path: 'test-results/production-6-serverview-error.png',
        fullPage: true
      });

      // Look for more details
      const errorDetails = await page.locator('.error-message, .error-container, [role="alert"]').allTextContents();
      console.log('Error details:', errorDetails);

    } else {
      console.log('✓ No error message visible');
    }

    // Check for React error #318
    const reactError = consoleErrors.find(e =>
      e.text.includes('Minified React error #318') ||
      e.text.includes('React')
    );

    if (reactError) {
      console.log('\n✗ REACT ERROR #318 DETECTED:');
      console.log(reactError.text);
    } else {
      console.log('\n✓ No React error #318 detected');
    }

    // Look for ServerView specific elements
    console.log('\n=== STEP 7: Check for ServerView UI elements ===');

    const floorPlanElements = [
      { selector: '[data-testid="floor-plan"]', name: 'Floor Plan' },
      { selector: '[data-testid="table-layout"]', name: 'Table Layout' },
      { selector: '.table-view', name: 'Table View (class)' },
      { selector: 'text=Table', name: 'Table text' },
      { selector: '[role="button"]', name: 'Interactive buttons' },
    ];

    for (const element of floorPlanElements) {
      const exists = await page.locator(element.selector).first().isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`${element.name}: ${exists ? '✓ Found' : '✗ Not found'}`);
    }

    await page.screenshot({
      path: 'test-results/production-7-serverview-ui.png',
      fullPage: true
    });

    console.log('\n=== STEP 8: Attempt table interaction ===');

    // Look for clickable tables
    const tableSelectors = [
      '[data-testid^="table-"]',
      '[data-table-id]',
      '.table-item',
      'button:has-text("Table")',
    ];

    let tableClicked = false;

    for (const selector of tableSelectors) {
      const tables = page.locator(selector);
      const count = await tables.count();

      if (count > 0) {
        console.log(`Found ${count} elements matching: ${selector}`);

        try {
          await tables.first().click({ timeout: 2000 });
          console.log(`✓ Clicked first table`);
          tableClicked = true;

          await page.waitForTimeout(2000);
          await page.screenshot({
            path: 'test-results/production-8-after-table-click.png',
            fullPage: true
          });

          break;
        } catch (error) {
          console.log(`✗ Could not click table: ${error}`);
        }
      }
    }

    if (!tableClicked) {
      console.log('✗ No tables found to click');
    }

    console.log('\n=== STEP 9: Attempt seat selection ===');

    if (tableClicked) {
      // Look for seat selection UI
      const seatSelectors = [
        '[data-testid^="seat-"]',
        '[data-seat-number]',
        '.seat-button',
        'button:has-text("Seat")',
      ];

      for (const selector of seatSelectors) {
        const seats = page.locator(selector);
        const count = await seats.count();

        if (count > 0) {
          console.log(`Found ${count} seats matching: ${selector}`);

          try {
            await seats.first().click({ timeout: 2000 });
            console.log(`✓ Clicked first seat`);

            await page.waitForTimeout(2000);
            await page.screenshot({
              path: 'test-results/production-9-after-seat-click.png',
              fullPage: true
            });

            break;
          } catch (error) {
            console.log(`✗ Could not click seat: ${error}`);
          }
        }
      }
    }

    // Final screenshot
    await page.screenshot({
      path: 'test-results/production-10-final-state.png',
      fullPage: true
    });

    console.log('\n=== STEP 10: Final error summary ===');
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Total console warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach((error, i) => {
        console.log(`\n${i + 1}. [${error.timestamp}] ${error.type}:`);
        console.log(error.text);
      });
    }

    if (consoleWarnings.length > 0) {
      console.log('\nConsole Warnings (first 5):');
      consoleWarnings.slice(0, 5).forEach((warning, i) => {
        console.log(`\n${i + 1}. [${warning.timestamp}]:`);
        console.log(warning.text);
      });
    }

    console.log('\n=== TEST COMPLETE ===\n');

    // Create summary report
    const summary = {
      timestamp: new Date().toISOString(),
      url: PRODUCTION_URL,
      serverViewLoaded: !hasError,
      reactError318: !!reactError,
      totalConsoleErrors: consoleErrors.length,
      totalConsoleWarnings: consoleWarnings.length,
      tableInteractionSuccess: tableClicked,
      errors: consoleErrors,
      warnings: consoleWarnings.slice(0, 10),
    };

    console.log('\nSUMMARY:');
    console.log(JSON.stringify(summary, null, 2));
  });
});
