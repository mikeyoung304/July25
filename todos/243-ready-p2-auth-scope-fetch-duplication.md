---
status: deferred
priority: p3
issue_id: "243"
tags: [code-review, code-quality, refactoring]
dependencies: []
deferred_reason: "DRY cleanup, not security - opportunistic only. Bundle with next auth route changes."
---

# P2: Duplicated Scope Fetching Logic in Auth Routes

## Problem Statement

The same scope fetching pattern appears THREE times in `auth.routes.ts`, violating DRY principles and making maintenance harder.

**Why it matters:** Duplicated code is a maintenance burden. If the scope fetching logic needs to change (e.g., add caching), it must be updated in 3 places.

## Findings

**Location:** `server/src/routes/auth.routes.ts:103-113`, `196-206`, `376-387`

**Evidence:**
```typescript
// This exact pattern appears 3 times:
const { data: scopesData, error: scopesError } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', role);
if (scopesError) {
  logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
}
const scopes = scopesData?.map(s => s.scope) || [];
```

## Proposed Solutions

### Option A: Extract to helper function (Recommended)
**Pros:** Simple, maintainable, consistent
**Cons:** Minor code movement
**Effort:** Small
**Risk:** Low

```typescript
async function fetchUserScopes(role: string, restaurantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('role_scopes')
    .select('scope')
    .eq('role', role);
  if (error) {
    logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
  }
  return data?.map(s => s.scope) || [];
}
```

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/routes/auth.routes.ts`

**Components:** Auth routes

## Acceptance Criteria

- [ ] Single function for scope fetching
- [ ] All 3 call sites updated to use helper
- [ ] Tests pass after refactor

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during simplicity review | DRY violation in auth routes |

## Resources

- Related: Auth routes cleanup
