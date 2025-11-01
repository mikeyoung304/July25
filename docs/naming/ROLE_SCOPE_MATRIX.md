# Role-Scope Matrix

**Last Updated:** 2025-10-31

**Source:** `server/src/middleware/rbac.ts:60-138`
**Last Synced:** 2025-10-18

## Customer (Public Self-Service)

| Scope | Description | Required For |
| --- | --- | --- |
| `orders:create` | Create new orders | Checkout flow |
| `orders:read` | View own orders | Order history |
| `payments:process` | Complete payments | Payment submission |
| `menu:manage` | View menu items | Browse menu (mapped to `menu:manage` in rbac.ts) |
| `ai.voice:chat` | Voice AI assistant | Voice ordering |

**Note:** `menu:manage` scope in rbac.ts provides read-only menu access for customer role (naming inconsistency to be addressed in future).

## Server (In-Restaurant Staff)

| Scope | Description | Required For |
| --- | --- | --- |
| `orders:create` | Create orders for customers | ServerView |
| `orders:read` | View all orders | Order monitoring |
| `orders:update` | Modify orders | Edit order items |
| `orders:status` | Update order status | Kitchen workflow |
| `payments:process` | Process payments | Checkout |
| `payments:read` | View payment details | Transaction review |
| `tables:manage` | Manage table assignments | Floor plan |

## Other Roles

For complete role-scope mappings (owner, manager, kitchen, expo, cashier), see:
- **Code:** `server/src/middleware/rbac.ts:60-138`
- **Database:** `supabase/migrations/20251018_add_customer_role_scopes.sql`
- **Documentation:** [AUTHENTICATION_ARCHITECTURE.md](../AUTHENTICATION_ARCHITECTURE.md)

## Dual-Source Architecture Warning

⚠️ **CRITICAL:** Scopes are defined in TWO places:
1. **Database:** `role_scopes` table (queried during login)
2. **Code:** `rbac.ts` ROLE_SCOPES constant (used for API middleware)

**These MUST stay in sync manually.** When updating:
1. Update `rbac.ts`
2. Create migration to update `role_scopes` table
3. Update this matrix
4. Test with `npm run test:server -- auth`
