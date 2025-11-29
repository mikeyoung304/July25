# Prevention Framework: Worktree and TODO System Maintenance

**Document Version**: 1.0
**Last Updated**: 2025-11-29
**Category**: Prevention | System Maintenance
**Related**: CL-WS-001, CL-MEM-001

---

## Executive Summary

This document establishes prevention strategies to eliminate recurring issues with:
- Git worktrees created for parallel work but not cleaned up
- TODO files duplicated (pending + completed versions)
- Test configurations not excluding temporary directories
- Stale worktree metadata causing repository pollution

**Expected Outcome**: Reduce worktree cleanup time from ad-hoc to automated, eliminate TODO file duplicates, and prevent test pollution through enforced configurations.

---

## 1. Worktree Lifecycle Management

### 1.1 When to Create Worktrees

**Criteria for Creating New Worktrees:**

```
CREATE a worktree when:
✓ Working on isolated features in parallel (e.g., feature-a while waiting for CI on feature-b)
✓ Implementing fixes without disrupting main development
✓ Running long-running tests without blocking local changes
✓ Collaborating on separate branches with different dependency versions

DO NOT create worktrees for:
✗ Single sequential tasks (use git checkout instead)
✗ Small bugfixes that complete in <30 minutes
✗ Changes that require coordinating with other developers
✗ Experimental branches you'll abandon
```

**Decision Tree:**

```
Need parallel work?
├─ YES → Will complete in <2 hours?
│  ├─ YES → Use git checkout (switch back when done)
│  └─ NO → Create worktree (follows cleanup protocol)
└─ NO → Use git checkout
```

### 1.2 Worktree Creation Protocol

**Command Reference:**

```bash
# Create worktree with clear naming
git worktree add .worktrees/feature-name origin/feature-name

# Create from new local branch
git worktree add .worktrees/fix/issue-123 -b fix/issue-123

# List active worktrees
git worktree list

# Check worktree status
git worktree repair  # Fix broken worktree references
```

**Naming Convention** (REQUIRED):

```
.worktrees/
├── feature/restaurant-search/        # Feature work
├── fix/issue-123-auth-bug/           # Bug fixes with issue number
├── bugfix/kds-integration/           # General bugfixes
├── test/e2e-payment-flow/            # Testing/validation
├── refactor/database-schema/         # Refactoring work
└── experiment/ai-recommendations/    # Experimental (temporary)
```

**Naming Rules:**
- Always use `.worktrees/` directory (not `.wts`, `.branches`, or root-level)
- Include category prefix: `feature/`, `fix/`, `test/`, `refactor/`, `experiment/`
- Use kebab-case for readability
- Max 50 characters for full path after `.worktrees/`
- Include issue numbers for tracked work: `fix/issue-123-`

### 1.3 Worktree Cleanup Protocol

**Cleanup Checklist** (Before merging branch):

```bash
# Step 1: Verify work is merged
git log origin/main --oneline | grep "feature-name"

# Step 2: Ensure no uncommitted changes
cd .worktrees/feature-name
git status

# Step 3: Switch away from worktree
cd ../..
git checkout main

# Step 4: Remove worktree
git worktree remove .worktrees/feature-name

# Step 5: Prune worktree references
git worktree prune
git gc --aggressive

# Step 6: Verify cleanup
git worktree list
ls -la .worktrees/  # Should not show feature-name
```

**Automated Cleanup Script** (`scripts/cleanup-worktrees.sh`):

```bash
#!/bin/bash

# Cleanup abandoned/merged worktrees
set -e

MAIN_REPO=$(pwd)
WORKTREE_DIR=".worktrees"

echo "Cleaning up stale worktrees..."

# Find worktrees with merged branches
git worktree list | tail -n +2 | while read -r path rest; do
    # Extract worktree name
    WORKTREE_NAME=$(basename "$path")

    # Check if branch is merged
    if cd "$path" && git merge-base --is-ancestor HEAD origin/main; then
        echo "Removing merged worktree: $WORKTREE_NAME"
        cd "$MAIN_REPO"
        git worktree remove "$path" --force
    else
        cd "$MAIN_REPO"
    fi
done

# Clean up broken worktree references
git worktree prune
git gc --aggressive

echo "Worktree cleanup complete"
```

**When Cleanup is Required:**

- After branch merge to main
- When worktree unused for >1 week
- Before major version upgrades
- Weekly maintenance cycle (Friday EOD)

### 1.4 Monitoring Stale Worktrees

**Daily Monitoring** (add to health check):

```bash
# Check for worktrees not updated in >7 days
git worktree list | while read -r path rest; do
    if [ "$path" != "$(pwd)" ]; then
        LAST_COMMIT=$(git -C "$path" log -1 --format=%ci 2>/dev/null || echo "0")
        DAYS_OLD=$(( ($(date +%s) - $(date -d "$LAST_COMMIT" +%s 2>/dev/null || echo 0)) / 86400 ))

        if [ "$DAYS_OLD" -gt 7 ]; then
            echo "WARNING: Stale worktree: $path ($DAYS_OLD days old)"
        fi
    fi
done
```

**CI Check** (`.github/workflows/worktree-health.yml`):

```yaml
name: Worktree Health Check

on:
  schedule:
    - cron: '0 9 * * MON'  # Monday mornings
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for stale worktrees
        run: |
          STALE_COUNT=$(git worktree list | grep -v "$(pwd)" | wc -l || echo 0)

          if [ "$STALE_COUNT" -gt 0 ]; then
            echo "::warning::Found $STALE_COUNT worktrees - cleanup may be needed"
            git worktree list
            exit 1
          fi
```

---

## 2. TODO System Discipline

### 2.1 Status Transition Protocol

**Official TODO Lifecycle:**

```
PENDING (created)
    ↓
IN_PROGRESS (started work)
    ↓
COMPLETED (task done, verified)
    ↓
DELETE original file
    ↓
[CLOSED - only completion record remains]
```

**Never:**
- Duplicate TODO files (pending + completed versions)
- Keep completed TODOs in the pending directory
- Leave files in .worktrees/ outside of git commits
- Create "backup" copies of TODO files

### 2.2 TODO File Structure

**Correct Format:**

```yaml
# .claude/todos/issue-123-auth-refactor.md
---
status: pending
created: 2025-11-29
updated: 2025-11-29
assignee: dev
priority: high
---

## Task: Refactor Auth Validation

### Description
Refactor authentication validation logic to support new PIN auth for stations.

### Acceptance Criteria
- [ ] Create dedicated auth validation module
- [ ] Add PIN validation tests
- [ ] Update KDS endpoint to use new validator
- [ ] Document PIN flow

### Resources
- Related Issue: #123
- Blocks: Feature X
- Depends on: Feature Y

### Work Log
- 2025-11-29: Created task
- 2025-11-29 14:30: Started implementation
```

**Status Transition:**

```yaml
# When starting work
status: in_progress
updated: 2025-11-29 14:30

# When complete
status: completed
completed_date: 2025-11-29 16:45
completion_notes: |
  - All criteria met
  - Tests passing (98% coverage)
  - Code reviewed and approved
```

**Cleanup Process:**

```bash
# 1. Mark as completed in TODO file
# 2. Commit with message: "docs(todos): mark issue-123 complete"
# 3. Create completion entry in .claude/solutions/
# 4. DELETE original TODO file
# 5. Verify deletion in git status
git add .claude/solutions/issue-123-solution.md
git rm .claude/todos/issue-123-auth-refactor.md
git commit -m "docs(todos): complete issue-123 - auth refactor"
```

### 2.3 TODO Directory Organization

**Structure:**

```
.claude/
├── todos/                           # ACTIVE TODOs only
│   ├── bug-fixes/
│   │   ├── kds-display-lag.md
│   │   └── order-validation-edge-case.md
│   ├── features/
│   │   ├── voice-ordering-v2.md
│   │   └── mobile-kds.md
│   ├── refactoring/
│   │   └── database-schema-v7.md
│   ├── infrastructure/
│   │   └── upgrade-nodejs-20.md
│   └── README.md                    # Index of active TODOs
│
├── solutions/                       # COMPLETED solutions
│   ├── 2025-11-29/
│   │   ├── issue-123-auth-refactor.md
│   │   └── issue-124-payment-fix.md
│   └── README.md                    # Index of solutions
│
├── lessons/                         # Lessons learned
│   ├── CL-AUTH-001-strict-auth-drift.md
│   ├── CL-DB-001-migration-sync.md
│   └── README.md
│
├── notes/                           # Temporary notes (not tracked)
│   └── .gitignore: *
│
├── prevention/                      # Prevention frameworks
│   ├── WORKTREE-TODO-MAINTENANCE.md
│   └── README.md
│
└── config/
    ├── eslint.json
    └── typescript.json
```

**No Files in Root:**
- Never leave TODO files in `.claude/` root
- Always organize by category or date
- Use README files for index/navigation

### 2.4 Weekly Triage Practices

**Weekly TODO Audit** (Every Friday, 30 min):

```bash
#!/bin/bash
# scripts/todo-audit.sh

echo "=== TODO System Audit ==="

# Check for stale TODOs (untouched >30 days)
echo "Stale TODOs (>30 days):"
find .claude/todos -name "*.md" -type f -mtime +30 | while read file; do
    echo "  - $(basename $file)"
done

# Check for TODO duplicates
echo "Duplicate TODO entries:"
find .claude/todos -name "*.md" | sort | uniq -d

# Check for completed items in pending
echo "Completed items in pending directory:"
grep -l "status: completed" .claude/todos/**/*.md 2>/dev/null

# Check for untracked files in .claude
echo "Untracked .claude files:"
git ls-files --others --exclude-standard .claude/

# Summary
echo "Active TODOs: $(find .claude/todos -name "*.md" | wc -l)"
echo "Completed this week: $(find .claude/solutions -newermt '7 days ago' -name "*.md" 2>/dev/null | wc -l)"
```

**Monthly Review** (First Monday of month):

1. Archive completed solutions older than 3 months
2. Review TODOs with no activity in 30+ days
3. Identify blocked items needing intervention
4. Update `.claude/todos/README.md` with current state

### 2.5 TODO File Cleanup Script

**Automated Cleanup** (`scripts/cleanup-todos.sh`):

```bash
#!/bin/bash

# Prevent accidental deletion
if [ "$1" != "--confirm" ]; then
    echo "This script will delete completed TODO files."
    echo "Run with --confirm flag to proceed"
    exit 0
fi

# Find and remove completed TODOs
DELETED=0
find .claude/todos -name "*.md" -type f | while read todo; do
    if grep -q "status: completed" "$todo"; then
        # Create solution record first
        BASENAME=$(basename "$todo")
        DATE=$(date +%Y-%m-%d)
        SOLUTION_DIR=".claude/solutions/$DATE"

        mkdir -p "$SOLUTION_DIR"
        cp "$todo" "$SOLUTION_DIR/$BASENAME"

        # Remove original
        rm "$todo"
        echo "Cleaned up: $BASENAME"
        DELETED=$((DELETED + 1))
    fi
done

echo "Deleted $DELETED completed TODO files"
git add .claude/
git commit -m "docs(todos): cleanup completed items ($(date +%Y-%m-%d))"
```

---

## 3. Test Configuration Best Practices

### 3.1 What Directories to Exclude

**Jest Configuration** (`jest.config.js`):

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],

  // CRITICAL: Exclude temporary directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.worktrees/',              // Parallel worktrees
    '/.claude/',                 // Documentation
    '/tmp/',                     // Temporary files
    '.*\\.tmp\\.test\\.',        // Temporary test files
  ],

  // Exclude from coverage reports
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],

  // Prevent test pollution
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
```

**TypeScript Test Config** (`tsconfig.test.json`):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/*.spec.ts",
    "src/**/*.spec.tsx"
  ],
  "exclude": [
    "node_modules",
    ".worktrees",
    ".claude",
    "dist",
    "build"
  ]
}
```

**Playwright Config** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  // Exclude directories
  testIgnore: [
    '**/.worktrees/**',
    '**/.claude/**',
    '**/node_modules/**',
  ],

  // Prevent test artifacts from polluting repo
  outputDir: 'test-results/',

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.2 Pre-commit Hook for Test Cleanup

**`.husky/pre-commit`:**

```bash
#!/usr/bin/env bash

# Prevent committing test artifacts from worktrees
BLOCKED_PATTERNS=(
    ".worktrees/*/coverage/"
    ".worktrees/*/dist/"
    ".worktrees/*/node_modules/"
    ".claude/**/test-results/"
    "*.tmp.test.*"
)

echo "Checking for test pollution..."

for pattern in "${BLOCKED_PATTERNS[@]}"; do
    FOUND=$(git diff --cached --name-only | grep "$pattern" || true)
    if [ -n "$FOUND" ]; then
        echo "ERROR: Attempted to commit test artifacts:"
        echo "$FOUND"
        echo ""
        echo "These directories should be excluded from git:"
        for file in $FOUND; do
            echo "  git rm --cached '$file'"
        done
        exit 1
    fi
done

npm run typecheck:quick
npm run test:quick
```

### 3.3 .gitignore Standards

**Root `.gitignore`:**

```gitignore
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
build/
.next/
out/

# Testing
coverage/
.nyc_output/
test-results/
*.lcov

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Environment
.env.local
.env.*.local
.DS_Store

# CRITICAL: Worktree outputs
.worktrees/**/dist/
.worktrees/**/coverage/
.worktrees/**/node_modules/
.worktrees/**/.next/

# Temporary files
*.tmp
*.tmp.*
/tmp/

# Editor backups
*.orig
*.rej
```

**Worktree-Specific `.gitignore`** (`.worktrees/.gitignore`):

```gitignore
# All worktree-local artifacts
coverage/
dist/
.next/
build/
node_modules/
test-results/

# Lock files (should use main repo's)
package-lock.json
yarn.lock

# IDE
.vscode/
.idea/

# Environment (each worktree gets its own .env)
.env
.env.local
.env.test.local
```

---

## 4. Automation Opportunities

### 4.1 Pre-commit Hook for Worktree Health

**`.husky/pre-commit` Enhancement:**

```bash
#!/usr/bin/env bash

echo "Running pre-commit checks..."

# 1. Worktree health check
echo "Checking worktree integrity..."
git worktree repair 2>/dev/null || true

# 2. Prevent committing TODO duplicates
echo "Checking for TODO duplicates..."
if git ls-files --stage .claude/todos | awk '{print $4}' | sort | uniq -d | grep -q . ; then
    echo "ERROR: Duplicate TODO files detected"
    exit 1
fi

# 3. Prevent committing unfinalized TODOs
echo "Checking TODO status..."
if git diff --cached --name-only .claude/todos | xargs grep -l "status: pending" 2>/dev/null; then
    echo "WARNING: Committing pending TODOs (ensure they're intentional)"
fi

# 4. Verify no .worktrees commits
WORKTREE_FILES=$(git diff --cached --name-only | grep "^\.worktrees/" | wc -l)
if [ "$WORKTREE_FILES" -gt 0 ]; then
    echo "ERROR: Attempted to commit .worktrees/ files"
    echo "These should be in main repo, not worktrees"
    exit 1
fi

# Continue with other checks...
npm run typecheck:quick
npm run test:quick
```

### 4.2 GitHub Actions Workflow for Worktree Cleanup

**`.github/workflows/worktree-maintenance.yml`:**

```yaml
name: Worktree Maintenance

on:
  schedule:
    # Every Friday at 5 PM
    - cron: '0 17 * * FRI'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for merged worktrees
        run: |
          echo "Checking for merged worktrees..."
          git worktree list

      - name: Report stale worktrees
        run: |
          STALE=$(git log --all --diff-filter=D --summary | \
            grep "delete mode" | \
            grep ".worktrees" | wc -l)

          if [ "$STALE" -gt 0 ]; then
            echo "::notice::Found $STALE potentially stale worktrees"
            echo "Run cleanup script: npm run cleanup:worktrees"
          fi

      - name: Create issue for stale worktrees
        if: env.STALE > 0
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Worktree Maintenance: Cleanup Needed',
              body: 'Automated check detected stale worktrees. Run `npm run cleanup:worktrees`',
              labels: ['maintenance', 'automation']
            })
```

### 4.3 npm Scripts for Automation

**`package.json` Scripts:**

```json
{
  "scripts": {
    "cleanup:worktrees": "bash scripts/cleanup-worktrees.sh",
    "cleanup:todos": "bash scripts/cleanup-todos.sh --confirm",
    "audit:todos": "bash scripts/todo-audit.sh",
    "maintenance": "npm run cleanup:worktrees && npm run audit:todos && npm run health",
    "health": "npm run typecheck && npm run lint && npm run test:quick"
  }
}
```

### 4.4 Git Hooks Framework

**Complete Hooks Setup:**

```bash
#!/bin/bash
# scripts/setup-hooks.sh

echo "Setting up git hooks..."

# Pre-commit checks
cat > .husky/pre-commit << 'EOF'
#!/bin/bash
set -e

echo "Running pre-commit checks..."

# 1. Worktree health
git worktree repair 2>/dev/null || true

# 2. TODO validation
echo "Validating TODOs..."
if find .claude/todos -name "*.md" -exec grep -q "status: completed" {} \; 2>/dev/null; then
    echo "ERROR: Completed TODOs found in pending directory"
    exit 1
fi

# 3. No .worktrees in commits
if git diff --cached --name-only | grep -q "^\.worktrees/"; then
    echo "ERROR: Cannot commit .worktrees/ files"
    exit 1
fi

# 4. Run tests
npm run test:quick || exit 1
EOF

chmod +x .husky/pre-commit

# Post-merge cleanup
cat > .husky/post-merge << 'EOF'
#!/bin/bash

# Clean up worktrees of merged branches
echo "Cleaning up merged worktrees..."
git worktree list | tail -n +2 | while read -r path rest; do
    if cd "$path" && git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
        cd - > /dev/null
        git worktree remove "$path" 2>/dev/null || true
    else
        cd - > /dev/null
    fi
done

# Prune stale references
git worktree prune
EOF

chmod +x .husky/post-merge

echo "Git hooks configured successfully"
```

---

## 5. Implementation Checklist

### Phase 1: Immediate (Week 1)

- [ ] Document current worktree state
- [ ] Create `.worktrees/.gitignore`
- [ ] Add cleanup scripts to `scripts/`
- [ ] Update `.gitignore` with worktree exclusions
- [ ] Set up `.husky/pre-commit` hooks

### Phase 2: Short-term (Week 2-3)

- [ ] Organize `.claude/todos/` by category
- [ ] Move completed TODOs to `.claude/solutions/`
- [ ] Add npm scripts for maintenance
- [ ] Configure Jest/Playwright test ignores
- [ ] Create GitHub Actions workflows

### Phase 3: Long-term (Month 2+)

- [ ] Establish weekly triage cadence
- [ ] Monitor worktree creation patterns
- [ ] Refine prevention strategies based on metrics
- [ ] Document lessons learned in `.claude/lessons/`
- [ ] Build team practices around worktrees/TODOs

---

## 6. Monitoring and Metrics

### Health Metrics to Track

```bash
# Weekly metrics
- Active worktrees: (should be 0-3)
- Stale worktrees: (should be 0)
- Pending TODOs: (should trend toward 0)
- Completed solutions: (archive after 3 months)
- Pre-commit hook pass rate: (should be >99%)
```

### Dashboard Script

```bash
#!/bin/bash
# scripts/system-health.sh

echo "=== Worktree and TODO System Health ==="
echo ""

# Worktree metrics
echo "Worktree Status:"
ACTIVE=$(git worktree list | tail -n +2 | wc -l)
echo "  Active worktrees: $ACTIVE"
if [ "$ACTIVE" -gt 3 ]; then
    echo "  WARNING: More than 3 active worktrees"
fi

# TODO metrics
echo ""
echo "TODO Status:"
PENDING=$(find .claude/todos -name "*.md" 2>/dev/null | wc -l)
COMPLETED=$(find .claude/solutions -newermt '7 days ago' -name "*.md" 2>/dev/null | wc -l)
echo "  Pending TODOs: $PENDING"
echo "  Completed this week: $COMPLETED"

# Test exclusion check
echo ""
echo "Test Configuration:"
JEST_CONFIG="jest.config.js"
if grep -q ".worktrees" "$JEST_CONFIG"; then
    echo "  Jest: Properly excluding .worktrees/"
else
    echo "  Jest: WARNING - .worktrees/ not excluded"
fi

echo ""
echo "Health check complete"
```

---

## 7. Troubleshooting Guide

### Issue: Broken Worktree References

```bash
# Solution 1: Repair
git worktree repair

# Solution 2: Force remove
git worktree remove .worktrees/broken-branch --force

# Solution 3: Manual cleanup
rm -rf .worktrees/broken-branch
rm -rf .git/worktrees/broken-branch-uuid
git gc --aggressive
```

### Issue: Duplicate TODO Files

```bash
# Find duplicates
find .claude -name "*.md" | sort | uniq -d

# Remove completed copies
grep -l "status: completed" .claude/todos/**/*.md | while read f; do
    BASENAME=$(basename "$f")
    # Check if completed version exists in solutions
    if find .claude/solutions -name "$BASENAME" 2>/dev/null; then
        rm "$f"
        echo "Removed duplicate: $f"
    fi
done
```

### Issue: Test Pollution from Worktree

```bash
# Clean worktree artifacts
cd .worktrees/feature-name
npm run clean  # Removes dist, coverage, node_modules
rm -rf .next build test-results

# Rebuild clean
npm install
npm run build
npm test
```

---

## 8. Related Documentation

- **Git Worktree Docs**: https://git-scm.com/docs/git-worktree
- **TODO System Guide**: See `.claude/todos/README.md`
- **Test Configuration**: See `jest.config.js`, `playwright.config.ts`
- **Pre-commit Hooks**: See `.husky/pre-commit`

---

## Appendix A: Reference Commands

```bash
# Worktree Management
git worktree add .worktrees/feature-name origin/feature-name
git worktree list
git worktree repair
git worktree remove .worktrees/feature-name
git worktree prune

# TODO Management
npm run audit:todos
npm run cleanup:todos --confirm
npm run maintenance

# System Health
npm run health
bash scripts/system-health.sh
bash scripts/todo-audit.sh

# Cleanup
npm run cleanup:worktrees
git gc --aggressive
```

---

**Document Control**
Approved: 2025-11-29
Review Cycle: Quarterly
Owner: Development Team
