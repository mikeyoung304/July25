# UI Patterns to Adopt from plate-clean-test

## Overview

This document identifies specific UI/UX patterns from plate-clean-test that would enhance rebuild-6.0's user experience without compromising its architecture.

## Priority 1: Station-Specific Views 🎯

### Current State (rebuild-6.0)
- Has station routing logic and types
- Filters orders by station
- Single unified view for all stations

### Enhancement Opportunity
plate-clean-test implements dedicated UI for each station that reflects their unique workflows:

```typescript
// Grill Station: Focus on timing and temperature
<GrillStation 
  showTimers={true}
  showTempAlerts={true}
  priorityItems={['burger', 'steak']}
/>

// Expo Station: Quality check and coordination
<ExpoStation
  showCompleteness={true}
  enableQualityCheck={true}
  coordinationView={true}
/>
```

### Why This Matters
- **Cognitive Load**: Station staff see only relevant information
- **Efficiency**: UI optimized for specific tasks
- **Training**: Easier to learn station-specific workflows
- **Error Reduction**: Less information overload

### Integration Strategy
1. Create a `StationView` wrapper component
2. Use existing station routing for filtering
3. Apply station-specific UI treatments
4. Keep Macon brand colors

## Priority 2: Multi-View Layouts 🖼️

### Current State (rebuild-6.0)
- Grid view
- List view

### Enhancement Opportunity
plate-clean-test offers:
- **Single Station**: Focus on one station
- **Multi Station**: See all stations in grid
- **Split View**: 2-4 stations side by side
- **Fullscreen Mode**: Distraction-free kitchen display

```typescript
type LayoutMode = 'grid' | 'list' | 'single' | 'multi' | 'split'

// Split view allows monitoring multiple stations
<KDSLayout mode="split" stations={['grill', 'fryer']} />
```

### Why This Matters
- **Flexibility**: Different kitchen sizes need different views
- **Coordination**: Expo can see multiple stations
- **Focus**: Single station for busy periods
- **Adaptability**: Change view based on volume

### Integration Strategy
1. Extend existing `KDSLayout` component
2. Add view mode selector
3. Implement split view logic
4. Add fullscreen toggle

## Priority 3: Visual Feedback Patterns 🎨

### Current State (rebuild-6.0)
- Basic status colors
- Animation transitions
- Sound notifications

### Enhancement Opportunity
plate-clean-test implements:

#### Urgency Indicators
```css
/* Time-based urgency */
.urgent-order {
  animation: pulse 2s infinite;
  border-color: theme('colors.red.500');
  box-shadow: 0 0 20px theme('colors.red.200');
}
```

#### Station Status Cards
```typescript
// Visual hierarchy for order cards
<Card className={cn(
  'relative overflow-hidden',
  isUrgent && 'ring-2 ring-red-500 animate-pulse',
  isPriority && 'border-l-4 border-orange-500',
  isReady && 'bg-green-50'
)}>
```

#### Connection Status
```typescript
<ConnectionStatus 
  status={connected ? 'online' : 'offline'}
  lastSync={lastSyncTime}
  reconnecting={isReconnecting}
/>
```

### Why This Matters
- **Attention Management**: Critical orders stand out
- **System Trust**: Users know connection state
- **Quick Scanning**: Visual hierarchy aids decision making
- **Reduced Errors**: Clear status prevents mistakes

### Integration Strategy
1. Enhance `AnimatedKDSOrderCard` with urgency states
2. Add connection status component
3. Implement visual hierarchy system
4. Keep animations performant

## Priority 4: Table Grouping Logic 📊

### Current State (rebuild-6.0)
- Orders shown individually
- Filtered by various criteria

### Enhancement Opportunity
plate-clean-test groups orders by table for better coordination:

```typescript
// Group orders for same table
const groupedOrders = useTableGroupedOrders(orders)

// Display grouped
<TableGroup tableNumber="5" orders={[...]} />
```

### Why This Matters
- **Coordination**: See all items for a table
- **Timing**: Coordinate dish completion
- **Service**: Better customer experience
- **Efficiency**: Reduced trips to tables

### Integration Strategy
1. Create `useTableGrouping` hook
2. Add as optional display mode
3. Integrate with existing filters
4. Maintain performance with memoization

## Priority 5: Interactive Floor Plan 🗺️

### Current State (rebuild-6.0)
- No visual floor representation

### Enhancement Opportunity
plate-clean-test provides overhead restaurant view:

```typescript
<FloorPlanView
  tables={tables}
  onTableClick={handleTableSelect}
  showStatus={true}
  interactive={true}
/>
```

### Why This Matters
- **Spatial Awareness**: See physical layout
- **Quick Navigation**: Click table to see orders
- **Status Overview**: Restaurant state at a glance
- **Training**: New staff learn layout faster

### Integration Strategy
1. Create separate module for floor plan
2. Integrate with table service
3. Use Macon brand colors
4. Make it optional feature

## Patterns to Enhance (Not Replace)

### 1. Filtering System
- **Keep**: rebuild-6.0's comprehensive filters
- **Add**: Visual filter pills from plate-clean-test
- **Add**: Quick filter presets

### 2. Real-time Updates
- **Keep**: rebuild-6.0's subscription pattern
- **Add**: Visual feedback for updates (pulse/flash)
- **Add**: Update counters

### 3. Sound System
- **Keep**: rebuild-6.0's Web Audio API approach
- **Add**: Station-specific sounds
- **Add**: Sound profiles

## Patterns NOT to Adopt ❌

### 1. Dark Theme
- Conflicts with Macon brand
- Would require complete redesign
- User feedback prefers light theme

### 2. Direct Supabase Integration
- Breaks service layer
- Reduces testability
- Couples to specific database

### 3. Server Components
- Not applicable to Vite
- Different architecture pattern
- No clear benefit

### 4. Resident Tracking
- Complex feature
- Limited use case
- Privacy concerns

## Implementation Priorities

### Week 1: Foundation
1. Station view wrapper
2. Multi-view layouts
3. Fullscreen mode

### Week 2: Visual Enhancement
1. Urgency indicators
2. Connection status
3. Enhanced animations

### Week 3: Advanced Features
1. Table grouping
2. Floor plan visualization
3. Station coordination

## Success Metrics

### Quantitative
- Order processing time: -20%
- Misrouted orders: -50%
- Staff efficiency: +30%

### Qualitative
- Staff satisfaction surveys
- Training time reduction
- Error rate monitoring

## Design Token Adaptations

```css
/* Map plate-clean-test patterns to Macon brand */
--urgent-color: var(--macon-orange);
--success-color: var(--macon-teal);
--primary-color: var(--macon-navy);

/* Keep shadow patterns but adapt colors */
--shadow-urgent: 0 0 20px var(--macon-orange-100);
--shadow-success: 0 0 20px var(--macon-teal-100);
```

## Conclusion

These UI patterns from plate-clean-test can significantly enhance rebuild-6.0's user experience without compromising its superior architecture. The key is selective adoption - taking proven UI patterns while maintaining the clean service layer and modular structure that makes rebuild-6.0 maintainable and scalable.

Remember: **UI enhancements should reduce cognitive load, not add complexity.**