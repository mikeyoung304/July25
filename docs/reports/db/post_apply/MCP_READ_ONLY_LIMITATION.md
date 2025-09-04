# MCP Read-Only Limitation Detected

**Date**: 2025-09-03  
**Issue**: Cannot apply migrations via MCP - read-only user detected

## Current State
- **User**: supabase_read_only_user
- **Database**: postgres
- **Superuser**: off
- **Permission Error**: "permission denied for schema public"

## Attempted Operations
1. ❌ `apply_migration` tool - Returns "Cannot apply migration in read-only mode"
2. ❌ Direct SQL execution - Returns "permission denied for schema public"

## Root Cause
The MCP Supabase server is configured with read-only credentials. This prevents:
- Creating new tables
- Altering existing tables
- Creating policies
- Granting permissions

## Required Actions
The migrations need to be applied through one of these methods:
1. **Supabase Dashboard**: Upload migration files via the SQL editor
2. **Supabase CLI**: Run `supabase db push` with proper credentials
3. **Direct psql**: Connect with write-enabled credentials

## Migration Files Ready for Manual Application
All 4 migration files have been created and are ready in `supabase/migrations/`:
- ✅ 20250903_100000_auth_core.sql
- ✅ 20250903_100001_auth_core_rls.sql  
- ✅ 20250903_100002_auth_core_grants.sql
- ✅ 20250903_100003_verification_bookmarks.sql

These are idempotent and safe to apply in order.