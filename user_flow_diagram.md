# SERVER ORDER FLOW - VISUAL DIAGRAMS

## 1. COMPONENT TREE & DATA FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ServerView.tsx                                   │
│                        (Main Orchestrator)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  useServerView()              useTableInteraction()    useVoiceOrderWebRTC() │
│  ├─ tables[]                  ├─ handleTableClick()    ├─ orderItems[]      │
│  ├─ selectedTableId           └─ utilities             ├─ orderedSeats[]    │
│  ├─ selectedTable                                      ├─ submitOrder()     │
│  └─ stats                                              └─ state mgmt        │
│                                                                               │
│  State:                                                                       │
│  ├─ showSeatSelection: boolean                                              │
│  ├─ selectedSeat: number | null                                             │
│  └─ orderNotes: string                                                      │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │ Renders:                                                    │             │
│  ├────────────────────────────────────────────────────────────┤             │
│  │                                                              │             │
│  │  1. ServerHeader                                             │             │
│  │     ├─ Back button                                           │             │
│  │     └─ Restaurant name + "Server View"                      │             │
│  │                                                              │             │
│  │  2. ServerFloorPlan (visible always)                         │             │
│  │     ├─ Canvas-based rendering                               │             │
│  │     ├─ Table click → handleTableSelection()                │             │
│  │     ├─ Color-coded by status                                │             │
│  │     └─ Pan/zoom controls                                    │             │
│  │                                                              │             │
│  │  3. SeatSelectionModal (visible when showSeatSelection)     │             │
│  │     ├─ Show/hide depends on: show && selectedTable          │             │
│  │     ├─ 3-column seat grid                                   │             │
│  │     ├─ Seat click → setSelectedSeat()                       │             │
│  │     ├─ "Start Voice Order" → handleStartVoiceOrder()       │             │
│  │     └─ "Finish Table" → handleFinishTableFromSeatModal()   │             │
│  │                                                              │             │
│  │  4. VoiceOrderModal (visible when showVoiceOrder)           │             │
│  │     ├─ Show/hide depends on: show && selectedTable && seat  │             │
│  │     ├─ OrderInputSelector (Voice/Touch toggle)              │             │
│  │     ├─ VOICE MODE:                                           │             │
│  │     │  ├─ VoiceControlWebRTC                                │             │
│  │     │  ├─ Transcript display                                │             │
│  │     │  └─ Voice item processing                             │             │
│  │     ├─ TOUCH MODE:                                           │             │
│  │     │  ├─ MenuGrid (left panel)                             │             │
│  │     │  ├─ Category filter                                   │             │
│  │     │  └─ ItemDetailModal                                   │             │
│  │     ├─ Order items list (all modes)                         │             │
│  │     │  ├─ Q+/Q- buttons                                     │             │
│  │     │  ├─ Edit button                                       │             │
│  │     │  └─ Remove button                                     │             │
│  │     ├─ Special requests textarea                            │             │
│  │     ├─ Order total with tax                                 │             │
│  │     └─ "Send Order" button                                  │             │
│  │                                                              │             │
│  │  5. PostOrderPrompt (visible when showPostOrderPrompt)      │             │
│  │     ├─ Success animation                                    │             │
│  │     ├─ Progress bar                                         │             │
│  │     ├─ Seat status grid                                     │             │
│  │     ├─ "Add Next Seat" → handleAddNextSeat()               │             │
│  │     └─ "Finish Table" → handleFinishTable()                │             │
│  │                                                              │             │
│  │  6. ServerStats (visible always)                            │             │
│  │     ├─ Available/Occupied/Reserved tables                  │             │
│  │     └─ Available seats                                      │             │
│  │                                                              │             │
│  │  7. Instructions card                                       │             │
│  │     └─ How-to guide                                         │             │
│  │                                                              │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. STATE FLOW DIAGRAM

```
┌──────────────────┐
│  Server Logs In  │
│  /pin-login or   │
│  /login          │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────┐
│  /server loads           │
│  useServerView() runs    │
│  GET /api/v1/tables      │
│  tables[] populated      │
│  selectedTableId = null  │
│  showSeatSelection=false │
└────────┬─────────────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│ ServerFloorPlan renders                  │
│ User sees all tables (color-coded)       │
│ (waiting for user click)                 │
└────────┬─────────────────────────────────┘
         │
    (user clicks table)
         │
         ↓
┌──────────────────────────────────────────┐
│ handleTableSelection(tableId)             │
│ ├─ setSelectedTableId(tableId)           │
│ └─ setShowSeatSelection(true)            │
│                                          │
│ State:                                   │
│ ├─ selectedTableId = "table-123"         │
│ ├─ selectedTable = {id,label,capacity}  │
│ └─ showSeatSelection = true              │
└────────┬─────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│ SeatSelectionModal renders               │
│ Shows seats 1 to capacity                │
│ Green seats = orderedSeats               │
│ (waiting for seat selection)             │
└────────┬─────────────────────────────────┘
         │
    (user clicks seat)
         │
         ↓
┌──────────────────────────────────────────┐
│ onSeatSelect(seat)                       │
│ setSelectedSeat(seat)                    │
│                                          │
│ State:                                   │
│ └─ selectedSeat = 2 (example)            │
└────────┬─────────────────────────────────┘
         │
    (user clicks "Start Voice Order")
         │
         ↓
┌──────────────────────────────────────────┐
│ handleStartVoiceOrder()                  │
│ ├─ Validate selectedTableId exists       │
│ ├─ Validate selectedSeat exists          │
│ └─ voiceOrder.setShowVoiceOrder(true)   │
│                                          │
│ State:                                   │
│ ├─ showVoiceOrder = true                 │
│ └─ orderItems = []                       │
└────────┬─────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────┐
│ VoiceOrderModal renders                        │
│ ├─ Input mode toggle (Voice/Touch)             │
│ ├─ VOICE: VoiceControlWebRTC                   │
│ ├─ Order items list (empty)                    │
│ └─ "Send Order" button (disabled)              │
│ (waiting for voice input or menu selection)   │
└────────┬───────────────────────────────────────┘
         │
    (user speaks or clicks menu item)
         │
    ┌────┴────┐
    │          │
    ↓          ↓
[VOICE]    [TOUCH]
    │          │
    ↓          ↓
┌────────────┐  ┌────────────────────────┐
│ VOICE      │  │ MenuGrid renders       │
│ INPUT      │  │ ├─ Category filter     │
│ PROCESSING │  │ └─ Menu items          │
│            │  │ ItemDetailModal opens  │
│ OpenAI     │  │ ├─ Modifiers select    │
│ Realtime   │  │ ├─ Qty selector        │
│ API        │  │ └─ "Add to Order"      │
│ ↓          │  │    button              │
│ add_to_    │  │ (user clicks item)     │
│ order()    │  │    │                   │
│ function   │  │    ↓                   │
│ ↓          │  │ handleAddToOrder()     │
│ handleOrder│  │ Converts CartItem →    │
│ Data()     │  │ OrderItem              │
│ ↓          │  │ setOrderItems([...])   │
│ Match      │  │ ItemDetailModal closes │
│ menu item  │  │                        │
│ with       │  └─────────┬──────────────┘
│ OrderParser│          │
│ ↓          │          │
│ Confidence │    ┌─────┴──────┐
│ > 0.5?     │    │            │
│ ├─ YES:    │    ↓            ↓
│ │ Add item │   (loop back)  (item added)
│ │          │   (add more)    │
│ ├─ NO:     │               │
│ │ Toast    │               │
│ │ error    │               │
│ └─────┬────┘               │
│       │                    │
└───────┴────────────────────┘
        │
        ↓
┌──────────────────────────────────────────┐
│ Order items list updates                 │
│ Shows all added items with:              │
│ ├─ Name                                  │
│ ├─ Quantity                              │
│ ├─ Modifications                         │
│ ├─ Price                                 │
│ ├─ Source badge (Voice/Touch)            │
│ ├─ Q+/Q- buttons                         │
│ ├─ Edit button                           │
│ └─ Remove button                         │
│                                          │
│ Running total calculated                 │
│ "Send Order" button enabled              │
└────────┬─────────────────────────────────┘
         │
    (user adds more items OR user clicks Send Order)
         │
    ┌────┴──────────────┐
    │ (add more items?) │
    │ YES ↓ or NO ↓     │
    │      or           │
    └──────────┬────────┘
              │
              ↓
    ┌──────────────────────┐
    │ handleSubmitOrder()  │
    │ ├─ Validate items[]  │
    │ ├─ All have         │
    │ │  menuItemId?      │
    │ └─ YES ↓  or NO ↓   │
    │        or           │
    └────┬──────────┬──────┘
         │ NO       │ YES
         │          │
         ↓          ↓
    [ERROR]    [SUBMIT]
         │          │
         ↓          ↓
    Toast         POST
    error         /api/v1/orders
    Items stay    │
    in modal      ├─ Table: "A"
                  ├─ Seat: 2
                  ├─ Items: [...]
                  ├─ Notes: "..."
                  ├─ Total: 14.17
                  └─ Type: "dine-in"
                  │
         ┌────────┴────────┐
         │ Response?       │
         │ 200 OK? or ERR? │
         └────┬────────┬───┘
              │        │
              ↓ YES    ↓ NO
             [OK]   [ERROR]
              │        │
              ↓        ↓
         ┌────────┐  Toast
         │ Success│  error
         │ Seq    │  Order
         │        │  stays
         └────┬───┘
              │
              ↓
        ┌─────────────────────────┐
        │ toast.success()         │
        │ metrics.trackOrder      │
        │ Completed()             │
        │ setOrderedSeats([2])    │
        │ setShowPost             │
        │ OrderPrompt(true)       │
        │ Clear orderItems[]      │
        │ Close VoiceOrderModal   │
        └────────┬────────────────┘
                 │
                 ↓
        ┌──────────────────────────┐
        │ PostOrderPrompt renders  │
        │ ├─ Success animation     │
        │ ├─ Progress: 1 of 4      │
        │ ├─ Seat grid ☐ ✓ ☐ ☐   │
        │ ├─ "Add Next Seat"       │
        │ └─ "Finish Table"        │
        └────┬──────────┬──────────┘
             │          │
             │ click    │ click
             │ ADD      │ FINISH
             ↓          ↓
        ┌────────┐  ┌──────────────┐
        │ Add    │  │ Finish Table │
        │ Next   │  │              │
        │ Seat   │  │ handleFinish │
        │        │  │ Table()      │
        │ handler│  │              │
        │ Next   │  │ Reset ALL    │
        │ Seat() │  │ State:       │
        │        │  │              │
        │ Close  │  │ -orderedSeats│
        │ Post   │  │ -selectedTable
        │ Order  │  │ -selectedSeat
        │ Prompt │  │ -orderItems[]
        │        │  │ -transcript  │
        │ Reopen │  │              │
        │ Seat   │  │ Show toast   │
        │ Select │  │ "Table       │
        │ Modal  │  │ orders       │
        │        │  │ complete!"   │
        │ Display│  │              │
        │ seats  │  │ Return to    │
        │ with   │  │ ServerView   │
        │ Seat 2 │  │ with empty   │
        │ checked│  │ selection    │
        │        │  │              │
        │ User   │  │ (table now   │
        │ selects│  │ shows as     │
        │ next   │  │ available on │
        │ seat   │  │ floor plan)  │
        │ (repeat│  │              │
        │ order  │  │ Can select   │
        │ flow)  │  │ new table    │
        └────────┘  └──────────────┘
```

---

## 3. MODAL VISIBILITY STATE MACHINE

```
Start: All modals hidden
├─ showSeatSelection = false
├─ showVoiceOrder = false
├─ showPostOrderPrompt = false
└─ (ServerFloorPlan visible)

         ↓
[Table Click]
         ↓
showSeatSelection = true
├─ SeatSelectionModal visible
├─ VoiceOrderModal hidden
└─ PostOrderPrompt hidden

         ↓
[Seat Selected + "Start Voice Order"]
         ↓
showSeatSelection = false  ← CLOSES
showVoiceOrder = true      ← OPENS
showPostOrderPrompt = false
├─ SeatSelectionModal hidden
├─ VoiceOrderModal visible
└─ PostOrderPrompt hidden

         ↓
[Order Submitted - Success]
         ↓
showSeatSelection = false
showVoiceOrder = false     ← CLOSES
showPostOrderPrompt = true ← OPENS
├─ SeatSelectionModal hidden
├─ VoiceOrderModal hidden
└─ PostOrderPrompt visible

         ↓
[User clicks "Add Next Seat"]
         ↓
showSeatSelection = true   ← REOPENS
showVoiceOrder = false
showPostOrderPrompt = false ← CLOSES
├─ SeatSelectionModal visible
├─ VoiceOrderModal hidden
└─ PostOrderPrompt hidden

    (Loop back: Seat selection → Voice Order → Post Order)

                OR

[User clicks "Finish Table"]
         ↓
showSeatSelection = false
showVoiceOrder = false
showPostOrderPrompt = false ← CLOSES
├─ All modals closed
├─ ServerFloorPlan visible again
└─ orderedSeats reset to []

                OR

[User clicks "Cancel" on VoiceOrderModal]
         ↓
showSeatSelection = false
showVoiceOrder = false ← CLOSES
showPostOrderPrompt = false
├─ All modals closed
├─ ServerFloorPlan visible again
└─ orderedSeats PRESERVED (can resume later)
```

---

## 4. API CALL SEQUENCE

```
CLIENT                              SERVER

[1. LOAD FLOOR PLAN]
GET /api/v1/tables
├─ Headers: x-restaurant-id: "grow"
├─ Auth: None (or implicit)
│
└─────────────────────────────→   [getTableHandler]
                                  ├─ Query database
                                  ├─ Filter by restaurant_id
                                  └─ Return Table[]
  
  Response 200 OK
  ←───────────────────────────────
  {
    "tables": [
      {
        "id": "tbl-1",
        "label": "Table A",
        "capacity": 4,
        "status": "available",
        "position": {x, y},
        ...
      },
      ...
    ]
  }

[2. SUBMIT ORDER FOR SEAT]
POST /api/v1/orders
├─ Headers:
│  ├─ Authorization: Bearer {token}
│  ├─ X-Restaurant-ID: "grow"
│  └─ X-Client-Flow: "server"
│
├─ Body:
│  {
│    "table_number": "Table A",
│    "seat_number": 2,
│    "items": [
│      {
│        "id": "item-123",
│        "menu_item_id": "menu-456",
│        "name": "Greek Salad",
│        "quantity": 1,
│        "price": 12.99,
│        "modifications": ["extra feta"]
│      },
│      ...
│    ],
│    "notes": "Special request\n\n(Voice order...)",
│    "total_amount": 14.17,
│    "customer_name": "Table A - Seat 2",
│    "type": "dine-in"
│  }
│
└─────────────────────────────→   [postOrderHandler]
                                  ├─ Validate auth token
                                  ├─ Parse items
                                  ├─ Create order record
                                  ├─ Update table status
                                  ├─ Route to KDS
                                  └─ Return order response
  
  Response 200 OK
  ←───────────────────────────────
  {
    "id": "order-789",
    "status": "new",
    "created_at": "2025-11-07T...",
    ...
  }

[3. FETCH UPDATED TABLES (Every 30 seconds)]
GET /api/v1/tables
│
└─────────────────────────────→   [getTableHandler]
                                  ├─ Fetch current state
                                  ├─ Check table statuses
                                  └─ Return updated Table[]
  
  Response 200 OK
  ←───────────────────────────────
  {
    "tables": [
      {
        "id": "tbl-1",
        "label": "Table A",
        "capacity": 4,
        "status": "occupied",  ← CHANGED
        "current_order_id": "order-789",
        ...
      },
      ...
    ]
  }
```

---

## 5. ORDER ITEM LIFECYCLE

```
┌─ CREATED ─────────────────────────────────────────────────┐
│                                                            │
│ Voice Input:                                              │
│ ├─ User speaks: "Greek salad"                            │
│ ├─ OpenAI Realtime API processes                         │
│ ├─ Calls add_to_order()                                  │
│ ├─ handleOrderData() receives parsed item                │
│ ├─ OrderParser matches menu item                         │
│ └─ Create OrderItem object                               │
│                                                            │
│ OR Touch Input:                                           │
│ ├─ User clicks menu item                                 │
│ ├─ ItemDetailModal opens                                 │
│ ├─ User selects modifiers + qty                          │
│ ├─ Clicks "Add to Order"                                 │
│ └─ handleAddToOrder() creates OrderItem                  │
│                                                            │
└───────────────────┬──────────────────────────────────────┘
                   │
                   ↓
        ┌─ IN ORDER ITEMS LIST ─────────┐
        │                                │
        │ OrderItem {                    │
        │ ├─ id: string                  │
        │ ├─ menuItemId: string          │
        │ ├─ name: "Greek Salad"         │
        │ ├─ quantity: 1                 │
        │ ├─ modifications: [...]        │
        │ ├─ source: "voice"|"touch"     │
        │ └─ price: 12.99                │
        │ }                              │
        │                                │
        │ Displayed as:                  │
        │ ├─ [1] Greek Salad             │
        │ │     "extra feta"             │
        │ │     $12.99                   │
        │ ├─ Q+ / [1] / Q-               │
        │ ├─ Edit button                 │
        │ └─ Remove button               │
        │                                │
        └────────┬──────────────────────┘
                 │
         ┌───────┴───────┬──────────────┐
         │               │              │
    [ADD MORE]      [EDIT]          [REMOVE]
    [ITEMS]         │                │
         │           ↓                ↓
         │      ┌─────────┐      ┌──────────┐
         │      │ Open    │      │Remove    │
         │      │ItemDetail       Confirm? │
         │      │Modal   │       │          │
         │      ├─ Mods  │       │ YES ↓    │
         │      ├─ Qty   │       │ NO ↓     │
         │      └ Update │       │          │
         │         Item  │       └─┬────┬──┘
         │        │      │         │    │
         │        └──────┘         │    │
         │           │             │    │
         │           ↓             ↓    ↓
         │      [Updated]       [Removed] [Kept]
         │           │             │      │
         └───────────┴─────────────┴──────┘
                     │
                     ↓
            [WAITING FOR SUBMIT]
                     │
         ┌───────────┴──────────────┐
         │                          │
    [CANCELLED]              [SUBMITTED]
    (close modal)                 │
    orderItems[] cleared      POST /api/v1/orders
    state reset                   │
                                  ↓
                           ┌──────────────────┐
                           │ Response 200 OK  │
                           │                  │
                           │ Order created    │
                           │ on server        │
                           │                  │
                           │ → KDS            │
                           │ → Kitchen        │
                           │                  │
                           │ Items "owned"    │
                           │ by order_id      │
                           └──────────────────┘
```

---

## 6. MULTI-SEAT TRACKING STATE

```
Start: orderedSeats = []

[Table Clicked]
├─ selectedTableId set
├─ selectedTable loaded (capacity: 4)
└─ SeatSelectionModal opens
   ├─ Seat 1: available (light)
   ├─ Seat 2: available (light)
   ├─ Seat 3: available (light)
   └─ Seat 4: available (light)

[Seat 1 Selected + Voice Order Submitted]
└─ submitOrder() success
   ├─ setOrderedSeats([1])          ← Track
   ├─ setShowPostOrderPrompt(true)
   └─ setShowVoiceOrder(false)

[Post-Order Prompt Shows]
├─ Progress: "1 of 4 seats ordered"
├─ Progress bar: [████░░░░░]
└─ Seat grid:
   ├─ Seat 1: ✓ (green)             ← Ordered
   ├─ Seat 2: ☐ (gray)              ← Pending
   ├─ Seat 3: ☐ (gray)              ← Pending
   └─ Seat 4: ☐ (gray)              ← Pending

[User clicks "Add Next Seat"]
├─ SeatSelectionModal reopens
├─ orderedSeats still = [1]
└─ Seat grid shows:
   ├─ Seat 1: ✓ (green) [disabled]  ← Already ordered
   ├─ Seat 2: ☐ (light) [clickable] ← Available
   ├─ Seat 3: ☐ (light) [clickable] ← Available
   └─ Seat 4: ☐ (light) [clickable] ← Available

[Seat 3 Selected + Voice Order Submitted]
└─ submitOrder() success
   ├─ setOrderedSeats([1, 3])       ← Updated
   ├─ setShowPostOrderPrompt(true)
   └─ setShowVoiceOrder(false)

[Post-Order Prompt Shows]
├─ Progress: "2 of 4 seats ordered"
├─ Progress bar: [████████░░]
└─ Seat grid:
   ├─ Seat 1: ✓ (green)
   ├─ Seat 2: ☐ (gray)
   ├─ Seat 3: ✓ (green)             ← Now ordered!
   └─ Seat 4: ☐ (gray)

[User clicks "Add Next Seat"]
├─ SeatSelectionModal reopens
└─ Seat grid shows:
   ├─ Seat 1: ✓ (green) [disabled]
   ├─ Seat 2: ☐ (light) [clickable]
   ├─ Seat 3: ✓ (green) [disabled]
   └─ Seat 4: ☐ (light) [clickable]

[Seat 2 Selected + Voice Order Submitted]
└─ submitOrder() success
   ├─ setOrderedSeats([1, 3, 2])
   ├─ setShowPostOrderPrompt(true)
   └─ setShowVoiceOrder(false)

[Post-Order Prompt Shows]
├─ Progress: "3 of 4 seats ordered"
├─ Progress bar: [████████████░]
└─ Seat grid:
   ├─ Seat 1: ✓ (green)
   ├─ Seat 2: ✓ (green)             ← Now ordered!
   ├─ Seat 3: ✓ (green)
   └─ Seat 4: ☐ (gray)

[User clicks "Finish Table"]
├─ handleFinishTable()
├─ setOrderedSeats([])              ← RESET
├─ selectedTableId = null
├─ selectedSeat = null
├─ showSeatSelection = false
├─ showPostOrderPrompt = false
└─ All modals close, ServerView ready for next table

Table "A" back on floor plan as "available"
(3 orders sent to kitchen from Table A: Seats 1, 2, 3)
```

---

## 7. ERROR HANDLING PATHS

```
VoiceOrderModal
├─ Submit Order
└─ submitOrder()
   │
   ├─ [Validation Error]
   │  ├─ orderItems.length === 0
   │  │  └─ Toast: "No order items to submit"
   │  │     Return: false
   │  │     Modal stays open
   │  │
   │  ├─ selectedTable === null
   │  │  └─ Toast: "No order items to submit"
   │  │     Return: false
   │  │
   │  ├─ selectedSeat === null
   │  │  └─ Toast: "No order items to submit"
   │  │     Return: false
   │  │
   │  ├─ Items missing menuItemId
   │  │  └─ Toast: "Cannot submit: X items not recognized"
   │  │     Return: false
   │  │     Modal stays open
   │  │     (user must remove or fix items)
   │  │
   │  ├─ isSubmitting === true
   │  │  └─ Guard: Skip duplicate submission
   │  │     Return: false
   │  │
   │  └─ !token
   │     └─ Toast: "Please log in to submit orders"
   │        Return: false
   │
   ├─ [Auth Error]
   │  ├─ token === null/undefined
   │  │  └─ Toast: "Please log in to submit orders"
   │  │     Return: false
   │  │
   │  └─ restaurantId === null (feature flag enabled)
   │     └─ Toast: "Restaurant context not loaded"
   │        Return: false
   │
   ├─ [Network Error]
   │  ├─ Response 400 Bad Request
   │  │  └─ toast.error("Failed to submit order...")
   │  │     console.error(errorText)
   │  │     setIsSubmitting(false)
   │  │     Return: false
   │  │     Modal stays open
   │  │
   │  ├─ Response 401 Unauthorized
   │  │  └─ toast.error("Failed to submit order...")
   │  │     May need re-login
   │  │
   │  ├─ Response 500 Server Error
   │  │  └─ toast.error("Failed to submit order...")
   │  │     Check server logs
   │  │
   │  └─ Network timeout
   │     └─ Catch error handler
   │        toast.error("Failed to submit order...")
   │        setIsSubmitting(false)
   │        Return: false
   │
   └─ [Success Path]
      ├─ Response 200 OK
      ├─ toast.success("Order submitted...")
      ├─ metrics.trackOrderCompleted()
      ├─ setOrderedSeats([...prev, seat])
      ├─ setShowPostOrderPrompt(true)
      ├─ Clear items & notes
      ├─ setShowVoiceOrder(false)
      └─ Return: true
```

---

## 8. PERMISSION CHECKS

```
At /server route entry:
  RoleGuard(['server', 'admin'])
  ├─ User role checked
  ├─ If not server or admin
  │  └─ Redirect to UnauthorizedPage
  └─ If server or admin
     └─ Allow entry

In VoiceOrderModal:
  canCreateOrders = hasScope('orders:create')
  ├─ If false (permission check)
  │  ├─ "Start Voice Order" button disabled
  │  ├─ Hover shows tooltip:
  │  │  "You don't have permission to create orders."
  │  │  "Contact your manager."
  │  └─ User cannot place orders
  │
  └─ If true (permission granted)
     ├─ "Start Voice Order" button enabled
     └─ User can place orders

Order submission validation:
  ├─ Must have valid auth token
  ├─ Token checked: Supabase OR localStorage
  ├─ If no token
  │  └─ Toast: "Please log in to submit orders"
  │     return false
  │
  └─ If token valid
     └─ Allow submission
```

