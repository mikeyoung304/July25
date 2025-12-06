---
status: complete
priority: p1
issue_id: "155"
tags: [feature, api, ui-ux, specification, ui-ux-review]
dependencies: ["152"]
created_date: 2025-12-03
completed_date: 2025-12-03
source: ui-ux-plan-review
---

# CRITICAL: 86-Item Management Feature Lacks Specification

## Problem Statement

Both UI/UX plans list "86-item management" as a deliverable but provide ZERO specification for UI, API, authorization, or real-time sync. Implementation without spec will result in mismatched expectations.

## Findings

### Multiple Agent Discovery

**Security Agent:** No API endpoint defined, no authorization checks specified
**UX Expert:** No UI wireframes, no user journey mapped
**Architecture Agent:** No real-time sync mechanism designed
**DevOps Agent:** No feature flag strategy for gradual rollout

### Current State

- `MenuItem.is_available` field exists in types (line 42)
- No API endpoint to update availability
- No UI toggle anywhere in the app
- Kitchen/server staff have no way to 86 items

### Required Specification Elements

1. **Who can 86 items?** (owner, manager, server, kitchen?)
2. **Where does toggle appear?** (menu admin, server POS, kitchen display?)
3. **What do customers see?** (grayed out? hidden? "Sold Out" badge?)
4. **How does it sync?** (WebSocket, polling, refresh required?)
5. **How to un-86?** (same UI? admin only? time-based auto-restore?)

## Proposed Solutions

### Solution A: Write Full Specification Before Implementation (Required)

**Effort:** 4-8 hours | **Risk:** None (prevents larger risks)

Create specification document covering:

```markdown
# 86-Item Management Specification

## User Stories
- As a kitchen staff, I want to mark items as unavailable so customers can't order them
- As a customer, I want to see which items are sold out so I don't waste time selecting them
- As a manager, I want to restore item availability when stock is replenished

## Authorization
- 86/un-86: manager, owner roles only (requires MENU_MANAGE scope)
- View availability: all roles

## API Endpoints
PATCH /api/v1/menu/items/:id/availability
  Body: { is_available: boolean, reason?: string }
  Auth: requireScopes(ApiScope.MENU_MANAGE)
  Response: Updated MenuItem

## UI Components
1. Server View: Long-press item → "Mark as 86'd" button
2. Customer View: Red "Sold Out" badge, grayed card, disabled "Add" button
3. Admin View: Toggle switch in item edit modal

## Real-Time Sync
- Use existing WebSocket infrastructure
- Emit 'menu:item:updated' event on availability change
- Client subscribes to menu updates, refreshes affected items

## Rollout
- Feature flag: VITE_FEATURE_86_ITEM_MANAGEMENT
- Phase 1: Admin UI only (manager testing)
- Phase 2: Server long-press (staff usage)
- Phase 3: Real-time customer updates
```

## Recommended Action

Write and approve specification before ANY implementation work.

## Technical Details

**Specification Location:** `docs/specs/86-item-management.md`

**Prerequisite:** Todo #152 (RBAC scope split) must be complete first

**Wireframe Requirements:**
- ServerMenuGrid with 86 toggle
- MenuItemCard "Sold Out" state
- Admin menu item edit modal

## Acceptance Criteria

- [x] Specification document exists and is approved
- [x] API endpoint documented with request/response
- [x] Authorization requirements defined
- [x] UI mockups or wireframes created
- [x] ~~Real-time sync strategy documented~~ (deferred to Phase 2)
- [x] ~~Feature flag rollout plan defined~~ (not needed for MVP)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan multi-agent review |
| 2025-12-03 | v1.0 | Full specification written at `docs/specs/86-item-management.md` |
| 2025-12-03 | v2.0 | Simplified to MVP after 5-agent review (40% scope reduction) |

## Spec Review Summary

5-agent review identified original spec was over-engineered. Simplified to MVP:

**Cut from Phase 1:**
- Reason field (managers don't document during service)
- Dashboard widget (no one asked for it)
- GET filter endpoint (client-side filter instead)
- Feature flag rollout (just ship it)
- Real-time WebSocket sync (manual refresh is fine)
- Confirmation dialogs for featured items

**MVP Scope (~5 hours):**
- PATCH endpoint with `menu:manage` scope
- Toggle in item edit modal
- Cache clear on update
- Customer "Sold Out" UI (already done)

## Resources

- Simplified spec: `docs/specs/86-item-management.md` (v2.0)
- Security review: Multi-tenant isolation critical
- Simplicity review: 40% scope reduction recommended
