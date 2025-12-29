---
status: resolved
priority: p3
issue_id: "014"
tags: [payments, logging, consistency]
dependencies: []
resolved_date: 2025-12-28
---

# Audit Log Idempotency Key Format Mismatch

## Problem Statement
Audit log entries use inconsistent idempotency key formats, making it harder to correlate payment events and debug issues.

## Findings
- Location: `server/src/routes/payments.routes.ts`
- Different key formats in different places
- Hard to trace payment lifecycle
- Debugging payment issues is difficult

## Resolution

### Solution Implemented
Created a centralized `generateIdempotencyKey()` utility function in `payment.service.ts` that generates consistent idempotency keys across all payment operations.

### New Idempotency Key Format
```typescript
// Format: {type}_{restaurantSuffix}_{orderSuffix}_{timestamp}
// - type: pay, cash, refund, or confirm
// - restaurantSuffix: last 8 chars of restaurant ID (tenant isolation)
// - orderSuffix: last 12 chars of order/payment ID
// - timestamp: Unix timestamp in milliseconds

// Example: pay_11111111_order-abcd_1735344000000
```

### Changes Made
1. **`server/src/services/payment.service.ts`**:
   - Added `IdempotencyKeyType` type for type safety
   - Added `generateIdempotencyKey()` utility function with JSDoc documentation
   - Updated `calculateOrderTotal()` to use new utility for card payments
   - Updated `validateRefundRequest()` to require `restaurantId` and use new utility

2. **`server/src/routes/payments.routes.ts`**:
   - Updated demo confirm idempotency key (was `${order_id.slice(-12)}-confirm`)
   - Updated cash payment idempotency key (was `cash-${order_id}-${Date.now()}`)
   - Updated refund idempotency key (was `refund-${paymentId}-${Date.now()}`)

3. **Updated test files**:
   - `server/tests/services/payment-idempotency.test.ts`
   - `server/tests/services/payment-calculation.test.ts`

### Before vs After

| Operation    | Before                             | After                                                       |
| ------------ | ---------------------------------- | ----------------------------------------------------------- |
| Card payment | `{orderId.slice(-12)}-{timestamp}` | `pay_{restId.slice(-8)}_{orderId.slice(-12)}_{timestamp}`   |
| Cash payment | `cash-{orderId}-{timestamp}`       | `cash_{restId.slice(-8)}_{orderId.slice(-12)}_{timestamp}`  |
| Refund       | `refund-{paymentId}-{timestamp}`   | `refund_{restId.slice(-8)}_{paymentId.slice(-12)}_{ts}`     |
| Demo confirm | `{orderId.slice(-12)}-confirm`     | `confirm_{restId.slice(-8)}_{orderId.slice(-12)}_{ts}`      |

### Benefits
1. **Consistent format** - All keys follow same pattern
2. **Tenant isolation** - Restaurant ID included in all keys
3. **Debuggable** - Easy to parse and search in logs
4. **Type-safe** - `IdempotencyKeyType` ensures valid operation types
5. **Stripe compatible** - Max ~35 chars (well under 255 limit)

## Technical Details
- **Affected Files**: `payment.service.ts`, `payments.routes.ts`, test files
- **Related Components**: Audit logging, payment processing
- **Database Changes**: No

## Acceptance Criteria
- [x] Consistent idempotency key format
- [x] All payment operations use same format
- [x] Format includes restaurant_id for tenant isolation
- [x] Easy to parse/search in logs

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- Consistency issue identified during testing
- Status set to ready
- Priority P3 - debugging improvement

### 2025-12-28 - Resolved
**By:** Claude Code
**Actions:**
- Created `generateIdempotencyKey()` utility function
- Updated all payment operations to use consistent format
- Added `restaurantId` parameter to `validateRefundRequest()` for tenant isolation
- Updated all related tests
- All 75 payment tests passing

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P8
