# ADR-006: Dual Authentication Pattern - localStorage Fallback for httpClient

**Status**: ACCEPTED
**Date**: 2025-10-17
**Last Updated:** 2025-10-31
**Deciders**: Technical Lead
**Related**: [AUTHENTICATION_ARCHITECTURE.md](../architecture/AUTHENTICATION_ARCHITECTURE.md)

---

## Context

### The Problem

In v6.0, we migrated to direct Supabase authentication for production users (managers, owners with email accounts). However, we retained custom JWT authentication in localStorage for:
- **Demo users** (development/testing)
- **PIN authentication** (servers, cashiers on shared devices)
- **Station authentication** (kitchen displays, expo screens)

**The Bug**: Our HTTP client (`client/src/services/http/httpClient.ts`) only checked Supabase sessions for authentication tokens. When demo/PIN/station users tried to make API calls, httpClient couldn't find a Supabase session and sent requests without Authorization headers.

**Symptoms**:
- KDS (Kitchen Display) showing mock "Classic Burger" data instead of real orders
- 401 Unauthorized errors on GET `/api/v1/orders`
- ServerView voice orders succeeding (used direct fetch) but KDS failing (used httpClient)

**Root Cause**: Architectural mismatch between AuthContext (stores tokens in localStorage) and httpClient (only reads from Supabase).

---

## Decision

**We will implement a dual authentication pattern in httpClient** where it checks BOTH Supabase sessions AND localStorage sessions:

```typescript
// client/src/services/http/httpClient.ts lines 109-148

async request(endpoint, options) {
  // 1. Try Supabase session first (primary, production-ready)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  } else {
    // 2. Fallback to localStorage for demo/PIN/station
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (parsed.session?.accessToken && parsed.session?.expiresAt > Date.now() / 1000) {
        headers.set('Authorization', `Bearer ${parsed.session.accessToken}`);
      }
    }
  }

  // 3. Make request
  return super.request(endpoint, { headers, ...options });
}
```

**Authentication Priority**:
1. **Primary**: Supabase session (for email/password login)
2. **Fallback**: localStorage session (for demo/PIN/station login)

---

## Consequences

### Positive ✅

1. **Unblocks Phase 1 Stabilization**
   - All demo-authenticated pages now work (KDS, Manager, Expo, ServerView)
   - End-to-end testing enabled without creating Supabase accounts
   - Voice ordering → KDS flow functional

2. **Single HTTP Client**
   - No need for separate API clients for different auth methods
   - Transparent authentication handling
   - Developers don't need to think about auth types

3. **PIN/Station Auth Functional**
   - Shared devices can authenticate via PIN
   - Kitchen displays can use station tokens
   - No Supabase accounts needed for each staff member

### Negative ⚠️

1. **Dual Authentication Codepaths**
   - Two separate systems to maintain
   - Two test matrices (Supabase flow + localStorage flow)
   - Increased cognitive load for developers

2. **Security Concerns**
   - localStorage tokens vulnerable to XSS attacks
   - No httpOnly cookie protection (unlike Supabase)
   - Token theft risk if malicious script injected

3. **Token Management Complexity**
   - Supabase auto-refreshes tokens, localStorage doesn't
   - PIN users must re-login every 12 hours
   - No centralized token revocation for localStorage

4. **Future Maintenance**
   - Migration to single auth system requires removing this code
   - Technical debt that needs addressing before production
   - Documentation must explain both patterns

---

## Alternatives Considered

### Alternative 1: Migrate PIN/Station to Supabase Custom Auth

**Approach**: Use Supabase custom auth provider for PIN/station users

**Pros**:
- Single authentication system
- httpOnly cookies (more secure)
- Centralized session management
- Auto token refresh

**Cons**:
- Estimated 16-24 hours implementation
- Blocks Phase 1 stabilization
- Requires production Supabase setup
- Complex migration for existing PIN users

**Decision**: Rejected for Phase 1, reconsidered for Phase 2

### Alternative 2: Separate API Clients

**Approach**: Create `supabaseApiClient` and `localStorageApiClient`

**Pros**:
- Clear separation of concerns
- Easier to test in isolation
- No conditional logic in httpClient

**Cons**:
- Code duplication
- Developers must choose correct client
- Breaks abstraction (implementation detail leaks)

**Decision**: Rejected (too much duplication)

### Alternative 3: Disable Demo/PIN/Station Auth

**Approach**: Remove all non-Supabase authentication

**Pros**:
- Single auth system
- Simplest implementation
- Most secure

**Cons**:
- Blocks ALL testing
- Can't test kitchen displays
- Can't test PIN workflows
- Unacceptable for Phase 1

**Decision**: Rejected (blocks development)

---

## Implementation Details

### Files Modified
- `client/src/services/http/httpClient.ts` (lines 109-148)

### localStorage Session Format
```json
{
  "user": {
    "id": "demo:server:xyz123",
    "role": "server",
    "scopes": ["orders:create", "orders:read"]
  },
  "session": {
    "accessToken": "eyJhbG...",
    "expiresAt": 1729209600,
    "expiresIn": 3600
  },
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

### Token Expiry Validation
- Checks `expiresAt` timestamp before using token
- Converts milliseconds to seconds: `Date.now() / 1000`
- Logs warning if token expired (dev mode only)

### Authentication Flow Diagram
```
┌─────────────────┐
│ API Request     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ httpClient.     │
│ request()       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Check Supabase Session      │
│ supabase.auth.getSession()  │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │         │
   YES        NO
    │         │
    │         └──> ┌─────────────────────────────┐
    │              │ Check localStorage          │
    │              │ localStorage.getItem(...)   │
    │              └────────┬────────────────────┘
    │                       │
    │                  ┌────┴────┐
    │                  │         │
    │                 YES        NO
    │                  │         │
    │                  │         └──> ❌ No Auth
    │                  │
    └──────────────────┤
                       │
                       ▼
            ┌───────────────────────┐
            │ Add Authorization     │
            │ Header                │
            └──────────┬────────────┘
                       │
                       ▼
            ┌───────────────────────┐
            │ Make API Request      │
            └───────────────────────┘
```

---

## Production Migration Path

### Phase 1: Stabilization (Current - ACCEPTED)
**Timeline**: Now - End of testing
**Goal**: Stabilize all features with demo auth

**Actions**:
- ✅ Use dual auth pattern as implemented
- ✅ Test all demo flows (Manager, KDS, Expo, ServerView)
- ✅ Document technical debt
- ⏳ Monitor for auth-related bugs

**Status**: ACCEPTED - Use for development and testing

### Phase 2: Production Evaluation (Pre-Launch)
**Timeline**: Before production launch
**Goal**: Decide on production auth strategy

**Decision Tree**:
```
Are you launching with PIN auth?
├─ YES → How many staff using PIN?
│        ├─ < 10 staff → Option A: Keep localStorage with security hardening
│        └─ > 10 staff → Option B: Migrate to Supabase custom auth
└─ NO → Option C: Remove localStorage fallback entirely
```

**Option A: Security Hardening (Quick)**
- Implement CSP headers (prevent XSS)
- Add token rotation (8-hour expiry)
- Log all token access
- IP allowlisting for PIN terminals
- Device fingerprinting
- Estimated: 8-12 hours

**Option B: Migrate to Supabase (Proper)**
- Create custom auth provider in Supabase
- Map PINs to Supabase users
- Update httpClient to remove localStorage fallback
- Gradual rollout (one location at a time)
- Estimated: 16-24 hours

**Option C: Remove localStorage (Simplest)**
- Remove localStorage fallback from httpClient
- Disable demo/PIN/station auth in production
- Use Supabase exclusively
- Estimated: 2 hours

### Phase 3: Long-Term (Post-Launch)
**Timeline**: 3-6 months after launch
**Goal**: Consolidate to single auth system

**Recommendation**: Migrate all auth to Supabase
- More secure (httpOnly cookies)
- Centralized management
- Auto token refresh
- Better audit trails

---

## Security Considerations

### localStorage Vulnerabilities

**XSS (Cross-Site Scripting)**:
- Malicious scripts can read localStorage
- Stolen tokens are valid until expiry
- **Mitigation**: CSP headers, input sanitization

**Token Theft**:
- Tokens stored in plain text (base64-encoded, not encrypted)
- Browser extensions can access localStorage
- **Mitigation**: Short token lifetime (8 hours), IP allowlisting

**No Refresh Mechanism**:
- Users must re-login when token expires
- Mid-shift token expiry disrupts workflow
- **Mitigation**: Increase token lifetime or implement refresh

### Production Security Checklist

IF using localStorage auth in production:
- [ ] Implement Content Security Policy (CSP) headers
- [ ] Add token rotation (refresh every 8 hours)
- [ ] Log all authentication attempts
- [ ] Implement device fingerprinting
- [ ] Add IP allowlisting for PIN terminals
- [ ] Monitor for suspicious token reuse patterns
- [ ] Regular security audits (quarterly)
- [ ] Incident response plan for token theft

IF migrating to Supabase custom auth:
- [ ] Test PIN login flow with real devices
- [ ] Verify token refresh works correctly
- [ ] Implement graceful fallback if Supabase down
- [ ] Load test with concurrent PIN users
- [ ] Train staff on new login flow

---

## Monitoring & Metrics

Track these metrics to inform production decision:

**Authentication Success Rate**:
- Target: >99.5% for Supabase, >98% for localStorage
- Alert if < 95%

**Token Expiry Events**:
- Track how often users hit token expiry mid-shift
- Adjust token lifetime if frequent

**401 Unauthorized Errors**:
- Should be near zero with dual auth
- Spike indicates auth system failure

**Authentication Method Distribution**:
- % Supabase vs % localStorage
- Helps plan migration timeline

---

## References

- **Implementation**: `client/src/services/http/httpClient.ts:109-148`
- **Auth Context**: `client/src/contexts/AuthContext.tsx:328-375`
- **Demo Auth Service**: `client/src/services/auth/demoAuth.ts`
- **Architecture Doc**: [AUTHENTICATION_ARCHITECTURE.md](../architecture/AUTHENTICATION_ARCHITECTURE.md)
- **Production Status**: [PRODUCTION_STATUS.md](../../PRODUCTION_STATUS.md)

---

## Alias Removal Criteria

The kiosk_demo role alias will be removed when:
1. ✅ All client-side token generators updated to issue `customer` role
2. ✅ 30 consecutive days with zero `kiosk_demo` token issuance (tracked via logs)
3. ✅ Monitoring script confirms no deprecation warnings in production
4. ✅ Stakeholder approval obtained

**Monitoring Command:**
```bash
LOG_DIR=/var/log/restaurant-os/ DAYS_BACK=30 ./scripts/monitor-auth-roles.sh
# Expected output when ready:
# Kiosk_demo role tokens: 0 (0%)
```

Once criteria met:
1. Set `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false` in production
2. Monitor for 7 days
3. Create migration to remove kiosk_demo from `role_scopes` table
4. Remove kiosk_demo from `server/src/middleware/rbac.ts`

---

## Changelog

- **2025-10-18**: Added alias removal criteria (30-day zero usage rule)
- **2025-10-17**: Initial ADR created after implementing dual auth fix
- **Status**: ACCEPTED for Phase 1, REVIEW before production

---

**Next Review Date**: Before production launch
**Owner**: Technical Lead
**Stakeholders**: Development Team, Security Team, Product Team
