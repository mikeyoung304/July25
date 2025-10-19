-- Diagnostic Query: Find Duplicate Table Names Issue
-- Purpose: Identify why duplicate table name errors occur even when UI shows unique names
-- Date: 2025-10-18

-- 1. Show actual table schema
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tables'
ORDER BY ordinal_position;

-- 2. Show all constraints on tables table
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    pg_get_constraintdef(pgc.oid) as constraint_definition
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN pg_constraint pgc
    ON tc.constraint_name = pgc.conname
WHERE tc.table_name = 'tables'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Check for duplicate labels (case-insensitive, all tables including inactive)
SELECT
    LOWER(TRIM(label)) as normalized_label,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as table_ids,
    STRING_AGG(CONCAT(label, ' (active:', active::text, ')'), ' | ') as labels_with_status
FROM tables
GROUP BY LOWER(TRIM(label))
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 4. Show all tables with their normalized names
SELECT
    id,
    label,
    LOWER(TRIM(label)) as normalized_label,
    active,
    restaurant_id,
    created_at
FROM tables
ORDER BY LOWER(TRIM(label)), active DESC, created_at;

-- 5. Check for tables with same normalized name but different active status
SELECT
    LOWER(TRIM(t1.label)) as normalized_label,
    t1.id as active_table_id,
    t1.label as active_label,
    t2.id as inactive_table_id,
    t2.label as inactive_label
FROM tables t1
JOIN tables t2 ON LOWER(TRIM(t1.label)) = LOWER(TRIM(t2.label))
WHERE t1.active = true
  AND t2.active = false
  AND t1.id != t2.id
ORDER BY normalized_label;
