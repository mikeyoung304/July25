# CL-TEST-003 Quick Reference: Test Environment Isolation

**Problem:** Test environment polluted with production values → CI tests fail → local dev doesn't catch it

**Root Cause:** Tool-generated `.env` files + missing validation = environment mismatch

---

## The 5-Minute Fix

When you see "tests pass locally, fail in CI":

```bash
# 1. Check if .env.test has production values
grep "production\|onrender.com" .env.test

# 2. Restore proper test environment
git checkout .env.test

# 3. Verify NODE_ENV=test
grep "NODE_ENV" .env.test

# 4. Run tests
npm test

# That's it - 95% of the time this fixes it
```

---

## Prevention Checklist

### Before Writing Tests

- [ ] `.env.test` exists and is committed to Git
- [ ] `.env.test` contains `NODE_ENV=test`
- [ ] No production URLs in `.env.test`
- [ ] DATABASE_URL points to test database
- [ ] VITE_DEFAULT_RESTAURANT_ID is UUID format

### When Adding New Environment Variables

- [ ] Added to `.env.test` with TEST value
- [ ] Added to `.env.example` with placeholder
- [ ] Validated in `server/tests/bootstrap.ts`
- [ ] Documented in `docs/ENVIRONMENT.md`
- [ ] Committed `.env.test` change to Git

### In Code Review

- [ ] No `.env.test` with production values
- [ ] No temporary tool files (`.env.vercel.*`, etc.) committed
- [ ] `.gitignore` properly excludes non-test env files
- [ ] Bootstrap validates critical variables

### In CI Pipeline

- [ ] Pre-flight checks run before tests
- [ ] `.env.test` validation passes
- [ ] NODE_ENV=test verified
- [ ] No production URLs detected

---

## Critical Rules

```typescript
// ✅ CORRECT: Test values only
// .env.test
NODE_ENV=test
VITE_API_BASE_URL=http://localhost:3001
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
DATABASE_URL=postgresql://test:test@localhost:5432/test_db

// ❌ WRONG: Never production values
NODE_ENV=production
VITE_API_BASE_URL=https://july25.onrender.com
VITE_DEFAULT_RESTAURANT_ID=grow
DATABASE_URL=postgres://prod.server.com/prod_db
```

---

## File Structure

```
rebuild-6.0/
├── .env.test              ✅ COMMIT - Test values only
├── .env.example           ✅ COMMIT - Template with placeholders
├── .env.local             ❌ GITIGNORE - Developer overrides
├── .env.vercel.*          ❌ GITIGNORE - Tool-generated
└── .env                   ❌ GITIGNORE - Computed at runtime
```

---

## Tool Pollution Quick Fixes

### Vercel CLI Created .env.test?

```bash
# 1. See what Vercel created
cat .env.test

# 2. If it has production values:
mv .env.test .env.vercel.development

# 3. Restore correct test env
git checkout .env.test

# 4. Update .gitignore to ignore future Vercel files
# (already done - just make sure)
grep ".env.vercel" .gitignore
```

### AWS/Docker/Other Tools?

```bash
# Same pattern: rename and restore

# For AWS
mv .env.test .env.aws-temp
git checkout .env.test

# For Docker
mv .env.test .env.docker-temp
git checkout .env.test

# Update .gitignore with pattern:
.env.[tool-name]-*
```

---

## Common Problems & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Tests fail in CI only | Different .env.test | `git checkout .env.test` |
| NODE_ENV=production in logs | Tool overwrote .env.test | Rename tool file, restore Git |
| DATABASE_URL missing | Not in bootstrap | Add to server/tests/bootstrap.ts |
| Wrong restaurant ID | UUID vs slug mismatch | Verify format in .env.test |
| .env* files in git status | Tool pollution | Rename with pattern, add to .gitignore |

---

## Bootstrap Validation Template

```typescript
// server/tests/bootstrap.ts
const CRITICAL_ENV_VARS = {
  NODE_ENV: 'test',
  DATABASE_URL: /^postgresql:\/\/(localhost|test)/, // Must be local
};

for (const [key, expected] of Object.entries(CRITICAL_ENV_VARS)) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing critical env var: ${key} (required for tests)`);
  }
  if (expected instanceof RegExp && !expected.test(value)) {
    throw new Error(`Invalid ${key}: ${value} (expected test/localhost value)`);
  }
  if (typeof expected === 'string' && value !== expected) {
    throw new Error(`Wrong ${key}: ${value} (expected: ${expected})`);
  }
}
```

---

## Pre-Flight Check (Add to CI)

```bash
#!/bin/bash
# ci/preflight-checks.sh

echo "Checking test environment..."

# Must have test env
test -f .env.test || { echo "Missing .env.test"; exit 1; }

# Must NOT have production values
grep -q "production\|july25.onrender" .env.test && {
  echo "ERROR: .env.test has production values"
  exit 1
}

# Must have NODE_ENV=test
grep -q "NODE_ENV=test" .env.test || {
  echo "ERROR: NODE_ENV not set to test"
  exit 1
}

echo "✅ Test environment valid"
```

---

## Developer Onboarding Script

```bash
#!/bin/bash
# scripts/setup-test-env.sh

# Restore test environment from Git if corrupted
if grep -q "production\|onrender.com" .env.test 2>/dev/null; then
  echo "Restoring test environment..."
  git checkout .env.test
fi

# Verify critical variables
for var in NODE_ENV DATABASE_URL VITE_API_BASE_URL; do
  if ! grep -q "^$var=" .env.test; then
    echo "ERROR: Missing $var in .env.test"
    exit 1
  fi
done

echo "✅ Test environment ready"
```

---

## Environment Validation Levels

### Level 1: Fast (Bash - runs in <100ms)
```bash
grep "NODE_ENV=test" .env.test
grep -v "production" .env.test
```

### Level 2: Medium (JavaScript/TypeScript - runs in 1-2s)
```typescript
if (process.env.NODE_ENV !== 'test') throw Error();
if (!process.env.DATABASE_URL) throw Error();
```

### Level 3: Deep (Logging + checks - runs in 5-10s)
```typescript
const validEnv = await validateEnvironment();
if (!validEnv) {
  logger.error('Environment validation failed', { env: process.env });
  throw Error();
}
```

---

## Prevention Layers (Defense in Depth)

```
Layer 1: Gitignore Rules
└─ Prevent tool files from being committed

Layer 2: File Naming Conventions
└─ .env.test (test) vs .env.vercel.* (tool)

Layer 3: Bootstrap Validation
└─ Fail fast before any tests run

Layer 4: Pre-Flight CI Checks
└─ Catch issues before test suite runs

Layer 5: Documentation & Onboarding
└─ Help developers understand why
```

---

## Key Insight

The fundamental issue wasn't any single mistake - it was **lack of validation between layers**:

- No check that `.env.test` actually contains test values
- No check that DATABASE_URL was provided
- No fast feedback loop to detect mismatch

**Solution:** Add validation at multiple layers so issues fail **immediately** and **obviously**.

---

## When to Reference Full Lesson

Read `CL-TEST-003-env-isolation-prevention.md` when:

- Implementing prevention strategies (8 detailed strategies with code)
- Designing CI/CD pipeline changes
- Creating team training materials
- Deep-diving into root cause analysis

Read this quick reference when:

- Tests are failing due to environment issue (5-minute fix)
- Need to verify prevention is in place
- Code reviewing someone's env changes
- Onboarding new developer to project

---

## Command Reference

```bash
# Quick diagnosis
ls -la .env*
echo $NODE_ENV
echo $DATABASE_URL

# Restore from Git
git checkout .env.test

# Verify test environment
grep "NODE_ENV=test" .env.test
grep "localhost" .env.test
grep -v "production\|onrender" .env.test

# Check what's committed
git check-ignore -v .env*

# Run tests with debug
DEBUG_ENV=1 npm test

# Validate in CI
bash ci/preflight-checks.sh
npm run validate:env
```

---

**See Also:** CL-TEST-003-env-isolation-prevention.md (full lesson)

