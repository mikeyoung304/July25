/**
 * Authentication Smoke Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Critical Path: Demo login must work
 *
 * Test Coverage:
 * - Server role login with session persistence
 * - Invalid credentials error handling
 */

import { test, expect } from '@playwright/test';
import { loginAsRole, clearAppState } from '../fixtures/test-helpers';
import { TIMEOUTS } from '../constants/timeouts';

test.describe('Authentication - Smoke Tests @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
  });

  test('should login as server role and navigate to server view', async ({ page }) => {
    // Login as server
    await loginAsRole(page, 'server');

    // Verify navigation to server page
    await expect(page).toHaveURL(/\/server/);

    // Verify session persists across reload
    await page.reload();
    await expect(page).toHaveURL(/\/server/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to login
    await page.goto('/');

    // Click server workspace to trigger auth modal
    const serverTile = page.locator('[data-testid="workspace-tile-server"]');
    await serverTile.click();

    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Verify error shown
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  });
});
