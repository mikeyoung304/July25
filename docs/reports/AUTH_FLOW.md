# Authentication Flow Analysis
Generated: 2025-09-03

## Auth Endpoints Overview

| Endpoint | Method | Authentication Type | Returns | RLS Compatible |
|----------|--------|-------------------|---------|-----------------|
| `/api/v1/auth/login` | POST | Email/Password | Supabase session | ✅ Yes |
| `/api/v1/auth/pin-login` | POST | PIN | Supabase session | ✅ Yes |
| `/api/v1/auth/kiosk` | POST | Demo | Local JWT | ❌ No |
| `/api/v1/auth/station-login` | POST | Station | Custom token | ❌ No |

## Client-Side Token Flow

### 1. Token Storage & Retrieval
**File**: `client/src/services/http/httpClient.ts`

```typescript
// Line 134-144: Token hierarchy
1. Check sessionStorage for 'authToken'
2. If not found, check Supabase session
3. If no session, get demo token (dev only)
4. Add to headers: Authorization: Bearer <token>
```

### 2. Request Headers Sent
- `Authorization: Bearer <token>` (always included)
- `X-Restaurant-ID: <restaurant-id>` (from TableService)
- `X-CSRF-Token: <csrf-token>` (for non-GET requests)

## Server-Side Auth Flow

### 1. Middleware Chain
**File**: `server/src/middleware/auth.ts`

```typescript
authenticate() -> 
  - Extracts Bearer token
  - Verifies JWT (Supabase or local)
  - Sets req.user with id, email, role, scopes
  - Sets req.restaurantId from header or token
```

### 2. Database Client Selection (CRITICAL ISSUE)

**Current State (BROKEN)**:
```typescript
// server/src/routes/tables.routes.ts
import { supabase } from '../config/database' // SERVICE KEY CLIENT

// All operations use service key:
await supabase.from('tables').insert(...) // BYPASSES RLS!
```

**Available but Unused**:
```typescript
// server/src/config/database.ts
export function createUserClient(accessToken: string) // EXISTS
export function attachUserClient(req, res, next)     // EXISTS BUT NEVER USED
```

## Token Types & RLS Compatibility

### 1. Supabase Session Tokens (✅ RLS Compatible)
- From `/auth/login` or `/auth/pin-login`
- Contains `sub` (user UUID from auth.users)
- Works with `auth.uid()` in RLS policies
- Can create user-scoped client

### 2. Local Demo JWT (❌ Not RLS Compatible)
- From `/auth/kiosk`
- Contains `sub: "demo:randomid"`
- Not a real Supabase user
- Cannot work with `auth.uid()` in RLS

### 3. Test Token (❌ Development Only)
- Hardcoded `test-token`
- Bypasses auth in development
- Sets fake user data

## PIN Authentication Deep Dive

**File**: `server/src/routes/auth.routes.ts:191-239`

```typescript
router.post('/pin-login', async (req, res) => {
  const { pin, restaurantId } = req.body
  
  // Line 201-204: Delegates to userService
  const result = await userService.authenticateWithPin(pin, restaurantId)
  
  // Line 220-234: Returns Supabase session
  res.json({
    token: result.session.access_token,  // Supabase JWT
    session: {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token
    }
  })
})
```

**Verification Needed**: Does `userService.authenticateWithPin()` create a real Supabase session?

## Critical Path: Floor Plan Save

### Client Side
1. `FloorPlanEditor.tsx:640-641`: Calls `tableService.batchUpdateTables()`
2. `TableService.ts:82-87`: Sends PUT to `/api/v1/tables/batch`
3. Headers include: `Authorization: Bearer <token>`, `X-Restaurant-ID`

### Server Side  
1. `tables.routes.ts:269`: `batchUpdateTables()` handler
2. **Line 331-337**: Uses `supabase` (service key) for updates
3. **BYPASSES RLS** - doesn't use user's token for DB access

## Root Causes Identified

1. **Service Key Everywhere**: All DB operations use service role key
2. **Unused Middleware**: `attachUserClient()` never applied to routes
3. **No User Context**: RLS policies check `auth.uid()` but service key has no user
4. **Demo Tokens Incompatible**: Local JWTs aren't real Supabase users

## Required Changes

1. Apply `attachUserClient` middleware after authentication
2. Use `req.userSupabase` instead of global `supabase` in routes
3. Ensure all auth methods return real Supabase sessions
4. Never use service key for user-scoped operations