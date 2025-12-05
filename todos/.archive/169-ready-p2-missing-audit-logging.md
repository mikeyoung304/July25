---
status: ready
priority: p2
issue_id: "169"
tags: [code-review, security, compliance, audit, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# Missing Audit Logging for Menu Availability Changes

## Problem Statement

No audit logging for menu item availability changes. Cannot track WHO changed availability, WHEN, or WHY - critical for compliance and dispute resolution.

## Findings

### Agent Discovery

**Data Integrity Guardian:** Identified as P1 compliance risk
**Security Sentinel:** Noted missing audit trail for state-changing operations

### Evidence

```typescript
// server/src/services/menu.service.ts:208-245
// No call to AuditService.logSecurityEvent or similar
this.logger.info('Menu item updated', { restaurantId, itemId, updates });
// ❌ Only logs to application logs, not audit table
```

### Impact

- Cannot answer "who marked this item as unavailable?"
- Cannot investigate "why was this item 86'd during dinner rush?"
- No compliance audit trail for health inspections
- Customer disputes cannot be resolved with evidence

## Proposed Solutions

### Solution A: Integrate with AuditService (Recommended)

**Effort:** Medium (1 hour) | **Risk:** Low

```typescript
// In server/src/services/menu.service.ts after update
import { AuditService } from './audit.service';

await AuditService.logMenuItemChange({
  eventType: 'MENU_ITEM_AVAILABILITY_CHANGED',
  userId: userId,  // Pass from route handler
  restaurantId,
  itemId,
  oldValue: currentItem.available,
  newValue: updates.is_available,
  timestamp: new Date().toISOString()
});
```

### Solution B: Create Menu-Specific Audit Table

**Effort:** Large | **Risk:** Medium

Create `menu_audit_logs` table with specialized schema for menu changes.

## Recommended Action

Implement Solution A using existing AuditService infrastructure.

## Technical Details

**Affected Files:**
- `server/src/services/menu.service.ts:208-245`
- `server/src/routes/menu.routes.ts` (pass userId)

**Event Types:**
- `MENU_ITEM_AVAILABILITY_CHANGED`
- `MENU_ITEM_86ED`
- `MENU_ITEM_RESTORED`

## Acceptance Criteria

- [ ] Audit log created for each availability change
- [ ] Log includes userId, itemId, old/new values
- [ ] Audit logs queryable for compliance reports
- [ ] No sensitive data leaked in audit logs

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- AuditService: `server/src/services/audit.service.ts`
- PR #152: feat(menu): implement 86-item management
