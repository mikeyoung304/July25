# REMEDIATION PLAN

**Audit Date**: 2025-12-28
**System**: Grow / Restaurant OS (rebuild-6.0)
**Target**: Production-ready with real payments

---

## Remediation Priority Matrix

```
                        IMPACT
                   Low    Med    High   Critical
              ┌────────┬────────┬────────┬────────┐
    Low       │ P3     │ P3     │ P2     │ P1     │
              ├────────┼────────┼────────┼────────┤
E   Med       │ P3     │ P2     │ P1     │ P0     │
F   ───       ├────────┼────────┼────────┼────────┤
F   High      │ P2     │ P1     │ P0     │ P0     │
O             ├────────┼────────┼────────┼────────┤
R   Very High │ P1     │ P0     │ P0     │ P0     │
T             └────────┴────────┴────────┴────────┘

P0 = Block launch, fix immediately
P1 = Fix before production traffic
P2 = Fix before scale
P3 = Nice to have
```

---

## Phase 0: Launch Blockers (1-2 Days)

### Must Complete Before Any Production Use

| # | Issue | Effort | File(s) | Fix |
|---|-------|--------|---------|-----|
| 1 | Demo user bypass | 2h | `server/src/middleware/restaurantAccess.ts:43-50` | Remove bypass OR validate against whitelist table |
| 2 | Weak station secret | 30m | `server/src/services/auth/stationAuth.ts:11` | Remove fallback, require env var |
| 3 | Enable STRICT_AUTH | 30m | `server/src/middleware/auth.ts:79-87` | Default to true, require opt-out |
| 4 | Refund idempotency | 2h | `server/src/routes/payments.routes.ts:656-670` | Add idempotency key to Stripe refund call |

**Total Effort**: ~5 hours
**Risk if Skipped**: Full system compromise, financial loss

### Detailed Fixes

#### Fix 1: Demo User Bypass

**Current Code** (`restaurantAccess.ts:43-50`):
```typescript
if (sub.startsWith('demo:')) {
  return true; // VULNERABLE: Skips all checks
}
```

**Option A: Remove Entirely (Recommended for Production)**
```typescript
// Simply delete the demo bypass block
// Demo functionality disabled in production
```

**Option B: Validate Against Whitelist**
```typescript
if (sub.startsWith('demo:')) {
  // Validate against demo_users table
  const demoUser = await supabase
    .from('demo_users')
    .select('id')
    .eq('demo_id', sub)
    .eq('is_active', true)
    .single();

  if (!demoUser.data) {
    logger.warn('Invalid demo user attempt', { sub });
    return false;
  }
  // Log demo access
  logger.info('Demo user access granted', { sub, restaurantId });
  return true;
}
```

#### Fix 2: Station Secret

**Current Code** (`stationAuth.ts:11`):
```typescript
const secret = process.env.STATION_TOKEN_SECRET || 'station-secret-change-in-production';
```

**Fixed Code**:
```typescript
const secret = process.env.STATION_TOKEN_SECRET;
if (!secret) {
  throw new Error('STATION_TOKEN_SECRET environment variable is required');
}
```

#### Fix 3: STRICT_AUTH Default

**Current Code** (`auth.ts:79-87`):
```typescript
const strictAuth = process.env.STRICT_AUTH === 'true';
if (!strictAuth && !restaurantId) {
  // Allows fallback to header
}
```

**Fixed Code**:
```typescript
// Default to strict, require explicit opt-out
const strictAuth = process.env.STRICT_AUTH !== 'false';
if (!strictAuth) {
  logger.warn('STRICT_AUTH disabled - development mode only');
}
```

#### Fix 4: Refund Idempotency

**Current Code** (`payments.routes.ts:~660`):
```typescript
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount
});
```

**Fixed Code**:
```typescript
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
```

---

## Phase 1: Security Hardening (3-5 Days)

### Fix Before Accepting Real Payments

| # | Issue | Effort | File(s) | Fix |
|---|-------|--------|---------|-----|
| 5 | localStorage tokens | 8h | `client/src/contexts/AuthContext.tsx`, server auth | Migrate to HTTPOnly cookies |
| 6 | PIN timing attack | 4h | `server/src/services/auth/pinAuth.ts:205-216` | Constant-time comparison |
| 7 | Webhook timestamp | 2h | `server/src/routes/payments.routes.ts:727-797` | Verify timestamp < 5 min |
| 8 | PIN rate limit race | 2h | `server/src/services/auth/pinAuth.ts:303-319` | Atomic increment with transaction |

**Total Effort**: ~16 hours
**Risk if Skipped**: Token theft, user enumeration, duplicate charges

### Detailed Fixes

#### Fix 5: HTTPOnly Cookies for Tokens

This is a larger change requiring both client and server modifications.

**Server Changes**:
```typescript
// New cookie-based token endpoint
router.post('/auth/pin-login', async (req, res) => {
  // ... existing PIN validation ...

  // Set HTTPOnly cookie instead of returning token
  res.cookie('pin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });

  res.json({ success: true, user: { id, role, restaurantId } });
});
```

**Client Changes**:
```typescript
// httpClient no longer reads from localStorage
// Browser automatically sends cookies
// Modify AuthContext to track auth state without token
```

#### Fix 6: Constant-Time PIN Comparison

**Current Code** (`pinAuth.ts:205-216`):
```typescript
const isValid = await bcrypt.compare(pin, user.pin_hash);
// Timing difference reveals if user exists
```

**Fixed Code**:
```typescript
import { timingSafeEqual } from 'crypto';

// Always perform comparison even if user doesn't exist
const dummyHash = '$2b$10$dummyhashfortimingnormalization';
const hashToCompare = user?.pin_hash || dummyHash;

const isValid = await bcrypt.compare(pin, hashToCompare);

// Only return true if user exists AND PIN matches
if (!user || !isValid) {
  return { success: false, reason: 'Invalid PIN' };
}
```

#### Fix 7: Webhook Timestamp Verification

**Current Code** (`payments.routes.ts:727-797`):
```typescript
// No timestamp check
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
// Processes events of any age
```

**Fixed Code**:
```typescript
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

// Reject webhooks older than 5 minutes
const eventTime = event.created;
const now = Math.floor(Date.now() / 1000);
const MAX_AGE_SECONDS = 300; // 5 minutes

if (now - eventTime > MAX_AGE_SECONDS) {
  logger.warn('Webhook too old, rejecting', {
    eventId: event.id,
    age: now - eventTime
  });
  return res.status(400).json({ error: 'Webhook expired' });
}
```

#### Fix 8: Atomic PIN Attempt Counter

**Current Code** (`pinAuth.ts:303-319`):
```typescript
// Non-atomic: Read, increment, write
const attempts = await getAttempts(userId);
await setAttempts(userId, attempts + 1);
// Race: Two requests could both read attempts=4, both write 5
```

**Fixed Code**:
```typescript
// Use database transaction with row-level locking
const result = await supabase.rpc('increment_pin_attempts', {
  p_user_id: userId,
  p_max_attempts: 5,
  p_lockout_minutes: 15
});

// RPC function:
// CREATE FUNCTION increment_pin_attempts(p_user_id UUID, p_max_attempts INT, p_lockout_minutes INT)
// RETURNS TABLE(is_locked BOOLEAN, attempts INT)
// LANGUAGE plpgsql AS $$
// BEGIN
//   RETURN QUERY
//   UPDATE user_pins
//   SET failed_attempts = failed_attempts + 1,
//       locked_until = CASE
//         WHEN failed_attempts + 1 >= p_max_attempts
//         THEN NOW() + (p_lockout_minutes || ' minutes')::INTERVAL
//         ELSE locked_until
//       END
//   WHERE user_id = p_user_id
//   RETURNING locked_until IS NOT NULL AND locked_until > NOW(), failed_attempts;
// END;
// $$;
```

---

## Phase 2: Reliability (1 Week)

### Fix Before Scaling Beyond Soft Launch

| # | Issue | Effort | Fix |
|---|-------|--------|-----|
| 9 | In-memory rate limiting | 8h | Migrate to Redis |
| 10 | Unbounded embedding cache | 4h | Add LRU with max size |
| 11 | Missing query timeouts | 2h | Add timeouts to DB calls |
| 12 | No correlation IDs | 4h | Add request tracing |
| 13 | Missing health checks | 2h | Add /health endpoint |

**Total Effort**: ~20 hours
**Risk if Skipped**: Service instability at scale

---

## Phase 3: Observability (1 Week)

### Fix Before Heavy Production Use

| # | Issue | Effort | Fix |
|---|-------|--------|-----|
| 14 | No metrics | 8h | Add Prometheus metrics |
| 15 | No alerting | 4h | Configure Render alerts |
| 16 | Missing runbooks | 8h | Document common scenarios |
| 17 | Silent failures | 4h | Add logging for rate limits, WS |

**Total Effort**: ~24 hours
**Risk if Skipped**: Slow incident response

---

## Phase 4: Code Quality (Ongoing)

### Nice to Have, Lower Priority

| # | Issue | Effort | Fix |
|---|-------|--------|-----|
| 18 | Dual RBAC sources | 4h | Consolidate to database |
| 19 | Large AuthContext | 4h | Extract to hooks |
| 20 | Test coverage gaps | 16h+ | Add integration tests |
| 21 | Split auth middleware | 4h | Separate by auth type |

**Total Effort**: ~28+ hours
**Risk if Skipped**: Maintainability friction

---

## Things to Leave Alone

### Intentionally Not Fixing

| Item | Reason |
|------|--------|
| Snake case convention | Working well, don't change |
| Order state machine | Well-designed, maintainable |
| Two-phase audit logging | Correct for compliance |
| RLS policies | Defense in depth, keep |
| Shared types package | Good architecture |
| Server-side total calculation | Security correct |

---

## Implementation Checklist

### Phase 0 Checklist (Launch Blockers)

- [ ] Remove or whitelist demo user bypass
- [ ] Remove weak station secret fallback
- [ ] Enable STRICT_AUTH by default
- [ ] Add refund idempotency key
- [ ] Rotate all production secrets
- [ ] Verify all environment variables set

### Phase 1 Checklist (Security)

- [ ] Implement HTTPOnly cookie auth
- [ ] Add constant-time PIN comparison
- [ ] Add webhook timestamp verification
- [ ] Implement atomic PIN attempt counting
- [ ] Add security logging for all auth paths
- [ ] Conduct penetration testing

### Phase 2 Checklist (Reliability)

- [ ] Set up Redis for rate limiting
- [ ] Add cache size limits
- [ ] Add database query timeouts
- [ ] Implement correlation IDs
- [ ] Add health check endpoint
- [ ] Add graceful shutdown

### Phase 3 Checklist (Observability)

- [ ] Add Prometheus metrics
- [ ] Configure alerting rules
- [ ] Write runbooks for common issues
- [ ] Add logging for silent failures
- [ ] Create operations dashboard
- [ ] Conduct incident simulation

---

## Verification Procedures

### After Phase 0

1. **Demo Bypass Test**:
   ```bash
   # Should return 401/403
   curl -H "Authorization: Bearer fake.demo.jwt" /api/orders
   ```

2. **Station Secret Test**:
   ```bash
   # Should fail without STATION_TOKEN_SECRET set
   unset STATION_TOKEN_SECRET && npm start
   # Expected: Error on startup
   ```

3. **STRICT_AUTH Test**:
   ```bash
   # Should reject requests with header fallback
   curl -H "X-Restaurant-ID: test" /api/protected
   # Expected: 401 (no JWT)
   ```

4. **Refund Idempotency Test**:
   ```bash
   # Same refund request twice should not create duplicate
   # Check Stripe dashboard for single refund
   ```

### After Phase 1

1. **Token Not in localStorage**:
   ```javascript
   // In browser console
   localStorage.getItem('token') // Should be null
   document.cookie // Should contain pin_token (HTTPOnly, won't show)
   ```

2. **PIN Timing Test**:
   ```bash
   # Time should be consistent regardless of user existence
   time curl -X POST /api/auth/pin-login -d '{"pin":"1234","restaurantId":"valid"}'
   time curl -X POST /api/auth/pin-login -d '{"pin":"1234","restaurantId":"invalid"}'
   # Times should be within 50ms
   ```

3. **Webhook Age Test**:
   ```bash
   # Replay old webhook
   # Should return 400 "Webhook expired"
   ```

---

## Risk Acceptance

### If Phase 0 is Skipped

**Unacceptable**: System is vulnerable to trivial attacks. Do not launch.

### If Phase 1 is Skipped

**High Risk**: Accept only for limited soft launch with manual monitoring. Requires:
- Daily security log review
- Immediate incident response capability
- User notification plan for breach

### If Phase 2 is Skipped

**Medium Risk**: Accept for soft launch with <50 restaurants. Requires:
- Manual restart capability
- Low traffic expectations
- Quick rollback plan

### If Phase 3 is Skipped

**Low Risk**: Accept with increased operational burden. Requires:
- Dedicated operator monitoring
- Manual log searching capability
- Documented escalation path

---

## Conclusion

The remediation plan prioritizes security over features. The Phase 0 items are non-negotiable for any production use. Phases 1-3 can be staged based on launch timeline and traffic expectations.

**Minimum Viable Security**: Complete Phase 0 + Phase 1 items 5-7
**Recommended**: Complete Phase 0 + Phase 1 fully
**Production Ready**: Complete Phases 0-3

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
