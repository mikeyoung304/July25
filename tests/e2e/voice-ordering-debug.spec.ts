import { test, expect } from '@playwright/test';

/**
 * Debug test for voice ordering connection issues
 * This test captures console logs to understand why WebRTC connection is failing
 */
test.describe('Voice Ordering Connection Debug', () => {
  test('should capture console logs when opening voice modal', async ({ page }) => {
    // Capture ALL console messages
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);

      // Highlight voice/WebRTC related logs
      if (
        text.includes('Voice') ||
        text.includes('WebRTC') ||
        text.includes('Connection') ||
        text.includes('ephemeral') ||
        text.includes('token') ||
        text.includes('session')
      ) {
        console.log(`🔍 [${msg.type().toUpperCase()}] ${text}`);
      }
    });

    page.on('pageerror', (error) => {
      const errorText = error.toString();
      errors.push(errorText);
      console.error('❌ PAGE ERROR:', errorText);
    });

    // Navigate to production server view
    console.log('🌐 Navigating to production server view...');
    await page.goto('https://july25-client.vercel.app/server');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    // Wait for splash screen to disappear (it animates for ~2 seconds)
    console.log('⏳ Waiting for splash screen to complete...');
    await page.waitForTimeout(4000);

    // Check if we're on login page
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/pin-login');
    if (isLoginPage) {
      console.log('📝 Detected login page - need authentication');
      // Try PIN login if available (demo mode)
      const pinButton = page.locator('button:has-text("Server"), button:has-text("Staff")').first();
      if (await pinButton.count() > 0) {
        console.log('🔐 Attempting demo login...');
        await pinButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Wait for workspace dashboard to load
    await page.waitForTimeout(2000);
    console.log('✅ Workspace Dashboard should be loaded now');

    // Click the "Server" button to go to ServerView
    console.log('🔍 Looking for Server button...');
    const serverButton = page.locator('button:has-text("Server")').first();
    if (await serverButton.count() > 0) {
      console.log('🎯 Found Server button, clicking...');
      await serverButton.click();
      await page.waitForTimeout(2000);

      // Check if authentication modal appears
      const signInButton = page.locator('button:has-text("Sign In")').first();
      const pinLoginButton = page.locator('button:has-text("PIN Login")').first();

      if (await signInButton.count() > 0) {
        console.log('🔐 Authentication modal appeared, clicking Sign In (demo mode)...');
        await signInButton.click();
        await page.waitForTimeout(3000);
      } else if (await pinLoginButton.count() > 0) {
        console.log('🔐 Using PIN Login...');
        await pinLoginButton.click();
        await page.waitForTimeout(2000);
      }

      console.log('✅ Should now be on ServerView with floor plan');
    }

    // Wait for floor plan to finish loading
    console.log('⏳ Waiting for floor plan to load...');
    await page.waitForTimeout(5000);  // Wait for floor plan to load

    // Look for the canvas element (floor plan uses canvas, not SVG)
    console.log('🔍 Looking for floor plan canvas...');

    const canvas = page.locator('canvas').first();
    const canvasExists = await canvas.count() > 0;
    console.log(`📊 Found canvas: ${canvasExists}`);

    if (canvasExists) {
      // Click on the canvas at a location where a table is likely to be
      // Based on the screenshot, click in the middle-lower area where the green circles are
      console.log('🎯 Clicking on canvas where round tables are located...');

      // Get canvas bounding box
      const box = await canvas.boundingBox();
      if (box) {
        // Click where the round tables are (lower-center of canvas, not too far down)
        const clickX = box.x + box.width * 0.35;  // 35% from left
        const clickY = box.y + box.height * 0.65; // 65% from top

        console.log(`🎯 Clicking canvas at (${Math.round(clickX)}, ${Math.round(clickY)}) - canvas box: ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`);
        await page.mouse.click(clickX, clickY);
      } else {
        // Fallback: click center of canvas
        console.log('🎯 Clicking center of canvas');
        await canvas.click();
      }

      await page.waitForTimeout(2000);
      console.log('⏳ Waiting for seat selection modal to appear...');

      // Look for seat selection modal - wait for it to appear
      await page.waitForTimeout(1500);

      // Look for seat buttons - they're numbered buttons (1, 2, 3, etc.)
      const seatButtons = page.locator('button').filter({ hasText: /^[1-9]$/ });
      const seatCount = await seatButtons.count();
      console.log(`💺 Found ${seatCount} seat selection buttons`);

      if (seatCount > 0) {
        console.log('🎯 Clicking first seat...');
        await seatButtons.first().click();
        await page.waitForTimeout(1000);

        // Look for voice/touch input mode selector
        const voiceButton = page.locator('button:has-text("Voice")').first();
        const voiceButtonExists = await voiceButton.count() > 0;

        if (voiceButtonExists) {
          console.log('🎯 Found Voice button, clicking...');
          await voiceButton.click();

          // Wait for voice modal to open
          await page.waitForTimeout(3000);
          console.log('⏱️  Voice modal should be open now...');

          // Check if debug panel is visible
          const debugPanel = page.locator('text=Voice Debug Panel');
          if (await debugPanel.count() > 0) {
            console.log('📊 Voice Debug Panel found');

            // Try to capture the connection state
            const connectionStateElement = page.locator('text=WebSocket:').locator('..').locator('span').nth(1);
            if (await connectionStateElement.count() > 0) {
              const state = await connectionStateElement.textContent();
              console.log(`🔌 Connection State: ${state}`);
            }
          }

          // Wait to see if connection issues occur (reduced from 25s for faster testing)
          console.log('⏱️  Waiting 10 seconds to observe voice modal behavior...');
          await page.waitForTimeout(10000);
        } else {
          console.log('⚠️  Voice button not found after seat selection');
        }
      } else {
        console.log('⚠️  No seats found in seat selection modal');
      }
    } else {
      console.log('⚠️  No tables found on the floor plan');

      // Try to find what buttons ARE available
      const allButtons = await page.locator('button').allTextContents();
      console.log('Available buttons:', allButtons);
    }

    // Print summary
    console.log('\n📋 CONSOLE LOG SUMMARY:');
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    // Filter for critical voice-related messages
    const voiceMessages = consoleMessages.filter(msg =>
      msg.includes('Voice') ||
      msg.includes('WebRTC') ||
      msg.includes('Connection') ||
      msg.includes('ephemeral') ||
      msg.includes('token') ||
      msg.includes('error')
    );

    console.log('\n🎤 VOICE-RELATED MESSAGES:');
    voiceMessages.forEach(msg => console.log(`  ${msg}`));

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/voice-ordering-debug.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results/voice-ordering-debug.png');
  });
});
