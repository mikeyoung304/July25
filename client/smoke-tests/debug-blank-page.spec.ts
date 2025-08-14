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
    
    console.log('=== Page Debug Info ===');
    console.log('Title:', title);
    console.log('Body text length:', bodyText?.length);
    console.log('Root HTML length:', rootHTML?.length);
    console.log('First 500 chars of body:', bodyText?.substring(0, 500));
    console.log('Console messages:', messages);
    
    // Check if React rendered anything
    const hasContent = rootHTML && rootHTML.length > 0;
    expect(hasContent).toBeTruthy();
  });
});