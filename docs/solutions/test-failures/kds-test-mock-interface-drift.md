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

# KDS Test Mock Interface Drift

**Last Updated:** 2025-11-28

## Problem Statement

32 client tests were failing across 6 Kitchen Display System (KDS) components. The root cause was test mocks that had drifted from their actual TypeScript interface definitions over time.

### Symptoms

- `ResizeObserver.observe is not a function` errors
- `Unable to find element with text` test failures
- TypeScript type mismatches between mocks and interfaces
- Tests expecting camelCase fields when interface uses snake_case (or vice versa)

### Components Affected

| Component | Issue Type | Tests Failing |
|-----------|-----------|---------------|
| VirtualizedOrderGrid | ResizeObserver mock pattern | 25+ |
| TableGroupCard | Interface field mismatch | 1 |
| OrderGroupCard | Missing required fields | 7 |
| ScheduledOrdersSection | Wrong interface structure | 7+ |
| TouchOptimizedOrderCard | Assertion text mismatch | 2 |
| OrderCard | Timer test method incorrect | 1 |

## Root Cause

Test mocks were written for older versions of TypeScript interfaces and never updated when component interfaces evolved. This is a common drift pattern in rapidly evolving codebases.

**Specific causes:**

1. **ResizeObserver mock** used `vi.fn().mockImplementation()` which doesn't properly simulate a constructor
2. **TableGroupCard mock** used wrong property names (interface had been refactored)
3. **OrderGroupCard mock** was missing 10+ required fields from `OrderGroup` interface
4. **ScheduledOrdersSection mock** was completely wrong structure
5. **Test assertions** checked for old button text that had been changed
6. **Timer tests** used wrong Vitest API for time advancement

## Solution

### 1. ResizeObserver Mock Fix (`client/test/setup.ts`)

```typescript
// BEFORE (broken)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// AFTER (working)
class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
```

**Why:** Browser APIs that are instantiated with `new` require class-based mocks, not function mocks.

### 2. TableGroupCard Mock Fix

```typescript
// Updated mock to match TableGroup interface from useTableGrouping.ts
const mockTableGroup: TableGroup = {
  tableNumber: '5',           // camelCase, not snake_case
  orders: [...],
  totalItems: 2,
  completedItems: 0,
  readyItems: 0,
  preparingItems: 1,
  oldestOrderTime: new Date().toISOString(),
  newestOrderTime: new Date().toISOString(),
  status: 'in-progress',
  completionPercentage: 0,
  urgencyLevel: 'normal'
}
```

### 3. OrderGroupCard Mock Fix

```typescript
// Added all required fields from OrderGroup interface
const mockOrderGroup: OrderGroup = {
  order_id: 'group-1',
  order_number: '001',
  pickup_type: 'drive-thru',
  status: 'preparing',        // Must be valid status for button to show
  customer_name: 'Smith',
  order_type: 'pickup',
  total_items: 1,
  completed_items: 0,
  preparing_items: 1,
  completion_percentage: 0,
  oldest_item_time: '2024-01-01T12:00:00Z',
  newest_item_time: '2024-01-01T12:00:00Z',
  urgency_level: 'normal',
  age_minutes: 5,
  total_modifiers: 0,
  card_size: 'sm',
  orders: [/* full Order objects */],
  created_at: '2024-01-01T12:00:00Z'
}
```

### 4. ScheduledOrdersSection Mock Fix

```typescript
// Rewrote helper to match ScheduledOrderGroup interface
const createMockScheduledGroup = (
  minutesUntilFire: number,
  orderCount: number = 1
): ScheduledOrderGroup => {
  const scheduledTime = new Date(
    Date.now() + minutesUntilFire * 60 * 1000
  ).toISOString()
  return {
    scheduled_time: scheduledTime,
    fire_time: scheduledTime,
    minutes_until_fire: minutesUntilFire,
    orders: Array.from({ length: orderCount }, (_, i) => createMockOrder(`order-${i}`)),
    order_count: orderCount
  }
}
```

### 5. TouchOptimizedOrderCard Assertions

```typescript
// BEFORE - wrong button text and item format
expect(screen.getByText('1x Burger')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /Mark Ready/ }))

// AFTER - matches actual component output
expect(screen.getByText('1')).toBeInTheDocument()
expect(screen.getByText('Burger')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /Complete Order/ }))
```

### 6. OrderCard Urgency Test

```typescript
// BEFORE - advanceTimersByTime doesn't affect Date.now()
vi.advanceTimersByTime(5 * 60 * 1000)
rerender(<OrderCard {...defaultProps} />)
expect(screen.getByText(/5m/)).toBeInTheDocument() // FAILS

// AFTER - setSystemTime actually changes Date.now()
vi.setSystemTime(new Date('2024-01-01T12:05:00'))
render(<OrderCard {...defaultProps} />)
expect(screen.getByText(/5m/)).toBeInTheDocument() // PASSES
```

## Results

| Metric | Before | After |
|--------|--------|-------|
| Client Tests Passing | 873/905 | 905/905 |
| Pass Rate | 96.5% | 100% |
| Failing KDS Tests | 32 | 0 |

## Prevention Strategies

### 1. TypeScript Strict Mode in Tests

Ensure test files have proper type checking:

```typescript
// Always type your mocks explicitly
const mockOrder: Order = { /* fields */ }  // Catches missing fields at compile time
```

### 2. Centralized Mock Factories

Create shared mock factories in `tests/factories/`:

```typescript
// tests/factories/orderFactory.ts
export const createMockOrder = (overrides?: Partial<Order>): Order => ({
  id: 'order-1',
  restaurant_id: 'rest-1',
  // ... all required fields
  ...overrides
})
```

### 3. Class-Based Mocks for Browser APIs

Always use class pattern for APIs instantiated with `new`:

```typescript
// ResizeObserver, IntersectionObserver, MutationObserver, etc.
class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe = vi.fn()
  // ...
}
```

### 4. Time Testing Pattern

- Use `vi.setSystemTime()` for static time assertions (elapsed time calculations)
- Use `vi.advanceTimersByTime()` only for timer-based logic (setTimeout, setInterval)

### 5. Periodic Mock Audit

When updating interfaces, search for test mocks:

```bash
# Find tests that use a specific type
grep -r "mockOrder\|createMockOrder" client/src --include="*.test.tsx"
```

## Related Documentation

- [Parallel Agent P2/P3 Backlog Resolution](../process-issues/parallel-agent-p2-p3-backlog-resolution.md) - Related backlog resolution pattern
- [CL-TEST-001](./.claude/lessons/CL-TEST-001-ci-test-fixes.md) - CI test coordination patterns
- [Test Debugging Guide](/.github/TEST_DEBUGGING.md) - E2E debugging reference

## Interface Reference

### OrderGroup (`client/src/hooks/useOrderGrouping.ts`)

```typescript
export interface OrderGroup {
  order_id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  order_type: 'online' | 'pickup' | 'delivery'
  pickup_type: 'drive-thru' | 'counter' | 'curbside' | 'delivery'
  orders: Order[]
  total_items: number
  completed_items: number
  preparing_items: number
  status: OrderStatus
  completion_percentage: number
  created_at: string
  oldest_item_time: string
  newest_item_time: string
  urgency_level: 'normal' | 'warning' | 'urgent'
  age_minutes: number
  total_modifiers: number
  card_size: CardSize
  // ... optional fields
}
```

### ScheduledOrderGroup (`client/src/hooks/useScheduledOrders.ts`)

```typescript
export interface ScheduledOrderGroup {
  scheduled_time: string
  fire_time: string
  minutes_until_fire: number
  orders: Order[]
  order_count: number
}
```

### TableGroup (`client/src/hooks/useTableGrouping.ts`)

```typescript
export interface TableGroup {
  tableNumber: string
  orders: Order[]
  totalItems: number
  completedItems: number
  readyItems: number
  preparingItems: number
  oldestOrderTime: string
  newestOrderTime: string
  status: 'pending' | 'in-progress' | 'partially-ready' | 'ready' | 'completed'
  completionPercentage: number
  urgencyLevel: 'normal' | 'warning' | 'urgent'
  // ... optional fields
}
```

## Commits

- `ab3a251c` - fix(tests): align kds test mocks with component interfaces

## Key Learnings

1. **Mock drift is silent** - Tests pass until interfaces change, then fail mysteriously
2. **Browser API mocks need classes** - `vi.fn().mockImplementation()` doesn't work for constructors
3. **Type annotations catch drift** - Explicitly typed mocks fail at compile time when interfaces change
4. **Time testing has two patterns** - `setSystemTime` for calculations, `advanceTimersByTime` for timers
5. **Centralized factories prevent drift** - Single source of truth for mock shapes
