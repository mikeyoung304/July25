---
status: archived
reason: "Superseded by SECURITY.md, AUTHENTICATION_ARCHITECTURE.md, and DEPLOYMENT.md"
archived_at: "2025-10-15"
---

# Restaurant OS Authentication Failure - Root Cause Analysis

**Date:** 2025-10-06
**Status:** ROOT CAUSE IDENTIFIED ✓

---

## Executive Summary

**ALL authentication fails with "No authentication available"**

**ROOT CAUSE:** CSRF protection is blocking the `/api/v1/auth/kiosk` endpoint in production.

---

## Test Results

### 1. Backend Health ✓
```bash
curl https://july25.onrender.com/health
```
**Result:** Backend is healthy and running
```json
{"status":"healthy","timestamp":"2025-10-06T12:24:20.079Z","uptime":286.485511092,"environment":"production"}
```

### 2. Demo Login Endpoint ✗
```bash
curl https://july25.onrender.com/api/v1/auth/kiosk -X POST \
  -H "Content-Type: application/json" \
  -d '{"role":"manager","restaurantId":"11111111-1111-1111-1111-111111111111"}'
```
**Result:** 403 Forbidden - CSRF token validation failure
```json
{
  "error": "Invalid CSRF token",
  "message": "Form submission failed. Please refresh and try again."
}
```

**This is the exact point of failure.**

---

## Code Analysis

### Problem: CSRF Middleware Configuration

**File:** `server/src/middleware/csrf.ts:14-36`

The CSRF middleware has a skip list for paths that should NOT require CSRF tokens:

```typescript
// Skip CSRF for certain paths
const skipPaths = [
  '/api/v1/health',
  '/api/v1/auth/demo',              // ⚠️ WRONG PATH
  '/api/v1/realtime/session'
];
```

**The issue:** The skip list includes `/api/v1/auth/demo` but the actual endpoint is `/api/v1/auth/kiosk`.

**File:** `server/src/routes/auth.routes.ts:28`
```typescript
router.post('/kiosk', /* handler */)  // Real endpoint: /api/v1/auth/kiosk
```

### Applied in Server

**File:** `server/src/server.ts:162`
```typescript
// CSRF protection (after cookie parser, before routes)
app.use(csrfMiddleware());
```

This applies to ALL routes in production, including `/api/v1/auth/kiosk`.

### Why This Breaks Authentication

1. Frontend calls `/api/v1/auth/kiosk` without a CSRF token (client/src/services/auth/demoAuth.ts:22)
2. CSRF middleware intercepts the request
3. No CSRF token is present (and the endpoint is NOT in the skip list)
4. Backend returns 403 Forbidden with "Invalid CSRF token"
5. Frontend never receives the JWT token
6. All subsequent API calls fail with "No authentication available"
7. WebSocket connections fail because they need authentication

---

## Authentication Flow Breakdown

### Expected Flow
1. Frontend → `POST /api/v1/auth/kiosk` → Backend generates JWT
2. Frontend stores JWT in sessionStorage
3. Frontend uses JWT for API requests (Authorization header)
4. Frontend uses JWT for WebSocket connection
5. ✓ Authenticated

### Actual Flow (BROKEN)
1. Frontend → `POST /api/v1/auth/kiosk` → **CSRF middleware blocks with 403**
2. Frontend never receives JWT
3. Frontend has no token to use
4. All API requests fail with "No authentication available"
5. WebSocket connection fails with "Authentication required"
6. ✗ No authentication

---

## The Fix

**Option 1: Add kiosk endpoint to CSRF skip list (RECOMMENDED)**

**File:** `server/src/middleware/csrf.ts:24-27`

```typescript
// Skip CSRF for certain paths
const skipPaths = [
  '/api/v1/health',
  '/api/v1/auth/demo',
  '/api/v1/auth/kiosk',              // ← ADD THIS
  '/api/v1/realtime/session'
];
```

**Why this works:**
- The kiosk endpoint is designed for programmatic access (no browser forms)
- It has rate limiting protection (authRateLimiters.kiosk)
- It only accepts whitelisted restaurant IDs
- CSRF is designed to protect browser form submissions, not API endpoints

**Option 2: Remove the incorrect '/api/v1/auth/demo' path**

If `/api/v1/auth/demo` doesn't exist, remove it and add the correct `/api/v1/auth/kiosk` path.

---

## Environment Variables Check

All other environment variables are correctly configured:
- ✓ CORS is working (no CORS errors in console)
- ✓ Backend is running (health check passes)
- ✓ Frontend API base URL is correct
- ✓ WebSocket URL is correct

The ONLY issue is CSRF blocking the authentication endpoint.

---

## Verification Steps After Fix

1. Deploy the fix to production
2. Test authentication:
```bash
curl https://july25.onrender.com/api/v1/auth/kiosk -X POST \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"11111111-1111-1111-1111-111111111111"}'
```
3. Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```
4. Open frontend at https://july25-client-on0idnb4v.vercel.app
5. Click a demo login button
6. Verify user is authenticated
7. Verify WebSocket connects

---

## Conclusion

**The authentication failure is caused by CSRF protection blocking the kiosk endpoint.**

Add `/api/v1/auth/kiosk` to the CSRF skip list in `server/src/middleware/csrf.ts:24-27` and redeploy.

This is a **configuration issue**, not a logic or architectural problem. The fix is a **one-line change**.
