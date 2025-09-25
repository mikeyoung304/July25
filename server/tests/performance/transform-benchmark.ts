/**
 * Performance Benchmark for Case Transformation
 * Measures overhead of snake_case to camelCase transformations
 */

import { camelizeKeys, snakeizeKeys } from '../../src/utils/case';
import { performance } from 'perf_hooks';
import { logger } from '../../src/utils/logger';

const benchLogger = logger.child({ module: 'transform-benchmark' });

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  opsPerSecond: number;
  memoryUsed: number;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Sample data structures
const sampleOrder = {
  id: 'order-123',
  order_number: 'ORD-001',
  restaurant_id: 'rest-456',
  customer_name: 'John Doe',
  table_number: '5',
  total_amount: 45.50,
  payment_status: 'pending',
  created_at: '2025-09-24T10:00:00Z',
  updated_at: '2025-09-24T10:00:00Z',
  items: Array.from({ length: 10 }, (_, i) => ({
    id: `item-${i}`,
    menu_item_id: `menu-${i}`,
    unit_price: 12.50,
    quantity: 2,
    special_instructions: 'No onions',
    modifiers: [
      { modifier_id: `mod-${i}-1`, modifier_name: 'Extra cheese', price_adjustment: 2.00 },
      { modifier_id: `mod-${i}-2`, modifier_name: 'Large', price_adjustment: 3.00 }
    ]
  }))
};

const sampleMenuItems = Array.from({ length: 50 }, (_, i) => ({
  id: `menu-${i}`,
  restaurant_id: 'rest-456',
  item_name: `Item ${i}`,
  item_description: 'Delicious food item with lots of flavor',
  item_price: 10 + i,
  category_id: `cat-${Math.floor(i / 10)}`,
  is_available: true,
  preparation_time: 15,
  allergen_info: ['gluten', 'dairy'],
  nutritional_info: {
    calories: 500,
    protein_grams: 25,
    fat_grams: 20,
    carb_grams: 40
  },
  created_at: '2025-09-24T10:00:00Z',
  updated_at: '2025-09-24T10:00:00Z'
}));

const sampleTables = Array.from({ length: 20 }, (_, i) => ({
  id: `table-${i}`,
  restaurant_id: 'rest-456',
  table_number: `${i + 1}`,
  seat_capacity: 4,
  is_occupied: i % 3 === 0,
  current_order_id: i % 3 === 0 ? `order-${i}` : null,
  x_position: i * 100,
  y_position: Math.floor(i / 5) * 100,
  table_shape: 'rectangle',
  created_at: '2025-09-24T10:00:00Z',
  updated_at: '2025-09-24T10:00:00Z'
}));

async function benchmark(
  name: string,
  data: any,
  operation: (data: any) => any,
  iterations: number = 5000
): Promise<BenchmarkResult> {
  // Warm up
  for (let i = 0; i < 100; i++) {
    operation(data);
  }

  // Measure memory before
  const memBefore = process.memoryUsage().heapUsed;

  // Run benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    operation(data);
  }
  const end = performance.now();

  // Measure memory after
  const memAfter = process.memoryUsage().heapUsed;

  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const opsPerSecond = 1000 / avgTime;

  return {
    operation: name,
    iterations,
    totalTime,
    avgTime,
    opsPerSecond,
    memoryUsed: memAfter - memBefore
  };
}

async function runBenchmarks() {
  benchLogger.info('🚀 Running Case Transformation Benchmarks\n');
  benchLogger.info('=' .repeat(80));

  const results: BenchmarkResult[] = [];

  // Benchmark single order transformation
  results.push(await benchmark(
    'Single Order (snake → camel)',
    sampleOrder,
    (data) => camelizeKeys(data)
  ));

  // Benchmark menu items array transformation
  results.push(await benchmark(
    'Menu Items Array[50] (snake → camel)',
    sampleMenuItems,
    (data) => camelizeKeys(data)
  ));

  // Benchmark tables array transformation
  results.push(await benchmark(
    'Tables Array[20] (snake → camel)',
    sampleTables,
    (data) => camelizeKeys(data)
  ));

  // Benchmark reverse transformation
  const camelOrder = camelizeKeys(sampleOrder);
  results.push(await benchmark(
    'Single Order (camel → snake)',
    camelOrder,
    (data) => snakeizeKeys(data)
  ));

  // Large batch transformation
  const largeBatch = {
    orders: Array.from({ length: 100 }, () => ({ ...sampleOrder })),
    menu_items: sampleMenuItems,
    tables: sampleTables
  };
  results.push(await benchmark(
    'Large Batch (orders[100] + menu[50] + tables[20])',
    largeBatch,
    (data) => camelizeKeys(data),
    1000 // Fewer iterations for large batch
  ));

  // Print results table
  benchLogger.info('\n📊 Benchmark Results\n');
  benchLogger.info('Operation'.padEnd(50) + 'Iterations'.padEnd(12) + 'Avg Time'.padEnd(12) + 'Ops/Sec'.padEnd(12) + 'Memory');
  benchLogger.info('-'.repeat(98));

  for (const result of results) {
    benchLogger.info(
      result.operation.padEnd(50) +
      formatNumber(result.iterations).padEnd(12) +
      `${result.avgTime.toFixed(4)}ms`.padEnd(12) +
      formatNumber(Math.round(result.opsPerSecond)).padEnd(12) +
      formatBytes(result.memoryUsed)
    );
  }

  // Calculate and display summary statistics
  benchLogger.info('\n📈 Summary Statistics\n');
  benchLogger.info('-'.repeat(80));

  const avgOpsPerSec = results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length;
  const totalMemory = results.reduce((sum, r) => sum + r.memoryUsed, 0);

  benchLogger.info(`Average Operations/Second: ${formatNumber(Math.round(avgOpsPerSec))}`);
  benchLogger.info(`Total Memory Used: ${formatBytes(totalMemory)}`);

  // Performance targets
  benchLogger.info('\n✅ Performance Targets\n');
  benchLogger.info('-'.repeat(80));

  const singleOrderTarget = 0.5; // 0.5ms per order
  const arrayTarget = 5; // 5ms for 50 items

  const singleOrderResult = results.find(r => r.operation.includes('Single Order'));
  const arrayResult = results.find(r => r.operation.includes('Menu Items'));

  if (singleOrderResult) {
    const passed = singleOrderResult.avgTime < singleOrderTarget;
    benchLogger.info(
      `Single Order Transform: ${singleOrderResult.avgTime.toFixed(4)}ms ` +
      `(Target: <${singleOrderTarget}ms) ${passed ? '✅ PASS' : '❌ FAIL'}`
    );
  }

  if (arrayResult) {
    const passed = arrayResult.avgTime < arrayTarget;
    benchLogger.info(
      `Array[50] Transform: ${arrayResult.avgTime.toFixed(4)}ms ` +
      `(Target: <${arrayTarget}ms) ${passed ? '✅ PASS' : '❌ FAIL'}`
    );
  }

  // Memory pressure test
  benchLogger.info('\n💾 Memory Pressure Test\n');
  benchLogger.info('-'.repeat(80));

  const memBefore = process.memoryUsage().heapUsed;

  // Transform 10,000 orders
  const hugeDataset = Array.from({ length: 10000 }, () => ({ ...sampleOrder }));
  const transformed = camelizeKeys(hugeDataset);

  const memAfter = process.memoryUsage().heapUsed;
  const memUsed = memAfter - memBefore;

  benchLogger.info(`Transforming 10,000 orders used: ${formatBytes(memUsed)}`);
  benchLogger.info(`Memory per order: ${(memUsed / 10000 / 1024).toFixed(2)} KB`);

  // GC pressure test
  if (global.gc) {
    global.gc();
    const memAfterGC = process.memoryUsage().heapUsed;
    const memReclaimed = memAfter - memAfterGC;
    benchLogger.info(`Memory reclaimed by GC: ${formatBytes(memReclaimed)}`);
  } else {
    benchLogger.info('(Run with --expose-gc flag to measure GC impact)');
  }

  benchLogger.info('\n' + '='.repeat(80));
  benchLogger.info('✨ Benchmark Complete\n');
}

// Run benchmarks
runBenchmarks().catch((err) => benchLogger.error('Benchmark failed:', err));