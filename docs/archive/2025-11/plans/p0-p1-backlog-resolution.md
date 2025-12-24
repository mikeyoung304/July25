# P0/P1 Backlog Resolution Plan (MVP)

**Created:** 2025-11-28
**Updated:** 2025-11-28 (Simplified after review)
**Project:** Restaurant OS (rebuild-6.0)
**Scope:** 2 P0 Critical + 7 P1 High Priority Items
**Estimated Total Effort:** 10-12 developer days (simplified from 40-65)

## Review Decisions (2025-11-28)
- ✅ Skip new service abstractions - inline in existing hooks
- ✅ Use existing WebSocket broadcast (not Supabase channels)
- ✅ Skip DataDog/monitoring - use existing logger
- ✅ Aggressive timeline - P0 in 3 days, P1 in 1 week
- ✅ Log notification failures, no retry queue
- ✅ Enable STRICT_AUTH immediately (fix WebSocket parity first)

---

## Executive Summary (MVP)

This plan addresses 9 items from the TODO backlog audit with **aggressive simplification**:
- **P0 Critical (2 items):** STRICT_AUTH enforcement, restaurant_id token validation
- **P1 High (5 items):** Real-time tables, kitchen/customer notifications, refund processing, health checks, kiosk_demo removal
- **DEFERRED:** Monitoring integration (use existing logger)

### Simplified Timeline (10 days total)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DAYS 1-3: P0 SECURITY (Critical)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Day 1: STRICT_AUTH       │  Day 2: restaurant_id     │  Day 3: Testing    │
│  ├─ WebSocket parity      │  ├─ UUID validation       │  ├─ Run test suite │
│  ├─ Remove fallbacks      │  └─ 8 lines of code       │  ├─ Fix failures   │
│  └─ ~30 lines of code     │                           │  └─ Deploy to prod │
├─────────────────────────────────────────────────────────────────────────────┤
│                         DAYS 4-7: P1 FEATURES (Inline in hooks)             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Day 4: Tables + Kitchen  │  Day 5-6: Notifications   │  Day 7: Refunds    │
│  ├─ Uncomment TODO        │  ├─ Twilio in hook        │  ├─ Stripe in hook │
│  ├─ WebSocket broadcast   │  ├─ SendGrid in hook      │  ├─ Idempotency    │
│  └─ ~15 lines each        │  └─ ~35 lines total       │  └─ ~25 lines      │
├─────────────────────────────────────────────────────────────────────────────┤
│                         DAYS 8-10: CLEANUP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Day 8: Health checks     │  Day 9: kiosk_demo        │  Day 10: Final QA  │
│  ├─ DB check only         │  ├─ Find/replace          │  ├─ Full test run  │
│  └─ ~15 lines             │  └─ 2 lines change        │  └─ Production     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What We're NOT Building (Deferred)
- ❌ NotificationService class
- ❌ RefundService class
- ❌ MetricsService class
- ❌ KitchenService class
- ❌ Supabase channels (use WebSocket)
- ❌ DataDog integration
- ❌ Retry queues / exponential backoff
- ❌ Notification templates directory

---

## P0 Critical Items (Days 1-3)

### P0.1: STRICT_AUTH Enforcement (Day 1)

**Files:** `server/src/middleware/auth.ts:40, 85-93`, `server/src/utils/websocket.ts:~233`
**Effort:** ~30 lines of code

#### The Problem
WebSocket auth has NO STRICT_AUTH check - always falls back to defaultId, bypassing multi-tenant isolation.

#### The Fix

**1. WebSocket Auth Parity** (`server/src/utils/websocket.ts`)
```typescript
// Find line ~233, change FROM:
restaurantId: decoded.restaurant_id || config.restaurant.defaultId

// TO:
const strictAuth = process.env['STRICT_AUTH'] === 'true';
if (strictAuth && !decoded.restaurant_id) {
  logger.error('WebSocket rejected: missing restaurant_id', { userId: decoded.sub });
  return null;
}
restaurantId: decoded.restaurant_id || (strictAuth ? null : config.restaurant.defaultId)
```

**2. Enable in Production** (`.env.production`)
```bash
STRICT_AUTH=true
```

#### Testing
- [ ] Unskip test at `rbac.proof.test.ts:261-287`
- [ ] Run: `npm run test:server -- --grep "STRICT_AUTH"`

---

### P0.2: Restaurant_id UUID Validation (Day 2)

**File:** `server/src/middleware/auth.ts`
**Effort:** ~8 lines of code

#### The Fix

```typescript
// Add after line ~100 (after extracting decoded.restaurant_id)
import { validate as isUuid } from 'uuid';

if (decoded.restaurant_id && !isUuid(decoded.restaurant_id)) {
  logger.error('Invalid restaurant_id format', {
    userId: decoded.sub,
    restaurant_id: decoded.restaurant_id
  });
  throw Unauthorized('Invalid restaurant context');
}
```

#### Testing
- [ ] Add test case to existing `auth.test.ts`
- [ ] Run: `npm run test:server -- --grep "restaurant_id"`

---

### Day 3: Testing & Deploy

- [ ] Run full test suite: `npm test`
- [ ] Fix any failures from STRICT_AUTH changes
- [ ] Deploy to production with `STRICT_AUTH=true`

---

## P1 High Priority Items (Days 4-10)

### P1.1: Real-Time Table Updates (Day 4 - morning)

**File:** `server/src/services/table.service.ts:104-110`
**Effort:** ~15 lines (uncomment TODO + use WebSocket)

#### The Fix
Replace Supabase channels with existing WebSocket broadcast:

```typescript
// In table.service.ts, after successful status update (around line 104)
// Replace the commented Supabase channel code with:
import { broadcastToRestaurant } from '../utils/websocket';

// After the DB update succeeds:
broadcastToRestaurant(wss, restaurantId, {
  type: 'table:status_updated',
  payload: { table_id: tableId, status: newStatus },
  timestamp: new Date().toISOString()
});
```

- [ ] Uncomment TODO at lines 104-110
- [ ] Replace Supabase channel with `broadcastToRestaurant()`
- [ ] Test: Update table status → verify WebSocket message received

---

### P1.2: Kitchen Notifications (Day 4 - afternoon)

**File:** `server/src/services/orderStateMachine.ts:303-322`
**Effort:** ~15 lines (enhance existing hook)

#### The Fix
The hook already exists - just call the broadcast:

```typescript
// In orderStateMachine.ts, replace the logging in '*->confirmed' hook:
OrderStateMachine.registerHook('*->confirmed', async (_transition, order) => {
  const ticket = {
    order_number: order.order_number,
    customer_name: order.customer_name,
    items: order.items?.map(item => ({
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers || [],
      notes: item.notes || ''
    })) || [],
    created_at: order.created_at
  };

  // Use existing broadcast
  broadcastOrderUpdate(order.restaurant_id, { ...order, kitchen_ticket: ticket });
  logger.info('Kitchen notified', { orderId: order.id, orderNumber: order.order_number });
});
```

- [ ] Enhance hook to include ticket format
- [ ] Verify KDS receives broadcast

---

### P1.3: Customer Notifications (Days 5-6)

**File:** `server/src/services/orderStateMachine.ts:328-359`
**Effort:** ~35 lines (inline Twilio/SendGrid in hook)

#### Environment Variables (add to .env)
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=SG.xxxxxxx
SENDGRID_FROM_EMAIL=orders@restaurant.com
```

#### The Fix
Replace logging with direct API calls in the existing hook:

```typescript
// In orderStateMachine.ts, replace '*->ready' hook:
OrderStateMachine.registerHook('*->ready', async (_transition, order) => {
  if (!order.customer_phone && !order.customer_email) {
    logger.debug('Customer notification skipped: No contact info', { orderId: order.id });
    return;
  }

  // SMS via Twilio (inline, no service class)
  if (order.customer_phone && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      await twilio.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: order.customer_phone,
        body: `Your order #${order.order_number} is ready for pickup!`
      });
      logger.info('SMS sent', { orderId: order.id, phone: order.customer_phone });
    } catch (e) {
      logger.error('SMS failed', { orderId: order.id, error: e });
      // Log and move on - no retry queue
    }
  }

  // Email via SendGrid (inline)
  if (order.customer_email && process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: order.customer_email,
        from: process.env.SENDGRID_FROM_EMAIL || 'orders@restaurant.com',
        subject: `Order #${order.order_number} is ready!`,
        html: `<p>Your order is ready for pickup!</p>`
      });
      logger.info('Email sent', { orderId: order.id, email: order.customer_email });
    } catch (e) {
      logger.error('Email failed', { orderId: order.id, error: e });
    }
  }
});
```

- [ ] Add Twilio/SendGrid env vars
- [ ] Install packages: `npm install twilio @sendgrid/mail`
- [ ] Replace hook logging with API calls
- [ ] Test with real phone/email

---

### P1.4: Refund Processing (Day 7)

**File:** `server/src/services/orderStateMachine.ts:365-398`
**Effort:** ~25 lines (inline Stripe in hook)

#### The Fix
Replace logging with Stripe refund call:

```typescript
// In orderStateMachine.ts, replace '*->cancelled' hook:
OrderStateMachine.registerHook('*->cancelled', async (_transition, order) => {
  if (order.payment_status !== 'paid') {
    logger.debug('Refund skipped: Order not paid', { orderId: order.id });
    return;
  }

  if (!order.payment_intent_id) {
    logger.warn('Refund skipped: No payment_intent_id', { orderId: order.id });
    return;
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const refund = await stripe.refunds.create({
      payment_intent: order.payment_intent_id,
      reason: 'requested_by_customer'
    }, {
      idempotencyKey: `refund-${order.id}`  // Prevents duplicate refunds
    });

    // Update order status
    await supabase
      .from('orders')
      .update({
        refund_id: refund.id,
        payment_status: 'refunded'
      })
      .eq('id', order.id);

    logger.info('Refund processed', { orderId: order.id, refundId: refund.id });
  } catch (e) {
    logger.error('Refund failed', { orderId: order.id, error: e });
    // Operator sees error in logs → manual refund via Stripe dashboard
  }
});
```

- [ ] Replace hook logging with Stripe API call
- [ ] Test: Cancel paid order → verify refund in Stripe dashboard

---

### P1.5: Monitoring - DEFERRED

~~DataDog/New Relic integration~~

**Decision:** Use existing logger for MVP. Add monitoring when needed.

---

### P1.6: Health Checks (Day 8)

**File:** `server/src/routes/metrics.ts:48-71`
**Effort:** ~15 lines (add DB check)

#### The Fix
Enhance existing `/health/detailed` endpoint:

```typescript
// In metrics.ts, update the /health/detailed handler:
router.get('/health/detailed', async (_req, res) => {
  // Database check
  let dbStatus = 'healthy';
  let dbLatency = 0;
  try {
    const start = Date.now();
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    dbLatency = Date.now() - start;
    if (error) dbStatus = 'error';
  } catch {
    dbStatus = 'error';
  }

  const checks = {
    server: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    database: {
      status: dbStatus,
      latency_ms: dbLatency
    }
  };

  const allHealthy = dbStatus === 'healthy';
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

- [ ] Add database health check
- [ ] Test: `/health/detailed` returns DB status

---

### P1.7: kiosk_demo Removal (Day 9)

**File:** `server/src/middleware/auth.ts:70-82`
**Effort:** ~2 lines change + find/replace in tests

#### The Fix

```typescript
// In auth.ts, change lines 70-82 FROM:
if (userRole === 'kiosk_demo') {
  if (acceptKioskDemoAlias) {
    logger.warn("⚠️ auth: role 'kiosk_demo' is deprecated...");
    userRole = 'customer';
  } else {
    throw Unauthorized("Role 'kiosk_demo' is deprecated...");
  }
}

// TO:
if (userRole === 'kiosk_demo') {
  throw Unauthorized("Role 'kiosk_demo' no longer supported. Use 'customer' role.");
}
```

Then find/replace in tests:
```bash
# Find all test files using kiosk_demo
grep -r "kiosk_demo" server/tests/

# Replace with 'customer' in each file
```

- [ ] Change auth.ts to reject kiosk_demo
- [ ] Update test files to use 'customer' role
- [ ] Run tests: `npm run test:server`

---

## Day 10: Final QA & Production

- [ ] Run full test suite: `npm test`
- [ ] Verify all items working in staging
- [ ] Deploy to production
- [ ] Monitor logs for errors

---

## Summary Checklist

### P0 (Days 1-3) - Security Critical
- [ ] **Day 1:** WebSocket STRICT_AUTH parity (~30 lines)
- [ ] **Day 2:** UUID validation for restaurant_id (~8 lines)
- [ ] **Day 3:** Test + deploy with STRICT_AUTH=true

### P1 (Days 4-10) - Features
- [ ] **Day 4 AM:** Real-time table broadcasts (~15 lines)
- [ ] **Day 4 PM:** Kitchen notifications in hook (~15 lines)
- [ ] **Days 5-6:** Customer SMS/Email in hook (~35 lines)
- [ ] **Day 7:** Stripe refund in hook (~25 lines)
- [ ] **Day 8:** Health check DB ping (~15 lines)
- [ ] **Day 9:** kiosk_demo removal (~2 lines + find/replace)
- [ ] **Day 10:** Final QA + production deploy

### Deferred (Post-MVP)
- ❌ DataDog/New Relic monitoring
- ❌ Notification retry queues
- ❌ Service class abstractions
- ❌ Supabase channels (use WebSocket)

---

## Files Modified (No New Files!)

| File | Changes |
|------|---------|
| `server/src/utils/websocket.ts` | Add STRICT_AUTH check (~10 lines) |
| `server/src/middleware/auth.ts` | UUID validation + kiosk_demo removal (~10 lines) |
| `server/src/services/table.service.ts` | Uncomment broadcast (~5 lines) |
| `server/src/services/orderStateMachine.ts` | Enhance 3 hooks (~75 lines total) |
| `server/src/routes/metrics.ts` | Add DB health check (~15 lines) |
| `.env.production` | Add STRICT_AUTH=true, Twilio/SendGrid keys |

**Total new code: ~115 lines across 6 existing files**

---

## Environment Variables Needed

```bash
# P0 Security
STRICT_AUTH=true

# P1 Notifications
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=SG.xxxxxxx
SENDGRID_FROM_EMAIL=orders@restaurant.com
```

---

## Dependencies to Install

```bash
npm install twilio @sendgrid/mail
```

---

**Plan Status:** APPROVED (2025-11-28)
**Estimated Completion:** 10 developer days
**Review Feedback:** Simplified from 40-65 days after DHH/Security/Simplicity reviews
