---
status: pending
priority: p1
issue_id: "093"
tags: [code-review, security, multi-tenant, pr-148]
dependencies: []
---

# Missing restaurant_id in Order Fetch - Cross-Tenant Data Leak Risk

## Problem Statement

The `handleCloseTable` function in ServerView.tsx fetches orders by table_number without including restaurant_id, violating the critical multi-tenant isolation requirement. This could allow cross-tenant data access if table numbers collide across restaurants.

**Why it matters:** Per CLAUDE.md global rules, ALL queries MUST filter by `tenantId`/`restaurant_id`. This is a P0 security requirement for multi-tenant isolation.

## Findings

### Security Sentinel
- **File:** `client/src/pages/ServerView.tsx:128-133`
- **Evidence:**
```typescript
const ordersResponse = await get(`/api/v1/orders`, {
  params: {
    table_number: selectedTable.label,
    payment_status: 'pending'
    // ❌ Missing: restaurant_id filter
  }
}) as any[]
```

### Data Integrity Guardian
- **Risk:** A server could inadvertently access and process payments for orders from OTHER restaurants if `table_number` values collide across tenants
- **Impact:** Cross-tenant data exposure, payment processing for wrong restaurant's orders, financial reconciliation issues

## Proposed Solutions

### Option A: Add Explicit restaurant_id Parameter (Recommended)
**Pros:** Explicit, clear intent, defense in depth
**Cons:** Minor code change
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
const ordersResponse = await get(`/api/v1/orders`, {
  params: {
    restaurant_id: selectedTable.restaurant_id,
    table_number: selectedTable.label,
    payment_status: 'pending'
  }
}) as Order[]
```

### Option B: Rely on httpClient Header Injection
**Pros:** No code change if httpClient already sends X-Restaurant-ID
**Cons:** Implicit, less clear, relies on middleware behavior
**Effort:** None
**Risk:** Medium - relies on backend validation only

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/pages/ServerView.tsx`
- **Lines:** 128-133
- **Components:** ServerView, handleCloseTable callback
- **Database Changes:** None

## Acceptance Criteria

- [ ] Order fetch includes explicit restaurant_id parameter
- [ ] Type safety improved (use `Order[]` instead of `any[]`)
- [ ] Tests verify multi-tenant isolation

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **CLAUDE.md:** Multi-tenant isolation requirements
- **Related:** ADR on multi-tenant architecture
