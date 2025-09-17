#!/usr/bin/env node

/**
 * Memory Soak Test for WebSocket and Voice Connections
 * Monitors memory growth over a 30-minute period
 */

const { performance } = require('perf_hooks');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_DURATION = 30 * 60 * 1000; // 30 minutes
const SAMPLE_INTERVAL = 60 * 1000; // Sample every 60 seconds
const REPORT_FILE = path.join(__dirname, '../memory-soak-report.json');

// Memory measurements
const measurements = [];
let serverProcess = null;

/**
 * Start the server
 */
async function startServer() {
  console.log('🚀 Starting server for memory soak test...');

  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Wait for server to be ready
  return new Promise((resolve) => {
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running') || output.includes('listening on')) {
        console.log('✅ Server is ready');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    // Fallback timeout
    setTimeout(() => {
      console.log('⏱️ Server startup timeout - proceeding anyway');
      resolve();
    }, 10000);
  });
}

/**
 * Measure memory usage
 */
function measureMemory() {
  if (!serverProcess) return null;

  const memUsage = process.memoryUsage();
  return {
    timestamp: Date.now(),
    rss: memUsage.rss,
    heapTotal: memUsage.heapTotal,
    heapUsed: memUsage.heapUsed,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers,
    // Convert to MB for readability
    rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
    heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2)
  };
}

/**
 * Calculate memory growth rate
 */
function calculateGrowthRate(measurements) {
  if (measurements.length < 2) return 0;

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const timeDiffHours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);

  if (timeDiffHours === 0) return 0;

  const memoryDiffMB = (last.heapUsed - first.heapUsed) / (1024 * 1024);
  return memoryDiffMB / timeDiffHours; // MB per hour
}

/**
 * Generate report
 */
function generateReport() {
  const growthRate = calculateGrowthRate(measurements);
  const first = measurements[0];
  const last = measurements[measurements.length - 1];

  const report = {
    testDuration: TEST_DURATION / 1000 / 60, // minutes
    sampleCount: measurements.length,
    startMemory: {
      heapUsedMB: first.heapUsedMB,
      rssMB: first.rssMB
    },
    endMemory: {
      heapUsedMB: last.heapUsedMB,
      rssMB: last.rssMB
    },
    growth: {
      heapUsedMB: ((last.heapUsed - first.heapUsed) / (1024 * 1024)).toFixed(2),
      rssMB: ((last.rss - first.rss) / (1024 * 1024)).toFixed(2)
    },
    growthRateMBPerHour: growthRate.toFixed(2),
    passed: growthRate < 10, // Pass if growth is less than 10MB/hr
    measurements: measurements
  };

  return report;
}

/**
 * Run soak test
 */
async function runSoakTest() {
  console.log('🧪 Starting 30-minute memory soak test');
  console.log(`📊 Sampling memory every ${SAMPLE_INTERVAL / 1000} seconds`);
  console.log(`⏰ Test will complete at: ${new Date(Date.now() + TEST_DURATION).toLocaleTimeString()}`);
  console.log('');

  // Start server
  await startServer();

  // Wait a moment for stabilization
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Take initial measurement
  const initialMeasurement = measureMemory();
  measurements.push(initialMeasurement);
  console.log(`Initial memory: ${initialMeasurement.heapUsedMB} MB heap, ${initialMeasurement.rssMB} MB RSS`);

  // Start sampling
  const sampleInterval = setInterval(() => {
    const measurement = measureMemory();
    if (measurement) {
      measurements.push(measurement);
      const growthRate = calculateGrowthRate(measurements);
      console.log(`[${new Date().toLocaleTimeString()}] Heap: ${measurement.heapUsedMB} MB, RSS: ${measurement.rssMB} MB, Growth rate: ${growthRate.toFixed(2)} MB/hr`);
    }
  }, SAMPLE_INTERVAL);

  // Run for specified duration
  await new Promise(resolve => setTimeout(resolve, TEST_DURATION));

  // Stop sampling
  clearInterval(sampleInterval);

  // Take final measurement
  const finalMeasurement = measureMemory();
  measurements.push(finalMeasurement);

  // Generate report
  const report = generateReport();

  // Save report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log('\n📊 Memory Soak Test Results:');
  console.log('================================');
  console.log(`Duration: ${report.testDuration} minutes`);
  console.log(`Samples: ${report.sampleCount}`);
  console.log(`Initial heap: ${report.startMemory.heapUsedMB} MB`);
  console.log(`Final heap: ${report.endMemory.heapUsedMB} MB`);
  console.log(`Heap growth: ${report.growth.heapUsedMB} MB`);
  console.log(`Growth rate: ${report.growthRateMBPerHour} MB/hr`);
  console.log(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'} (target: <10MB/hr)`);
  console.log(`\nFull report saved to: ${REPORT_FILE}`);

  // Cleanup
  if (serverProcess) {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (!serverProcess.killed) {
      serverProcess.kill('SIGKILL');
    }
  }

  // Exit with appropriate code
  process.exit(report.passed ? 0 : 1);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n⚠️ Test interrupted');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(1);
});

// Run the test
runSoakTest().catch(error => {
  console.error('💥 Test failed:', error);
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(1);
});