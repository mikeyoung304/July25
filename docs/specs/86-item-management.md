# 86-Item Management Specification

**Status:** Approved
**Version:** 2.0 (Simplified MVP)
**Created:** 2025-12-03
**Related Todo:** #155

## User Story

As a **manager**, I want to toggle item availability so customers can't order sold-out items.

## API

### PATCH /api/v1/menu/items/:id

Update menu item (including availability).

**Authorization:** `requireScopes(ApiScope.MENU_MANAGE)`

**Request:**
```typescript
{ is_available: boolean }
```

**Response:** `MenuItem` (full object)

**Implementation:**
```typescript
// CRITICAL: Always filter by restaurant_id (multi-tenant isolation)
const { data, error } = await supabase
  .from('menu_items')
  .update({ is_available, updated_at: new Date().toISOString() })
  .eq('id', itemId)
  .eq('restaurant_id', restaurantId)  // REQUIRED
  .select()
  .single();

if (!data) throw NotFound('Menu item not found');

// Clear cache after update
MenuService.clearCache(restaurantId);

return data;
```

**Errors:**
- `401` - Not authenticated
- `403` - Lacks `menu:manage` scope (servers, kitchen, customers)
- `404` - Item not found or wrong restaurant

## UI

### Manager: Toggle in Item Edit Modal

Add toggle to existing item management UI:

```
┌─────────────────────────────────────┐
│  Edit: Truffle Pasta                │
│                                     │
│  Name: [Truffle Pasta        ]      │
│  Price: [$24.99              ]      │
│  ...                                │
│                                     │
│  Available for ordering             │
│  [=========⬤] ON                    │
│                                     │
│  [Cancel]            [Save]         │
└─────────────────────────────────────┘
```

**Requirements:**
- Toggle switch with loading state (prevent double-clicks)
- Success toast: "Item availability updated"
- Error toast with user-friendly message

### Customer: Sold Out Badge (Already Complete)

Implemented in `MenuItemCard.tsx:89-101`:
- Red "Sold Out" badge
- 60% opacity on card
- "Currently Unavailable" instead of "Add to Cart"
- Disabled add button

## Authorization

| Action | Roles | Scope |
|--------|-------|-------|
| Toggle availability | owner, manager | `menu:manage` |
| View menu | all | `menu:read` |

Already configured in `server/src/middleware/rbac.ts:119-139`.

## Implementation Checklist

### Backend (~2 hours)
- [ ] Add/verify PATCH handler in `menu.routes.ts`
- [ ] Add `requireScopes(ApiScope.MENU_MANAGE)` middleware
- [ ] Ensure `restaurant_id` filter in query (multi-tenant)
- [ ] Call `MenuService.clearCache(restaurantId)` after update
- [ ] Return 404 if item not found (prevents info disclosure)

### Frontend (~2 hours)
- [ ] Add toggle to item edit modal/page
- [ ] Add loading state during API call
- [ ] Show success/error toast
- [ ] Refresh menu list after toggle

### Tests (~1 hour)
- [ ] Authorized toggle works (manager)
- [ ] Unauthorized returns 403 (server, kitchen, customer)
- [ ] Cross-tenant returns 404 (can't 86 other restaurant's items)

## Acceptance Criteria

- [ ] Manager can toggle item availability
- [ ] Customers see "Sold Out" within 30 seconds (cache TTL)
- [ ] Non-managers get 403 Forbidden
- [ ] Can't modify items from other restaurants

## Phase 2 (Only If Requested)

These features are NOT in scope for MVP. Add only if users request:

- Real-time WebSocket sync (currently: manual refresh)
- Dedicated manager menu grid with bulk toggles
- Reason field for audit logs
- Dashboard widget showing all 86'd items
- Batch operations ("86 all seafood")

## Technical References

| File | Purpose |
|------|---------|
| `server/src/middleware/rbac.ts:37-38` | MENU_READ/MENU_MANAGE scopes |
| `server/src/routes/menu.routes.ts` | Menu API routes |
| `client/src/modules/order-system/components/MenuItemCard.tsx:89-101` | Customer "Sold Out" UI |
| `shared/types/menu.types.ts:42` | `is_available` field |
