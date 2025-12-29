# Phased Forward Plan - rebuild-6.0

**Last Updated:** 2025-12-29

**Created:** 2025-12-29
**Type:** Meta-Plan (orchestrating multiple workstreams)
**Priority:** P0 (merge PR) → P0 (tests) → P1 (schema) → P2 (cleanup)

---

## Executive Summary

You've completed significant security hardening work. Here's the recommended path forward:

| Phase | What | Priority | Effort | Dependency |
|-------|------|----------|--------|------------|
| 0 | Merge PR #164 | P0 | 5 min | None |
| 1 | Fix Test Suite | P0 | 30 min | Phase 0 |
| 2 | Resolve Schema Drift | P1 | 15 min | Phase 0 |
| 3 | Merge Dependabot PRs | P2 | 10 min | Phase 1 |
| 4 | Documentation Cleanup | P3 | 1 hr | None |

**Recommended immediate action:** Phase 0 + Phase 1 (merge and fix tests)

---

## Current State Analysis

### PR #164 Status: Ready to Merge

| Aspect | Status |
|--------|--------|
| Security fixes | 3 of 3 complete (#238, #239, #241) |
| Compound docs | Created (1,977 lines) |
| Breaking changes | None |
| Blockers | None |

### Test Suite Status: 12 Failing Test Files

**Root Cause:** Import path resolution for `@rebuild/shared/config/browser`

**NOT the issue:** NaN in order totals (this is properly handled with price sanitization)

**Failing Tests:**
- `src/pages/__tests__/ServerView.test.tsx`
- `src/pages/__tests__/WorkspaceDashboard.test.tsx`
- `src/hooks/__tests__/useWorkspaceAccess.test.tsx`
- `src/components/auth/__tests__/WorkspaceAuthModal.test.tsx`
- `src/components/kitchen/__tests__/ConnectionStatusBar.test.tsx`
- `src/modules/order-system/__tests__/CheckoutForm.test.tsx`
- `src/modules/order-system/__tests__/accessibility.test.tsx`
- `src/modules/order-system/__tests__/checkout-simple.test.tsx`
- `src/modules/order-system/__tests__/checkout.e2e.test.tsx`
- `src/modules/voice/services/orderIntegration.test.ts`
- `src/modules/voice/hooks/__tests__/useVoiceCommerce.test.ts`
- `src/services/websocket/WebSocketService.test.ts`

### Schema Drift Status: Minor (Non-Blocking)

**Issue #153:** `@ignore` annotation missing on `user_pins` relation

**Impact:** Cosmetic - affects Prisma schema generation only, not functionality

### Documentation Status: Good

| Item | Status |
|------|--------|
| docs/INDEX.md | Done |
| ADR Quick Links in CLAUDE.md | Done |
| Compound Engineering Protocol | Done |
| Audit archived | Done (10 files in docs/archive/2025-12/security-audit/) |

---

## Phase 0: Merge Security PR (5 minutes)

### Prerequisites
- [ ] Review PR #164 one final time

### Actions

```bash
# Merge the security hardening PR
gh pr merge 164 --squash -t "fix(payments): security hardening - idempotency, refund status, tenant validation"

# Delete the branch after merge
git checkout main
git pull origin main
git branch -d fix/security-hardening-p1-p2
```

### Verification
- [ ] PR merged successfully
- [ ] Main branch updated
- [ ] GitHub Actions pass on main

---

## Phase 1: Fix Test Suite (30 minutes)

### Root Cause Analysis

The test failures stem from `shared/package.json` export configuration:

```json
"./config/browser": {
  "types": "./config/browser.ts",
  "default": "./config/browser.ts"
}
```

**Problem:** Points to TypeScript source instead of built output, which Vitest can't resolve.

### Fix Option A: Update package.json exports (Recommended)

**File:** `shared/package.json`

```json
"./config/browser": {
  "types": "./dist/config/browser.d.ts",
  "import": "./dist/config/browser.js",
  "require": "./dist/config/browser.js"
}
```

Then rebuild shared:
```bash
cd shared && npm run build
```

### Fix Option B: Add Vitest alias

**File:** `client/vitest.config.ts`

```typescript
resolve: {
  alias: {
    '@rebuild/shared/config/browser': path.resolve(__dirname, '../shared/config/browser.ts')
  }
}
```

### Verification

```bash
# Run the test suite
cd client && npm test

# Expected: All 63 test files pass (51 already pass + 12 fixed)
```

### Acceptance Criteria
- [ ] All 12 failing test files now pass
- [ ] No new test failures introduced
- [ ] Import resolution works in both dev and test modes

---

## Phase 2: Resolve Schema Drift (15 minutes)

### Issue Details

GitHub Issue #153 shows minor schema drift:

```diff
- user_pins  user_pins[]  @ignore
+ user_pins  user_pins[]
```

The `@ignore` annotation was removed, which affects Prisma client generation.

### Fix

```bash
# Sync Prisma schema with production
cd server
npx prisma db pull

# Verify the schema looks correct
git diff prisma/schema.prisma

# Commit the sync
git add prisma/schema.prisma
git commit -m "chore(schema): sync Prisma with production (resolves #153)"
git push
```

### Close Issue

```bash
gh issue close 153 -c "Schema synced via prisma db pull"
```

---

## Phase 3: Merge Dependabot PRs (10 minutes)

### Open PRs

| PR | Type | Risk |
|----|------|------|
| #162 | Production deps (12 updates) | Medium - test after merge |
| #161 | Dev deps (3 updates) | Low |
| #154 | GitHub Actions (7 updates) | Low |

### Recommended Order

```bash
# 1. Low-risk first: GitHub Actions
gh pr merge 154 --squash

# 2. Dev dependencies
gh pr merge 161 --squash

# 3. Production dependencies (verify tests pass after)
gh pr merge 162 --squash
npm test  # Verify nothing broke
```

---

## Phase 4: Documentation Cleanup (1 hour)

### Remaining Items

The documentation is in good shape, but some cleanup remains:

| Task | Effort | Value |
|------|--------|-------|
| Remove empty docs directories | 15 min | Low - tidiness |
| Categorize recent investigation files | 30 min | Medium - discoverability |
| Consolidate voice documentation | 15 min | Low - consistency |

### Empty Directories to Remove

```bash
# These directories are empty (content moved elsewhere)
rmdir docs/adrs/        # ADRs are in docs/explanation/architecture-decisions/
rmdir docs/plans/       # Plans are in /plans/
rmdir docs/reports/     # No reports exist
rmdir docs/security/    # Security is at SECURITY.md
rmdir docs/specs/       # No specs exist
rmdir docs/strategy/    # No strategy docs
rmdir docs/testing/     # Testing guides in docs/guides/testing/
rmdir docs/voice/       # Voice docs scattered, needs consolidation
```

### Files Awaiting Categorization

Move to appropriate locations:
- `ERROR_BOUNDARY_*.md` → `docs/how-to/investigations/`
- `FLOOR_PLAN_RBAC_INVESTIGATION.md` → `docs/how-to/investigations/`
- `PHASE_1_COMPLETION_SUMMARY.md` → `docs/archive/2025-12/`
- `WORK_PLAN_TEST_FIXES.md` → `docs/archive/2025-12/`

---

## Deferred Security Items (Reference)

These items were reviewed and deferred during the sprint:

| Issue | Reason for Deferral |
|-------|---------------------|
| #240 Double payment race condition | Theoretical - Stripe has safeguards |
| #242 Refresh token in response body | Breaking change, no XSS vector exists |
| #243 Auth scope fetch duplication | Code quality, not security |

**Recommendation:** Keep deferred. Revisit in 2025-Q1 if needed.

---

## Recommended Execution Order

### Immediate (Today)

1. **Phase 0:** Merge PR #164 (5 min)
2. **Phase 1:** Fix test suite (30 min)
3. **Phase 2:** Resolve schema drift (15 min)

### This Week

4. **Phase 3:** Merge Dependabot PRs (10 min)
5. **Phase 4:** Documentation cleanup (optional, 1 hr)

### Total Time: ~1 hour for critical work, +1 hour optional

---

## Success Criteria

After completing Phases 0-3:

- [ ] PR #164 merged to main
- [ ] All 63 test files passing (currently 51)
- [ ] Schema drift issue #153 closed
- [ ] Dependabot PRs merged
- [ ] No P0/P1 security issues remaining
- [ ] CI/CD green on main branch

---

## Quick Commands Reference

```bash
# Phase 0: Merge PR
gh pr merge 164 --squash && git checkout main && git pull

# Phase 1: Fix tests (after diagnosis)
cd shared && npm run build && cd ../client && npm test

# Phase 2: Schema sync
cd server && npx prisma db pull && git add prisma/schema.prisma && git commit -m "chore(schema): sync"

# Phase 3: Dependabot
gh pr merge 154 --squash && gh pr merge 161 --squash && gh pr merge 162 --squash

# Full verification
npm test && npm run build && npm run lint
```

---

*Plan created: 2025-12-29*
*Based on: Session handoff context + repository research*
*Aligned with: Compound Engineering North Star*
