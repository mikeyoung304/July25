#!/usr/bin/env tsx

/**
 * API Route Scanner
 *
 * Scans all route files in server/src/routes/ and extracts endpoint definitions.
 * Generates a JSON inventory of all API routes for validation against OpenAPI spec.
 *
 * Usage: npm run docs:scan-routes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  fullPath: string; // Full path including mount prefix
  file: string;
  line: number;
  middleware: string[];
  isDev: boolean;
  isTest: boolean;
}

interface ScanResult {
  totalRoutes: number;
  productionRoutes: number;
  devRoutes: number;
  testRoutes: number;
  routes: RouteDefinition[];
  scannedFiles: number;
  timestamp: string;
}

const ROUTES_DIR = path.join(__dirname, '../server/src/routes');
const OUTPUT_FILE = path.join(__dirname, '../docs/investigations/api-route-inventory.json');

/**
 * Check if a route is development-only
 */
function isDevelopmentRoute(routePath: string, content: string): boolean {
  // Check for test- prefix
  if (routePath.includes('/test-') || routePath.startsWith('test-')) {
    return true;
  }

  // Check for NODE_ENV checks around the route
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(routePath)) {
      // Check previous 5 lines for NODE_ENV check
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (lines[j].includes('NODE_ENV') && lines[j].includes('development')) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if a route is test-only
 */
function isTestRoute(routePath: string): boolean {
  return routePath.includes('/test/') ||
         routePath.startsWith('/test') ||
         routePath.includes('test-error') ||
         routePath.includes('test-tts') ||
         routePath.includes('test-transcribe');
}

/**
 * Extract middleware from route definition
 */
function extractMiddleware(line: string): string[] {
  const middleware: string[] = [];

  // Common middleware patterns
  const patterns = [
    'authenticate',
    'validateRestaurantAccess',
    'requireScopes',
    'rateLimiter',
    'transcriptionLimiter',
    'trackAIMetrics',
    'validateClientFlow'
  ];

  for (const pattern of patterns) {
    if (line.includes(pattern)) {
      middleware.push(pattern);
    }
  }

  return middleware;
}

/**
 * Get mount prefix for a route file based on filename
 */
function getMountPrefix(fileName: string): string {
  // Based on server/src/routes/index.ts mounting
  const prefixMap: { [key: string]: string } = {
    'health.routes.ts': '',
    'metrics.ts': '',
    'auth.routes.ts': '/auth',
    'security.routes.ts': '/security',
    'menu.routes.ts': '/menu',
    'orders.routes.ts': '/orders',
    'payments.routes.ts': '/payments',
    'terminal.routes.ts': '/terminal',
    'tables.routes.ts': '/tables',
    'ai.routes.ts': '/ai',
    'restaurants.routes.ts': '/restaurants',
    'realtime.routes.ts': '/realtime',
    'webhook.routes.ts': '/webhooks'
  };

  return prefixMap[fileName] || '';
}

/**
 * Scan a single route file
 */
function scanRouteFile(filePath: string): RouteDefinition[] {
  const routes: RouteDefinition[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);
  const mountPrefix = getMountPrefix(fileName);

  // Regex to match route definitions
  // Matches: router.get('/path', ...) or router.post('/path', ...)
  const routeRegex = /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g;

  lines.forEach((line, index) => {
    const matches = [...line.matchAll(routeRegex)];

    for (const match of matches) {
      const method = match[1].toUpperCase() as RouteDefinition['method'];
      const routePath = match[2];

      // Skip if already added (sometimes there are multiple matches on same line)
      if (routes.some(r => r.path === routePath && r.method === method && r.line === index + 1)) {
        continue;
      }

      const middleware = extractMiddleware(line);
      const isDev = isDevelopmentRoute(routePath, content);
      const isTest = isTestRoute(routePath);

      // Build full path with mount prefix and /api/v1
      const fullPath = `/api/v1${mountPrefix}${routePath}`;

      routes.push({
        method,
        path: routePath,
        fullPath,
        file: fileName,
        line: index + 1,
        middleware,
        isDev,
        isTest
      });
    }
  });

  return routes;
}

/**
 * Main scanner function
 */
function scanAllRoutes(): ScanResult {
  const allRoutes: RouteDefinition[] = [];
  let scannedFiles = 0;

  // Get all .routes.ts files
  const files = fs.readdirSync(ROUTES_DIR)
    .filter(file => file.endsWith('.routes.ts'))
    .map(file => path.join(ROUTES_DIR, file));

  console.log(`📂 Scanning ${files.length} route files...\n`);

  for (const file of files) {
    const routes = scanRouteFile(file);
    allRoutes.push(...routes);
    scannedFiles++;

    console.log(`✓ ${path.basename(file)}: Found ${routes.length} routes`);
  }

  // Filter and categorize
  const productionRoutes = allRoutes.filter(r => !r.isDev && !r.isTest);
  const devRoutes = allRoutes.filter(r => r.isDev);
  const testRoutes = allRoutes.filter(r => r.isTest);

  return {
    totalRoutes: allRoutes.length,
    productionRoutes: productionRoutes.length,
    devRoutes: devRoutes.length,
    testRoutes: testRoutes.length,
    routes: allRoutes,
    scannedFiles,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate human-readable report
 */
function generateReport(result: ScanResult): string {
  let report = '# API Route Inventory\n\n';
  report += `**Generated:** ${result.timestamp}\n`;
  report += `**Scanned Files:** ${result.scannedFiles}\n\n`;
  report += '## Summary\n\n';
  report += `- **Total Routes:** ${result.totalRoutes}\n`;
  report += `- **Production Routes:** ${result.productionRoutes}\n`;
  report += `- **Development Routes:** ${result.devRoutes}\n`;
  report += `- **Test Routes:** ${result.testRoutes}\n\n`;

  // Group by file
  const byFile: { [key: string]: RouteDefinition[] } = {};
  for (const route of result.routes) {
    if (!byFile[route.file]) {
      byFile[route.file] = [];
    }
    byFile[route.file].push(route);
  }

  report += '## Routes by File\n\n';

  for (const [file, routes] of Object.entries(byFile)) {
    report += `### ${file}\n\n`;
    report += '| Method | Path | Type | Middleware |\n';
    report += '|--------|------|------|------------|\n';

    for (const route of routes) {
      const type = route.isTest ? 'TEST' : route.isDev ? 'DEV' : 'PROD';
      const middleware = route.middleware.length > 0 ? route.middleware.join(', ') : '-';
      report += `| ${route.method} | ${route.fullPath} | ${type} | ${middleware} |\n`;
    }

    report += '\n';
  }

  return report;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 API Route Scanner\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Scan all routes
    const result = scanAllRoutes();

    // Save JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\n✅ JSON saved to: ${OUTPUT_FILE}`);

    // Generate and save report
    const report = generateReport(result);
    const reportFile = OUTPUT_FILE.replace('.json', '.md');
    fs.writeFileSync(reportFile, report);
    console.log(`✅ Report saved to: ${reportFile}`);

    // Print summary
    console.log('\n═══════════════════════════════════════\n');
    console.log('📊 Summary:');
    console.log(`   Total Routes: ${result.totalRoutes}`);
    console.log(`   Production: ${result.productionRoutes} (${Math.round(result.productionRoutes / result.totalRoutes * 100)}%)`);
    console.log(`   Development: ${result.devRoutes}`);
    console.log(`   Test: ${result.testRoutes}`);
    console.log('\n✨ Scan complete!\n');

  } catch (error) {
    console.error('\n❌ Scan failed:', error);
    process.exit(1);
  }
}

// Auto-run when executed directly
main();

export { scanAllRoutes, RouteDefinition, ScanResult };
