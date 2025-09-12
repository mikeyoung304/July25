-- quick visibility into grants + who owns what; helpful for diagnosing "new row violates RLS"
-- table owners
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  pg_catalog.pg_get_userbyid(c.relowner) AS owner,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind='r'
ORDER BY 1,2;

-- privileges (who can SELECT/INSERT/UPDATE/DELETE)
SELECT
  table_schema,
  table_name,
  privilege_type,
  grantee
FROM information_schema.role_table_grants
WHERE table_schema='public'
ORDER BY table_name, privilege_type, grantee;