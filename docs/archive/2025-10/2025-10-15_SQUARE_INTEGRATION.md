> **⚠️ ARCHIVED DOCUMENTATION**
> **Date Archived:** October 15, 2025
> **Reason:** Consolidated into canonical documentation
> **See Instead:** [Square Integration (Active)](../../explanation/concepts/SQUARE_INTEGRATION.md)
> **This archive preserved for:** Historical integration reference

# Square Payment Integration (ARCHIVED)

**Last Updated**: October 14, 2025
**Version**: 6.0.7
**Status**: ✅ Production Ready - Payment System Fully Operational (ARCHIVED)
**SDK Version**: Square Node.js SDK v43

---

## Executive Summary

Payment processing is **fully operational** as of October 14, 2025. After resolving SDK migration issues and credential mismatches, the complete payment flow (order creation → payment → confirmation) works end-to-end in production.

**Recent Fixes** (October 14, 2025):
- ✅ Migrated to Square SDK v43 (authentication + API methods)
- ✅ Fixed credential validation (location ID typo)
- ✅ Implemented credential validation safeguards
- ✅ Resolved idempotency key length limits
- ✅ Fixed database constraint violations
- ✅ Created comprehensive post-mortem

**See**: [POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md](./POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md) for incident details.

---

## Table of Contents

- [Architecture](#architecture)
- [Environment Configuration](#environment-configuration)
- [Web Payments API](#web-payments-api)
- [Square Terminal API](#square-terminal-api)
- [Credential Validation](#credential-validation)
- [Error Handling](#error-handling)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Architecture

### Payment Methods

```
┌─────────────────────────────────────────────────┐
│              Payment Methods                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Square Web Payments SDK (Online Orders)     │
│     - Client-side card tokenization             │
│     - Server-side payment processing            │
│     - Server validates all amounts              │
│     - PCI compliant (cards never touch server)  │
│                                                  │
│  2. Square Terminal API (In-Person)             │
│     - Physical terminal device                  │
│     - Tap/chip/swipe                            │
│     - Polling-based status checks               │
│                                                  │
│  3. Demo Mode (Development/Testing)             │
│     - Mocked payment responses                  │
│     - Skips real Square API calls               │
│     - Useful for frontend development           │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Component Flow

```
┌──────────────┐
│   Client     │ Creates card token via Square Web SDK
│  (React)     │ POST /orders → Creates order (status: pending)
│              │ POST /payments/create → Processes payment
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Server     │ ← Validates amount (NEVER trust client)
│  (Express)   │ → Calls Square Payments API
│              │ → Updates order with payment info
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Square     │ → Processes payment
│  Payments    │ → Returns payment result
│    API       │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Database   │ → Order metadata updated with payment info
│  (Supabase)  │ → Payment audit log created
└──────────────┘
```

### Key Files

| File | Purpose | Key Changes (Oct 14) |
|------|---------|---------------------|
| `/server/src/routes/payments.routes.ts` | Web payments endpoint | SDK v43 auth, startup validation |
| `/server/src/routes/terminal.routes.ts` | Terminal API endpoints | SDK v43 auth |
| `/server/src/services/payment.service.ts` | Payment validation & idempotency | Shortened keys to 26 chars |
| `/server/src/services/orders.service.ts` | Order payment updates | Separated payment/order status |
| `/client/src/pages/CheckoutPage.tsx` | Checkout UI | Card tokenization |
| `/scripts/validate-square-credentials.sh` | Credential validation | NEW - Validates credentials match |

---

## Environment Configuration

### Server Environment Variables

```bash
# Required Variables
SQUARE_ACCESS_TOKEN=your_access_token        # EAA... prefix for sandbox
SQUARE_ENVIRONMENT=sandbox                    # or 'production'
SQUARE_LOCATION_ID=your_location_id          # Must match access token!
SQUARE_APPLICATION_ID=your_app_id            # For Web SDK
```

### Client Environment Variables

```bash
# Required for Web Payments SDK
VITE_SQUARE_APP_ID=your_app_id
VITE_SQUARE_LOCATION_ID=your_location_id
VITE_SQUARE_ENVIRONMENT=sandbox              # Must match server
```

### Critical Configuration Notes

⚠️ **Location ID MUST Match Access Token** ⚠️

Each Square access token authorizes specific locations. Using a location ID that doesn't belong to your token will cause `400 BAD_REQUEST` errors.

**Verify Configuration**:
```bash
npm run validate:square
```

This script validates:
1. Access token is valid
2. Location ID exists for that token
3. Payment API permissions are correct

---

## Web Payments API

### Overview

The Web Payments API handles online orders from the kiosk. The flow is:
1. Client tokenizes card using Square Web SDK
2. Client sends token + order ID to server
3. Server validates order amount (NEVER trust client)
4. Server calls Square Payments API
5. Server updates order with payment status

### Endpoint: Create Payment

**POST** `/api/v1/payments/create`

Creates a payment for an existing order.

**Headers**:
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-Restaurant-ID: {restaurant_id}
```

**Request Body** (snake_case per ADR-001):
```json
{
  "order_id": "47e90a0b-2a69-473b-831d-04311b6bf275",
  "token": "cnon:card-nonce-ok",
  "amount": 3283,
  "idempotency_key": "optional-client-key"
}
```

**Response** (success):
```json
{
  "success": true,
  "paymentId": "demo-payment-abc123",
  "status": "COMPLETED",
  "receiptUrl": "https://squareup.com/receipt/...",
  "order": {
    "id": "47e90a0b-2a69-473b-831d-04311b6bf275",
    "order_number": "20251014-0022",
    "status": "pending",
    "metadata": {
      "payment": {
        "status": "paid",
        "method": "card",
        "paymentId": "demo-payment-abc123",
        "updatedAt": "2025-10-14T18:29:00Z"
      }
    }
  }
}
```

**Response** (error):
```json
{
  "success": false,
  "error": "Card declined",
  "detail": "Insufficient funds"
}
```

### Server-Side Payment Flow

**File**: `/server/src/routes/payments.routes.ts:104-318`

```typescript
// CRITICAL: SDK v43 Authentication Format
const client = new SquareClient({
  environment: process.env['SQUARE_ENVIRONMENT'] === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
  token: process.env['SQUARE_ACCESS_TOKEN']!  // ← Uses 'token', not 'accessToken'
});

const paymentsApi = client.payments;

// 1. Validate payment request (server-side amount validation)
const validation = await PaymentService.validatePaymentRequest(
  order_id,
  restaurantId,
  amount,
  idempotency_key
);

// 2. Use server-calculated amount (NEVER trust client)
const serverAmount = validation.amount;
const serverIdempotencyKey = validation.idempotencyKey;

// 3. Create payment request
const paymentRequest = {
  sourceId: token,
  idempotencyKey: serverIdempotencyKey,  // Max 45 characters
  amountMoney: {
    amount: BigInt(serverAmount),         // In cents
    currency: 'USD',
  },
  locationId: process.env['SQUARE_LOCATION_ID'],
  referenceId: order_id,
  note: `Payment for order #${order.order_number}`
};

// 4. Call Square Payments API (SDK v43 syntax)
const paymentResult = await paymentsApi.create(paymentRequest);
// ← Note: SDK v43 removed .result wrapper

// 5. Update order with payment info
await OrdersService.updateOrderPayment(
  restaurantId,
  order_id,
  'paid',
  'card',
  paymentResult.payment.id
);

// 6. Log for audit trail
await PaymentService.logPaymentAttempt({
  orderId: order_id,
  amount: validation.orderTotal,
  status: 'success',
  restaurantId: restaurantId,
  paymentMethod: 'card',
  paymentId: paymentResult.payment.id,
  userAgent: req.headers['user-agent'],
  idempotencyKey: serverIdempotencyKey
});
```

### Square SDK v43 Breaking Changes

**October 14, 2025**: Upgraded from legacy SDK to v43. Key changes:

#### 1. Authentication Format

```typescript
// ❌ OLD (Legacy SDK)
const client = new SquareClient({
  environment: SquareEnvironment.Sandbox,
  accessToken: process.env['SQUARE_ACCESS_TOKEN']
} as any);

// ✅ NEW (SDK v43)
const client = new SquareClient({
  environment: SquareEnvironment.Sandbox,
  token: process.env['SQUARE_ACCESS_TOKEN']!
});
```

#### 2. API Method Names

```typescript
// ❌ OLD
const response = await paymentsApi.createPayment(paymentRequest);
const payment = response.result.payment;

// ✅ NEW
const paymentResult = await paymentsApi.create(paymentRequest);
const payment = paymentResult.payment;  // No .result wrapper
```

#### 3. Response Structure

```typescript
// ❌ OLD
response.result.locations  // Nested under .result

// ✅ NEW
response.locations  // Direct access
```

**See**: Commits `482253f` (auth fix) and `d100854` (API methods) for implementation details.

---

### Payment Validation Service

**File**: `/server/src/services/payment.service.ts`

The PaymentService ensures server-side validation and generates proper idempotency keys.

#### validatePaymentRequest()

```typescript
export async function validatePaymentRequest(
  orderId: string,
  restaurantId: string,
  clientAmount?: number,
  clientIdempotencyKey?: string
) {
  // 1. Fetch order from database
  const order = await OrdersService.getOrder(restaurantId, orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // 2. Calculate expected amount (server is source of truth)
  const serverTotal = order.total_amount;

  // 3. Validate client amount (if provided)
  if (clientAmount && Math.abs(serverTotal - clientAmount / 100) > 0.01) {
    logger.warn('Payment amount mismatch', {
      orderId,
      serverTotal,
      clientAmount: clientAmount / 100
    });
    // Continue with server amount (don't trust client)
  }

  // 4. Generate idempotency key (max 45 chars for Square)
  const idempotencyKey = clientIdempotencyKey ||
    `${order.id.slice(-12)}-${Date.now()}`;  // 26 characters

  if (idempotencyKey.length > 45) {
    throw new Error('Idempotency key too long (max 45 chars)');
  }

  return {
    amount: Math.round(serverTotal * 100),  // Convert to cents
    idempotencyKey,
    orderTotal: serverTotal,
    subtotal: order.subtotal,
    tax: order.tax
  };
}
```

**Key Fixes** (October 14, 2025):
- Shortened idempotency keys from 93 chars to 26 chars
- Format: `{last_12_order_id}-{timestamp}` (e.g., `04311b6bf275-1697234567890`)
- Square requires ≤45 characters

**See**: Commit `81b8b56` for idempotency key fix.

---

### Demo Mode

For development and testing, the server supports demo mode:

```bash
# Server .env
SQUARE_ACCESS_TOKEN=demo
# OR
NODE_ENV=development
```

When enabled:
- Skips real Square API calls
- Returns mocked payment responses
- Useful for frontend development without Square credentials
- Orders still created in database

**Location**: `payments.routes.ts:171-186`

---

## Square Terminal API

### Overview

The Terminal API handles in-person payments using physical Square terminal devices.

### Endpoint 1: Create Terminal Checkout

**POST** `/api/v1/terminal/checkout`

Creates a new payment checkout on a Square terminal device.

**Request**:
```json
{
  "orderId": "order-uuid",
  "amount": 3746,
  "deviceId": "device-uuid",
  "note": "Order #1234"
}
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
    }
  }
}
```

### Endpoint 2: Get Checkout Status

**GET** `/api/v1/terminal/checkout/:checkoutId`

Polls the current status of a terminal checkout.

**Response**:
```json
{
  "checkout": {
    "id": "checkout-uuid",
    "status": "COMPLETED",
    "paymentIds": ["payment-uuid"]
  }
}
```

**Statuses**: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`, `FAILED`

### Endpoint 3: Complete Payment

**POST** `/api/v1/terminal/checkout/:checkoutId/complete`

Marks order as confirmed after terminal payment completes.

---

## Credential Validation

### Validation Script

**NEW** (October 14, 2025): Credential validation script to prevent deployment failures.

**Run Before Deployment**:
```bash
npm run validate:square
```

**What It Validates**:
1. ✅ Access token is valid
2. ✅ Fetches available locations for token
3. ✅ Verifies `SQUARE_LOCATION_ID` matches token
4. ✅ Tests payment API permissions

**Example Output** (success):
```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Square Credentials Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: sandbox

📍 Test 1: Fetching locations for access token...
✅ Access token is valid
   Found 1 location(s)

📍 Test 2: Validating SQUARE_LOCATION_ID...
✅ Location ID matches: L1V8KTKZN0DHD
   Location Name: Default Test Account
   Merchant ID: MLA23NBJXS2KB

💳 Test 3: Testing payment creation permissions...
✅ Payment API accessible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All Square credentials validated successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Example Output** (failure):
```bash
❌ LOCATION ID MISMATCH DETECTED

   Configured: SQUARE_LOCATION_ID=L3V8KTKZN0DHD
   Available locations for this access token:
   - L1V8KTKZN0DHD (Default Test Account)

🔧 FIX: Update your SQUARE_LOCATION_ID environment variable
```

### Startup Validation

The server automatically validates credentials on startup:

**File**: `payments.routes.ts:37-101`

```typescript
// STARTUP VALIDATION: Verify Square credentials match
(async () => {
  // Skip in demo mode
  if (!process.env['SQUARE_ACCESS_TOKEN'] ||
      process.env['SQUARE_ACCESS_TOKEN'] === 'demo' ||
      process.env['NODE_ENV'] === 'development') {
    logger.info('Demo mode: Skipping Square credential validation');
    return;
  }

  try {
    // Fetch available locations
    const locationsResponse = await client.locations.list();
    const locations = locationsResponse.locations || [];
    const locationIds = locations.map((l) => l.id)
      .filter((id): id is string => id !== undefined);
    const configuredLocation = process.env['SQUARE_LOCATION_ID'];

    // Check if configured location exists for this token
    if (!locationIds.includes(configuredLocation)) {
      logger.error('❌ SQUARE CREDENTIAL MISMATCH DETECTED', {
        configured: configuredLocation,
        available: locationIds
      });
      // Server continues running but logs prominent error
    } else {
      logger.info('✅ Square credentials validated successfully', {
        locationId: configuredLocation,
        locationName: locations.find((l) => l.id === configuredLocation)?.name,
        environment: process.env['SQUARE_ENVIRONMENT']
      });
    }
  } catch (error: any) {
    logger.error('❌ Square credential validation failed', {
      error: error.message
    });
  }
})();
```

**Why This Matters**:

On October 14, 2025, we spent 4 hours debugging payment failures that were ultimately caused by a single-character typo in `SQUARE_LOCATION_ID` (`L3` instead of `L1`). This safeguard prevents that from happening again.

**See**: [POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md](./POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md)

---

## Error Handling

### Common Errors

#### 1. Invalid source_id

**Error**:
```json
{
  "code": "BAD_REQUEST",
  "detail": "Invalid source_id demo-token"
}
```

**Cause**: Client sends demo token but server has real Square credentials (or vice versa)

**Fix**: Match environment configuration:
- Client in demo mode → Server in demo mode
- Client with real SDK → Server with real credentials

---

#### 2. Location Not Authorized

**Error**:
```json
{
  "code": "BAD_REQUEST",
  "detail": "Not authorized to take payments with location_id=L3V8KTKZN0DHD"
}
```

**Cause**: `SQUARE_LOCATION_ID` doesn't belong to the `SQUARE_ACCESS_TOKEN`

**Fix**:
1. Run `npm run validate:square` to see available locations
2. Update `SQUARE_LOCATION_ID` to match one of the available locations

---

#### 3. Idempotency Key Too Long

**Error**:
```json
{
  "code": "VALUE_TOO_LONG",
  "detail": "Field must not be greater than 45 length",
  "field": "idempotency_key"
}
```

**Cause**: Idempotency key exceeds Square's 45-character limit

**Fix**: Already implemented in `payment.service.ts`. Keys are now 26 characters.

**See**: Commit `81b8b56`

---

#### 4. Database Constraint Violation

**Error**:
```json
{
  "code": "23514",
  "message": "new row violates check constraint \"orders_status_check\""
}
```

**Cause**: Attempting to set invalid order status

**Fix**: Payment status and order status are now managed separately:
- **Payment status**: Stored in `order.metadata.payment.status` ('paid', 'failed', 'refunded')
- **Order status**: Managed via `updateOrderStatus()` ('pending', 'confirmed', 'preparing', etc.)

**See**: Commit `e1ab5fb`

---

### Amount Mismatch Prevention

**Problem**: Client sends different amount than order total (tampering attempt)

**Solution**: Server ALWAYS validates and uses its own calculated amount

```typescript
// ❌ NEVER trust client
const payment = await createPayment({
  amount: req.body.amount  // Could be tampered!
});

// ✅ ALWAYS validate server-side
const order = await getOrder(orderId);
const serverAmount = Math.round(order.total_amount * 100);

if (clientAmount && Math.abs(serverAmount - clientAmount) > 1) {
  logger.warn('Amount mismatch - using server amount');
}

const payment = await createPayment({
  amount: serverAmount  // Server is source of truth
});
```

---

## Security

### PCI Compliance

✅ **What we do correctly**:
- Card data NEVER touches our servers
- Square Web SDK handles tokenization
- Payment audit logs for compliance
- Server-side amount validation
- 7-year audit trail retention

❌ **What we DON'T do**:
- Store card numbers
- Log card data
- Expose payment tokens to client

### Payment Audit Trail

Every payment creates an immutable audit log:

**File**: `payments.routes.ts:212-227`

```typescript
await PaymentService.logPaymentAttempt({
  orderId: order_id,
  amount: validation.orderTotal,
  status: 'success',
  restaurantId: restaurantId,
  paymentMethod: 'card',
  paymentId: paymentResult.payment.id,
  userAgent: req.headers['user-agent'],
  idempotencyKey: serverIdempotencyKey,
  metadata: {
    orderNumber: order.order_number,
    userRole: req.user?.role
  },
  userId: req.user?.id,
  ipAddress: req.ip
});
```

**Retention**: 7 years (PCI compliance requirement)

---

## Testing

### Manual Testing

#### 1. Test Complete Payment Flow

```bash
# 1. Start local servers
npm run dev

# 2. Navigate to kiosk
open http://localhost:5173

# 3. Place order:
#    - Click "Kiosk"
#    - Click "View Menu"
#    - Add items to cart
#    - Click "Cart" → "Checkout"
#    - Fill form → "Place Order"

# 4. Enter test card:
#    - Card: 4111 1111 1111 1111
#    - Exp: 12/25
#    - CVV: 123
#    - ZIP: 12345

# 5. Verify confirmation page shows:
#    - Order number
#    - "Order Confirmed!" message
#    - Order summary
```

#### 2. Test Credential Validation

```bash
# Set environment variables
export SQUARE_ACCESS_TOKEN="your_token"
export SQUARE_LOCATION_ID="your_location_id"
export SQUARE_ENVIRONMENT="sandbox"

# Run validation
npm run validate:square

# Expected: ✅ All credentials validated successfully
```

#### 3. Test Demo Mode

```bash
# Server .env
SQUARE_ACCESS_TOKEN=demo

# Start server
npm run dev:server

# Place order - should succeed with mocked payment
```

### Automated Tests

```bash
# Run payment tests
cd server && npm test -- payment

# Run integration tests
npm run test:e2e
```

---

## Troubleshooting

### Payment Fails with "Not Authorized"

**Symptom**: 400 error - "Not authorized to take payments with location_id"

**Solution**:
1. Run validation script:
   ```bash
   npm run validate:square
   ```
2. Compare configured vs available location IDs
3. Update `SQUARE_LOCATION_ID` in environment
4. Restart server

### Server Logs Show "401 UNAUTHORIZED"

**Symptom**: Square API returns 401 error

**Solution**:
1. Verify `SQUARE_ACCESS_TOKEN` is correct
2. Check token hasn't expired
3. Verify environment matches token type:
   - Sandbox token → `SQUARE_ENVIRONMENT=sandbox`
   - Production token → `SQUARE_ENVIRONMENT=production`

### Client Shows "[object Object]"

**Symptom**: Error message displays as `[object Object]`

**Solution**: Already fixed in `CheckoutPage.tsx`. Error handling now properly stringifies error messages.

**See**: Commits `68cc1dd` (client fix) and `1a6f8c3` (enhanced error handling)

### Payment Succeeds but Order Status Doesn't Update

**Symptom**: Payment completes but order stays in "pending"

**Solution**: Fixed in commit `e1ab5fb`. Payment status and order status are now separate:
- Payment status updates automatically in metadata
- Order status must be updated separately via `updateOrderStatus()`

---

## Production Deployment Checklist

### Before Going Live

- [ ] **Switch to Production Credentials**
  ```bash
  SQUARE_ENVIRONMENT=production
  SQUARE_ACCESS_TOKEN=EAAA...  # Production token (starts with EAAA)
  SQUARE_LOCATION_ID=your_prod_location_id
  ```

- [ ] **Validate Production Credentials**
  ```bash
  npm run validate:square
  # Expected: ✅ Environment: production
  ```

- [ ] **Test First Transaction**
  - Place test order with real card
  - Verify payment processes
  - Check Square dashboard for transaction
  - Verify order confirmation

- [ ] **Monitor First 24 Hours**
  - Check Render logs for errors
  - Monitor payment success rate
  - Watch for credential issues

- [ ] **Enable Monitoring Alerts**
  - Payment failure rate >5%
  - Square API errors
  - Database constraint violations

---

## Related Documentation

- [POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md](./POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md) - October 14 incident analysis
- [PRODUCTION_STATUS.md](./PRODUCTION_STATUS.md) - System readiness status
- [ORDER_FLOW.md](./ORDER_FLOW.md) - Complete order lifecycle
- [DATABASE.md](./DATABASE.md) - Supabase schema
- [ADR-001: snake_case Convention](./ADR-001-snake-case-convention.md) - API naming standards

---

## Square Resources

- [Square Node.js SDK v43 Documentation](https://github.com/square/square-nodejs-sdk)
- [Square Payments API Reference](https://developer.squareup.com/reference/square/payments-api)
- [Square Web SDK Documentation](https://developer.squareup.com/docs/web-payments/overview)
- [Square Testing Guide](https://developer.squareup.com/docs/testing/test-values)
- [Square Sandbox Dashboard](https://squareupsandbox.com/dashboard)
- [Square Production Dashboard](https://squareup.com/dashboard)

---

## Appendix: Square SDK v43 Migration

### Authentication Migration

**Before**:
```typescript
import { Client, Environment } from 'square';

const client = new Client({
  environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN
});
```

**After**:
```typescript
import { SquareClient, SquareEnvironment } from 'square';

const client = new SquareClient({
  environment: SquareEnvironment.Sandbox,
  token: process.env.SQUARE_ACCESS_TOKEN
});
```

### API Method Migration

**Before**:
```typescript
// Create payment
const response = await client.paymentsApi.createPayment(request);
const payment = response.result.payment;

// Get payment
const response = await client.paymentsApi.getPayment(paymentId);
const payment = response.result.payment;
```

**After**:
```typescript
// Create payment
const paymentResult = await client.payments.create(request);
const payment = paymentResult.payment;  // No .result wrapper

// Get payment
const paymentResult = await client.payments.get({ paymentId });
const payment = paymentResult.payment;
```

### Response Structure Changes

**Before** (nested under .result):
```typescript
response.result.locations
response.result.payment
response.result.checkout
```

**After** (direct access):
```typescript
response.locations
response.payment
response.checkout
```

---

**Last Updated**: October 14, 2025
**Version**: 6.0.7
**SDK Version**: Square Node.js SDK v43
**Status**: ✅ Production Ready - Payment System Fully Operational
**Maintainer**: Development Team
