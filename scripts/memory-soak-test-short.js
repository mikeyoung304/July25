#!/usr/bin/env node

/**
 * Short Memory Soak Test (5 minutes for PR demo)
 */

const TEST_DURATION = 5 * 60 * 1000; // 5 minutes
const SAMPLE_INTERVAL = 30 * 1000; // Sample every 30 seconds

const measurements = [];

function measureMemory() {
  const memUsage = process.memoryUsage();
  return {
    timestamp: Date.now(),
    heapUsed: memUsage.heapUsed,
    heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2)
  };
}

function calculateGrowthRate(measurements) {
  if (measurements.length < 2) return 0;
  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const timeDiffHours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
  if (timeDiffHours === 0) return 0;
  const memoryDiffMB = (last.heapUsed - first.heapUsed) / (1024 * 1024);
  return memoryDiffMB / timeDiffHours; // MB per hour
}

console.log('🧪 Starting 5-minute memory soak test');
console.log(`⏰ Test will complete at: ${new Date(Date.now() + TEST_DURATION).toLocaleTimeString()}\n`);

// Initial measurement
measurements.push(measureMemory());
console.log(`[${new Date().toLocaleTimeString()}] Initial: ${measurements[0].heapUsedMB} MB`);

// Sample periodically
const interval = setInterval(() => {
  const m = measureMemory();
  measurements.push(m);
  const rate = calculateGrowthRate(measurements);
  console.log(`[${new Date().toLocaleTimeString()}] Current: ${m.heapUsedMB} MB | Growth rate: ${rate.toFixed(2)} MB/hr`);
}, SAMPLE_INTERVAL);

// Run test
setTimeout(() => {
  clearInterval(interval);

  const finalM = measureMemory();
  measurements.push(finalM);

  const growthRate = calculateGrowthRate(measurements);
  const passed = growthRate < 10;

  console.log('\n📊 Results:');
  console.log('===========');
  console.log(`Samples: ${measurements.length}`);
  console.log(`Start: ${measurements[0].heapUsedMB} MB`);
  console.log(`End: ${finalM.heapUsedMB} MB`);
  console.log(`Growth: ${(finalM.heapUsed - measurements[0].heapUsed) / 1024 / 1024} MB`);
  console.log(`Rate: ${growthRate.toFixed(2)} MB/hr`);
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'} (target: <10MB/hr)`);

  process.exit(passed ? 0 : 1);
}, TEST_DURATION);