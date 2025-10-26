/**
 * Test Helper Utilities for E2E Tests
 * Part of: Production Launch Preparation - Work Stream 1
 */

import { Page, expect } from '@playwright/test';
import { TEST_USERS, TestUserRole } from './test-users';

/**
 * Login as a demo user with the specified role
 */
export async function loginAsRole(page: Page, role: TestUserRole) {
  const user = TEST_USERS[role];

  // Navigate to home page
  await page.goto('/');

  // Wait for React app to mount
  await page.waitForSelector('[data-testid="app-ready"]', { timeout: 3000 });

  // Wait for splash screen to complete and demo buttons to appear (6+ seconds for splash)
  // Demo role buttons show capitalized role names: "Server", "Kitchen", "Manager", etc.
  const capitalizedRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const roleButton = page.locator(`button:has-text("${capitalizedRole}")`).first();
  await expect(roleButton).toBeVisible({ timeout: 10000 });
  await roleButton.click();

  // Wait for navigation to role-specific page or /home
  await page.waitForURL(/\/(home|server|cashier|kitchen|manager|owner|expo)/, { timeout: 10000 });

  // Verify we've navigated successfully
  await expect(page).toHaveURL(/\/(home|server|cashier|kitchen|manager|owner|expo)/);
}

/**
 * Wait for WebSocket connection to be established
 */
export async function waitForWebSocket(page: Page) {
  // Wait for WebSocket to connect (check for connection indicator)
  await page.waitForFunction(() => {
    return window.localStorage.getItem('websocket-connected') === 'true';
  }, { timeout: 10000 });
}

/**
 * Clear all application state (localStorage, sessionStorage, cookies)
 */
export async function clearAppState(page: Page) {
  try {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  } catch (error) {
    // Ignore localStorage access errors (page not navigated yet)
  }
  await page.context().clearCookies();
}

/**
 * Wait for an order to appear in the KDS
 */
export async function waitForOrderInKDS(page: Page, orderNumber: string) {
  const orderCard = page.locator(`[data-testid="order-card-${orderNumber}"]`);
  await expect(orderCard).toBeVisible({ timeout: 15000 });
  return orderCard;
}

/**
 * Create a simple test order
 */
export async function createSimpleOrder(page: Page) {
  // This is a placeholder - implementation depends on your UI structure
  // You'll need to customize this based on your actual ServerView implementation
  await page.click('[data-testid="new-order-button"]');
  await page.click('[data-testid="menu-item-burger"]');
  await page.click('[data-testid="menu-item-fries"]');
  await page.click('[data-testid="submit-order"]');
}
