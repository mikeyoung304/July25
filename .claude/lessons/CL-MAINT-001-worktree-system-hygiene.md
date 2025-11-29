# CL-MAINT-001: Worktree System Hygiene and Test Pollution

**Severity:** P1 | **Impact:** 311 test failures | **Disk waste:** 84MB | **Detection:** System audit

## Problem

Stale and dead git worktrees accumulated over time, causing cascading issues:

1. **Dead worktree references** - `git worktree list` shows unreachable paths
2. **Stale active worktrees** - 20 commits behind main, 84MB disk usage, uncommitted changes
3. **Test pollution** - Vitest discovers and runs tests from worktree directories, causing 311 failures
4. **TODO system corruption** - Duplicate TODO files with conflicting pending/completed states
5. **Missing .gitignore entries** - Worktree directories not excluded from version control
6. **Configuration gaps** - Vitest configs don't exclude worktree paths

**Root cause:** No cleanup policy for abandoned worktrees + configuration assumptions about directory structure.

## Bug Pattern

```bash
# Symptom 1: Dead worktree reference
$ git worktree list
/path/to/.worktrees/mcp          (detached HEAD 12345678) [prunable]

# Symptom 2: Stale worktree with uncommitted changes
$ git worktree list
/path/to/.worktrees/voice-ordering-agent  20 commits behind, 84MB, M (modified)

# Symptom 3: Test pollution - vitest discovers tests outside project
$ npm test
FAIL [311/311] client/tests/...
  └─ 300+ failures from .worktrees/voice-ordering-agent/client/tests/

# Symptom 4: Duplicate TODO files
$ ls -la .claude/todos/
006-*.md (pending)  006-*.md (completed)  <- conflicting state
013-*.md (pending)  013-*.md (completed)  <- conflicting state
015-*.md (pending)  015-*.md (completed)  <- conflicting state
031-*.md (pending)  031-*.md (completed)  <- conflicting state

# Symptom 5: No .gitignore protection
$ cat .gitignore
# Missing: .worktrees/, .conductor/
```

## Fix Pattern

```bash
# Step 1: Clean up dead worktree references
git worktree prune

# Step 2: Remove stale active worktrees
git worktree remove --force .worktrees/voice-ordering-agent
# Use --force only if changes are unneeded (verify first)

# Step 3: Add .gitignore entries
cat >> .gitignore << 'EOF'

# Worktree directories (development only, never committed)
.worktrees/
.conductor/
EOF

# Step 4: Update vitest.config.ts for all workspaces
# In client/vitest.config.ts and server/vitest.config.ts:
defineConfig({
  test: {
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      '.worktrees',    // Add this
      '.conductor',    // Add this
    ],
  },
})

# Step 5: Verify tests no longer discover worktree tests
npm test
# Should see only project tests, not 311 failures

# Step 6: Clean up TODO file duplicates
# Remove conflicting duplicate entries, keep ONE authoritative version
rm .claude/todos/006-*-(completed).md
rm .claude/todos/013-*-(completed).md
rm .claude/todos/015-*-(completed).md
rm .claude/todos/031-*-(completed).md
```

## Prevention Checklist

- [ ] Run `git worktree prune` monthly or before CI/CD
- [ ] Add `.worktrees/` and `.conductor/` to `.gitignore`
- [ ] Update vitest configs to exclude `.worktrees` and `.conductor`
- [ ] Document worktree creation process in CONTRIBUTING.md
- [ ] Add git hook to warn on stale worktrees
- [ ] TODO system uses monotonic file naming with no duplicates
- [ ] Verify no tests run from `.worktrees/` in CI/CD
- [ ] Add monitoring for disk usage of `.worktrees/` directory

## Detection

```bash
# Check for dead references
git worktree list | grep '\[prunable\]'

# Check for stale worktrees
git worktree list  # Look for modified (M) or >10 commits behind

# Find test pollution
npm test 2>&1 | grep -c '.worktrees/'  # Should be 0

# Verify .gitignore
grep -E '\.worktrees|\.conductor' .gitignore

# Check TODO duplicates
find .claude/todos -name '*.md' | sort | uniq -d

# Monitor disk usage
du -sh .worktrees/
du -sh .conductor/
```

## Affected Files

- `.gitignore` (missing entries)
- `client/vitest.config.ts` (no exclusion)
- `server/vitest.config.ts` (no exclusion)
- `.claude/todos/*` (duplicate entries: 006, 013, 015, 031)
- `.git/worktrees/*` (dead references)

## Follow-up

When creating new worktrees in future development:

```bash
# Good practice
git worktree add .worktrees/feature-name
# Then add to .gitignore if not already there

# Track stale worktrees
# Before closing a worktree, ensure:
# 1. Changes are merged to main or stashed
# 2. No uncommitted work is lost
# 3. Run: git worktree remove .worktrees/feature-name

# Cleanup before deployment
git worktree prune
git gc --aggressive
```

## Related Incidents

- CL-TEST-001: Test mock drift from interfaces (testing strategy)
- CL-BUILD-001: Vercel deployment issues (CI/CD hygiene)
- CL-MEM-001: Memory leaks (system resource management)

## Timeline

- **Detection:** System audit revealed 311 test failures
- **Root cause analysis:** 20-commit-old worktree with 84MB disk waste
- **Solution:** Prune dead references, remove stale worktrees, update configs, gitignore
- **Verification:** Tests now pass (0 worktree pollution), disk reclaimed
