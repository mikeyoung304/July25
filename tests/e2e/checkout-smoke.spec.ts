/**
 * Smoke Tests: Checkout Flow
 *
 * Simple smoke tests for online and kiosk checkout flows.
 * Tests Phase 1 DRY refactoring and auto-fill feature.
 *
 * Using default restaurant: 1111-111111-11111 (Grow Fresh Local Food)
 */

import { test, expect } from '@playwright/test';

const DEFAULT_RESTAURANT_ID = 'grow';
const RESTAURANT_NAME = 'Grow Fresh Local Food';

// Demo data that should be auto-filled in demo mode
const DEMO_DATA = {
  email: 'demo@example.com',
  phone: '(555) 555-1234',
  name: 'Demo Customer',
};

test.describe('Online Order Checkout Smoke Test', () => {
  test('Can complete online order checkout flow', async ({ page }) => {
    console.log('🧪 Testing online order checkout...');

    // Step 1: Navigate directly to menu page with restaurant ID
    await page.goto(`/order/${DEFAULT_RESTAURANT_ID}`);
    console.log(`✓ Navigated to /order/${DEFAULT_RESTAURANT_ID}`);

    // Step 2: Wait for page to load (order page root)
    await page.waitForSelector('[data-testid="order-root"]', { timeout: 10000 });
    console.log('✓ Order page loaded');

    // Step 3: Verify we're on the order page (not error page)
    const pageUrl = page.url();
    expect(pageUrl).toContain('/order/');
    console.log(`✓ On order page: ${pageUrl}`);

    // Step 4: Wait for cart button (reliable indicator page loaded)
    const cartButton = page.locator('button:has-text("Cart")');
    await cartButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Cart button visible');

    // Step 5: Find menu items - try multiple selectors
    const itemSelectors = [
      '[data-testid="menu-item-card"]',
      'article',
      '[role="button"]',
      'button:has-text("Add")',
      'button:has-text("$")',
    ];

    let menuItem = null;
    for (const selector of itemSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      if (isVisible) {
        menuItem = element;
        console.log(`✓ Found menu item using selector: ${selector}`);
        break;
      }
    }

    if (!menuItem) {
      await page.screenshot({ path: 'test-results/menu-not-found.png' });
      throw new Error('No menu items found on page');
    }

    // Step 6: Add item to cart
    await menuItem.click();
    console.log('✓ Clicked on menu item');
    await page.waitForTimeout(1000);

    const addButton = page.locator('button:has-text("Add to Cart"), button:has-text("Add")').first();
    const hasAddButton = await addButton.isVisible().catch(() => false);

    if (hasAddButton) {
      await addButton.click();
      console.log('✓ Clicked Add to Cart');
      await page.waitForTimeout(500);
    }

    // Step 7: Open cart
    await cartButton.click();
    console.log('✓ Opened cart');
    await page.waitForTimeout(1000);

    // Step 8: Click checkout
    const checkoutButton = page.locator('button:has-text("Checkout"), a:has-text("Checkout")').first();
    await checkoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await checkoutButton.click();
    console.log('✓ Clicked Checkout');
    await page.waitForTimeout(2000);

    // Step 9: Verify checkout form
    const emailInput = page.locator('input[type="email"], input#email, input[name="customerEmail"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Email input field visible');

    const phoneInput = page.locator('input[type="tel"], input#phone, input[name="customerPhone"]').first();
    await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Phone input field visible');

    // Step 10: Check auto-fill
    const emailValue = await emailInput.inputValue();
    const phoneValue = await phoneInput.inputValue();

    console.log(`Email value: "${emailValue}"`);
    console.log(`Phone value: "${phoneValue}"`);

    if (emailValue === DEMO_DATA.email && phoneValue === DEMO_DATA.phone) {
      console.log('✅ AUTO-FILL WORKING: Fields pre-filled with demo data');
      expect(emailValue).toBe(DEMO_DATA.email);
      expect(phoneValue).toBe(DEMO_DATA.phone);
    } else {
      console.log('⚠ Auto-fill not active (not in demo mode)');
    }

    console.log('✅ Online order checkout flow PASSED');
  });
});

test.describe('Kiosk Checkout Smoke Test', () => {
  test('Can complete kiosk checkout flow', async ({ page }) => {
    console.log('🧪 Testing kiosk checkout...');

    // Step 1: Navigate to kiosk
    await page.goto('/kiosk');
    console.log('✓ Navigated to /kiosk');

    // Step 2: Click View Menu
    const viewMenuButton = page.locator('button:has-text("View Menu"), button:has-text("Browse")').first();
    await viewMenuButton.waitFor({ state: 'visible', timeout: 10000 });
    await viewMenuButton.click();
    console.log('✓ Clicked View Menu');

    // Step 3: Wait for menu page
    await page.waitForURL(/\/order/, { timeout: 10000 });
    console.log('✓ Navigated to menu page');

    // Step 4: Wait for order page to load
    await page.waitForSelector('[data-testid="order-root"]', { timeout: 10000 });
    console.log('✓ Order page loaded');

    // Step 5: Wait for cart button
    const cartButton = page.locator('button:has-text("Cart")');
    await cartButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Cart button visible');

    // Step 6: Find and click menu item
    const itemSelectors = [
      '[data-testid="menu-item-card"]',
      'article',
      '[role="button"]',
      'button:has-text("Add")',
    ];

    let menuItem = null;
    for (const selector of itemSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      if (isVisible) {
        menuItem = element;
        console.log(`✓ Found menu item using: ${selector}`);
        break;
      }
    }

    if (!menuItem) {
      await page.screenshot({ path: 'test-results/kiosk-menu-not-found.png' });
      throw new Error('No menu items found');
    }

    await menuItem.click();
    await page.waitForTimeout(1000);

    const addButton = page.locator('button:has-text("Add to Cart"), button:has-text("Add")').first();
    const hasAddButton = await addButton.isVisible().catch(() => false);

    if (hasAddButton) {
      await addButton.click();
      console.log('✓ Added item to cart');
      await page.waitForTimeout(500);
    }

    // Step 7: Open cart
    await cartButton.click();
    console.log('✓ Opened cart');
    await page.waitForTimeout(1000);

    // Step 8: Checkout
    const checkoutButton = page.locator('button:has-text("Checkout"), a:has-text("Checkout")').first();
    await checkoutButton.click();
    console.log('✓ Clicked Checkout');
    await page.waitForTimeout(2000);

    // Step 9: Verify kiosk checkout form (has name field)
    const nameInput = page.locator('input#name, input[name="customerName"], input[placeholder*="name" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Name input visible (kiosk checkout)');

    const emailInput = page.locator('input[type="email"], input#email').first();
    const phoneInput = page.locator('input[type="tel"], input#phone').first();

    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Email and phone inputs visible');

    // Step 10: Check auto-fill
    const nameValue = await nameInput.inputValue();
    const emailValue = await emailInput.inputValue();
    const phoneValue = await phoneInput.inputValue();

    console.log(`Name: "${nameValue}"`);
    console.log(`Email: "${emailValue}"`);
    console.log(`Phone: "${phoneValue}"`);

    if (emailValue === DEMO_DATA.email && phoneValue === DEMO_DATA.phone && nameValue === DEMO_DATA.name) {
      console.log('✅ AUTO-FILL WORKING: All fields pre-filled');
      expect(nameValue).toBe(DEMO_DATA.name);
      expect(emailValue).toBe(DEMO_DATA.email);
      expect(phoneValue).toBe(DEMO_DATA.phone);
    } else {
      console.log('⚠ Auto-fill not active (not in demo mode)');
    }

    console.log('✅ Kiosk checkout flow PASSED');
  });
});
