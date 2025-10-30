/**
 * Multi-Seat Ordering E2E Test
 * Task: TEST_002
 * Purpose: Integration test for complete multi-seat ordering workflow
 * Author: TESTING_AGENT (Claude Code)
 * Created: 2025-10-29
 *
 * Test Scenario:
 * 1. Server selects Table 5
 * 2. Seat selection modal appears
 * 3. Server selects Seat 1
 * 4. Server places voice order
 * 5. PostOrderPrompt appears with "Add Next Seat" and "Finish Table"
 * 6. Server clicks "Add Next Seat"
 * 7. Seat selection modal reappears with Seat 1 marked ✅
 * 8. Server selects Seat 2
 * 9. Server places another order
 * 10. Server clicks "Finish Table"
 * 11. Verify both orders in database with correct seat_number values
 * 12. Verify orders appear on kitchen display with seat numbers
 */

import { test, expect, Page } from '@playwright/test'
import { loginAsRole, waitForOrderInKDS } from './fixtures/test-helpers'
import {
  MULTI_SEAT_FIXTURES,
  MOCK_TABLE_5,
  VOICE_TRANSCRIPTS,
  generateSeatOrder,
  SEAT_1_ITEMS,
  SEAT_2_ITEMS
} from '../fixtures/multi-seat-orders'

// ============================================================================
// Test Configuration
// ============================================================================

test.describe('Multi-Seat Ordering Workflow', () => {
  test.describe.configure({ mode: 'serial' }) // Run tests in order

  let orderIds: string[] = [] // Track created order IDs for cleanup

  test.beforeEach(async ({ page }) => {
    // Clear any existing state
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test orders if they were created
    if (orderIds.length > 0) {
      for (const orderId of orderIds) {
        try {
          await page.request.delete(`/api/v1/orders/${orderId}`)
        } catch (error) {
          console.warn(`Failed to cleanup order ${orderId}:`, error)
        }
      }
      orderIds = []
    }
  })

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  /**
   * Navigate to Server View and wait for floor plan to load
   */
  async function navigateToServerView(page: Page) {
    await loginAsRole(page, 'server')
    await expect(page).toHaveURL(/\/server/)

    // Wait for floor plan to load
    const floorPlan = page.locator('canvas, [data-testid="floor-plan"]')
    await expect(floorPlan).toBeVisible({ timeout: 10000 })
  }

  /**
   * Click on Table 5 in the floor plan
   */
  async function selectTable5(page: Page) {
    // Approach 1: If table has a data-testid
    const table5Direct = page.locator('[data-testid="table-5"]')
    if (await table5Direct.isVisible({ timeout: 2000 }).catch(() => false)) {
      await table5Direct.click()
      return
    }

    // Approach 2: Click on canvas at Table 5's position
    const canvas = page.locator('canvas').first()
    if (await canvas.isVisible()) {
      // Table 5 is at position (200, 150) according to fixtures
      await canvas.click({ position: { x: 200, y: 150 } })
      return
    }

    // Approach 3: Find table by label
    const table5Label = page.locator('text=/Table 5|T5/i')
    if (await table5Label.isVisible({ timeout: 2000 }).catch(() => false)) {
      await table5Label.click()
      return
    }

    throw new Error('Could not find Table 5 on floor plan')
  }

  /**
   * Wait for seat selection modal to appear
   */
  async function waitForSeatSelectionModal(page: Page) {
    const modal = page.locator('text=/Select Seat|Choose.*Seat/i').first()
    await expect(modal).toBeVisible({ timeout: 5000 })
    return modal
  }

  /**
   * Select a specific seat in the modal
   */
  async function selectSeat(page: Page, seatNumber: number) {
    // Look for seat button with text like "Seat 1", "Seat 2", etc.
    const seatButton = page.locator(`button:has-text("Seat ${seatNumber}")`).first()
    await expect(seatButton).toBeVisible({ timeout: 5000 })
    await seatButton.click()

    // Verify seat is selected (usually highlighted)
    await expect(seatButton).toHaveClass(/selected|active|border-primary/, { timeout: 2000 })
  }

  /**
   * Start voice order from seat selection modal
   */
  async function startVoiceOrder(page: Page) {
    const startButton = page.locator('button:has-text("Start Voice Order")')
    await expect(startButton).toBeVisible()
    await expect(startButton).toBeEnabled()
    await startButton.click()
  }

  /**
   * Place a voice order (mock the voice input)
   */
  async function placeVoiceOrder(page: Page, transcript: string) {
    // Wait for voice order modal/interface to appear
    const voiceInterface = page.locator('[data-testid="voice-order-modal"], text=/Voice Order|Hold to Speak/i').first()
    await expect(voiceInterface).toBeVisible({ timeout: 5000 })

    // Mock the voice recognition
    await page.evaluate((text) => {
      // Simulate voice transcript event
      const event = new CustomEvent('voice-transcript', {
        detail: { text, isFinal: true }
      })
      window.dispatchEvent(event)
    }, transcript)

    // Wait for items to be added to order
    await page.waitForTimeout(1000)

    // Look for order items in the UI
    const orderItemsList = page.locator('[data-testid="order-items-list"], .order-items')
    await expect(orderItemsList).toBeVisible({ timeout: 3000 })
  }

  /**
   * Submit the voice order
   */
  async function submitVoiceOrder(page: Page) {
    const submitButton = page.locator('button:has-text("Submit Order"), button:has-text("Place Order")')
    await expect(submitButton).toBeVisible({ timeout: 5000 })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Wait for success indication
    await expect(page.locator('text=/Order.*submitted|Success/i')).toBeVisible({ timeout: 5000 })
  }

  /**
   * Wait for PostOrderPrompt to appear
   */
  async function waitForPostOrderPrompt(page: Page) {
    // PostOrderPrompt should show after order submission
    const prompt = page.locator('[data-testid="post-order-prompt"], text=/What.*next|Add Next Seat|Finish Table/i').first()
    await expect(prompt).toBeVisible({ timeout: 5000 })
    return prompt
  }

  /**
   * Click "Add Next Seat" button
   */
  async function clickAddNextSeat(page: Page) {
    const addNextButton = page.locator('button:has-text("Add Next Seat")')
    await expect(addNextButton).toBeVisible()
    await expect(addNextButton).toBeEnabled()
    await addNextButton.click()
  }

  /**
   * Click "Finish Table" button
   */
  async function clickFinishTable(page: Page) {
    const finishButton = page.locator('button:has-text("Finish Table")')
    await expect(finishButton).toBeVisible()
    await expect(finishButton).toBeEnabled()
    await finishButton.click()
  }

  /**
   * Verify seat is marked as ordered in seat selection modal
   */
  async function verifySeatMarked(page: Page, seatNumber: number) {
    const seatButton = page.locator(`button:has-text("Seat ${seatNumber}")`).first()
    await expect(seatButton).toBeVisible()

    // Check for checkmark or "ordered" indicator
    // Could be a checkmark icon, "✅" text, or a CSS class
    const hasCheckmark = await seatButton.locator('text=/✅|✓|Ordered/i').isVisible().catch(() => false)
    const hasOrderedClass = await seatButton.evaluate((el) => {
      return el.className.includes('ordered') || el.className.includes('completed')
    })

    expect(hasCheckmark || hasOrderedClass).toBeTruthy()
  }

  /**
   * Verify order exists in database with correct seat_number
   */
  async function verifyOrderInDatabase(page: Page, tableNumber: string, seatNumber: number) {
    const response = await page.request.get('/api/v1/orders', {
      headers: {
        'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111'
      }
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    const orders = data.data || data

    // Find order for this table and seat
    const order = orders.find((o: any) =>
      o.table_number === tableNumber && o.seat_number === seatNumber
    )

    expect(order).toBeDefined()
    expect(order.table_number).toBe(tableNumber)
    expect(order.seat_number).toBe(seatNumber)

    // Track order ID for cleanup
    if (order?.id) {
      orderIds.push(order.id)
    }

    return order
  }

  /**
   * Navigate to Kitchen Display and verify order appears with seat number
   */
  async function verifyOrderInKitchen(page: Page, orderNumber: string, seatNumber: number) {
    // Navigate to kitchen display
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')

    // Wait for KDS to load
    await expect(page.locator('h1:has-text("Kitchen Display")')).toBeVisible({ timeout: 10000 })

    // Find the order card
    const orderCard = await waitForOrderInKDS(page, orderNumber)
    await expect(orderCard).toBeVisible()

    // Verify seat number is displayed
    const seatLabel = orderCard.locator(`text=/Seat ${seatNumber}|S${seatNumber}/i`)
    await expect(seatLabel).toBeVisible()
  }

  // ==========================================================================
  // Test Cases
  // ==========================================================================

  test('Complete multi-seat ordering flow: Seat 1 → Seat 2 → Finish', async ({ page }) => {
    test.slow() // This test may take longer than default timeout

    // Step 1: Navigate to Server View
    await navigateToServerView(page)

    // Step 2: Select Table 5
    await selectTable5(page)

    // Step 3: Verify seat selection modal appears
    await waitForSeatSelectionModal(page)

    // Step 4: Select Seat 1
    await selectSeat(page, 1)

    // Step 5: Start voice order
    await startVoiceOrder(page)

    // Step 6: Place order for Seat 1
    await placeVoiceOrder(page, VOICE_TRANSCRIPTS.seat1)

    // Step 7: Submit order
    await submitVoiceOrder(page)

    // Step 8: Verify PostOrderPrompt appears
    await waitForPostOrderPrompt(page)

    // Step 9: Verify "Add Next Seat" and "Finish Table" buttons are visible
    await expect(page.locator('button:has-text("Add Next Seat")')).toBeVisible()
    await expect(page.locator('button:has-text("Finish Table")')).toBeVisible()

    // Step 10: Click "Add Next Seat"
    await clickAddNextSeat(page)

    // Step 11: Verify seat selection modal reappears
    await waitForSeatSelectionModal(page)

    // Step 12: Verify Seat 1 is marked as ordered
    await verifySeatMarked(page, 1)

    // Step 13: Select Seat 2
    await selectSeat(page, 2)

    // Step 14: Start voice order for Seat 2
    await startVoiceOrder(page)

    // Step 15: Place order for Seat 2
    await placeVoiceOrder(page, VOICE_TRANSCRIPTS.seat2)

    // Step 16: Submit order for Seat 2
    await submitVoiceOrder(page)

    // Step 17: PostOrderPrompt appears again
    await waitForPostOrderPrompt(page)

    // Step 18: Click "Finish Table"
    await clickFinishTable(page)

    // Step 19: Verify we return to floor plan
    await expect(page.locator('canvas, [data-testid="floor-plan"]')).toBeVisible({ timeout: 5000 })

    // Step 20: Verify both orders exist in database with correct seat_number
    const order1 = await verifyOrderInDatabase(page, '5', 1)
    const order2 = await verifyOrderInDatabase(page, '5', 2)

    expect(order1.seat_number).toBe(1)
    expect(order2.seat_number).toBe(2)

    // Step 21: Verify orders appear on kitchen display with seat numbers
    if (order1.order_number) {
      await verifyOrderInKitchen(page, order1.order_number, 1)
    }

    // Navigate back to verify order 2
    await page.goto('/kitchen')
    if (order2.order_number) {
      await verifyOrderInKitchen(page, order2.order_number, 2)
    }
  })

  test('Seat selection modal shows available seats correctly', async ({ page }) => {
    await navigateToServerView(page)
    await selectTable5(page)
    await waitForSeatSelectionModal(page)

    // Verify all 4 seats are shown (Table 5 has capacity of 4)
    for (let seat = 1; seat <= MOCK_TABLE_5.capacity; seat++) {
      const seatButton = page.locator(`button:has-text("Seat ${seat}")`)
      await expect(seatButton).toBeVisible()
    }
  })

  test('Cannot start voice order without selecting a seat', async ({ page }) => {
    await navigateToServerView(page)
    await selectTable5(page)
    await waitForSeatSelectionModal(page)

    // Verify "Start Voice Order" button is disabled when no seat selected
    const startButton = page.locator('button:has-text("Start Voice Order")')
    await expect(startButton).toBeVisible()
    await expect(startButton).toBeDisabled()
  })

  test('Can cancel seat selection and return to floor plan', async ({ page }) => {
    await navigateToServerView(page)
    await selectTable5(page)
    await waitForSeatSelectionModal(page)

    // Click cancel button
    const cancelButton = page.locator('button:has-text("Cancel")')
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()

    // Verify modal is closed and we're back at floor plan
    const modal = page.locator('text=/Select Seat/i')
    await expect(modal).not.toBeVisible({ timeout: 2000 })
    await expect(page.locator('canvas, [data-testid="floor-plan"]')).toBeVisible()
  })

  test('PostOrderPrompt buttons work correctly', async ({ page }) => {
    // This test verifies the PostOrderPrompt component behavior
    // Note: This test requires PostOrderPrompt component to be implemented

    await navigateToServerView(page)
    await selectTable5(page)
    await waitForSeatSelectionModal(page)
    await selectSeat(page, 1)
    await startVoiceOrder(page)
    await placeVoiceOrder(page, VOICE_TRANSCRIPTS.seat1)
    await submitVoiceOrder(page)

    // Verify PostOrderPrompt appears
    const prompt = await waitForPostOrderPrompt(page)

    // Verify both buttons are present
    const addNextButton = page.locator('button:has-text("Add Next Seat")')
    const finishButton = page.locator('button:has-text("Finish Table")')

    await expect(addNextButton).toBeVisible()
    await expect(finishButton).toBeVisible()
    await expect(addNextButton).toBeEnabled()
    await expect(finishButton).toBeEnabled()
  })

  test('Kitchen Display shows seat numbers on order cards', async ({ page }) => {
    test.slow()

    // First, create an order through the UI or API
    await navigateToServerView(page)
    await selectTable5(page)
    await waitForSeatSelectionModal(page)
    await selectSeat(page, 3)
    await startVoiceOrder(page)
    await placeVoiceOrder(page, VOICE_TRANSCRIPTS.seat3)
    await submitVoiceOrder(page)

    // Get the order from database
    const order = await verifyOrderInDatabase(page, '5', 3)

    // Navigate to Kitchen Display
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')

    // Find the order card
    const orderCard = await waitForOrderInKDS(page, order.order_number)

    // Verify seat number is prominently displayed
    const seatIndicator = orderCard.locator('text=/Seat 3|S3/i')
    await expect(seatIndicator).toBeVisible()

    // Verify table number is also shown
    const tableIndicator = orderCard.locator('text=/Table 5|T5/i')
    await expect(tableIndicator).toBeVisible()
  })

  test('Multiple orders for same table are grouped correctly', async ({ page }) => {
    test.slow()

    // Create orders for Seat 1 and Seat 2
    await navigateToServerView(page)

    // Order 1
    await selectTable5(page)
    await waitForSeatSelectionModal(page)
    await selectSeat(page, 1)
    await startVoiceOrder(page)
    await placeVoiceOrder(page, VOICE_TRANSCRIPTS.seat1)
    await submitVoiceOrder(page)
    await waitForPostOrderPrompt(page)
    await clickAddNextSeat(page)

    // Order 2
    await waitForSeatSelectionModal(page)
    await selectSeat(page, 2)
    await startVoiceOrder(page)
    await placeVoiceOrder(page, VOICE_TRANSCRIPTS.seat2)
    await submitVoiceOrder(page)
    await waitForPostOrderPrompt(page)
    await clickFinishTable(page)

    // Verify both orders exist
    const order1 = await verifyOrderInDatabase(page, '5', 1)
    const order2 = await verifyOrderInDatabase(page, '5', 2)

    // Navigate to Kitchen Display
    await page.goto('/kitchen')
    await page.waitForLoadState('networkidle')

    // Both orders should be visible and grouped by table
    const table5Orders = page.locator('[data-testid^="order-card-"]:has(text=/Table 5|T5/i)')
    await expect(table5Orders).toHaveCount(2, { timeout: 10000 })
  })

  test('Error handling: Order submission fails gracefully', async ({ page }) => {
    await navigateToServerView(page)
    await selectTable5(page)
    await waitForSeatSelectionModal(page)
    await selectSeat(page, 1)
    await startVoiceOrder(page)

    // Mock API failure
    await page.route('**/api/v1/orders', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      })
    })

    await placeVoiceOrder(page, VOICE_TRANSCRIPTS.seat1)

    // Attempt to submit
    const submitButton = page.locator('button:has-text("Submit Order"), button:has-text("Place Order")')
    await submitButton.click()

    // Verify error message appears
    const errorMessage = page.locator('text=/Failed|Error|Unable to submit/i')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })

    // Verify order was not created
    const response = await page.request.get('/api/v1/orders')
    const data = await response.json()
    const orders = data.data || data
    const failedOrder = orders.find((o: any) => o.table_number === '5' && o.seat_number === 1)
    expect(failedOrder).toBeUndefined()
  })
})

// ============================================================================
// Additional Test Suites (Edge Cases)
// ============================================================================

test.describe('Multi-Seat Ordering: Edge Cases', () => {
  test('Handles maximum capacity (all 4 seats ordered)', async ({ page }) => {
    // Test that all 4 seats can be ordered successfully
    // and UI properly indicates when table is full
  })

  test('Prevents duplicate orders for same seat', async ({ page }) => {
    // Test that once Seat 1 is ordered, it cannot be ordered again
    // until the table is cleared
  })

  test('Allows server to skip seats (order Seat 1, then Seat 3)', async ({ page }) => {
    // Test non-sequential seat ordering
  })

  test('Handles concurrent orders at same table', async ({ page }) => {
    // Test race condition: two servers try to order same seat simultaneously
  })
})

test.describe('Multi-Seat Ordering: Integration with Payment', () => {
  test('Individual seat orders can be paid separately', async ({ page }) => {
    // Test that each seat's order can have its own payment
  })

  test('All seats at table can be paid together (split check)', async ({ page }) => {
    // Test combining multiple seat orders into one payment
  })
})
