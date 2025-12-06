/**
 * Kitchen Display System (KDS) - Smoke Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Critical Path: KDS must display orders and allow status updates
 *
 * Consolidated single test for faster, more reliable smoke testing
 */

import { test, expect } from '@playwright/test';
import { loginAsRole, clearAppState } from '../fixtures/test-helpers';
import { TIMEOUTS } from '../constants/timeouts';

test.describe('Kitchen Display System - Smoke Tests @smoke', () => {
  test('should load KDS with orders and status controls', async ({ page }) => {
    // Setup
    await clearAppState(page);
    await loginAsRole(page, 'kitchen');

    // 1. Verify KDS page loads
    await expect(page).toHaveURL(/\/kitchen/);

    // 2. Verify KDS header is visible
    const kdsHeader = page.locator('text=Kitchen Display')
      .or(page.locator('text=KDS'))
      .or(page.locator('[data-testid="kds-header"]'));
    await expect(kdsHeader).toBeVisible({ timeout: TIMEOUTS.ELEMENT_AFTER_NETWORK });

    // 3. Verify order area exists (orders or empty state)
    const orderArea = page.locator('[data-testid="kds-orders"]')
      .or(page.locator('.order-list'))
      .or(page.locator('[role="main"]'));
    await expect(orderArea).toBeVisible();

    // 4. Check for orders or empty state
    const orderCards = page.locator('[data-testid^="order-card"]').or(page.locator('.order-card'));
    const hasOrders = await orderCards.count() > 0;

    if (hasOrders) {
      // Verify status controls on first order
      const firstOrder = orderCards.first();
      const statusButtons = firstOrder.locator('button').filter({ hasText: /start|complete|ready|done/i });
      await expect(statusButtons.first()).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
    } else {
      // Verify empty state is shown
      const emptyState = page.locator('text=No orders').or(page.locator('text=No active orders'));
      await expect(emptyState).toBeVisible();
    }

    // 5. Connection indicator is nice-to-have, don't fail if missing
    // Real-time testing is covered by other tests
  });
});
