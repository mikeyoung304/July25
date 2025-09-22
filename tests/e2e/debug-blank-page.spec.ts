import { test, expect } from '@playwright/test';

test.describe('Debug blank page issue', () => {
  test('check what is actually rendered', async ({ page }) => {
    // Capture console messages
    const messages: string[] = [];
    page.on('console', (msg) => {
      messages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get page content
    const title = await page.title();
    const bodyText = await page.locator('body').textContent();
    const rootHTML = await page.locator('#root').innerHTML();
    
    
    // Check if React rendered anything
    const hasContent = rootHTML && rootHTML.length > 0;
    expect(hasContent).toBeTruthy();
  });
});