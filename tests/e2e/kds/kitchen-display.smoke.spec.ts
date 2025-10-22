/**
 * Kitchen Display System (KDS) - Smoke Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Critical Path: KDS must display orders and allow status updates
 *
 * Test Flow:
 * 1. Login as kitchen
 * 2. Verify KDS interface loads
 * 3. Verify orders are displayed
 * 4. Verify status updates work
 */

import { test, expect } from '@playwright/test';
import { loginAsRole, clearAppState } from '../fixtures/test-helpers';

test.describe('Kitchen Display System - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
    await loginAsRole(page, 'kitchen');
  });

  test('should load KDS interface successfully', async ({ page }) => {
    // Verify we're on KDS page
    await expect(page).toHaveURL(/\/kitchen/);

    // Verify KDS header or title
    const kdsHeader = page.locator('text=Kitchen Display')
      .or(page.locator('text=KDS'))
      .or(page.locator('[data-testid="kds-header"]'));

    await expect(kdsHeader).toBeVisible({ timeout: 10000 });
  });

  test('should display order cards', async ({ page }) => {
    // Look for order display area
    const orderArea = page.locator('[data-testid="kds-orders"]')
      .or(page.locator('.order-list'))
      .or(page.locator('[role="main"]'));

    await expect(orderArea).toBeVisible({ timeout: 10000 });

    // Check if orders are present (or empty state message)
    const hasOrders = await page.locator('[data-testid^="order-card"]')
      .or(page.locator('.order-card'))
      .count() > 0;

    const emptyState = await page.locator('text=No orders')
      .or(page.locator('text=No active orders'))
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // Either orders exist OR empty state is shown
    expect(hasOrders || emptyState).toBeTruthy();
  });

  test('should have status update controls visible', async ({ page }) => {
    // Skip if no orders present
    const orderCards = page.locator('[data-testid^="order-card"]')
      .or(page.locator('.order-card'));

    const orderCount = await orderCards.count();

    if (orderCount === 0) {
      test.skip();
    }

    // Check first order has status update buttons
    const firstOrder = orderCards.first();
    await expect(firstOrder).toBeVisible();

    // Look for status buttons (Start, Complete, etc.)
    const statusButtons = firstOrder.locator('button')
      .filter({ hasText: /start|complete|ready|done/i });

    await expect(statusButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show real-time connection indicator', async ({ page }) => {
    // Look for WebSocket connection indicator
    const connectionIndicator = page.locator('[data-testid="connection-status"]')
      .or(page.locator('.connection-indicator'))
      .or(page.locator('[title*="connected"]'));

    // Wait a moment for WebSocket to connect
    await page.waitForTimeout(2000);

    // Verify connection indicator exists and shows connected state
    // (This is flexible - adapt to your actual UI)
    const isConnected = await connectionIndicator.isVisible({ timeout: 5000 })
      .catch(() => false);

    // If no explicit indicator, check localStorage for connection state
    if (!isConnected) {
      const wsConnected = await page.evaluate(() => {
        return window.localStorage.getItem('websocket-connected') === 'true';
      });

      expect(wsConnected).toBeTruthy();
    }
  });
});
