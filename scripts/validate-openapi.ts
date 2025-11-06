#!/usr/bin/env tsx

/**
 * OpenAPI Validator
 *
 * Compares discovered routes (from scan-api-routes.ts) against OpenAPI specification.
 * Reports missing, extra, and mismatched endpoint documentation.
 *
 * Usage: npm run docs:validate-api
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_INVENTORY_FILE = path.join(__dirname, '../docs/investigations/api-route-inventory.json');
const OPENAPI_FILE = path.join(__dirname, '../docs/reference/api/openapi.yaml');
const OUTPUT_FILE = path.join(__dirname, '../docs/investigations/api-validation-report.json');

interface RouteDefinition {
  method: string;
  path: string;
  fullPath: string;
  file: string;
  line: number;
  middleware: string[];
  isDev: boolean;
  isTest: boolean;
}

interface OpenAPIPath {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
}

interface ValidationIssue {
  type: 'missing' | 'extra' | 'mismatch';
  severity: 'critical' | 'warning' | 'info';
  route?: RouteDefinition;
  openApiPath?: OpenAPIPath;
  message: string;
  suggestion?: string;
}

interface ValidationReport {
  timestamp: string;
  coverage: number;
  totalRoutes: number;
  documentedRoutes: number;
  productionRoutes: number;
  documentedProductionRoutes: number;
  issues: ValidationIssue[];
  summary: {
    missing: number;
    extra: number;
    mismatches: number;
  };
}

/**
 * Normalize path for comparison
 * Converts :id to {id}, removes /api/v1 prefix inconsistencies
 */
function normalizePath(p: string): string {
  // Convert Express :param to OpenAPI {param}
  let normalized = p.replace(/:(\w+)/g, '{$1}');

  // Ensure consistent /api/v1 prefix
  if (!normalized.startsWith('/api/v1') && !normalized.startsWith('/health')) {
    normalized = `/api/v1${normalized}`;
  }

  return normalized;
}

/**
 * Check if two paths match (accounting for parameter differences)
 */
function pathsMatch(routePath: string, openApiPath: string): boolean {
  const normalizedRoute = normalizePath(routePath);
  const normalizedOpenApi = openApiPath;

  return normalizedRoute === normalizedOpenApi;
}

/**
 * Load route inventory from scanner
 */
function loadRouteInventory(): RouteDefinition[] {
  if (!fs.existsSync(ROUTE_INVENTORY_FILE)) {
    throw new Error(`Route inventory not found. Run: npm run docs:scan-routes`);
  }

  const data = JSON.parse(fs.readFileSync(ROUTE_INVENTORY_FILE, 'utf-8'));
  return data.routes;
}

/**
 * Load and parse OpenAPI spec
 */
function loadOpenAPISpec(): OpenAPIPath[] {
  if (!fs.existsSync(OPENAPI_FILE)) {
    throw new Error(`OpenAPI spec not found at: ${OPENAPI_FILE}`);
  }

  const content = fs.readFileSync(OPENAPI_FILE, 'utf-8');
  const spec = yaml.parse(content);

  const paths: OpenAPIPath[] = [];

  for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
    const methods = ['get', 'post', 'put', 'patch', 'delete'];

    for (const method of methods) {
      if ((pathItem as any)[method]) {
        const operation = (pathItem as any)[method];
        paths.push({
          path: pathStr,
          method: method.toUpperCase(),
          operationId: operation.operationId,
          summary: operation.summary,
          tags: operation.tags || []
        });
      }
    }
  }

  return paths;
}

/**
 * Find OpenAPI entry for a route
 */
function findOpenAPIMatch(route: RouteDefinition, openApiPaths: OpenAPIPath[]): OpenAPIPath | undefined {
  return openApiPaths.find(op =>
    op.method === route.method &&
    pathsMatch(route.fullPath, op.path)
  );
}

/**
 * Find route for an OpenAPI path
 */
function findRouteMatch(openApiPath: OpenAPIPath, routes: RouteDefinition[]): RouteDefinition | undefined {
  return routes.find(route =>
    route.method === openApiPath.method &&
    pathsMatch(route.fullPath, openApiPath.path)
  );
}

/**
 * Validate routes against OpenAPI spec
 */
function validateRoutes(): ValidationReport {
  console.log('📋 Loading route inventory...');
  const routes = loadRouteInventory();
  const productionRoutes = routes.filter(r => !r.isDev && !r.isTest);

  console.log('📖 Loading OpenAPI specification...');
  const openApiPaths = loadOpenAPISpec();

  console.log(`\n🔍 Analyzing ${productionRoutes.length} production routes against ${openApiPaths.length} documented endpoints...\n`);

  const issues: ValidationIssue[] = [];

  // Check for missing documentation (routes not in OpenAPI)
  for (const route of productionRoutes) {
    const match = findOpenAPIMatch(route, openApiPaths);

    if (!match) {
      issues.push({
        type: 'missing',
        severity: 'critical',
        route,
        message: `Route ${route.method} ${route.fullPath} is not documented in OpenAPI`,
        suggestion: `Add documentation for this endpoint to ${OPENAPI_FILE}`
      });
    }
  }

  // Check for extra documentation (OpenAPI paths not in routes)
  for (const openApiPath of openApiPaths) {
    const match = findRouteMatch(openApiPath, routes);

    if (!match) {
      // Skip if it's a parameter route that might match a different pattern
      const isParameterPath = openApiPath.path.includes('{');

      issues.push({
        type: 'extra',
        severity: isParameterPath ? 'warning' : 'info',
        openApiPath,
        message: `OpenAPI documents ${openApiPath.method} ${openApiPath.path} but route not found`,
        suggestion: isParameterPath
          ? 'This may be a parameter mismatch. Verify path parameter names match.'
          : 'Consider removing this from OpenAPI if the endpoint no longer exists.'
      });
    }
  }

  // Calculate coverage
  const documentedRoutes = productionRoutes.filter(route =>
    findOpenAPIMatch(route, openApiPaths)
  ).length;

  const coverage = productionRoutes.length > 0
    ? Math.round((documentedRoutes / productionRoutes.length) * 100)
    : 0;

  return {
    timestamp: new Date().toISOString(),
    coverage,
    totalRoutes: routes.length,
    documentedRoutes,
    productionRoutes: productionRoutes.length,
    documentedProductionRoutes: documentedRoutes,
    issues,
    summary: {
      missing: issues.filter(i => i.type === 'missing').length,
      extra: issues.filter(i => i.type === 'extra').length,
      mismatches: issues.filter(i => i.type === 'mismatch').length
    }
  };
}

/**
 * Generate human-readable report
 */
function generateReport(report: ValidationReport): string {
  let output = '# API Documentation Validation Report\n\n';
  output += `**Generated:** ${report.timestamp}\n\n`;

  // Coverage Summary
  output += '## Coverage Summary\n\n';
  output += `- **Coverage:** ${report.coverage}%\n`;
  output += `- **Production Routes:** ${report.productionRoutes}\n`;
  output += `- **Documented:** ${report.documentedProductionRoutes}\n`;
  output += `- **Missing:** ${report.summary.missing}\n`;
  output += `- **Extra:** ${report.summary.extra}\n\n`;

  // Status
  if (report.coverage >= 95) {
    output += '✅ **Status:** PASS - Documentation coverage meets threshold (95%+)\n\n';
  } else {
    output += `❌ **Status:** FAIL - Documentation coverage below threshold (${report.coverage}% < 95%)\n\n`;
  }

  // Issues by type
  if (report.issues.length > 0) {
    output += '## Issues Found\n\n';

    // Missing documentation
    const missing = report.issues.filter(i => i.type === 'missing');
    if (missing.length > 0) {
      output += `### 🔴 Missing Documentation (${missing.length})\n\n`;
      output += '| Method | Path | File | Line |\n';
      output += '|--------|------|------|------|\n';

      for (const issue of missing) {
        if (issue.route) {
          output += `| ${issue.route.method} | ${issue.route.fullPath} | ${issue.route.file} | ${issue.route.line} |\n`;
        }
      }
      output += '\n';
    }

    // Extra documentation
    const extra = report.issues.filter(i => i.type === 'extra');
    if (extra.length > 0) {
      output += `### ⚠️ Extra Documentation (${extra.length})\n\n`;
      output += '| Method | Path | Summary |\n';
      output += '|--------|------|----------|\n';

      for (const issue of extra) {
        if (issue.openApiPath) {
          output += `| ${issue.openApiPath.method} | ${issue.openApiPath.path} | ${issue.openApiPath.summary || '-'} |\n`;
        }
      }
      output += '\n';
    }
  } else {
    output += '## ✨ No Issues Found\n\nAll production routes are documented!\n\n';
  }

  return output;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 OpenAPI Validator\n');
  console.log('═══════════════════════════════════════\n');

  try {
    const report = validateRoutes();

    // Save JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n✅ JSON saved to: ${OUTPUT_FILE}`);

    // Generate and save markdown report
    const markdown = generateReport(report);
    const mdFile = OUTPUT_FILE.replace('.json', '.md');
    fs.writeFileSync(mdFile, markdown);
    console.log(`✅ Report saved to: ${mdFile}`);

    // Print summary
    console.log('\n═══════════════════════════════════════\n');
    console.log('📊 Validation Summary:');
    console.log(`   Coverage: ${report.coverage}%`);
    console.log(`   Production Routes: ${report.productionRoutes}`);
    console.log(`   Documented: ${report.documentedProductionRoutes}`);
    console.log(`   Missing: ${report.summary.missing}`);
    console.log(`   Extra: ${report.summary.extra}`);

    if (report.coverage >= 95) {
      console.log('\n✅ PASS: Documentation coverage meets threshold!\n');
      process.exit(0);
    } else {
      console.log(`\n❌ FAIL: Documentation coverage (${report.coverage}%) below threshold (95%)\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Auto-run when executed directly
main();
