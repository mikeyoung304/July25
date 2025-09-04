# Code Change Diffs Index
Generated: 2025-09-03

## Overview
These diffs represent the minimal changes needed to migrate from service-key database access to user-scoped clients that respect RLS.

## Critical Path Diffs

### 1. Interface Update
**File**: `authenticated-request-interface.patch`
**Target**: `server/src/middleware/auth.ts`
**Change**: Add `userSupabase?: SupabaseClient` to AuthenticatedRequest interface

### 2. Tables Route (Complete Example)
**File**: `tables-user-client.patch`  
**Target**: `server/src/routes/tables.routes.ts`
**Changes**:
- Import `attachUserClient` instead of `supabase`
- Apply middleware with `router.use(attachUserClient)`
- Replace all 7 instances of `supabase.from()` with `req.userSupabase.from()`
**Lines Modified**: 3, 10, 31, 60, 107, 166, 199, 237, 331

### 3. Orders Service (Refactor Pattern)
**File**: `orders-service-user-client.patch`
**Target**: `server/src/services/orders.service.ts`
**Pattern**: 
- Add `dbClient` parameter to all methods
- Pass `req.userSupabase` from routes
**Impact**: All 8 write methods need updating

## Patterns for Other Files

### Payment Service
Similar to Orders - add `dbClient` parameter:
- `validatePaymentRequest(orderId, restaurantId, amount, idempotencyKey, dbClient)`
- `logPaymentAttempt(data, dbClient)`

### User Service  
More complex - uses admin operations:
- Keep `supabase.auth.admin.*` for user creation
- Use `dbClient` parameter for data operations
- Split admin vs user operations clearly

### Auth Routes
Mixed usage:
- Keep `supabase.auth.*` for authentication
- Use `req.userSupabase` for data queries
- Apply `attachUserClient` after authentication middleware

## Application Order

1. **First**: Update AuthenticatedRequest interface
2. **Second**: Add `attachUserClient` import to database config exports
3. **Third**: Update routes (start with tables as proof)
4. **Fourth**: Update services to accept dbClient parameter
5. **Last**: Update route handlers to pass req.userSupabase

## Testing Strategy

After each file update:
1. Test with RLS disabled (should work as before)
2. Enable RLS on one table
3. Test with proper user token
4. Verify no 42501 errors

## Rollback Points

Each diff can be reverted independently:
- Remove middleware: `router.use(attachUserClient)` 
- Revert to `supabase` from `req.userSupabase`
- Remove dbClient parameters

## Known Complexities

### Station/Kitchen Authentication
These don't have Supabase users. Options:
1. Keep service key for these specific routes
2. Create service accounts in Supabase
3. Use anonymous sessions with limited RLS

### Demo/Kiosk Mode
Currently uses local JWT. Options:
1. Create temporary Supabase users
2. Use anonymous auth
3. Proxy pattern for demo operations

### WebSocket Connections
Long-lived connections need special handling:
1. Store user client with connection
2. Handle token refresh
3. Reconnect on auth change