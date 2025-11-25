# Payment API Documentation (Phase 2)

**Version:** 1.0
**Last Updated:** 2025-10-29
**Status:** Production Ready

---

## Overview

The Payment API provides endpoints for processing cash and card payments, closing checks, and managing table payment status. This API integrates with Stripe for card processing and implements comprehensive audit logging for PCI DSS compliance.

### Key Features

- ✅ Cash payment processing with change calculation
- ✅ Card payment processing via Stripe Elements
- ✅ Automatic table status updates
- ✅ Payment audit logging for compliance
- ✅ Multi-order check closing
- ✅ Payment method validation
- ✅ Idempotent operations

---

## Authentication

All payment endpoints require:

1. **Authentication Token**: Bearer token in Authorization header
2. **Restaurant Context**: `x-restaurant-id` header
3. **Authorization Scopes**: `payments:process` scope required

```bash
Authorization: Bearer YOUR_JWT_TOKEN
x-restaurant-id: YOUR_RESTAURANT_ID
```

---

## Endpoints

### 1. Process Cash Payment

Process a cash payment for an order or entire table check.

**Endpoint:** `POST /api/v1/payments/cash`

**Request Body:**

```typescript
{
  order_id: string;          // Required: Order ID to pay
  amount_received: number;   // Required: Cash amount received (must be >= order total)
  table_id?: string;         // Optional: Table UUID for status update
}
```

**Example Request:**

```bash
curl -X POST https://api.yourrestaurant.com/api/v1/payments/cash \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-restaurant-id: rest_123abc" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_abc123",
    "amount_received": 100.00,
    "table_id": "tbl_456def"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "order": {
    "id": "ord_abc123",
    "order_number": "ORD-042",
    "payment_status": "paid",
    "payment_method": "cash",
    "payment_amount": 86.40,
    "cash_received": 100.00,
    "change_given": 13.60,
    "check_closed_at": "2025-10-29T18:45:32.123Z",
    "closed_by_user_id": "usr_789ghi"
  },
  "change": 13.60
}
```

**Error Response (400 Bad Request - Insufficient Payment):**

```json
{
  "success": false,
  "error": "Insufficient payment",
  "shortage": 36.40,
  "order_total": 86.40,
  "amount_received": 50.00
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Order not found"
}
```

**Error Response (400 Bad Request - Already Paid):**

```json
{
  "success": false,
  "error": "Order already paid"
}
```

---

### 2. Process Card Payment

Process a card payment using Stripe PaymentMethod or PaymentIntent.

**Endpoint:** `POST /api/v1/payments/card`

**Request Body:**

```typescript
{
  order_id: string;          // Required: Order ID to pay
  source_id: string;         // Required: Stripe PaymentMethod ID (pm_...) or PaymentIntent ID (pi_...)
  table_id?: string;         // Optional: Table UUID for status update
  idempotency_key?: string;  // Optional: For preventing duplicate charges
}
```

**Example Request:**

```bash
curl -X POST https://api.yourrestaurant.com/api/v1/payments/card \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-restaurant-id: rest_123abc" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_abc123",
    "source_id": "pm_1234567890abcdef",
    "table_id": "tbl_456def",
    "idempotency_key": "unique-key-12345"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "order": {
    "id": "ord_abc123",
    "order_number": "ORD-042",
    "payment_status": "paid",
    "payment_method": "card",
    "payment_amount": 86.40,
    "payment_id": "pi_1234567890abcdef",
    "check_closed_at": "2025-10-29T18:45:32.123Z",
    "closed_by_user_id": "usr_789ghi"
  },
  "payment": {
    "id": "pi_1234567890abcdef",
    "status": "succeeded",
    "amount": 8640,
    "currency": "usd",
    "payment_method": {
      "card": {
        "brand": "visa",
        "last4": "4242"
      }
    },
    "created": 1635532532
  }
}
```

**Error Response (400 Bad Request - Card Declined):**

```json
{
  "success": false,
  "error": "Card declined",
  "details": "card_declined: Insufficient funds",
  "stripe_error_code": "card_declined"
}
```

**Error Response (500 Internal Server Error - Stripe API Failure):**

```json
{
  "success": false,
  "error": "Payment processing failed",
  "details": "Stripe API unavailable"
}
```

---

### 3. Get Order Payment Status

Retrieve payment status for an order.

**Endpoint:** `GET /api/v1/orders/:order_id/payment`

**Example Request:**

```bash
curl -X GET https://api.yourrestaurant.com/api/v1/orders/ord_abc123/payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-restaurant-id: rest_123abc"
```

**Success Response (200 OK):**

```json
{
  "order_id": "ord_abc123",
  "payment_status": "paid",
  "payment_method": "cash",
  "payment_amount": 86.40,
  "cash_received": 100.00,
  "change_given": 13.60,
  "payment_id": null,
  "check_closed_at": "2025-10-29T18:45:32.123Z",
  "closed_by_user_id": "usr_789ghi",
  "closed_by_user_name": "John Server"
}
```

---

### 4. Get Table Check Summary

Get all orders for a table with payment totals.

**Endpoint:** `GET /api/v1/tables/:table_id/check`

**Example Request:**

```bash
curl -X GET https://api.yourrestaurant.com/api/v1/tables/tbl_456def/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-restaurant-id: rest_123abc"
```

**Success Response (200 OK):**

```json
{
  "table_id": "tbl_456def",
  "table_number": "5",
  "orders": [
    {
      "id": "ord_abc123",
      "order_number": "ORD-042",
      "seat_number": 1,
      "total_amount": 38.00,
      "payment_status": "paid",
      "items": [...]
    },
    {
      "id": "ord_def456",
      "order_number": "ORD-043",
      "seat_number": 2,
      "total_amount": 42.00,
      "payment_status": "unpaid",
      "items": [...]
    }
  ],
  "check_summary": {
    "subtotal": 80.00,
    "tax": 6.40,
    "total": 86.40,
    "paid": 38.00,
    "unpaid": 42.00,
    "all_paid": false
  }
}
```

---

## Data Models

### Payment Status Enum

```typescript
type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';
```

### Payment Method Enum

```typescript
type PaymentMethod = 'cash' | 'card' | 'house_account' | 'gift_card' | 'other';
```

### Order Payment Fields

```typescript
interface OrderPayment {
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_amount?: number;        // Actual amount paid
  cash_received?: number;         // For cash payments
  change_given?: number;          // For cash payments
  payment_id?: string;            // Stripe PaymentIntent ID for card payments
  check_closed_at?: string;       // ISO 8601 timestamp
  closed_by_user_id?: string;     // User who closed the check
}
```

---

## Business Logic

### Cash Payment Flow

1. **Validation**:
   - Verify order exists and belongs to restaurant
   - Check order is not already paid
   - Validate `amount_received >= order.total_amount`

2. **Calculate Change**:
   ```typescript
   const change = amount_received - order.total_amount;
   ```

3. **Update Order**:
   - Set `payment_status = 'paid'`
   - Set `payment_method = 'cash'`
   - Set `payment_amount = order.total_amount`
   - Set `cash_received = amount_received`
   - Set `change_given = change`
   - Set `check_closed_at = NOW()`
   - Set `closed_by_user_id = current_user.id`

4. **Update Table Status**:
   - If `table_id` provided, check if all orders for table are paid
   - If all paid, update table status to `'paid'`

5. **Audit Logging**:
   - Log payment attempt with all details
   - Include user ID, timestamp, amount, order ID

6. **Return Response**:
   - Return updated order and change amount

### Card Payment Flow

1. **Validation**:
   - Verify order exists and belongs to restaurant
   - Check order is not already paid
   - Validate Stripe credentials are configured

2. **Process with Stripe**:
   ```typescript
   const paymentIntent = await stripe.paymentIntents.create({
     amount: Math.round(order.total_amount * 100), // cents
     currency: 'usd',
     payment_method: source_id, // pm_... or pi_...
     confirm: true,
     automatic_payment_methods: {
       enabled: true,
       allow_redirects: 'never'
     },
     metadata: {
       order_id: order.id,
       restaurant_id: restaurant_id
     }
   }, {
     idempotencyKey: idempotency_key || uuidv4()
   });
   ```

3. **Update Order**:
   - Set `payment_status = 'paid'`
   - Set `payment_method = 'card'`
   - Set `payment_amount = order.total_amount`
   - Set `payment_id = paymentIntent.id` (Stripe PaymentIntent ID)
   - Set `check_closed_at = NOW()`
   - Set `closed_by_user_id = current_user.id`

4. **Update Table Status**: (same as cash)

5. **Audit Logging**: (same as cash, include Stripe PaymentIntent ID)

6. **Error Handling**:
   - Card declined: Return 400 with decline reason
   - Stripe API error: Return 500 with error message
   - Network timeout: Return 503 with retry guidance

### Table Status Auto-Update

When any order payment completes:

1. Get all orders for the table
2. Check if all orders have `payment_status = 'paid'`
3. If all paid:
   - Update table status to `'paid'`
   - Optionally emit real-time event (Phase 3)

```typescript
const allPaid = orders.every(order => order.payment_status === 'paid');
if (allPaid) {
  await supabase
    .from('tables')
    .update({ status: 'paid' })
    .eq('id', table_id)
    .eq('restaurant_id', restaurant_id);
}
```

---

## Error Handling

### Common Error Codes

| HTTP Status | Error Code | Description | Retry? |
| --- | --- | --- | --- |
| 400 | INSUFFICIENT_PAYMENT | Cash amount < order total | No |
| 400 | ALREADY_PAID | Order already marked as paid | No |
| 400 | CARD_DECLINED | Card payment declined by issuer | Yes (different card) |
| 400 | INVALID_CARD | Card details invalid | No |
| 404 | ORDER_NOT_FOUND | Order ID doesn't exist | No |
| 403 | UNAUTHORIZED | Missing payment scope | No |
| 500 | STRIPE_API_ERROR | Stripe API failure | Yes (retry) |
| 503 | SERVICE_UNAVAILABLE | Temporary service issue | Yes (retry) |

### Error Response Format

All errors follow this structure:

```typescript
{
  success: false,
  error: string,        // Human-readable error message
  details?: string,     // Additional technical details
  code?: string,        // Machine-readable error code
  retry_after?: number  // Seconds to wait before retry (for 503)
}
```

---

## Audit Logging

All payment attempts are logged for compliance:

### Log Entry Structure

```typescript
{
  event: 'payment_attempt',
  payment_method: 'cash' | 'card',
  order_id: string,
  table_number: string,
  amount: number,
  payment_id?: string,      // Stripe PaymentIntent ID (card only)
  cash_received?: number,   // Cash only
  change_given?: number,    // Cash only
  status: 'success' | 'failure',
  error_message?: string,
  user_id: string,
  user_name: string,
  restaurant_id: string,
  timestamp: string,        // ISO 8601
  ip_address?: string,
  user_agent?: string
}
```

### Audit Log Retention

- **PCI Requirement**: Minimum 1 year retention
- **Implementation**: Logs stored in `payment_audit_log` table
- **Access Control**: Admin-only access via separate audit endpoint

---

## Integration Examples

### Frontend: Complete Cash Payment

```typescript
import { apiClient } from '@/lib/api';

async function processCashPayment(orderId: string, amountReceived: number, tableId?: string) {
  try {
    const response = await apiClient.post('/api/v1/payments/cash', {
      order_id: orderId,
      amount_received: amountReceived,
      table_id: tableId
    });

    if (response.data.success) {
      toast.success(`Payment successful! Change: $${response.data.change.toFixed(2)}`);
      return response.data;
    }
  } catch (error: any) {
    if (error.response?.data?.error === 'Insufficient payment') {
      toast.error(`Insufficient payment. Shortage: $${error.response.data.shortage.toFixed(2)}`);
    } else {
      toast.error('Payment failed. Please try again.');
    }
    throw error;
  }
}
```

### Frontend: Complete Card Payment with Stripe Elements

```typescript
import { apiClient } from '@/lib/api';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

async function processCardPayment(orderId: string, tableId?: string) {
  const stripe = useStripe();
  const elements = useElements();

  try {
    if (!stripe || !elements) {
      throw new Error('Stripe has not loaded');
    }

    // Step 1: Create PaymentMethod with Stripe Elements
    const cardElement = elements.getElement(CardElement);
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement!,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Step 2: Send PaymentMethod ID to backend
    const response = await apiClient.post('/api/v1/payments/card', {
      order_id: orderId,
      source_id: paymentMethod.id, // pm_...
      table_id: tableId,
      idempotency_key: crypto.randomUUID()
    });

    if (response.data.success) {
      toast.success('Payment successful!');
      return response.data;
    }
  } catch (error: any) {
    if (error.response?.data?.stripe_error_code === 'card_declined') {
      toast.error('Card declined. Please try a different card.');
    } else {
      toast.error('Payment failed. Please try again.');
    }
    throw error;
  }
}
```

---

## Testing

### Test Cards (Stripe Test Mode)

| Card Number | Brand | Result |
| --- | --- | --- |
| 4242 4242 4242 4242 | Visa | Success |
| 5555 5555 5555 4444 | Mastercard | Success |
| 3782 822463 10005 | Amex | Success |
| 4000 0000 0000 0002 | Visa | Declined (generic) |
| 4000 0000 0000 9995 | Visa | Declined (insufficient funds) |

**Test CVV**: Any 3 digits (4 for Amex)
**Test Expiration**: Any future date (e.g., 12/34)
**Test Postal Code**: Any valid ZIP code (e.g., 12345)

### Postman Collection

Import the Postman collection for API testing:

```bash
curl -o payment-api.postman.json \
  https://api.yourrestaurant.com/docs/payment-api.postman.json
```

### E2E Tests

Run the complete E2E test suite:

```bash
# Cash payment tests (10 test cases)
npx playwright test tests/e2e/cash-payment.spec.ts

# Card payment tests (14 test cases)
npx playwright test tests/e2e/card-payment.spec.ts

# Run all payment tests
npx playwright test tests/e2e/ --grep "payment"
```

---

## Security Considerations

### PCI DSS Compliance

1. **Never Store Card Data**: All card tokenization handled by Stripe Elements
2. **Payment IDs Only**: Store Stripe PaymentIntent IDs, not card numbers
3. **HTTPS Required**: All payment endpoints require TLS 1.2+
4. **Audit Logging**: All payment attempts logged with timestamp and user
5. **Access Control**: Payment endpoints require `payments:process` scope

### Best Practices

- Use idempotency keys for card payments to prevent duplicate charges
- Validate all input amounts on backend (don't trust frontend)
- Rate limit payment attempts (max 5 per minute per user)
- Monitor for suspicious payment patterns
- Implement timeout handling (30 second max for Stripe API)

---

## Troubleshooting

### Common Issues

**Issue: "Stripe API unavailable"**
- **Cause**: Stripe service outage or invalid credentials
- **Fix**: Check Stripe status page (status.stripe.com), verify credentials in env vars
- **Workaround**: Use test mode with test API keys

**Issue: "Insufficient payment" on valid amount**
- **Cause**: Floating point rounding errors
- **Fix**: Ensure frontend rounds to 2 decimal places before sending
- **Example**: Use `Math.round(amount * 100) / 100`

**Issue: "Order already paid"**
- **Cause**: Duplicate payment submission or race condition
- **Fix**: Check order status before showing payment screen
- **Prevention**: Disable submit button after first click

**Issue: Card declined but customer says card works**
- **Cause**: Insufficient funds, expired card, or incorrect CVV
- **Fix**: Ask customer to verify card details
- **Alternative**: Offer cash payment option

---

## Migration Guide

### Upgrading from Legacy Payment System

If you're migrating from the old metadata-based payment system:

1. **Database Migration**: Run migration `20251029155239_add_payment_fields_to_orders.sql`
2. **Update API Calls**: Replace old payment endpoints with new ones
3. **Update Frontend**: Use new CheckClosingScreen components
4. **Test Thoroughly**: Run full E2E test suite before deploying
5. **Deploy Backend First**: Deploy API changes before frontend
6. **Monitor Errors**: Watch logs for any payment failures

### Backward Compatibility

The payment system maintains backward compatibility:

- Old orders without payment fields will show as `payment_status: 'unpaid'`
- Stripe integration replaces Square with minimal changes to existing flows
- No changes required to kitchen display or reporting

---

## Support

**API Issues**: support@yourrestaurant.com
**Stripe Integration**: https://stripe.com/docs or https://support.stripe.com
**Documentation**: https://docs.yourrestaurant.com

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Status**: ✅ Production Ready
