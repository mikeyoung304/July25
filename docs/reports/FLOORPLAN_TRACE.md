# Floor Plan Save Trace
Generated: 2025-09-03

## Client-Side Trace

### 1. User Action
**File**: `client/src/modules/floor-plan/components/FloorPlanEditor.tsx`
- User clicks "Save" button
- Triggers `handleSave()` function (line ~620)

### 2. Data Preparation
```typescript
// Line 630-639: Clean existing tables
const cleanExistingTables = existingTables.map(table => ({
  id: table.id,
  x: table.x,
  y: table.y,
  // ... other fields
}))

// Line 641: Call service
const updatedTables = await tableService.batchUpdateTables(cleanExistingTables)
```

### 3. HTTP Request
**File**: `client/src/services/tables/TableService.ts:82-87`
```typescript
async batchUpdateTables(tables: Partial<Table>[]): Promise<Table[]> {
  const response = await api.put<Table[]>('/api/v1/tables/batch', 
    { tables },  // Request body
    { headers: this.getHeaders() }  // Headers
  )
}
```

### 4. Headers Sent
```http
PUT /api/v1/tables/batch HTTP/1.1
Authorization: Bearer <supabase-or-demo-token>
X-Restaurant-ID: 11111111-1111-1111-1111-111111111111
X-CSRF-Token: <csrf-token>
Content-Type: application/json

{
  "tables": [
    {
      "id": "uuid-here",
      "x": 100,
      "y": 200,
      "type": "rectangle",
      ...
    }
  ]
}
```

## Server-Side Trace

### 1. Route Handler
**File**: `server/src/routes/tables.routes.ts:269`

```typescript
export const batchUpdateTables = async (req, res, next) => {
  const restaurantId = req.headers['x-restaurant-id'] // Line 271
  const { tables } = req.body // Line 283
```

### 2. Data Transformation
```typescript
// Lines 305-337: For each table
tables.map((table) => {
  // Lines 311-323: Transform frontend -> DB columns
  if ('x' in updates) {
    dbUpdates.x_pos = updates.x
    delete dbUpdates.x
  }
  // Similar for y -> y_pos, type -> shape
  
  // Lines 331-337: DATABASE UPDATE (CRITICAL)
  return supabase  // <-- SERVICE KEY CLIENT!
    .from('tables')
    .update(dbUpdates)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()
})
```

### 3. Database Client Used
**CRITICAL ISSUE at Line 331**:
```typescript
supabase  // This is the SERVICE KEY client from line 3:
// import { supabase } from '../config/database'
```

This client:
- Uses `SUPABASE_SERVICE_KEY`
- **Bypasses ALL Row Level Security**
- Has no user context (`auth.uid()` is null)
- Acts as database superuser

### 4. RLS Policy Check (FAILS)
**File**: `supabase/migrations/20250903_rls_policies.sql:44-65`

```sql
CREATE POLICY "Staff can update tables" ON tables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()  -- NULL when using service key!
      AND ur.restaurant_id = tables.restaurant_id
      AND ur.is_active = true
      -- Additional role checks...
    )
  )
```

**Result**: `auth.uid()` returns NULL → Policy fails → RLS violation

## Error Response Path

### When RLS is Enabled:
```
Supabase returns:
{
  error: {
    code: "42501",
    message: "new row violates row-level security policy for table \"tables\"",
    details: null,
    hint: null
  }
}
```

### Server Error Handling:
```typescript
// Line 346-367: Error handling
if (errors.length > 0) {
  return res.status(400).json({ 
    error: 'Some updates failed', 
    details: errors.map(err => ({
      code: err.error?.code,  // "42501"
      message: err.error?.message  // RLS violation message
    }))
  })
}
```

### Client Receives:
```json
{
  "error": "Some updates failed",
  "details": [{
    "code": "42501",
    "message": "new row violates row-level security policy..."
  }]
}
```

## Summary

1. **Token Present**: ✅ Client sends valid Bearer token
2. **Restaurant ID Present**: ✅ X-Restaurant-ID header included
3. **Auth Middleware Runs**: ✅ Token verified, user set
4. **Wrong DB Client**: ❌ Uses service key instead of user client
5. **RLS Check Fails**: ❌ No user context for policy evaluation
6. **Error Returned**: HTTP 400 with RLS violation details

## Fix Required

Replace line 331 in `tables.routes.ts`:
```typescript
// WRONG (current):
supabase.from('tables').update(...)

// CORRECT (needed):
req.userSupabase.from('tables').update(...)
```

But first need to:
1. Add `attachUserClient` middleware to route setup
2. Ensure `req.userSupabase` is available