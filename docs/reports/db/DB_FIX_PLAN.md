# Database Fix Plan - Auth & RLS Implementation

**Date**: 2025-09-03  
**Mode**: MCP-ONLY (Supabase Model Context Protocol)  
**Status**: STAGED - AWAITING APPROVAL

## Staged Migration Files

### 1. `20250903_100000_auth_core.sql`
**Purpose**: Create core authentication and RBAC tables  
- Creates 6 missing auth tables: user_profiles, user_restaurants, user_pins, station_tokens, api_scopes, role_scopes
- All tables reference auth.users(id) for Supabase Auth integration
- Adds performance indexes on restaurant_id columns
- Seeds initial API scopes and role-scope mappings
- **Idempotent**: Uses IF NOT EXISTS for all CREATE statements

### 2. `20250903_100001_auth_core_rls.sql`
**Purpose**: Enable RLS and create tenant isolation policies  
- Enables RLS on all auth tables
- Creates user-scoped policies (users see only their data)
- Adds tenant isolation policies using `coalesce((auth.jwt() ->> 'restaurant_id')::uuid)`
- Creates service_role_bypass policies for admin operations
- Fixes existing table policies (tables, orders, menu_items, restaurants)
- **Idempotent**: Uses DO blocks with IF NOT EXISTS checks for all policies

### 3. `20250903_100002_auth_core_grants.sql`
**Purpose**: Configure role-based grants  
- Grants minimal SELECT to 'anon' (public menu viewing)
- Grants full CRUD to 'authenticated' (relies on RLS)
- Grants USAGE on sequences for ID generation
- No changes to service_role (already has full access)
- **Idempotent**: GRANT statements are inherently idempotent

### 4. `20250903_100003_verification_bookmarks.sql`
**Purpose**: Create verification views for monitoring  
- v_rls_tables: Shows RLS status for all tables
- v_missing_auth_tables: Checks auth table existence
- v_policy_count: Policy count per table
- v_tenant_isolation: Validates multi-tenant setup
- v_user_role_overview: User-restaurant role summary
- **Idempotent**: Uses CREATE OR REPLACE VIEW

### 5. `__revert_scratch.sql` (Informational Only)
**Purpose**: Rollback reference (not for execution)  
- Shows correct dependency order for dropping objects
- Includes policy drops, view drops, table drops
- Marked clearly as destructive/informational

## Minimal-Change Rationale

This approach implements the **smallest possible changes** to fix the floor plan insert failure:

1. **Creates Missing Infrastructure**: Adds only the 6 required auth tables that the app expects
2. **Preserves Existing Policies**: Doesn't drop existing policies, only adds missing ones
3. **Tenant Context via JWT**: Uses standard Supabase pattern `auth.jwt() ->> 'restaurant_id'`
4. **Service Role Bypass**: Allows admin operations while maintaining security
5. **No Breaking Changes**: All migrations are additive and idempotent

## Root Cause Resolution

The floor plan insert fails because:
- ❌ **Before**: No auth tables → No JWT context → RLS blocks inserts
- ✅ **After**: Auth tables exist → JWT has restaurant_id → RLS allows tenant-scoped inserts

## Next Steps

**STOP - AWAITING YOUR APPROVAL**

Please type one of:
- `APPROVE: APPLY MIGRATIONS` - I will apply all 4 migrations via MCP
- `APPROVE: CHANGE CODE` - I will prepare code diffs to use user-scoped clients

## Safety Notes

- All migrations are idempotent (safe to run multiple times)
- No data is deleted or modified
- Rollback script provided for emergency use
- Service role maintains full access for provisioning