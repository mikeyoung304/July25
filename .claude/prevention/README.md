# Prevention Frameworks

This directory contains proactive prevention strategies to avoid recurring issues.

## Documents

### [WORKTREE-TODO-MAINTENANCE.md](./WORKTREE-TODO-MAINTENANCE.md)

Comprehensive prevention framework for managing git worktrees and TODO system discipline.

**Problem Pattern**:
- Git worktrees created for parallel work but not cleaned up
- TODO files duplicated (pending + completed versions)
- Test configs not excluding temporary directories
- Stale worktree metadata causing repository pollution

**Key Sections**:
1. **Worktree Lifecycle Management** - When to create, naming conventions, cleanup protocols
2. **TODO System Discipline** - Status transitions, file structure, weekly triage
3. **Test Configuration Best Practices** - Exclusion patterns, pre-commit hooks
4. **Automation Opportunities** - Scripts, GitHub Actions, pre-commit hooks

**Automation Provided**:
- `scripts/cleanup-worktrees.sh` - Remove merged/broken worktrees
- `scripts/cleanup-todos.sh` - Archive completed TODOs
- `scripts/todo-audit.sh` - Weekly health audit
- `scripts/system-health.sh` - Quick system status
- `.github/workflows/worktree-maintenance.yml` - Automated CI checks

## Usage Guide

### Daily Development

```bash
# Create a worktree for parallel work
git worktree add .worktrees/feature-name origin/feature-name

# Work on your feature...
cd .worktrees/feature-name
git add . && git commit -m "message"

# When done, go back to main
cd ../..
git checkout main

# Clean up when merged
./scripts/cleanup-worktrees.sh
```

### Weekly Maintenance (Friday)

```bash
# Audit TODO system health
./scripts/todo-audit.sh

# Archive completed TODOs
./scripts/cleanup-todos.sh --confirm

# Check overall system health
./scripts/system-health.sh
```

### Continuous Monitoring

GitHub Actions automatically:
- Checks for stale worktrees (Fridays)
- Validates TODO system health
- Checks test configurations
- Creates issues for needed maintenance

## Key Principles

### Worktree Management

✓ Create worktrees for multi-hour parallel work
✗ Don't use for quick single tasks (use git checkout)

✓ Use naming convention: `.worktrees/category/descriptive-name`
✗ Don't create worktrees in repo root or random locations

✓ Clean up after branch merges
✗ Don't leave merged worktrees around

### TODO System

✓ One TODO file per task, stored in `.claude/todos/`
✗ Don't duplicate TODO files or keep completed items in pending

✓ Update status as work progresses: pending → in_progress → completed
✗ Don't leave TODOs with "unknown" or missing status

✓ Archive completed items to `.claude/solutions/`
✗ Don't delete completed TODOs without archiving

### Test Configuration

✓ Exclude `.worktrees/`, `.claude/`, and test artifacts from Jest/Playwright
✗ Don't run tests on worktree contents

✓ Ensure `.gitignore` prevents test artifacts from being committed
✗ Don't commit coverage/, dist/, or node_modules/ from worktrees

## File Structure

```
rebuild-6.0/
├── .claude/
│   ├── prevention/              # This directory
│   │   ├── README.md           # This file
│   │   └── WORKTREE-TODO-MAINTENANCE.md
│   ├── todos/                  # Active TODOs (organized by category)
│   │   ├── bug-fixes/
│   │   ├── features/
│   │   ├── refactoring/
│   │   └── README.md           # TODO index
│   ├── solutions/              # Archived solutions (by date)
│   │   ├── 2025-11-29/
│   │   └── README.md
│   ├── lessons/                # Lessons learned from past issues
│   └── commands/               # Custom slash commands
│
├── .github/workflows/
│   └── worktree-maintenance.yml # Automated CI checks
│
├── scripts/
│   ├── cleanup-worktrees.sh    # Remove merged worktrees
│   ├── cleanup-todos.sh        # Archive completed TODOs
│   ├── todo-audit.sh           # Weekly health audit
│   ├── system-health.sh        # Quick status check
│   └── setup-hooks.sh          # Configure git hooks
│
├── .worktrees/                 # Parallel work branches (NOT committed)
│   └── .gitignore              # Excludes build artifacts
│
└── [other project files]
```

## Common Commands

```bash
# Worktrees
git worktree add .worktrees/feature-x origin/feature-x
git worktree list
git worktree remove .worktrees/feature-x
./scripts/cleanup-worktrees.sh

# TODOs
./scripts/todo-audit.sh
./scripts/cleanup-todos.sh --confirm
git add .claude/todos .claude/solutions
git commit -m "docs(todos): [update description]"

# Health
./scripts/system-health.sh
npm run health
```

## Automation

### GitHub Actions

**Weekly Schedule** (Fridays 5 PM UTC):
- Checks for stale worktrees
- Validates TODO system
- Checks test configurations
- Creates issues for needed maintenance

**Manual Trigger**:
```bash
# Via GitHub UI Actions tab, or
gh workflow run worktree-maintenance.yml
```

### Pre-commit Hooks

Automatic checks prevent:
- Committing test artifacts from worktrees
- Committing completed TODOs in pending directory
- Committing .worktrees/ directory contents

### npm Scripts

```bash
npm run cleanup:worktrees     # Remove merged/broken worktrees
npm run cleanup:todos        # Archive completed TODOs
npm run audit:todos          # Audit TODO health
npm run maintenance          # Full system maintenance
npm run health               # Quick health check
```

## Troubleshooting

### Broken Worktree References

```bash
# Repair worktree database
git worktree repair

# Force remove broken worktree
git worktree remove .worktrees/broken --force

# Clean up
git gc --aggressive
```

### Test Pollution from Worktrees

```bash
# Clean worktree artifacts
cd .worktrees/feature-name
rm -rf coverage dist build .next node_modules test-results

# Go back and run tests
cd ../..
npm test
```

### Stale TODOs

```bash
# Identify stale items
./scripts/todo-audit.sh

# Review and decide: update, complete, or close
# Then clean up
./scripts/cleanup-todos.sh --confirm
```

## References

- **Git Worktree Docs**: https://git-scm.com/docs/git-worktree
- **Prevention Philosophy**: See WORKTREE-TODO-MAINTENANCE.md
- **Lessons Learned**: See `.claude/lessons/README.md`
- **TODO System**: See `.claude/todos/README.md`

## Team Practices

### Recommended Cadence

- **Daily**: Check current worktree status
- **Weekly (Friday)**: Run `./scripts/todo-audit.sh` and `./scripts/system-health.sh`
- **Monthly**: Review and archive solutions, update prevention frameworks
- **Quarterly**: Review and update this prevention framework

### Code Review

When reviewing PRs:
- Ensure .worktrees/ is not in the diff
- Ensure completed TODOs are removed (check `.claude/todos/`)
- Ensure no test artifacts are committed
- Check that TODO references are current

### On Merge

After merging a branch:
1. Delete the worktree: `git worktree remove .worktrees/feature-x`
2. Update related TODOs: mark as completed and archive
3. Run health check: `./scripts/system-health.sh`

## Contact and Updates

- Document Owner: Development Team
- Last Updated: 2025-11-29
- Review Cycle: Quarterly
- Questions: Review WORKTREE-TODO-MAINTENANCE.md for detailed guidance

---

**Prevention is better than cleanup**. These frameworks are designed to prevent issues before they occur.
