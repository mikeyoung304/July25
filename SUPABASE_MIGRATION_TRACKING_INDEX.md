# Supabase Migration Tracking Investigation - Document Index

**Investigation Date:** November 7, 2025  
**Total Documentation:** 4 comprehensive reports  
**Status:** COMPLETE

---

## Quick Navigation

### For Executives / Decision Makers
Start here: **SUPABASE_MIGRATION_TRACKING_FINDINGS.md**
- 5-minute read
- Answers all key questions
- Recommendations included
- No technical jargon (mostly)

### For Developers / DevOps
Start here: **SUPABASE_MIGRATION_QUICK_REFERENCE.md**
- Quick lookup tables
- Command cheat sheet
- File locations
- When to use which tool

### For Code Auditors / Investigators
Start here: **SUPABASE_MIGRATION_EVIDENCE_CATALOG.md**
- File locations with line numbers
- Exact code snippets
- How to verify each finding
- Proof of all claims

### For Deep Understanding
Start here: **SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md**
- 11 comprehensive sections
- All technical details
- Complete analysis
- Historical context

---

## The Documents

### 1. SUPABASE_MIGRATION_TRACKING_FINDINGS.md (13 KB)

**Audience:** Managers, Tech Leads, Decision Makers  
**Time to Read:** 5-10 minutes  
**Key Content:**
- Executive summary
- The three-layer system explained
- Direct answers to all 5 investigation questions
- Concrete findings with confidence levels
- Recommendations (immediate, short-term, long-term)

**Start with:**
- Section: "Critical Answers to Your Questions"
- Then: Section: "The Three-Layer System"
- Then: Section: "Concrete Findings"

**Best for:** Getting the "what happened" and "what to do about it"

---

### 2. SUPABASE_MIGRATION_QUICK_REFERENCE.md (4.6 KB)

**Audience:** Developers, DevOps Engineers  
**Time to Read:** 3-5 minutes  
**Key Content:**
- The three-layer system (quick overview)
- Quick Q&A (common questions answered instantly)
- File locations and tools table
- The duplicates problem at a glance
- How to verify current state (commands only)
- When to use which tool matrix

**Start with:**
- Section: "Quick Answers"
- Then: "File Locations & Key Code"
- Then: "How to Verify Current State"

**Best for:** "I need to know X right now" queries

---

### 3. SUPABASE_MIGRATION_EVIDENCE_CATALOG.md (12 KB)

**Audience:** Code Auditors, Investigators, Skeptics  
**Time to Read:** 10-15 minutes  
**Key Content:**
- 8 evidence sections, each with:
  - Proof location (file + line numbers)
  - The code/evidence
  - What it proves
  - How to verify it
- Covers all claims with code snippets
- Naming convention violations documented
- Tracking mechanism evidence

**Sections:**
1. Source of truth is remote database (migration status)
2. GitHub deployment workflow detects & deploys
3. Drift detection introspects actual schema
4. Duplicate migrations with timestamps
5. Post-migration sync uses Prisma
6. Historical bifurcation was resolved
7. Naming convention violations
8. Exit codes for migration status

**Best for:** "Show me the code that proves this"

---

### 4. SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md (21 KB)

**Audience:** Architects, Security Reviewers, Comprehensive Researchers  
**Time to Read:** 20-30 minutes  
**Key Content:**
- 11 comprehensive sections
- Complete technical deep-dive
- All mechanisms explained
- All limitations documented
- Historical analysis (July 2025 bifurcation)
- Drift type definitions (real drift, migration corruption, abandoned files)
- Recommendations by priority

**Major Sections:**
1. Executive Summary
2. Migration Tracking Mechanism
3. GitHub Deployment Workflow
4. Drift Detection Workflow
5. Applied Migrations vs Local Files
6. Which Migrations Are Actually Applied
7. Real Drift vs Abandoned Files
8. Drift Check Workflow Limitations
9. Supabase CLI Commands Analysis
10. Dashboard Problem (Historical)
11. Distinguishing Drift Types
12. Evidence Summary
13. Key Findings
14. Recommendations

**Best for:** Complete understanding, future reference, troubleshooting

---

## Key Findings Summary

### Finding 1: The Three-Layer System
1. **Remote database** = Source of truth (`supabase_migrations.schema_migrations` table)
2. **GitHub workflow** = Automatic deployer (detects new migrations, applies them)
3. **Drift check** = Daily verifier (introspects schema, compares with git)

### Finding 2: Drift Check Has Blind Spots
- Detects: Schema differences (columns, functions, indexes)
- Does NOT detect: Abandoned local files, migration history corruption
- Example: Two identical migrations applied = schema correct = drift check passes (but history corrupted!)

### Finding 3: Duplicate Migrations Exist
- **Identical content (probably abandoned):** 3 files
  - 20251019_add_create_order_with_audit_rpc.sql
  - 20251019_add_batch_update_tables_rpc.sql
  - 20251019_add_version_to_orders.sql

- **Different content (critical):** 1 file pair
  - 20251019_add_tax_rate_to_restaurants.sql (default 0.0825)
  - 20251019180000_add_tax_rate_to_restaurants.sql (default 0.08)
  - These have DIFFERENT SQL!

### Finding 4: Naming Convention Violated
- 5 files use 8-digit format (violates YYYYMMDDHHMMSS standard)
- Still work, but create confusion

### Finding 5: Past Bifurcation Was Resolved
- July 2025: 11 remote migrations vs 10 local migrations (different timelines)
- Now: Documented and reconciled
- Workflow improved to prevent recurrence

---

## Answers to All 5 Questions

### Q1: How do Supabase dashboards track migrations?
**A:** The `supabase_migrations.schema_migrations` PostgreSQL table.  
**Doc:** SUPABASE_MIGRATION_TRACKING_FINDINGS.md → Section: "Critical Answers"

### Q2: Does `npx supabase db remote commit` pull changes FROM remote?
**A:** No, this command doesn't exist.  
**Correct:** `supabase db pull`, `supabase db push --linked`, `supabase migration list --linked`  
**Doc:** SUPABASE_MIGRATION_TRACKING_FINDINGS.md → "Critical Answers" section

### Q3: Does `npx supabase migration list` show remote vs local state?
**A:** No, it only shows remote applied migrations (from schema_migrations table).  
**Limitation:** Can't detect when local file names differ from applied version names.  
**Doc:** SUPABASE_MIGRATION_EVIDENCE_CATALOG.md → Evidence 8 (CLI Commands)

### Q4: What does drift-check actually detect?
**A:** Schema differences (columns, functions, etc.) using Prisma introspection.  
**Does NOT detect:** Abandoned local files, migration history corruption.  
**Doc:** SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md → Section 3 (Drift Detection)

### Q5: Were recent migrations applied or abandoned?
**A:** All appear applied, but duplicates exist.  
**Issues:** 3 duplicate files (identical), 1 file pair (different SQL).  
**Doc:** SUPABASE_MIGRATION_TRACKING_FINDINGS.md → "Duplicates Found" section

---

## How to Use These Documents

### Scenario 1: "My migration didn't deploy!"
1. Read: SUPABASE_MIGRATION_QUICK_REFERENCE.md → "How to Verify Current State"
2. Run the commands shown
3. Check: SUPABASE_MIGRATION_EVIDENCE_CATALOG.md → Evidence 1 (Source of Truth)

### Scenario 2: "Is there schema drift?"
1. Read: SUPABASE_MIGRATION_QUICK_REFERENCE.md → "Drift Detection"
2. Read: SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md → Section 6 (Drift vs Abandoned)
3. Run: `npx prisma db pull` and compare

### Scenario 3: "Why does this code exist?"
1. Read: SUPABASE_MIGRATION_TRACKING_FINDINGS.md → "The Three-Layer System"
2. Read: SUPABASE_MIGRATION_EVIDENCE_CATALOG.md → Corresponding evidence section
3. Cross-reference with line numbers in code

### Scenario 4: "I need to understand the complete system"
1. Read: SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md (all sections)
2. This is the comprehensive reference

### Scenario 5: "Show me the proof"
1. Read: SUPABASE_MIGRATION_EVIDENCE_CATALOG.md
2. Each section has code + file locations + how to verify

---

## Technical Reference

### Commands to Remember

```bash
# Is migration X applied?
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = 'X';"

# List all applied migrations
psql "$DATABASE_URL" -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"

# Check for drift manually
npx prisma db pull && diff schema-before.prisma prisma/schema.prisma

# List applied migrations via CLI
supabase migration list --linked

# Deploy pending migrations
supabase db push --linked
```

### File Locations

| What | Where |
|------|-------|
| Deploy automation | `.github/workflows/deploy-migrations.yml` |
| Drift check automation | `.github/workflows/drift-check.yml` |
| Migration deployment script | `./scripts/deploy-migration.sh` |
| Schema sync script | `./scripts/post-migration-sync.sh` |
| All migrations | `./supabase/migrations/` |
| Migration docs | `./supabase/migrations/README.md` |
| Connection guide | `./docs/SUPABASE_CONNECTION_GUIDE.md` |
| Reconciliation report | `./docs/MIGRATION_RECONCILIATION_2025-10-20.md` |

---

## Questions?

Each document is self-contained but cross-referenced. Start with the one that matches your role:

- **Manager/Exec:** SUPABASE_MIGRATION_TRACKING_FINDINGS.md
- **Developer/DevOps:** SUPABASE_MIGRATION_QUICK_REFERENCE.md
- **Auditor/Investigator:** SUPABASE_MIGRATION_EVIDENCE_CATALOG.md
- **Architect/Researcher:** SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md

---

**Investigation Complete:** November 7, 2025  
**Generated:** Claude Code v4.5  
**Confidence Level:** HIGH - Direct code evidence for all claims
