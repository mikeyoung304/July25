# Authentication Development Guide

> **Critical**: This guide incorporates lessons from the 10-day JWT scope bug incident. Follow these guidelines to prevent authentication failures.

## Table of Contents

1. [JWT Payload Requirements](#jwt-payload-requirements)
2. [Common Pitfalls and Prevention](#common-pitfalls-and-prevention)
3. [Development Checklist](#development-checklist)
4. [Testing Requirements](#testing-requirements)
5. [Debugging Authentication Issues](#debugging-authentication-issues)
6. [Migration and Refactoring](#migration-and-refactoring)

---

## JWT Payload Requirements

### Mandatory Fields

Every JWT token MUST include these fields. Missing any field will cause authorization failures:

```typescript
interface JWTPayload {
  sub: string;           // User ID (UUID)
  email: string;         // User email
  role: string;          // User role (server, kitchen, manager, etc.)
  scope: string[];       // ⚠️ CRITICAL: Permission scopes
  restaurant_id: string; // Restaurant UUID
  auth_method: 'email' | 'pin';
  iat: number;          // Issued at
  exp: number;          // Expiration
}
```

### Creating JWTs (Correct Pattern)

```typescript
// ✅ CORRECT: Include all required fields
async function createToken(user: User): Promise<string> {
  // ALWAYS fetch scopes from database
  const { data: scopesData } = await supabase
    .from('role_scopes')
    .select('scope')
    .eq('role', user.role);

  const scopes = scopesData?.map(s => s.scope) || [];

  // Create payload with ALL required fields
  const payload: Required<JWTPayload> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    scope: scopes,  // ⚠️ NEVER FORGET THIS FIELD
    restaurant_id: user.restaurant_id,
    auth_method: 'email',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
  };

  return jwt.sign(payload, process.env.JWT_SECRET);
}
```

### Common Mistakes to Avoid

```typescript
// ❌ WRONG: Missing scope field
const payload = {
  sub: user.id,
  role: user.role
  // Missing 'scope' - will cause all RBAC checks to fail!
};

// ❌ WRONG: Using Supabase token directly
const token = supabase.auth.session.access_token;
// Supabase tokens don't have custom fields like 'scope'

// ❌ WRONG: Split brain architecture
res.json({
  user: { scopes: ['orders:create'] },  // Response has scopes
  token: jwt.sign({ sub, role })        // Token doesn't!
});
```

---

## Common Pitfalls and Prevention

### 1. The "Split Brain" Anti-Pattern

**Problem**: Response body contains different data than JWT token.

```typescript
// ❌ ANTI-PATTERN: Split Brain
const token = jwt.sign({ sub, role });  // No scopes
const scopes = await fetchScopes(role);  // Has scopes

res.json({
  token,                // Missing scopes
  user: { scopes }     // Has scopes
});

// Client sees scopes, server validates empty []
```

**Solution**: Single source of truth

```typescript
// ✅ CORRECT: Consistent data
const scopes = await fetchScopes(role);
const token = jwt.sign({ sub, role, scope: scopes });

res.json({
  token,
  user: { scopes }  // Same data as token
});
```

### 2. Fallback Logic Masks Bugs

**Problem**: Fallback to database queries hides missing JWT fields.

```typescript
// ❌ BAD: Fallback hides the bug
if (!req.user.scopes || req.user.scopes.length === 0) {
  // This masks that JWT is missing scopes
  req.user.scopes = await fetchFromDatabase(req.user.role);
}
```

**Solution**: Fail fast on missing data

```typescript
// ✅ GOOD: Fail immediately
if (!req.user.scopes) {
  throw new Error('JWT missing required scope field');
}
```

### 3. Testing Response Instead of Token

**Problem**: Tests check response body but not JWT structure.

```typescript
// ❌ INCOMPLETE: Only tests response
expect(response.body.user.scopes).toBeDefined();
// JWT might still be missing scopes!
```

**Solution**: Test both response AND token

```typescript
// ✅ COMPLETE: Test both
expect(response.body.user.scopes).toBeDefined();

const decoded = jwt.decode(response.body.token);
expect(decoded.scope).toBeDefined();
expect(decoded.scope).toEqual(response.body.user.scopes);
```

---

## Development Checklist

### Before Writing Auth Code

- [ ] Read [ADR-010: JWT Payload Standards](../../explanation/architecture-decisions/ADR-010-jwt-payload-standards.md)
- [ ] Review recent auth incidents in `/docs/postmortems/`
- [ ] Understand the role_scopes table structure
- [ ] Know which endpoints require which scopes

### When Modifying Authentication

- [ ] Document JWT payload changes in comments
- [ ] Update TypeScript interfaces for JWT
- [ ] Add/update integration tests
- [ ] Test full flow: Login → Store token → Protected endpoint
- [ ] Verify JWT structure with decoder
- [ ] Check for split brain patterns
- [ ] Remove any fallback logic
- [ ] Log all auth failures with context

### Before Committing

- [ ] Run ESLint rule `jwt-payload-completeness`
- [ ] Decode a sample JWT and verify all fields
- [ ] Run integration tests
- [ ] Test with different user roles
- [ ] Verify no 401 errors in console

### Code Review Checklist

- [ ] JWT includes `scope` field
- [ ] Response body matches JWT content
- [ ] No fallback to database for scopes
- [ ] Integration tests decode and validate JWT
- [ ] Error messages are descriptive
- [ ] Changes documented in code comments

---

## Testing Requirements

### Unit Tests

```typescript
describe('JWT Creation', () => {
  it('includes all required fields', () => {
    const token = createToken(mockUser);
    const decoded = jwt.decode(token);

    expect(decoded).toHaveProperty('sub');
    expect(decoded).toHaveProperty('email');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('scope');  // Critical!
    expect(decoded).toHaveProperty('restaurant_id');
  });

  it('scope field is an array', () => {
    const token = createToken(mockUser);
    const decoded = jwt.decode(token);

    expect(Array.isArray(decoded.scope)).toBe(true);
    expect(decoded.scope.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Authentication Flow', () => {
  it('JWT contains scopes from database', async () => {
    // Setup: Insert test scopes
    await supabase.from('role_scopes').insert([
      { role: 'server', scope: 'orders:create' },
      { role: 'server', scope: 'orders:read' }
    ]);

    // Login
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'server@test.com', password: 'test' });

    // Validate JWT has scopes
    const decoded = jwt.decode(res.body.token);
    expect(decoded.scope).toContain('orders:create');
    expect(decoded.scope).toContain('orders:read');
  });

  it('protected endpoints receive scopes from JWT', async () => {
    const token = await loginAs('server');

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);

    expect(res.status).toBe(201);  // Not 401!
  });
});
```

### E2E Tests

```typescript
test('complete auth flow with JWT validation', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'server@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');

  // Get token from localStorage
  const token = await page.evaluate(() =>
    localStorage.getItem('auth-token')
  );

  // Decode and validate structure
  const decoded = jwt.decode(token);
  expect(decoded.scope).toBeDefined();
  expect(decoded.scope).toContain('orders:create');

  // Verify authorization works
  await page.click('[data-testid="create-order"]');
  await expect(page.locator('.error')).not.toBeVisible();
});
```

---

## Debugging Authentication Issues

### Quick Diagnostic Commands

```bash
# 1. Decode a JWT token
echo "YOUR_JWT_TOKEN" | cut -d'.' -f2 | base64 -d | jq .

# 2. Check if scope field exists
curl -s http://localhost:3000/api/v1/auth/login \
  -d '{"email":"test@test.com","password":"test"}' \
  -H "Content-Type: application/json" | \
  jq -r '.token' | cut -d'.' -f2 | base64 -d | jq '.scope'

# 3. Test authorization with token
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/orders \
  -d '{"test":"data"}' -H "Content-Type: application/json"
```

### Common Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing required scope: orders:create" | JWT missing scope field | Add scope field to JWT payload |
| "req.user.scopes is undefined" | Middleware not setting scopes | Check `decoded.scope` in auth middleware |
| "Cannot read property 'includes' of undefined" | Scope field is undefined | Ensure JWT includes scope array |
| "Invalid token structure" | JWT validation failed | Check all required fields present |

### Debugging Flowchart

```
User gets 401 error
    ↓
Decode their JWT token
    ↓
Does it have 'scope' field?
    → No: Fix JWT creation code
    → Yes: Continue
        ↓
    Is scope an array?
        → No: Fix scope assignment
        → Yes: Continue
            ↓
        Does scope contain required permission?
            → No: Check role_scopes table
            → Yes: Check RBAC middleware
```

### Adding Debug Logging

```typescript
// In auth.routes.ts (JWT creation)
console.log('Creating JWT with payload:', {
  ...payload,
  scope: payload.scope?.length || 0  // Log scope count
});

// In auth.middleware.ts (JWT validation)
console.log('Decoded JWT:', {
  sub: decoded.sub,
  role: decoded.role,
  scopeCount: decoded.scope?.length || 'MISSING',
  hasScope: !!decoded.scope
});

// In rbac.middleware.ts (Permission check)
console.log('RBAC Check:', {
  required: requiredScope,
  userScopes: req.user.scopes,
  hasPermission: req.user.scopes?.includes(requiredScope)
});
```

---

## Migration and Refactoring

### When Removing Legacy Auth Code

**Lesson from JWT Scope Bug**: Demo auth removal broke production for 10 days.

Before removing auth code:
1. Document current JWT structure
2. Identify all fields used by middleware
3. Ensure new code preserves all fields
4. Write tests BEFORE removing old code
5. Deploy with feature flag if possible

### Safe Refactoring Pattern

```typescript
// Step 1: Document current structure
interface OldJWTPayload {
  // Document EVERY field, even if unused
}

// Step 2: Create new implementation
function createNewToken(user): string {
  // Preserve ALL fields from old implementation
  const oldFields = getOldTokenFields(user);
  const newFields = getNewTokenFields(user);

  return jwt.sign({ ...oldFields, ...newFields }, secret);
}

// Step 3: Parallel run
if (FEATURE_FLAG_NEW_AUTH) {
  return createNewToken(user);
} else {
  return createOldToken(user);
}

// Step 4: Validate in production
// Step 5: Remove old code only after validation
```

### Migration Checklist

- [ ] Document current JWT payload structure
- [ ] List all consumers of JWT fields
- [ ] Create compatibility tests
- [ ] Implement with feature flag
- [ ] Test with subset of users
- [ ] Monitor for auth failures
- [ ] Gradual rollout
- [ ] Remove old code only after full validation

---

## Prevention Tools

### ESLint Configuration

```json
{
  "rules": {
    "jwt-payload-completeness": "error",
    "no-auth-fallback": "error",
    "test-jwt-structure": "error"
  }
}
```

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit

# Check for auth file changes
if git diff --cached --name-only | grep -E "(auth|jwt|token)"; then
  echo "⚠️  Auth files modified. Running validation..."

  # Run JWT structure tests
  npm run test:jwt-structure

  # Run ESLint on auth files
  npx eslint --rule jwt-payload-completeness:error

  echo "✅ Auth validation passed"
fi
```

### Monitoring Script

```javascript
// Monitor for missing scope errors in production
const checkAuthHealth = async () => {
  const logs = await fetchRecentLogs();

  const scopeErrors = logs.filter(log =>
    log.message.includes('Missing required scope') ||
    log.message.includes('scope is undefined')
  );

  if (scopeErrors.length > 0) {
    alert('JWT scope field might be missing!', scopeErrors);
  }
};

// Run every 5 minutes
setInterval(checkAuthHealth, 5 * 60 * 1000);
```

---

## Related Documentation

- [Post-mortem: JWT Scope Bug](../../postmortems/2025-11-12-jwt-scope-bug.md)
- [ADR-010: JWT Payload Standards](../../explanation/architecture-decisions/ADR-010-jwt-payload-standards.md)
- [Auth Debugging Runbook](../operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md)
- [Claudelessons Pattern CL005](../../../claudelessons-v2/knowledge/incidents/jwt-scope-mismatch.md)

---

**Remember**: The JWT scope bug caused 10 days of production issues. Following this guide prevents similar incidents.

*"An authentication bug is never just a bug - it's a system-wide failure waiting to happen."*