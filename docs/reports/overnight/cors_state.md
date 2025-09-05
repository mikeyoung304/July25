# CORS State Report
Generated: 2025-09-05

## Current CORS Configuration
**File**: `server/src/server.ts` (Lines 71-95)

### Allowed Origins
- `http://localhost:5173` (Vite dev)
- `http://localhost:5174` (Alternative dev)
- `http://localhost:3000` (Legacy)
- `http://localhost:3001` (Backend)
- `https://july25-client.vercel.app` (Production)
- Wildcard: Any `july25-client*.vercel.app` preview deployments

### Configuration Details
```javascript
{
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'x-restaurant-id',
    'x-request-id',
    'X-CSRF-Token',
    'X-Restaurant-ID',
    'X-Demo-Token-Version'  // ⚠️ REMOVE THIS
  ],
  exposedHeaders: [
    'ratelimit-limit',
    'ratelimit-remaining', 
    'ratelimit-reset',
    'x-order-data',
    'x-transcript',
    'x-response-text'
  ],
  maxAge: 86400 // 24 hours cache
}
```

## Security Issues

### 1. Demo Token Header
**Line 92**: `X-Demo-Token-Version` in allowed headers
- **Risk**: Supports demo token bypass mechanism
- **Action**: MUST REMOVE in Phase 4

### 2. Wildcard Vercel Matching
**Lines 81-83**: Allows any `july25-client*.vercel.app`
- **Risk**: LOW - Limited to specific prefix
- **Note**: Acceptable for preview deployments

### 3. No-Origin Requests
**Line 74**: Allows requests with no origin
- **Risk**: MEDIUM - Needed for mobile/Postman
- **Note**: Common practice but monitor usage

## Preflight Handling
**Line 98**: `app.options('*', cors())`
- Handles OPTIONS requests globally
- Uses same CORS config

## Security Controls Present
✅ Credentials enabled (cookies/auth)
✅ Methods explicitly listed
✅ Headers allowlist (not wildcard)
✅ 24-hour preflight cache
✅ Origin validation with logging
✅ CSRF protection enabled (line 108)

## Phase 4 Required Changes

### Remove Demo Token Header
```diff
allowedHeaders: [
  'Content-Type',
  'Authorization', 
  'x-restaurant-id',
  'x-request-id',
  'X-CSRF-Token',
  'X-Restaurant-ID',
- 'X-Demo-Token-Version'
],
```

### Add Production Origins
When deploying to production, add:
- Production frontend URL
- Any CDN/asset domains
- Mobile app deep link origins

### Consider Stricter Origin Checking
For production:
```javascript
origin: (origin, callback) => {
  // Reject no-origin in production
  if (!origin && process.env.NODE_ENV === 'production') {
    return callback(new Error('Origin required'));
  }
  // ... rest of logic
}
```

## Files to Modify
1. `server/src/server.ts` - Remove X-Demo-Token-Version header
2. Environment config - Add ALLOWED_ORIGINS env var
3. Documentation - Update CORS policy for production