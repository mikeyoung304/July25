# Server Order Flow - Complete Documentation Index

## Overview

This documentation provides a complete analysis of the server-side order flow in the Restaurant OS platform. It covers authentication, table/seat selection, voice and touch order input, order submission, and multi-seat management.

**Generated:** 2025-11-07
**Depth:** VERY THOROUGH (comprehensive analysis of all components and interactions)

---

## Documentation Files

### 1. Executive Summary
**File:** `SERVER_ORDER_FLOW_EXECUTIVE_SUMMARY.md` (13 KB)

Quick reference for understanding the complete flow. Contains:
- What happens after server login
- Step-by-step order placement flow
- Existing UI components overview
- Component relationships
- Implementation gaps
- Where VoiceOrderModal fits
- Critical code paths
- API contract
- State management architecture

**Best for:** Getting oriented quickly, understanding high-level flow

---

### 2. Complete Analysis
**File:** `server_order_flow_analysis.md` (49 KB)

In-depth technical documentation covering:
1. Current architecture overview (authentication & entry point)
2. After server logs in: /server route
3. Current order placement flow (4 phases)
4. Existing UI components (detailed specs)
5. Core hooks (useServerView, useTableInteraction, useVoiceOrderWebRTC)
6. Data structures (Table, OrderItem, OrderModification)
7. Current implementation gaps
8. VoiceOrderModal positioning
9. Complete user journey sequence (detailed step-by-step)
10. Critical code paths
11. What's built vs what's missing

**Best for:** Deep understanding, implementation decisions, debugging

---

### 3. Visual Diagrams
**File:** `user_flow_diagram.md` (34 KB)

ASCII diagrams showing:
1. Component tree & data flow
2. Complete state flow diagram
3. Modal visibility state machine
4. API call sequence
5. Order item lifecycle
6. Multi-seat tracking state
7. Error handling paths
8. Permission checks

**Best for:** Visual learners, architecture documentation, presentations

---

## Quick Navigation

### By Topic

**Authentication & Login**
- Summary: Section 1
- Analysis: Section 1
- Diagram: N/A (covered in component tree)

**Floor Plan & Table Selection**
- Summary: Section 2 (Step 1)
- Analysis: Section 3 (Phase 1)
- Components: ServerFloorPlan.tsx (176 lines)
- Diagram: Section 2 (State Flow)

**Seat Selection**
- Summary: Section 2 (Step 2), Section 5
- Analysis: Section 3 (Phase 1), Section 4
- Components: SeatSelectionModal.tsx (194 lines)
- Diagram: Section 2, Section 6

**Voice Order Input**
- Summary: Section 2 (Step 3-4)
- Analysis: Section 3 (Phase 2-3), Section 5
- Components: VoiceOrderModal.tsx (507 lines)
- Diagram: Section 2, Section 5

**Touch Order Input**
- Summary: Section 2 (Step 3-4)
- Analysis: Section 3 (Phase 2-3)
- Components: MenuGrid, ItemDetailModal
- Diagram: Section 2

**Order Item Management**
- Summary: Section 2 (Step 5)
- Analysis: Section 3 (Phase 3)
- Diagram: Section 5 (Order Item Lifecycle)

**Order Submission**
- Summary: Section 2 (Step 6), Section 9
- Analysis: Section 3 (Phase 4), Section 10
- Code Path: Section 8
- API Contract: Section 9
- Diagram: Section 4 (API Sequence)

**Post-Order Confirmation**
- Summary: Section 2 (Step 7)
- Analysis: Section 3 (Phase 4)
- Components: PostOrderPrompt.tsx (186 lines)
- Diagram: Section 2, Section 3 (Modal State Machine)

**Multi-Seat Tracking**
- Summary: Section 2 (Step 7)
- Analysis: Section 5, Section 10
- Hook: useVoiceOrderWebRTC.ts (445 lines)
- Diagram: Section 6 (Multi-Seat State)

**Error Handling**
- Analysis: Section 7
- Diagram: Section 7 (Error Handling Paths)

**Permissions & Security**
- Diagram: Section 8 (Permission Checks)

---

## File Organization

### Core Application Files

**Main Component:**
```
/client/src/pages/ServerView.tsx (188 lines)
  - Orchestrator for entire server order flow
  - Manages table, seat, modal visibility states
  - Integrates three main hooks
```

**Hooks:**
```
/client/src/pages/hooks/
  ├─ useServerView.ts (137 lines)
  │  └─ Table loading, polling, stats calculation
  │
  ├─ useTableInteraction.ts (36 lines)
  │  └─ Floor plan click handling utilities
  │
  └─ useVoiceOrderWebRTC.ts (445 lines)
     └─ Order state, voice input, submission, multi-seat tracking
```

**UI Components:**
```
/client/src/pages/components/
  ├─ ServerHeader.tsx (43 lines)
  │  └─ Navigation header
  │
  ├─ ServerFloorPlan.tsx (176 lines)
  │  └─ Interactive table canvas
  │
  ├─ SeatSelectionModal.tsx (194 lines)
  │  └─ Seat picker for multi-seat ordering
  │
  ├─ VoiceOrderModal.tsx (507 lines)
  │  └─ Voice + touch order input interface
  │
  ├─ PostOrderPrompt.tsx (186 lines)
  │  └─ Success confirmation & next steps
  │
  └─ ServerStats.tsx (80 lines)
     └─ Dashboard metrics cards
```

**Types:**
```
/client/src/types/
  ├─ table.ts
  │  └─ Table interface definition
  │
  └─ unified-order.ts
     └─ Order types & normalization functions
```

### Integration Points

**Voice Input:**
```
/client/src/modules/voice/components/VoiceControlWebRTC.tsx
  - WebRTC voice capture
  - Audio streaming to OpenAI Realtime API
  - Function calling for add_to_order()
```

**Menu System:**
```
/client/src/modules/order-system/components/
  ├─ MenuGrid.tsx
  │  └─ Browse menu items
  │
  ├─ ItemDetailModal.tsx
  │  └─ Select modifiers, quantity
  │
  └─ CartItem.tsx (types)
     └─ Local shopping cart item type
```

**Menu Item Matching:**
```
/client/src/modules/orders/services/OrderParser.ts
  - Fuzzy matching menu items from voice input
  - Confidence scoring
  - Modifier extraction
```

**Floor Plan:**
```
/client/src/modules/floor-plan/components/FloorPlanCanvas.tsx
  - Canvas-based table rendering
  - Pan/zoom controls
  - Table click handling
```

**API Client:**
```
/client/src/services/tables/TableService.ts
  - GET /api/v1/tables
  - PATCH /api/v1/tables/:id/status
  
/client/src/services/http/httpClient.ts
  - Handles POST /api/v1/orders (via generic http client)
```

---

## Key Components Explained

### 1. useVoiceOrderWebRTC Hook (THE HEART - 445 lines)

This is the most critical hook managing:
- Order items state
- Voice transcript display
- Order item parsing from AI
- Order submission validation
- Multi-seat tracking (orderedSeats array)
- Post-order prompting
- Metrics tracking

**Key handlers:**
- `handleVoiceTranscript()` - Display transcript only
- `handleOrderData()` - Parse AI-detected items
- `submitOrder()` - Validate & submit to backend
- `handleAddNextSeat()` - Support multi-seat workflow
- `handleFinishTable()` - Reset all state

### 2. VoiceOrderModal Component (507 lines)

The main order-taking interface with:
- Voice/Touch input mode toggle
- VoiceControlWebRTC integration
- MenuGrid for touch browsing
- Order items list management
- Item editing (quantity, modifiers, remove)
- Special requests textarea
- Order total calculation
- Submit button with validation

### 3. SeatSelectionModal Component (194 lines)

Multi-seat order support with:
- Dynamic seat grid (3 columns)
- Visual feedback (selected, ordered, available)
- Seat selection state
- "Start Voice Order" button
- "Finish Table" button
- Progress indicator

### 4. PostOrderPrompt Component (186 lines)

Completion confirmation showing:
- Success animation
- Progress bar (X of Y seats)
- Seat status grid with checkmarks
- "Add Next Seat" button
- "Finish Table" button

---

## Data Flow Diagram

```
ServerView (orchestrator)
  ├─ selectedTableId: string | null
  ├─ selectedTable: Table | null
  ├─ selectedSeat: number | null
  ├─ showSeatSelection: boolean
  ├─ showVoiceOrder: boolean
  ├─ orderNotes: string
  │
  └─ useVoiceOrderWebRTC() returns:
     ├─ orderItems: OrderItem[]
     ├─ orderedSeats: number[]
     ├─ currentTranscript: string
     ├─ showPostOrderPrompt: boolean
     ├─ submitOrder() function
     ├─ handleVoiceTranscript() function
     └─ ... (other handlers)

Flow:
  selectedTableId → SeatSelectionModal & VoiceOrderModal
  selectedSeat → VoiceOrderModal
  orderItems[] → VoiceOrderModal & PostOrderPrompt
  orderedSeats[] → SeatSelectionModal (disabled already-ordered)
```

---

## API Endpoints Used

### 1. GET /api/v1/tables
**Purpose:** Load floor plan
**Called by:** useServerView hook
**Frequency:** On load + every 30 seconds
**Headers:** x-restaurant-id
**Returns:** Table[]

### 2. POST /api/v1/orders
**Purpose:** Submit order for table/seat
**Called by:** useVoiceOrderWebRTC.submitOrder()
**Headers:** Authorization, X-Restaurant-ID, X-Client-Flow: "server"
**Body:** table_number, seat_number, items[], notes, total_amount, customer_name, type
**Returns:** { id: string, status: string, created_at: string, ... }

---

## Critical Validation Points

### Order Submission Validation

Before POST /api/v1/orders:
1. orderItems.length > 0
2. selectedTable exists
3. selectedSeat exists
4. All items have menuItemId (CRITICAL for menu matching)
5. Auth token available (Supabase or localStorage)
6. restaurantId available (from context)

### Item Matching Validation (Voice)

When AI provides item:
1. OrderParser initialized with menuItems
2. Fuzzy match on item name
3. Confidence score > 0.5 required
4. If matched: create OrderItem with menuItemId
5. If unmatched: show error toast, don't add item

---

## Testing Strategy

### E2E Tests Available
- `/tests/e2e/multi-seat-ordering.spec.ts` - Full workflow
- `/tests/e2e/server-touch-voice-ordering.spec.ts` - UI interactions

### Unit Tests
- `/client/src/pages/hooks/__tests__/useVoiceOrderWebRTC.test.tsx` - Hook logic

### Manual Testing Checklist
```
[ ] PIN login → /server loads with tables
[ ] Click available table → SeatSelectionModal opens
[ ] Click seat → enabled "Start Voice Order"
[ ] Click "Start Voice Order" → VoiceOrderModal opens
[ ] Switch between Voice/Touch modes
[ ] Speak item → appears in order list
[ ] Click menu item → ItemDetailModal → "Add to Order"
[ ] Q+/Q- buttons → quantity updates
[ ] Edit button → modify modifiers
[ ] Remove button → item removed with confirmation
[ ] Type special requests → appears in notes
[ ] Submit empty order → validation error
[ ] Submit with items → success toast + PostOrderPrompt
[ ] "Add Next Seat" → back to SeatSelectionModal, seat marked done
[ ] "Finish Table" → reset, back to floor plan
[ ] Table shows as occupied after order
```

---

## Performance Considerations

### API Polling
- Tables refreshed every 30 seconds (configurable)
- Uses interval timer with cleanup
- Prevents concurrent requests with loadingRef

### Voice Processing
- OpenAI Realtime API handles heavy lifting
- Client-side OrderParser uses fuzzy matching (O(n*m) complexity)
- Transcript displayed live, cleared after 3 seconds

### Rendering
- Components use useCallback to prevent unnecessary re-renders
- Modals use Framer Motion for animations
- List rendering uses keys for proper React reconciliation

### State Management
- Single useVoiceOrderWebRTC hook prevents prop drilling
- orderItems[] kept in hook, not persisted (resets on modal close)
- orderedSeats[] preserved across modal reopens

---

## Browser/Platform Support

### Tested On
- Chrome/Chromium (desktop + mobile)
- Safari (desktop + iOS)
- Firefox
- Edge

### Key Requirements
- WebRTC support (voice input)
- LocalStorage (auth token backup)
- Supabase auth (primary)
- Canvas API (floor plan rendering)

---

## Troubleshooting Guide

### Voice Input Not Working
1. Check microphone permissions
2. Verify WebRTC connection
3. Check OpenAI Realtime API key
4. Verify audio is being streamed

### Items Not Being Added
1. Check menu items loaded (useMenuItems hook)
2. Verify OrderParser initialized
3. Check confidence threshold (> 0.5)
4. Look for unmatched items in toast

### Order Submission Failing
1. Check auth token (Supabase or localStorage)
2. Verify all items have menuItemId
3. Check X-Restaurant-ID header
4. Verify backend API is running

### Tables Not Updating
1. Check API polling interval
2. Verify x-restaurant-id header
3. Check network requests
4. Verify floor plan data structure

---

## Future Enhancement Opportunities

### Short Term
- Voice confidence feedback UI
- Order history per table
- Search/filter improvements
- Favorites/recently ordered items

### Medium Term
- Kitchen display integration
- Order modification post-submit
- Payment/tip handling
- Table management UI

### Long Term
- Split bills between seats
- Manager overrides
- Accessibility features
- Mobile app version

---

## References

### Related Documentation
- Floor Plan Creator: See `/client/src/modules/floor-plan/`
- Menu Management: See `/client/src/modules/menu/`
- Kitchen Display System: See `/client/src/pages/KitchenDisplayOptimized.tsx`
- Checkout Flow: See `/client/src/pages/CheckoutPage.tsx`

### External Services
- Supabase: Authentication & database
- OpenAI Realtime API: Voice input processing
- Square: Payment processing (future)

---

## Document Updates

**Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Complete & Comprehensive

To update: Modify any of the three main documents (Summary, Analysis, Diagrams) as the codebase evolves.

---

