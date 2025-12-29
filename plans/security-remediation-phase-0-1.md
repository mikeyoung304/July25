# Security Remediation: Phase 0-1 Implementation Plan

**Type**: Security / Bug Fix
**Priority**: P0 - Launch Blocker
**Estimated Effort**: ~21 hours total
**Based On**: Hostile Enterprise Audit (2025-12-28)

---

## Overview

This plan addresses the **9 critical (P0) and 4 high-priority (P1)** security vulnerabilities identified in the hostile enterprise audit. These must be fixed before any production use with real payments.

## Problem Statement

The audit identified critical authentication vulnerabilities that allow:
1. **Complete auth bypass** via forged demo user JWTs
2. **Token theft** via XSS attacks on localStorage
3. **Financial loss** via duplicate refunds
4. **Brute force attacks** via weak secrets and timing attacks

**Current Security Score**: 55/100 (Needs Work)
**Target Security Score**: 75/100 (Good)

---

## Phase 0: Launch Blockers (~5 hours)

### Task 0.1: Remove Demo User Bypass

**File**: `server/src/middleware/restaurantAccess.ts:43-50`
**Effort**: 2 hours

**Current Code (VULNERABLE)**:
```typescript
if (sub.startsWith('demo:')) {
  return true; // Skips ALL permission checks
}
```

**Implementation Options**:

**Option A: Remove Entirely (Recommended for Production)**
```typescript
// Simply delete the demo bypass block
// Demo functionality disabled in production
```

**Option B: Validate Against Whitelist Table**
```typescript
if (sub.startsWith('demo:')) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Demo user bypass attempted in production', { sub });
    return false;
  }

  // Log demo access for audit trail
  logger.info('Demo user access granted', { sub, restaurantId });
  return true;
}
```

**Acceptance Criteria**:
- [ ] Demo user bypass removed or gated behind NODE_ENV check
- [ ] All demo access logged with full context
- [ ] Unit test confirms demo:* tokens rejected in production mode
- [ ] Integration test verifies API returns 403 for demo tokens

---

### Task 0.2: Remove Weak Station Secret Fallback

**File**: `server/src/services/auth/stationAuth.ts:11`
**Effort**: 30 minutes

**Current Code (VULNERABLE)**:
```typescript
const secret = process.env.STATION_TOKEN_SECRET || 'station-secret-change-in-production';
```

**Fixed Code**:
```typescript
const secret = process.env.STATION_TOKEN_SECRET;
if (!secret) {
  logger.error('CRITICAL: STATION_TOKEN_SECRET environment variable not set');
  throw new Error('STATION_TOKEN_SECRET environment variable is required');
}
```

**Acceptance Criteria**:
- [ ] Server fails to start without STATION_TOKEN_SECRET
- [ ] Error message clearly identifies missing variable
- [ ] Render environment has STATION_TOKEN_SECRET set
- [ ] Documentation updated with required env vars

---

### Task 0.3: Enable STRICT_AUTH by Default

**File**: `server/src/middleware/auth.ts:79-87`
**Effort**: 30 minutes

**Current Code**:
```typescript
const strictAuth = process.env.STRICT_AUTH === 'true';
```

**Fixed Code**:
```typescript
// Default to strict, require explicit opt-out for development
const strictAuth = process.env.STRICT_AUTH !== 'false';
if (!strictAuth) {
  logger.warn('STRICT_AUTH disabled - development mode only');
}
```

**Acceptance Criteria**:
- [ ] STRICT_AUTH defaults to true (no env var = strict)
- [ ] Warning logged when disabled
- [ ] Tests pass with strict auth enabled
- [ ] Restaurant header fallback blocked in production

---

### Task 0.4: Add Refund Idempotency Key

**File**: `server/src/routes/payments.routes.ts:656-670`
**Effort**: 2 hours

**Current Code (VULNERABLE)**:
```typescript
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount
});
```

**Fixed Code**:
```typescript
import { generateIdempotencyKey } from '../services/payment.service';

const idempotencyKey = generateIdempotencyKey('refund', restaurantId, paymentIntentId);

const refund = await stripe.refunds.create(
  {
    payment_intent: paymentIntentId,
    amount: refundAmount
  },
  {
    idempotencyKey
  }
);

logger.info('Refund created', {
  paymentIntentId,
  amount: refundAmount,
  idempotencyKey,
  refundId: refund.id
});
```

**Acceptance Criteria**:
- [ ] All refund calls include idempotency key
- [ ] Idempotency key uses existing `generateIdempotencyKey()` function
- [ ] Duplicate refund requests return same refund (not create new)
- [ ] Unit test verifies idempotency key passed to Stripe

---

## Phase 1: Security Hardening (~16 hours)

### Task 1.1: Migrate Sensitive Tokens to HTTPOnly Cookies

**Files**:
- `server/src/routes/auth.routes.ts`
- `server/src/middleware/auth.ts`
- `client/src/contexts/AuthContext.tsx`
- `client/src/services/http/httpClient.ts`

**Effort**: 8 hours

**Implementation Plan**:

#### Server Changes

**auth.routes.ts - PIN Login Endpoint**:
```typescript
router.post('/pin-login', async (req, res) => {
  // ... existing PIN validation ...

  // Set HTTPOnly cookie instead of returning token in body
  res.cookie('pin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/'
  });

  // Return user info without token
  res.json({
    success: true,
    user: { id: user.id, role: user.role, restaurantId }
  });
});
```

**auth.ts - Middleware Token Extraction**:
```typescript
// Check cookies first, then Authorization header
const pinToken = req.cookies?.pin_token;
const authHeader = req.headers.authorization;

if (pinToken) {
  // Validate PIN token from HTTPOnly cookie
  const decoded = jwt.verify(pinToken, PIN_SECRET);
  req.user = decoded;
} else if (authHeader?.startsWith('Bearer ')) {
  // Fallback to header for Supabase tokens
  const token = authHeader.substring(7);
  // ... existing validation ...
}
```

#### Client Changes

**httpClient.ts**:
```typescript
// Remove localStorage token reading for PIN auth
// Browser automatically sends cookies with credentials: 'include'

async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include', // CRITICAL: Send cookies
    headers: {
      ...options.headers,
      // Only add Authorization for Supabase tokens (not PIN)
      ...(supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {})
    }
  });
  // ...
}
```

**AuthContext.tsx**:
```typescript
// Remove localStorage.setItem('token', ...) for PIN tokens
// Keep localStorage only for non-sensitive data (preferences, theme)

const loginWithPin = async (pin: string) => {
  const response = await httpClient.post('/api/auth/pin-login', {
    pin,
    restaurantId
  });

  // Cookie set automatically by server
  // Just update React state
  setUser(response.user);
  setIsAuthenticated(true);
};

const logout = async () => {
  // Clear cookie via server endpoint
  await httpClient.post('/api/auth/logout');
  setUser(null);
  setIsAuthenticated(false);
};
```

**Acceptance Criteria**:
- [ ] PIN tokens stored in HTTPOnly cookies
- [ ] Station tokens stored in HTTPOnly cookies
- [ ] localStorage no longer contains sensitive tokens
- [ ] Cookies have secure, sameSite, httpOnly flags
- [ ] CORS configured with credentials: true
- [ ] Logout clears cookies server-side
- [ ] E2E tests pass with cookie-based auth

---

### Task 1.2: Implement Constant-Time PIN Comparison

**File**: `server/src/services/auth/pinAuth.ts:205-216`
**Effort**: 2 hours

**Note**: Research confirmed bcryptjs already uses constant-time comparison internally. This task focuses on preventing user enumeration via timing differences in the overall flow.

**Current Issue**: Different code paths for existing vs non-existing users can leak timing information.

**Implementation**:
```typescript
import { timingSafeEqual } from 'crypto';

async function verifyPinLogin(
  pin: string,
  restaurantId: string
): Promise<AuthResult> {
  const startTime = process.hrtime.bigint();

  // Always perform lookup (even if we know it will fail)
  const user = await findUserByRestaurant(restaurantId);

  // Use dummy hash if user doesn't exist (prevent timing leak)
  const hashToCompare = user?.pin_hash || DUMMY_HASH;

  // bcrypt.compare is already constant-time
  const isValid = await bcrypt.compare(pin + PIN_PEPPER, hashToCompare);

  // Ensure minimum execution time to prevent timing attacks
  const elapsed = process.hrtime.bigint() - startTime;
  const minTimeNs = BigInt(100_000_000); // 100ms minimum

  if (elapsed < minTimeNs) {
    await sleep(Number(minTimeNs - elapsed) / 1_000_000);
  }

  // Only return success if user exists AND PIN matches
  if (!user || !isValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  return { success: true, user };
}

const DUMMY_HASH = '$2b$10$dummyhashforuserenumerationprevention';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Acceptance Criteria**:
- [ ] PIN verification takes consistent time regardless of user existence
- [ ] Generic error message "Invalid credentials" for all failures
- [ ] Minimum 100ms execution time to mask timing differences
- [ ] Unit test confirms timing consistency

---

### Task 1.3: Add Webhook Timestamp Verification

**File**: `server/src/routes/payments.routes.ts:727-797`
**Effort**: 2 hours

**Current Issue**: Webhook handler accepts events of any age, enabling replay attacks.

**Implementation**:
```typescript
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Stripe's constructEvent validates signature AND checks timestamp
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logger.warn('Webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Additional timestamp check (Stripe default is 5 minutes)
  const eventAge = Date.now() / 1000 - event.created;
  const MAX_AGE_SECONDS = 300; // 5 minutes

  if (eventAge > MAX_AGE_SECONDS) {
    logger.warn('Webhook timestamp too old', {
      eventId: event.id,
      age: eventAge,
      maxAge: MAX_AGE_SECONDS
    });
    return res.status(400).json({ error: 'Webhook expired' });
  }

  // Log webhook receipt for audit
  logger.info('Webhook received', {
    eventId: event.id,
    type: event.type,
    age: eventAge
  });

  // Process event...
});
```

**Acceptance Criteria**:
- [ ] Webhooks older than 5 minutes rejected
- [ ] Rejection logged with event ID and age
- [ ] Replayed webhooks return 400 error
- [ ] Integration test with old timestamp webhook

---

### Task 1.4: Implement Atomic PIN Attempt Counter

**File**: `server/src/services/auth/pinAuth.ts:303-319`
**Effort**: 4 hours

**Current Issue**: Non-atomic read-increment-write allows race condition bypass.

**Implementation**:

**Database Migration** (`supabase/migrations/XXXX_atomic_pin_attempts.sql`):
```sql
-- Create atomic increment function
CREATE OR REPLACE FUNCTION increment_pin_attempts(
  p_user_id UUID,
  p_max_attempts INTEGER DEFAULT 5,
  p_lockout_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  attempt_count INTEGER,
  is_locked BOOLEAN,
  locked_until TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- ATOMIC: Single transaction, no race conditions
  RETURN QUERY
  UPDATE user_pins
  SET
    failed_attempts = failed_attempts + 1,
    locked_until = CASE
      WHEN (failed_attempts + 1) >= p_max_attempts
      THEN NOW() + (p_lockout_minutes || ' minutes')::INTERVAL
      ELSE locked_until
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING
    failed_attempts,
    locked_until IS NOT NULL AND locked_until > NOW(),
    locked_until;
END;
$$ LANGUAGE plpgsql;

-- Function to reset attempts on successful login
CREATE OR REPLACE FUNCTION reset_pin_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_pins
  SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

**Service Code** (`pinAuth.ts`):
```typescript
async function recordFailedAttempt(userId: string): Promise<{
  attempts: number;
  isLocked: boolean;
  lockedUntil: Date | null;
}> {
  const { data, error } = await supabase.rpc('increment_pin_attempts', {
    p_user_id: userId,
    p_max_attempts: 5,
    p_lockout_minutes: 15
  });

  if (error) {
    logger.error('Failed to record PIN attempt', { userId, error });
    throw new Error('Authentication service error');
  }

  if (data.is_locked) {
    logger.warn('User locked out after failed PIN attempts', {
      userId,
      attempts: data.attempt_count,
      lockedUntil: data.locked_until
    });
  }

  return {
    attempts: data.attempt_count,
    isLocked: data.is_locked,
    lockedUntil: data.locked_until ? new Date(data.locked_until) : null
  };
}

async function resetAttempts(userId: string): Promise<void> {
  await supabase.rpc('reset_pin_attempts', { p_user_id: userId });
}
```

**Acceptance Criteria**:
- [ ] PIN attempts tracked atomically in database
- [ ] Concurrent requests cannot bypass attempt limits
- [ ] Lockout duration is 15 minutes after 5 failures
- [ ] Successful login resets attempt counter
- [ ] Unit test with concurrent requests confirms atomicity

---

## Technical Considerations

### Architecture Impact
- HTTPOnly cookie migration requires server and client changes
- Database migration for atomic counters
- No breaking changes to API contract (responses same, auth method changes)

### Security Implications
- All changes reduce attack surface
- No new vulnerabilities introduced
- Defense in depth maintained with RLS + middleware + service checks

### Testing Requirements
- Unit tests for each security fix
- Integration tests for auth flows
- E2E tests for cookie-based authentication
- Negative tests for attack scenarios (forged tokens, replay attacks)

### Rollback Plan
- Feature flags for HTTPOnly cookie migration
- Database migration can be rolled back
- Environment variables control strict auth behavior

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Security Score | 55/100 | 75/100 | Audit re-run |
| P0 Issues | 9 | 0 | Risk register |
| P1 Issues | 15 | 5 | Risk register |
| Auth Bypass Vectors | 4 | 1 | Code review |
| Timing Attack Risk | High | Low | Security test |

---

## Dependencies & Prerequisites

- [ ] STRIPE_WEBHOOK_SECRET set in Render
- [ ] STATION_TOKEN_SECRET set in Render (new, strong secret)
- [ ] Database migration access for atomic counter function
- [ ] cookie-parser middleware installed (`npm install cookie-parser`)
- [ ] CORS configuration allows credentials

---

## References

### Internal
- `audit_output/01_EXEC_SUMMARY.md` - Top 10 risks
- `audit_output/02_RISK_REGISTER.md` - Full finding details
- `audit_output/09_REMEDIATION_PLAN.md` - Phased approach

### External
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [bcrypt Timing Safe Comparison](https://www.npmjs.com/package/bcryptjs)

---

## Verification Checklist

After implementation, verify each fix:

```bash
# 0.1 Demo bypass removed
curl -H "Authorization: Bearer fake.demo.jwt" /api/orders
# Expected: 401/403

# 0.2 Station secret required
unset STATION_TOKEN_SECRET && npm start
# Expected: Error on startup

# 0.3 STRICT_AUTH default
curl -H "X-Restaurant-ID: test" /api/protected
# Expected: 401 (no JWT)

# 0.4 Refund idempotency
# Same refund request twice should return same refund
# Check Stripe dashboard for single refund

# 1.1 HTTPOnly cookies
localStorage.getItem('token') // Should be null
document.cookie // pin_token should NOT appear (HTTPOnly)

# 1.2 Timing consistency
# Time requests for valid/invalid users - should be within 50ms

# 1.3 Webhook timestamp
# Replay old webhook - should return 400

# 1.4 Atomic counter
# Concurrent PIN attempts should be counted correctly
```

---

**Plan Created**: 2025-12-28
**Based On**: Hostile Enterprise Audit
**Target Completion**: Phase 0 in 1-2 days, Phase 1 in 3-5 days
