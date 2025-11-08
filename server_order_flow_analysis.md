# Complete Server Order Flow Analysis

## 1. CURRENT ARCHITECTURE OVERVIEW

### Authentication & Entry Point
```
Server Login Flow:
  1. /pin-login (PIN entry) 
     └─> loginWithPin(pin, restaurantId)
         └─> /server (redirect)
  
  2. /login (Email/password for managers)
     └─> login(email, password, restaurantId)
         └─> /server or dashboard (redirect)
```

**Key Files:**
- `/client/src/pages/PinLogin.tsx` - PIN login UI (4-6 digit auto-submit at 4 digits)
- `/client/src/pages/Login.tsx` - Email/password login
- Auth context handles credential persistence & token management

---

## 2. AFTER SERVER LOGS IN: /server ROUTE

### Route Definition
```
/server → <ServerView /> component
Location: /client/src/pages/ServerView.tsx
Guard: RoleGuard(['server', 'admin'])
Auth: useAuth() provides hasScope('orders:create')
```

### ServerView Component Initialization
```
ServerView.tsx (the main orchestrator)
│
├─ useServerView()
│  ├─ Loads floor plan tables from API
│  ├─ Polls every 30 seconds for updates
│  ├─ Calculates stats (occupied, available, reserved)
│  └─ Returns: { tables, selectedTableId, setSelectedTableId, stats }
│
├─ useTableInteraction(tables, setSelectedTableId)
│  └─ Provides: { handleTableClick, isTableAvailable, getTableOccupancy }
│
├─ useVoiceOrderWebRTC()
│  └─ Manages entire order state & submission
│
└─ Local State
   ├─ showSeatSelection (modal visibility)
   ├─ selectedSeat (number 1-N for table capacity)
   └─ orderNotes (special requests)
```

---

## 3. CURRENT ORDER PLACEMENT FLOW

### Phase 1: Table Selection
```
User clicks on floor plan table
         ↓
handleTableSelection() called
         ↓
- setSelectedTableId(tableId)
- setShowSeatSelection(true)
         ↓
SeatSelectionModal opens with:
  - Table capacity seats (e.g., 1-4 for a 4-top)
  - Already ordered seats highlighted in green
  - "Start Voice Order" button (disabled until seat selected)
  - "Finish Table" button (if seats already have orders)
```

**UI Component:** `SeatSelectionModal.tsx`
```
Features:
- Grid display of seat buttons (3 columns)
- Visual feedback: 
  - Selected seat: blue border + ring
  - Ordered seats: green bg + checkmark
  - Available: neutral with hover effect
- Seat selection updates local state: setSelectedSeat(seat)
```

### Phase 2: Seat Selection → Voice Order Modal
```
User clicks a seat in SeatSelectionModal
         ↓
setSelectedSeat(seat) updates local state
         ↓
User clicks "Start Voice Order"
         ↓
handleStartVoiceOrder() validates:
  - selectedTableId exists
  - selectedSeat exists
         ↓
voiceOrder.setShowVoiceOrder(true)
         ↓
VoiceOrderModal opens with:
  - Table label & seat number in header
  - Order input mode selector (Voice/Touch toggle)
  - Voice control component OR menu grid
  - Order items list (live updates)
  - Submit button with item count & total
```

**UI Component:** `VoiceOrderModal.tsx`
```
Two Input Modes:
1. VOICE MODE (default)
   - VoiceControlWebRTC component
   - Live transcript display
   - Items added via AI parsing
   - Touch menu hidden
   
2. TOUCH MODE
   - MenuGrid (left panel)
   - Category/search filters
   - Touch item selection
   - ItemDetailModal for modifiers

Layout: Dual-panel when touch mode, single panel for voice
```

### Phase 3: Order Item Management
```
Items can be added via:

A) VOICE INPUT
   - User speaks: "I'll have a Greek salad with extra feta"
   - VoiceControlWebRTC → OpenAI Realtime API
   - AI calls add_to_order() with parsed items
   - handleOrderData() receives: { items: [{name: "Greek Salad", modifiers: ["extra feta"]}] }
   - OrderParser.findBestMenuMatch() finds menu item
   - Item added with: { id, menuItemId, name, quantity, modifications, source: 'voice' }

B) TOUCH INPUT
   - User clicks item in MenuGrid
   - ItemDetailModal opens for modifiers
   - handleAddToOrder() adds CartItem to order
   - Item marked with source: 'touch'

Item Modifications:
- Modal allows selecting modifiers with prices
- Modifications stored as: { id, name, price }
- Can be added from voice or touch
```

### Phase 4: Order Submission
```
User clicks "Send Order"
         ↓
handleSubmitOrder() called
         ↓
Validation:
  ✓ orderItems.length > 0
  ✓ selectedTable exists
  ✓ selectedSeat exists
  ✓ All items have menuItemId (critical!)
         ↓
voiceOrder.submitOrder(selectedTable, selectedSeat)
         ↓
HTTP POST /api/v1/orders
  Headers:
    - Authorization: Bearer token
    - X-Restaurant-ID: restaurant.id
    - X-Client-Flow: 'server'
  
  Body:
    {
      "table_number": "Table A",
      "seat_number": 1,
      "items": [
        {
          "id": "voice-xxx",
          "menu_item_id": "uuid-xxx",
          "name": "Greek Salad",
          "quantity": 1,
          "price": 12.99,
          "modifications": ["extra feta"]
        }
      ],
      "notes": "Special requests\n\n(Voice order from Table A, Seat 1)",
      "total_amount": 14.17,
      "customer_name": "Table A - Seat 1",
      "type": "dine-in"
    }
         ↓
Response Success?
  YES ✓
    - toast.success("Order submitted...")
    - Track metrics: trackOrderCompleted()
    - setOrderedSeats([...prev, seat])
    - setShowPostOrderPrompt(true)
    - Clear orderItems, orderNotes
    - voiceOrder.setShowVoiceOrder(false)
  
  NO ✗
    - toast.error()
    - Validation errors returned in response
```

---

## 4. EXISTING UI COMPONENTS

### ServerView.tsx (Main Container)
```typescript
Props: None (uses hooks)

State:
- selectedTableId: string | null
- selectedTable: Table | null
- selectedSeat: number | null
- showSeatSelection: boolean
- voiceOrder: UseVoiceOrderWebRTC

Renders:
1. ServerHeader (back button + restaurant name)
2. ServerFloorPlan (interactive canvas)
3. SeatSelectionModal (seat picker)
4. VoiceOrderModal (order interface)
5. PostOrderPrompt (what's next?)
6. ServerStats (dashboard metrics)
7. Instructions card
```

### ServerFloorPlan.tsx
```
Features:
- Canvas-based floor plan rendering
- Drag to pan, scroll to zoom
- Auto-fit tables on load
- Color-coded table status:
  - Green: available
  - Blue: occupied
  - Yellow: reserved
  - Gray: cleaning
- Click handler: onTableClick(tableId)

Dependency: FloorPlanCanvas from floor-plan module
```

### SeatSelectionModal.tsx
```
Props:
- show: boolean
- table: Table (with capacity)
- selectedSeat: number | null
- orderedSeats: number[] (already have orders)
- canCreateOrders: boolean
- onSeatSelect: (seat: number) => void
- onStartVoiceOrder: () => void
- onFinishTable: () => void
- onClose: () => void

Layout: 3-column grid of seat buttons + action buttons
```

### VoiceOrderModal.tsx
```
Props:
- show: boolean
- table: Table
- seat: number
- voiceOrder: VoiceOrderState
- onSubmit: () => void
- onClose: () => void
- isSubmitting: boolean

Internal State:
- inputMode: 'voice' | 'touch'
- selectedMenuItem: MenuItem | null
- isItemModalOpen: boolean
- selectedCategory: string | null
- searchQuery: string
- editingItemId: string | null
- orderNotes: string

Sub-components:
- VoiceControlWebRTC (voice input)
- MenuGrid (touch input)
- ItemDetailModal (modifier selection)
- Order items list with Q+/Q- controls
```

### PostOrderPrompt.tsx
```
Props:
- show: boolean
- table: Table
- completedSeat: number
- orderedSeats: number[]
- totalSeats: number
- onAddNextSeat: () => void
- onFinishTable: () => void

Features:
- Success animation (spring CheckCircle2)
- Progress bar: orderedSeats.length / totalSeats
- Seat status grid with checkmarks
- Two action buttons:
  1. "Add Next Seat" → seat selection modal
  2. "Finish Table" → reset all state

Shown After: Successful order submission
Closed By: User action or handleFinishTable()
```

### ServerStats.tsx
```
Displays:
- Available Tables (green)
- Occupied Tables (blue)
- Reserved Tables (purple)
- Available Seats (orange)

Grid: 2 cols (mobile) → 4 cols (desktop)
Each card shows: value, label, "of X total"
```

### ServerHeader.tsx
```
Shows:
- Back button (navigate to /)
- Restaurant name + "Server View"
- Subtitle: "Dining room management"
```

---

## 5. CORE HOOKS

### useServerView.ts
```
Responsibilities:
1. Load floor plan (getTables)
2. Poll every 30 seconds for updates
3. Manage selectedTableId state
4. Calculate stats (occupancy, availability)

Returns:
{
  tables: Table[],
  isLoading: boolean,
  selectedTableId: string | null,
  setSelectedTableId: (id) => void,
  selectedTable: Table | null,
  stats: {
    totalTables, availableTables, occupiedTables,
    reservedTables, totalSeats, availableSeats
  },
  restaurant: Restaurant | null,
  loadFloorPlan: () => Promise<void>
}

API Call: tableService.getTables()
  - GET /api/v1/tables
  - Headers: { x-restaurant-id }
```

### useTableInteraction.ts
```
Simple click handling for floor plan

Returns:
{
  handleTableClick: (tableId) => void,
  handleCanvasClick: () => void,
  isTableAvailable: (tableId) => boolean,
  getTableOccupancy: () => { occupied, total, percentage }
}
```

### useVoiceOrderWebRTC.ts (CRITICAL - 445 lines)
```
The brain of order management

State:
- showVoiceOrder: boolean
- currentTranscript: string
- orderItems: OrderItem[]
- isVoiceActive: boolean
- isProcessing: boolean
- isSubmitting: boolean
- orderNotes: string
- orderedSeats: number[] (multi-seat tracking)
- showPostOrderPrompt: boolean
- lastCompletedSeat: number | null

Handlers:
1. handleVoiceTranscript(text | event)
   - Updates currentTranscript
   - Clears after 3 seconds (final only)
   - Does NOT parse (AI does via OpenAI Realtime)

2. handleOrderData(aiOrderData)
   - Receives: { items: [{name, quantity, modifiers}] }
   - Uses OrderParser.findBestMenuMatch()
   - Confidence threshold: > 0.5
   - Maps to: { menuItemId, name, quantity, modifications }
   - Adds to orderItems
   - Shows toast for matched/unmatched items

3. removeOrderItem(itemId)
   - Filters from orderItems

4. submitOrder(selectedTable, selectedSeat)
   - CRITICAL: Validates all items have menuItemId
   - Gets auth token (Supabase or localStorage)
   - Uses restaurant ID from context (feature flag)
   - POST to /api/v1/orders with full payload
   - Tracks metrics on success
   - Updates orderedSeats
   - Shows PostOrderPrompt
   - Returns: true on success, false on error

5. handleAddNextSeat()
   - Closes modals but keeps orderedSeats
   - Parent reopens SeatSelectionModal

6. handleFinishTable()
   - Resets all state including orderedSeats
   - Shows success toast
   - Floor plan available again

7. resetVoiceOrder()
   - Clears items but keeps orderedSeats
   - For closing without finishing table

Menu Item Matching:
- OrderParser initialized with menuItems
- Uses fuzzy matching on item names
- Reports confidence scores
- Handles unmatched items gracefully

Feature Flags:
- NEW_CUSTOMER_ID_FLOW: Controls whether to use context restaurantId
```

---

## 6. DATA STRUCTURES

### Table (Floor Plan)
```typescript
interface Table {
  id: string                    // UUID from database
  restaurant_id: string
  label: string                 // "Table 1", "A", etc.
  capacity: number              // 1-16+ seats
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  position?: { x: number, y: number }
  current_order_id?: string     // Reference to active order
  created_at: string
  updated_at: string
}
```

### OrderItem (Local, Voice/Touch Input)
```typescript
interface OrderItem {
  id: string                    // Unique within order
  menuItemId?: string           // Maps to Menu Item UUID
  name: string                  // Item name
  quantity: number              // 1+
  modifications?: OrderModification[]
  source?: 'voice' | 'touch'    // Track input method
  price?: number                // For calculation
}

interface OrderModification {
  id: string
  name: string                  // "extra feta", etc.
  price: number                 // Modifier cost
}
```

### API Order Submission Payload
```typescript
{
  "table_number": string        // "Table A"
  "seat_number": number         // 1-N
  "items": [{
    "id": string
    "menu_item_id": string      // CRITICAL: must not be null
    "name": string
    "quantity": number
    "price": number
    "modifications": string[]   // Just names, not objects
  }]
  "notes": string
  "total_amount": number
  "customer_name": string       // "Table A - Seat 1"
  "type": "dine-in"
}
```

### Response
```typescript
{
  "id": string                  // Order ID created
  // ... other fields from backend
}
```

---

## 7. CURRENT IMPLEMENTATION GAPS

### Missing Features
1. **Order History on Table**
   - No view of previous orders for that table
   - No ability to see what's already on KDS
   - No modification of orders after submission

2. **Manual Seat Assignment**
   - Only works with voice/touch modal
   - No quick "assign seat 3 to speaker order" shortcut
   - Can't split orders without creating separate seats

3. **Table Status Management**
   - Can't manually mark table as "cleaning" or "reserved"
   - No reassignment between tables
   - No table merging (combining two 2-tops)

4. **Order Timing**
   - No estimated wait time display
   - No callback notification when order is ready
   - Can't check KDS status from server view

5. **Touch Interface**
   - Menu grid exists but search/filter could be better
   - No favorites or recently ordered items
   - Can't bulk-add items (e.g., "2x burger" from menu)

6. **Feedback Loop**
   - Voice recognition confidence not shown to user
   - No "did you mean X?" disambiguation
   - Unmatched items just show error toast

### Current State Management Issues
1. **Permission Model**
   - Only checked via hasScope('orders:create')
   - No granular permissions (can't prevent certain items)
   - No time-based access control

2. **Multi-seat State**
   - orderedSeats tracked in hook
   - But no persistence if user refreshes
   - No ability to edit/cancel seats after submission

3. **Voice Parsing**
   - Relies on OpenAI Realtime API confidence
   - Fallback to touch input is intentional design
   - Could be better documented in UI

---

## 8. WHERE VOICEORDERMODAL FITS IN

### Current Position
```
ServerView (orchestrator)
├─ [BEFORE: Table/Seat Selection]
│  └─ ServerFloorPlan (table grid click)
│
├─ [MIDDLE: Seat Selection]
│  └─ SeatSelectionModal (pick which seat gets order)
│
├─ [ACTIVE: Order Taking]
│  └─ VoiceOrderModal ← YOU ARE HERE
│      ├─ Voice input (VoiceControlWebRTC)
│      ├─ Touch input (MenuGrid + ItemDetailModal)
│      └─ Item management (Q+/Q-, edit, remove)
│
├─ [AFTER: Confirmation]
│  └─ PostOrderPrompt (add next seat or finish)
│
└─ [ALWAYS] ServerStats (dashboard)
```

### Responsibilities of VoiceOrderModal
1. **Accept voice input** via VoiceControlWebRTC
2. **Accept touch input** via MenuGrid + ItemDetailModal
3. **Display live transcript** while listening
4. **Show order items** with prices & modifiers
5. **Allow modifications** (quantity, remove, edit)
6. **Display total** with tax calculation
7. **Submit to backend** via submitOrder()
8. **Handle errors** gracefully (unmatched items)

### What It Doesn't Do
- Floor plan selection (ServerFloorPlan)
- Seat selection (SeatSelectionModal)
- Post-order routing (PostOrderPrompt)
- Table status updates (would be useTableInteraction)
- Kitchen display (separate KitchenDisplay page)
- Payment handling (separate checkout flow)

---

## 9. COMPLETE USER JOURNEY SEQUENCE

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: SERVER AUTHENTICATION                                   │
├─────────────────────────────────────────────────────────────────┤
│ URL: /pin-login or /login                                        │
│ Action: Enter PIN (4-6 digits) or email/password                │
│ Auth Hook: loginWithPin() or login() from useAuth()             │
│ Redirect: /server (after successful auth)                       │
│ State: Auth token stored in localStorage & Supabase session     │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: SERVER VIEW LOADS                                       │
├─────────────────────────────────────────────────────────────────┤
│ URL: /server                                                     │
│ Component: ServerView + useServerView hook                      │
│ API: GET /api/v1/tables (with x-restaurant-id header)          │
│ State:                                                           │
│  - tables: Table[] loaded from database                         │
│  - isLoading: false                                              │
│  - stats calculated (available, occupied, reserved)             │
│ Display:                                                         │
│  - Interactive floor plan (color-coded by status)               │
│  - Stats cards showing occupancy                                │
│ Refresh: Poll every 30 seconds                                  │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: CLICK TABLE ON FLOOR PLAN                               │
├─────────────────────────────────────────────────────────────────┤
│ Action: User clicks on a table square (green = available)       │
│ Handler: handleTableSelection(tableId)                          │
│  - setSelectedTableId(tableId)                                  │
│  - setShowSeatSelection(true)                                   │
│ Effect: SeatSelectionModal opens                               │
│ Display:                                                         │
│  - Shows table label (e.g., "Table A")                          │
│  - Seat grid 3 columns × ceil(capacity/3) rows                  │
│  - Green seats = already have orders                            │
│  - Blue border on selected seat                                 │
│  - "Start Voice Order" button (disabled if no seat)             │
│  - "Finish Table" button (if any seats ordered)                 │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: SELECT SEAT                                             │
├─────────────────────────────────────────────────────────────────┤
│ Action: User clicks a seat number (e.g., Seat 2)               │
│ Handler: onSeatSelect(seat)                                    │
│  - setSelectedSeat(2)                                           │
│ Visual Feedback:                                                │
│  - Blue border + ring on selected seat                          │
│  - "Start Voice Order" button now enabled                       │
│ State: selectedSeat = 2                                         │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: START VOICE ORDER                                       │
├─────────────────────────────────────────────────────────────────┤
│ Action: User clicks "Start Voice Order" button                  │
│ Handler: handleStartVoiceOrder()                                │
│  - Validates selectedTableId && selectedSeat                   │
│  - voiceOrder.setShowVoiceOrder(true)                          │
│ Effect:                                                         │
│  - SeatSelectionModal closes                                    │
│  - VoiceOrderModal opens                                        │
│ Display:                                                         │
│  - Header: "Order - Table A, Seat 2"                            │
│  - Input mode toggle (Voice/Touch)                              │
│  - VOICE MODE:                                                  │
│    • VoiceControlWebRTC component with mic button              │
│    • Live transcript area                                       │
│    • Empty order items list                                     │
│  - TOUCH MODE (if toggled):                                     │
│    • MenuGrid (left panel) with category filter                │
│    • Order items list (right panel)                             │
│ State:                                                          │
│  - voiceOrder.showVoiceOrder = true                            │
│  - orderItems = []                                              │
│  - currentTranscript = ''                                       │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6A: ADD ITEMS VIA VOICE                                    │
├─────────────────────────────────────────────────────────────────┤
│ Action: User holds down microphone button and speaks            │
│ Flow:                                                            │
│  1. VoiceControlWebRTC streams audio to OpenAI Realtime API    │
│  2. User says: "I'll have a Greek salad with extra feta"       │
│  3. API processes and calls add_to_order() function            │
│  4. handleOrderData() receives:                                │
│     {                                                           │
│       items: [{                                                │
│         name: "Greek Salad",                                    │
│         quantity: 1,                                            │
│         modifiers: ["extra feta"]                               │
│       }]                                                        │
│     }                                                           │
│  5. OrderParser.findBestMenuMatch("Greek Salad")              │
│     - Fuzzy matching against loaded menu items                │
│     - Returns: { item, confidence }                            │
│     - Requires confidence > 0.5                                │
│  6. Create OrderItem:                                          │
│     {                                                          │
│       id: "voice-xxx",                                         │
│       menuItemId: "uuid-from-menu",                            │
│       name: "Greek Salad",                                     │
│       quantity: 1,                                             │
│       modifications: [{name: "extra feta", price: 2.00}],     │
│       source: "voice",                                         │
│       price: 12.99                                             │
│     }                                                          │
│  7. setOrderItems([...prev, newItem])                          │
│  8. Toast: "Added 1 item to order"                             │
│  9. currentTranscript displayed during listening               │
│  10. Clears after 3 seconds if final                           │
│                                                                │
│ Display Update:                                                │
│  - New item appears in "Order Items" list                      │
│  - Shows: Qty badge | Name | Modifiers | Price                │
│  - Shows source badge: "Voice"                                 │
│  - Q+/Q- buttons for quantity adjustment                       │
│  - Edit button (pencil icon) to change modifiers              │
│  - Remove button (trash icon)                                  │
│ Error Handling:                                                │
│  - If unmatched: Toast "Could not find menu items: X"         │
│  - Item NOT added (integrity check)                            │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6B: ADD ITEMS VIA TOUCH                                    │
├─────────────────────────────────────────────────────────────────┤
│ Action: User toggles to "Touch" mode                            │
│ Display:                                                         │
│  - MenuGrid appears (left panel)                                │
│  - Category filter dropdown                                     │
│  - Menu items as cards with prices                              │
│  - Touch mode indicator                                         │
│ Action: User clicks on item (e.g., "Burger")                   │
│ Handler: handleTouchItemClick(item)                            │
│  - setSelectedMenuItem(item)                                    │
│  - setIsItemModalOpen(true)                                     │
│ Display:                                                         │
│  - ItemDetailModal opens                                        │
│  - Shows: Item name, image, description                        │
│  - Modifier selection (checkboxes with prices)                 │
│  - Quantity selector (+/- buttons)                              │
│  - "Add to Order" button                                        │
│ Action: User selects modifiers, qty, clicks "Add to Order"    │
│ Handler: handleAddToOrder(cartItem)                            │
│  - Converts CartItem to OrderItem:                             │
│    {                                                           │
│      id: generated,                                            │
│      menuItemId: cartItem.menuItemId,                          │
│      name: cartItem.name,                                      │
│      quantity: cartItem.quantity,                              │
│      source: "touch",                                          │
│      price: cartItem.price,                                    │
│      modifications: [{ id, name, price }]                      │
│    }                                                           │
│  - setOrderItems([...prev, newItem])                           │
│  - ItemDetailModal closes                                      │
│ Display Update:                                                │
│  - Item appears in "Order Items" list                          │
│  - Shows source badge: "Touch"                                 │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: MANAGE ORDER ITEMS                                      │
├─────────────────────────────────────────────────────────────────┤
│ User can modify items before submission:                        │
│                                                                 │
│ A) CHANGE QUANTITY                                              │
│    - Click Q+ button → quantity increases (max 99)             │
│    - Click Q- button → quantity decreases (min 1)              │
│    - Price auto-updates in order total                         │
│                                                                 │
│ B) EDIT MODIFIERS                                               │
│    - Click edit (pencil) button on item                        │
│    - ItemDetailModal opens with current state                  │
│    - Modify selections, quantity                               │
│    - Click "Update" → replaces item in list                    │
│                                                                 │
│ C) REMOVE ITEM                                                  │
│    - Click trash icon                                          │
│    - Confirmation overlay: "Remove this item?"                 │
│    - Click "Yes" → item filtered from orderItems              │
│    - Click "No" → modal closes, item stays                     │
│                                                                 │
│ Display:                                                         │
│  - Badge shows item count: "4 items"                            │
│  - Running total calculated with modifiers                      │
│  - Format: "Send Order (4 items - $43.96)"                     │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: ADD SPECIAL REQUESTS (OPTIONAL)                         │
├─────────────────────────────────────────────────────────────────┤
│ Display:                                                         │
│  - Textarea field below order items                            │
│  - Placeholder: "Add special requests or table notes..."       │
│  - Max 500 characters                                          │
│  - Character counter (e.g., "145/500")                         │
│ Action: User types notes                                       │
│ State: orderNotes = "No onions, allergic to shellfish"       │
│ Use: Appended to order notes field in API payload             │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: SUBMIT ORDER                                            │
├─────────────────────────────────────────────────────────────────┤
│ Preconditions:                                                  │
│  - orderItems.length > 0                                       │
│  - !voiceOrder.isProcessing                                    │
│  - !voiceOrder.isSubmitting                                    │
│ Validation:                                                     │
│  - All items MUST have menuItemId (CRITICAL)                  │
│  - If any item missing menuItemId:                             │
│    Toast: "Cannot submit: X items not recognized..."          │
│    Return: false (order rejected)                              │
│ Action: User clicks "Send Order" button                        │
│ State Change: voiceOrder.setIsSubmitting(true)                │
│ Button State: Spinner shown, text = "Sending..."              │
│ API Call: POST /api/v1/orders                                 │
│  Headers:                                                       │
│    Authorization: "Bearer {token}"                             │
│    X-Restaurant-ID: "{restaurant.id}"                          │
│    X-Client-Flow: "server"                                     │
│  Body:                                                         │
│    {                                                           │
│      "table_number": "Table A",                                │
│      "seat_number": 2,                                         │
│      "items": [                                                │
│        {                                                       │
│          "id": "voice-xxx",                                    │
│          "menu_item_id": "uuid",                               │
│          "name": "Greek Salad",                                │
│          "quantity": 1,                                        │
│          "price": 12.99,                                       │
│          "modifications": ["extra feta"]                       │
│        },                                                      │
│        ...                                                     │
│      ],                                                        │
│      "notes": "No onions, allergic to shellfish\n\n(Voice  │
│               order from Table A, Seat 2)",                   │
│      "total_amount": 14.17,                                   │
│      "customer_name": "Table A - Seat 2",                     │
│      "type": "dine-in"                                        │
│    }                                                           │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9A: SUCCESS PATH                                           │
├─────────────────────────────────────────────────────────────────┤
│ Response: 200 OK                                                │
│  {                                                              │
│    "id": "order-uuid-xxx",                                     │
│    ...other fields                                             │
│  }                                                              │
│ Handler Actions:                                               │
│  1. toast.success("Order submitted for Table A, Seat 2!")    │
│  2. metrics.trackOrderCompleted(sessionId, orderId, itemCt) │
│  3. setOrderedSeats([...prev, 2])  ← Track multi-seat       │
│  4. setLastCompletedSeat(2)                                   │
│  5. setShowPostOrderPrompt(true)                              │
│  6. setOrderItems([])             ← Clear for next seat      │
│  7. setOrderNotes('')                                         │
│  8. setOrderSessionId(null)                                   │
│  9. voiceOrder.setShowVoiceOrder(false)                      │
│  10. VoiceOrderModal closes                                    │
│  11. PostOrderPrompt appears (see STEP 10A)                   │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9B: ERROR PATH                                             │
├─────────────────────────────────────────────────────────────────┤
│ Response: NOT 200 OK (4xx or 5xx)                              │
│  - 400 Bad Request: Invalid items, missing fields               │
│  - 401 Unauthorized: Token expired, need re-auth               │
│  - 500 Server Error: Backend issue                             │
│ Handler Actions:                                               │
│  1. errorText = await response.text()                         │
│  2. console.error('Order submission failed:', errorText)       │
│  3. throw new Error('Failed to submit order')                 │
│  4. Catch error handler:                                       │
│     - toast.error('Failed to submit order. Please try again.')│
│     - return false                                             │
│  5. setIsSubmitting(false)  ← Finally block                   │
│  6. VoiceOrderModal stays open                                │
│  7. Order items preserved                                      │
│  8. User can retry or cancel                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 10A: ADD NEXT SEAT (POST-ORDER PROMPT)                     │
├─────────────────────────────────────────────────────────────────┤
│ Display: PostOrderPrompt modal shows                            │
│  - Success animation (green checkmark, spring)                  │
│  - "Order Submitted!"                                          │
│  - "Seat 2 order has been sent to the kitchen"               │
│  - Progress bar: "2 of 4 seats ordered"                       │
│  - Seat status grid: 1☐ 2✓ 3☐ 4☐                              │
│  - Two buttons:                                                │
│    1. "Add Next Seat" (teal)                                   │
│    2. "Finish Table" (green)                                   │
│ Action: User clicks "Add Next Seat"                            │
│ Handler: handleAddNextSeat()                                   │
│  1. setShowPostOrderPrompt(false)                             │
│  2. setShowVoiceOrder(false)                                  │
│  3. orderedSeats stays: [2] (preserved!)                      │
│  4. Parent component reopens SeatSelectionModal               │
│ Effect:                                                         │
│  - PostOrderPrompt closes                                      │
│  - SeatSelectionModal reopens                                  │
│  - Seat 2 now shows green checkmark                            │
│  - User can select next seat (3, 1, 4, etc.)                  │
│  - Flow repeats: Seat Select → Voice Order → Submit            │
│  - Each seat gets its own order submission                     │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 10B: FINISH TABLE (POST-ORDER PROMPT)                      │
├─────────────────────────────────────────────────────────────────┤
│ Action: User clicks "Finish Table" button                       │
│ Handler: handleFinishTable()                                    │
│  1. setShowPostOrderPrompt(false)                             │
│  2. setShowVoiceOrder(false)                                  │
│  3. setOrderedSeats([])       ← Reset multi-seat tracking    │
│  4. setLastCompletedSeat(null)                                │
│  5. setOrderItems([])                                         │
│  6. setCurrentTranscript('')                                  │
│  7. setIsVoiceActive(false)                                   │
│  8. setIsProcessing(false)                                    │
│  9. toast.success('Table orders complete!')                   │
│  10. setSelectedTableId(null)                                 │
│  11. setSelectedSeat(null)                                    │
│  12. setShowSeatSelection(false)                              │
│ Effect:                                                         │
│  - All modals close                                            │
│  - Table deselected                                            │
│  - Table returns to available on floor plan                    │
│  - User back to main ServerView with floor plan               │
│  - Can select another table or finish shift                    │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 11: NEXT ORDER (OR END SHIFT)                              │
├─────────────────────────────────────────────────────────────────┤
│ Option A: Take another table                                    │
│  - Click on another available (green) table                    │
│  - Repeat from STEP 3                                          │
│                                                                 │
│ Option B: End shift                                             │
│  - Click back button in header                                │
│  - Navigate to dashboard or home                               │
│  - Authentication remains valid                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. CRITICAL CODE PATHS

### Authentication → Server View
```
PinLogin.tsx
  handleSubmit(pin)
    → loginWithPin(pin, restaurantId)
      [from useAuth hook]
      → POST /api/auth/login-with-pin
      → Save token + user
      → navigate('/server')

ServerView renders
  → useServerView hook
    → tableService.getTables()
      → GET /api/v1/tables
        Headers: x-restaurant-id
      → Parse response
      → setTables([...])
```

### Floor Plan → Order Modal
```
ServerFloorPlan.tsx
  <canvas onClick={onTableClick} />
    → handleTableSelection(tableId)
      → setSelectedTableId(tableId)
      → setShowSeatSelection(true)

SeatSelectionModal
  <button onClick={() => onSeatSelect(seat)}>
    → setSelectedSeat(seat)
  
  <button onClick={onStartVoiceOrder}>
    → handleStartVoiceOrder()
      → voiceOrder.setShowVoiceOrder(true)

VoiceOrderModal opens
  → renderVoiceControl OR renderMenuGrid
  → awaiting orderItems
```

### Voice Input → Order Items
```
VoiceControlWebRTC
  microphone button pressed
    → Audio stream → OpenAI Realtime
    → AI processes: "Greek salad"
    → AI calls: add_to_order({items: [{name, qty, mods}]})
    → onOrderDetected callback
      → voiceOrder.handleOrderData(orderData)

handleOrderData()
  → OrderParser.findBestMenuMatch("Greek salad")
    → Fuzzy match against menuItems[]
    → Returns: {item, confidence}
  
  If confidence > 0.5:
    → Create OrderItem with menuItemId
    → setOrderItems([...prev, newItem])
    → toast.success("Added 1 item")
  Else:
    → toast.error("Could not find...")
```

### Order Submission → Kitchen
```
VoiceOrderModal
  <button onClick={handleSubmit}>
    → submitOrder(selectedTable, selectedSeat)
      → Validate all items have menuItemId
      → Get auth token
      → Calculate total with tax
      → POST /api/v1/orders
        Headers: Authorization, X-Restaurant-ID, X-Client-Flow
        Body: table, seat, items, notes, total
      
      If 200 OK:
        → toast.success("Order submitted!")
        → setOrderedSeats([...prev, seat])
        → setShowPostOrderPrompt(true)
        → voiceOrder.setShowVoiceOrder(false)
      
      Else:
        → toast.error("Failed to submit...")
        → return false
        → Modal stays open
```

---

## 11. WHAT'S BUILT VS WHAT'S MISSING

### BUILT
- [x] Authentication (PIN/email)
- [x] Floor plan rendering with table selection
- [x] Seat selection modal for multi-seat ordering
- [x] Voice input integration with OpenAI Realtime
- [x] Touch/menu grid input with modifiers
- [x] Order item management (Q+/Q-, edit, remove)
- [x] Order submission to backend
- [x] Post-order prompt (add next seat or finish)
- [x] Multi-seat tracking (orderedSeats array)
- [x] Special requests/notes field
- [x] Order stats dashboard
- [x] Error handling & validation
- [x] Metrics/analytics tracking
- [x] Toast notifications

### PARTIALLY BUILT (Needs Work)
- [ ] Order history/visibility
  - Current: No way to see submitted orders
  - Needed: Card showing "Recent Orders for This Table"
  
- [ ] Menu search/filtering
  - Current: Basic category dropdown
  - Needed: Search across all items, dietary filters
  
- [ ] Table management
  - Current: Status from database only
  - Needed: Mark as cleaning, reserved, merge tables

- [ ] Touch mode polish
  - Current: Works but UX could be streamlined
  - Needed: Faster item selection, favorites

- [ ] Voice confidence feedback
  - Current: Silent failures (unmatched items just error)
  - Needed: "Did you mean X?" disambiguation

### NOT BUILT
- [ ] Payment handling (separate checkout flow)
- [ ] Tip/gratuity screen
- [ ] Order modifications after submission
- [ ] Split bills between seats
- [ ] Kitchen display integration
- [ ] Order timeout/reminders
- [ ] Manager overrides/special pricing
- [ ] Accessibility features (keyboard nav, screen reader)
