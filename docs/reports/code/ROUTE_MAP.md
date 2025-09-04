# API Route Map

## Routes with Write Operations
| Route | User-Scoped Client | Operations | Status |
|-------|-------------------|------------|--------|
| tables.routes.ts | ✅ Yes | CREATE, UPDATE, DELETE | Fixed |
| orders.routes.ts | ✅ Yes | CREATE, UPDATE (status) | Fixed |
| auth.routes.ts | ❌ No | User creation/auth | Admin needed |
| payments.routes.ts | ❓ Unknown | Payment processing | Needs review |
| terminal.routes.ts | ❓ Unknown | Terminal ops | Needs review |
| users.routes.ts | ❓ Unknown | User management | Needs review |

## Read-Only Routes
- health.routes.ts
- menu.routes.ts
- metrics.routes.ts
- restaurants.routes.ts
- realtime.routes.ts
- ai.routes.ts
- security.routes.ts

## Critical Findings
1. ✅ Tables and Orders routes now use user-scoped clients
2. ✅ OrdersService refactored to accept client parameter
3. ⚠️ Other write routes may need similar updates
4. ✅ RLS policies no longer depend on JWT claims