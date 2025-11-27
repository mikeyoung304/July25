---
title: WebSocket Dual-Auth Pattern Implementation for KDS
slug: websocket-station-auth-dual-pattern
problem_type: authentication
components:
  - WebSocketService
  - httpClient
  - KDS (Kitchen Display System)
  - ConnectionStatusBar
symptoms:
  - KDS shows "Disconnected" status in production
  - WebSocket connection fails for station/demo authentication
  - Server health endpoint returns OK but WebSocket won't connect
  - Supabase session check passes but localStorage JWT ignored
severity: P1
date_solved: 2025-11-27
tags:
  - authentication
  - websocket
  - kds
  - dual-auth
  - adr-006
  - localstorage
  - station-auth
commit: b6180e0e
---

# WebSocket Dual-Auth Pattern Implementation

## Problem

The Kitchen Display System (KDS) showed "Disconnected" status in production despite the server being healthy. WebSocket connections failed silently for users authenticated via station/demo/PIN auth.

### Symptoms Observed
- Red "Disconnected" badge in KDS header
- Server `/api/v1/health` returned OK
- WebSocket worked from Node.js without auth
- Only affected station auth users, not Supabase email users

### Investigation Steps
1. Checked server health - returned "degraded" but WebSocket service OK
2. Tested raw WebSocket connection from Node.js - connected successfully
3. Traced client code to `WebSocketService.connect()`
4. Found it only checked Supabase session, not localStorage JWT
5. Compared with `httpClient` which implements dual-auth per ADR-006

## Root Cause

`WebSocketService.connect()` only checked Supabase authentication:

```typescript
// BEFORE - Only Supabase auth
const { data: { session } } = await supabase.auth.getSession()
if (session?.access_token) {
  token = session.access_token
} else {
  // In production, this threw an error for station auth users
  throw new Error('Authentication required for WebSocket connection')
}
```

Per ADR-006, the app uses a **dual-auth pattern**:
1. **Supabase Auth** (primary) - Production users with email
2. **localStorage JWT** (fallback) - Demo users, PIN auth, station auth (KDS)

The `httpClient` correctly implements both (lines 110-149), but `WebSocketService` only implemented Supabase auth. Station auth users (who use localStorage JWT) couldn't connect.

## Solution

Added localStorage JWT fallback to `WebSocketService.connect()`, matching the `httpClient` pattern:

```typescript
// client/src/services/websocket/WebSocketService.ts (lines 86-126)

// Get auth token for WebSocket authentication
// Uses dual-auth pattern per ADR-006: Supabase session OR localStorage JWT
let token: string | null = null

// 1. Try Supabase session first (primary auth)
const { data: { session } } = await supabase.auth.getSession()

if (session?.access_token) {
  token = session.access_token
  logger.info('🔐 Using Supabase session for WebSocket')
} else {
  // 2. Fallback to localStorage for demo/PIN/station sessions (per ADR-006)
  const savedSession = localStorage.getItem('auth_session')
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession)
      if (parsed.session?.accessToken && parsed.session?.expiresAt) {
        // Check if token is still valid
        if (parsed.session.expiresAt > Date.now() / 1000) {
          token = parsed.session.accessToken
          logger.info('🔐 Using localStorage session token (demo/PIN/station) for WebSocket')
        } else {
          logger.warn('⚠️ localStorage session token expired for WebSocket')
        }
      }
    } catch (parseError) {
      logger.error('Failed to parse localStorage auth session for WebSocket:', parseError)
    }
  }

  // 3. If still no token, handle based on environment
  if (!token) {
    if (import.meta.env.DEV) {
      logger.warn('⚠️ WebSocket connecting without authentication (dev mode)')
    } else {
      logger.error('❌ No authentication available for WebSocket connection')
      this.setConnectionState('error')
      throw new Error('Authentication required for WebSocket connection')
    }
  }
}
```

### Key Implementation Details

1. **Authentication Hierarchy**: Supabase → localStorage → error/dev fallback
2. **Token Validation**: Checks `expiresAt > Date.now() / 1000` before using
3. **Error Handling**: Catches JSON parse errors without breaking connection
4. **Logging**: Identifies which auth method was used for debugging
5. **ADR Compliance**: Matches `httpClient.ts` pattern exactly

## Prevention Strategies

### 1. Code Review Checklist

When adding new authenticated services, verify:

- [ ] Checks Supabase session first (`supabase.auth.getSession()`)
- [ ] Falls back to localStorage (`localStorage.getItem('auth_session')`)
- [ ] Validates token expiration before use
- [ ] Handles JSON parse errors gracefully
- [ ] Logs which auth method was used
- [ ] Works in both production and development modes

### 2. Pattern Consistency

All authenticated services must follow the same dual-auth pattern:

**Canonical Implementation**: `client/src/services/http/httpClient.ts:110-149`

When creating new services that require authentication:
1. Copy the auth pattern from `httpClient`
2. Adapt for the specific transport (HTTP headers vs WebSocket query params)
3. Include the same fallback order and error handling

### 3. Testing Strategy

Test both authentication methods:

```typescript
describe('WebSocket Authentication', () => {
  it('connects with Supabase session', async () => {
    // Mock Supabase session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'supabase-token' } }
    })
    await service.connect()
    expect(service.isConnected()).toBe(true)
  })

  it('connects with localStorage JWT when no Supabase session', async () => {
    // No Supabase session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } })
    // localStorage has valid token
    localStorage.setItem('auth_session', JSON.stringify({
      session: { accessToken: 'local-token', expiresAt: Date.now() / 1000 + 3600 }
    }))
    await service.connect()
    expect(service.isConnected()).toBe(true)
  })

  it('fails in production when no auth available', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } })
    localStorage.clear()
    await expect(service.connect()).rejects.toThrow('Authentication required')
  })
})
```

## Related Documentation

### Architecture Decision Records
- [ADR-006: Dual Authentication Pattern](../../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
- [ADR-004: WebSocket Real-Time Architecture](../../explanation/architecture-decisions/ADR-004-websocket-realtime-architecture.md)
- [ADR-011: Authentication System Evolution](../../explanation/architecture-decisions/ADR-011-authentication-evolution.md)

### Lessons Learned
- [CL-AUTH-001: STRICT_AUTH Environment Drift](../../../.claude/lessons/CL-AUTH-001-strict-auth-drift.md)

### Implementation References
- `client/src/services/http/httpClient.ts:110-149` - Canonical dual-auth pattern
- `client/src/services/websocket/WebSocketService.ts:86-126` - Fixed WebSocket auth
- `docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md` - Full auth system docs

## Verification

After deploying, verify WebSocket connects for both auth methods:

1. **Supabase Auth**: Log in with email, check KDS shows "Connected"
2. **Station Auth**: Log in via workspace tile (demo), check KDS shows "Connected"
3. **Browser Console**: Should see either:
   - `🔐 Using Supabase session for WebSocket`
   - `🔐 Using localStorage session token (demo/PIN/station) for WebSocket`
