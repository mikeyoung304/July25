#!/usr/bin/env node

/**
 * Performance test for image loading optimizations
 * Tests: lazy loading, caching headers, fallback system
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testImagePerformance() {
  console.log('🚀 Starting performance tests...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Enable performance tracking
  await page.evaluateOnNewDocument(() => {
    window.imageLoadTimes = [];
    window.intersectionCount = 0;
    
    // Track image loads
    const originalImage = window.HTMLImageElement.prototype;
    Object.defineProperty(originalImage, 'onload', {
      set: function(fn) {
        this.addEventListener('load', (e) => {
          window.imageLoadTimes.push({
            src: e.target.src,
            loadTime: performance.now(),
            naturalWidth: e.target.naturalWidth,
            naturalHeight: e.target.naturalHeight
          });
          if (fn) fn(e);
        });
      }
    });
    
    // Track intersection observer
    const originalIO = window.IntersectionObserver;
    window.IntersectionObserver = class extends originalIO {
      constructor(callback, options) {
        super((entries, observer) => {
          window.intersectionCount += entries.length;
          callback(entries, observer);
        }, options);
      }
    };
  });
  
  // Navigate and measure
  console.log('📱 Loading kiosk page...');
  const startTime = Date.now();
  
  await page.goto('http://localhost:5173/kiosk', {
    waitUntil: 'networkidle0'
  });
  
  const loadTime = Date.now() - startTime;
  console.log(`✅ Page loaded in ${loadTime}ms\n`);
  
  // Wait for initial renders
  await page.waitForTimeout(2000);
  
  // Get metrics
  const metrics = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return {
      totalImages: images.length,
      loadedImages: window.imageLoadTimes.length,
      visibleImages: images.filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      }).length,
      intersectionObserverCalls: window.intersectionCount,
      imageLoadTimes: window.imageLoadTimes.slice(0, 10), // First 10
      performance: {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
      }
    };
  });
  
  console.log('📊 Performance Metrics:');
  console.log('------------------------');
  console.log(`Total images on page: ${metrics.totalImages}`);
  console.log(`Images loaded initially: ${metrics.loadedImages}`);
  console.log(`Images visible in viewport: ${metrics.visibleImages}`);
  console.log(`Intersection Observer calls: ${metrics.intersectionObserverCalls}`);
  console.log(`DOM Content Loaded: ${metrics.performance.domContentLoaded}ms`);
  console.log(`Full page load: ${metrics.performance.loadComplete}ms\n`);
  
  // Test scrolling
  console.log('📜 Testing lazy loading on scroll...');
  const beforeScroll = metrics.loadedImages;
  
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  await page.waitForTimeout(1000);
  
  const afterScroll = await page.evaluate(() => window.imageLoadTimes.length);
  console.log(`Images loaded after scroll: ${afterScroll - beforeScroll} new images\n`);
  
  // Test cache headers
  console.log('🔄 Testing cache headers...');
  const resources = await page.evaluate(() => 
    performance.getEntriesByType('resource')
      .filter(r => r.name.includes('/images/'))
      .map(r => ({
        name: r.name.split('/').pop(),
        duration: Math.round(r.duration),
        size: Math.round(r.transferSize / 1024),
        cached: r.transferSize === 0
      }))
      .slice(0, 5)
  );
  
  console.log('Sample image load times:');
  resources.forEach(r => {
    console.log(`  ${r.name}: ${r.duration}ms, ${r.size}KB ${r.cached ? '(cached)' : ''}`);
  });
  
  // Test fallback system
  console.log('\n🔀 Testing fallback system...');
  const fallbackTest = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const fallbacks = images.filter(img => 
      img.src.includes('summer-sampler') || 
      img.src.includes('greek-salad') ||
      img.src.includes('soul-bowl')
    );
    return {
      totalFallbacks: fallbacks.length,
      samples: fallbacks.slice(0, 3).map(img => ({
        alt: img.alt,
        src: img.src.split('/').pop()
      }))
    };
  });
  
  console.log(`Fallback images used: ${fallbackTest.totalFallbacks}`);
  if (fallbackTest.samples.length > 0) {
    console.log('Sample fallbacks:');
    fallbackTest.samples.forEach(s => {
      console.log(`  ${s.alt} → ${s.src}`);
    });
  }
  
  console.log('\n✨ Performance test complete!');
  
  // Keep browser open for inspection
  console.log('\n👀 Browser left open for manual inspection.');
  console.log('Press Ctrl+C to close...');
  
  // Wait indefinitely
  await new Promise(() => {});
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testImagePerformance().catch(console.error);
} catch (error) {
  console.log('📦 Installing puppeteer for testing...');
  const { execSync } = require('child_process');
  execSync('npm install --save-dev puppeteer', { 
    stdio: 'inherit', 
    cwd: '/Users/mikeyoung/CODING/rebuild-6.0/client' 
  });
  console.log('✅ Puppeteer installed, running tests...');
  testImagePerformance().catch(console.error);
}