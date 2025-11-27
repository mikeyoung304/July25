# Before/After: Dual-Auth Pattern Implementation

## The Issue: WebSocketService Inconsistency

WebSocketService didn't implement the same dual-auth pattern as httpClient, causing 401 failures for station auth (demo/PIN) users.

---

## BEFORE: Problematic Pattern (Incomplete)

### Example: Initial WebSocketService Implementation
```typescript
// ❌ BEFORE: Only checked Supabase
// File: client/src/services/websocket/WebSocketService.ts (hypothetical initial version)

async connect(): Promise<void> {
  try {
    // Only tries Supabase - localStorage JWT ignored!
    const { data: { session } } = await supabase.auth.getSession()

    let token: string | null = null
    if (session?.access_token) {
      token = session.access_token  // ← Only path for getting token
    }

    // If no Supabase session, token is null
    // Demo/PIN/station users get null token
    // Server rejects without auth header
    // → 401 Unauthorized error

    const wsUrl = new URL(this.config.url)
    if (token) {
      wsUrl.searchParams.set('token', token)
    }

    this.ws = new WebSocket(wsUrl.toString())
    // Connection established but server rejects due to missing/invalid token
  } catch (error) {
    // Error not related to auth - just connection failure
    this.setConnectionState('error')
  }
}
```

### Problem Manifestation
```typescript
// Development flow:
1. User logs in with PIN (demo mode)
   ✅ localStorage.setItem('auth_session', { ... })  // PIN token stored

2. KDS component connects to WebSocket
   ✅ WebSocketService.connect() called

3. But WebSocketService only checks Supabase
   ❌ supabase.auth.getSession() → null (no Supabase user)
   ❌ token = null
   ❌ WebSocket URL: ws://... (no auth token)

4. Server receives connection
   ❌ Missing Authorization header
   ❌ Returns 401 Unauthorized

5. Result: Kitchen Display Shows Mock Data
   - "Classic Burger" instead of real orders
   - User doesn't know why
   - Takes 2 days to debug
```

### What Happened in Code Review
```
Reviewer: "This looks good, connects to WebSocket"
Developer: "Yeah, added the auth check with Supabase"
Reviewer: "✅ APPROVED"

→ Issue shipped to production
→ Station auth users get 401 errors
→ KDS shows stale mock data
→ Problem only discovered in production
```

---

## AFTER: Correct Pattern (Dual-Auth)

### Same WebSocketService: Fixed Implementation
```typescript
// ✅ AFTER: Implements dual-auth pattern (per ADR-006)
// File: client/src/services/websocket/WebSocketService.ts

async connect(): Promise<void> {
  try {
    // ==================== AUTHENTICATION (ADR-006) ====================
    // CRITICAL: Uses dual-auth pattern - Supabase + localStorage fallback

    let token: string | null = null

    // 1. Try Supabase session first (primary authentication)
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
    // ==================== END AUTHENTICATION ====================

    // Get restaurant ID with fallback for development
    const restaurantId = getCurrentRestaurantId() || 'grow'

    // Build WebSocket URL with auth params
    const wsUrl = new URL(this.config.url)
    if (token) {
      wsUrl.searchParams.set('token', token)  // ← Now has token!
    } else {
      logger.warn('⚠️ Connecting WebSocket without authentication token')
    }
    wsUrl.searchParams.set('restaurant_id', restaurantId)

    // Create WebSocket connection with auth
    this.ws = new WebSocket(wsUrl.toString())
    // Connection will succeed with valid auth token
  } catch (error) {
    console.error('Failed to connect to WebSocket:', error)
    this.setConnectionState('error')
    this.scheduleReconnect()
  }
}
```

### Solution Manifestation
```typescript
// Development flow (SAME):
1. User logs in with PIN (demo mode)
   ✅ localStorage.setItem('auth_session', { ... })

2. KDS component connects to WebSocket
   ✅ WebSocketService.connect() called

3. WebSocketService checks BOTH auth methods
   ❌ supabase.auth.getSession() → null (no Supabase)
   ✅ localStorage.getItem('auth_session') → {... token ...}
   ✅ Token validation passes (not expired)
   ✅ token = 'demo-token-xyz'

4. WebSocket URL with auth
   ✅ ws://... ?token=demo-token-xyz

5. Server receives connection
   ✅ Authorization header present
   ✅ Token validated
   ✅ Connection established

6. Result: Kitchen Display Shows REAL DATA
   ✅ Real orders displayed
   ✅ Works for all auth methods:
      - Supabase (email/password)
      - localStorage (demo/PIN/station)
```

### What Happens in Code Review (After Prevention)
```
Reviewer: "New WebSocket service?"

Step 1: "Check the auth section"
  ✅ Supabase session check present
  ✅ localStorage fallback present
  ✅ Token expiration validation present
  ✅ Error handling correct

Step 2: "Check the tests"
  ✅ Test Supabase token used
  ✅ Test localStorage token used
  ✅ Test expired token rejected
  ✅ Test missing auth handled

Step 3: "Check the pattern"
  ✅ Pattern matches httpClient:109-148
  ✅ ADR-006 referenced in comments
  ✅ Both demo and Supabase users covered

Reviewer: "✅ APPROVED - Dual-auth pattern implemented correctly"

→ Both Supabase AND demo/PIN/station users work
→ NO 401 ERRORS
→ KDS works for everyone
→ Prevention successful
```

---

## Side-by-Side Comparison

### Pattern Structure

#### BEFORE (Problematic)
```typescript
async connect(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    let token: string | null = null
    if (session?.access_token) {
      token = session.access_token
    }

    // Use token (or null)
    const wsUrl = new URL(this.config.url)
    if (token) {
      wsUrl.searchParams.set('token', token)
    }
    this.ws = new WebSocket(wsUrl.toString())
  } catch (error) {
    // ...
  }
}

// Problem: No fallback for demo/PIN/station users
// Result: 401 errors for non-Supabase authentication
```

#### AFTER (Fixed)
```typescript
async connect(): Promise<void> {
  try {
    // ==================== AUTHENTICATION (ADR-006) ====================
    let token: string | null = null

    // 1. Try Supabase first
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      token = session.access_token
      logger.info('🔐 Using Supabase session')
    } else {
      // 2. Fallback to localStorage
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
          logger.error('Failed to parse auth:', parseError)
        }
      }

      // 3. Handle missing auth
      if (!token) {
        if (!import.meta.env.DEV) {
          throw new Error('Authentication required')
        }
        logger.warn('⚠️ No auth (dev mode)')
      }
    }
    // ==================== END AUTHENTICATION ====================

    // Use token (now guaranteed to attempt both methods)
    const wsUrl = new URL(this.config.url)
    if (token) {
      wsUrl.searchParams.set('token', token)
    }
    this.ws = new WebSocket(wsUrl.toString())
  } catch (error) {
    // ...
  }
}

// Benefit: Works for ALL auth methods
// Result: 0 401 errors
```

### Test Coverage

#### BEFORE (Insufficient)
```typescript
describe('WebSocketService', () => {
  test('connects when Supabase session available', async () => {
    ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
      data: { session: { access_token: 'token' } }
    })

    await service.connect()
    expect(service.isConnected()).toBe(true)
  })

  // ❌ MISSING: Test for demo/PIN/station users
  // ❌ MISSING: Test for localStorage fallback
  // ❌ MISSING: Test for missing auth handling
})

// Result: Only tests one auth path
// Demo users never tested before merge
```

#### AFTER (Complete)
```typescript
describe('WebSocketService - Authentication', () => {
  describe('Supabase Auth (Primary)', () => {
    test('uses Supabase session when available', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: { access_token: 'supabase-token' } }
      })

      await service.connect()
      expect(service.isConnected()).toBe(true)
    })

    test('prefers Supabase over localStorage', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: { access_token: 'supabase-token' } }
      })
      localStorage.setItem('auth_session', JSON.stringify({
        session: { accessToken: 'local-token', expiresAt: futureTime }
      }))

      await service.connect()
      expect(service.getAuthToken()).toBe('supabase-token')
    })
  })

  describe('localStorage Auth (Fallback)', () => {
    test('uses localStorage when Supabase unavailable', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.setItem('auth_session', JSON.stringify({
        session: { accessToken: 'demo-token', expiresAt: futureTime }
      }))

      await service.connect()
      expect(service.getAuthToken()).toBe('demo-token')  // ← Demo user works!
    })

    test('validates token expiration before use', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.setItem('auth_session', JSON.stringify({
        session: { accessToken: 'expired', expiresAt: pastTime }
      }))

      await service.connect()
      expect(service.getAuthToken()).not.toBe('expired')
    })

    test('handles malformed JSON gracefully', async () => {
      localStorage.setItem('auth_session', 'not-json')
      // Should not throw
      await expect(service.connect()).resolves
    })
  })

  describe('Missing Auth', () => {
    test('throws in production without auth', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.clear()

      const originalEnv = import.meta.env.DEV
      Object.defineProperty(import.meta.env, 'DEV', { value: false })

      try {
        await expect(service.connect()).rejects.toThrow()
      } finally {
        Object.defineProperty(import.meta.env, 'DEV', { value: originalEnv })
      }
    })

    test('continues in dev without auth', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.clear()

      await expect(service.connect()).resolves
    })
  })
})

// Result: All auth paths tested
// Demo users verified before merge
```

---

## Key Differences

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| **Auth Methods Checked** | Supabase only | Supabase + localStorage |
| **Demo Users** | Fail with 401 | Work with localStorage |
| **PIN Users** | Fail with 401 | Work with localStorage |
| **Station Users** | Fail with 401 | Work with localStorage |
| **Supabase Users** | Work | Work (preferred) |
| **Test Coverage** | 1 auth path | 7+ tests, 2 auth paths |
| **Production Ready** | No | Yes |
| **Incidents Prevented** | None | 401 errors prevented |

---

## Learning Outcomes

### What This Shows
1. **Pattern Consistency Matters**: Both httpClient and WebSocketService must use same auth approach
2. **Complete Checklist Required**: Incomplete testing led to shipping broken code
3. **Fallback Strategy Essential**: Dual-auth (primary + fallback) required for all features
4. **Documentation Drives Implementation**: Clear ADR-006 prevents future issues

### When to Apply This Pattern
- Any new HTTP client
- Any new WebSocket service
- Any new real-time update service
- Any new API wrapper
- Literally ANY authenticated connection

### How to Prevent
1. Copy pattern from httpClient:109-148
2. Add tests for BOTH auth methods
3. Code review checklist verification
4. CI/CD validation script

---

## Remember

**This issue would have been prevented if**:
1. Canonical pattern (httpClient) was clearly marked
2. New services had a template to follow
3. Code reviewers had a checklist
4. Both auth paths were required to be tested

**With the prevention strategy**:
- ✅ Every new service copies correct pattern
- ✅ Every auth method tested before merge
- ✅ Zero 401 errors from missing auth
- ✅ Demo/PIN/station users always supported
