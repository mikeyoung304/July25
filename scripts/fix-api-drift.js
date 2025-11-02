#!/usr/bin/env node

/**
 * API Drift Auto-Fix
 *
 * Automatically updates docs/reference/api/openapi.yaml
 * to include all implemented route endpoints
 *
 * Usage:
 *   node scripts/fix-api-drift.js [--dry-run] [--commit] [--remove-obsolete]
 *
 * Options:
 *   --dry-run         Show what would be changed without writing
 *   --commit          Auto-commit changes after fixing
 *   --remove-obsolete Remove documented endpoints not in code (use with caution)
 *
 * Note: By default, this script ADDS missing endpoints to openapi.yaml
 *       but does NOT remove obsolete ones (to avoid data loss).
 *       Use --remove-obsolete to enable bidirectional sync.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OPENAPI_PATH = path.join(ROOT, 'docs/reference/api/openapi.yaml');
const ROUTES_DIR = path.join(ROOT, 'server/src/routes');

/**
 * Parse route files for actual endpoints
 */
function parseActualEndpoints() {
  const endpoints = [];

  const routeFiles = fs.readdirSync(ROUTES_DIR)
    .filter(f => (f.endsWith('.ts') || f.endsWith('.routes.ts')) && !f.includes('.test.'));

  routeFiles.forEach(file => {
    const filePath = path.join(ROUTES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Match router.method patterns
    const routeRegex = /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      let routePath = match[2];

      // Convert Express params to OpenAPI format
      routePath = routePath.replace(/:(\w+)/g, '{$1}');

      // Skip WebSocket endpoints
      if (routePath.includes('upgrade') || content.includes('ws.handleUpgrade')) {
        continue;
      }

      // Infer tags from file name
      const tag = file
        .replace('.routes.ts', '')
        .replace('.ts', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      // Try to extract JSDoc summary
      const summaryRegex = new RegExp(`\\/\\*\\*[^*]*\\*\\/\\s*router\\.${method}\\(['"\`]${routePath.replace(/\{/g, '\\{').replace(/\}/g, '\\}')}`);
      const summaryMatch = content.match(summaryRegex);
      let summary = '';

      if (summaryMatch) {
        const jsdoc = summaryMatch[0];
        const summaryLine = jsdoc.match(/\*\s*([^\n*]+)/);
        if (summaryLine) {
          summary = summaryLine[1].trim();
        }
      }

      // Generate default summary if not found
      if (!summary) {
        const action = method === 'get' ? 'Get' :
                      method === 'post' ? 'Create' :
                      method === 'put' ? 'Update' :
                      method === 'patch' ? 'Modify' :
                      method === 'delete' ? 'Delete' : 'Handle';

        const resource = routePath
          .split('/')
          .filter(p => p && !p.startsWith('{'))
          .pop() || 'resource';

        summary = `${action} ${resource}`;
      }

      endpoints.push({
        method,
        path: `/api/v1${routePath}`,
        summary,
        tags: [tag],
        file
      });
    }
  });

  return endpoints;
}

/**
 * Load existing OpenAPI spec
 */
function loadOpenAPISpec() {
  if (!fs.existsSync(OPENAPI_PATH)) {
    // Return minimal spec if file doesn't exist
    return {
      openapi: '3.0.0',
      info: {
        title: 'Restaurant OS API',
        version: '1.0.0',
        description: 'REST API for Restaurant OS'
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };
  }

  const content = fs.readFileSync(OPENAPI_PATH, 'utf-8');
  return yaml.load(content);
}

/**
 * Merge endpoints into OpenAPI spec
 */
function mergeEndpoints(spec, endpoints) {
  let addedCount = 0;

  endpoints.forEach(endpoint => {
    // Check if path exists
    if (!spec.paths[endpoint.path]) {
      spec.paths[endpoint.path] = {};
    }

    // Check if method exists
    if (!spec.paths[endpoint.path][endpoint.method]) {
      // Add new endpoint
      spec.paths[endpoint.path][endpoint.method] = {
        tags: endpoint.tags,
        summary: endpoint.summary,
        responses: {
          '200': {
            description: 'Successful response'
          },
          '400': {
            description: 'Bad request'
          },
          '401': {
            description: 'Unauthorized'
          },
          '500': {
            description: 'Server error'
          }
        }
      };

      // Add authentication for non-public endpoints
      if (!endpoint.path.includes('/public/')) {
        spec.paths[endpoint.path][endpoint.method].security = [
          { bearerAuth: [] }
        ];
      }

      addedCount++;
    }
  });

  return addedCount;
}

/**
 * Remove obsolete endpoints from OpenAPI spec
 */
function removeObsoleteEndpoints(spec, implementedEndpoints) {
  let removedCount = 0;
  const removed = [];

  // Build a set of implemented endpoints for fast lookup
  const implementedSet = new Set(
    implementedEndpoints.map(ep => `${ep.method}:${ep.path}`)
  );

  // Check each documented endpoint
  const pathsToRemove = [];
  Object.keys(spec.paths || {}).forEach(path => {
    const methodsToRemove = [];

    Object.keys(spec.paths[path]).forEach(method => {
      const key = `${method}:${path}`;

      if (!implementedSet.has(key)) {
        // This endpoint is documented but not implemented
        methodsToRemove.push(method);
        removed.push({ method: method.toUpperCase(), path, summary: spec.paths[path][method]?.summary || 'No summary' });
        removedCount++;
      }
    });

    // Remove obsolete methods
    methodsToRemove.forEach(method => {
      delete spec.paths[path][method];
    });

    // If path has no methods left, mark for removal
    if (Object.keys(spec.paths[path]).length === 0) {
      pathsToRemove.push(path);
    }
  });

  // Remove empty paths
  pathsToRemove.forEach(path => {
    delete spec.paths[path];
  });

  return { removedCount, removed };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const autoCommit = args.includes('--commit');
  const removeObsolete = args.includes('--remove-obsolete');

  console.log('🔧 API Drift Auto-Fix\n');

  // Parse route files
  console.log('📖 Parsing route files...');
  const endpoints = parseActualEndpoints();
  console.log(`   Found ${endpoints.length} endpoints\n`);

  // Load existing spec
  console.log('📖 Loading openapi.yaml...');
  const spec = loadOpenAPISpec();
  const existingPaths = Object.keys(spec.paths || {}).length;
  console.log(`   Existing endpoints: ${existingPaths}\n`);

  // Merge endpoints
  console.log('🔀 Merging endpoints...');
  const addedCount = mergeEndpoints(spec, endpoints);
  console.log(`   Added ${addedCount} new endpoint(s)\n`);

  // Remove obsolete endpoints if requested
  let removedCount = 0;
  let removed = [];
  if (removeObsolete) {
    console.log('🧹 Removing obsolete endpoints...');
    const result = removeObsoleteEndpoints(spec, endpoints);
    removedCount = result.removedCount;
    removed = result.removed;
    console.log(`   Removed ${removedCount} obsolete endpoint(s)\n`);
  }

  if (addedCount === 0 && removedCount === 0) {
    console.log('✅ No changes needed. OpenAPI spec is up to date.\n');
    return 0;
  }

  // Generate YAML
  const newContent = yaml.dump(spec, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });

  if (dryRun) {
    console.log('\n📋 DRY RUN - Changes that would be made:\n');

    if (addedCount > 0) {
      console.log('➕ Would ADD these endpoints:\n');
      endpoints.forEach(ep => {
        if (!spec.paths[ep.path]?.[ep.method]) {
          console.log(`  ${ep.method.toUpperCase()} ${ep.path} - ${ep.summary}`);
        }
      });
      console.log();
    }

    if (removedCount > 0) {
      console.log('➖ Would REMOVE these endpoints:\n');
      removed.forEach(ep => {
        console.log(`  ${ep.method} ${ep.path} - ${ep.summary}`);
      });
      console.log();
    }

    console.log(`✅ Dry run complete. File not modified.`);
    console.log(`   ${addedCount} would be added, ${removedCount} would be removed.`);
    return 0;
  }

  // Ensure directory exists
  const docsDir = path.dirname(OPENAPI_PATH);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(OPENAPI_PATH, newContent);
  console.log(`✅ Updated: ${OPENAPI_PATH}\n`);

  // Verify fix worked
  console.log('🔍 Verifying fix...');
  try {
    execSync('node scripts/check-api-drift.cjs', {
      stdio: 'pipe',
      cwd: ROOT
    });
    console.log('✅ API drift resolved!\n');
  } catch (error) {
    console.log('⚠️  Verification check still shows issues. Manual review may be needed.\n');
  }

  // Auto-commit if requested
  if (autoCommit) {
    console.log('📦 Auto-committing changes...');
    try {
      execSync('git add docs/reference/api/openapi.yaml', { cwd: ROOT });
      execSync(`git commit -m "docs: auto-update api documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"`, { cwd: ROOT });
      console.log('✅ Changes committed\n');
    } catch (error) {
      console.log('⚠️  Auto-commit failed. You may need to commit manually.\n');
    }
  } else {
    console.log('💡 To commit these changes, run:');
    console.log('   git add docs/reference/api/openapi.yaml');
    console.log('   git commit -m "docs: auto-update api documentation"\n');
  }

  return 0;
}

// Run
try {
  const code = await main();
  process.exit(code);
} catch (error) {
  console.error('❌ Error fixing API drift:', error.message);
  console.error(error.stack);
  process.exit(1);
}
