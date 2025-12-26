# Deep Research Prompt: Enterprise Readiness Audit

**Purpose**: Comprehensive codebase analysis for funding/acquisition preparation
**Generated**: 2025-12-24
**Based On**: 10-agent parallel audit of rebuild-6.0

---

## Instructions for Claude Code

Run this prompt in a fresh Claude Code session. It will launch 20 parallel research agents, each investigating a specific area of technical debt, security, or code quality. Results will be synthesized into an actionable remediation roadmap.

**Estimated Token Usage**: 200-300k tokens
**Estimated Time**: 45-90 minutes
**Output**: Detailed findings + prioritized fix list

---

## The Prompt

Copy everything below this line into a new Claude Code session:

---

# Enterprise Readiness Deep Audit

I need you to perform an exhaustive audit of this codebase for funding/acquisition preparation. Launch 20 parallel research agents to investigate the areas below. Each agent should:

1. Search for ALL instances of the pattern/issue
2. Provide exact file paths and line numbers
3. Rate severity (CRITICAL/HIGH/MEDIUM/LOW)
4. Propose specific fixes with code examples
5. Estimate remediation effort in hours

After all agents complete, synthesize findings into a prioritized remediation roadmap.

## Research Areas

### TIER 1: CRITICAL SECURITY (Launch First)

**Area 1: Secrets Audit**
```
Search for: API keys, tokens, passwords, secrets in code and git history
Files to check: .env*, *.ts, *.tsx, *.json, git log
Known issue: Production secrets may be in .env file
Deliverable: List of all exposed secrets + rotation plan
```

**Area 2: Demo Mode Security**
```
Search for: DEMO_LOGIN_ENABLED, demo auth bypasses, test credentials in production paths
Files: server/src/middleware/auth.ts, client/src/contexts/AuthContext.tsx
Risk: Demo mode accidentally enabled in production
Deliverable: Audit of all demo-related code paths + production safeguards
```

**Area 3: Authentication Vulnerabilities**
```
Analyze: Dual-auth pattern (Supabase + localStorage JWT)
Files: client/src/services/http/httpClient.ts:109-148, ADR-006
Check: Token expiry handling, XSS vectors, session fixation
Deliverable: Security assessment of localStorage JWT fallback
```

### TIER 2: TYPE SAFETY & CODE QUALITY

**Area 4: TypeScript `any` Elimination**
```
Search for: `: any`, `as any`, `// @ts-ignore`, `// @ts-expect-error`
Known count: 639+ usages across codebase
Priority files: services/, middleware/, contexts/
Deliverable: Categorized list with refactoring priority
```

**Area 5: God Class Decomposition**
```
Identify files > 500 lines, analyze cohesion
Known issues:
- server/src/services/voice/VoiceEventHandler.ts (1,271 lines)
- client/src/components/FloorPlan/FloorPlanCanvas.tsx (985 lines)
- server/src/services/orders.service.ts (819 lines)
Deliverable: Decomposition strategy for each god class
```

**Area 6: Error Handling Patterns**
```
Search for: try/catch blocks, error boundaries, unhandled promise rejections
Check consistency: Are errors logged? Typed? Propagated correctly?
Files: All .ts and .tsx files
Deliverable: Error handling standardization guide
```

**Area 7: Type Assertion Audit**
```
Search for: `as unknown as`, type assertions without validation
Risk: Runtime type mismatches, silent failures
Deliverable: List of dangerous assertions + runtime validation additions
```

### TIER 3: TEST INFRASTRUCTURE

**Area 8: Test Coverage Analysis**
```
Current: 53.5% coverage
Target: 70%+ for enterprise
Identify: Untested critical paths (auth, payments, order flow)
Files: *.test.ts, *.spec.ts, coverage reports
Deliverable: Coverage gap analysis + test priority list
```

**Area 9: Test Quality Audit**
```
Search for: Flaky tests, skipped tests, weak assertions
Check: Mock drift from real implementations
Files: __tests__/, *.test.ts, vitest.config.ts
Deliverable: Test health report + remediation plan
```

**Area 10: E2E Test Completeness**
```
Analyze: Playwright test coverage of user journeys
Critical paths: Login, order flow, payment, KDS workflow
Files: e2e/, playwright.config.ts
Deliverable: Missing E2E scenarios + implementation plan
```

### TIER 4: DATABASE & PERFORMANCE

**Area 11: Missing Database Indexes**
```
Analyze: prisma/schema.prisma for missing indexes
Known issue: voice_modifier_rules.restaurant_id missing index
Check: All foreign keys, frequently queried columns
Deliverable: Index recommendations with query impact analysis
```

**Area 12: N+1 Query Detection**
```
Search for: Sequential database calls in loops, missing includes/joins
Files: server/src/services/*.ts, server/src/routes/*.ts
Deliverable: N+1 patterns + Prisma optimization fixes
```

**Area 13: Memory Leak Patterns**
```
Search for: setInterval without cleanup, addEventListener without removal
Reference: CL-MEM-001, CL-TIMER-001 lessons
Files: All React components, WebSocket handlers
Deliverable: Memory leak inventory + cleanup implementations
```

**Area 14: API Response Time Analysis**
```
Check: Slow endpoints, missing caching, redundant computations
Files: server/src/routes/*.ts, rate limiting config
Deliverable: Performance optimization recommendations
```

### TIER 5: ARCHITECTURE & DOCUMENTATION

**Area 15: API Specification Drift**
```
Compare: OpenAPI spec vs actual implementation
Known issue: Spec references Square but code uses Stripe
Files: docs/api/, server/src/routes/*.ts
Deliverable: Spec-to-code discrepancy report + fixes
```

**Area 16: Dead Code Detection**
```
Search for: Unused exports, unreachable code paths, orphaned files
Tools: Use LSP references, import analysis
Deliverable: Dead code inventory safe to remove
```

**Area 17: Multi-tenancy Completeness**
```
Verify: Every database query includes restaurant_id filter
Check: RLS policies, middleware enforcement, client context
Files: prisma/schema.prisma, server/src/middleware/*.ts
Deliverable: Multi-tenancy gap analysis
```

**Area 18: Dependency Vulnerability Audit**
```
Run: npm audit, check for outdated packages
Analyze: Supply chain risks, license compliance
Files: package.json, package-lock.json
Deliverable: Vulnerability report + upgrade plan
```

### TIER 6: DEVOPS & OPERATIONS

**Area 19: CI/CD Pipeline Gaps**
```
Analyze: GitHub workflows, deployment scripts
Check: Missing stages (security scanning, performance tests)
Files: .github/workflows/*.yml, scripts/*.sh
Deliverable: CI/CD maturity assessment + improvements
```

**Area 20: Observability & Disaster Recovery**
```
Check: APM integration, error tracking, log aggregation
Verify: Backup procedures, recovery runbooks
Known gap: No documented disaster recovery procedures
Deliverable: Observability roadmap + DR documentation template
```

---

## Output Format

After all 20 agents complete, provide:

### 1. Executive Summary
- Overall enterprise readiness score (1-10)
- Top 5 blocking issues for funding/acquisition
- Estimated total remediation effort

### 2. Critical Findings (Fix Before Due Diligence)
| Issue | Severity | File(s) | Effort | Owner |
|-------|----------|---------|--------|-------|

### 3. Prioritized Remediation Roadmap
Week 1: [Critical security issues]
Week 2-3: [Type safety improvements]
Week 4: [Test coverage gaps]
Week 5-6: [Architecture cleanup]

### 4. Technical Debt Inventory
Complete list of all findings with:
- Unique ID
- Category
- Description
- Location (file:line)
- Severity
- Fix recommendation
- Effort estimate

### 5. Positive Findings
Document what IS working well for the acquisition narrative:
- Security practices in place
- Test infrastructure maturity
- Documentation quality
- Architecture decisions

---

## Agent Execution Strategy

Use this pattern to launch agents in parallel batches:

```
Batch 1 (CRITICAL): Areas 1-3 (Security)
Batch 2 (HIGH): Areas 4-7 (Code Quality)
Batch 3 (MEDIUM): Areas 8-10 (Testing)
Batch 4 (MEDIUM): Areas 11-14 (Performance)
Batch 5 (LOW): Areas 15-18 (Architecture)
Batch 6 (LOW): Areas 19-20 (Operations)
```

For each area, use the Task tool with:
- subagent_type: "Explore" for searches
- subagent_type: "general-purpose" for analysis
- model: "haiku" for quick searches, "sonnet" for deep analysis

---

## Known Context from Initial Audit

These issues were already identified - agents should verify and expand:

1. **CRITICAL**: .env file may contain production secrets
2. **HIGH**: 639+ TypeScript `any` usages
3. **HIGH**: 3 god classes > 800 lines each
4. **HIGH**: 53.5% test coverage (target 70%)
5. **MEDIUM**: 168 stale git branches
6. **MEDIUM**: OpenAPI spec drift (Square vs Stripe)
7. **MEDIUM**: Missing APM/observability infrastructure
8. **LOW**: 22 "fix(ci)" commits indicate pipeline instability

---

## Success Criteria

The audit is complete when:
- [ ] All 20 areas have been investigated
- [ ] Every finding has file:line references
- [ ] Remediation roadmap is time-boxed
- [ ] Effort estimates total to realistic timeline
- [ ] Positive findings documented for acquisition narrative

---

*Generated by Enterprise Readiness Audit System*
*For rebuild-6.0 Restaurant OS*
