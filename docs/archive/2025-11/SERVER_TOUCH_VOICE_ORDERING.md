# Server Touch + Voice Ordering System

**Comprehensive Technical Documentation**

Version: 1.0
Last Updated: November 7, 2025
Status: Production-Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Features](#features)
5. [Usage Guide](#usage-guide)
6. [Voice Context System](#voice-context-system)
7. [Developer Guide](#developer-guide)
8. [Best Practices](#best-practices)
9. [API Reference](#api-reference)
10. [Migration Guide](#migration-guide)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Touch + Voice Ordering?

The Server Touch + Voice Ordering System is a hybrid order entry solution designed for restaurant staff (servers, food runners, managers). It combines two input modalities into a seamless experience:

- **Voice Ordering**: AI-powered natural language order entry using OpenAI Realtime API
- **Touch Ordering**: Traditional tap-to-order menu interface with modifiers

Both modes work together in a single unified interface, allowing servers to switch between voice and touch input depending on their preference, environment noise, or order complexity.

### When to Use It

**Server Touch + Voice Ordering is ideal for:**

- Table service restaurants with multi-seat orders
- Fast-paced dining environments requiring rapid order entry
- Staff who know the menu and need efficient input
- Situations where hands-free ordering is beneficial (carrying items, walking)
- Mixed scenarios (voice for simple items, touch for complex customizations)

**Not recommended for:**

- Customer-facing kiosks (use KioskDemo with customer-friendly instructions instead)
- Drive-through ordering (use DriveThruPage with Twilio integration)
- Environments with extreme background noise

### Key Benefits

1. **Faster Order Entry**: Voice ordering is 3-5x faster than traditional POS systems
2. **Reduced Errors**: AI confirmation and visual review reduce order mistakes
3. **Staff Efficiency**: Servers can take orders while walking to/from tables
4. **Flexibility**: Switch between voice and touch seamlessly
5. **Multi-Seat Support**: Built-in workflow for taking orders across multiple seats at a table
6. **DRY Architecture**: Shared components reduce code duplication and maintenance

---

## Architecture

### High-Level System Design

```
┌──────────────────────────────────────────────────────────────────┐
│                         ServerView                               │
│  (Main orchestration layer - manages table, seat, modal flow)    │
└────────────┬─────────────────────────────────────────┬───────────┘
             │                                         │
             ▼                                         ▼
┌────────────────────────┐              ┌──────────────────────────┐
│  SeatSelectionModal    │              │   PostOrderPrompt        │
│  - Choose seat         │              │   - Add next seat?       │
│  - Track ordered seats │              │   - Finish table?        │
└────────────┬───────────┘              └──────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      VoiceOrderModal                             │
│  (Core ordering interface - unified voice + touch)               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         OrderInputSelector (Voice/Touch Toggle)        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────┐     ┌──────────────────────────┐     │
│  │  Touch Mode Panel   │     │  Voice Mode Panel        │     │
│  │  ┌───────────────┐  │     │  ┌───────────────────┐   │     │
│  │  │ ServerMenuGrid│  │     │  │ VoiceControlWebRTC│   │     │
│  │  │  (menu items) │  │     │  │  (microphone)     │   │     │
│  │  └───────────────┘  │     │  └───────────────────┘   │     │
│  │         │            │     │         │                │     │
│  │         ▼            │     │         ▼                │     │
│  │  ┌───────────────┐  │     │  Current Transcript      │     │
│  │  │ItemDetailModal│  │     │  (live display)          │     │
│  │  │  (modifiers)  │  │     │                          │     │
│  │  └───────────────┘  │     └──────────────────────────┘     │
│  └─────────────────────┘                                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Order Items List (shared by both modes)        │    │
│  │  - Quantity controls                                   │    │
│  │  - Edit/Remove buttons                                 │    │
│  │  - Source badges (Voice/Touch)                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Order Notes & Submit Button                    │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action Flow:
1. Server taps table on floor plan
   → ServerView.handleTableSelection()
   → Opens SeatSelectionModal

2. Server selects seat number
   → Opens VoiceOrderModal
   → useVoiceOrderWebRTC hook initialized
   → OrderParser ready with menu items

3a. VOICE PATH:
   Server presses microphone
   → VoiceControlWebRTC captures audio
   → Streams to OpenAI Realtime API
   → AI processes speech, calls add_to_order()
   → handleOrderData() receives parsed items
   → OrderParser matches item names to menu IDs
   → Items added to orderItems array

3b. TOUCH PATH:
   Server taps menu item in ServerMenuGrid
   → Opens ItemDetailModal
   → Server configures modifiers/quantity
   → Item added to orderItems array

4. Server reviews order
   → Can edit quantities
   → Can remove items
   → Can add order notes

5. Server submits order
   → useVoiceOrderWebRTC.submitOrder()
   → POST /api/v1/orders
   → Shows PostOrderPrompt

6. Server chooses next action
   → "Add Next Seat" → back to step 2
   → "Finish Table" → reset all state
```

### Component Hierarchy

```
ServerView (orchestration)
├── ServerFloorPlan
│   └── FloorPlanCanvas
│       └── TableShape components
├── SeatSelectionModal
│   └── Seat selection grid
├── VoiceOrderModal (CORE)
│   ├── OrderInputSelector
│   ├── Touch Panel (conditional)
│   │   ├── ServerMenuGrid
│   │   │   ├── MenuCategoryFilter
│   │   │   └── MenuItemGrid
│   │   │       └── MenuItemCard (multiple)
│   │   └── ItemDetailModal
│   │       ├── QuantitySelector
│   │       ├── ModifierSelector
│   │       └── Special instructions textarea
│   ├── Voice Panel (conditional)
│   │   ├── VoiceControlWebRTC
│   │   └── Transcript display
│   ├── Order Items List
│   │   └── OrderItem (multiple)
│   │       ├── Quantity controls
│   │       ├── Edit button
│   │       └── Remove button
│   └── Submit controls
├── PostOrderPrompt
│   ├── "Add Next Seat" button
│   └── "Finish Table" button
└── ServerStats
```

### State Management

The system uses React hooks for state management:

**useVoiceOrderWebRTC** (main hook)
- Location: `/client/src/pages/hooks/useVoiceOrderWebRTC.ts`
- Manages: order items, transcripts, submission, multi-seat state
- Dependencies: OrderParser, useMenuItems, useToast, useTaxRate

**useMenuItems**
- Location: `/client/src/modules/menu/hooks/useMenuItems.ts`
- Provides: menu items from API with caching
- Used by: ServerMenuGrid, VoiceOrderModal, OrderParser

**useServerView**
- Location: `/client/src/pages/hooks/useServerView.ts`
- Manages: table data, selected table, floor plan state
- Used by: ServerView

### API Integration Points

```typescript
// Menu data
GET /api/v1/menu/items
Response: ApiMenuItem[]

// Ephemeral token for voice
POST /api/v1/realtime/session
Request: { x-restaurant-id: string }
Response: { client_secret: { value: string }, expires_at: number, menu_context: string }

// Order submission
POST /api/v1/orders
Request: {
  table_number: string,
  seat_number: number,
  items: OrderItem[],
  notes: string,
  total_amount: number,
  customer_name: string,
  type: 'dine-in'
}
Response: { id: string }
```

---

## Components

### 1. OrderInputSelector

**Purpose**: Toggle between voice and touch input modes

**Location**: `/client/src/components/shared/OrderInputSelector.tsx`

**Features**:
- Segmented control with smooth animations
- Full keyboard accessibility (Tab, Arrow keys, Enter/Space)
- ARIA labels for screen readers
- Visual feedback with color-coded modes:
  - Voice: Teal (#4ECDC4)
  - Touch: Green (#4CAF50)

**Props**:
```typescript
interface OrderInputSelectorProps {
  mode: 'voice' | 'touch'
  onChange: (mode: 'voice' | 'touch') => void
  className?: string
  disabled?: boolean
  size?: 'medium' | 'large' | 'xl'
}
```

**Usage Example**:
```tsx
import { OrderInputSelector } from '@/components/shared/OrderInputSelector'

function MyComponent() {
  const [mode, setMode] = useState<'voice' | 'touch'>('voice')

  return (
    <OrderInputSelector
      mode={mode}
      onChange={setMode}
      size="large"
    />
  )
}
```

**Code Reference**: Lines 1-179

---

### 2. MenuItemGrid

**Purpose**: Reusable grid display for menu items with filtering and loading states

**Location**: `/client/src/components/shared/MenuItemGrid.tsx`

**Features**:
- Responsive grid layout (configurable columns)
- Category filtering
- Loading skeleton states
- Empty state handling
- Framer Motion animations
- Price display with modifiers
- Dietary flags display
- Availability status

**Props**:
```typescript
interface MenuItemGridProps {
  items: ApiMenuItem[]
  loading?: boolean
  selectedCategory?: string
  onItemClick?: (item: ApiMenuItem) => void
  className?: string
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  showDescription?: boolean
  showImage?: boolean
  emptyState?: React.ReactNode
}
```

**Usage Example**:
```tsx
import { MenuItemGrid } from '@/components/shared/MenuItemGrid'

function MenuDisplay() {
  const { items, loading } = useMenuItems()

  return (
    <MenuItemGrid
      items={items}
      loading={loading}
      onItemClick={(item) => console.log('Selected:', item)}
      columns={{ mobile: 1, tablet: 2, desktop: 3 }}
      showDescription={true}
      showImage={false}
    />
  )
}
```

**Code Reference**: Lines 118-207

**Sub-components**:

**MenuItemCard** (Lines 31-116)
- Individual card for a single menu item
- Hover/tap animations
- Disabled state for unavailable items
- Price, description, dietary flags display

**MenuCategoryFilter** (Lines 209-254)
- Category selection buttons
- Active category highlighting
- "All Items" option

---

### 3. ServerMenuGrid

**Purpose**: Server-specific wrapper around MenuItemGrid with search and category filtering

**Location**: `/client/src/pages/components/ServerMenuGrid.tsx`

**Features**:
- Fetches menu items from API
- Integrated search with fuzzy matching
- Category filter tabs
- Compact 4-column layout (optimized for speed)
- Error handling with reload option
- Real-time filtering

**Props**:
```typescript
interface ServerMenuGridProps {
  onItemClick?: (item: ApiMenuItem) => void
  className?: string
  showSearch?: boolean // default: true
  showCategoryFilter?: boolean // default: true
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}
```

**Usage Example**:
```tsx
import { ServerMenuGrid } from '@/pages/components/ServerMenuGrid'

function OrderPanel() {
  const handleItemClick = (item) => {
    // Show modifier modal or add directly
    console.log('Item selected:', item)
  }

  return (
    <ServerMenuGrid
      onItemClick={handleItemClick}
      showSearch={true}
      showCategoryFilter={true}
    />
  )
}
```

**Code Reference**: Lines 1-294

**Search Implementation**:
- Uses fuzzy matching via `findBestMatch()` utility
- Confidence threshold: 0.3 for broad matches, 0.7 for exact
- Falls back to simple string matching
- Searches both name and description fields

---

### 4. ItemModifiersModal

**Purpose**: Configure item modifiers, quantity, and special instructions (legacy)

**Location**: `/client/src/pages/components/ItemModifiersModal.tsx`

**Note**: This component is used in older flows. New code should use `ItemDetailModal` from the order-system module instead.

**Features**:
- Modifier groups with validation
- Radio/checkbox support (based on maxSelections)
- Quantity selector (1-10)
- Special instructions textarea (200 chars)
- Price calculation with modifiers
- Keyboard shortcuts (ESC to close, Cmd/Ctrl+Enter to submit)
- Focus trap for accessibility

**Props**:
```typescript
interface ItemModifiersModalProps {
  isOpen: boolean
  onClose: () => void
  item: ApiMenuItem | null
  onAddToOrder: (
    item: ApiMenuItem,
    quantity: number,
    specialInstructions?: string,
    modifiers?: SelectedModifier[]
  ) => void
}
```

**Code Reference**: Lines 1-404

---

### 5. VoiceOrderModal

**Purpose**: Main unified interface for voice + touch ordering

**Location**: `/client/src/pages/components/VoiceOrderModal.tsx`

**Features**:
- Dual input modes (voice/touch) with seamless switching
- Side-by-side layout (touch menu | order list)
- Live transcript display during voice input
- Order items list with edit/remove controls
- Quantity adjustment (+/-)
- Source badges (Voice/Touch) on items
- Order notes field (500 chars)
- Price calculation with tax
- Submit validation
- Success/loading states

**Props**:
```typescript
interface VoiceOrderModalProps {
  show: boolean
  table: Table | null | undefined
  seat: number | null
  voiceOrder: {
    currentTranscript: string
    orderItems: OrderItem[]
    isVoiceActive: boolean
    isProcessing: boolean
    handleVoiceTranscript: (event: { text: string; isFinal: boolean }) => void
    handleOrderData?: (orderData: any) => void
    removeOrderItem: (itemId: string) => void
    updateOrderItem?: (itemId: string, updates: Partial<OrderItem>) => void
    setOrderItems: (items: OrderItem[]) => void
    setIsProcessing: (processing: boolean) => void
    orderNotes?: string
    setOrderNotes?: (notes: string) => void
  }
  onSubmit: () => void
  onClose: () => void
  isSubmitting?: boolean
}
```

**Usage Example**:
```tsx
import { VoiceOrderModal } from '@/pages/components/VoiceOrderModal'
import { useVoiceOrderWebRTC } from '@/pages/hooks/useVoiceOrderWebRTC'

function OrderFlow() {
  const voiceOrder = useVoiceOrderWebRTC()
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedSeat, setSelectedSeat] = useState(null)

  return (
    <VoiceOrderModal
      show={voiceOrder.showVoiceOrder && !!selectedTable}
      table={selectedTable}
      seat={selectedSeat}
      voiceOrder={voiceOrder}
      onSubmit={() => voiceOrder.submitOrder(selectedTable, selectedSeat)}
      onClose={() => voiceOrder.resetVoiceOrder()}
    />
  )
}
```

**Code Reference**: Lines 1-507

**Key Sections**:

1. **Mode Selector** (Lines 214-220)
   - OrderInputSelector component
   - Controls which panel is visible

2. **Touch Panel** (Lines 227-237)
   - Visible only when mode === 'touch'
   - Contains ServerMenuGrid or MenuGrid
   - Clicking item opens ItemDetailModal

3. **Voice Panel** (Lines 242-272)
   - Visible only when mode === 'voice'
   - VoiceControlWebRTC component (microphone)
   - Live transcript display

4. **Order Items List** (Lines 274-411)
   - Always visible (shared by both modes)
   - Quantity controls
   - Edit button (opens ItemDetailModal with pre-filled data)
   - Remove button (with confirmation)
   - Source badges (Voice/Touch)

5. **Order Notes** (Lines 414-438)
   - Textarea for special requests
   - Character counter (500 max)

6. **Submit Button** (Lines 464-487)
   - Displays item count and total price
   - Disabled when no items or submitting
   - Success animation on completion

---

### 6. VoiceControlWebRTC

**Purpose**: WebRTC-based voice input component using OpenAI Realtime API

**Location**: `/client/src/modules/voice/components/VoiceControlWebRTC.tsx`

**Features**:
- Push-to-talk (PTT) interface
- Real-time audio streaming
- Live transcription display
- AI response synthesis
- Context-aware instructions (kiosk vs server)
- Ephemeral token management
- Connection status indicators
- Debug mode

**Props**:
```typescript
interface VoiceControlWebRTCProps {
  onTranscript?: (event: { text: string; isFinal: boolean }) => void
  onOrderDetected?: (orderData: any) => void
  debug?: boolean
  muteAudioOutput?: boolean
  context?: 'kiosk' | 'server'
}
```

**Usage Example**:
```tsx
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC'

function VoicePanel() {
  return (
    <VoiceControlWebRTC
      onTranscript={(event) => console.log('Transcript:', event.text)}
      onOrderDetected={(data) => console.log('Order:', data)}
      debug={false}
      muteAudioOutput={true}
      context="server"
    />
  )
}
```

**Event Flow**:
```
User presses mic button
  → startRecording()
  → Connect WebRTC peer connection
  → Stream audio to OpenAI
  → Receive transcripts → emit onTranscript()
  → AI detects order → calls add_to_order()
  → emit onOrderDetected()
User releases mic
  → stopRecording()
  → Send finalize signal
  → Close audio stream
```

---

### 7. ItemDetailModal (Order System)

**Purpose**: Modern modal for item customization in order-system module

**Location**: `/client/src/modules/order-system/components/ItemDetailModal.tsx`

**Features**:
- Image display
- Modifier selector
- Quantity selector
- Special instructions
- Price calculation
- Add to cart action

**Props**:
```typescript
interface ItemDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: MenuItem | null
  onAddToCart: (cartItem: CartItem) => void
}
```

**Code Reference**: Lines 1-173

---

### 8. MenuGrid (Order System)

**Purpose**: Simple menu grid for order-system module

**Location**: `/client/src/modules/order-system/components/MenuGrid.tsx`

**Features**:
- Category filtering
- Search query support
- Loading states
- Error handling
- Responsive grid

**Props**:
```typescript
interface MenuGridProps {
  selectedCategory: string | null
  searchQuery: string
  onItemClick: (item: MenuItem) => void
}
```

**Code Reference**: Lines 1-67

---

## Features

### 1. Voice Ordering

**How It Works**:

1. Server presses and holds microphone button
2. Audio streams to OpenAI Realtime API via WebRTC
3. AI transcribes speech in real-time
4. AI interprets order intent and extracts:
   - Item names
   - Quantities
   - Modifications
   - Special instructions
5. AI calls `add_to_order()` function
6. Client receives structured data
7. OrderParser matches item names to menu IDs
8. Items added to order list

**Context-Aware Instructions**:

The system uses different AI instructions based on context:

**Server Context** (`context="server"`):
- Fast, concise responses (5-10 words max)
- Assumes staff menu knowledge
- Minimal confirmations
- Supports multi-item batches: "3 Greek, 2 Soul Bowl"
- Skips explanations

**Kiosk Context** (`context="kiosk"`):
- Friendly, educational tone
- Explains menu items
- Proactive follow-up questions
- Customer-facing language

See [Voice Context System](#voice-context-system) for details.

**Voice Features**:

- Real-time transcription display
- Fuzzy item matching (handles mispronunciations)
- Batch ordering support
- Modifier extraction
- Allergy note capture
- Rush order flagging

**Configuration**:

Voice settings are defined in `VoiceSessionConfig`:
- Location: `/client/src/modules/voice/services/VoiceSessionConfig.ts`
- Lines 199-575

**Example Voice Commands**:

```
Server: "3 Greek salads, one with chicken, one no feta"
AI: "Added. 3 Greek. $42."

Server: "Soul bowl, allergy to pork"
AI: "Soul Bowl, noted pork allergy. $14."

Server: "2 sandwiches, both white bread, fruit side"
AI: "2 sandwiches. $24."
```

---

### 2. Touch Ordering

**How It Works**:

1. Server taps menu item in ServerMenuGrid
2. ItemDetailModal opens with item details
3. Server configures:
   - Modifiers (checkboxes/radios)
   - Quantity (1-10)
   - Special instructions
4. Server taps "Add to Order"
5. Item added to order list with `source: 'touch'`

**Touch Features**:

- Category filtering
- Search with fuzzy matching
- Modifier validation (required groups)
- Price preview
- Image display (optional)
- Compact layout (4 columns)

**When to Use Touch**:

- Complex modifier combinations
- Visual menu browsing
- Unfamiliar items
- Noisy environment
- Training new staff

---

### 3. Mixed Ordering (Voice + Touch)

**The Real Power**:

Servers can combine both modes in a single order:

**Example Workflow**:
```
1. Voice: "3 Greek salads"
   → AI adds 3 salads with default dressing

2. Switch to Touch mode
   → Tap "Greek Salad #1" → Edit button
   → Change to balsamic dressing
   → Add chicken (+$4)

3. Switch back to Voice
   → "2 Soul Bowls, no pork on both"
   → AI adds 2 bowls with allergy note

4. Review order → Submit
```

**Benefits**:
- Speed of voice for simple items
- Precision of touch for complex items
- Visual confirmation of all items
- Flexible workflow

---

### 4. Order Review & Editing

**Order Items List**:

Every item in the order displays:
- Item name
- Quantity (with +/- controls)
- Modifications
- Price (item + modifiers × quantity)
- Source badge (Voice/Touch)
- Edit button (if menuItemId exists)
- Remove button (with confirmation)

**Editing Flow**:

1. Tap Edit button on order item
2. ItemDetailModal opens with pre-filled data:
   - Original quantity
   - Selected modifiers
   - Special instructions
3. Make changes
4. Tap "Add to Order"
5. Original item replaced with updated version

**Code Reference**: VoiceOrderModal.tsx Lines 94-131

**Removing Items**:

1. Tap Remove button
2. Confirmation overlay appears: "Remove this item?"
3. Tap "Yes" to remove or "No" to cancel

**Code Reference**: VoiceOrderModal.tsx Lines 145-152, 385-407

---

### 5. Multi-Seat Ordering

**Workflow**:

```
Step 1: Select table from floor plan
  ↓
Step 2: Choose seat number (1, 2, 3, 4...)
  ↓
Step 3: Take order for this seat
  ↓
Step 4: Submit order
  ↓
Step 5: PostOrderPrompt appears
  ├─→ "Add Next Seat" → back to Step 2
  └─→ "Finish Table" → complete & reset
```

**State Tracking**:

The system tracks:
- `orderedSeats: number[]` - which seats have orders
- `lastCompletedSeat: number` - most recent submission
- `selectedSeat: number | null` - current seat being ordered

**Visual Indicators**:

In SeatSelectionModal:
- Green checkmark: seat already ordered
- Disabled button: seat already ordered
- Enabled button: available for ordering

**Code Reference**:
- useVoiceOrderWebRTC.ts Lines 46-48 (state)
- useVoiceOrderWebRTC.ts Lines 334-336 (tracking)
- ServerView.tsx Lines 56-74 (handlers)

---

### 6. Order Notes

**Purpose**: Capture table-level notes and special requests

**Features**:
- 500 character limit
- Character counter
- Appended to order notes on submission
- Includes table/seat context automatically

**Format on Submission**:
```
[User-entered notes]

(Voice order from Table 5, Seat 2)
```

**Code Reference**: VoiceOrderModal.tsx Lines 414-438

---

## Usage Guide

### Adding Touch Ordering to a Page

**Step 1: Install Dependencies**

```bash
# Already included in rebuild-6.0
# No additional installation needed
```

**Step 2: Import Components**

```tsx
import { ServerMenuGrid } from '@/pages/components/ServerMenuGrid'
import { ItemDetailModal } from '@/modules/order-system/components/ItemDetailModal'
import { OrderInputSelector } from '@/components/shared/OrderInputSelector'
```

**Step 3: Set Up State**

```tsx
function MyOrderPage() {
  const [inputMode, setInputMode] = useState<'voice' | 'touch'>('voice')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  // ... rest of component
}
```

**Step 4: Add Components**

```tsx
return (
  <div>
    {/* Mode selector */}
    <OrderInputSelector
      mode={inputMode}
      onChange={setInputMode}
      size="large"
    />

    {/* Touch menu (conditional) */}
    {inputMode === 'touch' && (
      <ServerMenuGrid
        onItemClick={(item) => {
          setSelectedItem(item)
          setIsModalOpen(true)
        }}
      />
    )}

    {/* Item detail modal */}
    <ItemDetailModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      item={selectedItem}
      onAddToCart={(cartItem) => {
        // Convert CartItem to OrderItem
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
        setIsModalOpen(false)
      }}
    />
  </div>
)
```

---

### Customizing Components

**Customize Grid Columns**:

```tsx
<ServerMenuGrid
  columns={{
    mobile: 2,    // 2 columns on mobile
    tablet: 3,    // 3 columns on tablet
    desktop: 4    // 4 columns on desktop
  }}
/>
```

**Customize Search Behavior**:

```tsx
<ServerMenuGrid
  showSearch={true}           // Enable search
  showCategoryFilter={false}  // Disable category tabs
/>
```

**Customize Mode Selector Size**:

```tsx
<OrderInputSelector
  mode={mode}
  onChange={setMode}
  size="xl"  // 'medium' | 'large' | 'xl'
/>
```

**Customize Menu Item Display**:

```tsx
<MenuItemGrid
  items={items}
  showDescription={true}   // Show item descriptions
  showImage={true}         // Show item images
  onItemClick={handleClick}
/>
```

---

### Handling Events

**Voice Events**:

```tsx
<VoiceControlWebRTC
  onTranscript={(event) => {
    console.log('Transcript:', event.text)
    console.log('Is final:', event.isFinal)
    // Update UI with live transcription
  }}
  onOrderDetected={(orderData) => {
    console.log('Order detected:', orderData)
    // orderData: { items: [{ name, quantity, modifications }] }
    // Process and add to order
  }}
  debug={true}  // Enable console logging
/>
```

**Touch Events**:

```tsx
<ServerMenuGrid
  onItemClick={(item) => {
    console.log('Item clicked:', item)
    // Open modal, add directly, etc.
  }}
/>
```

**Order Events**:

```tsx
const handleSubmit = async () => {
  const success = await voiceOrder.submitOrder(table, seat)
  if (success) {
    console.log('Order submitted!')
    // Show success message, reset state, etc.
  }
}
```

---

### Integration Examples

**Example 1: Simple Server Page**

```tsx
import { ServerMenuGrid } from '@/pages/components/ServerMenuGrid'
import { useState } from 'react'

export function SimpleServerPage() {
  const [orderItems, setOrderItems] = useState([])

  return (
    <div className="p-4">
      <h1>Take Order</h1>
      <ServerMenuGrid
        onItemClick={(item) => {
          // Quick add without modifiers
          setOrderItems([...orderItems, {
            id: `${item.id}-${Date.now()}`,
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
            price: item.price,
            source: 'touch'
          }])
        }}
      />
      <div>
        <h2>Order Items: {orderItems.length}</h2>
        {/* Display items */}
      </div>
    </div>
  )
}
```

**Example 2: Full Voice + Touch Integration**

See `/client/src/pages/ServerView.tsx` for complete example.

**Example 3: Custom Voice Instructions**

To customize voice instructions, modify `VoiceSessionConfig.ts`:

```typescript
// Location: /client/src/modules/voice/services/VoiceSessionConfig.ts
// Lines 330-391 for server instructions
// Lines 256-327 for kiosk instructions

private buildServerInstructions(): string {
  let instructions = `You are a CUSTOM ordering assistant.

  YOUR RULES:
  - Be ultra-fast (3 words max)
  - No pleasantries
  - Confirm item count only

  Example:
  Staff: "3 burgers, 2 fries"
  AI: "Added. 5 items."
  `

  if (this.menuContext) {
    instructions += this.menuContext
  }

  return instructions
}
```

---

## Voice Context System

### Overview

The Voice Context System enables different AI behaviors for different use cases:
- **Kiosk Context**: Customer-facing, friendly, educational
- **Server Context**: Staff-facing, fast, minimal

### How It Works

**1. Context Specification**

Context is set when creating VoiceControlWebRTC:

```tsx
<VoiceControlWebRTC
  context="server"  // or "kiosk"
  onTranscript={...}
  onOrderDetected={...}
/>
```

**2. Instruction Building**

VoiceSessionConfig uses context to build appropriate instructions:

```typescript
// Location: /client/src/modules/voice/services/VoiceSessionConfig.ts
// Lines 217-223

const instructions = this.context === 'server'
  ? this.buildServerInstructions()
  : this.buildKioskInstructions()
```

**3. Tool Building**

Different function tools are provided:

```typescript
// Lines 221-223

const tools = this.context === 'server'
  ? this.buildServerTools()
  : this.buildKioskTools()
```

### Kiosk vs Server Differences

| Feature | Kiosk Context | Server Context |
|---------|--------------|----------------|
| **Tone** | Friendly, warm | Professional, concise |
| **Response Length** | 1-2 sentences | 5-10 words max |
| **Menu Explanations** | Yes, proactive | No (assumes knowledge) |
| **Follow-up Questions** | Many (educational) | Minimal (fast) |
| **Confirmations** | Detailed | Item count + total only |
| **Max Tokens** | 500 | 200 |
| **Example Response** | "Great choice! Feta or blue cheese? Add prosciutto for +$4?" | "Added. 3 Greek. $42." |

### Server Context Instructions

Key characteristics:
- Ultra-fast responses
- Supports batch ordering: "3 Greek, 2 Soul Bowl"
- Minimal confirmations
- Assumes menu knowledge
- Captures allergy notes
- Rush order support

**Code Reference**: Lines 330-391

**Example Exchanges**:
```
Staff: "3 Greek salads, one with chicken, one no feta"
AI: "Added. 3 Greek. $42."

Staff: "Soul bowl, allergy to pork"
AI: "Soul Bowl, noted pork allergy. $14."

Staff: "That's it"
AI: "Submitting 6 items, $80 total."
```

### Kiosk Context Instructions

Key characteristics:
- Friendly, welcoming tone
- Menu education
- Proactive customization questions
- Dietary guidance
- Detailed confirmations

**Code Reference**: Lines 256-327

**Example Exchanges**:
```
Customer: "I'll have the Greek salad"
AI: "Great choice! Feta or blue cheese? Would you like to add grilled chicken for +$4?"

Customer: "Feta, and yes to chicken"
AI: "Perfect! What dressing would you like? We have Vidalia Onion, Balsamic, Greek, Ranch, Honey Mustard, Poppy Seed, or Lemon Vinaigrette."
```

### Performance Considerations

**Server Context Optimizations**:
- Lower max tokens (200 vs 500) for faster responses
- Shorter prompts (fewer instructions to process)
- Skip pleasantries and explanations
- Immediate function calling

**Kiosk Context Trade-offs**:
- Higher token usage for educational responses
- Longer interaction time (acceptable for customers)
- More function calls (modifiers, confirmations)

### Switching Contexts Dynamically

If you need to switch contexts at runtime:

```tsx
function AdaptiveVoiceOrdering() {
  const { user } = useAuth()
  const context = user.role === 'server' ? 'server' : 'kiosk'

  return (
    <VoiceControlWebRTC
      context={context}
      onOrderDetected={handleOrder}
    />
  )
}
```

---

## Developer Guide

### File Structure

```
client/src/
├── components/shared/
│   ├── OrderInputSelector.tsx          # Voice/Touch toggle (179 lines)
│   ├── MenuItemGrid.tsx                 # Reusable menu grid (254 lines)
│   └── MenuItemGrid.example.tsx         # Usage examples
├── pages/
│   ├── ServerView.tsx                   # Main server page (186 lines)
│   ├── components/
│   │   ├── VoiceOrderModal.tsx          # Core ordering modal (507 lines)
│   │   ├── ServerMenuGrid.tsx           # Server menu wrapper (294 lines)
│   │   ├── ItemModifiersModal.tsx       # Legacy modifiers modal (404 lines)
│   │   ├── SeatSelectionModal.tsx       # Seat picker
│   │   ├── PostOrderPrompt.tsx          # Multi-seat workflow
│   │   └── ServerFloorPlan.tsx          # Table visualization
│   └── hooks/
│       ├── useVoiceOrderWebRTC.ts       # Main ordering hook (445 lines)
│       ├── useServerView.ts             # Server view state
│       └── useTableInteraction.ts       # Table selection logic
├── modules/
│   ├── voice/
│   │   ├── components/
│   │   │   └── VoiceControlWebRTC.tsx   # Voice input component
│   │   ├── services/
│   │   │   ├── VoiceSessionConfig.ts    # AI configuration (576 lines)
│   │   │   ├── WebRTCConnection.ts      # WebRTC peer management
│   │   │   ├── VoiceEventHandler.ts     # Event processing
│   │   │   └── WebRTCVoiceClient.ts     # High-level client
│   │   └── hooks/
│   │       └── useWebRTCVoice.ts        # Voice state hook
│   ├── order-system/
│   │   └── components/
│   │       ├── MenuGrid.tsx             # Simple menu grid (67 lines)
│   │       ├── ItemDetailModal.tsx      # Item customization (173 lines)
│   │       ├── ModifierSelector.tsx     # Modifier checkboxes
│   │       └── QuantitySelector.tsx     # +/- controls
│   ├── menu/
│   │   └── hooks/
│   │       └── useMenuItems.ts          # Menu data fetching
│   └── orders/
│       └── services/
│           └── OrderParser.ts           # Item name matching
└── utils/
    └── fuzzyMenuMatcher.ts              # Fuzzy search utility
```

### Key Files and Their Purposes

**Core Orchestration**:
- `ServerView.tsx` - Top-level page component, manages table/seat selection flow
- `useVoiceOrderWebRTC.ts` - Main state management hook for ordering

**Ordering Interface**:
- `VoiceOrderModal.tsx` - Unified voice + touch modal
- `OrderInputSelector.tsx` - Mode toggle component
- `ServerMenuGrid.tsx` - Server-optimized menu display

**Voice System**:
- `VoiceControlWebRTC.tsx` - Push-to-talk microphone component
- `VoiceSessionConfig.ts` - AI instructions and configuration
- `WebRTCConnection.ts` - WebRTC peer connection management

**Touch System**:
- `MenuItemGrid.tsx` - Reusable menu grid with category filtering
- `ItemDetailModal.tsx` - Item customization modal
- `ModifierSelector.tsx` - Modifier selection UI

**Data Layer**:
- `useMenuItems.ts` - Menu data fetching with caching
- `OrderParser.ts` - Fuzzy matching for voice item names
- `fuzzyMenuMatcher.ts` - String similarity algorithm

---

### How to Extend Functionality

**Add a New Input Mode**:

1. Update `OrderInputMode` type:
```tsx
// OrderInputSelector.tsx
export type OrderInputMode = 'voice' | 'touch' | 'keyboard'
```

2. Add mode to selector:
```tsx
<button onClick={() => onChange('keyboard')}>
  <Keyboard className="h-6 w-6" />
  <span>Keyboard</span>
</button>
```

3. Add conditional panel in VoiceOrderModal:
```tsx
{inputMode === 'keyboard' && (
  <KeyboardInputPanel onItemAdd={handleAddItem} />
)}
```

**Add a New Modifier Type**:

1. Update modifier schema in ItemDetailModal
2. Add UI component in ModifierSelector
3. Update validation logic
4. Test with OrderParser

**Add Voice Command**:

1. Edit `buildServerTools()` or `buildKioskTools()`:
```tsx
{
  type: 'function',
  name: 'apply_discount',
  description: 'Apply a discount code to the order',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string' }
    }
  }
}
```

2. Handle in VoiceEventHandler or useVoiceOrderWebRTC

**Add Custom Instructions**:

Edit `buildServerInstructions()` or `buildKioskInstructions()` in VoiceSessionConfig.ts

---

### Testing Guidelines

**Unit Tests**:

```bash
# Voice services
npm test -- VoiceSessionConfig.test.ts
npm test -- WebRTCConnection.test.ts
npm test -- VoiceEventHandler.test.ts

# Order parsing
npm test -- OrderParser.test.ts
npm test -- fuzzyMenuMatcher.test.ts
```

**Component Tests**:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderInputSelector } from '@/components/shared/OrderInputSelector'

test('switches between voice and touch modes', () => {
  const handleChange = jest.fn()
  render(<OrderInputSelector mode="voice" onChange={handleChange} />)

  fireEvent.click(screen.getByLabelText('Touch ordering mode'))
  expect(handleChange).toHaveBeenCalledWith('touch')
})
```

**Integration Tests**:

Test full ordering flow:
1. Select table
2. Select seat
3. Add items via voice
4. Add items via touch
5. Edit quantities
6. Remove items
7. Submit order
8. Verify API calls

**Manual Testing Checklist**:

- [ ] Voice ordering works in Chrome, Safari, Firefox
- [ ] Touch ordering works on mobile devices
- [ ] Mode switching is smooth
- [ ] Order items list updates correctly
- [ ] Edit/remove buttons work
- [ ] Price calculations are accurate
- [ ] Multi-seat workflow works
- [ ] Order notes are saved
- [ ] Validation prevents empty submissions
- [ ] Error states display properly

---

## Best Practices

### DRY Principles Applied

**1. Shared Components**

Instead of duplicating menu grids:
- `MenuItemGrid` - Base reusable grid
- `ServerMenuGrid` - Wraps MenuItemGrid with server-specific features
- `MenuGrid` - Order-system module grid

**2. Shared Hooks**

- `useMenuItems` - Used by all menu displays
- `useVoiceOrderWebRTC` - Single source of truth for order state
- `useTaxRate` - Centralized tax calculation

**3. Shared Types**

```typescript
// shared/types.ts
export interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
  source?: 'voice' | 'touch'
  price?: number
}
```

**4. Shared Utilities**

- `OrderParser` - Fuzzy item matching (used by voice and search)
- `fuzzyMenuMatcher` - String similarity (used by parser and filters)
- `formatPrice` - Consistent price formatting

---

### Component Reusability

**Making Components Reusable**:

1. **Accept Props, Not Context**
```tsx
// Bad: Tightly coupled to context
function MenuGrid() {
  const { items } = useMenuContext() // Hard to reuse
  return <div>...</div>
}

// Good: Accepts props
function MenuGrid({ items, onItemClick }: MenuGridProps) {
  return <div>...</div>
}
```

2. **Provide Defaults**
```tsx
interface Props {
  columns?: { mobile?: number; tablet?: number; desktop?: number }
  showDescription?: boolean
  showImage?: boolean
}

// Defaults allow flexible usage
const {
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  showDescription = true,
  showImage = false
} = props
```

3. **Accept Render Props for Customization**
```tsx
<MenuItemGrid
  items={items}
  emptyState={
    <div>Custom empty state with image and CTA</div>
  }
/>
```

---

### Performance Optimization

**1. Memoization**

```tsx
// VoiceOrderModal.tsx Lines 75-86
const orderTotals = useMemo(() => {
  const subtotal = voiceOrder.orderItems.reduce((sum, item) => {
    const menuItem = menuItems.find(m => m.id === item.menuItemId)
    const itemPrice = (menuItem?.price || item.price || 0)
    const modifiersTotal = (item.modifications || []).reduce(...)
    return sum + ((itemPrice + modifiersTotal) * item.quantity)
  }, 0)
  return { itemCount: ..., total: subtotal }
}, [voiceOrder.orderItems, menuItems])
```

**2. Component Memoization**

```tsx
// MenuGrid.tsx Line 12
export const MenuGrid = React.memo(({ ... }: MenuGridProps) => {
  // Component only re-renders when props change
})
```

**3. Lazy Loading**

```tsx
// Load ItemDetailModal only when needed
const [isModalOpen, setIsModalOpen] = useState(false)

{isModalOpen && (
  <ItemDetailModal ... />
)}
```

**4. Debounced Search**

```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const debouncedSearch = useDebouncedValue(searchQuery, 300)
```

**5. Virtual Scrolling** (for large menus)

Consider using `react-window` for menus with 100+ items

---

### Accessibility

**Keyboard Navigation**:
- Tab to navigate between controls
- Arrow keys to switch modes in OrderInputSelector
- Enter/Space to activate buttons
- Escape to close modals

**ARIA Labels**:
```tsx
<button
  aria-label="Voice ordering mode"
  aria-checked={mode === 'voice'}
  role="radio"
>
  <Mic /> Voice Order
</button>
```

**Focus Management**:
```tsx
// ItemModifiersModal.tsx Lines 52-56
useEffect(() => {
  if (isOpen && firstFocusableRef.current) {
    firstFocusableRef.current.focus()
  }
}, [isOpen])
```

**Screen Reader Support**:
- All interactive elements have labels
- Status updates announced
- Error messages accessible
- Loading states communicated

---

## API Reference

### Component Props

#### OrderInputSelector

```typescript
interface OrderInputSelectorProps {
  mode: 'voice' | 'touch'
  onChange: (mode: 'voice' | 'touch') => void
  className?: string
  disabled?: boolean
  size?: 'medium' | 'large' | 'xl'
}
```

#### MenuItemGrid

```typescript
interface MenuItemGridProps {
  items: ApiMenuItem[]
  loading?: boolean
  selectedCategory?: string
  onItemClick?: (item: ApiMenuItem) => void
  className?: string
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  showDescription?: boolean
  showImage?: boolean
  emptyState?: React.ReactNode
}
```

#### ServerMenuGrid

```typescript
interface ServerMenuGridProps {
  onItemClick?: (item: ApiMenuItem) => void
  className?: string
  showSearch?: boolean
  showCategoryFilter?: boolean
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}
```

#### VoiceOrderModal

```typescript
interface VoiceOrderModalProps {
  show: boolean
  table: Table | null | undefined
  seat: number | null
  voiceOrder: {
    currentTranscript: string
    orderItems: OrderItem[]
    isVoiceActive: boolean
    isProcessing: boolean
    handleVoiceTranscript: (event: { text: string; isFinal: boolean }) => void
    handleOrderData?: (orderData: any) => void
    removeOrderItem: (itemId: string) => void
    updateOrderItem?: (itemId: string, updates: Partial<OrderItem>) => void
    setOrderItems: (items: OrderItem[]) => void
    setIsProcessing: (processing: boolean) => void
    orderNotes?: string
    setOrderNotes?: (notes: string) => void
  }
  onSubmit: () => void
  onClose: () => void
  isSubmitting?: boolean
}
```

#### VoiceControlWebRTC

```typescript
interface VoiceControlWebRTCProps {
  onTranscript?: (event: { text: string; isFinal: boolean }) => void
  onOrderDetected?: (orderData: any) => void
  debug?: boolean
  muteAudioOutput?: boolean
  context?: 'kiosk' | 'server'
}
```

#### ItemDetailModal

```typescript
interface ItemDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: MenuItem | null
  onAddToCart: (cartItem: CartItem) => void
}
```

---

### Hook Interfaces

#### useVoiceOrderWebRTC

```typescript
function useVoiceOrderWebRTC(): {
  // State
  showVoiceOrder: boolean
  setShowVoiceOrder: (show: boolean) => void
  currentTranscript: string
  orderItems: OrderItem[]
  setOrderItems: (items: OrderItem[]) => void
  isVoiceActive: boolean
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
  isSubmitting: boolean
  orderNotes: string
  setOrderNotes: (notes: string) => void

  // Multi-seat state
  orderedSeats: number[]
  showPostOrderPrompt: boolean
  setShowPostOrderPrompt: (show: boolean) => void
  lastCompletedSeat: number | null

  // Handlers
  handleVoiceTranscript: (event: { text: string; isFinal: boolean }) => void
  handleOrderData: (orderData: any) => void
  removeOrderItem: (itemId: string) => void
  submitOrder: (table: Table | null, seat: number | null) => Promise<boolean>
  resetVoiceOrder: () => void
  handleAddNextSeat: () => void
  handleFinishTable: () => void
  resetAllState: () => void
}
```

#### useMenuItems

```typescript
function useMenuItems(): {
  items: ApiMenuItem[]
  loading: boolean
  error: Error | null
  refetch: () => void
}
```

---

### Type Definitions

#### OrderItem

```typescript
interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
  source?: 'voice' | 'touch'
  price?: number
}
```

#### OrderModification

```typescript
interface OrderModification {
  id: string
  name: string
  price?: number
}
```

#### CartItem

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

#### ApiMenuItem

```typescript
interface ApiMenuItem {
  id: string
  name: string
  description?: string
  price: number
  categoryId?: string
  category?: {
    id: string
    name: string
  }
  isAvailable: boolean
  imageUrl?: string
  calories?: number
  dietaryFlags?: string[]
  preparationTime?: number
  modifierGroups?: ApiMenuItemModifierGroup[]
}
```

---

### Event Handlers

#### Voice Events

```typescript
type TranscriptHandler = (event: {
  text: string
  isFinal: boolean
}) => void

type OrderDetectedHandler = (orderData: {
  items: Array<{
    name: string
    quantity: number
    modifications?: string[]
    specialInstructions?: string
  }>
}) => void
```

#### Touch Events

```typescript
type ItemClickHandler = (item: ApiMenuItem) => void

type AddToCartHandler = (cartItem: CartItem) => void
```

#### Order Events

```typescript
type SubmitHandler = () => void | Promise<void>

type CloseHandler = () => void
```

---

## Migration Guide

### From Legacy POS to Touch + Voice

**Step 1: Assess Current System**

Identify:
- How orders are currently entered
- What data is captured
- Integration points (kitchen display, payment, etc.)

**Step 2: Install Components**

```tsx
// Add to your existing server page
import { VoiceOrderModal } from '@/pages/components/VoiceOrderModal'
import { useVoiceOrderWebRTC } from '@/pages/hooks/useVoiceOrderWebRTC'
```

**Step 3: Gradual Rollout**

Phase 1: Touch-only mode
```tsx
const [inputMode, setInputMode] = useState<'voice' | 'touch'>('touch')
// Keep mode locked to 'touch' initially
```

Phase 2: Enable voice for select users
```tsx
const { user } = useAuth()
const enableVoice = user.role === 'admin' || user.id === 'beta-tester-id'
```

Phase 3: Full rollout
```tsx
<OrderInputSelector mode={mode} onChange={setMode} />
```

**Step 4: Data Migration**

Map existing order schema to new OrderItem format:
```typescript
// Old format
interface LegacyOrder {
  table: number
  items: string[]  // Just names
}

// New format
interface OrderItem {
  id: string
  menuItemId: string  // UUID from menu
  name: string
  quantity: number
  modifications?: OrderModification[]
  source?: 'voice' | 'touch'
  price?: number
}

// Migration function
function migrateLegacyOrder(legacy: LegacyOrder): OrderItem[] {
  return legacy.items.map((itemName, index) => {
    const menuItem = findMenuItemByName(itemName)
    return {
      id: `legacy-${Date.now()}-${index}`,
      menuItemId: menuItem?.id || '',
      name: itemName,
      quantity: 1,
      source: 'touch'
    }
  })
}
```

---

### Breaking Changes

**None for new implementations**

For existing code using deprecated components:

#### ItemModifiersModal → ItemDetailModal

**Old**:
```tsx
<ItemModifiersModal
  isOpen={isOpen}
  onClose={onClose}
  item={item}
  onAddToOrder={(item, quantity, instructions, modifiers) => {
    // Handle add
  }}
/>
```

**New**:
```tsx
<ItemDetailModal
  isOpen={isOpen}
  onClose={onClose}
  item={item}
  onAddToCart={(cartItem) => {
    // cartItem has unified structure
  }}
/>
```

**Migration**:
1. Update import path
2. Change `onAddToOrder` to `onAddToCart`
3. Restructure callback to accept CartItem

---

### Upgrade Path

**From Voice-Only to Touch + Voice**:

1. Wrap existing VoiceControlWebRTC in VoiceOrderModal
2. Add OrderInputSelector
3. Add touch panel with ServerMenuGrid
4. Share order items state between modes

**From Touch-Only to Touch + Voice**:

1. Add VoiceControlWebRTC component
2. Add voice event handlers
3. Integrate OrderParser for voice item matching
4. Add OrderInputSelector toggle

**Example**:
```tsx
// Before: Touch-only
function TouchOrderPage() {
  const [items, setItems] = useState([])

  return (
    <div>
      <ServerMenuGrid onItemClick={handleAdd} />
      <OrderList items={items} />
    </div>
  )
}

// After: Touch + Voice
function HybridOrderPage() {
  const [inputMode, setInputMode] = useState('touch')
  const voiceOrder = useVoiceOrderWebRTC()

  return (
    <VoiceOrderModal
      show={true}
      table={table}
      seat={seat}
      voiceOrder={voiceOrder}
      onSubmit={handleSubmit}
      onClose={handleClose}
    />
  )
}
```

---

## Troubleshooting

### Common Issues

#### 1. Voice ordering not recognizing items

**Symptoms**: AI transcribes correctly, but items aren't added to order

**Causes**:
- Menu not loaded yet
- OrderParser not initialized
- Item names don't match menu

**Solutions**:
```tsx
// Check menu loading state
const { items, loading, error } = useMenuItems()
if (loading) return <div>Loading menu...</div>
if (error) return <div>Error: {error.message}</div>

// Verify OrderParser initialization
useEffect(() => {
  if (menuItems.length > 0) {
    orderParserRef.current = new OrderParser(menuItems)
    console.log('OrderParser ready with', menuItems.length, 'items')
  }
}, [menuItems])

// Test fuzzy matching
const match = orderParserRef.current?.findBestMenuMatch("Greek salad")
console.log('Match:', match.item?.name, 'Confidence:', match.confidence)
```

**Prevention**:
- Ensure menu API is healthy
- Add defensive checks in handleOrderData
- Show "Loading menu..." state before allowing orders

---

#### 2. Items added without menuItemId causing submission errors

**Symptoms**: Order submission fails with 400/500 error

**Cause**: Items have name but missing menuItemId (failed parsing)

**Solution**:
```typescript
// Add validation before submission (already implemented in useVoiceOrderWebRTC.ts Lines 245-256)
const invalidItems = orderItems.filter(item => !item.menuItemId)
if (invalidItems.length > 0) {
  toast.error(
    `Cannot submit: ${invalidItems.length} item(s) not recognized. ` +
    `Please remove and try again.`
  )
  return false
}
```

**Prevention**:
- Show warning badge on items without menuItemId
- Provide "Remove invalid items" button
- Improve fuzzy matching confidence threshold

---

#### 3. Voice connection fails / WebRTC errors

**Symptoms**: Microphone button unresponsive, "Connection failed" error

**Causes**:
- Ephemeral token expired
- Network issues
- Browser permissions denied

**Solutions**:
```tsx
// Check token validity
if (!sessionConfig.isTokenValid()) {
  console.log('Token expired, refreshing...')
  await sessionConfig.fetchEphemeralToken()
}

// Check browser support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  alert('Voice ordering requires a browser with microphone support (Chrome, Safari, Edge)')
}

// Request microphone permission
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach(track => track.stop())
  console.log('Microphone access granted')
} catch (error) {
  alert('Please allow microphone access to use voice ordering')
}
```

**Prevention**:
- Show permission prompt before first use
- Display clear error messages
- Provide fallback to touch mode

---

#### 4. Touch menu items not clickable

**Symptoms**: Tapping menu items does nothing

**Cause**: Missing or incorrect onItemClick handler

**Solution**:
```tsx
// Verify handler is passed
<ServerMenuGrid
  onItemClick={(item) => {
    console.log('Item clicked:', item)  // Debug log
    setSelectedMenuItem(item)
    setIsItemModalOpen(true)
  }}
/>

// Ensure modal is rendered
{isItemModalOpen && (
  <ItemDetailModal
    isOpen={isItemModalOpen}
    onClose={() => setIsItemModalOpen(false)}
    item={selectedMenuItem}
    onAddToCart={handleAddToCart}
  />
)}
```

---

#### 5. Order totals incorrect

**Symptoms**: Displayed total doesn't match expected value

**Causes**:
- Tax calculation error
- Modifier prices not included
- Quantity not multiplied

**Solution**:
```typescript
// Verify calculation (from VoiceOrderModal.tsx Lines 75-86)
const orderTotals = useMemo(() => {
  const subtotal = voiceOrder.orderItems.reduce((sum, item) => {
    const menuItem = menuItems.find(m => m.id === item.menuItemId)
    const itemPrice = menuItem?.price || item.price || 0
    const modifiersTotal = (item.modifications || []).reduce(
      (modSum, mod) => modSum + (mod.price || 0),
      0
    )
    return sum + ((itemPrice + modifiersTotal) * item.quantity)
  }, 0)
  return {
    itemCount: voiceOrder.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    total: subtotal
  }
}, [voiceOrder.orderItems, menuItems])

console.log('Order totals:', orderTotals)
```

**Prevention**:
- Unit test price calculations
- Display itemized breakdown
- Show tax separately

---

#### 6. Multi-seat state not persisting

**Symptoms**: Ordered seats reset unexpectedly

**Cause**: Calling resetAllState instead of resetVoiceOrder

**Solution**:
```tsx
// Use correct reset function
const handleCloseModal = () => {
  voiceOrder.resetVoiceOrder()  // Keeps orderedSeats
  // NOT voiceOrder.resetAllState() - clears orderedSeats
}

const handleFinishTable = () => {
  voiceOrder.handleFinishTable()  // Clears orderedSeats intentionally
}
```

---

### Debug Tips

**Enable Debug Mode**:
```tsx
<VoiceControlWebRTC
  debug={true}  // Logs all WebRTC events
  onTranscript={(e) => console.log('Transcript:', e)}
  onOrderDetected={(d) => console.log('Order:', d)}
/>
```

**Check Voice Session**:
```typescript
// In browser console
const config = new VoiceSessionConfig({ restaurantId: 'grow' }, authService)
await config.fetchEphemeralToken()
console.log('Token:', config.getToken())
console.log('Menu context:', config.getMenuContext())
```

**Inspect Order State**:
```tsx
useEffect(() => {
  console.log('Order items:', voiceOrder.orderItems)
  console.log('Ordered seats:', voiceOrder.orderedSeats)
  console.log('Current transcript:', voiceOrder.currentTranscript)
}, [voiceOrder])
```

**Test Fuzzy Matching**:
```tsx
import { findBestMatch } from '@/utils/fuzzyMenuMatcher'

const menuItems = [
  { id: '1', name: 'Greek Salad', price: 12 },
  { id: '2', name: 'Soul Bowl', price: 14 }
]

const result = findBestMatch('greek', menuItems, 0.3)
console.log('Match:', result.item?.name, 'Confidence:', result.confidence)
```

**Network Debugging**:
```tsx
// Check API calls in Network tab
// Look for:
// - GET /api/v1/menu/items
// - POST /api/v1/realtime/session
// - POST /api/v1/orders

// Verify headers
// - Authorization: Bearer <token>
// - X-Restaurant-ID: <restaurant_id>
```

---

### Known Limitations

1. **Voice Accuracy**:
   - Dependent on OpenAI Realtime API quality
   - Background noise can affect recognition
   - Accents/dialects may reduce accuracy

2. **Browser Support**:
   - Requires WebRTC support (Chrome, Safari, Edge)
   - Firefox may have issues with certain audio codecs
   - Mobile browsers may have microphone restrictions

3. **Offline Mode**:
   - Voice ordering requires internet connection
   - Touch ordering works offline (if menu cached)

4. **Modifier Complexity**:
   - Voice handles simple modifiers well
   - Complex modifier combinations better via touch
   - Nested modifier groups not supported by voice

5. **Multi-language**:
   - Currently English-only
   - AI instructions force English responses
   - Menu must be in English for voice matching

---

### Getting Help

**Check Existing Documentation**:
- This guide (comprehensive reference)
- `/docs/TOUCH_VOICE_QUICK_REF.md` (quick tips)
- Code comments in source files
- Example implementations in `/client/src/pages/ServerView.tsx`

**Debug Workflow**:
1. Enable debug mode
2. Check browser console for errors
3. Verify API responses in Network tab
4. Test components in isolation
5. Check voice session configuration

**Report Issues**:
Include in bug reports:
- Browser and version
- Steps to reproduce
- Console errors
- Network tab screenshots
- Voice transcript (if applicable)

---

## Appendix

### Glossary

- **OrderItem**: Core data structure for items in an order
- **CartItem**: Order-system module's version of OrderItem
- **ApiMenuItem**: Menu item format from backend API
- **OrderParser**: Service that matches voice text to menu items
- **Ephemeral Token**: Short-lived auth token for OpenAI Realtime API
- **WebRTC**: Protocol for real-time voice streaming
- **PTT**: Push-to-talk (press-and-hold microphone interaction)
- **Fuzzy Matching**: Algorithm to match similar but not exact strings
- **Modifier**: Customization option for a menu item (e.g., "no onions")
- **Context**: Environment mode for AI instructions (kiosk vs server)

### Related Documentation

- **Voice Architecture**: `/VOICE_ARCHITECTURE_DEEP_DIVE.md`
- **DRY Refactoring**: `/docs/HANDOFF_DRY_REFACTORING.md`
- **Authentication**: `/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`
- **Getting Started**: `/docs/tutorials/GETTING_STARTED.md`
- **API Reference**: `/docs/reference/api/api/README.md`

### Change Log

**Version 1.0** (November 7, 2025)
- Initial comprehensive documentation
- Covers all components and features
- Includes code examples and references
- Migration guide for legacy systems

---

**End of Documentation**

For questions or contributions, see `/README.md` or contact the development team.
