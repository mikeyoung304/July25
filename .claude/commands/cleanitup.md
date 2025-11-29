---
name: cleanitup
description: Quick alias for /maintain full - clean worktrees, TODOs, verify health
argument-hint: ""
---

# Clean It Up!

Quick maintenance command. Alias for `/maintain full`.

## What It Does

1. **Worktrees**: Prune dead refs, identify stale branches
2. **TODOs**: Find duplicates, archive completed, flag stale items
3. **Tests**: Verify no pollution from worktrees
4. **Configs**: Check .gitignore and vitest exclusions

## Workflow

Execute the full maintenance workflow from `/maintain`:

### Step 1: Assessment

Check system health:
- `git worktree list` - Find stale/dead worktrees
- Count TODOs by status
- Check for duplicate TODO files
- Verify config exclusions

### Step 2: Cleanup

With user confirmation:
- `git worktree prune` - Remove dead references
- Remove stale worktrees (>7 days old, merged to main)
- Archive completed TODOs (>7 days old)
- Remove duplicate TODO files (keep completed, remove pending)

### Step 3: Verify

Confirm cleanup worked:
- Re-run health checks
- Run quick test suite
- Generate final health score

## Health Score Target

**Goal: 90%+**

Deductions for:
- Stale worktrees (-10 each)
- Duplicate TODOs (-10 each)
- Missing config exclusions (-15)
- Test pollution (-20)

## Key Paths

```
Worktrees:     .worktrees/, .conductor/
TODOs:         todos/*.md
Configs:       .gitignore, vitest.config.ts, client/vitest.config.ts
Docs:          .claude/lessons/CL-MAINT-001-worktree-system-hygiene.md
```

## Quick Commands Reference

```bash
# Worktree cleanup
git worktree prune
git worktree list
git worktree remove .worktrees/[name] --force

# TODO audit
ls todos/*pending* | wc -l
ls todos/*.md | cut -d'-' -f1 | sort | uniq -d

# Config check
grep ".worktrees" .gitignore
grep "worktrees" vitest.config.ts
```

## When to Run

- **Weekly** (Fridays): Regular maintenance
- **Before deploys**: Ensure clean state
- **After parallel agent work**: Clean up worktrees
- **When tests fail mysteriously**: Check for pollution

## See Also

- `/maintain` - Full maintenance with options (quick/full/report)
- `/resolve_todo_parallel` - Resolve pending TODOs
- `.claude/lessons/CL-MAINT-001-worktree-system-hygiene.md` - Background
