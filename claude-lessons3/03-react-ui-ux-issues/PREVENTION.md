# React Bug Prevention Guide

This document provides concrete strategies and code examples to prevent the 5 React anti-patterns that caused production bugs.

## Table of Contents

1. [Correct AnimatePresence Pattern](#1-correct-animatepresence-pattern)
2. [Stable Hook Returns](#2-stable-hook-returns)
3. [Deterministic Values](#3-deterministic-values)
4. [Context Provider Guidelines](#4-context-provider-guidelines)
5. [Prop-to-State Synchronization](#5-prop-to-state-synchronization)
6. [Component Decomposition](#6-component-decomposition)
7. [Testing Strategies](#7-testing-strategies)
8. [Code Review Checklist](#8-code-review-checklist)

---

## 1. Correct AnimatePresence Pattern

### The Problem

Early returns before AnimatePresence cause SSR/hydration mismatches (React Error #318).

###  Anti-Pattern

```typescript
function Modal({ show, data }) {
  // WRONG: Early return before wrapper
  if (!show || !data) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Modal content */}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

###  Correct Pattern

```typescript
function Modal({ show, data }) {
  // CORRECT: AnimatePresence always in render tree
  return (
    <AnimatePresence>
      {show && data && (  // Conditional inside wrapper
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Modal content */}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Complex Example: Multiple Conditions

```typescript
function VoiceOrderModal({ show, table, seat, voiceOrder }) {
  //  WRONG
  if (!show) return null
  if (!table) return null
  if (!seat) return null
  if (!voiceOrder.orderItems.length) return null

  //  CORRECT
  return (
    <AnimatePresence mode="wait">
      {show && table && seat && voiceOrder.orderItems.length > 0 && (
        <motion.div
          key="voice-order-modal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <ModalContent table={table} seat={seat} voiceOrder={voiceOrder} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Applies To

```typescript
// All these wrappers must be stable in render tree:

// Framer Motion
<AnimatePresence>
<LayoutGroup>

// React
<Suspense>
<ErrorBoundary>

// React DOM
<Portal>

// Custom wrappers that track children
<TransitionWrapper>
<AnimationController>
```

### ESLint Rule (Proposed)

```javascript
// .eslintrc.js
{
  "rules": {
    "react/no-early-return-before-wrapper": ["error", {
      "wrappers": ["AnimatePresence", "Suspense", "ErrorBoundary", "Portal"]
    }]
  }
}
```

---

## 2. Stable Hook Returns

### The Problem

Hooks that return objects/arrays create new references every render, causing infinite loops.

###  Anti-Pattern

```typescript
// WRONG: Returns new object every render
function useToast() {
  return {
    toast: {
      success: (msg) => toast.success(msg),
      error: (msg) => toast.error(msg),
    },
  }
}

// Usage causes infinite loop
function Component() {
  const { toast } = useToast()  // NEW object every render

  const handleSave = useCallback(async () => {
    try {
      await saveData()
      toast.success('Saved!')  // Uses toast
    } catch (error) {
      toast.error('Failed')
    }
  }, [toast])  //  toast changes every render

  useEffect(() => {
    handleSave()
  }, [handleSave])  //  handleSave recreates every render
  // → Infinite loop!
}
```

###  Correct Pattern

```typescript
// CORRECT: Wrap return value in useMemo
function useToast() {
  return useMemo(() => ({
    toast: {
      success: (msg) => toast.success(msg),
      error: (msg) => toast.error(msg),
    },
  }), [])  // Empty deps = stable reference
}

// Usage is safe
function Component() {
  const { toast } = useToast()  // SAME object every render

  const handleSave = useCallback(async () => {
    try {
      await saveData()
      toast.success('Saved!')
    } catch (error) {
      toast.error('Failed')
    }
  }, [toast])  //  toast stable, handleSave stable

  useEffect(() => {
    handleSave()
  }, [handleSave])  //  Only runs once
}
```

### Complex Example: Hook with Dependencies

```typescript
// Hook that depends on props
function useOrderActions(orderId: string, restaurantId: string) {
  return useMemo(() => ({
    actions: {
      confirm: async () => {
        await httpClient.patch(`/orders/${orderId}`, {
          status: 'confirmed',
          restaurant_id: restaurantId,
        })
      },
      cancel: async () => {
        await httpClient.patch(`/orders/${orderId}`, {
          status: 'cancelled',
          restaurant_id: restaurantId,
        })
      },
    },
  }), [orderId, restaurantId])  // Re-create when IDs change
}
```

### Array Returns

```typescript
//  WRONG: Returns new array every render
function useOrderFilters() {
  return [activeFilter, setActiveFilter]
}

//  CORRECT: Wrap in useMemo
function useOrderFilters() {
  return useMemo(
    () => [activeFilter, setActiveFilter],
    [activeFilter]
  )
}
```

### Function Returns

```typescript
//  WRONG: Returns new function every render
function useOrderSubmit() {
  return {
    submit: async (order) => {
      await httpClient.post('/orders', order)
    },
  }
}

//  CORRECT: Use useCallback for functions
function useOrderSubmit() {
  const submit = useCallback(async (order) => {
    await httpClient.post('/orders', order)
  }, [])  // Empty deps if no external dependencies

  return useMemo(() => ({ submit }), [submit])
}
```

### Detection Strategy

```bash
# Find hooks that might return unstable values
git grep -n "export.*use.*=" client/src/hooks/ | \
  xargs -I {} sh -c 'grep -A 10 "return {" {}'

# Look for returns without useMemo
git grep -A 5 "export function use" client/src/hooks/ | \
  grep -B 5 "return {" | \
  grep -v "useMemo"
```

---

## 3. Deterministic Values

### The Problem

Non-deterministic values (Date.now(), Math.random()) cause React Error #418 during re-renders.

###  Anti-Pattern

```typescript
// WRONG: Different value every render
function OrderList() {
  return (
    <div>
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          timestamp={Date.now()}  //  Different every render
          renderKey={Math.random()}  //  Different every render
        />
      ))}
    </div>
  )
}

// WRONG: Temporary IDs that change
function useVoiceOrder() {
  const addItem = (item) => {
    const tempId = `voice-${Date.now()}-${Math.random()}`  // 
    voiceOrder.items.push({ ...item, id: tempId })
  }
}
```

###  Correct Pattern: Use Stable Props

```typescript
// CORRECT: Use stable data from props/state
function OrderList() {
  return (
    <div>
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          timestamp={order.created_at}  //  From database
          renderKey={order.updated_at}  //  From database
        />
      ))}
    </div>
  )
}
```

###  Correct Pattern: Counter-Based IDs

```typescript
// CORRECT: Deterministic counter
let voiceOrderCounter = 0  // Module-level counter

function useVoiceOrder() {
  const addItem = (item) => {
    const tempId = `voice-${++voiceOrderCounter}`  //  Predictable
    voiceOrder.items.push({ ...item, id: tempId })
  }
}

// Or with class property
class VoiceOrderManager {
  private counter = 0

  addItem(item) {
    const tempId = `voice-${++this.counter}`
    this.items.push({ ...item, id: tempId })
  }
}
```

###  Correct Pattern: Generate Once in useEffect

```typescript
// CORRECT: Generate ID once when component mounts
function OrderForm() {
  const [orderId, setOrderId] = useState<string>()

  useEffect(() => {
    // Only set if not already set
    if (!orderId) {
      setOrderId(`order-${Date.now()}-${Math.random()}`)
    }
  }, [orderId])

  // orderId is stable after first render
  return <form data-order-id={orderId}>...</form>
}
```

###  Correct Pattern: crypto.randomUUID()

```typescript
// CORRECT: Use crypto.randomUUID() with useMemo
function OrderForm() {
  const orderId = useMemo(() => crypto.randomUUID(), [])

  // orderId is unique AND stable
  return <form data-order-id={orderId}>...</form>
}
```

### DOM Measurements

```typescript
//  WRONG: window dimensions in render
function ResponsiveComponent() {
  const isMobile = window.innerWidth < 768  //  Changes on resize

  return <div className={isMobile ? 'mobile' : 'desktop'}>...</div>
}

//  CORRECT: Use state + resize listener
function ResponsiveComponent() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkSize()  // Initial check
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  return <div className={isMobile ? 'mobile' : 'desktop'}>...</div>
}
```

### Detection Strategy

```bash
# Find non-deterministic patterns
git grep -n "Date.now()" client/src/
git grep -n "Math.random()" client/src/
git grep -n "new Date()" client/src/ | grep -v "new Date(knownValue)"
git grep -n "window.innerWidth" client/src/ | grep -v "useEffect"
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check staged files for non-deterministic patterns
git diff --cached --name-only | grep "\.tsx\?$" | while read file; do
  # Check for Date.now() or Math.random() in render
  if git diff --cached "$file" | grep -E "^\+.*Date\.now\(\)|Math\.random\(\)" | \
     grep -v "useEffect\|useMemo\|useCallback"; then
    echo "ERROR: Non-deterministic value in $file"
    echo "Use crypto.randomUUID() with useMemo or counter-based IDs"
    exit 1
  fi
done
```

---

## 4. Context Provider Guidelines

### The Problem

Nested context providers with different keys create isolated state.

###  Anti-Pattern

```typescript
// App.tsx - Root provider
function App() {
  return (
    <CartProvider persistKey="cart_root">
      <CartDrawer />  {/* Reads from root */}
      <Routes>
        <Route path="/order" element={<OrderPage />} />
      </Routes>
    </CartProvider>
  )
}

// OrderPage.tsx - Nested provider with DIFFERENT key
function OrderPage() {
  return (
    <CartProvider persistKey="cart_order">  {/*  Isolated state */}
      <MenuGrid />  {/* Writes to nested */}
    </CartProvider>
  )
}

// Result: MenuGrid writes to one cart, CartDrawer reads from another
```

###  Correct Pattern: Shared Key

```typescript
// App.tsx - Root provider
function App() {
  return (
    <CartProvider persistKey="cart_current">
      <CartDrawer />
      <Routes>
        <Route path="/order" element={<OrderPage />} />
      </Routes>
    </CartProvider>
  )
}

// OrderPage.tsx - Nested provider with SAME key
function OrderPage() {
  return (
    <CartProvider persistKey="cart_current">  {/*  Shared state */}
      <MenuGrid />
    </CartProvider>
  )
}
```

###  Better Pattern: No Nesting

```typescript
// App.tsx - Single provider
function App() {
  return (
    <CartProvider persistKey="cart_current">
      <CartDrawer />
      <Routes>
        <Route path="/order" element={<OrderPage />} />
      </Routes>
    </CartProvider>
  )
}

// OrderPage.tsx - No provider, just uses context
function OrderPage() {
  const { cart, addToCart } = useCart()  //  Uses root provider

  return <MenuGrid cart={cart} onAddToCart={addToCart} />
}
```

### When Nesting Is Required

```typescript
// Scenario: Lazy-loaded route needs context but parent doesn't provide it

// App.tsx
function App() {
  return (
    <Routes>
      {/* No CartProvider at root level */}
      <Route path="/" element={<HomePage />} />
      <Route path="/order" element={<OrderPage />} />
    </Routes>
  )
}

// OrderPage.tsx - Provides context for this subtree
function OrderPage() {
  return (
    <CartProvider persistKey="cart_current">
      <MenuGrid />
      <CartDrawer />  {/* Both use same provider */}
    </CartProvider>
  )
}
```

### Multiple Contexts Pattern

```typescript
//  CORRECT: Different context types
function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <CartProvider>
          <OrderProvider>
            {/* All different contexts, no conflict */}
            <AppContent />
          </OrderProvider>
        </CartProvider>
      </RestaurantProvider>
    </AuthProvider>
  )
}
```

### Detection Strategy

```bash
# Find providers with persistKey/storageKey
git grep -n "persistKey\|storageKey" client/src/ | \
  grep "Provider"

# Check for nested providers of same type
git grep -B 5 -A 5 "<.*Provider" client/src/pages/ | \
  grep -E "Provider.*Provider"
```

---

## 5. Prop-to-State Synchronization

### The Problem

`useState` only uses initial value on first render, ignoring subsequent prop changes.

###  Anti-Pattern

```typescript
// WRONG: useState ignores prop changes
function Modal({ isOpen, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  // Parent changes initialTab from 'info' to 'details'
  // But activeTab stays as 'info' 

  return (
    <dialog open={isOpen}>
      <Tabs active={activeTab} onChange={setActiveTab} />
    </dialog>
  )
}
```

###  Correct Pattern: useEffect Sync

```typescript
// CORRECT: Sync prop changes to state
function Modal({ isOpen, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)  //  Update when prop changes
  }, [initialTab])

  return (
    <dialog open={isOpen}>
      <Tabs active={activeTab} onChange={setActiveTab} />
    </dialog>
  )
}
```

###  Better Pattern: Controlled Component

```typescript
// BETTER: Don't use local state, make it controlled
function Modal({ isOpen, activeTab, onTabChange }) {
  // No local state, parent controls everything
  return (
    <dialog open={isOpen}>
      <Tabs active={activeTab} onChange={onTabChange} />
    </dialog>
  )
}

// Parent manages state
function Parent() {
  const [activeTab, setActiveTab] = useState('info')

  return (
    <Modal
      isOpen={true}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  )
}
```

###  Best Pattern: Key Reset

```typescript
// BEST: Use key prop to reset component
function Parent() {
  const [mode, setMode] = useState<'voice' | 'touch'>('voice')

  return (
    <>
      <button onClick={() => setMode('voice')}>Voice</button>
      <button onClick={() => setMode('touch')}>Touch</button>

      {/* Key changes → component remounts → useState re-initializes */}
      <OrderModal key={mode} initialMode={mode} />
    </>
  )
}

function OrderModal({ initialMode }) {
  const [mode, setMode] = useState(initialMode)
  // When key changes, component unmounts and remounts
  // useState re-initializes with new initialMode 

  return <div>{mode}</div>
}
```

### Complex Example: Form Reset

```typescript
// Form that needs to reset when item changes
function EditItemForm({ item }) {
  const [formData, setFormData] = useState(item)

  //  WRONG: This creates bugs
  // useState(item) only runs once
  // Form shows stale data when item changes

  //  CORRECT: Sync prop changes
  useEffect(() => {
    setFormData(item)
  }, [item])

  //  BETTER: Use key
  // <EditItemForm key={item.id} item={item} />

  return (
    <form>
      <input
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
      />
    </form>
  )
}
```

---

## 6. Component Decomposition

### The Problem

Large components (>200 lines) hide bugs and make maintenance difficult.

### Example: VoiceOrderModal (528 lines)

**Before** (MONOLITHIC):
```typescript
// VoiceOrderModal.tsx - 528 lines
export function VoiceOrderModal({
  show,
  table,
  seat,
  voiceOrder,
  onSubmit,
  onClose,
  initialInputMode,
}) {
  // State management (50 lines)
  const [inputMode, setInputMode] = useState(initialInputMode)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)

  // Voice ordering logic (100 lines)
  const {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
  } = useVoiceOrderWebRTC(...)

  // Touch ordering logic (100 lines)
  const { items: menuItems } = useMenuItems()
  const handleTouchItemClick = (item) => { ... }
  const handleEditItem = (orderItem) => { ... }

  // Order totals calculation (50 lines)
  const orderTotals = useMemo(() => { ... }, [voiceOrder.orderItems])

  // Submission logic (50 lines)
  const handleSubmit = async () => { ... }

  // Render logic (178 lines)
  return (
    <AnimatePresence>
      {show && table && seat && (
        <motion.div>
          {/* Voice mode UI (80 lines) */}
          {inputMode === 'voice' && (
            <div>
              <WaveformVisualizer />
              <TranscriptDisplay />
              <RecordingControls />
              <OrderItemsList />
            </div>
          )}

          {/* Touch mode UI (80 lines) */}
          {inputMode === 'touch' && (
            <div>
              <UnifiedCartProvider>
                <MenuGrid />
              </UnifiedCartProvider>
              <OrderItemsList />
            </div>
          )}

          {/* Shared UI (18 lines) */}
          <OrderSummary />
          <SubmitButton />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**After** (DECOMPOSED):
```typescript
// VoiceOrderModal.tsx - 100 lines (container)
export function VoiceOrderModal({
  show,
  table,
  seat,
  voiceOrder,
  onSubmit,
  onClose,
  initialInputMode,
}) {
  const [inputMode, setInputMode] = useState(initialInputMode)

  useEffect(() => {
    setInputMode(initialInputMode)
  }, [initialInputMode])

  return (
    <AnimatePresence>
      {show && table && seat && (
        <motion.div>
          <OrderModalHeader
            inputMode={inputMode}
            onModeChange={setInputMode}
            table={table}
            seat={seat}
          />

          {inputMode === 'voice' && (
            <VoiceOrderView
              table={table}
              seat={seat}
              voiceOrder={voiceOrder}
              onSubmit={onSubmit}
            />
          )}

          {inputMode === 'touch' && (
            <TouchOrderView
              table={table}
              seat={seat}
              voiceOrder={voiceOrder}
              onSubmit={onSubmit}
            />
          )}

          <OrderModalFooter
            voiceOrder={voiceOrder}
            onClose={onClose}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// VoiceOrderView.tsx - 200 lines
export function VoiceOrderView({ table, seat, voiceOrder, onSubmit }) {
  const {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
  } = useVoiceOrderWebRTC(...)

  return (
    <div>
      <WaveformVisualizer isRecording={isRecording} />
      <TranscriptDisplay transcript={transcript} />
      <RecordingControls
        isRecording={isRecording}
        onStart={startRecording}
        onStop={stopRecording}
      />
      <OrderItemsList items={voiceOrder.orderItems} />
    </div>
  )
}

// TouchOrderView.tsx - 200 lines
export function TouchOrderView({ table, seat, voiceOrder, onSubmit }) {
  const { items: menuItems } = useMenuItems()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  return (
    <div>
      <UnifiedCartProvider persistKey="cart_current">
        <MenuGrid
          items={menuItems}
          onItemClick={setSelectedItem}
        />
      </UnifiedCartProvider>

      <OrderItemsList items={voiceOrder.orderItems} />

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}

// OrderModalHeader.tsx - 50 lines
export function OrderModalHeader({ inputMode, onModeChange, table, seat }) {
  return (
    <header>
      <h2>Table {table.table_number}, Seat {seat}</h2>
      <ToggleGroup value={inputMode} onValueChange={onModeChange}>
        <ToggleGroupItem value="voice">Voice</ToggleGroupItem>
        <ToggleGroupItem value="touch">Touch</ToggleGroupItem>
      </ToggleGroup>
    </header>
  )
}

// OrderModalFooter.tsx - 50 lines
export function OrderModalFooter({ voiceOrder, onClose }) {
  const orderTotals = useOrderTotals(voiceOrder.orderItems)

  return (
    <footer>
      <OrderSummary totals={orderTotals} />
      <button onClick={onClose}>Cancel</button>
      <button onClick={handleSubmit}>Submit Order</button>
    </footer>
  )
}
```

### Benefits of Decomposition

1. **Easier to understand**: Each file has single responsibility
2. **Easier to test**: Test VoiceOrderView independently
3. **Easier to find bugs**: 200 lines vs 528 lines
4. **Easier to modify**: Change voice mode without touching touch mode
5. **Easier to reuse**: TouchOrderView can be used elsewhere

### Component Size Guidelines

```
< 50 lines:   EXCELLENT - Single responsibility
50-100 lines: GOOD - Clear purpose
100-200 lines: OK - Consider decomposition
200-300 lines: WARNING - Should decompose
> 300 lines:  CRITICAL - Must decompose
```

### Decomposition Strategy

```typescript
// 1. Identify logical sections
// Voice mode, Touch mode, Shared UI

// 2. Extract each section to component
VoiceOrderView
TouchOrderView
OrderModalHeader
OrderModalFooter

// 3. Move state to appropriate level
// inputMode → Container (shared)
// isRecording → VoiceOrderView (voice-specific)
// selectedItem → TouchOrderView (touch-specific)

// 4. Pass props down
// Container passes table, seat, voiceOrder to views

// 5. Pass callbacks up
// Views call onSubmit callback from container
```

---

## 7. Testing Strategies

### Production Build Testing

```bash
# ALWAYS test with production build before deploying

# 1. Build for production
npm run build

# 2. Preview production build locally
npm run preview
# or
npx vite preview --port 5173

# 3. Test critical flows
# - Modal open/close (hydration)
# - Animations (AnimatePresence)
# - State updates (cart, orders)
# - Form submissions
# - Route navigation

# 4. Check console for errors
# - React #318 (hydration)
# - React #418 (non-deterministic)
# - React #310 (infinite loop)
```

### Hydration Testing

```typescript
// tests/hydration.spec.ts
import { test, expect } from '@playwright/test'

test('No hydration errors in ServerView', async ({ page }) => {
  const errors: string[] = []

  page.on('pageerror', err => {
    errors.push(err.message)
  })

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  await page.goto('/server')

  // Wait for initial render
  await page.waitForLoadState('networkidle')

  // Interact with modals
  await page.click('[data-testid="table-1"]')
  await page.click('[data-testid="seat-1"]')
  await page.click('[data-testid="voice-order-button"]')

  // Check for hydration errors
  const hydrationErrors = errors.filter(err =>
    err.includes('Hydration') ||
    err.includes('#318') ||
    err.includes('#418')
  )

  expect(hydrationErrors).toHaveLength(0)
})
```

### Infinite Loop Detection

```typescript
// tests/infinite-loop.spec.ts
import { test, expect } from '@playwright/test'

test('No infinite re-renders', async ({ page }) => {
  let renderCount = 0
  const maxRenders = 50  // Threshold for infinite loop

  await page.addInitScript(() => {
    const originalCreateElement = React.createElement
    React.createElement = (...args) => {
      renderCount++
      return originalCreateElement(...args)
    }
  })

  await page.goto('/server')
  await page.waitForTimeout(2000)  // Wait 2 seconds

  expect(renderCount).toBeLessThan(maxRenders)
})
```

### Component Testing

```typescript
// VoiceOrderModal.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { VoiceOrderModal } from './VoiceOrderModal'

describe('VoiceOrderModal', () => {
  it('should render AnimatePresence consistently', () => {
    const { container, rerender } = render(
      <VoiceOrderModal show={false} table={null} seat={null} />
    )

    // AnimatePresence should render even when closed
    expect(container.querySelector('[data-presence]')).toBeInTheDocument()

    // Re-render with show=true
    rerender(
      <VoiceOrderModal show={true} table={mockTable} seat={mockSeat} />
    )

    // AnimatePresence still present (no hydration mismatch)
    expect(container.querySelector('[data-presence]')).toBeInTheDocument()
  })

  it('should sync prop changes to state', async () => {
    const { rerender } = render(
      <VoiceOrderModal initialInputMode="voice" {...props} />
    )

    expect(screen.getByTestId('input-mode')).toHaveTextContent('voice')

    // Change prop
    rerender(
      <VoiceOrderModal initialInputMode="touch" {...props} />
    )

    // State should sync
    await waitFor(() => {
      expect(screen.getByTestId('input-mode')).toHaveTextContent('touch')
    })
  })
})
```

---

## 8. Code Review Checklist

### Pre-Commit Checklist (Developer)

```markdown
- [ ] Component under 200 lines (or justified + decomposition plan)
- [ ] No early returns before AnimatePresence/Suspense/ErrorBoundary
- [ ] All hooks return stable values (useMemo/useCallback)
- [ ] No Date.now(), Math.random() in render or props
- [ ] Prop-to-state sync uses useEffect
- [ ] Tested with production build (`npm run build && npm run preview`)
- [ ] No console.log statements
- [ ] TypeScript passes (`npm run typecheck`)
- [ ] Tests pass (`npm test`)
```

### Code Review Checklist (Reviewer)

```markdown
## React Patterns
- [ ] AnimatePresence always in render tree (no early returns before it)
- [ ] Hook return values wrapped in useMemo
- [ ] No non-deterministic values (Date.now, Math.random)
- [ ] Context providers use consistent keys when nested
- [ ] Prop-to-state sync implemented correctly

## Component Quality
- [ ] Component under 200 lines (or decomposition justified)
- [ ] Single responsibility principle
- [ ] Props are well-typed
- [ ] State management is clear

## Testing
- [ ] Unit tests for critical logic
- [ ] Integration tests for user flows
- [ ] Production build tested locally

## Performance
- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] Large lists use virtualization
- [ ] Expensive calculations use useMemo

## Security
- [ ] No sensitive data in client code
- [ ] API keys in environment variables only
- [ ] Input validation present
```

### Automated Checks (CI/CD)

```yaml
# .github/workflows/react-checks.yml
name: React Quality Checks

on: [push, pull_request]

jobs:
  check-patterns:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for non-deterministic values
        run: |
          if git diff origin/main...HEAD -- 'client/src/**/*.tsx' | \
             grep -E "^\+.*Date\.now\(\)|Math\.random\(\)"; then
            echo "ERROR: Non-deterministic values found"
            exit 1
          fi

      - name: Check component sizes
        run: |
          find client/src -name "*.tsx" -exec wc -l {} \; | \
            awk '$1 > 300 {print "WARNING: " $2 " has " $1 " lines"}; $1 > 500 {err=1} END {exit err}'

      - name: Check for early returns before AnimatePresence
        run: |
          # Find files with AnimatePresence
          files=$(git grep -l "AnimatePresence" client/src/)

          # Check each file for early returns
          for file in $files; do
            # Simple heuristic: early return before AnimatePresence
            if grep -B 20 "AnimatePresence" "$file" | grep -q "return null"; then
              echo "WARNING: Possible early return before AnimatePresence in $file"
            fi
          done

      - name: Build production and check for errors
        run: |
          npm run build 2>&1 | tee build.log
          if grep -qi "error" build.log; then
            echo "ERROR: Production build has errors"
            exit 1
          fi
```

---

## Summary of Prevention Strategies

| Strategy | Prevents | Effort | Impact |
|----------|----------|--------|--------|
| Correct AnimatePresence pattern | React #318 | Low | Critical |
| Stable hook returns (useMemo) | Infinite loops | Low | High |
| Deterministic values only | React #418 | Low | High |
| Consistent provider keys | State isolation | Low | High |
| useEffect prop sync | UI behavior bugs | Low | Medium |
| Component decomposition | All bugs | High | Critical |
| Production build testing | Hydration issues | Medium | Critical |
| Automated checks | Recurrence | Medium | High |

## Quick Reference

###  Never Do This
```typescript
if (!show) return null  // Before AnimatePresence
return { toast: {...} }  // Unstable hook return
timestamp={Date.now()}  // Non-deterministic prop
<Provider key="different">  // Nested with different key
useState(props.value)  // Without useEffect sync
```

###  Always Do This
```typescript
<AnimatePresence>{show && ...}</AnimatePresence>  // Wrapper always rendered
return useMemo(() => ({ toast: {...} }), [])  // Stable hook return
timestamp={item.created_at}  // Stable prop value
<Provider key="shared">  // Nested with same key
useState + useEffect(...)  // Prop-to-state sync
```

---

**Last Updated**: 2025-11-19
**Based On**: 5 production incidents (Nov 2-10, 2025)
**Status**: Active prevention guide
