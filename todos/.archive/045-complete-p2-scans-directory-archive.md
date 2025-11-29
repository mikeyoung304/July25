---
status: complete
priority: p2
issue_id: "045"
tags: [documentation, cleanup, archive, scans, code-review]
dependencies: []
---

# Archive scans/ Directory - Abandoned System

## Problem Statement

The `/scans/` directory (452KB, 27 files) contains an abandoned overnight code scanning system. It was created October 14, 2025, ran once, and was never operationalized. The content overlaps with docs/audit/ and docs/investigations/.

**Why it matters:** Abandoned systems create confusion. Developers may think this is active infrastructure when it's actually dead code documentation.

## Findings

### System Status: ABANDONED
- Created: Oct 14, 2025
- Last scan: Oct 14, 2025 (only one report)
- Integration: None (not in CI/CD)
- Missing components: `run-all-agents.sh` never created

### Evidence of Abandonment
```
scans/README.md says:
  "Run nightly with: nohup ./scans/run-all-agents.sh"

Reality:
  ✗ No run-all-agents.sh exists
  ✗ No scan.log exists
  ✗ Only one dated report (2025-10-14-22-02-28)
  ✗ Not referenced in CI/CD workflows
```

### Content Overlap
| scans/ content | Overlaps with |
|----------------|---------------|
| otherscan.md | docs/audit/ |
| DIAGNOSTIC_REPORT.md | docs/investigations/ |
| AUTH_FIX_REPORT.md | docs/investigations/ |
| reports/2025-10-14/ | docs/audit/ agent outputs |

### Duplicate Reports Directory
Both exist:
- `/scans/reports/`
- `/reports/scans/`

## Proposed Solutions

### Solution 1: Archive to docs/archive/scans/ (Recommended)
Move historical content, delete system documentation.

**Pros:** Preserves history, cleans root
**Cons:** None significant
**Effort:** Small (30 min)
**Risk:** Low

### Solution 2: Full Deletion
Remove entire directory as abandoned.

**Pros:** Cleanest solution
**Cons:** Loses historical scan data
**Effort:** Small (5 min)
**Risk:** Low (can recover from git)

### Solution 3: Revive System
Fix and operationalize the scanning system.

**Pros:** Gets value from design work
**Cons:** Significant effort, may not be needed
**Effort:** Large (1-2 days)
**Risk:** Medium

## Recommended Action

Solution 1 - Archive historical content, delete system docs.

## Technical Details

### Archive Plan
```
KEEP (move to docs/archive/scans/):
├── reports/2025-10-14-22-02-28/  # Historical scan results
├── otherscan.md                   # Comprehensive audit
├── DIAGNOSTIC_REPORT.md           # Login diagnostic
├── AUTH_FIX_REPORT.md            # Auth fix docs
├── COMPLETED_WORK_SUMMARY.md      # Work summary
├── ROLE_PERMISSIONS_AUDIT_REPORT.md
└── SOLUTION_SUMMARY.md

DELETE (dead system documentation):
├── README.md                      # Documents non-existent system
├── USAGE-EXAMPLES.md             # Examples for dead system
└── agents/                        # Agent definitions never executed
```

### Consolidate Duplicate
- Merge `/reports/scans/` into `/docs/archive/scans/`
- Remove `/reports/scans/` directory

## Acceptance Criteria

- [ ] Historical scan content moved to docs/archive/scans/
- [ ] Dead system docs (README.md, USAGE-EXAMPLES.md) deleted
- [ ] agents/ directory deleted or archived
- [ ] /reports/scans/ consolidated and removed
- [ ] docs/archive/README.md updated
- [ ] scans/ directory removed from root

## Work Log

| Date | Action | Learning |
|------|--------|----------|
| 2025-11-24 | Created from /workflows:review | Overnight scanning system abandoned - never operationalized |

## Resources

- [scans/README.md](/scans/README.md) - Documents dead system
- [docs/audit/](/docs/audit/) - Active audit system
- [docs/investigations/](/docs/investigations/) - Investigation reports
