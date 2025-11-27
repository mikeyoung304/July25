# Quick Reference: Dual-Auth Pattern for New Services

**COPY THIS PATTERN FOR ANY NEW AUTHENTICATED SERVICE** (HTTP, WebSocket, Real-time, API)

## 5-Minute Implementation Guide

### Step 1: Get Auth Token (Required)
```typescript
let token: string | null = null

// Try Supabase first (primary)
const { data: { session } } = await supabase.auth.getSession()
if (session?.access_token) {
  token = session.access_token
  logger.info('🔐 Using Supabase session')
} else {
  // Fallback to localStorage (demo/PIN/station)
  const savedSession = localStorage.getItem('auth_session')
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession)
      if (parsed.session?.accessToken && parsed.session?.expiresAt) {
        if (parsed.session.expiresAt > Date.now() / 1000) {
          token = parsed.session.accessToken
          logger.info('🔐 Using localStorage session')
        }
      }
    } catch (parseError) {
      logger.error('Failed to parse auth session:', parseError)
    }
  }
}

// Handle missing auth
if (!token) {
  if (import.meta.env.DEV) {
    logger.warn('⚠️ No auth (dev mode allowed)')
  } else {
    throw new Error('Authentication required')
  }
}
```

### Step 2: Use Token in Request
```typescript
// For fetch
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

// For httpClient (already does this)
const data = await httpClient.post('/api/v1/endpoint', payload)
```

### Step 3: Add Tests (Required)
```typescript
describe('Authentication', () => {
  // Test Supabase auth
  test('uses Supabase token when available', async () => {
    ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
      data: { session: { access_token: 'supabase-token' } }
    })
    // Assert token is used
  })

  // Test localStorage auth
  test('uses localStorage token when Supabase unavailable', async () => {
    ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
      data: { session: null }
    })
    localStorage.setItem('auth_session', JSON.stringify({
      session: { accessToken: 'local-token', expiresAt: futureTime }
    }))
    // Assert token is used
  })

  // Test token validation
  test('rejects expired localStorage tokens', async () => {
    // Set expiresAt to past time
    // Assert token is NOT used
  })
})
```

---

## Checklist for Code Review

When reviewing a service that makes API calls:

```
Authentication:
□ Tries Supabase session first (supabase.auth.getSession())
□ Falls back to localStorage if no Supabase session
□ Checks token expiration (expiresAt > Date.now() / 1000)
□ Handles parse errors from localStorage
□ Logs auth attempts appropriately

Testing:
□ Tests Supabase auth path
□ Tests localStorage auth path (demo/PIN/station)
□ Tests expired token rejection
□ Tests missing auth handling
□ Tests both env modes (dev vs production)

Documentation:
□ Comments explain dual-auth pattern
□ References ADR-006
□ Points to httpClient as canonical implementation
```

---

## Red Flags (Will Fail Review)

- ❌ Only checks Supabase (httpClient was the first to implement, but pattern now required everywhere)
- ❌ Only checks localStorage (bypasses production auth)
- ❌ No token expiration check (accepts expired tokens)
- ❌ Silent auth failures (logs nothing when auth unavailable)
- ❌ No tests for both auth methods
- ❌ Uses `console.log` instead of `logger`
- ❌ No comments explaining the pattern
- ❌ Throws error on missing token in dev mode (should allow dev mode testing)

---

## Files to Reference

1. **Canonical Implementation** (COPY THIS):
   - File: `/client/src/services/http/httpClient.ts`
   - Lines: 109-148 (the entire `request()` method auth section)

2. **Working Reference** (WebSocket):
   - File: `/client/src/services/websocket/WebSocketService.ts`
   - Lines: 86-126 (the `connect()` method auth section)

3. **Good Test Examples**:
   - File: `/client/src/services/websocket/WebSocketService.test.ts`
   - Look for: `describe('Supabase Auth')` and `describe('localStorage Auth')`

4. **Architecture Decision**:
   - File: `/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`
   - Why this pattern exists and what it solves

---

## Decision Tree: Do I Need Dual Auth?

```
Does your service make authenticated API calls?
├─ HTTP requests? → YES, implement dual-auth
├─ WebSocket connection? → YES, implement dual-auth
├─ Real-time updates? → YES, implement dual-auth
├─ Fetch wrapper? → YES, implement dual-auth
└─ Just local logic? → NO, skip auth

Will this work with demo/PIN/station users?
├─ YES → Implement dual-auth (required)
└─ NO → Still implement dual-auth (don't assume usage pattern)
```

**TL;DR: If it makes any authenticated call, implement dual-auth.**

---

## Support

- **Questions?** Check `/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`
- **Stuck?** Copy `/client/src/services/http/httpClient.ts:109-148` verbatim
- **Review failed?** Check "Red Flags" section above
- **Want to refactor?** See Phase 2 in `CL-AUTH-002-websocket-dual-auth-prevention.md`
