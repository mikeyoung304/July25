# FloorPlanSection Integration Guide

## Component Overview

FloorPlanSection is a wrapper component that provides:
- Loading states and error handling for floor plan
- Dynamic import for bundle optimization
- Table statistics in header
- Integration with order flow context
- Suspense boundaries for smooth loading

## Current State Analysis (rebuild-6.0)

### What Exists
- **Card Components**: UI components ready to use
- **Loading States**: Skeleton loaders available
- **Alert System**: Error display components
- **No Floor Plan**: Missing this entire feature

### What's Missing
- Server station interface
- Floor plan visualization
- Table selection flow
- Order assignment UI

## Enhancement Opportunity

The FloorPlanSection component demonstrates:

1. **Smart Loading**
   - Dynamic import reduces initial bundle
   - Loading skeleton provides feedback
   - SSR disabled for canvas component

2. **Error Handling**
   - Graceful degradation
   - Clear error messages
   - Fallback UI states

3. **Statistics Display**
   - Total table count
   - Available table count
   - Color-coded availability

4. **Clean Architecture**
   - Separation of concerns
   - Reusable sub-components
   - Error boundaries

## Integration Strategy

### Step 1: Create Server Page Structure

```typescript
// src/pages/ServerStation.tsx
export function ServerStation() {
  return (
    <div className="h-screen flex flex-col">
      <ServerHeader />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        <FloorPlanSection />
        <OrdersSection />
      </div>
    </div>
  )
}
```

### Step 2: Implement Data Hooks

```typescript
// src/modules/tables/hooks/useTableData.ts
export function useTableData() {
  const { restaurantId } = useRestaurantContext()
  
  const { data: tables, loading, error } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: () => api.tables.getAll(restaurantId),
    refetchInterval: 30000 // Refresh every 30s
  })
  
  const availableCount = tables?.filter(t => t.status === 'available').length || 0
  
  return {
    tables: tables || [],
    loading,
    error,
    stats: {
      total: tables?.length || 0,
      available: availableCount
    }
  }
}
```

### Step 3: Create Order Flow Integration

```typescript
// src/modules/orders/contexts/OrderFlowContext.tsx
export function useOrderFlow() {
  const navigate = useNavigate()
  const { startOrder } = useOrderMutations()
  
  const selectTable = useCallback(async (table: Table) => {
    if (table.currentOrderId) {
      // Navigate to existing order
      navigate(`/orders/${table.currentOrderId}`)
    } else {
      // Start new order
      const order = await startOrder({ tableId: table.id })
      navigate(`/orders/${order.id}/items`)
    }
  }, [navigate, startOrder])
  
  return {
    actions: { selectTable }
  }
}
```

### Step 4: Adapt Styling to Macon

```typescript
// Original dark glassmorphism
className="bg-gray-800/40 border-gray-700/30 backdrop-blur-sm"
className="bg-gray-700 text-gray-300"
className="text-blue-400"

// Adapted for Macon
className="bg-white border-gray-200 shadow-sm"
className="bg-gray-100 text-gray-700"
className="text-macon-orange"
```

## Code Adaptation Guide

### Key Changes Needed

1. **Remove Next.js dynamic import**
   ```diff
   - import dynamic from 'next/dynamic'
   - const FloorPlanView = dynamic(() => import(...))
   
   + import { lazy, Suspense } from 'react'
   + const FloorPlanView = lazy(() => import('./FloorPlanView'))
   ```

2. **Update data hooks**
   ```diff
   - import { useServerPageData } from '@/lib/hooks/use-server-page-data'
   + import { useTableData } from '@/modules/tables/hooks/useTableData'
   ```

3. **Simplify error boundaries**
   ```diff
   - function FloorPlanErrorBoundary
   + import { ErrorBoundary } from '@/components/ErrorBoundary'
   ```

4. **Update context usage**
   ```diff
   - import { useOrderFlow } from '@/lib/state/order-flow-context'
   + import { useOrderFlow } from '@/modules/orders/contexts/OrderFlowContext'
   ```

## Critical Thinking Prompts

### For the Next AI to Consider:

1. **Loading optimization**
   - Is lazy loading worth the complexity?
   - Preload on hover over nav?
   - Service worker caching?

2. **Real-time sync strategy**
   - WebSocket for table status?
   - Polling interval optimization?
   - Optimistic updates?

3. **Mobile responsiveness**
   - Full floor plan on phone?
   - Simplified list view?
   - Swipe between sections?

4. **Permission considerations**
   - Who can view floor plan?
   - Server-specific sections?
   - Manager override access?

5. **Performance monitoring**
   - Track selection time?
   - Load time metrics?
   - Error rate tracking?

## Risks & Mitigations

### Risk 1: Slow Initial Load
**Issue**: Dynamic import delays floor plan display
**Mitigation**: Preload on route hover, show meaningful skeleton

### Risk 2: Stale Table Data
**Issue**: Table status out of sync
**Mitigation**: Real-time subscriptions, visual indicators

### Risk 3: Error State Confusion
**Issue**: Users don't understand error messages
**Mitigation**: Actionable error messages, retry buttons

## Integration Priority

**Priority: MEDIUM** - Enhances server workflow

### Why Medium Priority:
1. Significant UX improvement for servers
2. Requires table data setup first
3. Not critical for kitchen operations
4. Nice-to-have for most restaurants
5. Differentiator for tech-forward venues

## Alternative Approaches

### Option 1: Combined View
```typescript
// Show floor plan and orders together
<SplitView>
  <FloorPlanPanel />
  <OrderListPanel />
</SplitView>
```

### Option 2: Modal Approach
```typescript
// Floor plan in modal overlay
<Button onClick={() => setShowFloorPlan(true)}>
  Select Table
</Button>
<FloorPlanModal 
  open={showFloorPlan}
  onSelect={handleTableSelect}
/>
```

### Option 3: Wizard Flow
```typescript
// Step-by-step order creation
<OrderWizard steps={[
  { id: 'table', component: FloorPlanStep },
  { id: 'items', component: MenuStep },
  { id: 'confirm', component: ConfirmStep }
]} />
```

## Recommended Approach

1. Create basic server station page
2. Implement table data fetching
3. Add floor plan section
4. Connect to order flow
5. Add real-time updates
6. Optimize loading performance
7. Add accessibility features

## Questions for Implementation

1. **Page layout preferences?**
   - Side-by-side vs stacked
   - Full screen floor plan?
   - Collapsible panels?

2. **Table data source?**
   - Manual configuration?
   - Import from POS?
   - Visual editor?

3. **Order assignment flow?**
   - Direct from floor plan?
   - Confirmation step?
   - Guest count input?

4. **Status update frequency?**
   - Real-time critical?
   - Battery impact on tablets?
   - Offline capability?

5. **Analytics integration?**
   - Track table turnover?
   - Heat maps?
   - Server efficiency?

## UI/UX Enhancements to Preserve

1. **Loading Skeleton**: Maintains layout during load
2. **Badge Statistics**: At-a-glance availability
3. **Error Boundaries**: Graceful failure handling
4. **Dynamic Import**: Optimized bundle size
5. **Clean Layout**: Clear visual hierarchy

## Performance Optimizations

1. **Memoize statistics**
   ```typescript
   const stats = useMemo(() => ({
     total: tables.length,
     available: tables.filter(t => t.status === 'available').length
   }), [tables])
   ```

2. **Debounce status updates**
   ```typescript
   const debouncedTableUpdate = useDebouncedCallback(
     updateTableStatus,
     500
   )
   ```

3. **Virtual scrolling for table list**
   ```typescript
   // If showing table list alongside floor plan
   <VirtualList items={tables} height={400} />
   ```

## Special Considerations

### Device Variations
- Handheld: Simplified view
- Tablet: Full floor plan
- Desktop: Multi-panel layout

### Restaurant Types
- QSR: Numbered tables only
- Fine dining: Detailed sections
- Bar: Mixed seating types

### Shift Patterns
- Lunch: Quick table turns
- Dinner: Longer sessions
- Events: Section blocking

## Testing Considerations

1. **Loading states**: Skeleton display
2. **Error scenarios**: Network failures
3. **Empty states**: No tables configured
4. **Performance**: Large floor plans
5. **Responsiveness**: Various devices

## Future Enhancements

1. **AI Table Assignment**
   - Balance server workload
   - Predict wait times
   - Optimize revenue

2. **Reservation Integration**
   - Show upcoming bookings
   - Block reserved tables
   - Walk-in management

3. **Advanced Analytics**
   - Table heat maps
   - Revenue by location
   - Traffic patterns

## Conclusion

FloorPlanSection provides a clean, well-structured wrapper around the floor plan visualization. Its focus on loading states, error handling, and statistics makes it a production-ready component that enhances the server workflow significantly.

The integration challenge is primarily around data flow - connecting table selection to order creation while maintaining real-time synchronization. The component's modular design makes it easy to integrate without disrupting existing systems.