/**
 * Authentication Smoke Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Critical Path: Invalid credentials error handling
 *
 * Note: This test covers error scenarios NOT tested in login.spec.ts.
 * The main login.spec.ts tests successful logins and session persistence,
 * while this smoke test validates error handling for invalid credentials.
 */

import { test, expect } from '@playwright/test';
import { clearAppState } from '../fixtures/test-helpers';
import { TIMEOUTS } from '../constants/timeouts';

test.describe('Authentication - Smoke Tests @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
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
