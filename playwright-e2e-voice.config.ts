/**
 * Playwright Configuration - Voice Ordering E2E Tests
 *
 * WHY THIS CONFIG EXISTS SEPARATELY:
 * Voice ordering tests REQUIRE isolation from the main test suite because:
 *
 * 1. WebRTC SDK Conflicts: The fake media stream Chrome args conflict with
 *    normal browser behavior. Running voice tests alongside regular tests
 *    causes MediaStream errors and test flakiness.
 *
 * 2. Fake Audio Capture: Voice tests inject a pre-recorded audio file
 *    (margherita.wav) via Chrome's --use-file-for-fake-audio-capture flag.
 *    This requires the browser to be launched with specific args.
 *
 * 3. Sequential Execution: Voice tests must run sequentially (workers: 1)
 *    to avoid conflicts with shared WebRTC resources and OpenAI Realtime API
 *    rate limits.
 *
 * 4. Longer Timeouts: Voice processing requires 3 minute timeouts due to:
 *    - WebSocket connection establishment to OpenAI
 *    - Audio streaming and transcription latency
 *    - Menu context loading
 *
 * Usage:
 *   npx playwright test --config=playwright-e2e-voice.config.ts
 *   npx playwright test --config=playwright-e2e-voice.config.ts tests/e2e/voice-order.spec.ts
 *
 * Test files using this config:
 *   - tests/e2e/voice-order.spec.ts (full WebRTC E2E flow)
 *
 * Note: Simple voice UI tests (button visibility, state transitions) can use
 * the main playwright.config.ts since they don't require actual media streams.
 */
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
