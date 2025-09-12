#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function debugLoadingIssue() {
  console.log('🔍 Starting Puppeteer investigation...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log('❌ Console Error:', text);
    } else if (type === 'warning') {
      console.log('⚠️  Console Warning:', text);
    } else {
      console.log('📝 Console:', text);
    }
  });
  
  // Monitor page errors
  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
  });
  
  // Monitor failed requests
  page.on('requestfailed', request => {
    console.log('❌ Request Failed:', request.url(), '-', request.failure().errorText);
  });
  
  // Monitor network requests
  const failedRequests = [];
  const pendingRequests = new Map();
  
  page.on('request', request => {
    pendingRequests.set(request.url(), Date.now());
    console.log('→ Request:', request.method(), request.url());
  });
  
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    const startTime = pendingRequests.get(url);
    const duration = startTime ? Date.now() - startTime : 0;
    pendingRequests.delete(url);
    
    if (status >= 400) {
      console.log(`❌ Response Error: ${url} - Status ${status} (${duration}ms)`);
      failedRequests.push({ url, status });
    } else if (duration > 3000) {
      console.log(`⚠️  Slow Response: ${url} - Status ${status} (${duration}ms)`);
    } else {
      console.log(`← Response: ${url} - Status ${status} (${duration}ms)`);
    }
  });
  
  try {
    console.log('\n📱 Navigating to http://localhost:5173...\n');
    
    // Navigate with a timeout
    const response = await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('\n✅ Page loaded with status:', response.status());
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    // Check for loading indicators
    const loadingElements = await page.evaluate(() => {
      const spinners = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="Loading"], [class*="Spinner"]');
      const loadingTexts = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.toLowerCase().includes('loading')
      );
      
      return {
        spinners: spinners.length,
        loadingTexts: loadingTexts.length,
        bodyText: document.body.textContent?.substring(0, 500),
        title: document.title
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('- Title:', loadingElements.title);
    console.log('- Loading spinners found:', loadingElements.spinners);
    console.log('- Loading text elements:', loadingElements.loadingTexts);
    
    if (loadingElements.bodyText) {
      console.log('\n📄 Page Content (first 500 chars):');
      console.log(loadingElements.bodyText);
    }
    
    // Check for React errors
    const reactErrors = await page.evaluate(() => {
      const errorBoundaries = document.querySelectorAll('[class*="error"], [class*="Error"]');
      return errorBoundaries.length;
    });
    
    if (reactErrors > 0) {
      console.log('\n⚠️  Found', reactErrors, 'potential error elements on the page');
    }
    
    // Check localStorage for auth issues
    const authData = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
        restaurantId: localStorage.getItem('restaurantId'),
        allKeys: Object.keys(localStorage)
      };
    });
    
    console.log('\n🔐 Auth/Storage Data:');
    console.log('- Has token:', !!authData.token);
    console.log('- Has user:', !!authData.user);
    console.log('- Has restaurantId:', !!authData.restaurantId);
    console.log('- All localStorage keys:', authData.allKeys);
    
    // Take a screenshot
    await page.screenshot({ path: '/tmp/loading-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/loading-debug.png');
    
    // Check for specific API calls
    console.log('\n🔍 Checking pending requests:');
    if (pendingRequests.size > 0) {
      console.log('Still pending:', Array.from(pendingRequests.keys()));
    } else {
      console.log('No pending requests');
    }
    
    if (failedRequests.length > 0) {
      console.log('\n❌ Failed requests summary:');
      failedRequests.forEach(req => {
        console.log(`  - ${req.url} (Status: ${req.status})`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Navigation error:', error.message);
    
    // Try to get page content even if navigation failed
    try {
      const content = await page.content();
      console.log('\n📄 Page HTML (first 1000 chars):');
      console.log(content.substring(0, 1000));
    } catch (e) {
      console.log('Could not get page content');
    }
  }
  
  await browser.close();
  
  console.log('\n✅ Investigation complete');
}

debugLoadingIssue().catch(console.error);
