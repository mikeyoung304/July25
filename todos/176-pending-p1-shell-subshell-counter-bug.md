# TODO-176: Shell scripts lose counter variables in piped subshells

## Status: pending
## Priority: P1 (Critical - audit/cleanup reports show wrong counts)
## Category: build-errors
## Tags: shell, bash, subshell, pipes

## Problem Statement

Multiple shell scripts use `command | while read` pattern which runs the loop in a subshell. Variables modified inside the loop are lost when the subshell exits.

**Affected Files:**
- `scripts/cleanup-todos.sh` lines 39, 65, 105
- `scripts/todo-audit.sh` line 33
- `scripts/cleanup-worktrees.sh` line 35
- `scripts/system-health.sh` line 46

**Example (cleanup-todos.sh:39):**
```bash
find "$TODO_DIR" -name "*.md" -type f | while read -r todo_file; do
    ARCHIVED=$((ARCHIVED + 1))  # This increment is lost!
done
# After loop: ARCHIVED still = 0
```

**Impact:**
- Cleanup reports show "0 items archived" when items were actually archived
- Audit reports show incorrect todo counts
- System health reports show wrong worktree counts

## Proposed Solution

Use process substitution instead of pipes:

```bash
# Before (broken):
find "$TODO_DIR" -name "*.md" -type f | while read -r todo_file; do
    ARCHIVED=$((ARCHIVED + 1))
done

# After (works):
while read -r todo_file; do
    ARCHIVED=$((ARCHIVED + 1))
done < <(find "$TODO_DIR" -name "*.md" -type f)
```

## Files to Fix

1. `scripts/cleanup-todos.sh` - 3 while loops
2. `scripts/todo-audit.sh` - 1 while loop
3. `scripts/cleanup-worktrees.sh` - 1 while loop
4. `scripts/system-health.sh` - 1 while loop

## Acceptance Criteria

- [ ] Run `scripts/cleanup-todos.sh` and verify counts are correct
- [ ] Run `scripts/todo-audit.sh` and verify counts match actual files
- [ ] Run `scripts/cleanup-worktrees.sh` and verify merge count is accurate
- [ ] All scripts use process substitution instead of pipes for counting loops

## Related

- CL-BUILD-003: Shell script platform issues
