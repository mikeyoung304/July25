/**
 * Server Order Flow - Smoke Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Critical Path: Server must be able to create and submit orders
 *
 * Test Flow:
 * 1. Login as server
 * 2. View menu items with prices
 * 3. Create new order
 * 4. Add item to order
 * 5. Submit order
 * 6. Verify success
 */

import { test, expect } from '@playwright/test';
import { loginAsRole, clearAppState } from '../fixtures/test-helpers';
import { TIMEOUTS } from '../constants/timeouts';

test.describe('Server Order Flow - Smoke Tests @smoke', () => {
  test('complete order flow: login -> view menu -> add item -> submit', async ({ page }) => {
    // Setup
    await clearAppState(page);
    await loginAsRole(page, 'server');

    // 1. Verify server view loads
    await expect(page).toHaveURL(/\/server/);

    // 2. Look for menu items with prices
    const menuItems = page.locator('[data-testid^="menu-item-"]')
      .or(page.locator('.menu-item'))
      .or(page.locator('[role="button"]:has-text("$")'));

    await expect(menuItems.first()).toBeVisible({ timeout: TIMEOUTS.ELEMENT_AFTER_NETWORK });

    // Verify at least one item has a price
    await expect(page.locator('text=/\\$\\d+\\.\\d{2}/')).toBeVisible();

    // 3. Click to open new order if button exists
    const newOrderButton = page.locator('[data-testid="new-order-button"]')
      .or(page.locator('button:has-text("New Order")'))
      .or(page.locator('button:has-text("Create Order")'));

    if (await newOrderButton.isVisible({ timeout: TIMEOUTS.ELEMENT_IMMEDIATE }).catch(() => false)) {
      await newOrderButton.click();
    }

    // 4. Add first menu item to order
    await menuItems.first().click();

    // 5. Submit order
    const submitButton = page.locator('[data-testid="submit-order"]')
      .or(page.locator('button:has-text("Submit")'))
      .or(page.locator('button:has-text("Send to Kitchen")'));

    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
    await submitButton.click();

    // 6. Verify success indication
    const successIndicator = page.locator('text=/success|sent|submitted|order #/i')
      .or(page.locator('[data-testid="order-success"]'));

    await expect(successIndicator).toBeVisible({ timeout: TIMEOUTS.ELEMENT_AFTER_NETWORK });
  });
});
