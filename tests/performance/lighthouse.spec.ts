import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Performance Tests', () => {
  test('lighthouse performance audit', async ({ page, browserName }) => {
    // Skip for non-Chromium browsers as Lighthouse only works with Chrome
    test.skip(browserName !== 'chromium', 'Lighthouse only works with Chromium browsers');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const auditResults = await playAudit({
      page,
      thresholds: {
        performance: 80,
        accessibility: 90,
        'best-practices': 85,
        seo: 80,
      },
      reports: {
        formats: {
          html: true,
          json: true,
        },
        directory: './test-results/lighthouse',
        name: `lighthouse-report-${Date.now()}`,
      },
    });

    expect(auditResults.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(80);
    expect(auditResults.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(90);
    expect(auditResults.lhr.categories['best-practices'].score * 100).toBeGreaterThanOrEqual(85);
    expect(auditResults.lhr.categories.seo.score * 100).toBeGreaterThanOrEqual(80);
  });

  test('page load performance metrics', async ({ page }) => {
    await page.goto('/');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        transferSize: navigation.transferSize,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
      };
    });

    // Performance thresholds
    expect(metrics.firstContentfulPaint).toBeLessThan(2000); // FCP < 2s
    expect(metrics.domInteractive).toBeLessThan(3000); // DOM Interactive < 3s
    expect(metrics.domContentLoaded).toBeLessThan(500); // DOMContentLoaded event < 500ms
    expect(metrics.transferSize).toBeLessThan(2 * 1024 * 1024); // Transfer size < 2MB
  });

  test('largest contentful paint (LCP)', async ({ page }) => {
    await page.goto('/');
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        let lcpValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          lcpValue = lastEntry.startTime;
        });
        
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(lcpValue);
        }, 5000);
      });
    });

    expect(lcp).toBeLessThan(2500); // LCP should be < 2.5s for good performance
  });

  test('cumulative layout shift (CLS)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    expect(cls).toBeLessThan(0.1); // CLS should be < 0.1 for good performance
  });

  test('bundle size analysis', async ({ page }) => {
    // Navigate and capture network resources
    const resourceSizes = new Map();
    
    page.on('response', async (response) => {
      const url = response.url();
      const contentLength = response.headers()['content-length'];
      
      if (url.includes('.js') || url.includes('.css')) {
        const size = contentLength ? parseInt(contentLength) : 0;
        resourceSizes.set(url, size);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Analyze bundle sizes
    const totalJSSize = Array.from(resourceSizes.entries())
      .filter(([url]) => url.includes('.js'))
      .reduce((total, [, size]) => total + size, 0);

    const totalCSSSize = Array.from(resourceSizes.entries())
      .filter(([url]) => url.includes('.css'))
      .reduce((total, [, size]) => total + size, 0);

    // Bundle size thresholds
    expect(totalJSSize).toBeLessThan(500 * 1024); // JS bundle < 500KB
    expect(totalCSSSize).toBeLessThan(100 * 1024); // CSS bundle < 100KB
  });

  test('memory usage analysis', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure memory usage
    const memoryInfo = await page.evaluate(() => {
      // @ts-ignore
      if (performance.memory) {
        // @ts-ignore
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (memoryInfo) {
      // Memory usage should be reasonable
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // < 50MB
      
      // Memory efficiency ratio
      const efficiency = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
      expect(efficiency).toBeGreaterThan(0.3); // At least 30% efficient
    }
  });

  test('interaction responsiveness', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test button click responsiveness
    const buttons = await page.locator('button').all();
    
    if (buttons.length > 0) {
      const button = buttons[0];
      
      if (await button.isVisible()) {
        const startTime = Date.now();
        await button.click();
        const endTime = Date.now();
        
        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(100); // Click should respond within 100ms
      }
    }

    // Test input field responsiveness
    const inputs = await page.locator('input[type="text"], textarea').all();
    
    if (inputs.length > 0) {
      const input = inputs[0];
      
      if (await input.isVisible()) {
        await input.focus();
        const startTime = Date.now();
        await input.type('test');
        await page.waitForTimeout(50);
        const endTime = Date.now();
        
        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(200); // Typing should be responsive
      }
    }
  });
});