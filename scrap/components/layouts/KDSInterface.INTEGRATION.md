# KDSInterface Integration Guide

## Component Overview

KDSInterface is the master layout controller for the Kitchen Display System that provides:
- Three layout modes: single station, multi-station, and split view
- Fullscreen mode support
- Dynamic station selection
- Split view configuration (up to 4 stations)
- Session validation and navigation

## Current State Analysis (rebuild-6.0)

### What Exists
- **Simple KDS Layout**: Basic grid/list toggle in KDSLayout.tsx
- **Station Types**: Defined but not used for view selection
- **Order Display**: Generic for all stations
- **No Layout Modes**: Single view only

### What's Missing
- Multi-view layout capabilities
- Split screen functionality
- Fullscreen mode
- Dynamic station selection UI
- Layout persistence

## Enhancement Opportunity

The KDSInterface component from plate-clean-test provides:

1. **Layout Flexibility**
   - Single station focus mode
   - Multi-station overview
   - Split view for up to 4 stations
   - Responsive grid layouts

2. **Fullscreen Support**
   - Full browser fullscreen API
   - Hidden controls in fullscreen
   - Floating exit button
   - Keyboard shortcut support

3. **Station Management**
   - Visual station selector with colors
   - Dynamic split view configuration
   - Station-specific headers
   - Active station indicators

4. **Professional UI**
   - Clean header with navigation
   - Settings and metrics links
   - Descriptive layout labels
   - Error boundaries

## Integration Strategy

### Step 1: Create Layout Mode System

```typescript
// src/modules/kitchen/types/layout.ts
export type LayoutMode = 'single' | 'multi' | 'split' | 'station-specific'

export interface LayoutConfig {
  mode: LayoutMode
  selectedStation?: string
  splitStations?: string[]
  isFullscreen?: boolean
}

// src/modules/kitchen/hooks/useLayoutConfig.ts
export function useLayoutConfig() {
  const [config, setConfig] = useLocalStorage<LayoutConfig>('kds-layout', {
    mode: 'multi',
    splitStations: []
  })
  
  return {
    config,
    setMode: (mode: LayoutMode) => setConfig({...config, mode}),
    toggleFullscreen: () => setConfig({...config, isFullscreen: !config.isFullscreen})
  }
}
```

### Step 2: Adapt to Rebuild Architecture

```typescript
// Use existing station types
import { StationType, STATION_CONFIGS } from '@/types/station'

// Map to visual configuration
const getStationColor = (type: StationType): string => {
  const colorMap = {
    grill: '#ef4444',     // red
    fryer: '#f59e0b',     // yellow
    salad: '#10b981',     // green
    bar: '#8b5cf6',       // purple
    expo: '#6366f1',      // indigo
    dessert: '#ec4899',   // pink
    prep: '#06b6d4'       // cyan
  }
  return colorMap[type] || '#6b7280'
}
```

### Step 3: Integrate with Service Layer

```typescript
// No direct Supabase calls - use service layer
const supabase = createClient() // Remove this
const { data: { session } } = await supabase.auth.getSession() // Remove this

// Replace with
const { session } = useAuth() // From RestaurantContext
const { stations } = useStations() // Custom hook using service layer
```

### Step 4: Apply Macon Brand

```typescript
// Original dark theme
className='bg-gray-100 dark:bg-gray-900'
className='bg-white dark:bg-gray-800'

// Adapted for Macon
className='bg-gray-50' // Lighter background
className='bg-white border-gray-200' // Clean borders
className='text-macon-navy' // Brand colors
```

## Code Adaptation Guide

### Key Changes Needed

1. **Remove Next.js specifics**
   ```diff
   - 'use client'
   - import Link from 'next/link'
   - import { createClient } from '@/lib/supabase/client'
   
   + import { Link } from 'react-router-dom'
   + import { useAuth } from '@/core/contexts/RestaurantContext'
   ```

2. **Update navigation**
   ```diff
   - <Link href='/dashboard'>
   + <Link to='/'>
   
   - <Link href='/admin'>
   + <Link to='/settings'>
   ```

3. **Use existing types**
   ```diff
   - import type { KDSStation } from '@/lib/modassembly/supabase/database/kds'
   + import type { StationType } from '@/types/station'
   ```

4. **Simplify station structure**
   ```diff
   - initialStations: KDSStation[]
   + stationTypes: StationType[]
   ```

## Critical Thinking Prompts

### For the Next AI to Consider:

1. **Layout persistence strategy**
   - Local storage vs user preferences?
   - Per-restaurant layout configs?
   - Default layouts by kitchen size?

2. **Performance with split views**
   - 4 real-time subscriptions?
   - Render optimization needed?
   - Virtualization for each view?

3. **Fullscreen behavior**
   - Auto-fullscreen on load?
   - Timeout to fullscreen?
   - Touch gesture support?

4. **Station color customization**
   - User-defined colors?
   - Accessibility contrast?
   - Color-blind modes?

5. **Mobile/tablet adaptation**
   - Which layouts work on tablets?
   - Touch-optimized controls?
   - Landscape lock?

## Risks & Mitigations

### Risk 1: Performance Degradation
**Issue**: Multiple views strain real-time updates
**Mitigation**: Throttle updates per view, prioritize active station

### Risk 2: UI Complexity
**Issue**: Too many options confuse users
**Mitigation**: Smart defaults, guided setup, training mode

### Risk 3: Screen Real Estate
**Issue**: Split view cramped on smaller screens
**Mitigation**: Responsive limits, auto-layout adjustment

## Integration Priority

**Priority: HIGH** - Core UX enhancement

### Why High Priority:
1. Massive workflow improvement
2. Addresses different kitchen layouts
3. Scales from small to large operations
4. Professional appearance
5. Foundation for station-specific features

## Alternative Approaches

### Option 1: Preset Layouts
```typescript
const LAYOUT_PRESETS = {
  'small-kitchen': { mode: 'multi' },
  'large-kitchen': { mode: 'split', stations: ['grill', 'fryer', 'salad', 'expo'] },
  'bar-focused': { mode: 'split', stations: ['bar', 'expo'] },
  'single-station': { mode: 'single' }
}
```

### Option 2: Auto-Layout
```typescript
function getOptimalLayout(orderVolume: number, stationCount: number) {
  if (stationCount <= 2) return 'multi'
  if (orderVolume > 50) return 'split'
  return 'single'
}
```

### Option 3: Role-Based Layouts
```typescript
const ROLE_LAYOUTS = {
  'executive-chef': 'multi',    // See everything
  'station-chef': 'single',     // Focus on their station
  'expo': 'split',              // See key stations
  'manager': 'multi'            // Overview mode
}
```

## Recommended Approach

1. Implement basic layout modes first
2. Add fullscreen support
3. Create station selector UI
4. Add split view configuration
5. Implement layout persistence
6. Add keyboard shortcuts
7. Optimize performance

## Questions for Implementation

1. **Default layout by role?**
   - Chef vs line cook needs

2. **Layout switching shortcuts?**
   - Keyboard commands for quick switching

3. **Auto-layout rules?**
   - Based on order volume or time of day

4. **Saved layout profiles?**
   - Breakfast vs dinner layouts

5. **Permission controls?**
   - Who can change layouts?

## UI/UX Enhancements to Preserve

1. **Visual Station Indicators**: Color dots for quick recognition
2. **Layout Mode Selector**: Clear dropdown with descriptions
3. **Split View Builder**: Interactive station selection
4. **Fullscreen Mode**: Distraction-free operation
5. **Responsive Grids**: Automatic layout adjustment

## Performance Optimizations

1. **Lazy load inactive views**
   ```typescript
   const StationView = lazy(() => 
     import(`./stations/${stationType}Station`)
   )
   ```

2. **Memoize layout calculations**
   ```typescript
   const gridClasses = useMemo(() => 
     getSplitLayoutClasses(splitStations.length),
     [splitStations.length]
   )
   ```

3. **Debounce layout changes**
   - Prevent rapid switching
   - Smooth transitions

## Special Considerations

### Kitchen Configurations
- Small: 1-2 stations (single/multi)
- Medium: 3-4 stations (multi/split)
- Large: 5+ stations (split essential)

### Display Hardware
- Touch screens need larger targets
- TV displays need high contrast
- Tablets need simplified layouts

### Operational Modes
- Rush: Focus on speed (single station)
- Normal: Balance (split view)
- Training: See everything (multi)

## Testing Considerations

1. **Layout switching**: Smooth transitions
2. **Fullscreen API**: Browser compatibility
3. **Station selection**: State persistence
4. **Performance**: Multiple active views
5. **Responsive**: Various screen sizes

## Future Enhancements

1. **AI-Optimized Layouts**
   - Learn optimal layouts by time
   - Suggest based on order patterns
   - Auto-adjust during rush

2. **Custom Layout Builder**
   - Drag-drop station arrangement
   - Save named layouts
   - Share across locations

3. **Advanced Fullscreen**
   - Picture-in-picture support
   - Multi-monitor spanning
   - Kiosk mode lockdown

## Conclusion

KDSInterface transforms the kitchen display from a simple list to a powerful, flexible command center. The multi-view capabilities address the reality that different roles need different views, while the fullscreen mode provides the distraction-free environment crucial during service.

The component's clean design and intuitive controls make it accessible to all skill levels while providing power users with advanced configuration options. This is a foundational enhancement that enables all other station-specific improvements.