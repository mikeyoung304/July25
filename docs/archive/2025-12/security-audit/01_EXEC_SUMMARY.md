# EXECUTIVE SUMMARY: HOSTILE ENTERPRISE AUDIT

**Project**: Grow / Restaurant OS (rebuild-6.0)
**Audit Date**: 2025-12-28
**Auditor Role**: Principal Engineer / Hostile Auditor
**Audit Type**: Pre-Launch Security & Architecture Review

---

## VERDICT: GO-WITH-CONDITIONS

The system demonstrates **enterprise-grade multi-tenancy** and **thoughtful architectural decisions**, but has **critical security gaps** that must be addressed before real-world deployment with shared devices and payment processing.

### Launch Readiness Score: 67/100

| Category | Score | Status |
|----------|-------|--------|
| Architecture | 78/100 | Good |
| Security | 55/100 | **Needs Work** |
| Multi-Tenancy | 85/100 | Strong |
| Authentication | 52/100 | **Critical Issues** |
| Payments | 68/100 | Acceptable with fixes |
| Reliability | 72/100 | Good |
| Operability | 65/100 | Acceptable |
| Simplicity | 60/100 | Some over-engineering |

---

## TOP 10 EXISTENTIAL RISKS

### CRITICAL (Block Launch)

| # | Risk | Severity | Impact | Location |
|---|------|----------|--------|----------|
| 1 | **Demo User Authentication Bypass** | P0 | Attackers can bypass DB permission checks by forging JWT with `sub: 'demo:anything'` | `server/src/middleware/restaurantAccess.ts:43-50` |
| 2 | **localStorage Token Exposure** | P0 | XSS attack steals all session tokens (PIN/station/demo users) | `client/src/contexts/AuthContext.tsx:237-241` |
| 3 | **Refund Idempotency Missing** | P0 | Network retry creates duplicate refunds, financial loss | `server/src/routes/payments.routes.ts:656-670` |
| 4 | **Station Token Weak Default** | P0 | Hardcoded fallback `'station-secret-change-in-production'` | `server/src/services/auth/stationAuth.ts:11` |

### HIGH (Fix Before Production Traffic)

| # | Risk | Severity | Impact | Location |
|---|------|----------|--------|----------|
| 5 | **PIN Brute Force Timing Attack** | P1 | User enumeration via response timing, dictionary attacks | `server/src/services/auth/pinAuth.ts:205-216` |
| 6 | **Webhook Replay Vulnerability** | P1 | Stale webhooks can overwrite payment success with failure | `server/src/routes/payments.routes.ts:727-797` |
| 7 | **STRICT_AUTH Not Mandatory** | P1 | Tokens without restaurant_id accepted if env var not set | `server/src/middleware/auth.ts:79-87` |
| 8 | **In-Memory Rate Limiting** | P1 | Server restart clears all rate limit counters | `server/src/middleware/rateLimiter.ts`, `MenuEmbeddingService` |

### MEDIUM (Fix Before Scale)

| # | Risk | Severity | Impact | Location |
|---|------|----------|--------|----------|
| 9 | **Restaurant Header Fallback** | P2 | Unauthenticated users can select any restaurant via header | `server/src/middleware/auth.ts:150-161` |
| 10 | **PIN Attempt Race Condition** | P2 | Non-atomic counter update allows concurrent bypasses | `server/src/services/auth/pinAuth.ts:303-319` |

---

## DECISIONS THAT MUST CHANGE BEFORE LAUNCH

### 1. Demo User Bypass Must Be Removed or Hardened
**Current**: JWT with `sub: 'demo:...'` skips all database permission checks
**Required**: Validate demo users against a whitelist in database, or remove demo user bypass entirely in production

### 2. Migrate from localStorage to HTTPOnly Cookies
**Current**: Tokens stored in localStorage vulnerable to XSS
**Required**: Use HTTPOnly secure cookies for PIN/station tokens, or implement token encryption

### 3. Enable STRICT_AUTH by Default
**Current**: Optional environment variable, easy to forget
**Required**: Make STRICT_AUTH the default, require explicit opt-out for development

### 4. Add Refund Idempotency Key to Stripe API Calls
**Current**: Refund creation has no idempotency key
**Required**: Pass `idempotencyKey` to `stripe.refunds.create()`

### 5. Implement Webhook Timestamp Verification
**Current**: Webhook handler accepts events of any age
**Required**: Reject webhooks older than 5 minutes using existing `webhookAuthWithTimestamp`

---

## THE FIRST THING THAT WILL BREAK IN PRODUCTION

### Prediction: PIN Authentication Lockout Chaos

**What Fails First**: Restaurant staff will experience unexpected account lockouts during busy shifts.

**Why It Fails**:
1. Rate limiting is split between Express middleware (3 attempts/5min) and database service (5 attempts/account)
2. Multiple staff on shared devices trigger IP-based rate limiting
3. Failed attempts from device A lock out device B using same PIN user
4. Staff rotate PINs between devices → triggers cross-device lockout
5. In-memory rate limiter resets on server restart (Render deploys) → surge of legitimate requests hits lockout

**How to Detect Early**:
- Monitor `auth_logs` table for `failed_pin_attempt` events
- Alert on >5 failures/restaurant/hour
- Track "locked_until" entries in `user_pins` table
- Monitor for spike in PIN-related support tickets

**How to Reduce Blast Radius**:
- Add device fingerprinting alongside IP-based rate limiting
- Implement "unlock" capability for managers
- Consider Redis-based rate limiting for distributed state
- Add grace period after server restart before enforcing rate limits
- Create runbook for manual unlock via database

---

## ARCHITECTURAL STRENGTHS

The system demonstrates several enterprise-grade patterns that should be preserved:

1. **Multi-Tenancy at Three Layers**
   - Database: RLS policies on all 13 tenant-scoped tables
   - API: `validateRestaurantAccess` middleware on protected routes
   - Service: Explicit `.eq('restaurant_id', restaurantId)` in all queries

2. **Order State Machine Enforcement (ADR-015)**
   - Server-side validation in `OrderStateMachine.canTransition()`
   - Prevents invalid transitions (e.g., completed → pending)
   - Hooks for side effects (notifications, refunds)

3. **Payment Audit Compliance**
   - Two-phase logging (before charge, after completion)
   - Fail-fast on audit failures (ADR-009)
   - Immutable audit table with RLS

4. **Idempotency Keys for Payments**
   - Deterministic format with nonce
   - Server-generated (never trusts client)
   - Stored in Stripe metadata for reconciliation

5. **Type Safety Across Boundaries**
   - Shared types package (`@rebuild/shared`)
   - Snake_case convention prevents transform bugs (ADR-001)
   - Zod schemas for runtime validation

---

## RECOMMENDED LAUNCH SEQUENCE

### Phase 1: Critical Fixes (1-2 days)
1. Disable demo user bypass OR validate against whitelist
2. Add refund idempotency key to Stripe calls
3. Enable STRICT_AUTH in production
4. Rotate STATION_TOKEN_SECRET, remove weak default

### Phase 2: Security Hardening (3-5 days)
1. Implement constant-time PIN comparison
2. Add webhook timestamp verification
3. Migrate sensitive tokens to HTTPOnly cookies
4. Implement PIN rate limiting with device fingerprinting

### Phase 3: Operational Readiness (1 week)
1. Deploy Redis for distributed rate limiting
2. Create runbooks for common failure scenarios
3. Set up monitoring for authentication failures
4. Conduct penetration testing on auth endpoints

### Phase 4: Soft Launch
1. Deploy to single restaurant with monitoring
2. Observe authentication patterns for 1 week
3. Fix any discovered issues
4. Gradually expand to additional restaurants

---

## CONCLUSION

The rebuild-6.0 codebase represents **solid foundational engineering** with thoughtful attention to multi-tenancy, state management, and payment compliance. However, the **dual authentication pattern** (ADR-006) and **shared device support** introduce security complexity that hasn't been fully hardened.

The system is **not ready for unsupervised production use** with real customer payments and shared devices. With the critical fixes identified above, it can be made production-ready within **1-2 weeks** of focused security work.

**Key Insight**: The architecture is sound. The gaps are in edge cases and attack surface reduction, not fundamental design flaws. This is fixable.

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
**Next Review**: After Phase 2 completion
