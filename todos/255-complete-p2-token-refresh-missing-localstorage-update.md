---
status: pending
priority: p2
issue_id: 255
tags: [code-review, auth, security, bug]
dependencies: []
---

# Token Refresh Does Not Update localStorage

## Problem Statement

When a token is refreshed via `refreshSession()` in AuthContext.tsx, the new token is stored in React state but NOT updated in localStorage. This creates token drift where:
1. User logs in, token stored in React state AND localStorage
2. Token refreshes 5 minutes before expiry, only React state updated
3. User refreshes page, React state lost
4. httpClient uses OLD token from localStorage
5. Potential 401 errors if old token has expired

## Findings

**Agent:** architecture-strategist

**Location:** `/client/src/contexts/AuthContext.tsx:434-451`

```typescript
const refreshSession = useCallback(async () => {
  // ...
  setSession({
    accessToken: response.session.access_token,
    refreshToken: response.session.refresh_token,
    expiresIn: response.session.expires_in,
    expiresAt
  });
  // localStorage.setItem('auth_session', ...) <-- MISSING!
});
```

**Impact:**
- Users may experience intermittent 401 errors after long sessions
- Token drift between React state and localStorage
- Worse UX on page refresh after token refresh

## Proposed Solutions

### Solution 1: Add localStorage update in refreshSession (Recommended)

**Pros:**
- Simple fix, minimal code change
- Maintains consistency with login flow
- No breaking changes

**Cons:**
- None significant

**Effort:** Small (15 min)
**Risk:** Low

```typescript
const refreshSession = useCallback(async () => {
  // ... existing code ...

  const sessionData = {
    accessToken: response.session.access_token,
    refreshToken: response.session.refresh_token,
    expiresIn: response.session.expires_in,
    expiresAt
  };

  setSession(sessionData);

  // FIX: Update localStorage to match React state
  const savedSession = localStorage.getItem('auth_session');
  if (savedSession) {
    const parsed = JSON.parse(savedSession);
    localStorage.setItem('auth_session', JSON.stringify({
      ...parsed,
      session: sessionData
    }));
  }
});
```

### Solution 2: Create utility function for auth storage sync

**Pros:**
- DRY - single source of truth for auth storage
- Easier to maintain and test

**Cons:**
- More refactoring needed
- Higher risk of introducing bugs

**Effort:** Medium (1 hour)
**Risk:** Medium

## Recommended Action

Implement Solution 1 - simple localStorage update in refreshSession.

## Technical Details

**Affected Files:**
- `client/src/contexts/AuthContext.tsx`

**Components:**
- AuthProvider
- refreshSession callback

## Acceptance Criteria

- [ ] Token refresh updates localStorage
- [ ] Page refresh after token refresh uses new token
- [ ] No 401 errors during long sessions with token refreshes
- [ ] Unit test added for localStorage sync

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-31 | Identified during code review | Token drift risk in dual-storage pattern |

## Resources

- PR: Current uncommitted changes to auth.routes.ts
- ADR-006: Dual authentication pattern
