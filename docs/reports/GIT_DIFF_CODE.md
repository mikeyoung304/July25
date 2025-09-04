# Code Changes - User-Scoped Client Updates

## Summary
Modified server routes and services to use user-scoped Supabase clients instead of admin client for all write operations.

## Files Modified

### 1. server/src/routes/orders.routes.ts
- Added `attachUserClient` middleware
- Updated all OrdersService calls to pass user client
- Client extracted from `(req as any).userSupabase`

### 2. server/src/services/orders.service.ts  
- Added `SupabaseClient` import
- All static methods now accept `client` as first parameter
- Replaced all `supabase.` references with `client.`
- Methods updated:
  - createOrder()
  - getOrders()
  - getOrder()
  - updateOrderStatus()
  - updateOrderPayment()
  - processVoiceOrder()
  - generateOrderNumber()
  - logStatusChange()

### 3. server/src/routes/tables.routes.ts
- Already had `attachUserClient` middleware ✅
- Already using `(req as any).userSupabase` ✅

## Remaining Routes to Check
- auth.routes.ts (may need admin for user creation)
- payments.routes.ts
- terminal.routes.ts
- users.routes.ts
- restaurants.routes.ts

## Impact
All order and table operations now respect RLS policies based on user membership rather than requiring JWT custom claims.