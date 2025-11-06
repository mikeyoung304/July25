import { defineConfig, devices } from '@playwright/test';
import { VIEWPORTS, CHROME_LAUNCH_ARGS, createLaunchOptions } from './tests/config/viewport.config';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30 * 1000,
  reporter: [
    ['html', { outputFolder: 'test-results/e2e-html-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['list'],
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
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});