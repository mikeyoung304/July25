# Implementation Guide: Worktree and TODO System Prevention

**Purpose**: Step-by-step guide to implement the prevention strategies outlined in WORKTREE-TODO-MAINTENANCE.md

**Timeline**: Phase 1 (Week 1) + Phase 2 (Week 2-3) + Phase 3 (Month 2+)

---

## Phase 1: Immediate Setup (Week 1)

### Step 1.1: Create Directory Structure

```bash
# Create prevention framework directory
mkdir -p .claude/prevention
mkdir -p .claude/todos/{bug-fixes,features,refactoring,infrastructure}
mkdir -p .claude/solutions

# Create .worktrees with gitignore
mkdir -p .worktrees
# .worktrees/.gitignore already created by this guide
```

### Step 1.2: Create Cleanup Scripts

All scripts are already created in `/scripts/`:
- `cleanup-worktrees.sh` - Removes merged/broken worktrees
- `cleanup-todos.sh` - Archives completed TODOs
- `todo-audit.sh` - Weekly health audit
- `system-health.sh` - Quick health check
- `setup-hooks.sh` - Configure git hooks

Make scripts executable:

```bash
chmod +x scripts/cleanup-worktrees.sh
chmod +x scripts/cleanup-todos.sh
chmod +x scripts/todo-audit.sh
chmod +x scripts/system-health.sh
chmod +x scripts/setup-hooks.sh
```

### Step 1.3: Update .gitignore

Add to root `.gitignore`:

```gitignore
# Worktree outputs (already have .worktrees/.gitignore but add to root too)
.worktrees/**/dist/
.worktrees/**/coverage/
.worktrees/**/node_modules/
.worktrees/**/.next/
.worktrees/**/test-results/

# Temporary files
*.tmp
*.tmp.*
/tmp/

# .claude notes (temporary, not tracked)
.claude/notes/
```

### Step 1.4: Set Up Git Hooks

```bash
# Install and configure husky
./scripts/setup-hooks.sh

# Verify hooks are installed
ls -la .husky/
# Should show: pre-commit, post-merge
```

### Step 1.5: Test Pre-commit Hooks

```bash
# Try to stage a file from .worktrees (should fail)
touch .worktrees/test.txt
git add .worktrees/test.txt
# Expected: "ERROR: Cannot commit .worktrees/ files"

# Clean up test
git reset
rm .worktrees/test.txt
```

### Step 1.6: Document Current State

```bash
# Take snapshot of current state
./scripts/system-health.sh > /tmp/baseline-health.txt

# List current worktrees
git worktree list > /tmp/baseline-worktrees.txt

# Check TODO status
find .claude/todos -name "*.md" 2>/dev/null | wc -l > /tmp/baseline-todos.txt
```

### Step 1.7: Initial Commit

```bash
git add .claude/prevention/ .worktrees/.gitignore scripts/

# Verify pre-commit hooks work
git commit -m "feat(prevention): establish worktree and TODO system maintenance framework

This establishes comprehensive prevention strategies for:
- Worktree lifecycle management
- TODO system discipline
- Test configuration best practices
- Automation via scripts and GitHub Actions

Includes:
- Prevention framework documentation
- Cleanup and audit scripts
- Git hooks for validation
- TODO directory structure

See .claude/prevention/README.md for details"
```

---

## Phase 2: Short-term Implementation (Week 2-3)

### Step 2.1: Organize Existing TODOs

```bash
# If you have existing TODO/task files:
# 1. Move them to .claude/todos/
# 2. Add status: pending/in_progress/completed
# 3. Add created: YYYY-MM-DD
# 4. Organize by subdirectory

# Example structure after cleanup:
.claude/todos/
├── bug-fixes/
│   ├── issue-123-kds-lag.md
│   └── issue-124-order-validation.md
├── features/
│   ├── voice-ordering-v2.md
│   └── mobile-kds.md
├── refactoring/
│   └── database-schema.md
└── README.md
```

**TODO Template:**

```yaml
---
status: pending
created: 2025-11-29
updated: 2025-11-29
priority: high
category: bug-fixes
---

## Title

### Description


### Acceptance Criteria
- [ ]

### Resources


### Work Log
```

### Step 2.2: Archive Completed TODOs

```bash
# Find any existing completed work
grep -r "status: completed" .claude/todos/ 2>/dev/null || echo "None found"

# Archive completed items
./scripts/cleanup-todos.sh --confirm

# Verify structure
ls -la .claude/solutions/
```

### Step 2.3: Create TODO Index Files

**`.claude/todos/README.md`:**

```markdown
# Active TODOs

Index of current work items organized by category.

## Bug Fixes
[List items]

## Features
[List items]

## Refactoring
[List items]

## Infrastructure
[List items]

---

Updated: YYYY-MM-DD
Total Active: X

See .claude/prevention/README.md for TODO management guidelines.
```

**`.claude/solutions/README.md`:**

```markdown
# Completed Solutions

Archive of completed work items organized by date.

## Latest (2025-11-29)
[List items]

## Previous (2025-11-28)
[List items]

---

Total Archived: X items

These are solutions that have been completed and are retained for reference.
See .claude/prevention/README.md for TODO management guidelines.
```

### Step 2.4: Update npm Scripts

Update `package.json` with maintenance scripts:

```json
{
  "scripts": {
    "cleanup:worktrees": "bash scripts/cleanup-worktrees.sh",
    "cleanup:todos": "bash scripts/cleanup-todos.sh --confirm",
    "audit:todos": "bash scripts/todo-audit.sh",
    "health": "bash scripts/system-health.sh",
    "maintenance": "npm run cleanup:worktrees && npm run audit:todos && npm run health"
  }
}
```

### Step 2.5: Create GitHub Actions Workflow

Workflow already created at `.github/workflows/worktree-maintenance.yml`

Verify it's in place:

```bash
ls -la .github/workflows/worktree-maintenance.yml

# Trigger a test run
gh workflow run worktree-maintenance.yml --repo [your-repo]
```

### Step 2.6: Verify Test Configurations

**Check Jest** (`jest.config.js`):

```javascript
module.exports = {
  // ... existing config
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.worktrees/',    // ADD THIS
    '/.claude/',        // ADD THIS
    '/tmp/',            // ADD THIS
  ],
  // ... rest of config
};
```

**Check Playwright** (`playwright.config.ts`):

```typescript
testIgnore: [
  '**/.worktrees/**',
  '**/.claude/**',
  '**/node_modules/**',
],
```

### Step 2.7: Phase 2 Commit

```bash
git add .claude/todos/README.md .claude/solutions/README.md package.json jest.config.js playwright.config.ts

git commit -m "docs(prevention): organize TODO system and update test configurations

- Create TODO directory structure with categories
- Archive existing completed items
- Add npm scripts for maintenance automation
- Update Jest and Playwright to exclude worktrees
- Add TODO and solutions index files

See .claude/prevention/README.md for details"
```

---

## Phase 3: Long-term Practices (Month 2+)

### Step 3.1: Establish Weekly Cadence

**Friday EOD Ritual** (30 minutes):

```bash
# 1. Audit TODO system
./scripts/todo-audit.sh

# 2. Archive completed TODOs
./scripts/cleanup-todos.sh --confirm

# 3. Check system health
./scripts/system-health.sh

# 4. Update TODO index
# (manually review and update .claude/todos/README.md)

# 5. Commit changes
git add .claude/
git commit -m "docs(todos): weekly maintenance and audit $(date +%Y-%m-%d)"
```

### Step 3.2: Monitor Worktree Lifecycle

**When creating worktree:**

```bash
# Use standard naming
git worktree add .worktrees/feature/descriptive-name origin/feature/descriptive-name

# Track in work log
# Add TODO item referencing the worktree if needed
```

**When completing worktree:**

```bash
# Ensure work is merged
git log origin/main --oneline | grep "commit message"

# Delete worktree
git worktree remove .worktrees/feature/descriptive-name

# Archive related TODOs
./scripts/cleanup-todos.sh --confirm
```

### Step 3.3: Monthly Review

**First Monday of month** (1 hour):

```bash
# 1. Review stale TODOs
./scripts/todo-audit.sh

# 2. Archive old solutions (>3 months)
find .claude/solutions -mtime +90 -type d | while read dir; do
    echo "Archive: $dir"
    tar -czf "$dir.tar.gz" "$dir"
    rm -rf "$dir"
done

# 3. Review and update prevention framework
# - Add lessons learned
# - Update procedures based on recent issues
# - Refine automation

# 4. Update this guide
# - Document any process changes
# - Update timelines
```

### Step 3.4: Quarterly Review

**Quarterly** (meeting):

```bash
# 1. Review prevention framework effectiveness
# 2. Collect team feedback on processes
# 3. Update WORKTREE-TODO-MAINTENANCE.md
# 4. Identify new prevention opportunities
# 5. Commit updates
```

---

## Metrics and Monitoring

### Health Score Baseline

After Phase 1, establish baseline:

```bash
./scripts/system-health.sh

# Expected baseline (healthy system):
# - Active worktrees: 0-2
# - Stale worktrees: 0
# - Pending TODOs: <20
# - Health score: >80
```

### Track Over Time

```bash
# Create metrics file
cat > /tmp/health-metrics.txt << 'EOF'
Date,ActiveWorktrees,StaleTODOs,HealthScore
2025-11-29,1,0,95
EOF

# Run weekly
./scripts/system-health.sh >> /tmp/health-metrics.txt

# Review monthly for trends
```

### Automated Monitoring

GitHub Actions workflow runs:
- Every Friday 5 PM UTC
- Creates issues for maintenance needs
- Can be triggered manually: `gh workflow run worktree-maintenance.yml`

---

## Troubleshooting Implementation

### Issue: Pre-commit hooks failing

**Symptom**: "Pre-commit checks failed"

**Solution**:
```bash
# Check which checks are failing
git diff --cached --name-only

# Fix issues:
# - Remove .worktrees/ files: git reset .worktrees/
# - Move completed TODOs: ./scripts/cleanup-todos.sh --confirm
# - Remove test artifacts: git reset

# Retry
git commit -m "message"
```

### Issue: Worktree stuck in broken state

**Symptom**: `git worktree list` shows broken references

**Solution**:
```bash
# Repair worktree database
git worktree repair

# If that doesn't work, force clean
git worktree remove .worktrees/broken-branch --force
git gc --aggressive
```

### Issue: Test pollution from worktrees

**Symptom**: Tests fail with "file not found" in .worktrees/

**Solution**:
```bash
# Update Jest/Playwright config
# Ensure .worktrees/ is in testPathIgnorePatterns

# Clean worktree artifacts
cd .worktrees/feature-name
rm -rf coverage dist .next node_modules build test-results
npm install
```

---

## Success Criteria

### Phase 1 Success
- [ ] All scripts installed and executable
- [ ] Git hooks configured and tested
- [ ] .gitignore properly updated
- [ ] Initial baseline captured
- [ ] Team notified of new processes

### Phase 2 Success
- [ ] TODO system organized and documented
- [ ] npm scripts added and working
- [ ] GitHub Actions workflow running
- [ ] Test configurations updated
- [ ] Weekly cadence established

### Phase 3 Success
- [ ] Weekly maintenance becoming routine
- [ ] Health metrics improving or stable
- [ ] Team following worktree/TODO disciplines
- [ ] Automated checks catching issues
- [ ] Minimal manual maintenance needed

---

## Rollout Timeline

### Week 1 (Immediate)
- [ ] Phase 1 implementation
- [ ] Team training on new workflows
- [ ] Initial baseline metrics

### Week 2-3 (Short-term)
- [ ] Phase 2 implementation
- [ ] TODO system organization
- [ ] Test configuration updates
- [ ] First full maintenance cycle

### Month 2+ (Long-term)
- [ ] Phase 3 establishment
- [ ] Weekly/monthly practices
- [ ] Metrics monitoring
- [ ] Continuous improvement

---

## Questions and Support

For questions about implementation:

1. **Reference documentation**: `.claude/prevention/WORKTREE-TODO-MAINTENANCE.md`
2. **Quick reference**: `.claude/prevention/README.md`
3. **Script help**: Run scripts with `--help` or see script headers
4. **Team discussion**: Discuss in team meeting/Slack

---

**Document Control**
Created: 2025-11-29
Last Reviewed: 2025-11-29
Next Review: 2025-12-29 (Monthly)
Owner: Development Team
