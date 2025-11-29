---
status: complete
priority: p2
issue_id: "044"
tags: [documentation, cleanup, archive, code-review]
dependencies: []
---

# Root Directory Documentation Cleanup

## Problem Statement

The root directory contains 32+ markdown files, many of which are temporary investigation/analysis reports that should be archived. This clutter makes navigation difficult and buries important files.

**Why it matters:** Root directory should contain only essential, frequently-accessed files. Investigation reports belong in docs/archive/.

## Findings

### Files to ARCHIVE (6 files)
Move to `/docs/archive/2025-11/`:

| File | Type | Reason |
|------|------|--------|
| TEST_ERRORS_2024-11-20.md | Incident | Temporal snapshot, superseded |
| VOICE_ORDERING_TEST_ANALYSIS.md | Investigation | Specific issue, likely resolved |
| CLAUDE_LESSONS_V4_PLAN.md | Planning | Overlaps with LESSONS_V4_PROPOSAL.md |
| VOICE_AGENT_DIAGNOSTIC_REPORT.md | Diagnostic | Findings implemented |
| AGENT_4_SUMMARY.md | Testing | Interim report, replaced |
| VOICE_ORDERING_ULTRATHINK_ANALYSIS.md | Analysis | Integrated into final reports |

### Files to KEEP (9 files)
Essential reference documentation:

| File | Type | Reason |
|------|------|--------|
| LESSONS_V4_SUMMARY.md | Proposal | Actionable v4 migration proposal |
| LESSONS_V4_MIGRATION_PLAN.md | Checklist | 14-day implementation plan |
| CRITICAL_BUG_FIX.md | Reference | Documents critical fix pattern |
| LESSONS_V4_COMPARISON.md | Analysis | Useful v3→v4 comparison |
| VOICE_AGENT_IMPLEMENTATION_COMPLETE.md | Reference | Documents completed fixes |
| MONOREPO_STRUCTURE.md | Reference | Current codebase structure |
| TEST_HEALTH.md | Dashboard | Current test health status |
| CODEBASE_INDEX.md | Navigation | Up-to-date navigation guide |
| CLAUDE_LESSONS_V4_PROPOSAL.md | Strategic | 1,030-line strategic proposal |

### Consolidation Opportunity
The 5 LESSONS_V4_*.md files could be consolidated into a single implementation plan to avoid future drift.

## Proposed Solutions

### Solution 1: Archive Stale Files (Recommended)
Move 6 investigation files to /docs/archive/2025-11/investigations/

**Pros:** Cleans root, preserves history
**Cons:** Must update any internal links
**Effort:** Small (20 min)
**Risk:** Low

### Solution 2: Full Consolidation
Archive + consolidate LESSONS_V4 files into one document.

**Pros:** Cleaner, single source
**Cons:** More effort, risk of losing detail
**Effort:** Medium (1 hour)
**Risk:** Low

## Recommended Action

Solution 1 - Archive the 6 stale files immediately.

## Technical Details

### Archive Script
```bash
# Create target directory
mkdir -p docs/archive/2025-11/investigations

# Move files
mv TEST_ERRORS_2024-11-20.md docs/archive/2025-11/investigations/
mv VOICE_ORDERING_TEST_ANALYSIS.md docs/archive/2025-11/investigations/
mv CLAUDE_LESSONS_V4_PLAN.md docs/archive/2025-11/investigations/
mv VOICE_AGENT_DIAGNOSTIC_REPORT.md docs/archive/2025-11/investigations/
mv AGENT_4_SUMMARY.md docs/archive/2025-11/investigations/
mv VOICE_ORDERING_ULTRATHINK_ANALYSIS.md docs/archive/2025-11/investigations/
```

### Post-Archive Tasks
1. Check for internal links to moved files
2. Update docs/archive/README.md with new entries
3. Add ARCHIVED banner to each moved file

## Acceptance Criteria

- [ ] 6 stale files moved to docs/archive/2025-11/investigations/
- [ ] Each archived file has ARCHIVED banner with date and redirect
- [ ] docs/archive/README.md updated
- [ ] No broken links to moved files
- [ ] Root directory has <10 .md files (excluding README, CLAUDE, CONTRIBUTING, etc.)

## Work Log

| Date | Action | Learning |
|------|--------|----------|
| 2025-11-24 | Created from /workflows:review | Root directory sprawl is significant - 32+ files |

## Resources

- [Archive README](/docs/archive/README.md)
- [Documentation Standards](/docs/DOCUMENTATION_STANDARDS.md)
