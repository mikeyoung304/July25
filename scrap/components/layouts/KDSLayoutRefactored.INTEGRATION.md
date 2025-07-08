# KDSLayoutRefactored Integration Guide

## Component Overview

KDSLayoutRefactored is a cleaner, modular approach to the KDS layout that provides:
- Station-specific view switching
- Optimistic updates for better UX
- Centralized action handling
- Clean component separation
- Toast notifications for all actions

## Current State Analysis (rebuild-6.0)

### What Exists
- **Monolithic KDSLayout**: 300+ lines handling everything
- **Basic order actions**: Status updates only
- **No station routing**: All orders shown together
- **Limited feedback**: No user notifications

### What's Missing
- Station-specific views
- Optimistic updates
- Action feedback (toasts)
- Clean architecture
- Bulk actions

## Enhancement Opportunity

The KDSLayoutRefactored component demonstrates:

1. **Clean Architecture**
   - Separate components for header, content, stations
   - Clear separation of concerns
   - Reusable station components
   - Maintainable code structure

2. **Station Routing**
   - Dynamic station selection
   - Station-specific components
   - Filtered order views
   - Order count tracking

3. **Enhanced UX**
   - Optimistic updates (instant feedback)
   - Toast notifications
   - Error recovery
   - Loading states

4. **Action Management**
   - Centralized action handlers
   - Bulk action support
   - Error handling with recovery
   - Quality check workflow

## Integration Strategy

### Step 1: Refactor Current KDSLayout

Break down the monolithic component:

```typescript
// src/modules/kitchen/components/
├── KDSLayout.tsx           // Main orchestrator (this file)
├── KDSHeader.tsx          // Status, controls, metrics
├── KDSContent.tsx         // Order display logic
├── KDSOrderCard.tsx       // Individual order cards
└── stations/              // Station-specific views
    ├── index.ts
    ├── GrillStation.tsx
    ├── FryerStation.tsx
    └── ...
```

### Step 2: Implement Optimistic Updates

```typescript
// src/modules/kitchen/hooks/useOptimisticOrders.ts
export function useOptimisticOrders(initialOrders: Order[]) {
  const [orders, setOrders] = useState(initialOrders)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<Order>>>()
  
  const optimisticUpdate = (orderId: string, updates: Partial<Order>) => {
    setOptimisticUpdates(prev => new Map(prev).set(orderId, updates))
    
    // Apply update immediately
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, ...updates } : order
    ))
  }
  
  const rollback = (orderId: string) => {
    setOptimisticUpdates(prev => {
      const next = new Map(prev)
      next.delete(orderId)
      return next
    })
    // Restore from server state
  }
  
  return { orders, optimisticUpdate, rollback }
}
```

### Step 3: Adapt to Service Layer

```typescript
// Remove direct Supabase calls
- import { getClientUser } from '@/lib/modassembly/supabase/auth/session'
- import { bumpOrder, recallOrder } from '@/lib/modassembly/supabase/database/kds'

// Use service layer
+ import { useAuth } from '@/core/contexts/RestaurantContext'
+ import { api } from '@/services/api'

const handleOrderAction = async (action: string, orderId: string) => {
  const { user } = useAuth()
  
  switch (action) {
    case 'complete':
      await api.orders.updateStatus(orderId, 'completed', { userId: user.id })
      break
  }
}
```

### Step 4: Integrate Station Routing

```typescript
// Use existing station routing service
import { stationRouting } from '@/services/stationRouting'
import { StationType } from '@/types/station'

const filterOrdersByStation = (orders: Order[], station: StationType) => {
  if (station === 'all') return orders
  
  return orders.filter(order => 
    order.items.some(item => 
      stationRouting.getItemStation(item) === station
    )
  )
}
```

## Code Adaptation Guide

### Key Changes Needed

1. **Remove Next.js/Supabase specifics**
   ```diff
   - 'use client'
   - import { createClient } from '@/lib/supabase/client'
   - import { useKDSState } from '@/lib/hooks/use-kds-state'
   
   + import { useOrders } from '@/modules/orders/hooks/useOrders'
   + import { useOrderSubscription } from '@/hooks/useOrderSubscription'
   ```

2. **Adapt state management**
   ```diff
   - const kdsState = useKDSState(stationId)
   + const { orders, loading, error, refetch } = useOrders()
   + const { optimisticUpdate } = useOptimisticOrders(orders)
   ```

3. **Update styling for Macon**
   ```diff
   - className="bg-gray-900 text-white" // Dark theme
   + className="bg-white text-gray-900" // Light theme
   
   - className="bg-blue-600 text-white"
   + className="bg-macon-orange text-white"
   ```

4. **Use existing toast system**
   ```diff
   - import { useToast } from '@/hooks/use-toast'
   + import { useToast } from '@/components/ui/toast'
   ```

## Critical Thinking Prompts

### For the Next AI to Consider:

1. **Component granularity**
   - Is 5 components the right split?
   - Should actions be a separate component?
   - Where do filters belong?

2. **State management approach**
   - Local state vs global store?
   - How to sync optimistic updates?
   - Conflict resolution strategy?

3. **Performance implications**
   - Re-render frequency with updates
   - Memoization boundaries
   - Subscription optimization

4. **Error recovery patterns**
   - Automatic retry logic?
   - Offline queue for actions?
   - Conflict resolution UI?

5. **Testing strategy**
   - Component isolation
   - Action handler testing
   - Integration test approach

## Risks & Mitigations

### Risk 1: Over-Engineering
**Issue**: Too many components for simple needs
**Mitigation**: Start with 3 components, split as needed

### Risk 2: State Synchronization
**Issue**: Optimistic updates conflict with server
**Mitigation**: Version tracking, conflict detection

### Risk 3: Performance Regression
**Issue**: More components = more renders
**Mitigation**: Aggressive memoization, render boundaries

## Integration Priority

**Priority: MEDIUM-HIGH** - Architectural improvement

### Why Medium-High Priority:
1. Enables all other enhancements
2. Improves maintainability
3. Better testing capability
4. Foundation for features
5. Cleaner codebase

## Alternative Approaches

### Option 1: Gradual Refactoring
```typescript
// Keep existing KDSLayout
// Extract one component at a time
// Maintain backward compatibility
```

### Option 2: Feature Flags
```typescript
const KDSLayout = ({ useRefactored = false }) => {
  if (useRefactored) {
    return <KDSLayoutRefactored />
  }
  return <KDSLayoutLegacy />
}
```

### Option 3: Composition Pattern
```typescript
<KDSProvider>
  <KDSHeader />
  <KDSStationSelector />
  <KDSOrderView />
</KDSProvider>
```

## Recommended Approach

1. Extract KDSHeader first (low risk)
2. Create station components
3. Implement optimistic updates
4. Add toast notifications
5. Refactor main layout
6. Add bulk actions
7. Performance optimize

## Questions for Implementation

1. **Migration strategy?**
   - Big bang vs incremental

2. **State management library?**
   - Context vs Redux vs Zustand

3. **Component boundaries?**
   - How fine-grained?

4. **Testing approach?**
   - Unit vs integration focus

5. **Performance targets?**
   - Render time goals

## UI/UX Enhancements to Preserve

1. **Station Selector Bar**: Quick station switching
2. **Order Count**: Visible workload indicator
3. **Toast Notifications**: Action feedback
4. **Error Recovery**: Retry button on errors
5. **Loading States**: Smooth transitions

## Performance Optimizations

1. **Memoize station filtering**
   ```typescript
   const stationOrders = useMemo(() => 
     filterOrdersByStation(orders, selectedStation),
     [orders, selectedStation]
   )
   ```

2. **Debounce actions**
   ```typescript
   const debouncedAction = useDebouncedCallback(
     handleOrderAction,
     300
   )
   ```

3. **Virtual scrolling for large lists**
   ```typescript
   import { VirtualList } from '@/components/ui/virtual-list'
   ```

## Special Considerations

### Real-time Sync
- Optimistic updates must reconcile
- Handle concurrent edits
- Preserve user actions during sync

### Action Queuing
- Offline action queue
- Retry failed actions
- Preserve action order

### Multi-User Awareness
- Show who's working on what
- Prevent action conflicts
- Real-time presence

## Testing Considerations

1. **Component isolation**: Test each separately
2. **Action flows**: Full action lifecycles
3. **Error scenarios**: Network, auth, validation
4. **Performance**: Large order lists
5. **State sync**: Optimistic vs server

## Future Enhancements

1. **Smart Actions**
   - Predictive next actions
   - Batch similar operations
   - Workflow automation

2. **Advanced Notifications**
   - Sound alerts by priority
   - Visual indicators
   - Push notifications

3. **Analytics Integration**
   - Action timing metrics
   - Station efficiency
   - Error tracking

## Conclusion

KDSLayoutRefactored demonstrates how breaking down a monolithic component into focused, reusable pieces improves maintainability and enables new features. The optimistic updates and toast notifications significantly enhance UX, while the station-specific views provide the foundation for specialized workflows.

This refactoring is not just about cleaner code - it's about creating a flexible architecture that can evolve with kitchen needs. The investment in proper component separation pays dividends in testing, debugging, and feature development.