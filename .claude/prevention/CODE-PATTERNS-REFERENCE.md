# Security Code Patterns Reference

**Purpose:** Quick reference for correct patterns used throughout the codebase for security-sensitive operations.

---

## Cache Key Patterns

### CORRECT Cache Key Format
```typescript
// HTTP Client (client/src/services/http/httpClient.ts:215-230)
async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
  // Build cache key with restaurant_id prefix for tenant isolation
  const restaurantId = getCurrentRestaurantId() || getRestaurantId()
  const tenantPrefix = restaurantId || 'no-tenant'

  let cacheKey = `${tenantPrefix}:${endpoint}`
  if (options?.params && Object.keys(options.params).length > 0) {
    const searchParams = new URLSearchParams()
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    cacheKey = `${tenantPrefix}:${endpoint}?${searchParams.toString()}`
  }

  // Check ResponseCache
  const cachedResponse = this.responseCache.get(cacheKey)
  if (cachedResponse) {
    if (import.meta.env.DEV) {
      logger.info(`[Cache HIT] ${endpoint}`)
    }
    return cachedResponse as T
  }
  // ... rest of method
}
```

**Key Points:**
- Cache key ALWAYS has format: `{restaurantId}:{endpoint}?{params}`
- Query parameters included to prevent wrong filtered data
- Uses `getCurrentRestaurantId()` first, falls back to `getRestaurantId()`
- Uses `logger`, not `console`

---

### CORRECT Cache Clearing on Restaurant Switch
```typescript
// client/src/services/http/httpClient.ts:21-32
export function setCurrentRestaurantId(restaurantId: string | null) {
  const previousId = currentRestaurantId
  currentRestaurantId = restaurantId

  // Clear caches when switching restaurants to prevent cross-tenant data leakage
  // Only clear if we're switching from one restaurant to another (not initial load)
  if (previousId !== null && previousId !== restaurantId) {
    // Use the exported clearAllCachesForRestaurantSwitch function
    // which handles both HTTP cache and localStorage
    clearAllCachesForRestaurantSwitch()
  }
}
```

**Key Points:**
- Only called when SWITCHING restaurants (previousId !== null && previousId !== restaurantId)
- Calls `clearAllCachesForRestaurantSwitch()` automatically
- No conditional logic - always clears on switch
- Clear happens in context provider, not scattered across codebase

---

### CORRECT Comprehensive Cache Clearing
```typescript
// client/src/services/http/httpClient.ts:371-397
export function clearAllCachesForRestaurantSwitch(): void {
  // Clear HTTP client caches
  httpClient.clearCache()

  // Clear any localStorage caches with tenant-specific prefixes
  if (typeof localStorage !== 'undefined') {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('cache:') ||
        key.startsWith('menu:') ||
        key.startsWith('orders:') ||
        key.startsWith('tables:')
      )) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    if (keysToRemove.length > 0) {
      logger.info('[Multi-tenant] Cleared localStorage caches', { count: keysToRemove.length })
    }
  }

  // Log the action
  logger.info('[Multi-tenant] Cleared all caches for restaurant switch')
}
```

**Key Points:**
- Clears HTTP response cache
- Clears localStorage with known tenant prefixes
- Uses `logger.info()` with context
- Logs count of items cleared for debugging
- Function is comprehensive - touches all cache layers

---

## RLS Policy Patterns

### CORRECT RLS Policies (Multi-Step Pattern)

From `supabase/migrations/20251203_audit_tables_rls.sql`:

#### SELECT Policy (Nullable Column Case)
```sql
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- SELECT: Only rows with matching restaurant_id (NULL rows hidden from tenants)
CREATE POLICY "tenant_select_order_status_history" ON order_status_history
FOR SELECT USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);
```

**Key Points:**
- `IS NOT NULL` check for nullable columns
- Prevents NULL values from being visible
- Matches JWT claim name exactly: `'restaurant_id'` (not `'tenant_id'` or others)
- Explicit UUID cast: `::uuid`

#### INSERT Policy (Mirrors SELECT)
```sql
-- INSERT: Must provide restaurant_id matching JWT
CREATE POLICY "tenant_insert_order_status_history" ON order_status_history
FOR INSERT WITH CHECK (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);
```

**Key Points:**
- MUST include `IS NOT NULL` (same as SELECT)
- Prevents orphaned data with NULL restaurant_id
- Prevents INSERT from bypassing SELECT restrictions
- WITH CHECK clause validates WRITTEN values

#### UPDATE Policy (Symmetric USING & WITH CHECK)
```sql
-- UPDATE: Only own restaurant's rows
CREATE POLICY "tenant_update_order_status_history" ON order_status_history
FOR UPDATE USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
)
WITH CHECK (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);
```

**Key Points:**
- USING clause: restricts which rows can be read for updating
- WITH CHECK clause: restricts which values can be written
- Both must be symmetric and include `IS NOT NULL`

#### DELETE Policy (Mirrors SELECT USING)
```sql
-- DELETE: Only own restaurant's rows
CREATE POLICY "tenant_delete_order_status_history" ON order_status_history
FOR DELETE USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);
```

**Key Points:**
- USING clause restricts which rows can be deleted
- Must match SELECT policy exactly
- Prevents deleting other tenants' data

#### Service Role Bypass (Must Be Last)
```sql
-- Service role bypass for server-side operations
CREATE POLICY "service_role_order_status_history" ON order_status_history
FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Key Points:**
- Created last (more permissive policies override earlier ones)
- Allows server-side code to perform unrestricted CRUD
- Used when calling from Express with `supabaseServiceClient`

#### Performance Index
```sql
-- Index for RLS performance
CREATE INDEX IF NOT EXISTS idx_order_status_history_restaurant_id
ON order_status_history (restaurant_id);
```

**Key Points:**
- RLS queries without indexes become O(n) table scans
- Always add index on tenant/restaurant column
- For composite queries, add multi-column index

---

### CORRECT RLS Pattern (Non-Nullable Column Case)

From `supabase/migrations/20251203_audit_tables_rls.sql`:

```sql
ALTER TABLE voice_order_logs ENABLE ROW LEVEL SECURITY;

-- Note: restaurant_id is NOT NULL on this table

CREATE POLICY "tenant_select_voice_order_logs" ON voice_order_logs
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_voice_order_logs" ON voice_order_logs
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_voice_order_logs" ON voice_order_logs
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_voice_order_logs" ON voice_order_logs
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_voice_order_logs" ON voice_order_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Key Points:**
- No `IS NOT NULL` check (column is NOT NULL in schema)
- Otherwise same pattern as nullable case
- Index still recommended for performance

---

## Logging Patterns

### CORRECT: Using Logger with Context
```typescript
// Good: Structured logging with context
import { logger } from '@/services/logger'

logger.info('User logged in', {
  userId: user.id,
  restaurantId: currentRestaurantId,
  timestamp: new Date().toISOString()
})

logger.error('Failed to fetch orders', {
  userId: user.id,
  restaurantId,
  endpoint: '/api/v1/orders',
  statusCode: error.statusCode
})

logger.warn('[Multi-tenant] Cleared all caches', {
  previousRestaurantId,
  newRestaurantId,
  itemsCleared: count
})
```

**Key Points:**
- Use `logger` (from `@/services/logger` or `../utils/logger`)
- Include context object with relevant data
- Never include secrets (JWT, passwords, API keys)
- Use appropriate level: `info`, `warn`, `error`

### WRONG: Using console.log/console.error
```typescript
// BAD: Direct console usage
console.log('User logged in') // No context
console.error('Failed to fetch', error) // No structured data
console.log('JWT:', token) // SECURITY ISSUE - exposing token
```

**Problems:**
- No structured context
- Harder to parse logs in production
- Security issue if secrets logged
- Inconsistent with rest of codebase

---

## Authentication Patterns

### CORRECT: Using httpClient for Auth
```typescript
// Good: httpClient manages JWT automatically
const response = await httpClient.post('/api/v1/auth/login', {
  email,
  password,
  restaurantId: resolvedRestaurantId
})

// Store and sync state
localStorage.setItem('auth_session', JSON.stringify({
  user: response.user,
  session: response.session,
  restaurantId: response.restaurantId
}))

setCurrentRestaurantId(response.restaurantId)
```

**Key Points:**
- Use `httpClient`, not direct `fetch()`
- httpClient injects JWT automatically
- Response includes `restaurantId` for context
- Sync state via `setCurrentRestaurantId()`

### WRONG: Direct Supabase Auth
```typescript
// BAD: Supabase JWT lacks restaurant_id claim
const { data } = await supabase.auth.signInWithPassword({
  email,
  password
})
// JWT doesn't have restaurant_id - causes 401 in production
```

**Problems:**
- JWT missing `restaurant_id` claim
- Will fail with `STRICT_AUTH=true` in production
- No restaurant context in subsequent requests

---

## Multi-Tenant Query Patterns

### CORRECT: Server-Side Tenant Filtering
```typescript
// Good: Server validates restaurant_id in every query
async function getOrders(restaurantId: string, filters?: any): Promise<Order[]> {
  // Always include restaurant_id filter
  const orders = await db.query<Order[]>(
    `SELECT * FROM orders WHERE restaurant_id = $1`,
    [restaurantId]
  )
  return orders
}

// In route handler
app.get('/api/v1/orders', authenticate, (req, res) => {
  const restaurantId = req.headers['x-restaurant-id'] as string
  const orders = await getOrders(restaurantId)
  res.json(orders)
})
```

**Key Points:**
- Every repository function takes `tenantId`/`restaurantId` as first parameter
- Can't accidentally forget to filter
- Database RLS enforces as second layer of defense
- Middleware validates header before calling business logic

### WRONG: Client-Side Filtering
```typescript
// BAD: Assumes client won't bypass filter
const allOrders = await db.query('SELECT * FROM orders')
const userOrders = allOrders.filter(o => o.restaurant_id === userRestaurantId)
```

**Problems:**
- Client can remove filter and see all data
- Server has no defense against cross-tenant reads
- Relies on client honesty

---

## Environment Variable Patterns

### CORRECT: Validation on Startup
```typescript
// Server-side (Express): Validate on startup
const requiredEnvVars = [
  'KIOSK_JWT_SECRET',
  'SUPABASE_SERVICE_KEY',
  'STRIPE_SECRET_KEY'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Validate format
const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey?.startsWith('sk_')) {
  throw new Error('STRIPE_SECRET_KEY must start with sk_ (not sk_test_ or sk_live_)')
}
```

**Key Points:**
- Fail fast on startup if config missing
- Validate format, not just presence
- No fallback to unsafe defaults
- Clear error messages for debugging

### CORRECT: Client Env Vars (VITE_ prefix only)
```typescript
// .env (available to client)
VITE_API_BASE_URL=https://api.example.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

// NOT available to client (throws error if accessed)
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_SERVICE_KEY=...
```

**Key Points:**
- Only `VITE_` prefixed variables visible to client
- Secret keys must NOT have `VITE_` prefix
- Webpack/Vite blocks access to non-VITE_ vars

### WRONG: Hardcoded Values
```typescript
// BAD: Secrets in code
const jwtSecret = 'super-secret-key-12345'
const stripeKey = 'sk_test_ABC123'
const apiKey = 'api_key_xyz'

export { jwtSecret, stripeKey, apiKey }
```

**Problems:**
- Secrets in Git history forever
- Exposed in compiled client code
- Can't rotate without code change
- CI/CD logs may expose values

---

## Type Safety Patterns

### CORRECT: Explicit Types for Security
```typescript
// Define JWT claims explicitly
interface JWTClaims {
  sub: string
  email: string
  restaurant_id: string
  role: 'manager' | 'server' | 'kitchen' | 'expo'
  scope: string[]
}

// Parse with type validation
function parseJWT(token: string): JWTClaims {
  // Validate and parse - throws if invalid structure
  const claims = JWT.decode(token) as JWTClaims

  if (!claims.restaurant_id) {
    throw new Error('JWT missing required claim: restaurant_id')
  }

  return claims
}

// Use with type safety
const claims = parseJWT(token)
// TypeScript knows claims.restaurant_id exists, can't be undefined
const orders = getOrders(claims.restaurant_id) // Safe!
```

**Key Points:**
- Explicit interface for JWT claims
- Validation on parse (not just type assertion)
- TypeScript enforces presence of claims
- Can't accidentally use undefined value

### WRONG: Using `any` Type
```typescript
// BAD: No type checking
const claims: any = JWT.decode(token)
if (claims.restaurant_id === userRestaurantId) { ... }
// What if restaurant_id is undefined? What if claims is null?
```

**Problems:**
- TypeScript doesn't catch errors
- Restaurant_id could be undefined/null
- Type checker bypassed
- Bugs found in production, not IDE

---

## References

- RLS Migrations: [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md)
- Cache Implementation: [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md)
- Security Review: [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md)
- Implementation: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts`
- Migrations: `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/`

---

## Using This Reference

When implementing security-sensitive features:

1. **Look up the pattern** in this document
2. **Copy the CORRECT example** exactly
3. **Verify checklist** matches your changes
4. **Run tests** before committing
5. **Comment PR** with reference to pattern used

This ensures consistency and prevents security gaps from spreading.
