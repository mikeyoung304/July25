# Auth Tables Migration Notes
Generated: 2025-09-03

## Migration File
`supabase/migrations/20250903_auth_core.sql`

## Tables Created

### 1. user_profiles
- **Purpose**: Extended user information beyond auth.users
- **Foreign Key**: user_id → auth.users(id) CASCADE DELETE
- **RLS**: Users can view/edit their own profile only

### 2. user_restaurants (CRITICAL)
- **Purpose**: Maps users to restaurants with roles
- **Required by**: ALL RLS policies reference this table
- **Unique Constraint**: (user_id, restaurant_id)
- **Index**: idx_user_restaurants_lookup for RLS performance
- **RLS**: Users can view their own associations

### 3. user_pins
- **Purpose**: PIN authentication for service staff
- **Foreign Key**: user_id → auth.users(id) CASCADE DELETE
- **Security**: Stores hash + salt, never plain PIN
- **RLS**: Users can view their own PIN record

### 4. station_tokens
- **Purpose**: Authentication for kitchen/expo displays
- **Problem**: These aren't real Supabase users
- **Solution Needed**: Convert to service accounts or anonymous auth

### 5. api_scopes
- **Purpose**: Define available API permissions
- **Populated**: 15 default scopes (orders, payments, menu, etc.)

### 6. role_scopes
- **Purpose**: Map roles to their allowed scopes
- **Populated**: Complete mappings for all 6 roles

### 7. auth_logs
- **Purpose**: Audit trail for authentication events
- **Indexes**: By user_id and restaurant_id for performance
- **RLS**: Anyone authenticated can insert (for logging)

## Migration Safety

- **Idempotent**: All CREATE TABLE uses IF NOT EXISTS
- **No Data Loss**: Only creates, never drops
- **Conflict Handling**: INSERT uses ON CONFLICT DO NOTHING
- **Verification**: Final check ensures all tables exist

## Dependencies

### Required Before This Migration
- Supabase Auth enabled (auth.users table exists)
- UUID extension enabled (for gen_random_uuid())

### Required After This Migration
- Apply RLS policies migration (references user_restaurants)
- Create demo users in auth.users
- Populate user_restaurants for existing users

## Application Order

1. **First**: Apply this migration to create tables
2. **Second**: Create users in auth.users (if not exist)
3. **Third**: Populate user_restaurants with user-role mappings
4. **Fourth**: Apply RLS policies migration
5. **Last**: Enable user-scoped clients in code

## Rollback Plan

If migration fails:
```sql
-- Only if absolutely necessary (WILL DELETE DATA)
DROP TABLE IF EXISTS auth_logs CASCADE;
DROP TABLE IF EXISTS role_scopes CASCADE;
DROP TABLE IF EXISTS api_scopes CASCADE;
DROP TABLE IF EXISTS station_tokens CASCADE;
DROP TABLE IF EXISTS user_pins CASCADE;
DROP TABLE IF EXISTS user_restaurants CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
```

## Known Issues

### Station Authentication
Station tokens table exists but stations aren't Supabase users. Options:
1. Create service accounts in auth.users for each station
2. Use Supabase anonymous auth with custom claims
3. Keep stations using service key (security risk)

### Demo/Kiosk Users
No provision for demo users in this migration. Need separate solution:
1. Create temporary auth.users entries
2. Use anonymous auth
3. Proxy pattern with service key

## Testing After Migration

```sql
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_restaurants','user_profiles','user_pins',
                  'station_tokens','api_scopes','role_scopes','auth_logs')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_restaurants','user_profiles','user_pins','auth_logs');

-- Verify policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_restaurants','user_profiles','user_pins','auth_logs');
```