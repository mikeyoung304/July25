# Code Analysis Report

Generated: 2025-07-05T12:43:23.905Z

## Summary

- Total Components: 99
- Total Custom Hooks: 16
- Large Files (>200 lines): 15
- Complex Components (complexity >10): 30
- Files Missing Tests: 61

## Large Files

These files exceed 200 lines and might benefit from splitting:

- `/App.tsx` (522 lines, complexity: 15)
- `/components/shared/errors/__tests__/ErrorBoundary.test.tsx` (253 lines, complexity: 4)
- `/components/shared/filters/FilterPanel.tsx` (233 lines, complexity: 15)
- `/features/kds/__tests__/KDSOrderCard.test.tsx` (213 lines, complexity: 6)
- `/features/kiosk-voice-capture/services/orderIntegration.integration.test.tsx` (206 lines, complexity: 0)
- `/hooks/__tests__/useSoundNotifications.test.ts` (212 lines, complexity: 0)
- `/hooks/useKeyboardNavigation.ts` (268 lines, complexity: 55)
- `/pages/KioskDemo.tsx` (209 lines, complexity: 12)
- `/pages/PerformanceDashboard.tsx` (208 lines, complexity: 12)
- `/services/api.ts` (409 lines, complexity: 51)
- `/services/performance/performanceMonitor.ts` (272 lines, complexity: 9)
- `/services/secureApi.ts` (240 lines, complexity: 30)
- `/utils/__tests__/validation.test.ts` (286 lines, complexity: 0)
- `/utils/security.ts` (244 lines, complexity: 8)
- `/utils/validation.ts` (267 lines, complexity: 27)

## Complex Components

These components have high cyclomatic complexity:

- `/App.tsx` (complexity: 15)
  - Components: KitchenDisplay, Navigation, HomePage, App, AppContent
  - Hooks: 

- `/components/shared/accessibility/AccessibleButton.tsx` (complexity: 11)
  - Components: AccessibleButton
  - Hooks: 

- `/components/shared/accessibility/AccessibleToast.tsx` (complexity: 16)
  - Components: 
  - Hooks: 

- `/components/shared/badges/AnimatedStatusBadge.tsx` (complexity: 11)
  - Components: AnimatedStatusBadge
  - Hooks: 

- `/components/shared/buttons/StatusActionButton.tsx` (complexity: 12)
  - Components: BUTTON_CONFIG, StatusActionButton, Icon
  - Hooks: 

- `/components/shared/debug/PerformanceOverlay.tsx` (complexity: 15)
  - Components: PerformanceOverlay
  - Hooks: 

- `/components/shared/errors/ErrorBoundary.tsx` (complexity: 17)
  - Components: WrappedComponent
  - Hooks: 

- `/components/shared/filters/FilterPanel.tsx` (complexity: 15)
  - Components: FilterPanel
  - Hooks: 

- `/components/shared/order/OrderActions.tsx` (complexity: 16)
  - Components: OrderActions
  - Hooks: 

- `/components/ui/dropdown-menu.tsx` (complexity: 17)
  - Components: DropdownMenuContext, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
  - Hooks: 

- `/components/ui/popover.tsx` (complexity: 15)
  - Components: PopoverContext, Popover, PopoverTrigger, PopoverContent
  - Hooks: 

- `/core/supabase.ts` (complexity: 11)
  - Components: 
  - Hooks: 

- `/features/kds/AnimatedKDSOrderCard.tsx` (complexity: 13)
  - Components: AnimatedKDSOrderCard
  - Hooks: 

- `/features/kiosk-voice-capture/hooks/useAudioCapture.ts` (complexity: 12)
  - Components: 
  - Hooks: useAudioCapture

- `/features/kiosk-voice-capture/services/orderIntegration.ts` (complexity: 31)
  - Components: 
  - Hooks: 

- `/hooks/useErrorHandler.ts` (complexity: 38)
  - Components: 
  - Hooks: useErrorHandler

- `/hooks/useFocusManagement.ts` (complexity: 33)
  - Components: 
  - Hooks: useFocusManagement

- `/hooks/useGlobalKeyboardShortcuts.tsx` (complexity: 23)
  - Components: 
  - Hooks: useGlobalKeyboardShortcuts

- `/hooks/useKeyboardNavigation.ts` (complexity: 55)
  - Components: 
  - Hooks: useKeyboardNavigation, useFocusTrap, useAriaLive

- `/hooks/useOrderFilters.ts` (complexity: 11)
  - Components: STORAGE_KEY
  - Hooks: useOrderFilters

- `/hooks/useOrderSubscription.ts` (complexity: 11)
  - Components: 
  - Hooks: useOrderSubscription

- `/pages/KioskDemo.tsx` (complexity: 12)
  - Components: KioskDemo
  - Hooks: 

- `/pages/PerformanceDashboard.tsx` (complexity: 12)
  - Components: PerformanceDashboard
  - Hooks: 

- `/services/api.ts` (complexity: 51)
  - Components: 
  - Hooks: 

- `/services/audio/soundEffects.ts` (complexity: 13)
  - Components: 
  - Hooks: 

- `/services/realtime/orderSubscription.ts` (complexity: 12)
  - Components: 
  - Hooks: 

- `/services/secureApi.ts` (complexity: 30)
  - Components: 
  - Hooks: 

- `/services/stationRouting.ts` (complexity: 16)
  - Components: 
  - Hooks: 

- `/types/filters.ts` (complexity: 27)
  - Components: 
  - Hooks: 

- `/utils/validation.ts` (complexity: 27)
  - Components: HTML_ENTITIES
  - Hooks: 

## Duplicate Patterns

Common patterns found across multiple files:

### Pattern: `/className\s*=\s*{cn\(/g`
Found in 44 files:
- `/components/animations/FadeInScale.tsx` (1 occurrences)
- `/components/shared/accessibility/AccessibleButton.tsx` (1 occurrences)
- `/components/shared/accessibility/AccessibleCard.tsx` (1 occurrences)
- `/components/shared/alerts/AlertNote.tsx` (1 occurrences)
- `/components/shared/badges/AnimatedStatusBadge.tsx` (1 occurrences)
- `/components/shared/badges/StatusBadge.tsx` (1 occurrences)
- `/components/shared/buttons/StatusActionButton.tsx` (1 occurrences)
- `/components/shared/controls/SoundControl.tsx` (1 occurrences)
- `/components/shared/debug/PerformanceOverlay.tsx` (4 occurrences)
- `/components/shared/filters/FilterPanel.tsx` (3 occurrences)
- `/components/shared/filters/SortControl.tsx` (2 occurrences)
- `/components/shared/inputs/DateRangePicker.tsx` (1 occurrences)
- `/components/shared/labels/TableLabel.tsx` (1 occurrences)
- `/components/shared/lists/ItemQuantityName.tsx` (1 occurrences)
- `/components/shared/lists/ModifierList.tsx` (1 occurrences)
- `/components/shared/lists/OrderItemRow.tsx` (1 occurrences)
- `/components/shared/order/AnimatedOrderHeader.tsx` (1 occurrences)
- `/components/shared/order/OrderActions.tsx` (1 occurrences)
- `/components/shared/order/OrderHeader.tsx` (1 occurrences)
- `/components/shared/order/OrderItemsList.tsx` (1 occurrences)
- `/components/shared/order/OrderMetadata.tsx` (1 occurrences)
- `/components/shared/timers/ElapsedTimer.tsx` (1 occurrences)
- `/components/shared/typography/OrderNumber.tsx` (1 occurrences)
- `/components/ui/alert.tsx` (3 occurrences)
- `/components/ui/badge.tsx` (1 occurrences)
- `/components/ui/button.tsx` (1 occurrences)
- `/components/ui/card.tsx` (6 occurrences)
- `/components/ui/dropdown-menu.tsx` (2 occurrences)
- `/components/ui/input.tsx` (1 occurrences)
- `/components/ui/label.tsx` (1 occurrences)
- `/components/ui/popover.tsx` (1 occurrences)
- `/components/ui/slider.tsx` (2 occurrences)
- `/features/kds/AnimatedKDSOrderCard.tsx` (3 occurrences)
- `/features/kds/KDSOrderCard.tsx` (1 occurrences)
- `/features/kds/KDSOrderListItem.tsx` (1 occurrences)
- `/features/kds/components/KDSLayout.tsx` (1 occurrences)
- `/features/kiosk-voice-capture/components/KioskVoiceCapture.tsx` (1 occurrences)
- `/features/kiosk-voice-capture/components/RecordingIndicator.tsx` (1 occurrences)
- `/features/kiosk-voice-capture/components/TranscriptionDisplay.tsx` (1 occurrences)
- `/features/kiosk-voice-capture/components/VoiceCapture.tsx` (1 occurrences)
- `/features/performance/components/APIMetricsTable.tsx` (3 occurrences)
- `/features/performance/components/ComponentMetricsTable.tsx` (2 occurrences)
- `/pages/OrderHistory.tsx` (1 occurrences)
- `/pages/PerformanceDashboard.tsx` (3 occurrences)

### Pattern: `/const\s+\[error,\s*setError\]\s*=\s*useState/g`
Found in 3 files:
- `/core/RestaurantContext.tsx` (1 occurrences)
- `/features/kiosk-voice-capture/hooks/useAudioCapture.ts` (1 occurrences)
- `/hooks/useOrderHistory.ts` (1 occurrences)

## Missing Tests

Components/hooks without test files:

- `/App.tsx`
- `/components/animations/FadeInScale.tsx`
- `/components/shared/accessibility/AccessibleButton.tsx`
- `/components/shared/accessibility/AccessibleCard.tsx`
- `/components/shared/accessibility/SkipNavigation.tsx`
- `/components/shared/alerts/AlertNote.tsx`
- `/components/shared/buttons/StatusActionButton.tsx`
- `/components/shared/debug/PerformanceOverlay.tsx`
- `/components/shared/errors/ErrorBoundary.tsx`
- `/components/shared/errors/__tests__/ErrorBoundary.test.tsx`
- `/components/shared/filters/SortControl.tsx`
- `/components/shared/inputs/DateRangePicker.tsx`
- `/components/shared/lists/ItemQuantityName.tsx`
- `/components/shared/lists/ModifierList.tsx`
- `/components/shared/lists/OrderItemRow.tsx`
- `/components/shared/order/AnimatedOrderHeader.tsx`
- `/components/shared/order/OrderActions.tsx`
- `/components/shared/order/OrderHeader.tsx`
- `/components/shared/order/OrderItemsList.tsx`
- `/components/shared/order/OrderMetadata.tsx`
- `/components/ui/alert.tsx`
- `/components/ui/badge.tsx`
- `/components/ui/button.tsx`
- `/components/ui/card.tsx`
- `/components/ui/dropdown-menu.tsx`
- `/components/ui/input.tsx`
- `/components/ui/label.tsx`
- `/components/ui/popover.tsx`
- `/components/ui/slider.tsx`
- `/core/RestaurantContext.tsx`
- `/features/history/components/OrderHistoryTable.tsx`
- `/features/history/components/OrderStatisticsCards.tsx`
- `/features/kds/AnimatedKDSOrderCard.tsx`
- `/features/kds/KDSOrderListItem.tsx`
- `/features/kds/__tests__/KDSOrderCard.test.tsx`
- `/features/kds/components/KDSLayout.tsx`
- `/features/kds/components/StationFilter.tsx`
- `/features/kiosk-voice-capture/components/OrderSuccessAnimation.tsx`
- `/features/kiosk-voice-capture/hooks/useAudioCapture.ts`
- `/features/kiosk-voice-capture/hooks/useKioskVoiceCapture.ts`
- `/features/performance/components/APIMetricsTable.tsx`
- `/features/performance/components/ComponentMetricsTable.tsx`
- `/features/performance/components/PerformanceChart.tsx`
- `/hooks/useErrorHandler.ts`
- `/hooks/useFocusManagement.ts`
- `/hooks/useGlobalKeyboardShortcuts.tsx`
- `/hooks/useKeyboardNavigation.ts`
- `/hooks/useOrderFilters.ts`
- `/hooks/useOrderHistory.ts`
- `/hooks/useOrderSubscription.ts`
- `/hooks/usePerformanceMonitor.ts`
- `/hooks/useSoundNotifications.ts`
- `/hooks/useToast.ts`
- `/lib/animations.ts`
- `/pages/KioskDemo.tsx`
- `/pages/OrderHistory.tsx`
- `/pages/PerformanceDashboard.tsx`
- `/types/order.ts`
- `/types/station.ts`
- `/utils/security.ts`
- `/utils/validation.ts`

## Refactoring Recommendations

### 1. Extract Common Patterns
Based on duplicate patterns, consider creating:
- `useLoadingState` hook for loading/error state management
- `AsyncButton` component for buttons with loading states
- `withErrorBoundary` HOC usage in more components

### 2. Split Large Files
Consider breaking down:
- `/App.tsx` into smaller, focused components
- `/components/shared/errors/__tests__/ErrorBoundary.test.tsx` into smaller, focused components
- `/components/shared/filters/FilterPanel.tsx` into smaller, focused components

### 3. Reduce Complexity
Simplify complex components by:
- Extracting logic into custom hooks
- Breaking down into smaller components
- Using composition patterns

### 4. Improve Test Coverage
Priority files for testing:
- `/App.tsx`
- `/components/animations/FadeInScale.tsx`
- `/components/shared/accessibility/AccessibleButton.tsx`
- `/components/shared/accessibility/AccessibleCard.tsx`
- `/components/shared/accessibility/SkipNavigation.tsx`

## Module Opportunities

Based on the analysis, these features could become independent modules:
- Order Management (14 components)
- Filtering System (2 components)
- Sound System (standalone feature)
- Performance Monitoring (standalone feature)
