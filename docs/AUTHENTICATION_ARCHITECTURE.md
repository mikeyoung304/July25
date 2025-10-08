# Authentication Architecture v6.0

## Overview

Restaurant OS v6.0 uses **Supabase Auth** as the primary authentication system for web users, with custom JWT tokens for specialized use cases (kiosks, kitchen displays).

## Architecture Principles

1. **Single Source of Truth**: Supabase manages all user authentication and session state
2. **Zero Redundancy**: Frontend authenticates directly with Supabase (no backend proxy)
3. **Automatic Token Management**: httpClient automatically includes Supabase JWT in all requests
4. **Separation of Concerns**: Different auth methods for different use cases

---

## Authentication Methods

### 1. Email/Password Login (Managers, Owners)
**Use Case**: Staff members with email accounts accessing web dashboard

**Flow**:
```
User enters credentials
    ↓
Frontend → Supabase.auth.signInWithPassword()
    ↓
Supabase validates credentials
    ↓
Frontend receives JWT + refresh token
    ↓
Frontend → Backend /api/v1/auth/me (with Supabase JWT)
    ↓
Backend validates JWT + fetches user role from database
    ↓
Frontend stores user data in React state
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `login()` function
- `server/src/middleware/auth.ts` - JWT validation
- `server/src/routes/auth.routes.ts` - `/api/v1/auth/me` endpoint

**Session Storage**:
- Supabase automatically stores session in `localStorage` under key `sb-{project-ref}-auth-token`
- Session includes: `access_token`, `refresh_token`, `expires_at`, `user`

### 2. PIN Login (Servers, Cashiers)
**Use Case**: Staff members using shared devices without individual email accounts

**Flow**:
```
User enters PIN
    ↓
Frontend → Backend /api/v1/auth/pin-login
    ↓
Backend validates PIN against database
    ↓
Backend generates custom JWT (not Supabase)
    ↓
Frontend stores JWT in localStorage
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `loginWithPin()` function
- `server/src/services/auth/pinAuth.ts` - PIN validation
- `server/src/routes/auth.routes.ts` - `/api/v1/auth/pin-login` endpoint

**Session Storage**:
- Custom format in `localStorage` under key `auth_session`
- JWT signed with `KIOSK_JWT_SECRET` (12-hour expiry)

### 3. Station Login (Kitchen Displays, Expo Screens)
**Use Case**: Stationary displays showing order queues

**Flow**:
```
Manager initiates station login
    ↓
Frontend → Backend /api/v1/auth/station-login (with manager JWT)
    ↓
Backend validates manager has permission
    ↓
Backend generates station JWT
    ↓
Display uses JWT for WebSocket + API access
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `loginAsStation()` function
- `server/src/services/auth/stationAuth.ts` - Station token management
- `server/src/routes/auth.routes.ts` - `/api/v1/auth/station-login` endpoint

**Session Storage**:
- Custom format in `localStorage` under key `auth_session`
- JWT signed with `KIOSK_JWT_SECRET`

### 4. Demo Login (Development Only)
**Use Case**: Quick access to demo accounts in development/staging

**Flow**:
```
Developer clicks demo role button
    ↓
Frontend → loginAsDemo(role)
    ↓
Maps role to demo credentials (e.g., server → server@restaurant.com)
    ↓
Calls standard login() with demo credentials
    ↓
(Same flow as Email/Password Login)
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `loginAsDemo()` function
- `client/src/components/auth/DevAuthOverlay.tsx` - Demo UI

**Requirements**:
- `VITE_DEMO_PANEL=1` environment variable
- Demo users must exist in Supabase Auth + `user_restaurants` table

---

## Session Management

### Frontend (React Context)

**State**:
```typescript
interface AuthState {
  user: User | null;              // Current user profile + role
  session: AuthSession | null;    // JWT tokens + expiry
  isLoading: boolean;             // Auth initialization status
  restaurantId: string | null;    // Current restaurant context
}
```

**Initialization** (`useEffect` in AuthProvider):
1. Check Supabase session (`supabase.auth.getSession()`)
2. If session exists → Fetch user details from `/api/v1/auth/me`
3. If no Supabase session → Check `localStorage` for PIN/station session
4. Set `isLoading = false`

**Auto-Refresh**:
- Supabase handles token refresh automatically
- Frontend listens to `onAuthStateChange` events
- Manual refresh via `refreshSession()` (5 minutes before expiry)

### Backend (Express Middleware)

**JWT Validation** (`authenticate` middleware):
```typescript
// Extract token from Authorization header
const token = req.headers.authorization?.replace('Bearer ', '');

// Try KIOSK_JWT_SECRET first (for PIN/station tokens)
// Fall back to SUPABASE_JWT_SECRET (for email/password tokens)
const decoded = jwt.verify(token, secret);

// Attach user info to request
req.user = {
  id: decoded.sub,
  role: decoded.role,
  scopes: decoded.scope,
  restaurant_id: decoded.restaurant_id
};
```

**Authorization** (`requireRole`, `requireScope` middleware):
- Checks `req.user.role` against allowed roles
- Checks `req.user.scopes` against required scopes

---

## HTTP Client Integration

### Automatic Auth Headers

`client/src/services/http/httpClient.ts` automatically attaches Supabase JWT to all requests:

```typescript
async request(endpoint, options) {
  // Get current Supabase session
  const { data: { session } } = await supabase.auth.getSession();

  // Add Authorization header
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  // Add restaurant ID header
  headers.set('x-restaurant-id', restaurantId);

  // Make request
  return super.request(endpoint, { headers, ...options });
}
```

**No manual token management required** - Supabase handles everything.

---

## Database Schema

### Users Table (Supabase Auth)
Managed by Supabase - stores authentication credentials.

### `user_profiles` Table
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  phone TEXT,
  employee_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `user_restaurants` Table
```sql
CREATE TABLE user_restaurants (
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  role TEXT NOT NULL,  -- 'owner', 'manager', 'server', 'kitchen', 'expo', 'cashier'
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, restaurant_id)
);
```

### `role_scopes` Table
```sql
CREATE TABLE role_scopes (
  role TEXT,
  scope TEXT,
  PRIMARY KEY (role, scope)
);
```

Example scopes:
- `orders.read`, `orders.write`
- `menu.read`, `menu.write`
- `tables.read`, `tables.write`
- `analytics.read`
- `staff.manage`

---

## Security Considerations

### Environment Variables

**Frontend** (`.env`):
```bash
VITE_SUPABASE_URL=https://{project}.supabase.co
VITE_SUPABASE_ANON_KEY={anon_key}
VITE_DEMO_PANEL=1  # Development only
```

**Backend** (`.env`):
```bash
SUPABASE_URL=https://{project}.supabase.co
SUPABASE_ANON_KEY={anon_key}
SUPABASE_JWT_SECRET={jwt_secret}  # For validating Supabase JWTs
KIOSK_JWT_SECRET={custom_secret}  # For PIN/station JWTs
STRICT_AUTH=true  # Disable test tokens in production
```

### JWT Signing Secrets

1. **Supabase JWT Secret**: Used by Supabase to sign access tokens
   - Found in Supabase Dashboard → Settings → API
   - Backend validates email/password login tokens with this

2. **Kiosk JWT Secret**: Custom secret for PIN/station tokens
   - Generated by you, stored in backend environment
   - Backend signs PIN/station tokens with this

### Token Expiry

| Auth Method | Access Token TTL | Refresh Token TTL | Auto-Refresh |
|-------------|------------------|-------------------|--------------|
| Email/Password | 1 hour | 30 days | ✅ Supabase auto-refresh |
| PIN Login | 12 hours | N/A | ❌ Re-login required |
| Station Login | 7 days | N/A | ❌ Re-login required |

### CORS Configuration

Backend allows specific origins only:
```typescript
const allowedOrigins = [
  'http://localhost:5173',       // Local dev
  'https://july25-client.vercel.app',  // Production
  // ... add staging/preview URLs as needed
];
```

---

## Migration from v5.0

### What Changed

**Before (v5.0)**:
- Frontend called backend `/api/v1/auth/login` endpoint
- Backend authenticated with Supabase, returned session
- Frontend set Supabase session from backend response
- **Problem**: Race condition between session creation and navigation

**After (v6.0)**:
- Frontend authenticates directly with Supabase
- Backend only validates JWTs and provides user metadata
- **Benefit**: No race conditions, simpler flow, faster login

### Breaking Changes

- ❌ **Removed**: `POST /api/v1/auth/login` endpoint
- ❌ **Removed**: `POST /api/v1/auth/refresh` endpoint
- ✅ **Kept**: `GET /api/v1/auth/me` (for fetching user profile)
- ✅ **Kept**: PIN and Station auth (separate use cases)

### Migration Steps for Existing Code

If you have code calling the old backend endpoints:

```typescript
// OLD (v5.0)
const response = await httpClient.post('/api/v1/auth/login', {
  email,
  password,
  restaurantId
});

// NEW (v6.0)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

const response = await httpClient.get('/api/v1/auth/me');
```

---

## Testing

### Demo Accounts

Seeded in Supabase Auth + database:

| Email | Password | Role | Use Case |
|-------|----------|------|----------|
| manager@restaurant.com | Demo123! | manager | Dashboard access, staff management |
| server@restaurant.com | Demo123! | server | Table management, order taking |
| kitchen@restaurant.com | Demo123! | kitchen | Kitchen queue display |
| expo@restaurant.com | Demo123! | expo | Expo station, order assembly |
| cashier@restaurant.com | Demo123! | cashier | POS, payment processing |

### Manual Testing

1. **Email/Password Login**:
   ```bash
   # Open browser console
   # Click demo "Server" button
   # Should see logs:
   # - "🔐 Attempting Supabase login"
   # - "✅ Supabase authentication successful"
   # - "✅ Login complete"
   ```

2. **Session Persistence**:
   ```bash
   # Login as server
   # Refresh page
   # Should stay logged in (session restored from Supabase)
   ```

3. **Role Authorization**:
   ```bash
   # Login as server
   # Navigate to /server → ✅ Allowed
   # Navigate to /manager → ❌ Redirected to /unauthorized
   ```

### Automated Tests

```bash
# Backend tests
cd server
npm test -- auth.test.ts

# Frontend tests (TODO)
cd client
npm test -- AuthContext.test.tsx
```

---

## Troubleshooting

### "Auth loading timeout - forcing completion after 5s"

**Removed in v6.0** - This was a symptom of the old backend login race condition.

### "Failed to fetch user details"

**Cause**: Backend `/api/v1/auth/me` endpoint failed

**Solutions**:
1. Check backend is running (`http://localhost:3001/api/v1/health`)
2. Check Supabase session exists (`localStorage.getItem('sb-{project}-auth-token')`)
3. Check backend logs for JWT validation errors

### "Invalid token" on backend

**Causes**:
1. Wrong `SUPABASE_JWT_SECRET` in backend `.env`
2. Token expired (check `expires_at` in localStorage)
3. User doesn't exist in `user_restaurants` table

**Solutions**:
1. Verify JWT secret matches Supabase dashboard
2. Logout and login again
3. Run database seed script

### Demo login fails with "User not found"

**Cause**: Demo users not seeded in database

**Solution**:
```bash
cd server
npm run seed:demo-users
```

---

## Future Improvements

### Short-term
- [ ] Add refresh token rotation for enhanced security
- [ ] Implement session activity logging
- [ ] Add 2FA for owner accounts

### Medium-term
- [ ] Migrate PIN auth to Supabase custom auth flow
- [ ] Add biometric authentication for mobile
- [ ] Implement IP-based access controls

### Long-term
- [ ] Multi-restaurant SSO
- [ ] OAuth integration (Google, Apple)
- [ ] Hardware token support (YubiKey)

---

## Contact

For questions about authentication architecture:
- **Tech Lead**: [Your Name]
- **Documentation**: This file + inline code comments
- **Issues**: GitHub Issues with `auth` label
