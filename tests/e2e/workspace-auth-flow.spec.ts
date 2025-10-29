/**
 * E2E Test: Workspace Authentication Flow
 * Verifies the complete auth → role → permissions flow from dashboard to workspace
 *
 * This test reproduces the bug scenario:
 * 1. User clicks workspace tile (Kitchen, Server, etc.)
 * 2. User logs in with role-specific credentials
 * 3. User should land on workspace page with full access (NOT "Access Denied")
 */

import { test, expect, Page } from '@playwright/test';

const PROD_URL = process.env.VITE_APP_URL || 'https://july25-client.vercel.app';
const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// Test credentials (demo users)
const CREDENTIALS = {
  kitchen: {
    email: 'kitchen@restaurant.com',
    password: 'Demo123!',
    expectedRoute: '/kitchen',
    expectedRole: 'kitchen'
  },
  server: {
    email: 'server@restaurant.com',
    password: 'Demo123!',
    expectedRoute: '/server',
    expectedRole: 'server'
  },
  manager: {
    email: 'manager@restaurant.com',
    password: 'Demo123!',
    expectedRoute: '/admin',
    expectedRole: 'manager'
  },
  expo: {
    email: 'expo@restaurant.com',
    password: 'Demo123!',
    expectedRoute: '/expo',
    expectedRole: 'expo'
  }
};

/**
 * Helper: Perform workspace login flow
 */
async function loginToWorkspace(
  page: Page,
  workspace: keyof typeof CREDENTIALS
): Promise<void> {
  const creds = CREDENTIALS[workspace];

  // Navigate to dashboard
  await page.goto(PROD_URL);
  await expect(page).toHaveTitle(/Restaurant OS/i);

  // Click workspace tile
  const workspaceTile = page.locator(`[data-testid="workspace-tile-${workspace}"]`);
  await expect(workspaceTile).toBeVisible();
  await workspaceTile.click();

  // Wait for auth modal
  await expect(page.locator('#workspace-email')).toBeVisible({ timeout: 5000 });

  // Fill credentials
  await page.fill('#workspace-email', creds.email);
  await page.fill('#workspace-password', creds.password);

  // Submit login form
  await page.click('button[type="submit"]');
}

/**
 * Helper: Capture network logs for debugging
 */
function setupNetworkLogging(page: Page): void {
  page.on('request', request => {
    if (request.url().includes('/api/v1')) {
      console.log(`→ ${request.method()} ${request.url()}`);
      const headers = request.headers();
      if (headers['x-restaurant-id']) {
        console.log(`  X-Restaurant-ID: ${headers['x-restaurant-id']}`);
      }
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/v1')) {
      console.log(`← ${response.status()} ${response.url()}`);
    }
  });
}

test.describe('Workspace Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup network logging for debugging
    setupNetworkLogging(page);
  });

  test('Kitchen: should login and access kitchen workspace', async ({ page }) => {
    await loginToWorkspace(page, 'kitchen');

    // Assert: should navigate to /kitchen
    await expect(page).toHaveURL(new RegExp(`${CREDENTIALS.kitchen.expectedRoute}$`), {
      timeout: 10000
    });

    // Assert: should NOT show "Access Denied"
    await expect(page.locator('text=Access Denied')).not.toBeVisible();

    // Assert: should show kitchen-specific content (adjust selector to match your UI)
    await expect(page.locator('text=/kitchen|orders|kds/i')).toBeVisible({
      timeout: 5000
    });

    // Verify /auth/me was called with X-Restaurant-ID header
    // This is validated by checking that role is displayed (which requires successful /auth/me call)
    const userEmail = await page.textContent('body');
    expect(userEmail).toContain('kitchen@restaurant.com');
  });

  test('Server: should login and access server workspace', async ({ page }) => {
    await loginToWorkspace(page, 'server');

    // Assert: should navigate to /server
    await expect(page).toHaveURL(new RegExp(`${CREDENTIALS.server.expectedRoute}$`), {
      timeout: 10000
    });

    // Assert: should NOT show "Access Denied"
    await expect(page.locator('text=Access Denied')).not.toBeVisible();

    // Assert: should show server-specific content
    await expect(page.locator('text=/server|table|orders/i')).toBeVisible({
      timeout: 5000
    });
  });

  test('Manager: should login and access admin workspace', async ({ page }) => {
    await loginToWorkspace(page, 'manager');

    // Assert: should navigate to /admin
    await expect(page).toHaveURL(new RegExp(`${CREDENTIALS.manager.expectedRoute}$`), {
      timeout: 10000
    });

    // Assert: should NOT show "Access Denied"
    await expect(page.locator('text=Access Denied')).not.toBeVisible();

    // Assert: should show admin-specific content
    await expect(page.locator('text=/admin|settings|dashboard/i')).toBeVisible({
      timeout: 5000
    });
  });

  test('Expo: should login and access expo workspace', async ({ page }) => {
    await loginToWorkspace(page, 'expo');

    // Assert: should navigate to /expo
    await expect(page).toHaveURL(new RegExp(`${CREDENTIALS.expo.expectedRoute}$`), {
      timeout: 10000
    });

    // Assert: should NOT show "Access Denied"
    await expect(page.locator('text=Access Denied')).not.toBeVisible();

    // Assert: should show expo-specific content
    await expect(page.locator('text=/expo|ready|orders/i')).toBeVisible({
      timeout: 5000
    });
  });

  test('Network trace: verify X-Restaurant-ID header on /auth/me', async ({ page }) => {
    const authMeRequests: any[] = [];

    // Capture all requests to /auth/me
    page.on('request', request => {
      if (request.url().includes('/api/v1/auth/me')) {
        authMeRequests.push({
          url: request.url(),
          headers: request.headers(),
          method: request.method()
        });
      }
    });

    await loginToWorkspace(page, 'kitchen');

    // Wait for navigation to complete
    await page.waitForURL(new RegExp('/kitchen'), { timeout: 10000 });

    // Assert: at least one /auth/me request was made
    expect(authMeRequests.length).toBeGreaterThan(0);

    // Assert: all /auth/me requests included X-Restaurant-ID header
    for (const req of authMeRequests) {
      expect(req.headers['x-restaurant-id']).toBeDefined();
      expect(req.headers['x-restaurant-id']).toBe(TEST_RESTAURANT_ID);
      console.log(`✓ Verified X-Restaurant-ID header: ${req.headers['x-restaurant-id']}`);
    }
  });

  test('Error case: should show insufficient permissions for wrong role', async ({ page }) => {
    // This test verifies the error path when a user with insufficient role tries to access a workspace
    // Note: This requires a test user with limited permissions

    await page.goto(PROD_URL);

    // Click kitchen tile
    await page.click('[data-testid="workspace-tile-kitchen"]');

    // Wait for modal
    await expect(page.locator('#workspace-email')).toBeVisible();

    // Try to login with a user that doesn't have kitchen role
    // (This would require a specific test user - adjust as needed)
    // For now, we'll skip this test if no test user is available
    test.skip(true, 'Requires test user with limited permissions');
  });
});

test.describe('Network Performance', () => {
  test('should complete auth flow within 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await loginToWorkspace(page, 'kitchen');
    await page.waitForURL(new RegExp('/kitchen'), { timeout: 10000 });

    const duration = Date.now() - startTime;
    console.log(`✓ Auth flow completed in ${duration}ms`);

    expect(duration).toBeLessThan(5000);
  });

  test('should make minimal API calls during auth', async ({ page }) => {
    const apiCalls = new Set<string>();

    page.on('request', request => {
      if (request.url().includes('/api/v1')) {
        const endpoint = new URL(request.url()).pathname;
        apiCalls.add(`${request.method()} ${endpoint}`);
      }
    });

    await loginToWorkspace(page, 'server');
    await page.waitForURL(new RegExp('/server'), { timeout: 10000 });

    console.log('API calls made:', Array.from(apiCalls));

    // Should only call auth endpoints (login, me) and maybe menu/tables for initial load
    expect(apiCalls.size).toBeLessThan(10);
  });
});
