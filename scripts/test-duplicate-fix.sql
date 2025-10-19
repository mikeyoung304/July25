-- Test Suite: Duplicate Table Labels Fix
-- Tests the partial unique index and behavior

-- Setup: Use test restaurant
SET search_path TO public;

-- Test 1: Verify unique index exists
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tables'
  AND indexname = 'unique_active_table_labels';
-- Expected: 1 row with the unique index definition

-- Test 2: Create a test table
INSERT INTO tables (
    id,
    restaurant_id,
    label,
    x_pos,
    y_pos,
    shape,
    seats,
    rotation,
    z_index,
    width,
    height,
    status,
    active
) VALUES (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'Test Unique Table',
    100,
    100,
    'square',
    4,
    0,
    1,
    120,
    120,
    'available',
    true
) RETURNING id, label, active;
-- Expected: SUCCESS with new UUID

-- Test 3: Try to create duplicate (should FAIL)
DO $$
BEGIN
    INSERT INTO tables (
        id,
        restaurant_id,
        label,
        x_pos,
        y_pos,
        shape,
        seats,
        rotation,
        z_index,
        width,
        height,
        status,
        active
    ) VALUES (
        gen_random_uuid(),
        '11111111-1111-1111-1111-111111111111',
        'Test Unique Table',  -- Exact duplicate
        200,
        200,
        'circle',
        4,
        0,
        1,
        120,
        120,
        'available',
        true
    );
    RAISE EXCEPTION 'TEST FAILED: Duplicate was allowed!';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'TEST PASSED: Duplicate correctly blocked (exact match)';
END $$;

-- Test 4: Try to create case-insensitive duplicate (should FAIL)
DO $$
BEGIN
    INSERT INTO tables (
        id,
        restaurant_id,
        label,
        x_pos,
        y_pos,
        shape,
        seats,
        rotation,
        z_index,
        width,
        height,
        status,
        active
    ) VALUES (
        gen_random_uuid(),
        '11111111-1111-1111-1111-111111111111',
        'test unique table',  -- Different case
        200,
        200,
        'circle',
        4,
        0,
        1,
        120,
        120,
        'available',
        true
    );
    RAISE EXCEPTION 'TEST FAILED: Case-insensitive duplicate was allowed!';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'TEST PASSED: Case-insensitive duplicate correctly blocked';
END $$;

-- Test 5: Soft-delete the table, then reuse the name (should SUCCEED)
WITH deleted_table AS (
    UPDATE tables
    SET active = false
    WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'
      AND LOWER(TRIM(label)) = 'test unique table'
      AND active = true
    RETURNING id, label
)
INSERT INTO tables (
    id,
    restaurant_id,
    label,
    x_pos,
    y_pos,
    shape,
    seats,
    rotation,
    z_index,
    width,
    height,
    status,
    active
) VALUES (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'Test Unique Table',  -- Reusing name from soft-deleted table
    300,
    300,
    'rectangle',
    6,
    0,
    1,
    180,
    100,
    'available',
    true
) RETURNING id, label, active;
-- Expected: SUCCESS - name reuse from soft-deleted table is allowed

-- Test 6: Verify final state
SELECT
    label,
    active,
    id
FROM tables
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'
  AND LOWER(TRIM(label)) = 'test unique table'
ORDER BY active DESC, created_at;
-- Expected: 2 rows - 1 active (latest), 1 inactive (soft-deleted)

-- Cleanup
DELETE FROM tables
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'
  AND LOWER(TRIM(label)) = 'test unique table';

SELECT 'All tests completed successfully!' as status;
