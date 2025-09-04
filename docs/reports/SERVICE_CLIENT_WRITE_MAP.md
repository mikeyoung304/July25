# Service Client Write Operations Map
Generated: 2025-09-03

## Files Using Service Client (`import { supabase }`)

### Route Files
1. `server/src/routes/tables.routes.ts` - Floor plan management
2. `server/src/routes/restaurants.routes.ts` - Restaurant settings
3. `server/src/routes/auth.routes.ts` - Authentication
4. `server/src/routes/health.routes.ts` - Health checks

### Service Files  
5. `server/src/services/orders.service.ts` - Order management
6. `server/src/services/menu.service.ts` - Menu management
7. `server/src/services/payment.service.ts` - Payment processing
8. `server/src/services/userService.ts` - User management
9. `server/src/services/auth/pinAuth.ts` - PIN authentication
10. `server/src/services/auth/stationAuth.ts` - Station authentication

### Middleware Files
11. `server/src/middleware/rbac.ts` - Role-based access control
12. `server/src/middleware/restaurantAccess.ts` - Restaurant access validation

## Write Operations Found (All Using Service Key)

### Orders Service (`services/orders.service.ts`)
| Line | Operation | Table | Method |
|------|-----------|-------|--------|
| 157 | Create order | `orders` | `.insert([newOrder])` |
| 306 | Update order status | `orders` | `.update(update)` |
| 389 | Update order payment | `orders` | `.update(update)` |
| 433 | Log voice order | `voice_order_logs` | `.insert([{...}])` |
| 470 | Update voice log | `voice_order_logs` | `.update({ order_id })` |
| 481 | Log voice error | `voice_order_logs` | `.insert([{...}])` |
| 533 | Log status change | `order_status_history` | `.insert([{...}])` |

### Payment Service (`services/payment.service.ts`)
| Line | Operation | Table | Method |
|------|-----------|-------|--------|
| 184 | Log payment audit | `payment_audit_logs` | `.insert(auditLog)` |

### User Service (`services/userService.ts`)
| Line | Operation | Table | Method |
|------|-----------|-------|--------|
| 85 | Create user profile | `user_profiles` | `.insert({...})` |
| 102 | Assign restaurant role | `user_restaurants` | `.insert({...})` |
| 125 | Upsert user restaurant | `user_restaurants` | `.upsert({...})` |
| 287 | Update user profile | `user_profiles` | `.update({...})` |
| 302 | Update user restaurant | `user_restaurants` | `.update({...})` |
| 361 | Create PIN | `user_pins` | `.insert({...})` |
| 396 | Update PIN | `user_pins` | `.update({...})` |
| 431 | Deactivate user | `user_restaurants` | `.update({ is_active: false })` |

### Tables Routes (`routes/tables.routes.ts`)
| Line | Operation | Table | Method |
|------|-----------|-------|--------|
| 31-36 | Get tables | `tables` | `.select()` |
| 60-65 | Get single table | `tables` | `.select()` |
| 107-111 | Create table | `tables` | `.insert([tableData])` |
| 166-172 | Update table | `tables` | `.update(dbUpdates)` |
| 199-204 | Delete table (soft) | `tables` | `.update({ active: false })` |
| 237-243 | Update table status | `tables` | `.update(updates)` |
| 331-337 | Batch update tables | `tables` | `.update(dbUpdates)` |

### Auth Routes (`routes/auth.routes.ts`)
| Line | Operation | Table | Method |
|------|-----------|-------|--------|
| 112-116 | Check user role | `user_restaurants` | `.select('role')` |
| 124-131 | Upsert demo admin | `user_restaurants` | `.upsert({...})` |
| 149-157 | Log auth event | `auth_logs` | `.insert({...})` |
| 294-302 | Log logout | `auth_logs` | `.insert({...})` |
| 337-341 | Get user profile | `user_profiles` | `.select()` |
| 344-349 | Get user role | `user_restaurants` | `.select('role')` |

### PIN Auth Service (`services/auth/pinAuth.ts`)
| Line | Operation | Table | Method |
|------|-----------|-------|--------|
| 37-45 | Validate PIN | `user_pins` | `.select()` |
| 108-118 | Create PIN | `user_pins` | `.insert({...})` |
| 131-136 | Update PIN | `user_pins` | `.update({...})` |

### Station Auth Service (`services/auth/stationAuth.ts`)
| Line | Operation | Table | Method |
|------|-----------|-------|--------|
| 101-112 | Store station token | `station_tokens` | `.insert({...})` |
| 140-148 | Validate token | `station_tokens` | `.select()` |
| 185-190 | Revoke tokens | `station_tokens` | `.update({ revoked: true })` |

## Summary

- **100% of database operations use service key** (bypasses RLS)
- **0% use user-scoped clients** (`req.userSupabase`)
- **Most critical**: Orders, Payments, Tables - all bypass RLS
- **Auth tables referenced but don't exist**: user_restaurants, user_profiles, user_pins

## Impact

Every single database write operation will:
1. Bypass RLS policies (service key = superuser)
2. Lack user context (`auth.uid()` = NULL)
3. Ignore tenant isolation policies
4. Create audit trail without user attribution