# Viewport Configuration Guide

**Last Updated:** 2025-11-06

## Problem

When running Playwright tests in headed mode (visible browser) on high-DPI displays (Mac Retina, Windows HiDPI), the Chrome window appears zoomed in, causing UI elements and buttons to be cut off or positioned outside the viewport. This makes it impossible to properly test and debug the application.

## Root Cause

The issue stems from multiple factors:

1. **OS-level Display Scaling**: High-DPI displays (Retina) use 2x or 3x scaling at the OS level
2. **Chrome Inheriting System DPI**: Without explicit configuration, Chrome inherits the system's deviceScaleFactor
3. **Missing `--force-device-scale-factor` Flag**: Chrome can override Playwright's deviceScaleFactor setting unless explicitly forced
4. **Implicit Viewport Configuration**: Relying on device presets without explicit overrides can lead to inconsistent behavior

## Solution

We've implemented a centralized viewport configuration system that:

1. ✅ Explicitly sets `deviceScaleFactor: 1` for all desktop viewports
2. ✅ Forces Chrome to use `--force-device-scale-factor=1` via launch args
3. ✅ Provides consistent viewport sizes across all test environments
4. ✅ Matches window size to viewport size to prevent scaling
5. ✅ Prevents Chrome from persisting zoom settings between test runs

## Implementation

### Files Changed

- `tests/config/viewport.config.ts` - **New**: Shared viewport configuration
- `playwright.config.ts` - **Updated**: All projects now use shared config
- `tests/e2e/viewport-test.spec.ts` - **New**: Test to verify viewport configuration

### Architecture

```
playwright.config.ts
  ↓ imports
tests/config/viewport.config.ts
  ↓ exports
  - VIEWPORTS (viewport dimensions + deviceScaleFactor)
  - CHROME_LAUNCH_ARGS (browser launch arguments)
  - createLaunchOptions() (helper function)
```

### Available Viewports

```typescript
VIEWPORTS.desktop        // 1920x1080, deviceScaleFactor: 1
VIEWPORTS.laptop         // 1366x768,  deviceScaleFactor: 1
VIEWPORTS.desktopHD      // 1280x720,  deviceScaleFactor: 1
VIEWPORTS.tabletLandscape // 1024x768, deviceScaleFactor: 1
VIEWPORTS.mobile         // 390x844,   deviceScaleFactor: 2 (mobile uses higher DPI)
```

### Chrome Launch Arguments

```typescript
CHROME_LAUNCH_ARGS.desktop      // Standard desktop testing
CHROME_LAUNCH_ARGS.laptop       // Laptop resolution testing
CHROME_LAUNCH_ARGS.desktopHD    // Visual regression testing
CHROME_LAUNCH_ARGS.performance  // Performance testing (includes --no-sandbox)
```

**Critical Arguments:**
- `--force-device-scale-factor=1` - Override system DPI scaling
- `--window-size=WxH` - Match viewport size to prevent window scaling
- `--disable-blink-features=AutomationControlled` - Better test isolation

## Usage

### Running Tests in Headed Mode

To verify the fix, run tests in headed mode:

```bash
# Run specific test with visible browser
npx playwright test viewport-test --headed --project=chromium

# Run all tests with visible browser
npx playwright test --headed --project=chromium

# Debug mode (opens browser and pauses)
npx playwright test --debug --project=chromium
```

### Verification

The viewport-test.spec.ts file verifies:
1. `window.devicePixelRatio === 1` (correct scale factor)
2. Viewport dimensions match configuration (1920x1080)
3. UI elements are fully visible without zoom

### Adding New Test Projects

When adding new test projects, use the shared configuration:

```typescript
{
  name: 'my-new-project',
  use: {
    ...devices['Desktop Chrome'],
    viewport: VIEWPORTS.desktop,  // or .laptop, .desktopHD, etc.
    launchOptions: createLaunchOptions(CHROME_LAUNCH_ARGS.desktop),
  },
}
```

### Custom Viewport Sizes

If you need a custom viewport size:

```typescript
// In your test file
test.use({
  viewport: {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,  // Always set this to 1 for desktop
  },
});
```

## Best Practices

### DO ✅

- Always set `deviceScaleFactor: 1` for desktop/laptop viewports
- Use `--force-device-scale-factor=1` in Chrome launch args
- Match `--window-size` to viewport dimensions
- Use shared VIEWPORTS constants for consistency
- Test in headed mode on high-DPI displays before committing

### DON'T ❌

- Don't rely on device presets without explicit viewport override
- Don't forget deviceScaleFactor when adding custom viewports
- Don't use different viewport sizes in different test files (use shared config)
- Don't persist Chrome user data directory (prevents zoom settings from carrying over)

## Testing on Different Displays

### High-DPI Displays (Mac Retina, Windows HiDPI)
- The `--force-device-scale-factor=1` flag is **critical**
- Without it, you'll see 2x or 3x zoom
- Always verify tests in headed mode on your development machine

### Standard DPI Displays
- Configuration works identically
- No special considerations needed

### CI/CD Environments
- Usually run headless by default
- Viewport configuration ensures consistent rendering
- Screenshots and visual regression tests will be pixel-perfect

## Troubleshooting

### Problem: Browser still appears zoomed in headed mode

**Solution:**
1. Verify playwright.config.ts imports viewport.config.ts correctly
2. Check that your project uses `launchOptions: createLaunchOptions(...)`
3. Ensure Chrome isn't loading a user profile with saved zoom settings
4. Clear test-results and retry

### Problem: Different developers see different viewport sizes

**Solution:**
- Ensure everyone is using the shared VIEWPORTS constants
- Don't hardcode viewport sizes in individual test files
- Verify everyone has the latest playwright.config.ts

### Problem: Mobile tests show incorrect scaling

**Solution:**
- Mobile viewports should use deviceScaleFactor: 2 (this is correct)
- Use VIEWPORTS.mobile which is pre-configured correctly
- Don't force deviceScaleFactor: 1 for mobile tests

## Future Improvements

1. **MCP Puppeteer Integration**: If using MCP Puppeteer tools, configure them with:
   ```json
   {
     "launchOptions": {
       "args": ["--force-device-scale-factor=1", "--window-size=1920,1080"],
       "defaultViewport": {
         "width": 1920,
         "height": 1080,
         "deviceScaleFactor": 1
       }
     }
   }
   ```

2. **Environment Variables**: Consider adding viewport selection via env var:
   ```typescript
   const viewportSize = process.env.VIEWPORT_SIZE || 'desktop';
   viewport: VIEWPORTS[viewportSize]
   ```

3. **Visual Regression Baseline**: Regenerate all visual regression baselines to account for new viewport config

## References

- [Playwright Viewport Documentation](https://playwright.dev/docs/emulation#viewport)
- [Chrome DevTools Emulation](https://developer.chrome.com/docs/devtools/device-mode/)
- [High DPI Testing Guide](https://playwright.dev/docs/test-configuration#basic-options)

## Verification Checklist

Before considering this issue resolved:

- [ ] Run `npx playwright test viewport-test --headed --project=chromium`
- [ ] Verify `devicePixelRatio === 1` in console output
- [ ] Verify viewport dimensions match 1920x1080
- [ ] Visually inspect browser window - no zoom, all buttons visible
- [ ] Take screenshot and verify UI elements are correctly positioned
- [ ] Run on both high-DPI and standard displays (if available)
- [ ] Verify CI/CD tests still pass with new configuration

---

**Summary**: This configuration ensures consistent, zoom-free test execution across all development machines, regardless of display DPI settings. The use of `--force-device-scale-factor=1` and explicit viewport configuration eliminates the "zoomed in browser" problem permanently.
