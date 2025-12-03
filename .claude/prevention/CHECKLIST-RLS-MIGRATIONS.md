# RLS Migration Prevention Checklist

**Purpose:** Prevent incomplete RLS implementations that leave tables exposed to cross-tenant access.

**Context:** PR #151 discovered that comprehensive RLS migrations may miss tables. Early fixes are essential because unfound issues compound over time.

---

## Pre-Migration Audit

- [ ] Query database for all tables with `restaurant_id` or tenant isolation column:
  ```sql
  -- Find all tables that should have multi-tenant RLS
  SELECT tablename FROM pg_tables
  WHERE tablename LIKE '%restaurant%'
  OR tablename LIKE '%tenant%'
  ORDER BY tablename;
  ```

- [ ] Cross-reference against `shared/types/` to identify new multi-tenant entities

- [ ] Search migrations history: `grep -r "CREATE TABLE" supabase/migrations/` to find tables added since last RLS audit

- [ ] For each table, verify if it currently has RLS:
  ```sql
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables WHERE schemaname = 'public'
  ORDER BY tablename;
  ```

---

## Migration File Structure

- [ ] Create dedicated migration file: `supabase/migrations/YYYYMMDD_[descriptor]_rls.sql`

- [ ] Include header comment block documenting:
  - What tables are covered
  - What tables (if any) are intentionally excluded and why
  - Reference to related TODOs/PRs

- [ ] Use consistent policy naming: `{operation}_{table_name}`
  - Examples: `tenant_select_orders`, `service_role_audit_logs`

- [ ] Group policies per table with clear section headers

---

## SELECT Policy Requirements

- [ ] SELECT policy includes `IS NOT NULL` check for nullable tenant columns
  ```sql
  -- CORRECT for nullable columns
  FOR SELECT USING (
    restaurant_id IS NOT NULL
    AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
  )

  -- CORRECT for NOT NULL columns
  FOR SELECT USING (
    restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
  )
  ```

- [ ] Verify JWT claim name matches your auth setup: `'restaurant_id'` vs `'tenant_id'` vs others

- [ ] Test that service_role can still query without restriction: `SELECT * FROM table_with_rls;`

---

## INSERT/UPDATE/DELETE Policy Symmetry

- [ ] INSERT policy matches SELECT policy restrictions (especially `IS NOT NULL` for nullable columns)
  ```sql
  -- CORRECT: INSERT mirrors SELECT
  FOR SELECT USING (restaurant_id IS NOT NULL AND restaurant_id = ...)
  FOR INSERT WITH CHECK (restaurant_id IS NOT NULL AND restaurant_id = ...)

  -- WRONG: Asymmetry allows orphaned data
  FOR SELECT USING (restaurant_id IS NOT NULL AND restaurant_id = ...)
  FOR INSERT WITH CHECK (restaurant_id = ...) -- Missing IS NOT NULL
  ```

- [ ] UPDATE USING clause (for row visibility) matches SELECT policy exactly

- [ ] UPDATE WITH CHECK clause (for modified values) also includes `IS NOT NULL` for nullable columns

- [ ] DELETE USING clause matches SELECT policy

- [ ] No policies "silently succeed" - failed RLS checks should return 0 rows, not insert anyway

---

## Service Role Bypass Policies

- [ ] Add service_role bypass for each table:
  ```sql
  CREATE POLICY "service_role_{table_name}" ON {table_name}
  FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```

- [ ] Bypass policies must come AFTER tenant policies (ordering matters in Supabase)

- [ ] Verify server-side operations use `supabaseServiceClient` (not regular client)

---

## Performance & Indexing

- [ ] Create index on tenant/restaurant column:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_{table_name}_restaurant_id
  ON {table_name} (restaurant_id);
  ```

- [ ] For composite queries, add multi-column indexes:
  ```sql
  -- If querying by (restaurant_id, status)
  CREATE INDEX IF NOT EXISTS idx_{table_name}_restaurant_status
  ON {table_name} (restaurant_id, status);
  ```

- [ ] Check existing indexes don't have WHERE clauses that could bypass RLS visibility

---

## Testing Checklist

- [ ] Integration test: User A cannot read User B's data from new table

- [ ] Integration test: INSERT with NULL tenant_id fails with RLS error (for nullable columns)

- [ ] Integration test: Server-side (service_role) can still perform CRUD without restriction

- [ ] Manual test: Run `npm run db:push` and verify no syntax errors

- [ ] Manual test: Connect with Supabase admin client and query across tenants to confirm isolation

- [ ] Load test: Verify index is used (check EXPLAIN PLAN)

---

## Post-Deployment Verification

- [ ] Document in [TODO_VERIFICATION](../.claude/memories/orchestration/TODO_VERIFICATION_*.md) which tables now have RLS

- [ ] Update `CLAUDE.md` multi-tenancy section if new patterns discovered

- [ ] Create lesson if asymmetry or NULL handling issues are found: `CL-DB-RLS-*.md`

- [ ] Archive or resolve related TODOs (e.g., TODO-103, TODO-093)

---

## Common Pitfalls to Avoid

1. **Forgetting audit/history tables** - `order_status_history`, `audit_logs`, etc. often overlooked
2. **Not handling nullable columns** - NULL fails comparison, needs explicit `IS NOT NULL`
3. **Asymmetric policies** - INSERT/UPDATE/DELETE policies must mirror SELECT restrictions
4. **Missing service_role bypass** - Server code will fail silently without explicit bypass
5. **Wrong JWT claim name** - Using `'tenant_id'` when schema uses `'restaurant_id'`
6. **Ordering issues** - Service_role policy must be last (more permissive policies override)
7. **Forgetting indexes** - RLS queries without indexes become O(n) table scans
8. **Testing only happy path** - Must test cross-tenant read attempts and NULL insertion

---

## References

- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PR #150 Security Review](https://github.com/mikeyoung304/July25/pull/150) - Initial RLS audit
- [PR #151 Follow-up](https://github.com/mikeyoung304/July25/pull/151) - Asymmetry fixes
- Lesson: [CL-DB-002](../lessons/CL-DB-002-constraint-drift-prevention.md) - Database drift detection
