# ARCHITECTURAL DECISIONS ON TRIAL

**Audit Date**: 2025-12-28
**Method**: Hostile analysis of each decision as a hypothesis

---

## Decision Verdict Summary

| ADR | Decision | Verdict | Risk Level |
|-----|----------|---------|------------|
| ADR-001 | Snake Case Convention | **KEEP** | Low |
| ADR-006 | Dual Authentication Pattern | **MODIFY** | Critical |
| ADR-007 | Per-Restaurant Configuration | **KEEP** | Low |
| ADR-009 | Payment Audit Logging | **KEEP** | Low |
| ADR-010 | Remote-First Database | **KEEP** | Medium |
| ADR-015 | Order State Machine | **KEEP** | Low |
| (Implicit) | localStorage Token Storage | **REPLACE** | Critical |
| (Implicit) | In-Memory Rate Limiting | **MODIFY** | High |
| (Implicit) | Demo User Bypass | **REMOVE** | Critical |
| (Implicit) | Dual RBAC Sources | **MODIFY** | Medium |

---

## Detailed Analysis

### ADR-001: Snake Case Convention

**What Decision Was Made**:
All layers (database, API, client) use snake_case. No transformations between layers.

**Why It Likely Exists**:
- Eliminates transform bugs at boundaries
- PostgreSQL native convention
- Reduces cognitive load when reading across layers
- Prevents the classic `createdAt` vs `created_at` discrepancy

**Evidence It Works**:
```typescript
// shared/types/order.types.ts - Consistent everywhere
export interface Order {
  id: string;
  restaurant_id: string;
  customer_name?: string;
  payment_status: PaymentStatus;
  created_at: string;
}
```
- No transformation code exists in codebase
- No reports of serialization bugs in solutions docs
- Client and server use identical type definitions

**Evidence It Fails**:
- None found
- Minor friction: JavaScript convention prefers camelCase
- IDE autocomplete may suggest camelCase

**Verdict**: **KEEP**

This is a sound decision. The slight JavaScript convention friction is vastly outweighed by elimination of transform bugs.

---

### ADR-006: Dual Authentication Pattern

**What Decision Was Made**:
Support both Supabase JWT (email/password) and localStorage JWT (PIN/station/demo) authentication. The `httpClient` checks both sources.

**Why It Likely Exists**:
- Supabase Auth for admin/manager web access
- PIN auth for shared devices (servers sharing a tablet)
- Station auth for KDS displays (no user present)
- Demo mode for sales/onboarding

**Evidence It Works**:
```typescript
// client/src/services/http/httpClient.ts
// Checks Supabase session first, falls back to localStorage
const session = await supabase.auth.getSession();
if (session?.access_token) { ... }
// Fall back to localStorage for PIN/station/demo
const localToken = localStorage.getItem('token');
```
- Enables legitimate use cases (shared devices)
- Demo mode works for sales presentations
- Station auth enables headless KDS

**Evidence It Fails**:
1. **Demo user bypass** (`restaurantAccess.ts:43-50`):
   ```typescript
   if (sub.startsWith('demo:')) {
     // Skips ALL database permission checks
     return true;
   }
   ```
   - Attacker forges JWT with `sub: 'demo:anything'`
   - Gains full access to any restaurant

2. **localStorage XSS exposure** (`AuthContext.tsx:237-241`):
   ```typescript
   localStorage.setItem('token', pinToken);
   localStorage.setItem('demo_token', demoToken);
   ```
   - Any XSS attack steals all session tokens
   - No HTTPOnly protection possible

3. **Station token weak secret** (`stationAuth.ts:11`):
   ```typescript
   const secret = process.env.STATION_TOKEN_SECRET || 'station-secret-change-in-production';
   ```

4. **Complexity explosion**:
   - 4 auth paths to audit
   - 4 token formats to validate
   - 4 failure modes to handle

**Verdict**: **MODIFY**

The use cases are legitimate, but implementation is vulnerable:
- Remove demo user bypass in production (or validate against whitelist)
- Migrate PIN/station tokens to HTTPOnly cookies
- Remove hardcoded fallback secrets
- Consider consolidating to 2 auth paths (Supabase + PIN-via-HTTPOnly)

---

### ADR-007: Per-Restaurant Configuration

**What Decision Was Made**:
Restaurant-specific settings (tax rate, hours, features) stored in database with explicit restaurant_id scoping.

**Why It Likely Exists**:
- Multi-tenant flexibility
- Different tax jurisdictions
- Different operational hours
- Different feature enablement

**Evidence It Works**:
```typescript
// payment.service.ts:118
const taxRate = await getRestaurantTaxRate(restaurantId);
```
- Tax calculation correctly uses restaurant-specific rates
- Configuration isolated per tenant

**Evidence It Fails**:
- None found
- Minor: No caching observed (potential N+1 on high-volume orders)

**Verdict**: **KEEP**

Sound multi-tenant pattern. Consider adding caching for high-volume scenarios.

---

### ADR-009: Payment Audit Logging

**What Decision Was Made**:
Two-phase payment logging: log BEFORE charge (initiated), update AFTER completion (success/failed). Fail-fast if audit logging fails.

**Why It Likely Exists**:
- PCI DSS compliance requirement
- Prevents "charged but unrecorded" scenarios
- Creates forensic trail for disputes

**Evidence It Works**:
```typescript
// payment.service.ts:278-280
// FAIL-FAST: Per ADR-009 and SECURITY.md, audit log failures MUST block payment
// This is a PCI DSS compliance requirement
throw new Error('Payment processing unavailable - audit system failure.');
```
- Audit log created before Stripe charge
- Failure blocks payment processing
- Immutable audit table with RLS

**Evidence It Fails**:
- Partial: Refund operations lack idempotency key in Stripe call
- Partial: Webhook handler doesn't verify timestamp (allows replay)

**Verdict**: **KEEP**

Core pattern is sound. Fix the refund idempotency gap.

---

### ADR-010: Remote-First Database

**What Decision Was Made**:
Remote Supabase is the source of truth. Migrations document history. Prisma schema is GENERATED from remote via `db pull`, never manually edited.

**Why It Likely Exists**:
- Single source of truth
- No local/remote drift
- Supabase Dashboard changes automatically reflected

**Evidence It Works**:
- Prisma schema matches remote exactly
- RLS policies enforced at database layer
- Migrations run in order

**Evidence It Fails**:
- Risk: Dashboard changes bypass migration history
- Risk: No local development database (testing against production schema)
- Risk: Schema changes visible before code deployment

**Verdict**: **KEEP**

Acceptable for current scale. Add migration tracking for Dashboard changes at scale.

---

### ADR-015: Order State Machine

**What Decision Was Made**:
Server-side enforcement of order state transitions via `OrderStateMachine` class. Only valid transitions allowed. Hooks for side effects.

**Why It Likely Exists**:
- Prevents invalid states (e.g., completed → pending)
- Centralizes business logic
- Enables hooks for notifications, refunds

**Evidence It Works**:
```typescript
// orderStateMachine.ts
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['pending', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked-up', 'cancelled'],
  'picked-up': ['completed'],
  completed: [],
  cancelled: []
};
```
- Explicit transition map
- `canTransition()` check before mutation
- Hooks fire on transition

**Evidence It Fails**:
- None found
- Client displays all 8 states correctly
- No orphaned orders in invalid states

**Verdict**: **KEEP**

Excellent pattern. Well-implemented.

---

### (Implicit) localStorage Token Storage

**What Decision Was Made**:
PIN tokens, station tokens, and demo tokens stored in browser localStorage.

**Why It Likely Exists**:
- Simple to implement
- Persists across tabs
- No server-side session management needed

**Evidence It Works**:
- Tokens persist across refreshes
- Multi-tab support works

**Evidence It Fails**:
1. **XSS vulnerability**: Any script can read `localStorage`
2. **No expiration enforcement**: Client-side expiry only
3. **Token theft**: Shared device means shared localStorage
4. **No revocation**: Can't invalidate stolen tokens

**Verdict**: **REPLACE**

Migrate to HTTPOnly secure cookies for sensitive tokens. This is a critical security fix.

---

### (Implicit) In-Memory Rate Limiting

**What Decision Was Made**:
Rate limiting uses in-memory Maps (Express middleware, MenuEmbeddingService).

**Why It Likely Exists**:
- Simple to implement
- No external dependencies
- Works for single-instance deployment

**Evidence It Works**:
- Rate limiting functions correctly on single instance
- Prevents brute force during uptime

**Evidence It Fails**:
1. **Reset on restart**: Render deploys clear all counters
2. **Not distributed**: Horizontal scaling breaks isolation
3. **Memory growth**: Long-lived rate limit entries

**Verdict**: **MODIFY**

Acceptable for MVP. Migrate to Redis before horizontal scaling. Add restart grace period.

---

### (Implicit) Demo User Bypass

**What Decision Was Made**:
JWT tokens with `sub` starting with `demo:` bypass database permission checks entirely.

**Why It Likely Exists**:
- Enable quick sales demos without database setup
- Allow onboarding without real user creation

**Evidence It Works**:
- Demo mode functions for presentations
- No database records needed for demos

**Evidence It Fails**:
1. **Total bypass**: No permission checks for demo users
2. **Forgeable**: Attacker creates JWT with `sub: 'demo:evil'`
3. **No audit trail**: Demo actions not tracked
4. **Cross-tenant access**: Demo user can access any restaurant

**Verdict**: **REMOVE** (or validate against whitelist)

This is a critical vulnerability. Either:
- Remove demo bypass entirely in production
- Validate demo tokens against a database whitelist
- Restrict demo users to a specific demo restaurant ID

---

### (Implicit) Dual RBAC Sources

**What Decision Was Made**:
Roles defined in both code constants (`ROLE_PERMISSIONS`) and database table (`role_scopes`).

**Why It Likely Exists**:
- Code constants for type safety and defaults
- Database for runtime flexibility and per-restaurant customization

**Evidence It Works**:
- Basic role checks function
- Permissions can be customized per restaurant

**Evidence It Fails**:
1. **Source confusion**: Which source wins?
2. **Drift risk**: Code and database can diverge
3. **Maintenance burden**: Two places to update
4. **Testing complexity**: Mocks must handle both sources

**Verdict**: **MODIFY**

Consolidate to single source:
- Option A: Database only (with seeded defaults)
- Option B: Code only (with feature flags for customization)

---

## Architectural Patterns Assessment

### Patterns That Work Well

| Pattern | Why It Works |
|---------|--------------|
| Snake case everywhere | Eliminates transform bugs |
| Order state machine | Centralizes business logic, prevents invalid states |
| Two-phase audit logging | Compliance, forensic trail |
| RLS policies | Defense in depth for tenant isolation |
| Shared types package | Single source of truth for interfaces |
| Server-generated idempotency keys | Prevents client manipulation |

### Patterns That Need Work

| Pattern | Issue | Fix |
|---------|-------|-----|
| localStorage tokens | XSS exposure | HTTPOnly cookies |
| Demo user bypass | Auth bypass | Remove or whitelist |
| In-memory rate limiting | Restart clears state | Redis |
| Dual RBAC sources | Confusion and drift | Single source |
| Optional STRICT_AUTH | Easy to forget | Default to strict |

---

## Recommendations

### Immediate (Before Launch)

1. **Remove demo user bypass** in production builds
2. **Enable STRICT_AUTH by default**
3. **Rotate and require STATION_TOKEN_SECRET**

### Short-Term (First Sprint)

1. **Migrate sensitive tokens to HTTPOnly cookies**
2. **Consolidate RBAC to single source**
3. **Add webhook timestamp verification**

### Medium-Term (Before Scale)

1. **Migrate rate limiting to Redis**
2. **Add device fingerprinting for PIN auth**
3. **Implement token refresh mechanism**

---

## Conclusion

The architectural decisions in this codebase are generally sound, with the notable exception of the authentication system. The dual authentication pattern solves real business problems (shared devices, demos) but introduces critical security vulnerabilities in its implementation.

The order state machine, payment audit logging, and multi-tenancy patterns are enterprise-grade and should be preserved. The demo user bypass and localStorage token storage must be addressed before production deployment.

**Overall Architecture Grade**: B- (Good foundation, critical auth gaps)

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
