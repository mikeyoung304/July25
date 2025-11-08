# ADR-010: Remote Database as Single Source of Truth

**Status**: Accepted (Formalized 2025-10-20)
**Date**: 2025-10-20
**Last Updated:** 2025-11-08
**Authors**: Development Team
**Related**: ADR-001, MIGRATION_RECONCILIATION_2025-10-20.md, SUPABASE_CONNECTION_GUIDE.md

---

## Context

### The July 2025 Bifurcation Incident

On July 13, 2025, the project transitioned to a "cloud-first" development workflow, using the Supabase Dashboard as the primary tool for schema development rather than local migration files. However, this architectural decision was never fully documented or understood by all contributors, leading to a critical schema drift incident.

**What Happened:**

Between July and October 2025, the database migration history bifurcated into two parallel, divergent timelines:

- **Remote database (Supabase)**: 11 migrations applied via Dashboard UI (July 30 - September 4, 2025)
  - Changes made directly to production schema
  - Never committed to git repository
  - Production system used this schema as reality

- **Local git repository**: 10 migrations committed to git (January 30 - October 19, 2025)
  - Migration files created and committed locally
  - Never deployed to production database
  - Developers assumed these were deployed

**The Critical Gap:**

The fundamental issue was a misalignment between **assumed** and **actual** source of truth:

**Old Understanding (WRONG):**
> "The canonical database schema is defined in migration files in git. The database reflects migration history."

**Reality:**
> "The remote Supabase database is the single source of truth for current schema state. Migration files document change history but do not define state."

### Discovery: October 20, 2025

The divergence was discovered during investigation of online order failures when a diagnostic query failed:

```sql
SELECT tax_rate FROM restaurants WHERE id = '...';
-- ERROR: 42703: column "tax_rate" does not exist
```

**Initial Assumption (WRONG):** "The migration file is bugged or has SQL syntax errors."

**Actual Problem:** The migration adding `tax_rate` was committed to git on October 19 but **never deployed** to production.

Further investigation via `supabase migration list --linked` revealed:
- Remote had 11 migrations not in local (July-September 2025)
- Local had 10 migrations not in remote (January, February, October 2025)
- Zero overlap except the July 13 reset point

### Root Causes

**1. Process Failure - Missing Deployment Step**

Broken workflow:
```
1. Developer creates migration file locally
2. Developer commits migration to git
3. Developer pushes to GitHub
4. [MISSING] Deploy migration to production database
5. Code that depends on migration fails in production
```

**2. Documentation Gaps - Conflicting Information**

DATABASE.md stated "migrations are source of truth" but the actual operational workflow treated "remote database as source of truth." This fundamental misunderstanding led developers to trust git history over database state.

**3. No Automated Migration Deployment**

- GitHub Actions never ran `supabase db push --linked`
- No automated verification of migration sync status
- No pre-deployment checks comparing local vs remote schema

**4. Local vs Remote Development Confusion**

- Developers used `supabase start` (local instance) for development
- Local instance automatically applied local migrations
- Production used remote instance with different schema
- Gap wasn't visible until production testing

---

## Decision

**We establish the remote Supabase production database as the canonical, authoritative source of truth for all schema state.**

### Core Principles

1. **Remote Database is Authority**: The remote Supabase database (`xiwfhcikfdoshxwbtjxt.supabase.co`) defines the current, authoritative state of the schema.

2. **Migration Files Document History**: Local migration files in `supabase/migrations/` document the **history of changes**, not the current state.

3. **Prisma Schema Generated from Remote**: The Prisma schema (`prisma/schema.prisma`) is generated via introspection from the remote database, ensuring TypeScript types match production reality.

4. **When in Conflict, Remote Wins**: When there is a discrepancy between migration files, documentation, or local schema and the remote database, the remote database is correct by definition.

### Operational Workflow

**Schema State Queries:**

- **Question**: "What columns does the `orders` table have?"
  - **Authoritative Answer**: Query remote database
  - **Not Authoritative**: Inspect local migration files

**Migration Conflicts:**

- **Scenario**: Local migration expects column that doesn't exist remotely
  - **Resolution**: Modify or archive local migration to match remote
  - **Never**: Force local migration that breaks remote schema

**Schema Documentation:**

- **Scenario**: Documentation says table has column X, but remote doesn't
  - **Outcome**: Documentation is wrong, update it
  - **Never**: Assume remote is wrong based on documentation

---

## Rationale

### Why Remote Database as Source of Truth?

**1. Production Reality Trumps Documentation**

The remote database IS production. It defines what actually works in the live system. Migration files are artifacts that may or may not have been applied. Documentation may be outdated. But the remote database is always the current reality.

**2. Prevents Schema Drift**

By establishing a single, authoritative source of truth, we eliminate the possibility of competing definitions of schema state. There is no ambiguity about which version is "correct."

**3. TypeScript Types Match Production**

Generating Prisma schema from remote database via `prisma db pull` ensures that TypeScript types used in the application code exactly match the production database schema. This prevents runtime errors from type mismatches.

**4. Clear Conflict Resolution**

When discrepancies arise (and they will), having a clear hierarchy eliminates debate:
- Remote database > Prisma schema > Migration files > Documentation

**5. Aligns with Supabase Architecture**

Supabase is a hosted database service. The remote instance is the managed, backed-up, monitored production system. Local instances and migration files are development tools, not production artifacts.

### Alternative Considered: Git as Source of Truth

**Approach:** Treat migration files in git as the definitive schema, force-deploy all local migrations to remote.

**Pros:**
- Git provides complete version control
- Clear audit trail of all changes
- Familiar workflow for developers

**Cons:**
- **DESTROYS PRODUCTION DATA**: Would require `supabase db reset --linked` (destructive)
- Remote database had July-September features that local migrations didn't include
- Loses production data and schema changes made via Dashboard
- Unacceptable production risk
- Doesn't reflect operational reality (remote is production)

**Verdict:** Rejected due to unacceptable data loss risk and misalignment with production operations.

---

## Implementation

### Phase 1: Reconciliation (October 20, 2025)

Successfully reconciled the July-October divergence:

1. **Archived Conflicting Local Migrations**
   - Moved `20250130_auth_tables.sql` to `.archive/` (superseded by remote)
   - Moved `20250201_payment_audit_logs.sql` to `.archive/` (never deployed)
   - Created `.archive/README.md` documenting why archived

2. **Marked Remote Migrations as Handled**
   - Used `supabase migration repair --status reverted` for 11 remote-only migrations
   - Acknowledged these in remote history without requiring local files

3. **Fixed Schema Mismatches**
   - Updated local migrations to match remote schema (`scope_name` → `scope`)
   - Ensured migrations referenced columns that actually existed remotely

4. **Resolved Timestamp Collisions**
   - Renamed Oct 19 migrations to unique timestamps (YYYYMMDDHHmmss format)
   - Marked duplicate timestamp as reverted

5. **Deployed Reconciled Migrations**
   - Successfully deployed all October P0 audit migrations
   - Verified with `order_verification.sql` (12 checks passed)

**Full details:** [MIGRATION_RECONCILIATION_2025-10-20.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/MIGRATION_RECONCILIATION_2025-10-20.md)

### Phase 2: Workflow Automation (October 2025)

Created `post-migration-sync.sh` script to automate schema synchronization:

```bash
#!/bin/bash
# Ensures Prisma schema stays in sync with remote database

# 1. Introspect remote database
prisma db pull

# 2. Generate TypeScript types
prisma generate

# 3. Validate schema
npm run typecheck
```

**Usage after migration deployment:**
```bash
supabase db push --linked  # Deploy migration
./scripts/post-migration-sync.sh  # Sync Prisma schema
```

### Phase 3: Documentation Updates (October 20, 2025)

Updated all documentation to reflect remote-first architecture:

1. **DATABASE.md**
   - Removed misleading "migrations are source of truth" statement
   - Added explicit "remote database is source of truth" section
   - Referenced SUPABASE_CONNECTION_GUIDE.md

2. **SUPABASE_CONNECTION_GUIDE.md**
   - Comprehensive migration workflow documentation
   - Source of truth clarification
   - Troubleshooting guide for schema drift

3. **DEPLOYMENT.md**
   - Added migration deployment verification steps
   - Updated deployment checklist with migration sync validation

---

## Consequences

### Positive

✅ **Production Always Authoritative**: No ambiguity about current schema state - query production database

✅ **TypeScript Types Match Reality**: Prisma introspection ensures types match production schema exactly

✅ **Prevents Silent Drift**: Cannot have undiscovered divergence between git and production

✅ **Clear Conflict Resolution**: When in doubt, remote database is correct - eliminates debate

✅ **Post-Deployment Confidence**: Verification scripts can definitively check production state

✅ **Aligns with Supabase Model**: Works with, not against, Supabase's hosted database architecture

✅ **Automated Sync**: `post-migration-sync.sh` makes Prisma sync a one-command operation

### Negative

⚠️ **Cannot Rely Solely on Git History**: Git does not provide complete schema history if changes made via Dashboard

- **Mitigation**: Require `supabase db pull` after any Dashboard changes to capture in git
- **Mitigation**: Document all emergency hotfixes with follow-up migrations

⚠️ **Migration Files May Be Incomplete**: Historical migration files may not reflect all changes

- **Mitigation**: Treat migration files as change documentation, not state definition
- **Mitigation**: Always verify current state by querying remote database

⚠️ **Requires Explicit Deployment Step**: Committing migration to git does NOT deploy it

- **Mitigation**: Added deployment verification to CI/CD checklist
- **Mitigation**: Created deployment documentation (DEPLOYMENT.md)
- **Mitigation**: Automated deployment scripts with verification

⚠️ **Potential for Accidental Schema Changes**: Dashboard UI allows direct schema modifications

- **Mitigation**: Require PR with migration file for all schema changes
- **Mitigation**: Document emergency hotfix process (fix via Dashboard → pull → commit)
- **Mitigation**: Regular schema snapshots via `supabase db pull`

### Neutral

↔️ **Schema Documentation Requires Active Maintenance**: Must periodically sync documentation with remote reality

- Use automated schema snapshot generation
- Include schema verification in CI/CD
- Regular documentation reviews

---

## Decision Matrix

Use this matrix when resolving schema-related questions:

| Scenario | Authority | Action |
|----------|-----------|--------|
| "What columns exist in `orders` table?" | Remote database | Run: `psql $DB_URL -c "\d orders"` |
| "What is the current schema state?" | Remote database | Run: `supabase db pull` or query directly |
| "Migration file says column X exists, but code fails" | Remote database | Verify remote: if missing, migration wasn't deployed |
| "Documentation says column Y exists, but query fails" | Remote database | Documentation is outdated - update it |
| "Local migration conflicts with remote schema" | Remote database | Modify local migration to match remote |
| "TypeScript types don't match database" | Remote database | Run: `./scripts/post-migration-sync.sh` |
| "Git history missing recent changes" | Remote database | Run: `supabase db pull` to capture in git |

---

## Validation & Testing

### Success Criteria

**Immediate** (Completed October 20, 2025):
- ✅ Migration histories aligned (local ↔ remote)
- ✅ All P0 audit migrations deployed to production
- ✅ Schema verification script passes (12/12 checks)
- ✅ TypeScript builds with zero type errors
- ✅ Production orders flow end-to-end successfully

**Ongoing**:
- ✅ `supabase migration list --linked` shows full sync (no divergence)
- ✅ `post-migration-sync.sh` runs without errors after each migration
- ✅ Prisma schema matches remote database schema
- ✅ No schema-related production incidents since reconciliation

### Verification Commands

```bash
# Check migration sync status
supabase migration list --linked
# Should show: all Local versions have corresponding Remote versions

# Verify Prisma schema matches remote
prisma db pull
git diff prisma/schema.prisma
# Should show: no changes (already in sync)

# Run schema verification
PGPASSWORD="..." psql "$DB_URL" -f order_verification.sql
# Should show: passed: 12, failed: 0

# Verify TypeScript types
npm run typecheck
# Should show: 0 errors
```

---

## Rollback Strategy

If this architectural decision needs to be reversed (highly unlikely):

**Option 1: Revert to Pre-Reconciliation State**
```bash
git revert <reconciliation-commits>
# NOTE: Would re-introduce schema drift, not recommended
```

**Option 2: Migrate to Git-as-Source-of-Truth**
```bash
# DESTRUCTIVE - Would lose production data
supabase db reset --linked  # Wipe remote database
supabase db push --linked   # Force all local migrations
# NOT RECOMMENDED - unacceptable data loss
```

**Risk Assessment:** Extremely low likelihood of rollback. This decision aligns with Supabase's architecture and production realities. Rollback would require catastrophic failure of this approach combined with viable alternative.

---

## Migration Best Practices

To maintain remote database as source of truth, follow these practices:

### Creating Migrations

**1. Make Changes on Remote First (Preferred)**
```bash
# Apply schema changes via Supabase Dashboard SQL Editor
# Then pull to local:
supabase db pull
git add supabase/migrations/<timestamp>_remote_schema.sql
git commit -m "feat(db): add feature X"
```

**2. OR Test Locally, Then Deploy**
```bash
# Create migration locally
supabase db diff -f add_feature_x

# Test locally
supabase start
supabase db reset
npm run test:integration

# Deploy to remote
supabase db push --linked

# Sync Prisma
./scripts/post-migration-sync.sh
```

### Always Use Idempotent SQL

```sql
-- ✅ GOOD: Can be run multiple times safely
CREATE TABLE IF NOT EXISTS orders (...);

INSERT INTO api_scopes (scope, description) VALUES
  ('menu:read', 'View menu items')
ON CONFLICT (scope) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ❌ BAD: Fails on second run
CREATE TABLE orders (...);  -- ERROR: relation already exists
INSERT INTO api_scopes VALUES (...);  -- ERROR: duplicate key
CREATE INDEX idx_orders_status ON orders(status);  -- ERROR: already exists
```

### Verify Before Committing

```bash
# Before committing migration to git:

# 1. Deploy to remote
supabase db push --linked

# 2. Verify deployment
supabase migration list --linked  # Check both Local and Remote

# 3. Sync Prisma
./scripts/post-migration-sync.sh

# 4. Run verification
PGPASSWORD="..." psql "$DB_URL" -f order_verification.sql

# 5. Now commit
git add supabase/migrations/ prisma/schema.prisma
git commit -m "feat(db): add feature X"
```

### Emergency Hotfix Process

```bash
# 1. Apply fix via Supabase Dashboard (for speed)
# 2. Immediately document:
supabase db pull
git add supabase/migrations/<timestamp>_remote_schema.sql
git commit -m "fix(db): emergency hotfix for issue #123

Applied via Dashboard during P0 incident.
See INCIDENT_REPORT.md for details."

# 3. Sync Prisma
./scripts/post-migration-sync.sh

# 4. Create incident report documenting the hotfix
```

---

## Related Documentation

- **[MIGRATION_RECONCILIATION_2025-10-20.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/MIGRATION_RECONCILIATION_2025-10-20.md)** - July 2025 bifurcation incident and resolution
- **[SUPABASE_CONNECTION_GUIDE.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/SUPABASE_CONNECTION_GUIDE.md)** - Complete migration workflow guide
- **[DATABASE.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/DATABASE.md)** - Schema reference (updated October 20, 2025)
- **[DEPLOYMENT.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/DEPLOYMENT.md)** - Deployment procedures
- **[ADR-001: Snake Case Convention](/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md)** - Related data layer decision
- **[ADR-009: Error Handling Philosophy](/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md)** - Fail-fast for critical operations
- **[scripts/post-migration-sync.sh](/Users/mikeyoung/CODING/rebuild-6.0/scripts/post-migration-sync.sh)** - Automated Prisma schema sync

---

## Lessons Learned

### 1. Documentation Must Reflect Operational Reality

Problem: DATABASE.md said "migrations are source of truth" but actual workflow was "remote database is source of truth."

Learning: Documentation that contradicts operational practice creates confusion and incidents. Keep docs aligned with reality.

### 2. Committing ≠ Deploying

Problem: Developers assumed committing a migration file to git deployed it to production.

Learning: Explicitly document deployment steps. Make deployment a conscious, verified action, not an assumption.

### 3. Source of Truth Must Be Singular and Explicit

Problem: Competing sources of truth (git, remote DB, docs) created ambiguity.

Learning: Establish ONE authoritative source and document decision explicitly (this ADR).

### 4. Schema Drift Requires Active Detection

Problem: 7 months of divergence went undetected.

Learning: Add automated checks (`supabase migration list --linked`) to CI/CD and pre-deployment checklists.

### 5. Emergency Fixes Need Immediate Documentation

Problem: Dashboard changes weren't captured in git, creating "ghost migrations."

Learning: Require `supabase db pull` immediately after any Dashboard changes, no matter how urgent.

### 6. Migration Files Are History, Not State

Problem: Treating migration files as schema definition.

Learning: Migration files document change history. Current state is defined by remote database.

---

## Approval

This ADR documents a production incident resolution and establishes the architectural principle that emerged from the October 2025 reconciliation.

**Status**: ACCEPTED and IMPLEMENTED (2025-10-20)

The decision was validated through:
- Successful resolution of July-October schema bifurcation
- Zero schema-related incidents since implementation
- Alignment with Supabase hosted architecture
- Clear conflict resolution hierarchy
- Automated tooling (post-migration-sync.sh)

---

**Revision History**:
- 2025-10-20: Decision formalized during migration reconciliation
- 2025-11-08: ADR-010 document created to capture architectural principle
