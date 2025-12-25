#!/usr/bin/env node

/**
 * System Health Check Script
 *
 * Performs a quick system health check including:
 * - Node.js version
 * - Dependency installation status
 * - TypeScript compilation status
 * - Test status (quick check)
 * - Security vulnerability count
 *
 * Usage:
 *   npm run health
 *   node scripts/system-health.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

console.log('=== System Health Check ===\n');

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
const nodeStatus = majorVersion >= 18 ? 'OK' : 'Upgrade recommended (18+)';
console.log(`Node.js: ${nodeVersion} (${nodeStatus})`);

// Check if dependencies installed
let depsInstalled = false;
try {
  // In npm workspaces, dependencies are hoisted to root node_modules
  const rootNodeModules = path.join(ROOT, 'node_modules');

  if (fs.existsSync(rootNodeModules)) {
    // Check for key dependencies (hoisted to root in workspaces)
    const vitePath = path.join(rootNodeModules, 'vite');
    const expressPath = path.join(rootNodeModules, 'express');

    if (fs.existsSync(vitePath) && fs.existsSync(expressPath)) {
      depsInstalled = true;
      console.log('Dependencies: Installed');
    } else {
      console.log('Dependencies: Partially installed - run npm install');
    }
  } else {
    console.log('Dependencies: Missing - run npm install');
  }
} catch {
  console.log('Dependencies: Missing - run npm install');
}

// Check TypeScript
if (depsInstalled) {
  try {
    execSync('npm run typecheck:quick', {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 60000
    });
    console.log('TypeScript: OK');
  } catch (error) {
    // Check if it's a type error or just a timeout/other error
    if (error.status) {
      console.log('TypeScript: Errors found - run npm run typecheck for details');
    } else {
      console.log('TypeScript: Check timed out or failed');
    }
  }
} else {
  console.log('TypeScript: Skipped (dependencies not installed)');
}

// Check tests (quick)
if (depsInstalled) {
  try {
    execSync('npm run test:quick -- --reporter=dot 2>&1', {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 120000
    });
    console.log('Tests: Passing');
  } catch (error) {
    // Tests may have failed - that's expected info, not a script error
    console.log('Tests: Some failing - run npm test for details');
  }
} else {
  console.log('Tests: Skipped (dependencies not installed)');
}

// Check for vulnerabilities
// Note: npm audit exits non-zero when vulnerabilities exist, so use || true
try {
  const auditResult = execSync('npm audit --json 2>&1 || true', {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true
  });
  const auditData = JSON.parse(auditResult);

  // npm audit JSON structure can vary between npm versions
  let vulnCount = 0;
  if (auditData.metadata && auditData.metadata.vulnerabilities) {
    vulnCount = auditData.metadata.vulnerabilities.total || 0;
  } else if (auditData.vulnerabilities) {
    vulnCount = Object.keys(auditData.vulnerabilities).length;
  }

  console.log(vulnCount === 0
    ? 'Security: No known vulnerabilities'
    : `Security: ${vulnCount} vulnerabilities - run npm audit for details`);
} catch {
  console.log('Security: Could not check (run npm audit manually)');
}

// Check workspace status
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const version = packageJson.version || 'unknown';
  console.log(`Version: ${version}`);
} catch {
  console.log('Version: Could not determine');
}

console.log('\n=== Done ===');
