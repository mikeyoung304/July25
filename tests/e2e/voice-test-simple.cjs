const puppeteer = require('puppeteer');

const CONFIG = {
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:3001',
  headless: false,
  slowMo: 100,
  devtools: true
};

async function testVoiceConnection() {
  let browser;
  
  try {
    console.log('🚀 Starting Voice Connection Test');
    
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      devtools: CONFIG.devtools,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[WebRTCVoice]') || text.includes('[Auth]') || text.includes('error')) {
        console.log(`[CONSOLE] ${text}`);
      }
    });
    
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    
    // Check if we need to login
    console.log('🔐 Checking for login form...');
    
    // Look for email input
    const hasEmailInput = await page.$('input[type="email"], input[name="email"]');
    
    if (hasEmailInput) {
      console.log('📝 Filling login form...');
      
      // Use server credentials
      await page.type('input[type="email"], input[name="email"]', 'server@restaurant.com');
      await page.type('input[type="password"], input[name="password"]', 'server123');
      
      // Click login button
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('✅ Logged in');
    } else {
      console.log('ℹ️ Already logged in or no login required');
    }
    
    // Navigate to server page
    console.log('📍 Navigating to Server page...');
    await page.goto(`${CONFIG.baseUrl}/server`, { waitUntil: 'networkidle2' });
    
    // Wait a moment for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find and click voice button
    console.log('🎤 Looking for voice button...');
    
    const voiceButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        const text = button.textContent || '';
        if (text.includes('Connect Voice') || text.includes('Voice')) {
          console.log('[TEST] Found voice button:', text);
          return button;
        }
      }
      console.log('[TEST] No voice button found');
      return null;
    });
    
    const hasVoiceButton = await voiceButton.evaluate(el => el !== null);
    
    if (hasVoiceButton) {
      console.log('🖱️ Clicking voice button...');
      await voiceButton.click();
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check for errors
      const errorElement = await page.$('.error, .alert-error, [role="alert"]');
      if (errorElement) {
        const errorText = await errorElement.evaluate(el => el.textContent);
        console.log('❌ Error:', errorText);
      } else {
        console.log('✅ No errors visible');
      }
      
      // Check connection status
      const connectionStatus = await page.evaluate(() => {
        const statusElements = document.querySelectorAll('.voice-status, [class*="connected"]');
        return Array.from(statusElements).map(el => ({
          class: el.className,
          text: el.textContent
        }));
      });
      
      if (connectionStatus.length > 0) {
        console.log('📊 Connection status:', connectionStatus);
      }
    } else {
      console.log('❌ Voice button not found');
    }
    
    // Keep browser open for observation
    console.log('🔍 Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
console.log('=' + '='.repeat(50));
console.log('VOICE CONNECTION TEST');
console.log('=' + '='.repeat(50));

testVoiceConnection()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });