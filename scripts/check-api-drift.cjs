#!/usr/bin/env node

/**
 * API Drift Detection
 *
 * Compares documented API endpoints in docs/reference/api/openapi.yaml
 * with actual route files in server/src/routes/*.ts
 *
 * Exit codes:
 * - 0: No drift detected
 * - 1: Drift detected or error
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const OPENAPI_PATH = path.join(__dirname, '../docs/reference/api/openapi.yaml');
const ROUTES_DIR = path.join(__dirname, '../server/src/routes');

// Parse OpenAPI spec for endpoints
function parseDocumentedEndpoints() {
  try {
    const content = fs.readFileSync(OPENAPI_PATH, 'utf-8');
    const spec = yaml.load(content);

    const endpoints = [];

    Object.keys(spec.paths || {}).forEach(path => {
      const methods = Object.keys(spec.paths[path]).filter(m =>
        ['get', 'post', 'put', 'patch', 'delete'].includes(m)
      );

      methods.forEach(method => {
        const operation = spec.paths[path][method];
        endpoints.push({
          path,
          method: method.toUpperCase(),
          deprecated: operation.deprecated || false,
          summary: operation.summary || '',
          tags: operation.tags || []
        });
      });
    });

    return endpoints;
  } catch (error) {
    console.error(`❌ Failed to parse OpenAPI spec: ${error.message}`);
    process.exit(1);
  }
}

// Parse route files for actual endpoints
function parseActualEndpoints() {
  const endpoints = [];

  if (!fs.existsSync(ROUTES_DIR)) {
    console.error(`❌ Routes directory not found: ${ROUTES_DIR}`);
    process.exit(1);
  }

  const routeFiles = fs.readdirSync(ROUTES_DIR)
    .filter(f => f.endsWith('.ts') || f.endsWith('.routes.ts'));

  routeFiles.forEach(file => {
    const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf-8');

    // Match router.get/post/put/patch/delete patterns
    const routeRegex = /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      let routePath = match[2];

      // Convert Express params to OpenAPI format
      routePath = routePath.replace(/:(\w+)/g, '{$1}');

      // Skip WebSocket upgrade endpoints
      if (routePath.includes('upgrade') || content.includes('ws.handleUpgrade')) {
        continue;
      }

      endpoints.push({
        method,
        path: routePath,
        file
      });
    }
  });

  return endpoints;
}

// Normalize paths for comparison
function normalizePath(path) {
  // Remove base path prefixes
  return path
    .replace(/^\/api\/v\d+/, '')
    .replace(/^\/api/, '')
    .replace(/\/$/, ''); // Remove trailing slash
}

// Check for drift
function checkDrift() {
  console.log('🔍 Checking API drift...\n');

  const documented = parseDocumentedEndpoints();
  const actual = parseActualEndpoints();

  let driftCount = 0;

  // Build lookup maps
  const docMap = new Map();
  documented.forEach(ep => {
    const key = `${ep.method} ${normalizePath(ep.path)}`;
    docMap.set(key, ep);
  });

  const actualMap = new Map();
  actual.forEach(ep => {
    const key = `${ep.method} ${normalizePath(ep.path)}`;
    actualMap.set(key, ep);
  });

  // Check for undocumented endpoints
  console.log('📝 Checking for undocumented endpoints...\n');

  actualMap.forEach((ep, key) => {
    if (!docMap.has(key)) {
      console.log(`⚠️  UNDOCUMENTED ENDPOINT: ${ep.method} ${ep.path}`);
      console.log(`   Found in: ${ep.file}`);
      console.log(`   Action: Add to openapi.yaml\n`);
      driftCount++;
    }
  });

  // Check for documented but non-existent endpoints (excluding deprecated)
  console.log('📝 Checking for obsolete documentation...\n');

  let obsoleteCount = 0;
  docMap.forEach((ep, key) => {
    if (!actualMap.has(key) && !ep.deprecated) {
      console.log(`⚠️  DOCUMENTED BUT NOT IMPLEMENTED: ${ep.method} ${ep.path}`);
      console.log(`   Summary: ${ep.summary}`);
      console.log(`   Action: Remove from openapi.yaml or mark as deprecated\n`);
      obsoleteCount++;
    }
  });

  // Check enum consistency (order status, payment status, etc.)
  console.log('📝 Checking enum consistency...\n');

  const enumChecks = checkEnumConsistency();
  if (enumChecks > 0) {
    driftCount += enumChecks;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Total endpoints documented: ${documented.length}`);
  console.log(`Total endpoints implemented: ${actual.length}`);
  console.log(`Undocumented endpoints: ${driftCount}`);
  console.log(`Obsolete docs: ${obsoleteCount}`);
  console.log('='.repeat(60) + '\n');

  if (driftCount === 0 && obsoleteCount === 0) {
    console.log('✅ No API drift detected\n');
    return 0;
  } else {
    console.log(`❌ Found ${driftCount + obsoleteCount} API drift issue(s)\n`);
    console.log('Action required:');
    console.log('1. Update docs/reference/api/openapi.yaml');
    console.log('2. Add missing endpoint definitions');
    console.log('3. Remove or mark deprecated endpoints');
    return 1;
  }
}

// Check enum consistency between OpenAPI and database
function checkEnumConsistency() {
  let issues = 0;

  try {
    const content = fs.readFileSync(OPENAPI_PATH, 'utf-8');
    const spec = yaml.load(content);

    // Check order status enum
    const orderSchema = spec.components?.schemas?.Order;
    if (orderSchema) {
      const statusEnum = orderSchema.properties?.status?.enum;
      const expectedStatuses = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'];

      if (statusEnum && JSON.stringify(statusEnum.sort()) !== JSON.stringify(expectedStatuses.sort())) {
        console.log(`⚠️  ORDER STATUS ENUM MISMATCH`);
        console.log(`   OpenAPI: [${statusEnum.join(', ')}]`);
        console.log(`   Expected: [${expectedStatuses.join(', ')}]`);
        console.log(`   Action: Update openapi.yaml Order.status enum\n`);
        issues++;
      }
    }

    // Check payment status enum
    if (orderSchema) {
      const paymentStatusEnum = orderSchema.properties?.payment_status?.enum;
      const expectedPaymentStatuses = ['unpaid', 'paid', 'failed', 'refunded'];

      if (paymentStatusEnum && JSON.stringify(paymentStatusEnum.sort()) !== JSON.stringify(expectedPaymentStatuses.sort())) {
        console.log(`⚠️  PAYMENT STATUS ENUM MISMATCH`);
        console.log(`   OpenAPI: [${paymentStatusEnum.join(', ')}]`);
        console.log(`   Expected: [${expectedPaymentStatuses.join(', ')}]`);
        console.log(`   Action: Update openapi.yaml Order.payment_status enum\n`);
        issues++;
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not verify enum consistency: ${error.message}\n`);
  }

  return issues;
}

// Run
try {
  // Check if js-yaml is available
  try {
    require('js-yaml');
  } catch (e) {
    console.error('❌ Missing dependency: js-yaml');
    console.error('Run: npm install js-yaml');
    process.exit(1);
  }

  process.exit(checkDrift());
} catch (error) {
  console.error('❌ Error checking API drift:', error.message);
  console.error(error.stack);
  process.exit(1);
}
