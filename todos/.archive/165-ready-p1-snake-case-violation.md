---
status: ready
priority: p1
issue_id: "165"
tags: [code-review, architecture, adr-001, type-safety, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# CRITICAL: Snake Case Convention Violation (ADR-001)

## Problem Statement

The implementation introduces camelCase transformations violating ADR-001 which mandates snake_case across ALL layers - database, API, and client. No transformations should exist between layers.

## Findings

### Agent Discovery

**Architecture Strategist:** Identified snake_case violation as critical
**Code Quality Reviewer:** Multiple MenuItem definitions with inconsistent naming

### Evidence

```typescript
// server/src/services/menu.service.ts:18-50
export interface MenuItem {
  categoryId?: string;        // ❌ Should be category_id
  dietaryFlags: string[];     // ❌ Should be dietary_flags
  prepTimeMinutes: number;    // ❌ Should be prep_time_minutes
  imageUrl?: string;          // ❌ Should be image_url
}

// server/src/mappers/menu.mapper.ts:63-78
export function mapMenuItem(dbItem: DbMenuItem): ApiMenuItem {
  return {
    categoryId: dbItem.category_id,    // ❌ Transformation violates ADR-001
    dietaryFlags: dbItem.dietary_flags,
    // ...
  };
}
```

### ADR-001 Requirement (CLAUDE.md)

> #### 1. Snake Case Convention (ADR-001)
> **ALL layers use snake_case** - database, API, and client. No transformations between layers.
> ```typescript
> // ✅ CORRECT everywhere
> { customer_name: "John", total_amount: 29.99 }
>
> // ❌ NEVER use camelCase
> { customerName: "John", totalAmount: 29.99 }
> ```

### Impact

- Creates inconsistency with codebase
- Adds unnecessary transformation layer
- Forces client-side transformations
- 47 lines of transformation logic handling multiple field name variations

## Proposed Solutions

### Solution A: Remove Transformations, Use Snake Case (Recommended)

**Effort:** Medium (2-4 hours) | **Risk:** Medium (breaking change)

1. Update `ApiMenuItem` interface to use snake_case
2. Remove `menu.mapper.ts` transformations
3. Update all client references
4. Test thoroughly

### Solution B: Document Exception (Temporary)

**Effort:** Small | **Risk:** Technical debt accumulation

Document why this exception exists and plan future migration.

## Recommended Action

Implement Solution A in a separate PR focused solely on this cleanup.

## Technical Details

**Affected Files:**
- `shared/api-types.ts`
- `server/src/services/menu.service.ts:18-50`
- `server/src/mappers/menu.mapper.ts`
- `client/src/services/menu/MenuService.ts:16-62`
- `client/src/modules/menu-management/components/MenuManagement.tsx`

## Acceptance Criteria

- [ ] MenuItem interfaces use snake_case everywhere
- [ ] No camelCase transformations in mappers
- [ ] Client uses snake_case from API directly
- [ ] ADR-001 compliance verified

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- CLAUDE.md ADR-001 documentation
- PR #152: feat(menu): implement 86-item management
