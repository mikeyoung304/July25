# GrillStation Integration Guide

## Component Overview

GrillStation is a specialized view for the grill station that provides:
- Station-specific UI optimized for grill operations
- Priority highlighting for grill items
- Cooking time estimates
- Visual urgency indicators

## Current State Analysis (rebuild-6.0)

### What Exists
- **Station Routing**: `stationRouting.ts` already identifies grill items
- **Station Types**: Defined in `types/station.ts` with patterns
- **Filtering**: Orders can be filtered by station type
- **Generic Display**: All orders shown in same UI regardless of station

### What's Missing
- Station-specific UI components
- Cooking time estimates
- Priority systems per station
- Visual workflow optimization

## Enhancement Opportunity

The GrillStation component from plate-clean-test provides:

1. **Visual Priority System**
   - High priority items highlighted in orange
   - Overdue orders shown in red
   - Active order count with color coding

2. **Time Management**
   - Estimated cooking times per item
   - Elapsed time tracking
   - Visual time pressure indicators

3. **Workflow Optimization**
   - Station-specific action buttons
   - Filtered view showing only grill items
   - Optimized card layout for kitchen workflow

## Integration Strategy

### Step 1: Create Station View Wrapper

Instead of copying GrillStation directly, create a unified wrapper:

```typescript
// src/modules/kitchen/components/StationView.tsx
import { useStationOrders } from '../hooks/useStationOrders'
import { StationType } from '@/types/station'

interface StationViewProps {
  stationType: StationType
  orders: Order[]
}

export function StationView({ stationType, orders }: StationViewProps) {
  const stationOrders = useStationOrders(orders, stationType)
  
  // Apply station-specific UI based on type
  switch(stationType) {
    case 'grill':
      return <GrillStationView orders={stationOrders} />
    case 'fryer':
      return <FryerStationView orders={stationOrders} />
    // etc...
  }
}
```

### Step 2: Adapt to Service Layer

Original uses direct actions, adapt to rebuild-6.0's service pattern:

```typescript
// Original (direct action)
onOrderAction('start', order.id)

// Adapted (service layer)
const { updateOrderStatus } = useOrderActions()
await updateOrderStatus(order.id, 'preparing')
```

### Step 3: Apply Macon Brand Colors

Replace dark theme colors with Macon brand:

```typescript
// Original
className="text-orange-500" // Dark theme orange

// Adapted
className="text-macon-orange" // Brand orange
```

### Step 4: Integrate with Existing Systems

Use rebuild-6.0's existing infrastructure:

```typescript
// Use existing station routing
import { stationRouting } from '@/services/stationRouting'

// Use existing order subscription
import { useOrderSubscription } from '@/hooks/useOrderSubscription'

// Use existing filter system
import { useOrderFilters } from '@/hooks/useOrderFilters'
```

## Code Adaptation Guide

### Key Changes Needed

1. **Remove Next.js specifics**
   ```diff
   - 'use client'  // Not needed in Vite
   ```

2. **Update imports**
   ```diff
   - import { cn } from '@/lib/utils'
   + import { cn } from '@/utils/cn'
   
   - import { OrderCard } from '../order-card'
   + import { KDSOrderCard } from '@/modules/kitchen/components/KDSOrderCard'
   ```

3. **Adapt data structure**
   ```diff
   - order.table_label
   + order.tableNumber
   
   - order.elapsed_seconds
   + calculateElapsedTime(order.orderTime)
   ```

4. **Use service layer**
   ```diff
   - onOrderAction('start', order.id)
   + await api.updateOrderStatus(order.id, 'preparing')
   ```

## Critical Thinking Prompts

### For the Next AI to Consider:

1. **Should we create individual station components or a configurable one?**
   - Individual: More flexibility, but more code
   - Configurable: Less code, but might be complex

2. **How do we handle station-specific business logic?**
   - Embed in components? (simpler but less testable)
   - Extract to hooks? (more testable but more abstraction)

3. **What about mobile responsiveness?**
   - Current component is desktop-focused
   - Need to consider tablet use in kitchen

4. **Performance implications?**
   - Multiple station views = more components
   - Consider virtualization for busy kitchens

5. **Configuration vs Convention?**
   - Hardcode cooking times? 
   - Make them configurable per restaurant?

## Risks & Mitigations

### Risk 1: Over-Specialization
**Issue**: Too many station-specific features make maintenance hard
**Mitigation**: Extract common patterns to shared components

### Risk 2: Performance Impact
**Issue**: Multiple filtered views impact rendering
**Mitigation**: Use React.memo and proper memoization

### Risk 3: Business Logic Coupling
**Issue**: Cooking times/priorities coupled to UI
**Mitigation**: Move to configuration or service layer

## Integration Priority

**Priority: HIGH** - This directly improves kitchen efficiency

### Why High Priority:
1. Clear user benefit (reduced cognitive load)
2. Low architectural risk (UI enhancement only)
3. Builds on existing infrastructure
4. Measurable impact on order processing time

## Alternative Approaches

### Option 1: Generic Configurable Station
```typescript
<StationView 
  config={{
    icon: Flame,
    color: 'orange',
    priorities: ['steak', 'burger'],
    timeEstimates: { steak: 15, burger: 8 }
  }}
/>
```

### Option 2: Composition Pattern
```typescript
<StationLayout>
  <StationHeader icon={Flame} title="Grill" />
  <StationFilters items={grillItems} />
  <StationOrders renderer={GrillOrderCard} />
</StationLayout>
```

### Option 3: Plugin System
```typescript
registerStation('grill', {
  component: GrillStation,
  filter: grillFilter,
  actions: grillActions
})
```

## Recommended Approach

1. Start with a simple StationView wrapper
2. Extract station-specific logic to configuration
3. Keep UI components pure and testable
4. Use existing routing and filtering systems
5. Monitor performance and iterate

## Questions for Implementation

1. **How many concurrent orders does a typical station handle?**
   - Affects whether we need virtualization

2. **Do cooking times vary by restaurant?**
   - Determines if hardcoded or configurable

3. **Should stations share state?**
   - For coordination features

4. **Mobile kitchen displays?**
   - Affects responsive design needs

5. **Multi-language support needed?**
   - For international deployments

## Conclusion

The GrillStation component offers valuable UI patterns that can enhance rebuild-6.0's kitchen display. The key is adapting these patterns to work within the existing architecture rather than copying wholesale. Focus on the user experience improvements while maintaining the clean service layer pattern.