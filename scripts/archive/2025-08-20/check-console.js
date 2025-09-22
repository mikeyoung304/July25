const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });
  
  // Navigate to KDS
  await page.goto('http://localhost:5173/kitchen', { waitUntil: 'networkidle2' });
  
  // Wait a bit for any async operations
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if error boundary is visible
  const errorBoundary = await page.$eval('body', (body) => {
    return body.innerText.includes("This section couldn't be loaded");
  }).catch(() => false);
  
  if (errorBoundary) {
  } else {
    
    // Check for orders
    const pageContent = await page.content();
    if (pageContent.includes('No orders yet')) {
    } else if (pageContent.includes('Order #')) {
    }
  }
  
  await browser.close();
})();