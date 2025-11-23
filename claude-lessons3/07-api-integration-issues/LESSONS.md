# Lessons: api integration issues

> **💡 Debugging Unknown Issues?** If you're encountering an error not documented here, check the [Debugging Protocols](../00-debugging-protocols/) for systematic troubleshooting methods (HTF, EPL, CSP, DDT, PIT).

## Key Incidents

# Major API Integration Incidents - Detailed Reports

**Created:** 2025-11-19
**Category:** Incident Analysis
**Period:** June-November 2025 (6 months)

---

## Incident Index

| ID | Date | Severity | Cost | Provider | Status |
|----|------|----------|------|----------|--------|
| [INC-001](#inc-001-openai-model-breaking-change) | Nov 18, 2025 | P0 | $1,200 | OpenAI |  Resolved |
| [INC-002](#inc-002-auth-token-synchronization-crisis) | Nov 2-18 | P0 | $3,600 | Internal |  Resolved |
| [INC-003](#inc-003-square-payment-timeout) | Nov 10, 2025 | P0 | $1,800 | Square |  Resolved |
| [INC-004](#inc-004-square-audit-race-condition) | Nov 10, 2025 | P0 | $1,500 | Square |  Resolved |
| [INC-005](#inc-005-voice-webrtc-race-condition) | Nov 10, 2025 | P0 | $1,050 | OpenAI |  Resolved |
| [INC-006](#inc-006-environment-variable-newlines) | Nov 7, 2025 | P1 | $600 | Internal |  Resolved |
| [INC-007](#inc-007-voice-authentication-blocking-kiosk) | Nov 23, 2025 | P0 | $1,350 | Internal |  Resolved |

**Total Cost:** $11,100 for top 7 incidents

---

## INC-001: OpenAI Model Breaking Change

### Overview
| Field | Value |
|-------|-------|
| **Date** | November 18, 2025 |
| **Duration** | 8 hours (6h initial + 2h git analysis) |
| **Severity** | P0 - Complete feature failure |
| **Cost** | $1,200 (8 hours × $150/hr) |
| **Provider** | OpenAI Realtime API |
| **Commits** | 3a5d126f, d42b2c74 |

### Timeline

**November 2025 (Unknown Date):**
- OpenAI silently deprecates `whisper-1` model for Realtime API
- No deprecation notice sent to developers
- No migration guide published
- API continues accepting old config

**November 18, 2025 - 10:00 AM:**
- User reports: "Voice ordering button does nothing"
- Developer investigation begins

**10:00 AM - 4:00 PM (6 hours):**
- Add comprehensive logging across voice services
- Verify session connects ( working)
- Verify audio transmits ( 49KB sent, 1140 packets)
- Verify agent responds ( response.text.done events)
- Verify session.update sent ( 15KB payload)
- Identify: NO transcription events received
  - No `conversation.item.input_audio_transcription.delta`
  - No `conversation.item.input_audio_transcription.completed`
- Conclusion: Not a code bug, possibly API issue

**4:00 PM - 6:00 PM (2 hours):**
- Scan git history to October 16 (when it worked)
- Compare session config: IDENTICAL
- Find race condition fix from November 10
- Realize: Something changed externally

**6:00 PM - 6:15 PM (15 minutes):**
- Search OpenAI community forums
- Find posts about whisper-1 not working
- Discover recommendation: `gpt-4o-transcribe`
- Apply fix and test

**6:15 PM - 6:30 PM:**
- Commit fix: 1 line changed
- Write comprehensive documentation
- Deploy to production

### Root Cause

OpenAI deprecated `whisper-1` model for Realtime API transcription without notice.

**Evidence:**
```typescript
// Old config (broken after deprecation)
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en'
}

// New config (working)
input_audio_transcription: {
  model: 'gpt-4o-transcribe'
}
```

**Why It Was Hard to Debug:**
1. **Silent Failure** - API accepted config but ignored it
2. **No Error Events** - No indication model was invalid
3. **Everything Else Worked** - Audio, responses, session all functional
4. **Recent Breaking Change** - Working code from October broke
5. **Undocumented** - No migration guide or deprecation notice
6. **Multi-Layer System** - Hard to isolate which layer was failing

### Impact

**Customer Experience:**
- Voice ordering completely non-functional
- Button press appeared to do nothing
- No error messages shown
- Users assumed feature was broken

**Business Impact:**
- 2 weeks of broken voice ordering
- Lost revenue from voice-ordering customers
- Support tickets and confusion
- Developer time: 8 hours

### Fix

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceSessionConfig.ts:253`

```typescript
// Change 1 line
- model: 'whisper-1',
- language: 'en'
+ model: 'gpt-4o-transcribe'
```

**Commit:** 3a5d126f

### Prevention

1. **Monitor Provider Changelogs**
   - Daily check of OpenAI API updates
   - Subscribe to provider newsletters
   - Set up Google Alerts for deprecations

2. **Version Logging**
   ```typescript
   logger.info('Using OpenAI transcription model', {
     model: 'gpt-4o-transcribe',
     updated: '2025-01-18',
     reason: 'whisper-1 deprecated'
   });
   ```

3. **Weekly Smoke Tests**
   - Test critical flows with production API keys
   - Monitor for missing events/responses
   - Alert on unexpected behavior changes

### Related Documentation

- [VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md)
- [PATTERNS.md](./PATTERNS.md#pattern-5-silent-api-change-detection)

---

## INC-002: Auth Token Synchronization Crisis

### Overview
| Field | Value |
|-------|-------|
| **Date** | November 2-18, 2025 |
| **Duration** | 24 hours (across 16 days) |
| **Severity** | P0 - Complete login failure |
| **Cost** | $3,600 (24 hours × $150/hr) |
| **Provider** | Internal (httpClient state management) |
| **Commits** | acd6125c, 9e97f720, a3514472 |

### Timeline

**November 2, 2025:**
- Remove 430 lines of demo session code
- Accidentally remove `setCurrentRestaurantId()` calls
- Push to production

**November 2-18, 2025 (16 days):**
- Users report: "Login hangs at 'Signing in...'"
- Intermittent failures (race condition)
- Multiple attempts to fix
- Add comprehensive logging

**November 10, 2025:**
- Identify root cause: Restaurant ID not synced
- httpClient missing `X-Restaurant-ID` header
- Backend middleware queries hang without timeout
- Add `setCurrentRestaurantId()` at 5 critical locations

**November 18, 2025:**
- Switch from Supabase auth to custom JWT endpoint
- Ensures restaurant context in token payload
- Fixes authentication loop permanently

### Root Cause

**State Synchronization Failure:**
```typescript
// The Problem:
// 1. React state updated with restaurantId
setRestaurantId(response.restaurantId);

// 2. httpClient state NOT updated
// httpClient.currentRestaurantId = undefined

// 3. API calls missing X-Restaurant-ID header
// Backend middleware queries user_restaurants table

// 4. Query hangs (no timeout) or fails validation
// Login stuck at "Signing in..."
```

**Where It Happened:**
- Line 82: `initializeAuth()` - session restoration
- Line 152: `onAuthStateChange()` - Supabase SIGNED_IN event
- Line 227: `login()` - EMAIL/PASSWORD LOGIN (primary)
- Line 263: `loginWithPin()` - PIN authentication
- Line 315: `loginAsStation()` - station authentication

### Impact

**Customer Experience:**
- Login hung at "Signing in..." indefinitely
- No error message shown
- Users forced to refresh and retry
- Some users gave up

**Business Impact:**
- 16 days of intermittent login failures
- Customer frustration and support tickets
- Developer time: 24 hours across multiple sessions
- Multiple production deployments

### Fix

**Phase 1: Sync httpClient State (November 10)**

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/contexts/AuthContext.tsx`

**Commit:** acd6125c

```typescript
// Add setCurrentRestaurantId() at 5 locations
await setCurrentRestaurantId(response.restaurantId);
httpClient.setRestaurantId(response.restaurantId);
```

**Phase 2: Switch to Custom JWT (November 18)**

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/contexts/AuthContext.tsx`

**Commit:** 9e97f720

```typescript
// Replace Supabase auth with custom JWT endpoint
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Custom JWT includes restaurant_id in payload
const { token, user, restaurantId } = await response.json();
```

### Prevention

1. **Single Source of Truth**
   - Never duplicate state across systems
   - Use context providers or global stores
   - Document state dependencies

2. **State Change Logging**
   ```typescript
   logger.info('Auth state updated', {
     userId: user.id,
     restaurantId: restaurantId,
     httpClientSynced: httpClient.currentRestaurantId === restaurantId
   });
   ```

3. **Integration Tests**
   ```typescript
   test('login syncs httpClient state', async () => {
     await login(email, password);
     expect(httpClient.currentRestaurantId).toBe(expectedRestaurantId);
   });
   ```

### Related Documentation

- [AUTHENTICATION_EVOLUTION_SUMMARY.md](/Users/mikeyoung/CODING/rebuild-6.0/AUTHENTICATION_EVOLUTION_SUMMARY.md)
- [ADR-011: Authentication Evolution](/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-011-authentication-evolution.md)

---

## INC-003: Square Payment Timeout

### Overview
| Field | Value |
|-------|-------|
| **Date** | November 10, 2025 |
| **Duration** | 12 hours |
| **Severity** | P0 - Payment system failure |
| **Cost** | $1,800 (12 hours × $150/hr) |
| **Provider** | Square Payments API |
| **Commits** | cf7d9320 |

### Timeline

**Unknown Date:**
- Production reports: "Payment button hangs"
- Users wait indefinitely with no feedback
- Some users abandon carts

**November 10, 2025 - 9:00 AM:**
- Developer investigation begins
- Review Square API calls
- Identify: No timeout protection

**9:00 AM - 9:00 PM (12 hours):**
- Research Square API behavior
- Design timeout wrapper with Promise.race()
- Implement for all Square API calls
- Test with simulated network issues
- Deploy to production

### Root Cause

**No Timeout Protection:**
```typescript
//  DANGEROUS: No timeout on Square API call
const paymentResult = await paymentsApi.create(paymentRequest);
```

**Consequences:**
- Network issues cause infinite hangs
- Square API outages leave customers waiting
- No error feedback to users
- Cannot retry or cancel

### Impact

**Customer Experience:**
- Payment button appears frozen
- No loading indicator or progress
- No error message after timeout
- Users abandon carts

**Business Impact:**
- Lost revenue from abandoned carts
- Customer support tickets
- Reputation damage
- Developer time: 12 hours

### Fix

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/payments.routes.ts:38-64`

**Commit:** cf7d9320

```typescript
// Timeout wrapper for Square API calls
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  operation: string = 'Square API call'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}

// Usage
paymentResult = await withTimeout(
  paymentsApi.create(paymentRequest),
  30000,
  'Square payment creation'
);
```

### Prevention

1. **Always Add Timeouts**
   - 30 seconds for payment operations
   - 5 seconds for database queries
   - 60 seconds for WebRTC connections

2. **Timeout Monitoring**
   ```typescript
   logger.warn('Square API timeout', {
     operation: 'payment creation',
     timeoutMs: 30000,
     orderId: order_id
   });
   ```

3. **User Feedback**
   - Show timeout error message
   - Provide retry button
   - Log for monitoring

### Related Documentation

- [PATTERNS.md](./PATTERNS.md#pattern-1-timeout-handling)
- [P0_PAYMENT_AUDIT_ANALYSIS.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/investigations/P0_PAYMENT_AUDIT_ANALYSIS.md)

---

## INC-004: Square Audit Race Condition

### Overview
| Field | Value |
|-------|-------|
| **Date** | November 10, 2025 |
| **Duration** | 10 hours |
| **Severity** | P0 - Compliance violation |
| **Cost** | $1,500 (10 hours × $150/hr) |
| **Provider** | Square Payments API |
| **Commits** | dc8afec6 |

### Timeline

**Unknown Date:**
- Production reports: "Payment error but card charged"
- Customer confusion: "Was I charged?"
- Support team investigates

**November 10, 2025 - 9:00 AM:**
- Developer investigation begins
- Review payment flow timing
- Identify: Audit log AFTER payment processing

**9:00 AM - 7:00 PM (10 hours):**
- Research PCI DSS requirements (ADR-009)
- Design two-phase audit logging
- Implement 'initiated' status
- Add `updatePaymentAuditStatus()` function
- Test with simulated audit failures
- Deploy to production

### Root Cause

**Audit Timing Bug:**
```typescript
//  DANGEROUS: Audit AFTER external API call
const paymentResult = await paymentsApi.create(paymentRequest);
await OrdersService.updateOrderPayment(...);
await PaymentService.logPaymentAttempt({ status: 'success' });
```

**The Problem:**
1. Customer charged (Square API)
2. Order marked as paid (database)
3. Audit log fails (database error)
4. Error thrown to client
5. **Customer charged but system shows error** 

### Impact

**Customer Experience:**
- "Payment error" message shown
- But card was charged
- Confusion: "Was I charged or not?"
- Support burden: refund requests

**Business Impact:**
- Revenue reconciliation issues
- PCI DSS compliance gap
- Customer trust damage
- Developer time: 10 hours

### Fix

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/payments.routes.ts:233-299`

**Commit:** dc8afec6

```typescript
// Phase 1: Log BEFORE external API call
await PaymentService.logPaymentAttempt({
  orderId: order_id,
  status: 'initiated',  // NEW: Pre-charge status
  restaurantId: restaurantId,
  amount: validation.orderTotal,
  idempotencyKey: serverIdempotencyKey
});

// Phase 2: Make API call (safe to fail now)
const paymentResult = await withTimeout(
  paymentsApi.create(paymentRequest),
  30000,
  'Square payment creation'
);

// Phase 3: Update audit log with result
await PaymentService.updatePaymentAuditStatus(
  serverIdempotencyKey,
  paymentResult.payment?.status === 'COMPLETED' ? 'success' : 'failed',
  paymentResult.payment.id
);
```

### Prevention

1. **Log Before External APIs**
   - Audit log with status='initiated'
   - Safe to fail early (no charge yet)
   - Update log after API call

2. **Audit Status Flow**
   ```
   initiated → (API call) → success
                         ↓
                       failed
   ```

3. **Monitoring**
   ```typescript
   // Alert on 'initiated' logs not updated
   SELECT * FROM payment_audit_logs
   WHERE status = 'initiated'
   AND created_at < NOW() - INTERVAL '5 minutes';
   ```

### Related Documentation

- [PATTERNS.md](./PATTERNS.md#pattern-2-two-phase-audit-logging)
- [P0_PAYMENT_AUDIT_ANALYSIS.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/investigations/P0_PAYMENT_AUDIT_ANALYSIS.md)
- [ADR-009: Error Handling Philosophy](/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md)

---

## INC-005: Voice WebRTC Race Condition

### Overview
| Field | Value |
|-------|-------|
| **Date** | November 10, 2025 |
| **Duration** | 7 hours |
| **Severity** | P0 - Feature completely broken |
| **Cost** | $1,050 (7 hours × $150/hr) |
| **Provider** | OpenAI Realtime API (WebRTC) |
| **Commits** | 500b820c |

### Timeline

**Unknown Date:**
- Voice ordering transcription fails
- State machine deadlocks
- "Waiting for user transcript..." forever

**November 10, 2025 - 8:00 AM:**
- Developer investigation begins
- Add comprehensive logging
- Verify WebRTC connection works
- Verify audio transmits

**8:00 AM - 3:00 PM (7 hours):**
- Identify: Initial events lost
- Discover: Handler attached 50-100ms late
- Find: DataChannel opens before handler ready
- Design: Attach handler before channel creation
- Implement: Forward events via EventEmitter
- Test: Verify events captured
- Deploy to production

### Root Cause

**Race Condition Timing:**
```typescript
//  DANGEROUS: Handler attached after channel opens
const dataChannel = peerConnection.createDataChannel('openai-realtime');

// 50-100ms delay here...
dataChannel.onmessage = (event) => {
  // Handler attached AFTER channel opens
  // Initial messages (session.created) are LOST
  handleMessage(event);
};
```

**Timeline:**
```
0ms:    createDataChannel()
0ms:    dataChannel.onopen fires
50ms:   dataChannel.onmessage attached  ← TOO LATE
100ms:  session.created event lost
500ms:  conversation.item.created lost
1000ms: State machine deadlock
```

### Impact

**Customer Experience:**
- Voice ordering appears to work
- Audio transmits, agent responds
- But transcription never appears
- State machine stuck forever

**Business Impact:**
- Voice ordering non-functional
- Customer confusion and frustration
- Developer time: 7 hours

### Fix

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts:412-418`

**Commit:** 500b820c

```typescript
//  SAFE: Attach handler BEFORE channel opens
const setupDataChannel = () => {
  const dataChannel = peerConnection.createDataChannel('openai-realtime');

  // Attach handler IMMEDIATELY (before onopen can fire)
  dataChannel.onmessage = (event) => {
    // Handler ready for first message
    this.emit('dataChannelMessage', event.data);
  };

  dataChannel.onopen = () => {
    logger.info('DataChannel opened');
    // All messages will be captured now
  };

  return dataChannel;
};
```

**Timeline After Fix:**
```
0ms:    createDataChannel()
0ms:    dataChannel.onmessage attached  ← READY
0ms:    dataChannel.onopen fires
100ms:  session.created event captured
500ms:  conversation.item.created captured
1000ms: Normal operation
```

### Prevention

1. **Attach Handlers Early**
   - Before creating event sources
   - Before opening connections
   - Before triggering events

2. **Race Condition Logging**
   ```typescript
   logger.debug('Handler attached', {
     timestamp: Date.now(),
     channel: 'dataChannel'
   });

   dataChannel.onopen = () => {
     logger.debug('Channel opened', {
       timestamp: Date.now(),
       channel: 'dataChannel'
     });
   };
   ```

3. **Defensive Fallbacks**
   ```typescript
   // Create transcript entry if missing
   if (!this.transcriptMap.has(itemId)) {
     logger.warn('Missing transcript map entry, creating defensively', {
       itemId
     });
     this.transcriptMap.set(itemId, { text: '', status: 'in_progress' });
   }
   ```

### Related Documentation

- [PATTERNS.md](./PATTERNS.md#pattern-4-race-condition-prevention)

---

## INC-006: Environment Variable Newlines

### Overview
| Field | Value |
|-------|-------|
| **Date** | November 7, 2025 |
| **Duration** | 4 hours |
| **Severity** | P1 - Feature broken in production |
| **Cost** | $600 (4 hours × $150/hr) |
| **Provider** | Internal (CLI tools) |
| **Commits** | 03011ced |

### Timeline

**Unknown Date:**
- Deploy to production (Render)
- Voice ordering button does nothing
- No error messages shown

**November 7, 2025 - 2:00 PM:**
- Developer investigation begins
- Check environment variables
- Find: OPENAI_API_KEY contains '\n'

**2:00 PM - 6:00 PM (4 hours):**
- Trace source: Vercel CLI without `-n` flag
- Design solution: Trim all env vars at startup
- Add validation for malformed keys
- Implement health check endpoint
- Deploy to production

### Root Cause

**Newline Characters from CLI:**
```bash
#  WRONG: Adds newline to environment variable
echo "sk-proj-..." | vercel env add OPENAI_API_KEY production

# Result: OPENAI_API_KEY="sk-proj-...\n"
```

**The Problem:**
```typescript
// OpenAI API receives malformed Authorization header
Authorization: Bearer sk-proj-...\n

// OpenAI rejects with 401/403 error
// Client connect() promise rejects silently
// User sees no feedback
```

### Impact

**Customer Experience:**
- Voice ordering button appears to do nothing
- No error message shown
- No loading indicator
- Silent failure

**Business Impact:**
- Feature broken in production
- Customer confusion
- Developer time: 4 hours

### Fix

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/env.ts:10-23`

**Commit:** 03011ced

```typescript
// Trim all environment variables
const getString = (key: string, fallback = ''): string => {
  const value = process.env[key];
  // Trim to remove any whitespace or newline characters
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed !== '' ? trimmed : fallback;
};

// Detect malformed keys at startup
if (apiKey.includes('\n') || apiKey.includes('\\n') || apiKey.includes('\r')) {
  throw new Error(
    `Environment variable ${key} contains invalid characters (newlines). ` +
    `This may be caused by CLI tools. Fix: Use "echo -n" when setting variables.`
  );
}
```

### Prevention

1. **Always Use `echo -n`**
   ```bash
   #  CORRECT: No newline added
   echo -n "value" | vercel env add VAR_NAME production
   ```

2. **Trim at Startup**
   ```typescript
   const trimmed = value?.trim();
   ```

3. **Validate at Startup**
   ```typescript
   if (value.includes('\n')) {
     throw new Error('Invalid environment variable');
   }
   ```

4. **Health Check Endpoint**
   ```typescript
   router.get('/health', (req, res) => {
     const apiKeyValid = !apiKey.includes('\n');
     res.json({ api_key_valid: apiKeyValid });
   });
   ```

### Related Documentation

- [PATTERNS.md](./PATTERNS.md#pattern-3-environment-variable-validation)
- [VOICE_ORDERING_FIX_SUMMARY.md](/Users/mikeyoung/CODING/rebuild-6.0/VOICE_ORDERING_FIX_SUMMARY.md)

---

## Summary Statistics

### Total Cost
| Incident | Hours | Cost |
|----------|-------|------|
| INC-001: OpenAI Model Change | 8 | $1,200 |
| INC-002: Auth Token Sync | 24 | $3,600 |
| INC-003: Square Timeout | 12 | $1,800 |
| INC-004: Square Audit Race | 10 | $1,500 |
| INC-005: Voice WebRTC Race | 7 | $1,050 |
| INC-006: Env Var Newlines | 4 | $600 |
| **Total** | **65** | **$9,750** |

### Incident Categories
- **Silent API Changes:** 1 incident (15%)
- **State Synchronization:** 1 incident (15%)
- **Timeout Issues:** 1 incident (15%)
- **Race Conditions:** 2 incidents (31%)
- **Configuration Issues:** 1 incident (15%)

### Providers Affected
- **OpenAI:** 2 incidents
- **Square:** 2 incidents
- **Internal:** 2 incidents

---

## Related Documentation

- [README.md](./README.md) - Executive summary
- [PATTERNS.md](./PATTERNS.md) - API patterns and best practices
- [PREVENTION.md](./PREVENTION.md) - Solutions and monitoring
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Code examples
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - AI development guidelines

---

**Last Updated:** 2025-11-19
**Incidents Analyzed:** 6 major incidents
**Total Cost:** $9,750
**Maintainer:** Technical Lead


## Solution Patterns

# API Integration Patterns - Lessons from 168 Bug Fixes

**Created:** 2025-11-19
**Category:** Technical Patterns
**Source:** 6 months of production incidents (June-November 2025)

---

## Core Principles

### 1. Never Trust External APIs
- Providers change APIs without notice
- Networks fail unpredictably
- Timeouts must be explicit
- Silent failures are common

### 2. Log Before, Not After
- Log intent before external calls
- Update logs with results
- Enables forensic analysis
- Prevents "charged but unrecorded" scenarios

### 3. Fail Fast and Loud
- Timeout errors must throw
- Silent failures are bugs
- Customers prefer errors over infinite waits
- Monitoring depends on visible failures

---

## Pattern 1: Timeout Handling

### The Problem
```typescript
//  DANGEROUS: No timeout protection
const paymentResult = await paymentsApi.create(paymentRequest);
```

**Consequences:**
- Customer waits forever
- Browser tab hangs
- No error feedback
- Cannot retry or cancel

### The Solution
```typescript
//  SAFE: 30-second timeout wrapper
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  operation: string = 'API call'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}

// Usage
const paymentResult = await withTimeout(
  paymentsApi.create(paymentRequest),
  30000,
  'Square payment creation'
);
```

### Timeout Values (Production-Tested)

| Operation | Timeout | Rationale |
|-----------|---------|-----------|
| Payment creation | 30s | Network + processing time |
| Payment retrieval | 30s | Lookup + response time |
| Refund processing | 30s | API call + validation |
| Database queries | 5s | Fast queries, detect hangs |
| Real-time session | 60s | WebRTC connection establishment |
| File uploads | 120s | Large files, slow networks |

### Real-World Example: Square Payment Timeout

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/payments.routes.ts:38-64`

**Commit:** cf7d9320 (November 10, 2025)

```typescript
// Before: Customers waited indefinitely
paymentResult = await paymentsApi.create(paymentRequest);

// After: 30-second timeout prevents hangs
paymentResult = await withTimeout(
  paymentsApi.create(paymentRequest),
  30000,
  'Square payment creation'
);
```

**Impact:** Eliminated infinite waits, improved customer experience

---

## Pattern 2: Two-Phase Audit Logging

### The Problem
```typescript
//  DANGEROUS: Log AFTER external API call
const paymentResult = await paymentsApi.create(paymentRequest);

await PaymentService.logPaymentAttempt({
  status: 'success',
  paymentId: paymentResult.payment.id
});
```

**Consequences:**
- Customer charged, audit log fails
- System shows error, customer confused
- No record of payment attempt
- Revenue reconciliation issues

### The Solution
```typescript
//  SAFE: Two-phase audit logging

// Phase 1: Log BEFORE external API call
await PaymentService.logPaymentAttempt({
  orderId: order_id,
  status: 'initiated',  // NEW: Pre-charge status
  restaurantId: restaurantId,
  amount: validation.orderTotal,
  idempotencyKey: serverIdempotencyKey
});

// Phase 2: Make API call (safe to fail now)
const paymentResult = await withTimeout(
  paymentsApi.create(paymentRequest),
  30000,
  'Square payment creation'
);

// Phase 3: Update audit log with result
await PaymentService.updatePaymentAuditStatus(
  serverIdempotencyKey,
  paymentResult.payment?.status === 'COMPLETED' ? 'success' : 'failed',
  paymentResult.payment.id
);
```

### Audit Status Flow

```
initiated → (API call) → success
                      ↓
                    failed
```

### Real-World Example: Square Audit Race Condition

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/payments.routes.ts:233-299`

**Commit:** dc8afec6 (November 10, 2025)

**Before:**
1. Charge customer (line 215)
2. Update order status (line 233)
3. Log audit (line 244) ← **FAILS HERE**
4. Throw error to client
5. Customer charged but system shows error

**After:**
1. Log audit status='initiated' ← **FAILS EARLY**
2. Charge customer (safe now)
3. Update audit status='success'

**Impact:** Eliminated "charged but unrecorded" scenario

---

## Pattern 3: Environment Variable Validation

### The Problem
```typescript
//  DANGEROUS: No validation, silent failures
const apiKey = process.env['OPENAI_API_KEY'];
const response = await fetch('https://api.openai.com/...', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

**Consequences:**
- Missing keys fail in production
- Newline characters from CLI tools
- 401/403 errors with no context
- Hours debugging config issues

### The Solution
```typescript
//  SAFE: Validate at startup + trim whitespace

// 1. Trim all environment variables
const getString = (key: string, fallback = ''): string => {
  const value = process.env[key];
  const trimmed = value?.trim();  // Remove newlines from CLI
  return trimmed !== undefined && trimmed !== '' ? trimmed : fallback;
};

// 2. Validate required keys at startup
const validateRequiredEnvVars = () => {
  const required = [
    'OPENAI_API_KEY',
    'SQUARE_ACCESS_TOKEN',
    'SUPABASE_SERVICE_KEY'
  ];

  for (const key of required) {
    const value = getString(key);
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    // Detect malformed keys (newlines from CLI)
    if (value.includes('\n') || value.includes('\\n') || value.includes('\r')) {
      throw new Error(
        `Environment variable ${key} contains invalid characters (newlines). ` +
        `This may be caused by CLI tools. Fix: Use "echo -n" when setting variables.`
      );
    }
  }
};

// 3. Run validation before starting server
validateRequiredEnvVars();
```

### Real-World Example: OpenAI API Key with Newlines

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/env.ts:10-23`

**Commit:** 03011ced (November 7, 2025)

**Problem:**
```bash
#  WRONG: Adds newline to environment variable
echo "sk-proj-..." | vercel env add OPENAI_API_KEY production

# Result: OPENAI_API_KEY="sk-proj-...\n"
```

**Solution:**
```bash
#  CORRECT: No newline added
echo -n "sk-proj-..." | vercel env add OPENAI_API_KEY production

# Result: OPENAI_API_KEY="sk-proj-..."
```

**Impact:** Voice ordering worked after deployment

---

## Pattern 4: Race Condition Prevention

### The Problem
```typescript
//  DANGEROUS: Handler attached after event source opens
const dataChannel = peerConnection.createDataChannel('openai-realtime');

// 50-100ms delay here...
dataChannel.onopen = () => {
  console.log('DataChannel opened');
};

dataChannel.onmessage = (event) => {
  // Handler attached AFTER channel opens
  // Initial messages (session.created) are LOST
  handleMessage(event);
};
```

**Consequences:**
- First events lost (session.created)
- Cascade failures (missing transcript map entries)
- State machine deadlocks
- Transcription silently fails

### The Solution
```typescript
//  SAFE: Attach handlers BEFORE creating event source
const setupDataChannel = () => {
  const dataChannel = peerConnection.createDataChannel('openai-realtime');

  // Attach handlers IMMEDIATELY (before onopen can fire)
  dataChannel.onmessage = (event) => {
    // Handler ready for first message
    handleMessage(event);
  };

  dataChannel.onopen = () => {
    console.log('DataChannel opened');
    // All messages will be captured now
  };

  return dataChannel;
};
```

### Race Condition Timing

```
Timeline (Before Fix):
0ms:    createDataChannel()
0ms:    dataChannel.onopen fires
50ms:   dataChannel.onmessage attached  ← TOO LATE
100ms:  session.created event lost
500ms:  conversation.item.created lost
1000ms: State machine deadlock

Timeline (After Fix):
0ms:    createDataChannel()
0ms:    dataChannel.onmessage attached  ← READY
0ms:    dataChannel.onopen fires
100ms:  session.created event captured
500ms:  conversation.item.created captured
1000ms: Normal operation
```

### Real-World Example: Voice WebRTC Race Condition

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts:412-418`

**Commit:** 500b820c (November 10, 2025)

**Before:**
- Handler attached in VoiceEventHandler (separate class)
- 50-100ms delay between channel creation and handler attachment
- Lost session.created events
- Transcript map never populated
- Transcription silently failed

**After:**
- Handler attached in WebRTCConnection (same class)
- Handler attached BEFORE channel opens
- Messages forwarded via 'dataChannelMessage' event
- All events captured
- Transcription works reliably

**Impact:** Fixed voice ordering in production

---

## Pattern 5: Silent API Change Detection

### The Problem
```typescript
//  VULNERABLE: Old API usage continues to work... until it doesn't
const sessionConfig = {
  input_audio_transcription: {
    model: 'whisper-1',  // Silently deprecated by OpenAI
    language: 'en'
  }
};

// API accepts config, no error thrown
// But transcription events never arrive
```

**Consequences:**
- No deprecation notice
- No error messages
- Feature silently breaks
- Hours debugging "working" code

### The Solution
```typescript
//  DEFENSIVE: Check provider changelogs, add fallbacks

// 1. Monitor provider changelogs (daily)
// - OpenAI API updates: https://platform.openai.com/docs/changelog
// - Square API updates: https://developer.squareup.com/blog
// - Supabase updates: https://supabase.com/changelog

// 2. Add version checks and logging
const sessionConfig = {
  input_audio_transcription: {
    model: 'gpt-4o-transcribe',  // Updated 2025-01-18
    // Note: whisper-1 silently deprecated by OpenAI
  }
};

logger.info('Using OpenAI transcription model', {
  model: sessionConfig.input_audio_transcription.model,
  updated: '2025-01-18',
  reason: 'whisper-1 deprecated'
});

// 3. Test with production API keys regularly
// - Weekly smoke test of critical flows
// - Monitor for missing events/responses
// - Alert on unexpected behavior changes
```

### Real-World Example: OpenAI Model Breaking Change

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceSessionConfig.ts:253`

**Commit:** 3a5d126f (November 18, 2025)

**Timeline:**
- **October 16, 2025:** Voice ordering works (whisper-1)
- **November 2025:** OpenAI deprecates whisper-1 for Realtime API
- **November 18, 2025:** 8 hours debugging, discover forum posts
- **Fix:** 1 line change: `model: 'whisper-1'` → `model: 'gpt-4o-transcribe'`

**Evidence:**
- OpenAI community forum posts (2025)
- No official deprecation notice
- API accepted old config but ignored it
- Only transcription events stopped

**Impact:** $1,200 debugging cost for 1-line fix

---

## Pattern 6: Retry Logic with Exponential Backoff

### The Problem
```typescript
//  DANGEROUS: No retry on transient failures
const result = await apiCall();
```

### The Solution
```typescript
//  SAFE: Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Calculate exponential backoff: 1s, 2s, 4s
      const delayMs = baseDelayMs * Math.pow(2, attempt);

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
        error: lastError.message,
        delayMs
      });

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(
  () => apiCall(),
  3,  // 3 retries
  1000  // 1 second base delay
);
```

### Retry Decision Matrix

| Error Type | Retry? | Backoff | Max Retries |
|------------|--------|---------|-------------|
| 5xx Server Error | Yes | Exponential | 3 |
| Network Timeout | Yes | Exponential | 3 |
| Rate Limit (429) | Yes | Linear + header | 5 |
| 4xx Client Error | No | N/A | 0 |
| Auth Failure (401) | No | N/A | 0 |
| Not Found (404) | No | N/A | 0 |

---

## Pattern 7: Rate Limiting

### The Problem
```typescript
//  DANGEROUS: Burst of API calls, hit rate limit
for (const item of items) {
  await apiCall(item);  // 100 calls in 1 second
}
```

### The Solution
```typescript
//  SAFE: Rate limiter with token bucket algorithm
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number  // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refillTokens();

    while (this.tokens < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.refillTokens();
    }

    this.tokens -= 1;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Usage
const limiter = new RateLimiter(10, 2);  // 10 tokens, refill 2/sec

for (const item of items) {
  await limiter.acquire();
  await apiCall(item);  // Max 2 calls/sec
}
```

---

## Pattern 8: Payload Validation

### The Problem
```typescript
//  DANGEROUS: Send unvalidated data to external API
const result = await apiCall({
  amount: userInput.amount,
  idempotencyKey: generateKey()
});
```

### The Solution
```typescript
//  SAFE: Validate before sending
import { z } from 'zod';

const PaymentSchema = z.object({
  amount: z.number().positive().max(100000),  // $1000 max
  idempotencyKey: z.string().max(45),  // Square limit
  currency: z.enum(['USD']),
  orderSource: z.enum(['kiosk', 'online', 'server'])
});

// Validate before API call
const validated = PaymentSchema.parse({
  amount: userInput.amount,
  idempotencyKey: generateKey(),
  currency: 'USD',
  orderSource: 'kiosk'
});

const result = await apiCall(validated);
```

### Real-World Example: Square Idempotency Key Length

**Commit:** 82d38356 (date unknown)

**Problem:**
- Generated UUID idempotency keys (36 chars)
- Added prefixes for uniqueness (50+ chars)
- Square API limit: 45 characters
- Silent failures in production

**Solution:**
```typescript
// Before: Too long
const key = `${restaurantId}-${orderId}-${Date.now()}`;  // 50+ chars

// After: Within limit
const key = `ord-${orderId.slice(0, 8)}-${Date.now()}`;  // 22 chars
```

---

## Summary: The 8 Critical Patterns

1. **Timeout Handling** - 30s for payments, 5s for DB
2. **Two-Phase Audit Logging** - Log before external calls
3. **Environment Variable Validation** - Trim and validate at startup
4. **Race Condition Prevention** - Attach handlers before operations
5. **Silent API Change Detection** - Monitor changelogs, log versions
6. **Retry Logic** - Exponential backoff for transient failures
7. **Rate Limiting** - Token bucket for burst protection
8. **Payload Validation** - Validate before sending to external APIs

---

## Related Documentation

- [INCIDENTS.md](./INCIDENTS.md) - Detailed incident reports
- [PREVENTION.md](./PREVENTION.md) - Monitoring and alerts
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Code examples
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - AI development guidelines

---

**Last Updated:** 2025-11-19
**Patterns Validated:** 168 bug fixes over 6 months
**Maintainer:** Technical Lead


## Quick Reference

# API Integration Quick Reference

**Created:** 2025-11-19
**Category:** Developer Reference
**Purpose:** Copy-paste solutions for common API integration tasks

---

## Timeout Values (Production-Tested)

```typescript
// Standard timeout values from 6 months of production
const TIMEOUTS = {
  PAYMENT_CREATION: 30000,     // 30 seconds - Square payment
  PAYMENT_RETRIEVAL: 30000,    // 30 seconds - Square lookup
  REFUND_PROCESSING: 30000,    // 30 seconds - Square refund
  DATABASE_QUERY: 5000,        // 5 seconds - Detect hangs
  REALTIME_SESSION: 60000,     // 60 seconds - WebRTC setup
  FILE_UPLOAD: 120000,         // 2 minutes - Large files
  API_HEALTH_CHECK: 10000,     // 10 seconds - Quick validation
  WEBHOOK_DELIVERY: 15000      // 15 seconds - Third-party webhook
};
```

---

## Timeout Wrapper

```typescript
/**
 * Universal timeout wrapper for all external APIs
 * Usage: wrap any promise with withTimeout()
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Example: Square Payment
const payment = await withTimeout(
  paymentsApi.create(paymentRequest),
  30000,
  'Square payment creation'
);

// Example: Database Query
const user = await withTimeout(
  supabase.from('users').select('*').eq('id', userId).single(),
  5000,
  'User query'
);

// Example: OpenAI API
const completion = await withTimeout(
  openai.chat.completions.create({ model: 'gpt-4', messages }),
  30000,
  'OpenAI completion'
);
```

---

## Retry Logic with Exponential Backoff

```typescript
/**
 * Retry transient failures with exponential backoff
 * Does NOT retry 4xx client errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry client errors (4xx)
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate exponential backoff: 1s, 2s, 4s
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// Example: Retry API call with timeout
const result = await withRetry(
  () => withTimeout(apiCall(), 30000, 'API call'),
  3  // 3 retries
);
```

---

## Two-Phase Audit Logging

```typescript
/**
 * Log intent before external API call
 * Update log with result after
 * Prevents "charged but unrecorded" scenario
 */

// Phase 1: Log BEFORE API call
const auditId = uuidv4();
await supabase.from('payment_audit_logs').insert({
  id: auditId,
  order_id: order_id,
  restaurant_id: restaurant_id,
  status: 'initiated',  // NEW: Pre-charge status
  amount: amount,
  idempotency_key: idempotencyKey,
  created_at: new Date().toISOString()
});

// Phase 2: Make API call (safe to fail now)
try {
  const payment = await withTimeout(
    paymentsApi.create(paymentRequest),
    30000,
    'Square payment creation'
  );

  // Phase 3: Update audit log with success
  await supabase
    .from('payment_audit_logs')
    .update({
      status: 'success',
      payment_id: payment.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', auditId);

} catch (error) {
  // Update audit log with failure
  await supabase
    .from('payment_audit_logs')
    .update({
      status: 'failed',
      error_code: error.code,
      error_detail: error.message,
      updated_at: new Date().toISOString()
    })
    .eq('id', auditId);

  throw error;
}
```

---

## Environment Variable Validation

```typescript
/**
 * Trim and validate all environment variables at startup
 * Catches newlines from CLI tools, missing values
 */

// 1. Trim helper
const getString = (key: string, fallback = ''): string => {
  const value = process.env[key];
  const trimmed = value?.trim();  // Remove newlines
  return trimmed !== undefined && trimmed !== '' ? trimmed : fallback;
};

// 2. Validate at startup
const validateEnvironment = (): void => {
  const required = [
    'OPENAI_API_KEY',
    'SQUARE_ACCESS_TOKEN',
    'SUPABASE_SERVICE_KEY'
  ];

  for (const key of required) {
    const value = getString(key);

    // Check if missing
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    // Check for newlines (from CLI tools)
    if (value.includes('\n') || value.includes('\\n') || value.includes('\r')) {
      throw new Error(
        `Environment variable ${key} contains invalid characters. ` +
        `Fix: Use "echo -n" when setting via CLI.`
      );
    }

    // Check for placeholders
    if (value === 'CHANGEME' || value === 'demo') {
      throw new Error(`Environment variable ${key} has placeholder value`);
    }
  }
};

// 3. Run before starting server
validateEnvironment();
```

---

## Race Condition Prevention

```typescript
/**
 * Attach event handlers BEFORE creating event sources
 * Prevents losing initial events
 */

//  WRONG: Handler attached after channel opens
const channel = peer.createDataChannel('data');
// 50-100ms delay...
channel.onmessage = (event) => {
  // Too late - initial messages lost
  handleMessage(event);
};

//  CORRECT: Handler attached before channel opens
const channel = peer.createDataChannel('data');
channel.onmessage = (event) => {
  // Ready for first message
  handleMessage(event);
};
channel.onopen = () => {
  // All messages captured
  console.log('Channel opened');
};
```

---

## API Error Codes Reference

### OpenAI API

| Code | Meaning | Retry? | Action |
|------|---------|--------|--------|
| 401 | Invalid API key | No | Check OPENAI_API_KEY |
| 429 | Rate limit | Yes | Exponential backoff |
| 500 | Server error | Yes | Retry 3x |
| 503 | Service unavailable | Yes | Retry 3x |

### Square API

| Code | Meaning | Retry? | Action |
|------|---------|--------|--------|
| 401 | Invalid token | No | Check SQUARE_ACCESS_TOKEN |
| 402 | Payment declined | No | Inform user |
| 429 | Rate limit | Yes | Exponential backoff |
| 500 | Server error | Yes | Retry 3x |
| 503 | Service unavailable | Yes | Retry 3x |

### Supabase

| Error | Meaning | Retry? | Action |
|-------|---------|--------|--------|
| PGRST301 | RLS policy violation | No | Check restaurant_id |
| PGRST116 | Row not found | No | Handle missing data |
| 08006 | Connection failure | Yes | Retry 3x |
| 53300 | Too many connections | Yes | Use connection pooling |

---

## Common Error Patterns

### Pattern 1: Silent API Change

```typescript
// Symptom: API accepts config but ignores it
// Example: OpenAI whisper-1 deprecation

//  OLD (broken after deprecation)
const config = {
  input_audio_transcription: {
    model: 'whisper-1',
    language: 'en'
  }
};

//  NEW (working)
const config = {
  input_audio_transcription: {
    model: 'gpt-4o-transcribe'
  }
};

// Prevention: Log API versions
logger.info('Using OpenAI transcription', {
  model: config.input_audio_transcription.model,
  updated: '2025-01-18',
  reason: 'whisper-1 deprecated'
});
```

### Pattern 2: Newlines in Environment Variables

```typescript
// Symptom: API returns 401/403 with valid-looking key
// Cause: Newline characters from CLI

//  WRONG: Adds newline
echo "sk-proj-..." | vercel env add OPENAI_API_KEY production

//  CORRECT: No newline
echo -n "sk-proj-..." | vercel env add OPENAI_API_KEY production

// Detection: Check for newlines at startup
if (apiKey.includes('\n') || apiKey.includes('\\n')) {
  throw new Error('API key contains newline characters');
}
```

### Pattern 3: State Synchronization

```typescript
// Symptom: API calls missing required headers
// Cause: State not synced between systems

//  WRONG: Only update React state
setRestaurantId(response.restaurantId);

//  CORRECT: Sync all state systems
setRestaurantId(response.restaurantId);
httpClient.setRestaurantId(response.restaurantId);
localStorage.setItem('restaurantId', response.restaurantId);

// Verification: Log state sync
logger.info('Restaurant ID updated', {
  reactState: restaurantId,
  httpClient: httpClient.currentRestaurantId,
  localStorage: localStorage.getItem('restaurantId'),
  allSynced: restaurantId === httpClient.currentRestaurantId
});
```

### Pattern 4: Race Condition Timing

```typescript
// Symptom: Events lost, state machine deadlock
// Cause: Async handler attached too late

// Timeline (Before Fix):
// 0ms:    Event source created
// 0ms:    First event fires
// 50ms:   Handler attached ← TOO LATE
// 100ms:  Event lost

//  CORRECT: Attach handler synchronously
const source = createEventSource();
source.onmessage = (event) => {
  // Handler ready for first event
  handleMessage(event);
};
```

---

## Health Check Template

```typescript
/**
 * Health check endpoint for monitoring
 * Returns status of all external dependencies
 */
router.get('/health', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: false,
      openai: false,
      square: false
    }
  };

  // Database
  try {
    await supabase.from('restaurants').select('id').limit(1);
    checks.checks.database = true;
  } catch {
    checks.status = 'unhealthy';
  }

  // OpenAI
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    checks.checks.openai = apiKey &&
      !apiKey.includes('\n') &&
      apiKey.length > 20;
  } catch {
    checks.status = 'unhealthy';
  }

  // Square
  try {
    const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
    checks.checks.square = token &&
      !token.includes('\n') &&
      token.length > 20;
  } catch {
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

---

## Logging Templates

### API Call Logging

```typescript
// Log before API call
logger.info('Calling external API', {
  provider: 'Square',
  operation: 'payment creation',
  orderId: order_id,
  amount: amount,
  idempotencyKey: idempotencyKey
});

const startTime = Date.now();

try {
  const result = await withTimeout(apiCall(), 30000, 'Square payment');

  // Log success
  logger.info('API call succeeded', {
    provider: 'Square',
    operation: 'payment creation',
    orderId: order_id,
    latencyMs: Date.now() - startTime,
    paymentId: result.id
  });

} catch (error) {
  // Log failure
  logger.error('API call failed', {
    provider: 'Square',
    operation: 'payment creation',
    orderId: order_id,
    latencyMs: Date.now() - startTime,
    error: error.message,
    errorCode: error.code
  });

  throw error;
}
```

### Timeout Logging

```typescript
try {
  const result = await withTimeout(apiCall(), 30000, 'Square payment');
} catch (error) {
  if (error.message.includes('timed out')) {
    logger.error('API timeout', {
      provider: 'Square',
      operation: 'payment creation',
      timeoutMs: 30000,
      orderId: order_id
    });

    // Send alert
    await sendAlert('Square API timeout', { orderId: order_id });
  }

  throw error;
}
```

---

## Provider-Specific Quirks

### OpenAI Realtime API

```typescript
// Quirk: whisper-1 deprecated for Realtime API
// Solution: Use gpt-4o-transcribe
const config = {
  input_audio_transcription: {
    model: 'gpt-4o-transcribe'  // Not whisper-1
  }
};

// Quirk: turn_detection: null breaks manual control
// Solution: Use server VAD with manual override
const config = {
  turn_detection: {
    type: 'server_vad',
    create_response: false,  // Manual control
    silence_duration_ms: 1500
  }
};
```

### Square Payments API

```typescript
// Quirk: Idempotency key max 45 characters
// Solution: Use short prefixes
const key = `ord-${orderId.slice(0, 8)}-${Date.now()}`;  // 22 chars

// Quirk: Amount in cents (not dollars)
const amountCents = Math.round(amountDollars * 100);

// Quirk: v43 SDK uses .paymentsApi (not .payments)
const result = await client.paymentsApi.create(request);
```

### Supabase

```typescript
// Quirk: RLS policies require explicit restaurant_id
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', restaurantId);  // Always required

// Quirk: Service key bypasses RLS
// Only use server-side, never expose to client
const supabaseAdmin = createClient(url, serviceKey);

// Quirk: Connection pooling required for high traffic
const supabase = createClient(url, anonKey, {
  db: {
    poolSize: 10
  }
});
```

---

## Testing Checklist

### API Integration Tests

```typescript
// Test timeout handling
test('API call times out after 30 seconds', async () => {
  const slowApi = () => new Promise(resolve => setTimeout(resolve, 60000));

  await expect(
    withTimeout(slowApi(), 30000, 'Slow API')
  ).rejects.toThrow('timed out after 30000ms');
});

// Test retry logic
test('Retries transient failures', async () => {
  let attempts = 0;
  const flaky = async () => {
    attempts++;
    if (attempts < 3) throw new Error('Transient failure');
    return 'success';
  };

  const result = await withRetry(flaky, 3);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});

// Test two-phase audit
test('Audit log created before API call', async () => {
  const auditId = await logIntent('payment', { orderId: '123' });

  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('id', auditId)
    .single();

  expect(data.status).toBe('initiated');
});
```

---

## Monitoring Queries

### Stale Audit Logs

```sql
-- Find audit logs not updated in 5 minutes
SELECT *
FROM payment_audit_logs
WHERE status = 'initiated'
AND created_at < NOW() - INTERVAL '5 minutes';
```

### High Error Rate

```sql
-- Count errors in last hour by provider
SELECT
  metadata->>'provider' as provider,
  COUNT(*) as error_count
FROM audit_logs
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider;
```

### High Timeout Rate

```sql
-- Count timeouts in last hour
SELECT
  metadata->>'operation' as operation,
  COUNT(*) as timeout_count
FROM audit_logs
WHERE error_detail LIKE '%timed out%'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY operation;
```

---

## INC-007: Voice Authentication Blocking Kiosk

### Overview
| Field | Value |
|-------|-------|
| **Date** | November 23, 2025 |
| **Duration** | 9 hours (6h speculation + 3h diagnostic) |
| **Severity** | P0 - Complete feature failure |
| **Cost** | $1,350 (9 hours × $150/hr) |
| **Provider** | Internal (Authentication Layer) |
| **Commits** | 7c1dd465 |

### Timeline

**November 22, 2025 - Evening:**
- Developer deploys menu fix to VoiceSessionConfig.ts (line 383-386)
- Fix adds explicit instruction for AI to use menu context
- Expected: Voice ordering works with menu knowledge
- Reality: Voice ordering completely non-functional

**November 23, 2025 - 8:00 AM:**
- User reports: "No change in testing, same results in incognito with hard refresh"
- Previous agent begins investigating cache/CDN/bundle issues

**8:00 AM - 2:00 PM (6 hours):**
- Agent investigates browser cache (not the issue)
- Agent checks CDN cache/propagation (not the issue)
- Agent verifies bundle deployment (correct hash deployed)
- Agent checks backend API health (healthy, returns 200)
- Agent checks OpenAI API accessibility (accessible)
- **Problem**: All speculation, no actual browser diagnostics
- **Evidence**: User kept saying "no change" but agent kept investigating cache

**2:00 PM:**
- New agent takes over, reviews handoff document
- Identifies: Previous agent made assumptions without verification
- Decision: Use MCP Puppeteer for actual browser diagnostics

**2:00 PM - 3:30 PM (1.5 hours):**
- Deploy 4 specialized subagents to investigate:
  - Backend API health (✅ healthy)
  - OpenAI Realtime API access (✅ accessible)
  - Code deployment verification (✅ correct bundle)
  - CORS configuration (✅ properly configured)
- All infrastructure healthy, but voice system never initializes

**3:30 PM - 4:30 PM (1 hour):**
- Use MCP Puppeteer to navigate to production kiosk
- Set up console logging and network monitoring
- Click through UI: "Start Voice Order" → "Tap to Start"
- Wait 20 seconds for initialization

**4:30 PM - CRITICAL FINDING:**
- **Zero network requests** to `/api/v1/realtime/session`
- **Zero network requests** to `api.openai.com/v1/realtime`
- **No JavaScript errors** (no exceptions thrown)
- **Console warning**: `❌ No authentication available for API request (no Supabase or localStorage session)`

**4:30 PM - 5:00 PM (30 minutes):**
- Analyze VoiceSessionConfig.ts authentication flow
- Line 86-88: Auth check blocks request if no token
- Kiosk mode is public-facing (no logged-in user)
- Backend already has `optionalAuth` middleware (allows anonymous)
- **Root Cause Identified**: Frontend requires auth, but kiosk doesn't have it

**5:00 PM - 5:30 PM (30 minutes):**
- Implement fix: Wrap auth in try/catch, allow anonymous for kiosk context
- Update logging to show auth mode (authenticated vs anonymous)
- Test: Menu fix was CORRECT, just never executed due to auth blocking
- Commit: 7c1dd465 (20 insertions, 5 deletions)

### Root Cause

Frontend authentication check blocked kiosk voice initialization. The kiosk is public-facing (no logged-in user), but VoiceSessionConfig required authentication for ALL contexts.

**Evidence:**
```typescript
// OLD CODE (lines 84-88) - Silent Failure
async fetchEphemeralToken(): Promise<void> {
  // Try optional auth first (for kiosk demos), fall back to required auth
  const authToken = this.authService.getOptionalAuthToken
    ? await this.authService.getOptionalAuthToken()
    : await this.authService.getAuthToken();

  // If both return null → authToken = null → warning logged → request NEVER SENT
  // ❌ No authentication available for API request
}
```

**NEW CODE (lines 84-102) - Explicit Kiosk Support:**
```typescript
async fetchEphemeralToken(): Promise<void> {
  // Try to get auth token, but allow proceeding without it for kiosk mode
  let authToken: string | null = null;

  try {
    authToken = this.authService.getOptionalAuthToken
      ? await this.authService.getOptionalAuthToken()
      : await this.authService.getAuthToken();
  } catch (error) {
    if (this.context === 'kiosk') {
      // Kiosk mode: allow anonymous access with just restaurant ID
      logger.info('[VoiceSessionConfig] Kiosk mode: proceeding without authentication');
      authToken = null;
    } else {
      // Server mode: authentication required
      logger.error('[VoiceSessionConfig] Authentication required for server context');
      throw new Error('Authentication required for voice ordering');
    }
  }

  // Only add Authorization header if we have a token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-restaurant-id': this.config.restaurantId,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
}
```

**Why It Was Hard to Debug:**
1. **Silent Failure** - No error thrown, just warning in console
2. **Zero Network Requests** - Failed before fetch() even called
3. **No User-Facing Error** - User saw "preparing..." indefinitely
4. **Speculation vs Verification** - Previous agent assumed cache issues without testing
5. **Menu Fix Was Correct** - Original fix worked, just never executed
6. **Backend Already Supported Anonymous** - Had `optionalAuth` middleware

### Impact

**Customer Experience:**
- Voice ordering completely non-functional on kiosk
- Button appeared to work (showed "preparing...") but never progressed
- No error messages shown to customer
- Confusing UX: "Is it broken? Should I wait longer?"

**Business Impact:**
- Voice ordering unavailable for public kiosk users
- Only worked for logged-in staff (server context)
- Lost revenue from voice ordering feature
- Developer time: 9 hours total (6h speculation + 3h diagnostic)
- Menu fix deployed but ineffective due to auth blocking

**Engineering Impact:**
- Previous agent spent 6 hours investigating wrong issues
- Demonstrates importance of diagnostic tools vs speculation
- "No change in testing" should have triggered browser diagnostics immediately

### Fix

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceSessionConfig.ts:84-120`

**Changes:**
1. Wrap auth token fetching in try/catch
2. Check `this.context` - if 'kiosk', allow null auth token
3. Only add Authorization header if token exists
4. Add logging to show auth mode (authenticated vs anonymous)

**Commit:** 7c1dd465

**Backend:** No changes needed - already had `optionalAuth` middleware supporting anonymous requests with just `x-restaurant-id` header.

### Prevention

**1. Diagnostic Tools Over Speculation**
```markdown
When user reports "no change in testing":
1. DO NOT assume cache/CDN issues
2. DO use MCP Puppeteer to observe actual browser behavior
3. DO check console AND network tab simultaneously
4. DO analyze what's NOT happening (zero requests = frontend issue)
```

**2. User-Facing Error Messages**
```typescript
// Add to VoiceControlWebRTC.tsx or similar
if (sessionState === 'preparing' && timeSinceStart > 10000) {
  showError('Unable to start voice ordering. Please check your connection or try logging in.');
}
```

**3. Test Coverage for Anonymous Access**
```typescript
// client/src/modules/voice/services/__tests__/VoiceSessionConfig.test.ts
describe('fetchEphemeralToken', () => {
  it('should allow anonymous access in kiosk context', async () => {
    const config = new VoiceSessionConfig({ context: 'kiosk', ... });
    // Mock auth service returning null
    await expect(config.fetchEphemeralToken()).resolves.not.toThrow();
  });

  it('should require auth in server context', async () => {
    const config = new VoiceSessionConfig({ context: 'server', ... });
    // Mock auth service returning null
    await expect(config.fetchEphemeralToken()).rejects.toThrow('Authentication required');
  });
});
```

**4. Monitoring for Silent Failures**
```typescript
// Add to analytics
if (voiceSessionState === 'preparing' && timeElapsed > 15000) {
  analytics.track('voice_session_stuck', {
    context: 'kiosk',
    has_auth: !!authToken,
    restaurant_id: restaurantId,
    time_elapsed: timeElapsed
  });
}
```

**5. Architecture Documentation**
- Document auth requirements in VOICE_ORDERING_EXPLAINED.md
- Create ADR-011: "Kiosk Voice Ordering Supports Anonymous Access"
- Update troubleshooting guide with "session never initializes" diagnostic

### Lessons Learned

**For AI Agents:**
1. **Use Diagnostic Tools First** - Don't speculate about cache/CDN
2. **Zero Network Requests = Frontend Issue** - Not backend or network
3. **Silent Failures Are Hardest** - No errors, just non-function
4. **Check What's NOT Happening** - Absence of expected behavior
5. **Verify Assumptions** - "Cache bust" doesn't fix frontend auth checks

**For Developers:**
1. **Auth Context Matters** - Kiosk (public) vs Server (authenticated)
2. **Silent Failures Need User Feedback** - Show error after 10s timeout
3. **Backend Was Correct** - Already had `optionalAuth` middleware
4. **Test Anonymous Flows** - E2E tests in incognito mode
5. **Menu Fix Was Valid** - Original work was correct, just blocked

**Meta-Lesson:**
Speculation costs 6 hours. Browser diagnostics cost 30 minutes. Use tools.

---

## Emergency Fixes

### Voice Ordering Broken

```bash
# Check OpenAI API key
curl https://july25.onrender.com/api/v1/realtime/health

# Expected: { "status": "healthy", "checks": { "api_key_valid": true } }
```

### Payment System Hanging

```bash
# Check Square API timeout
grep "timed out" server/logs/production.log

# Fix: Ensure withTimeout() wrapper applied
```

### Auth Loop

```bash
# Check httpClient state sync
# In client console:
console.log('React state:', restaurantId);
console.log('httpClient state:', httpClient.currentRestaurantId);

# Expected: Both should match
```

---

## Related Documentation

- [README.md](./README.md) - Executive summary
- [PATTERNS.md](./PATTERNS.md) - API patterns and best practices
- [INCIDENTS.md](./INCIDENTS.md) - Detailed incident reports
- [PREVENTION.md](./PREVENTION.md) - Monitoring and alerts
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - AI development guidelines

---

**Last Updated:** 2025-11-19
**Quick Reference Version:** 1.0
**Maintainer:** Technical Lead


