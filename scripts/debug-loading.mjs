#!/usr/bin/env node

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();

// Capture ALL console messages
const logs = [];
page.on('console', msg => {
  const entry = {
    type: msg.type(),
    text: msg.text(),
    location: msg.location()
  };
  logs.push(entry);
  console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
});

// Capture page errors
page.on('pageerror', error => {
  console.error('PAGE ERROR:', error.message);
  console.error('Stack:', error.stack);
});

// Capture request failures
page.on('requestfailed', request => {
  console.error('Request failed:', request.url(), request.failure().errorText);
});

console.log('Navigating to http://localhost:5173...');
await page.goto('http://localhost:5173', { 
  waitUntil: 'networkidle2',
  timeout: 30000 
});

// Wait a bit to collect all logs
await new Promise(resolve => setTimeout(resolve, 3000));

// Check if React mounted
const appReady = await page.evaluate(() => {
  return {
    bootSentinel: document.getElementById('boot-sentinel')?.textContent,
    appReady: document.body.dataset.appReady,
    rootContent: document.getElementById('root')?.innerHTML?.substring(0, 200),
    scripts: Array.from(document.scripts).map(s => ({
      src: s.src,
      type: s.type,
      hasError: s.onerror ? 'has error handler' : 'no error handler'
    }))
  };
});

console.log('\n=== App State ===');
console.log('Boot sentinel:', appReady.bootSentinel);
console.log('App ready flag:', appReady.appReady);
console.log('Root content preview:', appReady.rootContent);
console.log('\n=== Scripts loaded ===');
appReady.scripts.forEach(s => {
  if (s.src) console.log(`- ${s.type || 'text/javascript'}: ${s.src}`);
});

console.log('\n=== Console Logs Summary ===');
const errorLogs = logs.filter(l => l.type === 'error');
const warnLogs = logs.filter(l => l.type === 'warning');
console.log(`Errors: ${errorLogs.length}`);
console.log(`Warnings: ${warnLogs.length}`);
console.log(`Info: ${logs.filter(l => l.type === 'log').length}`);

if (errorLogs.length > 0) {
  console.log('\n=== Errors ===');
  errorLogs.forEach(log => {
    console.log(`${log.text}`);
    if (log.location?.url) {
      console.log(`  at ${log.location.url}:${log.location.lineNumber}`);
    }
  });
}

await browser.close();
process.exit(appReady.appReady === '1' ? 0 : 1);