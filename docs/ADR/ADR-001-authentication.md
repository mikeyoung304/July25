# ADR-001: Authentication & Authorization Architecture

## Status
Accepted

## Date
2025-01-30

## Context
Restaurant OS v6.0.2 requires a production-ready authentication system to secure operations and enable multi-tenant restaurant management. The system must support multiple user types (managers, servers, kitchen staff) with different authentication methods and access levels.

## Decision
We will implement a unified authentication system using Supabase as the identity provider with the following components:

### 1. Identity Provider
- **Supabase Auth** as the single source of truth for user identity
- JWT tokens (RS256 signed) for stateless authentication
- 8-hour sessions for managers, 12-hour for staff

### 2. Authentication Methods

#### Manager/Owner Authentication
- Email/password login via Supabase Auth
- Optional MFA for enhanced security
- Full JWT with all user metadata

#### Server/Cashier Authentication
- 4-6 digit PIN code authentication
- PIN stored as bcrypt hash with pepper
- Restaurant-scoped PINs (same PIN different restaurants)
- Rate limiting: 5 attempts per 15 minutes
- Account lockout after repeated failures

#### Kitchen/Expo Station Authentication
- Shared device authentication
- Station-specific tokens (short-lived, 4 hours)
- Device-bound tokens (IP/user-agent validation)
- Easy revocation for lost devices

#### Customer Authentication
- Anonymous/session-based for kiosk and online ordering
- No authentication required
- Temporary session tokens for cart persistence

### 3. Authorization Model

#### Role Hierarchy
```
Owner → Manager → Server → Cashier → Kitchen/Expo → Customer
```

#### API Scopes
- **orders**: Create, read, update order status
- **payments**: Process payments, refunds
- **reports**: View analytics, financial reports
- **staff**: Manage employees, schedules
- **system**: System configuration, restaurant settings

#### Role-to-Scope Mapping
| Role | Scopes |
|------|--------|
| Owner | All scopes |
| Manager | orders, payments, reports, staff |
| Server | orders, payments |
| Cashier | orders:read, payments |
| Kitchen | orders:read, orders:update-status |
| Expo | orders:read, orders:complete |
| Customer | orders:create, orders:read-own |

### 4. Multi-Tenancy
- Restaurant context validated on every request
- `user_restaurants` table maps users to restaurants with roles
- Strict tenant isolation via RLS policies
- Cross-tenant access prevention

### 5. Security Measures
- CSRF protection via httpOnly cookies
- Rate limiting per endpoint
- Audit logging for all auth events
- IP-based session validation
- Automatic token refresh before expiry

## Consequences

### Positive
- Single source of truth for identity (Supabase)
- Multiple authentication methods for different user types
- Stateless authentication scales horizontally
- Fine-grained permission control
- Production-ready security posture

### Negative
- Complexity of managing multiple auth methods
- PIN system requires additional security measures
- Station tokens need careful management
- Migration path for existing users needed

### Neutral
- Dependency on Supabase for auth
- JWT size may impact request overhead
- Token refresh logic adds complexity

## Implementation Notes

### Database Schema
```sql
-- Extends Supabase auth.users
CREATE TABLE user_profiles (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-tenant access
CREATE TABLE user_restaurants (
  user_id UUID REFERENCES auth.users,
  restaurant_id UUID REFERENCES restaurants,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- PIN authentication
CREATE TABLE user_pins (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Station tokens
CREATE TABLE station_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  station_type TEXT NOT NULL,
  restaurant_id UUID REFERENCES restaurants,
  device_fingerprint TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Middleware Stack
```
1. CSRF Validation
2. JWT Verification (Supabase)
3. Restaurant Context Validation
4. RBAC Scope Enforcement
5. Rate Limiting
6. Audit Logging
```

### Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "server",
  "restaurant_id": "restaurant-uuid",
  "scopes": ["orders", "payments"],
  "iat": 1706630400,
  "exp": 1706659200
}
```

## References
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)