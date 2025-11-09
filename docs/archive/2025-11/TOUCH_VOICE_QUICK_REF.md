# Touch + Voice Ordering Quick Reference

**Fast lookup guide for developers**

---

## Quick Start

### Add to Your Page (3 Steps)

```tsx
// 1. Import
import { VoiceOrderModal } from '@/pages/components/VoiceOrderModal'
import { useVoiceOrderWebRTC } from '@/pages/hooks/useVoiceOrderWebRTC'

// 2. Setup hook
const voiceOrder = useVoiceOrderWebRTC()
const [table, setTable] = useState(null)
const [seat, setSeat] = useState(null)

// 3. Render
<VoiceOrderModal
  show={voiceOrder.showVoiceOrder && !!table}
  table={table}
  seat={seat}
  voiceOrder={voiceOrder}
  onSubmit={() => voiceOrder.submitOrder(table, seat)}
  onClose={() => voiceOrder.resetVoiceOrder()}
/>
```

---

## Component Cheat Sheet

| Component | Purpose | Key Props | Location |
|-----------|---------|-----------|----------|
| `VoiceOrderModal` | Main ordering interface | `show`, `table`, `seat`, `voiceOrder` | `/pages/components/VoiceOrderModal.tsx` |
| `OrderInputSelector` | Voice/Touch toggle | `mode`, `onChange`, `size` | `/components/shared/OrderInputSelector.tsx` |
| `ServerMenuGrid` | Server menu display | `onItemClick`, `showSearch` | `/pages/components/ServerMenuGrid.tsx` |
| `MenuItemGrid` | Reusable menu grid | `items`, `columns`, `onItemClick` | `/components/shared/MenuItemGrid.tsx` |
| `ItemDetailModal` | Item customization | `isOpen`, `item`, `onAddToCart` | `/modules/order-system/components/ItemDetailModal.tsx` |
| `VoiceControlWebRTC` | Microphone input | `onTranscript`, `onOrderDetected`, `context` | `/modules/voice/components/VoiceControlWebRTC.tsx` |

---

## Hook Quick Reference

### useVoiceOrderWebRTC

```tsx
const {
  // State
  showVoiceOrder, setShowVoiceOrder,
  orderItems, setOrderItems,
  currentTranscript,
  isSubmitting,
  orderedSeats,

  // Actions
  handleVoiceTranscript,
  handleOrderData,
  removeOrderItem,
  submitOrder,
  resetVoiceOrder,
  handleAddNextSeat,
  handleFinishTable
} = useVoiceOrderWebRTC()
```

### useMenuItems

```tsx
const {
  items,      // ApiMenuItem[]
  loading,    // boolean
  error,      // Error | null
  refetch     // () => void
} = useMenuItems()
```

---

## Common Patterns

### Pattern 1: Simple Touch Menu

```tsx
import { ServerMenuGrid } from '@/pages/components/ServerMenuGrid'

<ServerMenuGrid
  onItemClick={(item) => {
    // Quick add without customization
    setOrderItems([...orderItems, {
      id: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      source: 'touch'
    }])
  }}
/>
```

### Pattern 2: Touch Menu with Modifiers

```tsx
import { ServerMenuGrid } from '@/pages/components/ServerMenuGrid'
import { ItemDetailModal } from '@/modules/order-system/components/ItemDetailModal'

const [selectedItem, setSelectedItem] = useState(null)
const [showModal, setShowModal] = useState(false)

<>
  <ServerMenuGrid
    onItemClick={(item) => {
      setSelectedItem(item)
      setShowModal(true)
    }}
  />

  <ItemDetailModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    item={selectedItem}
    onAddToCart={(cartItem) => {
      // Add to order
      handleAddItem(cartItem)
      setShowModal(false)
    }}
  />
</>
```

### Pattern 3: Voice-Only Mode

```tsx
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC'

<VoiceControlWebRTC
  onOrderDetected={(orderData) => {
    // Process AI-parsed order
    handleOrderData(orderData)
  }}
  context="server"
  muteAudioOutput={true}
/>
```

### Pattern 4: Hybrid Voice + Touch

```tsx
const [mode, setMode] = useState<'voice' | 'touch'>('voice')

<>
  <OrderInputSelector mode={mode} onChange={setMode} />

  {mode === 'voice' ? (
    <VoiceControlWebRTC ... />
  ) : (
    <ServerMenuGrid ... />
  )}
</>
```

---

## Voice Context Settings

### Kiosk Context (Customer-Facing)

```tsx
<VoiceControlWebRTC
  context="kiosk"
  onOrderDetected={handleOrder}
/>
```

**AI Behavior**:
- Friendly, educational tone
- Explains menu items
- Proactive questions
- Max response: 1-2 sentences

**Use For**: Self-service kiosks, customer ordering

---

### Server Context (Staff-Facing)

```tsx
<VoiceControlWebRTC
  context="server"
  onOrderDetected={handleOrder}
/>
```

**AI Behavior**:
- Fast, concise (5-10 words)
- Assumes menu knowledge
- Minimal confirmations
- Supports batch orders

**Use For**: Server order entry, kitchen communication

---

## Type Definitions

### OrderItem

```typescript
interface OrderItem {
  id: string
  menuItemId?: string        // Required for submission
  name: string
  quantity: number
  modifications?: OrderModification[]
  source?: 'voice' | 'touch' // Track input method
  price?: number
}
```

### OrderModification

```typescript
interface OrderModification {
  id: string
  name: string
  price?: number
}
```

### CartItem (Order System Module)

```typescript
interface CartItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  modifiers?: CartModifier[]
  specialInstructions?: string
  imageUrl?: string
}
```

---

## Event Handlers

### Voice Events

```tsx
// Transcript (live display)
onTranscript={(event) => {
  console.log(event.text)        // "I want a Greek salad"
  console.log(event.isFinal)     // true/false
}}

// Order Detected (AI parsed)
onOrderDetected={(orderData) => {
  console.log(orderData.items)   // [{ name: "Greek Salad", quantity: 1 }]
}}
```

### Touch Events

```tsx
// Menu item clicked
onItemClick={(item) => {
  console.log(item.id, item.name, item.price)
}}

// Item added to cart
onAddToCart={(cartItem) => {
  console.log(cartItem.quantity, cartItem.modifiers)
}}
```

---

## Styling Classes

### OrderInputSelector

```tsx
<OrderInputSelector
  size="large"     // 'medium' | 'large' | 'xl'
  className="..."  // Additional Tailwind classes
/>
```

**Default Colors**:
- Voice mode: `#4ECDC4` (teal)
- Touch mode: `#4CAF50` (green)

### MenuItemGrid

```tsx
<MenuItemGrid
  columns={{
    mobile: 2,    // Grid columns on mobile
    tablet: 3,    // Grid columns on tablet
    desktop: 4    // Grid columns on desktop
  }}
  className="..."
/>
```

---

## API Endpoints

### Menu Items

```bash
GET /api/v1/menu/items
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Greek Salad",
    "price": 12.99,
    "categoryId": "uuid",
    "isAvailable": true,
    "modifierGroups": [...]
  }
]
```

### Voice Session Token

```bash
POST /api/v1/realtime/session
Headers: { "x-restaurant-id": "grow" }
```

**Response**:
```json
{
  "client_secret": { "value": "token" },
  "expires_at": 1234567890,
  "menu_context": "Menu items: ..."
}
```

### Submit Order

```bash
POST /api/v1/orders
Headers: {
  "Authorization": "Bearer <token>",
  "X-Restaurant-ID": "grow"
}
```

**Request**:
```json
{
  "table_number": "5",
  "seat_number": 2,
  "items": [
    {
      "menu_item_id": "uuid",
      "name": "Greek Salad",
      "quantity": 1,
      "price": 12.99,
      "modifications": ["no onions"]
    }
  ],
  "notes": "Rush order",
  "total_amount": 14.50,
  "customer_name": "Table 5 - Seat 2",
  "type": "dine-in"
}
```

---

## Debugging Snippets

### Enable Debug Mode

```tsx
<VoiceControlWebRTC debug={true} />
```

### Check Menu Loading

```tsx
const { items, loading, error } = useMenuItems()
console.log('Menu:', items.length, 'Loading:', loading, 'Error:', error)
```

### Inspect Order State

```tsx
useEffect(() => {
  console.table(voiceOrder.orderItems)
}, [voiceOrder.orderItems])
```

### Test Fuzzy Matching

```tsx
import { findBestMatch } from '@/utils/fuzzyMenuMatcher'

const result = findBestMatch('greek', menuItems, 0.3)
console.log('Match:', result.item?.name, 'Confidence:', result.confidence)
```

### Validate Items Before Submission

```tsx
const invalidItems = orderItems.filter(item => !item.menuItemId)
if (invalidItems.length > 0) {
  console.error('Invalid items:', invalidItems.map(i => i.name))
}
```

---

## Common Tasks

### Add Item via Voice

```tsx
const voiceOrder = useVoiceOrderWebRTC()

// AI calls add_to_order() function
// → handleOrderData receives: { items: [{ name: "Greek Salad", quantity: 1 }] }
// → OrderParser matches name to menuItemId
// → Item added to orderItems array
```

### Add Item via Touch

```tsx
<ServerMenuGrid
  onItemClick={(item) => {
    setSelectedItem(item)
    setShowModal(true)
  }}
/>

<ItemDetailModal
  item={selectedItem}
  onAddToCart={(cartItem) => {
    const orderItem = {
      id: cartItem.id,
      menuItemId: cartItem.menuItemId,
      name: cartItem.name,
      quantity: cartItem.quantity,
      price: cartItem.price,
      source: 'touch',
      modifications: cartItem.modifiers?.map(m => ({
        id: m.id,
        name: m.name,
        price: m.price
      }))
    }
    setOrderItems([...orderItems, orderItem])
  }}
/>
```

### Edit Order Item

```tsx
// In VoiceOrderModal, edit button opens ItemDetailModal
// with pre-filled data

const handleEditItem = (orderItem: OrderItem) => {
  const menuItem = menuItems.find(m => m.id === orderItem.menuItemId)
  if (menuItem) {
    setEditingItemId(orderItem.id)  // Track which item we're editing
    setSelectedMenuItem(menuItem)
    setIsItemModalOpen(true)
  }
}

// When modal submits, replace existing item
const handleAddToOrder = (cartItem: CartItem) => {
  if (editingItemId) {
    setOrderItems(
      orderItems.map(item =>
        item.id === editingItemId ? convertToOrderItem(cartItem) : item
      )
    )
  }
}
```

### Remove Order Item

```tsx
const handleRemove = (itemId: string) => {
  setShowConfirm(itemId)  // Show confirmation
}

const confirmRemove = (itemId: string) => {
  voiceOrder.removeOrderItem(itemId)
  setShowConfirm(null)
}
```

### Submit Order

```tsx
const handleSubmit = async () => {
  // Validate items have menuItemId
  const invalid = orderItems.filter(i => !i.menuItemId)
  if (invalid.length > 0) {
    toast.error('Some items are invalid')
    return
  }

  // Submit
  const success = await voiceOrder.submitOrder(table, seat)

  if (success) {
    // Show post-order prompt
    voiceOrder.setShowPostOrderPrompt(true)
  }
}
```

### Multi-Seat Workflow

```tsx
// After submitting first seat
<PostOrderPrompt
  onAddNextSeat={() => {
    // Reset modal, keep orderedSeats
    voiceOrder.handleAddNextSeat()
    setSelectedSeat(null)
    setShowSeatSelection(true)
  }}
  onFinishTable={() => {
    // Reset everything
    voiceOrder.handleFinishTable()
    setSelectedTable(null)
    setSelectedSeat(null)
  }}
/>
```

---

## Performance Tips

1. **Memoize Calculations**
```tsx
const total = useMemo(() =>
  orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
  [orderItems]
)
```

2. **Lazy Load Modals**
```tsx
{isModalOpen && <ItemDetailModal ... />}
```

3. **Debounce Search**
```tsx
const debouncedSearch = useDebouncedValue(searchQuery, 300)
```

4. **Memo Components**
```tsx
export const MenuGrid = React.memo(({ ... }) => { ... })
```

---

## Accessibility Checklist

- [ ] Tab navigation works
- [ ] Arrow keys work in OrderInputSelector
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] All buttons have aria-labels
- [ ] Focus trap in modals
- [ ] Screen reader announcements
- [ ] Keyboard shortcuts documented

---

## File Locations Quick Map

```
Key Components:
└── client/src/
    ├── components/shared/
    │   ├── OrderInputSelector.tsx       (179 lines)
    │   └── MenuItemGrid.tsx              (254 lines)
    ├── pages/
    │   ├── ServerView.tsx                (186 lines)
    │   ├── components/
    │   │   ├── VoiceOrderModal.tsx       (507 lines) ⭐
    │   │   ├── ServerMenuGrid.tsx        (294 lines)
    │   │   └── ItemModifiersModal.tsx    (404 lines)
    │   └── hooks/
    │       └── useVoiceOrderWebRTC.ts    (445 lines) ⭐
    └── modules/
        ├── voice/
        │   ├── components/VoiceControlWebRTC.tsx
        │   └── services/VoiceSessionConfig.ts   (576 lines)
        ├── order-system/
        │   └── components/
        │       ├── MenuGrid.tsx          (67 lines)
        │       └── ItemDetailModal.tsx   (173 lines)
        └── menu/
            └── hooks/useMenuItems.ts

⭐ = Core files
```

---

## Common Mistakes to Avoid

1. **Forgetting menuItemId validation**
```tsx
// ❌ BAD: Submit without validation
await submitOrder()

// ✅ GOOD: Validate first
if (orderItems.some(i => !i.menuItemId)) {
  toast.error('Invalid items')
  return
}
await submitOrder()
```

2. **Using wrong reset function**
```tsx
// ❌ BAD: Clears orderedSeats
voiceOrder.resetAllState()

// ✅ GOOD: Keeps orderedSeats
voiceOrder.resetVoiceOrder()
```

3. **Not handling loading state**
```tsx
// ❌ BAD: Menu not loaded yet
const { items } = useMenuItems()
// items might be []

// ✅ GOOD: Check loading
const { items, loading } = useMenuItems()
if (loading) return <Spinner />
```

4. **Hardcoding colors**
```tsx
// ❌ BAD: Custom colors
<OrderInputSelector color="#FF0000" />

// ✅ GOOD: Use defaults
<OrderInputSelector mode={mode} onChange={setMode} />
```

5. **Not converting CartItem to OrderItem**
```tsx
// ❌ BAD: Type mismatch
onAddToCart={(cartItem) => {
  setOrderItems([...orderItems, cartItem])  // Wrong type!
}}

// ✅ GOOD: Convert types
onAddToCart={(cartItem) => {
  const orderItem = {
    id: cartItem.id,
    menuItemId: cartItem.menuItemId,
    name: cartItem.name,
    quantity: cartItem.quantity,
    price: cartItem.price,
    source: 'touch',
    modifications: cartItem.modifiers?.map(...)
  }
  setOrderItems([...orderItems, orderItem])
}}
```

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Voice not working | Check debug mode, verify token, test microphone permissions |
| Items not adding | Check OrderParser initialization, verify menuItems loaded |
| Submit fails | Validate all items have menuItemId |
| Menu not loading | Check API endpoint, verify auth token |
| Modal won't close | Check event handlers, ensure onClose is called |
| Prices wrong | Verify tax calculation, check modifier prices |
| Multi-seat broken | Use resetVoiceOrder not resetAllState |

---

## Resources

- **Full Documentation**: `/docs/SERVER_TOUCH_VOICE_ORDERING.md`
- **Voice Architecture**: `/VOICE_ARCHITECTURE_DEEP_DIVE.md`
- **Getting Started**: `/docs/tutorials/GETTING_STARTED.md`
- **Example Implementation**: `/client/src/pages/ServerView.tsx`

---

**Quick Reference v1.0** | Last Updated: November 7, 2025
