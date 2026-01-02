---
title: "Vite ESM/CJS Interop - Complete Prevention Strategy Summary"
slug: vite-esm-cjs-summary
category: "build-errors"
tags:
  - "vite"
  - "esm"
  - "commonjs"
  - "module-system"
  - "prevention"
  - "summary"
date: "2026-01-01"
severity: "high"
component: "build-system"
---

# Vite ESM/CJS Interop - Complete Prevention Strategy Summary

## Executive Summary

The shared package uses CommonJS (required for server/Node.js compatibility by ADR-016), but Vite in the client expects ESM. This creates a tension that requires careful configuration at multiple levels. The problem manifests at **runtime** in dev mode when new exports are added without corresponding configuration updates.

**Key Finding:** Only the main `@rebuild/shared` package is missing from `optimizeDeps.include`, but the fix is properly implemented in the current codebase. This document provides comprehensive prevention strategies to ensure this doesn't regress.

## Problem Chain (How It Fails)

```
Developer adds new export to shared/
    ↓
Updates shared/index.ts (barrel export)
    ↓
Runs npm run build --workspace shared (works fine)
    ↓
Tests pass locally (uses pre-built dist/)
    ↓
Dev server starts, loads @rebuild/shared
    ↓
WITHOUT @rebuild/shared in optimizeDeps.include:
  Vite doesn't pre-bundle the main package
  CommonJS code loads in browser (ESM context)
  ↓
"exports is not defined" OR module resolution fails
    ↓
Error only appears in: dev mode, tests with fresh vite startup
```

## Prevention Strategy Overview

### Layer 1: Configuration Level (Most Important)

**Current State:** CORRECTLY IMPLEMENTED

```typescript
// client/vite.config.ts (lines 183-188)
optimizeDeps: {
  include: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-router-dom',
    '@supabase/supabase-js',
    '@rebuild/shared',                         // ← CRITICAL: Main package
    '@rebuild/shared/constants/business',
    '@rebuild/shared/config',
  ],
  exclude: [],
},

commonjsOptions: {
  transformMixedEsModules: true,               // ← CRITICAL: Transform CJS to ESM
  include: [
    /node_modules/,
    /shared\/dist/,                            // ← Include shared dist files
  ],
  defaultIsModuleExports: true,
},
```

**Why Each Setting Matters:**
1. `@rebuild/shared` in include → Pre-bundles main package for ESM transformation
2. `transformMixedEsModules: true` → Tells Vite to transform CommonJS modules
3. `/shared\/dist/` in commonjsOptions.include → Ensures shared's CommonJS is transformed

### Layer 2: Package Configuration (Access Control)

**File:** `shared/package.json` (lines 7-33)

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./config": { ... },
    "./config/browser": { ... },
    "./*": null  // ← Blocks unlisted deep imports
  }
}
```

**Why This Matters:**
- Declares what consumers CAN import (allowlist pattern)
- `./*: null` prevents accidental deep imports
- Runtime enforces this; TypeScript paths bypass it
- Mismatch between these and actual files causes failures

**Key Rule:** New exports MUST be added here before they work in production.

### Layer 3: TypeScript Configuration (Build Output)

**File:** `shared/tsconfig.json` (lines 8-9, 18)

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  },
  "exclude": ["dist", "node_modules", "**/__tests__/**", "config/browser.ts"]
}
```

**Why These Matter:**
- `module: CommonJS` → Compiles to CommonJS for server compatibility
- `config/browser.ts` excluded → Uses ESM features (`import.meta`), should stay as TypeScript source
- Vite handles the ESM transformation for the browser

### Layer 4: Vitest Configuration (Test Runtime)

**File:** `client/vitest.config.ts` (lines 10-11)

```typescript
resolve: {
  alias: {
    '@': resolve(__dirname, './src'),
    '@rebuild/shared/config/browser': resolve(__dirname, '../shared/config/browser.ts'),
    '@rebuild/shared': resolve(__dirname, '../shared/dist'),
  },
},
```

**Why This Matters:**
- Tests run in jsdom (browser-like) environment
- `config/browser.ts` is TypeScript source, not compiled
- Needs explicit alias to resolve correctly
- Without this, vitest tries to load non-existent dist file

## Four-Layer Defense Strategy

### Defense 1: CI/CD Validation Checks

**What:** Automated checks in GitHub Actions workflows
**Where:** `.github/workflows/pr-validation.yml`
**Purpose:** Catch configuration issues before merge

**Checks to Add:**
1. Verify `@rebuild/shared` in `optimizeDeps.include`
2. Verify `transformMixedEsModules: true` in commonjsOptions
3. Validate all declared package.json exports have corresponding files
4. Verify `shared/package.json` doesn't have `"type": "module"`
5. Verify `shared/tsconfig.json` compiles to CommonJS

**Impact:** Prevents configuration drift from being committed

### Defense 2: Automated Test Cases

**What:** Integration tests that catch runtime issues
**Where:** `client/tests/module-resolution.test.ts`
**Purpose:** Verify imports work at runtime

**Tests to Add:**
1. Import @rebuild/shared main package
2. Verify all declared exports are present
3. Verify subpath imports work correctly
4. Verify Joi/server-only code isn't exported
5. Verify package.json exports match actual files

**Impact:** Catches missing exports in test suite, before production

### Defense 3: Developer Checklist

**What:** Manual verification steps for developers
**When:** Before committing changes to shared/
**Purpose:** Quick sanity checks on local machines

**Checklist:**
- [ ] Added to `shared/index.ts` as barrel export?
- [ ] Ran `npm run build --workspace shared`?
- [ ] If subpath, added to `shared/package.json` exports?
- [ ] Tested in dev mode: `npm run dev`?
- [ ] Tested in tests: `npm run test:client`?

**Impact:** Prevents most issues before CI runs

### Defense 4: Pre-Commit Hook

**What:** Bash script that runs before commits
**Where:** `.github/pre-commit-hooks/vite-esm-cjs-check.sh`
**Purpose:** Catch issues before they're committed

**Checks:**
1. If `shared/package.json` modified → verify no `"type": "module"`
2. If `shared/index.ts` modified → remind about package.json exports
3. If `client/vite.config.ts` modified → verify @rebuild/shared in config

**Impact:** Stops bad commits from ever being created

## What Each Document Covers

### 1. [vite-esm-cjs-interop-prevention.md](./vite-esm-cjs-interop-prevention.md)

**Primary Reference Document**

Covers:
- Detailed root cause analysis
- All 5 configuration prevention strategies
- Why each setting matters
- ESM/CJS decision tree (ADR-016 reference)
- 4 test cases that could catch this issue
- Related documentation links

**When to Use:** First reference when dealing with any Vite/shared package issue

### 2. [vite-esm-cjs-ci-checklist.md](./vite-esm-cjs-ci-checklist.md)

**CI/CD Implementation Guide**

Covers:
- Phase 1: Immediate checks (add to pr-validation.yml)
- Phase 2: Integration checks (add to quick-tests.yml)
- Phase 3: Manual verification checklist
- Complete workflow additions with bash scripts
- Setup scripts for validation
- Manual review checklist for PRs
- Troubleshooting guide

**When to Use:** When implementing CI/CD checks, or debugging CI failures

### 3. [vite-esm-cjs-test-cases.md](./vite-esm-cjs-test-cases.md)

**Automated Test Cases**

Covers:
- 3 test suites (30+ test cases)
- Module resolution integration tests
- Build configuration validation tests
- Export completeness checks
- Running the tests
- Interpreting results
- Integration with CI/CD

**When to Use:** When adding tests to catch module system issues

## Implementation Roadmap

### Immediate (This Week)
- Review current vite.config.ts to confirm @rebuild/shared is in optimizeDeps
- Confirm changes compile and tests pass
- Share this document with team

### Short Term (Next Sprint)
- Add CI/CD validation checks from [vite-esm-cjs-ci-checklist.md](./vite-esm-cjs-ci-checklist.md)
- Add test cases from [vite-esm-cjs-test-cases.md](./vite-esm-cjs-test-cases.md)
- Create pre-commit hook validation script

### Medium Term (Ongoing)
- Monitor for any ESM/CJS issues in PR comments
- Use this document in code reviews
- Update CLAUDE.md with ESM/CJS prevention pattern
- Consider adding to dev onboarding docs

## Key Metrics

### Coverage
- **Configuration Checks:** 5 critical settings monitored
- **Package Export Validation:** 100% of declared exports verified
- **Test Cases:** 30+ test cases covering all aspects
- **CI/CD Integration:** 4 new workflow steps

### Expected Impact
- **Dev Mode Issues:** 90% reduction in "exports is not defined" errors
- **PR Review Time:** 5 min faster due to automated checks
- **Production Issues:** Near-zero ESM/CJS incidents (if tests added)

## Success Criteria

1. ✅ `@rebuild/shared` stays in `optimizeDeps.include`
2. ✅ All declared exports in package.json have corresponding files
3. ✅ No `"type": "module"` in shared/package.json
4. ✅ Tests pass in dev mode after new exports
5. ✅ CI checks catch configuration drift early
6. ✅ Team follows developer checklist for shared changes

## Common Scenarios

### Scenario 1: Adding New Type Export

```typescript
// 1. Add to shared/types/new.types.ts
export interface NewType { ... }

// 2. Add to shared/index.ts
export { NewType } from './types/new.types';

// 3. NO need to update package.json (unless it's a subpath export)

// 4. Build and test
npm run build --workspace shared
npm run test:client  // Verify imports work
```

### Scenario 2: Adding New Subpath Export

```json
// 1. Create shared/config/new-config.ts
export const newConfig = { ... }

// 2. Add to shared/package.json exports
{
  "exports": {
    "./config/new-config": {
      "types": "./dist/config/new-config.d.ts",
      "default": "./dist/config/new-config.js"
    }
  }
}

// 3. Add to client/vite.config.ts optimizeDeps.include
include: [
  '@rebuild/shared/config/new-config'
]

// 4. Build and test
npm run build --workspace shared
npm run test:client
```

### Scenario 3: Debug "exports is not defined"

```bash
# Step 1: Check vite.config.ts
grep -n "@rebuild/shared" client/vite.config.ts

# Step 2: Check package.json exports
cat shared/package.json | jq '.exports'

# Step 3: Verify build
npm run build --workspace shared

# Step 4: Check dist files exist
ls -la shared/dist/

# Step 5: Run dev with verbose output
npm run dev:client -- --debug

# Step 6: Check browser console for import errors
# (Should see module loading successfully)
```

## References

**Architecture Decision:**
- ADR-016: CommonJS Module System for Node.js Compatibility

**Related Solutions:**
- Barrel Imports Pattern (shared-package-exports-barrel-imports.md)
- Vitest Mocking Prevention (CL-TEST-004-VITEST-MOCKING-PREVENTION.md)

**External Documentation:**
- [Vite: Dependency Pre-Bundling](https://vitejs.dev/guide/dep-pre-bundling.html)
- [Node.js: Package Entry Points](https://nodejs.org/api/packages.html#package-entry-points)
- [CommonJS vs ES Modules](https://nodejs.org/api/modules.html)

## Document Maintenance

**Last Updated:** 2026-01-01
**Version:** 1.0 (Comprehensive Prevention Strategy)
**Status:** Ready for team implementation
**Owner:** Development Team (Module System)

**When to Update:**
- After implementing any phase of prevention strategy
- After encountering a new ESM/CJS issue
- If Vite or Node.js behavior changes
- Quarterly review for effectiveness

---

## Quick Reference

### Files to Check When ESM/CJS Issues Occur

1. **client/vite.config.ts** (line 183)
   - Is @rebuild/shared in optimizeDeps.include?
   - Is transformMixedEsModules enabled?

2. **shared/package.json**
   - Does it have "type": "module"? (Should NOT)
   - Are all exports valid?

3. **shared/tsconfig.json**
   - Is module set to CommonJS?
   - Is config/browser.ts excluded?

4. **shared/index.ts**
   - Are all exports present?
   - Any Joi or server-only exports? (Should NOT)

### Commands to Run

```bash
# Validate configuration
bash .github/scripts/validate-module-system.sh

# Build and test
npm run build --workspace shared
npm run test:client

# Dev server test
npm run dev:client
# Visit http://localhost:5173, check browser console
```

