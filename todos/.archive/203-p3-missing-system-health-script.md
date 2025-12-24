# TODO: Create Missing system-health.js Script

**Priority:** P3 - Low
**Category:** DevOps/Tooling
**Detected:** 2025-12-24 (npm run health)
**Status:** pending

## Problem

The `npm run health` command fails because `scripts/system-health.js` doesn't exist:

```
Error: Cannot find module '/Users/mikeyoung/CODING/rebuild-6.0/scripts/system-health.js'
```

The package.json references this script but it was never created or was accidentally deleted.

## Impact

- Health check command broken
- Cannot quickly assess system status
- Documentation references non-existent functionality

## Proposed Fix

Create `scripts/system-health.js` that checks:

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('=== System Health Check ===\n');

// Check Node version
console.log('Node:', process.version);

// Check if dependencies installed
try {
  require.resolve('vite');
  console.log('Dependencies: Installed');
} catch {
  console.log('Dependencies: Missing - run npm install');
}

// Check TypeScript
try {
  execSync('npm run typecheck:quick', { stdio: 'pipe' });
  console.log('TypeScript: OK');
} catch {
  console.log('TypeScript: Errors found');
}

// Check tests (quick)
try {
  execSync('npm run test:quick -- --reporter=dot', { stdio: 'pipe' });
  console.log('Tests: Passing');
} catch {
  console.log('Tests: Some failing');
}

// Check for vulnerabilities
try {
  const audit = execSync('npm audit --json', { encoding: 'utf8' });
  const { metadata } = JSON.parse(audit);
  console.log(`Security: ${metadata.vulnerabilities.total} vulnerabilities`);
} catch {
  console.log('Security: Could not check');
}

console.log('\n=== Done ===');
```

## Files

- `scripts/system-health.js` (create)

## Testing

- Run `npm run health` - should complete without errors
- Verify output shows meaningful system status
