# Role-Based Access Control (RBAC) Guide

## Overview

Restaurant OS implements a comprehensive RBAC system with 7 distinct user roles, each with specific permissions and access levels. This guide covers implementation details, permission management, and best practices.

## User Roles

### 1. Owner
**Access Level**: Full system access
**Authentication**: Email/Password with optional MFA
**Session Duration**: 8 hours

**Permissions**:
- All system features
- Financial reports and analytics
- Multi-location management
- Staff management across all locations
- System configuration
- Database management
- API access to all endpoints

**Scopes**:
```javascript
[
  'system:*',
  'restaurants:*',
  'users:*',
  'reports:*',
  'settings:*'
]
```

### 2. Manager
**Access Level**: Restaurant operations
**Authentication**: Email/Password
**Session Duration**: 8 hours

**Permissions**:
- Restaurant-level operations
- Staff management (single location)
- Reports and analytics (location-specific)
- Menu management
- Inventory control
- Schedule management
- Order management

**Scopes**:
```javascript
[
  'restaurant:manage',
  'staff:manage',
  'menu:*',
  'orders:*',
  'reports:read',
  'inventory:*',
  'schedule:*'
]
```

### 3. Server
**Access Level**: Front-of-house operations
**Authentication**: PIN Code (4-6 digits)
**Session Duration**: 12 hours

**Permissions**:
- Create and modify orders
- Process payments
- View and manage tables
- Access customer information
- Apply discounts (limited)
- View daily reports

**Scopes**:
```javascript
[
  'orders:create',
  'orders:update',
  'orders:read',
  'payments:process',
  'tables:manage',
  'customers:read',
  'discounts:apply'
]
```

### 4. Cashier
**Access Level**: Payment processing
**Authentication**: PIN Code (4-6 digits)
**Session Duration**: 12 hours

**Permissions**:
- Process payments
- Issue refunds (with approval)
- View order history
- Print receipts
- Basic order modifications
- Cash drawer management

**Scopes**:
```javascript
[
  'payments:process',
  'payments:refund',
  'orders:read',
  'receipts:print',
  'drawer:manage'
]
```

### 5. Kitchen
**Access Level**: Kitchen display only
**Authentication**: Station Login
**Session Duration**: 24 hours (device-based)

**Permissions**:
- View incoming orders
- Update order status
- Mark items as prepared
- View order queue
- Access recipe information
- Report inventory issues

**Scopes**:
```javascript
[
  'orders:read',
  'orders:status',
  'kitchen:view',
  'recipes:read',
  'inventory:report'
]
```

### 6. Expo
**Access Level**: Expeditor display
**Authentication**: Station Login
**Session Duration**: 24 hours (device-based)

**Permissions**:
- View all prepared orders
- Mark orders as complete
- Coordinate delivery/pickup
- Quality control checks
- Table consolidation view
- Priority management

**Scopes**:
```javascript
[
  'orders:read',
  'orders:complete',
  'expo:view',
  'tables:read',
  'delivery:coordinate'
]
```

### 7. Customer
**Access Level**: Self-service only
**Authentication**: Anonymous (session-based)
**Session Duration**: 2 hours

**Permissions**:
- View menu
- Create orders
- Make payments
- View order status
- Access loyalty program
- Submit feedback

**Scopes**:
```javascript
[
  'menu:read',
  'orders:create',
  'payments:process',
  'loyalty:access',
  'feedback:submit'
]
```

## Implementation

### Permission Checking

#### Frontend (React)

```typescript
import { useAuth } from '@/contexts/auth.hooks';

function ProtectedComponent() {
  const { user, hasScope, hasRole } = useAuth();
  
  // Check for specific role
  if (!hasRole('manager')) {
    return <AccessDenied />;
  }
  
  // Check for specific permission
  if (!hasScope('reports:read')) {
    return <PermissionError />;
  }
  
  return <ManagerDashboard />;
}
```

#### Backend (Express)

```typescript
import { authenticate, requireRole, requireScopes } from '@/middleware/auth';

// Require specific role
router.get('/api/v1/admin/users', 
  authenticate, 
  requireRole('owner'),
  getUserList
);

// Require specific scopes
router.post('/api/v1/orders',
  authenticate,
  requireScopes(['orders:create']),
  createOrder
);

// Multiple roles allowed
router.get('/api/v1/reports',
  authenticate,
  requireRole(['owner', 'manager']),
  getReports
);
```

### Permission Middleware

```typescript
// middleware/permissions.ts
export const requireScopes = (requiredScopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userScopes = req.user?.scopes || [];
    
    // Check if user has all required scopes
    const hasAllScopes = requiredScopes.every(scope => 
      userScopes.some(userScope => {
        // Handle wildcard scopes (e.g., 'orders:*')
        if (userScope.endsWith(':*')) {
          const prefix = userScope.slice(0, -2);
          return scope.startsWith(prefix + ':');
        }
        return userScope === scope;
      })
    );
    
    if (!hasAllScopes) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredScopes,
        message: 'You do not have the required permissions for this action'
      });
    }
    
    next();
  };
};
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  pin_code VARCHAR(6),
  role VARCHAR(50) NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Index for PIN lookups
CREATE INDEX idx_users_pin_restaurant ON users(pin_code, restaurant_id);
```

### User Permissions Table

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scope VARCHAR(100) NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(user_id, scope)
);
```

### Role Permissions Table

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(50) NOT NULL,
  scope VARCHAR(100) NOT NULL,
  UNIQUE(role, scope)
);

-- Default role permissions
INSERT INTO role_permissions (role, scope) VALUES
  ('owner', 'system:*'),
  ('manager', 'restaurant:manage'),
  ('manager', 'staff:manage'),
  ('server', 'orders:create'),
  ('server', 'payments:process'),
  ('kitchen', 'orders:status'),
  ('expo', 'orders:complete'),
  ('customer', 'menu:read');
```

## Permission Hierarchy

```
owner
  └── manager
      ├── server
      │   └── cashier
      ├── kitchen
      └── expo
customer (isolated)
```

### Inheritance Rules

1. Higher roles inherit permissions from lower roles
2. Explicit denials override inherited permissions
3. Wildcard scopes (`*`) grant all sub-permissions
4. Restaurant-scoped permissions don't cross boundaries

## API Endpoints

### Check Permissions

```http
GET /api/v1/auth/permissions
Authorization: Bearer <token>

Response:
{
  "role": "manager",
  "scopes": [
    "restaurant:manage",
    "staff:manage",
    "menu:*",
    "orders:*"
  ],
  "restaurant_id": "11111111-1111-1111-1111-111111111111"
}
```

### Grant Permission

```http
POST /api/v1/auth/permissions/grant
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "user_id": "user_uuid",
  "scope": "reports:financial",
  "expires_at": "2025-12-31T23:59:59Z"
}
```

### Revoke Permission

```http
POST /api/v1/auth/permissions/revoke
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "user_id": "user_uuid",
  "scope": "reports:financial"
}
```

## Security Best Practices

### 1. Principle of Least Privilege

- Grant minimum permissions required
- Use time-limited permissions when possible
- Regularly audit permission assignments
- Remove permissions when roles change

### 2. Separation of Duties

- Financial operations require manager+ role
- System configuration requires owner role
- Customer data access is role-restricted
- Audit logs track permission usage

### 3. Defense in Depth

```typescript
// Multiple layers of security
async function processRefund(req: Request, res: Response) {
  // Layer 1: Authentication
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Layer 2: Role check
  if (!['owner', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Invalid role' });
  }
  
  // Layer 3: Scope check
  if (!req.user.scopes.includes('payments:refund')) {
    return res.status(403).json({ error: 'Missing refund permission' });
  }
  
  // Layer 4: Business logic validation
  const order = await getOrder(req.params.orderId);
  if (order.restaurant_id !== req.user.restaurant_id) {
    return res.status(403).json({ error: 'Cross-restaurant access denied' });
  }
  
  // Process refund...
}
```

## Frontend Components

### PermissionGate Component

```tsx
import { useAuth } from '@/contexts/auth.hooks';

interface PermissionGateProps {
  requiredScopes?: string[];
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  requiredScopes = [],
  requiredRole,
  fallback = null,
  children
}: PermissionGateProps) {
  const { user, hasScope, hasRole } = useAuth();
  
  // Check role requirement
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.some(role => hasRole(role))) {
      return <>{fallback}</>;
    }
  }
  
  // Check scope requirements
  if (requiredScopes.length > 0) {
    if (!requiredScopes.every(scope => hasScope(scope))) {
      return <>{fallback}</>;
    }
  }
  
  return <>{children}</>;
}

// Usage
<PermissionGate 
  requiredRole="manager" 
  requiredScopes={['reports:read']}
  fallback={<AccessDenied />}
>
  <FinancialReports />
</PermissionGate>
```

### Role-Based Navigation

```tsx
function Navigation() {
  const { user, hasRole } = useAuth();
  
  return (
    <nav>
      <NavLink to="/orders">Orders</NavLink>
      
      {hasRole('server') && (
        <NavLink to="/tables">Tables</NavLink>
      )}
      
      {hasRole('manager') && (
        <>
          <NavLink to="/staff">Staff</NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </>
      )}
      
      {hasRole('owner') && (
        <NavLink to="/admin">Admin</NavLink>
      )}
    </nav>
  );
}
```

## Testing Permissions

### Unit Tests

```typescript
describe('Permission Middleware', () => {
  it('should allow access with correct scope', async () => {
    const req = mockRequest({
      user: { scopes: ['orders:create'] }
    });
    const res = mockResponse();
    const next = jest.fn();
    
    await requireScopes(['orders:create'])(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
  
  it('should deny access without scope', async () => {
    const req = mockRequest({
      user: { scopes: ['orders:read'] }
    });
    const res = mockResponse();
    const next = jest.fn();
    
    await requireScopes(['orders:create'])(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### Integration Tests

```typescript
describe('RBAC Integration', () => {
  it('manager can view reports', async () => {
    const token = await loginAsManager();
    
    const response = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
  
  it('server cannot view financial reports', async () => {
    const token = await loginAsServer();
    
    const response = await request(app)
      .get('/api/v1/reports/financial')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(403);
  });
});
```

## Troubleshooting

### Common Issues

#### "Insufficient permissions" error
- Verify user role in database
- Check JWT token claims
- Confirm scope requirements
- Review permission inheritance

#### Cross-restaurant access
- Ensure restaurant_id is set in context
- Verify user-restaurant association
- Check multi-tenant middleware

#### Permission not taking effect
- Clear browser cache/cookies
- Refresh JWT token
- Check permission expiry
- Verify database sync

## Migration Guide

### From Demo Auth to RBAC

```typescript
// Before (Demo Auth)
if (token === 'test-token') {
  // Allow all access
}

// After (RBAC)
if (!hasScope('orders:create')) {
  throw new ForbiddenError('Cannot create orders');
}
```

### Adding Custom Permissions

1. Define new scope in constants:
```typescript
export const CustomScopes = {
  SPECIAL_DISCOUNT: 'discounts:special',
  VIP_ACCESS: 'customers:vip'
};
```

2. Add to role permissions:
```sql
INSERT INTO role_permissions (role, scope) 
VALUES ('manager', 'discounts:special');
```

3. Implement permission check:
```typescript
router.post('/api/v1/discounts/special',
  authenticate,
  requireScopes([CustomScopes.SPECIAL_DISCOUNT]),
  applySpecialDiscount
);
```

## Related Documentation

- [Authentication Guide](./AUTHENTICATION.md)
- [API Authentication](./API_AUTHENTICATION.md)
- [Security Best Practices](./SECURITY.md)
- [Database Migrations](./DATABASE_MIGRATIONS.md)