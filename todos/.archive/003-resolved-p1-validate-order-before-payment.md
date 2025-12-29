---
status: resolved
priority: p1
issue_id: "003"
tags: [payments, validation, data-integrity]
dependencies: []
resolved_date: 2025-12-28
---

# Order ID Not Validated Before Payment

## Problem Statement
Payment processing doesn't validate that the order ID exists and belongs to the current session before creating a payment intent. This could lead to confusion or potential issues.

## Findings
- Location: `server/src/routes/payments.routes.ts:96`
- Order ID passed to payment but not validated
- Could process payment for non-existent order
- No tenant isolation check on order

## Resolution

### Implementation Details
Added comprehensive order validation in `PaymentService.validatePaymentRequest()` method:

1. **Order Existence + Tenant Isolation**: Already handled by `OrdersService.getOrder(restaurantId, orderId)` which includes restaurant_id filter. Enhanced error message to clarify tenant isolation.

2. **Order Status Validation**: Added check that order status is one of `['new', 'pending', 'confirmed']`. Orders in other states (preparing, ready, picked-up, completed, cancelled) are rejected with descriptive error message.

3. **Payment Status Validation**: Added check that payment_status is not 'paid' to prevent double-payments at the validation layer.

### Files Modified
- `server/src/services/payment.service.ts` - Added order status and payment status validation in `validatePaymentRequest()`
- `server/tests/services/payment-idempotency.test.ts` - Added 5 new test cases for order status validation, fixed existing tests with proper mock data

### Test Coverage
New tests added:
- Reject payment for cancelled orders
- Reject payment for completed orders
- Reject payment for already paid orders
- Allow payment for new orders
- Allow payment for confirmed orders

All 471 server tests pass.

## Acceptance Criteria - COMPLETED
- [x] Order existence validated before payment creation
- [x] Restaurant ID (tenant) validated
- [x] Order status checked (not already completed/cancelled)
- [x] Appropriate error messages returned

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- Data integrity issue identified during testing
- Status set to ready
- Priority P1 due to payment integrity

### 2025-12-28 - Resolved
**By:** Claude Code Agent
**Actions:**
- Enhanced `PaymentService.validatePaymentRequest()` with order status validation
- Added payment status validation to prevent double payments
- Added 5 comprehensive test cases
- All 471 tests passing
- TypeScript compilation verified

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P5
