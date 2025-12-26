# Deep Research Prompt v2: Simplified Enterprise Audit

**Purpose**: Funding/acquisition readiness check
**Generated**: 2025-12-24
**Revision**: v2 - Simplified based on 3-reviewer feedback

---

## Key Changes from v1

Based on DHH, production reality, and simplicity reviews:

| Original | Changed To | Rationale |
|----------|------------|-----------|
| 20 agents | 6 agents | 80% of insight, 25% of cost |
| 200-300k tokens | ~75k tokens | Efficiency |
| 45-90 minutes | 15-20 minutes | Faster decision |
| Type safety as HIGH | DEPRIORITIZED | Doesn't affect deal value |
| God classes | REMOVED | Engineering vanity |
| DR documentation | REMOVED | Separate workstream |

**Added** (missing from v1):
- License compliance audit
- Financial data integrity
- Data portability/GDPR
- Uptime metrics check

---

## Verified Status (2025-12-24)

**RESOLVED since Oct 31 audit (no longer issues):**
- ✅ .env secrets - properly gitignored, only .env.example tracked
- ✅ API key exposure - keys in docs now show [REDACTED]
- ✅ Broken Claude commands - reorganized to working skills
- ✅ Hardcoded paths in scripts - fixed/removed

**Current state (agents should verify):**
| Issue | Current State | Priority |
|-------|---------------|----------|
| TypeScript `any` | 619 occurrences (was 639) | LOW - doesn't affect M&A |
| God classes | 3 files >800 lines | LOW - post-acquisition |
| Square refs in docs | 148 files, code uses Stripe | MEDIUM - docs drift |
| Test coverage | Unknown - verify | MEDIUM |

**475 commits since October audit** - significant work completed.

---

## The Prompt

Copy everything below into a new Claude Code session:

---

# Minimal Enterprise Audit for M&A Readiness

This is a focused 6-area audit optimized for funding/acquisition due diligence. Skip the engineering perfectionism - acquirers buy working businesses, not perfect codebases.

**Time**: 15-20 minutes
**Output**: Go/No-Go assessment with prioritized blockers

## Launch 6 Parallel Agents

### Agent 1: SECURITY (Deal-Blocking)

```
CRITICAL: These findings can kill a deal or reduce valuation 5-10%

Search for:
1. Secrets in git history: git log --all -p | grep -E "(sk-|OPENAI|SECRET|PASSWORD|KEY=)"
2. Secrets in code: grep -r "sk-\|apiKey\|secret" --include="*.ts" --include="*.json"
3. Demo mode exposure: grep -r "DEMO_LOGIN" server/ --include="*.ts"
4. npm audit output

Files to examine:
- .env* files (if any committed)
- server/src/middleware/auth.ts
- client/src/contexts/AuthContext.tsx

Output:
- List of exposed secrets with rotation urgency
- Demo mode production risk assessment
- Dependency vulnerabilities summary
- VERDICT: CLEAR / NEEDS IMMEDIATE ACTION
```

### Agent 2: MULTI-TENANCY (Deal-Blocking)

```
CRITICAL: Cross-tenant data leak = extinction event for restaurant SaaS

Verify:
1. Every Prisma query includes restaurant_id filter
2. RLS policies exist and are enforced
3. API middleware validates tenant context
4. No endpoints bypass tenant isolation

Files to examine:
- prisma/schema.prisma (check all models)
- server/src/middleware/*.ts
- server/src/services/*.ts (search for queries without restaurant_id)
- server/src/routes/*.ts

Output:
- List of queries missing tenant filter
- RLS policy coverage assessment
- Middleware enforcement verification
- VERDICT: ISOLATED / GAPS FOUND
```

### Agent 3: FINANCIAL INTEGRITY (Due Diligence Critical)

```
NEW AREA: Payment systems are 10x more important than TypeScript purity

Verify:
1. Order totals cannot be manipulated client-side
2. Double-charge protection exists
3. Refunds are properly logged
4. Audit trail for all financial transactions
5. Stripe webhook signature verification

Files to examine:
- server/src/routes/payments*.ts
- server/src/services/payment*.ts
- server/src/routes/orders*.ts
- Any Stripe integration code

Output:
- Payment flow security assessment
- Audit trail completeness
- Known financial vulnerabilities
- VERDICT: SECURE / NEEDS REVIEW
```

### Agent 4: LICENSE COMPLIANCE (Deal-Blocking)

```
CRITICAL: GPL contamination can kill a deal

Run: npx license-checker --summary
Check for: GPL, LGPL, AGPL in production dependencies

Files to examine:
- package.json (all workspaces)
- package-lock.json

Output:
- License summary by type
- Any copyleft licenses in production deps
- Remediation path for problematic licenses
- VERDICT: CLEAR / CONTAMINATED
```

### Agent 5: TEST & DEPLOY CONFIDENCE

```
Acquirers want to know: Can you ship safely?

Check:
1. npm test output (pass rate)
2. Test coverage for critical paths (auth, payments, orders)
3. CI pipeline success rate (last 20 runs)
4. E2E tests for happy paths

Files to examine:
- .github/workflows/*.yml
- Recent CI run logs
- vitest.config.ts, playwright.config.ts
- Test files in __tests__/ and e2e/

Output:
- Current coverage %
- Untested critical paths
- CI reliability score
- VERDICT: SHIPPABLE / FRAGILE
```

### Agent 6: OPERATIONAL MATURITY

```
Evidence of mature engineering practices

Check:
1. README exists and npm run dev works
2. Environment variable documentation
3. Historical uptime if available
4. Deployment documentation
5. On-call/incident procedures

Files to examine:
- README.md, CLAUDE.md
- docs/ directory
- .env.example
- Deployment configs

Output:
- Operational readiness score
- Documentation gaps
- Key person risk assessment
- VERDICT: MATURE / NEEDS DOCUMENTATION
```

---

## Synthesis Output

After all 6 agents complete, provide:

### Executive Summary

```markdown
## M&A Readiness Assessment

| Area | Verdict | Blocking? | Fix Effort |
|------|---------|-----------|------------|
| Security | [CLEAR/ACTION] | [Y/N] | [X hours] |
| Multi-Tenancy | [ISOLATED/GAPS] | [Y/N] | [X hours] |
| Financial Integrity | [SECURE/REVIEW] | [Y/N] | [X hours] |
| License Compliance | [CLEAR/ISSUE] | [Y/N] | [X hours] |
| Test/Deploy | [SHIPPABLE/FRAGILE] | [Y/N] | [X hours] |
| Operations | [MATURE/NEEDS WORK] | [Y/N] | [X hours] |

**Overall Status**: READY FOR DUE DILIGENCE / NEEDS [X] DAYS PREP

**Top 3 Blockers** (if any):
1. ...
2. ...
3. ...
```

### What's Working Well
Document strengths for the acquisition narrative (not code purity - business value):
- Customer-facing reliability
- Security practices in place
- Multi-tenancy enforcement
- Payment system integrity

### Minimum Remediation Path
If blockers found, provide the fastest path to "ready":
- Exact files to change
- Specific fixes (not "improve error handling")
- Realistic effort in hours

---

## What We Deliberately Skipped

These items from v1 are deprioritized post-acquisition:

| Skipped Area | Reason |
|--------------|--------|
| TypeScript `any` elimination | Doesn't affect deal value |
| God class decomposition | Engineering vanity |
| Error handling patterns | Too vague, not blocking |
| Dead code detection | Doesn't break production |
| N+1 query detection | Premature optimization |
| API response times | No evidence of problems |
| Type assertion audit | Same as `any` issue |
| DR documentation | Separate workstream |

These can be addressed by the acquiring team's engineering org.

---

## Success Criteria

The audit is complete when:
- [ ] All 6 areas have clear VERDICT
- [ ] Blocking issues identified with file:line references
- [ ] Remediation effort is in hours, not weeks
- [ ] Go/No-Go decision is unambiguous

---

*Simplified from 20-agent v1 based on:*
- *DHH perspective: "20 agents is consultant theater"*
- *Production reality: "Focus on what affects deal value"*
- *Simplicity review: "5 areas achieves 80% of insight"*
