# Lesson: Authentication & Multi-Tenancy Security Vulnerabilities

**Date:** 2025-11-10
**Severity:** CRITICAL
**Time to Find:** 5-7 days (across multiple incidents)
**Fix Complexity:** Varies (from 1 line to architectural changes)

---

## The Bug Patterns

### 1. Missing Tenant Validation Middleware

```typescript
// ❌ WRONG - No restaurant access validation
router.get('/auth/me', authenticate, (req, res) => {
  // User is authenticated but we never checked if they can access this restaurant
  // restaurantId from header is trusted blindly
  res.json({ user: req.user, role: req.role })
})
```

**Why It Breaks:**
- User logs in successfully
- Every API call after returns "Access Denied"
- No `restaurantId` attached to request
- Authorization checks fail because tenant context is missing

**Symptoms:**
- Login works but all workspace actions fail
- "Access Denied" for authenticated users
- Production blocker (P0)

---

### 2. Auth Race Condition - Dual State Management

```typescript
// ❌ WRONG - Race between manual logout and auth listener
const logout = async () => {
  setUser(null)  // React state cleared first
  await supabase.auth.signOut()  // Async call after
  // PROBLEM: onAuthStateChange might fire AFTER new login
}

useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      setUser(null)  // Clears user even if already logged in again
    }
  })
}, [])
```

**Why It Breaks:**
- User logs out, then immediately logs in
- Late-firing `SIGNED_OUT` event clears the new session
- User appears logged in but state is inconsistent
- Auto-closes modal and navigates to wrong page

---

### 3. Duplicate Login Flow Calls

```typescript
// ❌ WRONG - handleAccess called twice
const WorkspaceCard = () => {
  const onClick = () => handleAccess(workspace)  // First call

  const handleSuccess = () => {
    handleAccess(workspace)  // Second call with stale auth state
    navigate('/menu')
  }
}
```

**Why It Breaks:**
- First call triggers auth flow
- Second call runs with old state (race condition)
- Login API never actually called
- User navigated to public page without auth

---

## The Fixes

### 1. Add Missing Middleware

```typescript
// ✅ CORRECT - Always validate restaurant access
router.get('/auth/me',
  authenticate,  // Verify user is logged in
  validateRestaurantAccess,  // Verify user can access this restaurant
  (req, res) => {
    // Now req.restaurantId is validated and safe to use
    res.json({
      user: req.user,
      role: req.role,
      restaurantId: req.restaurantId
    })
  }
)
```

**Implementation:**
```typescript
// middleware/validateRestaurantAccess.ts
export const validateRestaurantAccess = async (req, res, next) => {
  const restaurantId = req.headers['x-restaurant-id']

  if (!restaurantId) {
    return res.status(400).json({ error: 'Restaurant ID required' })
  }

  // Verify user has access to this restaurant
  const hasAccess = await checkUserRestaurantAccess(req.user.id, restaurantId)

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this restaurant' })
  }

  req.restaurantId = restaurantId
  next()
}
```

---

### 2. Fix Auth Race Condition

```typescript
// ✅ CORRECT - Async cleanup BEFORE state changes
const logout = async () => {
  await supabase.auth.signOut()  // Async call FIRST
  setUser(null)  // React state AFTER
  // Now onAuthStateChange fires before any new login can happen
}

// Better: Avoid dual state management
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    // Single source of truth - session is canonical
    if (session) {
      setUser(session.user)
    } else {
      setUser(null)
    }
  })
}, [])

const logout = () => {
  // Let the listener handle state, just trigger the action
  supabase.auth.signOut()
}
```

---

### 3. Eliminate Duplicate Calls

```typescript
// ✅ CORRECT - Single call, proper navigation after auth
const WorkspaceCard = () => {
  const onClick = () => handleAccess(workspace)

  const handleSuccess = (result) => {
    // Navigation handled by auth context or callback
    // Don't call handleAccess again
    navigate(`/restaurant/${result.restaurantId}/menu`)
  }
}
```

---

## Key Lessons

### 1. Multi-Tenancy Requires Holistic Thinking
**Problem:** Partial implementations lead to serious bugs
- Adding new auth flow but forgetting one endpoint
- Not accounting for timing in state updates
- Missing middleware on a single route breaks entire feature

**Solution:**
- Check ALL entry points when adding auth changes
- Audit all API routes for consistent middleware
- Document the dual authentication pattern (ADR-006)

### 2. Preserve Intended Security Patterns
**Problem:** AI agents might remove "duplicate" auth code without understanding architecture

**Solution:**
- Maintain ADRs (Architecture Decision Records)
- ADR-006 documents dual auth pattern (normal vs PIN/demo)
- Never remove what looks like duplication without checking ADRs
- Security patterns are intentional, not bloat

### 3. Async State Transitions Are Dangerous
**Problem:** Race conditions in auth are hard to debug

**Prevention:**
- Avoid dual state management (manual + automatic)
- Choose ONE source of truth (the auth listener)
- Call async operations BEFORE state changes
- Add comprehensive logging for auth state transitions

### 4. Test the Complete Auth Flow
**Problem:** Individual components work but end-to-end flow breaks

**Solution:**
- E2E tests for login → workspace selection → authenticated action
- Test with demo users AND regular users (different ID formats)
- Verify middleware chain on all protected routes
- Check network calls to ensure API is actually invoked

---

## Quick Reference Card

### Auth Debugging Checklist

When auth fails mysteriously:
- [ ] Check that ALL endpoints have proper middleware chain
- [ ] Verify `authenticate` AND `validateRestaurantAccess` are present
- [ ] Look for race conditions in logout/login flows
- [ ] Check for duplicate function calls in success handlers
- [ ] Ensure async operations happen BEFORE state changes
- [ ] Review network tab - is the API actually being called?
- [ ] Test with both demo and regular users

### Multi-Tenant Middleware Pattern

```typescript
// Every protected endpoint needs both:
router.use('/api/protected-resource',
  authenticate,           // 1. Verify user identity
  validateRestaurantAccess,  // 2. Verify tenant access
  controller
)
```

### Auth State Management Pattern

```typescript
// ✅ Single source of truth
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    }
  )
  return () => subscription.unsubscribe()
}, [])

// ❌ Avoid manual state management
// Don't setUser() directly - let the listener handle it
```

---

## When to Reference This Lesson

**Symptoms:**
- ✅ Login succeeds but all actions return "Access Denied"
- ✅ User appears authenticated but has no permissions
- ✅ Auth works in demo mode but breaks in production
- ✅ Login modal closes but user isn't actually logged in
- ✅ Race conditions on logout → login → logout sequences
- ✅ Missing `restaurantId` in request context

**Error Messages:**
- "Access Denied" after successful login
- "Restaurant ID required"
- 403 Forbidden on authenticated endpoints
- Missing role/permissions in auth context

**Related Issues:**
- Multi-tenant context missing
- WebSocket auth loops
- Demo users breaking due to UUID constraints (see database-schema-mismatches.md)

---

## Prevention

### 1. Middleware Audit Script

```bash
# Find all protected routes
grep -r "router\." server/src/routes/

# Verify middleware chain
# Every route should have: authenticate, validateRestaurantAccess
```

### 2. Integration Tests

```typescript
// test/auth/restaurant-access.test.ts
describe('Restaurant Access Validation', () => {
  it('rejects requests without restaurant ID', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      // No X-Restaurant-ID header

    expect(response.status).toBe(400)
  })

  it('rejects unauthorized restaurant access', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Restaurant-ID', unauthorizedRestaurantId)

    expect(response.status).toBe(403)
  })

  it('allows authorized access', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Restaurant-ID', authorizedRestaurantId)

    expect(response.status).toBe(200)
    expect(response.body.restaurantId).toBe(authorizedRestaurantId)
  })
})
```

### 3. E2E Auth Flow Test

```typescript
// test/e2e/auth-flow.spec.ts
test('complete auth flow', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('[type=submit]')

  // Select workspace
  await page.click('[data-testid=workspace-card]')

  // Verify authenticated action works
  await page.goto('/menu')
  await expect(page.locator('[data-testid=menu-items]')).toBeVisible()

  // Verify network call was made
  const response = await page.waitForResponse('/api/auth/me')
  expect(response.status()).toBe(200)
})
```

### 4. ADR Awareness for AI Agents

```markdown
# When working with auth code, ALWAYS check:
- ADR-006: Dual Authentication Pattern (normal vs PIN/demo)
- Don't remove "duplicate" auth code without understanding why it exists
- Demo users use string IDs ("demo:server:xyz"), not UUIDs
- Both auth paths must be maintained for production
```

---

## Code Review Checklist

When reviewing auth changes:
- [ ] All new protected routes have `authenticate` middleware
- [ ] All new protected routes have `validateRestaurantAccess` middleware
- [ ] No early returns that skip middleware
- [ ] Async auth operations called BEFORE state changes
- [ ] No duplicate calls to auth functions in success handlers
- [ ] Integration tests for new auth endpoints
- [ ] E2E tests for new auth flows
- [ ] Demo user testing (string IDs) and regular user testing (UUIDs)
- [ ] ADR-006 dual auth pattern is preserved
- [ ] No auth race conditions in state management

---

## Related ADRs

- **ADR-006:** Dual Authentication Pattern (normal vs PIN/demo logins)
  - Both authentication methods must coexist
  - Demo users use different ID format
  - Removing "duplicate" code breaks critical flows

---

## Related Lessons

- [Database Schema Mismatches](./database-schema-mismatches.md) - Demo user UUID constraints
- [React Hydration Bug](./react-hydration-early-return-bug.md) - Modal closing issues

---

## TL;DR

**Problem:** Missing middleware, race conditions, duplicate calls in auth flows
**Solution:**
1. Always apply BOTH `authenticate` AND `validateRestaurantAccess` middleware
2. Async operations BEFORE state changes
3. Single source of truth for auth state
4. No duplicate function calls

**Remember:**
- Multi-tenancy needs tenant validation on EVERY protected endpoint
- One missing middleware breaks entire feature
- Race conditions are subtle - test logout → login → logout sequences
- ADR-006 dual auth pattern is intentional, not bloat

**Quick Fix Pattern:**
```typescript
// ✅ Complete middleware chain
router.use(authenticate, validateRestaurantAccess, handler)

// ✅ Async first, state second
await supabase.auth.signOut()
setUser(null)

// ✅ Single source of truth
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user || null)
  })
}, [])
```
