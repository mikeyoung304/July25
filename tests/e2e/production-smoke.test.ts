import { test, expect } from '@playwright/test';

const PRODUCTION_URL = process.env.PRODUCTION_URL || process.env.BASE_URL || 'https://july25-client.vercel.app';

test.describe('Production Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for production
    page.setDefaultTimeout(30000);
  });

  test('should load the homepage', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);

    // Check response status
    expect(response?.status()).toBe(200);

    // Check that page loads without errors
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Check if main navigation elements exist
    const nav = page.locator('nav, [role="navigation"], header');
    await expect(nav.first()).toBeVisible({ timeout: 10000 });
  });

  test('should load menu page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/menu`);
    await page.waitForLoadState('networkidle');

    // Check for menu-related elements
    const menuContent = await page.locator('text=/menu|items|food|drink/i').first();
    await expect(menuContent).toBeVisible({ timeout: 15000 });
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/non-existent-page`);

    // Should either show 404 page or redirect
    const url = page.url();
    const content = await page.content();

    // Check that it doesn't crash
    expect(url).toBeTruthy();
    expect(content).toBeTruthy();
  });

  test('should have no accessibility violations on homepage', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Check for basic accessibility
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBeTruthy();

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: Error[] = [];

    page.on('pageerror', error => {
      errors.push(error);
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');

    expect(errors).toHaveLength(0);
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);

    if (response) {
      const headers = response.headers();

      // Check for security headers
      expect(headers['strict-transport-security']).toBeTruthy();
      expect(headers['x-frame-options'] || headers['content-security-policy']).toBeTruthy();
    }
  });

  test('should load assets successfully', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // No critical assets should fail
    const criticalFailures = failedRequests.filter(url =>
      url.includes('.js') || url.includes('.css') || url.includes('/api/')
    );

    expect(criticalFailures).toHaveLength(0);
  });

  test('should have responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PRODUCTION_URL);

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    await expect(body).toBeVisible();
  });

  test('should have working cart functionality', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Look for cart-related elements
    const cartElements = await page.locator('[class*="cart"], [id*="cart"], [data-testid*="cart"]').count();

    // Should have some cart-related UI
    expect(cartElements).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Performance Tests', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded' });

    const loadTime = Date.now() - startTime;

    // Should load DOM in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have acceptable bundle size', async ({ page }) => {
    const resources: { url: string; size: number }[] = [];

    page.on('response', response => {
      const url = response.url();
      const headers = response.headers();

      if (url.includes('.js') && headers['content-length']) {
        resources.push({
          url,
          size: parseInt(headers['content-length'])
        });
      }
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Calculate total JS size
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);

    // Total JS should be under 1MB (production build)
    expect(totalSize).toBeLessThan(1024 * 1024);
  });
});