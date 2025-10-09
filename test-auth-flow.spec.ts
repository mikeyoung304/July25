/**
 * Comprehensive End-to-End Authentication & Authorization Test
 *
 * Tests the complete user journey:
 * 1. Demo login functionality
 * 2. Authorization checks for each role
 * 3. Navigation and route protection
 * 4. Scopes verification
 */

import { test, expect, Page } from '@playwright/test';

// Production URL (publicly accessible)
// Preview deployments require Vercel auth, so use production for E2E tests
// Override with: VERCEL_URL=<url> npx playwright test
const VERCEL_URL = process.env.VERCEL_URL || 'https://july25-client.vercel.app';
const TEST_TIMEOUT = 60000;

interface TestRole {
  name: string;
  email: string;
  expectedRoute: string;
  allowedRoutes: string[];
  deniedRoutes: string[];
}

const TEST_ROLES: TestRole[] = [
  {
    name: 'Manager',
    email: 'manager@restaurant.com',
    expectedRoute: '/',
    allowedRoutes: ['/', '/dashboard', '/server', '/kitchen', '/expo', '/performance', '/history'],
    deniedRoutes: ['/admin']
  },
  {
    name: 'Server',
    email: 'server@restaurant.com',
    expectedRoute: '/server',
    allowedRoutes: ['/', '/server', '/history'],
    deniedRoutes: ['/admin', '/dashboard', '/kitchen', '/performance']
  },
  {
    name: 'Kitchen',
    email: 'kitchen@restaurant.com',
    expectedRoute: '/kitchen',
    allowedRoutes: ['/', '/kitchen', '/expo'],
    deniedRoutes: ['/admin', '/dashboard', '/server', '/performance']
  }
];

test.describe('Authentication & Authorization Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for each test
    test.setTimeout(TEST_TIMEOUT);

    // Clear all cookies and storage before each test
    await page.context().clearCookies();
    await page.goto(`${VERCEL_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Wait for splash screen to disappear (if present)
    // Look for common splash screen indicators and wait for them to be hidden
    const splashScreen = page.locator('[data-testid="splash-screen"], .splash-screen, .loading-screen').first();
    if (await splashScreen.isVisible().catch(() => false)) {
      await splashScreen.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Wait a bit for any animations to complete
    await page.waitForTimeout(1000);
  });

  test('Page loads correctly and demo panel is visible', async ({ page }) => {
    await test.step('Login page loads', async () => {
      await expect(page).toHaveTitle(/Restaurant OS/i);
      await expect(page.locator('h2')).toContainText('Restaurant OS Login');
    });

    await test.step('Demo panel renders', async () => {
      // Scroll down to make demo buttons visible (they're in bottom half of screen)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

      const demoSection = page.locator('text=Quick Demo Access');
      await expect(demoSection).toBeVisible({ timeout: 10000 });
    });

    await test.step('All demo role cards are present', async () => {
      await expect(page.locator('text=Manager')).toBeVisible();
      await expect(page.locator('text=Server')).toBeVisible();
      await expect(page.locator('text=Kitchen')).toBeVisible();
      await expect(page.locator('text=Expo')).toBeVisible();
      await expect(page.locator('text=Cashier')).toBeVisible();
    });
  });

  for (const role of TEST_ROLES) {
    test.describe(`${role.name} Role Tests`, () => {

      test(`${role.name}: Can login successfully`, async ({ page }) => {
        await test.step('Click demo role button', async () => {
          // Scroll to make demo buttons visible
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

          const roleButton = page.locator(`button:has-text("${role.name}")`).first();
          await roleButton.scrollIntoViewIfNeeded();
          await roleButton.click();
        });

        await test.step('Wait for login to complete', async () => {
          // Wait for navigation away from login page
          await page.waitForURL(url => !url.pathname.includes('/login'), {
            timeout: 15000
          });
        });

        await test.step('Verify redirected to correct route', async () => {
          const currentURL = page.url();
          console.log(`${role.name} redirected to: ${currentURL}`);

          const pathname = new URL(currentURL).pathname;
          expect(pathname).toBe(role.expectedRoute);
        });

        await test.step('Page content loads (not showing unauthorized)', async () => {
          // Wait for page to fully load
          await page.waitForLoadState('networkidle');

          // Check that we're NOT on unauthorized page
          const pageText = await page.textContent('body');
          expect(pageText).not.toContain('Access Denied');
          expect(pageText).not.toContain('Unauthorized');

          // Verify we see actual content
          await expect(page.locator('body')).not.toBeEmpty();
        });
      });

      test(`${role.name}: Can access allowed routes`, async ({ page }) => {
        // Login first
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        const button = page.locator(`button:has-text("${role.name}")`).first();
        await button.scrollIntoViewIfNeeded();
        await button.click();
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

        for (const route of role.allowedRoutes) {
          await test.step(`Access ${route}`, async () => {
            await page.goto(`${VERCEL_URL}${route}`);
            await page.waitForLoadState('networkidle');

            // Should NOT see unauthorized message
            const pageText = await page.textContent('body');
            expect(pageText).not.toContain('Access Denied');
            expect(pageText).not.toContain('Unauthorized Access');

            console.log(`✅ ${role.name} can access ${route}`);
          });
        }
      });

      test(`${role.name}: Cannot access denied routes`, async ({ page }) => {
        // Login first
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        const button = page.locator(`button:has-text("${role.name}")`).first();
        await button.scrollIntoViewIfNeeded();
        await button.click();
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

        for (const route of role.deniedRoutes) {
          await test.step(`Denied from ${route}`, async () => {
            await page.goto(`${VERCEL_URL}${route}`);
            await page.waitForLoadState('networkidle');

            // Check if redirected to unauthorized page OR shows unauthorized message
            const currentURL = page.url();
            const pathname = new URL(currentURL).pathname;
            const pageText = await page.textContent('body');

            const isUnauthorized =
              pathname === '/unauthorized' ||
              pageText?.includes('Access Denied') ||
              pageText?.includes('Unauthorized') ||
              pageText?.includes('permission');

            expect(isUnauthorized).toBeTruthy();
            console.log(`✅ ${role.name} correctly denied from ${route}`);
          });
        }
      });
    });
  }

  test('Manager: Verify scopes are returned on login', async ({ page }) => {
    // Listen to network requests
    const loginRequests: any[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/auth/login')) {
        try {
          const json = await response.json();
          loginRequests.push(json);
        } catch (e) {
          // Not JSON response
        }
      }
    });

    // Perform login
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    const managerButton = page.locator('button:has-text("Manager")').first();
    await managerButton.scrollIntoViewIfNeeded();
    await managerButton.click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // Verify scopes in response
    await test.step('Login response includes scopes', async () => {
      expect(loginRequests.length).toBeGreaterThan(0);

      const loginResponse = loginRequests[0];
      expect(loginResponse.user).toBeDefined();
      expect(loginResponse.user.role).toBe('manager');
      expect(loginResponse.user.scopes).toBeDefined();
      expect(Array.isArray(loginResponse.user.scopes)).toBeTruthy();
      expect(loginResponse.user.scopes.length).toBeGreaterThan(0);

      console.log('Manager scopes:', loginResponse.user.scopes);

      // Check for expected manager scopes
      expect(loginResponse.user.scopes).toContain('orders.read');
      expect(loginResponse.user.scopes).toContain('menu.write');
    });
  });

  test('Check browser console for errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network errors
    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate and login
    await page.goto(`${VERCEL_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    const managerButton = page.locator('button:has-text("Manager")').first();
    await managerButton.scrollIntoViewIfNeeded();
    await managerButton.click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Check for critical errors
    await test.step('No critical console errors', async () => {
      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('favicon') && // Ignore favicon errors
        !err.includes('sourcemap') && // Ignore sourcemap warnings
        !err.includes('DevTools')     // Ignore DevTools messages
      );

      if (criticalErrors.length > 0) {
        console.log('Console errors found:', criticalErrors);
      }

      // Don't fail test but log errors
      expect(criticalErrors.length).toBe(0);
    });

    await test.step('No failed API requests', async () => {
      const apiErrors = networkErrors.filter(err => err.includes('/api/'));

      if (apiErrors.length > 0) {
        console.log('API errors found:', apiErrors);
      }

      expect(apiErrors.length).toBe(0);
    });
  });

  test('Unauthorized page exists and displays correctly', async ({ page }) => {
    await page.goto(`${VERCEL_URL}/unauthorized`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('a:has-text("Go to Home")')).toBeVisible();
  });
});

test.describe('Debug: Investigate "No Access" Issue', () => {

  test('Capture full auth flow details', async ({ page }) => {
    const logs: any[] = [];

    // Capture all relevant events
    page.on('console', msg => {
      if (msg.text().includes('canAccess') ||
          msg.text().includes('Authorization') ||
          msg.text().includes('🔐')) {
        logs.push({ type: 'console', text: msg.text() });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/v1/auth/')) {
        try {
          const json = await response.json();
          logs.push({
            type: 'api-response',
            url: response.url(),
            status: response.status(),
            data: json
          });
        } catch (e) {
          // Not JSON
        }
      }
    });

    // Perform login
    await page.goto(`${VERCEL_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    const managerButton = page.locator('button:has-text("Manager")').first();
    await managerButton.scrollIntoViewIfNeeded();
    await managerButton.click();

    // Wait and capture state
    await page.waitForTimeout(3000);

    // Get localStorage
    const localStorage = await page.evaluate(() => {
      return JSON.stringify(window.localStorage);
    });

    // Get current user state from React DevTools if available
    const reactState = await page.evaluate(() => {
      return (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    });

    // Print all captured data
    console.log('=== AUTH FLOW LOGS ===');
    console.log(JSON.stringify(logs, null, 2));
    console.log('\n=== LOCAL STORAGE ===');
    console.log(localStorage);
    console.log('\n=== CURRENT URL ===');
    console.log(page.url());

    // Check what page is actually showing
    const bodyText = await page.textContent('body');
    console.log('\n=== PAGE CONTENT PREVIEW ===');
    console.log(bodyText?.substring(0, 500));

    // Take screenshot
    await page.screenshot({
      path: '/tmp/auth-debug-screenshot.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot saved to: /tmp/auth-debug-screenshot.png');
  });
});
