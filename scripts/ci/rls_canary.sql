-- RLS Canary Check
-- Fails the build if any critical RLS issues are found

DO $$
DECLARE
  jwt_claim_count INT;
  force_rls_missing INT;
  critical_tables TEXT[] := ARRAY[
    'tables', 'orders', 'order_status_history', 
    'menu_items', 'menu_categories', 'restaurants',
    'user_profiles', 'user_restaurants', 'user_pins', 'station_tokens'
  ];
  missing_tables TEXT := '';
BEGIN
  -- Check 1: No policies should use JWT custom claims
  SELECT COUNT(*)
  INTO jwt_claim_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      qual LIKE '%request.jwt.claims%'
      OR with_check LIKE '%request.jwt.claims%'
      OR qual LIKE '%auth.jwt() ->> ''restaurant_id''%'
      OR with_check LIKE '%auth.jwt() ->> ''restaurant_id''%'
    );
    
  IF jwt_claim_count > 0 THEN
    RAISE EXCEPTION 'CANARY FAILED: Found % policies using JWT custom claims', jwt_claim_count;
  END IF;
  
  -- Check 2: All critical tables must have FORCE RLS
  SELECT COUNT(*)
  INTO force_rls_missing
  FROM unnest(critical_tables) AS t(table_name)
  LEFT JOIN pg_class c ON c.relname = t.table_name
  LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
  WHERE c.relforcerowsecurity IS NOT TRUE OR c.relforcerowsecurity IS NULL;
  
  IF force_rls_missing > 0 THEN
    SELECT string_agg(t.table_name, ', ')
    INTO missing_tables
    FROM unnest(critical_tables) AS t(table_name)
    LEFT JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = 'public'
    WHERE c.relforcerowsecurity IS NOT TRUE OR c.relforcerowsecurity IS NULL;
    
    RAISE EXCEPTION 'CANARY FAILED: % tables missing FORCE RLS: %', force_rls_missing, missing_tables;
  END IF;
  
  -- Check 3: Membership function must exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_member_of_restaurant'
  ) THEN
    RAISE EXCEPTION 'CANARY FAILED: is_member_of_restaurant() function missing';
  END IF;
  
  RAISE NOTICE 'RLS CANARY PASSED: All checks successful';
END $$;