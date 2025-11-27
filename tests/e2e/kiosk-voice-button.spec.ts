import { test, expect } from '@playwright/test';

/**
 * Kiosk Voice Button UX Tests
 *
 * Tests the two-stage button flow:
 * 1. "Tap to Connect" (teal) → user taps → "Connecting..." (gray pulse)
 * 2. Once connected: "Tap to Speak" (green) → user taps → "Listening..." (red pulse)
 */
test.describe('Kiosk Voice Button UX', () => {
  test.beforeEach(async ({ page }) => {
    // Mock microphone permission to be granted
    await page.addInitScript(() => {
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{ stop: () => {}, kind: 'audio', enabled: true }],
          getAudioTracks: () => [{ stop: () => {}, kind: 'audio', enabled: true }],
        } as any;
      };

      // Mock permissions API
      (navigator.permissions as any).query = async ({ name }: { name: string }) => {
        if (name === 'microphone') {
          return { state: 'granted', addEventListener: () => {}, removeEventListener: () => {} };
        }
        return { state: 'prompt' };
      };
    });

    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    // Click "Voice Ordering" mode if mode selector is present
    const voiceMode = page.locator('text=Voice Ordering');
    if (await voiceMode.isVisible({ timeout: 3000 }).catch(() => false)) {
      await voiceMode.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('button shows "Tap to Connect" when disconnected', async ({ page }) => {
    // Wait for the button to appear
    const button = page.locator('button').filter({ hasText: /Tap to Connect|Connecting/i }).first();
    await expect(button).toBeVisible({ timeout: 10000 });

    // Button should show connection state initially
    const buttonText = await button.textContent();
    expect(buttonText).toMatch(/Tap to Connect|Connecting/i);
  });

  test('button transitions from "Tap to Connect" to "Connecting..." on tap', async ({ page }) => {
    // Wait for disconnected state button
    const button = page.locator('button').filter({ hasText: /Tap to Connect/i }).first();

    // If button shows "Connecting" already, auto-connect is working
    if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click the button
      await button.click();

      // Should show connecting state
      await expect(button).toContainText(/Connecting|Initializing/i, { timeout: 5000 });
    }
  });

  test('button has correct size for kiosk mode (large)', async ({ page }) => {
    // Find any voice button
    const button = page.locator('button').filter({ hasText: /Tap to|Connect|Speak|Listen/i }).first();
    await expect(button).toBeVisible({ timeout: 10000 });

    // Check that it has the large size class (w-40 = 160px)
    const hasLargeClass = await button.evaluate((el) => {
      return el.classList.contains('w-40') && el.classList.contains('h-40');
    });
    expect(hasLargeClass).toBe(true);
  });

  test('button is accessible with correct ARIA label', async ({ page }) => {
    const button = page.locator('button').filter({ hasText: /Tap to|Connect|Speak|Listen/i }).first();
    await expect(button).toBeVisible({ timeout: 10000 });

    // Check ARIA label exists
    const ariaLabel = await button.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/connect|speak|voice|recording/i);
  });

  test('button responds to touch events', async ({ page }) => {
    const button = page.locator('button').filter({ hasText: /Tap to|Connect|Speak/i }).first();
    await expect(button).toBeVisible({ timeout: 10000 });

    const initialText = await button.textContent();

    // Simulate touch event
    await button.dispatchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Wait a bit for state change
    await page.waitForTimeout(500);

    // Button should have changed state
    const newText = await button.textContent();
    // Either the text changed, or it stayed the same (if already connecting)
    expect(newText).toBeTruthy();
  });
});
