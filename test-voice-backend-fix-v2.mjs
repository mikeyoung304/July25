#!/usr/bin/env node
/**
 * Test Voice Ordering Backend Fix (INC-008) - Version 2
 * Handles the full UI flow: Start Voice Order -> Click Microphone Button
 */

import { chromium } from '@playwright/test';

const KIOSK_URL = 'https://july25-client.vercel.app/kiosk';

async function testVoiceBackendFix() {
  console.log('🧪 Testing Voice Ordering Backend Fix (INC-008) v2\n');
  console.log('Target:', KIOSK_URL);
  console.log('Strategy: Full UI flow + network interception\n');

  const browser = await chromium.launch({
    headless: false,  // Show browser for debugging
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone']
  });

  const page = await context.newPage();

  // Capture ALL network activity
  let sessionResponse = null;
  page.on('response', async (response) => {
    const url = response.url();
    console.log('📡 Network:', response.status(), url.substring(url.lastIndexOf('/') + 1));

    if (url.includes('/api/v1/realtime/session')) {
      console.log('✅ INTERCEPTED: /api/v1/realtime/session');
      try {
        sessionResponse = await response.json();
        console.log('✅ Response parsed successfully\n');
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
      }
    }
  });

  // Capture console logs to see what's happening
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[WebRTC]') || text.includes('[Voice]') || text.includes('session')) {
      console.log('🔵 Console:', text);
    }
  });

  try {
    console.log('📍 Navigating to kiosk page...');
    await page.goto(KIOSK_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    // Step 1: Click "Start Voice Order"
    console.log('🔘 Step 1: Looking for "Start Voice Order" button...');
    await page.waitForSelector('button:has-text("Start Voice Order")', { timeout: 10000 });
    await page.click('button:has-text("Start Voice Order")');
    console.log('✅ Clicked "Start Voice Order"\n');

    await page.waitForTimeout(2000);

    // Step 2: Look for microphone/voice control button
    console.log('🔘 Step 2: Looking for voice control button...');

    // Try different selectors for the microphone button
    const selectors = [
      'button[aria-label*="microphone"]',
      'button[aria-label*="voice"]',
      'button:has(svg)',
      '.voice-control button',
      '[data-testid="voice-button"]'
    ];

    let clicked = false;
    for (const selector of selectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          console.log(`   Found button with selector: ${selector}`);
          await button.click();
          clicked = true;
          console.log('✅ Clicked voice control button\n');
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('⚠️  Could not find voice control button, trying generic approach...');
      // Click any button that appeared after "Start Voice Order"
      const buttons = await page.$$('button');
      console.log(`   Found ${buttons.length} buttons on page`);
      if (buttons.length > 0) {
        // Click the first button that's likely the voice button
        await buttons[buttons.length - 1].click();
        console.log('✅ Clicked last button (likely voice control)\n');
      }
    }

    // Wait longer for session creation
    console.log('⏳ Waiting for session creation (10s)...');
    await page.waitForTimeout(10000);

    if (!sessionResponse) {
      console.log('\n❌ FAILED: No session response captured after full flow');
      console.log('\n📸 Taking screenshot for debugging...');
      await page.screenshot({ path: '/tmp/voice-test-debug.png' });
      console.log('Screenshot saved to: /tmp/voice-test-debug.png');

      await browser.close();
      process.exit(1);
    }

    // Run verification
    console.log('\n🔍 VERIFICATION RESULTS:\n');
    console.log('='.repeat(60));

    const checks = {
      jamaicanGreeting: sessionResponse.instructions?.includes('Welcome to Grow Restaurant, mon!'),
      menuKnowledge: sessionResponse.instructions?.includes('CRITICAL SYSTEM KNOWLEDGE - THIS IS YOUR MENU'),
      englishDirective: sessionResponse.instructions?.includes('CRITICAL SYSTEM DIRECTIVE: YOU MUST SPEAK ONLY IN ENGLISH'),
      soulBowl: sessionResponse.instructions?.includes('Soul Bowl'),
      greekSalad: sessionResponse.instructions?.includes('Greek Salad'),
      toolCount: (sessionResponse.tools?.length || 0) === 3,
      substantialInstructions: (sessionResponse.instructions?.length || 0) > 5000
    };

    console.log(`${checks.jamaicanGreeting ? '✅' : '❌'} Jamaican greeting: ${checks.jamaicanGreeting}`);
    console.log(`${checks.menuKnowledge ? '✅' : '❌'} Menu knowledge framing: ${checks.menuKnowledge}`);
    console.log(`${checks.englishDirective ? '✅' : '❌'} English-only directive: ${checks.englishDirective}`);
    console.log(`${checks.soulBowl && checks.greekSalad ? '✅' : '❌'} Menu items (Soul Bowl, Greek Salad): ${checks.soulBowl && checks.greekSalad}`);
    console.log(`${checks.toolCount ? '✅' : '❌'} Tools count: ${sessionResponse.tools?.length || 0} (expected: 3)`);
    console.log(`${checks.substantialInstructions ? '✅' : '❌'} Instructions length: ${sessionResponse.instructions?.length || 0} chars (>5000)`);
    console.log('='.repeat(60));

    const allPassed = Object.values(checks).every(v => v);

    if (allPassed) {
      console.log('\n🎉 SUCCESS: Backend fix verified!');
    } else {
      console.log('\n⚠️  Some tests failed - see results above');
    }

    await page.waitForTimeout(3000);  // Keep browser open briefly
    await browser.close();
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    await page.screenshot({ path: '/tmp/voice-test-error.png' });
    await browser.close();
    process.exit(1);
  }
}

testVoiceBackendFix();
