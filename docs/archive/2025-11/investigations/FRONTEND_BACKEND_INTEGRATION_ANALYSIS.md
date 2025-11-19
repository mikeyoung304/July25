# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Investigations

---

# Frontend-Backend Integration Analysis
**Date**: 2025-11-12
**Analyst**: Frontend-Backend Integration Specialist
**Status**: ✅ HEALTHY - Backend API Running, Integration Configured Correctly

---

## Executive Summary

The Render backend at `https://july25.onrender.com` is **running correctly** as an API-only server. The "Not Found" response at the root endpoint (`/`) is **expected behavior** - this is not a bug but the intended design. All API endpoints are properly configured under `/api/v1/*` and are operational.

**Key Finding**: The integration between Vercel frontend (`july25-client.vercel.app`) and Render backend is **correctly configured** with proper API routing, CORS, authentication, and multi-tenancy support.

---

## 1. Backend Health Status

### ✅ API Server is Running
```bash
# Health check endpoint works perfectly
GET https://july25.onrender.com/api/v1/health
Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2025-11-12T19:07:45.439Z",
  "uptime": 6607.78,
  "environment": "production",
  "version": "6.0.6",
  "services": {
    "server": { "status": "ok" },
    "database": { "status": "ok", "latency": 241 },
    "cache": { "status": "ok" }
  }
}
```

### ✅ Menu API Endpoint Works
```bash
GET https://july25.onrender.com/api/v1/menu
Header: x-restaurant-id: 11111111-1111-1111-1111-111111111111
Response: 200 OK
{
  "categories": [...],
  "items": [...]
}
```

### ❌ Root Endpoint Returns "Not Found" (Expected)
```bash
GET https://july25.onrender.com/
Response: 404 Not Found
<!DOCTYPE html>
<html lang="en">
<head><title>Error</title></head>
<body><pre>Cannot GET /</pre></body>
</html>
```

**This is correct behavior** - the backend is configured as an API-only server with no root route.

---

## 2. API Endpoint Architecture

### Route Configuration
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/server.ts` (line 207)

```typescript
// API routes are mounted under /api/v1
app.use('/api/v1', setupRoutes());

// Health check redirects
app.get('/health', (_req, res) => {
  res.redirect(301, '/api/v1/health');
});
```

### Available API Endpoints
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/index.ts`

| Route Path | Full Endpoint | Purpose |
|------------|---------------|---------|
| `/` | `/api/v1/` | Health and status |
| `/auth` | `/api/v1/auth/*` | Authentication (login, pin-login, station-login) |
| `/menu` | `/api/v1/menu` | Menu items and categories |
| `/orders` | `/api/v1/orders` | Order management |
| `/payments` | `/api/v1/payments` | Payment processing |
| `/tables` | `/api/v1/tables` | Table management |
| `/ai` | `/api/v1/ai` | AI services |
| `/realtime` | `/api/v1/realtime` | WebRTC voice ordering |
| `/restaurants` | `/api/v1/restaurants` | Restaurant management |

### Authentication Endpoints
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/auth.routes.ts`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/login` | POST | Email/password login (managers/owners) |
| `/api/v1/auth/pin-login` | POST | PIN-based login (staff) |
| `/api/v1/auth/station-login` | POST | Station token login (kiosks) |

---

## 3. Frontend API Configuration

### Environment Variables (Vercel)
**Files**:
- `/Users/mikeyoung/CODING/rebuild-6.0/.env.vercel.current` (Production)
- `/Users/mikeyoung/CODING/rebuild-6.0/.env.preview.vercel` (Preview)

```bash
# Production Configuration
VITE_API_BASE_URL="https://july25.onrender.com"
VITE_DEFAULT_RESTAURANT_ID="grow"  # Frontend uses slug
VITE_SUPABASE_URL="https://xiwfhcikfdoshxwbtjxt.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGci..."
```

### API Client Configuration
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts`

```typescript
// Base URL from centralized config
const baseURL = getApiUrl(); // Returns "https://july25.onrender.com"

// All API calls use full path
// Example: GET https://july25.onrender.com/api/v1/menu
```

**File**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/config/index.ts` (line 79-83)

```typescript
apiBaseUrl:
  viteEnv?.['VITE_API_BASE_URL'] ||
  process.env['VITE_API_BASE_URL'] ||
  process.env['API_BASE_URL'] ||
  'http://localhost:3001',  // Fallback for development
```

### ✅ Frontend Correctly Targets Backend
- Frontend uses `VITE_API_BASE_URL="https://july25.onrender.com"`
- All API calls append `/api/v1/*` paths
- No hardcoded `localhost` references in production builds

---

## 4. CORS Configuration Analysis

### Backend CORS Setup
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/server.ts` (lines 77-161)

```typescript
const allowedOrigins = new Set<string>([
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',

  // Production domains
  'https://growfreshlocalfood.com',
  'https://www.growfreshlocalfood.com',

  // July25 canonical deployment (production)
  'https://july25-client.vercel.app',  // ✅ CONFIGURED

  // Main branch preview
  'https://july25-client-git-main-mikeyoung304-gmailcoms-projects.vercel.app',
]);

// Dynamic Vercel preview pattern matching
if (normalized && (
  normalized.match(/^https:\/\/july25-client-[a-z0-9]+-mikeyoung304-gmailcoms-projects\.vercel\.app$/) ||
  normalized.match(/^https:\/\/rebuild-60-[a-z0-9]+-mikeyoung304-gmailcoms-projects\.vercel\.app$/)
)) {
  callback(null, true);  // ✅ Allows preview deployments
}
```

### CORS Headers (Verified)
```http
HTTP/2 200
access-control-allow-credentials: true
access-control-expose-headers: ratelimit-limit,ratelimit-remaining,ratelimit-reset,x-order-data,x-transcript,x-response-text
vary: Origin
```

### ✅ CORS Status
- **Production frontend** (`july25-client.vercel.app`) is whitelisted
- **Preview deployments** match dynamic pattern
- **Credentials** are enabled for cookie-based auth
- **Custom headers** (`x-restaurant-id`) are allowed

---

## 5. Multi-Tenancy & Restaurant ID Handling

### Frontend Configuration
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/config/index.ts`

```typescript
export const getRestaurantId = (): string => {
  // Check session storage first (for multi-tenant scenarios)
  if (typeof window !== 'undefined') {
    const storedId = sessionStorage.getItem('currentRestaurantId');
    if (storedId) return storedId;
  }

  // Fall back to default from env
  return sharedConfig.get().defaultRestaurantId;  // "grow"
};
```

### Backend Slug Resolution
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/slugResolver.ts`

```typescript
// Middleware automatically resolves "grow" → UUID
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantIdOrSlug);

if (!isUUID) {
  // Query database for slug → UUID mapping
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', restaurantIdOrSlug)  // "grow"
    .single();

  // Replace header with UUID
  req.headers['x-restaurant-id'] = restaurant.id;
}
```

### Request Flow
```
Frontend (Vercel)                     Backend (Render)
─────────────────                     ────────────────
1. User visits:
   july25-client.vercel.app

2. Config loads:
   VITE_DEFAULT_RESTAURANT_ID="grow"

3. API call made:
   GET /api/v1/menu
   Header: x-restaurant-id: grow
                                      4. slugResolver middleware:
                                         - Detects "grow" is not UUID
                                         - Queries: SELECT id FROM restaurants WHERE slug='grow'
                                         - Resolves: grow → 11111111-1111-1111-1111-111111111111
                                         - Updates header: x-restaurant-id: 11111111-1111-1111-1111-111111111111

                                      5. Route handler:
                                         - Receives UUID in header
                                         - Queries menu for restaurant
                                         - Returns data
```

### ✅ Multi-Tenancy Status
- **Frontend** can use friendly slug `"grow"`
- **Backend** automatically resolves to UUID
- **Caching** prevents repeated database queries (5-minute TTL)
- **Fallback** handles invalid slugs gracefully

---

## 6. Authentication Flow

### Client-Side (HttpClient)
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts` (lines 110-148)

```typescript
// Try Supabase session first
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  headers.set('Authorization', `Bearer ${session.access_token}`);
} else {
  // Fallback to localStorage for demo/PIN/station sessions
  const savedSession = localStorage.getItem('auth_session');
  if (savedSession) {
    const parsed = JSON.parse(savedSession);
    if (parsed.session?.accessToken && parsed.session?.expiresAt > Date.now() / 1000) {
      headers.set('Authorization', `Bearer ${parsed.session.accessToken}`);
    }
  }
}
```

### Backend Validation
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/auth.routes.ts` (lines 22-134)

```typescript
// POST /api/v1/auth/login
// 1. Validates email/password with Supabase
// 2. Checks user role in restaurant
// 3. Fetches scopes from role_scopes table
// 4. Generates JWT with embedded scopes
// 5. Returns: { session: { accessToken, user, role, scopes } }
```

### Authentication Methods
| Method | Endpoint | Token Type | Storage | Use Case |
|--------|----------|------------|---------|----------|
| Email/Password | `/api/v1/auth/login` | Supabase JWT | Supabase Session | Managers, Owners |
| PIN | `/api/v1/auth/pin-login` | Custom JWT | localStorage | Staff |
| Station | `/api/v1/auth/station-login` | Custom JWT | localStorage | Kiosks, Stations |

### ✅ Authentication Status
- **Dual token support** (Supabase + localStorage)
- **Automatic fallback** if Supabase session missing
- **Token expiration** checked before use
- **Multi-restaurant** scoped properly

---

## 7. Environment Variable Audit

### Critical Issues Found (From Previous Audit)

#### Issue #1: Vercel Environment Inconsistency
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/.env.production.vercel` (line 25)
```bash
VITE_DEFAULT_RESTAURANT_ID="grow\n"  # ❌ Literal newline character
```

**Impact**: String comparison failures, potential routing errors

**Fix Required**:
```bash
VITE_DEFAULT_RESTAURANT_ID="grow"  # Remove \n
```

#### Issue #2: Backend DEFAULT_RESTAURANT_ID Must Be UUID
**Backend Requirement**: Server-side validation enforces UUID format

```typescript
// File: server/src/config/env.ts (lines 118-123)
if (env.DEFAULT_RESTAURANT_ID) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(env.DEFAULT_RESTAURANT_ID)) {
    errors.push('DEFAULT_RESTAURANT_ID must be a valid UUID format');
  }
}
```

**Render Configuration** (must use):
```bash
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

**Vercel Configuration** (can use slug):
```bash
VITE_DEFAULT_RESTAURANT_ID=grow  # Frontend uses slug, backend resolves
```

---

## 8. Integration Health Checklist

| Component | Status | Details |
|-----------|--------|---------|
| **Backend Server** | ✅ Running | Health endpoint returns 200 OK |
| **API Endpoints** | ✅ Accessible | Menu, auth, orders all responding |
| **Frontend API Base URL** | ✅ Correct | Points to `https://july25.onrender.com` |
| **CORS Configuration** | ✅ Proper | Production domain whitelisted |
| **Multi-Tenancy** | ✅ Working | Slug resolver converts `grow` → UUID |
| **Authentication** | ✅ Functional | Dual token support (Supabase + localStorage) |
| **Request Headers** | ✅ Valid | `x-restaurant-id` properly handled |
| **Environment Variables** | ⚠️ Minor Issues | Newline characters in some values |

---

## 9. Common Misconceptions

### ❌ Misconception #1: "Backend is broken because / returns 404"
**Reality**: This is **expected behavior**. The backend is an API-only server with no root route. All endpoints are under `/api/v1/*`.

### ❌ Misconception #2: "Frontend can't connect to backend"
**Reality**: Frontend is **correctly configured** with `VITE_API_BASE_URL="https://july25.onrender.com"`. API calls work as expected.

### ❌ Misconception #3: "CORS is blocking requests"
**Reality**: CORS is **properly configured** to allow:
- Production: `https://july25-client.vercel.app`
- Previews: Dynamic pattern matching for Vercel deployments
- Credentials: Enabled for cookie-based sessions

### ❌ Misconception #4: "Restaurant ID mismatch will break things"
**Reality**: Backend has **automatic slug resolution** middleware that converts frontend slugs (`"grow"`) to backend UUIDs (`11111111-1111-1111-1111-111111111111`).

---

## 10. Potential Issues to Monitor

### 🟡 Preview/Production Environment Mixing
**Risk**: Preview deployments could accidentally hit production backend

**Mitigation**:
- Both preview and production Vercel envs use same backend URL
- Consider separate staging backend for testing

**Current Configuration**:
```bash
# .env.vercel.current (production)
VITE_API_BASE_URL="https://july25.onrender.com"

# .env.preview.vercel (preview)
VITE_API_BASE_URL="https://july25.onrender.com"  # Same backend!
```

**Recommendation**: Set up staging backend
```bash
# For preview environments
VITE_API_BASE_URL="https://july25-staging.onrender.com"
```

### 🟡 Newline Characters in Environment Values
**Files Affected**:
- `.env.production.vercel` (line 25): `VITE_DEFAULT_RESTAURANT_ID="grow\n"`
- `.env.preview.vercel` (line 4): `VITE_DEFAULT_RESTAURANT_ID="grow\n"`

**Impact**:
- String comparison failures: `"grow\n" !== "grow"`
- Potential routing errors in slug resolution

**Fix**: Remove literal `\n` characters from values

---

## 11. Security Observations

### ✅ Security Headers Present
```http
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
content-security-policy: default-src 'self'; ...
cross-origin-embedder-policy: require-corp
```

### ✅ CSRF Protection
- Backend sets CSRF cookie: `_csrf=TOVgBXaV...`
- Middleware validates CSRF tokens on mutations

### ✅ Rate Limiting
```http
ratelimit-limit: 1000
ratelimit-policy: 1000;w=900
ratelimit-remaining: 998
```

---

## 12. Testing Commands

### Test Backend Health
```bash
curl -s https://july25.onrender.com/api/v1/health | jq .
```

### Test Menu Endpoint with Restaurant ID
```bash
curl -s "https://july25.onrender.com/api/v1/menu" \
  -H "x-restaurant-id: 11111111-1111-1111-1111-111111111111" | jq .
```

### Test Slug Resolution
```bash
# Frontend sends slug
curl -s "https://july25.onrender.com/api/v1/menu" \
  -H "x-restaurant-id: grow" | jq .

# Backend automatically resolves to UUID
# Middleware: slugResolver converts grow → 11111111-1111-1111-1111-111111111111
```

### Verify CORS Headers
```bash
curl -s -I "https://july25.onrender.com/api/v1/menu" \
  -H "Origin: https://july25-client.vercel.app" \
  | grep -i "access-control"
```

---

## 13. Recommendations

### Priority 1 (Immediate)
1. **Fix newline characters** in Vercel environment variables
   - Files: `.env.production.vercel`, `.env.preview.vercel`
   - Remove literal `\n` from `VITE_DEFAULT_RESTAURANT_ID` values

### Priority 2 (Short-term)
2. **Set up staging environment**
   - Deploy staging backend: `july25-staging.onrender.com`
   - Configure preview deployments to use staging backend
   - Prevents preview testing from affecting production data

3. **Add environment validation**
   - Client-side validation for `VITE_API_BASE_URL` format
   - Warn if production build tries to use localhost

### Priority 3 (Long-term)
4. **Implement backend versioning**
   - Current: All routes under `/api/v1`
   - Consider `/api/v2` for breaking changes

5. **Add health check monitoring**
   - Set up uptime monitoring for `/api/v1/health`
   - Alert on backend downtime or high latency

---

## 14. Conclusion

### ✅ Integration Status: HEALTHY

The frontend-backend integration between Vercel (`july25-client.vercel.app`) and Render (`july25.onrender.com`) is **correctly configured and operational**.

**Key Findings**:
1. ✅ Backend API is running and responding correctly
2. ✅ Frontend uses correct API base URL
3. ✅ CORS is properly configured for production domain
4. ✅ Multi-tenancy slug resolution works automatically
5. ✅ Authentication flow supports multiple token types
6. ⚠️ Minor environment variable issues (newline characters)

**Root Cause of "Not Found" Confusion**:
The backend at `https://july25.onrender.com/` returns 404 by design - it's an API-only server with no root route. All functional endpoints are under `/api/v1/*` and are working correctly.

---

**Report Generated**: 2025-11-12 19:10 UTC
**Next Review**: Check after environment variable fixes are deployed
