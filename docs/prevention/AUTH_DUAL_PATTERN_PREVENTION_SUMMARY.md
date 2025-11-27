# Prevention Strategies: WebSocket Dual-Auth Pattern Consistency

## Overview

This document summarizes prevention strategies for the dual-auth pattern consistency issue (CL-AUTH-002). When WebSocketService was created, it didn't implement the same dual-authentication pattern as httpClient, causing 401 failures for station auth users.

**Learning**: When ADR-006 specifies dual-auth (Supabase + localStorage JWT), ALL auth-requiring services must implement BOTH methods consistently.

---

## Prevention Strategies

### 1. Code Review Checklist

Every authenticated service must pass this checklist before merge:

```
AUTHENTICATION IMPLEMENTATION:
□ Dual-Auth Pattern Implemented
  □ Checks Supabase session first (supabase.auth.getSession())
  □ Falls back to localStorage if no Supabase
  □ Validates localStorage token expiration
  □ Handles JSON parse errors gracefully

□ Error Handling
  □ No silent auth failures
  □ Logs all auth attempts with logger (not console.log)
  □ Distinguishes dev mode vs production behavior

TESTING COVERAGE:
□ Test Supabase Auth Path
  □ Uses Supabase token when available
  □ Prefers Supabase over localStorage

□ Test localStorage Auth Path
  □ Uses localStorage token when Supabase unavailable
  □ Validates token expiration before use
  □ Handles parse errors gracefully

□ Test Missing Auth
  □ Throws in production
  □ Continues in development mode

□ Integration Tests
  □ Complete flow with Supabase auth works
  □ Complete flow with localStorage auth works
  □ Recovers from Supabase failure to localStorage

DOCUMENTATION:
□ Comments Explain Pattern
  □ References ADR-006
  □ Points to httpClient as canonical implementation
□ localStorage session format documented
□ Service integration points clear
```

**Key Insight**: The httpClient implementation (lines 109-148) is the canonical pattern. ANY new authenticated service should copy this structure verbatim.

---

### 2. Pattern Consistency Framework

#### Canonical Implementation
**Single Source of Truth**: `/client/src/services/http/httpClient.ts:109-148`

All authenticated services must follow this exact pattern:

```typescript
// 1. Try Supabase session first (primary authentication)
const { data: { session } } = await supabase.auth.getSession()
let token: string | null = null

if (session?.access_token) {
  token = session.access_token
  logger.info('🔐 Using Supabase session for [SERVICE_NAME]')
} else {
  // 2. Fallback to localStorage (for demo/PIN/station users per ADR-006)
  const savedSession = localStorage.getItem('auth_session')
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession)
      if (parsed.session?.accessToken && parsed.session?.expiresAt) {
        // CRITICAL: Check expiration
        if (parsed.session.expiresAt > Date.now() / 1000) {
          token = parsed.session.accessToken
          logger.info('🔐 Using localStorage session (demo/PIN/station)')
        } else {
          logger.warn('⚠️ localStorage session token expired')
        }
      }
    } catch (parseError) {
      logger.error('Failed to parse auth session:', parseError)
    }
  }

  // 3. Handle missing auth appropriately
  if (!token) {
    if (import.meta.env.DEV) {
      logger.warn('⚠️ No authentication available (dev mode)')
    } else {
      logger.error('❌ No authentication available')
      throw new Error('Authentication required')
    }
  }
}
```

#### Pattern Validation
Create `/scripts/validate-auth-patterns.sh` to detect services missing this pattern:

```bash
#!/bin/bash
# Find all *Service/*Client classes and check for dual-auth pattern

grep -r "export class.*Service\|export class.*Client" client/src/services --include="*.ts" | \
  grep -v httpClient | grep -v WebSocketService | \
  while read file classname; do
    filepath="${file%:*}"

    # Check if file makes API calls
    if grep -q "fetch\|httpClient\|apiCall\|WebSocket" "$filepath"; then
      # Check if file has dual-auth pattern
      if ! grep -q "supabase.auth.getSession\|localStorage.getItem('auth_session')" "$filepath"; then
        echo "⚠️ WARNING: $filepath might need dual-auth pattern"
      fi
    fi
  done
```

#### Service Template
Create `/client/src/services/_SERVICE_TEMPLATE.ts` showing the correct pattern with clear markers:

```typescript
/**
 * SERVICE_NAME - Demonstrates correct dual-auth pattern
 * Reference: ADR-006, CL-AUTH-002, /client/src/services/http/httpClient.ts:109-148
 */

export class ServiceName {
  // ==================== AUTHENTICATION (ADR-006) ====================
  // CRITICAL: All authenticated services MUST implement dual-auth

  private async authenticate(): Promise<string> {
    // 1. Try Supabase (primary)
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      logger.info('🔐 Using Supabase token')
      return session.access_token
    }

    // 2. Try localStorage (fallback for demo/PIN/station)
    const savedSession = localStorage.getItem('auth_session')
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        if (parsed.session?.accessToken && parsed.session?.expiresAt) {
          if (parsed.session.expiresAt > Date.now() / 1000) {
            logger.info('🔐 Using localStorage token')
            return parsed.session.accessToken
          }
        }
      } catch (parseError) {
        logger.error('Failed to parse auth:', parseError)
      }
    }

    // 3. Handle missing auth
    if (!import.meta.env.DEV) {
      throw new Error('Authentication required')
    }

    logger.warn('⚠️ No auth (dev mode)')
    return ''
  }
  // ==================== END AUTHENTICATION ====================

  // Rest of service implementation...
}
```

---

### 3. Testing Strategy

Every authenticated service MUST have comprehensive test coverage for both auth paths:

```typescript
describe('ServiceName - Authentication (ADR-006)', () => {
  describe('Supabase Auth (Primary)', () => {
    test('uses Supabase token when available', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: { access_token: 'supabase-token' } }
      })

      const token = await service.authenticate()
      expect(token).toBe('supabase-token')
    })

    test('prefers Supabase over localStorage', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: { access_token: 'supabase-token' } }
      })

      localStorage.setItem('auth_session', JSON.stringify({
        session: { accessToken: 'local-token', expiresAt: futureTime }
      }))

      const token = await service.authenticate()
      expect(token).toBe('supabase-token') // Supabase takes priority
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

      const token = await service.authenticate()
      expect(token).toBe('demo-token')
    })

    test('rejects expired tokens', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })

      localStorage.setItem('auth_session', JSON.stringify({
        session: { accessToken: 'expired', expiresAt: pastTime }
      }))

      const token = await service.authenticate()
      expect(token).not.toBe('expired')
    })

    test('handles malformed JSON gracefully', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })

      localStorage.setItem('auth_session', 'not-valid-json')

      // Should not throw
      await expect(service.authenticate()).resolves
    })
  })

  describe('Missing Auth Handling', () => {
    test('throws in production when no auth available', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.clear()

      const originalEnv = import.meta.env.DEV
      Object.defineProperty(import.meta.env, 'DEV', { value: false })

      try {
        await expect(service.authenticate()).rejects.toThrow('Authentication required')
      } finally {
        Object.defineProperty(import.meta.env, 'DEV', { value: originalEnv })
      }
    })

    test('continues in dev when no auth available', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null }
      })
      localStorage.clear()

      // Should not throw in dev
      const token = await service.authenticate()
      expect(typeof token).toBe('string')
    })
  })
})
```

---

### 4. Integration Safeguards

#### PR Template Addition
Add to `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Authentication

- [ ] No new authenticated services added, OR
- [ ] New service implements dual-auth pattern (Supabase + localStorage)
  - [ ] Supabase session checked first
  - [ ] localStorage fallback implemented
  - [ ] Token expiration validated
  - [ ] Comprehensive auth tests added
  - [ ] References ADR-006 in comments

See: [CL-AUTH-002](/.claude/lessons/CL-AUTH-002-websocket-dual-auth-prevention.md)
```

#### Continuous Integration
Add validation to CI/CD pipeline:

```bash
# scripts/check-auth-patterns.sh
#!/bin/bash

echo "Checking authentication patterns..."

# Find services making API calls without dual-auth
VIOLATIONS=$(grep -r "export class.*Service\|export class.*Client" \
  client/src/services --include="*.ts" | \
  grep -v httpClient | grep -v WebSocketService | \
  while read file classname; do
    filepath="${file%:*}"
    if grep -q "fetch\|httpClient" "$filepath"; then
      if ! grep -q "supabase.auth.getSession\|localStorage.getItem" "$filepath"; then
        echo "$filepath"
      fi
    fi
  done)

if [ ! -z "$VIOLATIONS" ]; then
  echo "❌ FAILED: Services missing dual-auth pattern:"
  echo "$VIOLATIONS"
  exit 1
fi

echo "✓ Auth pattern check passed"
```

#### Documentation Updates
Every service must include:

1. **Inline Comments**: Line 1-5 of auth section references ADR-006
2. **Architecture Doc**: Add entry to `/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`
3. **Service README**: Document which auth methods are supported
4. **Test README**: Explain how to test both auth paths

---

## Implementation Timeline

### Week 1: Immediate Actions
- [ ] Create `/client/src/services/_SERVICE_TEMPLATE.ts`
- [ ] Create validation script `/scripts/validate-auth-patterns.sh`
- [ ] Update PR template with auth checklist
- [ ] Add to lessons index: `/. claude/lessons/README.md`

### Week 2: Tooling & Training
- [ ] Create `AUTH_PATTERN_QUICK_REFERENCE.md` (5-min guide)
- [ ] Train reviewers on dual-auth requirements
- [ ] Add auth pattern check to CI/CD
- [ ] Create test template in wiki

### Week 3: Documentation
- [ ] Update AUTHENTICATION_ARCHITECTURE.md
- [ ] Create "Adding New Services" guide
- [ ] Update onboarding documentation
- [ ] Add troubleshooting guide for auth failures

### Ongoing: Monitoring
- [ ] Track 401 errors (should stay near 0)
- [ ] Monitor test coverage (must be >80% for auth)
- [ ] Alert on pattern violations detected by script
- [ ] Quarterly review of auth implementation across services

---

## Success Criteria

- **100%** of authenticated services pass dual-auth checklist
- **100%** of auth tests passing (both Supabase and localStorage)
- **0** 401 errors caused by missing auth pattern
- **<2 days** to implement auth in new service
- **New services** reference correct pattern and pass review

---

## Reference Documents

| Document | Purpose | Location |
|----------|---------|----------|
| Architecture Decision | Why dual-auth exists | `/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md` |
| Implementation Lesson | Prevention strategies | `/. claude/lessons/CL-AUTH-002-websocket-dual-auth-prevention.md` |
| Quick Reference | 5-minute implementation guide | `/. claude/lessons/AUTH_PATTERN_QUICK_REFERENCE.md` |
| Canonical Code | Copy-paste template | `/client/src/services/http/httpClient.ts:109-148` |
| Working Reference | Another example | `/client/src/services/websocket/WebSocketService.ts:86-126` |
| Architecture Doc | System overview | `/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md` |

---

## Related Incidents

- **CL-AUTH-001**: STRICT_AUTH drift (httpClient only checked Supabase initially)
- **CL-WS-001**: WebSocket handler timing race (affected message delivery)

---

## Approval & Sign-Off

**Created**: 2025-11-27
**Status**: ACCEPTED - Prevention Strategy Active
**Owner**: Technical Lead
**Review Date**: After first new authenticated service implementation

When this strategy proves effective (3+ services implemented with zero dual-auth issues), promote to PROVEN status.
