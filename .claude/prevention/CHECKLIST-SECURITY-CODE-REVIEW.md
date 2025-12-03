# Security Code Review Checklist for PRs

**Purpose:** Catch security gaps early by enforcing systematic review of security-sensitive changes before merge.

**Context:** PR #150-151 security review discovered multiple classes of issues that passed initial checks. This checklist ensures nothing is missed in future security-related PRs.

**When to Use:** Apply this checklist to any PR that touches:
- Authentication or authorization
- Row Level Security (RLS) policies
- Multi-tenant isolation logic
- Cache layer implementation
- Logging of sensitive data
- Environment variable handling
- CSRF/CORS configuration

---

## Authentication & Authorization

- [ ] Verify JWT claims match application expectations:
  - [ ] Contains `restaurant_id` (or your tenant identifier)
  - [ ] Contains `role` with valid values
  - [ ] No unexpected claims that could be exploited

- [ ] Check all auth code uses httpClient with built-in JWT handling:
  ```typescript
  // CORRECT: httpClient manages auth
  const response = await httpClient.post('/api/v1/auth/login', { email, password })

  // WRONG: Direct fetch without JWT injection
  const response = await fetch('/api/v1/auth/login', { ... })
  ```

- [ ] Verify STRICT_AUTH environment variable behavior:
  - [ ] Tested locally with `STRICT_AUTH=true`
  - [ ] Tested in production config
  - [ ] Not bypassed in any code path

- [ ] Supabase client usage check:
  - [ ] Uses `supabase` (anon key) only for public operations
  - [ ] Uses `supabaseServiceClient` for server-side operations
  - [ ] Never mixes service_role operations with client-side code

- [ ] Token refresh logic prevents auth drift:
  - [ ] Tokens refreshed before expiry (not just on error)
  - [ ] Refresh failures handled gracefully
  - [ ] Old tokens not reused after refresh

---

## Row Level Security (RLS)

- [ ] Checklist: Apply [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md) for any RLS changes

- [ ] All tables with `restaurant_id` or tenant identifier have RLS:
  ```bash
  # Run this query to verify coverage
  SELECT tablename FROM pg_tables
  WHERE tablename LIKE '%restaurant%'
  OR tablename LIKE '%tenant%'
  ORDER BY tablename;
  # Compare against migration file - every table should be covered
  ```

- [ ] RLS policies cover all four operations (SELECT, INSERT, UPDATE, DELETE)
  - [ ] SELECT restricts visibility
  - [ ] INSERT restricts creation to own restaurant/tenant
  - [ ] UPDATE restricts modification to own tenant (both USING and WITH CHECK)
  - [ ] DELETE restricts deletion to own tenant

- [ ] Policies handle nullable columns correctly:
  - [ ] Nullable tenant columns use `IS NOT NULL AND tenant_id = ...`
  - [ ] NOT NULL columns use `tenant_id = ...` alone

- [ ] No asymmetry between policies:
  - [ ] INSERT WITH CHECK matches SELECT USING logic
  - [ ] UPDATE USING matches SELECT USING exactly
  - [ ] UPDATE WITH CHECK matches SELECT USING exactly
  - [ ] DELETE USING matches SELECT USING exactly

- [ ] Service role bypass policy present:
  ```sql
  -- Must exist for each table with RLS
  CREATE POLICY "service_role_[table]" ON [table]
  FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```

- [ ] Performance indexes created:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_[table]_restaurant_id
  ON [table] (restaurant_id);
  ```

- [ ] RLS tested with integration tests:
  - [ ] User A cannot read User B's data
  - [ ] Cross-tenant queries return 0 rows (not error)
  - [ ] Server-side (service_role) can still read all data

---

## Multi-Tenant Cache Implementation

- [ ] Checklist: Apply [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md) for any cache changes

- [ ] Cache keys include tenant/restaurant ID:
  ```typescript
  // CORRECT
  const cacheKey = `${restaurantId}:${endpoint}?${params}`

  // WRONG - No tenant prefix
  const cacheKey = endpoint
  ```

- [ ] Cache clearing called on restaurant/tenant switch:
  - [ ] Switch logic calls `clearAllCachesForRestaurantSwitch()`
  - [ ] Called in exactly ONE place (usually context provider)
  - [ ] Happens BEFORE making requests in new context

- [ ] All cache layers are scoped:
  - [ ] HTTP response cache: restaurantId prefix
  - [ ] localStorage: tenant-scoped key names
  - [ ] IndexedDB (if used): restaurantId in keys
  - [ ] React Query/SWR (if used): restaurantId in query key
  - [ ] Service Worker (if used): restaurantId in request URL

- [ ] Query parameters included in cache keys:
  ```typescript
  // DIFFERENT cache keys - won't collide
  `rest-a:GET /orders?status=pending`
  `rest-a:GET /orders?status=completed`
  ```

- [ ] In-flight request deduplication prevents races:
  - [ ] Concurrent identical requests return same promise
  - [ ] Deduping uses full cache key (with restaurantId + params)

- [ ] Race condition tests exist:
  - [ ] Switch restaurants mid-request → old data not cached
  - [ ] Concurrent requests during switch → correct tenant ID used

---

## Logging & Error Handling

- [ ] No sensitive data logged:
  - [ ] JWT tokens never logged (redact before logging)
  - [ ] Passwords never logged
  - [ ] Credit card/payment data never logged
  - [ ] API keys never logged

- [ ] Use `logger` instead of `console.log`:
  ```typescript
  // CORRECT
  import { logger } from '@/services/logger'
  logger.info('User logged in', { userId, restaurantId })

  // WRONG
  console.log('User logged in') // No structured data
  console.error('Error:', error) // Should be logger.error
  ```

- [ ] Errors include context without exposing internals:
  ```typescript
  // CORRECT: User-friendly message + internal logging
  logger.error('Failed to fetch orders', {
    userId,
    restaurantId,
    endpoint: '/api/v1/orders',
    statusCode: error.statusCode,
    stack: error.stack // Log internals but don't show to user
  })
  return { error: 'Unable to load orders' } // Generic user message

  // WRONG: Exposing internal details to user
  throw new Error(`Database connection failed: ${dbError.message}`)
  ```

- [ ] Error messages don't reveal authentication state:
  ```typescript
  // CORRECT: Generic message for any auth failure
  return { error: 'Authentication required' }

  // WRONG: Reveals what went wrong (helps attackers)
  return { error: 'Invalid JWT signature' } // Reveals auth scheme
  return { error: 'restaurant_id claim missing' } // Reveals structure
  ```

---

## Configuration & Environment Variables

- [ ] No secrets in code:
  - [ ] No hardcoded API keys
  - [ ] No hardcoded JWT secrets
  - [ ] No hardcoded database passwords

- [ ] Environment variable usage documented:
  - [ ] Comment in code showing which env vars are used
  - [ ] Default values for dev are safe/public
  - [ ] Production values must be set in deployment

- [ ] Sensitive env vars are server-only:
  - [ ] `STRIPE_SECRET_KEY` never exposed to client
  - [ ] `SUPABASE_SERVICE_KEY` never exposed to client
  - [ ] `KIOSK_JWT_SECRET` never exposed to client
  - [ ] Only `VITE_*` variables available to client

- [ ] Configuration values validated on startup:
  ```typescript
  // CORRECT: Fail fast if misconfigured
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey?.startsWith('sk_')) {
    throw new Error('Invalid STRIPE_SECRET_KEY: must start with sk_')
  }

  // WRONG: Silent failures in production
  const apiKey = process.env.STRIPE_SECRET_KEY || 'default'
  ```

---

## API & Network Security

- [ ] CSRF protection implemented:
  - [ ] POST/PUT/PATCH/DELETE require CSRF token (or use JWT-based approach)
  - [ ] Token validated on server
  - [ ] Not bypassed for "trusted" requests

- [ ] CORS configured correctly:
  - [ ] Whitelist specific origins (not `*`)
  - [ ] Credentials included only for same-origin
  - [ ] Preflight requests handled

- [ ] Rate limiting in place:
  - [ ] Login endpoints rate limited (prevent brute force)
  - [ ] API endpoints rate limited per user/restaurant
  - [ ] Rate limit errors don't leak information

- [ ] Input validation enforced:
  - [ ] API validates all inputs (don't trust client)
  - [ ] UUID format validated (not just string)
  - [ ] Enum values checked against allowed set
  - [ ] String lengths validated (prevent DoS)

- [ ] Response format consistent:
  ```typescript
  // CORRECT: Consistent error format
  { success: false, error: 'User not found' }

  // WRONG: Different structures
  { message: 'Invalid request' }
  { err: 'Something went wrong' }
  ```

---

## Type Safety

- [ ] No `any` types in security-sensitive code:
  ```typescript
  // WRONG: Bypasses type checking
  const auth: any = parseJWT(token)
  if (auth.restaurant_id === requestRestaurantId) { ... } // Could be undefined

  // CORRECT: Explicit types
  interface JWTClaims {
    restaurant_id: string
    role: string
  }
  const auth = parseJWT(token) as JWTClaims
  ```

- [ ] Types enforce tenant isolation:
  ```typescript
  // Repository functions include tenantId parameter
  async function getOrders(tenantId: string, filters?: any): Promise<Order[]>
  // No way to call without specifying tenant
  ```

- [ ] Type assertions justified with comments:
  ```typescript
  // CORRECT: Justified
  const restaurantId = auth.claims.restaurant_id as string // Verified by RLS

  // WRONG: Unjustified
  const restaurantId = data.restaurant_id as string
  ```

---

## Testing Requirements

- [ ] Security tests included in PR:
  - [ ] Cross-tenant read attempt fails
  - [ ] Invalid token rejected
  - [ ] Expired token rejected
  - [ ] Missing tenant ID in request fails

- [ ] Integration tests pass:
  ```bash
  npm test -- --grep "security|multi-tenant|auth"
  ```

- [ ] Manual testing checklist included:
  - [ ] Local `STRICT_AUTH=true` passes
  - [ ] Production config doesn't expose secrets

---

## Deployment & Observability

- [ ] Migration applied successfully to test database:
  ```bash
  npm run db:push
  # Should not produce errors
  ```

- [ ] Database state verified:
  ```sql
  -- For RLS migrations: Verify policies exist
  SELECT policyname FROM pg_policies
  WHERE tablename = 'orders';
  ```

- [ ] Monitoring added for security-relevant events:
  - [ ] Failed auth attempts logged
  - [ ] Cross-tenant access attempts logged
  - [ ] RLS policy violations logged

- [ ] Rollback plan documented:
  - [ ] Revert migration script exists
  - [ ] Rollback tested on staging
  - [ ] Procedure for handling data during rollback

---

## Common Pitfalls to Catch in Review

1. **RLS policies missing `IS NOT NULL`** - Allows orphaned rows invisible to all tenants
2. **Cache keys without restaurantId** - Serves wrong tenant's data on switch
3. **clearAllCachesForRestaurantSwitch() not called** - Function exists but not wired up
4. **console.error used instead of logger** - Loses structured context, harder to debug
5. **Service_role policy missing or incorrect** - Server-side code fails silently
6. **Asymmetric RLS policies** - INSERT/UPDATE/DELETE don't match SELECT restrictions
7. **JWT claim names mismatched** - Code expects 'restaurant_id' but JWT has 'tenant_id'
8. **Query params not in cache key** - Returns wrong filtered data to wrong tenant
9. **Nullable columns not handled** - NULL comparisons fail, allowing policy bypass
10. **No integration tests for isolation** - Works in happy path, fails in production

---

## Review Process

1. **Initial check** (2 min): Does PR touch sensitive areas? Apply this checklist.
2. **Detailed review** (20 min): Go through each relevant section above.
3. **Testing** (10 min): Run security-related tests locally.
4. **Ask questions**: If anything is unclear, ask for clarification before approving.
5. **Approve** only when all checked items are verified.

---

## References

- [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md) - RLS implementation details
- [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md) - Cache isolation details
- [CL-AUTH-001: STRICT_AUTH Drift](../lessons/CL-AUTH-001-strict-auth-drift.md)
- [CL-AUTH-002: WebSocket Dual Auth](../lessons/CL-AUTH-002-websocket-dual-auth-prevention.md)
- [CL-DB-002: Constraint Drift](../lessons/CL-DB-002-constraint-drift-prevention.md)
- [PR #150 Review](https://github.com/mikeyoung304/July25/pull/150) - Comprehensive RLS audit
- [PR #151 Follow-up](https://github.com/mikeyoung304/July25/pull/151) - Asymmetry fixes & cache audit
