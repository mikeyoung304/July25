# Fix Kiosk Voice Button UX & Add E2E Tests

## Overview

The kiosk voice ordering button has UX issues that make the experience feel "clunky" and a debug panel that should be removed for production. This plan addresses those issues and adds comprehensive Playwright E2E tests.

## Problem Statement

1. **Debug Panel Always Visible**: `debug={true}` is hardcoded in `VoiceOrderingMode.tsx:263`, causing the VoiceDebugPanel to always render in the bottom-right corner
2. **Clunky Button Feel**: The button transitions may feel sluggish due to:
   - 300ms debounce on tap actions
   - Multiple state transitions before visual feedback
   - Animation timing issues
3. **Missing E2E Tests**: No comprehensive Playwright tests for button state transitions, VAD behavior, and UX flow

## Proposed Solution

### Phase 1: Remove Debug Panel (5 min)

**File**: `client/src/components/kiosk/VoiceOrderingMode.tsx`

Change line 263 from:
```typescript
debug={true}
```
to:
```typescript
debug={import.meta.env.DEV && false}  // Disabled - use DevTools for debugging
```

Or simply remove the `debug` prop entirely (defaults to `false`).

### Phase 2: Improve Button Responsiveness (20 min)

**File**: `client/src/modules/voice/components/HoldToRecordButton.tsx`

#### 2.1 Reduce VAD Mode Debounce
Change line 41 from 300ms to 150ms for snappier response:
```typescript
const effectiveDebounce = debounceMs ?? (mode === 'hold' ? 100 : 150);
```

#### 2.2 Add Immediate Visual Feedback
Add a pressed state for instant tactile feedback (scale transform on mousedown):
```typescript
const [isPressed, setIsPressed] = useState(false);

// In handleMouseDown/handleTouchStart:
setIsPressed(true);

// In handleMouseUp/handleTouchEnd:
setIsPressed(false);

// In button className:
isPressed && 'scale-95',  // Instant press feedback
```

#### 2.3 Optimize Transitions
Reduce transition duration for state changes:
```typescript
'transition-all duration-150',  // Was 300ms
```

### Phase 3: Add Playwright E2E Tests (30 min)

**New File**: `tests/e2e/kiosk-voice-button.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Kiosk Voice Button UX', () => {
  test.beforeEach(async ({ page }) => {
    // Mock microphone permission
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => {}, kind: 'audio', enabled: true }],
        getAudioTracks: () => [{ stop: () => {}, kind: 'audio', enabled: true }],
      } as any);
    });

    await page.goto('/kiosk');
    await page.waitForLoadState('networkidle');

    // Click "Voice Ordering" mode if mode selector is present
    const voiceMode = page.locator('text=Voice Ordering');
    if (await voiceMode.isVisible({ timeout: 2000 })) {
      await voiceMode.click();
    }
  });

  test('button shows correct initial state', async ({ page }) => {
    const button = page.locator('button:has-text("Tap to Speak")');
    await expect(button).toBeVisible({ timeout: 10000 });
    await expect(button).not.toHaveClass(/bg-danger/);  // Not recording
    await expect(button).toHaveClass(/bg-primary/);     // Ready state
  });

  test('button responds to tap with visual feedback', async ({ page }) => {
    const button = page.locator('button:has-text("Tap to Speak")');
    await expect(button).toBeVisible({ timeout: 10000 });

    // Tap the button
    await button.click();

    // Should show listening state
    await expect(button).toContainText(/Listening/i, { timeout: 3000 });
    await expect(button).toHaveClass(/bg-danger/);  // Red recording state
  });

  test('button handles rapid taps gracefully', async ({ page }) => {
    const button = page.locator('button:has-text("Tap to Speak")');
    await expect(button).toBeVisible({ timeout: 10000 });

    // Rapid taps should be debounced
    await button.click();
    await button.click();
    await button.click();

    // Should not crash or get stuck - still functional
    await expect(button).toBeVisible();

    // Wait for debounce to clear
    await page.waitForTimeout(500);

    // Button should still be responsive
    const buttonText = await button.textContent();
    expect(buttonText).toBeTruthy();
  });

  test('button shows processing state after speech', async ({ page }) => {
    const button = page.locator('button:has-text("Tap to Speak")');
    await expect(button).toBeVisible({ timeout: 10000 });

    // Mock the OpenAI response
    await page.route('**/api/v1/ai/parse-order', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          items: [{ name: 'Soul Bowl', quantity: 1, price: 12.99 }],
        }),
      });
    });

    // Start recording
    await button.click();
    await expect(button).toContainText(/Listening/i, { timeout: 3000 });

    // Wait for VAD timeout (simulates speech end)
    // In test mode, this might need to be triggered manually
  });

  test('no debug panel visible in normal mode', async ({ page }) => {
    // Debug panel should NOT be visible
    const debugPanel = page.locator('text=Voice Debug Panel');
    await expect(debugPanel).not.toBeVisible();

    // Also check for the fixed positioning debug element
    const fixedDebug = page.locator('.fixed.bottom-2.right-2');
    await expect(fixedDebug).not.toBeVisible();
  });

  test('button is accessible with correct ARIA attributes', async ({ page }) => {
    const button = page.locator('button:has-text("Tap to Speak")');
    await expect(button).toBeVisible({ timeout: 10000 });

    // Check ARIA attributes
    await expect(button).toHaveAttribute('role', 'button');
    await expect(button).toHaveAttribute('aria-label', /Tap to start speaking/i);
    await expect(button).toHaveAttribute('aria-pressed', 'false');

    // After clicking
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('button size is large for kiosk mode', async ({ page }) => {
    const button = page.locator('button:has-text("Tap to Speak")');
    await expect(button).toBeVisible({ timeout: 10000 });

    // Should have large size class (160px = w-40 h-40)
    await expect(button).toHaveClass(/w-40/);
    await expect(button).toHaveClass(/h-40/);
  });

  test('touch events work correctly', async ({ page }) => {
    const button = page.locator('button:has-text("Tap to Speak")');
    await expect(button).toBeVisible({ timeout: 10000 });

    // Simulate touch event
    await button.dispatchEvent('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
    await page.waitForTimeout(100);

    // Should start recording
    await expect(button).toContainText(/Listening/i, { timeout: 3000 });
  });
});
```

## Acceptance Criteria

- [ ] Debug panel is NOT visible in kiosk mode (unless explicitly enabled)
- [ ] Button responds to taps within 150ms (visual feedback)
- [ ] Button shows "Listening..." state when recording
- [ ] Button shows red color (bg-danger) when active
- [ ] Button handles rapid taps without crashing
- [ ] Button is 160px (w-40/h-40) in kiosk mode
- [ ] All ARIA attributes are correct
- [ ] Touch events work on mobile/kiosk screens
- [ ] E2E tests pass for all button states

## Technical Considerations

### Files to Modify
1. `client/src/components/kiosk/VoiceOrderingMode.tsx:263` - Remove debug={true}
2. `client/src/modules/voice/components/HoldToRecordButton.tsx:41` - Reduce debounce
3. `client/src/modules/voice/components/HoldToRecordButton.tsx:265-266` - Faster transitions

### Files to Create
1. `tests/e2e/kiosk-voice-button.spec.ts` - New E2E test suite

### Dependencies
- Playwright test runner
- Mock getUserMedia for tests
- Mock OpenAI Realtime API responses

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Reduced debounce causes double-taps | Low | Medium | Keep 150ms minimum, test on real kiosk |
| Faster transitions feel jarring | Low | Low | User test on 55" screen |
| E2E tests flaky due to timing | Medium | Low | Use proper waitFor conditions |

## Success Metrics

- Button tap-to-visual-feedback latency < 150ms
- No debug panel visible in production builds
- All E2E tests pass in CI
- User reports of "clunky" behavior resolved

## References

### Internal References
- `client/src/modules/voice/components/HoldToRecordButton.tsx:1-318` - Button component
- `client/src/modules/voice/components/VoiceControlWebRTC.tsx:1-400` - Voice control wrapper
- `client/src/components/kiosk/VoiceOrderingMode.tsx:1-467` - Kiosk mode container
- `tests/e2e/voice-ordering.spec.ts:1-237` - Existing voice E2E tests

### Related Work
- Commit `5eed3cdd` - Previous button state desync fix
- Commit `e64b4e42` - VAD auto-stop implementation
- ADR-012 - Voice interaction pattern by context
