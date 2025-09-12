# Voice Server Mode Failure Trace

## Date: 2025-09-10
## Environment: Local Development

## Execution Flow Trace

### 1. User Flow (Client Side)

#### Step 1: Server selects table
```typescript
// ServerView.tsx:38-44
handleTableSelection(tableId) → setShowSeatSelection(true)
```

#### Step 2: Server selects seat
```typescript
// ServerView.tsx:46-51
handleStartVoiceOrder() → voiceOrder.setShowVoiceOrder(true)
```

#### Step 3: Voice Modal Opens
```typescript
// VoiceOrderModal.tsx:89-94
<VoiceControlWebRTC
  onTranscript={(text) => voiceOrder.handleVoiceTranscript({ text, isFinal: false })}
  onOrderDetected={voiceOrder.handleOrderData}
/>
```

#### Step 4: Server speaks order
**Input**: "Two Greek salads with extra chicken"

#### Step 5: Transcript processed
```typescript
// useVoiceOrderWebRTC.ts:89-126
handleVoiceTranscript(text) {
  // Parse locally with OrderParser
  const parsedItems = orderParserRef.current.parseUserTranscript(text)
  processParsedItems(parsedItems) → setOrderItems([...])
}
```

#### Step 6: Server clicks "Submit Order"
```typescript
// VoiceOrderModal.tsx:182-191
<ActionButton onClick={onSubmit}>Submit Order</ActionButton>
// Calls: ServerView.tsx:53-61 handleSubmitOrder()
```

### 2. API Call (Network)

#### Request
```http
POST http://localhost:3001/api/v1/orders
Authorization: Bearer [JWT_TOKEN]
X-Restaurant-ID: 11111111-1111-1111-1111-111111111111

{
  "table_number": "5",
  "seat_number": 2,
  "items": [{
    "id": "voice-1234567890-0.123",
    "menu_item_id": undefined,  // ❌ ISSUE: No menu ID mapping
    "name": "Two Greek salads with extra chicken",
    "quantity": 1,
    "modifications": []
  }],
  "notes": "Voice order from Table 5, Seat 2",
  "total_amount": 12.99,  // Default fallback price
  "customer_name": "Table 5 - Seat 2",
  "order_type": "dine-in"
}
```

#### Response
```json
{
  "id": "ord_123456",
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "order_number": "ORD-0042",
  "status": "pending",
  "type": "online",  // Mapped from 'dine-in'
  "items": [...],
  "total_amount": 12.99,
  "created_at": "2025-09-10T10:00:00Z"
}
```

### 3. Server Side Processing

#### Order Creation
```typescript
// orders.service.ts:71-191
OrdersService.createOrder() {
  // Line 173-174: Broadcast WebSocket event
  broadcastNewOrder(this.wss, data)  // ✅ Emits 'order:created'
}
```

#### WebSocket Broadcast
```typescript
// websocket.ts:167-181
broadcastNewOrder(order) {
  message = {
    type: 'order:created',
    payload: { order },
    timestamp: '2025-09-10T10:00:00Z'
  }
  // Sent to all clients with matching restaurant_id
}
```

### 4. Missing Steps (THE GAP)

#### ❌ NOT CALLED: Payment Initiation
```typescript
// EXPECTED but MISSING:
POST /api/v1/terminal/checkout
{
  "orderId": "ord_123456",
  "deviceId": "DEVICE_ID"  // Never retrieved or configured
}
```

#### ❌ NOT CALLED: Square Terminal
```typescript
// terminal.routes.ts:54-80
// Never reached - no call from client after order creation
terminalApi.createTerminalCheckout({
  amountMoney: { amount: 1299, currency: 'USD' },
  deviceOptions: { deviceId: "???" }
})
```

#### ❌ NOT UPDATED: Order Status
```typescript
// Order remains in 'pending' status
// Never transitions to 'confirmed' or 'preparing'
```

### 5. Client Side After Submit

#### Success Path (Current)
```typescript
// useVoiceOrderWebRTC.ts:189-191
if (response.ok) {
  toast.success(`Order submitted for Table 5, Seat 2!`)
  return true  // ✅ Returns success
}

// ServerView.tsx:54-60
if (success) {
  setSelectedTableId(null)
  setSelectedSeat(null)
  setShowSeatSelection(false)
  voiceOrder.resetVoiceOrder()  // ✅ Clears state
}
```

#### Missing Integration
- No navigation to payment screen
- No Square Terminal checkout initiation
- No payment method selection
- No KDS status update to 'confirmed'

## Failure Analysis

### Primary Failure Points

1. **No Payment Flow Trigger**
   - `submitOrder()` ends after order creation
   - No subsequent payment API call
   - No Square Terminal integration

2. **Missing Device Configuration**
   - No Square Terminal device ID in context
   - No payment terminal selection UI
   - No device pairing/discovery

3. **Status Mismatch**
   - Order created as 'pending'
   - KDS expects 'confirmed' for kitchen display
   - No status transition logic

4. **Cart Context Bypass**
   - Not using UnifiedCartContext
   - No checkout flow integration
   - Missing payment orchestration

## WebSocket Events (KDS)

### Current Event Flow
```json
{
  "type": "order:created",
  "payload": {
    "order": {
      "status": "pending",  // ❌ KDS may filter this out
      "restaurant_id": "11111111-1111-1111-1111-111111111111"
    }
  }
}
```

### Expected Event Flow
```json
{
  "type": "order:created",
  "payload": {
    "order": {
      "status": "confirmed",  // ✅ After payment
      "restaurant_id": "11111111-1111-1111-1111-111111111111",
      "payment_status": "paid"
    }
  }
}
```

## Error Evidence

### Console Logs
```
[useVoiceOrderWebRTC] Voice transcript {text: "Two Greek salads...", isFinal: true}
[useVoiceOrderWebRTC] Order submitted for Table 5, Seat 2!
// NO PAYMENT LOGS
// NO SQUARE API CALLS
// NO TERMINAL CHECKOUT
```

### Network Tab
- ✅ POST /api/v1/orders - 201 Created
- ❌ POST /api/v1/terminal/checkout - Never called
- ❌ POST /api/v1/payments/create - Never called
- ❌ GET /api/v1/terminal/devices - Never called

## Conclusion

The server voice flow successfully creates orders but completely lacks payment integration. Orders remain in 'pending' status and never proceed through Square Terminal checkout, preventing them from appearing in KDS as actionable items.