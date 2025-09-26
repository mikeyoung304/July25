# Security Agent Report: Restaurant Security Handbook

## Your Restaurant's Security System, Mike!
Think of security like your restaurant's security system - locks on doors (authentication), security cameras (audit logging), ID badges (JWT tokens), and different keys for different staff (role-based access). Your security score has improved from 3/10 to 7/10!

## The Security Hierarchy (Who Gets What Keys)

```
Owner (Master Key - Everything)
  ↓
Manager (Office + Operations)
  ↓
Server (Dining Room + Register)
  ↓
Cashier (Register Only)
  ↓
Kitchen Staff (Kitchen Only)
  ↓
Customer (Public Areas)
```

## Authentication Methods (Ways to Get In)

### 1. Email/Password Login (Managers & Above)
```javascript
// The main entrance with ID check
POST /api/v1/auth/login
{
  email: "manager@restaurant.com",
  password: "SecurePass123!",
  rememberMe: true  // Extends session
}

// Response
{
  token: "eyJhbGc...",  // JWT token (like a security badge)
  user: {
    id: "uuid",
    role: "manager",
    permissions: ["orders:*", "payments:*", "staff:manage"]
  },
  expiresIn: 28800  // 8 hours for managers
}
```

### 2. PIN Code Login (Service Staff)
```javascript
// The staff entrance with keypad
POST /api/v1/auth/pin
{
  pin: "1234",
  restaurantId: "11111111-1111-1111-1111-111111111111"
}

// PIN storage (secure!)
const hashedPin = bcrypt.hash(pin + PEPPER, 12);
// PEPPER is a secret only the server knows
```

### 3. Station Login (Kitchen/Expo)
```javascript
// Shared device login
POST /api/v1/auth/station
{
  stationId: "kitchen-1",
  stationPin: "9999"
}

// Device gets bound to token
// Auto-logout after shift
```

### 4. Anonymous Access (Customers)
```javascript
// Public kiosk/online ordering
// No auth required
// Session-based cart
// Limited to ordering only
```

## JWT Token System (Security Badges)

### Token Structure
```javascript
// What's inside a token (decoded)
{
  // Header
  "alg": "RS256",  // Signed with RSA keys
  "typ": "JWT",
  
  // Payload
  "userId": "123",
  "email": "manager@restaurant.com",
  "role": "manager",
  "restaurantId": "456",
  "permissions": ["orders:create", "payments:process"],
  "iat": 1706620800,  // Issued at
  "exp": 1706649600   // Expires (8 hours)
}
```

### Token Validation
```javascript
// Every request is verified
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    // Verify with Supabase public key
    const payload = await verifyJWT(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});
```

## Role-Based Access Control (RBAC)

### Permission System
```javascript
// Role definitions
const ROLES = {
  owner: {
    level: 100,
    permissions: ['*']  // Everything
  },
  manager: {
    level: 80,
    permissions: [
      'orders:*',
      'payments:*',
      'menu:*',
      'staff:manage',
      'reports:view'
    ]
  },
  server: {
    level: 60,
    permissions: [
      'orders:create',
      'orders:update',
      'payments:process',
      'tables:manage'
    ]
  },
  cashier: {
    level: 40,
    permissions: [
      'payments:process',
      'orders:view'
    ]
  },
  kitchen: {
    level: 20,
    permissions: [
      'orders:view',
      'orders:update_status'
    ]
  }
};
```

### Permission Checking
```javascript
// Middleware for routes
function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions' 
      });
    }
    next();
  };
}

// Usage
app.post('/api/v1/payments/refund', 
  requirePermission('payments:refund'),
  handleRefund
);
```

### Frontend Permission Gates
```typescript
// RoleGuard component
<RoleGuard requiredRole="manager">
  <AdminPanel />  // Only managers see this
</RoleGuard>

// Hook usage
const { hasPermission } = useRole();
{hasPermission('reports:view') && <ReportsButton />}
```

## CSRF Protection (Anti-Forgery)

```javascript
// Prevents fake form submissions
import csrf from 'csurf';

// Generate token
app.use(csrf({ cookie: true }));

// Include in responses
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Frontend includes in requests
fetch('/api/v1/orders', {
  headers: {
    'X-CSRF-Token': getCsrfToken()
  }
});
```

## Rate Limiting (Anti-Spam)

```javascript
// Prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  message: 'Too many login attempts',
  
  // Progressive delays
  skipSuccessfulRequests: true,
  
  // Custom key (per email + IP)
  keyGenerator: (req) => {
    return req.body.email + ':' + req.ip;
  }
});

app.post('/api/v1/auth/login', loginLimiter, handleLogin);

// After 5 failures: 15 minute lockout
// After 10 failures: 1 hour lockout
// After 20 failures: Account flagged
```

## Session Management (Time Limits)

```javascript
// Different durations by role
const SESSION_DURATIONS = {
  owner: 12 * 60 * 60,     // 12 hours
  manager: 8 * 60 * 60,    // 8 hours
  server: 12 * 60 * 60,    // 12 hours
  cashier: 12 * 60 * 60,   // 12 hours
  kitchen: 12 * 60 * 60,   // 12 hours
  customer: 1 * 60 * 60    // 1 hour
};

// Auto-refresh before expiry
if (tokenExpiresIn < 5 * 60) {  // 5 minutes left
  const newToken = await refreshToken();
}
```

## Audit Logging (Security Cameras)

```javascript
// Log all important actions
class AuditLogger {
  async log(event) {
    await supabase.from('audit_logs').insert({
      event_type: event.type,        // 'login', 'payment', etc
      user_id: event.userId,
      restaurant_id: event.restaurantId,
      ip_address: event.ip,
      user_agent: event.userAgent,
      details: event.details,
      timestamp: new Date()
    });
  }
}

// Usage
auditLogger.log({
  type: 'payment:processed',
  userId: req.user.id,
  restaurantId: req.restaurantId,
  details: {
    amount: 49.99,
    method: 'card',
    orderId: '123'
  }
});
```

## Database Security (Row Level Security)

```sql
-- Only see your restaurant's data
CREATE POLICY restaurant_isolation 
ON orders 
FOR ALL 
USING (restaurant_id = current_setting('app.restaurant_id'));

-- Customers only see their orders
CREATE POLICY customer_orders
ON orders
FOR SELECT
USING (customer_id = current_setting('app.user_id'));
```

## Password Security (For PINs & Passwords)

```javascript
// PIN Hashing with Pepper
const PEPPER = process.env.PIN_PEPPER;  // Server secret

async function hashPin(pin, restaurantId) {
  // Combine PIN with pepper and restaurant
  const peppered = `${pin}:${PEPPER}:${restaurantId}`;
  return bcrypt.hash(peppered, 12);  // 12 rounds
}

async function verifyPin(inputPin, hashedPin, restaurantId) {
  const peppered = `${inputPin}:${PEPPER}:${restaurantId}`;
  return bcrypt.compare(peppered, hashedPin);
}
```

## Security Headers (Extra Protection)

```javascript
// Helmet for security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

## API Key Management (Never Expose!)

```javascript
// Environment variables only
process.env.OPENAI_API_KEY
process.env.SUPABASE_SERVICE_KEY
process.env.SQUARE_ACCESS_TOKEN

// Never in frontend code!
// Never in git!
// Use .env.example for templates
```

## Security Monitoring & Alerts

```javascript
// Detect suspicious activity
class SecurityMonitor {
  async checkSuspiciousActivity(userId) {
    const recentFailures = await getRecentLoginFailures(userId);
    
    if (recentFailures > 10) {
      await alertAdmin('Multiple login failures', userId);
      await lockAccount(userId);
    }
    
    // Check for unusual patterns
    const locations = await getRecentLoginLocations(userId);
    if (hasGeographicAnomaly(locations)) {
      await requireMFA(userId);
    }
  }
}
```

## Mike's Security Checklist

### Before Going Live
- [ ] All API endpoints require authentication
- [ ] RBAC implemented on all sensitive routes
- [ ] Rate limiting on login/payment endpoints
- [ ] CSRF tokens on state-changing operations
- [ ] Audit logging for financial transactions
- [ ] SSL/TLS certificates installed
- [ ] Environment variables secured
- [ ] Database RLS policies active
- [ ] PIN/Password hashing with pepper
- [ ] Session expiration implemented

### Regular Security Tasks
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Review audit logs
SELECT * FROM audit_logs 
WHERE event_type = 'login:failed' 
AND timestamp > NOW() - INTERVAL '24 hours';

# Monitor active sessions
SELECT COUNT(*) FROM sessions 
WHERE expires_at > NOW() 
GROUP BY user_role;
```

## Common Security Mistakes to Avoid

### 1. Storing Passwords/PINs in Plain Text
```javascript
// NEVER DO THIS
const user = { pin: "1234" };  // BAD!

// ALWAYS DO THIS
const user = { pin: await bcrypt.hash(pin, 12) };  // GOOD!
```

### 2. Exposing API Keys
```javascript
// NEVER DO THIS
const key = "sk_live_abc123";  // BAD!

// ALWAYS DO THIS
const key = process.env.API_KEY;  // GOOD!
```

### 3. Missing Authentication
```javascript
// NEVER DO THIS
app.get('/api/v1/users', (req, res) => {
  // No auth check!  BAD!
});

// ALWAYS DO THIS
app.get('/api/v1/users', requireAuth, (req, res) => {
  // Auth required!  GOOD!
});
```

## Security Incident Response

### If Breach Detected:
1. **Immediate**: Revoke all tokens
2. **Alert**: Notify affected users
3. **Investigate**: Check audit logs
4. **Patch**: Fix vulnerability
5. **Reset**: Force password resets
6. **Document**: Record incident
7. **Improve**: Update security measures

## Summary for Course Creation

Restaurant OS security is like a multi-layered restaurant security system:
- **Front Door** (Authentication): Multiple ways to get in based on role
- **ID Badges** (JWT Tokens): Verified on every request
- **Access Levels** (RBAC): Different permissions for different roles
- **Security Cameras** (Audit Logs): Track all important actions
- **Time Locks** (Sessions): Auto-logout after shift
- **Panic Button** (Rate Limiting): Stop attacks automatically

The system went from basic (3/10) to production-ready (7/10) by implementing:
1. Complete authentication system
2. Role-based permissions
3. Audit logging
4. Rate limiting
5. CSRF protection
6. Secure session management

Key insight: **Security is not one thing, it's everything!** Every layer adds protection. The goal isn't to be unhackable (impossible) but to be not worth hacking (too much work for attackers)!