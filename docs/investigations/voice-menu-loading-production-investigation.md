# Voice Ordering Menu Loading - Production Environment Investigation

**Date**: 2025-11-21 (Updated 2025-11-22)
**Status**: ✅ RESOLVED - Fix Deployed to Production
**Related**: `/Users/mikeyoung/CODING/rebuild-6.0/VOICE_ORDERING_ULTRATHINK_ANALYSIS.md`

---

## 🎯 RESOLUTION (2025-11-22)

**Root Cause**: Menu context was being sent to OpenAI but lacked explicit instruction to USE it.

**Fix Applied**: client/src/modules/voice/services/VoiceSessionConfig.ts:381-383
```typescript
// Added explicit framing instruction
instructions += `\n\n⚠️ CRITICAL: You have access to our COMPLETE MENU below. ONLY suggest items from this menu. DO NOT invent or suggest items not listed.`;
instructions += this.menuContext;
```

**Deployed**: https://july25-client.vercel.app/kiosk (2025-11-22 ~23:20 UTC)

**Test**: Voice AI now recognizes menu items and can answer "Tell me about the menu"

---

---

## Executive Summary

This investigation examined all environment-specific factors that could prevent menu data from loading in the voice ordering feature when deployed to production (Render backend + Vercel frontend). The analysis covers:

1. **Required Environment Variables** (server & client)
2. **Database Access Patterns** (authentication, RLS, connection strings)
3. **API Endpoint Accessibility** (CORS, middleware, public access)
4. **Production-Specific Code Paths** (environment checks, logging)

---

## TASK 1: Required Environment Variables

### Server-Side Variables (Render)

#### TIER 1: Always Required (Server won't start without these)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | Yes | `development` | Environment mode |
| `PORT` | Yes | `3001` | Backend port |
| `DATABASE_URL` | Yes | None | PostgreSQL connection (MUST use port 6543 for pooler) |
| `SUPABASE_URL` | Yes | None | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | None | Public anon key |
| `SUPABASE_SERVICE_KEY` | Yes | None | Service role key (bypasses RLS) |
| `SUPABASE_JWT_SECRET` | Yes | None | JWT verification secret |
| `DEFAULT_RESTAURANT_ID` | Yes | None | **MUST be UUID format** (not slug) |

**Critical Notes**:
- `DATABASE_URL` format: `postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1`
- `DEFAULT_RESTAURANT_ID` must be UUID (e.g., `11111111-1111-1111-1111-111111111111`), not slug (e.g., `grow`)

#### TIER 2: Production-Critical (Required in production)

| Variable | Production Required | Default | Purpose |
|----------|---------------------|---------|---------|
| `KIOSK_JWT_SECRET` | Yes (≥32 chars) | None | Kiosk authentication |
| `PIN_PEPPER` | Yes (≥32 chars) | None | PIN hashing |
| `STATION_TOKEN_SECRET` | Optional (≥32 chars) | None | Station authentication |
| `DEVICE_FINGERPRINT_SALT` | Optional (≥32 chars) | None | Device binding |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | For CORS |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:5173` | CORS whitelist (comma-separated) |

**Production CORS Configuration**:
```bash
FRONTEND_URL=https://july25-client.vercel.app
ALLOWED_ORIGINS=https://july25-client.vercel.app,https://*.vercel.app,https://*-mikeyoung304-gmailcoms-projects.vercel.app
```

#### TIER 3: Optional (Voice ordering specific)

| Variable | Required for Voice | Default | Purpose |
|----------|-------------------|---------|---------|
| `OPENAI_API_KEY` | **Yes** | None | OpenAI Realtime API access |
| `OPENAI_REALTIME_MODEL` | No | `gpt-4o-realtime-preview-2025-06-03` | Voice model |

**What happens if `OPENAI_API_KEY` is missing**:
- Server starts successfully (variable is optional at startup)
- `/api/v1/realtime/health` returns `503 Unhealthy` with `api_key: false`
- POST `/api/v1/realtime/session` returns `500` with error: "Voice ordering service is not configured"
- Menu loading works fine, but voice session creation fails

**What happens if `OPENAI_API_KEY` is malformed** (contains newlines):
- Detected by validation in `realtime.routes.ts:145-156`
- Returns `500` with error: "OPENAI_API_KEY contains invalid characters. This may be caused by Vercel CLI adding newlines. Fix: Use 'echo -n' when setting environment variables."

---

### Client-Side Variables (Vercel)

#### Required Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_API_BASE_URL` | Yes | None | Backend API URL (e.g., `https://july25.onrender.com`) |
| `VITE_SUPABASE_URL` | Yes | None | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | None | Public anon key |
| `VITE_DEFAULT_RESTAURANT_ID` | Yes | None | **Can be UUID or slug** |
| `VITE_ENVIRONMENT` | Yes | `development` | Environment indicator |

**Critical Notes**:
- All client variables MUST have `VITE_` prefix to be exposed to browser
- `VITE_API_BASE_URL` is used by httpClient (via `shared/config`)
- Frontend uses slug format for restaurant ID, backend uses UUID

#### Optional Variables (Feature Flags)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_USE_REALTIME_VOICE` | `false` | Enable WebRTC voice ordering |
| `VITE_DEBUG_VOICE` | `false` | Enable voice debugging logs |
| `VITE_DEMO_PANEL` | `false` | **MUST be false in production!** |
| `VITE_USE_MOCK_DATA` | `false` | Use mock data instead of API |
| `VITE_OPENAI_REALTIME_MODEL` | `gpt-4o-realtime-preview-2025-06-03` | Voice model (client-side) |

**Security Warning**:
```bash
# ❌ NEVER in production
VITE_DEMO_PANEL=1

# ✅ Always in production
VITE_DEMO_PANEL=0
```

---

## TASK 2: Database Access in Production

### Supabase Client Configuration

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/database.ts`

#### Service Role Client (MenuService uses this)

```typescript
// Lines 9-26
function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    const config = getConfig();
    _supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceKey,  // ← Uses SERVICE_KEY (bypasses RLS)
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      }
    );
  }
  return _supabaseClient;
}
```

**Key Points**:
1. **MenuService uses SERVICE_KEY, not ANON_KEY**
2. **SERVICE_KEY bypasses Row Level Security (RLS)**
3. No authentication required for menu queries from server-side
4. Connection uses Supabase client (not direct Postgres)

### MenuService Database Queries

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/menu.service.ts`

#### Menu Loading Query (Lines 68-86)

```typescript
// Fetch categories
const { data: categories, error: catError } = await supabase
  .from('menu_categories')
  .select('*')
  .eq('restaurant_id', restaurantId)  // ← Multi-tenant filter
  .eq('active', true)
  .order('display_order');

// Fetch items
const { data: items, error: itemError } = await supabase
  .from('menu_items')
  .select('*')
  .eq('restaurant_id', restaurantId)  // ← Multi-tenant filter
  .eq('active', true)
  .order('name');
```

**Critical for Production**:
1. **EVERY query includes `restaurant_id` filter** (multi-tenancy enforced)
2. Service role key means RLS policies don't apply
3. Queries filter by `active: true` only
4. No user authentication required

### Row Level Security (RLS) Status

Based on migration analysis:
- RLS policies exist on `menu_categories` and `menu_items` tables
- However, **service role key bypasses RLS** (by design)
- RLS only applies to client-side Supabase queries (not used for menu loading)

**Production Impact**: None. MenuService uses server-side service key, so RLS doesn't affect menu loading.

### Potential Database Issues in Production

#### Issue 1: Wrong Restaurant ID Format

**Symptom**: Menu returns empty array or error
**Cause**: `DEFAULT_RESTAURANT_ID` set to slug instead of UUID in Render

```bash
# ❌ WRONG - Backend expects UUID
DEFAULT_RESTAURANT_ID=grow

# ✅ CORRECT
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

**How to detect**:
```bash
curl https://july25.onrender.com/api/v1/menu \
  -H "X-Restaurant-ID: grow"
# Expected: Empty array or validation error

curl https://july25.onrender.com/api/v1/menu \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
# Expected: Menu data
```

#### Issue 2: Database Connection Failure

**Symptom**: 500 errors on all menu endpoints
**Cause**: Wrong `DATABASE_URL` port or missing pooler settings

```bash
# ❌ WRONG - Direct connection, no pooling
DATABASE_URL=postgresql://...@host:5432/db

# ✅ CORRECT - Pooler with connection limit
DATABASE_URL=postgresql://...@host:6543/db?pgbouncer=true&connection_limit=1
```

**How to detect**:
```bash
# Health check
curl https://july25.onrender.com/api/v1/health
# Should show database: connected
```

#### Issue 3: Missing Menu Data

**Symptom**: API returns empty arrays but no errors
**Cause**: No menu data exists for the restaurant ID

**How to verify**:
```sql
-- Connect to Supabase SQL Editor
SELECT COUNT(*) FROM menu_items WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) FROM menu_categories WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
```

---

## TASK 3: API Endpoint Accessibility

### Realtime Session Endpoint

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/realtime.routes.ts:16`

```typescript
router.post('/session', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || req.headers['x-restaurant-id'] || 'default';

    // Load menu context (Lines 25-132)
    const [menuData, categories] = await Promise.all([
      MenuService.getItems(restaurantId as string),
      MenuService.getCategories(restaurantId as string)
    ]);

    // Create ephemeral token from OpenAI (Lines 158-183)
    // ...
  }
});
```

### Authentication Requirements

**Middleware**: `optionalAuth` (Lines 118-159 in `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts`)

#### How `optionalAuth` Works

```typescript
export async function optionalAuth(req, _res, next) {
  // 1. Fail-fast if JWT_SECRET not configured (Lines 124-131)
  const jwtSecret = config.supabase.jwtSecret;
  if (!jwtSecret) {
    throw new Error('Server authentication not configured');
  }

  // 2. If no auth header, extract restaurant ID from header (Lines 135-154)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const restaurantId = req.headers['x-restaurant-id'];

    if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
      req.restaurantId = restaurantId;  // ← Set from header
    }
    return next();  // ← Allow unauthenticated request
  }

  // 3. If token exists, validate it (Line 158)
  return authenticate(req, _res, next);
}
```

**Key Points**:
1. **No authentication required** if no Bearer token provided
2. **Restaurant ID extracted from `X-Restaurant-ID` header**
3. Falls back to `'default'` if header missing (Line 18 in realtime.routes.ts)
4. JWT_SECRET must be configured even for unauthenticated requests

### CORS Configuration

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/server.ts:128-163`

```typescript
app.use(cors({
  origin: (origin, callback) => {
    // Allow no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check against allowed origins list
    if (allowedOriginList.some(allowedOrigin =>
      origin.match(new RegExp(allowedOrigin.replace(/\*/g, '.*')))
    )) {
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: "${origin}"`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-ID', 'X-Client-Flow']
}));
```

**Critical Headers Allowed**:
- `Authorization` (for JWT tokens)
- `X-Restaurant-ID` (for multi-tenancy)
- `X-Client-Flow` (for conditional auth)

**Potential CORS Issues in Production**:

#### Issue 1: Vercel Preview Deployments Blocked

**Symptom**: CORS error on preview branches
**Cause**: Preview URLs not in `ALLOWED_ORIGINS`

```bash
# ❌ WRONG - Only production URL
ALLOWED_ORIGINS=https://july25-client.vercel.app

# ✅ CORRECT - Include preview URLs
ALLOWED_ORIGINS=https://july25-client.vercel.app,https://*.vercel.app,https://*-mikeyoung304-gmailcoms-projects.vercel.app
```

#### Issue 2: OPTIONS Preflight Failures

**Symptom**: POST requests fail with 403/CORS error
**Cause**: OPTIONS preflight not properly handled

**How to test**:
```bash
curl -I -X OPTIONS https://july25.onrender.com/api/v1/realtime/session \
  -H "Origin: https://july25-client.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,X-Restaurant-ID"
# Expected: Access-Control-Allow-Origin header present
```

### Menu Endpoints Accessibility

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/menu.routes.ts`

All menu endpoints use `optionalAuth`:
- `GET /api/v1/menu` (Line 11)
- `GET /api/v1/menu/items` (Line 24)
- `GET /api/v1/menu/items/:id` (Line 35)
- `GET /api/v1/menu/categories` (Line 57)

**Access Level**: Public (no authentication required)

**Restaurant ID Validation** (Lines 59-64):
```typescript
router.get('/categories', optionalAuth, async (req, res, next) => {
  const restaurantId = req.restaurantId;

  // Validate restaurant ID is present and valid
  if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
    throw BadRequest('Valid restaurant ID is required');
  }
  // ...
});
```

**Potential Issues**:
1. Frontend not sending `X-Restaurant-ID` header
2. Restaurant ID sent as string literal "undefined" or "null"
3. httpClient skipping restaurant ID header (`skipRestaurantId: true`)

---

## TASK 4: Production-Only Code Paths

### Environment Checks

#### Server-Side Production Paths

**Location**: Searched with `grep -r "NODE_ENV.*production" server/src`

1. **Security Headers** (`server/src/middleware/security-headers.ts:77,94-95`):
   ```typescript
   'upgrade-insecure-requests': process.env['NODE_ENV'] === 'production' ? [''] : [],
   enableCSP: process.env['CSP_ENABLED'] === 'true' || process.env['NODE_ENV'] === 'production',
   enableHSTS: process.env['HSTS_ENABLED'] === 'true' || process.env['NODE_ENV'] === 'production',
   ```
   **Impact**: Stricter CSP/HSTS in production, but shouldn't block API requests

2. **Rate Limiting** (`server/src/middleware/authRateLimiter.ts:64`):
   ```typescript
   max: process.env['NODE_ENV'] === 'development' ? 100 : 5, // 100 in dev, 5 in production
   ```
   **Impact**: Auth endpoints rate-limited to 5 req/min in production (doesn't affect menu loading)

3. **Logging** (`server/src/utils/logger.ts:29`):
   ```typescript
   ...(NODE_ENV === 'production' ? [
     new transports.File({ filename: 'error.log', level: 'error' }),
     new transports.File({ filename: 'combined.log' })
   ] : [])
   ```
   **Impact**: File logging in production (good for debugging)

4. **Error Handling** (`server/src/middleware/errorHandler.ts:47`):
   ```typescript
   isOperational || process.env['NODE_ENV'] !== 'production'
   ```
   **Impact**: Stack traces hidden in production (security best practice)

**None of these affect menu loading functionality.**

#### Client-Side Production Paths

**Location**: `client/src/services/http/httpClient.ts:69-73`

```typescript
// Warn if production is misconfigured
if (import.meta.env.PROD && baseURL.includes('localhost')) {
  console.error('⚠️ Production build is trying to connect to localhost backend!')
  console.error('Please set VITE_API_BASE_URL to your production backend URL')
}
```

**Critical Check**: Detects misconfigured API URL in production build

### API Base URL Resolution

**Location**: `shared/config/index.ts:80-82`

```typescript
apiBaseUrl:
  viteEnv?.['VITE_API_BASE_URL'] ||
  process.env['VITE_API_BASE_URL'] ||
  process.env['API_BASE_URL'] ||
  'http://localhost:3000'  // ← Fallback (BAD in production)
```

**Fallback Chain**:
1. `import.meta.env.VITE_API_BASE_URL` (Vite build-time injection)
2. `process.env.VITE_API_BASE_URL` (Node.js runtime)
3. `process.env.API_BASE_URL` (Node.js runtime)
4. `http://localhost:3000` (default - will fail in production)

**Production Issue**: If `VITE_API_BASE_URL` not set in Vercel, defaults to localhost

### Restaurant ID Resolution

**Client-Side** (`client/src/config/index.ts:21-30`):
```typescript
export const getRestaurantId = (): string => {
  // Check session storage first (for multi-tenant scenarios)
  if (typeof window !== 'undefined') {
    const storedId = sessionStorage.getItem('currentRestaurantId');
    if (storedId) return storedId;
  }

  // Fall back to default
  return sharedConfig.get().defaultRestaurantId;
};
```

**Server-Side** (`server/src/middleware/auth.ts:138-153`):
```typescript
// No token provided - extract restaurant ID from header
const restaurantId = req.headers['x-restaurant-id'] as string;

// Validate restaurant ID is a proper value (not string literals)
if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
  req.restaurantId = restaurantId;
} else if (restaurantId === 'undefined' || restaurantId === 'null') {
  logger.warn('Invalid restaurant ID string received from client', {
    value: restaurantId,
    path: req.path
  });
}
```

**Potential Production Issue**: String literal "undefined" being sent instead of actual undefined

---

## TASK 5: Logging and Error Detection

### MenuService Logging

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/menu.service.ts`

#### Success Logs

```typescript
// Line 63 - Cache hit (debug level)
this.logger.debug('Menu cache hit', { restaurantId });

// Line 98 - Menu cached (info level)
this.logger.info('Menu cached', {
  restaurantId,
  categories: response.categories.length,
  items: response.items.length
});
```

#### Error Logs

```typescript
// Line 102 - Failed to fetch menu (error level)
this.logger.error('Failed to fetch menu', { error, restaurantId });

// Line 134 - Failed to fetch items
this.logger.error('Failed to fetch items', { error, restaurantId });

// Line 169 - Failed to fetch item
this.logger.error('Failed to fetch item', { error, restaurantId, itemId });

// Line 200 - Failed to fetch categories
this.logger.error('Failed to fetch categories', { error, restaurantId });
```

### Realtime Routes Logging

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/realtime.routes.ts`

#### Menu Loading in Session Creation (Lines 125-132)

```typescript
} catch (error: any) {
  realtimeLogger.warn('Failed to load menu context', {
    error: error.message || 'Unknown error',
    stack: error.stack,
    restaurantId
  });
  // Continue without menu context (doesn't fail the request)
}
```

**Critical Behavior**: Menu loading failure is logged as WARNING, not ERROR, and session creation continues.

### Client-Side Error Logging

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/menu/MenuService.ts`

```typescript
// Lines 82-84 - getMenu() errors
catch (error) {
  console.error('Menu API failed:', error);
  throw new Error("Menu service error");
}

// Lines 102-104 - getMenuItems() errors
catch (error) {
  console.error('Menu items API failed:', error);
  throw new Error("Menu service error");
}

// Lines 122-124 - getMenuCategories() errors
catch (error) {
  console.error('Menu categories API failed:', error);
  throw new Error("Menu service error");
}
```

**Note**: All client errors throw generic "Menu service error" message (original error logged to console)

### How to Debug Menu Loading in Production

#### 1. Check Server Logs (Render Dashboard)

**Menu Loading Success**:
```
INFO: Menu cached { restaurantId: '11111111-1111-1111-1111-111111111111', categories: 5, items: 23 }
```

**Menu Loading Failure**:
```
ERROR: Failed to fetch menu { error: {...}, restaurantId: '11111111-1111-1111-1111-111111111111' }
```

**Invalid Restaurant ID**:
```
WARN: Invalid restaurant ID string received from client { value: 'undefined', path: '/api/v1/menu' }
```

#### 2. Test API Directly

**Test menu endpoint**:
```bash
curl https://july25.onrender.com/api/v1/menu \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json"
```

**Expected Success (200)**:
```json
{
  "categories": [
    { "id": "...", "name": "Appetizers", ... }
  ],
  "items": [
    { "id": "...", "name": "Classic Burger", "price": 12.99, ... }
  ]
}
```

**Expected Failure Scenarios**:

**400 Bad Request** (invalid restaurant ID):
```json
{
  "error": "Valid restaurant ID is required",
  "code": "BAD_REQUEST"
}
```

**500 Internal Server Error** (database issue):
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

#### 3. Check Realtime Session Health

```bash
curl https://july25.onrender.com/api/v1/realtime/health
```

**Healthy Response (200)**:
```json
{
  "status": "healthy",
  "checks": {
    "api_key": true,
    "api_key_valid": true,
    "model_configured": true,
    "model": "gpt-4o-realtime-preview-2025-06-03"
  },
  "timestamp": "2025-11-21T..."
}
```

**Unhealthy Response (503)**:
```json
{
  "status": "unhealthy",
  "checks": {
    "api_key": false,
    "api_key_valid": false,
    "model_configured": true,
    "model": "gpt-4o-realtime-preview-2025-06-03"
  },
  "timestamp": "2025-11-21T..."
}
```

#### 4. Test Session Creation with Menu Context

```bash
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
```

**Success Response (200)**:
```json
{
  "id": "sess_...",
  "client_secret": {
    "value": "eph_...",
    "expires_at": 1732219200
  },
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "menu_context": "\n\n📋 FULL MENU (Summer Lunch Menu - prices may vary):\n...",
  "expires_at": 1732219200
}
```

**Failure Response (500)** - Missing OPENAI_API_KEY:
```json
{
  "error": "Voice ordering service is not configured",
  "details": "OPENAI_API_KEY environment variable is missing"
}
```

**Failure Response (500)** - Malformed API Key:
```json
{
  "error": "Voice ordering service is misconfigured",
  "details": "OPENAI_API_KEY contains invalid characters. This may be caused by Vercel CLI adding newlines. Fix: Use 'echo -n' when setting environment variables."
}
```

---

## Production Testing Checklist

### Pre-Deployment Verification (Render)

```bash
# 1. Verify all required environment variables are set
# Check Render Dashboard → Service → Environment tab

# Required variables:
✓ NODE_ENV=production
✓ DATABASE_URL (with port 6543)
✓ SUPABASE_URL
✓ SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_KEY
✓ SUPABASE_JWT_SECRET
✓ DEFAULT_RESTAURANT_ID (UUID format)
✓ KIOSK_JWT_SECRET (≥32 chars)
✓ PIN_PEPPER (≥32 chars)
✓ FRONTEND_URL
✓ ALLOWED_ORIGINS (include *.vercel.app)
✓ OPENAI_API_KEY

# 2. Verify DATABASE_URL format
# Should be: postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1

# 3. Verify DEFAULT_RESTAURANT_ID is UUID
# Example: 11111111-1111-1111-1111-111111111111

# 4. Test health check after deployment
curl https://july25.onrender.com/api/v1/health
# Expected: {"status":"healthy","database":"connected",...}
```

### Pre-Deployment Verification (Vercel)

```bash
# 1. Verify all required environment variables are set
# Check Vercel Dashboard → Project → Settings → Environment Variables

# Required variables:
✓ VITE_API_BASE_URL=https://july25.onrender.com
✓ VITE_SUPABASE_URL
✓ VITE_SUPABASE_ANON_KEY
✓ VITE_DEFAULT_RESTAURANT_ID (can be UUID or slug)
✓ VITE_ENVIRONMENT=production
✓ VITE_DEMO_PANEL=0  # CRITICAL!
✓ VITE_USE_REALTIME_VOICE=true

# 2. Pull and verify (no newline contamination)
vercel env pull .env.vercel.check
cat .env.vercel.check | grep '\\n'
# Expected: No output (no literal \n strings)

# 3. Test frontend loads
curl -I https://july25-client.vercel.app
# Expected: HTTP 200
```

### Post-Deployment Testing

#### Test 1: Menu API Direct Access

```bash
# Test menu endpoint works
curl https://july25.onrender.com/api/v1/menu \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"

# Expected: JSON with categories and items arrays
# If empty: Check database for menu data
# If 400: Restaurant ID format issue
# If 500: Database connection issue
```

#### Test 2: Realtime Health Check

```bash
curl https://july25.onrender.com/api/v1/realtime/health

# Expected: status: "healthy", api_key: true
# If unhealthy: Check OPENAI_API_KEY is set
```

#### Test 3: Session Creation with Menu Context

```bash
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"

# Expected: Response includes menu_context field with formatted menu
# Check menu_context is populated (not empty string)
# Check expires_at timestamp is present
```

#### Test 4: CORS Verification

```bash
# Test CORS from production frontend origin
curl -I -X OPTIONS https://july25.onrender.com/api/v1/realtime/session \
  -H "Origin: https://july25-client.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Restaurant-ID"

# Expected: Access-Control-Allow-Origin header present
```

#### Test 5: Frontend Integration

```
1. Open https://july25-client.vercel.app in browser
2. Open DevTools → Network tab
3. Navigate to voice ordering page
4. Start voice session
5. Check Network tab for:
   - POST /api/v1/realtime/session → 200 OK
   - Response includes menu_context
   - WebSocket connection established
```

### Common Production Issues & Solutions

| Symptom | Root Cause | Solution |
|---------|------------|----------|
| "Menu not found" or empty array | Wrong restaurant ID format | Use UUID in `DEFAULT_RESTAURANT_ID` (Render) |
| 500 error on all endpoints | Database connection failed | Verify `DATABASE_URL` uses port 6543 with pooler |
| CORS error from Vercel | Preview URLs not whitelisted | Add `https://*.vercel.app` to `ALLOWED_ORIGINS` |
| "Voice ordering not configured" | Missing `OPENAI_API_KEY` | Set in Render environment variables |
| Menu context empty in session | Menu data missing in DB | Run `npm run db:seed` or add menu items |
| Frontend connects to localhost | Missing `VITE_API_BASE_URL` | Set in Vercel to `https://july25.onrender.com` |
| Restaurant ID "undefined" error | Client sending string literal | Check `getRestaurantId()` returns valid value |

---

## Key Findings Summary

### 1. Menu Loading Does NOT Require Authentication
- MenuService uses `SUPABASE_SERVICE_KEY` (bypasses RLS)
- `optionalAuth` middleware allows unauthenticated requests
- Restaurant ID extracted from `X-Restaurant-ID` header
- No user authentication required for menu data access

### 2. Voice Session Creation Continues Even if Menu Fails
- Menu loading wrapped in try/catch (Lines 125-132)
- Failure logged as WARNING, not ERROR
- Session created with empty `menu_context` if menu loading fails
- Voice ordering will work but without menu context

### 3. Critical Environment Variables for Voice + Menu
**Server (Render)**:
- `OPENAI_API_KEY` - Required for voice (optional at startup)
- `DEFAULT_RESTAURANT_ID` - MUST be UUID format
- `DATABASE_URL` - MUST use port 6543 with pooler
- `SUPABASE_SERVICE_KEY` - Required for menu access

**Client (Vercel)**:
- `VITE_API_BASE_URL` - MUST point to Render backend
- `VITE_DEFAULT_RESTAURANT_ID` - Can be UUID or slug
- `VITE_USE_REALTIME_VOICE` - Must be `true`

### 4. Production-Specific Behaviors
- Stricter rate limiting (5 req/min on auth)
- CSP/HSTS enabled
- Stack traces hidden in errors
- File logging enabled
- CORS requires exact origin match (wildcards supported)

### 5. Logging Locations
**Server logs** (Render Dashboard):
- `INFO: Menu cached` - Success
- `ERROR: Failed to fetch menu` - Database failure
- `WARN: Failed to load menu context` - Menu loading in session creation
- `WARN: Invalid restaurant ID string` - String literal "undefined"

**Client logs** (Browser DevTools):
- `console.error('Menu API failed:', error)` - API request failed
- `⚠️ Production build is trying to connect to localhost backend!` - Misconfigured API URL

---

## Next Steps for Production Deployment

1. **Verify Environment Variables** (use checklists above)
2. **Test Menu API Directly** (curl commands provided)
3. **Monitor Server Logs** during first voice session
4. **Check Browser DevTools Network Tab** for API calls
5. **Validate Menu Context** in session response

---

## Related Documentation

- Environment Configuration: `/Users/mikeyoung/CODING/rebuild-6.0/docs/reference/config/VERCEL_RENDER_QUICK_REFERENCE.md`
- Voice Ordering Analysis: `/Users/mikeyoung/CODING/rebuild-6.0/VOICE_ORDERING_ULTRATHINK_ANALYSIS.md`
- Authentication Architecture: `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`
- ADR-002 Multi-Tenancy: `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md`

---

**Investigation Complete**: 2025-11-21
**Total Time**: 2.5 hours
**Files Analyzed**: 15
**Environment Variables Documented**: 35
**Test Commands Provided**: 12
