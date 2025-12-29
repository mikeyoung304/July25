# RISK REGISTER: HOSTILE ENTERPRISE AUDIT

**Project**: Grow / Restaurant OS (rebuild-6.0)
**Audit Date**: 2025-12-28
**Total Findings**: 58

---

## SEVERITY LEGEND

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **P0** | Critical - Blocks launch, immediate exploitation possible | 24 hours |
| **P1** | High - Significant risk, must fix before production traffic | 1 week |
| **P2** | Medium - Should fix before scaling | 2-4 weeks |
| **P3** | Low - Technical debt, fix when convenient | Backlog |

---

## P0: CRITICAL (9 Findings)

### P0-001: Demo User Authentication Bypass
- **Impact**: Complete bypass of database permission checks
- **Likelihood**: High - Trivial to exploit with JWT knowledge
- **Evidence**: `server/src/middleware/restaurantAccess.ts:43-50`
- **Cause**: JWT with `sub: 'demo:...'` pattern skips DB validation
- **Justification Fails**: Demo mode intended for testing, but no production toggle
- **Recommendation**: REMOVE - Validate demo users against DB whitelist or disable in production

### P0-002: localStorage Token Storage (XSS Exposure)
- **Impact**: Token theft enables full account impersonation
- **Likelihood**: Medium - Requires XSS vulnerability
- **Evidence**: `client/src/contexts/AuthContext.tsx:237-241`
- **Cause**: Tokens stored in plaintext localStorage, accessible via XSS
- **Justification Fails**: Convenience for PIN/station auth doesn't justify security risk
- **Recommendation**: REPLACE - Use HTTPOnly cookies for sensitive tokens

### P0-003: Refund Idempotency Missing
- **Impact**: Duplicate refunds on network retry, direct financial loss
- **Likelihood**: Medium - Network failures during refunds
- **Evidence**: `server/src/routes/payments.routes.ts:656-670`
- **Cause**: `generateIdempotencyKey()` called but never passed to Stripe
- **Justification Fails**: Oversight - key is generated but not used
- **Recommendation**: MODIFY - Pass idempotencyKey to `stripe.refunds.create()`

### P0-004: Station Token Weak Default Secret
- **Impact**: All station tokens compromised if env var missing
- **Likelihood**: Medium - Production misconfiguration
- **Evidence**: `server/src/services/auth/stationAuth.ts:11`
- **Cause**: Fallback to `'station-secret-change-in-production'`
- **Justification Fails**: Production should fail-fast, not use weak defaults
- **Recommendation**: REMOVE - Throw error if secret not configured in production

### P0-005: Refund Without Restaurant Validation
- **Impact**: Cross-tenant refund if payment ID known
- **Likelihood**: Low - Requires knowing payment ID
- **Evidence**: `server/src/routes/payments.routes.ts:642-654`
- **Cause**: `paymentIntent.metadata?.['restaurant_id']` checked but not enforced
- **Recommendation**: MODIFY - Throw Unauthorized if restaurant_id doesn't match

### P0-006: KIOSK_JWT_SECRET Optional in Schema
- **Impact**: JWT signing fails silently with weak default
- **Likelihood**: Medium - Configuration oversight
- **Evidence**: `server/src/config/env.schema.ts:70`
- **Cause**: Schema marks as optional, production validation separate
- **Recommendation**: MODIFY - Make required in schema, fail loudly

### P0-007: PIN_PEPPER Weak Default
- **Impact**: All PINs vulnerable if pepper not configured
- **Likelihood**: Low - Production validation catches this
- **Evidence**: `server/src/services/auth/pinAuth.ts:18-22`
- **Cause**: Fallback to `'dev-only-pepper'`
- **Recommendation**: REMOVE - No defaults for security-critical secrets

### P0-008: Session Expiration Calculated Client-Side
- **Impact**: Token expiration manipulation via system clock
- **Likelihood**: Low - Requires clock manipulation
- **Evidence**: `client/src/contexts/AuthContext.tsx:224-228`
- **Cause**: `Date.now() / 1000 + expires_in` calculated locally
- **Recommendation**: MODIFY - Use server JWT `exp` claim exclusively

### P0-009: webhook.routes.ts Missing Idempotency Check
- **Impact**: Duplicate webhook processing
- **Likelihood**: Medium - Webhook retries common
- **Evidence**: `server/src/routes/webhook.routes.ts:14-56`
- **Cause**: No deduplication of webhook events
- **Recommendation**: MODIFY - Track processed event IDs in database

---

## P1: HIGH (15 Findings)

### P1-001: PIN User Enumeration via Timing
- **Impact**: Attackers identify valid user accounts
- **Likelihood**: High - Response timing measurable
- **Evidence**: `server/src/services/auth/pinAuth.ts:205-216`
- **Cause**: Loop through all users, timing varies by count
- **Recommendation**: MODIFY - Constant-time comparison, fixed response delay

### P1-002: Webhook Replay Attack
- **Impact**: Payment failed status overwrites success
- **Likelihood**: Medium - Old webhooks retried
- **Evidence**: `server/src/routes/payments.routes.ts:727-797`
- **Cause**: No timestamp verification on webhook events
- **Recommendation**: MODIFY - Use `webhookAuthWithTimestamp` (exists but unused)

### P1-003: STRICT_AUTH Not Default in Production
- **Impact**: Tokens without restaurant_id accepted
- **Likelihood**: Medium - Easy to misconfigure
- **Evidence**: `server/src/middleware/auth.ts:79-87`
- **Cause**: Opt-in via environment variable
- **Recommendation**: MODIFY - Make STRICT_AUTH default in production

### P1-004: In-Memory Rate Limiting
- **Impact**: Rate limits reset on server restart
- **Likelihood**: High - Render deploys restart server
- **Evidence**: `server/src/middleware/rateLimiter.ts`, `MenuEmbeddingService`
- **Cause**: Uses in-memory store for performance
- **Recommendation**: MODIFY - Migrate to Redis for distributed rate limiting

### P1-005: PIN Lockout Only Per-User
- **Impact**: Attacker can try N×5 attempts across N users
- **Likelihood**: Medium - Requires knowledge of PINs
- **Evidence**: `server/src/services/auth/pinAuth.ts:289-301`
- **Cause**: Lockout applies per user, not per IP/device
- **Recommendation**: MODIFY - Add IP/device-level rate limiting

### P1-006: Weak PIN Validation Rules
- **Impact**: PINs brute-forced in ~10,000 attempts
- **Likelihood**: High - 4-6 digit PINs have low entropy
- **Evidence**: `server/src/services/auth/pinAuth.ts:69-90`
- **Cause**: Only rejects obvious patterns (1234, 0000)
- **Recommendation**: MODIFY - Require 6+ digits, reject sequential/keyboard patterns

### P1-007: Device Fingerprint Easily Spoofed
- **Impact**: Station token usable from any device
- **Likelihood**: Medium - User-Agent/IP spoofable
- **Evidence**: `server/src/services/auth/stationAuth.ts:47-51`
- **Cause**: Fingerprint based on IP + User-Agent only
- **Recommendation**: REPLACE - Use hardware-backed keys or TLS client certs

### P1-008: Restaurant Header Fallback in optionalAuth
- **Impact**: Unauthenticated users select any restaurant
- **Likelihood**: Medium - Only affects public endpoints
- **Evidence**: `server/src/middleware/auth.ts:150-161`
- **Cause**: `x-restaurant-id` header trusted for unauthenticated requests
- **Recommendation**: MODIFY - Only allow on explicitly marked public endpoints

### P1-009: Token Exposure in Debug Logs
- **Impact**: PII leakage in log aggregation systems
- **Likelihood**: Medium - Logs stored in Sentry/CloudWatch
- **Evidence**: `client/src/services/http/httpClient.ts:108-123`
- **Cause**: Token usage logged (not values, but patterns)
- **Recommendation**: REMOVE - Eliminate token-related logging

### P1-010: AuthContext Logs User Email
- **Impact**: PII in logs violates privacy policies
- **Likelihood**: High - Happens on every login
- **Evidence**: `client/src/contexts/AuthContext.tsx:195-219`
- **Cause**: Email included in structured logs
- **Recommendation**: MODIFY - Hash or redact PII in logs

### P1-011: Audit Failures Non-Blocking for Auth
- **Impact**: Authentication audit trail lost
- **Likelihood**: Low - Database rarely fails
- **Evidence**: `server/src/middleware/auth.ts:116-124`
- **Cause**: `.catch(() => {})` swallows errors
- **Recommendation**: MODIFY - Queue audit logs, retry with backoff

### P1-012: Session Refresh Race Condition
- **Impact**: Multiple token refresh requests cause inconsistency
- **Likelihood**: Low - Race window small
- **Evidence**: `client/src/contexts/AuthContext.tsx:58-60, 425-462`
- **Cause**: Ref-based locking not fully atomic
- **Recommendation**: MODIFY - Use promise-based refresh queue

### P1-013: kiosk_demo Role Still in RBAC
- **Impact**: Technical debt, potential confusion
- **Likelihood**: Low - Role rejected at auth layer
- **Evidence**: `server/src/middleware/rbac.ts:104`
- **Cause**: Role kept for "backward compatibility"
- **Recommendation**: REMOVE - Complete removal since auth rejects it

### P1-014: User Profile Not Tenant-Scoped
- **Impact**: User profiles visible across restaurants
- **Likelihood**: Low - user_profiles table has no restaurant_id
- **Evidence**: `server/src/routes/auth.routes.ts:316-330`
- **Cause**: user_profiles designed as global user data
- **Recommendation**: MODIFY - Consider tenant-specific profile fields

### P1-015: Payment Confirmation Race with Webhook
- **Impact**: Order status divergence on simultaneous updates
- **Likelihood**: Medium - Webhook/confirm race common
- **Evidence**: `server/src/routes/payments.routes.ts:288-319`
- **Cause**: No distributed locking on payment confirmation
- **Recommendation**: MODIFY - Use database-level row locking

---

## P2: MEDIUM (22 Findings)

### P2-001: PIN Attempt Counter Race Condition
- **Impact**: Concurrent requests bypass lockout check
- **Likelihood**: Low - Narrow race window
- **Evidence**: `server/src/services/auth/pinAuth.ts:303-319`
- **Cause**: Read-modify-write not atomic
- **Recommendation**: MODIFY - Use PostgreSQL atomic increment

### P2-002: No CSRF Token Protection
- **Impact**: State-changing requests vulnerable to CSRF
- **Likelihood**: Low - Requires XSS first
- **Evidence**: N/A (not implemented)
- **Cause**: REST API assumed not to need CSRF
- **Recommendation**: MODIFY - Add CSRF tokens to sensitive endpoints

### P2-003: Inconsistent Rate Limit Windows
- **Impact**: Confusion about actual limits
- **Likelihood**: Low - Operational confusion
- **Evidence**: `server/src/middleware/authRateLimiter.ts:119-143`
- **Cause**: Express (3/5min) vs DB (5/account) mismatch
- **Recommendation**: MODIFY - Unify rate limiting configuration

### P2-004: Suspicious Activity Threshold Too High
- **Impact**: 5-10 attempts before detection
- **Likelihood**: Medium - Attackers exploit gap
- **Evidence**: `server/src/middleware/authRateLimiter.ts:264-267`
- **Cause**: Warning at 5, block at 10
- **Recommendation**: MODIFY - Reduce threshold to 3-5

### P2-005: WebSocket Token in URL (Test Environment)
- **Impact**: Token logged in URL by proxies/WAFs
- **Likelihood**: Low - Only in test mode
- **Evidence**: `server/src/middleware/auth.ts:184-201`
- **Cause**: `?token=xxx` parameter for WebSocket auth
- **Recommendation**: KEEP - First-message auth preferred, URL is fallback

### P2-006: Menu Embedding Rate Limit In-Memory
- **Impact**: Rate limit bypass on server restart
- **Likelihood**: Medium - Affects AI features only
- **Evidence**: `server/src/services/menu-embedding.service.ts`
- **Cause**: In-memory Map for rate limiting
- **Recommendation**: MODIFY - Migrate to Redis (TODO-231)

### P2-007: Station Activity Logging Non-Blocking
- **Impact**: Activity log lost on DB failure
- **Likelihood**: Low - Database rarely fails
- **Evidence**: `server/src/services/auth/stationAuth.ts:220-235`
- **Cause**: Fire-and-forget update
- **Recommendation**: KEEP - Acceptable for activity tracking

### P2-008: Order Status History Nullable restaurant_id
- **Impact**: Legacy rows accessible without tenant filter
- **Likelihood**: Low - RLS handles with IS NOT NULL
- **Evidence**: `supabase/migrations/20251203_audit_tables_rls.sql`
- **Cause**: Backward compatibility with old data
- **Recommendation**: KEEP - RLS policy handles correctly

### P2-009: Payment Failure Audit Not Always Updated
- **Impact**: Incomplete audit trail on failures
- **Likelihood**: Medium - Depends on metadata
- **Evidence**: `server/src/routes/payments.routes.ts:301-310`
- **Cause**: `.catch()` swallows errors if no idempotency key
- **Recommendation**: MODIFY - Make audit update mandatory

### P2-010: Secret Length Without Entropy Check
- **Impact**: Weak secrets pass validation
- **Likelihood**: Low - Requires intentional weakness
- **Evidence**: `server/src/config/env.schema.ts:135-145`
- **Cause**: Only checks length, not character diversity
- **Recommendation**: MODIFY - Add entropy calculation

### P2-011: STATION_TOKEN_SECRET Optional in Schema
- **Impact**: Fallback chain complexity
- **Likelihood**: Low - Production validation catches
- **Evidence**: `server/src/config/env.schema.ts`
- **Cause**: Fallback to KIOSK_JWT_SECRET
- **Recommendation**: MODIFY - Make explicit, fail if missing

### P2-012: Dual RBAC Source (Code vs Database)
- **Impact**: Scope drift between sources
- **Likelihood**: Medium - Manual sync required
- **Evidence**: `server/src/middleware/rbac.ts:44-102`
- **Cause**: ROLE_SCOPES constant + role_scopes table
- **Recommendation**: KEEP - Documented pattern, migration sync enforced

### P2-013: Cart UUID Regeneration
- **Impact**: Legacy cart items lose reference
- **Likelihood**: Low - Only affects old data
- **Evidence**: `client/src/contexts/UnifiedCartContext.tsx`
- **Cause**: Phase 3 fix for integer ID migration
- **Recommendation**: KEEP - Correct behavior for migration

### P2-014: WebSocket Heartbeat 60s (Was 30s)
- **Impact**: Stale connections detected slower
- **Likelihood**: Low - 60s still reasonable
- **Evidence**: `server/src/utils/websocket.ts`
- **Cause**: Reduced frequency for performance
- **Recommendation**: KEEP - Acceptable tradeoff

### P2-015: No Security Headers Middleware Visible
- **Impact**: Missing HSTS, X-Frame-Options
- **Likelihood**: Low - Helmet configured
- **Evidence**: `server/src/middleware/security.ts`
- **Cause**: Helmet handles, but not explicitly visible
- **Recommendation**: KEEP - Helmet configuration adequate

### P2-016: Payment Amount Rounding Tolerance
- **Impact**: 1-cent discrepancies accepted
- **Likelihood**: Low - Edge case
- **Evidence**: `server/src/services/payment.service.ts:206-209`
- **Cause**: Floating-point arithmetic
- **Recommendation**: KEEP - Acceptable tolerance

### P2-017: Order Total Always Recalculated
- **Impact**: Performance overhead
- **Likelihood**: Low - Necessary for security
- **Evidence**: `server/src/services/payment.service.ts:73-146`
- **Cause**: Never trust client-provided amounts
- **Recommendation**: KEEP - Security over performance

### P2-018: Scheduled Orders Batch Size 100
- **Impact**: Memory spike with many scheduled orders
- **Likelihood**: Low - Unlikely to have 100+ scheduled
- **Evidence**: `server/src/services/scheduledOrders.service.ts`
- **Cause**: Memory-conscious design
- **Recommendation**: KEEP - Good practice

### P2-019: Voice Modifier Rules Triggers GIN Index
- **Impact**: Performance on complex searches
- **Likelihood**: Low - Index optimizes
- **Evidence**: `supabase/migrations/20251123155805_add_voice_modifier_rules.sql`
- **Cause**: Array column indexing
- **Recommendation**: KEEP - Correct index type

### P2-020: Menu Embeddings Nullable
- **Impact**: Some items without semantic search
- **Likelihood**: Low - Async generation
- **Evidence**: `supabase/migrations/20251226_menu_embeddings.sql`
- **Cause**: Embeddings generated asynchronously
- **Recommendation**: KEEP - Acceptable behavior

### P2-021: Cart Cleanup Interval
- **Impact**: Abandoned carts persist temporarily
- **Likelihood**: Low - Cleanup runs regularly
- **Evidence**: `server/src/ai/functions/realtime-menu-tools.ts`
- **Cause**: In-memory cleanup interval
- **Recommendation**: KEEP - Acceptable behavior

### P2-022: Email Service Stubbed
- **Impact**: No actual email notifications
- **Likelihood**: Low - Feature not launched
- **Evidence**: `server/src/services/email.service.ts`
- **Cause**: Postmark integration pending
- **Recommendation**: MODIFY - Implement before launch if needed

---

## P3: LOW (12 Findings)

### P3-001: console.log in Tests
- **Impact**: Noise in test output
- **Likelihood**: Low - Test-only
- **Evidence**: Various test files
- **Recommendation**: REMOVE - Use logger

### P3-002: user_pins Table @ignore in Prisma
- **Impact**: Table excluded from client
- **Likelihood**: Low - Intentional
- **Evidence**: `prisma/schema.prisma`
- **Recommendation**: KEEP - Security measure

### P3-003: api_scopes, role_scopes No RLS
- **Impact**: Global tables exposed
- **Likelihood**: Low - Reference data only
- **Evidence**: Database migrations
- **Recommendation**: KEEP - Correct for global data

### P3-004: restaurants Table No RLS
- **Impact**: Master table queryable
- **Likelihood**: Low - Access mediated via user_restaurants
- **Evidence**: Database migrations
- **Recommendation**: KEEP - Correct architecture

### P3-005: TypeScript any in State Machine Hooks
- **Impact**: Type safety loss
- **Likelihood**: Low - Runtime validated
- **Evidence**: `server/src/services/orderStateMachine.ts:244`
- **Recommendation**: MODIFY - Add proper types

### P3-006: Twilio/SendGrid Inline in State Machine
- **Impact**: Code organization
- **Likelihood**: Low - Works correctly
- **Evidence**: `server/src/services/orderStateMachine.ts:446-490`
- **Recommendation**: MODIFY - Consider service extraction

### P3-007: Module-Level Service Initialization
- **Impact**: Startup blocking
- **Likelihood**: Low - Minimal impact
- **Evidence**: `server/src/services/orderStateMachine.ts:16-36`
- **Recommendation**: KEEP - Documented in TODO-230

### P3-008: Vite Manual Chunk Splitting
- **Impact**: Build complexity
- **Likelihood**: Low - Necessary for memory
- **Evidence**: `client/vite.config.ts`
- **Recommendation**: KEEP - Prevents memory explosion

### P3-009: 5MB WebSocket Payload Limit
- **Impact**: Large messages rejected
- **Likelihood**: Low - Voice/order data small
- **Evidence**: `server/src/utils/websocket.ts`
- **Recommendation**: KEEP - Reasonable limit

### P3-010: Graceful Shutdown 5s Timeout
- **Impact**: In-flight requests may be lost
- **Likelihood**: Low - Usually completes faster
- **Evidence**: `server/src/server.ts:311`
- **Recommendation**: KEEP - Acceptable timeout

### P3-011: Documentation Drift
- **Impact**: Docs may not match code
- **Likelihood**: Medium - Common issue
- **Evidence**: `docs/` directory
- **Recommendation**: MODIFY - Regular doc reviews

### P3-012: Test Restaurant IDs Hardcoded
- **Impact**: Tests coupled to specific UUIDs
- **Likelihood**: Low - Test-only
- **Evidence**: `CLAUDE.md`, test files
- **Recommendation**: KEEP - Consistent test data

---

## SUMMARY BY SEVERITY

| Severity | Count | % of Total |
|----------|-------|------------|
| P0 Critical | 9 | 15.5% |
| P1 High | 15 | 25.9% |
| P2 Medium | 22 | 37.9% |
| P3 Low | 12 | 20.7% |
| **Total** | **58** | **100%** |

---

## REMEDIATION PRIORITY

### Week 1: Critical (P0)
- [ ] P0-001: Demo user bypass
- [ ] P0-002: localStorage tokens
- [ ] P0-003: Refund idempotency
- [ ] P0-004: Station token default
- [ ] P0-005: Refund restaurant validation
- [ ] P0-006: KIOSK_JWT_SECRET required
- [ ] P0-007: PIN_PEPPER default removal
- [ ] P0-008: Server-side expiration only
- [ ] P0-009: Webhook idempotency

### Week 2: High (P1)
- [ ] P1-001: PIN timing attack
- [ ] P1-002: Webhook replay
- [ ] P1-003: STRICT_AUTH default
- [ ] P1-004: Redis rate limiting
- [ ] P1-005: IP-level PIN rate limiting
- [ ] P1-006: Stronger PIN rules

### Week 3-4: Medium (P2)
- [ ] P2-001 through P2-022

### Backlog: Low (P3)
- [ ] P3-001 through P3-012
