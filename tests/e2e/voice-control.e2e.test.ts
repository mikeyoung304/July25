import { test, expect } from '@playwright/test'

test.describe('Voice Control E2E', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone'])
    await page.goto('/kiosk')
    await page.waitForLoadState('networkidle')
  })

  test('shows connection status indicator', async ({ page }) => {
    // Wait for voice control to render
    const voiceButton = await page.locator('[data-testid="voice-control-button"]')
    await expect(voiceButton).toBeVisible()
    
    // Check connection status
    const statusIndicator = await page.locator('[data-testid="connection-status"]')
    await expect(statusIndicator).toBeVisible()
    
    // Should eventually show connected
    await expect(statusIndicator).toHaveText('Connected', { timeout: 5000 })
  })

  test('disables button when WebSocket is not connected', async ({ page, context }) => {
    // Disconnect network to simulate WebSocket failure
    await context.setOffline(true)
    
    // Reload to trigger disconnection
    await page.reload()
    
    const voiceButton = await page.locator('[data-testid="voice-control-button"]')
    
    // Button should be disabled when disconnected
    await expect(voiceButton).toBeDisabled({ timeout: 5000 })
    
    // Reconnect
    await context.setOffline(false)
    
    // Button should become enabled
    await expect(voiceButton).toBeEnabled({ timeout: 10000 })
  })

  test('captures and transcribes voice input', async ({ page }) => {
    // This test requires actual microphone access
    // Skip in CI, run locally only
    if (process.env.CI) {
      test.skip()
      return
    }
    
    const voiceButton = await page.locator('[data-testid="voice-control-button"]')
    
    // Start recording
    await voiceButton.click()
    await expect(voiceButton).toHaveAttribute('data-recording', 'true')
    
    // Wait for auto-stop or manual stop
    await page.waitForTimeout(3000)
    
    // Check for transcription
    const transcription = await page.locator('[data-testid="transcription-text"]')
    await expect(transcription).toBeVisible()
  })
})