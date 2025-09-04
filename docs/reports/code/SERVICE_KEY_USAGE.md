# Service Key Usage Audit

## Files Importing Admin Client
1. **server/src/config/database.ts** - Defines both admin and user clients ✅
2. **server/src/services/userService.ts** - Needs user client parameter
3. **server/src/services/orders.service.ts** - Static class importing admin directly

## Routes With Write Operations
- **tables.routes.ts** - ✅ Already uses attachUserClient and req.userSupabase
- **auth.routes.ts** - Auth operations, may need admin for user creation
- **orders.routes.ts** - Uses OrdersService (needs refactor)
- **payments.routes.ts** - Payment processing
- **terminal.routes.ts** - Terminal operations
- **users.routes.ts** - User management

## Routes Without User-Scoped Client
- auth.routes.ts (may be intentional for auth ops)
- orders.routes.ts ❌ Critical - needs user client
- payments.routes.ts ❌ Needs review
- terminal.routes.ts ❌ Needs review
- users.routes.ts ❌ Needs review

## Services Needing Refactor
1. **OrdersService** - Convert static methods to accept client parameter
2. **userService** - Update to accept client parameter
3. Any other services doing writes

## Priority Fixes
1. Add attachUserClient to orders.routes.ts
2. Refactor OrdersService to accept client parameter
3. Update other write routes similarly