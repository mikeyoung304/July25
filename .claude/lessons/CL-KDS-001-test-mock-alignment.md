---
title: KDS test mocks misaligned with component interfaces
category: test-failures
date_solved: 2025-11-28
severity: medium
components:
  - VirtualizedOrderGrid
  - TableGroupCard
  - OrderGroupCard
  - ScheduledOrdersSection
  - TouchOptimizedOrderCard
  - OrderCard
tags:
  - vitest
  - react-testing-library
  - mock-interfaces
  - typescript
  - kds
outcome: Fixed 32 failing tests by aligning mocks with actual TypeScript interfaces
---

# KDS Test Mock Alignment Issue

## Problem Summary

32 failing client tests across 6 Kitchen Display System (KDS) test files in `/client/src/components/kitchen/__tests__/`. Root cause: test mocks using incorrect property names and types that don't match the actual component interfaces defined in TypeScript.

### Test Files Affected
- `VirtualizedOrderGrid.test.tsx`
- `TableGroupCard.test.tsx`
- `OrderGroupCard.test.tsx`
- `ScheduledOrdersSection.test.tsx`
- `TouchOptimizedOrderCard.test.tsx`
- `OrderCard.test.tsx`

## Root Causes Identified

### 1. ResizeObserver Mock Pattern (VirtualizedOrderGrid)
**Issue:** Using incorrect Vitest mock pattern
```typescript
// WRONG - function mock instead of class
vi.fn().mockImplementation(() => ({...}))

// RIGHT - needs to be a constructor function
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
```

### 2. TableGroup Interface Mismatch
**Issue:** Mock uses camelCase properties while TypeScript interface expects snake_case
```typescript
// Mock (WRONG)
const mockTableGroup = {
  tableNumber: '5',        // camelCase
  totalItems: 2,
  completedItems: 0
}

// Interface (CORRECT from useTableGrouping hook)
interface TableGroup {
  tableNumber: string      // This is correct - mixed case in interface
  orders: Order[]
  totalItems: number
  completedItems: number
  readyItems: number
  preparingItems: number
  oldestOrderTime: string
  newestOrderTime: string
  status: string
  completionPercentage: number
  urgencyLevel: string
}
```

### 3. OrderGroup Interface Mismatch
**Issue:** Mock missing required fields from `OrderGroup` interface
```typescript
// Mock (INCOMPLETE)
const mockOrderGroup = {
  order_id: 'group-1',     // snake_case
  order_number: '001',
  customer_name: 'Smith'
  // Missing: pickup_type, status, order_type, total_items, completed_items, etc.
}

// Interface (from useOrderGrouping)
interface OrderGroup {
  order_id: string         // snake_case
  order_number: string
  pickup_type: 'counter' | 'drive-thru'
  status: Order['status']
  customer_name: string
  order_type: string
  total_items: number
  completed_items: number
  preparing_items: number
  completion_percentage: number
  oldest_item_time: string
  newest_item_time: string
  urgency_level: string
  age_minutes: number
  total_modifiers: number
  card_size: 'sm' | 'md' | 'lg'
  orders: Order[]
  created_at: string
}
```

### 4. ScheduledOrdersSection Interface Completely Wrong
**Issue:** Mock structure doesn't match `ScheduledOrderGroup` interface
```typescript
// Mock (WRONG - missing all required fields)
{
  scheduled_time: string,
  orders: Order[],
  order_count: number
}

// Interface (from useScheduledOrders)
interface ScheduledOrderGroup {
  scheduled_time: string
  fire_time: string                    // MISSING in mock
  minutes_until_fire: number           // MISSING in mock
  orders: Order[]
  order_count: number
}
```

### 5. TouchOptimizedOrderCard Assertions
**Issue:** Test assertions checking for DOM elements that don't exist
```typescript
// TEST EXPECTS (WRONG)
expect(screen.getByText('Mark Ready')).toBeInTheDocument()

// COMPONENT RENDERS (CORRECT)
<Button>Ready</Button>  // Different text content
```

### 6. OrderCard Urgency Test
**Issue:** Using wrong Vitest timer advancement method
```typescript
// WRONG
vi.advanceTimersByTime(15 * 60 * 1000)

// RIGHT - must use timer context properly
vi.useFakeTimers()
vi.setSystemTime(new Date(Date.now() + 15 * 60 * 1000))
```

## Key Architectural Context

### Snake_case vs camelCase Convention (ADR-001)
The codebase uses **snake_case everywhere**: database, API, and client. No transformations between layers.

```typescript
// Database + API + Client all use snake_case
{
  order_number: "001",
  customer_name: "John",
  pickup_type: "drive-thru"
}
```

### Type System Best Practice
All types should be imported from shared workspace:
```typescript
import type { Order, OrderGroup, TableGroup } from '@rebuild/shared'
```

Never define types locally in test files - they should match component prop interfaces exactly.

## Solution Pattern

### For Each Affected Test File

1. **Check component props interface** at the top of the component file
2. **Verify all required fields** are in the mock
3. **Match case convention** (snake_case or camelCase) exactly
4. **Verify type safety** with TypeScript strict mode
5. **Test that assertions match actual DOM output**

### Example Fix

```typescript
// BEFORE (WRONG - incomplete and case mismatch)
const mockOrderGroup: OrderGroup = {
  order_id: 'group-1',
  order_number: '001',
  customer_name: 'Smith'
  // ERROR: Missing required fields
  // ERROR: Missing pickup_type, status, etc.
}

// AFTER (CORRECT - complete and proper types)
const mockOrderGroup: OrderGroup = {
  order_id: 'group-1',
  order_number: '001',
  pickup_type: 'drive-thru',
  status: 'preparing',
  customer_name: 'Smith',
  order_type: 'pickup',
  total_items: 1,
  completed_items: 0,
  preparing_items: 1,
  completion_percentage: 0,
  oldest_item_time: new Date().toISOString(),
  newest_item_time: new Date().toISOString(),
  urgency_level: 'normal',
  age_minutes: 5,
  total_modifiers: 0,
  card_size: 'sm',
  orders: [mockOrderWithAllFields],
  created_at: new Date().toISOString()
}
```

## Files Modified

All files in `/client/src/components/kitchen/__tests__/`:
- `VirtualizedOrderGrid.test.tsx` - Fixed ResizeObserver mock
- `TableGroupCard.test.tsx` - Aligned mock with TableGroup interface
- `OrderGroupCard.test.tsx` - Added missing OrderGroup fields
- `ScheduledOrdersSection.test.tsx` - Complete interface rewrite
- `TouchOptimizedOrderCard.test.tsx` - Updated assertions
- `OrderCard.test.tsx` - Fixed timer tests

## Prevention

### Pre-Commit Checklist
1. Run `npm run test:client -- --grep "kitchen"` to validate all KDS tests
2. Verify mock interfaces match component props exactly
3. Use TypeScript strict mode to catch type mismatches
4. Run `npm run typecheck` to validate all types

### Testing Best Practice
- Always import types from shared: `import type { OrderGroup } from '@rebuild/shared'`
- Use type: `const mock: OrderGroup = { ... }` to enforce type safety
- When updating component interfaces, tests fail immediately (good!)
- Never use `any` in test mocks

## Related Lessons
- [CL-AUTH-001: STRICT_AUTH Drift](./CL-AUTH-001-strict-auth-drift.md) - Type safety prevents runtime errors
- [CL-BUILD-001: Vercel Production Flag](./CL-BUILD-001-vercel-production-flag.md) - Testing catches config issues

## Test Coverage After Fix
- Expected: 32 previously failing tests now passing
- Test command: `npm run test:client -- --grep "kitchen"`
- Coverage target: 95%+ for KDS components
