# Square Payment Integration

**Last Updated**: October 11, 2025
**Version**: 6.0.7
**Status**: ✅ Production Ready (Sandbox Tested)

---

## Overview

The Restaurant OS integrates with Square for payment processing, supporting both online payments (Square Web SDK) and in-person payments (Square Terminal API). This document covers the complete payment flow from order creation through confirmation.

## Table of Contents

- [Architecture](#architecture)
- [Square Terminal API](#square-terminal-api)
- [Payment Flow](#payment-flow)
- [Error Handling](#error-handling)
- [Security](#security)
- [Testing](#testing)
- [Known Issues](#known-issues)

---

## Architecture

### Payment Methods

```
┌─────────────────────────────────────────────────┐
│              Payment Methods                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Square Web SDK (Online Orders)              │
│     - Hosted checkout page                      │
│     - Card tokenization                         │
│     - Redirect flow                             │
│                                                  │
│  2. Square Terminal API (In-Person)             │
│     - Physical terminal device                  │
│     - Tap/chip/swipe                            │
│     - Polling-based status checks               │
│                                                  │
│  3. Cash (Manual)                               │
│     - Order created, marked pending             │
│     - Completed at register                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Component Flow

```
┌──────────────┐
│   Client     │ POST /orders → Creates order (status: pending)
│  (React)     │ POST /terminal/checkout → Creates Square checkout
└──────┬───────┘
       │ Poll every 2s
       ↓
┌──────────────┐
│   Server     │ ← Validates amount (NEVER trust client)
│  (Express)   │ → Calls Square Terminal API
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Square     │ → Customer taps card on terminal
│  Terminal    │ → Processes payment
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Database   │ → Order status: pending → confirmed
│  (Supabase)  │ → Payment audit log created
└──────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `/server/src/routes/terminal.routes.ts` | Terminal API endpoints | 374 |
| `/server/src/services/orders.service.ts` | Payment completion logic | Lines 353-417 |
| `/server/src/routes/orders.routes.ts` | Order creation | Lines 38-55 |
| `/client/src/pages/CheckoutPage.tsx` | Checkout UI + polling | Lines 14-358 |
| `/client/src/contexts/UnifiedCartContext.tsx` | Cart state | Lines 38-221 |

---

## Square Terminal API

### Environment Variables

```bash
# Server (.env)
SQUARE_ACCESS_TOKEN=your_access_token
SQUARE_ENVIRONMENT=sandbox  # or 'production'
SQUARE_LOCATION_ID=your_location_id

# Client (.env)
VITE_SQUARE_APP_ID=your_app_id
VITE_SQUARE_LOCATION_ID=your_location_id
VITE_SQUARE_ENVIRONMENT=sandbox  # Must match server
```

---

### Endpoint 1: Create Terminal Checkout

Creates a new payment checkout on a Square terminal device.

```http
POST /api/v1/terminal/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order-uuid",
  "amount": 3746,  // In cents ($37.46)
  "deviceId": "device-uuid",
  "note": "Order #1234"
}
```

**Server-Side Validation** (`terminal.routes.ts:38-155`):
```typescript
// 1. Fetch order from database
const order = await db.orders.findUnique({
  where: { id: orderId, restaurant_id: restaurantId }
});

// 2. Calculate expected total (NEVER trust client amount)
const expectedTotal = order.subtotal + order.tax + order.tip;

// 3. Verify amounts match (1 cent tolerance for rounding)
if (Math.abs(expectedTotal - (amount / 100)) > 0.01) {
  throw new Error('Amount mismatch - possible tampering');
}

// 4. Call Square API
const checkout = await squareClient.terminal.checkoutsApi.createTerminalCheckout({
  checkout: {
    amountMoney: { amount: amount, currency: 'USD' },
    deviceOptions: { deviceId: deviceId },
    referenceId: orderId,
    note: note
  }
});

// 5. Store checkout ID in order metadata
await db.orders.update({
  where: { id: orderId },
  data: {
    metadata: {
      ...order.metadata,
      squareCheckoutId: checkout.result.checkout.id
    }
  }
});
```

**Response**:
```json
{
  "checkout": {
    "id": "checkout-uuid",
    "status": "PENDING",
    "amountMoney": {
      "amount": 3746,
      "currency": "USD"
    },
    "deviceOptions": {
      "deviceId": "device-uuid"
    },
    "createdAt": "2025-10-11T18:30:00Z"
  }
}
```

---

### Endpoint 2: Get Checkout Status (Polling)

Retrieves current status of a terminal checkout.

```http
GET /api/v1/terminal/checkout/:checkoutId
Authorization: Bearer {token}
```

**Server Logic** (`terminal.routes.ts:157-203`):
```typescript
// Call Square API
const response = await squareClient.terminal.checkoutsApi.getTerminalCheckout(checkoutId);

// Return current status
return {
  checkout: {
    id: response.result.checkout.id,
    status: response.result.checkout.status, // PENDING, IN_PROGRESS, COMPLETED, CANCELED
    paymentIds: response.result.checkout.paymentIds || [],
    amountMoney: response.result.checkout.amountMoney
  }
};
```

**Response**:
```json
{
  "checkout": {
    "id": "checkout-uuid",
    "status": "COMPLETED",
    "paymentIds": ["payment-uuid"],
    "amountMoney": {
      "amount": 3746,
      "currency": "USD"
    }
  }
}
```

**Possible Statuses**:
- `PENDING` - Waiting for customer to tap card
- `IN_PROGRESS` - Processing payment
- `COMPLETED` - Payment successful
- `CANCELED` - Payment canceled
- `FAILED` - Payment failed

---

### Endpoint 3: Cancel Checkout

Cancels an in-progress terminal checkout.

```http
POST /api/v1/terminal/checkout/:checkoutId/cancel
Authorization: Bearer {token}
```

**Server Logic** (`terminal.routes.ts:205-249`):
```typescript
// 1. Call Square API to cancel
await squareClient.terminal.checkoutsApi.cancelTerminalCheckout(checkoutId);

// 2. Update order status
await db.orders.update({
  where: { id: orderId },
  data: { status: 'cancelled' }
});

// 3. Broadcast WebSocket event
webSocketService.broadcast(restaurantId, {
  type: 'ORDER_CANCELLED',
  orderId: orderId
});
```

**Response**:
```json
{
  "checkout": {
    "id": "checkout-uuid",
    "status": "CANCELED"
  }
}
```

---

### Endpoint 4: Complete Payment

Marks order as confirmed after payment is completed.

```http
POST /api/v1/terminal/checkout/:checkoutId/complete
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order-uuid"
}
```

**Server Logic** (`terminal.routes.ts:251-324`):
```typescript
// 1. Verify checkout is COMPLETED
const checkout = await squareClient.terminal.checkoutsApi.getTerminalCheckout(checkoutId);
if (checkout.result.checkout.status !== 'COMPLETED') {
  throw new Error('Checkout not completed');
}

// 2. Update order status: pending → confirmed
await db.orders.update({
  where: { id: orderId },
  data: {
    status: 'confirmed',
    paymentInfo: {
      method: 'square_terminal',
      checkoutId: checkoutId,
      paymentIds: checkout.result.checkout.paymentIds,
      completedAt: new Date().toISOString()
    }
  }
});

// 3. Create payment audit log
await db.paymentAuditLogs.create({
  data: {
    restaurantId: restaurantId,
    orderId: orderId,
    paymentProvider: 'square',
    transactionId: checkout.result.checkout.paymentIds[0],
    amount: checkout.result.checkout.amountMoney.amount / 100,
    status: 'success',
    rawResponse: checkout.result
  }
});

// 4. Broadcast WebSocket event to kitchen
webSocketService.broadcast(restaurantId, {
  type: 'ORDER_CONFIRMED',
  orderId: orderId,
  order: updatedOrder
});
```

**Response**:
```json
{
  "order": {
    "id": "order-uuid",
    "status": "confirmed",
    "paymentInfo": {
      "method": "square_terminal",
      "checkoutId": "checkout-uuid",
      "paymentIds": ["payment-uuid"],
      "completedAt": "2025-10-11T18:35:00Z"
    }
  }
}
```

---

### Endpoint 5: List Available Devices

Retrieves all active Square terminal devices for the location.

```http
GET /api/v1/terminal/devices
Authorization: Bearer {token}
```

**Server Logic** (`terminal.routes.ts:326-374`):
```typescript
// 1. Call Square API
const response = await squareClient.devices.devicesApi.listDevices();

// 2. Filter by location
const locationDevices = response.result.devices.filter(device =>
  device.locationId === process.env.SQUARE_LOCATION_ID &&
  device.status === 'ACTIVE'
);

return { devices: locationDevices };
```

**Response**:
```json
{
  "devices": [
    {
      "id": "device-uuid-1",
      "name": "Register 1",
      "status": "ACTIVE",
      "locationId": "location-uuid"
    },
    {
      "id": "device-uuid-2",
      "name": "Register 2",
      "status": "ACTIVE",
      "locationId": "location-uuid"
    }
  ]
}
```

---

## Payment Flow

### Complete Timeline

```
Time    Event                              Component        Details
-----   ---------------------------------  ---------------  ---------------------------
0:00    User clicks "Checkout"             CheckoutPage     Navigate to checkout
0:01    Enter email/phone                  CheckoutPage     Form validation
0:02    Click "Place Order"                CheckoutPage     POST /orders
0:03    Order created (pending)            Server           Status: pending, order_number generated
0:04    POST /terminal/checkout            CheckoutPage     Create Square checkout
0:05    Checkout created                   Square API       Status: PENDING
0:06    Start polling (every 2s)           CheckoutPage     GET /terminal/checkout/:id
0:10    Customer taps card                 Square Terminal  Physical device
0:12    Status: IN_PROGRESS                Square API       Processing payment
0:15    Status: COMPLETED                  Square API       Payment successful
0:16    Poll detects COMPLETED             CheckoutPage     Stop polling
0:17    POST /terminal/.../complete        CheckoutPage     Server updates order
0:18    Order status → confirmed           Server           Database update
0:19    Payment audit log created          Server           PCI compliance
0:20    WebSocket broadcast                Server           Notify kitchen displays
0:21    Navigate to confirmation           CheckoutPage     /order-confirmation
```

### Client-Side Polling Logic

**File**: `/client/src/pages/CheckoutPage.tsx`

```typescript
const pollCheckoutStatus = async (checkoutId: string, orderId: string) => {
  const startTime = Date.now();
  const TIMEOUT = 300000; // 5 minutes
  const INTERVAL = 2000;   // 2 seconds

  const interval = setInterval(async () => {
    try {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT) {
        clearInterval(interval);
        setError('Payment timeout - order will be cancelled');
        await cancelCheckout(checkoutId);
        return;
      }

      // Fetch status from server
      const response = await fetch(`/api/v1/terminal/checkout/${checkoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { checkout } = await response.json();

      // Handle status
      switch (checkout.status) {
        case 'COMPLETED':
          clearInterval(interval);
          // Complete payment
          await fetch(`/api/v1/terminal/checkout/${checkoutId}/complete`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId })
          });
          // Navigate to confirmation
          navigate(`/order-confirmation?orderId=${orderId}`);
          break;

        case 'CANCELED':
        case 'FAILED':
          clearInterval(interval);
          setError(`Payment ${checkout.status.toLowerCase()}`);
          break;

        case 'PENDING':
        case 'IN_PROGRESS':
          // Continue polling
          console.log(`Payment status: ${checkout.status}`);
          break;
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Continue polling - don't stop on network errors
    }
  }, INTERVAL);

  return interval;
};
```

---

## Error Handling

### Network Failures

**Problem**: Polling request fails due to network issue

**Solution**: Continue polling without stopping
```typescript
catch (error) {
  console.error('Polling error:', error);
  // Don't clear interval - network might recover
  retryCount++;
  if (retryCount > 10) {
    clearInterval(interval);
    setError('Network error - please check terminal');
  }
}
```

---

### Timeout (5 minutes)

**Problem**: Customer walks away without completing payment

**Solution**: Auto-cancel after timeout
```typescript
if (Date.now() - startTime > TIMEOUT) {
  clearInterval(interval);

  // Cancel Square checkout
  await fetch(`/api/v1/terminal/checkout/${checkoutId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Update UI
  setError('Payment timeout - order cancelled');
}
```

---

### Amount Mismatch

**Problem**: Client sends different amount than order total (tampering attempt)

**Solution**: Server-side validation ALWAYS wins
```typescript
// Server calculates expected total
const order = await db.orders.findUnique({ where: { id: orderId } });
const serverTotal = order.subtotal + order.tax + order.tip;

// Compare with client-provided amount (1 cent tolerance for rounding)
if (Math.abs(serverTotal - (clientAmount / 100)) > 0.01) {
  return res.status(400).json({
    error: 'Amount mismatch',
    message: 'Order total does not match payment amount',
    expected: serverTotal,
    provided: clientAmount / 100
  });
}
```

---

### Duplicate Payments

**Problem**: User clicks "Pay" button multiple times

**Solution**: Check for existing checkout in order metadata
```typescript
// Check if order already has a pending checkout
if (order.metadata?.squareCheckoutId) {
  const existing = await squareClient.terminal.checkoutsApi
    .getTerminalCheckout(order.metadata.squareCheckoutId);

  if (existing.result.checkout.status === 'PENDING') {
    // Return existing checkout instead of creating new one
    return res.json({ checkout: existing.result.checkout });
  }
}
```

---

## Security

### PCI Compliance

✅ **What we do correctly**:
- Card data NEVER touches our servers
- Square handles all tokenization
- Payment audit logs for compliance
- Server-side amount validation

❌ **What we DON'T do**:
- Store card numbers
- Log card data
- Expose payment tokens to client

---

### Payment Audit Trail

**File**: `/server/src/services/orders.service.ts:353-417`

Every payment creates an immutable audit log:

```typescript
await db.paymentAuditLogs.create({
  data: {
    restaurantId: restaurantId,
    orderId: orderId,
    paymentProvider: 'square',
    transactionId: paymentId,
    amount: order.total,
    status: 'success',
    rawResponse: checkout.result, // Complete Square response
    createdAt: new Date()
  }
});
```

**Retention**: 7 years (required for PCI compliance)

---

### Server-Side Validation

**Why it's critical**:
1. Prevents tampering: User can't modify cart total in browser
2. Ensures consistency: Database is source of truth
3. Protects revenue: No $100 orders paid with $1

**Implementation**:
```typescript
// ❌ NEVER trust client
const amount = req.body.amount; // Could be tampered

// ✅ ALWAYS validate server-side
const order = await db.orders.findUnique({ where: { id: orderId } });
const realTotal = order.subtotal + order.tax + order.tip;

if (realTotal !== amount) {
  throw new Error('Amount tampering detected');
}
```

---

## Testing

### Manual Testing Steps

#### 1. Test Terminal Checkout

```bash
# 1. Create order
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "11111111-1111-1111-1111-111111111111",
    "items": [{"menuItemId": "item-uuid", "quantity": 1, "price": 12.99}],
    "orderType": "takeout",
    "subtotal": 12.99,
    "tax": 1.07,
    "tip": 2.00,
    "total": 16.06
  }'

# Response: {"order": {"id": "order-uuid", "status": "pending"}}

# 2. Create terminal checkout
curl -X POST http://localhost:3001/api/v1/terminal/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-uuid",
    "amount": 1606,
    "deviceId": "device-uuid",
    "note": "Test Order #1234"
  }'

# Response: {"checkout": {"id": "checkout-uuid", "status": "PENDING"}}

# 3. Poll status (repeat every 2 seconds)
curl http://localhost:3001/api/v1/terminal/checkout/checkout-uuid \
  -H "Authorization: Bearer $TOKEN"

# Response: {"checkout": {"status": "PENDING"}} → "IN_PROGRESS" → "COMPLETED"

# 4. Complete payment
curl -X POST http://localhost:3001/api/v1/terminal/checkout/checkout-uuid/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-uuid"}'

# Response: {"order": {"status": "confirmed", "paymentInfo": {...}}}
```

---

#### 2. Test Amount Validation

```bash
# Create order with total $16.06
curl -X POST http://localhost:3001/api/v1/orders \
  -d '{"total": 16.06, ...}'

# Try to pay wrong amount (should fail)
curl -X POST http://localhost:3001/api/v1/terminal/checkout \
  -d '{
    "orderId": "order-uuid",
    "amount": 100  # Wrong! Should be 1606 cents
  }'

# Expected: 400 Bad Request
# {"error": "Amount mismatch", "expected": 16.06, "provided": 1.00}
```

---

#### 3. Test Timeout Cancellation

```bash
# Create checkout
curl -X POST .../terminal/checkout -d '{...}'

# Don't tap card - wait 5 minutes

# Expected: Checkout auto-cancelled, order status → cancelled
```

---

### Automated Tests

```bash
# Run payment flow tests
npm test -- payment.test.ts

# Run integration tests
npm run test:e2e -- --grep "payment"
```

---

## Known Issues

### ✅ Fixed Issues (v6.0.7)

1. **Voice ordering callback empty** - FIXED
   - Orders now add to cart correctly from voice input
   - Location: `DriveThruPage.tsx:50-68`

2. **Auth race condition** - FIXED (commit `93055bc`)
   - Pure Supabase auth flow
   - No more 5-second timeout hack

---

### ⚠️ Current Limitations

1. **Polling vs Webhooks**
   - Current: Poll every 2 seconds (inefficient but works)
   - Better: Square webhooks (requires public URL)
   - Impact: Higher network usage, 2-second delay
   - Workaround: Acceptable for MVP, optimize later

2. **No Refund Support**
   - Current: Can't process refunds through UI
   - Impact: Manual Square dashboard required
   - Workaround: Use Square dashboard for refunds
   - Future: Add refund API endpoints

3. **Single Location Only**
   - Current: Hardcoded SQUARE_LOCATION_ID
   - Impact: Multi-location restaurants need separate configs
   - Workaround: Deploy separate instances per location
   - Future: Dynamic location selection

---

### 🔧 Known Bugs

**None identified** - Terminal integration is stable in sandbox testing

---

## Related Documentation

- [Order Flow](./ORDER_FLOW.md) - Complete order lifecycle
- [Menu System](./MENU_SYSTEM.md) - Menu management
- [Database Schema](./DATABASE.md) - Supabase tables
- [Production Status](./PRODUCTION_STATUS.md) - Current readiness

---

## Square Resources

- [Square Terminal API Docs](https://developer.squareup.com/reference/square/terminal-api)
- [Testing Guide](https://developer.squareup.com/docs/testing/test-values)
- [Sandbox Dashboard](https://squareup.com/dashboard)
- [Production Dashboard](https://squareup.com/dashboard)

---

**Last Updated**: October 11, 2025
**Version**: 6.0.7
**Status**: ✅ Production Ready (Sandbox Tested)
**Maintainer**: Development Team
