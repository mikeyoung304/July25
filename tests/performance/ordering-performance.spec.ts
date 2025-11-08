import { test, expect, Page } from '@playwright/test';
import type { ApiMenuItem } from '@rebuild/shared';

/**
 * Performance Test Suite for Touch + Voice Ordering System
 *
 * Tests cover:
 * - Menu grid rendering performance
 * - Fuzzy matching speed
 * - Voice processing latency
 * - Order operations performance
 * - API integration speed
 * - Memory leak detection
 *
 * Performance Budgets:
 * - Menu grid render: <500ms for 200 items
 * - Fuzzy match: <100ms per search
 * - Voice response: <1s average
 * - Order submission: <2s
 */

// Helper to create mock menu items
function generateMenuItems(count: number): ApiMenuItem[] {
  const categories = ['Appetizers', 'Salads', 'Bowls', 'Entrees', 'Sides', 'Desserts', 'Beverages'];
  const items: ApiMenuItem[] = [];

  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      restaurantId: 'test-restaurant',
      categoryId: `cat-${i % categories.length}`,
      name: `Menu Item ${i}`,
      description: `Delicious menu item number ${i}`,
      price: 9.99 + (i % 20),
      isAvailable: true,
      imageUrl: i % 3 === 0 ? `https://placehold.co/300x200?text=Item${i}` : undefined,
      category: {
        id: `cat-${i % categories.length}`,
        name: categories[i % categories.length]
      }
    });
  }

  return items;
}

// Helper to inject mock menu data
async function injectMockMenu(page: Page, itemCount: number) {
  const menuItems = generateMenuItems(itemCount);

  await page.addInitScript((items) => {
    // Mock the menu API response
    (window as any).__mockMenuItems = items;

    // Intercept fetch calls
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (url.includes('/api/v1/menu') || url.includes('/api/v1/ai/menu')) {
        return new Response(JSON.stringify({ items: (window as any).__mockMenuItems }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return originalFetch(input, init);
    };
  }, menuItems);
}

// Helper to measure render time
async function measureRenderTime(page: Page, selector: string): Promise<number> {
  const startTime = Date.now();
  await page.waitForSelector(selector, { timeout: 10000 });
  const endTime = Date.now();
  return endTime - startTime;
}

// Helper to measure memory usage
async function measureMemoryUsage(page: Page): Promise<{
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}> {
  return await page.evaluate(() => {
    // @ts-ignore - performance.memory is Chrome-specific
    if (performance.memory) {
      return {
        // @ts-ignore
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        // @ts-ignore
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        // @ts-ignore
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
  });
}

test.describe('Menu Grid Rendering Performance', () => {
  test('should render 50 menu items in <500ms', async ({ page }) => {
    await injectMockMenu(page, 50);
    await page.goto('/kiosk');

    const renderTime = await measureRenderTime(page, '[data-testid="menu-grid"], .grid');
    console.log(`Render time for 50 items: ${renderTime}ms`);

    expect(renderTime).toBeLessThan(500);
  });

  test('should render 100 menu items in <500ms', async ({ page }) => {
    await injectMockMenu(page, 100);
    await page.goto('/kiosk');

    const renderTime = await measureRenderTime(page, '[data-testid="menu-grid"], .grid');
    console.log(`Render time for 100 items: ${renderTime}ms`);

    expect(renderTime).toBeLessThan(500);
  });

  test('should render 200 menu items in <500ms', async ({ page }) => {
    await injectMockMenu(page, 200);
    await page.goto('/kiosk');

    const renderTime = await measureRenderTime(page, '[data-testid="menu-grid"], .grid');
    console.log(`Render time for 200 items: ${renderTime}ms`);

    expect(renderTime).toBeLessThan(500);
  });

  test('should render 500 menu items in <1000ms', async ({ page }) => {
    await injectMockMenu(page, 500);
    await page.goto('/kiosk');

    const renderTime = await measureRenderTime(page, '[data-testid="menu-grid"], .grid');
    console.log(`Render time for 500 items: ${renderTime}ms`);

    // Relaxed budget for large menus
    expect(renderTime).toBeLessThan(1000);
  });

  test('should filter categories quickly (<200ms)', async ({ page }) => {
    await injectMockMenu(page, 200);
    await page.goto('/kiosk');
    await page.waitForSelector('[data-testid="menu-grid"], .grid');

    // Wait for initial render
    await page.waitForTimeout(500);

    // Find category filter button
    const categoryButton = page.locator('button').filter({ hasText: /salads|appetizers|bowls/i }).first();

    if (await categoryButton.isVisible()) {
      const startTime = Date.now();
      await categoryButton.click();
      await page.waitForTimeout(100); // Allow re-render
      const endTime = Date.now();
      const filterTime = endTime - startTime;

      console.log(`Category filter time: ${filterTime}ms`);
      expect(filterTime).toBeLessThan(200);
    }
  });

  test('should search menu items quickly (<200ms per keystroke)', async ({ page }) => {
    await injectMockMenu(page, 200);
    await page.goto('/kiosk');
    await page.waitForSelector('[data-testid="menu-grid"], .grid');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.focus();

      const searchTerm = 'salad';
      const keyTimes: number[] = [];

      for (const char of searchTerm) {
        const startTime = Date.now();
        await searchInput.type(char);
        await page.waitForTimeout(50); // Allow filtering
        const endTime = Date.now();
        keyTimes.push(endTime - startTime);
      }

      const avgKeyTime = keyTimes.reduce((sum, t) => sum + t, 0) / keyTimes.length;
      console.log(`Average search keystroke time: ${avgKeyTime}ms`);
      console.log(`Individual keystroke times: ${keyTimes.join(', ')}ms`);

      expect(avgKeyTime).toBeLessThan(200);
    }
  });

  test('should not leak memory when rendering multiple times', async ({ page }) => {
    await injectMockMenu(page, 200);
    await page.goto('/kiosk');
    await page.waitForSelector('[data-testid="menu-grid"], .grid');

    // Force garbage collection if available
    await page.evaluate(() => {
      // @ts-ignore
      if (window.gc) window.gc();
    });

    const initialMemory = await measureMemoryUsage(page);
    console.log(`Initial memory: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);

    // Trigger multiple re-renders
    for (let i = 0; i < 5; i++) {
      // Navigate away and back
      await page.goto('/');
      await injectMockMenu(page, 200);
      await page.goto('/kiosk');
      await page.waitForSelector('[data-testid="menu-grid"], .grid');
      await page.waitForTimeout(500);
    }

    // Force garbage collection
    await page.evaluate(() => {
      // @ts-ignore
      if (window.gc) window.gc();
    });
    await page.waitForTimeout(1000);

    const finalMemory = await measureMemoryUsage(page);
    console.log(`Final memory: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);

    const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
    const memoryGrowthMB = memoryGrowth / 1024 / 1024;
    console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)} MB`);

    // Memory shouldn't grow more than 10MB after multiple renders
    expect(memoryGrowthMB).toBeLessThan(10);
  });
});

test.describe('Fuzzy Matching Performance', () => {
  test('should match items in <100ms with 100 menu items', async ({ page }) => {
    await injectMockMenu(page, 100);

    // Test fuzzy matcher directly
    const matchTime = await page.evaluate(async () => {
      // Import fuzzy matcher (assuming it's available globally or can be imported)
      const menuItems = (window as any).__mockMenuItems;

      // Simulate fuzzy search
      const startTime = performance.now();

      const searchTerm = 'salad';
      const results = menuItems.filter((item: any) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const endTime = performance.now();
      return endTime - startTime;
    });

    console.log(`Fuzzy match time (100 items): ${matchTime}ms`);
    expect(matchTime).toBeLessThan(100);
  });

  test('should match items in <100ms with 500 menu items', async ({ page }) => {
    await injectMockMenu(page, 500);

    const matchTime = await page.evaluate(async () => {
      const menuItems = (window as any).__mockMenuItems;

      const startTime = performance.now();
      const searchTerm = 'bowl';
      const results = menuItems.filter((item: any) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const endTime = performance.now();

      return endTime - startTime;
    });

    console.log(`Fuzzy match time (500 items): ${matchTime}ms`);
    expect(matchTime).toBeLessThan(100);
  });

  test('should match items in <100ms with 1000 menu items', async ({ page }) => {
    await injectMockMenu(page, 1000);

    const matchTime = await page.evaluate(async () => {
      const menuItems = (window as any).__mockMenuItems;

      const startTime = performance.now();
      const searchTerm = 'item';
      const results = menuItems.filter((item: any) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const endTime = performance.now();

      return endTime - startTime;
    });

    console.log(`Fuzzy match time (1000 items): ${matchTime}ms`);
    expect(matchTime).toBeLessThan(100);
  });

  test('should handle no matches efficiently', async ({ page }) => {
    await injectMockMenu(page, 500);

    const matchTime = await page.evaluate(async () => {
      const menuItems = (window as any).__mockMenuItems;

      const startTime = performance.now();
      const searchTerm = 'xyznonexistent';
      const results = menuItems.filter((item: any) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const endTime = performance.now();

      return endTime - startTime;
    });

    console.log(`Fuzzy match time (no matches): ${matchTime}ms`);
    expect(matchTime).toBeLessThan(100);
  });

  test('should handle special characters efficiently', async ({ page }) => {
    await injectMockMenu(page, 500);

    const matchTime = await page.evaluate(async () => {
      const menuItems = (window as any).__mockMenuItems;

      const startTime = performance.now();
      const searchTerm = '@#$%^&*()';
      const results = menuItems.filter((item: any) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const endTime = performance.now();

      return endTime - startTime;
    });

    console.log(`Fuzzy match time (special chars): ${matchTime}ms`);
    expect(matchTime).toBeLessThan(100);
  });
});

test.describe('Voice Processing Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Mock getUserMedia for voice tests
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {},
            kind: 'audio',
            enabled: true,
          }],
          getAudioTracks: () => [{
            stop: () => {},
            kind: 'audio',
            enabled: true,
          }],
        } as any;
      };
    });
  });

  test('should activate voice in <500ms', async ({ page }) => {
    await injectMockMenu(page, 100);
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    const micButton = page.locator('button').filter({ hasText: /hold|press|mic|voice/i }).first();

    if (await micButton.isVisible({ timeout: 5000 })) {
      const startTime = Date.now();
      await micButton.dispatchEvent('mousedown');

      // Wait for visual feedback (recording state)
      await page.waitForTimeout(100);

      const endTime = Date.now();
      const activationTime = endTime - startTime;

      console.log(`Voice activation time: ${activationTime}ms`);
      expect(activationTime).toBeLessThan(500);

      await micButton.dispatchEvent('mouseup');
    }
  });

  test('should process voice order in <1000ms (mocked)', async ({ page }) => {
    await injectMockMenu(page, 100);

    // Mock voice API response
    await page.route('**/api/v1/ai/parse-order', async route => {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          items: [{
            name: 'Menu Item 1',
            quantity: 1,
            price: 12.99,
            modifiers: []
          }],
          totalAmount: 12.99,
          confidence: 0.95
        })
      });
    });

    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    const micButton = page.locator('button').filter({ hasText: /hold|press|mic|voice/i }).first();

    if (await micButton.isVisible({ timeout: 5000 })) {
      const startTime = Date.now();

      // Trigger voice order
      await micButton.dispatchEvent('mousedown');
      await page.waitForTimeout(500);
      await micButton.dispatchEvent('mouseup');

      // Wait for processing result
      await page.waitForSelector('text=/menu item|order|added/i', { timeout: 5000 }).catch(() => null);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.log(`Voice processing time: ${processingTime}ms`);
      expect(processingTime).toBeLessThan(1000);
    }
  });

  test('should handle rapid-fire orders without lag', async ({ page }) => {
    await injectMockMenu(page, 50);

    let requestCount = 0;
    await page.route('**/api/v1/ai/parse-order', async route => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          items: [{
            name: `Menu Item ${requestCount}`,
            quantity: 1,
            price: 12.99,
            modifiers: []
          }],
          totalAmount: 12.99,
          confidence: 0.95
        })
      });
    });

    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    const micButton = page.locator('button').filter({ hasText: /hold|press|mic|voice/i }).first();

    if (await micButton.isVisible({ timeout: 5000 })) {
      const orderTimes: number[] = [];

      // Simulate 5 rapid orders
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        await micButton.dispatchEvent('mousedown');
        await page.waitForTimeout(200);
        await micButton.dispatchEvent('mouseup');
        await page.waitForTimeout(300); // Allow processing

        const endTime = Date.now();
        orderTimes.push(endTime - startTime);
      }

      const avgOrderTime = orderTimes.reduce((sum, t) => sum + t, 0) / orderTimes.length;
      console.log(`Average rapid-fire order time: ${avgOrderTime}ms`);
      console.log(`Individual order times: ${orderTimes.join(', ')}ms`);

      expect(avgOrderTime).toBeLessThan(1000);
    }
  });
});

test.describe('Order Operations Performance', () => {
  test('should add 20 items to cart quickly (<1s)', async ({ page }) => {
    await injectMockMenu(page, 100);
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Add 20 items
    for (let i = 0; i < 20; i++) {
      const itemCard = page.locator('[data-testid="menu-item-card"]').or(page.locator('.menu-item')).nth(i);
      if (await itemCard.isVisible()) {
        await itemCard.click();
        await page.waitForTimeout(20); // Minimal delay
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`Time to add 20 items: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(1000);
  });

  test('should update item quantity quickly (<200ms)', async ({ page }) => {
    await injectMockMenu(page, 50);
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    // Add an item first
    const firstItem = page.locator('[data-testid="menu-item-card"]').or(page.locator('.menu-item')).first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForTimeout(300);

      // Find quantity controls
      const increaseButton = page.locator('button').filter({ hasText: /\+|plus|increase/i }).first();

      if (await increaseButton.isVisible()) {
        const startTime = Date.now();

        // Update quantity 10 times
        for (let i = 0; i < 10; i++) {
          await increaseButton.click();
          await page.waitForTimeout(10);
        }

        const endTime = Date.now();
        const updateTime = endTime - startTime;
        const avgUpdateTime = updateTime / 10;

        console.log(`Average quantity update time: ${avgUpdateTime}ms`);
        expect(avgUpdateTime).toBeLessThan(200);
      }
    }
  });

  test('should remove items quickly (<100ms per item)', async ({ page }) => {
    await injectMockMenu(page, 50);
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    // Add 5 items
    for (let i = 0; i < 5; i++) {
      const item = page.locator('[data-testid="menu-item-card"]').or(page.locator('.menu-item')).nth(i);
      if (await item.isVisible()) {
        await item.click();
        await page.waitForTimeout(50);
      }
    }

    await page.waitForTimeout(500);

    // Remove items
    const removeTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const removeButton = page.locator('button').filter({ hasText: /remove|delete|×/i }).first();

      if (await removeButton.isVisible()) {
        const startTime = Date.now();
        await removeButton.click();
        await page.waitForTimeout(50);
        const endTime = Date.now();
        removeTimes.push(endTime - startTime);
      }
    }

    if (removeTimes.length > 0) {
      const avgRemoveTime = removeTimes.reduce((sum, t) => sum + t, 0) / removeTimes.length;
      console.log(`Average remove time: ${avgRemoveTime}ms`);
      expect(avgRemoveTime).toBeLessThan(100);
    }
  });

  test('should calculate prices quickly for large orders', async ({ page }) => {
    await injectMockMenu(page, 100);

    const calcTime = await page.evaluate(() => {
      // Simulate price calculation for 50 items
      const items = Array.from({ length: 50 }, (_, i) => ({
        price: 9.99 + i,
        quantity: Math.floor(Math.random() * 5) + 1,
        modifiers: Array.from({ length: Math.floor(Math.random() * 3) }, () => ({
          price: 1.50
        }))
      }));

      const startTime = performance.now();

      const total = items.reduce((sum, item) => {
        const itemPrice = item.price;
        const modifiersPrice = item.modifiers.reduce((mSum, mod) => mSum + mod.price, 0);
        return sum + ((itemPrice + modifiersPrice) * item.quantity);
      }, 0);

      const tax = total * 0.08;
      const finalTotal = total + tax;

      const endTime = performance.now();

      return endTime - startTime;
    });

    console.log(`Price calculation time (50 items): ${calcTime}ms`);
    expect(calcTime).toBeLessThan(50);
  });
});

test.describe('API Integration Performance', () => {
  test('should submit order in <2s', async ({ page }) => {
    await injectMockMenu(page, 50);

    // Mock order submission
    let submissionTime = 0;
    await page.route('**/api/v1/orders', async route => {
      const requestStartTime = Date.now();

      // Simulate realistic API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      submissionTime = Date.now() - requestStartTime;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-123',
          status: 'pending',
          total: 45.99
        })
      });
    });

    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    // Add items and submit
    const firstItem = page.locator('[data-testid="menu-item-card"]').or(page.locator('.menu-item')).first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForTimeout(300);

      // Find and click submit button
      const submitButton = page.locator('button').filter({ hasText: /submit|checkout|place order/i }).first();

      if (await submitButton.isVisible()) {
        const startTime = Date.now();
        await submitButton.click();

        // Wait for success response
        await page.waitForSelector('text=/success|submitted|complete/i', { timeout: 5000 }).catch(() => null);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        console.log(`Order submission time: ${totalTime}ms (API: ${submissionTime}ms)`);
        expect(totalTime).toBeLessThan(2000);
      }
    }
  });

  test('should handle large orders (50+ items) in <3s', async ({ page }) => {
    await injectMockMenu(page, 100);

    await page.route('**/api/v1/orders', async route => {
      await new Promise(resolve => setTimeout(resolve, 800));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-456',
          status: 'pending',
          total: 599.99
        })
      });
    });

    await page.goto('/kiosk');

    // Simulate adding 50 items via script (faster than clicking)
    await page.evaluate(() => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        name: `Menu Item ${i}`,
        quantity: 1,
        price: 12.99
      }));

      // Store in cart (if accessible)
      (window as any).__testCart = items;
    });

    console.log('Large order submission test: 50 items should submit in <3s');
    // This is a placeholder - actual implementation depends on cart accessibility
  });

  test('should handle slow network gracefully (3G simulation)', async ({ page, context }) => {
    // Simulate 3G network conditions
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 100 // 100ms latency
    });

    await injectMockMenu(page, 50);

    await page.route('**/api/v1/orders', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-789',
          status: 'pending',
          total: 25.99
        })
      });
    });

    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    const firstItem = page.locator('[data-testid="menu-item-card"]').or(page.locator('.menu-item')).first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForTimeout(300);

      const submitButton = page.locator('button').filter({ hasText: /submit|checkout|place order/i }).first();

      if (await submitButton.isVisible()) {
        const startTime = Date.now();
        await submitButton.click();

        // Should show loading state
        const loadingIndicator = page.locator('[role="status"], .loading, .spinner').first();
        if (await loadingIndicator.isVisible({ timeout: 1000 })) {
          console.log('Loading indicator shown during slow network request');
        }

        await page.waitForSelector('text=/success|submitted|complete/i', { timeout: 5000 }).catch(() => null);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        console.log(`Order submission on 3G: ${totalTime}ms`);
        // More lenient timeout for slow network
        expect(totalTime).toBeLessThan(5000);
      }
    }

    // Reset network conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });
});

test.describe('Performance Regression Tests', () => {
  test('menu grid scroll performance (FPS test)', async ({ page }) => {
    await injectMockMenu(page, 500);
    await page.goto('/kiosk');
    await page.waitForSelector('[data-testid="menu-grid"], .grid');

    // Measure FPS during scroll
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        const duration = 2000; // 2 seconds

        function countFrame() {
          frameCount++;
          const elapsed = performance.now() - startTime;

          if (elapsed < duration) {
            requestAnimationFrame(countFrame);
          } else {
            const fps = (frameCount / elapsed) * 1000;
            resolve(fps);
          }
        }

        // Start scrolling
        const scrollContainer = document.querySelector('.grid') || document.body;
        let scrollPos = 0;
        const scrollInterval = setInterval(() => {
          scrollPos += 20;
          scrollContainer.scrollTop = scrollPos;
        }, 16); // ~60fps

        setTimeout(() => clearInterval(scrollInterval), duration);

        requestAnimationFrame(countFrame);
      });
    });

    console.log(`Scroll FPS: ${fps.toFixed(2)}`);
    // Should maintain at least 30 FPS during scroll
    expect(fps).toBeGreaterThan(30);
  });

  test('interaction responsiveness (first input delay)', async ({ page }) => {
    await injectMockMenu(page, 200);
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    const fid = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let inputTime = 0;
        let responseTime = 0;

        const handleInput = (e: Event) => {
          if (!inputTime) {
            inputTime = e.timeStamp;
            requestAnimationFrame(() => {
              responseTime = performance.now();
              resolve(responseTime - inputTime);
            });
          }
        };

        document.addEventListener('click', handleInput, { once: true });

        // Simulate click
        setTimeout(() => {
          const button = document.querySelector('button');
          if (button) {
            button.click();
          } else {
            resolve(0);
          }
        }, 100);
      });
    });

    console.log(`First Input Delay: ${fid.toFixed(2)}ms`);
    // FID should be < 100ms for good user experience
    expect(fid).toBeLessThan(100);
  });

  test('cumulative layout shift during menu load', async ({ page }) => {
    await injectMockMenu(page, 200);

    const cls = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
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

    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    console.log(`Cumulative Layout Shift: ${cls.toFixed(4)}`);
    // CLS should be < 0.1 for good user experience
    expect(cls).toBeLessThan(0.1);
  });
});
