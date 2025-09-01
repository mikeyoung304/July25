#!/usr/bin/env node
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to homepage...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Check for loading state
  const loadingElement = await page.$('.loading-message');
  if (loadingElement) {
    const loadingText = await page.evaluate(el => el.textContent, loadingElement);
    console.log('Loading element found:', loadingText);
  }
  
  // Check for main app content
  const hasApp = await page.evaluate(() => {
    const app = document.querySelector('#root');
    const hasContent = app && app.children.length > 0;
    const bodyText = document.body.innerText;
    return {
      hasApp: !!app,
      hasContent,
      bodyPreview: bodyText.substring(0, 200),
      hasLoadingText: bodyText.includes('loading') || bodyText.includes('Loading')
    };
  });
  
  console.log('App state:', JSON.stringify(hasApp, null, 2));
  
  await page.screenshot({ path: '/tmp/homepage-check.png' });
  console.log('Screenshot saved to /tmp/homepage-check.png');
  
  await browser.close();
})();