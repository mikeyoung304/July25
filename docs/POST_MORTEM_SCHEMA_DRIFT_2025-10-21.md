# Post-Mortem: Schema Drift Production Incidents (2025-10-21)

**Incident Date:** October 21, 2025
**Severity:** P0 - Production outage (two separate incidents, same root cause)
**Total Duration:** ~4.5 hours across two incidents
**Impact:** Order submission failures (500 errors) blocking production operations

## Summary
Two separate schema drift incidents occurred on Oct 21, 2025, both caused by the same pattern: RPC functions and code deployed expecting database columns that didn't exist in production.

**Incident #1:** ServerView order submission failed due to missing `tax_rate` column in `restaurants` table.
**Incident #2:** Voice and server orders failed due to missing `created_at` column in `order_status_history` table.

Root cause: Migrations committed to git but never deployed to Supabase cloud database.

## Timeline

### Incident #1: Missing `tax_rate` Column
- **v6.0.12:** Code and migrations created locally for per-restaurant tax rates
- **Oct 21 19:00:** User tested on Vercel, order submission failed (500 errors)
- **Oct 21 19:30:** Discovered schema drift - migrations never deployed to Supabase
- **Oct 21 20:00:** Deployed migrations via psql directly
- **Oct 21 21:00:** Fixed import path errors, redeployed code
- **Oct 21 22:00:** Production testing resumed, Incident #1 resolved

### Incident #2: Missing `order_status_history.created_at` Column
- **Oct 19:** RPC migration `20251019180800_add_create_order_with_audit_rpc.sql` deployed expecting `created_at` column
- **Oct 21 ~23:00:** User reported Render logs showing 500 errors on voice/server orders
- **Oct 21 23:10:** Analysis revealed PostgreSQL error: `column "created_at" of relation "order_status_history" does not exist`
- **Oct 21 23:19:** Created migration `20251021231910_add_created_at_to_order_status_history.sql`
- **Oct 21 23:19:** Deployed migration via psql, verified schema
- **Oct 21 23:20:** Incident #2 resolved, voice/server orders functional

## Root Cause

### Incident #1: Missing `tax_rate` Column
**Conflicting documentation** led to migrations being committed without deployment:

1. `/supabase/MIGRATION_GUIDE.md` (Jul 13) stated migrations were "reference only" and "cloud-first, no migrations"
2. `/docs/SUPABASE_CONNECTION_GUIDE.md` (Oct 20) documented correct CLI workflow
3. Developer read outdated guide, committed migrations but skipped deployment step
4. Production Supabase missing `tax_rate` column → 500 errors

### Incident #2: Missing `order_status_history.created_at` Column
**Incomplete migration deployment** pattern repeated:

1. RPC function `create_order_with_audit` created Oct 19 with INSERT statement expecting `created_at` column
2. RPC migration (`20251019180800`) deployed successfully to production
3. However, NO migration existed to ADD `created_at` column to underlying `order_status_history` table
4. RPC function called by voice/server orders → tried to INSERT into non-existent column → 500 errors
5. Error: `column "created_at" of relation "order_status_history" does not exist` (PostgreSQL code 42703)

**Pattern Recognition:** Both incidents share the same failure mode - code/RPC expects schema that doesn't exist.

**Missing safeguards:**
- No pre-commit hook to detect schema drift
- No CI check for migration deployment
- No deployment checklist enforcing verification
- No automated schema validation before RPC deployment

## Resolution

### Incident #1: Missing `tax_rate` Column
1. Deployed migrations via psql:
   - `20251019180000_add_tax_rate_to_restaurants.sql`
   - `20251021000000_update_tax_rate_to_0_08.sql`
2. Fixed code import paths (supabase, useRestaurant)
3. Pushed fixes to main (commit 302cb9a)
4. Verified schema sync: `SELECT tax_rate FROM restaurants`

### Incident #2: Missing `order_status_history.created_at` Column
1. Created migration `20251021231910_add_created_at_to_order_status_history.sql`:
   - Added `created_at TIMESTAMPTZ DEFAULT now()` column
   - Added COMMENT for documentation
   - Backfilled existing records
   - Added NOTIFY pgrst for schema reload
   - Added validation block
2. Deployed via psql directly (same method as Incident #1):
   ```bash
   PGPASSWORD="xxx" psql "postgresql://postgres@db.xxx.supabase.co:5432/postgres" \
     -f supabase/migrations/20251021231910_add_created_at_to_order_status_history.sql
   ```
3. Verified schema: `\d order_status_history` showed new column
4. Verified RPC function signature includes all expected columns
5. Production testing confirmed voice/server orders now working

## Prevention Measures
1. **Documentation cleanup:**
   - Deprecated `/supabase/MIGRATION_GUIDE.md` with redirect notice
   - Updated `index.md` to point to authoritative guide
   - Added this post-mortem to incident log
2. **Automation (in progress):**
   - Pre-commit hook for migration safety
   - Schema verification script
   - Deployment checklist
3. **Process improvements:**
   - Database changes checklist in CONTRIBUTING.md
   - RUNBOOKS.md for common incidents

## Lessons Learned
- **Single source of truth:** Conflicting docs cause production incidents
- **Fail-safe defaults:** Schema drift should be detected automatically
- **Verification before deployment:** Manual checklists prevent skipped steps
- **Documentation versioning:** Clear "Last Updated" dates show authority
- **RPC schema dependencies:** When creating RPC functions that INSERT into tables, verify ALL referenced columns exist
- **Migration atomicity:** Table schema migrations must be deployed BEFORE or WITH RPC migrations that depend on them
- **Fast iteration on fixes:** Second incident resolved in 30 minutes due to established pattern from first incident

## Additional Prevention Measures (Post-Incident #2)
1. **RPC Migration Checklist:**
   - Before deploying RPC that INSERTs: Verify all columns exist in target table
   - Add migration validation that checks table schema matches RPC expectations
   - Document column dependencies in RPC migration header comments

2. **Schema Validation Script Enhancement:**
   - Extend `/scripts/verify_schema_sync.sh` to validate RPC function INSERTS against actual table schemas
   - Check for common patterns: RPC INSERT columns must exist in target table

3. **Migration Review Process:**
   - Two-person review for RPC migrations
   - Checklist: "Does this RPC reference columns that need to be created first?"

## Related

### Incident #1
- **Fix commits:** 910f277, 44d1f48, 302cb9a
- **Migrations:** `20251019180000_add_tax_rate_to_restaurants.sql`, `20251021000000_update_tax_rate_to_0_08.sql`

### Incident #2
- **Migration created:** `20251021231910_add_created_at_to_order_status_history.sql`
- **Related RPC:** `20251019180800_add_create_order_with_audit_rpc.sql` (deployed Oct 19, expected column that didn't exist)
- **Error logs:** Render production logs 2025-10-21 ~23:00 UTC

### Documentation
- **Authoritative guide:** `/docs/SUPABASE_CONNECTION_GUIDE.md`
- **Runbooks:** `/docs/RUNBOOKS.md` (created after Incident #1)
- **CHANGELOG:** See v6.0.13 for both incidents
