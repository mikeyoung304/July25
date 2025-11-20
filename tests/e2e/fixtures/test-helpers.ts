/**
 * Test Helper Utilities for E2E Tests
 * Part of: Production Launch Preparation - Work Stream 1
 */

import { Page, expect } from '@playwright/test';
import { TEST_USERS, TestUserRole } from './test-users';

/**
 * Login as a demo user with the specified role
 *
 * ACTUAL APP FLOW (based on code inspection):
 * 1. App loads -> SplashScreen shows (~5-6 seconds)
 * 2. SplashScreen completes -> creates [data-testid="app-ready"]
 * 3. Login page renders with DevAuthOverlay (if VITE_DEMO_PANEL=1)
 * 4. DevAuthOverlay shows role cards (Manager, Server, Kitchen, Expo)
 * 5. Click role card -> calls handleRoleSelect()
 * 6. handleRoleSelect() calls login() with real Supabase credentials
 * 7. After successful login, navigates to /home (staff navigation hub)
 * 8. /home shows 6 workspace cards: Server, Kitchen, Kiosk, Online Order, Admin, Expo
 * 9. Click appropriate workspace card to navigate to role-specific page
 */
export async function loginAsRole(page: Page, role: TestUserRole) {
  const user = TEST_USERS[role];

  // Navigate to login page (where DevAuthOverlay is rendered)
  await page.goto('/login');

  // Wait for React app to mount (hidden marker element created after splash)
  await page.waitForSelector('[data-testid="app-ready"]', {
    timeout: 10000,
    state: 'attached'
  });

  // Map test roles to DevAuthOverlay role names
  // DevAuthOverlay only has: Manager, Server, Kitchen, Expo
  const loginRoleMapping: Record<TestUserRole, string> = {
    'owner': 'Manager',      // Owner role uses Manager in DevAuthOverlay
    'manager': 'Manager',
    'server': 'Server',
    'cashier': 'Server',     // Cashier uses Server workspace
    'kitchen': 'Kitchen',
    'expo': 'Expo'
  };

  const displayRole = loginRoleMapping[role];

  // Wait for DevAuthOverlay role cards to appear
  // Cards are rendered as Card components with role name as text
  // Structure: Card > div > div (icon) + h3 (role name)
  const roleCard = page.locator('.min-h-\\[120px\\]').filter({ hasText: displayRole });
  await expect(roleCard).toBeVisible({ timeout: 10000 });

  // Click the role card
  await roleCard.click();

  // Wait for login to complete and navigation to /home
  // DevAuthOverlay navigates to /home after successful login
  await page.waitForURL('/home', { timeout: 15000 });

  // Wait for home page workspace cards to load
  await expect(page.locator('text=Select your workspace')).toBeVisible({ timeout: 5000 });

  // Map test roles to HomePage workspace navigation
  // HomePage has: Server, Kitchen, Kiosk, Online Order, Admin, Expo
  const workspaceMapping: Record<TestUserRole, string> = {
    'owner': 'Admin',       // Owner navigates to Admin workspace
    'manager': 'Admin',     // Manager navigates to Admin workspace
    'server': 'Server',
    'cashier': 'Server',    // Cashier navigates to Server workspace
    'kitchen': 'Kitchen',
    'expo': 'Expo'
  };

  const workspaceName = workspaceMapping[role];

  // Click the appropriate workspace card on HomePage
  // NavigationCard structure: Link > div with role title in h3
  const workspaceCard = page.locator('.min-h-\\[200px\\]').filter({ hasText: workspaceName });
  await expect(workspaceCard).toBeVisible({ timeout: 5000 });
  await workspaceCard.click();

  // Wait for navigation to the workspace-specific page
  const workspaceRoutes: Record<string, string> = {
    'Server': '/server',
    'Kitchen': '/kitchen',
    'Admin': '/admin',
    'Expo': '/expo'
  };

  const expectedRoute = workspaceRoutes[workspaceName];
  await page.waitForURL(expectedRoute, { timeout: 10000 });

  // Verify we've navigated successfully
  await expect(page).toHaveURL(expectedRoute);
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
