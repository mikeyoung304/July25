# SaladStation Integration Guide

## Component Overview

SaladStation is a specialized view for the cold prep station that provides:
- Temperature-based prioritization (cold items get priority)
- Quick prep time estimates (1-5 minutes)
- Visual cold storage indicators (snowflake icons)
- Freshness-focused workflow

## Current State Analysis (rebuild-6.0)

### What Exists
- **Station Routing**: Can identify salad/cold prep items
- **Basic Order Display**: Generic views for all stations
- **Status Tracking**: Standard order lifecycle
- **Real-time Updates**: Order subscription system

### What's Missing
- Temperature-based prioritization
- Cold storage indicators
- Freshness timing (cold items degrade faster)
- Station-specific visual cues

## Enhancement Opportunity

The SaladStation component from plate-clean-test provides:

1. **Temperature Awareness**
   - Snowflake icons for cold items
   - Priority system based on temperature needs
   - Visual grouping of cold vs warm items

2. **Quick Prep Times**
   - 1-5 minute estimates
   - Fast turnover optimization
   - Visual time tracking

3. **Freshness Priority**
   - Cold items marked high priority
   - Prevents quality degradation
   - Clear visual indicators

4. **Station Workflow**
   - Simple start/ready actions
   - Filtered view of relevant items
   - Cold item count badge

## Integration Strategy

### Step 1: Extend Station Routing for Temperature

```typescript
// src/services/stationRouting.ts enhancement
export interface StationConfig {
  keywords: string[]
  categories: string[]
  temperature?: 'cold' | 'hot' | 'ambient'
}

// Add temperature awareness
salad: {
  keywords: ['salad', 'cold', 'gazpacho', 'ceviche'],
  categories: ['Salads', 'Appetizers', 'Soups'],
  temperature: 'cold'
}
```

### Step 2: Create Temperature-Based Utils

```typescript
// src/modules/kitchen/utils/temperatureUtils.ts
export function getItemTemperature(itemName: string): Temperature {
  const coldKeywords = ['salad', 'cold', 'gazpacho', 'ceviche', 'ice']
  const hotKeywords = ['soup', 'hot', 'warm', 'steamed']
  
  if (coldKeywords.some(k => itemName.toLowerCase().includes(k))) {
    return 'cold'
  }
  if (hotKeywords.some(k => itemName.toLowerCase().includes(k))) {
    return 'hot'
  }
  return 'ambient'
}

export function getFreshnessUrgency(item: OrderItem): number {
  const temp = getItemTemperature(item.name)
  const baseUrgency = getElapsedMinutes(item.orderTime)
  
  // Cold items degrade 2x faster
  return temp === 'cold' ? baseUrgency * 2 : baseUrgency
}
```

### Step 3: Adapt Visual Indicators

```typescript
// Original dark theme
className="bg-green-50/5" // Transparent dark
className="text-white" // Dark theme text

// Adapted for Macon light theme
className="bg-green-50 border-green-200" // Solid light
className="text-gray-900" // Light theme text

// Keep snowflake indicator but adjust colors
<Snowflake className="h-3 w-3 text-blue-500" /> // Brighter blue
```

### Step 4: Integrate with Service Layer

```typescript
// Original
onOrderAction('start', order.id)
onOrderAction('complete', order.id)

// Adapted
const { updateOrderStatus, trackFreshness } = useOrderActions()

await updateOrderStatus(order.id, 'preparing', {
  station: 'salad',
  temperature: getOrderTemperature(order.items),
  estimatedTime: getEstimatedPrepTime(order.items)
})

// Track freshness for analytics
await trackFreshness(order.id, 'cold_item_started')
```

## Code Adaptation Guide

### Key Changes Needed

1. **Remove Next.js specifics**
   ```diff
   - 'use client'
   ```

2. **Update component structure**
   ```diff
   - import { OrderCard } from '../order-card'
   + import { KDSOrderCard } from '@/modules/kitchen/components/KDSOrderCard'
   ```

3. **Use Macon brand colors**
   ```diff
   - className="text-green-500" // Dark theme
   + className="text-green-600" // Brighter for light theme
   
   - className="bg-blue-900/40" // Dark transparent
   + className="bg-blue-100 border-blue-300" // Light solid
   ```

4. **Adapt data fields**
   ```diff
   - order.table_label
   + order.tableNumber
   
   - order.elapsed_seconds
   + calculateElapsedSeconds(order.orderTime)
   ```

## Critical Thinking Prompts

### For the Next AI to Consider:

1. **Temperature tracking complexity**
   - Should we track actual temperatures?
   - How to handle mixed temperature orders?
   - Integration with refrigeration monitoring?

2. **Freshness algorithms**
   - Linear degradation or exponential?
   - Different rates for different items?
   - Visual warnings at thresholds?

3. **Prep station variations**
   - Combined cold/hot stations?
   - Dedicated soup station?
   - Smoothie/juice bar integration?

4. **Health code compliance**
   - Time/temperature tracking for HACCP?
   - Automated compliance reports?
   - Alert thresholds configuration?

5. **Cross-station coordination**
   - How to sync cold items with hot items?
   - Hold strategies for complete orders?
   - Temperature maintenance during wait?

## Risks & Mitigations

### Risk 1: Over-Prioritization of Cold
**Issue**: All salads marked urgent, creating false urgency
**Mitigation**: Graduated urgency based on actual time, not just temperature

### Risk 2: Mixed Orders Complexity
**Issue**: Orders with both hot soup and cold salad
**Mitigation**: Split order display, coordinate timing

### Risk 3: Freshness Tracking Overhead
**Issue**: Too much data tracking slows system
**Mitigation**: Sample tracking, aggregate analytics

## Integration Priority

**Priority: MEDIUM-HIGH** - Quality impact on cold items

### Why Medium-High Priority:
1. Direct quality impact (wilted salads, warm gazpacho)
2. Food safety considerations
3. Relatively simple implementation
4. Clear visual improvements
5. Enhances existing station routing

## Alternative Approaches

### Option 1: Temperature Zones UI
```typescript
<SaladStation>
  <TemperatureZone temp="cold" urgent>
    {coldItems}
  </TemperatureZone>
  <TemperatureZone temp="ambient">
    {roomTempItems}
  </TemperatureZone>
</SaladStation>
```

### Option 2: Freshness Timer Focus
```typescript
<FreshnessTimer 
  item={order}
  maxFreshness={15}
  warningAt={10}
  criticalAt={12}
/>
```

### Option 3: Prep Batch Optimization
```typescript
const batches = optimizeSaladPrep(orders, {
  groupByCold: true,
  maxBatchSize: 6,
  prioritizeFreshness: true
})
```

## Recommended Approach

1. Start with simple temperature indicators
2. Add basic freshness prioritization
3. Implement visual cold item grouping
4. Monitor usage patterns
5. Add advanced features based on feedback

## Questions for Implementation

1. **How long can cold items sit?**
   - Restaurant-specific policies?
   - Item-specific limits?

2. **Refrigeration integration?**
   - Smart fridge sensors?
   - Temperature logging?

3. **Dressing on side handling?**
   - Separate timing for components?
   - Assembly instructions?

4. **Batch salad prep?**
   - Pre-made salads in cooler?
   - Made-to-order only?

5. **Garnish coordination?**
   - Last-minute additions?
   - Cross-station garnishes?

## UI/UX Enhancements to Preserve

1. **Snowflake Icons**: Instant cold item recognition
2. **Green Color Theme**: Natural salad association
3. **Priority Badges**: Quick scanning
4. **Time Estimates**: Realistic expectations
5. **Cold Count Badge**: Workload visibility

## Performance Optimizations

1. **Cache temperature calculations**
   ```typescript
   const itemTemp = useMemo(() => 
     getItemTemperature(item.name),
     [item.name]
   )
   ```

2. **Batch freshness updates**
   - Update every 30 seconds, not continuously

3. **Optimize icon rendering**
   - Use CSS instead of multiple icon instances

## Special Considerations

### Food Safety Integration
- FIFO tracking for pre-prepped items
- Temperature log integration
- Automated HACCP compliance

### Seasonal Variations
- Summer: Higher cold item volume
- Winter: More soup orders
- Adjust priorities seasonally

### Multi-Station Items
- Salads with grilled chicken
- Coordination with hot stations
- Assembly timing optimization

## Testing Considerations

1. **Temperature detection**: Accurate categorization
2. **Freshness calculations**: Proper urgency
3. **Visual indicators**: Clear and consistent
4. **Priority sorting**: Cold items first
5. **Performance**: Smooth with 15+ orders

## Future Enhancements

1. **Smart Refrigeration**
   - IoT temperature sensors
   - Automatic quality tracking
   - Predictive freshness alerts

2. **Prep Analytics**
   - Popular combinations
   - Prep time optimization
   - Waste reduction insights

3. **Allergy Management**
   - Visual allergy warnings
   - Cross-contamination alerts
   - Separate prep tracking

## Conclusion

SaladStation brings temperature awareness and freshness prioritization to the cold prep area. Its visual indicators and smart prioritization directly address quality concerns with cold items. The relatively quick prep times and clear workflow make it an excellent enhancement to rebuild-6.0's kitchen system.

The key is balancing the urgency of cold items with overall kitchen flow, ensuring fresh salads without creating artificial bottlenecks. The snowflake indicators and color coding provide instant visual feedback that helps kitchen staff prioritize effectively.