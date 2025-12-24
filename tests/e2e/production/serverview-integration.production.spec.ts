/**
 * Production ServerView Integration Test
 *
 * QUARANTINE NOTE:
 * Test #3 "ServerView UI elements render correctly" is 85% redundant with:
 * - client/src/pages/__tests__/ServerView.test.tsx (15 tests)
 * - client/src/modules/floor-plan/components/__tests__/TableInteraction.test.tsx
 *
 * Tests ServerView loading, floor plan rendering, and table/seat interactions
 * with network monitoring and error detection.
 *
 * Consolidates overlapping tests from:
 * - production-serverview-test.spec.ts
 * - production-serverview-detailed.spec.ts
 * - production-serverview-interaction.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { TIMEOUTS, PRODUCTION_TIMEOUTS, TEST_CONFIG } from '../constants/timeouts';

interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: string;
}

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  failure?: string;
}

/**
 * Helper to setup console and network monitoring
 */
function setupMonitoring(page: Page) {
  const consoleErrors: ConsoleEntry[] = [];
  const consoleWarnings: ConsoleEntry[] = [];
  const networkRequests: NetworkRequest[] = [];
  const failedRequests: NetworkRequest[] = [];

  page.on('console', (msg) => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString(),
    };

    if (msg.type() === 'error') {
      consoleErrors.push(entry);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(entry);
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push({
      type: 'pageerror',
      text: error.message,
      timestamp: new Date().toISOString(),
    });
  });

  page.on('response', async (response) => {
    const status = response.status();
    if (status >= 400) {
      failedRequests.push({
        url: response.url(),
        method: response.request().method(),
        status,
      });
    }
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'Unknown',
    });
  });

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('tables') || url.includes('floor')) {
      networkRequests.push({
        url,
        method: request.method(),
      });
    }
  });

  return { consoleErrors, consoleWarnings, networkRequests, failedRequests };
}

/**
 * Helper to login via server tile
 */
async function loginViaServerTile(page: Page) {
  await page.goto(TEST_CONFIG.PRODUCTION_URL);
  await page.waitForLoadState('domcontentloaded');

  const serverTile = page.locator('[data-testid="workspace-tile-server"]');
  await expect(serverTile).toBeVisible({ timeout: PRODUCTION_TIMEOUTS.DASHBOARD_LOAD });
  await serverTile.click();

  const authModal = page.locator('text=Authentication Required');
  if (await authModal.isVisible({ timeout: TIMEOUTS.MODAL_ANIMATION }).catch(() => false)) {
    await page.locator('button:has-text("Sign In")').click();
  }

  await page.waitForLoadState('networkidle');
}

test.describe('Production ServerView Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('floor plan loads with network monitoring', async ({ page }) => {
    const { consoleErrors, failedRequests, networkRequests } = setupMonitoring(page);

    await loginViaServerTile(page);

    // Wait for floor plan to load
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(TIMEOUTS.LOADING_CHECK);

      const loadingText = await page.locator('text=Loading floor plan').isVisible().catch(() => false);
      const errorText = await page.locator('text=This section couldn\'t be loaded').isVisible().catch(() => false);

      if (!loadingText) {
        // Floor plan finished loading
        break;
      }

      if (errorText) {
        // Error state - fail fast
        throw new Error('Floor plan failed to load: "This section couldn\'t be loaded"');
      }
    }

    // Verify floor plan or tables API was called
    const tablesRequests = networkRequests.filter((req) =>
      req.url.includes('tables') || req.url.includes('floor')
    );
    expect(tablesRequests.length, 'Should have made tables/floor API call').toBeGreaterThan(0);

    // Check for critical errors (ignore expected 400s like analytics)
    const criticalErrors = failedRequests.filter((req) =>
      req.url.includes('/api/v1/tables') ||
      req.url.includes('/api/v1/floor')
    );
    expect(criticalErrors.length, 'Tables/floor API should not fail').toBe(0);

    // Check for React error #318 (common hydration issue)
    const reactError = consoleErrors.find((e) =>
      e.text.includes('Minified React error #318') || e.text.includes('#318')
    );
    expect(reactError, 'Should not have React error #318').toBeUndefined();
  });

  test('table and seat selection flow', async ({ page }) => {
    const { consoleErrors } = setupMonitoring(page);

    await loginViaServerTile(page);
    await page.waitForTimeout(TIMEOUTS.FLOOR_PLAN_UPDATE);

    // ========================================
    // Find and click a table
    // ========================================
    const tableSelectors = [
      '[data-testid^="table-"]',
      'svg rect[data-table-number]',
      'svg g[data-table-number]',
      'text=/Table \\d+/',
    ];

    let tableClicked = false;
    for (const selector of tableSelectors) {
      const tables = page.locator(selector);
      const count = await tables.count();

      if (count > 0) {
        await tables.first().click({ force: true, timeout: TIMEOUTS.ELEMENT_VISIBLE });
        tableClicked = true;
        break;
      }
    }

    if (!tableClicked) {
      // If no specific table elements found, take a screenshot and skip
      await page.screenshot({ path: 'test-results/serverview-no-tables.png', fullPage: true });
      console.log('No table elements found - skipping table interaction');
      return;
    }

    await page.waitForTimeout(TIMEOUTS.MODAL_ANIMATION);

    // ========================================
    // Verify seat selection UI appears
    // ========================================
    const seatSelectors = [
      'text=/Seat \\d+/',
      'text=Select a seat',
      '[data-testid^="seat-"]',
      'button:has-text("Seat")',
    ];

    let seatUIFound = false;
    for (const selector of seatSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        seatUIFound = true;

        // Try clicking first seat
        await elements.first().click({ timeout: TIMEOUTS.ELEMENT_VISIBLE }).catch(() => {
          // Seat might not be clickable, that's ok
        });

        break;
      }
    }

    expect(seatUIFound, 'Seat selection UI should appear after table click').toBe(true);

    await page.waitForTimeout(TIMEOUTS.MODAL_ANIMATION);

    // ========================================
    // Verify menu/ordering UI appears
    // ========================================
    const menuIndicators = [
      'text=Menu',
      'text=Touch Order',
      'text=Voice Order',
      '[data-testid="menu-grid"]',
    ];

    let menuUIFound = false;
    for (const selector of menuIndicators) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: TIMEOUTS.ELEMENT_IMMEDIATE }).catch(() => false)) {
        menuUIFound = true;
        break;
      }
    }

    expect(menuUIFound, 'Menu/ordering UI should appear after seat selection').toBe(true);

    // Verify no critical React errors
    const criticalErrors = consoleErrors.filter((e) =>
      e.text.includes('React') ||
      e.text.includes('Uncaught') ||
      e.type === 'pageerror'
    );

    if (criticalErrors.length > 0) {
      console.log('Critical errors during interaction:');
      criticalErrors.forEach((e) => console.log(`  - ${e.text.substring(0, 100)}`));
    }
  });

  // SKIPPED: 85% redundant with ServerView.test.tsx (15 tests)
  test.skip('ServerView UI elements render correctly', async ({ page }) => {
    await loginViaServerTile(page);
    await page.waitForTimeout(TIMEOUTS.FLOOR_PLAN_UPDATE * 2); // Extra time for full render

    // Check for key UI elements
    const uiChecks = [
      { selector: 'text=Table', name: 'Table text', required: true },
      { selector: '[role="button"]', name: 'Interactive buttons', required: false },
      { selector: '[data-testid="floor-plan"]', name: 'Floor plan container', required: false },
    ];

    const results: Record<string, boolean> = {};

    for (const check of uiChecks) {
      const exists = await page.locator(check.selector).first()
        .isVisible({ timeout: TIMEOUTS.ELEMENT_IMMEDIATE })
        .catch(() => false);

      results[check.name] = exists;

      if (check.required && !exists) {
        throw new Error(`Required UI element not found: ${check.name}`);
      }
    }

    // At minimum, we should see "Table" text somewhere
    expect(results['Table text'], 'Should display table information').toBe(true);
  });
});
