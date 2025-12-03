---
status: pending
priority: p2
issue_id: "146"
tags: [code-review, dead-code, cleanup]
dependencies: []
created_date: 2025-12-02
source: workflows-review-commit-0728e1ee
---

# Dead Code: ~200 Lines of Unused Transformers and Types

## Problem Statement

The transformers.ts file contains ~200 lines of dead code including unused Client* types, table transformers, and database field maps that are never imported or used.

## Findings

### Unused Code

1. **Client Types (lines 41-110):** `ClientOrder`, `ClientOrderItem`, `ClientMenuItem`, `ClientTable` - 0 usages
2. **Table Transformers (lines 301-360):** `transformSharedTableToClient`, `transformClientTableToShared` - 0 usages
3. **DB Utilities (lines 363-423):** `transformDatabaseToShared`, `transformSharedToDatabase`, `DATABASE_FIELD_MAPS` - 0 usages

### Evidence

```bash
# All return 0 matches in client code
grep -r "ClientOrder" client/src/  # 0 results
grep -r "transformSharedTableToClient" .  # Only .d.ts files
```

## Proposed Solutions

### Option A: Remove dead code (Recommended)
**Effort:** Small | **Risk:** Low

Delete unused exports and their implementations.

### Option B: Document for future use
**Effort:** Small | **Risk:** None

Add comments explaining why kept for future use.

## Technical Details

### Affected Files
- `shared/types/transformers.ts` (lines 41-110, 301-423)

## Acceptance Criteria

- [ ] Dead code removed or documented
- [ ] TypeScript compilation passes
- [ ] No runtime regressions
