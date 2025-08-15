import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage layout matches baseline', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Hide dynamic content that changes between runs
    await page.addStyleTag({
      content: `
        .timestamp, .current-time, .live-indicator { visibility: hidden !important; }
        .loading-spinner, .skeleton { display: none !important; }
      `
    });
    
    await expect(page).toHaveScreenshot('homepage-full.png');
  });

  test('navigation menu visual consistency', async ({ page }) => {
    await page.goto('/');
    
    // Open navigation if it exists
    const navToggle = page.locator('[data-testid="nav-toggle"]');
    if (await navToggle.isVisible()) {
      await navToggle.click();
    }
    
    await expect(page.locator('nav')).toHaveScreenshot('navigation-menu.png');
  });

  test('responsive breakpoints visual verification', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot(`homepage-${breakpoint.name}.png`);
    }
  });

  test('form states visual verification', async ({ page }) => {
    await page.goto('/');
    
    // Test different form states if forms exist
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      const form = forms.first();
      
      // Default state
      await expect(form).toHaveScreenshot('form-default.png');
      
      // Focus states
      const inputs = form.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        await inputs.first().focus();
        await expect(form).toHaveScreenshot('form-focused.png');
        
        // Error state (if validation exists)
        await inputs.first().fill('invalid-data');
        await inputs.first().blur();
        await page.waitForTimeout(500); // Allow validation to trigger
        await expect(form).toHaveScreenshot('form-error.png');
      }
    }
  });
});