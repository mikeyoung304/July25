# Authentication System - Quick Reference Guide

## System Overview

- **Provider**: Supabase (GoTrue) with custom JWT
- **Primary Algorithm**: HS256 JWT
- **Multi-Tenancy**: RLS policies + server-side validation
- **Multiple Auth Methods**: Email/Password, PIN, Station Tokens

## Key Files

| Component | Location | Key Lines |
|-----------|----------|-----------|
| Core Auth Middleware | `server/src/middleware/auth.ts` | 23-108 (authenticate), 111-152 (optionalAuth) |
| RBAC/Scopes | `server/src/middleware/rbac.ts` | 12-41 (scopes), 103-181 (role mappings) |
| Auth Routes | `server/src/routes/auth.routes.ts` | 22-446 |
| PIN Authentication | `server/src/services/auth/pinAuth.ts` | 158-296 (validation) |
| Station Auth | `server/src/services/auth/stationAuth.ts` | 60-137 (creation), 142-241 (validation) |
| Frontend Context | `client/src/contexts/AuthContext.tsx` | 52-543 |
| Login Page | `client/src/pages/Login.tsx` | 24-47 |
| Protected Routes | `client/src/components/auth/ProtectedRoute.tsx` | 23-145 |
| DB Schema | `supabase/migrations/.archive/20250130_auth_tables.sql` | Full schema |

## User Roles

Standard roles: `owner`, `manager`, `server`, `cashier`, `kitchen`, `expo`, `customer`
Special roles: `admin`, `super_admin`, `demo:*`

## API Endpoints

```
POST   /api/v1/auth/login           → Email/password login
POST   /api/v1/auth/pin-login       → PIN-based login
POST   /api/v1/auth/station-login   → Create station token
POST   /api/v1/auth/logout          → Sign out
GET    /api/v1/auth/me              → Get user profile
POST   /api/v1/auth/refresh         → Refresh token
POST   /api/v1/auth/set-pin         → Set/update PIN
POST   /api/v1/auth/revoke-stations → Revoke station tokens
```

## Rate Limiting

- **Login**: 5/15 min (100 in dev)
- **PIN**: 3/5 min
- **Station**: 5/10 min
- **Token Refresh**: 10/1 min

## Token Expiry

- **Email/Password**: 1 hour (access), 7 days (refresh)
- **PIN**: 12 hours
- **Station**: 4 hours

## Test Users (Real Credentials)

```
server@restaurant.com / ServerPass123!
kitchen@restaurant.com / KitchenPass123!
expo@restaurant.com / ExpoPass123!
manager@restaurant.com / ManagerPass123!
```

## Database Tables (8 total)

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `auth.users` | Supabase users | id, email, password_hash |
| `user_profiles` | Extended profiles | user_id, display_name, phone |
| `user_restaurants` | Multi-tenancy link | user_id, restaurant_id, role |
| `user_pins` | PIN auth | user_id, pin_hash, attempts, locked_until |
| `station_tokens` | Station auth | token_hash, device_fingerprint, expires_at |
| `auth_logs` | Audit trail | user_id, event_type, ip_address |
| `api_scopes` | Permission registry | scope, description |
| `role_scopes` | Role→Scope mapping | role, scope |

## Middleware Chain

```
Request
  ↓
Rate Limiter (optional)
  ↓
Authenticate (validate JWT)
  ↓
Validate Restaurant Access
  ↓
Require Scopes (if needed)
  ↓
Route Handler
```

## Permissions Matrix (8 Scopes)

- `orders:create|read|update|delete|status`
- `payments:process|refund|read`
- `reports:view|export`
- `staff:manage|schedule`
- `system:config`
- `menu:manage`
- `tables:manage`

## Security Features

✅ JWT signature verification (HS256)  
✅ Rate limiting (adaptive)  
✅ PIN lockout (5 attempts → 15 min)  
✅ Device fingerprinting (station tokens)  
✅ RLS policies (database level)  
✅ Multi-tenancy enforcement  
✅ CSRF protection  
✅ Auth audit logging  

## Login Flows

### Email/Password (Managers/Owners)
1. User enters credentials
2. Supabase validates
3. Check `user_restaurants` for restaurant access
4. Fetch scopes from `role_scopes`
5. Return Supabase session tokens
6. Client stores + auto-refreshes

### PIN (Staff)
1. User enters 4-6 digit PIN
2. validatePin() searches `user_pins` table
3. Bcrypt+pepper comparison
4. Generate 12-hour JWT with restaurant scope
5. Client stores in localStorage

### Station (Kitchen Displays)
1. Authenticated user calls station-login
2. Generate device fingerprint (IP+UA hash)
3. Create 4-hour JWT with device fingerprint
4. Store hashed token in database
5. Station uses token, verified on each request

## Session Management

**Auto-Refresh**:
- Triggered 5 minutes before expiry
- POST /api/v1/auth/refresh with refresh_token
- Single timer via ref (no race conditions)
- Logout if refresh fails

**Manual Refresh**:
- Guarded against concurrent attempts
- Called by app when needed

**Logout**:
- Supabase.auth.signOut() clears server session
- POST /api/v1/auth/logout logs event
- Frontend clears state + localStorage

## Environment Variables (Required)

```
# Supabase
SUPABASE_URL=...
SUPABASE_JWT_SECRET=...
SUPABASE_ANON_KEY=...

# Auth Secrets
KIOSK_JWT_SECRET=...
PIN_PEPPER=...
DEVICE_FINGERPRINT_SALT=...
STATION_TOKEN_SECRET=...

# App Config
NODE_ENV=development|production
DEFAULT_RESTAURANT_ID=grow
FRONTEND_URL=http://localhost:5173
```

## Common Tasks

### Add New Permission/Scope
1. Add to `ApiScope` enum (rbac.ts:12-41)
2. Add to role in `ROLE_SCOPES` (rbac.ts:103-181)
3. Create migration (add to api_scopes + role_scopes tables)
4. Test with actual requests

### Create Station Token
```
POST /api/v1/auth/station-login
Headers: Authorization: Bearer <token>
Body: {stationType, stationName, restaurantId}
```

### Revoke User's PIN
1. Call `resetPinAttempts()` (pinAuth.ts:301-323)
2. Or set `locked_until` directly in DB

### Check User Permissions
```
user.scopes.includes('orders:create')  // Frontend
```

## Testing

- **Unit Tests**: `/server/src/middleware/__tests__/auth.test.ts`
- **E2E Fixtures**: `/tests/e2e/fixtures/`
- **Test Framework**: Vitest

## Documentation

- **Full Report**: `AUTHENTICATION_SYSTEM_REPORT.md` (1416 lines)
- **Architecture Decisions**: `docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`
- **ADR-006**: `docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`

