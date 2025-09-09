import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureLoginScreenshot() {
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport to desktop size
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 2
    });
    
    console.log('📱 Navigating to login page...');
    await page.goto('http://localhost:5173/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for the login form to be visible - LoginV2 uses this ID
    await page.waitForSelector('form#login-form', { 
      timeout: 10000,
      visible: true 
    });
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, '..', 'docs', 'screenshots', 'login-v2.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });
    
    console.log(`✅ Screenshot saved to: ${screenshotPath}`);
    
    // Also capture mobile view
    await page.setViewport({
      width: 375,
      height: 812,
      deviceScaleFactor: 2
    });
    
    const mobileScreenshotPath = path.join(__dirname, '..', 'docs', 'screenshots', 'login-v2-mobile.png');
    await page.screenshot({
      path: mobileScreenshotPath,
      fullPage: false
    });
    
    console.log(`📱 Mobile screenshot saved to: ${mobileScreenshotPath}`);
    
  } catch (error) {
    console.error('❌ Error capturing screenshot:', error);
  } finally {
    await browser.close();
    console.log('👋 Browser closed');
  }
}

captureLoginScreenshot();