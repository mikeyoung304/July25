# Documentation Hygiene Sprint - rebuild-6.0

**Priority:** P1 - Execute after P0 security fixes
**Total Time:** ~6 hours
**North Star:** Each unit of work should make future work easier

---

## Problem Statement

Documentation entropy is violating compound engineering principles:
- CLAUDE.md is minimal (136 lines vs recommended 400+)
- No documentation INDEX (developers grep blindly)
- 41 solutions in docs/solutions/ but not linked from CLAUDE.md
- Security audit findings not documented as prevention strategies
- No RISK_REGISTER.md (risks scattered across audit output)
- Compound engineering loop not enforced in workflows

**Impact:** Future developers spend 5x longer finding answers than necessary.

---

## Compound Engineering Metrics

### Before Sprint

| Metric | Value |
|--------|-------|
| Time to find auth patterns | ~10 min (grep + read) |
| Time to find security risks | ~15 min (read audit_output/) |
| CLAUDE.md guidance coverage | ~40% of common tasks |
| Prevention strategies linked | 0 |
| Compound loop enforcement | None |

### After Sprint (Target)

| Metric | Value | Improvement |
|--------|-------|-------------|
| Time to find auth patterns | ~1 min | **10x faster** |
| Time to find security risks | ~1 min | **15x faster** |
| CLAUDE.md guidance coverage | 80% | **2x coverage** |
| Prevention strategies linked | Top 10 | Discoverable |
| Compound loop enforcement | Automated triggers | Consistent |

---

## Phase 1: Quick Wins (30 minutes)

### 1.1 Create docs/INDEX.md

**File:** `docs/INDEX.md`

```markdown
# rebuild-6.0 Documentation Index

> **Start here** to find what you need.

## Learning the System

| Topic | Document | Description |
|-------|----------|-------------|
| Project overview | [CLAUDE.md](/CLAUDE.md) | Commands, patterns, architecture |
| Architecture | [docs/adrs/](/docs/adrs/) | Architectural decision records |
| Testing | [.github/TEST_DEBUGGING.md](/.github/TEST_DEBUGGING.md) | Test strategy and debugging |

## Architectural Decisions (ADRs)

| ADR | Decision |
|-----|----------|
| [ADR-001](/docs/adrs/001-snake-case-convention.md) | Snake case everywhere |
| [ADR-006](/docs/adrs/006-dual-auth-pattern.md) | Dual authentication |
| [ADR-010](/docs/adrs/010-remote-first-database.md) | Remote-first database |
| [ADR-015](/docs/adrs/015-order-state-machine.md) | Order state machine |

## Security

| Document | Purpose |
|----------|---------|
| [SECURITY.md](/SECURITY.md) | Security policies and contacts |
| [Risk Register](/docs/RISK_REGISTER.md) | Known risks and mitigations |
| [Audit Summary](/audit_output/01_EXEC_SUMMARY.md) | 2025-12 hostile audit |

## Prevention Strategies (Top 10)

| Pattern | When to Use | Document |
|---------|-------------|----------|
| Multi-tenant isolation | All database queries | [tenant-isolation](/docs/solutions/patterns/tenant-isolation.md) |
| Dual auth handling | Auth middleware changes | [dual-auth-pattern](/docs/solutions/auth-issues/) |
| Order state transitions | Order status changes | [order-state-machine](/docs/solutions/patterns/) |
| Payment idempotency | Stripe API calls | [payment-patterns](/docs/solutions/payment-issues/) |
| Memory constraints | Server-side caching | [memory-management](/docs/solutions/performance-issues/) |

## Operations

| Guide | Purpose |
|-------|---------|
| [Deployment](/docs/DEPLOYMENT.md) | Deploy to Render |
| [Incident Response](/docs/INCIDENT_RESPONSE.md) | Handle production issues |
```

### 1.2 Update CLAUDE.md with Solution Links

**Add after "## Solution Documentation" section:**

```markdown
### Quick Links (Most Used)

| Problem | Solution |
|---------|----------|
| Auth token issues | `docs/solutions/auth-issues/dual-auth-pattern.md` |
| Memory leaks | `docs/solutions/performance-issues/memory-management.md` |
| Build failures | `docs/solutions/build-errors/` |
| Test failures | `docs/solutions/test-failures/` |
| Multi-tenant bugs | `docs/solutions/patterns/tenant-isolation.md` |
```

### 1.3 Update CLAUDE.md Current Status

**Add after "## Architecture" section:**

```markdown
## Current Status (2025-12)

- **Security audit:** Complete (see `audit_output/`)
- **Security score:** 55/100 → targeting 75/100
- **P0 issues:** 9 (launch blockers)
- **Active plan:** `plans/security-remediation-v2.md`
- **Next milestone:** Complete Phase 0 security fixes
```

---

## Phase 2: Risk Documentation (1 hour)

### 2.1 Create docs/RISK_REGISTER.md

**File:** `docs/RISK_REGISTER.md`

Extract and consolidate from `audit_output/02_RISK_REGISTER.md`:

```markdown
# Risk Register

Last updated: 2025-12-28

## Active Risks

### P0 - Launch Blockers

| ID | Risk | Mitigation | Status |
|----|------|------------|--------|
| SEC-001 | Demo user bypass allows full auth bypass | Remove bypass in production | Open |
| SEC-002 | localStorage token exposure to XSS | Migrate to HTTPOnly cookies | Open |
| SEC-003 | Weak station secret fallback | Require env var, crash on missing | Open |
| SEC-004 | Missing refund idempotency | Add idempotency key to Stripe calls | Open |

### P1 - High Priority

| ID | Risk | Mitigation | Status |
|----|------|------------|--------|
| SEC-005 | No CSRF protection | Add CSRF middleware | Open |
| SEC-006 | PIN timing attack | Constant-time comparison | Open |
| SEC-007 | Webhook replay vulnerability | Verify timestamps | Open |
| SEC-008 | PIN rate limit race condition | Atomic database counter | Open |

## Resolved Risks

| ID | Risk | Resolution | Date |
|----|------|------------|------|
| (none yet) | | | |

## Risk Assessment Criteria

- **P0**: Block launch, fix immediately
- **P1**: Fix before production traffic
- **P2**: Fix before scale
- **P3**: Nice to have
```

### 2.2 Add Risk Sections to Key Docs

**SECURITY.md - Add:**
```markdown
## Known Security Risks

See [Risk Register](/docs/RISK_REGISTER.md) for current security risks.

Last audit: 2025-12-28 (Hostile Enterprise Audit)
Audit results: `audit_output/`
```

---

## Phase 3: Solution Consolidation (2 hours)

### 3.1 Create Security Solutions from Audit

Create prevention strategies from audit findings:

**File:** `docs/solutions/security-issues/demo-bypass-prevention.md`
```markdown
# Demo User Bypass Prevention

## Problem
Demo user bypass in `restaurantAccess.ts` allows forged `demo:*` JWTs to skip all permission checks.

## Solution
Gate behind DEMO_MODE environment variable:
```typescript
if (sub.startsWith('demo:')) {
  if (process.env.DEMO_MODE !== 'enabled') {
    logger.warn('Demo bypass attempted outside demo mode', { sub });
    return false;
  }
  return true;
}
```

## Prevention
- Never use string prefix matching for auth bypass
- Always gate demo features behind explicit env vars
- Log all bypass attempts

## References
- `audit_output/02_RISK_REGISTER.md` - SEC-001
- `plans/security-remediation-v2.md` - Task 0.1
```

**Create similar files for:**
- `httponly-cookie-auth.md` - Token storage pattern
- `csrf-protection.md` - CSRF middleware pattern
- `timing-safe-comparison.md` - PIN verification pattern
- `atomic-rate-limiting.md` - Database-backed rate limits
- `idempotency-key-pattern.md` - Stripe payment patterns

### 3.2 Update docs/solutions/README.md

Add new categories and link audit-derived solutions:

```markdown
## Security Issues (NEW)
- demo-bypass-prevention.md - Gate demo features
- httponly-cookie-auth.md - Cookie-based auth
- csrf-protection.md - CSRF middleware
- timing-safe-comparison.md - Constant-time ops
- atomic-rate-limiting.md - DB-backed limits
- idempotency-key-pattern.md - Stripe patterns
```

### 3.3 Archive Audit Output (Optional)

If audit output is large, create summary and archive:

```bash
# Keep executive summary accessible
cp audit_output/01_EXEC_SUMMARY.md docs/AUDIT_SUMMARY_2025-12.md

# Archive full output
mkdir -p docs/archive/2025-12-hostile-audit
mv audit_output/* docs/archive/2025-12-hostile-audit/
```

---

## Phase 4: CLAUDE.md Enhancement (1.5 hours)

### 4.1 Add Compound Engineering Section

```markdown
## Compound Engineering

### The Learning Loop

Every non-trivial fix **MUST** compound:
1. Fix the problem
2. Document in `docs/solutions/{category}/`
3. If recurring, add to CLAUDE.md Quick Links
4. If architectural, create or update ADR

**Signs you should compound:**
- Debugging took >15 min
- Solution wasn't obvious
- You'd want to find this later
- It affects security or payments

### Mandatory Reviews

After writing significant code:

| Code Type | Invoke Agent |
|-----------|--------------|
| Auth/security | `security-sentinel` |
| Database queries | `performance-oracle` |
| State management | `architecture-strategist` |
| Any significant change | `code-simplicity-reviewer` |
```

### 4.2 Add Prevention Patterns Section

```markdown
## Prevention Patterns

### Security (CRITICAL)

| Pattern | Rule | Violation Example |
|---------|------|-------------------|
| No fallback secrets | `const x = process.env.X` (crash if missing) | `process.env.X \|\| 'default'` |
| HTTPOnly cookies | Sensitive tokens in cookies | `localStorage.setItem('token')` |
| CSRF protection | All POST/PUT/DELETE need CSRF | Missing X-CSRF-Token header |
| Timing-safe auth | Always compare against hash | Early return on user not found |

### Multi-Tenancy (CRITICAL)

| Pattern | Rule | Violation Example |
|---------|------|-------------------|
| Explicit tenant filter | Every query includes restaurant_id | `SELECT * FROM orders` |
| RLS enforcement | All tables have RLS policies | New table without RLS |
| Context validation | Middleware validates restaurant_id | Direct database access |

### Payments (CRITICAL)

| Pattern | Rule | Violation Example |
|---------|------|-------------------|
| Server-side totals | Never trust client amounts | Using client-sent total |
| Idempotency keys | All Stripe calls have keys | Missing idempotency on refund |
| Two-phase logging | Log before AND after | Only logging success |
```

### 4.3 Add Debugging Quick Reference

```markdown
## Debugging Quick Reference

### Auth Issues
1. Check localStorage for `token` / `demo_token`
2. Check cookie for `auth_token` (won't show in console if HTTPOnly)
3. Check Supabase session: `supabase.auth.getSession()`
4. Check server logs for auth middleware

### Payment Issues
1. Check Stripe Dashboard for payment intent status
2. Check server logs for idempotency key
3. Check `payment_intents` table for local record
4. Verify webhook received: check `stripe_events` table

### State Issues
1. Check current order status in database
2. Verify transition is valid (see Order Status Flow)
3. Check for race conditions in concurrent updates
```

---

## Phase 5: Workflow Integration (1 hour)

### 5.1 Create .claude/hooks/post-fix-compound.md

**File:** `.claude/hooks/post-fix-compound.md`
```markdown
# Post-Fix Compound Hook

After fixing any issue that took >15 minutes:

1. Create solution doc: `docs/solutions/{category}/{issue-name}.md`
2. If security-related: Update `docs/RISK_REGISTER.md`
3. If pattern-worthy: Add to CLAUDE.md Prevention Patterns
4. If architectural: Create or update ADR

Template: `docs/solutions/TEMPLATE.md`
```

### 5.2 Create Solution Template

**File:** `docs/solutions/TEMPLATE.md`
```markdown
# [Problem Name]

## Problem
[What was the issue?]

## Symptoms
- [How did it manifest?]
- [What errors were seen?]

## Root Cause
[Why did it happen?]

## Solution
[How to fix it]

```typescript
// Code example
```

## Prevention
- [How to prevent in future]
- [What patterns to follow]

## References
- [Related files]
- [Related issues/PRs]
- [Related ADRs]
```

---

## Verification Checklist

After completing all phases:

- [ ] `docs/INDEX.md` exists and all links work
- [ ] `docs/RISK_REGISTER.md` exists with current risks
- [ ] CLAUDE.md has Quick Links section
- [ ] CLAUDE.md has Current Status section
- [ ] CLAUDE.md has Prevention Patterns section
- [ ] 6+ new security solutions in `docs/solutions/security-issues/`
- [ ] `docs/solutions/README.md` updated with new files
- [ ] `docs/solutions/TEMPLATE.md` exists
- [ ] All internal links validated

---

## Success Metrics

| Metric | Before | After | Validation |
|--------|--------|-------|------------|
| CLAUDE.md size | 136 lines | 300+ lines | `wc -l CLAUDE.md` |
| Prevention patterns documented | 0 | 15+ | Count in CLAUDE.md |
| Security solutions | 0 | 6+ | `ls docs/solutions/security-issues/` |
| Risk register entries | 0 | 8+ | Count in RISK_REGISTER.md |
| INDEX.md exists | No | Yes | File check |

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
- **Follow-up:** After security fixes complete, update RISK_REGISTER.md statuses

---

*Plan created: 2025-12-28*
*Aligned with: Compound Engineering North Star*
*Reference: MAIS doc-hygiene-sprint.md patterns*
