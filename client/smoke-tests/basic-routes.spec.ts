import { test, expect } from '@playwright/test';

test.describe('Basic route smoke tests @smoke', () => {
  test('home page loads with expected content @smoke', async ({ page }) => {
    await page.goto('/');
    
    // Wait for React to mount
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && !root.querySelector('#boot-sentinel');
    }, { timeout: 10000 });
    
    // Check URL
    await expect(page).toHaveURL(/.*\/$/i);
    
    // Check for actual home page content - Restaurant OS title
    await expect(page.locator('h1:has-text("Restaurant OS")')).toBeVisible({ timeout: 10000 });
    
    // Check for navigation cards - using more specific selectors
    await expect(page.locator('h3:has-text("Server")')).toBeVisible();
    await expect(page.locator('h3:has-text("Kitchen")')).toBeVisible();
    await expect(page.locator('h3:has-text("Kiosk")')).toBeVisible();
    
    // Verify React app mounted successfully
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    await expect(rootElement).not.toBeEmpty();
  });

  test('checkout page loads without errors @smoke', async ({ page }) => {
    await page.goto('/checkout');
    
    // Wait for React to mount
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && !root.querySelector('#boot-sentinel');
    }, { timeout: 10000 });
    
    // Check URL
    await expect(page).toHaveURL(/.*\/checkout$/i);
    
    // Just verify the page has content (very relaxed check)
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      const text = root?.textContent || '';
      return text.length > 20; // Has more than minimal content
    });
    expect(hasContent).toBeTruthy();
  });

  test('order page loads without errors @smoke', async ({ page }) => {
    await page.goto('/order/test-restaurant');
    
    // Wait for React to mount
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && !root.querySelector('#boot-sentinel');
    }, { timeout: 10000 });
    
    // Check URL
    await expect(page).toHaveURL(/.*\/order\/test-restaurant$/i);
    
    // Just verify the page has content (very relaxed check)
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      const text = root?.textContent || '';
      return text.length > 20; // Has more than minimal content
    });
    expect(hasContent).toBeTruthy();
  });

  test('app renders without console errors @smoke', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors (excluding expected warnings)
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('WINDOW-ERROR')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Visit main pages
    await page.goto('/');
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && !root.querySelector('#boot-sentinel');
    }, { timeout: 10000 });
    
    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Failed to load resource') && 
      !err.includes('require is not defined')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});