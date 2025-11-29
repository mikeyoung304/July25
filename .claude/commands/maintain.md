---
name: maintain
description: Weekly system maintenance - clean worktrees, TODOs, and verify health
argument-hint: "[optional: full|quick|report]"
---

# System Maintenance Command

Perform weekly system hygiene for rebuild-6.0. This command handles worktree cleanup, TODO system maintenance, test verification, and generates a health report.

## Modes

- **quick** (default): Fast health check, no changes
- **full**: Complete maintenance with cleanup
- **report**: Generate detailed health report only

## Workflow

### Phase 1: Health Assessment

Run diagnostic checks to understand current system state:

```
1. Git Worktrees
   - List all worktrees: `git worktree list`
   - Identify prunable references
   - Check for stale worktrees (>7 days, >10 commits behind)
   - Calculate disk usage of .worktrees/

2. TODO System
   - Count by status: pending, in_progress, completed, deferred
   - Identify duplicates (same ID, different status)
   - Find stale items (pending >30 days)
   - Check for invalid status in filenames vs content

3. Test Configuration
   - Verify .gitignore has worktree exclusions
   - Verify vitest configs exclude .worktrees/
   - Run quick test to check for pollution

4. Disk Usage
   - Check node_modules sizes
   - Check .worktrees/ size
   - Check dist/ sizes
```

### Phase 2: Generate Report

Output a health score and summary:

```
## System Health Report

**Date**: [current date]
**Score**: [0-100]%

### Worktrees
- Active: X
- Stale: X
- Dead references: X
- Disk usage: XMB

### TODOs
- Pending: X (P0: X, P1: X, P2: X, P3: X)
- In Progress: X
- Completed (not archived): X
- Duplicates: X
- Stale (>30d): X

### Test Health
- Pollution detected: Yes/No
- Config exclusions: OK/Missing

### Recommendations
1. [Action items based on findings]
```

### Phase 3: Cleanup (full mode only)

If running in `full` mode, perform actual cleanup:

```bash
# 1. Prune dead worktree references
git worktree prune

# 2. Remove stale worktrees (with confirmation)
# For each stale worktree, ask user before removing

# 3. Archive completed TODOs
# Move completed TODOs older than 7 days to .archive/

# 4. Remove duplicate TODO files
# Keep completed version, remove pending duplicates

# 5. Verify test configs
# Add missing exclusions if needed
```

### Phase 4: Verification

After cleanup, re-run health check to confirm improvements:

```
- Re-count worktrees
- Re-count TODOs
- Run test suite to verify no pollution
- Generate final health score
```

## Key Files and Directories

**Worktree Locations:**
- `.worktrees/` - Feature worktrees
- `.conductor/` - MCP worktrees

**TODO Location:**
- `todos/*.md` - Active TODO files

**Config Files:**
- `.gitignore` - Should include `.worktrees/`, `.conductor/`
- `vitest.config.ts` - Root test config
- `client/vitest.config.ts` - Client test config
- `server/vitest.config.ts` - Server test config

**Documentation:**
- `.claude/lessons/CL-MAINT-001-worktree-system-hygiene.md` - Maintenance lesson
- `.claude/solutions/worktree-todo-system-maintenance.md` - Full solution docs
- `.claude/PREVENTION_STRATEGIES.md` - Prevention framework
- `.claude/BACKLOG_QUICK_REFERENCE.md` - TODO management guide

## Health Score Calculation

```
Base: 100 points

Deductions:
- Each stale worktree (>7 days): -10 points
- Each dead worktree reference: -5 points
- Each duplicate TODO: -10 points
- Each stale TODO (>30 days): -2 points
- Missing .gitignore entries: -15 points
- Missing vitest exclusions: -15 points
- Test pollution detected: -20 points

Thresholds:
- 90-100: Excellent - System healthy
- 70-89: Good - Minor maintenance needed
- 50-69: Fair - Schedule cleanup soon
- <50: Poor - Immediate maintenance required
```

## Automation Integration

This command aligns with the weekly maintenance ritual:

**Every Friday, 30 minutes:**
1. Run `/maintain quick` - See current state
2. Review recommendations
3. Run `/maintain full` if score < 90
4. Commit any config changes

**Monthly (first Monday):**
1. Run `/maintain report` - Generate full report
2. Archive old completed TODOs
3. Review deferred items
4. Update prevention strategies if needed

## Example Usage

```
/maintain              # Quick health check (default)
/maintain quick        # Same as above
/maintain full         # Full cleanup with changes
/maintain report       # Detailed report only, no changes
```

## Success Criteria

After running `/maintain full`:
- Health score >= 90%
- Zero stale worktrees
- Zero duplicate TODOs
- Zero test pollution
- All configs have worktree exclusions

## Related Commands

- `/resolve_todo_parallel` - Resolve pending TODOs in parallel
- `/workflows:codify` - Document solutions
- `/changelog` - Generate changelog for recent work
