#!/usr/bin/env node
/**
 * Test Voice Ordering Backend Fix (INC-008)
 * Verifies that backend sends custom instructions in ephemeral token
 *
 * What we're testing:
 * 1. Backend includes instructions when creating ephemeral token
 * 2. Instructions contain Jamaican greeting (deployment marker)
 * 3. Instructions contain menu context
 * 4. Tools array has 3 items (add_to_order, confirm_order, remove_from_order)
 *
 * NO AUDIO NEEDED - We intercept the network request to /api/v1/realtime/session
 */

import { chromium } from '@playwright/test';

const KIOSK_URL = 'https://july25-client.vercel.app/kiosk';

async function testVoiceBackendFix() {
  console.log('🧪 Testing Voice Ordering Backend Fix (INC-008)\n');
  console.log('Target:', KIOSK_URL);
  console.log('Strategy: Intercept /api/v1/realtime/session network request\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',  // Fake microphone
      '--use-fake-ui-for-media-stream'       // Auto-grant permissions
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone']
  });

  const page = await context.newPage();

  // Intercept the session creation request
  let sessionResponse = null;
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/realtime/session')) {
      console.log('✅ Intercepted session creation request');
      try {
        sessionResponse = await response.json();
        console.log('✅ Response parsed successfully\n');
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
      }
    }
  });

  try {
    // Navigate to kiosk
    console.log('📍 Navigating to kiosk page...');
    await page.goto(KIOSK_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    // Wait for and click "Start Voice Order" button
    console.log('🔘 Looking for "Start Voice Order" button...');
    await page.waitForSelector('button:has-text("Start Voice Order")', { timeout: 10000 });
    await page.click('button:has-text("Start Voice Order")');
    console.log('✅ Clicked "Start Voice Order"\n');

    // Wait for session creation
    console.log('⏳ Waiting for session creation (5s)...');
    await page.waitForTimeout(5000);

    if (!sessionResponse) {
      console.log('\n❌ FAILED: No session response captured');
      console.log('This could mean:');
      console.log('- Voice ordering button did not trigger session creation');
      console.log('- Network request was blocked');
      console.log('- Timing issue (try increasing wait time)');
      await browser.close();
      process.exit(1);
    }

    // Verify the response contains our custom instructions
    console.log('\n🔍 VERIFICATION RESULTS:\n');
    console.log('=' .repeat(60));

    // Test 1: Check for Jamaican greeting
    const hasJamaicanGreeting = sessionResponse.instructions?.includes('Welcome to Grow Restaurant, mon!');
    console.log(`${hasJamaicanGreeting ? '✅' : '❌'} Jamaican greeting found: ${hasJamaicanGreeting}`);

    // Test 2: Check for menu knowledge framing
    const hasMenuKnowledge = sessionResponse.instructions?.includes('CRITICAL SYSTEM KNOWLEDGE - THIS IS YOUR MENU');
    console.log(`${hasMenuKnowledge ? '✅' : '❌'} Menu knowledge framing found: ${hasMenuKnowledge}`);

    // Test 3: Check for English enforcement
    const hasEnglishDirective = sessionResponse.instructions?.includes('CRITICAL SYSTEM DIRECTIVE: YOU MUST SPEAK ONLY IN ENGLISH');
    console.log(`${hasEnglishDirective ? '✅' : '❌'} English-only directive found: ${hasEnglishDirective}`);

    // Test 4: Check for menu items
    const hasSoulBowl = sessionResponse.instructions?.includes('Soul Bowl');
    const hasGreekSalad = sessionResponse.instructions?.includes('Greek Salad');
    console.log(`${hasSoulBowl && hasGreekSalad ? '✅' : '❌'} Menu items found (Soul Bowl, Greek Salad): ${hasSoulBowl && hasGreekSalad}`);

    // Test 5: Check for tools
    const toolCount = sessionResponse.tools?.length || 0;
    const hasCorrectTools = toolCount === 3;
    console.log(`${hasCorrectTools ? '✅' : '❌'} Tools count: ${toolCount} (expected: 3)`);

    if (hasCorrectTools && sessionResponse.tools) {
      const toolNames = sessionResponse.tools.map(t => t.name).join(', ');
      console.log(`   Tool names: ${toolNames}`);
    }

    // Test 6: Check instructions length (should be substantial with menu context)
    const instructionsLength = sessionResponse.instructions?.length || 0;
    const hasSubstantialInstructions = instructionsLength > 5000;
    console.log(`${hasSubstantialInstructions ? '✅' : '❌'} Instructions length: ${instructionsLength} chars (expected: >5000)`);

    console.log('=' .repeat(60));

    // Overall result
    const allTestsPassed =
      hasJamaicanGreeting &&
      hasMenuKnowledge &&
      hasEnglishDirective &&
      hasSoulBowl &&
      hasGreekSalad &&
      hasCorrectTools &&
      hasSubstantialInstructions;

    if (allTestsPassed) {
      console.log('\n🎉 SUCCESS: Backend fix verified!');
      console.log('   - Custom instructions are being sent in ephemeral token');
      console.log('   - Jamaican greeting present (deployment verified)');
      console.log('   - Menu context embedded in instructions');
      console.log('   - All function tools included');
      console.log('\nNext step: User should test actual voice interaction');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some tests failed');
      console.log('Review the results above to see which checks did not pass.');

      // Show first 500 chars of instructions for debugging
      if (sessionResponse.instructions) {
        console.log('\nInstructions preview (first 500 chars):');
        console.log('-'.repeat(60));
        console.log(sessionResponse.instructions.substring(0, 500) + '...');
        console.log('-'.repeat(60));
      }
    }

    await browser.close();
    process.exit(allTestsPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    await browser.close();
    process.exit(1);
  }
}

testVoiceBackendFix();
