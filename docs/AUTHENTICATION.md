# Restaurant OS Authentication Guide

**Version**: 6.0.3  
**Last Updated**: September 6, 2025  
**Status**: Production Ready

## Overview

Restaurant OS implements a comprehensive, secure authentication system designed for multi-tenant restaurant operations. All authentication flows are handled through Supabase JWT tokens with role-based access control (RBAC).

## Authentication Architecture

### Core Principles

1. **Multi-Tier Authentication**: Different authentication methods for different user types
2. **Production-Ready Security**: Secure authentication for all user types including anonymous customers
3. **Multi-Tenant Security**: Restaurant ID validation required for all requests  
4. **Role-Based Access**: Granular permissions based on user roles
5. **Session Management**: Automatic token refresh and secure cookie handling

### Token Structure

```javascript
// JWT Payload Structure
{
  "sub": "user-uuid",
  "email": "user@restaurant.com",
  "role": "manager",
  "restaurant_id": "rest-uuid",
  "scopes": ["orders:create", "payments:process"],
  "iat": 1643723400,
  "exp": 1643752200
}
```

## User Roles & Access Levels

| Role | Description | Access Level | Authentication Method |
|------|-------------|--------------|----------------------|
| **Owner** | System owner, multi-location | Full system access | Email + MFA (Supabase JWT) |
| **Manager** | Restaurant operations | Operations, reports, staff | Email + optional MFA (Supabase JWT) |
| **Server** | Wait staff | Order creation, payments | PIN (4-6 digits, HS256 JWT) |
| **Cashier** | Front counter | Payment processing only | PIN (4-6 digits, HS256 JWT) |
| **Kitchen** | Kitchen staff | Kitchen display only | Station login (HS256 JWT) |
| **Expo** | Expediter | Expo display, completion | Station login (HS256 JWT) |
| **Customer/Kiosk** | Self-service users | Ordering only | Anonymous token (HS256 JWT) |

## Authentication Methods

### 1. Email/Password Authentication (Managers & Owners)

**Use Case**: Management-level access with full system privileges  
**Token Duration**: 8 hours  
**MFA**: Optional for managers, required for owners

#### Implementation Flow

```typescript
// Login Process
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'manager@restaurant.com',
  password: 'secure-password'
})

// Extract restaurant context
const { restaurant_id, role, scopes } = data.user.app_metadata
```

#### API Endpoint

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "manager@restaurant.com",
  "password": "secure-password",
  "remember_me": true
}

Response:
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": {
    "id": "user-uuid",
    "email": "manager@restaurant.com",
    "role": "manager",
    "restaurant_id": "rest-uuid"
  }
}
```

### 2. PIN Authentication (Service Staff)

**Use Case**: Quick access for servers and cashiers  
**Token Duration**: 12 hours  
**Security**: bcrypt hashing (12 rounds) + application-level pepper

#### PIN Requirements

- 4-6 digit numeric codes
- Restaurant-scoped (same PIN can exist across restaurants)
- Rate limited: 5 attempts → 15 minute lockout
- Pepper-enhanced bcrypt for storage

#### Implementation Flow

```typescript
// PIN Verification Process
const pinHash = await bcrypt.hash(pin + PEPPER, 12)
const user = await supabase
  .from('staff_pins')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .eq('pin_hash', pinHash)
  .single()

// Generate JWT for staff member
const token = jwt.sign({
  sub: user.id,
  restaurant_id: user.restaurant_id,
  role: user.role,
  scopes: getRoleScopes(user.role)
}, JWT_SECRET, { expiresIn: '12h' })
```

#### API Endpoint

```
POST /api/v1/auth/pin
Content-Type: application/json

{
  "pin": "1234",
  "restaurant_id": "rest-uuid",
  "station_id": "pos-01"
}

Response:
{
  "access_token": "jwt-token",
  "user": {
    "id": "staff-uuid", 
    "role": "server",
    "restaurant_id": "rest-uuid",
    "name": "John Server"
  }
}
```

### 3. Station Login (Kitchen/Expo)

**Use Case**: Shared device authentication for kitchen displays  
**Token Duration**: No expiration (device-bound)  
**Security**: Device fingerprinting + station registration

#### Device Registration

Station tokens are tied to specific devices and locations within the restaurant.

```typescript
// Station Registration
const stationToken = await registerStation({
  restaurant_id: 'rest-uuid',
  station_type: 'kitchen_display',
  device_id: 'device-fingerprint',
  location: 'main_kitchen'
})
```

#### API Endpoint

```
POST /api/v1/auth/station
Content-Type: application/json

{
  "station_code": "KITCHEN-01",
  "restaurant_id": "rest-uuid",
  "device_fingerprint": "device-hash"
}

Response:
{
  "station_token": "device-bound-jwt",
  "station": {
    "id": "station-uuid",
    "type": "kitchen_display", 
    "location": "main_kitchen",
    "restaurant_id": "rest-uuid"
  }
}
```

### 4. Anonymous Customer Authentication (Kiosk/Self-Service)

**Use Case**: Self-service ordering at kiosks, QR codes, online ordering  
**Token Duration**: 1 hour JWT tokens with limited scope  
**Security**: Restaurant-scoped, limited permissions, HS256 signing  
**Purpose**: Enables customers to order without creating accounts

#### Kiosk Authentication Endpoint

```
POST /api/v1/auth/kiosk
Content-Type: application/json

{
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}

Response:
{
  "token": "jwt-token-with-limited-scope",
  "expiresIn": 3600,
  "role": "kiosk_demo",
  "scopes": ["menu:read", "orders:create", "ai.voice:chat", "payments:process"]
}
```

#### Implementation Notes

```typescript
// Kiosk tokens use HS256 signing for performance
const token = jwt.sign(
  {
    sub: `kiosk_${restaurantId}_${timestamp}`,
    role: 'kiosk_demo',
    restaurant_id: restaurantId,
    scopes: DEMO_SCOPES,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  },
  process.env.KIOSK_JWT_SECRET,
  { algorithm: 'HS256' }
)
```

**Important**: This is NOT a security bypass. It's a production feature that enables anonymous customers to interact with the ordering system without authentication friction.

## API Scopes & Permissions

### Scope Definitions

| Scope | Description | Roles |
|-------|-------------|-------|
| `menu:read` | View menu items | All roles |
| `menu:write` | Modify menu items | Manager, Owner |
| `orders:create` | Create new orders | Server, Cashier, Manager, Owner |
| `orders:read` | View orders | All staff roles |
| `orders:update` | Modify order status | Kitchen, Expo, Manager, Owner |
| `payments:process` | Process payments | Server, Cashier, Manager, Owner |
| `payments:refund` | Issue refunds | Manager, Owner |
| `reports:view` | View reports | Manager, Owner |
| `staff:manage` | Manage staff | Owner |
| `ai.voice:chat` | Voice ordering | All roles |

### Role-Scope Mapping

```typescript
const ROLE_SCOPES = {
  owner: ['*'], // All scopes
  manager: [
    'menu:read', 'menu:write', 'orders:create', 'orders:read', 
    'orders:update', 'payments:process', 'payments:refund',
    'reports:view', 'ai.voice:chat'
  ],
  server: [
    'menu:read', 'orders:create', 'orders:read', 
    'payments:process', 'ai.voice:chat'
  ],
  cashier: [
    'menu:read', 'orders:create', 'orders:read',
    'payments:process'
  ],
  kitchen: ['orders:read', 'orders:update'],
  expo: ['orders:read', 'orders:update'],
  customer: ['menu:read', 'orders:create']
}
```

## Security Implementation

### Token Validation Middleware

```typescript
// auth-middleware.ts
export const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    
    // Validate restaurant context
    if (req.body.restaurant_id && req.body.restaurant_id !== decoded.restaurant_id) {
      throw new Error('Restaurant ID mismatch')
    }
    
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

### Scope Validation

```typescript
// scope-middleware.ts
export const requireScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userScopes = req.user?.scopes || []
    
    if (!userScopes.includes(requiredScope) && !userScopes.includes('*')) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredScope,
        provided: userScopes
      })
    }
    
    next()
  }
}
```

### Rate Limiting

```typescript
// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditLogger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    })
    res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: '15 minutes'
    })
  }
})
```

## Frontend Integration

### Auth Context Provider

```tsx
// AuthContext.tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('auth_token')
    if (token) {
      validateAndSetUser(token)
    }
    setLoading(false)
  }, [])
  
  const login = async (credentials: LoginCredentials) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    
    const data = await response.json()
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token)
      setUser(data.user)
    }
    
    return data
  }
  
  const logout = async () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    // Call logout endpoint for audit logging
    await fetch('/api/v1/auth/logout', { method: 'POST' })
  }
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Protected Routes

```tsx
// ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredScope?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredScope
}) => {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingSpinner />
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />
  }
  
  if (requiredScope && !user.scopes.includes(requiredScope)) {
    return <Navigate to="/insufficient-permissions" />
  }
  
  return <>{children}</>
}
```

### API Client with Auth

```typescript
// api-client.ts
class ApiClient {
  private baseURL = '/api/v1'
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('auth_token')
    const restaurantId = this.getRestaurantId()
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': restaurantId,
        ...options.headers
      }
    })
    
    if (response.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login'
      throw new Error('Authentication required')
    }
    
    return response.json()
  }
  
  async createOrder(orderData: CreateOrderRequest) {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    })
  }
}
```

## Audit Logging

### Event Types

All authentication events are logged with structured data:

```typescript
// audit-events.ts
export enum AuditEventType {
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILED = 'auth.login.failed',
  LOGOUT = 'auth.logout',
  TOKEN_REFRESH = 'auth.token.refresh',
  PERMISSION_DENIED = 'auth.permission.denied',
  RATE_LIMIT_EXCEEDED = 'auth.rate_limit.exceeded',
  PIN_CREATED = 'auth.pin.created',
  PIN_UPDATED = 'auth.pin.updated',
  STATION_REGISTERED = 'auth.station.registered'
}

export interface AuditEvent {
  id: string
  event_type: AuditEventType
  user_id?: string
  restaurant_id: string
  ip_address: string
  user_agent: string
  metadata: Record<string, any>
  timestamp: Date
}
```

### Logging Implementation

```typescript
// audit-logger.ts
export class AuditLogger {
  static async log(event: Partial<AuditEvent>) {
    const auditEvent: AuditEvent = {
      id: generateUUID(),
      timestamp: new Date(),
      ...event
    }
    
    // Store in database
    await supabase
      .from('audit_events')
      .insert([auditEvent])
    
    // Real-time monitoring
    if (event.event_type?.includes('failed') || event.event_type?.includes('denied')) {
      await this.alertSecurity(auditEvent)
    }
  }
  
  static async alertSecurity(event: AuditEvent) {
    // Send alert for suspicious activity
    console.warn('Security Alert:', event)
  }
}
```

## Error Handling

### Common Error Scenarios

```typescript
// auth-errors.ts
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH001',
  TOKEN_EXPIRED = 'AUTH002', 
  INSUFFICIENT_PERMISSIONS = 'AUTH003',
  RATE_LIMIT_EXCEEDED = 'AUTH004',
  RESTAURANT_MISMATCH = 'AUTH005',
  PIN_LOCKED = 'AUTH006',
  STATION_NOT_REGISTERED = 'AUTH007'
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
```

### Error Response Format

```json
{
  "error": {
    "code": "AUTH003",
    "message": "Insufficient permissions to access this resource",
    "details": {
      "required_scope": "payments:process",
      "user_scopes": ["menu:read", "orders:create"]
    }
  },
  "timestamp": "2025-01-30T10:30:00Z",
  "request_id": "req-uuid"
}
```

## Testing & Development

### Test User Accounts

For development and testing, create proper test accounts through Supabase:

```sql
-- Development test users
INSERT INTO auth.users (email, encrypted_password) VALUES 
  ('manager@test.com', crypt('password123', gen_salt('bf'))),
  ('server@test.com', crypt('password123', gen_salt('bf')));

-- Staff PIN codes (development only)
INSERT INTO staff_pins (restaurant_id, user_id, pin_hash, role) VALUES
  ('dev-restaurant-id', 'server-user-id', crypt('1234' || 'pepper', gen_salt('bf')), 'server');
```

### Environment Configuration

```bash
# .env.development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
BCRYPT_PEPPER=your-bcrypt-pepper
NODE_ENV=development
```

### Testing Authentication

```typescript
// auth.test.ts
describe('Authentication', () => {
  test('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'manager@test.com',
        password: 'password123'
      })
    
    expect(response.status).toBe(200)
    expect(response.body.access_token).toBeDefined()
    expect(response.body.user.role).toBe('manager')
  })
  
  test('should require valid scope for protected endpoints', async () => {
    const token = await getTestToken('server') // Limited scopes
    
    const response = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('AUTH003')
  })
})
```

## Troubleshooting

### Common Issues

1. **Token Expired Errors**
   - Check token expiration time
   - Implement automatic refresh logic
   - Verify system clock synchronization

2. **Restaurant ID Mismatch**
   - Ensure restaurant context is properly set
   - Validate restaurant ID in all requests
   - Check multi-tenant isolation

3. **Permission Denied Errors**  
   - Verify user role and scopes
   - Check scope requirements for endpoint
   - Review RBAC configuration

4. **Rate Limiting**
   - Implement exponential backoff
   - Add user feedback for locked accounts
   - Monitor failed login attempts

### Debug Tools

```typescript
// auth-debug.ts
export const debugAuth = {
  verifyToken: (token: string) => {
    try {
      const decoded = jwt.decode(token)
      console.log('Token payload:', decoded)
      return decoded
    } catch (error) {
      console.error('Token decode error:', error)
      return null
    }
  },
  
  checkScopes: (userScopes: string[], requiredScope: string) => {
    const hasScope = userScopes.includes(requiredScope) || userScopes.includes('*')
    console.log(`Scope check: ${requiredScope} - ${hasScope ? 'PASS' : 'FAIL'}`)
    return hasScope
  }
}
```

## Migration Guide

### From Demo Authentication (v6.0.3 → v6.0.4)

1. **Remove Demo Code**
   ```typescript
   // ❌ Remove these patterns
   getDemoToken()
   DemoAuthService
   sessionStorage.getItem('DEMO_AUTH_TOKEN')
   
   // ✅ Replace with proper auth
   const { data } = await supabase.auth.getSession()
   ```

2. **Update API Calls**
   ```typescript
   // ❌ Old demo pattern  
   headers: { 'Authorization': `Bearer ${getDemoToken()}` }
   
   // ✅ New Supabase pattern
   headers: { 'Authorization': `Bearer ${session.access_token}` }
   ```

3. **Add Restaurant Validation**
   ```typescript
   // ✅ Always include restaurant_id
   const response = await apiClient.post('/orders', {
     ...orderData,
     restaurant_id: user.restaurant_id
   })
   ```

---

## Related Documentation

- [API Reference](/docs/api/README.md)
- [Security Policy](/SECURITY.md) 
- [Architecture Overview](/docs/architecture/README.md)
- [RBAC Implementation](/docs/architecture/rbac.md)
- [Audit Logging Guide](/docs/audit-logging.md)

---

**Security Notice**: This authentication system handles sensitive user data and payment information. Always follow security best practices and conduct regular security audits.

For security issues, please contact: security@restaurant-os.com