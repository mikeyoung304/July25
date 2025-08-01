import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './smoke-tests',
  timeout: 30 * 1000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:4173', // Use preview port for production build
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});