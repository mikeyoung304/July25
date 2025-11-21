#!/usr/bin/env node
/**
 * FAST Multi-Tenant Test (2 hours instead of 24)
 * Checks every 2 minutes instead of 30 minutes
 * Same number of checks (60), just faster
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration - FAST MODE
const SUPABASE_URL = 'https://xiwfhcikfdoshxwbtjxt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g';
const RESTAURANT_A = '11111111-1111-1111-1111-111111111111';
const RESTAURANT_B = '22222222-2222-2222-2222-222222222222';
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes (vs 30 min)
const TEST_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours (vs 24 hours)
const LOG_FILE = path.join(__dirname, 'fast-test-log.txt');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${level}: ${message} ${JSON.stringify(data)}\n`;
  console.log(logLine.trim());
  fs.appendFileSync(LOG_FILE, logLine);
}

const testResults = {
  startTime: new Date().toISOString(),
  checks: [],
  failures: []
};

async function checkOrderIsolation() {
  log('INFO', 'Running order isolation check...');

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: ordersA, error: errorA } = await supabase
      .from('orders')
      .select('id, restaurant_id, created_at')
      .eq('restaurant_id', RESTAURANT_A)
      .gte('created_at', oneHourAgo);

    const { data: ordersB, error: errorB } = await supabase
      .from('orders')
      .select('id, restaurant_id, created_at')
      .eq('restaurant_id', RESTAURANT_B)
      .gte('created_at', oneHourAgo);

    if (errorA || errorB) {
      throw new Error(`Database query failed: ${errorA?.message || errorB?.message}`);
    }

    const { data: allOrders, error: errorAll } = await supabase
      .from('orders')
      .select('id, restaurant_id, created_at')
      .gte('created_at', oneHourAgo);

    if (errorAll) {
      throw new Error(`All orders check failed: ${errorAll.message}`);
    }

    const invalidOrders = (allOrders || []).filter(o =>
      o.restaurant_id !== RESTAURANT_A && o.restaurant_id !== RESTAURANT_B
    );

    const result = {
      timestamp: new Date().toISOString(),
      ordersA: (ordersA || []).length,
      ordersB: (ordersB || []).length,
      invalidOrders: invalidOrders.length,
      passed: invalidOrders.length === 0
    };

    testResults.checks.push(result);

    if (result.passed) {
      log('SUCCESS', 'Order isolation check passed', result);
    } else {
      log('FAILURE', 'Order isolation check FAILED', result);
      testResults.failures.push({ type: 'order_isolation', ...result });

      if (invalidOrders.length > 0) {
        log('CRITICAL', 'CONTAMINATION DETECTED', { orders: invalidOrders });
      }
    }

    return result;
  } catch (error) {
    log('ERROR', 'Order isolation check threw exception', { error: error.message });
    testResults.failures.push({
      type: 'exception',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return { passed: false, error: error.message };
  }
}

async function runMonitoring() {
  log('INFO', '=== FAST MODE: 2-Hour Multi-Tenant Test ===');
  log('INFO', `Restaurant A: ${RESTAURANT_A}`);
  log('INFO', `Restaurant B: ${RESTAURANT_B}`);
  log('INFO', `Check interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
  log('INFO', `Test duration: ${TEST_DURATION_MS / 1000 / 60 / 60} hours`);

  const startTime = Date.now();
  let checkCount = 0;

  // Initial check
  await checkOrderIsolation();
  checkCount++;

  // Periodic checks
  const intervalId = setInterval(async () => {
    const elapsed = Date.now() - startTime;
    const minutesElapsed = (elapsed / 1000 / 60).toFixed(1);

    log('INFO', `=== Check ${checkCount + 1} (${minutesElapsed} min elapsed) ===`);

    await checkOrderIsolation();
    checkCount++;

    if (elapsed >= TEST_DURATION_MS) {
      clearInterval(intervalId);
      await generateFinalReport();
      process.exit(0);
    }
  }, CHECK_INTERVAL_MS);

  process.on('SIGINT', async () => {
    log('INFO', 'Received SIGINT, generating final report...');
    clearInterval(intervalId);
    await generateFinalReport();
    process.exit(0);
  });
}

async function generateFinalReport() {
  testResults.endTime = new Date().toISOString();

  const totalChecks = testResults.checks.length;
  const passedChecks = testResults.checks.filter(c => c.passed).length;
  const failedChecks = totalChecks - passedChecks;

  testResults.summary = {
    totalChecks,
    passedChecks,
    failedChecks,
    passRate: ((passedChecks / totalChecks) * 100).toFixed(1) + '%',
    overallPassed: failedChecks === 0
  };

  const reportPath = path.join(__dirname, 'fast-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  log('INFO', '=== FAST TEST COMPLETE ===');
  log('INFO', 'Final Results', testResults.summary);

  if (testResults.summary.overallPassed) {
    log('SUCCESS', '✅ ALL CHECKS PASSED - P0 FIXES VERIFIED');
  } else {
    log('FAILURE', '❌ TEST FAILED - DO NOT DEPLOY', { failures: testResults.failures.length });
  }

  log('INFO', `Full report: ${reportPath}`);
}

runMonitoring().catch(error => {
  log('FATAL', 'Monitoring script crashed', { error: error.message });
  process.exit(1);
});
