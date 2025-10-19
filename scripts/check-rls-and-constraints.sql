-- Query 1: Check if RLS is enabled on 'tables' table
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'tables';

-- Query 2: Check all RLS policies on 'tables' table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tables';

-- Query 3: Check all constraints on 'tables' table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::text
    END AS type_description,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.tables'::regclass
ORDER BY contype, conname;

-- Query 4: Check all indexes on 'tables' table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tables'
ORDER BY indexname;

-- Query 5: Check for duplicate labels (normalized, active tables only)
SELECT
    LOWER(TRIM(label)) as normalized_label,
    COUNT(*) as count,
    ARRAY_AGG(label ORDER BY label) as original_labels,
    ARRAY_AGG(id::text ORDER BY label) as table_ids,
    ARRAY_AGG(active ORDER BY label) as active_status
FROM tables
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'
GROUP BY LOWER(TRIM(label))
HAVING COUNT(*) > 1;

-- Query 6: Check for active/inactive conflicts
SELECT
    a.label as active_label,
    a.id as active_id,
    i.label as inactive_label,
    i.id as inactive_id,
    LOWER(TRIM(a.label)) as normalized
FROM tables a
JOIN tables i ON
    a.restaurant_id = i.restaurant_id
    AND LOWER(TRIM(a.label)) = LOWER(TRIM(i.label))
    AND a.active = true
    AND i.active = false
WHERE a.restaurant_id = '11111111-1111-1111-1111-111111111111';
