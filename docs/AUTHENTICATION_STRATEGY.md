# Authentication & Authorization Strategy

## Executive Summary
Comprehensive authentication system for Restaurant OS v6.0 supporting multiple user types with role-based access control (RBAC).

**Last Updated**: January 30, 2025  
**Status**: Planning Complete, Ready for Implementation  
**Priority**: CRITICAL - Blocking production deployment  

---

## User Categories & Authentication Methods

### 1. Restaurant Staff (Primary Users)
**Session Management**: JWT tokens with refresh capability

| Role | Auth Method | Session Duration | Access Level |
|------|-------------|------------------|--------------|
| **Owner** | Email + Password + MFA | 8 hours | Full system access |
| **Manager** | Email + Password | 8 hours | Restaurant operations |
| **Shift Manager** | Email + Password | 8 hours | Limited management |
| **Server** | 4-6 digit PIN | 12 hours | Order & payment |
| **Cashier** | 4-6 digit PIN | 12 hours | Payment only |
| **Kitchen Staff** | Station login | Until logout | Kitchen display |
| **Expo/Runner** | Station login | Until logout | Expo display |
| **Host** | PIN code | 12 hours | Seating only |

### 2. Customers (Self-Service)
**Session Management**: Anonymous sessions, order-based

| Access Point | Auth Required | Session Type |
|--------------|---------------|--------------|
| **Kiosk** | None | Device-based |
| **Online Order** | Optional email/phone | Order lifetime |
| **QR Table Order** | Table number | Order lifetime |
| **Voice Order** | None | Order lifetime |

### 3. System Administrators
**Session Management**: OAuth2 with hardware keys

| Role | Auth Method | Session Duration | Requirements |
|------|-------------|------------------|--------------|
| **Super Admin** | OAuth + YubiKey | 2 hours | VPN required |
| **Support Staff** | OAuth + MFA | 4 hours | Read-only access |
| **Developer** | OAuth + VPN | 2 hours | Development access |

---

## Permission Matrix by Route

| Route | Owner | Manager | Server | Cashier | Kitchen | Customer |
|-------|-------|---------|--------|---------|---------|----------|
| `/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/kitchen` | ✅ | ✅ | View | ❌ | ✅ | ❌ |
| `/expo` | ✅ | ✅ | View | ❌ | ✅ | ❌ |
| `/server` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/checkout` | ✅ | ✅ | ✅ | ✅ | ❌ | Session |
| `/kiosk` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `/order/:id` | ✅ | ✅ | ✅ | ✅ | View | ✅ |
| `/history` | ✅ | ✅ | Own | Own | ❌ | Own |
| `/performance` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## API Permission Scopes

```typescript
enum Permission {
  // Order Management
  ORDER_VIEW = 'order:view',
  ORDER_CREATE = 'order:create',
  ORDER_UPDATE = 'order:update',
  ORDER_DELETE = 'order:delete',
  ORDER_VOID = 'order:void',
  
  // Payment Operations
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',
  PAYMENT_REPORT = 'payment:report',
  
  // Menu Management
  MENU_VIEW = 'menu:view',
  MENU_UPDATE = 'menu:update',
  MENU_DELETE = 'menu:delete',
  
  // Staff Management
  STAFF_VIEW = 'staff:view',
  STAFF_CREATE = 'staff:create',
  STAFF_UPDATE = 'staff:update',
  STAFF_DELETE = 'staff:delete',
  
  // Reports & Analytics
  REPORTS_FINANCIAL = 'reports:financial',
  REPORTS_OPERATIONAL = 'reports:operational',
  REPORTS_INVENTORY = 'reports:inventory',
  
  // System Administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_AUDIT = 'system:audit',
  RESTAURANT_MANAGE = 'restaurant:manage'
}
```

---

## Implementation Plan

### Phase 1: Core Authentication (Days 1-3)
1. **JWT Infrastructure**
   - Token generation/validation
   - Refresh token mechanism
   - Token storage (httpOnly cookies)

2. **Login Components**
   - Email/password form
   - PIN pad component
   - Station selector

3. **Auth Context**
   - User state management
   - Permission checking
   - Role-based rendering

### Phase 2: Role Implementation (Days 4-5)
1. **Database Schema**
   - Users table with roles
   - Sessions table
   - Permissions mapping

2. **Protected Routes**
   - Route wrapper component
   - Permission validation
   - Redirect logic

3. **API Middleware**
   - Token validation
   - Permission checking
   - Audit logging

### Phase 3: Advanced Features (Days 6-7)
1. **Security Enhancements**
   - Rate limiting
   - Device fingerprinting
   - Suspicious activity detection

2. **User Management**
   - Password reset
   - Account lockout
   - Session management UI

---

## Database Schema

```sql
-- Core user table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  pin_code VARCHAR(6),
  role VARCHAR(50) NOT NULL,
  restaurant_id UUID NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  mfa_secret VARCHAR(255),
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Active sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255),
  device_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Role permissions mapping
CREATE TABLE role_permissions (
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role, permission)
);

-- Audit trail
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type VARCHAR(50) NOT NULL, -- login, logout, failed_login, permission_denied
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_restaurant_role ON users(restaurant_id, role);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_audit_user_date ON auth_audit_log(user_id, created_at);
```

---

## Security Requirements

### Password Policy
- **Managers**: Minimum 10 characters, 1 uppercase, 1 number, 1 special
- **PIN Codes**: 4-6 digits, unique per restaurant
- **Station Codes**: Auto-generated, rotated monthly

### Session Security
- JWT signed with RS256
- Refresh tokens rotate on use
- HttpOnly, Secure, SameSite cookies
- CSRF protection enabled

### Rate Limiting
- Login: 5 attempts per 15 minutes
- API: 100 requests per minute
- Password reset: 3 per hour

---

## Frontend Components Needed

```typescript
// Core auth components
- LoginPage.tsx
- PinPadLogin.tsx
- StationLogin.tsx
- ProtectedRoute.tsx
- PermissionGate.tsx
- LogoutButton.tsx
- SessionWarning.tsx

// Context providers
- AuthContext.tsx
- PermissionContext.tsx
- SessionContext.tsx

// User management
- UserProfile.tsx
- ChangePassword.tsx
- ManageStaff.tsx
```

---

## API Endpoints

```typescript
// Authentication
POST   /api/v1/auth/login         // Email/password login
POST   /api/v1/auth/pin-login     // PIN-based login
POST   /api/v1/auth/station-login // Station login
POST   /api/v1/auth/refresh       // Refresh token
POST   /api/v1/auth/logout        // Logout
POST   /api/v1/auth/forgot        // Password reset request
POST   /api/v1/auth/reset         // Password reset confirm

// User Management
GET    /api/v1/users              // List users (admin)
POST   /api/v1/users              // Create user
GET    /api/v1/users/:id          // Get user details
PUT    /api/v1/users/:id          // Update user
DELETE /api/v1/users/:id          // Delete user
PUT    /api/v1/users/:id/pin      // Update PIN

// Session Management
GET    /api/v1/sessions           // Active sessions
DELETE /api/v1/sessions/:id       // Revoke session
```

---

## Testing Strategy

### Unit Tests
- JWT token generation/validation
- Permission checking logic
- Password hashing/verification

### Integration Tests
- Login flows for each user type
- Protected route access
- Session expiration

### E2E Tests
- Complete auth flows
- Role-based access scenarios
- Multi-tenant isolation

---

## Monitoring & Metrics

### Key Metrics
- Login success/failure rates
- Average session duration by role
- Permission denial frequency
- Password reset requests

### Alerts
- Unusual login patterns
- Brute force attempts
- Elevated permission denials
- Session hijacking indicators

---

## Migration Path

1. **Phase 0**: Document current demo auth bypass
2. **Phase 1**: Implement core auth without breaking demo
3. **Phase 2**: Add role-based access incrementally
4. **Phase 3**: Deprecate demo mode for production
5. **Phase 4**: Full RBAC enforcement

---

## Success Criteria

- [ ] All user types can authenticate appropriately
- [ ] Role-based access enforced on all routes
- [ ] Session management working correctly
- [ ] Audit logging capturing all auth events
- [ ] No regression in user experience
- [ ] Load test passes with 100+ concurrent users
- [ ] Security audit shows no vulnerabilities

---

*This strategy provides a comprehensive, implementable plan for adding authentication to Restaurant OS while maintaining system stability and user experience.*