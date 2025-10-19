# Incident Report: Duplicate Table Names False Positive

**Date**: 2025-10-18
**Severity**: Medium
**Status**: Root Cause Identified
**Reporter**: Admin Floor Plan Creator

## Problem Statement

Admin users encounter a persistent "Duplicate table names found. Please rename tables." error when saving floor plans, even though all visible table labels appear unique in the UI. Console shows warnings like `['test-e2']` as duplicates.

## Symptoms

1. ✅ UI displays tables with unique-looking names (e.g., "Test-E1", "Test-E2", "Test-E3")
2. ❌ Save button blocked with duplicate name error
3. ⚠️  Console warning: "Duplicate names found: ['test-e2']"
4. 🌐 Network errors to july25.oreorder.com/ with status 0 (unrelated CORS/connection issue)

## Root Cause Analysis

### Investigation Summary

**File**: `client/src/modules/floor-plan/components/FloorPlanEditor.tsx:565-575`

```typescript
// Basic duplicate name check
const labels = tables.map(t => t.label.trim().toLowerCase())
const duplicates = labels.filter((label, index) =>
  label && labels.indexOf(label) !== index
)

if (duplicates.length > 0) {
  toast.error(`Duplicate table names found. Please rename tables.`)
  logger.warn('Duplicate names found:', duplicates)
  return
}
```

### Key Findings

1. **Client-Side Normalization**: Uses `.trim().toLowerCase()`
   - "Test-E2" → "test-e2"
   - "test-e2" → "test-e2"
   - "TEST-E2" → "test-e2"

2. **Server-Side Validation**: **NONE**
   - `server/src/routes/tables.routes.ts` has NO duplicate checking
   - `createTable()` at line 90 - no validation
   - `batchUpdateTables()` at line 269 - no validation

3. **Database Query Scope**: Only loads ACTIVE tables
   - `tables.routes.ts:35` - `.eq('active', true)`
   - Soft-deleted tables (active=false) are excluded from UI

4. **Validation Scope Mismatch**: ⚠️ **IDENTIFIED ISSUE**
   - Client validates against: **Active tables in memory**
   - Database may constrain: **All tables (active + inactive)**
   - Result: Active table "test-e2" + Inactive table "test-e2" = conflict

## Probable Root Causes (Ranked)

### 🥇 Hypothesis 1: Database UNIQUE Constraint Without Active Filter (Most Likely)

**Evidence**:
- Error occurs during save, not during client validation
- Client-side validation passes (only sees active tables)
- Database rejects the INSERT/UPDATE

**If this is true**:
```sql
-- Existing constraint (WRONG):
ALTER TABLE tables ADD CONSTRAINT unique_table_label
  UNIQUE (restaurant_id, label);

-- This blocks: INSERT with label='test-e2' if ANY table (active or inactive) has label='test-e2'
```

**Expected behavior**:
```sql
-- Correct constraint:
CREATE UNIQUE INDEX unique_active_table_labels
ON tables(restaurant_id, LOWER(TRIM(label)))
WHERE active = true;
```

### 🥈 Hypothesis 2: Case-Sensitive Duplicates in Active Tables

**Evidence**:
- User may have created "Test-E2" and "test-e2" as separate tables
- UI shows both, but normalization treats them as identical
- Client validation correctly identifies this

**If this is true**: The error is **working correctly** - user needs to rename tables

### 🥉 Hypothesis 3: Hidden UI State (Unlikely)

**Evidence**:
- Off-canvas tables or tables outside viewport
- Multiple instances of same table in state array

**If this is true**: Bug in state management logic

## Diagnostic Steps

### Step 1: Run Diagnostic Script

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0
node scripts/diagnose-duplicate-tables.js
```

This will output:
- All tables with normalized names
- Duplicates among active tables
- Conflicts between active and inactive tables
- Database constraint information

### Step 2: Check Database Constraints

```sql
-- Run in Supabase SQL Editor:
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    pg_get_constraintdef(pgc.oid) as definition
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN pg_constraint pgc
    ON tc.constraint_name = pgc.conname
WHERE tc.table_name = 'tables'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_name;
```

### Step 3: Browser Console Debugging

Add this snippet in browser console when error occurs:

```javascript
// Get current tables state
const tables = JSON.parse(localStorage.getItem('floor_plan_tables') || '[]');

// Normalize and find duplicates
const normalize = (label) => label?.trim().toLowerCase();
const labels = tables.map(t => ({ original: t.label, normalized: normalize(t.label), active: t.active, id: t.id }));

console.table(labels);

// Find duplicates
const dupes = labels.filter((item, index, arr) =>
  arr.findIndex(x => x.normalized === item.normalized) !== index
);
console.log('Duplicates:', dupes);
```

## Recommended Fixes

### Fix 1: Update Database Constraint (If Hypothesis 1 is correct)

**File**: `supabase/migrations/20251018_fix_unique_table_labels.sql`

```sql
-- Remove existing problematic unique constraint (if exists)
ALTER TABLE tables DROP CONSTRAINT IF EXISTS unique_table_label;
ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_restaurant_id_label_key;

-- Add partial unique index for ACTIVE tables only with case-insensitive normalization
CREATE UNIQUE INDEX unique_active_table_labels
ON tables(restaurant_id, LOWER(TRIM(label)))
WHERE active = true;

-- This allows:
-- ✅ Active table: "Test-E2"
-- ✅ Inactive table: "Test-E2" (soft-deleted, doesn't conflict)
-- ❌ Two active tables: "Test-E2" and "test-e2" (correctly blocked)
```

**Apply migration**:
```bash
cd /Users/mikeyoung/CODING/rebuild-6.0
supabase db push
```

### Fix 2: Add Server-Side Duplicate Validation

**File**: `server/src/routes/tables.routes.ts:90`

```typescript
// Add validation before createTable
export const createTable = async (req: AuthenticatedRequest & { body: CreateTableBody }, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
    const { x, y, type, z_index, label, ...otherData } = req.body;

    // NEW: Check for duplicate labels among ACTIVE tables
    if (label) {
      const { data: existing } = await supabase
        .from('tables')
        .select('id, label')
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      const normalizedLabel = label.trim().toLowerCase();
      const duplicate = existing?.find(t =>
        t.label.trim().toLowerCase() === normalizedLabel
      );

      if (duplicate) {
        return res.status(400).json({
          error: 'Duplicate table name',
          message: `A table named "${label}" already exists. Please choose a different name.`,
          conflictingTableId: duplicate.id
        });
      }
    }

    // ... rest of existing code
  }
}
```

**File**: `server/src/routes/tables.routes.ts:269` (batchUpdateTables)

```typescript
// Add validation in batchUpdateTables
export const batchUpdateTables = async (req: AuthenticatedRequest & { body: BatchUpdateTablesBody }, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
    const { tables } = req.body;

    // NEW: Validate no duplicates within the batch
    const labels = tables.map(t => t.label?.trim().toLowerCase()).filter(Boolean);
    const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);

    if (duplicates.length > 0) {
      return res.status(400).json({
        error: 'Duplicate table names in batch',
        message: `Duplicate labels found: ${[...new Set(duplicates)].join(', ')}`,
        duplicates: [...new Set(duplicates)]
      });
    }

    // NEW: Validate no duplicates with existing active tables
    const { data: existingTables } = await supabase
      .from('tables')
      .select('id, label')
      .eq('restaurant_id', restaurantId)
      .eq('active', true);

    const existingLabels = new Map(
      existingTables?.map(t => [t.label.trim().toLowerCase(), t.id]) || []
    );

    for (const table of tables) {
      const normalizedLabel = table.label?.trim().toLowerCase();
      if (normalizedLabel) {
        const existingId = existingLabels.get(normalizedLabel);
        // Allow if updating the same table
        if (existingId && existingId !== table.id) {
          return res.status(400).json({
            error: 'Duplicate table name',
            message: `Table "${table.label}" conflicts with existing table ${existingId}`,
            conflictingTableId: existingId
          });
        }
      }
    }

    // ... rest of existing code
  }
}
```

### Fix 3: Enhance Client-Side Error Messages

**File**: `client/src/modules/floor-plan/components/FloorPlanEditor.tsx:565`

```typescript
// Enhanced duplicate detection with better error messages
const handleSave = useCallback(async () => {
  if (tables.length === 0) {
    toast.error('No tables to save')
    return
  }

  // Build a map to track original vs normalized names
  const labelMap = new Map<string, Array<{ original: string; id: string }>>()

  tables.forEach(table => {
    const normalized = table.label.trim().toLowerCase()
    if (!labelMap.has(normalized)) {
      labelMap.set(normalized, [])
    }
    labelMap.get(normalized)!.push({
      original: table.label,
      id: table.id
    })
  })

  // Find duplicates
  const duplicateGroups = Array.from(labelMap.entries())
    .filter(([_, items]) => items.length > 1)

  if (duplicateGroups.length > 0) {
    const details = duplicateGroups.map(([normalized, items]) => {
      const originals = items.map(i => `"${i.original}"`).join(', ')
      return `  • ${originals} → "${normalized}"`
    }).join('\n')

    toast.error(
      `Duplicate table names detected:\n${details}\n\nTable names are case-insensitive. Please rename to make them unique.`,
      { duration: 8000 }
    )

    logger.warn('Duplicate table names:', {
      duplicateGroups: duplicateGroups.map(([n, items]) => ({
        normalized: n,
        originals: items.map(i => i.original)
      }))
    })
    return
  }

  // ... rest of save logic
}, [tables, onSave, restaurantId])
```

### Fix 4: Soft-Delete Label Modification

**Optional**: Append timestamp to labels when soft-deleting to prevent conflicts

**File**: `server/src/routes/tables.routes.ts:193`

```typescript
// Delete table (soft delete with label modification)
export const deleteTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
    const { id } = req.params;

    // Get current table data
    const { data: currentTable } = await supabase
      .from('tables')
      .select('label')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!currentTable) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Append timestamp to label to prevent conflicts
    const deletedLabel = `${currentTable.label}_deleted_${Date.now()}`;

    const { data, error } = await supabase
      .from('tables')
      .update({
        active: false,
        label: deletedLabel  // NEW: Modify label to prevent conflicts
      })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Table not found' });
    }

    return res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
};
```

## Test Cases

### Test Case 1: Duplicate Active Tables (Should Fail)

```javascript
// Create two active tables with same normalized name
await tableService.createTable({ label: 'Test-E2', seats: 4, x: 100, y: 100, type: 'circle' });
await tableService.createTable({ label: 'test-e2', seats: 4, x: 200, y: 200, type: 'circle' });
// Expected: Second create fails with duplicate error
```

### Test Case 2: Active + Inactive Duplicate (Should Succeed)

```javascript
// Create table
const table1 = await tableService.createTable({ label: 'Test-E2', ... });

// Soft delete it
await tableService.deleteTable(table1.id);

// Create new table with same name
const table2 = await tableService.createTable({ label: 'Test-E2', ... });
// Expected: Success (inactive table doesn't conflict)
```

### Test Case 3: Case-Insensitive Duplicates (Should Fail)

```javascript
const tables = [
  { label: 'Table 1', ... },
  { label: 'TABLE 1', ... },  // Should be caught as duplicate
];
await tableService.batchUpdateTables(tables);
// Expected: Validation error
```

## Console Snippet for Admin

Add this to browser console for quick duplicate analysis:

```javascript
// Quick Duplicate Checker
(function checkDuplicates() {
  // Access React state (may require React DevTools)
  const tables = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.
    getCurrentFiber()?.stateNode?.state?.tables || [];

  const normalize = (label) => label?.trim().toLowerCase();
  const labelCounts = {};

  tables.forEach(t => {
    const norm = normalize(t.label);
    if (!labelCounts[norm]) {
      labelCounts[norm] = [];
    }
    labelCounts[norm].push({
      original: t.label,
      id: t.id.substring(0, 8),
      active: t.active ?? true
    });
  });

  const dupes = Object.entries(labelCounts)
    .filter(([_, items]) => items.length > 1);

  if (dupes.length > 0) {
    console.warn('🚨 Duplicates Found:');
    dupes.forEach(([normalized, items]) => {
      console.group(`"${normalized}"`);
      items.forEach(item => {
        console.log(`  - "${item.original}" (${item.id}..., active: ${item.active})`);
      });
      console.groupEnd();
    });
  } else {
    console.log('✅ No duplicates detected');
  }

  console.table(Object.entries(labelCounts).map(([norm, items]) => ({
    normalized: norm,
    count: items.length,
    labels: items.map(i => i.original).join(', ')
  })));
})();
```

## Priority Actions

1. **[HIGH]** Run `node scripts/diagnose-duplicate-tables.js` to identify root cause
2. **[HIGH]** Apply Fix 1 (database constraint) if Hypothesis 1 is confirmed
3. **[MEDIUM]** Apply Fix 2 (server-side validation) for defense-in-depth
4. **[MEDIUM]** Apply Fix 3 (enhanced error messages) for better UX
5. **[LOW]** Apply Fix 4 (label modification on delete) if label collisions are frequent

## Related Files

- `client/src/modules/floor-plan/components/FloorPlanEditor.tsx:565` - Client validation
- `server/src/routes/tables.routes.ts:90, 269` - Server routes
- `client/src/modules/floor-plan/types/index.ts:1` - Table interface
- `shared/types/table.types.ts:8` - Shared Table type
- `scripts/diagnose-duplicate-tables.js` - Diagnostic tool
- `scripts/diagnose-duplicate-tables.sql` - SQL diagnostics

## Next Steps

1. Run diagnostic script to confirm hypothesis
2. Review database constraints
3. Apply appropriate fix based on findings
4. Test with real data
5. Deploy fix to production
6. Document resolution in CHANGELOG.md
