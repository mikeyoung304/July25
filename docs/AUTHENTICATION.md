# Authentication System

## Overview

The Macon AI Restaurant OS supports two authentication modes:
1. **Production Mode**: Supabase authentication for real users
2. **Demo Mode**: JWT-based tokens for friends & family testing

This dual approach enables testing without user accounts while maintaining production security.

## Authentication Modes

### 1. Production Authentication (Supabase)

Used for registered users with accounts.

**Flow**:
```
User Login → Supabase Auth → JWT Token → API Access
                    ↓
            Row Level Security
                    ↓
            Scoped Data Access
```

**Features**:
- Email/password authentication
- Social login providers
- Row Level Security (RLS)
- Session management
- Password recovery

### 2. Demo Authentication (Friends & Family)

Used for testing without creating accounts.

**Flow**:
```
Browser → Generate Demo Token → Sign with KIOSK_JWT_SECRET → API Access
                                            ↓
                                  Fixed Restaurant Context
                                            ↓
                                    Limited Scopes
```

**Features**:
- No login required
- Automatic token generation
- Fixed restaurant context
- Read menu, create orders permissions
- 1-hour token expiration

## Implementation Details

### Demo Token Generation

**Client**: `/client/src/services/auth/demoAuth.ts`

```typescript
export async function getDemoToken(): Promise<string> {
  // Check cache first
  const cached = sessionStorage.getItem('demo_token')
  if (cached && !isTokenExpired(cached)) {
    return cached
  }
  
  // Generate new token
  const payload = {
    sub: `demo:${generateUserId()}`,
    role: 'kiosk_demo',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    scope: ['menu:read', 'orders:create', 'ai.voice:chat'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  }
  
  // Sign with KIOSK_JWT_SECRET
  const token = await signJWT(payload)
  sessionStorage.setItem('demo_token', token)
  return token
}
```

### Server Verification

**Server**: `/server/src/middleware/auth.ts`

```typescript
// Detect demo token by 'sub' prefix
if (decoded?.sub?.startsWith('demo:')) {
  const kioskSecret = process.env.KIOSK_JWT_SECRET
  decoded = jwt.verify(token, kioskSecret)
  
  req.user = {
    id: decoded.sub,
    role: decoded.role,
    scopes: decoded.scope
  }
  req.restaurantId = decoded.restaurant_id
}
```

### Test Token Security

**CRITICAL**: Test tokens (`Bearer test-token`) are disabled in production:

```typescript
// Only works on localhost, never in deployed environments
const isDevelopment = config.nodeEnv === 'development'
const isLocalhost = !process.env.RENDER && !process.env.VERCEL
const isTestToken = token === 'test-token'

if (isDevelopment && isLocalhost && isTestToken) {
  // Allow test token for local development only
}
```

## API Authentication

### Required Headers

All API requests require:

```http
Authorization: Bearer <token>
X-Restaurant-ID: <restaurant-uuid>
```

### Token Priority

1. Supabase session token (if logged in)
2. Demo token (if no session)
3. Test token (local development only)

### HTTP Client Configuration

The HTTP client (`/client/src/services/http/httpClient.ts`) handles authentication automatically:

```typescript
// Try Supabase session first
const { data: { session } } = await supabase.auth.getSession()
if (session?.access_token) {
  headers.set('Authorization', `Bearer ${session.access_token}`)
} else {
  // Fall back to demo token
  const demoToken = await getDemoToken()
  headers.set('Authorization', `Bearer ${demoToken}`)
}

// Restaurant ID fallback
let restaurantId = getCurrentRestaurantId()
if (!restaurantId) {
  restaurantId = '11111111-1111-1111-1111-111111111111'
}
headers.set('x-restaurant-id', restaurantId)
```

## WebSocket Authentication

WebSocket connections use URL parameters for authentication:

```typescript
const token = await getDemoToken()
const wsUrl = `ws://localhost:3001/ws?token=${encodeURIComponent(token)}`
```

Server verification:
```typescript
export async function verifyWebSocketAuth(request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  
  // Verify demo token
  if (token && jwt.decode(token)?.sub?.startsWith('demo:')) {
    const decoded = jwt.verify(token, process.env.KIOSK_JWT_SECRET)
    return {
      userId: decoded.sub,
      restaurantId: decoded.restaurant_id
    }
  }
}
```

## Permission Scopes

### Demo User Scopes
```typescript
scope: [
  'menu:read',      // View menu items
  'orders:create',  // Create new orders
  'ai.voice:chat'   // Use voice ordering
]
```

### Admin Scopes
```typescript
scope: [
  'menu:write',     // Modify menu
  'orders:write',   // Update orders
  'tables:write',   // Manage tables
  'restaurant:write' // Restaurant settings
]
```

## Environment Configuration

### Required Environment Variables

**Server (.env)**
```bash
# Supabase (Production)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Demo Authentication
KIOSK_JWT_SECRET=your-secret-key-min-32-chars
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Security
NODE_ENV=production  # or development
```

**Client (.env)**
```bash
# API Connection
VITE_API_BASE_URL=http://localhost:3001
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Supabase (Optional for production)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Security Best Practices

### 1. Token Expiration
- Demo tokens: 1 hour
- Supabase tokens: 1 hour (auto-refresh)
- Ephemeral tokens: 60 seconds

### 2. Secret Management
- Never commit secrets to git
- Use environment variables
- Rotate KIOSK_JWT_SECRET regularly
- Different secrets per environment

### 3. Scope Limitations
- Demo users can only read menu and create orders
- No access to financial data
- No modification of restaurant settings
- Orders tied to demo restaurant ID

### 4. Production Safeguards
- Test tokens disabled in production
- Environment detection for local-only features
- Rate limiting on authentication endpoints
- Audit logging for auth events

## Testing Authentication

### 1. Test Demo Token Generation
```javascript
// Browser console
const { getDemoToken } = await import('./src/services/auth/demoAuth')
const token = await getDemoToken()
console.log('Demo token:', token)

// Decode to inspect
const decoded = JSON.parse(atob(token.split('.')[1]))
console.log('Token payload:', decoded)
```

### 2. Test API with Demo Token
```bash
# Get demo token from browser
TOKEN="your-demo-token"

# Test API call
curl http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
```

### 3. Test WebSocket Connection
```javascript
// Browser console
const token = await getDemoToken()
const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`)
ws.onopen = () => console.log('WebSocket connected')
ws.onmessage = (e) => console.log('Message:', e.data)
```

## Troubleshooting

### "No token provided"
- Check Authorization header format: `Bearer <token>`
- Verify token generation succeeded
- Check browser storage for cached token

### "Invalid token"
- Verify KIOSK_JWT_SECRET matches between client and server
- Check token expiration
- Ensure proper JWT structure (header.payload.signature)

### "No scopes available"
- Token missing scope array
- Using test-token in production
- Scope not included in token generation

### "Token expired"
- Demo tokens expire after 1 hour
- Clear sessionStorage to force regeneration
- Check system clock synchronization

## Migration Path

### From Demo to Production

1. **User Registration**
   - Create Supabase account
   - Verify email
   - Set user role and permissions

2. **Data Migration**
   - Associate demo orders with user account
   - Transfer preferences and history
   - Update restaurant association

3. **Feature Enablement**
   - Payment processing
   - Order history
   - Loyalty programs
   - Custom preferences

## Monitoring

### Key Metrics
- Authentication success rate
- Token expiration events
- Failed authentication attempts
- Demo vs production usage ratio

### Audit Events
```typescript
logger.info('Authentication successful', {
  userId: decoded.sub,
  role: decoded.role,
  authType: decoded.sub.startsWith('demo:') ? 'demo' : 'supabase',
  restaurantId: decoded.restaurant_id
})
```

## Future Enhancements

1. **OAuth Providers**: Google, Apple, Facebook login
2. **Biometric Auth**: FaceID, TouchID for kiosks
3. **QR Code Login**: Scan to authenticate at kiosk
4. **Session Management**: Multi-device sessions
5. **RBAC Enhancement**: Granular permission system