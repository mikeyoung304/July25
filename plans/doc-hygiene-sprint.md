# Documentation Hygiene Sprint - rebuild-6.0

**Last Updated:** 2025-12-29

**Priority:** P1 - Execute after P0 security fixes
**Total Time:** ~4 hours (reduced - many items already complete)
**North Star:** Each unit of work should make future work easier

---

## Problem Statement

Documentation entropy is violating compound engineering principles:
- No documentation INDEX.md (707 docs with no entry point)
- 16 ADRs exist at `docs/explanation/architecture-decisions/` but not linked from CLAUDE.md
- 10 audit output files orphaned from docs flow
- 48 solutions exist but ADRs not cross-referenced
- Compound engineering forcing functions not documented

**Impact:** Future sessions spend extra time navigating instead of working.

### Already Complete (Good State)
- CLAUDE.md has Quick Links section (well populated)
- CLAUDE.md has Prevention Patterns section
- 48 solutions in docs/solutions/ (well organized with README index)
- 11 security solutions already documented from audit
- Archive structure working well (494 docs properly archived)

---

## Compound Engineering Metrics

### Before Sprint

| Metric | Value |
|--------|-------|
| Time to find ADRs | ~5 min (no direct link) |
| Time to find audit results | ~3 min (orphaned folder) |
| docs/INDEX.md exists | No |
| ADRs linked from CLAUDE.md | 0 |
| Audit integrated into docs | No |

### After Sprint (Target)

| Metric | Value | Improvement |
|--------|-------|-------------|
| Time to find ADRs | ~10 sec | **30x faster** |
| Time to find audit results | ~10 sec | **18x faster** |
| docs/INDEX.md exists | Yes | Entry point |
| ADRs linked from CLAUDE.md | 5 key ones | Discoverable |
| Audit integrated into docs | Yes | Archived properly |

---

## Phase 1: Create Documentation Index (30 minutes)

### 1.1 Create docs/INDEX.md

**File:** `docs/INDEX.md`

```markdown
# rebuild-6.0 Documentation Index

> **Start here** to find what you need.

## Learning the System

| Topic | Document | Description |
|-------|----------|-------------|
| Project overview | [CLAUDE.md](/CLAUDE.md) | Start here - commands, patterns, architecture |
| Database | [DATABASE.md](/docs/DATABASE.md) | Schema, migrations, multi-tenancy |
| Deployment | [DEPLOYMENT.md](/docs/DEPLOYMENT.md) | Render deployment guide |
| Security | [SECURITY.md](/docs/SECURITY.md) | Security practices |
| Testing | [TESTING_CHECKLIST.md](/docs/TESTING_CHECKLIST.md) | Test strategy |

## Architectural Decisions (ADRs)

Located in: `docs/explanation/architecture-decisions/`

| ADR | Decision |
|-----|----------|
| [ADR-001](./explanation/architecture-decisions/ADR-001-snake-case-convention.md) | Snake case convention |
| [ADR-002](./explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md) | Multi-tenancy architecture |
| [ADR-006](./explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md) | Dual authentication pattern |
| [ADR-010](./explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md) | Remote database source of truth |
| [ADR-016](./explanation/architecture-decisions/ADR-016-module-system-commonjs.md) | CommonJS module system |

## Solutions Knowledge Base

| Category | Count | Quick Link |
|----------|-------|------------|
| Security Issues | 11 | [Browse](/docs/solutions/security-issues/) |
| Test Failures | 8 | [Browse](/docs/solutions/test-failures/) |
| Process Issues | 7 | [Browse](/docs/solutions/process-issues/) |
| Performance Issues | 4 | [Browse](/docs/solutions/performance-issues/) |
| Full Index | 48 | [README](/docs/solutions/README.md) |

## Security Audit (2025-12)

| Document | Purpose |
|----------|---------|
| [Executive Summary](/audit_output/01_EXEC_SUMMARY.md) | Top risks, score, verdict |
| [Risk Register](/audit_output/02_RISK_REGISTER.md) | All 58 findings by priority |
| [Remediation Plan](/plans/security-remediation-v2.md) | Implementation plan |

## Operations

| Guide | Purpose |
|-------|---------|
| [Runbooks](/docs/RUNBOOKS.md) | Operational procedures |
| [Production Diagnostics](/docs/PRODUCTION_DIAGNOSTICS.md) | Debugging production |
| [Deployment Best Practices](/docs/DEPLOYMENT_BEST_PRACTICES.md) | Deploy checklist |
```

### 1.2 Add ADR Quick Links to CLAUDE.md

**Add new section after "## Solution Documentation":**

```markdown
### ADR Quick Links

| Decision | ADR |
|----------|-----|
| Snake case everywhere | `docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md` |
| Multi-tenant isolation | `docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md` |
| Dual auth pattern | `docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md` |
| Remote DB truth | `docs/explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md` |
| CommonJS required | `docs/explanation/architecture-decisions/ADR-016-module-system-commonjs.md` |
```

---

## Phase 2: Archive Audit Output (30 minutes)

### 2.1 Move Audit Files to Docs Archive

The audit output is valuable reference material that should live in docs:

```bash
mkdir -p docs/archive/2025-12/security-audit
mv audit_output/*.md docs/archive/2025-12/security-audit/
rmdir audit_output
```

### 2.2 Update References

After moving, update paths in:
- docs/INDEX.md (change `/audit_output/` to `/docs/archive/2025-12/security-audit/`)
- CLAUDE.md audit reference
- plans/security-remediation-v2.md if it references audit_output/

---

## Phase 3: Add Compound Engineering Forcing Functions (1 hour)

### 3.1 Already Complete (No Action Needed)

Security solutions from audit already exist in `docs/solutions/security-issues/`:
- demo-bypass-prevention.md
- httponly-cookie-auth.md
- csrf-protection.md
- timing-safe-comparison.md
- atomic-rate-limiting.md
- idempotency-key-pattern.md
- Plus 5 more (11 total)

### 3.2 Add Compound Engineering Protocol to CLAUDE.md

**Add new section:**

```markdown
## Compound Engineering Protocol

### After Every Non-Trivial Fix

1. **Immediate:** Run `/workflows:compound` if debugging took >15 min
2. **Check:** Does CLAUDE.md Quick Links need update?
3. **Check:** Does this need an ADR?

### Signs You Must Compound

- [ ] Debugging took >15 minutes
- [ ] Solution wasn't obvious
- [ ] You'd want to find this later
- [ ] It affects security or payments
- [ ] You created a workaround

### Review Triggers (Proactive)

After writing:
- Auth/security code -> invoke `security-sentinel`
- Database queries -> invoke `performance-oracle`
- State management -> invoke `architecture-strategist`
- Any significant change -> invoke `code-simplicity-reviewer`
```

---

## Phase 4: Verification (30 minutes)

### 4.1 Already Complete in CLAUDE.md

These sections already exist and are well-populated:
- Prevention Patterns (Security, Multi-Tenancy, Payments)
- Debugging Quick Reference
- Solution Documentation with Quick Links

### 4.2 Solution Template Already Exists

`docs/solutions/TEMPLATE.md` already exists with proper structure.

---

## Verification Checklist

After completing all phases:

- [ ] `docs/INDEX.md` exists and all links work
- [ ] CLAUDE.md has ADR Quick Links section
- [ ] CLAUDE.md has Compound Engineering Protocol section
- [ ] `audit_output/` moved to `docs/archive/2025-12/security-audit/`
- [ ] All references to audit_output/ updated
- [ ] No broken internal links

---

## Summary of Work

| Phase | Time | Work |
|-------|------|------|
| 1 | 30 min | Create docs/INDEX.md, add ADR links to CLAUDE.md |
| 2 | 30 min | Archive audit output to docs/archive/ |
| 3 | 1 hr | Add Compound Engineering Protocol to CLAUDE.md |
| 4 | 30 min | Verification |
| **Total** | **2.5 hr** | |

### Already Complete (No Work Needed)
- 48 solutions in docs/solutions/ (well organized)
- 11 security solutions from audit
- Prevention Patterns in CLAUDE.md
- Debugging Quick Reference in CLAUDE.md
- Solution Template exists

---

## Execution Command

When ready to implement:

```bash
/workflows:work plans/doc-hygiene-sprint.md
```

---

## Dependencies

- **Prerequisite:** P0 security fixes should be planned (done: `plans/security-remediation-v2.md`)
- **No blockers:** This can run in parallel with security fixes
- **Follow-up:** After security fixes complete, update risk statuses in audit archive

---

*Plan created: 2025-12-28*
*Updated: 2025-12-29 (reduced scope after discovering good existing state)*
*Aligned with: Compound Engineering North Star*
*Reference: MAIS doc-hygiene-sprint.md patterns*
