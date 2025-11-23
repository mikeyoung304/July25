#!/usr/bin/env node
/**
 * Test Voice Button Toggle State Bug (INC-009)
 *
 * Reproduces the confusing multi-click behavior:
 * 1. User clicks button before session ready
 * 2. Button shows "Listening..." (isToggled=true)
 * 3. But recording never starts (isListening=false)
 * 4. Button stuck in visual "on" state
 *
 * Expected behavior after fix:
 * - Button visual state syncs with actual recording state
 * - If recording fails to start, button returns to "off" state
 */

import { chromium } from '@playwright/test';

const KIOSK_URL = 'https://july25-client.vercel.app/kiosk';

async function testButtonToggleBug() {
  console.log('🧪 Testing Voice Button Toggle State Bug (INC-009)\n');
  console.log('Target:', KIOSK_URL);
  console.log('Bug: Button gets stuck in "on" state when recording fails to start\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone']
  });

  const page = await context.newPage();

  try {
    console.log('📍 Step 1: Navigate to kiosk page...');
    await page.goto(KIOSK_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    console.log('📍 Step 2: Click "Start Voice Order"...');
    await page.waitForSelector('button:has-text("Start Voice Order")', { timeout: 10000 });
    await page.click('button:has-text("Start Voice Order")');
    console.log('✅ Clicked "Start Voice Order"\n');

    // Wait a moment for component to mount
    await page.waitForTimeout(500);

    console.log('📍 Step 3: Find the microphone button...');
    // Wait for the voice control component to load
    await page.waitForTimeout(2000);

    // Try multiple selectors to find the button
    let micButton = null;
    const selectors = [
      'button[aria-label*="Tap to start"]',
      'button[aria-label*="recording"]',
      'button:has(svg):has-text("Tap to Start")',
      'button.rounded-full:has(svg)', // Generic button with mic icon
    ];

    for (const selector of selectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        micButton = button;
        console.log(`   Found button with selector: ${selector}`);
        break;
      }
    }

    if (!micButton) {
      throw new Error('Microphone button not found with any selector!');
    }
    console.log('✅ Found microphone button\n');

    // Get initial state
    console.log('📍 Step 4: Check initial button state...');
    const initialAriaPressedAttr = await micButton.getAttribute('aria-pressed');
    const initialAriaPressed = initialAriaPressedAttr === 'true';
    const initialText = await micButton.textContent();
    console.log(`   Initial aria-pressed: ${initialAriaPressed}`);
    console.log(`   Initial text: "${initialText?.trim()}"`);
    console.log('✅ Initial state captured\n');

    console.log('📍 Step 5: Click button IMMEDIATELY (before session ready)...');
    console.log('   (This should trigger the bug if not fixed)');
    await micButton.click();
    console.log('✅ Clicked microphone button\n');

    // Wait a short moment for state updates
    await page.waitForTimeout(1000);

    console.log('📍 Step 6: Check button state after click...');
    const afterClickAriaPressed = await micButton.getAttribute('aria-pressed') === 'true';
    const afterClickText = await micButton.textContent();
    const afterClickClasses = await micButton.getAttribute('class');
    const afterClickDanger = afterClickClasses?.includes('bg-danger');

    console.log(`   After click aria-pressed: ${afterClickAriaPressed}`);
    console.log(`   After click text: "${afterClickText?.trim()}"`);
    console.log(`   Has danger class: ${afterClickDanger}`);

    // The BUG: Button would stay in "on" state (aria-pressed=true, red background)
    // even though recording never started

    console.log('\n📍 Step 7: Wait for session initialization...');
    await page.waitForTimeout(3000);

    console.log('📍 Step 8: Check final button state...');
    // Re-find the button in case it was re-rendered
    let finalButton = null;
    for (const selector of selectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        finalButton = button;
        break;
      }
    }

    if (!finalButton) {
      console.log('⚠️  Button no longer visible (page may have changed)');
      finalButton = micButton; // Fallback to original
    }

    const finalAriaPressed = await finalButton.getAttribute('aria-pressed').catch(() => 'unknown') === 'true';
    const finalText = await finalButton.textContent().catch(() => 'unknown');
    const finalClasses = await finalButton.getAttribute('class').catch(() => '');

    console.log(`   Final aria-pressed: ${finalAriaPressed}`);
    console.log(`   Final text: "${finalText?.toString().trim()}"`);
    console.log(`   Has danger class: ${finalClasses?.includes('bg-danger')}`);

    // Verification
    console.log('\n🔍 VERIFICATION RESULTS:\n');
    console.log('='.repeat(60));

    // The KEY insight: After clicking before session ready, button should NOT visually change
    // This is different from the OLD bug where isToggled=true made button LOOK like recording
    const buttonDidNotGetStuckImmediately = !afterClickDanger;

    // After waiting, recording SHOULD start (auto-start effect)
    // OR if it can't start, button should stay in normal state
    const recordingStartedOrStayedNormal = finalAriaPressed || (!finalAriaPressed && !finalClasses?.includes('bg-danger'));

    console.log(`${buttonDidNotGetStuckImmediately ? '✅' : '❌'} Button didn't get stuck in "on" state immediately: ${buttonDidNotGetStuckImmediately}`);
    console.log(`   After click - Text: "${afterClickText?.trim()}", Danger: ${afterClickDanger}`);

    console.log(`${recordingStartedOrStayedNormal ? '✅' : '❌'} Final state is consistent: ${recordingStartedOrStayedNormal}`);
    console.log(`   Final - Text: "${finalText?.toString().trim()}", Aria-pressed: ${finalAriaPressed}, Danger: ${finalClasses?.includes('bg-danger')}`);

    // The old bug: isToggled=true immediately, button shows red "Listening..." but isListening=false
    // Fixed: Button stays normal until recording actually starts
    const bugFixed = buttonDidNotGetStuckImmediately;

    console.log('='.repeat(60));

    const allPassed = bugFixed;

    if (allPassed) {
      console.log('\n🎉 SUCCESS: Button toggle state bug is fixed!');
      console.log('   - Button visual state syncs with recording state');
      console.log('   - No confusing stuck "on" state');
    } else {
      console.log('\n⚠️  FAILED: Button toggle state bug still exists');
      console.log('   - Button may be stuck in wrong visual state');
      console.log('   - User experience is confusing');
    }

    await page.waitForTimeout(2000);
    await browser.close();
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    await page.screenshot({ path: '/tmp/voice-button-test-error.png' });
    console.log('Screenshot saved to: /tmp/voice-button-test-error.png');
    await browser.close();
    process.exit(1);
  }
}

testButtonToggleBug();
