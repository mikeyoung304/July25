import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Login Flow Diagnosis', () => {
  let networkLogs: any[] = [];
  let consoleLogs: any[] = [];
  let errors: any[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset logs
    networkLogs = [];
    consoleLogs = [];
    errors = [];

    // Capture all network requests
    page.on('request', request => {
      networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postDataJSON(),
        timestamp: new Date().toISOString()
      });
    });

    page.on('response', async response => {
      let body = null;
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else if (contentType.includes('text')) {
          body = await response.text();
        }
      } catch (e) {
        // Ignore parsing errors
      }

      networkLogs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        body: body,
        timestamp: new Date().toISOString()
      });
    });

    // Capture console logs
    page.on('console', msg => {
      const log = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };
      consoleLogs.push(log);
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    });

    // Capture errors
    page.on('pageerror', error => {
      const errorObj = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      errors.push(errorObj);
      console.error('[PAGE ERROR]:', error.message);
    });
  });

  test('1. Navigate to login page and capture initial state', async ({ page }) => {
    console.log('\n🔍 TEST 1: Navigating to login page...');

    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for any delayed loads

    // Take screenshot
    await page.screenshot({ path: 'diagnostic-01-login-page.png', fullPage: true });

    // Check what loaded
    const hasLoginForm = await page.locator('input[type="email"]').count() > 0;
    const hasPasswordField = await page.locator('input[type="password"]').count() > 0;
    const hasDemoButtons = await page.locator('button').filter({ hasText: /Manager|Server|Kitchen/i }).count();
    const hasSignInButton = await page.locator('button').filter({ hasText: /Sign in/i }).count() > 0;

    const loginPageState = {
      url: page.url(),
      hasLoginForm,
      hasPasswordField,
      hasDemoButtons,
      hasSignInButton,
      title: await page.title()
    };

    console.log('LOGIN PAGE STATE:', JSON.stringify(loginPageState, null, 2));

    // Save automatic network calls
    const authCalls = networkLogs.filter(log =>
      log.url?.includes('auth') ||
      log.url?.includes('login') ||
      log.url?.includes('session') ||
      log.url?.includes('user')
    );

    console.log('AUTOMATIC AUTH CALLS ON PAGE LOAD:', authCalls.length);

    fs.writeFileSync(
      'diagnostic-01-page-load-network.json',
      JSON.stringify({ loginPageState, networkLogs, consoleLogs, errors }, null, 2)
    );
  });

  test('2. Attempt demo button login - Manager', async ({ page }) => {
    console.log('\n🔍 TEST 2: Testing Manager demo button...');

    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Clear previous logs from navigation
    networkLogs = networkLogs.filter(log => !log.url?.includes('vite'));

    // Try clicking Manager demo button
    const managerButton = page.locator('button').filter({ hasText: /Manager/i }).first();
    const isVisible = await managerButton.isVisible();

    console.log('Manager button visible:', isVisible);

    if (isVisible) {
      await managerButton.click();
      await page.waitForTimeout(3000); // Wait for response

      await page.screenshot({ path: 'diagnostic-02-after-demo-click.png', fullPage: true });

      // Find auth-related calls after button click
      const authCalls = networkLogs.filter(log =>
        log.url?.includes('auth') || log.url?.includes('login')
      );

      console.log('DEMO BUTTON NETWORK CALLS:', authCalls.length);
      console.log('CURRENT URL AFTER CLICK:', page.url());

      // Check for error messages
      const errorMessages = await page.locator('[role="alert"], .error, [class*="error"]').allTextContents();
      console.log('ERROR MESSAGES:', errorMessages);

      fs.writeFileSync(
        'diagnostic-02-demo-button-network.json',
        JSON.stringify({ authCalls, consoleLogs, errors, errorMessages, finalUrl: page.url() }, null, 2)
      );
    }
  });

  test('3. Attempt manual email/password login', async ({ page }) => {
    console.log('\n🔍 TEST 3: Testing manual login...');

    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Clear navigation logs
    const beforeLoginCount = networkLogs.length;

    // Fill in test credentials
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.count() > 0) {
      await emailInput.fill('manager@restaurant.com');
      await passwordInput.fill('Demo123!');

      await page.screenshot({ path: 'diagnostic-03-before-submit.png', fullPage: true });

      // Click sign in
      const signInButton = page.locator('button').filter({ hasText: /Sign in/i }).first();
      await signInButton.click();

      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'diagnostic-04-after-submit.png', fullPage: true });

      // Get only the login-related requests/responses
      const loginLogs = networkLogs.slice(beforeLoginCount);

      const loginRequests = loginLogs.filter(log =>
        log.url?.includes('/auth/login') && log.type === 'request'
      );
      const loginResponses = loginLogs.filter(log =>
        log.url?.includes('/auth/login') && log.type === 'response'
      );

      console.log('LOGIN REQUESTS:', loginRequests.length);
      console.log('LOGIN RESPONSES:', loginResponses.length);

      if (loginResponses.length > 0) {
        console.log('LOGIN RESPONSE STATUS:', loginResponses[0].status);
        console.log('LOGIN RESPONSE BODY:', JSON.stringify(loginResponses[0].body, null, 2));
      }

      // Check for error messages
      const errorMessages = await page.locator('[role="alert"], .error, [class*="error"]').allTextContents();
      console.log('ERROR MESSAGES:', errorMessages);

      console.log('FINAL URL:', page.url());

      fs.writeFileSync(
        'diagnostic-03-manual-login-network.json',
        JSON.stringify({
          loginRequests,
          loginResponses,
          allLoginLogs: loginLogs,
          consoleLogs,
          errors,
          errorMessages,
          finalUrl: page.url()
        }, null, 2)
      );
    } else {
      console.log('❌ Email input not found!');
    }
  });

  test('4. Test rate limiter behavior - Multiple attempts', async ({ page }) => {
    console.log('\n🔍 TEST 4: Testing rate limiter...');

    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    const results = [];

    // Attempt login 5 times rapidly
    for (let i = 0; i < 5; i++) {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      await emailInput.fill(`test${i}@test.com`);
      await passwordInput.fill('WrongPassword123!');

      const signInButton = page.locator('button').filter({ hasText: /Sign in/i }).first();
      await signInButton.click();

      await page.waitForTimeout(500);

      // Find the response
      const loginResponse = networkLogs.filter(log =>
        log.url?.includes('/auth/login') && log.type === 'response'
      ).pop();

      if (loginResponse) {
        results.push({
          attempt: i + 1,
          status: loginResponse.status,
          body: loginResponse.body,
          timestamp: loginResponse.timestamp
        });

        console.log(`Attempt ${i + 1}: Status ${loginResponse.status}`);
      }

      // Clear form for next attempt
      await emailInput.clear();
      await passwordInput.clear();
    }

    fs.writeFileSync(
      'diagnostic-04-rate-limiter-test.json',
      JSON.stringify({ results, consoleLogs, errors }, null, 2)
    );
  });

  test.afterAll(async () => {
    console.log('\n📊 Saving complete network log...');

    // Save full network log
    fs.writeFileSync(
      'diagnostic-full-network-log.json',
      JSON.stringify(networkLogs, null, 2)
    );

    console.log('✅ All diagnostic files saved');
    console.log('📁 Files created:');
    console.log('  - diagnostic-01-login-page.png');
    console.log('  - diagnostic-01-page-load-network.json');
    console.log('  - diagnostic-02-after-demo-click.png');
    console.log('  - diagnostic-02-demo-button-network.json');
    console.log('  - diagnostic-03-before-submit.png');
    console.log('  - diagnostic-04-after-submit.png');
    console.log('  - diagnostic-03-manual-login-network.json');
    console.log('  - diagnostic-04-rate-limiter-test.json');
    console.log('  - diagnostic-full-network-log.json');
  });
});
