import { test, expect } from '@playwright/test';

test.describe('Basic route smoke tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    
    // Check page loaded
    await expect(page).toHaveURL(/.*localhost.*/);
    
    // Check for basic content (adjust based on your actual home page)
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Take screenshot for CI artifacts
    await page.screenshot({ path: 'smoke-home.png' });
  });

  test('checkout page loads', async ({ page }) => {
    await page.goto('/checkout');
    
    // Check page loaded
    await expect(page).toHaveURL(/.*checkout.*/);
    
    // Check for checkout-specific content
    // This is a basic check - adjust based on your actual checkout page
    const pageContent = await page.content();
    expect(pageContent).toContain('<!DOCTYPE html>');
    
    // Take screenshot for CI artifacts
    await page.screenshot({ path: 'smoke-checkout.png' });
  });

  test('navigation between pages works', async ({ page }) => {
    // Start at home
    await page.goto('/');
    
    // Navigate to checkout (adjust selector based on your actual navigation)
    // For now, just directly navigate
    await page.goto('/checkout');
    await expect(page).toHaveURL(/.*checkout.*/);
    
    // Navigate back to home
    await page.goto('/');
    await expect(page).toHaveURL(/.*localhost.*5173\/?$/);
  });
});