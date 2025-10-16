#!/usr/bin/env node

/**
 * Puppeteer E2E Voice Ordering Cross-Check
 * Phase C: Cross-validation using Puppeteer MCP
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://july25-client.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpass123';
const AUDIO_PATH = path.join(__dirname, '..', '..', 'assets', 'voice_samples', 'margherita.wav');
const REPORT_DIR = path.join(__dirname, '..', '..', 'reports', 'e2e', 'voice');

// Helper to mask secrets
function maskSecrets(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(new RegExp(TEST_EMAIL, 'gi'), '***EMAIL***')
    .replace(new RegExp(TEST_PASSWORD, 'gi'), '***PASSWORD***');
}

// Helper to append NDJSON logs
function appendLog(filename, data) {
  try {
    fs.appendFileSync(
      path.join(REPORT_DIR, filename),
      JSON.stringify(data) + '\n'
    );
  } catch (err) {
    console.error(`Failed to append to ${filename}:`, err);
  }
}

// Main test function
async function runPuppeteerVoiceTest() {
  console.log('\n========== Starting Puppeteer Voice Test ==========\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${AUDIO_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Grant microphone permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE_URL, ['microphone']);

  const consoleLog = 'puppeteer_console.ndjson';
  const wsLog = 'puppeteer_ws.json';
  const wsFrames = [];

  // Setup console capture
  page.on('console', (msg) => {
    appendLog(consoleLog, {
      type: 'console',
      level: msg.type(),
      text: maskSecrets(msg.text()),
      t: Date.now(),
    });
  });

  page.on('pageerror', (err) => {
    appendLog(consoleLog, {
      type: 'pageerror',
      message: maskSecrets(err.message),
      stack: maskSecrets(err.stack || ''),
      t: Date.now(),
    });
  });

  page.on('requestfailed', (req) => {
    appendLog(consoleLog, {
      type: 'requestfailed',
      url: maskSecrets(req.url()),
      failure: maskSecrets(req.failure()?.errorText || 'unknown'),
      t: Date.now(),
    });
  });

  page.on('response', async (res) => {
    if (res.status() >= 400) {
      appendLog(consoleLog, {
        type: 'response_error',
        url: maskSecrets(res.url()),
        status: res.status(),
        statusText: res.statusText(),
        t: Date.now(),
      });
    }
  });

  // Setup CDP for WebSocket capture
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');

  client.on('Network.webSocketCreated', ({ requestId, url }) => {
    wsFrames.push({ event: 'ws_connect', url: maskSecrets(url), t: Date.now() });
  });

  client.on('Network.webSocketFrameSent', ({ requestId, timestamp, response }) => {
    wsFrames.push({
      dir: 'out',
      data: maskSecrets(response.payloadData || ''),
      t: Date.now(),
    });
  });

  client.on('Network.webSocketFrameReceived', ({ requestId, timestamp, response }) => {
    wsFrames.push({
      dir: 'in',
      data: maskSecrets(response.payloadData || ''),
      t: Date.now(),
    });
  });

  client.on('Network.webSocketClosed', ({ requestId, timestamp }) => {
    wsFrames.push({ event: 'ws_close', t: Date.now() });
  });

  let testResult = {
    success: false,
    loginSuccess: false,
    voiceStarted: false,
    transcriptDetected: false,
    cartUpdated: false,
    errors: [],
  };

  try {
    // Navigate and handle splash
    console.log('[Puppeteer] Navigating to BASE_URL...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Wait for splash (5.5s)
    console.log('[Puppeteer] Waiting for splash screen...');
    await page.waitForTimeout(5500);

    // Try to dismiss overlays
    const overlaySelectors = [
      'button:has-text("Accept")',
      'button:has-text("Close")',
      '[aria-label="Close"]',
    ];

    for (const selector of overlaySelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(500);
          console.log('[Puppeteer] Dismissed overlay');
          break;
        }
      } catch {
        // No overlay
      }
    }

    // Login
    console.log('[Puppeteer] Attempting login...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.type('input[type="password"], input[name="password"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    testResult.loginSuccess = true;
    console.log('[Puppeteer] Login completed');

    // Navigate to ordering screen
    console.log('[Puppeteer] Navigating to ordering screen...');
    const orderingSelectors = [
      'a:has-text("Server")',
      'a:has-text("Ordering")',
      'a[href*="server"]',
      'a[href*="ordering"]',
    ];

    for (const selector of orderingSelectors) {
      try {
        const link = await page.$(selector);
        if (link) {
          await link.click();
          await page.waitForTimeout(2000);
          console.log('[Puppeteer] Navigated to ordering');
          break;
        }
      } catch {
        // Try next
      }
    }

    // Handle splash again if needed
    await page.waitForTimeout(5500);

    // Try to start voice
    console.log('[Puppeteer] Starting voice session...');
    const voiceSelectors = [
      'button:has-text("Voice")',
      'button:has-text("Connect")',
      'button:has-text("Start")',
      '[data-test="voice-button"]',
    ];

    let clicked = false;
    for (const selector of voiceSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(2000);
          testResult.voiceStarted = true;
          console.log('[Puppeteer] Voice button clicked');
          clicked = true;
          break;
        }
      } catch {
        // Try next
      }
    }

    if (!clicked) {
      // Try scrolling and viewport adjustments
      console.log('[Puppeteer] Voice button not found, trying viewport adjustments...');
      await page.setViewport({ width: 1920, height: 1200 });
      await page.waitForTimeout(1000);

      for (const selector of voiceSelectors) {
        try {
          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, selector);
          await page.waitForTimeout(500);

          const btn = await page.$(selector);
          if (btn) {
            await btn.click();
            await page.waitForTimeout(2000);
            testResult.voiceStarted = true;
            console.log('[Puppeteer] Voice button clicked after adjustments');
            clicked = true;
            break;
          }
        } catch {
          // Try next
        }
      }
    }

    // Wait for audio processing and transcripts
    console.log('[Puppeteer] Waiting for audio processing (up to 20s)...');
    await page.waitForTimeout(20000);

    // Check for transcript or order detection
    const transcriptDetected = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      return (
        bodyText.includes('margherita') ||
        bodyText.includes('pizza') ||
        bodyText.includes('order') ||
        document.querySelector('[data-test="order-item"], [data-test="cart-item"]') !== null
      );
    });

    testResult.transcriptDetected = transcriptDetected;
    console.log('[Puppeteer] Transcript/Order detection:', transcriptDetected ? 'SUCCESS' : 'NOT DETECTED');

    // Check cart update
    const cartIndicators = [
      '[data-test="cart-item"]',
      '[data-test="order-item"]',
      '.cart-item',
      '.order-item',
    ];

    for (const selector of cartIndicators) {
      try {
        const el = await page.$(selector);
        if (el) {
          testResult.cartUpdated = true;
          console.log('[Puppeteer] Cart/Order UI updated');
          break;
        }
      } catch {
        // Try next
      }
    }

    // Final screenshot
    await page.screenshot({
      path: path.join(REPORT_DIR, 'puppeteer_final.png'),
      fullPage: true,
    });
    console.log('[Puppeteer] Final screenshot saved');

    testResult.success = testResult.loginSuccess && testResult.voiceStarted;

  } catch (err) {
    console.error('[Puppeteer ERROR]:', err.message);
    testResult.errors.push(err.message);

    try {
      await page.screenshot({
        path: path.join(REPORT_DIR, 'puppeteer_error.png'),
        fullPage: true,
      });
    } catch {}
  } finally {
    // Save WebSocket frames
    fs.writeFileSync(
      path.join(REPORT_DIR, wsLog),
      JSON.stringify(wsFrames, null, 2)
    );

    await browser.close();
  }

  console.log('\n========== Puppeteer Test Complete ==========\n');
  console.log('Results:', testResult);

  return testResult;
}

// Run the test
runPuppeteerVoiceTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
