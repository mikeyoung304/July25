/**
 * Production ServerView Detailed Analysis
 * Extended test with longer waits and network monitoring
 */

import { test, expect, Page } from '@playwright/test';

const PRODUCTION_URL = 'https://july25-client.vercel.app';

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  failure?: string;
}

const networkRequests: NetworkRequest[] = [];
const failedRequests: NetworkRequest[] = [];

test.describe('Production ServerView Detailed Analysis', () => {
  test('Monitor ServerView loading with network analysis', async ({ page }) => {
    // Monitor network requests
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
      });
    });

    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();

      // Log API calls and important resources
      if (url.includes('/api/') || url.includes('supabase') || url.includes('floor')) {
        console.log(`[NETWORK] ${status} ${response.request().method()} ${url}`);
      }

      if (status >= 400) {
        const req = {
          url,
          method: response.request().method(),
          status,
          statusText: response.statusText(),
        };
        failedRequests.push(req);
        console.log(`[FAILED REQUEST] ${status} ${req.method} ${url}`);
      }
    });

    page.on('requestfailed', (request) => {
      const failure = {
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText || 'Unknown error',
      };
      failedRequests.push(failure);
      console.log(`[REQUEST FAILED] ${failure.method} ${failure.url} - ${failure.failure}`);
    });

    // Navigate and login
    console.log('\n=== Navigating to production ===');
    await page.goto(PRODUCTION_URL);
    await page.screenshot({ path: 'test-results/detailed-1-dashboard.png', fullPage: true });

    // Click Server tile
    console.log('\n=== Clicking Server workspace ===');
    const serverTile = page.locator('[data-testid="workspace-tile-server"]');
    await serverTile.waitFor({ timeout: 10000 });
    await serverTile.click();

    // Handle auth
    const authModal = page.locator('text=Authentication Required');
    if (await authModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Signing in...');
      await page.locator('button:has-text("Sign In")').click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'test-results/detailed-2-after-auth.png', fullPage: true });

    console.log('\n=== Waiting for floor plan (30 seconds) ===');

    // Wait and check every 5 seconds
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);

      const loadingText = await page.locator('text=Loading floor plan').isVisible().catch(() => false);
      const errorText = await page.locator('text=This section couldn\'t be loaded').isVisible().catch(() => false);

      console.log(`${(i + 1) * 5}s: Loading=${loadingText}, Error=${errorText}`);

      await page.screenshot({
        path: `test-results/detailed-3-wait-${(i + 1) * 5}s.png`,
        fullPage: true
      });

      if (!loadingText) {
        console.log('Floor plan loading completed or changed state!');
        break;
      }
    }

    // Check final state
    console.log('\n=== Final State Analysis ===');

    const pageContent = await page.content();
    const bodyText = await page.locator('body').textContent();

    console.log('Body text includes:');
    console.log('  - "Loading floor plan": ', bodyText?.includes('Loading floor plan'));
    console.log('  - "This section couldn\'t be loaded": ', bodyText?.includes('This section couldn\'t be loaded'));
    console.log('  - "Available Tables": ', bodyText?.includes('Available Tables'));
    console.log('  - "Table": ', bodyText?.includes('Table'));

    // Check for specific elements
    const elements = {
      floorPlan: await page.locator('[data-testid="floor-plan"]').count(),
      tables: await page.locator('[data-testid^="table-"]').count(),
      loadingSpinner: await page.locator('.loading, [role="progressbar"]').count(),
      errorMessage: await page.locator('[role="alert"], .error').count(),
    };

    console.log('\nElement counts:');
    console.log(JSON.stringify(elements, null, 2));

    // Network summary
    console.log('\n=== Network Summary ===');
    console.log(`Total requests: ${networkRequests.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);

    if (failedRequests.length > 0) {
      console.log('\nFailed Requests:');
      failedRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.status || 'N/A'} ${req.method} ${req.url}`);
        if (req.failure) console.log(`   Error: ${req.failure}`);
      });
    }

    // Check for floor plan related API calls
    const floorPlanRequests = networkRequests.filter(req =>
      req.url.includes('floor') ||
      req.url.includes('table') ||
      req.url.includes('layout')
    );

    console.log(`\nFloor plan related requests: ${floorPlanRequests.length}`);
    floorPlanRequests.forEach(req => {
      console.log(`  - ${req.method} ${req.url}`);
    });

    // Final screenshot
    await page.screenshot({
      path: 'test-results/detailed-4-final.png',
      fullPage: true
    });

    console.log('\n=== Test Complete ===\n');
  });
});
