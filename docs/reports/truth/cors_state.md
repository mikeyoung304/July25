# CORS Configuration State
Generated: 2025-01-30

## Current CORS Settings (server/src/server.ts)

### Allowed Origins
Dynamic list with multiple Vercel deployments:
- `http://localhost:5173` (default dev)
- Multiple Vercel preview URLs
- Production domains
- **Issue**: Wildcard matching for 'july25-client' Vercel deployments

### Allowed Headers
```
Content-Type
Authorization  
x-restaurant-id
x-request-id
X-CSRF-Token
X-Restaurant-ID
```
**Issues**:
- Duplicate restaurant ID headers (x-restaurant-id and X-Restaurant-ID)
- No x-demo-token-version (good, but still referenced in client)

### Exposed Headers
```
ratelimit-limit
ratelimit-remaining
ratelimit-reset
x-order-data
x-transcript
x-response-text
```

### Methods
`GET, POST, PUT, DELETE, PATCH, OPTIONS`

### Other Settings
- `credentials: true` - Allows cookies
- `maxAge: 86400` - 24 hour preflight cache
- Preflight handler: `app.options('*', cors())`

## Security Issues
1. **Too permissive origin matching** - Wildcard for Vercel previews
2. **Duplicate headers** - Restaurant ID in two formats
3. **Missing header cleanup** - Client still sends x-demo-token-version

## Recommended Changes
1. Remove wildcard Vercel matching
2. Standardize on single restaurant ID header (X-Restaurant-ID)
3. Remove any demo-related headers from allowed list
4. Tighten origin list to specific deployments only