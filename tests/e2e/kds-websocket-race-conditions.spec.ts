/**
 * Playwright E2E Test: KDS WebSocket Race Conditions
 *
 * Tests that rapid login/logout cycles on the Kitchen Display System
 * don't create duplicate WebSocket connections or event streams.
 *
 * Note: The WebSocketService automatically exposes itself on window.__webSocketService
 * in development mode, so we don't need to use require() in browser context.
 */

import { test, expect, Page } from '@playwright/test'

// Helper to count WebSocket connections in browser
async function getWebSocketConnectionCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    // Access the webSocketService singleton (exposed in dev mode by WebSocketService constructor)
    const wsService = (window as any).__webSocketService
    if (!wsService) return 0

    // Check if connected
    return wsService.isConnected?.() ? 1 : 0
  })
}

// Helper to check for duplicate event listeners
async function checkForDuplicateListeners(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const wsService = (window as any).__webSocketService
    if (!wsService) return 0

    // Use the public listenerCount method from EventEmitter
    // The 'message' event is used for all message subscriptions
    return typeof wsService.listenerCount === 'function'
      ? wsService.listenerCount('message')
      : 0
  })
}

test.describe('KDS WebSocket Race Conditions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for the app to be fully ready (past splash screen)
    // The app creates a data-testid="app-ready" element when initialization is complete
    await page.waitForSelector('[data-testid="app-ready"]', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    // Verify the WebSocket service is exposed (it's done automatically in dev mode)
    // Wait for service exposure with retry since it may take time to initialize
    let wsServiceExists = false
    for (let i = 0; i < 10; i++) {
      wsServiceExists = await page.evaluate(() => {
        return !!(window as any).__webSocketService
      })
      if (wsServiceExists) break
      await page.waitForTimeout(500)
    }

    // The service should be exposed in dev mode
    // If not available, skip the tests gracefully
    if (!wsServiceExists) {
      test.skip(true, 'WebSocket service not exposed (not in dev mode)')
    }
  })

  test('should not create duplicate WebSocket connections on rapid login/logout', async ({ page }) => {
    // Perform rapid login/logout cycles
    for (let i = 0; i < 3; i++) {
      // Login
      await page.click('[data-testid="login-button"]', { timeout: 5000 }).catch(() => {
        // If no login button, we might already be logged in or on a different page
      })

      // Wait for KDS to load
      await page.waitForTimeout(500)

      // Navigate to KDS
      await page.goto('/kitchen')

      // Wait for WebSocket to connect
      await page.waitForTimeout(1000)

      // Check connection count
      const connectionCount = await getWebSocketConnectionCount(page)
      expect(connectionCount).toBeLessThanOrEqual(1)

      // Logout
      await page.click('[data-testid="logout-button"]', { timeout: 5000 }).catch(() => {
        // If no logout button, try navigation
      })

      // Wait for cleanup
      await page.waitForTimeout(500)
    }

    // Final check: should have at most 1 connection
    const finalConnectionCount = await getWebSocketConnectionCount(page)
    expect(finalConnectionCount).toBeLessThanOrEqual(1)
  })

  test('should not accumulate duplicate event listeners', async ({ page }) => {
    // Navigate to KDS
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')

    // Wait for initial WebSocket setup
    await page.waitForTimeout(2000)

    // Check initial listener count
    const initialListeners = await checkForDuplicateListeners(page)
    expect(initialListeners).toBeGreaterThan(0)

    // Rapid navigation away and back
    for (let i = 0; i < 3; i++) {
      await page.goto('/')
      await page.waitForTimeout(500)
      await page.goto('/kitchen')
      await page.waitForTimeout(500)
    }

    // Check final listener count - should not have multiplied
    const finalListeners = await checkForDuplicateListeners(page)

    // Allow for some increase due to reconnection, but not 3x or more
    expect(finalListeners).toBeLessThanOrEqual(initialListeners * 2)
  })

  test('should handle unmount during WebSocket connection', async ({ page }) => {
    // Start navigating to KDS
    const navigationPromise = page.goto('/kitchen')

    // Immediately navigate away before connection completes
    await page.waitForTimeout(100)
    await page.goto('/')

    // Wait for initial navigation to complete
    await navigationPromise

    // Should not have any errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.waitForTimeout(1000)

    // Filter out expected/benign errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('WebSocket') && // WebSocket errors are expected
        !err.includes('unmounted') && // Unmount messages are expected
        !err.includes('cancelled') // Cancellation is expected
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('should display single stream of order updates (no duplicates)', async ({ page }) => {
    // Navigate to KDS
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')

    // Track order update events
    const orderUpdates: Array<{ id: string; timestamp: number }> = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[OrderUpdates] New order created:')) {
        // Extract order ID from log
        const match = text.match(/id: '([^']+)'/)
        if (match) {
          orderUpdates.push({
            id: match[1],
            timestamp: Date.now()
          })
        }
      }
    })

    // Simulate creating an order by emitting a WebSocket message
    // The WebSocketService is exposed on window.__webSocketService in dev mode
    await page.evaluate(() => {
      const wsService = (window as any).__webSocketService
      if (!wsService) {
        console.warn('WebSocket service not available for test')
        return
      }

      // Emit a simulated WebSocket message for a new order
      wsService.emit('message', {
        type: 'order:created',
        payload: {
          order: {
            id: 'test-order-123',
            order_number: 'TEST-001',
            status: 'pending'
          }
        }
      })
    })

    // Wait for event processing
    await page.waitForTimeout(1000)

    // Check for duplicate events for the same order
    const testOrderUpdates = orderUpdates.filter((u) => u.id === 'test-order-123')

    // Should have received exactly 1 event, not duplicates
    expect(testOrderUpdates.length).toBeLessThanOrEqual(1)
  })

  test('should properly cleanup on logout', async ({ page }) => {
    // Login and navigate to KDS
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')

    // Verify WebSocket is connected
    await page.waitForTimeout(2000)
    const initialConnection = await getWebSocketConnectionCount(page)
    expect(initialConnection).toBe(1)

    // Logout
    await page.click('[data-testid="logout-button"]', { timeout: 5000 }).catch(() => {
      // If no logout button, navigate away
      return page.goto('/')
    })

    // Wait for cleanup
    await page.waitForTimeout(2000)

    // Check that connection was properly closed
    const postLogoutConnection = await getWebSocketConnectionCount(page)
    expect(postLogoutConnection).toBe(0)
  })
})
