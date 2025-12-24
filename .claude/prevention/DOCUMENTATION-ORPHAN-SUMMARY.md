# Documentation Orphan Prevention: Strategy Summary

**Created**: 2025-12-24
**Type**: Prevention Framework
**Status**: ACTIVE
**Audience**: Developers, DevOps, Team Lead

---

## The Problem in 30 Seconds

```
Three forces cause documentation orphans to accumulate:

1. Generated files (playwright-report/data/) get mixed with tracked files
2. Old reports (reports/) pile up without archival discipline
3. Weak enforcement (warnings only) lets orphans slip through

Result: Repository bloat, hard to find current docs, team confusion about
documentation organization.
```

---

## The Solution in 30 Seconds

```
Three-layer prevention fixes it:

LAYER 1: AUTOMATION
- Hardened .gitignore blocks generated files at source
- Pre-commit hook blocks orphaned/undated reports at commit time
- Weekly GitHub Actions cleanup removes old artifacts automatically

LAYER 2: ARCHITECTURE
- Reorganize reports/ into lifecycle tiers (active/snapshots/archive)
- Enforce YYYY-MM-DD naming convention on all reports
- Separate .claude/ into permanent (lessons, prevention) + temporary (cache, workings)

LAYER 3: DISCIPLINE
- 30-second pre-commit checklist before committing docs
- Weekly 10-minute triage to identify archival candidates
- Monthly 15-minute review of documentation health
```

---

## What You Do Differently (Now)

### Before Committing Documentation

**30-second checklist:**
```
1. Is there a DATE (YYYY-MM-DD) in the filename?
2. Is the PURPOSE clear (single topic)?
3. Is it in the RIGHT LOCATION?
4. Is it LINKED from parent README?
5. No SECRETS (credentials, keys)?
```

**If any NO → Fix before committing**

### On Fridays

**10-minute triage:**
```bash
npm run triage:docs
# Check report for files to archive
# Move old files to reports/archive/YYYY-QN/
# Done.
```

### Every 1st Friday of Month

**15-minute review:**
- Check archive health
- Delete duplicates
- Verify retention policies
- Update MANIFEST.md

---

## Files Where Things Go

```
DOCUMENT ABOUT...              LOCATION                    FORMAT
─────────────────────────────────────────────────────────────────────
Past incident/lesson learned   .claude/lessons/            CL-TOPIC-NNN-*.md
Prevention strategy            .claude/prevention/         TOPIC-*.md
Test/build results             reports/snapshots/          Dated directory
Historical reports             reports/archive/            YYYY-QN/...
Current analysis               reports/active/             Latest only
Session notes                  .claude/session-reports/    YYYY-MM-DD-*.md
Temporary working notes        .claude/workings/           Not committed
```

---

## The Three Layers Explained

### Layer 1: Automation (Fixes the Symptom)

**What**: Scripts and tools run without team involvement

**Mechanics**:
- `.gitignore`: 10+ rules block generated/orphaned files from being added
- `pre-commit hook`: Runs locally, blocks bad commits before push
- `GitHub Actions`: Runs Fridays 2 AM, auto-archives old files
- `npm scripts`: Team can run validation/cleanup anytime

**Result**: Generated files never accidentally committed

---

### Layer 2: Architecture (Fixes the Structure)

**What**: Directory layout and naming conventions guide team naturally

**Mechanics**:
- `reports/active/` - current, regularly updated
- `reports/snapshots/` - point-in-time captures (30 days)
- `reports/archive/` - historical (12 months)
- Naming: `prefix-YYYY-MM-DD[-context].ext`
- Enforcement: Validation script + pre-commit hook

**Result**: Structure makes it obvious where things go and when to archive

---

### Layer 3: Discipline (Fixes the Behavior)

**What**: Simple, repeatable weekly and monthly rituals

**Mechanics**:
- `Pre-commit checklist`: 30 seconds, just before git commit
- `Weekly triage`: Friday 10-minute review of what needs archiving
- `Monthly review`: 15-minute deep dive into health and duplicates
- `Team calendar`: Scheduled, repeating, makes it a habit

**Result**: Orphans never accumulate because they're identified early

---

## Why This Works

| Problem | Layer 1 | Layer 2 | Layer 3 | Result |
|---------|---------|---------|---------|--------|
| Generated files committed | .gitignore blocks | (N/A) | (N/A) | Never happens |
| Old reports accumulate | Auto-archive | Org structure | Weekly triage | Cleaned before 60 days |
| Orphaned files hard to find | Validation | Naming convention | Pre-commit checklist | All findable |
| Team confusion | Pre-commit errors clear | Decision tree | Quick reference | Team knows what to do |
| Manual effort | GitHub Actions | npm scripts | Short rituals | <30 min/month |

---

## What Happens When You Commit

### Good Case ✓

```
$ git add docs/my-prevention-strategy-2025-12-24.md
$ git commit -m "docs: add prevention strategy"

✓ Orphan check passed
✓ Commit succeeds
```

### Pre-commit Hook Rejects ✗

```
$ git add reports/undated-analysis.md
$ git commit -m "docs: add analysis"

✗ Error: Reports must include date in filename (YYYY-MM-DD)
  - reports/undated-analysis.md (missing date)
Commit blocked due to orphan file violations

# You must fix before committing
$ mv reports/undated-analysis.md reports/undated-analysis-2025-12-24.md
$ git add reports/undated-analysis-2025-12-24.md
$ git commit -m "docs: add analysis"

✓ Orphan check passed
✓ Commit succeeds
```

### GitHub Actions Auto-Cleanup

```
Friday 2 AM UTC: Cleanup job runs
- Removes reports older than 60 days (except archive)
- Removes e2e videos older than 7 days
- Clears .claude/cache/

Saturday morning: Team sees cleanup commit:
  "chore: cleanup orphaned and stale documentation files"

No manual work needed.
```

---

## Quick Decision Tree

```
I'm about to commit a .md file...

Is it about past incident/bug?
  └─ Yes → .claude/lessons/CL-TOPIC-NNN-filename.md

Is it a prevention/strategy document?
  └─ Yes → .claude/prevention/TOPIC-filename.md

Is it test results/build output?
  └─ Yes → reports/snapshots/YYYY-MM-DD/filename.json

Is it old (>60 days old)?
  └─ Yes → reports/archive/YYYY-QN/category/filename.md

Is it temporary working notes?
  └─ Yes → .claude/workings/filename.md (NOT committed)

Is it a decision record?
  └─ Yes → docs/decisions/ADR-NNN-filename.md

Otherwise → Ask in #devops or see DOCUMENTATION-ORPHAN-QUICK-REF.md
```

---

## Key Numbers

```
Retention Policies:
├─ Generated files: 0 days (never committed, .gitignore)
├─ E2E test artifacts: 7 days (videos, traces)
├─ Build artifacts: 14 days (coverage, bundles)
├─ General reports: 60 days (then → archive)
├─ Archived reports: 12 months (then → delete or compress)
└─ Lessons/Prevention: Indefinite (never auto-delete)

Effort:
├─ Pre-commit checklist: 30 seconds
├─ Weekly triage: 10 minutes
├─ Monthly review: 15 minutes
└─ Total per month: ~60 minutes (or 2% of one person's time)

Structure:
├─ reports/ root files: < 10 (was: 20+)
├─ Orphaned generated files: 0 (was: 100+)
├─ Reports missing dates: 0 (was: many)
└─ Archive size: Growing predictably (60+ files per month)
```

---

## What's Automated (You Don't Have to Do)

✅ Blocks generated files from being committed
✅ Runs pre-commit validation on your machine
✅ Removes old reports Fridays at 2 AM
✅ Clears cache files weekly
✅ Commits cleanup automatically
✅ Validates naming conventions

---

## What's Manual (You Do Weekly)

✅ Friday triage: `npm run triage:docs` (10 minutes)
  - Run script, review report, move archival candidates
✅ Monthly review (1st Friday): Check archive health (15 minutes)
  - Delete duplicates, verify retention, update MANIFEST

**That's it.** Total ~1 hour per month.

---

## How to Read the Full Documentation

1. **Just starting?** → Read [DOCUMENTATION-ORPHAN-QUICK-REF.md](./DOCUMENTATION-ORPHAN-QUICK-REF.md) (5 min)
2. **Want the full strategy?** → Read [DOCUMENTATION-ORPHAN-PREVENTION.md](./DOCUMENTATION-ORPHAN-PREVENTION.md) (20 min)
3. **Implementing it?** → Follow [DOCUMENTATION-ORPHAN-IMPLEMENTATION.md](./DOCUMENTATION-ORPHAN-IMPLEMENTATION.md) (track progress)
4. **Team training?** → Use quick ref + show 5-min demo of pre-commit hook

---

## Implementation Status

```
Current Status (2025-12-24):
├─ Strategy document: DONE ✓
├─ Quick reference: DONE ✓
├─ Implementation plan: DONE ✓
├─ .gitignore update: PENDING (Task 1.1)
├─ Pre-commit hook: PENDING (Task 1.2)
├─ GitHub Actions: PENDING (Task 2.1)
├─ Team training: PENDING (Task 3.4)
└─ Verification: PENDING (Task 4.1)

Timeline: ~4 weeks for full implementation
Owner: DevOps Team
```

---

## The Three Documents

### 1. DOCUMENTATION-ORPHAN-PREVENTION.md (This is the Main Strategy)

**Size**: ~400 lines
**Read time**: 20-30 minutes
**For**: DevOps, team leads, anyone wanting full understanding

**Covers**:
- Problem analysis (what's broken, why)
- Three-layer solution (automation, architecture, discipline)
- Detailed implementation specs for each layer
- Troubleshooting guide
- Related documentation

**Use when**: Designing documentation systems, implementing prevention, training new team members

---

### 2. DOCUMENTATION-ORPHAN-QUICK-REF.md (Daily Use)

**Size**: ~200 lines
**Read time**: 5 minutes
**For**: Developers committing code, anyone working with docs

**Contains**:
- 30-second pre-commit checklist
- File location decision tree
- Naming convention rules
- Retention time table
- Common problems & quick fixes

**Use when**: About to commit a .md file, confused about where something goes, debugging pre-commit issues

---

### 3. DOCUMENTATION-ORPHAN-IMPLEMENTATION.md (Phase-by-Phase Tasks)

**Size**: ~500 lines
**Read time**: 30 minutes to understand, then 4 weeks to execute
**For**: DevOps team executing implementation

**Contains**:
- 4 phases (Foundation, Automation, Discipline, Verification)
- Task-by-task instructions
- Code snippets ready to copy
- Success criteria for each task
- Estimated effort and timeline

**Use when**: Implementing the prevention system, managing rollout, tracking progress

---

## Next Steps

### For Reading
1. Start with DOCUMENTATION-ORPHAN-QUICK-REF.md (5 min)
2. Then read DOCUMENTATION-ORPHAN-PREVENTION.md (20 min)
3. Keep both bookmarked

### For Implementation
1. Assign DevOps team member to own implementation
2. Follow DOCUMENTATION-ORPHAN-IMPLEMENTATION.md
3. Complete Phase 1 this week (foundation: .gitignore + hook)
4. Phases 2-3 over next 3 weeks (automation + discipline)
5. Verify week 4 (success criteria)

### For Team
1. Team lead reviews QUICK-REF with team
2. Team learns pre-commit hook in Phase 1
3. Weekly triage starts once Phase 2 complete
4. Monthly review starts once Phase 3 complete

---

## FAQ

**Q: What if my file gets blocked by pre-commit hook?**
A: Read the error message (very clear), fix the issue (usually add date), retry commit.

**Q: How do I recover a deleted file?**
A: Auto-cleanup only moves to archive, not delete. Check `reports/archive/`.
For truly deleted: `git show <commit>:path > recovered.md`

**Q: Do I have to follow this?**
A: Yes, the pre-commit hook enforces it. But it's designed to be helpful, not painful.
If you find it blocking legitimate work, ask DevOps to adjust the rules.

**Q: What if the automation breaks?**
A: See TROUBLESHOOTING section in DOCUMENTATION-ORPHAN-PREVENTION.md or ask #devops

**Q: How often do I have to do triage?**
A: Once per week, 10 minutes. It's scheduled on team calendar.

**Q: What happens to my archived files?**
A: Kept in `reports/archive/YYYY-QN/` for 12 months, then deleted (or compressed).
You can always recover from git if you need it before deletion.

---

## Success Looks Like (After 4 Weeks)

✓ Zero orphaned generated files in commits
✓ All reports follow YYYY-MM-DD naming
✓ Team doesn't complain about pre-commit hook
✓ Weekly cleanup happens silently every Friday
✓ reports/ directory is organized and navigable
✓ New team members can find documentation easily
✓ Monthly documentation work is <30 minutes

---

## References

- **Full Prevention Strategy**: [DOCUMENTATION-ORPHAN-PREVENTION.md](./DOCUMENTATION-ORPHAN-PREVENTION.md)
- **Daily Quick Reference**: [DOCUMENTATION-ORPHAN-QUICK-REF.md](./DOCUMENTATION-ORPHAN-QUICK-REF.md)
- **Implementation Tasks**: [DOCUMENTATION-ORPHAN-IMPLEMENTATION.md](./DOCUMENTATION-ORPHAN-IMPLEMENTATION.md)
- **Parent Directory**: [.claude/prevention/README.md](./README.md)
- **Related Lessons**: [CL-MAINT-001: Worktree System Hygiene](./../lessons/CL-MAINT-001-worktree-system-hygiene.md)

---

**Version**: 1.0
**Created**: 2025-12-24
**Status**: ACTIVE
**Next Review**: 2025-03-24 (quarterly)
**Owner**: DevOps Team
