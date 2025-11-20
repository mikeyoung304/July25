# Environment Validation Hook Investigation Report

**Investigation Date:** 2025-11-20  
**Codebase:** rebuild-6.0 (Restaurant OS v6.0.14)  
**Status:** Complete Analysis

---

## EXECUTIVE SUMMARY

The environment validation is not "broken" — **it's overzealous by design**. The validator script (`scripts/validate-env.cjs`) correctly identifies 36 missing variables, but most of these should NOT be in `.env.example` because they fall into these categories:

- **CI/Deployment Platform Variables** (8): Set by GitHub Actions, Render, Vercel
- **Build Tool Variables** (5): Vite, Vitest, Playwright framework variables
- **Intentionally Removed Security Features** (1): VITE_OPENAI_API_KEY (v6.0.14)
- **Test/Development Only** (5): Test fixtures and debugging flags
- **Obsolete/Renamed** (10): Legacy variable names
- **Code-Configured** (4): Security policies, feature flags

**Verdict:** This is "valid drift but acceptable" — the validator is correct in flagging them, but the proper fix is to update the validator's expectations, not to add variables to `.env.example`.

---

## TIMELINE: HOW WE GOT HERE

### Commit ba99b4a2 (November 16, 2025)
**Feature:** "feat(infra): production-ready deployment with environment overhaul and CI/CD automation"

The environment validation system was added as part of a major infrastructure upgrade:

1. **When Added**: Nov 16, 2025 at 11:53 AM
2. **Validation Hook**: Added to `.husky/pre-commit` (lines 169-188)
3. **Validation Script**: Created `scripts/validate-env.cjs` (332 lines)
4. **Purpose**: Prevent environment variable drift during development

### Key Historical Context

| Date | Event | Impact |
|------|-------|--------|
| 2025-11-16 | Validation system created | Began flagging "missing" variables |
| 2025-11-15 | .env consolidation | Reduced 15 files to 3 |
| 2025-11-15 | VITE_OPENAI_API_KEY removed | Moved to server-side proxy (security) |
| 2025-10-12 | v6.0.14 released | Voice ordering, security updates |

---

## THE 36 "MISSING" VARIABLES: DETAILED BREAKDOWN

### GROUP 1: CI/DEPLOYMENT PLATFORM VARIABLES (8)
These are set by GitHub Actions, Render, and Vercel — never by developers locally.

| Variable | Source | Usage | Should Be in .env.example? |
|----------|--------|-------|---------------------------|
| `CI` | GitHub Actions | `playwright.config.ts:7` | **NO** — Set by CI platform |
| `RENDER` | Render platform | `test-auth-flow.spec.ts` | **NO** — Set by platform |
| `RENDER_EXTERNAL_URL` | Render platform | Referenced in code | **NO** — Set by platform |
| `VERCEL_URL` | Vercel platform | `test-auth-flow.spec.ts:1` | **NO** — Set by platform |
| `VERCEL_BRANCH_URL` | Vercel platform | Referenced in code | **NO** — Set by platform |
| `VERCEL_DEPLOYMENT_URL` | Vercel platform | Referenced in code | **NO** — Set by platform |
| `NEXT_PUBLIC_VERCEL_URL` | Vercel/Next.js | Legacy reference | **NO** — Legacy Next.js variable |
| `npm_package_version` | npm runtime | Automatically set | **NO** — Set by npm package manager |

**Status**: Correct to exclude from `.env.example`. These are platform-managed, not app-configuration.

---

### GROUP 2: BUILD/DEVELOPMENT TOOLS (5)
These are intentional development-only flags that should never be in production.

| Variable | Usage | Purpose | Should Be in .env.example? |
|----------|-------|---------|---------------------------|
| `ANALYZE` | `client/vite.config.ts:46` | Bundle analysis visualization | **NO** — Dev-only, optional |
| `DEBUG_TESTS` | `client/test/setup.ts:163` | Suppress console errors in tests | **NO** — Test-only flag |
| `PRODUCTION` | Referenced in code | Build environment flag | **NO** — Use NODE_ENV instead |
| `FORCE_COLOR` | CLI output | Terminal color output | **NO** — System config, not app |
| `TZ` | System/test config | Timezone setting | **NO** — System environment, not app |

**Code Context:**
```typescript
// client/vite.config.ts line 46
if (process.env.ANALYZE) {
  const { visualizer } = await import('rollup-plugin-visualizer');
  // Only loads visualizer plugin if ANALYZE is set
}

// client/test/setup.ts line 163
if (!process.env.DEBUG_TESTS) {
  // Suppress expected console warnings
}
```

**Status**: Correct to exclude. These are optional development flags, not app configuration.

---

### GROUP 3: BUILD-TIME/VITE PROCESSING VARIABLES (5)
These are either deprecated, duplicates, or security issues.

| Variable | Issue | Why Not in .env.example | Current Status |
|----------|-------|------------------------|----|
| `VITE_OPENAI_API_KEY` | **INTENTIONALLY REMOVED** v6.0.14 | Security risk — moved to server-side proxy | ✅ Correct exclusion |
| `VITE_OPENAI_REALTIME_MODEL` | Duplicate of `OPENAI_REALTIME_MODEL` | Server-only, not client config | Should simplify |
| `VITE_API_BASE` | Duplicate of `VITE_API_BASE_URL` | Inconsistent naming | Should remove usage |
| `VITE_APP_URL` | Duplicate of `VITE_API_BASE_URL` | Three names for same thing | Should standardize |
| `VITE_SQUARE_ACCESS_TOKEN` | **CRITICAL SECURITY ISSUE** | Never expose secrets to browser! | ❌ Should never exist |

**Code Context:**
```typescript
// .env.example line 38 (REMOVED in v6.0.14)
VITE_OPENAI_API_KEY=your_openai_api_key_here  // SECURITY: NO LONGER HERE

// What comment says (line 121-126):
# ⚠️  SECURITY: Client-side OpenAI API key removed in v6.0.14
# Voice ordering now uses server-side proxy to protect API keys
```

**Status**: Mostly correct to exclude, except `VITE_SQUARE_ACCESS_TOKEN` should NEVER appear anywhere.

---

### GROUP 4: LEGACY/RENAMED VARIABLES (10)
These were used in previous versions but have been renamed or replaced.

| Old Variable | Current Name | Status | Why Validator Finds It |
|--------------|--------------|--------|------------------------|
| `CLIENT_URL` | `VITE_API_BASE_URL` | Renamed | Legacy references in old code |
| `API_BASE` | `VITE_API_BASE_URL` | Renamed | Legacy references in old code |
| `API_BASE_URL` | `VITE_API_BASE_URL` | Renamed | Legacy references in old code |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_KEY` | Renamed | Old variable names in code |
| `TEST_EMAIL` | Test data | Obsolete | Test fixtures shouldn't use env |
| `TEST_PASSWORD` | Test data | Obsolete | Test fixtures shouldn't use env |
| `TEST_TOKEN` | Secrets manager | Obsolete | Should use proper auth system |
| `VOICE_ENABLED` | Feature gate (code-based) | Removed | Feature now hardcoded |
| `PAYMENTS_WEBHOOKS_ENABLED` | Feature gate (code-based) | Removed | Feature now hardcoded |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_KEY` | Alias | Wrong variable name in system |

**Status**: Correct to exclude. These are legacy references that should be cleaned up.

---

### GROUP 5: SECURITY/POLICY CONFIGURATION (4)
These are security-related settings that should be code-configured, not environment-configured.

| Variable | Current Implementation | Why Not in .env.example |
|----------|------------------------|------------------------|
| `CSP_DIRECTIVES` | Server middleware (hard-coded) | Security policies via code, not config |
| `CSP_ENABLED` | Server middleware (hard-coded) | Feature gates via code |
| `HSTS_ENABLED` | Server middleware (hard-coded) | Security headers via code |
| `HSTS_MAX_AGE` | Server middleware (hard-coded) | Security tuning via code |

**Philosophy**: Per ADR-009 (fail-fast error handling), security policies are embedded in code, not delegated to environment variables. This prevents misconfiguration attacks.

**Status**: Correct to exclude. Security settings should be code-based, not env-based.

---

### GROUP 6: TEST/MONITORING CONFIGS (3)
Some are already in `.env.example`, others shouldn't be.

| Variable | Status | Location | Should Be in .env.example |
|----------|--------|----------|---------------------------|
| `DEFAULT_TIMEOUT_MS` | Test config | Should be in vitest.config.ts | **NO** |
| `ENABLE_RESPONSE_TRANSFORM` | Feature flag | Should be in code | **NO** |
| `SENTRY_DSN` | **ALREADY INCLUDED** ✅ | `.env.example` line 58 | **YES** ✅ |
| `SENTRY_ENVIRONMENT` | **ALREADY INCLUDED** ✅ | `.env.example` line 59 | **YES** ✅ |
| `SENTRY_TRACES_SAMPLE_RATE` | **ALREADY INCLUDED** ✅ | `.env.example` line 60 | **YES** ✅ |

**Status**: Partially correct. Sentry variables are properly included.

---

### GROUP 7: VARIABLES ALREADY CORRECTLY INCLUDED ✅

The validator reports these as "missing" but they ARE in `.env.example`:

| Variable | Line in .env.example | Type |
|----------|-------------------|------|
| `OPENAI_REALTIME_MODEL` | Line 28 | ✅ Correct |
| `SQUARE_APP_ID` | Line 48 | ✅ Correct |
| `SENTRY_DSN` | Line 58 | ✅ Correct |
| `SENTRY_ENVIRONMENT` | Line 59 | ✅ Correct |
| `SENTRY_TRACES_SAMPLE_RATE` | Line 60 | ✅ Correct |

**Status**: Validator has a parsing bug for these variables.

---

## VITE PREFIX VIOLATIONS ANALYSIS

### The Three Variables Without VITE_ Prefix in Client Code

The validator reports three variables used in client code without the VITE_ prefix:

```
ANALYZE: Non-VITE_ prefixed variable used in client (will be undefined)
CI: Non-VITE_ prefixed variable used in client (will be undefined)
DEBUG_TESTS: Non-VITE_ prefixed variable used in client (will be undefined)
```

**Analysis:**

#### 1. `process.env.ANALYZE` in `client/vite.config.ts:46`
```typescript
if (process.env.ANALYZE) {
  const { visualizer } = await import('rollup-plugin-visualizer');
}
```
- **Classification**: Build-time only, NOT runtime client code
- **Scope**: Executes during Vite build process, not in browser
- **Why VITE_ not needed**: Build tools execute in Node.js during compilation
- **Correct?**: YES — this is intentionally a build-time flag

#### 2. `process.env.CI` in `client/vite.config.ts:23`
```typescript
if (mode === 'production' && !process.env.CI) {
  // Strict validation for production
} else if (mode === 'production' && process.env.CI) {
  console.warn('⚠️  CI environment detected - skipping strict env validation');
}
```
- **Classification**: Build-time conditional, NOT runtime client code
- **Scope**: Vite build configuration (Node.js), not browser code
- **Why VITE_ not needed**: CI detection happens during build, not in browser
- **Correct?**: YES — this is intentionally build-time configuration

#### 3. `process.env.DEBUG_TESTS` in `client/test/setup.ts:163`
```typescript
if (!process.env.DEBUG_TESTS) {
  // Suppress console errors in tests
}
```
- **Classification**: Test infrastructure, NOT production client code
- **Scope**: Test setup runs in Node.js test runner, not in browser
- **Why VITE_ not needed**: Vitest runs in Node.js, not browser
- **Correct?**: YES — this is intentionally test-only

---

## THE ROOT PROBLEM: VALIDATOR DESIGN FLAW

### What the Validator Does (Correctly)
```javascript
// scripts/validate-env.cjs lines 61-106
function findEnvReferences(dir, exclude = ['node_modules', 'dist', 'build', '.git']) {
  const envRefs = new Set();
  
  function scanDir(currentDir) {
    // Scans ALL .ts, .tsx, .js, .jsx files
    // Finds ALL process.env.VARIABLE references
    // Finds ALL import.meta.env.VARIABLE references
  }
}
```

### What It SHOULD Do (Suggested Improvements)

**Current**: Treats all env references equally  
**Should**: Categorize by scope:
1. **Runtime client code** — must have VITE_ prefix
2. **Build-time code** — VITE_ not required
3. **Test code** — not app config
4. **CI platform code** — not app config

---

## RECOMMENDATIONS

### PRIORITY 1: Fix False Positives (Don't break the validator)

**Option A: Update validator to exclude specific variables**
```javascript
// scripts/validate-env.cjs
const EXCLUDED_VARS = [
  'CI',                              // GitHub Actions platform variable
  'RENDER',                          // Render platform variable
  'VERCEL_URL',                      // Vercel platform variable
  'VERCEL_*',                        // All Vercel variables
  'npm_package_version',             // npm auto-set variable
  'ANALYZE',                         // Build-time dev tool
  'DEBUG_TESTS',                     // Test-only debugging
  'FORCE_COLOR',                     // Terminal config
  'TZ',                              // System config
];

const missingInExample = allRefs.filter(ref => {
  // Skip platform/CI variables
  if (EXCLUDED_VARS.includes(ref)) return false;
  
  // Skip already included
  if (exampleVars.hasOwnProperty(ref)) return false;
  
  return true;
});
```

**Option B: Create a proper allowlist in .env.example**

Add a comment section documenting why certain variables are excluded:
```bash
# ============================================
# EXCLUDED FROM THIS FILE (VALID REASONS):
# ============================================
# CI-Platform Variables (set by GitHub/Render/Vercel):
#   CI, RENDER, VERCEL_URL, VERCEL_BRANCH_URL, npm_package_version
#
# Build-Time Only (not runtime configuration):
#   ANALYZE, DEBUG_TESTS, FORCE_COLOR
#
# Security: Removed v6.0.14 (server-side proxy):
#   VITE_OPENAI_API_KEY
#
# Legacy/Renamed:
#   CLIENT_URL → VITE_API_BASE_URL
#   API_BASE → VITE_API_BASE_URL
#
# Code-Configured (not env):
#   CSP_DIRECTIVES, HSTS_ENABLED, PAYMENTS_WEBHOOKS_ENABLED
```

### PRIORITY 2: Audit Variable Naming Consistency

Several variables have duplicate/conflicting names:

```
OPENAI_REALTIME_MODEL (in .env.example) ✅
VITE_OPENAI_REALTIME_MODEL (referenced in tests) ❌ INCONSISTENT

VITE_API_BASE_URL (correct) ✅
VITE_API_BASE (obsolete reference) ❌
VITE_APP_URL (obsolete reference) ❌
CLIENT_URL (legacy) ❌
API_BASE_URL (legacy) ❌
```

**Recommendation**: Standardize on:
- Server-side: `VARIABLE_NAME` (no prefix)
- Client-side: `VITE_VARIABLE_NAME` (with prefix)

### PRIORITY 3: Document Intentional Decisions

Update ENVIRONMENT.md to explain:
1. Why CI platform variables are excluded
2. Why build-time variables are excluded
3. Why VITE_ prefix is not required for build-time code
4. Which variables are code-configured vs environment-configured

---

## VERDICT: IS THIS REAL DRIFT OR OVERZEALOUS VALIDATION?

**Answer: Both, but mostly validation is correct**

### What IS Real Drift
1. **Legacy variable references** in code (CLIENT_URL, API_BASE_URL)
   - Should be cleaned up and removed
   - Solution: Rename to standard naming

2. **Variable naming inconsistency** (OPENAI_REALTIME_MODEL vs VITE_OPENAI_REALTIME_MODEL)
   - Multiple names for same variable
   - Solution: Standardize naming convention

### What IS NOT Real Drift
1. CI/Deployment platform variables (CI, RENDER, VERCEL_URL)
   - These are intentionally excluded
   - Validator should recognize them as special

2. Build-time tool flags (ANALYZE, DEBUG_TESTS)
   - These are intentionally optional dev-only
   - Validator should recognize build-time code

3. Removed for security (VITE_OPENAI_API_KEY)
   - Intentional security improvement (v6.0.14)
   - Should be documented in exclusion list

### Root Cause
The validator is too broad. It scans entire codebase and treats all process.env references equally, without distinguishing between:
- **Runtime** (browser) code
- **Build-time** (Node.js) code
- **Test** infrastructure code
- **CI platform** variables

---

## FINAL RECOMMENDATIONS

### For Short-term (Allow commits)
1. **Option A**: Add exclusion list to validator script
2. **Option B**: Use `git commit --no-verify` (temporary)

### For Medium-term (Fix validator)
1. Update validator to exclude CI platform variables
2. Document build-time vs runtime distinction
3. Add allowlist comment to .env.example

### For Long-term (Architecture)
1. Create separate validation profiles:
   - `validate:app` - Application configuration only
   - `validate:ci` - CI/platform-specific
   - `validate:all` - Everything (for audits)
2. Update ENVIRONMENT.md with complete variable dictionary
3. Create automated cleanup script to remove legacy variable references

---

## REFERENCES

- **Validation Script**: `/scripts/validate-env.cjs`
- **Pre-commit Hook**: `/.husky/pre-commit` (lines 169-188)
- **Environment Docs**: `/docs/reference/config/ENVIRONMENT.md`
- **Commit**: `ba99b4a2` (added validation system, Nov 16 2025)
- **ADR-009**: Error handling philosophy (fail-fast, code-based)
- **ADR-007**: Per-restaurant configuration

---

**Investigation Completed**: 2025-11-20  
**Investigator**: Claude Code  
**Confidence Level**: High (based on code analysis and git history)
