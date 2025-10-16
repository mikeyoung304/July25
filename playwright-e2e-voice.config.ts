import { defineConfig, devices } from '@playwright/test';
import { join } from 'path';

const AUDIO_PATH = join(process.cwd(), 'assets/voice_samples/margherita.wav');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run sequentially for voice tests
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for E2E voice tests
  workers: 1, // One worker to avoid conflicts
  timeout: 180000, // 3 minutes per test
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reports/e2e/voice/playwright.junit.xml' }]
  ],
  use: {
    baseURL: 'https://july25-client.vercel.app',
    trace: 'on',
    screenshot: 'on',
    video: {
      mode: 'on',
      size: { width: 1440, height: 900 }
    },
    viewport: { width: 1440, height: 900 },
    permissions: ['microphone'],
    headless: true,
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${AUDIO_PATH}`,
        '--no-sandbox',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },

  projects: [
    {
      name: 'chromium-voice',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
