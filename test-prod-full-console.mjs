import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();

  const allLogs = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    allLogs.push({ type, text });
    console.log('[' + type.toUpperCase() + '] ' + text);
  });

  page.on('pageerror', error => {
    console.log('[PAGE ERROR] ' + error.message);
  });

  console.log('Navigating to production...\n');
  await page.goto('https://july25-client.vercel.app/kiosk', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(8000);
  await page.click('button:has-text("Start Voice Order")');
  await page.waitForTimeout(3000);

  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.querySelector('circle, path')
    );
    if (btn) { btn.click(); return true; }
    return false;
  });

  if (clicked) {
    console.log('Waiting 20s for voice connection...\n');
    await page.waitForTimeout(20000);
  }

  await browser.close();

  console.log('\n========== SUMMARY ==========');
  console.log('Total logs: ' + allLogs.length);

  const keywords = ['Session configured', 'hasMenuContext', 'Cannot start'];
  keywords.forEach(k => {
    const count = allLogs.filter(l => l.text.includes(k)).length;
    console.log(k + ': ' + count + ' matches');
  });
})();
