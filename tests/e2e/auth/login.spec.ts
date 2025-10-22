/**
 * Authentication Tests (Full Suite)
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Comprehensive authentication testing including:
 * - All role types
 * - Role-based access control
 * - Session management
 * - Error handling
 */

import { test, expect } from '@playwright/test';
import { loginAsRole, clearAppState } from '../fixtures/test-helpers';
import { TEST_USERS } from '../fixtures/test-users';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
  });

  test.describe('Demo Login', () => {
    Object.entries(TEST_USERS).forEach(([roleName, user]) => {
      test(`should login as ${roleName} successfully`, async ({ page }) => {
        await loginAsRole(page, roleName as keyof typeof TEST_USERS);

        // Verify we're on the correct page
        await expect(page).toHaveURL(new RegExp(`/${roleName}`));

        // Verify user name appears
        await expect(page.locator(`text=${user.displayName}`)).toBeVisible({
          timeout: 10000,
        });
      });
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain authentication after page reload', async ({ page }) => {
      await loginAsRole(page, 'server');

      // Capture current URL
      const currentUrl = page.url();

      // Reload page
      await page.reload();

      // Should still be at the same URL
      expect(page.url()).toBe(currentUrl);

      // Should still see user name
      await expect(page.locator('text=Test Server')).toBeVisible();
    });

    test('should maintain authentication after navigation', async ({ page }) => {
      await loginAsRole(page, 'manager');

      // Navigate to different app pages (if they exist)
      // This is a placeholder - adjust based on your actual routes
      const testRoutes = ['/manager', '/manager/settings'];

      for (const route of testRoutes) {
        await page.goto(route);
        await expect(page.locator('text=Test Manager')).toBeVisible();
      }
    });
  });

  test.describe('Role-Based Access', () => {
    test('server role should access ServerView', async ({ page }) => {
      await loginAsRole(page, 'server');
      await expect(page).toHaveURL(/\/server/);
    });

    test('kitchen role should access KDS', async ({ page }) => {
      await loginAsRole(page, 'kitchen');
      await expect(page).toHaveURL(/\/kitchen/);
    });

    test('cashier role should access checkout', async ({ page }) => {
      await loginAsRole(page, 'cashier');
      await expect(page).toHaveURL(/\/cashier/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline condition
      await page.context().setOffline(true);

      await page.goto('/');

      // Should show some error message or offline indicator
      // Adjust selector based on your actual error handling UI
      await expect(
        page.locator('text=offline').or(page.locator('text=network error'))
      ).toBeVisible({ timeout: 5000 });

      // Restore online
      await page.context().setOffline(false);
    });
  });
});
