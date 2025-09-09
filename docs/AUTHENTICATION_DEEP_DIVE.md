# Restaurant OS Authentication: The 4-Tier System Deep Dive

## Executive Summary

Restaurant OS implements a sophisticated 4-tier authentication system designed for real-world restaurant operations. This is **NOT a demo system or security bypass** - it's a production architecture that balances security with operational efficiency across different user types and devices.

**Key Innovation**: Different authentication methods for different operational contexts, from high-security manager access to frictionless customer ordering.

## Quick Reference

| Tier | Users | Method | Token Type | Duration | Use Case |
|------|-------|--------|------------|----------|----------|
| **1** | Managers/Owners | Email + Password | RS256 JWT | 8 hours | Back office, reports, configuration |
| **2** | Servers/Cashiers | 4-6 digit PIN | RS256 JWT | 12 hours | POS terminals, order taking |
| **3** | Kitchen/Expo | Station Token | HS256 JWT | 24 hours | Shared displays, order tracking |
| **4** | Customers | Anonymous | HS256 JWT | 1 hour | Self-service kiosks, QR ordering |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION TIERS                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  TIER 1: MANAGERS          ┌──────────────┐                 │
│  ══════════════════        │   Supabase   │                 │
│  Email/Password ──────────▶│   Auth API   │──▶ RS256 Token │
│  (Optional MFA)            │   (bcrypt)   │    8hr session  │
│                            └──────────────┘                 │
│                                                               │
│  TIER 2: STAFF             ┌──────────────┐                 │
│  ═════════════             │  PIN Service │                 │
│  4-6 Digit PIN ───────────▶│ bcrypt + salt│──▶ RS256 Token │
│  Restaurant-scoped         │   + pepper   │    12hr session │
│                            └──────────────┘                 │
│                                                               │
│  TIER 3: STATIONS          ┌──────────────┐                 │
│  ════════════════          │Station Token │                 │
│  Manager Creates ─────────▶│   Service    │──▶ HS256 Token │
│  Device Fingerprint        │  (HS256 JWT) │    24hr session │
│                            └──────────────┘                 │
│                                                               │
│  TIER 4: CUSTOMERS         ┌──────────────┐                 │
│  ═════════════════         │ Kiosk Auth   │                 │
│  No Login Required ───────▶│  Anonymous   │──▶ HS256 Token │
│  Session-based             │   Session    │    1hr session  │
│                            └──────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Tier 1: Manager/Owner Authentication

### The Users
- **Restaurant Owners**: Multi-location oversight, financial access
- **General Managers**: Daily operations, staff management
- **Assistant Managers**: Limited admin access

### Real-World Scenario
*Sarah, the GM, arrives at 7 AM. She logs into the back-office iPad with her email and password to review last night's sales, check inventory alerts, and approve time-off requests. Her session stays active through her morning administrative work.*

### Technical Implementation

```typescript
// Login endpoint: POST /api/v1/auth/login
{
  email: "sarah@restaurant.com",
  password: "SecurePass123!",
  restaurant_id: "uuid-here"
}

// Supabase handles the authentication
const { data: authData, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// Token payload (RS256 signed by Supabase)
{
  "sub": "user-uuid",
  "email": "sarah@restaurant.com", 
  "role": "manager",
  "restaurant_id": "restaurant-uuid",
  "scopes": [
    "orders:*",
    "payments:*", 
    "reports:*",
    "staff:manage",
    "system:config"
  ],
  "exp": 1706649600  // 8 hours
}
```

### Security Features
- **Password Requirements**: Min 8 chars, complexity rules
- **Hashing**: Supabase uses bcrypt with cost factor 10
- **MFA Support**: TOTP-based 2FA available
- **Session Management**: Refresh tokens, secure cookies
- **Audit Trail**: All actions logged with timestamp and user

### Permissions
```typescript
const MANAGER_SCOPES = [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_UPDATE,
  ApiScope.ORDERS_DELETE,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.PAYMENTS_REFUND,
  ApiScope.REPORTS_VIEW,
  ApiScope.REPORTS_EXPORT,
  ApiScope.STAFF_MANAGE,
  ApiScope.MENU_MANAGE,
  ApiScope.SYSTEM_CONFIG  // Owner only
];
```

## Tier 2: Service Staff Authentication

### The Users
- **Servers**: Table service, order taking
- **Cashiers**: Payment processing, takeout
- **Bartenders**: Bar orders and tabs
- **Hosts**: Seating management

### Real-World Scenario
*It's Friday night rush. Mike needs to clock in quickly at the POS terminal. He taps his 4-digit PIN (5847) - no fumbling with passwords. In 2 seconds he's taking orders. When he moves to help at the bar terminal, same PIN works there.*

### Technical Implementation

```typescript
// PIN login endpoint: POST /api/v1/auth/pin-login
{
  pin: "5847",
  restaurant_id: "uuid-here"
}

// Server-side PIN validation
const PIN_PEPPER = process.env.PIN_PEPPER;  // Application secret
const pepperedPin = pin + PIN_PEPPER;
const isValid = bcrypt.compareSync(pepperedPin, hashedPin);

// Database schema
user_pins {
  user_id: uuid
  restaurant_id: uuid  
  pin_hash: text       // bcrypt with 12 rounds
  failed_attempts: int
  locked_until: timestamp
  created_at: timestamp
  last_used: timestamp
}
```

### Security Measures
- **PIN Requirements**: 4-6 digits, unique per restaurant
- **Hashing**: bcrypt (12 rounds) + application pepper
- **Rate Limiting**: 5 attempts → 15 minute lockout
- **Restaurant Scoped**: PIN "1234" at Restaurant A ≠ Restaurant B
- **No PIN Reuse**: Can't reuse last 3 PINs
- **Automatic Expiry**: PINs expire after 90 days

### Why PINs for Staff?
1. **Speed**: 2-second login during rush hours
2. **Shared Terminals**: Quick user switching
3. **Glove-Friendly**: Works with food service gloves
4. **No Keyboards**: Optimized for touchscreens
5. **Muscle Memory**: Staff memorize easily

### Permissions
```typescript
const SERVER_SCOPES = [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_UPDATE,
  ApiScope.ORDERS_STATUS,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.TABLES_MANAGE
];

const CASHIER_SCOPES = [
  ApiScope.ORDERS_READ,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.PAYMENTS_READ
];
```

## Tier 3: Station Authentication

### The Devices
- **Kitchen Display**: Order preparation screens
- **Expo Station**: Quality control and dispatch
- **Bar Display**: Drink orders
- **Prep Station**: Prep list management

### Real-World Scenario
*The kitchen has a mounted iPad that shows incoming orders. At 6 AM, the manager creates a "kitchen station" token that keeps the device logged in all day. Kitchen staff see orders instantly without individual logins. The device stays authenticated through shift changes.*

### Technical Implementation

```typescript
// Station creation (requires manager auth)
// POST /api/v1/auth/station-login
{
  station_type: "kitchen",
  station_name: "Main Kitchen",
  restaurant_id: "uuid-here"
}

// Device fingerprinting
const fingerprint = sha256(
  `${ipAddress}:${userAgent}:${DEVICE_SALT}`
);

// Station token payload (HS256)
{
  "sub": "station:uuid",
  "type": "station",
  "station_type": "kitchen",
  "station_name": "Main Kitchen",
  "restaurant_id": "restaurant-uuid",
  "device_fingerprint": "sha256-hash",
  "scopes": [
    "orders:read",
    "orders:update_status"
  ],
  "exp": 1706707200  // 24 hours
}

// Database tracking
station_tokens {
  token_id: uuid
  station_type: enum
  station_name: text
  restaurant_id: uuid
  device_fingerprint: text
  created_by: uuid      // Manager who created it
  created_at: timestamp
  expires_at: timestamp
  revoked: boolean
}
```

### Station Types & Permissions

```typescript
const STATION_PERMISSIONS = {
  kitchen: {
    canView: ['new', 'confirmed', 'preparing'],
    canUpdate: ['confirmed' → 'preparing', 'preparing' → 'ready'],
    hideSensitive: true  // No payment info
  },
  expo: {
    canView: ['ready', 'preparing'],
    canUpdate: ['ready' → 'completed'],
    showTable: true
  },
  bar: {
    canView: ['drinks_only'],
    canUpdate: ['drink_ready'],
    filterByCategory: 'beverages'
  }
};
```

### Security Features
- **Manager Control**: Only managers create station tokens
- **Device Binding**: Fingerprint prevents token sharing
- **Limited Scope**: Read-only or status updates only
- **No Customer Data**: PII stripped from station views
- **Bulk Revocation**: Manager can revoke all stations
- **Activity Monitoring**: Track last activity per station

## Tier 4: Customer Authentication (Kiosk/Self-Service)

### The Users
- **Kiosk Customers**: In-store self ordering
- **QR Code Diners**: Table-side ordering
- **Online Customers**: Web ordering without account
- **Drive-Thru**: Digital menu board ordering

### Real-World Scenario
*A customer walks into the restaurant and approaches the kiosk. They touch "Start Order" - no account needed. They build their meal, pay with card, get order #47. The kiosk automatically logs them out after payment. Next customer starts fresh.*

### Technical Implementation

```typescript
// Kiosk authentication endpoint
// POST /api/v1/auth/kiosk
{
  restaurant_id: "uuid-here"
}

// Anonymous session creation
const sessionId = crypto.randomBytes(16).toString('hex');

// Customer token payload (HS256)
{
  "sub": `customer:${sessionId}`,
  "role": "kiosk_demo",  // Legacy name, means "customer"
  "restaurant_id": "restaurant-uuid",
  "scope": [
    "menu:read",
    "orders:create",
    "payments:process"  // Limited to their own order
  ],
  "session_id": sessionId,
  "order_limit": 1,  // Can only create one order
  "exp": 1706624400  // 1 hour
}

// Session tracking
customer_sessions {
  session_id: uuid
  restaurant_id: uuid
  created_at: timestamp
  order_id: uuid        // Once created
  payment_status: enum
  expired_at: timestamp
}
```

### Why Anonymous Sessions?

1. **Zero Friction**: No signup = higher conversion
2. **Privacy First**: No data collection required
3. **Fast Turnover**: Quick ordering at kiosks
4. **Compliance**: No account = less data liability
5. **Guest Friendly**: Tourists, one-time visitors

### Security Boundaries

```typescript
// What customers CANNOT do
const CUSTOMER_RESTRICTIONS = {
  cannotView: [
    'other_orders',
    'customer_list',
    'payment_methods',
    'staff_info',
    'reports'
  ],
  cannotModify: [
    'prices',
    'menu_items',
    'completed_orders'
  ],
  dataAccess: 'own_session_only',
  orderLimit: 1,
  paymentLimit: 'order_total_only'
};
```

### Kiosk-Specific Features

```typescript
// Auto-logout after payment
if (payment.status === 'completed') {
  setTimeout(() => {
    clearSession();
    showWelcomeScreen();
  }, 5000);
}

// Inactivity timeout
let inactivityTimer;
const resetTimer = () => {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (!orderInProgress) {
      clearSession();
    }
  }, 120000);  // 2 minutes
};
```

## Security Analysis

### Threat Model

| Threat | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|--------|
| Password Attack | MFA, complexity | N/A | N/A | N/A |
| PIN Guessing | N/A | Rate limit, lockout | N/A | N/A |
| Token Theft | RS256, short expiry | RS256, rotation | Device binding | 1hr limit |
| Privilege Escalation | Role validation | Scope limits | Read-only | Minimal perms |
| Session Hijack | Secure cookies | Terminal-bound | IP locked | Auto-expire |
| Data Exposure | Audit logs | Activity logs | No PII | Own data only |

### Defense in Depth

```typescript
// Multiple security layers
const securityLayers = {
  // Layer 1: Authentication
  authentication: {
    managers: 'Supabase Auth + MFA',
    staff: 'PIN + Pepper + bcrypt',
    stations: 'Manager-created tokens',
    customers: 'Anonymous sessions'
  },
  
  // Layer 2: Authorization
  authorization: {
    roleCheck: 'JWT role claim',
    scopeCheck: 'Permission arrays',
    restaurantCheck: 'Restaurant ID validation',
    ownershipCheck: 'User owns resource'
  },
  
  // Layer 3: Rate Limiting
  rateLimiting: {
    auth: '5 attempts per 15 min',
    api: '100 requests per minute',
    orders: '10 per minute',
    payments: '3 per minute'
  },
  
  // Layer 4: Monitoring
  monitoring: {
    auditLogs: 'All auth events',
    anomalyDetection: 'Unusual patterns',
    alerting: 'Failed auth spikes',
    compliance: 'PCI for payments'
  }
};
```

## Implementation Guide

### Frontend: Protecting Routes

```typescript
// Route protection by tier
<Routes>
  {/* Tier 1: Manager routes */}
  <Route element={<RequireAuth roles={['owner', 'manager']} />}>
    <Route path="/reports" element={<Reports />} />
    <Route path="/staff" element={<StaffManagement />} />
  </Route>
  
  {/* Tier 2: Staff routes */}
  <Route element={<RequireAuth roles={['server', 'cashier']} />}>
    <Route path="/pos" element={<POSTerminal />} />
    <Route path="/orders" element={<Orders />} />
  </Route>
  
  {/* Tier 3: Station routes */}
  <Route element={<RequireAuth roles={['station']} />}>
    <Route path="/kitchen" element={<KitchenDisplay />} />
    <Route path="/expo" element={<ExpoDisplay />} />
  </Route>
  
  {/* Tier 4: Customer routes (no auth required) */}
  <Route path="/kiosk" element={<KioskOrdering />} />
  <Route path="/menu" element={<PublicMenu />} />
</Routes>
```

### Backend: Middleware Chain

```typescript
// Tier-specific middleware
app.post('/api/orders',
  authenticate,           // Verify JWT
  requireRole(['server', 'manager', 'kiosk_demo']),
  requireScope(['orders:create']),
  validateRestaurantAccess,
  rateLimiter,
  createOrder
);

// Manager-only endpoint
app.get('/api/reports',
  authenticate,
  requireRole(['owner', 'manager']),
  requireScope(['reports:view']),
  validateDateRange,
  generateReport
);

// Station-specific endpoint  
app.patch('/api/orders/:id/status',
  authenticate,
  requireRole(['station', 'server']),
  requireScope(['orders:update_status']),
  validateStatusTransition,
  updateOrderStatus
);
```

### Token Validation

```typescript
// Different validation per tier
function validateToken(token: string, expectedTier: number) {
  const decoded = jwt.decode(token);
  
  switch(expectedTier) {
    case 1: // Manager
      return validateSupabaseToken(token);  // RS256
      
    case 2: // Staff  
      return validateSupabaseToken(token);  // RS256
      
    case 3: // Station
      return validateStationToken(token);   // HS256 + fingerprint
      
    case 4: // Customer
      return validateKioskToken(token);     // HS256 + session
  }
}
```

## Common Scenarios

### Lunch Rush Management

```typescript
// Multiple authentication flows during peak hours

// 1. Server clocks in with PIN
POST /api/v1/auth/pin-login
{ pin: "5847", restaurant_id: "rest-1" }

// 2. Takes order at table
POST /api/v1/orders
Headers: { Authorization: "Bearer [server-token]" }
{ items: [...], table_id: "table-5" }

// 3. Customer pays at kiosk simultaneously
POST /api/v1/auth/kiosk
{ restaurant_id: "rest-1" }
// Creates separate order with kiosk token

// 4. Kitchen sees both orders instantly
// (Using station token created at 6 AM)
WebSocket: order:created → Kitchen Display

// 5. Manager monitors from office
GET /api/v1/orders/live
Headers: { Authorization: "Bearer [manager-token]" }
```

### Shift Change Protocol

```typescript
// Smooth transition between shifts

// Morning shift ends
async function endShift(userId: string) {
  // Clock out
  await clockOut(userId);
  
  // Clear PIN session
  await invalidateToken(userToken);
  
  // Log activity
  await logShiftEnd(userId, { 
    orders: dayOrderCount,
    sales: dayTotal 
  });
}

// Evening shift starts
async function startShift(pin: string) {
  // Validate PIN
  const user = await validatePin(pin);
  
  // Create new session
  const token = await createToken(user);
  
  // Load assigned section
  const section = await getSection(user.id);
  
  return { token, section };
}

// Station tokens persist through shift change
// No need to re-authenticate kitchen displays
```

### Security Incident Response

```typescript
// PIN compromise scenario
async function handleCompromisedPIN(userId: string) {
  // 1. Immediate lockout
  await lockAccount(userId);
  
  // 2. Invalidate all sessions
  await revokeAllTokens(userId);
  
  // 3. Force PIN reset
  await requirePINReset(userId);
  
  // 4. Audit trail
  await logSecurityEvent({
    type: 'PIN_COMPROMISED',
    userId,
    timestamp: Date.now(),
    action: 'FORCE_RESET'
  });
  
  // 5. Notify manager
  await notifyManager({
    alert: 'PIN Security Alert',
    user: userId,
    required_action: 'Verify identity and reset PIN'
  });
}
```

## Troubleshooting Guide

### Common Issues & Solutions

#### "No access to this restaurant"
```typescript
// Check user_restaurants table
SELECT * FROM user_restaurants 
WHERE user_id = ? AND restaurant_id = ?;

// Add if missing
INSERT INTO user_restaurants (user_id, restaurant_id, role)
VALUES (?, ?, 'server');
```

#### "Invalid PIN" after correct entry
```typescript
// Check lockout status
SELECT failed_attempts, locked_until 
FROM user_pins 
WHERE user_id = ?;

// Reset if needed
UPDATE user_pins 
SET failed_attempts = 0, locked_until = NULL
WHERE user_id = ?;
```

#### "Station token not working"
```typescript
// Verify device fingerprint
const currentFingerprint = generateFingerprint(req);
const tokenFingerprint = decoded.device_fingerprint;

if (currentFingerprint !== tokenFingerprint) {
  // Device changed - need new token
  return requireNewStationToken();
}
```

#### "Kiosk session expired quickly"
```typescript
// Check token expiry
const TOKEN_DURATION = {
  development: 3600,    // 1 hour
  production: 3600,     // 1 hour
  extended: 7200        // 2 hours for catering
};

// Extend for special cases
if (orderType === 'catering') {
  expiryTime = Date.now() + TOKEN_DURATION.extended;
}
```

## Migration & Deployment

### Rolling Out the 4-Tier System

#### Phase 1: Manager Tier (Week 1)
```bash
# Enable Supabase auth
UPDATE restaurants 
SET auth_tier_1_enabled = true;

# Migrate existing managers
INSERT INTO auth_users 
SELECT * FROM legacy_managers;
```

#### Phase 2: PIN Authentication (Week 2)
```bash
# Generate PINs for staff
npm run generate-staff-pins

# Train staff on PIN usage
npm run print-pin-cards
```

#### Phase 3: Station Tokens (Week 3)
```bash
# Deploy station apps
npm run deploy:kitchen-display
npm run deploy:expo-display

# Create initial tokens
npm run create-station-tokens
```

#### Phase 4: Customer Kiosks (Week 4)
```bash
# Deploy kiosk software
npm run deploy:kiosk

# Enable anonymous sessions
UPDATE restaurants 
SET kiosk_mode_enabled = true;
```

### Production Checklist

- [ ] Environment variables set (JWT secrets, peppers)
- [ ] SSL certificates installed
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Database indexes created
- [ ] Backup authentication method ready
- [ ] Staff training completed
- [ ] Security review passed
- [ ] Load testing completed
- [ ] Monitoring alerts configured

## Future Enhancements

### Planned Features

#### Biometric Authentication (Q2 2025)
```typescript
// Fingerprint for staff clock-in
interface BiometricAuth {
  method: 'fingerprint' | 'face_id';
  fallback: 'pin';
  requiredFor: ['clock_in', 'manager_override'];
}
```

#### OAuth Integration (Q3 2025)
```typescript
// Social login for customers
const oauthProviders = [
  'google',    // For online ordering
  'apple',     // For iOS app
  'facebook'   // For social promotions
];
```

#### Dynamic PIN Rotation (Q4 2025)
```typescript
// Daily PIN for enhanced security
function generateDailyPIN(userId: string, date: Date) {
  const secret = process.env.DAILY_PIN_SECRET;
  return hmac(secret, `${userId}:${date.toISOString()}`);
}
```

#### Multi-Factor for Staff (2026)
```typescript
// SMS verification for sensitive operations
const requiresMFA = [
  'void_transaction',
  'apply_discount_over_50',
  'clock_in_early',
  'override_price'
];
```

## Conclusion

The 4-tier authentication system is a **production-ready architecture** designed for real restaurant operations. It's not a demo, not a bypass, not a security hole - it's a thoughtful balance of security and usability across different operational contexts.

Each tier serves a specific purpose:
- **Tier 1** protects sensitive business data
- **Tier 2** enables fast staff operations
- **Tier 3** simplifies shared device management  
- **Tier 4** removes ordering friction for customers

This design recognizes that a restaurant is not a bank - it needs authentication that works with greasy fingers, during rush hours, across multiple devices, for users ranging from tech-savvy managers to customers who just want their food.

The system is secure where it needs to be (financial data), convenient where it should be (order taking), and invisible where it must be (customer ordering).

---

*Last Updated: January 30, 2025*  
*Version: 6.0.3*  
*Status: Production Ready*