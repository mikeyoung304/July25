const puppeteer = require('puppeteer');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:3001',
  timeout: 30000,
  headless: false, // Show browser for debugging
  slowMo: 100, // Slow down actions to observe
  devtools: true,
  credentials: {
    email: 'test@example.com',
    password: 'test123',
    restaurantId: '11111111-1111-1111-1111-111111111111'
  }
};

// Logging helper
const log = (stage, message, data = {}) => {
  console.log(`[${new Date().toISOString()}] [${stage}] ${message}`, 
    Object.keys(data).length ? JSON.stringify(data, null, 2) : '');
};

// Take screenshot helper
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `./screenshots/${timestamp}-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  log('SCREENSHOT', `Saved: ${path}`);
  return path;
}

// Wait and check for elements
async function waitForElement(page, selector, options = {}) {
  try {
    await page.waitForSelector(selector, { 
      timeout: options.timeout || 5000,
      visible: options.visible !== false 
    });
    return true;
  } catch (error) {
    log('WAIT_FAILED', `Selector not found: ${selector}`, { error: error.message });
    return false;
  }
}

// Main test flow
async function runEndToEndTest() {
  let browser;
  const results = {
    steps: [],
    errors: [],
    screenshots: [],
    networkErrors: [],
    consoleErrors: []
  };

  try {
    log('INIT', 'Starting Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      slowMo: TEST_CONFIG.slowMo,
      devtools: TEST_CONFIG.devtools,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Capture console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        results.consoleErrors.push({ time: new Date().toISOString(), text });
        log('CONSOLE_ERROR', text);
      } else if (text.includes('AUTH') || text.includes('WebSocket') || text.includes('Voice')) {
        log('CONSOLE', `[${type}] ${text}`);
      }
    });

    // Capture network errors
    page.on('requestfailed', request => {
      const failure = {
        url: request.url(),
        method: request.method(),
        error: request.failure().errorText
      };
      results.networkErrors.push(failure);
      log('NETWORK_ERROR', 'Request failed', failure);
    });

    // Monitor WebSocket connections
    await page.evaluateOnNewDocument(() => {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = new Proxy(originalWebSocket, {
          construct(target, args) {
            const ws = new target(...args);
            console.log(`[WebSocket] Connecting to: ${args[0]}`);
            
            ws.addEventListener('open', () => {
              console.log(`[WebSocket] Connected: ${args[0]}`);
            });
            
            ws.addEventListener('message', (event) => {
              console.log(`[WebSocket] Message received:`, event.data);
            });
            
            ws.addEventListener('error', (error) => {
              console.error(`[WebSocket] Error:`, error);
            });
            
            ws.addEventListener('close', (event) => {
              console.log(`[WebSocket] Closed: code=${event.code}, reason=${event.reason}`);
            });
            
            return ws;
          }
        });
      });

    // STEP 1: Navigate to app
    log('STEP_1', 'Navigating to application...');
    await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    results.screenshots.push(await takeScreenshot(page, '01-initial-load'));
    results.steps.push({ step: 1, name: 'Navigate to app', status: 'success' });

    // Check current page state
    const currentUrl = page.url();
    log('STEP_1', `Current URL: ${currentUrl}`);

    // STEP 2: Check for login form or auth state
    log('STEP_2', 'Checking authentication state...');
    
    // First check if there's a Dev Auth Overlay visible
    const hasQuickAccess = await page.evaluate(() => {
      const headings = document.querySelectorAll('h2, h3, h4');
      for (const heading of headings) {
        if (heading.textContent?.includes('Quick Access')) {
          return true;
        }
      }
      return false;
    });
    
    log('STEP_2', 'Auth state check', { 
      hasQuickAccess,
      currentUrl: page.url()
    });

    if (hasQuickAccess) {
      // STEP 3: Use Dev Auth Overlay to login as Server
      log('STEP_3', 'Dev Auth Overlay detected, clicking Server button...');
      
      // Find and click the Server button
      const serverButtonClicked = await page.evaluate(() => {
        // Look for buttons containing "Server" text
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          // Check if button or its child elements contain "Server" text
          if (button.textContent?.includes('Server') || 
              button.querySelector('*')?.textContent?.includes('Server')) {
            // Also check if it mentions server@restaurant.com
            const parentElement = button.closest('div');
            if (parentElement && parentElement.textContent?.includes('server@restaurant.com')) {
              button.click();
              return true;
            }
          }
        }
        return false;
      });
      
      if (serverButtonClicked) {
        log('STEP_3', 'Clicked Server button in Dev Auth Overlay');
        await new Promise(resolve => setTimeout(resolve, 3000));
        results.screenshots.push(await takeScreenshot(page, '03-after-auth'));
        results.steps.push({ step: 3, name: 'Dev Auth Login', status: 'success' });
      } else {
        log('STEP_3', 'Could not find Server button in Dev Auth Overlay');
        results.steps.push({ step: 3, name: 'Dev Auth Login', status: 'failed' });
      }
    } else {
      // Check for regular login form
      const hasLoginForm = await waitForElement(page, 'input[type="email"], input[name="email"], #email', { timeout: 2000 });
      
      if (hasLoginForm) {
        log('STEP_3', 'Using regular login form...');
        await page.type('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email);
        await page.type('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password);
        
        // Submit form
        await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        results.steps.push({ step: 3, name: 'Login', status: 'success' });
      } else {
        log('STEP_3', 'No authentication required or already authenticated');
        results.steps.push({ step: 3, name: 'Login', status: 'skipped' });
      }
    }

    // STEP 4: Navigate to Server page
    log('STEP_4', 'Navigating to Server page...');
    
    // Try different ways to get to server page
    const serverLinkSelectors = [
      'a[href="/server"]',
      'a:has-text("Server")',
      '[data-testid="server-link"]',
      '.nav-link:has-text("Server")'
    ];
    
    let serverLinkClicked = false;
    for (const selector of serverLinkSelectors) {
      if (await waitForElement(page, selector, { timeout: 2000 })) {
        await page.click(selector);
        serverLinkClicked = true;
        log('STEP_4', `Clicked server link with selector: ${selector}`);
        break;
      }
    }
    
    if (!serverLinkClicked) {
      // Direct navigation
      log('STEP_4', 'Direct navigation to /server');
      await page.goto(`${TEST_CONFIG.baseUrl}/server`, { waitUntil: 'networkidle2' });
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    results.screenshots.push(await takeScreenshot(page, '04-server-page'));
    results.steps.push({ step: 4, name: 'Navigate to Server page', status: 'success' });

    // STEP 5: Check for Voice Order button
    log('STEP_5', 'Looking for Voice Order functionality...');
    
    // Try to find voice button using XPath and CSS selectors
    let voiceButton = null;
    
    // Try to find voice button by evaluating in browser context
    voiceButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        const text = button.textContent || '';
        if (text.includes('Connect Voice') || 
            text.includes('Start Voice') || 
            text.includes('Voice Order') || 
            text.includes('Voice')) {
          return button;
        }
      }
      return null;
    });
    
    // Check if we found a button
    const isButtonFound = await voiceButton.evaluate(el => el !== null);
    if (isButtonFound) {
      log('STEP_5', 'Found voice button by text content');
    } else {
      voiceButton = null;
    }
    
    // If not found, try CSS selectors
    if (!voiceButton) {
      const cssSelectors = [
        '[data-testid="voice-connect"]',
        '.voice-control button',
        'button[aria-label*="voice"]',
        '.voice-button',
        '#voice-order-button'
      ];
      
      for (const selector of cssSelectors) {
        voiceButton = await page.$(selector);
        if (voiceButton) {
          log('STEP_5', `Found voice button with CSS selector: ${selector}`);
          break;
        }
      }
    }
    
    if (voiceButton) {
      // Check auth token in browser
      const authState = await page.evaluate(() => {
        // Check various auth storage locations
        const localStorage = window.localStorage;
        const sessionStorage = window.sessionStorage;
        
        return {
          localStorage: {
            supabaseAuth: localStorage.getItem('supabase.auth.token'),
            accessToken: localStorage.getItem('access_token'),
            session: localStorage.getItem('session')
          },
          sessionStorage: {
            supabaseAuth: sessionStorage.getItem('supabase.auth.token'),
            accessToken: sessionStorage.getItem('access_token'),
            session: sessionStorage.getItem('session')
          },
          // Check if auth context bridge is available
          authBridge: typeof window.getAuthToken === 'function' ? 'available' : 'not available'
        };
      });
      
      log('STEP_5', 'Auth state before voice connection', authState);
      
      // Click voice button
      await voiceButton.click();
      log('STEP_5', 'Clicked voice button');
      
      // Wait for connection or error
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for success or error messages
      const hasError = await waitForElement(page, '.error, .alert-error, [role="alert"]', { timeout: 2000 });
      const hasConnected = await waitForElement(page, 
        '.voice-status:has-text("Connected"), .voice-connected, [data-status="connected"]', 
        { timeout: 2000 }
      );
      
      results.screenshots.push(await takeScreenshot(page, '05-after-voice-click'));
      
      if (hasError) {
        const errorText = await page.$eval('.error, .alert-error, [role="alert"]', el => el.textContent);
        log('STEP_5', `Voice connection error: ${errorText}`);
        results.errors.push({ step: 5, error: errorText });
        results.steps.push({ step: 5, name: 'Connect Voice', status: 'error', error: errorText });
      } else if (hasConnected) {
        log('STEP_5', 'Voice connected successfully!');
        results.steps.push({ step: 5, name: 'Connect Voice', status: 'success' });
        
        // STEP 6: Try to create a voice order
        log('STEP_6', 'Attempting voice order...');
        
        // This would normally involve WebRTC audio, but we'll simulate
        await new Promise(resolve => setTimeout(resolve, 2000));
        results.screenshots.push(await takeScreenshot(page, '06-voice-order'));
        results.steps.push({ step: 6, name: 'Voice Order', status: 'simulated' });
      } else {
        log('STEP_5', 'Voice connection status unknown');
        results.steps.push({ step: 5, name: 'Connect Voice', status: 'unknown' });
      }
    } else {
      log('STEP_5', 'Voice button not found');
      results.errors.push({ step: 5, error: 'Voice button not found on page' });
      results.steps.push({ step: 5, name: 'Find Voice Button', status: 'failed' });
    }

    // STEP 7: Check for payment flow
    log('STEP_7', 'Checking payment flow...');
    
    // Check for checkout/payment buttons
    let hasCheckout = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        const text = button.textContent || '';
        if (text.includes('Checkout') || 
            text.includes('Pay') || 
            text.includes('Payment')) {
          return true;
        }
      }
      return false;
    });
    
    if (hasCheckout) {
      log('STEP_7', 'Found checkout button by text content');
    }
    
    if (!hasCheckout) {
      hasCheckout = await waitForElement(page, '[data-testid="checkout"]', { timeout: 2000 });
    }
    
    if (hasCheckout) {
      log('STEP_7', 'Payment flow available');
      results.screenshots.push(await takeScreenshot(page, '07-payment-available'));
      results.steps.push({ step: 7, name: 'Payment Flow', status: 'available' });
    } else {
      log('STEP_7', 'Payment flow not available');
      results.steps.push({ step: 7, name: 'Payment Flow', status: 'not available' });
    }

    // Final screenshot
    results.screenshots.push(await takeScreenshot(page, '99-final-state'));

  } catch (error) {
    log('ERROR', 'Test failed with error', { error: error.message, stack: error.stack });
    results.errors.push({ 
      step: 'main', 
      error: error.message,
      stack: error.stack 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
    
    // Generate report
    log('REPORT', '='.repeat(80));
    log('REPORT', 'END-TO-END TEST RESULTS');
    log('REPORT', '='.repeat(80));
    
    console.log('\n📊 Test Steps:');
    results.steps.forEach(step => {
      const icon = step.status === 'success' ? '✅' : 
                   step.status === 'error' ? '❌' : 
                   step.status === 'failed' ? '❌' :
                   step.status === 'skipped' ? '⏭️' : '❓';
      console.log(`  ${icon} Step ${step.step}: ${step.name} - ${step.status.toUpperCase()}`);
      if (step.error) {
        console.log(`     Error: ${step.error}`);
      }
    });
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(err => {
        console.log(`  - Step ${err.step}: ${err.error}`);
      });
    }
    
    if (results.consoleErrors.length > 0) {
      console.log('\n🔴 Console Errors:');
      results.consoleErrors.forEach(err => {
        console.log(`  - ${err.time}: ${err.text}`);
      });
    }
    
    if (results.networkErrors.length > 0) {
      console.log('\n🌐 Network Errors:');
      results.networkErrors.forEach(err => {
        console.log(`  - ${err.method} ${err.url}: ${err.error}`);
      });
    }
    
    console.log('\n📸 Screenshots saved:');
    results.screenshots.forEach(path => {
      console.log(`  - ${path}`);
    });
    
    log('REPORT', '='.repeat(80));
    
    // Return results for further processing
    return results;
  }
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting End-to-End Voice Order → Payment Test');
  console.log('='.repeat(80));
  
  // Create screenshots directory
  const fs = require('fs');
  if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots', { recursive: true });
  }
  
  runEndToEndTest()
    .then(results => {
      const hasErrors = results.errors.length > 0 || 
                       results.steps.some(s => s.status === 'error' || s.status === 'failed');
      
      if (hasErrors) {
        console.log('\n❌ TEST FAILED - See errors above');
        process.exit(1);
      } else {
        console.log('\n✅ TEST COMPLETED - Check results above');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\n💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { runEndToEndTest };