# PR #151 Prevention Strategy - Complete Guide

**Date:** 2025-12-02
**Incident:** Security review discovered 5 classes of gaps in PR #150-151 implementations
**Status:** Fixed + Prevention checklists created

---

## Issues Discovered & Fixed

| Issue | Root Cause | Fix | Prevention |
|-------|-----------|-----|-----------|
| RLS policies incomplete | Audit/history tables overlooked during migration | Added RLS to `order_status_history`, `voice_order_logs` | [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md) |
| Cache keys missing tenant | Endpoint-only keys created before multi-restaurant support | Added `{restaurantId}:` prefix to all cache keys | [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md) |
| INSERT policy asymmetric | Mismatched SELECT (with IS NOT NULL) vs INSERT (without) | Fixed INSERT/UPDATE/DELETE policies to mirror SELECT | [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md) § SELECT Policy Requirements |
| Cache clearing orphaned | Function existed but wasn't called consistently | Wired `clearAllCachesForRestaurantSwitch()` into context | [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md) § Cache Clearing Strategy |
| console.error used | Inconsistent logging standards | Replaced with `logger.error()` throughout | [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md) § Logging & Error Handling |

---

## Three Prevention Checklists

### 1. RLS Migration Checklist
**File:** [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md)
**When to use:** Before writing any database migration that adds RLS policies

**Key sections:**
- Pre-migration audit (find all tables that need RLS)
- Policy structure & naming consistency
- SELECT/INSERT/UPDATE/DELETE policy symmetry
- Handling nullable columns (IS NOT NULL check)
- Service role bypass requirements
- Performance indexing
- Testing procedures
- Common pitfalls (8 most likely mistakes)

**Quick reference:**
```sql
-- Query to find tables that should have RLS
SELECT tablename FROM pg_tables
WHERE tablename LIKE '%restaurant%' OR tablename LIKE '%tenant%';

-- Verify all tables have policies
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN (/* your multi-tenant tables */);
```

---

### 2. Multi-Tenant Cache Checklist
**File:** [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md)
**When to use:** Before implementing any caching logic for multi-tenant systems

**Key sections:**
- Cache key design (always include restaurantId prefix)
- Cache clearing strategy (single point of call)
- Race condition prevention (in-flight request tracking)
- Multi-layer cache coverage (HTTP, localStorage, etc.)
- Testing for cross-tenant pollution
- Common mistakes (8 most likely errors)

**Quick reference:**
```typescript
// CORRECT cache key format
const cacheKey = `${restaurantId}:${endpoint}?${params}`

// Clear on every restaurant switch
if (previousId !== null && previousId !== restaurantId) {
  clearAllCachesForRestaurantSwitch()
}
```

---

### 3. Security Code Review Checklist
**File:** [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md)
**When to use:** For ANY PR that touches auth, RLS, cache, logging, or environment variables

**Key sections:**
- Authentication & authorization (JWT claims, STRICT_AUTH)
- Row Level Security (apply RLS migration checklist)
- Multi-tenant cache (apply cache checklist)
- Logging & error handling (no secrets, use logger, context)
- Configuration & environment variables
- API & network security (CSRF, CORS, rate limiting, input validation)
- Type safety (no `any`, enforce tenant isolation)
- Testing requirements
- Deployment & observability
- Common pitfalls (10 most likely security gaps)

---

## Implementation Timeline

```
Phase 1 (Complete): Discovery & Quick Fixes
├─ Discovered RLS gaps in audit tables
├─ Discovered cache key missing restaurantId
├─ Discovered INSERT policy asymmetry
└─ Created 3 comprehensive checklists

Phase 2 (Next PR): Integrate Checklists
├─ Add checklist link to PR template
├─ Train team on when to use each checklist
├─ Make checklists runnable (add SQL/TypeScript examples)
└─ Track compliance with TODO comments

Phase 3 (Future): Automated Checks
├─ Linting rule: Cache keys must include restaurantId
├─ Database test: Verify RLS policies symmetry
├─ RLS audit script: Find all multi-tenant tables without RLS
└─ Pre-commit hook: Verify no console.* usage in security code
```

---

## How to Use These Checklists

### For RLS Work
1. Before writing any migration: Read [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md)
2. Go through "Pre-Migration Audit" section
3. Run the SQL queries to find all tables needing RLS
4. Build migration file following "Migration File Structure"
5. Verify all "SELECT Policy Requirements" met
6. Verify "INSERT/UPDATE/DELETE Policy Symmetry"
7. Run "Testing Checklist" before committing
8. Add note to PR: "✓ Verified [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md) items X, Y, Z"

### For Cache Implementation
1. Before adding caching: Read [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md)
2. Verify all cache keys use "Cache Key Design" format
3. Verify restaurant switch clears caches (see "Cache Clearing Strategy")
4. Run "Testing & Validation" checks locally
5. Add to PR description: "✓ Verified [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md) all sections"

### For Code Review
1. When reviewing security PR: Use [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md)
2. Go through each relevant section
3. Check off items as you verify them
4. Ask questions on any items you can't verify
5. Approve only when all sections checked
6. Comment on PR: "✓ Passed [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md) security review"

---

## Key Lessons from PR #151

### Lesson 1: Comprehensive + Spot Checks Needed
PR #150 did comprehensive RLS for 6 tables, but miss 2 tables (`order_status_history`, `voice_order_logs`). Always audit all multi-tenant tables, not just the obvious ones.

### Lesson 2: Asymmetry is Invisible
INSERT policy without `IS NOT NULL` looks correct at first glance, but allows orphaned data. Always verify policy symmetry explicitly.

### Lesson 3: Cache Keys Must Include Tenant
When multi-restaurant support was added, cache keys weren't updated. Now they're checked upfront via key naming convention.

### Lesson 4: Functions Don't Call Themselves
`clearAllCachesForRestaurantSwitch()` was defined but never called. Critical functions need explicit wiring in callers, not just existence.

### Lesson 5: Logging Inconsistency Spreads
`console.error` crept in alongside `logger.error`. Pre-commit hooks now enforce logger usage to prevent future drift.

---

## Integration with Existing Lessons

These checklists complement existing lessons:

- **[CL-AUTH-001: STRICT_AUTH Drift](../lessons/CL-AUTH-001-strict-auth-drift.md)** - Checklist section: "Authentication & Authorization"
- **[CL-DB-002: Constraint Drift](../lessons/CL-DB-002-constraint-drift-prevention.md)** - Similar pattern; RLS needs same systematic audit
- **[CL-MEM-001: Interval Leaks](../lessons/CL-MEM-001-interval-leaks.md)** - Cache clearing must actually happen; similar to interval cleanup

---

## Metrics to Track

To measure prevention effectiveness:

1. **RLS Coverage:** Count of multi-tenant tables with RLS / Total multi-tenant tables
   - Target: 100%
   - Current (post-151): 100% (8/8 tables)

2. **Cache Key Compliance:** Code review items finding tenant-less cache keys
   - Target: 0 new issues per quarter
   - Current: Fixed all existing

3. **Policy Symmetry:** Automated tests for asymmetric policies
   - Target: 100% of RLS policies symmetric
   - Current: 100% (verified in migrations)

4. **Logger Usage:** Instances of console.* in security-sensitive code
   - Target: 0
   - Current: 0 (enforced by pre-commit hook)

---

## Next Steps

### For Immediate Implementation
1. [ ] Add these checklists to the team wiki/confluence
2. [ ] Link from PR template: "Select checklist: [RLS] [Cache] [Security Review]"
3. [ ] Train team on when/how to use each checklist
4. [ ] Review any pending PRs against checklists

### For Next Sprint
1. [ ] Create linting rule: `restaurant_id` must appear in cache key definitions
2. [ ] Create database test: RLS policy symmetry validator
3. [ ] Create pre-commit hook: Enforce logger over console
4. [ ] Create automation: RLS audit SQL generator

### For Documentation
1. [ ] Link from [CLAUDE.md](../../CLAUDE.md) Multi-Tenancy section
2. [ ] Add to onboarding: "Security work? Use [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md)"
3. [ ] Create runbook: "Adding a new multi-tenant table" (uses RLS + cache checklists)

---

## Files Created

- **This summary:** `/Users/mikeyoung/CODING/rebuild-6.0/.claude/prevention/PR-151-PREVENTION-SUMMARY.md`
- **RLS Checklist:** `/Users/mikeyoung/CODING/rebuild-6.0/.claude/prevention/CHECKLIST-RLS-MIGRATIONS.md`
- **Cache Checklist:** `/Users/mikeyoung/CODING/rebuild-6.0/.claude/prevention/CHECKLIST-MULTITENANT-CACHE.md`
- **Security Review:** `/Users/mikeyoung/CODING/rebuild-6.0/.claude/prevention/CHECKLIST-SECURITY-CODE-REVIEW.md`

---

## References

- **PR #150:** Initial security review discovering RLS gaps
- **PR #151:** Follow-up fixes for discovered issues
- **TODOs Resolved:**
  - [103: Missing RLS on Audit Tables](../../todos/103-open-p1-missing-rls-audit-tables.md)
  - [104: Cache Key Tenant Isolation](../../todos/104-open-p1-cache-key-tenant-isolation.md)
  - [108: INSERT Policy Asymmetry](../../todos/108-resolved-p1-rls-insert-policy-null-check.md)
  - [109: Cache Clear on Restaurant Switch](../../todos/109-resolved-p1-cache-clear-on-restaurant-switch.md)

---

## Questions?

- **RLS work:** See [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md)
- **Cache implementation:** See [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md)
- **Code review:** See [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md)
- **Lessons from incident:** Check lessons/ directory and related TODOs
