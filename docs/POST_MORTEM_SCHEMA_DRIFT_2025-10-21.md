# Post-Mortem: Schema Drift Production Incident (2025-10-21)

**Incident Date:** October 21, 2025
**Severity:** P0 - Production outage
**Duration:** ~4 hours (detection to resolution)
**Impact:** Order submission failures (403/500 errors) on Vercel production

## Summary
ServerView order submission failed in production with 500 errors due to missing `tax_rate` column. Root cause: migrations committed to git but never deployed to Supabase cloud database.

## Timeline
- **v6.0.12:** Code and migrations created locally for per-restaurant tax rates
- **Oct 21 19:00:** User tested on Vercel, order submission failed (500 errors)
- **Oct 21 19:30:** Discovered schema drift - migrations never deployed to Supabase
- **Oct 21 20:00:** Deployed migrations via psql directly
- **Oct 21 21:00:** Fixed import path errors, redeployed code
- **Oct 21 22:00:** Production testing resumed

## Root Cause
**Conflicting documentation** led to migrations being committed without deployment:

1. `/supabase/MIGRATION_GUIDE.md` (Jul 13) stated migrations were "reference only" and "cloud-first, no migrations"
2. `/docs/SUPABASE_CONNECTION_GUIDE.md` (Oct 20) documented correct CLI workflow
3. Developer read outdated guide, committed migrations but skipped deployment step
4. Production Supabase missing `tax_rate` column → 500 errors

**Missing safeguards:**
- No pre-commit hook to detect schema drift
- No CI check for migration deployment
- No deployment checklist enforcing verification

## Resolution
1. Deployed migrations via psql:
   - `20251019180000_add_tax_rate_to_restaurants.sql`
   - `20251021000000_update_tax_rate_to_0_08.sql`
2. Fixed code import paths (supabase, useRestaurant)
3. Pushed fixes to main (commit 302cb9a)
4. Verified schema sync: `SELECT tax_rate FROM restaurants`

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

## Related
- **Fix commits:** 910f277, 44d1f48, 302cb9a
- **Migrations:** `supabase/migrations/2025101*`
- **Authoritative guide:** `/docs/SUPABASE_CONNECTION_GUIDE.md`
