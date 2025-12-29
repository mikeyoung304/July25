# Prevention Strategies & Lessons Learned

Comprehensive documentation for preventing recurring issues in the Restaurant OS codebase.

---

## Quick Navigation

### Problem: Tests fail in CI but pass locally
**Read:** `CL-TEST-003-quick-reference.md` (5 minutes)

**Full Strategy:** `CL-TEST-003-env-isolation-prevention.md` (30-45 minutes)

**Implementation Plan:** `CL-TEST-003-implementation-checklist.md` (2 hours)

---

### Problem: Input validation or security vulnerabilities
**Read:** `QUICK-REF-INPUT-VALIDATION.md` (5 minutes)

**Full Strategy:** `INPUT-VALIDATION-AND-ERROR-SAFETY.md` (30-45 minutes)

---

## Complete Document Index

### Security Hardening Prevention

| Document | Purpose | Time | When to Read |
|----------|---------|------|--------------|
| SECURITY-HARDENING-PREVENTION.md | Complete prevention strategy with checklist, env vars, testing, mistakes | 45-60 min | Before any auth/security code review |
| QUICK-REF-SECURITY-HARDENING.md | 5-minute red/green flags and common mistakes for code review | 5-10 min | During code review (bookmark it!) |
| DEPLOYMENT-SECURITY-VERIFICATION.md | Pre-deployment, deployment, post-deployment checklists | 30-45 min | Before each production release |

**Status:** Ready to use
**Impact:** Prevents regression of security hardening (CSRF, HTTPOnly cookies, timing-safe auth, webhooks, demo mode, STRICT_AUTH)
**Coverage:**
- CSRF protection with timing-safe token validation
- HTTPOnly cookies for auth tokens
- Demo mode gating behind DEMO_MODE env var
- Required secrets (no fallbacks) for critical operations
- STRICT_AUTH default enforcement
- Timing-safe PIN verification with dummy hash
- Webhook timestamp verification for replay attack prevention
- PIN attempt counter (5 failures = 15 min lockout)
- Multi-tenant isolation and restaurant_id validation
- Environment variable requirements and validation

---

### Payment Security Prevention

| Document | Purpose | Time | When to Read |
|----------|---------|------|--------------|
| PREVENTION-PAYMENT-SECURITY.md | Complete prevention for payment operations: idempotency, transactions, tenant validation | 45-60 min | Before any payment code review |
| QUICK-REF-PAYMENT-SECURITY.md | 5-minute red/green flags and common mistakes for payment code review | 5-10 min | During payment PR code review (bookmark it!) |

**Status:** Ready to use
**Based On:** Issues #238, #239, #241 (fixed 2025-12-29)
**Impact:** Prevents duplicate refunds, data inconsistency, cross-tenant payment manipulation
**Coverage:**
- Idempotency anti-pattern (random nonce defeats purpose)
- Incomplete transaction pattern (external system updated without local state)
- Missing tenant validation gap (no ownership check on resource operations)
- Code review checklist for payment operations
- Test cases for idempotency, transaction completeness, multi-tenant isolation
- Combined checklist for payment PRs

---

### Test Environment Isolation (CL-TEST-003)

| Document | Purpose | Time | When to Read |
|----------|---------|------|--------------|
| CL-TEST-003-env-isolation-prevention.md | Complete prevention strategy with 8 detailed approaches | 30-45 min | Designing CI/CD, understanding root cause |
| CL-TEST-003-quick-reference.md | 5-minute fix guide + prevention checklist | 5-10 min | Tests failing in CI, quick diagnosis |
| CL-TEST-003-implementation-checklist.md | 5-phase rollout plan with verification steps | 2 hours | Implementing prevention strategies |

**Status:** Ready to implement
**Impact:** Prevents 116+ test failures in CI
**Effort:** 4-5 days implementation + ongoing monitoring

**Key Strategies:**
- Environment file hierarchy & lock-in
- Tool-generated file renaming
- Bootstrap validation
- Gitignore precision
- CI/CD pre-flight checks
- Developer documentation & onboarding
- Environment variable naming conventions
- Monitoring & alerting

---

### Input Validation & Security

| Document | Purpose | Time | When to Read |
|----------|---------|------|--------------|
| INPUT-VALIDATION-AND-ERROR-SAFETY.md | Security & validation patterns | 30-45 min | Before validation implementation |
| QUICK-REF-INPUT-VALIDATION.md | Quick reference for common checks | 5-10 min | During code review |
| DELIVERY-SUMMARY-TODO-144-150.md | Summary of 6 TODOs fixed | 10-15 min | Context for specific issues |
| LESSONS-FROM-TODO-144-150.md | Deeper lessons from the work | 15-20 min | Team training |

**Status:** Implemented (commit 57b10fe7)
**Key Issues Fixed:**
- Prototype pollution prevention
- ISO 8601 timestamp validation
- Integer radix safety
- Stats calculation optimization
- Error property access safety
- Type-safe patterns

---

### Other Prevention Frameworks

| Document | Purpose |
|----------|---------|
| CHECKLIST-RLS-MIGRATIONS.md | Row-level security implementation |
| CHECKLIST-MULTITENANT-CACHE.md | Multi-tenant cache isolation |
| CHECKLIST-SECURITY-CODE-REVIEW.md | Security code review process |
| CHECKLIST-SCHEMA-TYPE-SAFETY.md | Schema alignment and type safety |
| PARALLEL-TODO-RESOLUTION-BEST-PRACTICES.md | Safe parallel workflow execution |
| WORKTREE-TODO-MAINTENANCE.md | Git worktree & TODO management |
| PR-151-PREVENTION-SUMMARY.md | Security discoveries from PR #150-151 |

---

## By Role

### For Developers

**Start Here:**
1. `QUICK-REF-SECURITY-HARDENING.md` - Quick reference for security checks (bookmark!)
2. `CL-TEST-003-quick-reference.md` - Quick fixes when tests fail
3. Relevant prevention strategy before starting feature work
4. Apply patterns during implementation

**Example Flow:**
- Tests are failing? → Read CL-TEST-003-quick-reference.md
- Implementing validation? → Read QUICK-REF-INPUT-VALIDATION.md
- Need deep understanding? → Read full strategy document

### For Code Reviewers

**Use These:**
1. `QUICK-REF-SECURITY-HARDENING.md` - For auth/security PRs (red/green flags)
2. Relevant quick reference checklist
3. Full strategy for context
4. Share with author when issues found

**Example:**
- See auth/security issue? → Reference QUICK-REF-SECURITY-HARDENING.md patterns
- See input validation issue? → Reference QUICK-REF-INPUT-VALIDATION.md patterns
- Environment config problem? → Point to CL-TEST-003-quick-reference.md

### For DevOps/SRE

**Focus Areas:**
1. DEPLOYMENT-SECURITY-VERIFICATION.md - Pre/during/post deployment checklists
2. SECURITY-HARDENING-PREVENTION.md - Environment variables and secret management
3. CL-TEST-003 - Test environment isolation in CI/CD
4. Monitoring strategies

**Key Tasks:**
- Implement security deployment verification (DEPLOYMENT-SECURITY-VERIFICATION)
- Set up environment secret validation
- Implement CI/CD pre-flight checks (CL-TEST-003)
- Monitor for pattern violations and security regressions
- Train team on prevention strategies and incident response

### For QA/Testing

**Key Documents:**
1. SECURITY-HARDENING-PREVENTION.md Section 3 - Testing recommendations with examples
2. CL-TEST-003 - Environment isolation
3. Test mock drift prevention (CL-TEST-001 in .claude/lessons/)
4. Security code review checklist
5. Input validation patterns

**Security Testing Focus:**
- CSRF protection validation (token presence, matching, timing)
- PIN verification consistency (timing-safe testing)
- Demo mode gating (enabled/disabled scenarios)
- PIN attempt counter (5 failures = lockout)
- HTTPOnly cookie behavior
- STRICT_AUTH enforcement
- Webhook signature and timestamp verification
- Restaurant_id format validation and filtering

---

## Prevention Principles

All prevention strategies are built on these core principles:

1. **Fail Fast** - Detect at compile time > runtime > production
2. **Clear Errors** - Provide context and actionable messages
3. **Multiple Layers** - Defense in depth (no single point of failure)
4. **Documentation** - Explain why, not just how
5. **Automation** - Use tools (TypeScript, linters, CI) to enforce
6. **Team Learning** - Share patterns through code review

---

## How Prevention Strategies Are Created

1. **Issue Discovered** - Found in code review or production
2. **Root Cause Analysis** - Why did this happen? How to catch early?
3. **Prevention Strategies** - 5-8 actionable approaches
4. **Implementation** - Practical checklist and timeline
5. **Monitoring** - Metrics to ensure prevention stays in place

---

## Success Metrics

### Test Environment Isolation (CL-TEST-003)
- ✅ 100% CI test pass rate
- ✅ Zero environment validation failures
- ✅ Zero tool-generated `.env` files in git
- ✅ <5 minutes to fix environment issues
- ✅ All developers understand configuration

### Input Validation & Security
- ✅ Zero prototype pollution vulnerabilities
- ✅ All timestamps in ISO 8601 format
- ✅ All integer parsing uses radix parameter
- ✅ Reduced error handling bugs
- ✅ Improved stats performance

---

## Getting Started

### Right Now (5 minutes)

Pick the relevant quick reference:
- **Tests failing in CI?** → `CL-TEST-003-quick-reference.md`
- **Input validation issue?** → `QUICK-REF-INPUT-VALIDATION.md`
- **Security review?** → `CHECKLIST-SECURITY-CODE-REVIEW.md`

### This Week (30 minutes)

Read the full strategy for your area:
- `CL-TEST-003-env-isolation-prevention.md`
- `INPUT-VALIDATION-AND-ERROR-SAFETY.md`
- Relevant checklist document

### Implementation (2-5 days)

Follow the implementation checklist:
- `CL-TEST-003-implementation-checklist.md`
- Specific prevention checklist
- Verify success criteria

### Ongoing (Weekly)

- Apply prevention patterns in code reviews
- Monitor success metrics
- Update team if new patterns discovered
- Monthly review and refresher training

---

## Common Scenarios

| Scenario | Read | Time |
|----------|------|------|
| Tests pass locally, fail in CI | CL-TEST-003-quick-reference.md | 5 min |
| Implementing environment config in CI/CD | CL-TEST-003-implementation-checklist.md | 2 hours |
| Security review of input handling | QUICK-REF-INPUT-VALIDATION.md | 5 min |
| Understanding security patterns | INPUT-VALIDATION-AND-ERROR-SAFETY.md | 30 min |
| Code review - type safety issue | CHECKLIST-SCHEMA-TYPE-SAFETY.md | 10 min |
| Code review - RLS/security issue | CHECKLIST-SECURITY-CODE-REVIEW.md | 10 min |
| Code review - multi-tenant cache issue | CHECKLIST-MULTITENANT-CACHE.md | 10 min |
| Managing git worktrees & TODOs | WORKTREE-TODO-MAINTENANCE.md | 20 min |

---

## Prevention Framework Structure

```
.claude/
├── prevention/           # This directory
│   ├── PREVENTION-INDEX.md              # This file
│   ├── CL-TEST-003-env-isolation-prevention.md
│   ├── CL-TEST-003-quick-reference.md
│   ├── CL-TEST-003-implementation-checklist.md
│   ├── INPUT-VALIDATION-AND-ERROR-SAFETY.md
│   ├── QUICK-REF-INPUT-VALIDATION.md
│   ├── [Other prevention strategies...]
│   └── README.md                        # Original index
├── lessons/             # Lessons learned from past issues
│   ├── CL-AUTH-001-strict-auth-drift.md
│   ├── CL-TEST-001-mock-drift-prevention.md
│   ├── CL-TEST-002-npm-test-hang.md
│   └── [Other lessons...]
├── todos/              # Active TODOs
└── solutions/          # Archived solutions
```

---

## Key Insights

### Test Environment Isolation (CL-TEST-003)

The root issue wasn't any single mistake—it was **lack of validation between layers**:

```
No validation that .env.test has test values
    ↓
No validation that DATABASE_URL is provided
    ↓
No validation that NODE_ENV=test
    ↓
Tests use production config undetected
    ↓
CI tests fail silently
```

**Solution:** Add validation at multiple layers so issues fail **immediately** and **obviously**.

### Input Validation & Security

Prevention depends on defense-in-depth:

```
Layer 1: Type safety (TypeScript)
Layer 2: Input validation (runtime)
Layer 3: Error handling (try/catch)
Layer 4: Logging (audit trail)
Layer 5: Monitoring (detection)
```

No single layer is sufficient—must implement all five.

---

## Maintenance Checklist

**Monthly:**
- [ ] Review if any new issues discovered
- [ ] Check that prevention metrics are being tracked
- [ ] Update documentation based on team feedback
- [ ] Train anyone new on key prevention strategies

**Quarterly:**
- [ ] Full review of prevention frameworks
- [ ] Update timeline if strategies no longer needed
- [ ] Identify new patterns to prevent
- [ ] Team retrospective on prevention effectiveness

**When implementing new feature:**
- [ ] Check for relevant prevention strategies
- [ ] Apply patterns from quick reference
- [ ] Reference in code review comments
- [ ] Document if new pattern discovered

---

## Related Documentation

- **Lessons Learned:** `.claude/lessons/README.md`
- **Architecture:** `CLAUDE.md`
- **Project Plans:** `plans/`
- **Architecture Decisions:** `docs/ADR-*.md`

---

**Last Updated:** 2025-12-03
**Maintainers:** Claude Code
**Review Cycle:** Monthly or when new issue discovered

## Recent Updates

- **2025-12-29**: Added Payment Security Prevention
  - 2-document set: comprehensive prevention guide + quick reference
  - Three critical payment patterns: Idempotency Anti-Pattern, Incomplete Transaction, Missing Tenant Validation
  - Covers issues #238 (random nonce defeating idempotency), #239 (refund without state update), #241 (no tenant check)
  - Code review checklists, patterns to watch for, test cases, general rules
  - Combined checklist for payment operation PRs

- **2025-12-29**: Added Security Hardening Prevention (Post-remediation)
  - 3-document set: full prevention guide + quick reference + deployment checklist
  - Comprehensive coverage of CSRF, HTTPOnly cookies, timing-safe auth, webhooks
  - Demo mode gating, STRICT_AUTH enforcement, multi-tenant isolation
  - Environment variables, testing recommendations, common mistakes
  - Deployment verification procedures and post-mortem templates

- **2025-12-03**: Added CL-TEST-003 (Test Environment Isolation Prevention)
  - 3-document set: full strategy + quick reference + implementation checklist
  - 8 detailed prevention strategies with code examples
  - 5-phase implementation plan
  - Complete monitoring & maintenance guidance

