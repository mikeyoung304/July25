import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const PREVIEW_URL = 'http://127.0.0.1:4173/';
const REPORTS_DIR = path.join(process.cwd(), '../docs/_reports');

async function diagnosePreview() {
  console.log('Starting preview diagnostics...');
  
  // Ensure reports directory exists
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleLogs = [];
  const pageErrors = [];
  
  // Capture console messages
  page.on('console', msg => {
    const logLine = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logLine);
    console.log('Console:', logLine);
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    const errorLine = `[ERROR] ${error.message}\n${error.stack || ''}`;
    pageErrors.push(errorLine);
    console.log('Page Error:', errorLine);
  });
  
  // Navigate to preview
  console.log(`Navigating to ${PREVIEW_URL}...`);
  try {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (error) {
    console.log('Navigation error:', error.message);
  }
  
  // Wait for potential late renders
  console.log('Waiting 10 seconds for content...');
  await page.waitForTimeout(10000);
  
  // Get page content
  const htmlContent = await page.content();
  const bodyText = await page.locator('body').textContent();
  const rootContent = await page.locator('#root').innerHTML();
  
  // Take screenshot
  const screenshotPath = path.join(REPORTS_DIR, 'preview.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);
  
  // Save HTML snapshot
  const htmlPath = path.join(REPORTS_DIR, 'BUILD_PREVIEW_SNAPSHOT.html');
  await fs.writeFile(htmlPath, htmlContent);
  console.log(`HTML snapshot saved to ${htmlPath}`);
  
  // Save console logs
  const logPath = path.join(REPORTS_DIR, 'preview-console.log');
  const logContent = [
    '=== PREVIEW DIAGNOSTICS ===',
    `URL: ${PREVIEW_URL}`,
    `Timestamp: ${new Date().toISOString()}`,
    '',
    '=== CONSOLE LOGS ===',
    ...consoleLogs,
    '',
    '=== PAGE ERRORS ===',
    ...pageErrors,
    '',
    '=== PAGE CONTENT SUMMARY ===',
    `Body text length: ${bodyText?.length || 0}`,
    `Root HTML length: ${rootContent?.length || 0}`,
    `First 500 chars of body: ${bodyText?.substring(0, 500) || 'EMPTY'}`,
    '',
    '=== ROOT ELEMENT CONTENT ===',
    rootContent || 'EMPTY'
  ].join('\n');
  
  await fs.writeFile(logPath, logContent);
  console.log(`Console logs saved to ${logPath}`);
  
  // Print summary
  console.log('\n=== DIAGNOSTIC SUMMARY ===');
  console.log(`Console messages: ${consoleLogs.length}`);
  console.log(`Page errors: ${pageErrors.length}`);
  console.log(`Body has content: ${bodyText && bodyText.length > 0}`);
  console.log(`Root has content: ${rootContent && rootContent.length > 0}`);
  
  await browser.close();
  
  // Return status for CI
  const hasErrors = pageErrors.length > 0;
  const isEmpty = !rootContent || rootContent.length === 0;
  
  if (hasErrors || isEmpty) {
    console.log('\n❌ Preview diagnostics found issues');
    process.exit(1);
  } else {
    console.log('\n✅ Preview diagnostics passed');
    process.exit(0);
  }
}

diagnosePreview().catch(error => {
  console.error('Diagnostic script failed:', error);
  process.exit(1);
});