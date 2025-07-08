# FloorPlanView Integration Guide

## Component Overview

FloorPlanView is a sophisticated canvas-based floor plan visualization that provides:
- Visual table layout with Canvas API rendering
- Interactive table selection with rotation support
- Hover effects and animations
- Seat position calculations
- Touch-friendly interactions
- Performance-optimized rendering

## Current State Analysis (rebuild-6.0)

### What Exists
- **Table Management**: Basic table data structure
- **Order Assignment**: Tables can have orders
- **No Visual Layout**: Text-based table listing only
- **No Floor Plan**: Missing spatial visualization

### What's Missing
- Visual floor plan representation
- Interactive table selection
- Spatial layout management
- Server station interface
- Visual order status by table

## Enhancement Opportunity

The FloorPlanView component from plate-clean-test provides:

1. **Canvas-Based Rendering**
   - Smooth animations with requestAnimationFrame
   - Custom table shapes (circle, rectangle, square)
   - Rotation support for any angle
   - Seat position visualization

2. **Interactive Features**
   - Click to select tables
   - Hover effects with visual feedback
   - Touch support for tablets
   - Hit detection with rotation math

3. **Visual Design**
   - Gradient backgrounds
   - Shadow effects
   - Teal/amber color scheme
   - Professional appearance

4. **Performance Optimizations**
   - No heavy libraries (removed framer-motion)
   - Efficient canvas rendering
   - Memoized calculations
   - Frame-based animation

## Integration Strategy

### Step 1: Create Table Data Structure

```typescript
// src/types/table.ts
export interface Table {
  id: string
  label: string
  type: 'circle' | 'rectangle' | 'square'
  x: number
  y: number
  width: number
  height: number
  seats: number
  rotation?: number
  status?: 'available' | 'occupied' | 'reserved'
  currentOrderId?: string
}

// src/modules/tables/hooks/useTables.ts
export function useTables() {
  const { restaurantId } = useRestaurantContext()
  const { data: tables } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: () => api.tables.getAll(restaurantId)
  })
  
  return { tables: tables || [] }
}
```

### Step 2: Adapt Visual Design to Macon

```typescript
// Original teal/dark theme
const baseColor = 'rgba(13, 148, 136, 1)' // Teal
gradient.addColorStop(0, 'rgba(17, 24, 39, 0.95)') // Dark gray

// Adapted for Macon brand
const baseColor = '#f97316' // Macon orange
const hoverColor = '#fb923c' // Lighter orange
gradient.addColorStop(0, '#f5f5f4') // Light background
gradient.addColorStop(1, '#e7e5e4') // Slightly darker

// Update shadows for light theme
ctx.shadowColor = isHovered 
  ? 'rgba(251, 146, 60, 0.3)' // Orange shadow
  : 'rgba(0, 0, 0, 0.1)' // Subtle shadow
```

### Step 3: Integrate with Order System

```typescript
// Enhance table selection callback
const handleTableSelect = async (table: Table) => {
  // Check if table has active orders
  const activeOrders = await api.orders.getByTable(table.id)
  
  if (activeOrders.length > 0) {
    // Navigate to order details
    navigate(`/orders/table/${table.id}`)
  } else {
    // Start new order flow
    startNewOrder(table.id)
  }
}
```

### Step 4: Add Status Visualization

```typescript
// Modify drawing logic to show table status
const getTableColor = (table: Table) => {
  switch (table.status) {
    case 'occupied':
      return '#ef4444' // Red for occupied
    case 'reserved':
      return '#3b82f6' // Blue for reserved
    case 'available':
    default:
      return '#10b981' // Green for available
  }
}

// Add status badge to table
if (table.currentOrderId) {
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(centerX + width/2 - 10, centerY - height/2 + 10, 5, 0, Math.PI * 2)
  ctx.fill()
}
```

## Code Adaptation Guide

### Key Changes Needed

1. **Remove Next.js specifics**
   ```diff
   - 'use client'
   - import dynamic from 'next/dynamic'
   ```

2. **Update type imports**
   ```diff
   - import { Table } from '@/lib/floor-plan-utils'
   + import { Table } from '@/types/table'
   ```

3. **Simplify component structure**
   ```diff
   - className='bg-gray-900/70 border-gray-700/50'
   + className='bg-white border-gray-200 shadow-sm'
   ```

4. **Add real-time updates**
   ```typescript
   // Subscribe to table status changes
   useEffect(() => {
     const subscription = supabaseClient
       .from('tables')
       .on('UPDATE', payload => {
         updateTableStatus(payload.new)
       })
       .subscribe()
     
     return () => subscription.unsubscribe()
   }, [])
   ```

## Critical Thinking Prompts

### For the Next AI to Consider:

1. **Performance at scale**
   - How many tables before canvas slows?
   - WebGL for 100+ tables?
   - LOD (Level of Detail) system?

2. **Multi-floor support**
   - Floor switching UI?
   - Stairwell/elevator indicators?
   - Section management?

3. **Real-time coordination**
   - Show server locations?
   - Order status indicators?
   - Table cleaning status?

4. **Accessibility concerns**
   - Screen reader support for canvas?
   - Keyboard navigation?
   - High contrast mode?

5. **Mobile optimization**
   - Pinch to zoom?
   - Pan gestures?
   - Responsive scaling?

## Risks & Mitigations

### Risk 1: Canvas Accessibility
**Issue**: Canvas not accessible to screen readers
**Mitigation**: Provide table list alternative view, ARIA labels

### Risk 2: Performance on Low-End Devices
**Issue**: Animation lag on older tablets
**Mitigation**: Quality settings, disable animations option

### Risk 3: Touch Accuracy
**Issue**: Small tables hard to select on touch
**Mitigation**: Increase hit detection buffer on touch devices

## Integration Priority

**Priority: MEDIUM** - Nice visual enhancement

### Why Medium Priority:
1. Enhances server workflow significantly
2. Not critical for kitchen operations
3. Requires table data setup first
4. Visual appeal for front-of-house
5. Differentiator from competitors

## Alternative Approaches

### Option 1: SVG-Based Rendering
```typescript
// Use React components instead of canvas
<svg viewBox="0 0 800 600">
  {tables.map(table => (
    <TableShape 
      key={table.id}
      table={table}
      onClick={() => selectTable(table)}
    />
  ))}
</svg>
```

### Option 2: CSS Grid Layout
```typescript
// Simple grid-based approach
<div className="grid grid-cols-10 gap-2">
  {tables.map(table => (
    <TableCard 
      table={table}
      gridArea={`${table.row}/${table.col}`}
    />
  ))}
</div>
```

### Option 3: Third-Party Library
```typescript
// Use Konva.js or similar
import { Stage, Layer, Rect } from 'react-konva'
```

## Recommended Approach

1. Start with basic table data model
2. Implement simple canvas rendering
3. Add interaction handlers
4. Integrate with order system
5. Add real-time status updates
6. Optimize performance
7. Add accessibility features

## Questions for Implementation

1. **Table configuration source?**
   - Admin UI for setup?
   - Import from POS?
   - Manual JSON config?

2. **Multiple floor plans?**
   - Restaurant sections?
   - Indoor/outdoor?
   - Private rooms?

3. **Server assignment?**
   - Sections per server?
   - Visual indicators?
   - Shift management?

4. **Historical data?**
   - Heat maps of popular tables?
   - Turn time analytics?
   - Revenue by table?

5. **Integration with reservations?**
   - Show future bookings?
   - Block reserved tables?
   - Walk-in management?

## UI/UX Enhancements to Preserve

1. **Smooth Animations**: Canvas rendering for fluid experience
2. **Rotation Support**: Any angle table placement
3. **Seat Visualization**: See capacity at a glance
4. **Hover Effects**: Clear interactive feedback
5. **Touch Support**: Works on tablets

## Performance Optimizations

1. **Viewport culling**
   ```typescript
   // Only draw visible tables
   const visibleTables = tables.filter(table => 
     isInViewport(table, viewport)
   )
   ```

2. **Dirty rectangle optimization**
   ```typescript
   // Only redraw changed areas
   if (hoveredTable !== prevHoveredTable) {
     redrawTable(prevHoveredTable)
     redrawTable(hoveredTable)
   }
   ```

3. **Image caching for complex shapes**
   ```typescript
   // Pre-render complex tables
   const tableCache = new Map<string, ImageData>()
   ```

## Special Considerations

### Restaurant Types
- Fine dining: Detailed table info
- Fast casual: Simpler layout
- Bar/lounge: Mixed seating types

### Hardware Variations
- Server handhelds: Simplified view
- Host stand tablets: Full detail
- Kitchen displays: Table status only

### Operational Modes
- Rush hour: Status focus
- Quiet times: Cleaning status
- Special events: Section management

## Testing Considerations

1. **Interaction accuracy**: Hit detection precision
2. **Performance**: 50+ tables smooth
3. **Touch responsiveness**: No lag on tap
4. **Rotation math**: Correct at all angles
5. **Memory leaks**: Long-running stability

## Future Enhancements

1. **AR Table View**
   - Phone camera overlay
   - Find tables in space
   - Navigation assistance

2. **AI Layout Optimization**
   - Suggest table arrangements
   - Traffic flow analysis
   - Revenue optimization

3. **3D Visualization**
   - Isometric view option
   - Height for bar stools
   - Multi-level venues

## Conclusion

FloorPlanView brings spatial awareness to the restaurant management system. The canvas-based approach provides smooth, professional visualization while maintaining performance. The rotation support and touch optimization make it practical for real restaurant environments.

The key integration challenge is adapting the dark theme aesthetics to Macon's light brand while maintaining the visual clarity that makes the floor plan effective. The component's clean architecture makes it a good candidate for enhancement without requiring a complete rewrite.