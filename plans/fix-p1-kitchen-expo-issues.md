# Plan: Fix P1 Kitchen/Expo Tab Issues

**Context:** Kitchen and Expo stations were consolidated into a single page with tab navigation. Code review identified 4 critical issues that must be fixed before merge.

**Reference Todos:**
- `todos/129-pending-p1-elapsed-time-never-updates.md`
- `todos/130-pending-p1-dead-code-expopage.md`
- `todos/131-pending-p1-missing-aria-tabs.md`
- `todos/132-pending-p1-console-error-logging.md`

---

## Issue 1: Elapsed Time Never Updates (TODO-129)

**Problem:** `ReadyOrderCard` in `ExpoTabContent.tsx` calculates elapsed time once at mount and never updates. Orders show stale wait times.

**File:** `client/src/components/kitchen/ExpoTabContent.tsx`

**Fix:**
1. Add state for current time with interval updates
2. Replace the frozen `useMemo` pattern

```typescript
// At top of ReadyOrderCard component (around line 21)
// ADD: State that updates every minute
const [now, setNow] = useState(Date.now())

useEffect(() => {
  const interval = setInterval(() => setNow(Date.now()), 60000)
  return () => clearInterval(interval)
}, [])

// REPLACE lines 22-36 with:
const { elapsedMinutes, urgencyColor, cardColor } = useMemo(() => {
  const created = new Date(order.created_at).getTime()
  const elapsed = Math.floor((now - created) / 60000)

  let color = 'text-green-600'
  let bg = 'bg-green-50 border-green-300'

  if (elapsed >= 20) {
    color = 'text-red-600'
    bg = 'bg-red-50 border-red-300'
  }

  return { elapsedMinutes: elapsed, urgencyColor: color, cardColor: bg }
}, [order.created_at, now])  // now is a dependency
```

**Also add import:**
```typescript
import React, { useMemo, useState, useEffect } from 'react'
```

---

## Issue 2: Dead Code ExpoPage.tsx (TODO-130)

**Problem:** `ExpoPage.tsx` (289 lines) is orphaned - route redirects to `/kitchen` but file still exists with duplicate `ReadyOrderCard`.

**Files to modify:**

### Step 1: Remove LazyRoutes export
**File:** `client/src/routes/LazyRoutes.tsx`

Delete lines 34-36:
```typescript
// DELETE these lines:
ExpoPage: lazy(() =>
  import(/* webpackChunkName: "expo" */ '@/pages/ExpoPage')
),
```

### Step 2: Delete the orphaned file
```bash
rm client/src/pages/ExpoPage.tsx
```

### Step 3: Verify no remaining imports
```bash
grep -r "ExpoPage" client/src/ --include="*.tsx" --include="*.ts"
```

Should only show the LazyRoutes deletion and maybe test files.

---

## Issue 3: Missing ARIA Tabs (TODO-131)

**Problem:** Station tabs lack ARIA attributes for screen reader accessibility.

**File:** `client/src/pages/KitchenDisplayOptimized.tsx`

**Find and replace the Station Tabs section (around lines 178-203):**

```typescript
{/* Station Tabs */}
<div
  className="flex bg-gray-100 rounded-lg p-1"
  role="tablist"
  aria-label="Station selection"
>
  <Button
    variant={stationTab === 'kitchen' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setStationTab('kitchen')}
    className="gap-1"
    role="tab"
    aria-selected={stationTab === 'kitchen'}
    aria-controls="kitchen-panel"
    id="kitchen-tab"
  >
    <ChefHat className="w-4 h-4" aria-hidden="true" />
    Kitchen
  </Button>
  <Button
    variant={stationTab === 'expo' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setStationTab('expo')}
    className="gap-1"
    role="tab"
    aria-selected={stationTab === 'expo'}
    aria-controls="expo-panel"
    id="expo-tab"
  >
    <Send className="w-4 h-4" aria-hidden="true" />
    Expo
    {stats.ready > 0 && (
      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full" aria-label={`${stats.ready} orders ready`}>
        {stats.ready}
      </span>
    )}
  </Button>
</div>
```

**Also add panel attributes to the content areas (around line 227):**

```typescript
{stationTab === 'kitchen' ? (
  <div role="tabpanel" id="kitchen-panel" aria-labelledby="kitchen-tab">
    {/* existing Kitchen content */}
  </div>
) : (
  <div role="tabpanel" id="expo-panel" aria-labelledby="expo-tab">
    <ExpoTabContent
      activeOrders={activeOrders}
      readyOrders={readyOrders}
      onStatusChange={handleStatusChange}
    />
  </div>
)}
```

---

## Issue 4: console.error Violations (TODO-132)

**Problem:** Direct `console.error` calls violate logging standards.

**File:** `client/src/pages/KitchenDisplayOptimized.tsx`

### Step 1: Add logger import (near top of file)
```typescript
import { logger } from '@/services/logger'
```

### Step 2: Replace console.error calls

**Line ~69:** Replace:
```typescript
console.error('Failed to update order status:', orderId)
```
With:
```typescript
logger.error('Failed to update order status', { orderId, status })
```

**Line ~92:** Replace:
```typescript
console.error('Failed to manually fire order:', orderId)
```
With:
```typescript
logger.error('Failed to manually fire order', { orderId })
```

---

## Verification Steps

After making all changes:

```bash
# 1. Type check
npm run typecheck:quick

# 2. Run tests
npm run test:client -- --run

# 3. Verify no console.error in kitchen files
grep -r "console.error" client/src/pages/Kitchen* client/src/components/kitchen/*

# 4. Verify ExpoPage is gone
ls client/src/pages/ExpoPage.tsx  # Should error "No such file"

# 5. Start dev server and test manually
npm run dev
# Navigate to /kitchen, switch tabs, verify timer updates
```

---

## Summary Checklist

- [ ] TODO-129: Add interval to update elapsed time in ReadyOrderCard
- [ ] TODO-130: Delete ExpoPage.tsx and remove LazyRoutes export
- [ ] TODO-131: Add ARIA attributes to station tabs and panels
- [ ] TODO-132: Replace console.error with logger.error

After completing, mark todos as complete:
```bash
# Rename files from pending to complete
mv todos/129-pending-p1-elapsed-time-never-updates.md todos/129-complete-p1-elapsed-time-never-updates.md
mv todos/130-pending-p1-dead-code-expopage.md todos/130-complete-p1-dead-code-expopage.md
mv todos/131-pending-p1-missing-aria-tabs.md todos/131-complete-p1-missing-aria-tabs.md
mv todos/132-pending-p1-console-error-logging.md todos/132-complete-p1-console-error-logging.md
```
