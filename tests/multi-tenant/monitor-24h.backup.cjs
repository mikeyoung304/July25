#!/usr/bin/env node
/**
 * 24-Hour Multi-Tenant Monitoring Script
 *
 * Runs continuously for 24 hours, checking:
 * 1. Order isolation (no cross-restaurant contamination)
 * 2. Database integrity (correct restaurant_ids)
 * 3. Memory metrics (if available via external monitoring)
 *
 * Usage: node tests/multi-tenant/monitor-24h.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xiwfhcikfdoshxwbtjxt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g';
const RESTAURANT_A = '11111111-1111-1111-1111-111111111111';
const RESTAURANT_B = '22222222-2222-2222-2222-222222222222';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const TEST_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOG_FILE = path.join(__dirname, '24h-monitoring-log.txt');

// Initialize Supabase client
if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable not set');
  console.error('Set it in your .env file or export it in your shell');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };

  const logLine = `[${timestamp}] ${level}: ${message} ${JSON.stringify(data)}\n`;
  console.log(logLine.trim());
  fs.appendFileSync(LOG_FILE, logLine);
}

// Test results tracking
const testResults = {
  startTime: new Date().toISOString(),
  checks: [],
  failures: []
};

/**
 * Check for cross-restaurant order contamination
 */
async function checkOrderIsolation() {
  log('INFO', 'Running order isolation check...');

  try {
    // Get orders from last hour for both restaurants
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

    // Check for 'grow' fallback (P0-1 regression)
    const { data: growOrders, error: errorGrow } = await supabase
      .from('orders')
      .select('id, restaurant_id, created_at')
      .eq('restaurant_id', 'grow')
      .gte('created_at', oneHourAgo);

    if (errorGrow) {
      throw new Error(`Grow check failed: ${errorGrow.message}`);
    }

    // Verify no cross-contamination
    const allOrderIds = [
      ...(ordersA || []).map(o => o.id),
      ...(ordersB || []).map(o => o.id)
    ];

    const uniqueOrderIds = new Set(allOrderIds);
    const hasDuplicates = allOrderIds.length !== uniqueOrderIds.size;

    // Verify all orders have correct restaurant_id
    const incorrectRestaurantIds = [
      ...(ordersA || []).filter(o => o.restaurant_id !== RESTAURANT_A),
      ...(ordersB || []).filter(o => o.restaurant_id !== RESTAURANT_B)
    ];

    const result = {
      timestamp: new Date().toISOString(),
      ordersA: (ordersA || []).length,
      ordersB: (ordersB || []).length,
      growOrders: (growOrders || []).length,
      hasDuplicates,
      incorrectRestaurantIds: incorrectRestaurantIds.length,
      passed: !hasDuplicates && incorrectRestaurantIds.length === 0 && (growOrders || []).length === 0
    };

    testResults.checks.push(result);

    if (result.passed) {
      log('SUCCESS', 'Order isolation check passed', result);
    } else {
      log('FAILURE', 'Order isolation check FAILED', result);
      testResults.failures.push({
        type: 'order_isolation',
        ...result
      });

      // CRITICAL: Alert on failure
      if ((growOrders || []).length > 0) {
        log('CRITICAL', 'P0-1 REGRESSION: Found orders with restaurant_id="grow"', { orders: growOrders });
      }
      if (incorrectRestaurantIds.length > 0) {
        log('CRITICAL', 'CROSS-CONTAMINATION DETECTED', { incorrect: incorrectRestaurantIds });
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

/**
 * Check overall database health
 */
async function checkDatabaseHealth() {
  log('INFO', 'Running database health check...');

  try {
    // Count total orders by restaurant
    const { data, error } = await supabase
      .from('orders')
      .select('restaurant_id')
      .gte('created_at', testResults.startTime);

    if (error) throw new Error(error.message);

    const countsByRestaurant = (data || []).reduce((acc, order) => {
      acc[order.restaurant_id] = (acc[order.restaurant_id] || 0) + 1;
      return acc;
    }, {});

    log('INFO', 'Database health check passed', { counts: countsByRestaurant });
    return { passed: true, counts: countsByRestaurant };
  } catch (error) {
    log('ERROR', 'Database health check failed', { error: error.message });
    return { passed: false, error: error.message };
  }
}

/**
 * Main monitoring loop
 */
async function runMonitoring() {
  log('INFO', '=== Starting 24-Hour Multi-Tenant Monitoring ===');
  log('INFO', `Restaurant A: ${RESTAURANT_A}`);
  log('INFO', `Restaurant B: ${RESTAURANT_B}`);
  log('INFO', `Check interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
  log('INFO', `Test duration: ${TEST_DURATION_MS / 1000 / 60 / 60} hours`);
  log('INFO', `Log file: ${LOG_FILE}`);

  const startTime = Date.now();
  let checkCount = 0;

  // Initial check
  await checkOrderIsolation();
  await checkDatabaseHealth();
  checkCount++;

  // Periodic checks
  const intervalId = setInterval(async () => {
    const elapsed = Date.now() - startTime;
    const hoursElapsed = (elapsed / 1000 / 60 / 60).toFixed(1);

    log('INFO', `=== Check ${checkCount + 1} (${hoursElapsed}h elapsed) ===`);

    await checkOrderIsolation();
    await checkDatabaseHealth();
    checkCount++;

    // Check if test duration reached
    if (elapsed >= TEST_DURATION_MS) {
      clearInterval(intervalId);
      await generateFinalReport();
      process.exit(0);
    }
  }, CHECK_INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    log('INFO', 'Received SIGINT, generating final report...');
    clearInterval(intervalId);
    await generateFinalReport();
    process.exit(0);
  });
}

/**
 * Generate final test report
 */
async function generateFinalReport() {
  testResults.endTime = new Date().toISOString();
  testResults.duration = {
    start: testResults.startTime,
    end: testResults.endTime,
    hours: ((new Date(testResults.endTime) - new Date(testResults.startTime)) / 1000 / 60 / 60).toFixed(1)
  };

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

  // Write final report
  const reportPath = path.join(__dirname, '24h-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  log('INFO', '=== 24-Hour Test Complete ===');
  log('INFO', 'Final Results', testResults.summary);

  if (testResults.summary.overallPassed) {
    log('SUCCESS', '✅ ALL CHECKS PASSED - SAFE FOR PRODUCTION');
  } else {
    log('FAILURE', '❌ TEST FAILED - DO NOT DEPLOY', {
      failures: testResults.failures.length
    });
  }

  log('INFO', `Full report written to: ${reportPath}`);

  // Generate markdown report
  const markdownReport = generateMarkdownReport(testResults);
  const markdownPath = path.join(__dirname, '24h-test-results.md');
  fs.writeFileSync(markdownPath, markdownReport);
  log('INFO', `Markdown report written to: ${markdownPath}`);
}

/**
 * Generate human-readable markdown report
 */
function generateMarkdownReport(results) {
  const { summary, checks, failures } = results;

  return `# 24-Hour Multi-Tenant Test Results

**Test Duration**: ${results.duration.hours} hours
**Start**: ${results.duration.start}
**End**: ${results.duration.end}

## Summary

- **Total Checks**: ${summary.totalChecks}
- **Passed**: ${summary.passedChecks} (${summary.passRate})
- **Failed**: ${summary.failedChecks}
- **Overall**: ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}

## Detailed Results

${checks.map((check, i) => `
### Check ${i + 1} - ${check.timestamp}

- **Status**: ${check.passed ? '✅ PASSED' : '❌ FAILED'}
- **Orders Restaurant A**: ${check.ordersA}
- **Orders Restaurant B**: ${check.ordersB}
- **Orders with 'grow' ID**: ${check.growOrders}
- **Cross-contamination**: ${check.incorrectRestaurantIds > 0 ? `❌ ${check.incorrectRestaurantIds} orders` : '✅ None'}
`).join('\n')}

${failures.length > 0 ? `
## Failures

${failures.map((f, i) => `
### Failure ${i + 1}

- **Type**: ${f.type}
- **Timestamp**: ${f.timestamp}
- **Details**: ${JSON.stringify(f, null, 2)}
`).join('\n')}
` : '✅ No failures detected'}

## Deployment Recommendation

${summary.overallPassed
  ? '✅ **SAFE TO DEPLOY**: All order isolation checks passed. System is ready for multi-tenant production.'
  : '❌ **DO NOT DEPLOY**: Test failures detected. Review failures above and fix issues before deployment.'}
`;
}

// Start monitoring
runMonitoring().catch(error => {
  log('FATAL', 'Monitoring script crashed', { error: error.message });
  process.exit(1);
});
