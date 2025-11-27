# CL-AUTH-002: WebSocket Dual-Auth Pattern Consistency Prevention

**Severity:** P1 | **Type:** Pattern Consistency | **Related:** [ADR-006](../../docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md), [CL-AUTH-001](./CL-AUTH-001-strict-auth-drift.md)

---

## Prevention Strategies

### 1. Code Review Checklist for New Authenticated Services

When adding any new service that requires authentication (HTTP client, WebSocket, API wrapper, real-time service, etc.), reviewers MUST verify:

#### Authentication Implementation
- [ ] **Dual-Auth Pattern Implemented**: Service checks BOTH Supabase session AND localStorage session
- [ ] **Supabase First**: Primary auth attempts `supabase.auth.getSession()` first
- [ ] **localStorage Fallback**: Secondary auth reads from `localStorage.getItem('auth_session')`
- [ ] **Token Validation**: localStorage tokens checked for expiration before use
  - Validates `parsed.session?.accessToken` exists
  - Validates `parsed.session?.expiresAt > Date.now() / 1000`
- [ ] **Error Handling**: Gracefully handles parse errors from localStorage
  - Uses try-catch around `JSON.parse()`
  - Logs errors with `logger.error()`, never silent failures
- [ ] **Dev Mode Fallback**: Handles missing auth gracefully in dev mode

#### Implementation Location
- [ ] **Authentication Logic Isolated**: All auth-related code in a single, obvious location
  - For httpClient: lines 109-148
  - For WebSocketService: lines 86-126
  - For new services: Create a clearly-marked "Authentication" section at top of request/connect methods
- [ ] **Pattern Follows httpClient Template**: Code structure matches `/client/src/services/http/httpClient.ts:109-148`
- [ ] **No Silent Auth Failures**: If auth unavailable, either:
  - Request still sent (will get 401 from backend) - for dev mode
  - Error thrown before request - for production mode

#### Testing Coverage
- [ ] **Supabase Auth Test**: Service correctly uses Supabase token when available
- [ ] **localStorage Auth Test**: Service correctly uses localStorage token when Supabase unavailable
- [ ] **Token Expiry Test**: Service rejects expired localStorage tokens
- [ ] **Missing Auth Test**: Service handles missing auth appropriately for environment
- [ ] **Integration Test**: Both auth methods work end-to-end
  - Test with Supabase token
  - Test with localStorage token
  - Test with expired token
  - Test with missing token (dev mode vs production)

#### Documentation
- [ ] **Comments Explain Pattern**: Comment block above auth section references ADR-006
- [ ] **localStorage Session Format Documented**: Comments show expected structure:
  ```typescript
  // localStorage session structure:
  // {
  //   user: { id, role, scopes },
  //   session: { accessToken, expiresAt, expiresIn },
  //   restaurantId
  // }
  ```
- [ ] **Reference to httpClient**: Comments direct developers to httpClient as the canonical implementation
- [ ] **No "demo only" shortcuts**: Implementation treats both auth methods as equally supported

---

### 2. Pattern Consistency Framework

To prevent future drift, implement these consistency measures:

#### Canonical Pattern Location
**Single Source of Truth**: `/client/src/services/http/httpClient.ts:109-148`

All new authenticated services MUST copy this exact pattern:

```typescript
// ✅ CANONICAL PATTERN - Use this in all authenticated services

async connect(): Promise<void> {
  // 1. Try Supabase session first (primary auth)
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token) {
    token = session.access_token
    logger.info('🔐 Using Supabase session for [SERVICE_NAME]')
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
            logger.info('🔐 Using localStorage session token (demo/PIN/station) for [SERVICE_NAME]')
          } else {
            logger.warn('⚠️ localStorage session token expired for [SERVICE_NAME]')
          }
        }
      } catch (parseError) {
        logger.error('Failed to parse localStorage auth session for [SERVICE_NAME]:', parseError)
      }
    }

    // 3. Handle missing auth based on environment
    if (!token) {
      if (import.meta.env.DEV) {
        logger.warn('⚠️ [SERVICE_NAME] connecting without authentication (dev mode)')
      } else {
        logger.error('❌ No authentication available for [SERVICE_NAME]')
        throw new Error('Authentication required for [SERVICE_NAME]')
      }
    }
  }
}
```

#### Shared Auth Utility (Recommended for Phase 2)
Create `/client/src/services/auth/getAuthToken.ts`:

```typescript
/**
 * Get authentication token using dual-auth pattern (ADR-006)
 * Returns token from Supabase (primary) or localStorage (fallback)
 *
 * Usage: const token = await getAuthToken('service-name')
 */
export async function getAuthToken(serviceName: string): Promise<string | null> {
  // Try Supabase first
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    logger.info(`🔐 Using Supabase session for ${serviceName}`)
    return session.access_token
  }

  // Fallback to localStorage
  const savedSession = localStorage.getItem('auth_session')
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession)
      if (parsed.session?.accessToken && parsed.session?.expiresAt) {
        if (parsed.session.expiresAt > Date.now() / 1000) {
          logger.info(`🔐 Using localStorage session for ${serviceName}`)
          return parsed.session.accessToken
        } else {
          logger.warn(`⚠️ localStorage session token expired for ${serviceName}`)
        }
      }
    } catch (parseError) {
      logger.error(`Failed to parse localStorage auth session for ${serviceName}:`, parseError)
    }
  }

  // Handle missing auth
  if (!import.meta.env.DEV) {
    logger.error(`❌ No authentication available for ${serviceName}`)
    throw new Error(`Authentication required for ${serviceName}`)
  }

  logger.warn(`⚠️ ${serviceName} connecting without authentication (dev mode)`)
  return null
}
```

#### Service Template
Create `/client/src/services/_SERVICE_TEMPLATE.ts` showing correct pattern:

```typescript
/**
 * NEW_SERVICE Implementation Template
 * This file demonstrates the correct dual-auth pattern for all authenticated services.
 *
 * Required Pattern: Check Supabase session first, then localStorage fallback
 * Reference: ADR-006 (docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
 * Canonical Implementation: client/src/services/http/httpClient.ts:109-148
 */

export class NewService {
  async makeAuthenticatedRequest(): Promise<void> {
    // STEP 1: Try Supabase session (primary authentication)
    const { data: { session } } = await supabase.auth.getSession()
    let token: string | null = null

    if (session?.access_token) {
      token = session.access_token
      logger.info('🔐 Using Supabase session for NewService')
    } else {
      // STEP 2: Fallback to localStorage (for demo/PIN/station users)
      const savedSession = localStorage.getItem('auth_session')
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession)
          if (parsed.session?.accessToken && parsed.session?.expiresAt) {
            // CRITICAL: Check expiration time
            if (parsed.session.expiresAt > Date.now() / 1000) {
              token = parsed.session.accessToken
              logger.info('🔐 Using localStorage session for NewService')
            } else {
              logger.warn('⚠️ localStorage session token expired')
            }
          }
        } catch (parseError) {
          logger.error('Failed to parse localStorage auth session:', parseError)
        }
      }
    }

    // STEP 3: Handle missing auth appropriately
    if (!token) {
      if (import.meta.env.DEV) {
        logger.warn('⚠️ NewService connecting without authentication (dev mode)')
      } else {
        logger.error('❌ No authentication available')
        throw new Error('Authentication required')
      }
    }

    // Make request with token
    // ...
  }
}
```

#### Pattern Validation Script
Create `/scripts/validate-auth-patterns.sh`:

```bash
#!/bin/bash
# Detect services that might be missing dual-auth pattern

echo "Scanning for new authenticated services..."

# Find all classes named *Service or *Client that don't have dual-auth pattern
grep -r "export class.*Service\|export class.*Client" client/src/services --include="*.ts" | \
  while read file classname; do
    filepath="${file%:*}"

    # Skip known implemented services
    if [[ "$filepath" == *httpClient* ]] || [[ "$filepath" == *WebSocketService* ]]; then
      continue
    fi

    # Check if file has dual-auth pattern
    if ! grep -q "supabase.auth.getSession\|localStorage.getItem('auth_session')" "$filepath"; then
      # Check if file makes API calls
      if grep -q "fetch\|httpClient\|apiCall" "$filepath"; then
        echo "⚠️ WARNING: $filepath might need dual-auth pattern"
        echo "   Found API calls but no dual-auth pattern detected"
        echo "   Review and add pattern if needed"
      fi
    fi
  done

echo "Done!"
```

---

### 3. Testing Strategy for Dual-Auth Methods

Ensure every authenticated service has comprehensive test coverage for both auth methods:

#### Test Structure Template

```typescript
import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { YourService } from './YourService'
import { supabase } from '@/core/supabase'

vi.mock('@/core/supabase')

describe('YourService - Authentication', () => {
  let service: YourService

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
    service = new YourService()
  })

  describe('Supabase Auth (Primary Method)', () => {
    test('uses Supabase session when available', async () => {
      // Setup: Mock Supabase session
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: {
          session: {
            access_token: 'supabase-token-xyz'
          }
        }
      })

      await service.connect()

      // Assert: Supabase token was used
      expect(service.getAuthToken()).toBe('supabase-token-xyz')
    })

    test('prefers Supabase even when localStorage has token', async () => {
      // Setup: Both auth methods available
      const supabaseToken = 'supabase-token-xyz'
      const localToken = 'local-token-abc'

      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: {
          session: {
            access_token: supabaseToken
          }
        }
      })

      localStorage.setItem('auth_session', JSON.stringify({
        session: {
          accessToken: localToken,
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
      }))

      await service.connect()

      // Assert: Supabase token takes priority
      expect(service.getAuthToken()).toBe(supabaseToken)
    })
  })

  describe('localStorage Auth (Fallback Method)', () => {
    test('uses localStorage token when Supabase unavailable', async () => {
      // Setup: No Supabase session
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })

      const localToken = 'demo-token-12345'
      localStorage.setItem('auth_session', JSON.stringify({
        session: {
          accessToken: localToken,
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
      }))

      await service.connect()

      // Assert: localStorage token used
      expect(service.getAuthToken()).toBe(localToken)
    })

    test('validates token expiration before using', async () => {
      // Setup: Expired localStorage token
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })

      const expiredToken = 'expired-token-xyz'
      localStorage.setItem('auth_session', JSON.stringify({
        session: {
          accessToken: expiredToken,
          expiresAt: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        }
      }))

      await service.connect()

      // Assert: Expired token rejected
      expect(service.getAuthToken()).toBeNull()
    })

    test('handles malformed localStorage JSON gracefully', async () => {
      // Setup: Invalid JSON in localStorage
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })

      localStorage.setItem('auth_session', 'not-valid-json{]')

      // Should not throw
      await expect(service.connect()).resolves.not.toThrow()

      // And should handle missing auth appropriately
      const token = service.getAuthToken()
      expect(token).toBeNull() // or appropriate dev mode behavior
    })

    test('requires accessToken AND expiresAt fields', async () => {
      // Setup: localStorage missing expiresAt
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })

      localStorage.setItem('auth_session', JSON.stringify({
        session: {
          accessToken: 'token-xyz'
          // Missing expiresAt
        }
      }))

      await service.connect()

      // Assert: Token rejected because expiresAt missing
      expect(service.getAuthToken()).toBeNull()
    })
  })

  describe('Missing Auth Handling', () => {
    test('throws in production when no auth available', async () => {
      // Setup: No auth
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.clear()

      // Mock production environment
      const originalEnv = import.meta.env.DEV
      Object.defineProperty(import.meta.env, 'DEV', { value: false })

      try {
        // Should throw in production
        await expect(service.connect()).rejects.toThrow('Authentication required')
      } finally {
        Object.defineProperty(import.meta.env, 'DEV', { value: originalEnv })
      }
    })

    test('continues in development when no auth available', async () => {
      // Setup: No auth
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.clear()

      // Should not throw in dev mode
      await expect(service.connect()).resolves.not.toThrow()
    })
  })

  describe('Integration: E2E Auth Flows', () => {
    test('complete flow with Supabase auth', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: {
          session: { access_token: 'token-xyz' }
        }
      })

      // Should connect and use Supabase
      await service.connect()
      expect(service.isConnected()).toBe(true)
    })

    test('complete flow with localStorage auth', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })

      localStorage.setItem('auth_session', JSON.stringify({
        session: {
          accessToken: 'demo-token',
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
      }))

      // Should connect and use localStorage
      await service.connect()
      expect(service.isConnected()).toBe(true)
    })

    test('recovers from Supabase failure to localStorage fallback', async () => {
      // Setup: Supabase throws, but localStorage has token
      ;(supabase.auth.getSession as vi.Mock).mockRejectedValue(
        new Error('Supabase unavailable')
      )

      localStorage.setItem('auth_session', JSON.stringify({
        session: {
          accessToken: 'fallback-token',
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
      }))

      // Should still work with localStorage
      await service.connect()
      expect(service.isConnected()).toBe(true)
      expect(service.getAuthToken()).toBe('fallback-token')
    })
  })
})
```

#### Test Execution Checklist
Before merging any authenticated service, run:

```bash
# Run authentication-specific tests
npm run test:auth

# Run full test suite including auth
npm run test

# Run E2E tests with both auth methods
npm run test:e2e

# Validate auth patterns
./scripts/validate-auth-patterns.sh

# Check for console.log (forbidden, use logger)
grep -r "console\.log\|console\.error" client/src/services --include="*.ts" | \
  grep -v "// console\." || echo "✓ No console usage found"
```

---

### 4. Integration Safeguards

#### Environment Variable Validation
Add to `/server/src/middleware/validateAuthConfig.ts`:

```typescript
export function validateAuthConfig() {
  const config = {
    strictAuth: process.env.STRICT_AUTH === 'true',
    jwtSecret: process.env.KIOSK_JWT_SECRET,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY,
  }

  // Validate production requirements
  if (process.env.NODE_ENV === 'production') {
    if (!config.jwtSecret) {
      throw new Error('CRITICAL: KIOSK_JWT_SECRET not set in production')
    }
  }

  logger.info('Auth config validated:', {
    strictAuth: config.strictAuth,
    hasJwtSecret: !!config.jwtSecret,
    hasSupabaseUrl: !!config.supabaseUrl,
    hasSupabaseKey: !!config.supabaseKey,
  })
}
```

#### Documentation Requirements
Every new authenticated service MUST include:

1. **Inline Comments**: Reference ADR-006 and httpClient pattern
2. **README Section**: Document auth method being used
3. **Test README**: Explain test structure and how to add new auth tests
4. **Architecture Doc**: Update `/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`

---

## Implementation Rollout

### Phase 1: Code Review Process (Immediate)
- [ ] Add checklist to PR template
- [ ] Train reviewers on dual-auth requirements
- [ ] Create reusable PR comment template for auth issues

### Phase 2: Tooling & Templates (Week 1)
- [ ] Create `/client/src/services/_SERVICE_TEMPLATE.ts`
- [ ] Create validation script `/scripts/validate-auth-patterns.sh`
- [ ] Create test template in wiki or docs

### Phase 3: Shared Utility (Week 2-3)
- [ ] Refactor `getAuthToken()` into shared utility
- [ ] Update httpClient to use shared utility (optional refactoring)
- [ ] Update WebSocketService to use shared utility (optional refactoring)

### Phase 4: Documentation (Ongoing)
- [ ] Update ADR-006 with checklist reference
- [ ] Create "Adding New Authenticated Services" guide
- [ ] Add to onboarding documentation

---

## Monitoring & Metrics

### Alert Triggers
- **Test Coverage Alert**: New service with <80% auth test coverage
- **Pattern Violation Alert**: Service making API calls without dual-auth pattern
- **Auth Failure Spike**: >1% 401 errors in production (indicates missing auth in new service)

### Success Metrics
- **100%** of authenticated services pass dual-auth checklist
- **100%** of auth tests passing (both Supabase and localStorage)
- **Zero** 401 errors caused by missing auth pattern
- **<2 days** to implement auth in new service

---

## References

- **ADR-006**: [Dual Authentication Pattern](../../docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
- **CL-AUTH-001**: [STRICT_AUTH Environment Drift](./CL-AUTH-001-strict-auth-drift.md)
- **Canonical Implementation**: `/client/src/services/http/httpClient.ts:109-148`
- **WebSocket Reference**: `/client/src/services/websocket/WebSocketService.ts:86-126`
- **Test Examples**: `/client/src/services/websocket/WebSocketService.test.ts`

---

## Sign-Off

**Created**: 2025-11-27
**Status**: ACCEPTED - Implementation Prevention Strategy
**Owner**: Technical Lead
**Next Review**: After first new authenticated service implemented

When this lesson is proven effective (3+ new authenticated services added without dual-auth issues), mark as PROVEN.
