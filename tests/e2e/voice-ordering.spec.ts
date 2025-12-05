import { test, expect } from '@playwright/test';

test.describe('Voice Ordering - Smoke Tests @smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test('voice ordering UI elements present on kiosk', async ({ page }) => {
    // Mock microphone permission
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => {}, kind: 'audio', enabled: true }],
        getAudioTracks: () => [{ stop: () => {}, kind: 'audio', enabled: true }],
      } as any);

      (navigator.permissions as any).query = async ({ name }: { name: string }) => {
        if (name === 'microphone') {
          return { state: 'granted', addEventListener: () => {}, removeEventListener: () => {} };
        }
        return { state: 'prompt' };
      };
    });

    // 1. Navigate to kiosk
    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    // 2. Look for voice ordering mode or button
    const voiceMode = page.locator('text=Voice Ordering');
    if (await voiceMode.isVisible({ timeout: 3000 }).catch(() => false)) {
      await voiceMode.click();
      await page.waitForLoadState('networkidle');
    }

    // 3. Verify voice button is present
    const voiceButton = page.locator('button').filter({ hasText: /tap to|connect|speak|mic|hold/i }).first();
    await expect(voiceButton).toBeVisible({ timeout: 10000 });

    // 4. Verify button has correct accessibility
    const ariaLabel = await voiceButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // 5. Verify button is interactive (not disabled)
    await expect(voiceButton).toBeEnabled();
  });

  // Note: Actual voice flow with MediaRecorder mocking is too complex for smoke test
  // and belongs in integration tests. The API tests (menu, health) belong in
  // server-side integration tests, not E2E UI tests.
  //
  // Removed tests:
  // - Homepage voice button test (redundant with kiosk test)
  // - Complex MediaRecorder mocking flow (too flaky for smoke, needs integration suite)
  // - Drive-thru page test (covered by other drive-thru specs)
  // - Server view floor plan test (covered by server view specs)
  // - Menu endpoint API test (belongs in server/tests/)
  // - Health check API test (belongs in server/tests/)
});
