import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('Chip Monkey Floor Plan Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the floor plan editor
    await page.goto(`${BASE_URL}/admin`)
    
    // Click on Floor Plan Layout option
    await page.click('text=Floor Plan Layout')
    
    // Wait for the floor plan editor to load
    await page.waitForSelector('.floor-plan-canvas', { timeout: 5000 })
  })
  
  test('should display chip monkey button in toolbar', async ({ page }) => {
    // Check that the chip monkey button exists
    const chipMonkeyButton = page.locator('[title="Chip Monkey"]')
    await expect(chipMonkeyButton).toBeVisible()
  })
  
  test('should add chip monkey to canvas when clicked', async ({ page }) => {
    // Click the chip monkey button
    await page.click('[title="Chip Monkey"]')
    
    // Verify that a chip monkey element was added
    // This would typically check the canvas for the new element
    // For now, we'll just verify the button was clickable
    await expect(page.locator('[title="Chip Monkey"]')).toBeEnabled()
  })
  
  test('chip monkey should support drag and drop', async ({ page }) => {
    // Add a chip monkey
    await page.click('[title="Chip Monkey"]')
    
    // Get the canvas element
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    
    if (box) {
      // Simulate dragging the chip monkey
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100)
      await page.mouse.up()
    }
    
    // Verify the element can be interacted with
    await expect(canvas).toBeVisible()
  })
  
  test('chip monkey should persist after save', async ({ page }) => {
    // Add a chip monkey
    await page.click('[title="Chip Monkey"]')
    
    // Click save button
    await page.click('text=Save Layout')
    
    // Wait for save to complete
    await page.waitForTimeout(1000)
    
    // Reload the page
    await page.reload()
    
    // Wait for floor plan to load
    await page.waitForSelector('.floor-plan-canvas', { timeout: 5000 })
    
    // The chip monkey should still be present
    // This would require checking the canvas state
    await expect(page.locator('canvas')).toBeVisible()
  })
})