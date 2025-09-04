# Service Key Usage Audit

**Date**: 2025-09-04  
**Status**: ⚠️ **Action Required**

## Routes Analysis

### ✅ Already Using User-Scoped Client
- **orders.routes.ts**: Uses `attachUserClient` middleware ✅
- **tables.routes.ts**: Uses `attachUserClient` middleware ✅

### ⚠️ Routes Needing User-Scoped Client
- **payments.routes.ts**: No `attachUserClient`, calls services that use admin client
- **terminal.routes.ts**: No `attachUserClient`, calls OrdersService without client
- **users.routes.ts**: No `attachUserClient`, calls userService that uses admin client

### ℹ️ Read-Only Routes (Lower Priority)
- **auth.routes.ts**: Auth operations (service role needed for user creation)
- **health.routes.ts**: Health checks (read-only)
- **restaurants.routes.ts**: Restaurant data (read-only)
- **menu.routes.ts**: Menu data (read-only)
- **ai.routes.ts**: AI operations (no DB writes)
- **realtime.routes.ts**: WebRTC session (no DB writes)
- **security.routes.ts**: Security endpoints (no DB operations)

## Services Analysis

### ⚠️ Services Using Admin Client Directly

#### High Priority (Write Operations)
1. **payment.service.ts**
   - Imports: `import { supabase } from '../config/database'`
   - Write operation: `payment_audit_logs` insert (line 183)
   - **Action**: Refactor to accept client parameter

2. **userService.ts**
   - Imports: `import { supabase } from '../config/database'`
   - Multiple write operations:
     - `user_profiles` insert/update (lines 84, 295)
     - `user_restaurants` insert/update (lines 101, 333, 342, 434)
     - `user_pins` insert/update (lines 390, 404)
     - `auth_logs` insert (line 575)
   - **Action**: Refactor to accept client parameter

3. **orders.service.ts**
   - Already refactored to accept client parameter ✅
   - All methods now use passed client instead of admin

#### Lower Priority (Mostly Reads)
4. **menu.service.ts**
   - Imports admin client but only performs reads
   - Operations: `menu_categories`, `menu_items` selects only
   - **Action**: Low priority, no writes

## Summary

### Immediate Actions Required (P1)

1. **Add `attachUserClient` to routes**:
   ```typescript
   // Add to: payments.routes.ts, terminal.routes.ts, users.routes.ts
   import { attachUserClient } from '../config/database';
   router.use(attachUserClient);
   ```

2. **Refactor services to accept client**:
   - PaymentService: Add client parameter to all methods
   - UserService: Add client parameter to all methods
   - Update route handlers to pass `req.userSupabase`

### Files to Modify
- [ ] server/src/routes/payments.routes.ts
- [ ] server/src/routes/terminal.routes.ts  
- [ ] server/src/routes/users.routes.ts
- [ ] server/src/services/payment.service.ts
- [ ] server/src/services/userService.ts

### Verification
After modifications, no write operations should use the admin client directly except for:
- Auth operations (user creation, password reset)
- Admin-only operations (system maintenance)