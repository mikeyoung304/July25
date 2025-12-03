# CL-TEST-003: Test Environment Isolation Prevention

**Issue:** Test environment configuration becomes polluted with production values, causing CI test failures that don't occur in local development.

**Impact:** 116+ test files fail in CI while passing locally, delaying deployments and eroding confidence in test suite.

**Status:** Prevention strategies documented. Implementation: Ready to adopt.

**Created:** 2025-12-03

---

## Problem Summary

### The Incident

CI tests failed for 116 test files (135+ tests) because:

1. **Environment Pollution**: Vercel CLI created `.env.test` with production values
2. **Configuration Mismatch**: Tests expected `NODE_ENV=test` but got `NODE_ENV=production`
3. **Missing Variables**: Server bootstrap was missing `DATABASE_URL` environment variable
4. **Wrong Test Values**: `VITE_DEFAULT_RESTAURANT_ID=grow` (slug) instead of UUID format tests expect

### Specific Problems

```bash
# What Vercel CLI created in .env.test:
NODE_ENV=production  # ← Wrong! Tests expect "test"
VITE_API_BASE_URL=https://july25.onrender.com  # ← Production URL
VITE_DEFAULT_RESTAURANT_ID=grow  # ← Slug format
# ... other production config

# What server bootstrap was missing:
DATABASE_URL  # ← No variable set at all

# What tests actually needed:
NODE_ENV=test
VITE_API_BASE_URL=http://localhost:3001
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111  # UUID
```

### Why Local Development Didn't Catch This

- Developers typically run with `.env` or `.env.local` containing test values
- Vercel CLI only runs in CI environment
- No validation to ensure `.env.test` contains actual test values
- No layer of defense to prevent production values from reaching tests

### Root Cause

The fundamental issue: **No systematic control over which environment files exist and what values they contain.**

- Temporary tools (Vercel CLI) created files that polluted the test environment
- Naming convention (.env.test) suggested it was intentional when it was accidental
- Git ignored these files, so they weren't validated before CI ran
- No pre-commit or CI check to verify environment configuration sanity

---

## Prevention Strategies

### Strategy 1: Environment File Hierarchy & Lock-in

**Principle:** Define explicit environment file structure with clear ownership.

**Implementation:**

```bash
# Committed to Git (version controlled):
├── .env.example           # Template, never with real values
├── .env.test              # LOCKED: test environment only
├── .env.production        # LOCKED: production template (not committed)
├── .env.development       # Optional: dev overrides
└── .env.local             # IGNORED: developer machine only

# NOT committed (gitignored):
├── .env                   # Computed at startup
├── .env.local             # Personal overrides
├── .env.*.local           # Temporary variations
└── .env.vercel.*          # Tool-generated, ephemeral
```

**Validation Rules:**

- `.env.test` is **committed to Git** with explicit test values
- `.env.test` is **never overwritten** by tools (rename intruders)
- Production `.env` values **never appear** in `.env.test`
- Missing `.env.test` should **fail CI immediately**

**Enforcement:**

```bash
# Pre-commit hook checks
- Verify .env.test exists
- Verify NODE_ENV=test in .env.test
- Verify no production URLs in .env.test
- Verify DATABASE_URL is set for server tests
- Verify VITE_* variables match test expectations
```

---

### Strategy 2: Tool-Generated File Renaming

**Principle:** Immediately rename tool-generated files to prevent pollution.

**Implementation:**

When external tools (Vercel CLI, AWS SAM, Terraform, etc.) create `.env.*` files:

1. **Detect**: Identify files created by tools (usually during deployment/build steps)
2. **Rename**: Move to `.env.[tool-name].*` convention
3. **Document**: Add comment in `.gitignore` explaining the rename
4. **Never Merge Back**: Treat as ephemeral, never include in Git

**Example: Vercel CLI Prevention**

```bash
# Vercel CLI tried to create .env.test
.vercel/project.json  # ← keep, needed for CLI
.env.vercel.*         # ← rename from .env.test, ephemeral
.env.test             # ← restore proper test config

# In .gitignore:
.vercel/*
!.vercel/project.json  # Keep project config

# Vercel CLI generated files (do not commit)
.env.vercel.*
```

**For Package Managers:**

```bash
# If npm/yarn/pnpm create temp env files
.env.npm-temp
.env.pnpm-temp
.env.yarn-temp

# If Docker/containers create env files
.env.docker-temp
.env.compose-temp

# If test frameworks generate env files
.env.jest-temp
.env.vitest-temp
```

**Detection Script:**

```bash
# Add to CI/CD pre-flight checks
#!/bin/bash
UNEXPECTED_ENV_FILES=$(find . -name ".env.*" \
  ! -name ".env.example" \
  ! -name ".env.test" \
  ! -name ".env.development" \
  ! -name ".env.production" \
  -type f)

if [ ! -z "$UNEXPECTED_ENV_FILES" ]; then
  echo "ERROR: Unexpected .env files found:"
  echo "$UNEXPECTED_ENV_FILES"
  echo ""
  echo "These should be renamed to .env.[tool-name].* or .gitignored:"
  echo "  - .env.vercel.* (Vercel CLI)"
  echo "  - .env.aws-* (AWS tools)"
  echo "  - .env.docker-* (Docker)"
  exit 1
fi
```

---

### Strategy 3: Environment Validation at Bootstrap

**Principle:** Fail fast if test environment is misconfigured.

**Implementation:**

```typescript
// server/tests/bootstrap.ts - Validate before any tests run
import { beforeAll } from 'vitest';

beforeAll(() => {
  const requiredForTests = [
    'NODE_ENV',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredForTests.filter(
    (key) => !process.env[key]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Test bootstrap failed. Missing required env vars:\n` +
      missingVars.map((k) => `  - ${k}`).join('\n') +
      `\nCheck .env.test or run: npm test`
    );
  }

  // Fail if NODE_ENV is not "test"
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `Invalid NODE_ENV for tests: "${process.env.NODE_ENV}"\n` +
      `Tests MUST run with NODE_ENV=test\n` +
      `Check .env.test or your environment configuration`
    );
  }

  // Fail if using production database URL
  const dbUrl = process.env.DATABASE_URL || '';
  if (
    dbUrl.includes('production') ||
    dbUrl.includes('render.com') ||
    dbUrl.includes('supabase.co') // Real Supabase endpoint
  ) {
    throw new Error(
      `CRITICAL: Using production DATABASE_URL in tests!\n` +
      `URL: ${dbUrl.split('@')[1]}\n` +
      `Tests must use local/test database\n` +
      `Set DATABASE_URL in .env.test to a test database`
    );
  }

  // Warn if using localhost restaurant ID (should be UUID)
  const defaultRestaurantId = process.env.VITE_DEFAULT_RESTAURANT_ID || '';
  if (!defaultRestaurantId.includes('-')) {
    console.warn(
      `WARN: VITE_DEFAULT_RESTAURANT_ID looks like a slug, not a UUID: "${defaultRestaurantId}"\n` +
      `Expected format: "11111111-1111-1111-1111-111111111111"\n` +
      `Check .env.test or client/test/setup.ts`
    );
  }
});

// client/test/setup.ts - Client-side validation
const requiredEnvVars = {
  VITE_API_BASE_URL: 'http://localhost:3001',
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  VITE_DEFAULT_RESTAURANT_ID: '11111111-1111-1111-1111-111111111111',
};

Object.entries(requiredEnvVars).forEach(([key, expectedType]) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Test setup failed. Missing ${key}\n` +
      `Set in .env.test or client/test/setup.ts`
    );
  }

  if (key === 'VITE_API_BASE_URL' && !value.includes('localhost')) {
    console.warn(
      `WARN: ${key} is not localhost: ${value}\n` +
      `Tests should use http://localhost:3001\n` +
      `Check .env.test`
    );
  }
});
```

---

### Strategy 4: Gitignore Precision

**Principle:** Explicitly allow test env while blocking everything else.

**Implementation:**

```bash
# .gitignore - Clear intent

# ==== Environment Files ====
# RULE: All .env* files are ignored EXCEPT:
#   - .env.example (template)
#   - .env.test (test environment - REQUIRED)

.env              # Local development overrides
.env.*            # All env variants are ignored by default
!.env.example     # EXCEPTION: Template file
!.env.test        # EXCEPTION: Test environment config

# Vercel CLI generated files (do not commit)
.env.vercel.*

# AWS/Other tool generated files (do not commit)
.env.aws-*
.env.docker-*
.env.terraform-*

# ==== Explanation ====
# If you accidentally created .env.test with production values:
#   1. Delete it: rm .env.test
#   2. Restore from Git: git checkout .env.test
#   3. Or restore from backup: git show HEAD:.env.test > .env.test
#
# If tools (Vercel, AWS) created .env files:
#   1. Rename them: mv .env.test .env.vercel.development
#   2. Add to .gitignore pattern above
#   3. Never commit tool-generated files
```

**Verification:**

```bash
# Check which env files git would track
git check-ignore -v .env.test          # Should NOT ignore
git check-ignore -v .env.vercel.*      # Should ignore
git check-ignore -v .env.local         # Should ignore

# Add to pre-commit hook
git check-ignore -v .env.test || {
  echo "ERROR: .env.test is gitignored but shouldn't be"
  exit 1
}
```

---

### Strategy 5: CI/CD Pre-Flight Checks

**Principle:** Validate environment before running tests.

**Implementation:**

```bash
# ci/preflight-checks.sh
#!/bin/bash
set -e

echo "=== CI Pre-Flight Environment Checks ==="

# 1. Verify .env.test exists
if [ ! -f ".env.test" ]; then
  echo "❌ FAIL: .env.test not found"
  echo "   Tests require .env.test with test configuration"
  exit 1
fi
echo "✓ .env.test exists"

# 2. Verify NODE_ENV=test
NODE_ENV_VALUE=$(grep "^NODE_ENV=" .env.test | cut -d= -f2)
if [ "$NODE_ENV_VALUE" != "test" ]; then
  echo "❌ FAIL: NODE_ENV in .env.test is '$NODE_ENV_VALUE', expected 'test'"
  exit 1
fi
echo "✓ NODE_ENV=test"

# 3. Verify no production URLs
if grep -q "july25.onrender.com\|production\|supabase.co" .env.test; then
  echo "❌ FAIL: .env.test contains production URLs"
  echo "   Found:"
  grep "july25.onrender.com\|production\|supabase.co" .env.test
  exit 1
fi
echo "✓ No production URLs in .env.test"

# 4. Verify UUID format for default restaurant
RESTAURANT_ID=$(grep "^VITE_DEFAULT_RESTAURANT_ID=" .env.test | cut -d= -f2)
if [[ ! $RESTAURANT_ID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "⚠️  WARN: VITE_DEFAULT_RESTAURANT_ID doesn't look like a UUID: $RESTAURANT_ID"
  echo "   Expected: 11111111-1111-1111-1111-111111111111"
  # Don't fail, just warn
fi
echo "✓ VITE_DEFAULT_RESTAURANT_ID format"

# 5. Check for unexpected .env files
UNEXPECTED=$(find . -maxdepth 1 -name ".env.*" \
  ! -name ".env.test" \
  ! -name ".env.example" \
  ! -name ".env.vercel.*" \
  -type f 2>/dev/null || true)

if [ ! -z "$UNEXPECTED" ]; then
  echo "⚠️  WARN: Unexpected .env files found:"
  echo "$UNEXPECTED"
  echo "   These should be renamed or added to .gitignore"
fi

echo ""
echo "✅ All pre-flight checks passed"
```

**Add to CI Pipeline:**

```yaml
# .github/workflows/test.yml
jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Pre-flight environment checks
        run: bash ci/preflight-checks.sh

  test:
    needs: preflight  # Must pass preflight before tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
```

---

### Strategy 6: Developer Documentation & Onboarding

**Principle:** Make expected environment configuration clear and discoverable.

**Implementation:**

#### 1. Environment Setup Guide (`docs/ENVIRONMENT.md`)

```markdown
# Environment Configuration Guide

## Overview

This project uses a single `.env.test` file for test environments (committed to Git)
and `.env.local` for local development (in .gitignore).

## Test Environment (.env.test)

**Location:** `/.env.test`
**Status:** Committed to Git ✓
**Should contain:** Test values ONLY

### Required Variables

- `NODE_ENV=test` - CRITICAL: Tests check this
- `DATABASE_URL=postgresql://test:test@localhost:5432/test_db`
- `VITE_API_BASE_URL=http://localhost:3001`
- `VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111`

### Common Mistakes

❌ Never put production URLs in .env.test
❌ Never commit .env without explicit exception
❌ Never set NODE_ENV=production for tests

## If Vercel CLI Creates .env.test

Vercel CLI may create .env.test with production values. **This is expected.**

1. Rename it: `mv .env.test .env.vercel.development`
2. Restore test config: `git checkout .env.test`
3. Both files should coexist

## Verification

```bash
# Check test environment is configured correctly
grep "NODE_ENV=test" .env.test        # Should match
grep "VITE_API_BASE_URL=http://localhost" .env.test  # Should match
grep "production\|onrender.com" .env.test  # Should NOT match
```
```

#### 2. Checklist in PR Template

```markdown
## Environment Configuration Checklist

- [ ] I have not modified `.env.test` with production values
- [ ] I have verified `.env.test` contains `NODE_ENV=test`
- [ ] I have verified no production URLs in `.env.test`
- [ ] I ran `npm test` and all tests pass locally
- [ ] I checked that `.env.test` is included in my commit (not ignored)

### If you see test failures in CI but not locally:

1. Check your `.env.test` - may have production values
2. Run: `git checkout .env.test` to restore from Git
3. Delete any `.env.*.local` files that might override it
4. Re-run tests: `npm test`
```

#### 3. Onboarding Script

```bash
# scripts/setup-test-env.sh
#!/bin/bash

echo "Setting up test environment..."

# 1. Check if .env.test is in good state
if grep -q "production\|july25.onrender.com" .env.test 2>/dev/null; then
  echo "⚠️  WARN: .env.test contains production values"
  echo "Restoring from Git..."
  git checkout .env.test
fi

# 2. Verify .env.test exists
if [ ! -f ".env.test" ]; then
  echo "❌ ERROR: .env.test not found"
  echo "Run: git checkout .env.test"
  exit 1
fi

# 3. Verify contents
if ! grep -q "NODE_ENV=test" .env.test; then
  echo "❌ ERROR: NODE_ENV not set to test"
  echo "Check .env.test contents"
  exit 1
fi

echo "✅ Test environment configured"
echo "Ready to run: npm test"
```

---

### Strategy 7: Environment Variable Naming Conventions

**Principle:** Make purpose clear in variable names.

**Implementation:**

```env
# .env.test - Clear naming conventions

# Environment identifier (not NODE_ENV which is also used by build tools)
TEST_ENVIRONMENT=test

# Database: Always include "test" or "local" in test config
DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# API: Test/localhost vs production
VITE_API_BASE_URL=http://localhost:3001         # Test
# NEVER: https://july25.onrender.com             # Production

# Default resource: UUID format for tests
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111  # Test UUID
# NEVER: grow                                    # Production slug

# Feature flags: Disable external services in tests
VITE_USE_REALTIME_VOICE=false
VITE_USE_MOCK_DATA=true
VITE_ENABLE_PERF=false
VITE_DEBUG_VOICE=false
VITE_DEMO_PANEL=false
```

**Rationale:**
- Variable names should hint at their environment
- URLs with "localhost" = test
- UUIDs vs slugs make intent clear
- Boolean flags with `false` indicate test mode

---

### Strategy 8: Monitoring & Alerting

**Principle:** Detect environment misconfiguration before it breaks tests.

**Implementation:**

```typescript
// scripts/validate-env.ts - Run in CI before tests

interface EnvValidation {
  variable: string;
  expectedPattern?: RegExp;
  shouldExist: boolean;
  shouldNotContain?: string[];
  isCritical: boolean;
}

const validations: EnvValidation[] = [
  {
    variable: 'NODE_ENV',
    expectedPattern: /^test$/,
    shouldExist: true,
    isCritical: true,
  },
  {
    variable: 'DATABASE_URL',
    shouldNotContain: ['production', 'supabase.co'],
    shouldExist: true,
    isCritical: true,
  },
  {
    variable: 'VITE_API_BASE_URL',
    expectedPattern: /^http:\/\/localhost/,
    shouldExist: true,
    isCritical: true,
  },
  {
    variable: 'VITE_DEFAULT_RESTAURANT_ID',
    expectedPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    shouldExist: true,
    isCritical: false, // Warning only
  },
];

function validateEnvironment(): void {
  const issues: string[] = [];
  const warnings: string[] = [];

  for (const validation of validations) {
    const value = process.env[validation.variable];

    // Check existence
    if (validation.shouldExist && !value) {
      const msg = `Missing critical variable: ${validation.variable}`;
      if (validation.isCritical) {
        issues.push(msg);
      } else {
        warnings.push(msg);
      }
      continue;
    }

    // Check pattern
    if (validation.expectedPattern && !validation.expectedPattern.test(value!)) {
      const msg = `Invalid format for ${validation.variable}: ${value}`;
      if (validation.isCritical) {
        issues.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    // Check forbidden strings
    if (validation.shouldNotContain) {
      const forbidden = validation.shouldNotContain.find(
        (str) => value?.includes(str)
      );
      if (forbidden) {
        const msg = `${validation.variable} contains forbidden value: "${forbidden}"`;
        if (validation.isCritical) {
          issues.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }
  }

  // Report
  if (warnings.length > 0) {
    console.warn('⚠️  Environment Warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (issues.length > 0) {
    console.error('❌ Environment Validation Failed:');
    issues.forEach((i) => console.error(`  - ${i}`));
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

validateEnvironment();
```

---

## Best Practices

### 1. Never Override Test Configuration Locally

```bash
# ❌ WRONG: This breaks CI/local sync
echo "VITE_API_BASE_URL=http://mycomputer.local" >> .env.local

# ✓ CORRECT: Use .env.test for all tests
# Edit .env.test and commit it
```

### 2. Commit .env.test Early & Often

```bash
# When creating new test variables:
git add .env.test
git commit -m "test: add VITE_NEW_VARIABLE to test env"
# This ensures CI and all developers have same config
```

### 3. Document Env Changes in Commit Messages

```bash
# Good commit message:
git commit -m "test: update DATABASE_URL for new Supabase project

Also updated SUPABASE_URL to match new project ID.
Tests still use local values, see .env.test"

# Poor commit message:
git commit -m "update env"
```

### 4. Use .env.example as Living Documentation

```bash
# .env.example should be updated when new variables added
# but with placeholder values, never real ones

VITE_NEW_FEATURE_URL=https://your-api-endpoint-here
# Don't use: VITE_NEW_FEATURE_URL=https://july25.onrender.com
```

### 5. Validate in Multiple Layers

```typescript
// Layer 1: Bootstrap (fastest, catches most issues)
// server/tests/bootstrap.ts
if (process.env.NODE_ENV !== 'test') throw ...

// Layer 2: Environment loader (development time)
// client/src/config/env.ts
if (!process.env.VITE_API_BASE_URL) throw ...

// Layer 3: Pre-flight checks (CI time)
// ci/preflight-checks.sh
grep "NODE_ENV=test" .env.test || exit 1
```

---

## Checklist: Implementing Prevention

- [ ] **File Structure** - Verify .env.test is committed, others ignored
- [ ] **Gitignore** - Update with clear allow/deny rules
- [ ] **Bootstrap** - Add validation to server/tests/bootstrap.ts
- [ ] **Client Setup** - Add env validation to client/test/setup.ts
- [ ] **CI Pipeline** - Add preflight checks before tests run
- [ ] **Documentation** - Create docs/ENVIRONMENT.md
- [ ] **PR Template** - Add env checklist to code review process
- [ ] **Onboarding** - Create setup-test-env.sh script
- [ ] **Monitoring** - Add validate-env.ts to CI pipeline

---

## Warning Signs: This Issue Is Happening Again

### Red Flags to Watch For

1. **Tests pass locally, fail in CI**
   ```
   Local: npm test → PASS
   CI: npm test → FAIL

   Likely cause: Different .env configuration
   Check: Is .env.test in git? Does CI load .env.test?
   ```

2. **TEST_ENV or NODE_ENV wrong in CI**
   ```
   npm test logs show: "NODE_ENV=production"
   But you never set that anywhere

   Likely cause: Tool-generated .env file
   Check: git log --name-status recent commits
   ```

3. **Database connection errors in CI only**
   ```
   CI error: "Cannot connect to database"
   Local: Works fine

   Likely cause: DATABASE_URL missing or using production DB
   Check: echo $DATABASE_URL in CI logs
   ```

4. **Different restaurant IDs in logs**
   ```
   Local logs: restaurant_id=11111111-1111-1111...
   CI logs: restaurant_id=grow

   Likely cause: .env.test has wrong VITE_DEFAULT_RESTAURANT_ID
   Check: grep VITE_DEFAULT_RESTAURANT_ID .env.test
   ```

5. **Unexpected files in git status before CI**
   ```
   git status shows: .env.vercel.development
                     .env.aws-temp
                     .env.docker-something

   Likely cause: Tool pollution, rename these
   Check: git check-ignore to verify they're ignored
   ```

### Investigation Procedure

When tests fail in CI but pass locally:

```bash
# Step 1: Check which .env files exist
ls -la .env*

# Step 2: Compare CI vs local
echo "=== Local .env.test ==="
cat .env.test

echo "=== Git version of .env.test ==="
git show HEAD:.env.test

echo "=== CI environment (check build logs) ==="
# Look for "NODE_ENV=", "DATABASE_URL", etc.

# Step 3: Verify .env.test is committed
git log -p --follow .env.test | head -20

# Step 4: Check for .env file pollution
find . -maxdepth 1 -name ".env*" -type f

# Step 5: If something is wrong:
git restore .env.test
git check-ignore -v .env*
```

---

## Quick Reference

| Problem | Sign | Fix |
|---------|------|-----|
| Test fails in CI only | Different NODE_ENV in logs | Verify .env.test is committed |
| DATABASE_URL missing | DB connection error in CI | Add DATABASE_URL to .env.test |
| Wrong restaurant ID | Tests using slug instead of UUID | Check VITE_DEFAULT_RESTAURANT_ID format |
| Vercel pollution | Extra .env.vercel.* files | Rename them, update .gitignore |
| .env.test has prod values | Tests fail: wrong API URL | Run: `git checkout .env.test` |
| Different env locally vs CI | npm test passes locally, fails CI | Check that .env.test is in git |

---

## Related Lessons

- **CL-TEST-001**: Mock drift prevention - related test quality issue
- **CL-TEST-002**: Test hang prevention - related CI issue
- **CL-BUILD-001**: Vercel production flag - related deployment issue
- **CL-DB-001**: Migration sync - related environment issue

---

## References

### Files Modified in Fix

- `/Users/mikeyoung/CODING/rebuild-6.0/.env.test` - Test environment config
- `/Users/mikeyoung/CODING/rebuild-6.0/.gitignore` - File ignore rules
- `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/bootstrap.ts` - Server bootstrap

### Commit

```
commit 2fb587dd789f6fe04c33906f4b189f8a0bfcb756
fix: resolve test env isolation issues causing ci failures

- add DATABASE_URL to server test bootstrap (was missing)
- create proper .env.test with test values (not production)
- rename vercel-generated .env.test to .env.vercel.development
- update .gitignore to track .env.test but ignore vercel files

fixes 116 failing test files in ci
```

---

## Success Metrics

**Implementation successful when:**

1. `.env.test` is committed to Git with only test values
2. All developers have identical test configuration
3. CI tests pass without environment-related failures
4. Pre-flight checks run and pass before test suite
5. Accidental tool pollution is caught and renamed
6. New developers can run `npm test` without setup
7. Zero "tests pass locally, fail in CI" incidents

**Ongoing monitoring:**

```bash
# Add to monitoring dashboard
- % of CI runs that fail on env validation
- Time to detect environment misconfiguration
- Number of unexpected .env files created by tools
- Test pass rate in CI vs local development
```

---

**Lesson ID:** CL-TEST-003
**Category:** Testing / CI/CD / Environment
**Impact:** High (prevents 116+ test failures in CI)
**Effort to Implement:** Medium (1-2 days)
**Effort to Maintain:** Low (mostly automation)
**Recommended For:** All developers, DevOps/SRE, QA
**First Implemented:** 2025-12-03

