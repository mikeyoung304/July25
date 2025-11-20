# database supabase issues

## Files in this category:
- **LESSONS.md** - Incidents, patterns, and quick reference
- **PREVENTION.md** - How to prevent these issues

# Database & Supabase Issues - Executive Summary

**Last Updated:** 2025-11-19
**Status:** CRITICAL - Lessons from 24+ major production incidents
**Total Business Impact:** $100,000+ in lost orders and recovery costs
**Most Severe Incident:** 4.5-hour cascading production outage (Oct 21-22, 2025)

---

## Critical Metrics Dashboard

### Incident Statistics (July - November 2025)
- **Total Major Incidents:** 24+
- **Schema Drift Incidents:** 3 cascading failures (Oct 21-22)
- **Migration Bifurcation:** 16 days to reconcile (July 13 - Oct 20)
- **RPC Function Failures:** 60% of migration deployment failures
- **Average Time to Detect:** 2.5 hours after deployment
- **Average Recovery Time:** 3.8 hours per incident

### Financial Impact
- **Lost Orders:** ~$75,000 (estimated from 4.5hr outage period)
- **Engineering Recovery:** ~$20,000 (120+ engineer hours @ $160/hr)
- **Emergency Hotfixes:** ~$5,000 (after-hours incident response)
- **Customer Compensation:** Variable by incident

### Root Cause Distribution
1. **RPC/Schema Mismatch (45%)** - Type mismatches, missing columns, wrong signatures
2. **Migration Not Deployed (30%)** - Code expects schema that doesn't exist
3. **Remote-First Pattern Violation (15%)** - Prisma schema edited manually
4. **Migration Timestamp Collision (10%)** - Non-unique version numbers

---

## Quick Diagnosis Flowchart

```
┌─────────────────────────────────────┐
│ Production 500 Error on Orders API  │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Check Error Message Type            │
└──┬──────────┬──────────┬───────────┬┘
   │          │          │           │
   ▼          ▼          ▼           ▼
┌────────┐ ┌──────┐  ┌──────┐   ┌──────────┐
│42703   │ │42804 │  │42P01 │   │Other     │
│Column  │ │Type  │  │Table │   │Error     │
│Missing │ │Mismat│  │Missing│   │Code      │
└───┬────┘ └───┬──┘  └───┬──┘   └────┬─────┘
    │          │         │            │
    ▼          ▼         ▼            ▼
INCIDENT    INCIDENT  INCIDENT    Check
   #2          #3        Rare     Logs
```

### Error Code Quick Reference
- **42703** - "column does not exist" → Migration not deployed (See INCIDENTS.md #1, #2)
- **42804** - "type mismatch" → RPC returns different type than table (See INCIDENTS.md #3, #5)
- **42P01** - "relation does not exist" → Table migration never deployed
- **23505** - "duplicate key" → Migration timestamp collision

---

## The Remote-First Architecture Pattern (ADR-010)

### CRITICAL UNDERSTANDING

```
┌─────────────────────────────────────────────────────┐
│  WRONG: Prisma Schema is Source of Truth            │
│   Edit prisma/schema.prisma manually              │
│   Run prisma db push to deploy changes            │
│   Assume migrations reflect current state         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  CORRECT: Remote Database is Source of Truth        │
│   Remote Supabase database = current reality      │
│   Migrations = HISTORY of changes (not state)     │
│   Prisma schema = GENERATED from remote DB        │
│   Always run `npx prisma db pull` after migration │
└─────────────────────────────────────────────────────┘
```

### The Pattern That Caused $100K+ in Incidents

**What Developers Thought:**
1. Edit `prisma/schema.prisma` to add column
2. Run `prisma db push` to deploy
3. Migration is "just documentation"

**Reality (Remote-First):**
1. Create SQL migration file in `supabase/migrations/`
2. Deploy via `supabase db push --linked` (or psql)
3. Run `npx prisma db pull` to update Prisma schema
4. Prisma schema is NOW accurate (generated from remote)

**Why This Matters:**
- Editing Prisma schema manually = fiction, not reality
- Remote database is what production code executes against
- Schema drift = Prisma schema != remote database

---

## The 3 Schema Drift Cascade Incidents (Oct 21-22, 2025)

### Timeline of Cascading Failures

```
Oct 21, 19:00  │ ████████████████████████ Incident #1 (3 hours)
               │ Missing tax_rate column
               │ All ServerView orders failing (500 errors)
               │
Oct 21, 22:00  │  Resolved via emergency migration deployment
               │
Oct 21, 23:00  │ ████████████ Incident #2 (1 hour)
               │ Missing created_at in order_status_history
               │ Voice + server orders failing
               │
Oct 22, 00:00  │  Resolved via hotfix migration
               │
Oct 22, 03:00  │ ██████████ Incident #3 (0.5 hours)
               │ RPC VARCHAR vs TEXT type mismatch
               │ ALL order creation failing
               │
Oct 22, 03:30  │  Final resolution - RPC function types fixed
```

**Pattern Recognition:** All 3 incidents = RPC function expected schema that didn't exist

---

## Cost Impact Analysis by Incident Type

### Incident #1: Missing Column (tax_rate)
- **Duration:** 3 hours
- **Lost Revenue:** ~$45,000 (peak dinner service)
- **Root Cause:** Migration committed to git but never deployed
- **Error:** `42703: column "tax_rate" does not exist`
- **Fix Time:** 30 minutes (once discovered)
- **Detection Lag:** 2.5 hours

### Incident #2: Missing Column (created_at)
- **Duration:** 1 hour
- **Lost Revenue:** ~$15,000
- **Root Cause:** RPC function INSERT referenced non-existent column
- **Error:** `42703: column "created_at" of relation "order_status_history" does not exist`
- **Fix Time:** 20 minutes (learned from #1)
- **Detection Lag:** 15 minutes

### Incident #3: Type Mismatch (VARCHAR vs TEXT)
- **Duration:** 30 minutes
- **Lost Revenue:** ~$7,500
- **Root Cause:** RPC RETURNS TABLE used VARCHAR, table had TEXT
- **Error:** `42804: Returned type text does not match expected type character varying`
- **Fix Time:** 15 minutes (pattern known)
- **Detection Lag:** 5 minutes

### Migration Bifurcation (July 13 - Oct 20)
- **Duration:** 97 days of diverged state
- **Impact:** P0 audit fixes blocked for 16 days
- **Root Cause:** Remote migrations (11) never pulled locally, local migrations (10) never deployed
- **Resolution Time:** 6 hours manual reconciliation

---

## The 60% RPC Failure Rate

### RPC Function Modification Incidents (Oct-Nov 2025)

**`create_order_with_audit` RPC Evolution:**
1. **Initial Creation (20251019180800)** - Missing `version` column → 500 errors
2. **Fix #1 (20251020221553)** - Added version → still failing
3. **Fix #2 (20251022033200)** - VARCHAR→TEXT type mismatch → 500 errors
4. **Fix #3 (20251029150000)** - Added seat_number → deployment OK
5. **Fix #4 (20251030010000)** - Added payment fields → deployment OK
6. **Fix #5 (20251030020000)** - Consolidated type fixes → still failing
7. **Fix #6 (20251105003000)** - TIMESTAMPTZ→TIMESTAMP for check_closed_at → FINALLY STABLE

**6 fixes in 17 days = 60% failure rate for RPC migrations**

### Why RPC Functions Are High-Risk

1. **Dual Signature Requirements:**
   - Parameters must match what calling code sends
   - RETURNS TABLE must match exact table column types

2. **Type System Strictness:**
   - PostgreSQL enforces exact type matching
   - VARCHAR ≠ TEXT (even though semantically similar)
   - TIMESTAMPTZ ≠ TIMESTAMP

3. **No Migration Dry-Run:**
   - `supabase db push --linked` doesn't have `--dry-run`
   - First you know about RPC errors = production 500s

4. **Schema Drift Amplification:**
   - Table changes don't auto-update RPC functions
   - Each table column addition = potential RPC failure

---

## Prevention Checklist (Use This EVERY Migration)

### Pre-Migration Checks
```bash
# 1. Verify migration sync status
supabase migration list --linked

# Expected output: All local migrations have remote timestamp
# BAD:  20251119123456 |                |  # Local only!
# GOOD: 20251119123456 | 20251119123456 | 2025-11-19 12:34:56

# 2. Check for uncommitted schema changes
git status prisma/schema.prisma
# Should be: "nothing to commit, working tree clean"

# 3. Verify no RPC function dependencies broken
psql "$DATABASE_URL" -c "\df+ create_order_with_audit"
# Check parameter list matches migration expectations
```

### During Migration Creation
```bash
# 1. Generate unique timestamp (14 digits REQUIRED)
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
echo "Migration timestamp: $TIMESTAMP"
# Example: 20251119143022

# 2. Create migration file
touch "supabase/migrations/${TIMESTAMP}_description.sql"

# 3. Write idempotent SQL
# Use: CREATE TABLE IF NOT EXISTS, INSERT...ON CONFLICT DO NOTHING
# Avoid: CREATE TABLE (fails if exists), INSERT (fails on duplicate)

# 4. If creating/modifying RPC function, verify ALL column types match
psql "$DATABASE_URL" -c "\d orders"
# Compare every column type in RETURNS TABLE to actual table schema
```

### Post-Migration Deployment
```bash
# 1. Deploy migration to remote database
supabase db push --linked

# 2. CRITICAL: Pull schema back to Prisma
npx prisma db pull

# 3. Fix @ignore attributes (known Prisma issue)
./scripts/post-migration-sync.sh

# 4. Verify schema generation succeeded
npx prisma generate

# 5. Check git diff shows expected schema changes
git diff prisma/schema.prisma

# 6. Commit schema with migration
git add supabase/migrations/ prisma/schema.prisma
git commit -m "feat(db): [description]"
```

### Post-Deployment Verification
```bash
# 1. Verify migration applied in remote
supabase migration list --linked
# Check for new timestamp in Remote column

# 2. Test RPC functions if modified
psql "$DATABASE_URL" -c "SELECT * FROM create_order_with_audit(...);"

# 3. Monitor production logs for 15 minutes
# Check for 42703, 42804, 42P01 errors

# 4. Run smoke tests
curl -X POST https://api.rebuild6.com/api/v1/orders -d '...'
```

---

## Common Error Messages & Solutions

### Error 42703: Column Does Not Exist

**Example:**
```
ERROR: 42703: column "tax_rate" of relation "restaurants" does not exist
LINE 42:   SELECT tax_rate FROM restaurants WHERE id = $1
```

**Diagnosis:**
1. Check if migration file exists locally
2. Check if migration deployed to remote
3. Compare local vs remote migration list

**Fix:**
```bash
# If migration exists but not deployed:
supabase db push --linked

# If no migration exists:
# Create one, then deploy
```

**Real Incident:** Oct 21, 19:00 - Incident #1 (3 hours downtime)

---

### Error 42804: Type Mismatch

**Example:**
```
ERROR: 42804: Returned type text does not match expected type character varying in column 3
```

**Diagnosis:**
1. Check RPC function RETURNS TABLE types
2. Check actual table column types
3. Look for VARCHAR vs TEXT mismatches

**Fix:**
```sql
-- Recreate RPC function with corrected types
DROP FUNCTION IF EXISTS function_name(...);
CREATE FUNCTION function_name(...)
RETURNS TABLE (
  column_name TEXT  -- Changed from VARCHAR
)
...
```

**Real Incident:** Oct 22, 03:00 - Incident #3 (0.5 hours downtime)

---

### Error 23505: Duplicate Key (Migration Timestamp)

**Example:**
```
ERROR: 23505: duplicate key value violates unique constraint "schema_migrations_pkey"
DETAIL: Key (version)=(20251019) already exists.
```

**Diagnosis:**
- Multiple migrations used same 8-digit timestamp (YYYYMMDD)
- Supabase requires 14-digit unique timestamps (YYYYMMDDHHmmss)

**Fix:**
```bash
# Rename migrations with unique timestamps
mv 20251019_add_feature.sql 20251019143000_add_feature.sql
mv 20251019_add_other.sql 20251019143100_add_other.sql

# Mark old timestamp as reverted
supabase migration repair --status reverted 20251019
```

**Real Incident:** Oct 20 - Migration Reconciliation (blocked deployment)

---

## Files in This Folder

1. **README.md** (this file) - Executive summary, metrics, quick diagnosis
2. **PATTERNS.md** - Remote-first architecture, RPC patterns, migration ordering
3. **INCIDENTS.md** - Detailed incident reports with exact error messages
4. **PREVENTION.md** - Step-by-step prevention with code examples
5. **QUICK-REFERENCE.md** - Emergency commands, rollback procedures
6. **AI-AGENT-GUIDE.md** - Rules for AI assistants working with database

---

## When to Read What

**You're on-call and production is down RIGHT NOW:**
→ Read **QUICK-REFERENCE.md** first

**You're about to create a database migration:**
→ Read **PREVENTION.md** sections 1-3

**You're investigating why a migration failed:**
→ Read **INCIDENTS.md** for similar patterns

**You're an AI agent working on database changes:**
→ Read **AI-AGENT-GUIDE.md** for absolute rules

**You want to understand the architecture:**
→ Read **PATTERNS.md** for deep dive

---

## Success Metrics (Post-Prevention Implementation)

### Before (July - October 2025)
- 24+ major database incidents
- 60% RPC migration failure rate
- 2.5 hour average detection time
- $100K+ total business impact

### After (November 2025+)
- Target: < 2 incidents per quarter
- Target: < 10% RPC migration failure rate
- Target: < 15 minute detection time
- Target: < $5K quarterly impact

### Key Improvements Implemented
1.  Post-migration sync script (./scripts/post-migration-sync.sh)
2.  Migration validation in CI/CD (.github/workflows/validate-migrations.yml)
3.  Prisma schema auto-generation (npx prisma db pull after every migration)
4.  RPC function validation checklist (docs/RPC_MIGRATION_CHECKLIST.md)
5.  Emergency rollback procedures (docs/RUNBOOKS.md)

---

## Related Documentation

- `/docs/POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md` - Detailed 3-incident cascade analysis
- `/docs/MIGRATION_RECONCILIATION_2025-10-20.md` - 97-day bifurcation resolution
- `/supabase/migrations/.archive/README.md` - Archived migrations and reasons
- `/docs/SUPABASE_CONNECTION_GUIDE.md` - Complete migration workflow guide
- `/docs/ADR/ADR-010-remote-first-database.md` - Remote-first architecture decision

---

**Maintained by:** Engineering Team
**Last Major Update:** 2025-11-19
**Next Review:** After next migration incident (to validate prevention measures)

