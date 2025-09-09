#!/usr/bin/env node

/**
 * Comprehensive End-to-End Test Script for Restaurant Order System
 * Tests all order flows: Voice → Online → Kitchen → Expo
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 60000; // 1 minute per test section

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  serverStatus: {},
  voiceKiosk: {},
  onlineOrdering: {},
  kitchenDisplay: {},
  expoDisplay: {},
  websocketMonitoring: {},
  databaseVerification: {},
  errors: [],
  warnings: []
};

// Helper function to log with timestamp
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// Helper function to capture page errors
async function setupErrorCapture(page, pageName) {
  const pageErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const error = `[${pageName} Console Error] ${msg.text()}`;
      pageErrors.push(error);
      testResults.errors.push(error);
      log(error, 'ERROR');
    } else if (msg.type() === 'warn') {
      const warning = `[${pageName} Console Warning] ${msg.text()}`;
      pageErrors.push(warning);
      testResults.warnings.push(warning);
      log(warning, 'WARN');
    }
  });
  
  page.on('pageerror', error => {
    const errorMsg = `[${pageName} Page Error] ${error.message}`;
    pageErrors.push(errorMsg);
    testResults.errors.push(errorMsg);
    log(errorMsg, 'ERROR');
  });

  page.on('requestfailed', request => {
    const errorMsg = `[${pageName} Request Failed] ${request.url()} - ${request.failure().errorText}`;
    pageErrors.push(errorMsg);
    testResults.errors.push(errorMsg);
    log(errorMsg, 'ERROR');
  });
  
  return pageErrors;
}

// Helper function to wait for element with timeout
async function waitForElementSafely(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    log(`Element not found: ${selector} - ${error.message}`, 'WARN');
    return false;
  }
}

// Helper function to wait for page load
async function waitForPageLoad(page, expectedUrl = null) {
  try {
    await page.waitForTimeout(3000); // Simple timeout instead of networkidle
    if (expectedUrl) {
      const currentUrl = await page.url();
      if (!currentUrl.includes(expectedUrl)) {
        log(`Expected URL to contain ${expectedUrl}, got ${currentUrl}`, 'WARN');
      }
    }
    return true;
  } catch (error) {
    log(`Page load timeout: ${error.message}`, 'WARN');
    return false;
  }
}

// Test server status
async function testServerStatus() {
  log('Testing server status...');
  
  try {
    // Test backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/health`);
    testResults.serverStatus.backend = {
      status: backendResponse.status,
      ok: backendResponse.ok,
      url: `${BACKEND_URL}/api/v1/health`
    };
    
    // Test frontend by checking if it responds
    const frontendResponse = await fetch(FRONTEND_URL);
    testResults.serverStatus.frontend = {
      status: frontendResponse.status,
      ok: frontendResponse.ok,
      url: FRONTEND_URL
    };
    
    log(`Backend: ${backendResponse.ok ? 'OK' : 'FAIL'} (${backendResponse.status})`);
    log(`Frontend: ${frontendResponse.ok ? 'OK' : 'FAIL'} (${frontendResponse.status})`);
    
  } catch (error) {
    testResults.errors.push(`Server status check failed: ${error.message}`);
    log(`Server status check failed: ${error.message}`, 'ERROR');
  }
}

// Test Voice Ordering from Kiosk
async function testVoiceKiosk(browser) {
  log('Testing Voice Ordering Kiosk...');
  
  const page = await browser.newPage();
  const pageErrors = await setupErrorCapture(page, 'Kiosk');
  
  try {
    // Navigate to kiosk
    await page.goto(`${FRONTEND_URL}/kiosk`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000); // Allow React to hydrate
    
    testResults.voiceKiosk.pageLoaded = true;
    testResults.voiceKiosk.url = page.url();
    
    // Check for mode selection
    const modeSelector = await waitForElementSafely(page, '[data-testid="kiosk-mode-selector"]', 5000) ||
                         await waitForElementSafely(page, 'button', 5000);
    
    if (modeSelector) {
      log('Kiosk mode selector found');
      testResults.voiceKiosk.modeSelector = true;
      
      // Look for voice mode button
      const voiceButton = await page.$('text=Voice Order') || await page.$('text=Voice Ordering');
      if (voiceButton) {
        log('Clicking voice ordering button...');
        await voiceButton.click();
        await page.waitForTimeout(2000);
        
        testResults.voiceKiosk.voiceModeSelected = true;
        
        // Check for microphone button
        const micButton = await waitForElementSafely(page, '[data-testid="voice-record-button"]', 5000) ||
                          await waitForElementSafely(page, 'button[aria-label*="microphone"]', 5000) ||
                          await waitForElementSafely(page, '.voice-control', 5000);
        
        if (micButton) {
          log('Microphone interface found');
          testResults.voiceKiosk.microphoneInterface = true;
          
          // Check for cart display
          const cartSection = await waitForElementSafely(page, '[data-testid="order-summary"]', 3000) ||
                             await waitForElementSafely(page, '.cart', 3000) ||
                             await waitForElementSafely(page, 'text=Your Order', 3000);
          
          testResults.voiceKiosk.cartDisplay = !!cartSection;
          
          // Simulate voice order - check if we can add items manually for testing
          try {
            // Try to find any menu items or add buttons to simulate order
            const addButtons = await page.$$('button[data-testid*="add"], button:text("Add")');
            if (addButtons.length > 0) {
              await addButtons[0].click();
              await page.waitForTimeout(1000);
              testResults.voiceKiosk.itemAddedTest = true;
            }
          } catch (error) {
            log(`Could not simulate item addition: ${error.message}`, 'WARN');
          }
          
        } else {
          log('Microphone interface not found', 'WARN');
          testResults.voiceKiosk.microphoneInterface = false;
        }
      } else {
        log('Voice ordering button not found', 'WARN');
        testResults.voiceKiosk.voiceModeSelected = false;
      }
    } else {
      log('Kiosk mode selector not found', 'WARN');
      testResults.voiceKiosk.modeSelector = false;
    }
    
    // Capture screenshot
    await page.screenshot({ path: './test-screenshots/kiosk-voice.png', fullPage: true });
    testResults.voiceKiosk.screenshot = './test-screenshots/kiosk-voice.png';
    
  } catch (error) {
    testResults.errors.push(`Voice kiosk test failed: ${error.message}`);
    log(`Voice kiosk test failed: ${error.message}`, 'ERROR');
  }
  
  testResults.voiceKiosk.errors = pageErrors;
  await page.close();
}

// Test Online Ordering
async function testOnlineOrdering(browser) {
  log('Testing Online Ordering...');
  
  const page = await browser.newPage();
  const pageErrors = await setupErrorCapture(page, 'OnlineOrder');
  
  try {
    // Navigate to main ordering page
    await page.goto(`${FRONTEND_URL}/order`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    testResults.onlineOrdering.pageLoaded = true;
    testResults.onlineOrdering.url = page.url();
    
    // Check for menu display
    const menuItems = await page.$$('.menu-item, [data-testid*="menu-item"], .card');
    testResults.onlineOrdering.menuItemsFound = menuItems.length;
    
    if (menuItems.length > 0) {
      log(`Found ${menuItems.length} menu items`);
      
      // Try to add an item to cart
      try {
        const addButton = await page.$('button:text("Add"), button[data-testid*="add"], .add-button');
        if (addButton) {
          await addButton.click();
          await page.waitForTimeout(1000);
          
          // Check if cart was updated
          const cartIndicator = await page.$('.cart-count, [data-testid="cart-count"], .badge');
          testResults.onlineOrdering.itemAddedToCart = !!cartIndicator;
          
          if (cartIndicator) {
            const cartCount = await page.$eval('.cart-count, [data-testid="cart-count"], .badge', 
              el => el.textContent || el.innerText);
            testResults.onlineOrdering.cartItemCount = cartCount;
          }
          
          // Try to proceed to checkout
          const checkoutButton = await page.$('button:text("Checkout"), button:text("Cart"), [data-testid="checkout"]');
          if (checkoutButton) {
            await checkoutButton.click();
            await page.waitForTimeout(2000);
            testResults.onlineOrdering.checkoutInitiated = true;
          }
        }
      } catch (error) {
        log(`Could not complete online order simulation: ${error.message}`, 'WARN');
      }
    } else {
      log('No menu items found', 'WARN');
    }
    
    // Capture screenshot
    await page.screenshot({ path: './test-screenshots/online-ordering.png', fullPage: true });
    testResults.onlineOrdering.screenshot = './test-screenshots/online-ordering.png';
    
  } catch (error) {
    testResults.errors.push(`Online ordering test failed: ${error.message}`);
    log(`Online ordering test failed: ${error.message}`, 'ERROR');
  }
  
  testResults.onlineOrdering.errors = pageErrors;
  await page.close();
}

// Test Kitchen Display
async function testKitchenDisplay(browser) {
  log('Testing Kitchen Display System...');
  
  const page = await browser.newPage();
  const pageErrors = await setupErrorCapture(page, 'Kitchen');
  
  try {
    // Navigate to kitchen display
    await page.goto(`${FRONTEND_URL}/kitchen`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    testResults.kitchenDisplay.pageLoaded = true;
    testResults.kitchenDisplay.url = page.url();
    
    // Check for order display sections
    const orderCards = await page.$$('.order-card, [data-testid*="order"], .kds-order');
    testResults.kitchenDisplay.orderCardsFound = orderCards.length;
    
    // Check for status handling sections
    const statusSections = await page.$$('[data-status], .status-', '.order-status');
    testResults.kitchenDisplay.statusSectionsFound = statusSections.length;
    
    // Test status transitions if orders exist
    if (orderCards.length > 0) {
      try {
        // Look for status change buttons
        const statusButtons = await page.$$('button:text("Ready"), button:text("Preparing"), [data-testid*="status"]');
        testResults.kitchenDisplay.statusButtonsFound = statusButtons.length;
        
        if (statusButtons.length > 0) {
          // Try to change an order status
          await statusButtons[0].click();
          await page.waitForTimeout(1000);
          testResults.kitchenDisplay.statusChangeTest = true;
        }
      } catch (error) {
        log(`Could not test status transitions: ${error.message}`, 'WARN');
      }
    }
    
    // Check for WebSocket connection indicator
    const connectionStatus = await page.$('[data-testid="connection-status"], .connection-', '.ws-status');
    testResults.kitchenDisplay.connectionIndicator = !!connectionStatus;
    
    // Capture screenshot
    await page.screenshot({ path: './test-screenshots/kitchen-display.png', fullPage: true });
    testResults.kitchenDisplay.screenshot = './test-screenshots/kitchen-display.png';
    
  } catch (error) {
    testResults.errors.push(`Kitchen display test failed: ${error.message}`);
    log(`Kitchen display test failed: ${error.message}`, 'ERROR');
  }
  
  testResults.kitchenDisplay.errors = pageErrors;
  await page.close();
}

// Test Expo Display
async function testExpoDisplay(browser) {
  log('Testing Expo Display System...');
  
  const page = await browser.newPage();
  const pageErrors = await setupErrorCapture(page, 'Expo');
  
  try {
    // Navigate to expo display
    await page.goto(`${FRONTEND_URL}/expo`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    testResults.expoDisplay.pageLoaded = true;
    testResults.expoDisplay.url = page.url();
    
    // Check for ready orders
    const readyOrders = await page.$$('.ready-order, [data-status="ready"], [data-testid*="ready"]');
    testResults.expoDisplay.readyOrdersFound = readyOrders.length;
    
    // Check for completion buttons
    const completeButtons = await page.$$('button:text("Complete"), button:text("Delivered"), [data-testid*="complete"]');
    testResults.expoDisplay.completeButtonsFound = completeButtons.length;
    
    if (completeButtons.length > 0) {
      try {
        await completeButtons[0].click();
        await page.waitForTimeout(1000);
        testResults.expoDisplay.completionTest = true;
      } catch (error) {
        log(`Could not test order completion: ${error.message}`, 'WARN');
      }
    }
    
    // Capture screenshot
    await page.screenshot({ path: './test-screenshots/expo-display.png', fullPage: true });
    testResults.expoDisplay.screenshot = './test-screenshots/expo-display.png';
    
  } catch (error) {
    testResults.errors.push(`Expo display test failed: ${error.message}`);
    log(`Expo display test failed: ${error.message}`, 'ERROR');
  }
  
  testResults.expoDisplay.errors = pageErrors;
  await page.close();
}

// Test WebSocket Monitoring
async function testWebSocketConnections(browser) {
  log('Testing WebSocket connections...');
  
  const page = await browser.newPage();
  
  try {
    // Monitor WebSocket connections
    const wsConnections = [];
    
    page.on('response', response => {
      if (response.url().includes('ws://') || response.url().includes('wss://')) {
        wsConnections.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Visit pages that should establish WebSocket connections
    await page.goto(`${FRONTEND_URL}/kitchen`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(5000);
    
    await page.goto(`${FRONTEND_URL}/expo`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(5000);
    
    testResults.websocketMonitoring.connectionsDetected = wsConnections;
    
    // Check for WebSocket errors in console
    const wsErrors = testResults.errors.filter(error => 
      error.includes('WebSocket') || 
      error.includes('ws://') || 
      error.includes('connection')
    );
    
    testResults.websocketMonitoring.connectionErrors = wsErrors;
    
  } catch (error) {
    testResults.errors.push(`WebSocket monitoring failed: ${error.message}`);
    log(`WebSocket monitoring failed: ${error.message}`, 'ERROR');
  }
  
  await page.close();
}

// Test Database Status Verification
async function testDatabaseVerification() {
  log('Testing database status verification...');
  
  try {
    // Check orders endpoint
    const ordersResponse = await fetch(`${BACKEND_URL}/api/v1/orders`, {
      headers: {
        'x-restaurant-id': '11111111-1111-1111-1111-111111111111'
      }
    });
    
    testResults.databaseVerification.ordersEndpoint = {
      status: ordersResponse.status,
      ok: ordersResponse.ok
    };
    
    if (ordersResponse.ok) {
      const orders = await ordersResponse.json();
      testResults.databaseVerification.ordersCount = Array.isArray(orders) ? orders.length : 0;
      
      // Check status distribution
      if (Array.isArray(orders)) {
        const statusCounts = orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});
        testResults.databaseVerification.statusDistribution = statusCounts;
        
        // Verify all 7 statuses are handled
        const expectedStatuses = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
        const foundStatuses = Object.keys(statusCounts);
        const missingStatuses = expectedStatuses.filter(status => !foundStatuses.includes(status));
        
        testResults.databaseVerification.allStatusesHandled = missingStatuses.length === 0;
        testResults.databaseVerification.missingStatuses = missingStatuses;
      }
    }
    
  } catch (error) {
    testResults.errors.push(`Database verification failed: ${error.message}`);
    log(`Database verification failed: ${error.message}`, 'ERROR');
  }
}

// Main test execution
async function runComprehensiveTests() {
  log('Starting comprehensive end-to-end testing...');
  
  // Ensure screenshots directory exists
  const screenshotDir = './test-screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  let browser;
  
  try {
    // Start browser
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });
    
    // Run all tests
    await testServerStatus();
    await testVoiceKiosk(browser);
    await testOnlineOrdering(browser);
    await testKitchenDisplay(browser);
    await testExpoDisplay(browser);
    await testWebSocketConnections(browser);
    await testDatabaseVerification();
    
  } catch (error) {
    testResults.errors.push(`Test execution failed: ${error.message}`);
    log(`Test execution failed: ${error.message}`, 'ERROR');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate report
  const reportPath = './test-e2e-comprehensive-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // Log summary
  log('=== COMPREHENSIVE TEST SUMMARY ===');
  log(`Total Errors: ${testResults.errors.length}`);
  log(`Total Warnings: ${testResults.warnings.length}`);
  
  if (testResults.serverStatus.backend?.ok && testResults.serverStatus.frontend?.ok) {
    log('✅ Servers are running properly');
  } else {
    log('❌ Server issues detected');
  }
  
  if (testResults.voiceKiosk.pageLoaded) {
    log('✅ Voice kiosk page loaded');
  } else {
    log('❌ Voice kiosk page failed to load');
  }
  
  if (testResults.onlineOrdering.pageLoaded) {
    log('✅ Online ordering page loaded');
  } else {
    log('❌ Online ordering page failed to load');
  }
  
  if (testResults.kitchenDisplay.pageLoaded) {
    log('✅ Kitchen display loaded');
  } else {
    log('❌ Kitchen display failed to load');
  }
  
  if (testResults.expoDisplay.pageLoaded) {
    log('✅ Expo display loaded');
  } else {
    log('❌ Expo display failed to load');
  }
  
  log(`Full report saved to: ${reportPath}`);
  log('Test execution completed!');
  
  return testResults;
}

// Run the tests
if (require.main === module) {
  runComprehensiveTests()
    .then((results) => {
      process.exit(results.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTests, testResults };