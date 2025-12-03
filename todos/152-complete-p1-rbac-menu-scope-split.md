---
status: pending
priority: p1
issue_id: "152"
tags: [security, rbac, multi-tenant, ui-ux-review]
dependencies: []
created_date: 2025-12-03
source: ui-ux-plan-review
---

# CRITICAL: RBAC Scope Allows Customers to Manage Menu Items

## Problem Statement

The `customer` and `kiosk_demo` roles are granted `MENU_MANAGE` scope (with misleading comment "Read-only for menu viewing"). If 86-item endpoints are implemented using `requireScopes(ApiScope.MENU_MANAGE)`, customers could disable menu items.

## Findings

### Security Agent Discovery

**Location:** `server/src/middleware/rbac.ts` lines 171, 179

```typescript
// Current (INSECURE)
customer: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.MENU_MANAGE,  // ← PROBLEM: "Read-only for menu viewing" comment is WRONG
],
```

**Risk:** If 86-item management endpoints use `requireScopes(ApiScope.MENU_MANAGE)`:
1. Customers could mark items as unavailable
2. Malicious actors could shut down online ordering
3. Cross-tenant attacks possible if restaurant_id validation missed

### Scope Naming Confusion

- `MENU_MANAGE` implies write access
- Comment says "Read-only for menu viewing"
- No separate `MENU_READ` scope exists

## Proposed Solutions

### Solution A: Split into MENU_READ + MENU_MANAGE (Recommended)

**Effort:** 2-3 hours | **Risk:** Low

1. Add `MENU_READ` to ApiScope enum
2. Grant `MENU_READ` to all roles (including customer)
3. Grant `MENU_MANAGE` only to owner/manager
4. Create database migration for scope changes
5. Update menu routes: read endpoints = no scope, write endpoints = MENU_MANAGE

```typescript
export enum ApiScope {
  MENU_READ = 'menu:read',      // View menu items
  MENU_MANAGE = 'menu:manage',  // Create/update/delete items
}

const ROLE_SCOPES = {
  owner: [ApiScope.MENU_READ, ApiScope.MENU_MANAGE],
  manager: [ApiScope.MENU_READ, ApiScope.MENU_MANAGE],
  server: [ApiScope.MENU_READ],  // No MENU_MANAGE
  customer: [ApiScope.MENU_READ],  // No MENU_MANAGE
};
```

### Solution B: Remove MENU_MANAGE from Customer Roles

**Effort:** 30 minutes | **Risk:** Medium (may break existing menu viewing if routes require scope)

Simply remove `MENU_MANAGE` from customer/kiosk_demo roles without adding MENU_READ.

## Recommended Action

Implement Solution A before any 86-item management feature work.

## Technical Details

**Affected Files:**
- `server/src/middleware/rbac.ts` - Scope definitions
- `server/src/routes/menu.routes.ts` - Endpoint protection
- `supabase/migrations/` - New migration for scope changes

**Database Migration:**
```sql
INSERT INTO api_scopes (scope, description) VALUES
  ('menu:read', 'View menu items and categories')
ON CONFLICT (scope) DO NOTHING;

DELETE FROM role_scopes
WHERE role IN ('customer', 'kiosk_demo')
AND scope = 'menu:manage';
```

## Acceptance Criteria

- [ ] `MENU_READ` scope exists in enum
- [ ] All roles have `MENU_READ`
- [ ] Only owner/manager have `MENU_MANAGE`
- [ ] Customer cannot access menu write endpoints
- [ ] Integration test: customer gets 403 on PATCH /menu/items/:id/availability
- [ ] Existing menu viewing still works for all roles

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan security review |

## Resources

- Security agent review findings
- `server/src/middleware/rbac.ts` lines 54-86 (migration pattern)
- AUTH_ROLES.md documentation
