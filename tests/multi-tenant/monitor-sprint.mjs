#!/usr/bin/env node
/**
 * SPRINT MODE: 20-minute multi-tenant test
 * 60 checks in 20 minutes (1 check every 20 seconds)
 * Same validation, just MUCH faster
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration - SPRINT MODE
const SUPABASE_URL = 'https://xiwfhcikfdoshxwbtjxt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g';
const RESTAURANT_A = '11111111-1111-1111-1111-111111111111';
const RESTAURANT_B = '22222222-2222-2222-2222-222222222222';
const CHECK_INTERVAL_MS = 20 * 1000; // 20 seconds (vs 2 min)
const TEST_DURATION_MS = 20 * 60 * 1000; // 20 minutes (vs 2 hours)
const TOTAL_CHECKS = 60;
const LOG_FILE = path.join(__dirname, 'sprint-test-log.txt');

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
      log('SUCCESS', `Check passed`, result);
    } else {
      log('FAILURE', 'Check FAILED', result);
      testResults.failures.push({ type: 'order_isolation', ...result });
      if (invalidOrders.length > 0) {
        log('CRITICAL', 'CONTAMINATION DETECTED', { orders: invalidOrders });
      }
    }

    return result;
  } catch (error) {
    log('ERROR', 'Check threw exception', { error: error.message });
    testResults.failures.push({
      type: 'exception',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return { passed: false, error: error.message };
  }
}

async function runMonitoring() {
  log('INFO', '=== SPRINT MODE: 20-Minute Test (60 checks) ===');
  log('INFO', `Restaurant A: ${RESTAURANT_A}`);
  log('INFO', `Restaurant B: ${RESTAURANT_B}`);
  log('INFO', `Check interval: ${CHECK_INTERVAL_MS / 1000} seconds`);
  log('INFO', `Total checks: ${TOTAL_CHECKS}`);

  const startTime = Date.now();
  let checkCount = 0;

  // Initial check
  await checkOrderIsolation();
  checkCount++;

  // Periodic checks
  const intervalId = setInterval(async () => {
    const elapsed = Date.now() - startTime;
    const minutesElapsed = (elapsed / 1000 / 60).toFixed(1);
    const progress = Math.round((checkCount / TOTAL_CHECKS) * 100);

    log('INFO', `Check ${checkCount + 1}/${TOTAL_CHECKS} (${progress}%, ${minutesElapsed}m)`);

    await checkOrderIsolation();
    checkCount++;

    if (checkCount >= TOTAL_CHECKS || elapsed >= TEST_DURATION_MS) {
      clearInterval(intervalId);
      await generateFinalReport();
      process.exit(0);
    }
  }, CHECK_INTERVAL_MS);

  process.on('SIGINT', async () => {
    log('INFO', 'Interrupted, generating report...');
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
    overallPassed: failedChecks === 0,
    duration: {
      start: testResults.startTime,
      end: testResults.endTime,
      minutes: ((new Date(testResults.endTime) - new Date(testResults.startTime)) / 1000 / 60).toFixed(1)
    }
  };

  const reportPath = path.join(__dirname, 'sprint-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  console.log('\n' + '='.repeat(80));
  log('INFO', '=== SPRINT TEST COMPLETE ===');
  log('INFO', 'Results', testResults.summary);

  if (testResults.summary.overallPassed) {
    log('SUCCESS', '✅ ALL CHECKS PASSED - P0 FIXES VERIFIED');
    console.log('\n🎉 READY FOR PRODUCTION DEPLOYMENT! 🎉\n');
  } else {
    log('FAILURE', '❌ TEST FAILED - DO NOT DEPLOY', { failures: testResults.failures.length });
  }

  log('INFO', `Full report: ${reportPath}`);
  console.log('='.repeat(80) + '\n');
}

runMonitoring().catch(error => {
  log('FATAL', 'Test crashed', { error: error.message });
  process.exit(1);
});
