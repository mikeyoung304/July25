import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/enhanced',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/enhanced-html-report' }],
    ['json', { outputFile: 'test-results/enhanced-results.json' }]
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
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
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
        viewport: { width: 1280, height: 720 },
      },
      testDir: './tests/visual',
    },

    // Accessibility tests
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
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
        launchOptions: {
          args: ['--no-sandbox', '--disable-web-security']
        }
      },
      testDir: './tests/performance',
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});