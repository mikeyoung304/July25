---
status: ready
priority: p2
issue_id: "230"
tags: [performance, payments, code-review]
dependencies: []
---

# Inline require() for Twilio/SendGrid Blocks Event Loop

## Problem Statement
The order state machine hooks use dynamic `require()` calls inside hook callbacks, which are synchronous and block the event loop on every order status transition.

## Findings
- **Source**: Performance Oracle Review (2025-12-28)
- **Location**: `server/src/services/orderStateMachine.ts` lines 417-445
- **Evidence**: `require()` called inside hook callbacks

```typescript
// Line 417-420 - INSIDE the hook callback (runs on every transition!)
if (order.customer_phone && process.env['TWILIO_ACCOUNT_SID']) {
  const twilio = require('twilio')(  // Synchronous, blocks event loop
    process.env['TWILIO_ACCOUNT_SID'],
    process.env['TWILIO_AUTH_TOKEN']
  );
}

// Line 444-445
if (order.customer_email && process.env['SENDGRID_API_KEY']) {
  const sgMail = require('@sendgrid/mail');  // Another blocking require
  sgMail.setApiKey(process.env['SENDGRID_API_KEY']);  // Called every time
}
```

## Proposed Solutions

### Option 1: Singleton initialization at module load (Recommended)
- **Pros**: One-time initialization, no blocking in request path
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
// At top of orderStateMachine.ts
let twilioClient: ReturnType<typeof import('twilio')> | null = null;
let sendgridClient: typeof import('@sendgrid/mail') | null = null;

if (process.env['TWILIO_ACCOUNT_SID']) {
  twilioClient = require('twilio')(
    process.env['TWILIO_ACCOUNT_SID'],
    process.env['TWILIO_AUTH_TOKEN']
  );
}

if (process.env['SENDGRID_API_KEY']) {
  sendgridClient = require('@sendgrid/mail');
  sendgridClient.setApiKey(process.env['SENDGRID_API_KEY']);
}
```

### Option 2: Create dedicated service files
- **Pros**: Better separation of concerns
- **Cons**: More files to maintain
- **Effort**: Medium
- **Risk**: Low

## Recommended Action
Option 1 - Move initialization to module scope for immediate improvement.

## Technical Details
- **Affected Files**: `server/src/services/orderStateMachine.ts`
- **Related Components**: Order notifications, Twilio, SendGrid
- **Database Changes**: No

## Acceptance Criteria
- [ ] Twilio and SendGrid clients initialized once at module load
- [ ] No require() calls inside hook callbacks
- [ ] setApiKey() called once, not per request
- [ ] Existing notification functionality preserved

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Performance Oracle Agent
**Actions:**
- Identified blocking require() in request path
- Assessed as HIGH priority for performance

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
