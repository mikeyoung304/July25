-- Migration: Fix Duplicate Table Labels Issue
-- Date: 2025-10-18
-- Purpose: Allow active tables to reuse names from soft-deleted tables
-- Issue: Admin floor plan creator blocks saves when inactive tables have same normalized name

-- Description:
--   Currently, duplicate table name errors occur even when all visible tables have unique names.
--   This happens because soft-deleted (active=false) tables still occupy their label in the
--   UNIQUE constraint, blocking new active tables from using that name.

-- Solution:
--   Use a partial unique index that only applies to active tables and normalizes the label
--   (case-insensitive, trimmed whitespace) for proper uniqueness validation.

-- Step 1: Remove any existing problematic unique constraints
-- (These may or may not exist depending on schema history)
DO $$
BEGIN
    -- Drop old-style unique constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_table_label'
        AND conrelid = 'tables'::regclass
    ) THEN
        ALTER TABLE tables DROP CONSTRAINT unique_table_label;
        RAISE NOTICE 'Dropped constraint: unique_table_label';
    END IF;

    -- Drop auto-generated unique constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tables_restaurant_id_label_key'
        AND conrelid = 'tables'::regclass
    ) THEN
        ALTER TABLE tables DROP CONSTRAINT tables_restaurant_id_label_key;
        RAISE NOTICE 'Dropped constraint: tables_restaurant_id_label_key';
    END IF;

    -- Drop old partial index if exists (in case this migration runs twice)
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'unique_active_table_labels'
        AND tablename = 'tables'
    ) THEN
        DROP INDEX unique_active_table_labels;
        RAISE NOTICE 'Dropped index: unique_active_table_labels';
    END IF;
END $$;

-- Step 2: Create the correct partial unique index
-- This index:
--   - Only applies to active tables (WHERE active = true)
--   - Normalizes labels (LOWER(TRIM(label))) for case-insensitive uniqueness
--   - Scopes to restaurant_id for multi-tenancy
CREATE UNIQUE INDEX unique_active_table_labels
ON tables(restaurant_id, LOWER(TRIM(label)))
WHERE active = true;

-- Step 3: Add helpful comment
COMMENT ON INDEX unique_active_table_labels IS
'Ensures table labels are unique per restaurant among active tables only.
Allows soft-deleted (active=false) tables to have the same normalized name as active tables.
Uses LOWER(TRIM(label)) for case-insensitive comparison.
Created: 2025-10-18';

-- Verification query (can be run after migration)
-- SELECT
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE tablename = 'tables'
--   AND indexname = 'unique_active_table_labels';

-- Test cases:
-- 1. ✅ Can create active table "Test-E2"
-- 2. ✅ Can soft-delete "Test-E2" (set active=false)
-- 3. ✅ Can create new active table "Test-E2" (reusing name from deleted table)
-- 4. ✅ Can create new active table "test-e2" (different case, still blocked - correct!)
-- 5. ❌ CANNOT create two active tables with same normalized name (e.g., "Table 1" and "table 1")
