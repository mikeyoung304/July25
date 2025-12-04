---
status: ready
priority: p1
issue_id: "163"
tags: [code-review, testing, security, 86-item-management]
dependencies: ["162"]
created_date: 2025-12-04
source: pr-152-review
---

# CRITICAL: Missing Server-Side Tests for Menu Update Endpoint

## Problem Statement

The new `PATCH /api/v1/menu/items/:id` endpoint has zero test coverage. Critical security tests for RBAC and multi-tenancy validation are missing, violating the spec requirements.

## Findings

### Agent Discovery

**Security Sentinel:** No tests found for authorization, multi-tenant isolation, or validation
**Code Quality Reviewer:** Spec explicitly requires these tests at `docs/specs/86-item-management.md:109-113`

### Required Tests (from spec)

```markdown
### Tests (~1 hour)
- [ ] Authorized toggle works (manager)
- [ ] Unauthorized returns 403 (server, kitchen, customer)
- [ ] Cross-tenant returns 404 (can't 86 other restaurant's items)
```

### Impact

- Security boundaries not verified
- RBAC authorization untested
- Multi-tenant isolation untested
- Input validation untested
- Regression risk on future changes

## Proposed Solutions

### Solution A: Create Comprehensive Test Suite (Recommended)

**Effort:** Medium (1-2 hours) | **Risk:** None

Create `server/tests/routes/menu.update.test.ts`:

```typescript
describe('PATCH /api/v1/menu/items/:id', () => {
  describe('Authorization', () => {
    it('allows manager to update availability')
    it('allows owner to update availability')
    it('returns 403 for server role')
    it('returns 403 for kitchen role')
    it('returns 403 for customer role')
    it('returns 401 for unauthenticated')
  })

  describe('Multi-tenancy', () => {
    it('returns 404 when updating item from different restaurant')
    it('includes restaurant_id in WHERE clause')
  })

  describe('Validation', () => {
    it('returns 400 when is_available is not boolean')
    it('returns 400 when is_available is missing')
    it('returns 404 for non-existent item')
  })

  describe('Cache invalidation', () => {
    it('clears cache after successful update')
  })
})
```

## Recommended Action

Implement Solution A - these tests validate critical security boundaries.

## Technical Details

**Test File Location:** `server/tests/routes/menu.update.test.ts`

**Test Restaurant IDs:**
- `11111111-1111-1111-1111-111111111111`
- `22222222-2222-2222-2222-222222222222`

**Similar Test Pattern:** `server/tests/routes/orders.auth.test.ts`

## Acceptance Criteria

- [ ] Test file created at `server/tests/routes/menu.update.test.ts`
- [ ] Manager authorization test passes
- [ ] Server/kitchen/customer 403 tests pass
- [ ] Cross-tenant 404 test passes
- [ ] Validation tests pass
- [ ] All tests run in CI

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- Spec: `docs/specs/86-item-management.md:109-113`
- Similar tests: `server/tests/routes/orders.auth.test.ts`
- PR #152: feat(menu): implement 86-item management
