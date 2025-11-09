# Server Order Entry Flow - Comprehensive Exploration

## 1. Server Order Entry UI Architecture

### Main Entry Point: ServerView Page
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/ServerView.tsx`

The ServerView is the primary page for servers to manage dining room orders. Key characteristics:
- **Lines 17-51**: Component initialization with table selection and voice order state
- **Lines 155-163**: Route in AppRoutes (protected by ServerRoute)
- **Role Guard**: Lines 90 - only accessible to 'server' and 'admin' roles

#### Flow Diagram:
```
ServerView (main page)
├── useServerView() [hook]
│   ├── Load floor plan tables
│   ├── Track selected table
│   └── Compute stats
├── useTableInteraction() [hook]
│   └── Handle table click → set selectedTableId
└── useVoiceOrderWebRTC() [hook]
    ├── Manage voice order state
    ├── Process parsed menu items
    └── Submit orders to backend
```

---

## 2. Component Hierarchy: Table Selection to Voice Order

### Component Stack (Rendering Order)

#### Level 1: ServerFloorPlan
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/components/ServerFloorPlan.tsx`
- **Lines 1-20**: Props interface for table click handling
- **Lines 28-93**: Canvas optimization with zoom/pan controls
- **Uses**: FloorPlanCanvas from floor-plan module
- **Interaction**: Click table → `onTableClick(tableId)` → shows SeatSelectionModal

#### Level 2: SeatSelectionModal
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/components/SeatSelectionModal.tsx`
- **Lines 9-31**: Props defining modal interface
- **Lines 21-32**: Modal shows when `show={true && table !== null`
- **Lines 74-112**: Seat grid (3 columns)
  - Each seat shows: Users icon, seat number, "Ordered" badge if already selected
  - Styling: Selected = primary color, Ordered = green-50
  - Click handler: `onSeatSelect(seat)` → updates selectedSeat state
- **Lines 134-150**: "Start Voice Order" button (primary action)
  - Disabled if `!selectedSeat`
  - Color: `#4ECDC4` (teal)
  - Only shown if `canCreateOrders = true`
- **Lines 171-186**: "Finish Table" button (appears when seats have orders)
  - Shows count: `Finish Table ({orderedSeats.length} orders)`

#### Level 3: VoiceOrderModal
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/components/VoiceOrderModal.tsx`
- **Lines 20-46**: Props structure
- **Lines 48-85**: Modal header shows table label and seat number
- **Lines 89-101**: VoiceControlWebRTC component
  - Props passed:
    - `onTranscript`: handles live transcription display
    - `onOrderDetected`: processes AI-detected order items
    - `debug=true`
    - `muteAudioOutput=true` (no voice responses)
- **Lines 104-116**: Transcription display (live text)
  - Updates from `voiceOrder.currentTranscript`
  - Mic icon with pulse animation
- **Lines 118-168**: Order items list
  - Shows quantity and item name
  - Displays modifications as comma-separated list
  - Trash icon to remove individual items
  - Empty state: "No items added yet"
- **Lines 182-199**: Action buttons
  - Cancel (outline)
  - Submit Order (green, disabled if no items)
  - Shows item count: `Submit Order ({voiceOrder.orderItems.length})`

#### Level 4: PostOrderPrompt
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/components/PostOrderPrompt.tsx`
- **Lines 17-26**: Props with progress tracking
- **Lines 47-68**: Success animation (CheckCircle2, spring physics)
- **Lines 71-84**: "Order Submitted!" message with seat number
- **Lines 87-138**: Progress visualization
  - Progress bar showing `orderedSeats.length / totalSeats`
  - Seat status grid (10x10 layout)
  - Ordered seats: green-100 with check mark
  - Pending seats: neutral-100 with seat number
- **Lines 147-167**: Action buttons
  - "Add Next Seat" (teal, `#4ECDC4`)
  - "Finish Table" (green, `#4CAF50`)

---

## 3. Current Server Voice Ordering Implementation

### WebRTC Voice Pipeline

**Main Component**: VoiceControlWebRTC
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/components/VoiceControlWebRTC.tsx`

```
VoiceControlWebRTC (Lines 22-145)
├── useWebRTCVoice() hook [Line 47-55]
│   ├── WebRTCVoiceClient orchestrator
│   ├── OpenAI Realtime API connection
│   └── Function calling for order detection
├── HoldToRecordButton [Line 90-101]
│   ├── Press-and-hold interaction
│   ├── startRecording() / stopRecording()
│   └── Connection state monitoring
└── TranscriptionDisplay [visible in parent]
    └── Shows live transcript text
```

### Hook: useVoiceOrderWebRTC
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useVoiceOrderWebRTC.ts`

**Key Functions**:

1. **handleVoiceTranscript** (Lines 116-135)
   - Normalizes input: string | {text, isFinal}
   - Updates `currentTranscript` state
   - Clears after 3 seconds if final
   - **Note**: Transcript is display-only; AI handles parsing

2. **handleOrderData** (Lines 140-216)
   - **Input**: `{ items: [{name, quantity, modifiers}] }`
   - **Source**: OpenAI Realtime API function-calling
   - **Process**:
     - Uses OrderParser for fuzzy matching (Line 169)
     - Confidence threshold: 0.5+ (Line 171)
     - Maps AI item names to menu UUIDs
     - Creates OrderItem objects with modifications
   - **Fallback**: Toast error with unmatched items

3. **submitOrder** (Lines 224-349)
   - **Validation**:
     - Guard against duplicate submissions (Lines 226-229)
     - Check for items and table/seat (Lines 231-234)
     - Validate all items have menuItemId (Lines 240-251)
   - **Request Structure** (Lines 276-310):
     ```json
     {
       "table_number": selectedTable.label,
       "seat_number": selectedSeat,
       "items": [{id, menu_item_id, name, quantity, price, modifications}],
       "customer_name": "Table X - Seat Y",
       "type": "dine-in",
       "total_amount": subtotal + tax
     }
     ```
   - **Headers** (Lines 278-282):
     - `X-Client-Flow: 'server'`
     - `X-Restaurant-ID: restaurantId`
     - `Authorization: Bearer {token}`
   - **Post-Submit** (Lines 324-327):
     - Add seat to orderedSeats array
     - Show PostOrderPrompt
     - Clear orderItems for next seat

4. **handleAddNextSeat** (Lines 352-357)
   - Closes voice modal and prompt
   - Keeps orderedSeats intact (multi-seat tracking)
   - Parent reopens SeatSelectionModal

5. **handleFinishTable** (Lines 360-371)
   - Closes all modals
   - Resets ALL state
   - Shows "Table orders complete!" toast

### Multi-Seat State Management (Lines 42-45)
```typescript
const [orderedSeats, setOrderedSeats] = useState<number[]>([])
const [showPostOrderPrompt, setShowPostOrderPrompt] = useState(false)
const [lastCompletedSeat, setLastCompletedSeat] = useState<number | null>(null)
```

**Purpose**: Track which seats have orders for a single table

---

## 4. Order Submission Flow

### Backend API Endpoint
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts`

#### POST /api/v1/orders (Lines 39-92)
- **Auth**: `optionalAuth` + `validateBody(OrderPayload)`
- **Client Flow Detection** (Lines 43-46):
  - `X-Client-Flow: 'server'` → staff order (requires auth)
  - `X-Client-Flow: 'online'|'kiosk'` → customer order (anonymous)
- **Scope Check** (Lines 68-70):
  - Requires `orders:create` scope for staff
- **Validation**:
  - Restaurant ID from header or token
  - At least 1 item in order
- **Response**: `201 Created` with full order object

#### POST /api/v1/orders/voice (Lines 94-200+)
- **Purpose**: Legacy voice parsing endpoint
- **Auth**: `authenticate` + `validateRestaurantAccess` + `requireScopes(ORDERS_CREATE)`
- **Input**: `{ transcription, audioUrl?, metadata? }`
- **Process**:
  - Calls AI NLP parser with menu context
  - Maps AI response to order items
  - Returns structured order
- **Note**: Server voice ordering doesn't use this; it parses client-side instead

---

## 5. Button Styles & UI Patterns

### ActionButton Component
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/ui/ActionButton.tsx`

**Props**:
```typescript
interface ActionButtonProps {
  children: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  color?: string              // Hex color (default: '#2A4B5C')
  size?: 'small' | 'medium' | 'large' | 'xl'
  variant?: 'solid' | 'outline' | 'ghost'
  disabled?: boolean
  fullWidth?: boolean
  className?: string
}
```

**Size Classes** (Lines 29-34):
- `small`: px-4 py-2 text-sm
- `medium`: px-6 py-3 text-base
- `large`: px-8 py-4 text-lg
- `xl`: px-10 py-6 text-xl

**Styling** (Lines 44-59):
- `solid`: filled background, white text, shadow
- `outline`: transparent bg, colored border, colored text
- `ghost`: transparent bg, colored text
- **Disabled state**: opacity-50, gray color (#9CA3AF)

**Animations** (Lines 67-70):
- Hover: scale 1.05
- Tap: scale 0.95
- Mount: fade in + slide down (opacity 0→1, y: 10→0)

**Server View Usage**:
- "Start Voice Order": `color="#4ECDC4"`, `size="medium"`, `fullWidth`
- "Finish Table": `color="#4CAF50"`, `size="medium"`, `fullWidth`, with CheckCircle2 icon
- "Add Next Seat": `color="#4ECDC4"`, `size="xl"`, `fullWidth`, with Users icon
- "Submit Order": `color="#4CAF50"`, `size="medium"`, `fullWidth`, with ShoppingCart icon

---

## 6. Table/Seat Selection Flow

### Hook: useTableInteraction
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useTableInteraction.ts`
- Simple wrapper around table click handler
- Sets `selectedTableId` in parent state

### Hook: useServerView
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useServerView.ts`

**Key Features**:
- **Lines 19-85**: `loadFloorPlan()`
  - Calls `tableService.getTables()` (from floor-plan module)
  - Returns array of Table objects with seats, x/y position, status
  - Refetches every 30 seconds (Lines 87-100)
- **Lines 102-120**: Stats computation (memoized)
  - totalTables, availableTables, occupiedTables, reservedTables
  - totalSeats, availableSeats
- **Lines 122-125**: selectedTable lookup (memoized)
  - Finds table by selectedTableId

### Table Type
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/floor-plan/types/index.ts`
```typescript
export interface Table {
  id: string
  restaurant_id: string
  label: string              // "Table 1", "A-2", etc.
  x: number                  // Canvas X position
  y: number                  // Canvas Y position
  width: number              // Pixel width
  height: number             // Pixel height
  seats: number              // Capacity (used for seat grid)
  status: 'available' | 'occupied' | 'reserved' | 'unavailable'
  current_order_id?: string  // If occupied, linked order
  created_at: string
  updated_at: string
}
```

---

## 7. Voice Processing Pipeline (Detailed)

### WebRTCVoiceClient Orchestrator
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts`

**Services Delegated** (Lines 54-79):
1. **VoiceSessionConfig**
   - JWT token fetching (auth)
   - Ephemeral token generation for Realtime API
2. **WebRTCConnection**
   - Peer connection lifecycle
   - Data channel setup
   - Media stream handling
3. **VoiceEventHandler**
   - Realtime API message processing
   - Function call responses (add_to_order, etc.)
   - Transcript emission

### Event Emission (Lines 99-132+)
```typescript
// Wire event handler events
this.eventHandler.on('transcript', (event: TranscriptEvent) => {
  this.emit('transcript', event)  // Propagate to listeners
})

this.eventHandler.on('order.detected', (order: OrderEvent) => {
  this.emit('order.detected', order)  // Function calling result
})
```

### OrderParser (Fuzzy Matching)
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/orders/services/OrderParser.ts`

**Function**: `findBestMenuMatch(itemName: string)`
- Uses fuzzy string matching (likely Levenshtein distance)
- Returns: `{ item: MenuItem | null, confidence: 0-1 }`
- **Usage** (useVoiceOrderWebRTC.ts line 169):
  ```typescript
  const match = orderParserRef.current.findBestMenuMatch(aiItem.name)
  if (match.confidence > 0.5) { /* Use this match */ }
  ```

---

## 8. Authentication & Authorization

### Server Route Protection
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/layout/AppRoutes.tsx`
- **Lines 155-163**: ServerRoute wrapper
  - Checks `hasRole('server')` or `hasRole('admin')`

### Order Creation Scopes
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts`
- **Line 68**: `requireScopes(ApiScope.ORDERS_CREATE)`
- **ServerView.tsx line 31**: `const canCreateOrders = hasScope('orders:create')`
- Used to conditionally hide "Start Voice Order" button (SeatSelectionModal.tsx lines 141-167)

---

## 9. Key Integration Points

### 1. Voice Input → Order Items
```
VoiceControlWebRTC (component)
  → useWebRTCVoice hook
    → WebRTCVoiceClient (service)
      → VoiceEventHandler emits 'order.detected'
        → ServerView captures via useVoiceOrderWebRTC hook
          → handleOrderData processes items
            → OrderParser fuzzy-matches to menu IDs
              → orderItems state updated
```

### 2. Order Items → Submission
```
VoiceOrderModal displays orderItems
  → User clicks "Submit Order"
    → submitOrder(selectedTable, selectedSeat)
      → POST /api/v1/orders
        → OrdersService.createOrder()
          → Database insert
            → Returns orderId
              → setOrderedSeats([...seats, currentSeat])
                → showPostOrderPrompt = true
```

### 3. Multi-Seat Workflow
```
Table Selected → SeatSelectionModal shows
  → Seat Selected → VoiceOrderModal opens
    → Items ordered → PostOrderPrompt shows
      → "Add Next Seat" → SeatSelectionModal reopens
        → Different seat selected
          → VoiceOrderModal opens again (fresh orderItems)
            → Process repeats
      → OR "Finish Table" → All state reset, back to floor plan
```

---

## 10. Key Files Summary

| Component/Feature | File Path | Key Lines |
|---|---|---|
| **Main Page** | `client/src/pages/ServerView.tsx` | 17-51 (init), 155-163 (route) |
| **Floor Plan** | `client/src/pages/components/ServerFloorPlan.tsx` | 15-130 |
| **Seat Selection** | `client/src/pages/components/SeatSelectionModal.tsx` | 21-193 |
| **Voice Order Entry** | `client/src/pages/components/VoiceOrderModal.tsx` | 39-206 |
| **Post-Order Prompt** | `client/src/pages/components/PostOrderPrompt.tsx` | 18-185 |
| **Voice Hook** | `client/src/pages/hooks/useVoiceOrderWebRTC.ts` | 26-430 |
| **Server View Hook** | `client/src/pages/hooks/useServerView.ts` | 8-137 |
| **Voice Component** | `client/src/modules/voice/components/VoiceControlWebRTC.tsx` | 22-145 |
| **WebRTC Client** | `client/src/modules/voice/services/WebRTCVoiceClient.ts` | 51-200+ |
| **Order Parser** | `client/src/modules/orders/services/OrderParser.ts` | - |
| **API Endpoint** | `server/src/routes/orders.routes.ts` | 39-92 (POST /orders) |
| **Action Button** | `client/src/components/ui/ActionButton.tsx` | 17-77 |

---

## 11. State Management Pattern

### ServerView State Lifting
```
ServerView (top-level)
├── selectedTableId (useState)
├── selectedSeat (useState)
├── showSeatSelection (useState)
├── voiceOrder (useVoiceOrderWebRTC return)
│   ├── showVoiceOrder
│   ├── currentTranscript
│   ├── orderItems
│   ├── orderedSeats (multi-seat tracking)
│   ├── showPostOrderPrompt
│   └── lastCompletedSeat
└── Handlers (useCallback)
    ├── handleTableSelection
    ├── handleStartVoiceOrder
    ├── handleSubmitOrder
    ├── handleAddNextSeat
    └── handleFinishTable
```

### Props Flow (Unidirectional)
```
ServerView
├── →ServerFloorPlan
│   └── onTableClick → handleTableSelection
├── →SeatSelectionModal
│   ├── onSeatSelect → setSelectedSeat
│   ├── onStartVoiceOrder → handleStartVoiceOrder
│   └── onFinishTable → handleFinishTableFromSeatModal
├── →VoiceOrderModal
│   ├── onSubmit → handleSubmitOrder
│   └── onClose → handleCloseModals
└── →PostOrderPrompt
    ├── onAddNextSeat → handleAddNextSeat
    └── onFinishTable → handleFinishTable
```

---

## 12. Current Limitations & Edge Cases

1. **Single Restaurant**: Restaurant ID hardcoded or from context
   - Feature flag `NEW_CUSTOMER_ID_FLOW` controls dynamic ID (useVoiceOrderWebRTC.ts line 31)

2. **Menu Loading**: Assumes menu items preloaded
   - Fallback toast if menu not ready (line 153-155)

3. **Tax Calculation**: Uses restaurant tax rate
   - Default 0.08 if not set (useVoiceOrderWebRTC.ts line 304)

4. **Modifications**: Stored as array of modifier names (not IDs)
   - Backend accepts string array (line 295)

5. **No Real-time Updates**: PostOrderPrompt state is local
   - No socket subscription for other server's orders on same table

---

## 13. Integration Points for Touch Ordering

To integrate touch ordering alongside voice, these are the key touchpoints:

1. **VoiceOrderModal** (lines 39-206):
   - Currently shows voice control + items list
   - Could add touch menu item grid here

2. **useVoiceOrderWebRTC** (lines 26-430):
   - `handleOrderData` adds items to orderItems
   - Could be called by touch menu click handler too
   - `submitOrder` is flexible and accepts any orderItems array

3. **Order submission** (lines 224-349):
   - Already generic, just checks for items/table/seat
   - No voice-specific logic in submission

4. **Button styles** (ActionButton.tsx):
   - Fully customizable, can use for touch controls

5. **Seat selection grid** (SeatSelectionModal.tsx lines 74-112):
   - Pattern to reuse for menu item grid

