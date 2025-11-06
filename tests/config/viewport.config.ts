/**
 * Shared Viewport Configuration
 *
 * Purpose: Prevent zoom issues on high-DPI displays (Mac Retina, Windows HiDPI)
 *
 * Why this matters:
 * - On Retina displays, Chrome can inherit OS-level scaling (2x, 3x)
 * - Without explicit deviceScaleFactor: 1, viewports may appear zoomed
 * - Missing --force-device-scale-factor arg allows Chrome to override settings
 * - This causes buttons and UI elements to appear cut off during tests
 *
 * Solution:
 * - Explicitly set deviceScaleFactor: 1 in all viewport configs
 * - Force Chrome to use scale factor 1 via launch args
 * - Use consistent viewport dimensions across all test environments
 */

export const VIEWPORTS = {
  /**
   * Desktop - Standard 1080p display
   * Use for: Most desktop UI tests
   */
  desktop: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  },

  /**
   * Laptop - Standard laptop resolution
   * Use for: Testing on smaller screens, responsive layouts
   */
  laptop: {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
  },

  /**
   * Desktop HD - Visual regression standard
   * Use for: Visual regression tests, screenshots
   */
  desktopHD: {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
  },

  /**
   * Tablet Landscape
   * Use for: Tablet-optimized UI testing
   */
  tabletLandscape: {
    width: 1024,
    height: 768,
    deviceScaleFactor: 1,
  },

  /**
   * Mobile - iPhone 12/13/14 size
   * Use for: Mobile UI testing
   */
  mobile: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2, // Mobile devices actually do use higher scale factors
    isMobile: true,
    hasTouch: true,
  },
} as const;

/**
 * Chrome Launch Arguments
 *
 * Critical args for preventing zoom issues:
 * - --force-device-scale-factor=1: Override system DPI scaling
 * - --window-size: Match viewport size to prevent window scaling
 * - --disable-blink-features=AutomationControlled: Better test isolation
 */
export const CHROME_LAUNCH_ARGS = {
  /**
   * Standard desktop args - Use for most tests
   */
  desktop: [
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    '--disable-blink-features=AutomationControlled',
  ],

  /**
   * Laptop args
   */
  laptop: [
    '--force-device-scale-factor=1',
    '--window-size=1366,768',
    '--disable-blink-features=AutomationControlled',
  ],

  /**
   * Desktop HD args - For visual regression
   */
  desktopHD: [
    '--force-device-scale-factor=1',
    '--window-size=1280,720',
    '--disable-blink-features=AutomationControlled',
  ],

  /**
   * Performance testing args
   */
  performance: [
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    '--no-sandbox',
    '--disable-web-security',
    '--disable-blink-features=AutomationControlled',
  ],
} as const;

/**
 * Helper function to create consistent browser launch options
 */
export function createLaunchOptions(args: string[]) {
  return {
    args,
    // Don't use user data dir to prevent zoom settings from persisting
    // This ensures fresh browser state for each test run
  };
}
