# FryerStation Integration Guide

## Component Overview

FryerStation is a specialized view for the fryer station that provides:
- Urgency-based prioritization (fries and rings get priority)
- Short cooking time estimates (3-8 minutes)
- Visual timing indicators
- Station-specific workflow optimization

## Current State Analysis (rebuild-6.0)

### What Exists
- **Station Routing**: `stationRouting.ts` can identify fryer items
- **Order Display**: Generic grid/list views for all stations
- **Status Management**: Basic order status tracking
- **Real-time Updates**: Supabase subscriptions

### What's Missing
- Fryer-specific prioritization (urgent items like fries)
- Visual cooking time tracking
- Station-optimized UI
- Batch management features

## Enhancement Opportunity

The FryerStation component from plate-clean-test provides:

1. **Smart Prioritization**
   - Fries and onion rings marked as high priority
   - Other fried items as medium priority
   - Visual yellow highlighting for urgent items

2. **Time Management**
   - Quick cooking times (3-8 minutes)
   - Visual progress against estimates
   - Red highlighting for overdue items

3. **Workflow Optimization**
   - Clear start/done actions
   - Filtered view of only fryer items
   - Active order count with status colors

## Integration Strategy

### Step 1: Leverage Existing Station Routing

```typescript
// src/services/stationRouting.ts already has:
fryer: {
  keywords: ['fries', 'onion rings', 'mozzarella', 'fried'],
  categories: ['Sides', 'Appetizers']
}

// Extend with priority logic
export function getFryerItemPriority(itemName: string): Priority {
  if (itemName.match(/fries|rings/i)) return 'high'
  if (itemName.match(/fried|fryer/i)) return 'medium'
  return 'low'
}
```

### Step 2: Create Fryer-Specific Timing

```typescript
// src/modules/kitchen/utils/fryerTiming.ts
const FRYER_COOK_TIMES = {
  fries: 4,
  'onion rings': 5,
  nuggets: 6,
  wings: 8,
  calamari: 3,
  tempura: 4
} as const

export function getEstimatedFryTime(items: OrderItem[]): number {
  const times = items
    .map(item => getFryerCookTime(item.name))
    .filter(Boolean)
  
  return Math.max(...times, 3) // minimum 3 minutes
}
```

### Step 3: Adapt to Service Layer

```typescript
// Original
onOrderAction('start', order.id)

// Adapted
const { updateOrderStatus } = useOrderActions()
await updateOrderStatus(order.id, 'preparing', {
  station: 'fryer',
  estimatedTime: getEstimatedFryTime(order.items)
})
```

### Step 4: Apply Macon Brand Colors

```typescript
// Original
className="text-yellow-500" // Dark theme yellow

// Adapted  
className="text-yellow-600" // Brighter for Macon light theme
className="bg-yellow-50 border-yellow-300" // Light backgrounds
```

## Code Adaptation Guide

### Key Changes Needed

1. **Remove Next.js specifics**
   ```diff
   - 'use client'
   ```

2. **Update imports**
   ```diff
   - import { cn } from '@/lib/utils'
   + import { cn } from '@/utils/cn'
   ```

3. **Use existing order structure**
   ```diff
   - order.table_label
   + order.tableNumber
   
   - order.elapsed_seconds
   + calculateElapsedSeconds(order.orderTime)
   ```

4. **Integrate with station routing**
   ```diff
   - const fryerOrders = orders.filter(/* inline logic */)
   + const fryerOrders = useStationOrders(orders, 'fryer')
   ```

## Critical Thinking Prompts

### For the Next AI to Consider:

1. **Batch frying optimization**
   - Should we group similar items?
   - How to handle different oil temperatures?
   - Multi-basket tracking?

2. **Safety considerations**
   - Oil temperature warnings?
   - Timer alerts for safety?
   - Overflow prevention?

3. **Rush hour adaptations**
   - Should priorities change during peak times?
   - Batch size adjustments?
   - Pre-cooking strategies?

4. **Integration with other stations**
   - How to coordinate with grill for combos?
   - Timing synchronization for complete orders?

5. **Equipment variations**
   - Single vs multi-basket fryers?
   - Different fryer sizes?
   - Specialty equipment (pressure fryers)?

## Risks & Mitigations

### Risk 1: Over-Prioritization
**Issue**: Everything marked urgent during rush
**Mitigation**: Time-based priority scaling, configurable thresholds

### Risk 2: Timer Accuracy
**Issue**: Actual cook times vary by load
**Mitigation**: Allow manual time adjustments, learn from history

### Risk 3: Safety Oversight
**Issue**: Missed timers could mean burnt food
**Mitigation**: Audio alerts, visual warnings, auto-escalation

## Integration Priority

**Priority: HIGH** - Fryer is often a bottleneck station

### Why High Priority:
1. High-volume station with quick turnover
2. Customer satisfaction impact (cold fries = complaints)
3. Safety implications (oil, timers)
4. Easy wins with timing optimization

## Alternative Approaches

### Option 1: Batch Management UI
```typescript
<FryerBatch>
  <BatchSlot capacity={4} items={friesOrders} />
  <BatchSlot capacity={2} items={specialtyOrders} />
</FryerBatch>
```

### Option 2: Timer-First Design
```typescript
<FryerTimers>
  {baskets.map(basket => (
    <BasketTimer 
      remaining={basket.timeLeft}
      items={basket.items}
      critical={basket.timeLeft < 30}
    />
  ))}
</FryerTimers>
```

### Option 3: Queue Optimization
```typescript
const optimizedQueue = optimizeFryerBatches(orders, {
  maxBatchSize: 4,
  prioritizeByType: true,
  considerOilTemp: true
})
```

## Recommended Approach

1. Start with simple filtering and prioritization
2. Add visual timing indicators
3. Implement basic batch grouping
4. Monitor usage and iterate
5. Consider advanced features based on feedback

## Questions for Implementation

1. **How many fryer baskets available?**
   - Affects UI layout and batch logic

2. **Oil temperature management?**
   - Different items need different temps

3. **Pre-cooked items?**
   - Some items partially cooked in prep

4. **Hold time tracking?**
   - How long can items sit before quality degrades?

5. **Integration with warmers?**
   - Some fried items go to warming stations

## UI/UX Enhancements to Preserve

1. **Yellow Color Coding**: Instant station recognition
2. **Time Comparisons**: Elapsed vs estimated
3. **Priority Badges**: Quick visual scanning
4. **Active Count**: Workload at a glance
5. **Zap Icon**: Fun, recognizable station identifier

## Performance Optimizations

1. **Memoize cooking time calculations**
   ```typescript
   const cookTime = useMemo(() => 
     getEstimatedFryTime(order.items),
     [order.items]
   )
   ```

2. **Batch similar updates**
   - Group timer updates to reduce renders

3. **Use CSS animations for timers**
   - Offload to GPU for smooth countdowns

## Special Considerations

### Rush Hour Adaptations
- Larger batch sizes
- Pre-staging common items
- Priority overrides for large orders

### Multi-Location Variations
- Different fryer configurations
- Regional menu differences
- Equipment capabilities

### Integration with Inventory
- Oil usage tracking
- Frozen inventory levels
- Predictive prep based on history

## Testing Considerations

1. **Timer accuracy**: Within 10 seconds
2. **Priority sorting**: High items first
3. **Batch optimization**: Efficient grouping
4. **Safety alerts**: Timely warnings
5. **Load testing**: 20+ concurrent items

## Conclusion

FryerStation represents a high-throughput, time-critical station that benefits greatly from specialized UI. The quick cooking times and safety considerations make it an excellent candidate for enhancement. The key is balancing simplicity with the advanced features that make fryer operations more efficient.

The component's focus on visual timing and smart prioritization directly addresses common fryer station pain points. By adapting it to rebuild-6.0's architecture, we can provide immediate value while maintaining system consistency.