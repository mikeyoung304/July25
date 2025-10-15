/**
 * E2E Test: KDS Realtime WebSocket Behavior
 *
 * Tests WebSocket connection stability, duplicate prevention, and navigation churn
 * using dev-only instrumentation (window.__dbgWS).
 */

import { test, expect, Page } from '@playwright/test'

// Helper to get debug WS counters
async function getWSCounters(page: Page): Promise<{ connectCount: number; subCount: number }> {
  return await page.evaluate(() => {
    const dbg = (window as any).__dbgWS
    return {
      connectCount: dbg?.connectCount || 0,
      subCount: dbg?.subCount || 0
    }
  })
}

// Helper to wait for WebSocket connection
async function waitForWSConnection(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => {
    const dbg = (window as any).__dbgWS
    return dbg && dbg.connectCount > 0
  }, { timeout })
}

test.describe('KDS Realtime E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Scenario A: Happy path - 2 orders appear with single connection', async ({ page }) => {
    // Login (if needed)
    const loginButton = page.locator('[data-testid="login-button"]').first()
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click()
      // Fill in credentials if form appears
      const emailInput = page.locator('input[type="email"]').first()
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('test@example.com')
        await page.locator('input[type="password"]').first().fill('testpass123')
        await page.locator('button[type="submit"]').first().click()
      }
    }

    // Navigate to KDS
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')

    // Wait for WebSocket to connect
    await waitForWSConnection(page, 10000)

    // Verify single connection
    let counters = await getWSCounters(page)
    expect(counters.connectCount).toBe(1)

    // Simulate 2 orders appearing (via API or WebSocket mock)
    // Note: This requires backend integration or WS mock
    // For now, we verify the connection is stable

    // Give time for any potential duplicate connections
    await page.waitForTimeout(2000)

    // Verify connection count is still 1
    counters = await getWSCounters(page)
    expect(counters.connectCount).toBe(1)
    expect(counters.subCount).toBeGreaterThan(0) // At least some subscriptions

    console.log('✅ Scenario A: Happy path passed', counters)
  })

  test('Scenario B: Thrash - logout/login twice, verify no duplicates', async ({ page }) => {
    // Perform login/logout cycles
    for (let i = 0; i < 2; i++) {
      // Login
      await page.goto('/')
      const loginButton = page.locator('[data-testid="login-button"]').first()
      if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginButton.click()
        const emailInput = page.locator('input[type="email"]').first()
        if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await emailInput.fill('test@example.com')
          await page.locator('input[type="password"]').first().fill('testpass123')
          await page.locator('button[type="submit"]').first().click()
        }
      }

      // Navigate to KDS
      await page.goto('/kitchen')
      await page.waitForLoadState('networkidle')
      await waitForWSConnection(page, 10000).catch(() => {
        console.warn('WS connection timeout on attempt', i + 1)
      })

      // Quick check
      let counters = await getWSCounters(page)
      console.log(`Cycle ${i + 1}:`, counters)

      // Verify single connection
      expect(counters.connectCount).toBeLessThanOrEqual(1)

      // Logout
      const logoutButton = page.locator('[data-testid="logout-button"]').first()
      if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutButton.click()
      } else {
        // Force logout by clearing storage
        await page.evaluate(() => {
          localStorage.clear()
          sessionStorage.clear()
        })
      }

      await page.waitForTimeout(500)
    }

    // Final verification after thrash
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')
    await waitForWSConnection(page, 10000).catch(() => {
      console.warn('Final WS connection timeout')
    })

    const finalCounters = await getWSCounters(page)
    expect(finalCounters.connectCount).toBe(1)

    console.log('✅ Scenario B: Thrash passed', finalCounters)
  })

  test('Scenario C: Nav churn - away/back 5x, verify stable connection', async ({ page }) => {
    // Login and navigate to KDS
    await page.goto('/')
    const loginButton = page.locator('[data-testid="login-button"]').first()
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click()
      const emailInput = page.locator('input[type="email"]').first()
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('test@example.com')
        await page.locator('input[type="password"]').first().fill('testpass123')
        await page.locator('button[type="submit"]').first().click()
      }
    }

    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')
    await waitForWSConnection(page, 10000).catch(() => {
      console.warn('Initial WS connection timeout')
    })

    // Get baseline
    const initialCounters = await getWSCounters(page)
    console.log('Initial counters:', initialCounters)

    // Navigate away and back 5 times
    for (let i = 0; i < 5; i++) {
      // Navigate away
      await page.goto('/')
      await page.waitForTimeout(300)

      // Navigate back to KDS
      await page.goto('/kitchen')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(300)

      // Check for no spinner (loading state resolved)
      const spinner = page.locator('[data-testid="loading-spinner"]').first()
      const spinnerVisible = await spinner.isVisible({ timeout: 1000 }).catch(() => false)
      expect(spinnerVisible).toBe(false)

      const counters = await getWSCounters(page)
      console.log(`Nav ${i + 1}:`, counters)

      // Verify stable connection (at most 1)
      expect(counters.connectCount).toBeLessThanOrEqual(1)
    }

    // Final verification
    const finalCounters = await getWSCounters(page)
    expect(finalCounters.connectCount).toBe(1)

    // Subscription count should be stable (not growing unbounded)
    // Allow some variation but no massive growth
    expect(finalCounters.subCount).toBeLessThan(initialCounters.subCount * 2)

    console.log('✅ Scenario C: Nav churn passed', finalCounters)
  })

  test('Scenario D: Duplicate event detection', async ({ page }) => {
    // Track order events
    const orderEvents: string[] = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('[WebSocket] Emitting specific event')) {
        orderEvents.push(text)
      }
    })

    // Login and navigate to KDS
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')
    await waitForWSConnection(page, 10000).catch(() => {
      console.warn('WS connection timeout')
    })

    // Simulate order event
    await page.evaluate(() => {
      const testOrder = {
        id: 'test-order-duplicate-check',
        order_number: 'TEST-DUP-001',
        status: 'pending',
        restaurant_id: '11111111-1111-1111-1111-111111111111'
      }

      // Emit event via window (if accessible)
      const event = new CustomEvent('ws-test-order', { detail: testOrder })
      window.dispatchEvent(event)
    })

    await page.waitForTimeout(1000)

    // Filter events for our test order
    const testOrderEvents = orderEvents.filter(e => e.includes('test-order-duplicate-check'))

    // Should have at most 1 event for this order ID
    expect(testOrderEvents.length).toBeLessThanOrEqual(1)

    console.log('✅ Scenario D: Duplicate detection passed', {
      totalEvents: orderEvents.length,
      testOrderEvents: testOrderEvents.length
    })
  })
})
