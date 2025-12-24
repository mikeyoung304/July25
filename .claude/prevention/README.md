# Prevention Frameworks

This directory contains proactive prevention strategies to avoid recurring issues.

## Documents

### [DOCUMENTATION-ORPHAN-PREVENTION.md](./DOCUMENTATION-ORPHAN-PREVENTION.md)

**New** - Complete prevention framework for documentation orphan accumulation (December 2024).

**Problem Pattern:**
- Generated files (playwright-report/data/) accidentally committed
- Old reports (reports/) accumulate without archival discipline
- Pre-commit warnings don't block, files slip through
- No naming convention or retention policy enforcement

**3-Layer Prevention:**
1. **Automation**: .gitignore hardening, pre-commit hooks, weekly GitHub Actions cleanup
2. **Architecture**: Directory reorganization (active/snapshots/archive), YYYY-MM-DD naming convention
3. **Discipline**: 30-second pre-commit checklist, weekly triage, monthly reviews

**Key Sections:**
- Problem analysis (current state, root causes)
- .gitignore hardening with validation
- Pre-commit hook implementation
- Automated cleanup via GitHub Actions
- Report lifecycle management (7/14/60/365-day retention)
- Weekly triage protocol
- Monthly archive review

**When to Use:**
- Before committing documentation files
- When designing documentation storage structure
- When setting up team documentation discipline
- During quarterly review of documentation health

**Quick Reference:** [DOCUMENTATION-ORPHAN-QUICK-REF.md](./DOCUMENTATION-ORPHAN-QUICK-REF.md)
**Implementation Guide:** [DOCUMENTATION-ORPHAN-IMPLEMENTATION.md](./DOCUMENTATION-ORPHAN-IMPLEMENTATION.md)
**Summary:** [DOCUMENTATION-ORPHAN-SUMMARY.md](./DOCUMENTATION-ORPHAN-SUMMARY.md)

**Documents**: 4 files (2,609 lines)
**Effort**: 3-4 weeks (phased implementation)
**Status**: ACTIVE (implementation pending)

---

### [INPUT-VALIDATION-AND-ERROR-SAFETY.md](./INPUT-VALIDATION-AND-ERROR-SAFETY.md)

**New** - Comprehensive prevention strategies for input validation, error handling, and code quality (TODO-144 through TODO-150).

**Key Issues Fixed:**
- Prototype pollution risk in unsanitized object spreading
- Array performance: 7x redundant iterations instead of single pass
- 200+ lines of dead code with unused exports
- Unsafe error property access without type guards
- Missing timestamp validation for log injection risk
- Missing radix and bounds in parseInt()

**3 Core Sections:**
1. **Input Validation & Sanitization** - Filter dangerous keys, validate format/length, specify radix, add bounds
2. **Error Type Safety** - Type guards for error properties, safe property extraction patterns
3. **Array Performance** - Single-pass reduce instead of multiple filters, accumulator patterns

**ESLint & Automation:**
- Custom ESLint rules for prototype pollution and parseInt safety
- Pre-commit hooks for input validation checks
- GitHub Actions for dead code audits
- TypeScript strict mode configuration

**When to Use:**
- Before spreading user input or merging objects
- When accessing error properties (use type guards!)
- When collecting multiple stats from arrays
- During code review for security/performance issues
- Weekly dead code audits

**Based On:** Fixed issues in commit 0728e1ee (metrics endpoint security, performance, type safety)

**Quick Reference:** [QUICK-REF-INPUT-VALIDATION.md](./QUICK-REF-INPUT-VALIDATION.md)

---

### [PARALLEL-TODO-RESOLUTION-BEST-PRACTICES.md](./PARALLEL-TODO-RESOLUTION-BEST-PRACTICES.md)

**New** - Comprehensive guide for safely executing parallel TODO resolution workflows.

**Problem Pattern:**
- Spawning too many agents simultaneously crashes the system
- TODOs worked on multiple times due to poor status tracking
- Missing dependencies causing conflicts and rework
- Memory exhaustion from 9+ parallel agents

**Key Sections:**
1. **Memory Management** - Safe agent limits (5-6 max), wave-based execution
2. **Five-Phase Workflow** - Analyze, Plan, Execute, Verify, Commit
3. **Prevention Checklist** - Pre-flight, in-flight, post-completion checks
4. **Common Pitfalls** - Spawning too many agents, not checking if TODO already resolved
5. **Success Metrics** - How to measure effectiveness and capture lessons learned

**Quick Reference:** [PARALLEL-RESOLUTION-QUICK-REF.md](./PARALLEL-RESOLUTION-QUICK-REF.md)

**When to Use:**
- Before resolving 6+ TODOs in parallel
- When planning wave-based execution
- During parallel resolution (monitoring checklist)
- After completion (lessons learned template)

**Based On:** Successful resolution of 11+ TODOs via parallel workflow (commit 0728e1ee)

---

### [CHECKLIST-SCHEMA-TYPE-SAFETY.md](./CHECKLIST-SCHEMA-TYPE-SAFETY.md)

**New** - Comprehensive prevention strategy for schema-type safety issues (TODO-142, TODO-143).

**Key Issues Fixed:**
- Table schema field mismatch (`capacity` vs `seats`)
- Unsafe `as any` type assertions bypassing type safety
- Missing validation on type transformations

**3 Prevention Phases:**
1. **Code Review Checklist** - 8-point schema alignment review, type assertion documentation
2. **Automated Checks** - TypeScript strict mode, ESLint rules, CI/CD integration
3. **Testing Strategy** - Unit tests for all transformations, validation tests, property-based testing

**Key Patterns Provided:**
- Correct field transformation pattern (DB → API → Client)
- Unsafe assertion replacement patterns (union types vs `any`)
- Type-safe mapping functions for complex transformations
- Common pitfalls (6 most likely mistakes)

**When to Use:**
- Before implementing type transformations
- During code review of API routes and transformers
- When adding new shared types

**Related Checklist:** Complements [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md) for type safety section

---

### [PR-151-PREVENTION-SUMMARY.md](./PR-151-PREVENTION-SUMMARY.md)

**Complete** - Comprehensive prevention strategy for security issues discovered in PR #150-151.

**Key Issues Fixed:**
- RLS policies missing on audit tables (order_status_history, voice_order_logs)
- Cache keys missing tenant isolation (cross-restaurant pollution risk)
- INSERT policy asymmetric with SELECT (missing IS NOT NULL check)
- Cache clearing function orphaned (existed but never called)
- console.error instead of logger (inconsistent logging)

**3 Actionable Checklists:**
1. [CHECKLIST-RLS-MIGRATIONS.md](./CHECKLIST-RLS-MIGRATIONS.md) - Complete RLS implementation guide
2. [CHECKLIST-MULTITENANT-CACHE.md](./CHECKLIST-MULTITENANT-CACHE.md) - Multi-tenant cache isolation
3. [CHECKLIST-SECURITY-CODE-REVIEW.md](./CHECKLIST-SECURITY-CODE-REVIEW.md) - Security code review process

**When to Use:**
- RLS work → Use RLS Migrations checklist
- Cache implementation → Use Multi-tenant Cache checklist
- Any security PR → Use Security Code Review checklist

---

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
