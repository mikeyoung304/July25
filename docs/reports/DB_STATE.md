# Database State Report
Generated: 2025-09-03

## Migration Files Present

### Local Migrations (/supabase/migrations/)
1. `20250130_auth_tables.sql` - Auth/RBAC tables (user_profiles, user_restaurants, user_pins, etc.)
2. `20250201_payment_audit_logs.sql` - Payment audit logging
3. `20250713130722_remote_schema.sql` - Empty file
4. `20250903_rls_policies.sql` - Comprehensive RLS policies for all tables

## Critical Finding: RLS Policies Require Auth Tables

The `20250903_rls_policies.sql` migration depends on:
- `user_restaurants` table for role-based access
- `auth.uid()` function from Supabase Auth
- Proper user sessions with JWT tokens

### RLS Policy Example (from tables):
```sql
CREATE POLICY "Staff can view restaurant tables" ON tables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = tables.restaurant_id
      AND ur.is_active = true
    )
  );
```

## Database Connection Architecture

### Current Setup (PROBLEMATIC)
- **Service Client**: Uses `SUPABASE_SERVICE_KEY` - bypasses ALL RLS
- **Admin Client**: Same as service client - bypasses ALL RLS  
- **User Client Function**: `createUserClient()` exists but UNUSED in routes

### Tables Route Analysis (server/src/routes/tables.routes.ts)
- **Line 31-36**: Uses `supabase` (service key client) for SELECT
- **Line 107-111**: Uses `supabase` (service key client) for INSERT
- **Line 166-172**: Uses `supabase` (service key client) for UPDATE
- **Line 331-337**: Uses `supabase` (service key client) for batch UPDATE

**CRITICAL**: All database operations bypass RLS using service key!

## Authentication Flow Analysis

### Login Methods
1. **Email/Password** (`/api/v1/auth/login`)
   - Uses Supabase Auth (`signInWithPassword`)
   - Returns proper Supabase session tokens
   - Validates user role via `user_restaurants` table

2. **PIN Login** (`/api/v1/auth/pin-login`)
   - Delegates to `userService.authenticateWithPin()`
   - Should return Supabase session (needs verification)

3. **Demo/Kiosk** (`/api/v1/auth/kiosk`)
   - Creates local JWT (not Supabase)
   - Signs with `KIOSK_JWT_SECRET`
   - **Problem**: Not a real Supabase user, won't work with RLS

## RLS Status Summary

### Tables with RLS Policies Created
- ✅ `tables` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `orders` - 3 policies (SELECT, INSERT, UPDATE)
- ✅ `menu_items` - 2 policies (SELECT for all, ALL for managers)
- ✅ `menu_categories` - 2 policies (SELECT for all, ALL for managers)
- ✅ `payments` - 2 policies (SELECT, INSERT)
- ✅ `restaurants` - 2 policies (SELECT, UPDATE)

### Missing Tables (May Need Creation)
- ❓ `user_restaurants` - Required for all RLS policies
- ❓ `user_profiles` - Referenced in auth system
- ❓ `user_pins` - Required for PIN auth
- ❓ `auth_logs` - For audit trail
- ❓ `api_scopes` - For RBAC
- ❓ `role_scopes` - For RBAC

## Root Cause of RLS Violation

1. **Service Key Usage**: All table operations use service key client
2. **Missing User Context**: No `auth.uid()` available when using service key
3. **Unused User Client**: `createUserClient()` function exists but not called
4. **Demo Auth Incompatible**: Local JWT tokens don't create Supabase sessions

## Migration Status
- **Unknown**: Need to verify if auth tables migration has been applied to remote
- **RLS Policies**: May fail if auth tables don't exist