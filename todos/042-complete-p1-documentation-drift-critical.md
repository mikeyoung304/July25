---
status: complete
priority: p1
issue_id: "042"
tags: [documentation, drift, code-review]
dependencies: []
---

# Documentation Drift - Critical Metrics Outdated

## Problem Statement

CLAUDE.md and related documentation contain outdated metrics that create confusion and reduce trust in documentation accuracy. Several key claims are demonstrably incorrect.

**Why it matters:** Developers rely on CLAUDE.md for accurate guidance. Outdated info leads to confusion and wasted debugging time.

## Findings

### 1. Test Count Drift
- **Claimed:** "365+ passing, 2 quarantined"
- **Actual:** 448 passing out of 601 total tests
- **Location:** CLAUDE.md line 145

### 2. Link Health Drift
- **Claimed:** "97.4% link health"
- **Actual:** 90.4% (126 broken links across 36 files)
- **Location:** CLAUDE.md line 146, docs/PRODUCTION_STATUS.md line 8

### 3. Order Status States
- **Claimed:** 7 states (pending → confirmed → preparing → ready → served → completed + cancelled)
- **Actual:** 8 states in shared/types/order.types.ts (includes 'new' and 'picked-up')
- **Location:** CLAUDE.md lines 161-167

### 4. Import Paths Incorrect
- **Claimed:** `import { httpClient } from 'services/http/httpClient'`
- **Actual:** Requires `@/` prefix: `import { httpClient } from '@/services/http/httpClient'`
- **Location:** CLAUDE.md line 115

### 5. Logger Path Varies by Workspace
- **Claimed:** `import { logger } from 'utils/logger'`
- **Actual:** Client uses `@/services/logger`, Server uses `../utils/logger`
- **Location:** CLAUDE.md lines 136-139

### 6. Version Mismatch
- **Root package.json:** v6.0.14
- **Client/Server package.json:** v6.0.6
- **Issue:** Workspaces out of sync

## Proposed Solutions

### Solution 1: Immediate Fix (Recommended)
Update CLAUDE.md with accurate current values and add drift detection to CI.

**Pros:** Quick fix, restores trust
**Cons:** Manual, will drift again without automation
**Effort:** Small (30 min)
**Risk:** Low

### Solution 2: Add CI Drift Detection
Add GitHub Action to check CLAUDE.md claims against actual code weekly.

**Pros:** Prevents future drift
**Cons:** More setup time
**Effort:** Medium (2-3 hours)
**Risk:** Low

### Solution 3: Dynamic Documentation
Generate metrics sections from code/test output.

**Pros:** Always accurate
**Cons:** Complex, may be over-engineering
**Effort:** Large (1-2 days)
**Risk:** Medium

## Recommended Action

Implement Solution 1 immediately, then Solution 2 within the week.

## Technical Details

**Affected files:**
- /CLAUDE.md (primary)
- /docs/PRODUCTION_STATUS.md
- /shared/types/order.types.ts (source of truth for order states)

**Commands to verify:**
```bash
npm run test:quick  # Current test count
python3 scripts/validate_links.py  # Link health
grep -r "OrderStatus" shared/types/  # Order states
```

## Acceptance Criteria

- [ ] CLAUDE.md test count matches actual
- [ ] Link health percentage matches validate_links.py output
- [ ] Order status diagram shows all 8 states
- [ ] Import paths include @/ prefix where needed
- [ ] Logger path documented for both client and server
- [ ] Workspace versions synchronized

## Work Log

| Date | Action | Learning |
|------|--------|----------|
| 2025-11-24 | Created from /workflows:review analysis | Documentation drift is significant - 6 major discrepancies found |

## Resources

- [CLAUDE.md](/CLAUDE.md)
- [Order types](/shared/types/order.types.ts)
- [validate_links.py](/scripts/validate_links.py)
