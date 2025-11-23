import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  const logs = [];
  const networkRequests = [];

  // Capture ALL console messages
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    logs.push({ type, text, timestamp: new Date().toISOString() });
    console.log(`[CONSOLE ${type.toUpperCase()}]`, text);
  });

  // Capture network requests
  page.on('request', req => {
    if (req.url().includes('realtime') || req.url().includes('menu')) {
      networkRequests.push({
        method: req.method(),
        url: req.url(),
        headers: req.headers()
      });
      console.log('[REQUEST]', req.method(), req.url());
    }
  });

  // Capture network responses
  page.on('response', async resp => {
    if (resp.url().includes('realtime/session')) {
      console.log('[RESPONSE] /realtime/session', resp.status());
      try {
        const body = await resp.json();
        console.log('[RESPONSE BODY]', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('[RESPONSE] Could not parse JSON');
      }
    }
  });

  console.log('\n=== NAVIGATING TO PRODUCTION KIOSK ===\n');
  await page.goto('https://july25-client.vercel.app/kiosk', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  console.log('\n=== PAGE LOADED - Waiting 10 seconds ===\n');
  await page.waitForTimeout(10000);

  console.log('\n=== CONSOLE LOGS CAPTURED ===\n');
  logs.forEach((log, i) => {
    console.log(`${i + 1}. [${log.type}] ${log.text}`);
  });

  console.log('\n=== SEARCHING FOR MENU-RELATED LOGS ===\n');
  const menuLogs = logs.filter(l =>
    l.text.toLowerCase().includes('menu') ||
    l.text.includes('session.update') ||
    l.text.includes('WebRTCVoiceClient') ||
    l.text.includes('CRITICAL') ||
    l.text.includes('VoiceSessionConfig') ||
    l.text.toLowerCase().includes('instructions')
  );

  if (menuLogs.length > 0) {
    menuLogs.forEach((log, i) => {
      console.log(`\n${i + 1}. [${log.type}] ${log.text}`);
    });
  } else {
    console.log('❌ NO MENU-RELATED LOGS FOUND');
  }

  console.log('\n=== NETWORK REQUESTS ===\n');
  networkRequests.forEach((req, i) => {
    console.log(`${i + 1}. ${req.method} ${req.url}`);
  });

  console.log('\n📸 Taking screenshot...');
  await page.screenshot({ path: '/tmp/production-kiosk.png', fullPage: true });

  console.log('\n✅ Diagnostics complete. Check /tmp/production-kiosk.png');
  console.log('Browser will stay open for 2 minutes for manual testing...\n');

  await page.waitForTimeout(120000);

  await browser.close();

  // Write logs to file
  const fs = await import('fs');
  fs.writeFileSync('/tmp/production-logs.json', JSON.stringify({ logs, networkRequests }, null, 2));
  console.log('\n💾 Logs saved to /tmp/production-logs.json');
})();
