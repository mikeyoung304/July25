# Supabase RLS Staged Rollout Runbook
Generated: 2025-09-03

## Current State Summary

### 🔴 Critical Findings
1. **ALL auth tables missing** - RLS policies reference non-existent `user_restaurants`
2. **100% service key usage** - Every DB operation bypasses RLS
3. **Mixed auth types** - 3 work with RLS, 3 don't
4. **Immediate failure risk** - Enabling RLS will break everything

## Staged Rollout Plan

### 🚦 GATE 1: APPROVE: APPLY MIGRATIONS

**What This Does**:
- Creates 7 auth tables (user_restaurants, user_profiles, etc.)
- Populates default scopes and role mappings
- Enables RLS on auth tables themselves

**Command**:
```bash
# Verify connection
supabase link --project-ref xiwfhcikfdoshxwbtjxt

# Apply migration
supabase db push

# Or via SQL editor:
# Copy contents of supabase/migrations/20250903_auth_core.sql
```

**Verification**:
```sql
-- Run in Supabase SQL editor
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' 
AND table_name IN ('user_restaurants','user_profiles','user_pins');
-- Should return 3 rows
```

---

### 🚦 GATE 2: APPROVE: CHANGE CODE

**What This Does**:
- Adds user client middleware to routes
- Replaces service key with user-scoped clients
- Maintains backward compatibility

**Files to Change** (in order):
1. `server/src/middleware/auth.ts` - Add userSupabase to interface
2. `server/src/config/database.ts` - Export attachUserClient
3. `server/src/routes/tables.routes.ts` - Apply full patch
4. Test tables endpoint before continuing
5. Apply remaining patches as needed

**Patch Application**:
```bash
# Example for tables route
cd /Users/mikeyoung/CODING/rebuild-6.0
patch -p0 < docs/diffs/tables-user-client.patch
```

**Verification**:
```bash
# Test with RLS still disabled
curl -X GET http://localhost:3001/api/v1/tables \
  -H "Authorization: Bearer [your-token]" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
# Should still work
```

---

### 🚦 GATE 3: APPROVE: SEED DEV USERS

**What This Does**:
- Creates demo users in auth.users
- Populates user_restaurants with roles
- Sets up PIN codes for staff

**Script to Run**:
```typescript
// scripts/seed-dev-users.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seedDevUsers() {
  const restaurantId = '11111111-1111-1111-1111-111111111111';
  
  // Create demo owner
  const { data: owner } = await supabase.auth.admin.createUser({
    email: 'owner@demo.com',
    password: 'DemoPassword123!',
    email_confirm: true
  });
  
  // Assign role
  await supabase.from('user_restaurants').insert({
    user_id: owner.user.id,
    restaurant_id: restaurantId,
    role: 'owner',
    is_active: true
  });
  
  // Create server with PIN
  const { data: server } = await supabase.auth.admin.createUser({
    email: 'server1@demo.com',
    password: 'ServerPass123!',
    email_confirm: true
  });
  
  // Create PIN (would need hashing in production)
  await supabase.from('user_pins').insert({
    user_id: server.user.id,
    restaurant_id: restaurantId,
    pin_hash: '1234', // TODO: Hash this
    salt: 'demo-salt'
  });
  
  console.log('✅ Dev users created');
}

seedDevUsers();
```

---

## Testing Checkpoints

### After Migration (Gate 1)
```sql
-- Check tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name LIKE 'user_%';
-- Expected: >= 3
```

### After Code Changes (Gate 2)
```bash
# Test with token (should work)
curl -X PUT http://localhost:3001/api/v1/tables/batch \
  -H "Authorization: Bearer [token]" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"tables":[{"id":"test-id","x":100,"y":200}]}'
```

### After User Seeding (Gate 3)
```bash
# Test login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"DemoPassword123!","restaurantId":"11111111-1111-1111-1111-111111111111"}'
# Should return session token
```

## Rollback Procedures

### If Migration Fails
```sql
-- Only if necessary (DESTROYS DATA)
DROP TABLE IF EXISTS auth_logs CASCADE;
DROP TABLE IF EXISTS role_scopes CASCADE;
DROP TABLE IF EXISTS api_scopes CASCADE;
DROP TABLE IF EXISTS station_tokens CASCADE;
DROP TABLE IF EXISTS user_pins CASCADE;
DROP TABLE IF EXISTS user_restaurants CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
```

### If Code Changes Break
```bash
# Revert specific file
git checkout -- server/src/routes/tables.routes.ts

# Or restore backup
mv server/src/routes/tables.routes.ts.orig server/src/routes/tables.routes.ts
```

### Emergency RLS Disable
```sql
-- Break glass in emergency
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
-- Repeat for affected tables
```

## Monitoring During Rollout

### Watch for Errors
```bash
# Monitor server logs
tail -f server.log | grep -E "42501|RLS|violation"

# Check specific endpoint
curl -X GET http://localhost:3001/api/v1/health/db
```

### Database Metrics
```sql
-- Check active RLS policies
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check failed queries (if logging enabled)
SELECT query, error_severity, error_message
FROM postgres_log
WHERE error_message LIKE '%row-level security%'
ORDER BY log_time DESC
LIMIT 10;
```

## Success Criteria

- [ ] Auth tables created and populated
- [ ] Code uses user-scoped clients
- [ ] Owner/Manager can manage tables
- [ ] No 42501 errors in logs
- [ ] Audit trail shows user context

## Post-Rollout Tasks

1. **Fix Station Auth** (Kitchen/Expo)
2. **Fix Kiosk Auth** (Customer)
3. **Enable RLS on remaining tables**
4. **Remove service key from user routes**
5. **Add integration tests for RLS**

## Contacts

- **Your Consultant**: Available for SQL/RLS questions
- **Supabase Support**: For infrastructure issues
- **Team Lead**: For approval gates

---

**Remember**: Each gate requires explicit approval. Do not proceed without typing:
- `APPROVE: APPLY MIGRATIONS`
- `APPROVE: CHANGE CODE`
- `APPROVE: SEED DEV USERS`