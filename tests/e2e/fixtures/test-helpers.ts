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

  // Wait for demo panel to load
  await page.waitForSelector('[data-testid="demo-panel"]', { timeout: 5000 });

  // Click the role button in demo panel
  const roleButton = page.locator(`[data-testid="demo-login-${role}"]`);
  await expect(roleButton).toBeVisible();
  await roleButton.click();

  // Wait for navigation to role-specific page
  await page.waitForURL(/\/(server|cashier|kitchen|manager|owner)/);

  // Verify we're logged in
  await expect(page.locator(`text=${user.displayName}`)).toBeVisible({ timeout: 10000 });
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
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
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
