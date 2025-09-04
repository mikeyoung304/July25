# Runbook: Fix RLS Violations in Restaurant OS
Generated: 2025-09-03

## Problem Summary
Tables operations fail with "row violates row-level security policy" because:
1. All DB operations use service key client (bypasses RLS)
2. RLS policies require `auth.uid()` which is NULL with service key
3. User-scoped client exists but is never used

## Minimal Fix Plan

### Step 1: Apply User Client Middleware
**File**: `server/src/routes/tables.routes.ts`

Add import at top:
```typescript
import { attachUserClient } from '../config/database';
```

Add middleware after line 8:
```typescript
const router = Router();
const config = getConfig();

// Add this line:
router.use(attachUserClient);  // Creates req.userSupabase from Bearer token
```

### Step 2: Replace Service Client with User Client
**File**: `server/src/routes/tables.routes.ts`

Find and replace all instances:
- **FROM**: `supabase.from(`
- **TO**: `req.userSupabase.from(`

Affected functions (7 total):
1. `getTables` (line 31)
2. `getTable` (line 60)
3. `createTable` (line 107)
4. `updateTable` (line 166)
5. `deleteTable` (line 199)
6. `updateTableStatus` (line 237)
7. `batchUpdateTables` (line 331)

### Step 3: Type Safety Fix
**File**: `server/src/routes/tables.routes.ts`

Update the AuthenticatedRequest interface to include userSupabase:
```typescript
interface AuthenticatedRequest extends Request {
  user?: { /* existing */ };
  restaurantId?: string;
  userSupabase?: any;  // Add this line
}
```

### Step 4: Fix Demo/Kiosk Authentication
**Current Issue**: Demo tokens are local JWTs, not Supabase users

**Option A: Quick Fix (Demo Only)**
- Keep demo mode using service client
- Add conditional in `attachUserClient`:
```typescript
if (decoded.sub?.startsWith('demo:')) {
  req.userSupabase = supabaseAdmin; // Demo bypasses RLS
} else {
  req.userSupabase = createUserClient(token);
}
```

**Option B: Proper Fix (Production Ready)**
- Create real Supabase users for demo
- Use anonymous sign-in for kiosk sessions
- Return proper Supabase tokens

### Step 5: Verify Auth Tables Exist
Check if auth tables have been created:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_restaurants', 'user_profiles', 'user_pins');
```

If missing, apply migration:
```bash
supabase db push
```

### Step 6: Test the Fix

1. **Login as manager**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"[password]","restaurantId":"11111111-1111-1111-1111-111111111111"}'
```

2. **Save floor plan**:
```bash
curl -X PUT http://localhost:3001/api/v1/tables/batch \
  -H "Authorization: Bearer [token-from-login]" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"tables":[{"id":"[table-id]","x":100,"y":200}]}'
```

Expected: HTTP 200 with updated tables

## Rollback Plan
If issues arise:
1. Remove `router.use(attachUserClient)`
2. Revert `req.userSupabase` back to `supabase`
3. Temporarily disable RLS: `ALTER TABLE tables DISABLE ROW LEVEL SECURITY;`

## Monitoring
After deployment:
1. Check auth_logs table for failed authentications
2. Monitor for 42501 errors (RLS violations)
3. Verify restaurant_id is present in all writes

## Long-term Improvements
1. Add integration tests for RLS policies
2. Create separate service accounts for admin operations
3. Implement proper anonymous auth for kiosk mode
4. Add RLS policy testing in CI/CD pipeline