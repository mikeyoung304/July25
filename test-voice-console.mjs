import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    // Grant microphone permission automatically
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  const context = await browser.newContext({
    permissions: ['microphone']
  });
  const page = await context.newPage();

  const logs = [];

  // Capture console BEFORE navigation
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    logs.push({ type, text });
    // Print ALL console messages in real-time
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  // Also capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    logs.push({ type: 'pageerror', text: error.message });
  });

  console.log('🌐 Navigating to kiosk...\n');
  await page.goto('https://july25-client.vercel.app/kiosk', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('\n⏳ Waiting 8s for splash...\n');
  await page.waitForTimeout(8000);

  // Check what buttons exist
  const allButtons = await page.locator('button').all();
  console.log(`Found ${allButtons.length} buttons`);
  for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
    const text = await allButtons[i].textContent();
    console.log(`  Button ${i}: "${text.trim()}"`);
  }

  // Step 1: Click "Start Voice Order" to navigate to voice page
  const startButton = page.locator('button').filter({ hasText: /Start Voice Order/i }).first();
  const startVisible = await startButton.isVisible().catch(() => false);

  if (startVisible) {
    console.log('✅ Found "Start Voice Order" button, clicking...\n');
    await startButton.click();
    console.log('⏳ Waiting 3s for voice page to load...\n');
    await page.waitForTimeout(3000);
  } else {
    console.log('❌ Start Voice Order button not found!\n');
  }

  // Step 2: Click the big microphone button to trigger connection
  console.log('🎤 Looking for voice recording button (microphone)...\n');
  const micButton = page.locator('[data-testid="voice-button"]').first();
  const micVisible = await micButton.isVisible().catch(() => false);

  if (micVisible) {
    console.log('✅ Found microphone button, clicking to initiate connection...\n');
    await micButton.click();
    console.log('⏳ Waiting 20s for voice connection and session.updated confirmation...\n');
    await page.waitForTimeout(20000);
  } else {
    console.log('❌ Microphone button not found! Trying fallback selector...\n');
    // Fallback: try finding by button with SVG/circle
    const fallbackButton = page.locator('button:has(circle), button:has(svg)').first();
    if (await fallbackButton.isVisible().catch(() => false)) {
      console.log('✅ Found voice button (fallback), clicking...\n');
      await fallbackButton.click();
      console.log('⏳ Waiting 20s for session.updated confirmation...\n');
      await page.waitForTimeout(20000);
    } else {
      console.log('❌ Could not find voice recording button!\n');
    }
  }

  await browser.close();

  // Analyze logs
  console.log('\n\n========== ALL CONSOLE LOGS ==========');
  console.log(`Total logs captured: ${logs.length}\n`);

  console.log('\n========== SUPABASE WARNINGS ==========');
  logs.filter(l => l.text.toLowerCase().includes('supabase')).forEach(l => console.log(`[${l.type}] ${l.text}`));

  console.log('\n\n========== WEBRTC/SESSION LOGS (console.log) ==========');
  const webrtcLogs = logs.filter(l =>
    l.text.includes('WebRTCVoiceClient') ||
    l.text.includes('session.update') ||
    l.text.includes('session created') ||
    l.text.includes('hasMenuContext') ||
    l.text.includes('Sending session.update')
  );
  webrtcLogs.forEach(l => console.log(`[${l.type}] ${l.text.substring(0, 1500)}`));

  console.log('\n\n========== LOGGER WARNS/ERRORS (production visible) ==========');
  logs.filter(l => l.type === 'warning' || l.type === 'error').forEach(l =>
    console.log(`[${l.type}] ${l.text.substring(0, 800)}`)
  );

  console.log('\n\n========== MENU-RELATED LOGS ==========');
  logs.filter(l => l.text.toLowerCase().includes('menu')).forEach(l =>
    console.log(`[${l.type}] ${l.text.substring(0, 800)}`)
  );
})();
