/**
 * Authentication Smoke Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Critical Path: Demo login must work for all roles
 *
 * Test Coverage:
 * - Server role login
 * - Session persistence across page reload
 * - Proper role-based navigation
 */

import { test, expect } from '@playwright/test';
import { loginAsRole, clearAppState } from '../fixtures/test-helpers';

test.describe('Authentication - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear state before each test
    await clearAppState(page);
  });

  test('should login as server role successfully', async ({ page }) => {
    // Arrange & Act
    await loginAsRole(page, 'server');

    // Assert: Check we're on ServerView page
    await expect(page).toHaveURL(/\/server/);
    await expect(page.locator('text=ServerView').or(page.locator('text=Server View'))).toBeVisible();
  });

  test('should persist session across page reload', async ({ page }) => {
    // Arrange: Login as server
    await loginAsRole(page, 'server');

    // Act: Reload the page
    await page.reload();

    // Assert: Should still be logged in
    await expect(page).toHaveURL(/\/server/);
    await expect(page.locator('text=Test Server')).toBeVisible();
  });

  test('should navigate to correct role-specific page', async ({ page }) => {
    // Test different roles navigate to their specific pages
    const roles = ['server', 'cashier', 'kitchen', 'manager'] as const;

    for (const role of roles) {
      await clearAppState(page);
      await loginAsRole(page, role);

      // Verify URL contains the role
      await expect(page).toHaveURL(new RegExp(`/${role}`));

      // Logout (if logout button exists)
      const logoutButton = page.locator('[data-testid="logout-button"]');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
    }
  });
});
