---
status: complete
priority: p2
issue_id: "173"
tags: [code-review, architecture, type-safety, 86-item-management]
dependencies: ["165"]
created_date: 2025-12-04
source: pr-152-review
---

# Type System Redundancy: Multiple MenuItem Definitions

## Problem Statement

At least 4 different `MenuItem` type definitions exist, violating the CLAUDE.md principle "All types from shared workspace only."

## Findings

### Agent Discovery

**Architecture Strategist:** Identified type redundancy
**Code Quality Reviewer:** Multiple definitions create drift risk

### Evidence

1. `/shared/types/menu.types.ts:33` - snake_case (correct)
2. `/shared/api-types.ts:6` - camelCase `ApiMenuItem`
3. `/server/src/services/menu.service.ts:27` - camelCase (server-side)
4. `/client/src/services/types/index.ts:45` - imports `ApiMenuItem`

### CLAUDE.md Requirement

> ### Type System
> All types from shared workspace only:
> ```typescript
> import { Order, Table, User } from 'shared/types';
> // Never define types locally in components
> ```

### Impact

- Confusing which type to use
- Type drift risk
- Violates DRY principle
- Creates maintenance burden

## Proposed Solutions

### Solution A: Consolidate to Shared Types (Recommended)

**Effort:** Medium (2-4 hours) | **Risk:** Medium (requires coordinated changes)

1. Use only `/shared/types/menu.types.ts:33` with snake_case
2. Remove `ApiMenuItem` camelCase variant
3. Remove server-side MenuItem interface
4. Client imports directly from shared

```typescript
import { MenuItem, MenuCategory } from 'shared/types';
```

## Recommended Action

Implement Solution A after #165 (snake_case violation) is resolved.

## Technical Details

**Files to Update:**
- `shared/api-types.ts` - remove ApiMenuItem
- `server/src/services/menu.service.ts:27` - use shared type
- `client/src/services/types/index.ts` - use shared type

**Canonical Type Location:** `shared/types/menu.types.ts`

## Acceptance Criteria

- [ ] Single MenuItem definition in shared/types
- [ ] All imports reference shared type
- [ ] No local MenuItem definitions
- [ ] TypeScript compilation passes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |
| 2025-12-04 | Completed | Updated shared/api-types.ts to snake_case, consolidated with menu.types.ts; server mappers simplified to pass-through |

## Resources

- CLAUDE.md type system guidelines
- PR #152: feat(menu): implement 86-item management
