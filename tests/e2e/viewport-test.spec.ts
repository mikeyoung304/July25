/**
 * Viewport Scale Test
 *
 * This test verifies that the viewport is rendering at the correct scale
 * without zoom issues on high-DPI displays.
 *
 * Run with: npx playwright test viewport-test --headed --project=chromium
 */

import { test, expect } from '@playwright/test';

test.describe('Viewport Scale Verification', () => {
  test('should render at correct scale without zoom', async ({ page }) => {
    // Navigate to a simple page
    await page.goto('/');

    // Check the devicePixelRatio - should be 1
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    console.log('Device Pixel Ratio:', dpr);
    expect(dpr).toBe(1);

    // Check the viewport dimensions
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    console.log('Viewport:', viewport);

    // Should match our configured viewport (1920x1080 for desktop)
    expect(viewport.width).toBe(1920);
    expect(viewport.height).toBe(1080);

    // Check that elements are visible and not cut off
    // This is a placeholder - adjust to your actual UI elements
    await page.waitForTimeout(2000); // Give time to visually inspect
  });

  test('should display UI elements at correct size', async ({ page }) => {
    await page.goto('/');

    // Take a screenshot to verify no zoom issues
    await page.screenshot({
      path: 'test-results/viewport-verification.png',
      fullPage: false
    });

    // Verify that the computed CSS pixel matches expected values
    const testElement = page.locator('body');
    const box = await testElement.boundingBox();

    if (box) {
      console.log('Body element dimensions:', box);
      // Body should be at least as wide as viewport
      expect(box.width).toBeGreaterThanOrEqual(1920);
    }
  });
});
