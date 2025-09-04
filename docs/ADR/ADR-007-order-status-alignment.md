# ADR-007: Order Status System Alignment

## Status: Accepted
## Date: 2025-01-30

## Context

Initial documentation suggested a potential discrepancy between a 5-status and 7-status order model. Investigation was needed to determine the actual implementation and ensure alignment across all system components.

## Decision

After comprehensive analysis, the system **correctly implements 7 statuses throughout**. No changes to the status model are required.

### The 7 Order Statuses

1. `new` - Order just created, not yet confirmed
2. `pending` - Awaiting restaurant confirmation
3. `confirmed` - Restaurant accepted the order
4. `preparing` - Kitchen is preparing the order
5. `ready` - Order ready for pickup/delivery
6. `completed` - Order successfully delivered/picked up
7. `cancelled` - Order was cancelled

### Implementation Verification

- **Database**: Supports all 7 statuses via enum type
- **Server**: OrderStateMachine enforces valid transitions between all 7 states
- **Shared Types**: `ORDER_STATUSES` constant exports all 7 values
- **UI Components**: All switch statements handle 7 cases with fallbacks
- **WebSocket Events**: Transmit all 7 status values

## Explanation of "5 Status" Confusion

The confusion arose from operational filtering:

1. **Kitchen Display**: Shows only active orders (first 5 statuses)
   - Filters out: `completed`, `cancelled`
   - This is correct - kitchen doesn't need terminal states

2. **Expo Display**: Shows only active orders (first 5 statuses)
   - Filters out: `completed`, `cancelled`
   - This is correct - expo focuses on active orders

3. **Database Indexes**: Optimized for active statuses
   ```sql
   WHERE status IN ('new', 'pending', 'confirmed', 'preparing', 'ready')
   ```
   - This is a performance optimization, not a limitation

## Consequences

### Positive
- No migration needed - system already correct
- All components properly handle edge cases
- Performance optimized via selective indexing
- Clear separation of operational vs historical data

### Neutral
- Documentation needs clarification about filtering vs capabilities
- Training materials should explain operational views

### Negative
- None - the system is properly designed

## Implementation Details

### Single Source of Truth
All status definitions come from:
```typescript
// shared/types/unified-order.types.ts
export const ORDER_STATUSES = [
  'new',
  'pending', 
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];
```

### Valid State Transitions
```typescript
// server/src/services/orderStateMachine.ts
const validTransitions = {
  'new': ['pending', 'cancelled'],
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['preparing', 'cancelled'],
  'preparing': ['ready', 'cancelled'],
  'ready': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': []
};
```

### UI Filtering Example
```typescript
// Kitchen only shows non-terminal orders
const KITCHEN_VISIBLE_STATUSES = ORDER_STATUSES.filter(
  s => !['completed', 'cancelled'].includes(s)
);
```

## Alternatives Considered

1. **Reduce to 5 statuses**: Would lose important state information
2. **Add more statuses**: Would add complexity without clear benefit
3. **Different statuses per view**: Would create synchronization issues

## References

- `/shared/types/unified-order.types.ts` - Status definitions
- `/server/src/services/orderStateMachine.ts` - State transitions
- `/client/src/components/kitchen/` - Operational filtering
- `CLAUDE.md` - Updated to clarify 7-status implementation

## Lessons Learned

1. Operational filtering can create appearance of fewer states
2. Documentation should distinguish between "supported" vs "displayed"
3. Database optimization doesn't imply functional limitation
4. Always verify implementation before assuming drift from docs