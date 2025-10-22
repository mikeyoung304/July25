/**
 * Server Order Flow - Smoke Tests
 * Part of: Production Launch Preparation - Work Stream 1
 *
 * Critical Path: Server must be able to create and submit orders
 *
 * Test Flow:
 * 1. Login as server
 * 2. Create new order
 * 3. Add items to order
 * 4. Submit order
 * 5. Verify order appears in system
 */

import { test, expect } from '@playwright/test';
import { loginAsRole, clearAppState } from '../fixtures/test-helpers';

test.describe('Server Order Flow - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
    await loginAsRole(page, 'server');
  });

  test('should create and submit a simple order', async ({ page }) => {
    // Step 1: Verify we're on ServerView
    await expect(page).toHaveURL(/\/server/);

    // Step 2: Look for new order button or order entry interface
    // Note: Adjust selectors based on your actual ServerView implementation
    const newOrderButton = page.locator('[data-testid="new-order-button"]')
      .or(page.locator('button:has-text("New Order")'))
      .or(page.locator('button:has-text("Create Order")'));

    // If button exists, click it
    if (await newOrderButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newOrderButton.click();
    }

    // Step 3: Add menu items
    // Look for menu items by common patterns
    const menuItems = page.locator('[data-testid^="menu-item-"]')
      .or(page.locator('.menu-item'))
      .or(page.locator('[role="button"]:has-text("$")'));

    // Wait for menu to load
    await expect(menuItems.first()).toBeVisible({ timeout: 10000 });

    // Click first menu item
    await menuItems.first().click();

    // Step 4: Submit order
    const submitButton = page.locator('[data-testid="submit-order"]')
      .or(page.locator('button:has-text("Submit")'))
      .or(page.locator('button:has-text("Send to Kitchen")'));

    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Step 5: Verify success
    // Look for success message or order confirmation
    const successIndicator = page.locator('text=success').or(
      page.locator('text=sent').or(
        page.locator('text=submitted').or(
          page.locator('[data-testid="order-success"]')
        )
      )
    );

    await expect(successIndicator).toBeVisible({ timeout: 10000 });
  });

  test('should display menu items with prices', async ({ page }) => {
    // Verify menu loads with items
    const menuContainer = page.locator('[data-testid="menu-container"]')
      .or(page.locator('.menu'))
      .or(page.locator('[role="menu"]'));

    await expect(menuContainer).toBeVisible({ timeout: 10000 });

    // Verify at least one item with price is visible
    const pricePattern = /\$\d+\.\d{2}/;
    await expect(page.locator(`text=${pricePattern}`)).toBeVisible();
  });
});
