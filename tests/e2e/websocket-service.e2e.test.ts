import { test, expect } from '@playwright/test'

test.describe('WebSocket Service E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kds')
    await page.waitForLoadState('networkidle')
  })

  test('should establish WebSocket connection', async ({ page }) => {
    // Wait for WebSocket connection
    const wsConnected = await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        if (window.__wsConnected) {
          resolve(true)
          return
        }
        
        const checkConnection = setInterval(() => {
          // @ts-ignore
          if (window.__wsConnected) {
            clearInterval(checkConnection)
            resolve(true)
          }
        }, 100)
        
        setTimeout(() => {
          clearInterval(checkConnection)
          resolve(false)
        }, 5000)
      })
    })
    
    expect(wsConnected).toBe(true)
  })

  test('should receive real-time order updates', async ({ page, context }) => {
    // Create a second page to submit an order
    const orderPage = await context.newPage()
    await orderPage.goto('/kiosk')
    
    // Set up listener for new orders on KDS page
    const orderPromise = page.waitForSelector('[data-testid="order-card"]', { 
      state: 'attached',
      timeout: 10000 
    })
    
    // Submit a test order from kiosk
    await orderPage.fill('[data-testid="table-number"]', 'TEST-1')
    await orderPage.click('[data-testid="add-item-burger"]')
    await orderPage.click('[data-testid="submit-order"]')
    
    // Verify order appears on KDS
    const orderCard = await orderPromise
    expect(orderCard).toBeTruthy()
    
    const orderNumber = await orderCard.textContent()
    expect(orderNumber).toContain('TEST-1')
  })

  test('should handle reconnection after disconnect', async ({ page }) => {
    // Simulate network disconnect
    await page.context().setOffline(true)
    
    // Wait for disconnect indication
    await page.waitForTimeout(2000)
    
    // Reconnect
    await page.context().setOffline(false)
    
    // Wait for reconnection
    const reconnected = await page.waitForFunction(() => {
      // @ts-ignore
      return window.__wsConnected === true
    }, { timeout: 10000 })
    
    expect(reconnected).toBeTruthy()
  })
})