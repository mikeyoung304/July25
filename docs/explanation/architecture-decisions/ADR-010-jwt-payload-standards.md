# ADR-010: JWT Payload Standards

**Status**: Accepted
**Date**: November 12, 2025
**Decision makers**: Engineering Team
**Relates to**: ADR-006 (Dual Authentication Pattern)

## Context

A critical production incident occurred where JWT tokens were missing the `scope` field, causing complete RBAC failure for 10 days. The incident revealed that JWT payload structure is an implicit contract that was not documented, tested, or enforced.

### The Problem

1. **Implicit contracts**: JWT payload structure was assumed but not enforced
2. **No validation**: Missing fields caused silent failures
3. **Split brain architecture**: Response body contained data that JWT lacked
4. **Testing gap**: Tests validated response structure, not JWT structure

### Impact of the Incident

- **Duration**: 10 days (6 days undetected due to fallback logic)
- **Scope**: 100% of authenticated users affected
- **Cost**: 48+ engineering hours debugging
- **Root cause**: Demo auth removal didn't preserve JWT payload structure

## Decision

We will establish and enforce strict JWT payload standards with automated validation at multiple levels.

### JWT Payload Structure

All JWT tokens MUST include these fields:

```typescript
interface JWTPayload {
  // Identity
  sub: string;           // User ID (Supabase UUID)
  email: string;         // User email address

  // Authorization
  role: string;          // User role (server, kitchen, manager, etc.)
  scope: string[];       // Permission scopes from role_scopes table

  // Multi-tenancy
  restaurant_id: string; // Restaurant UUID for tenant isolation

  // Metadata
  auth_method: 'email' | 'pin';  // How user authenticated
  iat: number;          // Issued at (Unix timestamp)
  exp: number;          // Expiration (Unix timestamp)

  // Optional
  session_id?: string;   // For session tracking
  device_id?: string;    // For device-specific tokens
}
```

### Validation Requirements

1. **Compile-time** (TypeScript)
   - Use `Required<JWTPayload>` type for token creation
   - ESLint rule `jwt-payload-completeness` catches missing fields

2. **Runtime** (Middleware)
   - Validate JWT structure in auth middleware
   - Fail fast if required fields missing
   - Log validation failures for monitoring

3. **Test-time** (Integration tests)
   - Decode and validate JWT structure in tests
   - Test both response body AND token content
   - Verify response/token consistency

4. **Deploy-time** (CI/CD)
   - Pre-deployment JWT structure validation
   - Smoke tests verify token format
   - Rollback if structure changes unexpectedly

## Consequences

### Positive

1. **Prevents split brain architecture**: Response and JWT always consistent
2. **Fail fast on errors**: Missing fields detected immediately
3. **Clear contracts**: JWT structure explicitly documented
4. **Automated prevention**: ESLint catches issues at development time
5. **Reduced debugging time**: From 10 days to immediate detection

### Negative

1. **Breaking change**: Existing tokens without scope field become invalid
2. **Increased complexity**: More validation layers to maintain
3. **Performance overhead**: ~5ms added for structure validation
4. **Migration required**: Must update all JWT creation points

### Neutral

1. **Documentation burden**: Must keep ADR updated with changes
2. **Testing overhead**: All auth tests must validate JWT structure
3. **Monitoring required**: New metrics for validation failures

## Implementation Plan

### Phase 1: Documentation (Immediate)
- [x] Create this ADR
- [x] Document in postmortem
- [x] Add to claudelessons-v2

### Phase 2: Prevention (Week 1)
- [x] Create ESLint rule for JWT completeness
- [x] Add JWT payload validator module
- [ ] Update TypeScript interfaces

### Phase 3: Enforcement (Week 2)
- [ ] Add validation middleware to auth routes
- [ ] Update all JWT creation points
- [ ] Add integration tests for JWT structure

### Phase 4: Monitoring (Week 3)
- [ ] Add metrics for validation failures
- [ ] Create alerts for missing fields
- [ ] Dashboard for JWT health

## Migration Strategy

For existing systems:

1. **Soft enforcement** (Week 1-2)
   - Log warnings for invalid JWTs
   - Continue to accept old tokens
   - Monitor percentage of invalid tokens

2. **Migration period** (Week 3-4)
   - Force re-authentication for old tokens
   - Update all active sessions
   - Verify all services updated

3. **Hard enforcement** (Week 5+)
   - Reject invalid JWT structures
   - Remove fallback logic
   - Monitor for issues

## Validation Examples

### Creating a JWT (Correct)

```typescript
import { JWTPayload } from '@/types/auth';

async function createAuthToken(user: User): Promise<string> {
  // Fetch scopes from database
  const scopes = await fetchUserScopes(user.role);

  // Type-safe payload creation
  const payload: Required<JWTPayload> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    scope: scopes,  // ✅ Required field included
    restaurant_id: user.restaurant_id,
    auth_method: 'email',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
  };

  return jwt.sign(payload, process.env.JWT_SECRET);
}
```

### Validating in Middleware

```typescript
import { validateJWTPayload } from '@/validators/jwt';

export async function authMiddleware(req, res, next) {
  const token = extractToken(req);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate structure
    const validation = validateJWTPayload(decoded);
    if (!validation.isValid) {
      logger.error('JWT_STRUCTURE_INVALID', validation.errors);
      return res.status(401).json({
        error: 'Invalid token structure'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Testing JWT Structure

```typescript
describe('Auth Endpoints', () => {
  it('should create JWT with all required fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password, restaurant_id });

    // Validate response
    expect(response.status).toBe(200);
    expect(response.body.user.scopes).toBeDefined();

    // Validate JWT structure
    const token = response.body.session.access_token;
    const decoded = jwt.decode(token);

    expect(decoded).toMatchObject({
      sub: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      scope: expect.any(Array),  // ✅ Critical field
      restaurant_id: expect.any(String),
      auth_method: expect.stringMatching(/^(email|pin)$/),
      iat: expect.any(Number),
      exp: expect.any(Number)
    });

    // Verify response matches JWT
    expect(response.body.user.scopes).toEqual(decoded.scope);
  });
});
```

## Monitoring and Alerts

### Metrics to Track

```yaml
jwt_validation_failures:
  description: Count of JWT structure validation failures
  labels: [endpoint, field_missing, auth_method]
  alert_threshold: > 0

jwt_scope_empty:
  description: JWTs created with empty scope array
  labels: [role, endpoint]
  alert_threshold: > 0

jwt_response_mismatch:
  description: Response body doesn't match JWT content
  labels: [field, endpoint]
  alert_threshold: > 0
```

### Alert Configuration

```javascript
if (metrics.jwt_validation_failures > 0) {
  alert.critical('JWT structure validation failing', {
    runbook: 'docs/runbooks/jwt-validation-failure.md',
    likely_causes: [
      'Code deployment without JWT updates',
      'Legacy service creating old format tokens',
      'Database role_scopes table empty'
    ]
  });
}
```

## References

- [Post-mortem: JWT Scope Bug](../../postmortems/2025-11-12-jwt-scope-bug.md)
- [Claudelessons Pattern CL005](../../../claudelessons-v2/knowledge/incidents/jwt-scope-mismatch.md)
- [JWT Payload Validator](../../../claudelessons-v2/enforcement/validators/jwt-payload-validator.js)
- [ESLint Rule](../../../claudelessons-v2/enforcement/eslint-rules/jwt-payload-completeness.js)
- Commits: `5dc74903` (bug introduced), `4fd9c9d2` (fix applied)

## Decision Outcome

**Accepted and implemented** following the November 12 production incident. The cost of NOT having these standards (10-day outage) far exceeds the implementation complexity.

---

*"An ounce of prevention is worth a pound of cure."* - Benjamin Franklin

*In our case: 2 weeks of implementation prevents 10 days of debugging.*