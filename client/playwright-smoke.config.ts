import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './smoke-tests',
  timeout: 30 * 1000,
  retries: 2,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:4173', // Default to local preview server
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