import { chromium } from 'playwright';

async function testAutoLogin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔍 Navigating to https://july25-client.vercel.app...');
  await page.goto('https://july25-client.vercel.app');
  
  await page.waitForSelector('[data-testid="workspace-dashboard"]', { timeout: 15000 });
  
  const demoBadge = await page.$('text=Demo');
  console.log('Demo badge visible:', !!demoBadge);
  
  await page.screenshot({ path: '/tmp/01-landing.png' });
  
  // Click Kitchen tile
  console.log('🖱️ Clicking Kitchen tile...');
  await page.click('[data-testid="workspace-tile-kitchen"]');
  
  // Wait for auto-login
  console.log('⏳ Waiting for auto-login...');
  await page.waitForTimeout(8000);
  
  await page.screenshot({ path: '/tmp/02-after-click.png' });
  
  const url = page.url();
  console.log('📍 Current URL:', url);
  
  if (url.includes('/kitchen')) {
    console.log('✅ SUCCESS: Auto-login worked!');
  } else {
    console.log('❌ Not on kitchen page');
  }
  
  await browser.close();
}

testAutoLogin().catch(console.error);
