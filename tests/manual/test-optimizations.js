#!/usr/bin/env node

/**
 * End-to-End Test Script for Optimized Kitchen Display System
 * Tests functionality of both Expo and Kitchen pages
 */

/* eslint-env browser */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const TIMEOUT = 30000;

async function testKitchenDisplaySystem() {

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
      }
    });

    // Test 1: Kitchen Display Page
    await testKitchenPage(page);

    // Test 2: Expo Page
    await testExpoPage(page);

    // Test 3: Performance benchmarks
    await performanceTests(page);


  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testKitchenPage(page) {
  
  try {
    await page.goto(`${BASE_URL}/kitchen`, { 
      waitUntil: 'networkidle2', 
      timeout: TIMEOUT 
    });

    // Wait for the main content to load
    await page.waitForSelector('[data-testid="app-root"], main', { timeout: 10000 });


    // Check for critical elements
    const hasHeader = await page.$('h1, h2') !== null;
    const hasOrderCards = await page.$('[class*="order"], [class*="card"]') !== null;
    

    // Check for error messages
    const errorMessages = await page.$$eval('[class*="error"], [class*="destructive"]', 
      elements => elements.map(el => el.textContent).filter(text => text.trim())
    );

    if (errorMessages.length > 0) {
    } else {
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function testExpoPage(page) {
  
  try {
    await page.goto(`${BASE_URL}/expo`, { 
      waitUntil: 'networkidle2', 
      timeout: TIMEOUT 
    });

    // Wait for the main content to load
    await page.waitForSelector('[data-testid="app-root"], main', { timeout: 10000 });


    // Check for expo-specific elements
    const hasExpoPanels = await page.$('[class*="grid"], [class*="panel"]') !== null;
    const hasActivitySection = await page.$eval('body', body => 
      body.textContent.includes('Kitchen Activity') || 
      body.textContent.includes('Ready for Fulfillment')
    ).catch(() => false);


    // Check for error messages
    const errorMessages = await page.$$eval('[class*="error"], [class*="destructive"]', 
      elements => elements.map(el => el.textContent).filter(text => text.trim())
    ).catch(() => []);

    if (errorMessages.length > 0) {
    } else {
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function performanceTests(page) {
  
  const results = {};

  // Test kitchen page performance
  await page.goto(`${BASE_URL}/kitchen`, { waitUntil: 'networkidle2' });
  
  const kitchenMetrics = await page.evaluate(() => {
    return {
      loadTime: performance.now(),
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
      domNodes: document.querySelectorAll('*').length
    };
  });

  results.kitchen = kitchenMetrics;

  // Test expo page performance  
  await page.goto(`${BASE_URL}/expo`, { waitUntil: 'networkidle2' });
  
  const expoMetrics = await page.evaluate(() => {
    return {
      loadTime: performance.now(),
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
      domNodes: document.querySelectorAll('*').length
    };
  });

  results.expo = expoMetrics;

  // Save results
  const resultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  testKitchenDisplaySystem();
}

module.exports = { testKitchenDisplaySystem };