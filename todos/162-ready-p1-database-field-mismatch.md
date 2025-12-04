---
status: ready
priority: p1
issue_id: "162"
tags: [code-review, bug, data-integrity, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# CRITICAL: Database Field Name Mismatch - `is_available` vs `available`

## Problem Statement

The menu item update query uses `is_available` but the database column is `available`. This causes menu item availability updates to **silently fail** - the feature is currently broken in production.

## Findings

### Agent Discovery

**Architecture Strategist:** Identified field name mismatch between API and database
**Data Integrity Guardian:** Confirmed update will silently fail or create non-existent column

### Evidence

```typescript
// server/src/services/menu.service.ts:217-219
.update({
  is_available: updates.is_available,  // ❌ WRONG field name
  updated_at: new Date().toISOString()
})
```

```prisma
// prisma/schema.prisma:446
available         Boolean?         @default(true)  // ✅ Actual DB column name
```

### Impact

- Menu item availability updates **fail silently**
- Database remains unchanged despite API returning success
- Cache is cleared unnecessarily, causing performance degradation
- No error thrown because Supabase allows extra fields

## Proposed Solutions

### Solution A: Fix Field Name (Recommended)

**Effort:** Small (5 min) | **Risk:** Low

```typescript
// Fix in server/src/services/menu.service.ts:217-219
.update({
  available: updates.is_available,  // ✅ Use correct DB column name
  updated_at: new Date().toISOString()
})
```

## Recommended Action

Implement Solution A immediately - this is a P1 bug blocking the 86-item feature.

## Technical Details

**Affected Files:**
- `server/src/services/menu.service.ts:217-219`

**Database Schema:**
- Column: `menu_items.available` (Boolean)

## Acceptance Criteria

- [ ] Update query uses `available` field name
- [ ] Manual test: toggle item availability in UI
- [ ] Verify database record changes after toggle
- [ ] Add test to prevent regression

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- PR #152: feat(menu): implement 86-item management
- Prisma schema: `prisma/schema.prisma:446`
