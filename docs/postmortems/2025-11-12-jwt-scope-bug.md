# Post-Mortem: JWT Scope Field Missing
**Incident Date**: November 2-12, 2025
**Severity**: P0 - Critical
**Duration**: 10 days (6 days undetected, 4 days to proper fix)
**Impact**: Complete role-based authorization failure in production

---

## Executive Summary

A critical authentication bug rendered the entire role-based access control (RBAC) system non-functional for 10 days. JWT tokens issued during login were missing the `scope` field, causing all permission checks to fail with "Missing required scope" errors. The bug affected all authenticated users across all roles (server, kitchen, manager, cashier, expo).

**Root Cause**: When demo authentication infrastructure was removed on November 2nd, the JWT payload structure from the demo endpoint was not preserved in the remaining authentication endpoints.

**Detection Delay**: The bug remained undetected for 6 days due to fallback logic in the RBAC middleware that masked the issue by querying the database when JWT scopes were empty.

---

## Timeline

### November 2, 2025
- **21:58 EST**: Commit `5dc74903` - "chore(auth): eliminate demo-session infrastructure"
- Demo authentication removed (~430 lines of code)
- JWT payload structure not preserved in remaining endpoints
- **BUG INTRODUCED**: Regular login endpoints now create JWTs without `scope` field

### November 2-8, 2025
- Bug exists in production but masked by RBAC fallback logic
- System queries database for every permission check (100-200ms added latency)
- No user reports due to fallback masking the issue

### November 8, 2025
- **Initial detection**: Users report 401 "Missing required scope: orders:create"
- **Misdiagnosis**: Team believes it's a database issue
- Commit `129257ed` - "fix: critical auth scopes bug" (WRONG FIX)
- Commit `07b77e41` - Revert after 15 minutes (realized wrong approach)

### November 9-11, 2025
- Continued investigation and debugging
- Multiple analysis documents created
- Database queries confirm data is correct
- JWT payload analysis reveals missing `scope` field

### November 12, 2025
- **14:57 UTC**: Root cause identified - JWT missing scope field
- **14:58 UTC**: Commit `4fd9c9d2` - "fix(auth): add scope field to jwt payloads"
- **15:00 UTC**: Fix deployed to production
- **15:30 UTC**: Verification complete - authorization working

---

## Impact Analysis

### Quantitative Impact
- **Users Affected**: 100% of authenticated users
- **Endpoints Affected**: All RBAC-protected endpoints (orders, payments, status updates)
- **Duration**: 10 days total (240 hours)
- **Failed Requests**: Estimated 50,000+ authorization failures
- **Added Latency**: 100-200ms per request during fallback period (Nov 2-8)
- **Engineering Hours**: 48+ hours across 3 engineers

### Qualitative Impact
- **Customer Trust**: Degraded user experience for all restaurant staff
- **Operational Efficiency**: Manual workarounds required for order processing
- **Technical Debt**: Accumulated 2,651 lines of debugging documentation
- **Team Morale**: Frustration from misdiagnosis and extended debugging

### Business Impact
- **Revenue**: No direct revenue loss (fallback prevented complete outage initially)
- **Reputation**: Potential loss of customer confidence in system reliability
- **Opportunity Cost**: 48 engineering hours diverted from feature development

---

## Root Cause Analysis

### Technical Root Cause

The removed demo authentication endpoint included this JWT creation:
```typescript
// BEFORE (demo-session endpoint)
const payload = {
  sub: userId,
  email: userEmail,
  role: userRole,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ This field was included
  auth_method: 'demo'
};
```

The regular login endpoints did not include the scope field:
```typescript
// AFTER (regular login - BUGGY)
const payload = {
  sub: userId,
  email: userEmail,
  role: userRole,
  restaurant_id: restaurantId,
  // ❌ scope field missing!
  auth_method: 'email'
};
```

### Why It Wasn't Caught

1. **No Integration Tests**: Tests validated response body structure but never decoded JWT tokens
2. **Fallback Logic**: RBAC middleware queried database when `req.user.scopes` was empty
3. **Response/JWT Mismatch**: Response body included scopes, creating "split brain" architecture
4. **E2E Test Gap**: All E2E tests used demo mode which was removed

### The "Split Brain" Anti-Pattern

```javascript
// Response body (what client sees)
{
  user: { scopes: ['orders:create', 'orders:read'] },  // ✅ Has scopes
  token: "eyJ..."  // JWT without scope field
}

// JWT payload (what server validates)
{
  sub: "user-id",
  role: "server",
  // ❌ No scope field
}
```

Client code saw scopes in response and assumed success, while server-side validation failed.

---

## Resolution

### Immediate Fix (November 12)

Modified two login endpoints in `server/src/routes/auth.routes.ts`:

1. **Email/Password Login** (lines 75-131)
2. **PIN Login** (lines 162-198)

Added scope field to JWT payload:
```typescript
const { data: scopesData } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', userRole);

const scopes = scopesData?.map(s => s.scope) || [];

const payload = {
  sub: userId,
  email: userEmail,
  role: userRole,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ CRITICAL FIX
  auth_method: authMethod
};
```

### Verification Steps Taken

1. Decoded production JWT tokens to confirm scope field present
2. Tested order submission with server role - SUCCESS
3. Verified all RBAC-protected endpoints functioning
4. Confirmed no more "Missing required scope" errors

---

## Lessons Learned

### What Went Wrong

1. **Implicit Contracts Not Documented**
   - JWT payload structure was not documented in code
   - No TypeScript interface enforcing required fields
   - Middleware expectations not explicit

2. **Inadequate Testing**
   - Integration tests used mocks instead of real auth flow
   - JWT structure never validated in tests
   - E2E tests only covered demo mode (which was removed)

3. **Fallback Logic Masked the Bug**
   - RBAC middleware's database fallback hid the issue for 6 days
   - Added latency mistaken for "normal" performance
   - Created false sense of security

4. **Refactoring Without Contract Preservation**
   - Demo removal didn't preserve working JWT structure
   - No migration guide or compatibility check
   - Breaking change not recognized as such

5. **Debugging Approach**
   - Initial misdiagnosis wasted 2 days
   - Focused on symptoms (401 errors) not root cause
   - Didn't check JWT payload structure early enough

### What Went Well

1. **Comprehensive Documentation**
   - Detailed analysis documents helped understand issue
   - Git history provided clear timeline
   - Database queries confirmed data integrity

2. **Quick Revert**
   - Wrong fix reverted within 15 minutes
   - Prevented compounding the problem

3. **Team Collaboration**
   - Multiple engineers contributed to investigation
   - Parallel analysis paths explored

---

## Action Items

### Immediate (Completed)
- [x] Add scope field to JWT payloads in both login endpoints
- [x] Verify fix in production
- [x] Document root cause and timeline

### Short-term (This Week)
- [ ] Add JWT structure validation tests
- [ ] Remove RBAC fallback logic
- [ ] Create JWT payload TypeScript interface
- [ ] Add integration tests for login → protected endpoint flow

### Medium-term (Next Sprint)
- [ ] Implement JWT versioning for future changes
- [ ] Add pre-commit hooks for auth file changes
- [ ] Create auth system architecture documentation
- [ ] Reduce mock usage in tests from 90% to 40%

### Long-term (Next Quarter)
- [ ] Implement comprehensive E2E test suite
- [ ] Add production smoke tests in CI/CD
- [ ] Create auth system observability dashboard
- [ ] Establish auth change review process

---

## Prevention Measures

### Testing Requirements

All authentication changes must include:
1. **Unit test** validating JWT structure
2. **Integration test** of full auth flow
3. **E2E test** in production-like environment
4. **JWT decoder test** verifying all required fields

### Code Standards

```typescript
// Required: Document JWT contract
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  role: string;       // User role
  scope: string[];    // REQUIRED: Permission scopes
  restaurant_id: string; // Restaurant UUID
  auth_method: string;   // 'email' | 'pin'
  iat: number;        // Issued at
  exp: number;        // Expiration
}

// Required: Validate before signing
function createJWT(payload: JWTPayload): string {
  validateJWTPayload(payload); // Throws if missing required fields
  return jwt.sign(payload, secret);
}
```

### Review Process

1. **Auth changes require**:
   - Peer review by senior engineer
   - JWT structure diff in PR description
   - Test evidence of backward compatibility

2. **Deployment requires**:
   - Staging environment validation
   - JWT structure verification in staging
   - Gradual rollout with monitoring

### Monitoring & Alerting

1. **Add metrics for**:
   - JWT decode failures
   - Missing scope errors
   - RBAC fallback usage (should be 0)
   - Auth endpoint latency

2. **Alert on**:
   - Any "Missing required scope" errors
   - JWT structure validation failures
   - Spike in 401 responses

---

## Technical Deep Dive

### The Bug in Detail

The bug manifested in the authorization middleware chain:

1. **Authentication Middleware** (`auth.ts:99`)
```typescript
const decoded = jwt.verify(token, jwtSecret);
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: decoded.role,
  scopes: decoded.scope || [],  // ← Always [] because scope undefined
  restaurantId: decoded.restaurant_id
};
```

2. **RBAC Middleware** (`rbac.ts:304`)
```typescript
const userScopes = req.user?.scopes || [];
if (!hasRequiredScope(userScopes, requiredScope)) {
  // This always failed because userScopes was always []
  return res.status(401).json({
    error: { message: `Missing required scope: ${requiredScope}` }
  });
}
```

3. **The Fallback That Masked It** (removed in earlier commit)
```typescript
// This was querying DB when JWT scopes were empty
if (userScopes.length === 0) {
  const dbScopes = await fetchScopesFromDatabase(req.user.role);
  req.user.scopes = dbScopes; // Masked the JWT bug
}
```

### Why TypeScript Didn't Catch It

TypeScript's structural typing allowed the bug:
```typescript
// No error even though 'scope' is missing
const payload = {
  sub: "123",
  role: "server"
  // Missing scope field - TypeScript doesn't complain
};

jwt.sign(payload, secret); // Works fine
```

Solution: Explicit typing with required fields:
```typescript
const payload: Required<JWTPayload> = {
  // TypeScript now REQUIRES all fields
};
```

---

## Appendix

### Related Documentation
- [Root Cause Analysis](../archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_ROOT_CAUSE_ANALYSIS.md) - 1,039 lines
- [Technical Summary](../archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_TECHNICAL_SUMMARY.md) - 271 lines
- [Patterns & Solutions](../archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_PATTERNS_AND_SOLUTIONS.md) - 575 lines
- [Historical Pattern Analysis](../HISTORICAL_PATTERN_ANALYSIS.md) - 1,427 lines

### Affected Files
- `server/src/routes/auth.routes.ts` - Primary fix location
- `server/src/middleware/auth.ts` - Reads JWT structure
- `server/src/middleware/rbac.ts` - Validates scopes
- All RBAC-protected route files

### Metrics
- **Lines of Code Changed**: 4 (2 locations × 2 lines each)
- **Time to Fix Once Found**: 5 minutes
- **Time to Find Root Cause**: 10 days
- **Documentation Generated**: 2,651 lines
- **Engineers Involved**: 3

### Git Commits
- `5dc74903` - Bug introduced (demo removal)
- `129257ed` - Wrong fix attempted
- `07b77e41` - Revert of wrong fix
- `4fd9c9d2` - Correct fix applied

---

## Sign-off

**Post-mortem prepared by**: Engineering Team
**Date**: November 12, 2025
**Status**: RESOLVED
**Follow-up**: Weekly auth system review meetings scheduled

---

*"The fix was simple. Finding it was hard. Learning from it is invaluable."*