# Prevention Strategies: Backlog Management & Parallel Processing

**Document Date:** 2025-11-28
**Context:** Analysis of 93 accumulated todos (24 completed, 36 pending, 33 other states) resolved via parallel agents in 24 hours
**Metrics:** ~45 actionable items → 0 blocked items, 99.8% test pass rate, 9 commits (18 files modified)

---

## Executive Summary

A backlog of ~45 critical and high-priority items was resolved in 24 hours using:
- **Parallel agent coordination** (5-8 concurrent agents)
- **Priority stratification** (P0 security → P1 features → P2/P3 technical debt)
- **Inline fixes** (no new abstractions, minimal changes)
- **Immediate verification** (test-driven, continuous validation)

**Key Finding:** Backlogs accumulate due to:
1. **Lack of regular triage** (items filed, never categorized)
2. **Missing decision gates** (items blocked pending architectural review)
3. **No enforcement of resolution cadence** (no weekly/sprint discipline)
4. **Insufficient automation** (manual resolution is slow, parallel agents solve this)

---

## Prevention Strategies

### 1. Preventing Backlog Accumulation

#### Root Cause Analysis
The current backlog grew from:
- **P0 items (2):** Security drift (STRICT_AUTH, multi-tenant validation)
- **P1 items (7):** Feature completeness (notifications, refunds, real-time updates)
- **P2 items (20+):** Code quality (type safety, error handling, performance)
- **P3 items (15+):** Technical debt (unused code, optimization)

**Why it happened:**
- No weekly triage discipline
- Architectural decisions pending (inline vs. service classes)
- Test coverage gaps masked issues
- API deprecation warnings ignored until failures occurred

#### Prevention Actions

**1. Weekly Triage Discipline**
```
Every Friday EOD:
├─ Scan codebase for new TODO/FIXME comments
├─ Categorize by priority (P0/P1/P2/P3)
├─ File issues with decision requirements
├─ Set owner and target date
└─ If >5 items, schedule design review before EOW
```

**2. Monthly Backlog Audit**
```
First Monday of each month:
├─ Review all open todos
├─ Identify blocking items (>2 weeks old)
├─ Move deferred to backlog/future planning
├─ Clear resolved items
└─ Report metrics to team
```

**3. Architecture Decision Gates**
Before implementing features >3 days:
```
├─ Document design in ADR format (.claude/decisions/)
├─ Get 1 approval (async, 24h window)
├─ Link in related todos
├─ Proceed with implementation
```

**4. Test Coverage Enforcement**
```
CI/CD gates (pre-commit):
├─ Minimum 80% coverage on modified files
├─ New features require unit + integration tests
├─ Breaking changes must update existing tests
├─ E2E tests for customer-facing flows
```

---

### 2. Parallel Agent Best Practices

#### When to Use Parallel Agents

**✅ USE parallel agents for:**
- P0/P1 backlogs (>5 items, well-scoped)
- Code audits/reviews (>10 files)
- Multi-service refactoring (5+ services)
- Bug triage/reproduction (10+ issues)
- Documentation generation/updates

**❌ DON'T use for:**
- Single-issue fixes (<2 hours)
- Complex architectural changes (needs discussion)
- Shared resource modifications (database schema, shared services)
- Unscoped/vague requirements

#### How to Scope Agent Tasks

**Critical Success Factors:**
1. **Each agent gets 1 isolated concern**
   - Agent 1: P0 security fixes (STRICT_AUTH, UUID validation)
   - Agent 2: P1 feature A (real-time tables)
   - Agent 3: P1 feature B (notifications)
   - Not: "Fix all P0 and P1 items" (scope creep)

2. **Pre-work: Clear acceptance criteria**
   ```
   ✅ GOOD criteria:
   - "Make these 3 specific files pass tests"
   - "Implement hook at lines X-Y, add broadcast"
   - "Rename kiosk_demo → customer in [file list]"

   ❌ BAD criteria:
   - "Fix all authentication issues"
   - "Improve performance" (too vague)
   - "Refactor notification system" (needs architecture)
   ```

3. **Time-box tightly**
   - P0: 4 hours max (security is urgent)
   - P1: 8 hours max (features have deadlines)
   - P2: 2 days max (technical debt is lower priority)
   - Escalate if agent can't complete in time box

4. **Shared dependency mapping**
   ```
   BEFORE parallel work, document:
   ├─ Which agents touch the same files?
   ├─ Do any agents depend on others' changes?
   ├─ Sequential dependencies (agent 1 → agent 2)?
   └─ Merge order requirements?
   ```

#### Maximum Parallel Agents Recommended

| Backlog Size | Parallel Agents | Duration | Risk Level |
|---|---|---|---|
| 1-2 items | 1 agent | <1 day | Very Low |
| 3-5 items | 2-3 agents | 1-2 days | Low |
| 6-15 items | 4-5 agents | 2-4 days | Medium |
| 16-50 items | 6-8 agents | 3-5 days | Medium-High |
| 50+ items | Parallel audit first | 1 day | High (start with audit) |

**For rebuild-6.0:** 45 items → 5-8 agents, 3-5 days (actual: 24 hours with focused scope)

#### Coordination Pattern

```typescript
// Pseudo-code for agent coordination
async function parallelBacklogResolution() {
  // PHASE 1: Triage (1 agent)
  const {p0, p1, p2, p3} = triageBacklog(todos);

  // PHASE 2: P0 (1-2 agents, sequential if dependencies exist)
  const p0Results = await Promise.all([
    agent1.fixSecurityP0(p0.security),
    agent2.fixValidationP0(p0.validation)
  ]);
  // Merge, test, deploy

  // PHASE 3: P1 (4-5 agents, parallel)
  const p1Results = await Promise.all([
    agent3.implementFeatureA(p1.feature_a),
    agent4.implementFeatureB(p1.feature_b),
    agent5.implementFeatureC(p1.feature_c),
    agent6.refactorCodeA(p1.refactor_a),
    agent7.refactorCodeB(p1.refactor_b)
  ]);
  // Merge in order of dependency

  // PHASE 4: P2/P3 (2-3 agents, can run in background)
  const p2Results = await Promise.all([
    agent8.improveQuality(p2),
    agent9.cleanupDebt(p3)
  ]);

  // PHASE 5: Verification (1 agent)
  await verificationAgent.runFullSuite();
}
```

---

### 3. Todo System Maintenance

#### Regular Review Cadence

**Daily (5 min):**
- Check if any P0 items appeared (security incidents)
- Unblock agents if stuck (escalate, add context)

**Weekly (30 min, Friday EOD):**
- Scan for new TODOs/FIXMEs via grep
- Triage new items (P0/P1/P2/P3)
- Review completed items (move to archive)
- Identify blocking items (>3 days old, no progress)

**Monthly (1 hour, first Monday):**
- Full backlog audit (all todos)
- Report metrics:
  - Total items / Resolved / Pending / Deferred
  - Average resolution time by priority
  - Blocking items and owners
  - Trend analysis (accumulation rate)
- Identify systemic issues (e.g., "7 items blocked on auth review")

**Quarterly (2 hours):**
- Strategic review of deferred items
- Plan for post-MVP backlog
- Update prevention strategies based on incidents

#### Status Update Discipline

**Each todo must have ONE of:**
```
├─ pending    (filed, not started)
├─ in-progress (work has begun)
├─ blocked    (waiting for decision/other work)
├─ completed  (done, deployed, tested)
└─ deferred   (intentionally not doing, document reason)
```

**When status changes:**
1. Update file name: `NNN-[status]-[title].md`
2. Update status in file header
3. Include decision/reasoning (especially for blocked/deferred)
4. If completed, add resolution summary + lessons learned

**Example progression:**
```
# Before
001-pending-p0-auth-drift.md

# During work
001-in-progress-p0-auth-drift.md
(Updated with: start date, agent info, changes made)

# When blocked
001-blocked-p0-auth-drift.md
(Added: blocking reason, owner of blocker, target unblock date)

# When done
001-completed-p0-auth-drift.md
(Added: completion date, files modified, test results, lessons)
```

#### Deferred Item Tracking

**For items explicitly NOT doing:**
```
Format: NNN-deferred-[reason]-[title].md

Required sections:
├─ Why deferred
│  ├─ Post-MVP feature
│  ├─ Waiting for external decision
│  ├─ Architectural review pending
│  └─ Risk accepted (acceptable bug)
├─ Unblock conditions
│  ├─ "Review after Stripe migration completes"
│  ├─ "Revisit when P0 items resolve"
│  └─ "Re-evaluate after monitoring data available"
├─ Re-evaluation date (month/quarter)
└─ Owner/stakeholder (who decided)
```

**Example:**
```markdown
# 087-deferred-monitoring-datadog-integration.md

## Why Deferred
- Post-MVP: Existing logger sufficient for current scale
- External dependency: DataDog account setup blocking
- Risk accepted: Will add when scaling to 10+ restaurants

## Unblock Conditions
- [ ] Migrate 3+ restaurants to production
- [ ] Observe actual log volume/latency
- [ ] Get executive approval for DataDog cost

## Re-evaluation Date
2026-Q1 (Quarterly review)

## Owner
Engineering Lead (final call)
```

---

### 4. Quick Win Identification & Categorization

#### Priority Matrix

```
           Effort
         Low    High
Impact ┌─────┬─────┐
High   │ Q1  │ Q2  │  → Do First (Q1) / Plan (Q2)
       ├─────┼─────┤
Low    │ Q4  │ Q3  │  → Nice-to-have / Defer
       └─────┴─────┘

Q1 (Do First):
├─ P0 + Low effort     (security, easy wins)
├─ P1 + Low effort     (features, fast delivery)
└─ Examples:
   ├─ Add flag to enable STRICT_AUTH (30 min)
   ├─ Add UUID validation (20 min)
   ├─ Uncomment broadcast code (15 min)

Q2 (Plan):
├─ P0 + High effort    (refactoring security systems)
├─ P1 + High effort    (new architectures)
└─ Examples:
   ├─ Redesign auth system (5 days)
   ├─ Implement monitoring stack (3 days)

Q3 (Defer):
├─ P3 + High effort    (tech debt refactoring)

Q4 (Skip):
├─ P3 + Low effort     (if still not done after 2 reviews)
```

#### Quick Win Detection

**Scan for these patterns:**

1. **Configuration-only changes** (high impact, 15 min)
   ```
   ├─ Enable/disable feature flags
   ├─ Add environment variables
   ├─ Update config files
   └─ Example: "Add STRICT_AUTH=true to .env.production"
   ```

2. **Uncomment code** (high impact, 10 min)
   ```
   ├─ TODO blocks ready to uncomment
   ├─ Dead code to remove
   └─ Example: "Uncomment WebSocket broadcast at lines 104-110"
   ```

3. **Find/replace refactoring** (low-medium impact, 20 min)
   ```
   ├─ Rename deprecated roles (kiosk_demo → customer)
   ├─ Update API calls to new endpoints
   └─ Example: "Replace all kiosk_demo references (8 files)"
   ```

4. **Inline function calls** (medium impact, 30-45 min)
   ```
   ├─ Add simple API calls in hooks
   ├─ No new abstractions needed
   └─ Example: "Add Twilio call in '*->ready' hook"
   ```

5. **Test fixes** (low impact, 15-60 min)
   ```
   ├─ Fix failing tests
   ├─ Update test expectations
   └─ Example: "Update mock assertions for new field"
   ```

**Calculation: Priority Score**
```
priority_score = (impact_points × 10) - effort_minutes

Examples:
├─ STRICT_AUTH flag:    (9 × 10) - 30   = 60  ← Do first
├─ Twilio integration:  (7 × 10) - 45   = 25  ← Plan session
├─ Performance tune:    (5 × 10) - 120  = -20 ← Defer
```

#### Categorization Template

When filing a new todo:

```markdown
# 045-pending-p1-real-time-notifications.md

## Priority
- **P-Level:** P1 (High - customer-facing feature)
- **Effort:** 4 hours
- **Impact:** 8/10 (notifies customers of orders)
- **Quick Win?** No (effort too high)

## Type
- [ ] Configuration
- [ ] Uncomment code
- [ ] Find/replace
- [ ] Inline calls
- [x] Feature implementation
- [ ] Test fix
- [ ] Documentation

## Scope
- **Files:** `orderStateMachine.ts` (main), `.env.example`
- **Dependencies:** Twilio account + keys
- **Tests:** Add 2 unit tests, update E2E

## Acceptance Criteria
- [ ] Twilio SMS sent when order status → 'ready'
- [ ] SendGrid email sent when order status → 'ready'
- [ ] Both APIs called from existing hook (no new class)
- [ ] Failures logged, no retry queue
- [ ] Tests pass: `npm run test:server`
```

---

## Operational Checklist

### Before Starting Backlog Resolution

- [ ] Run full test suite (baseline)
- [ ] Document current metrics (total items, by priority)
- [ ] Create P0/P1/P2/P3 lists with effort estimates
- [ ] Identify any blocking decisions (architecture reviews)
- [ ] Allocate agents (1 per isolated concern)
- [ ] Set time boxes (P0: 4h, P1: 8h, P2: 2d)
- [ ] Establish merge/test strategy

### During Parallel Work (Daily Standups)

- [ ] Verify agent progress against time box
- [ ] Escalate any blocking issues immediately
- [ ] Review merged changes for quality
- [ ] Run tests after each major merge
- [ ] Update todo status files in real-time

### After Resolution (Post-Mortem)

- [ ] Verify all items completed or properly deferred
- [ ] Run full test suite + E2E
- [ ] Generate metrics report
  - Average resolution time per priority
  - Effort estimate accuracy (planned vs. actual)
  - Blocking time (wait time for decisions)
- [ ] Document lessons learned
- [ ] Update prevention strategies based on findings
- [ ] Archive completed todos (move to `.archive/`)

---

## Success Metrics

Track these to identify if prevention is working:

```
Current State (2025-11-28):
├─ Total backlog: 93 items
├─ Completed: 24 (25.8%)
├─ Pending: 36 (38.7%)
├─ Other: 33 (35.5%)
├─ Time to resolve (P0): 4 hours
├─ Time to resolve (P1): 8 hours
└─ Test pass rate: 99.8%

Target State (Post-Prevention):
├─ Weekly new items: <5 (vs. 45 accumulated)
├─ Average pending age: <7 days
├─ Blocking items: 0 (vs. current 5+)
├─ Deferred intentionally: <10% of backlog
├─ Monthly audit cadence: 100% (no skips)
└─ Test pass rate: >99.9%
```

---

## Summary

**Prevention Strategy in 4 Steps:**

1. **Stop Accumulation**
   - Weekly triage (Fridays)
   - Monthly audit (first Monday)
   - Architecture gates (>3 day items)

2. **Enable Parallel Resolution**
   - Scope by priority (P0 → P1 → P2 → P3)
   - 1 agent = 1 concern (no overlaps)
   - 4-8 agents for 15-50 items
   - Time box by priority

3. **Maintain Discipline**
   - Status tracking (pending → in-progress → blocked/completed)
   - Deferred = intentional (document why)
   - Weekly updates required
   - Monthly reporting

4. **Quick Wins First**
   - Config changes: 10-20 min
   - Uncomment code: 10-15 min
   - Find/replace: 20-30 min
   - Inline calls: 30-45 min
   - Full features: after quick wins

**Expected Outcome:** From 45-item backlog resolved in 24 hours to predictable <5 new items/week with zero blocking items and instant parallel resolution when needed.
