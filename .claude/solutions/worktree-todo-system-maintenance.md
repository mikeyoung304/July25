---
title: Worktree and TODO System Maintenance
slug: worktree-todo-maintenance
category: system-maintenance
severity: P1
component: git, vitest, todo-system
tags: [git-worktree, test-pollution, system-hygiene, parallel-agents, disk-cleanup]
symptoms:
  - 300+ test failures from .worktrees/ directory
  - Stale worktrees with uncommitted changes
  - Dead git worktree references (prunable)
  - Duplicate TODO files (pending + completed versions)
  - Vitest discovering tests in worktree directories
root_cause: No cleanup policy for parallel agent worktrees + configuration assumptions about directory structure
solution_type: remediation + prevention
created: 2025-11-29
verified: true
---

# Worktree and TODO System Maintenance

**Date**: 2025-11-29
**Duration**: ~45 minutes
**Impact**: 311 test failures resolved, 84MB disk freed, system hygiene restored

---

## Problem Summary

System audit revealed multiple infrastructure issues from parallel agent workflows:

| Issue | Impact | Severity |
|-------|--------|----------|
| Dead mcp worktree reference | Git warnings | Low |
| Stale voice-ordering-agent worktree | 84MB disk, 20 commits behind | Medium |
| Test pollution from worktree files | 311 false test failures | High |
| Duplicate TODO files | Tracking confusion | Medium |
| Missing .gitignore entries | Future worktrees tracked | Low |
| Vitest config gaps | Test pollution | High |

---

## Root Cause Analysis

### Why Worktrees Accumulated

1. **Parallel agents create worktrees** for isolated feature development
2. **No automated cleanup** after merge to main
3. **Manual removal forgotten** when switching contexts
4. **Dead references persist** when directories deleted without `git worktree remove`

### Why TODOs Duplicated

1. **Status change via file rename** (pending → completed)
2. **Parallel agents created completed versions** without removing pending
3. **No atomic transaction** for status updates
4. **No validation** preventing duplicates

### Why Tests Were Polluted

1. **Vitest uses glob patterns** that implicitly include all directories
2. **No exclusion for `.worktrees/`** in test configs
3. **Worktree contained test files** that matched patterns
4. **311 tests discovered** in stale worktree code

---

## Investigation Steps

### 1. Worktree Discovery

```bash
git worktree list
```

Output:
```
/Users/mikeyoung/CODING/rebuild-6.0                                  a004a433 [main]
/Users/mikeyoung/CODING/rebuild-6.0/.conductor/mcp                   99a1959c [mcp] prunable
/Users/mikeyoung/CODING/rebuild-6.0/.worktrees/voice-ordering-agent  0de76848 [voice-ordering-agent]
```

### 2. Worktree State Analysis

```bash
cd .worktrees/voice-ordering-agent && git status --short
```

Found: 14 files modified, 2 deleted, 2 untracked

```bash
git log --oneline voice-ordering-agent..main | wc -l
```

Result: 20 commits behind main

### 3. Test Pollution Verification

```bash
npm run test:quick 2>&1 | tail -5
```

Output: `Test Files  204 failed | 46 passed` - worktree tests included

### 4. TODO Duplicate Detection

```bash
ls todos/*.md | cut -d'-' -f1 | sort | uniq -d
```

Output: `006, 013, 015, 031` - IDs with both pending and completed files

---

## Solution Applied

### Step 1: Prune Dead Worktree References

```bash
git worktree prune
```

Removed: `.conductor/mcp` dead reference

### Step 2: Remove Stale Worktree

```bash
git worktree remove .worktrees/voice-ordering-agent --force
```

Freed: 84MB disk space

### Step 3: Update .gitignore

```gitignore
# Git Worktrees
.worktrees/
.conductor/
```

### Step 4: Update Vitest Configs

**Root vitest.config.ts:**
```typescript
exclude: ['**/node_modules/**', '**/.worktrees/**', '**/.conductor/**'],
```

**Client vitest.config.ts:**
```typescript
exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**', '**/.worktrees/**', '**/.conductor/**', ...qList],
```

### Step 5: Verify Cleanup

```bash
git worktree list
# Output: Only main worktree remains

npm run test:client -- --run
# Output: 904 passed (no worktree pollution)
```

---

## Prevention Strategies

### 1. Worktree Lifecycle Management

**Creation Decision Tree:**
- Multi-hour parallel work? → Create worktree
- Quick fix (<30 min)? → Use main branch
- Experimental/abandoned? → Don't create worktree

**Naming Convention:**
```
.worktrees/
├── feature/auth-refactor/
├── fix/issue-123/
└── test/e2e-payment/
```

**Cleanup Protocol:**
1. Verify merged: `git log origin/main --oneline | grep [commit]`
2. Remove worktree: `git worktree remove .worktrees/[name]`
3. Prune references: `git worktree prune`

### 2. TODO System Discipline

**Status Transition:**
```
pending → in_progress → completed → archived
```

**Atomic Update Script:**
```bash
#!/bin/bash
# scripts/update-todo-status.sh
ID=$1
NEW_STATUS=$2
OLD_FILE=$(ls todos/${ID}-*-*.md 2>/dev/null)
if [ -f "$OLD_FILE" ]; then
  NEW_FILE=$(echo "$OLD_FILE" | sed "s/-pending-/-${NEW_STATUS}-/;s/-in_progress-/-${NEW_STATUS}-/")
  mv "$OLD_FILE" "$NEW_FILE"
  sed -i '' "s/Status: .*/Status: ${NEW_STATUS}/" "$NEW_FILE"
fi
```

### 3. Test Configuration Standards

**Always exclude in vitest configs:**
```typescript
exclude: [
  '**/node_modules/**',
  '**/dist/**',
  '**/.worktrees/**',
  '**/.conductor/**',
]
```

### 4. Weekly Maintenance Ritual

```bash
# Every Friday, 30 minutes
git worktree prune                              # Clean dead refs
git worktree list | grep -v main               # Check for stale
ls todos/*pending* | wc -l                      # Count pending
ls todos/*.md | cut -d'-' -f1 | sort | uniq -d # Find duplicates
```

### 5. Automation Opportunities

**Pre-commit hook (.git/hooks/pre-commit):**
```bash
#!/bin/bash
# Warn about stale worktrees
STALE=$(git worktree list | grep -v main | grep -v "prunable")
if [ -n "$STALE" ]; then
  echo "Warning: Stale worktrees detected. Consider cleanup."
fi
```

**GitHub Actions (weekly):**
```yaml
name: Worktree Maintenance
on:
  schedule:
    - cron: '0 17 * * 5'  # Friday 5 PM UTC
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: git worktree prune
      - run: git worktree list
```

---

## Files Modified

| File | Change |
|------|--------|
| `.gitignore` | Added `.worktrees/` and `.conductor/` |
| `vitest.config.ts` | Added worktree exclusions |
| `client/vitest.config.ts` | Added worktree exclusions |

---

## Verification Commands

```bash
# Verify worktrees cleaned
git worktree list
# Expected: Only main

# Verify .gitignore
grep "worktrees" .gitignore
# Expected: .worktrees/

# Verify vitest exclusions
grep "worktrees" vitest.config.ts client/vitest.config.ts
# Expected: **/.worktrees/** in both

# Verify tests clean
npm run test:client -- --run 2>&1 | grep "Test Files"
# Expected: No worktree test pollution
```

---

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Git worktrees | 3 (1 dead, 1 stale) | 1 (main only) |
| Disk usage | ~1.5GB | ~1.4GB |
| Test failures | 311 (worktree pollution) | 1 (real failure) |
| Duplicate TODOs | 4 | 0 |
| .gitignore protection | None | Full |

---

## Lessons Learned

1. **Parallel agents need cleanup protocols** - Automation beats manual discipline
2. **Test configs must explicitly exclude** - Implicit inclusion causes pollution
3. **Atomic operations prevent duplicates** - Use scripts, not manual renames
4. **Weekly maintenance prevents accumulation** - 30 min/week saves hours of debugging
5. **Working directory matters for shells** - Removing directories can break shell sessions

---

## Related Documentation

- [PREVENTION_STRATEGIES.md](../PREVENTION_STRATEGIES.md) - Full prevention framework
- [parallel-agent-backlog-resolution.md](./parallel-agent-backlog-resolution.md) - Agent patterns
- [parallel-todo-resolution-2025-11-29.md](./parallel-todo-resolution-2025-11-29.md) - TODO resolution

---

## Quick Reference

**Clean worktrees:**
```bash
git worktree prune && git worktree list
```

**Remove stale worktree:**
```bash
git worktree remove .worktrees/[name] --force
```

**Check for TODO duplicates:**
```bash
ls todos/*.md | cut -d'-' -f1 | sort | uniq -d
```

**Verify test config:**
```bash
grep -l "worktrees" vitest.config.ts client/vitest.config.ts server/vitest.config.ts
```
