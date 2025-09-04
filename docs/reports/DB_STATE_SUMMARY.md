# Database State Summary - MCP Verification

**Date**: 2025-09-03  
**Transport**: MCP (Model Context Protocol)  
**User**: supabase_read_only_user  
**Database**: PostgreSQL 17.4  

## Critical Findings

### 🔴 Missing Auth Tables (ALL 6 REQUIRED TABLES ARE MISSING)

The following auth/RBAC tables expected by the application **DO NOT EXIST**:
- ❌ `user_profiles` - User profile data
- ❌ `user_restaurants` - User-to-restaurant associations  
- ❌ `user_pins` - PIN authentication for staff
- ❌ `station_tokens` - Station-based auth tokens
- ❌ `api_scopes` - API permission definitions
- ❌ `role_scopes` - Role-to-scope mappings

**Impact**: The entire authentication system cannot function without these tables.

### ✅ Existing Tables with RLS

These tables exist and have RLS enabled (but not enforced):
- `menu_categories` (RLS enabled, not forced)
- `menu_items` (RLS enabled, not forced)  
- `order_status_history` (RLS enabled, not forced)
- `orders` (RLS enabled, not forced)
- `restaurants` (RLS enabled, not forced)
- `tables` (RLS enabled, not forced)
- `voice_order_logs` (RLS enabled, not forced)

### ⚠️ RLS Policy Analysis

Current policies rely on JWT claims (`request.jwt.claims`) for restaurant isolation:

**menu_items**:
- `mi_select_same_restaurant`: READ - checks `restaurant_id` in JWT
- `mi_modify_same_restaurant`: ALL - checks `restaurant_id` in JWT

**orders**:
- `Users can manage their restaurant orders`: ALL - uses COALESCE of JWT or header `x-restaurant-id`

**restaurants**:
- `restaurants_select_own`: READ - checks `id` matches JWT `restaurant_id`
- `restaurants_update_own`: UPDATE - checks `id` matches JWT `restaurant_id`

**tables**:
- `tables_manage_same_restaurant`: ALL - checks `restaurant_id` in JWT

**Critical Issue**: All policies expect `restaurant_id` in JWT claims, but there's no auth infrastructure to generate these JWTs.

### 🔴 Root Cause of Floor Plan Insert Failure

The floor plan insert fails because:

1. **No Authentication Tables**: The auth tables (`user_profiles`, `user_restaurants`, etc.) don't exist
2. **No JWT Generation**: Without auth tables, no valid JWT can be created with required claims
3. **RLS Policies Expect JWT**: The `tables` table policy requires `restaurant_id` in JWT claims
4. **Service Role Bypass Missing**: No explicit policies for service role or anon access

When using anon/public keys, the JWT has no `restaurant_id` claim, causing the RLS check to fail with "new row violates row-level security policy".

## Required Migrations (Idempotent)

### Migration 1: Create Auth Tables
```sql
-- Create auth/RBAC tables if they don't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  restaurant_id uuid REFERENCES restaurants(id),
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  restaurant_id uuid REFERENCES restaurants(id),
  pin_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.station_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id),
  token_hash text NOT NULL,
  station_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text UNIQUE NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.role_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  scope text NOT NULL,
  UNIQUE(role, scope)
);
```

### Migration 2: Fix RLS Policies for Service Operations
```sql
-- Add service role bypass for critical tables
CREATE POLICY IF NOT EXISTS "Service role bypass" ON public.tables
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role bypass" ON public.restaurants  
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role bypass" ON public.orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role bypass" ON public.menu_items
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add anon read access for public data
CREATE POLICY IF NOT EXISTS "Public read access" ON public.restaurants
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read access" ON public.menu_items  
  FOR SELECT USING (true);
```

### Migration 3: Enable RLS Enforcement
```sql
-- Force RLS on critical tables (after policies are fixed)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables FORCE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
```

## Recommendations

1. **Immediate**: Apply Migration 1 to create missing auth tables
2. **Critical**: Apply Migration 2 to fix RLS policies for service operations
3. **Security**: Apply Migration 3 after testing to enforce RLS
4. **Testing**: Create test users and validate JWT generation
5. **Client**: Update client to use proper auth flow with JWT tokens

## Summary

The database is missing the entire authentication infrastructure. All 6 required auth tables are absent, making it impossible to generate valid JWTs with the `restaurant_id` claims that RLS policies expect. This is why floor plan inserts fail - the RLS policies cannot validate against non-existent auth data.