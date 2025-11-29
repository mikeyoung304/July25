# CL-TEST-002: npm test Hangs with Heavy Memory Options

**Status:** Documented
**Severity:** Medium
**Component:** Testing
**Created:** 2025-11-29

## Problem

Running `npm test` from root hangs for 20+ minutes due to memory options and output buffering.

## Quick Fix

```bash
# Instead of npm test, run individually:
npm run test:client   # 905 tests in ~6s
npm run test:server   # 395 tests in ~1s
```

## Root Cause

The root test script uses aggressive memory allocation (`--max-old-space-size=3072 --expose-gc`) combined with verbose output from security tests. This creates a slowdown when output buffering interacts with garbage collection.

## Prevention

1. Use `npm run test:client` and `npm run test:server` for development
2. Use `npm run test:quick` for pre-commit checks
3. Add `--reporter=dot` for minimal output

## Full Documentation

See: [docs/solutions/performance-issues/vitest-hanging-output-buffering.md](/docs/solutions/performance-issues/vitest-hanging-output-buffering.md)
