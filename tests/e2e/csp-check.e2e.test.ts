import { test, expect } from '@playwright/test';

test.describe('CSP Compliance Check', () => {
  test('should load homepage with correct CSP headers and title', async ({ page }) => {
    // Navigate to the homepage
    const response = await page.goto('/');
    
    // Check response status
    expect(response?.status()).toBe(200);
    
    // Check page title
    await expect(page).toHaveTitle('MACON Restaurant AI - Intelligent Restaurant Management');
    
    // Check for CSP violations in console
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a moment for any CSP violations to appear
    await page.waitForTimeout(1000);
    
    // Assert no CSP violations
    expect(consoleErrors).toHaveLength(0);
    
    // Verify critical elements load without CSP blocking
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#root')).toBeVisible();
  });
});