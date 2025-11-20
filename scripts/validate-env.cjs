#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Validates that:
 * 1. .env.example contains all variables used in code
 * 2. No hardcoded defaults for critical variables
 * 3. VITE_ prefix discipline is maintained
 * 4. Production configs match requirements
 *
 * Usage:
 *   npm run env:validate
 *   node scripts/validate-env.js --check-production
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const checkProduction = args.includes('--check-production');
const verbose = args.includes('--verbose');

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};

  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) return;

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      vars[key.trim()] = valueParts.join('=').trim();
    }
  });

  return vars;
}

/**
 * Find all process.env and import.meta.env references in code
 */
function findEnvReferences(dir, exclude = ['node_modules', 'dist', 'build', '.git']) {
  const envRefs = new Set();

  function scanDir(currentDir) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      // Skip excluded directories
      if (stat.isDirectory()) {
        const dirName = path.basename(fullPath);
        if (!exclude.includes(dirName)) {
          scanDir(fullPath);
        }
        continue;
      }

      // Only check TypeScript and JavaScript files
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');

      // Find process.env references
      const processEnvMatches = content.matchAll(/process\.env\.(\w+)/g);
      for (const match of processEnvMatches) {
        envRefs.add(match[1]);
      }

      // Find process.env['KEY'] references
      const bracketMatches = content.matchAll(/process\.env\[['"](\w+)['"]\]/g);
      for (const match of bracketMatches) {
        envRefs.add(match[1]);
      }

      // Find import.meta.env references
      const metaEnvMatches = content.matchAll(/import\.meta\.env\.(\w+)/g);
      for (const match of metaEnvMatches) {
        envRefs.add(match[1]);
      }
    }
  }

  scanDir(dir);
  return Array.from(envRefs).sort();
}

/**
 * Check for hardcoded defaults in critical variables
 */
function checkHardcodedDefaults(dir) {
  const issues = [];
  const criticalVars = [
    'KIOSK_JWT_SECRET',
    'PIN_PEPPER',
    'DEVICE_FINGERPRINT_SALT',
    'STATION_TOKEN_SECRET',
    'SUPABASE_SERVICE_KEY',
    'SQUARE_ACCESS_TOKEN'
  ];

  function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    for (const varName of criticalVars) {
      // Check for || 'default' pattern
      const defaultPattern = new RegExp(`process\\.env\\.${varName}.*\\|\\|\\s*['"\`]`, 'g');
      if (defaultPattern.test(content)) {
        issues.push({
          file: filePath,
          variable: varName,
          issue: 'Hardcoded default value detected'
        });
      }

      // Check for ?? 'default' pattern
      const nullishPattern = new RegExp(`process\\.env\\.${varName}.*\\?\\?\\s*['"\`]`, 'g');
      if (nullishPattern.test(content)) {
        issues.push({
          file: filePath,
          variable: varName,
          issue: 'Hardcoded default value detected (nullish coalescing)'
        });
      }
    }
  }

  function scanDir(currentDir) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const dirName = path.basename(fullPath);
        if (!['node_modules', 'dist', 'build', '.git'].includes(dirName)) {
          scanDir(fullPath);
        }
        continue;
      }

      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        scanFile(fullPath);
      }
    }
  }

  scanDir(dir);
  return issues;
}

/**
 * Validate VITE_ prefix discipline
 */
function validateVitePrefixes(clientDir) {
  const issues = [];
  const serverOnlyVars = [
    'DATABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'PIN_PEPPER',
    'KIOSK_JWT_SECRET',
    'STATION_TOKEN_SECRET'
  ];

  const clientRefs = findEnvReferences(clientDir);

  for (const ref of clientRefs) {
    // Skip built-in Vite variables
    if (['MODE', 'BASE_URL', 'PROD', 'DEV', 'SSR'].includes(ref)) continue;

    // Skip build-time variables (not runtime env vars)
    const buildTimeVars = ['ANALYZE', 'CI', 'DEBUG_TESTS', 'NODE_ENV'];
    if (buildTimeVars.includes(ref)) continue;

    // Check if server-only variable is used in client
    if (serverOnlyVars.includes(ref)) {
      issues.push({
        variable: ref,
        issue: 'Server-only variable used in client code (security risk)'
      });
    }

    // Check if non-VITE_ prefixed variable is used
    if (!ref.startsWith('VITE_')) {
      issues.push({
        variable: ref,
        issue: 'Non-VITE_ prefixed variable used in client (will be undefined)'
      });
    }
  }

  return issues;
}

/**
 * Main validation function
 */
function validate() {
  console.log(`${colors.blue}🔍 Environment Variable Validation${colors.reset}\n`);

  const rootDir = path.resolve(__dirname, '..');
  const errors = [];
  const warnings = [];

  // 1. Check .env.example exists
  const examplePath = path.join(rootDir, '.env.example');
  if (!fs.existsSync(examplePath)) {
    errors.push('.env.example file is missing');
  }

  // 2. Parse environment files
  const exampleVars = parseEnvFile(examplePath);
  const localVars = parseEnvFile(path.join(rootDir, '.env'));

  // 3. Find all environment variable references
  console.log('Scanning codebase for environment variable usage...');
  const allRefs = findEnvReferences(rootDir);
  const serverRefs = findEnvReferences(path.join(rootDir, 'server'));
  const clientRefs = findEnvReferences(path.join(rootDir, 'client'));

  if (verbose) {
    console.log(`Found ${allRefs.length} unique environment variable references`);
  }

  // 4. Check for missing variables in .env.example
  const missingInExample = allRefs.filter(ref => {
    // Skip Vite built-ins and Node built-ins
    const builtins = ['NODE_ENV', 'MODE', 'BASE_URL', 'PROD', 'DEV', 'SSR'];

    // Platform auto-injected variables (not in .env.example by design)
    const platformVars = [
      'CI',                    // GitHub Actions / CI platforms
      'RENDER',                // Render.com platform
      'RENDER_EXTERNAL_URL',   // Render.com auto-injected
      'VERCEL',                // Vercel platform
      'VERCEL_URL',            // Vercel auto-injected
      'VERCEL_BRANCH_URL',     // Vercel auto-injected
      'VERCEL_DEPLOYMENT_URL', // Vercel auto-injected
      'NEXT_PUBLIC_VERCEL_URL',// Vercel auto-injected
      'npm_package_version',   // npm runtime
      'npm_lifecycle_event',   // npm runtime
      'npm_node_execpath',     // npm runtime
    ];

    // Build/test-time only variables (not app config)
    const buildTimeVars = [
      'ANALYZE',               // Webpack bundle analyzer
      'DEBUG_TESTS',           // Test debugging
      'FORCE_COLOR',           // Terminal color forcing
      'TZ',                    // Timezone for tests
      'PRODUCTION',            // Legacy, use NODE_ENV
      'DEFAULT_TIMEOUT_MS',    // Test timeout
      'ENABLE_RESPONSE_TRANSFORM', // Test feature flag
    ];

    // Deprecated/renamed variables (cleanup pending)
    const deprecatedVars = [
      'API_BASE',              // → VITE_API_BASE_URL
      'API_BASE_URL',          // → VITE_API_BASE_URL
      'CLIENT_URL',            // → FRONTEND_URL
      'VITE_API_BASE',         // → VITE_API_BASE_URL
      'VITE_APP_URL',          // → FRONTEND_URL
      'TEST_EMAIL',            // → Use fixtures
      'TEST_PASSWORD',         // → Use fixtures
      'TEST_TOKEN',            // → Use fixtures
      'SUPABASE_SERVICE_ROLE_KEY', // → SUPABASE_SERVICE_KEY
      'VITE_OPENAI_API_KEY',   // REMOVED for security (server-side only)
      'VITE_SQUARE_ACCESS_TOKEN', // NEVER expose payment tokens to client
    ];

    // Security/policy configs (hardcoded by design per ADR-009)
    const securityPolicyVars = [
      'CSP_DIRECTIVES',        // Code-configured
      'CSP_ENABLED',           // Code-configured
      'HSTS_ENABLED',          // Code-configured
      'HSTS_MAX_AGE',          // Code-configured
    ];

    // Unimplemented features (placeholders)
    const unimplementedVars = [
      'VOICE_ENABLED',         // Voice feature flag
      'PAYMENTS_WEBHOOKS_ENABLED', // Webhook feature flag
      'APP_VERSION',           // Version tracking
      'AI_DEGRADED_MODE',      // Degraded mode flag
    ];

    // Combine all exclusions
    const allExclusions = [
      ...builtins,
      ...platformVars,
      ...buildTimeVars,
      ...deprecatedVars,
      ...securityPolicyVars,
      ...unimplementedVars
    ];

    return !allExclusions.includes(ref) && !exampleVars.hasOwnProperty(ref);
  });

  if (missingInExample.length > 0) {
    errors.push(`Missing in .env.example: ${missingInExample.join(', ')}`);
  }

  // 5. Check for hardcoded defaults
  console.log('Checking for hardcoded defaults in critical variables...');
  const hardcodedIssues = checkHardcodedDefaults(path.join(rootDir, 'server'));

  if (hardcodedIssues.length > 0) {
    for (const issue of hardcodedIssues) {
      errors.push(`${issue.variable}: ${issue.issue} in ${path.relative(rootDir, issue.file)}`);
    }
  }

  // 6. Validate VITE_ prefix discipline
  console.log('Validating VITE_ prefix discipline in client code...');
  const prefixIssues = validateVitePrefixes(path.join(rootDir, 'client'));

  if (prefixIssues.length > 0) {
    for (const issue of prefixIssues) {
      errors.push(`${issue.variable}: ${issue.issue}`);
    }
  }

  // 7. Check for unused variables in .env.example
  const unusedVars = Object.keys(exampleVars).filter(key => {
    return !allRefs.includes(key) && !key.startsWith('#');
  });

  if (unusedVars.length > 0) {
    warnings.push(`Possibly unused in .env.example: ${unusedVars.join(', ')}`);
  }

  // 8. Production-specific checks
  if (checkProduction) {
    console.log('Running production checks...');

    // Check for demo panel in production
    if (localVars['VITE_DEMO_PANEL'] === 'true' || localVars['VITE_DEMO_PANEL'] === '1') {
      errors.push('VITE_DEMO_PANEL must be false in production (security risk)');
    }

    // Check for sandbox Square in production
    if (localVars['NODE_ENV'] === 'production' && localVars['SQUARE_ENVIRONMENT'] === 'sandbox') {
      warnings.push('SQUARE_ENVIRONMENT is sandbox but NODE_ENV is production');
    }

    // Check secret lengths
    const secretVars = ['KIOSK_JWT_SECRET', 'PIN_PEPPER', 'DEVICE_FINGERPRINT_SALT', 'STATION_TOKEN_SECRET'];
    for (const secretVar of secretVars) {
      if (localVars[secretVar] && localVars[secretVar].length < 32) {
        errors.push(`${secretVar} is too short (${localVars[secretVar].length} chars, minimum 32 required)`);
      }
    }
  }

  // Report results
  console.log('\n' + '='.repeat(60));

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${colors.green}✅ All environment validation checks passed!${colors.reset}`);
    return 0;
  }

  if (errors.length > 0) {
    console.log(`${colors.red}❌ Errors found:${colors.reset}`);
    errors.forEach(err => console.log(`  - ${err}`));
  }

  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Warnings:${colors.reset}`);
    warnings.forEach(warn => console.log(`  - ${warn}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('See .env.example for reference configuration');

  return errors.length > 0 ? 1 : 0;
}

// Run validation
const exitCode = validate();
process.exit(exitCode);