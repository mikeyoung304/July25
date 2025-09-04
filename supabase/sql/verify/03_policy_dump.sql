-- dump policies for key tables we care about right now
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  p.polname AS policy_name,
  p.polcmd  AS command,
  pg_get_expr(p.polqual, p.polrelid) AS using_clause,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
FROM pg_policy p
JOIN pg_class  c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'tables',
    'orders',
    'menu_items',
    'restaurants',
    'user_profiles',
    'user_restaurants',
    'user_pins'
  )
ORDER BY c.relname, p.polname;