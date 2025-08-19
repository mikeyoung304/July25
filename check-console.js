const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });
  
  // Navigate to KDS
  console.log('Navigating to Kitchen Display...');
  await page.goto('http://localhost:5173/kitchen', { waitUntil: 'networkidle2' });
  
  // Wait a bit for any async operations
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if error boundary is visible
  const errorBoundary = await page.$eval('body', (body) => {
    return body.innerText.includes("This section couldn't be loaded");
  }).catch(() => false);
  
  if (errorBoundary) {
    console.log('\n⚠️  ERROR BOUNDARY IS ACTIVE - KDS failed to load');
  } else {
    console.log('\n✅ KDS loaded successfully');
    
    // Check for orders
    const pageContent = await page.content();
    if (pageContent.includes('No orders yet')) {
      console.log('📋 No orders displayed (but page loaded)');
    } else if (pageContent.includes('Order #')) {
      console.log('📋 Orders are visible!');
    }
  }
  
  await browser.close();
})();