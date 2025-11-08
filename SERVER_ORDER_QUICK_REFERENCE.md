# Server Order Entry - Quick Reference Guide

## Architecture Summary

The server order entry system follows this pattern:
1. **Table Selection** → Floor plan canvas
2. **Seat Selection** → Modal with numbered seat grid
3. **Voice Order Entry** → WebRTC + AI parsing
4. **Multi-seat tracking** → Post-order prompts
5. **Order submission** → REST API to backend

## Critical File Paths

### Main Page & Components
```
/client/src/pages/ServerView.tsx                    # Main entry point
/client/src/pages/components/ServerFloorPlan.tsx    # Table visualization
/client/src/pages/components/SeatSelectionModal.tsx # Seat picker
/client/src/pages/components/VoiceOrderModal.tsx    # Voice UI
/client/src/pages/components/PostOrderPrompt.tsx    # Multi-seat flow
```

### Hooks & State Management
```
/client/src/pages/hooks/useServerView.ts            # Table loading, stats
/client/src/pages/hooks/useVoiceOrderWebRTC.ts      # Voice parsing, submission
/client/src/pages/hooks/useTableInteraction.ts      # Table click handler
```

### Voice Infrastructure
```
/client/src/modules/voice/components/VoiceControlWebRTC.tsx
/client/src/modules/voice/services/WebRTCVoiceClient.ts
/client/src/modules/voice/services/VoiceEventHandler.ts
/client/src/modules/voice/services/WebRTCConnection.ts
/client/src/modules/voice/services/VoiceSessionConfig.ts
```

### Backend
```
/server/src/routes/orders.routes.ts                 # POST /api/v1/orders
```

### UI Components
```
/client/src/components/ui/ActionButton.tsx          # Primary action button
/client/src/components/ui/card.tsx                  # Modal card
/client/src/components/ui/button.tsx                # Secondary button
```

## Data Flow Cheat Sheet

### State Lifting (ServerView)
```
ServerView
├─ selectedTableId: string | null
├─ selectedSeat: number | null
├─ showSeatSelection: boolean
└─ voiceOrder: {
    showVoiceOrder: boolean
    currentTranscript: string
    orderItems: OrderItem[]
    orderedSeats: number[]
    showPostOrderPrompt: boolean
    lastCompletedSeat: number | null
    ... (handlers)
  }
```

### Order Item Structure
```typescript
interface OrderItem {
  id: string                           // Generated: "voice-{timestamp}-{random}"
  menuItemId: string | undefined       // UUID from menu
  name: string                         // Display name
  quantity: number                     // 1, 2, 3...
  modifications?: OrderModification[]  // Array of mods
}
```

### API Request (POST /api/v1/orders)
```json
{
  "table_number": "Table 1",          // String, from table.label
  "seat_number": 2,                   // Integer, 1-based
  "items": [{
    "id": "voice-...",
    "menu_item_id": "uuid",
    "name": "Item Name",
    "quantity": 1,
    "price": 12.99,
    "modifications": ["extra cheese"]
  }],
  "customer_name": "Table 1 - Seat 2",
  "type": "dine-in",
  "total_amount": 14.50
}
```

## Button Color Codes

| Action | Color | Component |
|--------|-------|-----------|
| Start Voice Order | `#4ECDC4` (teal) | ActionButton |
| Submit Order | `#4CAF50` (green) | ActionButton |
| Finish Table | `#4CAF50` (green) | ActionButton |
| Add Next Seat | `#4ECDC4` (teal) | ActionButton |
| Cancel | outline | Button |

## Voice Processing Pipeline

```
1. User presses HoldToRecordButton
2. VoiceControlWebRTC.startRecording()
3. WebRTCVoiceClient connects to OpenAI Realtime API
4. VoiceEventHandler emits:
   - 'transcript' events (live display)
   - 'order.detected' events (AI function calls)
5. useVoiceOrderWebRTC.handleOrderData processes:
   - Maps AI item names to menu UUIDs (OrderParser.findBestMenuMatch)
   - Creates OrderItem objects
   - Updates orderItems state
6. User clicks "Submit Order"
7. submitOrder() validates and POSTs to /api/v1/orders
8. Response: orderId + success toast
9. Show PostOrderPrompt (or repeat for next seat)
```

## Multi-Seat Workflow

```
Seat 1 → Voice Order Modal → Post Prompt
         ↓
       "Add Next Seat" 
         ↓
Seat 2 → Voice Order Modal → Post Prompt
         ↓
       "Add Next Seat"
         ↓
Seat 3 → Voice Order Modal → Post Prompt
         ↓
       "Finish Table" → Reset all state
```

## Key Integration Points for Touch Ordering

### 1. Add Touch Menu Grid
**Location**: VoiceOrderModal.tsx (replace or augment voice control)
- Pattern: Similar to SeatSelectionModal grid layout
- Handler: Feed clicks to `handleOrderData` with transformed items

### 2. Reuse Order Item Display
**Location**: VoiceOrderModal.tsx lines 118-168
- Already displays items with remove capability
- Compatible with any OrderItem source (voice or touch)

### 3. Button Styling Pattern
**Location**: ActionButton.tsx
- Supports all sizes (small, medium, large, xl)
- Supports all variants (solid, outline, ghost)
- Can pass custom colors and icons

### 4. State Management
**Location**: useVoiceOrderWebRTC.ts
- `handleOrderData` is input-agnostic
- Can be called by touch menu clicks too
- submitOrder already generic

## Common Issues & Fixes

### Issue: "No items added yet" after voice
**Cause**: OrderParser fuzzy match confidence < 0.5
**Fix**: Check menu item names match spoken words

### Issue: Table not loading
**Cause**: restaurant?.id is null
**Fix**: Check restaurant context in RestaurantProvider

### Issue: Submit button stays disabled
**Cause**: orderItems array is empty
**Fix**: Ensure items were added (handleOrderData called)

### Issue: Seat grid shows wrong count
**Cause**: table.capacity doesn't match actual seats
**Fix**: Verify table configuration in admin

## Feature Flags

| Flag | File | Purpose |
|------|------|---------|
| `NEW_CUSTOMER_ID_FLOW` | useVoiceOrderWebRTC.ts:31 | Controls restaurant ID sourcing |

## Testing Touch Points

1. **Table selection**: Click table on floor plan
2. **Seat selection**: Click seat number in modal
3. **Voice ordering**: Press microphone button
4. **Item review**: See items in list with remove buttons
5. **Submission**: Click "Submit Order"
6. **Multi-seat**: Click "Add Next Seat" from prompt
7. **Finish**: Click "Finish Table" to reset

## Permission Requirements

- **Role**: 'server' or 'admin'
- **Scope**: 'orders:create' (controls "Start Voice Order" button visibility)
- **Header**: X-Client-Flow: 'server'
- **Auth**: Bearer token required

