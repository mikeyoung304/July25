/**
 * Playwright Configuration - Main E2E Test Suite
 *
 * This is the PRIMARY Playwright config for all E2E tests.
 *
 * Projects included:
 * - chromium, firefox, webkit: Desktop browser testing (local dev)
 * - Mobile Chrome, Mobile Safari: Mobile device testing
 * - visual-regression: Screenshot comparison tests
 * - accessibility: a11y testing with axe-core
 * - api: API endpoint testing
 * - performance: Performance/Lighthouse tests
 * - smoke: Critical path smoke tests
 * - production: Tests against deployed Vercel app (no webServer needed)
 *
 * Usage:
 *   npm run test:e2e                    # Run all e2e tests (chromium)
 *   npx playwright test --project=smoke # Run smoke tests only
 *   npx playwright test --project=production tests/e2e/auth/  # Production auth tests
 *
 * Note: Voice ordering tests require separate config (playwright-e2e-voice.config.ts)
 * due to WebRTC SDK conflicts and special Chrome launch args for fake media streams.
 */
import { defineConfig, devices } from '@playwright/test';
import { VIEWPORTS, CHROME_LAUNCH_ARGS, createLaunchOptions } from './tests/config/viewport.config';

export default defineConfig({
  testDir: './tests/e2e',
  // Exclude .tsx files - these are React component tests that use @testing-library/react
  // and should be run with Vitest, not Playwright
  testIgnore: ['**/*.tsx'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 30 * 1000,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/e2e-results.json' }],
    ['list'],
    ['./tests/reporters/flaky-tracker.ts'],
    ...(process.env.CI ? [['github']] : []),
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
        launchOptions: createLaunchOptions(CHROME_LAUNCH_ARGS.desktop),
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: VIEWPORTS.desktop,
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: VIEWPORTS.desktop,
      },
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Visual regression tests
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktopHD,
        launchOptions: createLaunchOptions(CHROME_LAUNCH_ARGS.desktopHD),
      },
      testDir: './tests/visual',
    },

    // Accessibility tests
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
        launchOptions: createLaunchOptions(CHROME_LAUNCH_ARGS.desktop),
      },
      testDir: './tests/a11y',
    },

    // API tests
    {
      name: 'api',
      use: { 
        baseURL: process.env.API_BASE_URL ?? 'http://localhost:3001',
      },
      testDir: './tests/api',
    },

    // Performance tests
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
        launchOptions: createLaunchOptions(CHROME_LAUNCH_ARGS.performance),
      },
      testDir: './tests/performance',
    },

    // E2E Smoke tests (critical path only)
    {
      name: 'smoke',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
        launchOptions: createLaunchOptions(CHROME_LAUNCH_ARGS.desktop),
      },
      testDir: './tests/e2e',
    },

    // Production tests - run against deployed Vercel app
    // No webServer needed since we're testing the live deployment
    // Use: npx playwright test --project=production tests/e2e/production/
    //   or: npx playwright test --project=production tests/e2e/auth/auth-flow.production.spec.ts
    {
      name: 'production',
      testMatch: /.*\.(production|prod)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://july25-client.vercel.app',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
      testDir: './tests/e2e',
      retries: 1,
    },
  ],

  webServer: [
    {
      command: 'npm run dev:server',
      url: 'http://localhost:3001/api/v1/health',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev:client',
      url: 'http://localhost:5173',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});