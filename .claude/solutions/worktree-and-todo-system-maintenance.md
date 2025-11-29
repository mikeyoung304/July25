---
title: Git Worktree and TODO System Maintenance
slug: worktree-todo-system-maintenance
category: infrastructure-patterns
severity: critical
component: Build system, test configuration, TODO tracking
tags: [git-worktrees, test-isolation, backlog-management, ci-cd-hygiene]
symptoms:
  - Test pollution from stale worktrees (311 unexpected failures)
  - Disk waste from dead/abandoned worktrees (84MB+)
  - Duplicate TODO tracking causing confusion
  - Worktree tests implicitly included in main test runs
root_cause: Parallel agents create worktrees but cleanup is not automated; TODO system creates both pending and completed versions
solution_type: infrastructure-maintenance
created: 2025-11-29
verified: true
---

# Git Worktree and TODO System Maintenance

**Date**: 2025-11-29
**Context**: Parallel agent architecture for backlog resolution requires systematic worktree cleanup and TODO status tracking
**Scope**: Restaurant OS (rebuild-6.0) and other monorepos using parallel agent patterns

---

## Problem Summary

### 1. Stale Worktree Accumulation

When parallel agents create git worktrees for feature development, cleanup is not automated:

```bash
# Example: Voice ordering agent creates worktree
git worktree add .worktrees/voice-ordering-agent

# Agent completes work, merges to main
# But .worktrees directory lingers
# ...20 commits later, it's "stale"
```

**Impacts**:
- Test runner implicitly includes worktree test files
- 311 test failures from unrelated worktree code
- 84MB+ disk waste (node_modules in stale worktrees)
- CI/CD pipeline pollution
- Confusing test output (what failed? main tests or worktree tests?)

### 2. Duplicate TODO File States

TODO system creates separate files for pending and completed states:

```
todos/
├── 001-pending-p0-voice-checkout.md     ← Original
├── 001-completed-p0-voice-checkout.md   ← Status file
├── 002-pending-p1-kds-layout.md
├── 002-completed-p1-kds-layout.md       ← Creates confusion
└── ...
```

**Impacts**:
- Both versions exist simultaneously during status transition
- Developers unclear which is "source of truth"
- Git diff shows duplicate files
- Directory becomes cluttered
- Archival is manual and error-prone

### 3. Test Config Inconsistency

Worktree exclusions are inconsistent across test configurations:

```typescript
// Root vitest.config.ts
exclude: ['**/node_modules/**', '**/.worktrees/**', '**/.conductor/**']

// Client vitest.config.ts
exclude: [...'**/.worktrees/**', '**/.conductor/**']

// Server vitest.config.ts
exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**', ...qList]
// ❌ MISSING worktree exclusions!
```

**Impact**: Server tests can still discover worktree test files

---

## Investigation & Discovery

### Step 1: Verify Worktree Status

```bash
# Check all worktrees
git worktree list

# Expected output:
# /Users/mikeyoung/CODING/rebuild-6.0                      28e1234abc detached
# /Users/mikeyoung/CODING/rebuild-6.0/.worktrees/voice-ordering-agent 20 commits behind
#   ├─ Status: Working directory (uncommitted changes)
#   └─ Size: 84MB (includes node_modules)

# Identify "dead" worktrees (referenced but non-existent)
git worktree list | grep "^[[:space:]]"  # Dead worktrees shown with leading space
```

### Step 2: Analyze Test Pollution

```bash
# Examine which tests failed
npm test 2>&1 | grep -E "FAIL|PASS" | head -20

# Check if failures are from worktree paths
npm test 2>&1 | grep ".worktrees"
# Output: If any, test discovery is picking up worktree tests

# Verify vitest configs
grep -r "exclude.*worktree" client/ server/ vitest.config.ts
```

### Step 3: Audit TODO Directory

```bash
# Find duplicate TODO files
ls -la todos/ | grep -E "pending.*completed"

# Count by status
echo "Pending:" && ls todos/*pending* 2>/dev/null | wc -l
echo "Completed:" && ls todos/*completed* 2>/dev/null | wc -l
echo "Deferred:" && ls todos/*deferred* 2>/dev/null | wc -l

# Identify files with both pending and completed versions
for base in $(ls todos/*pending* 2>/dev/null | sed 's/-pending-/-/'); do
  if [ -f "${base/-/completed-}" ]; then
    echo "DUPLICATE: $(basename $base)"
  fi
done
```

### Step 4: Check .gitignore Configuration

```bash
# Verify worktree entries
grep -A2 "# Git Worktrees" .gitignore
# Expected: .worktrees/ and .conductor/

# Verify they're not accidentally tracked
git status | grep "\.worktrees\|\.conductor"
# Should show: nothing to commit
```

---

## Root Cause Analysis

### Why Worktrees Accumulate

1. **Automated Creation**: Parallel agents use `git worktree add` for isolation
2. **Manual Cleanup**: No automated removal script
3. **Merge Blindness**: Agent merges changes to main but doesn't delete worktree
4. **Stale Time Tracking**: No "age" monitoring for unused worktrees
5. **Dead Reference Leaks**: Deleted directories leave git metadata behind

### Why TODO Duplication Occurs

1. **Rename Strategy**: Status changes via file rename (pending → completed)
2. **Transition Period**: Both files exist during rename operation
3. **No Atomic Operation**: If interrupted, both persist
4. **Manual Archival**: Old files not automatically moved to archive/
5. **Discovery Issue**: `ls todos/` shows both versions

---

## Working Solution

### Part 1: Worktree Cleanup

#### 1A: Immediate Cleanup (One-time)

```bash
# Step 1: Identify dead worktrees
git worktree list

# Step 2: Prune dead references
git worktree prune
# This removes metadata for deleted worktree directories

# Step 3: Remove stale worktree (force if needed)
git worktree remove .worktrees/voice-ordering-agent --force
# Use --force if:
# - Worktree has uncommitted changes
# - Worktree is in detached HEAD state
# - Normal removal fails

# Step 4: Verify cleanup
git worktree list  # Should be empty or show only active worktree
du -sh .worktrees/ 2>/dev/null  # Should be much smaller or gone
```

#### 1B: Prevent Future Accumulation (Permanent)

**Option A: CI/CD Scheduled Cleanup**

Create `.github/workflows/worktree-cleanup.yml`:

```yaml
name: Periodic Worktree Cleanup

on:
  schedule:
    # Every Monday at 9 AM
    - cron: '0 9 * * 1'
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup-worktrees:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for worktree commands

      - name: Prune dead worktree references
        run: git worktree prune

      - name: List remaining worktrees
        run: |
          echo "Active worktrees:"
          git worktree list || echo "No worktrees"

      - name: Verify test isolation
        run: |
          echo "Checking for orphaned worktree directories..."
          find .worktrees -type d -mtime +7 2>/dev/null && \
            echo "WARNING: Found stale worktrees (>7 days old)" || \
            echo "No stale worktrees found"

      - name: Validate repo health
        run: |
          git status
          echo "Repo is clean"
```

**Option B: Developer Pre-Commit Hook**

Create `.git/hooks/pre-commit` (or `scripts/hooks/pre-commit`):

```bash
#!/bin/bash
# Pre-commit hook: Verify worktree isolation

# Check if we're in a worktree
if [ -f .git/worktree ]; then
  echo "Running from worktree. Pre-commit check skipped."
  exit 0
fi

# Check for stale worktrees (older than 7 days)
stale=$(find .worktrees -type d -mtime +7 2>/dev/null)
if [ -n "$stale" ]; then
  echo "WARNING: Stale worktrees detected (>7 days):"
  echo "$stale"
  echo ""
  echo "Run this to clean up:"
  echo "  git worktree prune"
  echo "  git worktree remove <path> --force"
fi

# Don't block commit, just warn
exit 0
```

**Option C: Manual Cleanup Script**

Create `scripts/cleanup-worktrees.sh`:

```bash
#!/bin/bash
set -e

WORKTREES_DIR=".worktrees"
DAYS_OLD=7

echo "=== Git Worktree Cleanup Script ==="
echo ""

# Step 1: Prune dead references
echo "1. Pruning dead worktree references..."
git worktree prune
echo "   ✓ Complete"
echo ""

# Step 2: Find and remove stale worktrees
echo "2. Checking for stale worktrees (>$DAYS_OLD days old)..."
if [ -d "$WORKTREES_DIR" ]; then
  stale_count=$(find "$WORKTREES_DIR" -type d -mtime +$DAYS_OLD 2>/dev/null | wc -l)

  if [ "$stale_count" -gt 0 ]; then
    echo "   Found $stale_count stale worktree(s):"
    find "$WORKTREES_DIR" -type d -mtime +$DAYS_OLD -exec ls -ld {} \;
    echo ""
    echo "   Removing stale worktrees..."
    find "$WORKTREES_DIR" -type d -mtime +$DAYS_OLD -exec git worktree remove {} --force \; 2>/dev/null || true
    echo "   ✓ Cleaned up"
  else
    echo "   ✓ No stale worktrees found"
  fi
else
  echo "   ✓ No worktrees directory"
fi
echo ""

# Step 3: Final prune
echo "3. Final prune..."
git worktree prune
echo "   ✓ Complete"
echo ""

# Step 4: Summary
echo "=== Summary ==="
echo "Active worktrees:"
git worktree list || echo "  (none)"
echo ""
echo "Disk usage:"
du -sh "$WORKTREES_DIR" 2>/dev/null || echo "  (no worktrees directory)"
```

Usage:
```bash
chmod +x scripts/cleanup-worktrees.sh
scripts/cleanup-worktrees.sh

# Or run as part of CI/CD
npm run clean:worktrees
```

Add to `package.json`:
```json
{
  "scripts": {
    "clean:worktrees": "bash scripts/cleanup-worktrees.sh",
    "clean": "npm run clean:worktrees && rm -rf node_modules dist"
  }
}
```

### Part 2: Fix Test Configuration Exclusions

**Update server/vitest.config.ts:**

```typescript
import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const qFile = join(__dirname, 'tests', 'quarantine.list');
const qList = existsSync(qFile)
  ? readFileSync(qFile, 'utf8')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  : [];

export default defineConfig({
  resolve: {
    alias: {
      'shared': resolve(__dirname, '../shared')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // ADD worktree and conductor exclusions
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/quarantine/**',
      '**/.worktrees/**',      // ← ADD THIS
      '**/.conductor/**',       // ← ADD THIS
      ...qList
    ],
    passWithNoTests: true,
    setupFiles: ['./tests/bootstrap.ts'],
  },
});
```

**Verify consistency across all vitest configs:**

```bash
# Check all configs have worktree exclusions
for config in vitest.config.ts client/vitest.config.ts server/vitest.config.ts; do
  echo "=== $config ==="
  grep -A5 "exclude:" "$config" | grep -E "worktree|conductor" && echo "✓" || echo "✗ MISSING"
done
```

### Part 3: Update .gitignore

**Verify .gitignore has proper entries:**

```bash
# Check existing entries
grep -A2 "# Git Worktrees" .gitignore

# Expected output:
# # Git Worktrees
# .worktrees/
# .conductor/
```

If missing, add to `.gitignore`:

```bash
cat >> .gitignore << 'EOF'

# Git Worktrees
.worktrees/
.conductor/
EOF
```

### Part 4: TODO System Cleanup & Automation

#### 4A: Identify Duplicate TODO Files

```bash
#!/bin/bash
# scripts/todo-audit.sh - Find duplicate TODO states

echo "=== TODO System Audit ==="
echo ""

# Find all unique base names (without status)
for file in todos/*-pending-*.md todos/*-completed-*.md todos/*-deferred-*.md; do
  [ -f "$file" ] || continue

  # Extract base name without status
  base=$(basename "$file" | sed -E 's/-[a-z]+-([a-z0-9-]+)\.md/-\1.md/')

  # Count how many status versions exist
  count=$(ls "todos"/*-*-"$base" 2>/dev/null | wc -l)

  if [ "$count" -gt 1 ]; then
    echo "DUPLICATE: $base"
    ls "todos"/*-*-"$base" | while read f; do
      echo "  - $(basename $f)"
    done
  fi
done
```

#### 4B: Status Update Protocol (Atomic)

When TODO status changes, use this protocol to prevent duplication:

```bash
#!/bin/bash
# scripts/update-todo-status.sh - Atomically update TODO status

TODO_ID=$1
NEW_STATUS=$2
# NEW_STATUS should be: pending, in-progress, blocked, completed, deferred

if [ -z "$TODO_ID" ] || [ -z "$NEW_STATUS" ]; then
  echo "Usage: $0 <TODO_ID> <pending|in-progress|blocked|completed|deferred>"
  exit 1
fi

# Find current file
current=$(ls todos/"$TODO_ID"-*-*.md 2>/dev/null | head -1)
if [ ! -f "$current" ]; then
  echo "ERROR: TODO $TODO_ID not found"
  exit 1
fi

# Extract metadata
filename=$(basename "$current")
# Format: NNN-status-priority-category-title.md
# Split by hyphens, excluding the title (which may contain hyphens)
id=$(echo "$filename" | cut -d- -f1)
priority=$(echo "$filename" | cut -d- -f3)
category=$(echo "$filename" | cut -d- -f4)
title=$(echo "$filename" | cut -d- -f5- | sed 's/.md$//')

# Create new filename
new_file="todos/${id}-${NEW_STATUS}-${priority}-${category}-${title}.md"

# Update status in file
sed -i.bak "s/^- \*\*Status\*\*:.*/- **Status**: $NEW_STATUS/" "$current"
sed -i.bak "s/^- \*\*Updated\*\*:.*/- **Updated**: $(date -u +'%Y-%m-%dT%H:%M:%SZ')/" "$current"

# Rename file (atomic in POSIX)
mv "$current" "$new_file"
rm -f "${current}.bak" "${new_file}.bak"

echo "✓ Updated TODO-$id to status: $NEW_STATUS"
echo "  File: $new_file"
```

Usage:
```bash
./scripts/update-todo-status.sh 001 completed
# Output: ✓ Updated TODO-001 to status: completed
#         File: todos/001-completed-p0-voice-checkout.md
```

#### 4C: Prevent Incomplete Status Updates

Add pre-commit hook check:

```bash
# .git/hooks/pre-commit (add this check)

# Check for TODO files with duplicate statuses
duplicates=$(find todos/ -type f -name "*.md" | \
  sed 's/-[a-z-]*-p[0-3]-//' | \
  sort | uniq -d)

if [ -n "$duplicates" ]; then
  echo "ERROR: Duplicate TODO files detected (incomplete status update):"
  echo "$duplicates"
  echo ""
  echo "Run: git rm <old-file> && git add <new-file>"
  exit 1
fi

exit 0
```

#### 4D: Monthly TODO Cleanup Automation

Create `.github/workflows/todo-maintenance.yml`:

```yaml
name: TODO System Maintenance

on:
  schedule:
    # First Monday of month at 9 AM
    - cron: '0 9 2-8 * 1'
  workflow_dispatch:

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Detect duplicate TODO files
        run: |
          echo "=== Detecting Duplicate TODO Files ==="
          duplicates=0
          for file in todos/*-pending-*.md todos/*-completed-*.md; do
            [ -f "$file" ] || continue
            base=$(basename "$file" | sed 's/-pending-\|-completed-/-/')
            count=$(ls todos/*-*-"$base" 2>/dev/null | wc -l)
            if [ "$count" -gt 1 ]; then
              echo "DUPLICATE: $base"
              duplicates=$((duplicates + 1))
            fi
          done

          if [ "$duplicates" -gt 0 ]; then
            echo "Found $duplicates duplicate TODO files"
            echo "REQUIRES MANUAL REVIEW AND CLEANUP"
            exit 1
          fi
          echo "✓ No duplicates found"

      - name: Verify worktree exclusions
        run: |
          echo "=== Checking Test Configuration ==="
          grep -q "\.worktrees" vitest.config.ts && echo "✓ Root config OK" || echo "✗ Root missing"
          grep -q "\.worktrees" client/vitest.config.ts && echo "✓ Client config OK" || echo "✗ Client missing"
          grep -q "\.worktrees" server/vitest.config.ts && echo "✓ Server config OK" || echo "✗ Server missing"

      - name: Check for stale worktrees
        run: |
          echo "=== Checking for Stale Worktrees ==="
          if [ -d ".worktrees" ]; then
            stale=$(find .worktrees -type d -mtime +7 2>/dev/null | wc -l)
            if [ "$stale" -gt 0 ]; then
              echo "WARNING: $stale stale worktree(s) detected (>7 days old)"
              echo "REQUIRES MANUAL CLEANUP"
              exit 1
            fi
          fi
          echo "✓ No stale worktrees"
```

---

## Implementation Checklist

### Immediate Actions (One-time)

- [ ] **Remove Stale Worktrees**
  ```bash
  git worktree prune
  git worktree remove .worktrees/voice-ordering-agent --force
  ```

- [ ] **Update server/vitest.config.ts**
  - Add `'**/.worktrees/**'` and `'**/.conductor/**'` to exclude array
  - Verify syntax

- [ ] **Run Full Test Suite**
  ```bash
  npm test
  # Verify no 311 failures from worktree code
  ```

- [ ] **Fix Duplicate TODO Files**
  ```bash
  # For any duplicates found:
  git rm todos/[ID]-completed-*.md   # Keep pending version
  git add -A
  git commit -m "docs(todos): consolidate duplicate TODO files"
  ```

### Permanent Infrastructure (Ongoing)

- [ ] **Add Cleanup Script**
  ```bash
  # Create scripts/cleanup-worktrees.sh
  chmod +x scripts/cleanup-worktrees.sh
  npm run clean:worktrees  # Test it
  ```

- [ ] **Add CI/CD Workflows**
  - `.github/workflows/worktree-cleanup.yml` (weekly)
  - `.github/workflows/todo-maintenance.yml` (monthly)

- [ ] **Update Pre-Commit Hooks**
  - `.git/hooks/pre-commit` checks for duplicates
  - Hook checks for stale worktrees

- [ ] **Document in Team Wiki**
  - When parallel agents should create worktrees
  - When to run cleanup
  - TODO status update protocol

---

## Verification & Testing

### Verify Worktree Isolation

```bash
# Step 1: Create test worktree
git worktree add .worktrees/test-isolation test-branch

# Step 2: Run tests - should NOT include worktree tests
npm test 2>&1 | tee /tmp/test-output.txt

# Step 3: Check output
grep ".worktrees" /tmp/test-output.txt && echo "✗ FAILED: Tests discovered worktree code" || echo "✓ PASSED: No worktree tests"

# Step 4: Cleanup
git worktree remove .worktrees/test-isolation
git worktree prune
```

### Verify TODO Status Updates

```bash
# Step 1: Create test TODO
cat > todos/999-pending-p3-test-status-update.md << 'EOF'
# 999-pending-p3-test-status-update

## Metadata
- **Status**: pending
- **Updated**: 2025-11-29T00:00:00Z
EOF

# Step 2: Update status
./scripts/update-todo-status.sh 999 completed

# Step 3: Verify
[ -f "todos/999-completed-p3-test-status-update.md" ] && echo "✓ PASSED: File renamed" || echo "✗ FAILED"
! [ -f "todos/999-pending-p3-test-status-update.md" ] && echo "✓ PASSED: Old file deleted" || echo "✗ FAILED"

# Step 4: Cleanup
rm todos/999-completed-p3-test-status-update.md
```

---

## Code Examples

### Example 1: Clean Worktree After Agent Completes

```bash
#!/bin/bash
# scripts/parallel-agent-workflow.sh

BRANCH=$1
AGENT_NAME=$2

echo "=== Parallel Agent Workflow ==="
echo "Branch: $BRANCH"
echo "Agent: $AGENT_NAME"
echo ""

# Step 1: Create isolated worktree
echo "1. Creating worktree for isolation..."
worktree_path=".worktrees/$AGENT_NAME"
git worktree add "$worktree_path" "$BRANCH"
echo "   ✓ Worktree: $worktree_path"
echo ""

# Step 2: Work in worktree (agent does this)
echo "2. [AGENT WORK] Developing in worktree..."
# cd "$worktree_path"
# ... agent makes changes ...
# git add . && git commit -m "..."
# cd - (return to main)
echo "   ✓ Changes committed"
echo ""

# Step 3: Push and merge
echo "3. Pushing and merging..."
git -C "$worktree_path" push origin HEAD:$BRANCH
gh pr create --base main --head $BRANCH --auto-merge
echo "   ✓ PR merged"
echo ""

# Step 4: Clean up worktree
echo "4. Cleaning up worktree..."
git worktree remove "$worktree_path" --force
git worktree prune
echo "   ✓ Worktree removed"
echo ""

echo "=== Complete ==="
```

### Example 2: Verify Test Isolation During CI/CD

```bash
#!/bin/bash
# .github/workflows/test-isolation.yml (inline step)

echo "Verifying test isolation..."

# Run tests and capture output
test_output=$(npm test 2>&1 || true)

# Check for worktree mentions
if echo "$test_output" | grep -q "\.worktrees\|\.conductor"; then
  echo "ERROR: Tests discovered worktree code"
  echo "$test_output" | grep "\.worktrees\|\.conductor" | head -5
  exit 1
fi

echo "✓ Tests are isolated from worktree code"
```

### Example 3: Atomic TODO Status Update

```typescript
// utils/todo-status-updater.ts
import { promises as fs } from 'fs';
import { join } from 'path';

type TodoStatus = 'pending' | 'in-progress' | 'blocked' | 'completed' | 'deferred';

export async function updateTodoStatus(todoId: string, newStatus: TodoStatus) {
  const todosDir = join(process.cwd(), 'todos');

  // Find current file
  const files = await fs.readdir(todosDir);
  const currentFile = files.find(f => f.startsWith(`${todoId}-`));

  if (!currentFile) {
    throw new Error(`TODO ${todoId} not found`);
  }

  const currentPath = join(todosDir, currentFile);
  const content = await fs.readFile(currentPath, 'utf8');

  // Parse filename
  const match = currentFile.match(/^(\d+)-([\w-]+)-(p[0-3])-([\w-]+)-([\w-]+)\.md$/);
  if (!match) {
    throw new Error(`Invalid TODO filename: ${currentFile}`);
  }

  const [, id, oldStatus, priority, category, title] = match;
  const newFilename = `${id}-${newStatus}-${priority}-${category}-${title}.md`;
  const newPath = join(todosDir, newFilename);

  // Update content
  const now = new Date().toISOString();
  const updatedContent = content
    .replace(/^- \*\*Status\*\*:.*$/m, `- **Status**: ${newStatus}`)
    .replace(/^- \*\*Updated\*\*:.*$/m, `- **Updated**: ${now}`);

  // Write to new file
  await fs.writeFile(newPath, updatedContent, 'utf8');

  // Delete old file
  await fs.unlink(currentPath);

  console.log(`✓ Updated TODO-${id}: ${oldStatus} → ${newStatus}`);
  console.log(`  File: ${newFilename}`);
}
```

---

## Prevention Strategy

### Automatic Worktree Cleanup

**Schedule weekly cleanup:**
```bash
# Add to system cron or CI/CD scheduler
0 9 * * 1 /path/to/rebuild-6.0/scripts/cleanup-worktrees.sh
```

### Pre-Merge Checklist for Parallel Agents

When merging PR from parallel agent:
- [ ] Worktree is removed from `.worktrees/`
- [ ] `git worktree prune` has been run
- [ ] No `node_modules/` in committed worktree directory
- [ ] TODO status files have been consolidated

### TODO Status Update Protocol

Before committing TODO status changes:
- [ ] Old file (pending) is removed
- [ ] New file (completed) is created
- [ ] No duplicate `.md` files for same TODO ID
- [ ] Metadata updated (Status field, Updated timestamp)

---

## Lessons Learned

### 1. Worktree Cleanup Must Be Explicit

Don't rely on developers to remember cleanup. Automate it:
- Weekly scheduled job
- Pre-commit hook warnings
- CI/CD verification

### 2. Test Configuration Needs Consistent Exclusions

All test runners (root, client, server) must exclude:
- `**/.worktrees/**`
- `**/.conductor/**`

Inconsistency causes test discovery to include worktree code.

### 3. File Rename Operations Need Atomicity

Never do:
```bash
# ✗ Wrong: Creates duplicate temporarily
cp pending.md completed.md
rm pending.md
```

Always do:
```bash
# ✓ Correct: Atomic rename
mv pending.md completed.md
```

Or use script that handles both file operations.

### 4. TODO System Needs Archive Pattern

Instead of deleting completed/deferred TODOs:
```
todos/pending/        ← Active items
todos/completed/      ← Done, kept for history
todos/deferred/       ← Intentionally deferred
archive/              ← Old completed items (move quarterly)
```

This prevents duplication and provides history.

---

## Troubleshooting

### Problem: Can't Remove Worktree (Permission Denied)

```bash
# Use --force flag
git worktree remove .worktrees/voice-ordering-agent --force
```

### Problem: Worktree Still Shows After Removal

```bash
# Prune orphaned references
git worktree prune

# Verify
git worktree list
```

### Problem: Tests Still Finding Worktree Code

```bash
# Check exclude patterns
grep -n "exclude" vitest.config.ts server/vitest.config.ts

# Add missing patterns
# Pattern should be: '**/.worktrees/**' or '**/node_modules/**'

# Re-run tests
npm test
```

### Problem: TODO Duplicate Files After Status Update

```bash
# Check what files exist
ls -la todos/ | grep "001-"

# Remove the old one manually
rm todos/001-pending-p0-voice-checkout.md

# Commit the correction
git add todos/
git commit -m "docs(todos): remove duplicate TODO file"
```

---

## References

### Git Worktree Documentation
- `git help worktree` - Official git documentation
- `git worktree list` - List all worktrees
- `git worktree prune` - Clean up stale worktree references
- `git worktree remove` - Remove a worktree

### Vitest Configuration
- `vitest.config.ts` - Root test configuration
- `client/vitest.config.ts` - Client test configuration
- `server/vitest.config.ts` - Server test configuration

### Related Solutions
- [parallel-agent-backlog-resolution.md](./parallel-agent-backlog-resolution.md) - Parallel agent orchestration pattern
- [parallel-todo-resolution-2025-11-29.md](./parallel-todo-resolution-2025-11-29.md) - TODO resolution session details

---

## Summary

This solution provides a **three-part approach** to maintaining healthy worktree and TODO systems in parallel agent architectures:

1. **Worktree Cleanup**: Automated pruning + consistent test exclusions
2. **TODO Status Management**: Atomic file operations + no duplicates
3. **Permanent Infrastructure**: CI/CD workflows + developer tooling + hooks

**Expected Outcome**:
- Zero stale worktrees in repository
- Clean test output (no worktree test pollution)
- Reduced disk usage (no orphaned node_modules)
- TODO system clearly shows only one state per item
- Prevents 311+ test failures from implicit worktree discovery

**Implementation Time**: 30 minutes (immediate) + 1 hour (infrastructure)

---

**Document Control**
- **Version**: 1.0
- **Created**: 2025-11-29
- **Status**: Active (established pattern)
- **Owner**: Infrastructure Team
- **Related**: Parallel Agent Architecture, TODO Prevention Framework
