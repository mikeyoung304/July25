# Authentication Tiers - Restaurant OS v6.0.3

## Overview
Restaurant OS implements a multi-tier authentication system designed for different user types and security requirements.

## Authentication Tiers

### Tier 1: Manager Authentication (Highest Security)
**Users**: Owners, Managers  
**Method**: Email + Password  
**Token Type**: Supabase JWT (RS256)  
**Session Duration**: 8 hours  
**MFA Support**: Optional (when enabled)  

**Features**:
- Full system access
- Financial reports
- Staff management
- Multi-location support
- System configuration

**Implementation**:
```typescript
// Endpoint: POST /api/v1/auth/login
{
  email: "manager@restaurant.com",
  password: "SecurePassword123!",
  restaurant_id: "uuid"
}
```

### Tier 2: Staff Authentication (Medium Security)
**Users**: Servers, Cashiers  
**Method**: 4-6 digit PIN  
**Token Type**: Supabase JWT (RS256)  
**Session Duration**: 12 hours  
**Scope**: Restaurant-specific  

**Features**:
- Order creation/management
- Payment processing
- Table management
- Limited reports

**Implementation**:
```typescript
// Endpoint: POST /api/v1/auth/pin-login
{
  pin: "1234",
  restaurant_id: "uuid"
}
```

**Security**:
- PIN hashed with bcrypt (12 rounds)
- Application-level pepper added
- Rate limiting: 5 attempts → 15 min lockout

### Tier 3: Station Authentication (Shared Device)
**Users**: Kitchen Staff, Expo Staff  
**Method**: Manager-created station token  
**Token Type**: JWT (HS256)  
**Session Duration**: 24 hours  
**Device**: Shared terminals  

**Features**:
- Kitchen display access
- Order status updates
- Expo management
- Read-only menu access

**Implementation**:
```typescript
// Endpoint: POST /api/v1/auth/station-login
// Requires manager authentication
{
  station_type: "kitchen" | "expo",
  restaurant_id: "uuid"
}
```

### Tier 4: Customer Authentication (Self-Service)
**Users**: Kiosk Users, Online Customers, QR Code Orders  
**Method**: Anonymous session  
**Token Type**: JWT (HS256)  
**Session Duration**: 1 hour  
**Scope**: Order creation only  

**Features**:
- Browse menu
- Create orders
- Make payments
- Track order status

**Implementation**:
```typescript
// Endpoint: POST /api/v1/auth/kiosk
{
  restaurant_id: "uuid"
}
```

**Important**: This is a production feature, NOT a security bypass. It enables legitimate self-service ordering with appropriate limitations.

## Token Structure

### Manager/Staff Token (RS256)
```json
{
  "sub": "user-uuid",
  "email": "user@restaurant.com",
  "role": "manager",
  "restaurant_id": "restaurant-uuid",
  "scopes": ["orders:*", "payments:*", "staff:manage"],
  "iat": 1706620800,
  "exp": 1706649600
}
```

### Station Token (HS256)
```json
{
  "station_id": "station-uuid",
  "station_type": "kitchen",
  "restaurant_id": "restaurant-uuid",
  "role": "station",
  "scopes": ["orders:read", "orders:update_status"],
  "iat": 1706620800,
  "exp": 1706707200
}
```

### Customer Token (HS256)
```json
{
  "session_id": "session-uuid",
  "restaurant_id": "restaurant-uuid",
  "role": "customer",
  "scopes": ["menu:read", "orders:create", "payments:create"],
  "iat": 1706620800,
  "exp": 1706624400
}
```

## Permission Matrix

| Feature | Owner | Manager | Server | Cashier | Kitchen | Expo | Customer |
|---------|-------|---------|--------|---------|---------|------|----------|
| View Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Own only |
| Create Orders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Update Order Status | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Process Payments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Manage Staff | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | Limited | ❌ | ❌ | ❌ | ❌ |
| System Config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multi-Location | ✅ | Limited | ❌ | ❌ | ❌ | ❌ | ❌ |

## Security Features

### Rate Limiting
- Authentication: 5 attempts per 15 minutes
- API calls: 100 per minute (general)
- AI services: 10 per minute

### Session Management
- Automatic token refresh
- Secure cookie storage (HttpOnly, Secure, SameSite)
- Session invalidation on logout
- Device fingerprinting for suspicious activity

### Audit Logging
All authentication events are logged:
- Login attempts (success/failure)
- Token creation/refresh
- Permission changes
- Security violations

### CSRF Protection
- X-CSRF-Token header required
- Token rotation on sensitive operations
- SameSite cookie attribute

### Database Security
- Row-level security (RLS) in Supabase
- Restaurant ID validation on all queries
- Prepared statements for SQL injection prevention

## Implementation Guidelines

### Frontend
```typescript
// Check authentication
const isAuthenticated = !!token && !isTokenExpired(token);

// Check permissions
const canManageStaff = user.role === 'owner' || user.role === 'manager';

// Protect routes
<ProtectedRoute requiredRole={['manager', 'owner']}>
  <StaffManagement />
</ProtectedRoute>
```

### Backend
```typescript
// Middleware chain
router.post('/sensitive-operation',
  authenticate,           // Verify token
  requireRole(['manager']), // Check role
  requireScope(['staff:write']), // Check scope
  validateRestaurantAccess, // Verify restaurant access
  handler
);
```

## Migration from Previous Versions

### v5.x → v6.0
- Demo credentials removed
- Kiosk endpoint now production feature
- PIN authentication added
- Station tokens introduced
- Scope-based permissions implemented

## Troubleshooting

### Common Issues

1. **"No access to this restaurant"**
   - Verify user is in user_restaurants table
   - Check restaurant_id in token matches request

2. **"Invalid PIN"**
   - Ensure PIN is hashed before storage
   - Verify pepper is configured

3. **"Token expired"**
   - Implement automatic refresh
   - Check token expiry before API calls

4. **"Insufficient permissions"**
   - Verify role and scopes in token
   - Check middleware chain order

## Best Practices

1. **Never bypass authentication** - All features have appropriate tier
2. **Use appropriate tier** - Don't use manager auth for kiosk
3. **Implement token refresh** - Avoid forcing re-login
4. **Log security events** - Track all auth activities
5. **Rate limit endpoints** - Prevent brute force attacks
6. **Validate restaurant context** - Always check restaurant_id
7. **Use HTTPS in production** - Protect tokens in transit
8. **Rotate secrets regularly** - Update JWT secrets periodically