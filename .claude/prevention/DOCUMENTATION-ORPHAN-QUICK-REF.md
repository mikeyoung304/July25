# Documentation Orphan Prevention: Quick Reference

**Use this before committing documentation files**

---

## Pre-Commit Checklist (30 Seconds)

```
Before: git add *.md

1. DATE in filename?
   ✓ coverage-2025-12-24.md
   ✗ coverage-latest.md ← Add date

2. PURPOSE clear?
   ✓ Single topic, clear title
   ✗ Misc notes, vague title ← Split or rename

3. RIGHT LOCATION?
   Reports: reports/YYYY-MM-DD-*.md
   Lessons: .claude/lessons/CL-TOPIC-001-*.md
   Prevention: .claude/prevention/*.md
   ✗ Root directory .md files ← Move to appropriate dir

4. LINKED from README?
   ✓ Added to parent README.md
   ✗ Orphaned (no link) ← Add link

5. NO SECRETS?
   ✓ No credentials, API keys, tokens
   ✗ Contains password/secret ← Remove before commit
```

**Result: PASS = Can commit | FAIL = Fix before commit**

---

## File Naming Quick Rules

| Location | Pattern | Example | ✓/✗ |
|----------|---------|---------|-----|
| reports/ | prefix-YYYY-MM-DD.md | coverage-2025-12-24.md | ✓ |
| lessons/ | CL-TOPIC-NNN-*.md | CL-AUTH-001-drift.md | ✓ |
| prevention/ | TOPIC-CONTEXT.md | DOCUMENTATION-ORPHAN-PREVENTION.md | ✓ |
| reports/ | INCOMPLETE_v2.md | No date | ✗ |
| Root | anything.md | cleanup.md | ✗ |
| Temp | undated files | notes.md | ✗ |

**When in doubt: Add YYYY-MM-DD to filename**

---

## Where Files Go

```
Writing documentation about...

├─ A PAST INCIDENT?
│  └─→ .claude/lessons/CL-CATEGORY-NNN-brief-title.md
│
├─ PREVENTION STRATEGY?
│  └─→ .claude/prevention/STRATEGY-TITLE.md
│
├─ CURRENT TEST RESULTS?
│  └─→ reports/snapshots/2025-12-24/name.json
│
├─ HISTORICAL REPORT?
│  └─→ reports/archive/2025-Q4/category/name-2025-12-24.md
│
├─ SESSION NOTES?
│  └─→ .claude/session-reports/2025-12-24-topic.md
│
├─ TEMPORARY WORKING NOTES?
│  └─→ .claude/workings/filename.md (NOT committed)
│
└─ MEETING MINUTES / DECISION?
   └─→ docs/decisions/ADR-NNN-title-YYYY-MM-DD.md
```

---

## Weekly Triage (Friday, 5 minutes)

```bash
# Check what needs archival
npm run triage:docs

# Review report: reports/triage-YYYY-WXX.md
# Action any archival suggestions
# Done.
```

---

## Monthly Review (1st Friday, 10 minutes)

```bash
# Check for old files
find reports -maxdepth 1 -type f -mtime +60

# Move old reports to archive
mv reports/old-report-2025-10-14.md reports/archive/2025-Q4/

# Check for duplicates
git log --all -- "*report-name*" | head

# Update MANIFEST.md with current reports

# Done.
```

---

## Common Problems & Fixes

### Problem: Pre-commit hook rejected my file
```bash
# Error: "Found commits matching pattern: reports/artifacts/"
# Solution: Move file to correct location before committing
mv my-file.json reports/snapshots/2025-12-24/

# Or exclude it from commit
git reset HEAD my-file.json
```

### Problem: Report file has no date, how to add?
```bash
# Wrong: coverage-latest.md
# Right: coverage-2025-12-24.md

# Add date based on file's creation date
stat coverage-latest.md  # Check "Modify" date
# → If 2025-12-24, rename to coverage-2025-12-24.md
mv coverage-latest.md coverage-2025-12-24.md
```

### Problem: File is temporary, shouldn't be committed
```
# Working notes → .claude/workings/ (gitignored)
# Draft report → Add [DRAFT] to filename or add to .gitignore
# Generated → Already in .gitignore (test, build artifacts)
```

### Problem: Can't find the right README to link to
```bash
# All top-level READMEs:
- reports/README.md         ← For reports/
- .claude/prevention/README.md  ← For prevention/
- .claude/lessons/README.md     ← For lessons/
- .claude/session-reports/README.md ← For sessions

# Link format:
[Title](./filename.md)      # Same directory
[Title](../other/file.md)   # Up one, into other/
[Title](./README.md)        # Point to README
```

---

## Files That Must Have Dates

```
✗ coverage.json                → ✓ coverage-2025-12-24.json
✗ report.md                    → ✓ report-2025-12-24.md
✗ REMAINING_WORK_SUMMARY.md    → ✓ remaining-work-2025-12-24.md
✗ analysis-latest.txt          → ✓ analysis-2025-12-24.txt
✓ CL-AUTH-001-drift.md         (has incident ID, keeps pattern)
✓ README.md                    (exception, root-level index)
✓ MANIFEST.md                  (exception, root-level index)
```

---

## Retention Times (Auto-Cleanup)

```
Artifact Type              Retention    Location
─────────────────────────────────────────────────────
E2E test videos           7 days       reports/e2e/*/videos/
Build artifacts           14 days      reports/artifacts/
Coverage reports          30 days      reports/snapshots/
General reports           60 days      reports/ → archive
Analysis outputs          30 days      reports/ → archive
Cache files               0 days       .claude/cache/ (auto-deleted)
Working notes             0 days       .claude/workings/ (never commit)
Lessons learned           Forever      .claude/lessons/
Prevention strategies     Forever      .claude/prevention/
```

---

## What Gets Auto-Deleted Weekly (GitHub Actions)

```
# Runs Fridays 2 AM UTC

- reports/**/*_2025-*.md (older than 60 days)
- reports/e2e/*/video_*.webm (older than 7 days)
- reports/e2e/*/trace.zip (older than 7 days)
- reports/e2e/*/*.ndjson (older than 7 days)
- reports/artifacts/* (older than 14 days)
- .claude/cache/* (all files)
```

---

## What Never Gets Auto-Deleted

```
✓ reports/README.md
✓ reports/MANIFEST.md
✓ reports/archive/
✓ .claude/prevention/
✓ .claude/lessons/
✓ docs/
✓ CLAUDE.md
✓ Anything in .git/
```

---

## If Your File Was Deleted

```
# Check if it was auto-archived
ls reports/archive/2025-*/

# Or find in git history
git log --all --full-history -- path/to/file
git show <commit>:path/to/file > recovered-file.md

# Ask in #devops if unsure
```

---

## Scripts You Can Run

```bash
# Check for orphans before commit (runs automatically)
./scripts/pre-commit-orphan-guard.sh

# Test .gitignore rules
git check-ignore -v file.md

# Validate report naming
./scripts/validate-report-naming.sh

# Manual cleanup
npm run triage:docs        # See what needs archiving
npm run archive:reports    # Archive old reports
npm run cleanup:orphans    # Clean generated files
```

---

## Who to Ask

- **Documentation structure**: DevOps Team
- **Specific file retention**: Check reports/README.md
- **Is my file supposed to be deleted?**: Check retention table above
- **How do I document a lesson?**: See .claude/lessons/README.md
- **Prevention strategy questions**: See DOCUMENTATION-ORPHAN-PREVENTION.md

---

## Emergency: "I need to keep this file"

1. **If in reports/**: Move to `reports/archive/[YYYY-QN]/[category]/`
2. **If temporary**: Move to `.claude/workings/` (not committed)
3. **If prevention lesson**: Move to `.claude/lessons/CL-TOPIC-NNN-*.md`
4. **If analysis output**: Link from parent README, add date to filename
5. **If generated**: Add to .gitignore, not tracking anymore

---

**Last Updated**: 2025-12-24
**Related**: [DOCUMENTATION-ORPHAN-PREVENTION.md](./DOCUMENTATION-ORPHAN-PREVENTION.md)
