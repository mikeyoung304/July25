---
status: closed
priority: p3
issue_id: "245"
tags: [code-review, architecture, cleanup]
dependencies: []
closed_reason: "Non-issue - all routes already import from correct restaurantAccess.ts. The auth.ts version is a simpler fallback not used for route protection."
---

# P3: Duplicate validateRestaurantAccess Export

## Problem Statement

Both `auth.ts` and `restaurantAccess.ts` export a function named `validateRestaurantAccess` with different implementations. This creates confusion about which one to use.

**Why it matters:** Developers might import the wrong one, leading to inconsistent security checks or bugs.

## Findings

**Location:**
- `server/src/middleware/auth.ts` (simpler version, lines 384-400)
- `server/src/middleware/restaurantAccess.ts` (full version with DB validation)

**Evidence:**
- Routes consistently import from `restaurantAccess.ts` (correct)
- But the duplicate in `auth.ts` creates confusion
- The `auth.ts` version is simpler and doesn't do database validation

## Proposed Solutions

### Option A: Rename auth.ts version (Recommended)
**Pros:** Clear distinction, no breaking changes
**Cons:** Minor code change
**Effort:** Small
**Risk:** Low

Rename to `_validateRestaurantAccessSimple` or make it private.

### Option B: Remove auth.ts version
**Pros:** Single source of truth
**Cons:** Might be used somewhere
**Effort:** Small
**Risk:** Low (need to check usage first)

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/middleware/auth.ts`
- Possibly files importing from auth.ts

**Components:** Auth middleware

## Acceptance Criteria

- [ ] Only one public `validateRestaurantAccess` export
- [ ] Clear naming for any internal/helper functions
- [ ] All imports updated if needed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during architecture review | Duplicate exports cause confusion |

## Resources

- ADR-002: Multi-tenancy architecture
