# Row Level Security (RLS) Coverage Report

## Critical Business Tables

### ✅ Tables WITH RLS Enabled

#### Authentication & User Management
- **user_profiles** - RLS ENABLED (migration: 20250130_auth_tables.sql)
  - Policy: "Users can view own profile"
  - Policy: "Managers can view restaurant staff profiles"

- **user_restaurants** - RLS ENABLED (migration: 20250130_auth_tables.sql)
  - Policy: "Users can view own restaurant associations"
  - Policy: "Managers can view restaurant staff associations"

- **user_pins** - RLS ENABLED (migration: 20250130_auth_tables.sql)
  - Policies present (specific names not shown in grep)

- **station_tokens** - RLS ENABLED (migration: 20250130_auth_tables.sql)
  - Policy: "Managers can manage station tokens"

- **auth_logs** - RLS ENABLED (migration: 20250130_auth_tables.sql)
  - Policy: "Users can view own auth logs"
  - Policy: "Managers can view restaurant auth logs"

#### Payment Tables
- **payment_audit_logs** - RLS ENABLED (migration: 20250201_payment_audit_logs.sql)
  - Policy: payment_audit_logs_restaurant_policy
  - Policy: payment_audit_logs_insert_policy
  - Policy: payment_audit_logs_no_update
  - Policy: payment_audit_logs_no_delete

- **table_checks** - RLS ENABLED (migration: create_payment_tables.sql)
  - Policy: "Service role can manage all table checks"
  - Policy: "Authenticated users can view table checks"
  - Policy: "Servers can manage table checks"

- **payment_splits** - RLS ENABLED (migration: create_payment_tables.sql)
  - Policy: "Service role can manage all payment splits"
  - Policy: "Authenticated users can view payment splits"

- **split_sessions** - RLS ENABLED (migration: create_payment_tables.sql)
  - Policy: "Service role can manage all split sessions"
  - Policy: "Authenticated users can view split sessions"

- **payment_intents** - RLS ENABLED (migration: 20250115_payment_intents.sql)
  - Policy: payment_intents_service_role
  - Policy: payment_intents_read_own

### ⚠️ Tables WITHOUT Confirmed RLS

Based on code references but no RLS policies found in migrations:

#### Core Business Tables (CRITICAL - Need RLS)
- **orders** - NO RLS FOUND
  - Referenced in: server/src/services/orders.service.ts
  - Used for: Order management (critical business data)

- **restaurants** - NO RLS FOUND
  - Referenced in: server/src/services/restaurant.service.ts
  - Used for: Multi-tenant restaurant data

- **menu_items** - NO RLS FOUND
  - Referenced in: server/src/services/menu.service.ts
  - Used for: Menu management

- **tickets** - NO RLS FOUND IN MIGRATIONS
  - May be a view or alias for orders

- **staff** - NO RLS FOUND IN MIGRATIONS
  - May be using user_profiles/user_restaurants instead

## Database Access Pattern

The application primarily uses Supabase service role for database access:
- Server uses service role key (bypasses RLS)
- RLS policies still important for:
  1. Direct database access
  2. Client SDK usage
  3. Defense in depth
  4. Audit compliance

## Recommendations

### CRITICAL - Add RLS to Core Tables
1. **orders** table - Restrict by restaurant_id and user role
2. **restaurants** table - Restrict to staff members only
3. **menu_items** table - Public read, restricted write

### Example RLS Policy for Orders Table
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant staff can view orders"
ON orders FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM user_restaurants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (
  customer_id = auth.uid() OR
  created_by = auth.uid()
);
```

## Summary

✅ Authentication/User tables: RLS enabled
✅ Payment tables: RLS enabled
⚠️ Core business tables (orders, restaurants, menu_items): NO RLS FOUND
🔍 Server uses service role (bypasses RLS) but policies still needed for defense-in-depth