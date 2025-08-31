#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '../test-screenshots');

// Ensure screenshots directory exists
await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const TIMEOUT = 30000;

// Test results
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  }
};

async function takeScreenshot(page, name) {
  const filename = `${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

async function testFlow(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.tests.push({
      name,
      status: 'passed',
      duration: `${duration}ms`
    });
    results.summary.passed++;
    console.log(`✅ ${name} - PASSED (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    results.tests.push({
      name,
      status: 'failed',
      error: error.message,
      duration: `${duration}ms`
    });
    results.summary.failed++;
    console.error(`❌ ${name} - FAILED: ${error.message}`);
    return false;
  } finally {
    results.summary.total++;
  }
}

async function waitForServer() {
  console.log('⏳ Waiting for servers to start...');
  const maxAttempts = 30;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        console.log('✅ Backend server is ready');
        
        // Check frontend
        const frontendResponse = await fetch(BASE_URL);
        if (frontendResponse.ok) {
          console.log('✅ Frontend server is ready');
          return true;
        }
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.stdout.write('.');
  }
  
  throw new Error('Servers failed to start within 60 seconds');
}

async function runTests() {
  console.log('🚀 Restaurant OS - Puppeteer Testing Suite');
  console.log('==========================================');
  
  // Wait for servers
  await waitForServer();
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Browser Error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('🔴 Page Error:', error.message);
  });
  
  try {
    // Test 1: Homepage Load
    await testFlow('Homepage Load', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: TIMEOUT });
      await takeScreenshot(page, '01-homepage');
      
      // Check for main navigation elements
      const title = await page.title();
      if (!title.includes('Restaurant') && !title.includes('MACON')) {
        throw new Error(`Unexpected title: ${title}`);
      }
      
      // Check for key UI elements
      const hasNavigation = await page.$('[data-testid="main-navigation"], nav, .navigation');
      if (!hasNavigation) {
        console.log('⚠️  No navigation found, checking for login redirect...');
      }
    });
    
    // Test 2: Login Page
    await testFlow('Login Page', async () => {
      // Navigate to login if not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
      }
      
      await takeScreenshot(page, '02-login-page');
      
      // Check for login form elements
      const emailInput = await page.$('input[type="email"], input[name="email"], #email');
      const passwordInput = await page.$('input[type="password"], input[name="password"], #password');
      
      if (!emailInput || !passwordInput) {
        // Try PIN login
        const pinInput = await page.$('[data-testid="pin-input"], .pin-input, input[name="pin"]');
        if (!pinInput) {
          console.log('⚠️  No login form found, app might be in demo mode');
        }
      }
    });
    
    // Test 3: Order System
    await testFlow('Order System', async () => {
      await page.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Let React render
      await takeScreenshot(page, '03-orders-page');
      
      // Check for order creation button
      const newOrderBtn = await page.$('button[data-testid="new-order"], .new-order-btn');
      if (newOrderBtn) {
        await newOrderBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await takeScreenshot(page, '04-new-order-modal');
      } else {
        // Try to find button by text content
        const buttons = await page.$$('button');
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent, button);
          if (text && text.includes('New Order')) {
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await takeScreenshot(page, '04-new-order-modal');
            break;
          }
        }
      }
    });
    
    // Test 4: Kitchen Display System
    await testFlow('Kitchen Display System', async () => {
      await page.goto(`${BASE_URL}/kitchen`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot(page, '05-kitchen-display');
      
      // Check for order cards or empty state
      const orderCards = await page.$$('.order-card, [data-testid="order-card"], .kitchen-order');
      console.log(`  Found ${orderCards.length} order cards in KDS`);
      
      // Check for status columns
      const statusColumns = await page.$$('.status-column, .order-column, [data-testid="status-column"]');
      console.log(`  Found ${statusColumns.length} status columns`);
    });
    
    // Test 5: Menu Management
    await testFlow('Menu Management', async () => {
      await page.goto(`${BASE_URL}/menu`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot(page, '06-menu-management');
      
      // Check for menu items
      const menuItems = await page.$$('.menu-item, [data-testid="menu-item"], .product-card');
      console.log(`  Found ${menuItems.length} menu items`);
    });
    
    // Test 6: Analytics Dashboard
    await testFlow('Analytics Dashboard', async () => {
      await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot(page, '07-analytics');
      
      // Check for charts or stats
      const charts = await page.$$('.chart, canvas, [data-testid="chart"], .analytics-chart');
      const stats = await page.$$('.stat-card, .metric-card, [data-testid="stat"]');
      console.log(`  Found ${charts.length} charts and ${stats.length} stat cards`);
    });
    
    // Test 7: Kiosk Mode
    await testFlow('Kiosk Mode', async () => {
      await page.goto(`${BASE_URL}/kiosk`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot(page, '08-kiosk-mode');
      
      // Check for menu categories
      const categories = await page.$$('.category-button, [data-testid="category"], .menu-category');
      console.log(`  Found ${categories.length} menu categories`);
      
      // Check for cart
      const cart = await page.$('.cart, [data-testid="cart"], .kiosk-cart');
      if (cart) {
        console.log('  ✓ Cart component found');
      }
    });
    
    // Test 8: Payment Integration
    await testFlow('Payment Page', async () => {
      await page.goto(`${BASE_URL}/payments`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot(page, '09-payments');
      
      // Check for Square integration
      const squareElement = await page.$('[data-testid="square-payment"], .square-payment, #square-payment');
      if (squareElement) {
        console.log('  ✓ Square payment integration found');
      }
    });
    
    // Test 9: Voice Ordering
    await testFlow('Voice Ordering', async () => {
      await page.goto(`${BASE_URL}/voice`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot(page, '10-voice-ordering');
      
      // Check for voice control button
      const voiceBtn = await page.$('[data-testid="voice-control"], .voice-control');
      if (voiceBtn) {
        console.log('  ✓ Voice control button found');
      } else {
        // Try to find button by text content
        const buttons = await page.$$('button');
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent, button);
          if (text && text.includes('Start Voice')) {
            console.log('  ✓ Voice control button found');
            break;
          }
        }
      }
    });
    
    // Test 10: Mobile Responsiveness
    await testFlow('Mobile Responsiveness', async () => {
      await page.setViewport({ width: 375, height: 812 }); // iPhone X
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot(page, '11-mobile-view');
      
      // Check for mobile menu
      const mobileMenu = await page.$('.mobile-menu, .hamburger, [data-testid="mobile-menu"]');
      if (mobileMenu) {
        console.log('  ✓ Mobile menu found');
      }
    });
    
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  
  // Save results to JSON
  const reportPath = path.join(SCREENSHOTS_DIR, 'test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  // Return exit code based on failures
  return results.summary.failed === 0 ? 0 : 1;
}

// Run tests
runTests()
  .then(exitCode => {
    console.log('\n✨ Testing complete!');
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });