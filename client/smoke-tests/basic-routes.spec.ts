import { test, expect } from '@playwright/test';

test.describe('Basic route smoke tests', () => {
  test('home page loads with expected content', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check URL
    await expect(page).toHaveURL('http://localhost:4173/');
    
    // Check for actual home page content - look for the hero section
    await expect(page.locator('text=Fresh, Healthy, Local')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Farm-to-table meals delivered')).toBeVisible();
    
    // Verify React app mounted successfully
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    await expect(rootElement).not.toBeEmpty();
  });

  test('checkout page loads with cart message', async ({ page }) => {
    await page.goto('/checkout');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check URL
    await expect(page).toHaveURL('http://localhost:4173/checkout');
    
    // Check for empty cart message (since we haven't added items)
    await expect(page.locator('text=Your cart is empty')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Back to Menu')).toBeVisible();
    
    // Verify React app mounted successfully
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    await expect(rootElement).not.toBeEmpty();
  });

  test('order page loads with menu sections', async ({ page }) => {
    await page.goto('/order/test-restaurant');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check URL
    await expect(page).toHaveURL('http://localhost:4173/order/test-restaurant');
    
    // Check for restaurant header
    await expect(page.locator('text=Grow Fresh')).toBeVisible({ timeout: 5000 });
    
    // Check for menu sections
    await expect(page.locator('text=Popular Items')).toBeVisible();
    
    // Verify cart button is present
    const cartButton = page.locator('[aria-label*="cart"]');
    await expect(cartButton).toBeVisible();
  });

  test('app renders without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Visit main pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/order/test-restaurant');
    await page.waitForLoadState('networkidle');
    
    // Verify no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});