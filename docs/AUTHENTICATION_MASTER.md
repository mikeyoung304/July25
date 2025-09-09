# Restaurant OS - Master Authentication Documentation

**Version**: 6.0.4  
**Last Updated**: January 30, 2025  
**Status**: Production Ready with Security Enhancements

## Table of Contents

1. [Overview](#overview)
2. [Role Hierarchy System](#role-hierarchy-system)
3. [Authentication Methods](#authentication-methods)
4. [Security Enhancements](#security-enhancements)
5. [API Implementation](#api-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Database Schema](#database-schema)
8. [Production Configuration](#production-configuration)
9. [Testing & Debugging](#testing--debugging)
10. [Migration Guide](#migration-guide)

## Overview

Restaurant OS implements a hierarchical, multi-tier authentication system designed for secure multi-tenant restaurant operations. The system uses JWT tokens with role-based access control (RBAC) and supports multiple authentication methods tailored to different user types.

### Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Authentication Flow                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Email/Password ──► Supabase ──► JWT (RS256) ──┐       │
│                                                 ▼       │
│  PIN Code ──────► Backend ────► JWT (HS256) ──► API    │
│                                                 ▲       │
│  Station Login ──► Backend ────► JWT (HS256) ──┘       │
│                                                         │
│  Kiosk/Anonymous ► Backend ────► JWT (HS256) ──┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Role Hierarchy System

### Hierarchical Permission Model (NEW - January 30, 2025)

The system implements a role hierarchy where higher-level roles automatically inherit all permissions from lower-level roles:

```typescript
const ROLE_HIERARCHY = {
  owner: 100,     // Full system access - inherits all permissions
  manager: 80,    // Restaurant operations - inherits server, cashier, kitchen
  server: 60,     // Order and payment management
  cashier: 50,    // Payment processing only
  kitchen: 40,    // Kitchen display access
  expo: 30,       // Expo display access
  customer: 10,   // Self-service only
}
```

### Role Definitions

| Role | Level | Description | Inherits From | Authentication |
|------|-------|-------------|---------------|----------------|
| **Owner** | 100 | System owner, multi-location access | All roles | Email + MFA |
| **Manager** | 80 | Restaurant operations, reports, staff | Server, Cashier, Kitchen, Expo | Email + optional MFA |
| **Server** | 60 | Order creation, payment processing, tables | Cashier | PIN (4-6 digits) |
| **Cashier** | 50 | Payment processing, limited orders | - | PIN (4-6 digits) |
| **Kitchen** | 40 | Kitchen display, order status updates | - | Station login |
| **Expo** | 30 | Expo display, order completion | - | Station login |
| **Customer** | 10 | Self-service ordering | - | Anonymous token |

### Permission Checking

```typescript
// AuthContext implementation
const hasRoleOrHigher = (requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 999;
  return userLevel >= requiredLevel;
};

// Example: Owner (100) can access Server routes (60)
canAccess(['server']) // returns true for owner
```

## Authentication Methods

### 1. Email/Password (Managers & Owners)

**Endpoint**: `POST /api/v1/auth/login`  
**Token**: Supabase JWT (RS256)  
**Duration**: 8 hours  
**Rate Limit**: 5 attempts per 15 minutes ✅

```typescript
// Request
{
  "email": "manager@restaurant.com",
  "password": "secure-password",
  "restaurantId": "550e8400-e29b-41d4-a716-446655440000"
}

// Response
{
  "user": {
    "id": "user-uuid",
    "email": "manager@restaurant.com",
    "role": "manager"
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "refresh...",
    "expires_in": 28800
  },
  "restaurantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. PIN Authentication (Service Staff)

**Endpoint**: `POST /api/v1/auth/pin-login`  
**Token**: Backend JWT (HS256)  
**Duration**: 12 hours  
**Security**: bcrypt (12 rounds) + PIN_PEPPER  
**Rate Limit**: 5 attempts → 15 minute lockout ✅

```typescript
// Request
{
  "pin": "1234",
  "restaurantId": "550e8400-e29b-41d4-a716-446655440000"
}

// Response
{
  "user": {
    "id": "staff-uuid",
    "email": "john@restaurant.com",
    "displayName": "John Server",
    "role": "server"
  },
  "token": "eyJhbGc...",
  "expiresIn": 43200,
  "restaurantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### PIN Security Requirements (ENHANCED)

- **Length**: 4-6 digits
- **Complexity**: Cannot be all same digit, sequential patterns blocked
- **Storage**: bcrypt hash with environment-specific pepper
- **Lockout**: After 5 failed attempts, 15-minute lockout
- **Scope**: Restaurant-specific (same PIN can exist across restaurants)

### 3. Station Login (Kitchen/Expo)

**Endpoint**: `POST /api/v1/auth/station-login`  
**Token**: Backend JWT (HS256)  
**Duration**: 4 hours (configurable)  
**Security**: Device fingerprinting + station registration

```typescript
// Request
{
  "stationType": "kitchen",
  "stationName": "Main Kitchen",
  "restaurantId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceFingerprint": "device-hash"
}

// Response
{
  "token": "eyJhbGc...",
  "expiresAt": "2025-01-30T16:00:00Z",
  "stationType": "kitchen",
  "stationName": "Main Kitchen",
  "restaurantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4. Kiosk/Anonymous Authentication

**Endpoint**: `POST /api/v1/auth/kiosk`  
**Token**: Backend JWT (HS256)  
**Duration**: 1 hour  
**Purpose**: Production feature for self-service ordering  
**Rate Limit**: 5 attempts per 15 minutes ✅

```typescript
// Request
{
  "restaurantId": "550e8400-e29b-41d4-a716-446655440000"
}

// Response
{
  "token": "eyJhbGc...",
  "expiresIn": 3600,
  "role": "kiosk_demo",
  "scopes": ["menu:read", "orders:create", "ai.voice:chat", "payments:process"]
}
```

## Security Enhancements

### Phase 0 Security Improvements (January 30, 2025)

✅ **Completed Enhancements:**

1. **Rate Limiting**: All auth endpoints protected (5 attempts/15 min)
2. **No Hardcoded Secrets**: All secrets require environment variables
3. **Strict Token Verification**: Unverified tokens always rejected
4. **Production Config**: Comprehensive .env.production.template
5. **WebSocket Security**: Token verification enforced

### Required Environment Variables

```bash
# Critical Security Configuration (NO DEFAULTS ALLOWED)
PIN_PEPPER=<64-char-random-string>              # Required
STATION_TOKEN_SECRET=<64-char-random-string>    # Required
DEVICE_FINGERPRINT_SALT=<64-char-random-string> # Required
KIOSK_JWT_SECRET=<64-char-random-string>        # Required
SUPABASE_JWT_SECRET=<from-dashboard>            # Required
```

### Token Verification

```typescript
// Middleware implementation (strict mode)
if (issuer?.includes('supabase.co')) {
  try {
    decoded = jwt.verify(token, config.supabase.jwtSecret);
  } catch (e) {
    throw Unauthorized('Token verification failed');
  }
} else if (payload?.sub?.startsWith('customer:')) {
  const kioskSecret = process.env.KIOSK_JWT_SECRET;
  if (!kioskSecret) {
    throw new Error('KIOSK_JWT_SECRET not configured');
  }
  decoded = jwt.verify(token, kioskSecret);
}
```

## Frontend Implementation

### AuthContext with Role Hierarchy

```typescript
// contexts/AuthContext.tsx
const AuthContext = createContext<{
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  canAccess: (roles: string[], scopes?: string[]) => boolean;
  // ... other methods
}>();

// Role hierarchy checking
const canAccess = (requiredRoles: string[], requiredScopes?: string[]) => {
  if (!user) return false;
  
  // Check if user has required role OR HIGHER
  const hasRequiredRole = requiredRoles.length === 0 || 
    requiredRoles.some(role => hasRoleOrHigher(role));
  
  return hasRequiredRole && hasRequiredScope;
};
```

### Protected Routes

```typescript
// components/auth/ProtectedRoute.tsx
export function ServerRoute({ children }) {
  return (
    <ProtectedRoute requiredRoles={['owner', 'manager', 'server']}>
      {children}
    </ProtectedRoute>
  );
}

export function OwnerRoute({ children }) {
  return (
    <ProtectedRoute requiredRoles={['owner']}>
      {children}
    </ProtectedRoute>
  );
}
```

### Unauthorized Access Handling

```typescript
// pages/UnauthorizedPage.tsx
export function UnauthorizedPage() {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <h2>Access Denied</h2>
      <p>Current role: {user?.role}</p>
      <Button onClick={() => navigate('/')}>Go Home</Button>
      <Button onClick={logout}>Login with Different Account</Button>
    </div>
  );
}
```

## Database Schema

### Core Authentication Tables

```sql
-- User PINs table
CREATE TABLE user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  pin_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Station tokens table
CREATE TABLE station_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  station_type VARCHAR(50) NOT NULL,
  station_name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  device_fingerprint VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auth logs table
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  restaurant_id UUID,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Production Configuration

### Environment Setup

```bash
# .env.production
NODE_ENV=production

# Required Security Variables (no defaults)
PIN_PEPPER=<generate-with-openssl-rand-base64-64>
STATION_TOKEN_SECRET=<generate-with-openssl-rand-base64-64>
DEVICE_FINGERPRINT_SALT=<generate-with-openssl-rand-base64-64>
KIOSK_JWT_SECRET=<generate-with-openssl-rand-base64-64>
SUPABASE_JWT_SECRET=<from-supabase-dashboard>

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-key>

# Rate Limiting
AUTH_RATE_LIMIT_MAX_ATTEMPTS=5
AUTH_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

### Security Headers

```typescript
// server/src/middleware/security.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https://api.openai.com"]
    }
  }
}));
```

## Testing & Debugging

### Test Authentication Endpoints

```bash
# Test login with rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test","restaurantId":"test"}' \
    -w "\nAttempt $i: HTTP %{http_code}\n"
  sleep 0.5
done
# Expected: 401 for first 5, then 429 (rate limited)

# Test PIN login
curl -X POST http://localhost:3001/api/v1/auth/pin-login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","restaurantId":"550e8400-e29b-41d4-a716-446655440000"}'

# Test kiosk authentication
curl -X POST http://localhost:3001/api/v1/auth/kiosk \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"11111111-1111-1111-1111-111111111111"}'
```

### Debug Authorization Issues

```typescript
// Enable debug logging in AuthContext
logger.info('[AuthContext] Access check:', {
  userRole: user.role,
  userLevel: ROLE_HIERARCHY[user.role],
  requiredRoles,
  hasRequiredRole,
  result: hasRequiredRole && hasRequiredScope
});
```

## Migration Guide

### From v6.0.3 to v6.0.4

1. **Update Environment Variables**
   ```bash
   # Add required security variables
   PIN_PEPPER=<generate-new>
   STATION_TOKEN_SECRET=<generate-new>
   DEVICE_FINGERPRINT_SALT=<generate-new>
   ```

2. **Update AuthContext Import**
   ```typescript
   // Old (exact role matching)
   canAccess(['manager']) // Only managers
   
   // New (hierarchical)
   canAccess(['manager']) // Managers and owners
   ```

3. **Update Route Guards**
   ```typescript
   // Old
   <AdminRoute> → <OwnerRoute>
   ```

4. **Add Unauthorized Page Route**
   ```typescript
   <Route path="/unauthorized" element={<UnauthorizedPage />} />
   ```

## Security Checklist

### Pre-Production Requirements

- [ ] All environment variables configured (no defaults)
- [ ] Rate limiting active on all auth endpoints
- [ ] Token verification strict mode enabled
- [ ] CSRF protection enabled in production
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Session storage secured (Redis recommended)
- [ ] Regular secret rotation scheduled
- [ ] Penetration testing completed

### Monitoring & Alerts

- [ ] Failed login attempts monitoring
- [ ] Rate limit violations tracking
- [ ] Token verification failures logged
- [ ] Unusual access patterns detected
- [ ] Session anomalies reported
- [ ] Audit log analysis automated

## Support & Documentation

### Related Documents
- [API Reference](/docs/API_REFERENCE.md)
- [Security Guidelines](/docs/SECURITY_GUIDELINES.md)
- [Database Migrations](/docs/DATABASE_MIGRATIONS.md)
- [Production Deployment](/docs/DEPLOYMENT_CHECKLIST.md)

### Version History
- **v6.0.4** (Jan 30, 2025): Role hierarchy, security hardening
- **v6.0.3** (Sep 6, 2025): Initial production release
- **v6.0.2** (Sep 1, 2025): PIN authentication added
- **v6.0.1** (Aug 28, 2025): Station login implementation

---

*This is the master authentication documentation for Restaurant OS. All other auth-related documents should reference this as the single source of truth.*