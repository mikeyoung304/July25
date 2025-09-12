SELECT
  n.nspname           AS schema,
  c.relname           AS table_name,
  c.relrowsecurity    AS rls_enabled,
  c.relforcerowsecurity AS rls_force
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY 1,2;