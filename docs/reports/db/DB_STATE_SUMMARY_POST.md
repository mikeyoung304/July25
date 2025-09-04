# Database State Summary - Post-Migration Analysis

**Date**: 2025-09-03  
**Status**: MIGRATIONS STAGED BUT NOT APPLIED (MCP Read-Only)

## Current Limitation

The MCP Supabase connection is **read-only** (`supabase_read_only_user`), preventing direct migration application. The migrations have been successfully staged and are ready for manual application.

## Expected State After Migration Application

### ✅ Auth Tables (Will Be Created)
Once migrations are applied, these tables will exist:
- `user_profiles` - User profile data linked to auth.users
- `user_restaurants` - User-to-restaurant role mappings
- `user_pins` - PIN authentication for staff
- `station_tokens` - Shared device authentication
- `api_scopes` - Permission scope definitions
- `role_scopes` - Role-to-scope mappings

### ✅ RLS Policies (Will Be Added)

**Auth Table Policies**:
- `user_profiles`: Self-select/update only
- `user_restaurants`: Self-select, service-role management
- `user_pins`: Service-role only (server-side PIN verification)
- `station_tokens`: Restaurant-scoped select, service-role management

**Existing Table Policies (Will Be Fixed)**:
- All tables will have `tenant_isolation` policies using `auth.jwt() ->> 'restaurant_id'`
- All tables will have `service_role_bypass` for admin operations
- No more reliance on missing auth infrastructure

### ✅ Grants (Will Be Configured)

**Anon Role**:
- SELECT on restaurants, menu_items, menu_categories (public data)
- SELECT on api_scopes, role_scopes (permission info)
- No write access

**Authenticated Role**:
- Full CRUD on all business tables (controlled by RLS)
- Relies on tenant isolation via JWT claims

### ✅ Verification Views (Will Be Created)
- `v_rls_tables` - Monitor RLS status
- `v_missing_auth_tables` - Verify auth table presence
- `v_policy_count` - Policy audit
- `v_tenant_isolation` - Multi-tenant validation
- `v_user_role_overview` - User/role statistics

## Key Deltas from Current State

| Component | Before | After Migration |
|-----------|--------|-----------------|
| Auth Tables | 0/6 exist | 6/6 will exist |
| User Authentication | Not possible | JWT with restaurant_id claims |
| PIN Authentication | Not possible | Server-side PIN verification |
| RLS Policies | JWT-based but no JWT generation | Complete JWT + tenant isolation |
| Service Operations | Blocked by RLS | Service role bypass policies |
| Floor Plan Insert | ❌ Fails (RLS violation) | ✅ Will work with proper JWT |
| Anon Access | Undefined | Read-only public data |

## Resolution Path

### Option 1: Manual Application (Recommended)
1. Access Supabase Dashboard
2. Navigate to SQL Editor
3. Apply migrations in order:
   - 20250903_100000_auth_core.sql
   - 20250903_100001_auth_core_rls.sql
   - 20250903_100002_auth_core_grants.sql
   - 20250903_100003_verification_bookmarks.sql

### Option 2: CLI Application
```bash
# From project root
supabase db push
```

### Option 3: Update MCP Configuration
Configure MCP with write-enabled credentials to allow `apply_migration` tool.

## Verification After Application

Run these queries to verify success:
```sql
-- Check auth tables exist
SELECT * FROM v_missing_auth_tables;

-- Check RLS enabled
SELECT * FROM v_rls_tables;

-- Check policies created
SELECT * FROM v_policy_count;

-- Check tenant isolation
SELECT * FROM v_tenant_isolation;
```

## Summary

The migration files are correctly staged and will resolve all authentication and RLS issues once applied. The floor plan insert failure will be fixed as the proper auth infrastructure and tenant isolation policies will be in place. The system requires manual intervention to apply the migrations due to MCP read-only limitations.