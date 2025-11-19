# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Voice & WebSocket

---

# Voice Ordering Investigation - Document Index

## Overview

Complete investigation of how voice ordering connects to the cart system in the ServerView (dine-in ordering for servers).

**Key Finding**: Voice ordering DOES NOT use UnifiedCartContext. It maintains separate local state and submits directly to the backend.

---

## Documents Created

### 1. VOICE_CART_INVESTIGATION_SUMMARY.md (START HERE)
**Best for**: Quick reference and answering specific questions

Contains:
- Direct answers to all investigation questions
- Voice order event chain with line numbers
- Cart system status
- Critical code locations table
- Handler implementation details
- Touch vs voice comparison
- Why voice orders work despite not using cart
- Error handling layers
- Logging points for debugging
- Kiosk vs ServerView comparison

**Key insight**: Voice orders are processed through local `orderItems[]` state, not UnifiedCartContext.

---

### 2. VOICE_TO_CART_ANALYSIS.md
**Best for**: Deep dive into complete flow with code snippets

Contains:
- Executive summary
- Touch ordering flow (with code)
- Voice ordering flow (with code)
- Parallel systems comparison
- Order submission flow (complete code)
- Kiosk voice ordering comparison
- Voice parsing and menu matching
- Error handling and logging
- Metrics and tracking
- Complete code locations summary

**Best for**: Understanding the full architecture and seeing actual code.

---

### 3. VOICE_CART_FLOW_DIAGRAM.txt
**Best for**: Visual flow understanding

Contains:
- Touch ordering flow diagram
- Voice ordering flow diagram
- Key differences highlighted
- Cart system status
- Critical code flows
- Kiosk comparison
- Potential issues
- Error handling layers
- Logging points
- Debug steps

**Best for**: Quick visual understanding of the two parallel flows.

---

## Quick Navigation

### Question: Does voice ordering use UnifiedCartContext?
See: VOICE_CART_INVESTIGATION_SUMMARY.md > Section 2

### Question: Where is the voice order handler?
See: VOICE_CART_INVESTIGATION_SUMMARY.md > Section 3 & 4

### Question: How does voice transcript become an order?
See: VOICE_CART_FLOW_DIAGRAM.txt > Voice Ordering section

### Question: What's the complete code flow?
See: VOICE_TO_CART_ANALYSIS.md > Sections 1-7

### Question: Where are logging points?
See: VOICE_CART_FLOW_DIAGRAM.txt > Logging Points section

### Question: What validation exists?
See: VOICE_CART_INVESTIGATION_SUMMARY.md > Section 8

### Question: How does kiosk voice differ?
See: VOICE_CART_INVESTIGATION_SUMMARY.md > Section 10

---

## Key Files Discussed

### Frontend Files
- `client/src/pages/components/VoiceOrderModal.tsx` - Main UI component
- `client/src/pages/hooks/useVoiceOrderWebRTC.ts` - Order handler (CRITICAL)
- `client/src/modules/voice/services/VoiceEventHandler.ts` - Event processing
- `client/src/modules/voice/hooks/useWebRTCVoice.ts` - React hook
- `client/src/modules/voice/components/VoiceControlWebRTC.tsx` - Voice UI
- `client/src/contexts/UnifiedCartContext.tsx` - Cart context (NOT used by voice)
- `client/src/modules/order-system/components/ItemDetailModal.tsx` - Touch menu
- `client/src/components/kiosk/VoiceOrderingMode.tsx` - Kiosk comparison

### API Endpoints
- `POST /api/v1/orders` - Where orders are submitted (both voice and touch)

---

## Critical Function Locations

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| handleFunctionCallDone() | VoiceEventHandler.ts | 572-625 | Emits order.detected event |
| handleOrderData() | useVoiceOrderWebRTC.ts | 146-223 | **MAIN HANDLER** - processes voice items |
| submitOrder() | useVoiceOrderWebRTC.ts | 231-361 | Submits orderItems[] to backend |
| handleAddToOrder() | VoiceOrderModal.tsx | 110-138 | Handles touch items |
| findBestMenuMatch() | OrderParser.ts | - | Fuzzy matches voice to menu |
| addItem() | UnifiedCartContext.tsx | 151-169 | Cart method (NOT used by voice) |

---

## The Short Version

**Voice ordering flow**:
1. User speaks into microphone
2. OpenAI Realtime API transcribes and parses
3. API calls `add_to_order` function with items
4. VoiceEventHandler emits `order.detected` event
5. useVoiceOrderWebRTC.handleOrderData() receives event
6. OrderParser fuzzy-matches items to menu
7. Matched items added to local `orderItems[]` state
8. Items displayed in VoiceOrderModal
9. User submits → POST /api/v1/orders
10. Backend creates order and items

**Cart system**:
- NOT involved in voice ordering
- Only used by touch menu (MenuGrid)
- Voice items managed locally in VoiceOrderModal

**The "cart update issue"**:
- Likely backend issue when creating orders
- Affects both voice and touch equally
- Happens at `/api/v1/orders` endpoint
- Involves order_items record creation and inventory updates

---

## Investigation Status

Complete. All code paths traced and documented.

### What was discovered:
- Voice ordering uses separate state management (not UnifiedCartContext)
- Complete event chain from voice transcript to order submission
- Multi-layer error handling and validation
- Why voice ordering works despite separate state
- How it differs from kiosk voice ordering
- Where the "cart update issue" likely is

### What wasn't needed:
- Backend code inspection (client-side issue found)
- Database schema review (state management issue, not DB)

---

## For Further Investigation

If the mentioned "cart update issue" needs to be fixed:

1. Check `/api/v1/orders` endpoint on backend
2. Look for order and order_item creation logic
3. Check cart/inventory update after order creation
4. Verify transaction handling
5. Test with both voice and touch orders
6. Check if issue is in order creation or item linking

The client-side code appears sound. The issue is likely in backend order processing.

---

## Document Sizes

- VOICE_CART_INVESTIGATION_SUMMARY.md: 10 KB
- VOICE_TO_CART_ANALYSIS.md: 18 KB
- VOICE_CART_FLOW_DIAGRAM.txt: 7.3 KB

Total: ~35 KB of documentation

---

End of Index
