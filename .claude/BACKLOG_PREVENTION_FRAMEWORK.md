# TODO Backlog Prevention Framework

**Document Status:** Codified Prevention Pattern
**Date Created:** 2025-11-29
**Based On:** Successful resolution of 45+ item backlog via parallel agents
**Scope:** Restaurant OS (rebuild-6.0) - Applicable to all codebases

---

## Executive Summary

A 45+ item TODO backlog was resolved in 24 hours using parallel agent processing. This document codifies the prevention strategies, best practices, and operational patterns to ensure backlogs never accumulate again while maintaining the ability to resolve them rapidly if needed.

**Key Insight:** Backlogs don't grow because of velocity—they grow because of **triage discipline** and **decision latency**. Fix these two, and you can resolve any backlog in hours, not weeks.

---

## Part 1: Prevention Strategies

### 1.1 Stop Backlog Accumulation at the Source

#### Root Cause of Accumulation

Backlogs grow when:
1. **Decisions are delayed** - "Should we do this?" unanswered for weeks
2. **Triage is skipped** - New todos filed without priority assignment
3. **No resolution cadence** - Issues aging without status updates
4. **Mixed priority levels** - High and low priority items treated equally
5. **Silent deprecations** - API changes or refactors create "orphan" todos

#### Weekly Triage Discipline

**Every Friday, 4:00 PM (30 minutes):**

```markdown
WEEKLY TRIAGE CHECKLIST

1. Scan for New Todos (5 min)
   - Command: grep -r "TODO\|FIXME" client/src/ server/src/
   - Filter: New items added this week only
   - Action: File each new item as todo.md file

2. Categorize by Priority (10 min)
   - P0 (Critical): Security, blocking issues, production bugs
   - P1 (High): Features, important refactors, blocking development
   - P2 (Medium): Code quality, performance, minor bugs
   - P3 (Low): Polish, nice-to-haves, deferred features

3. Identify Blocking Items (10 min)
   - Items >3 days old without progress
   - Items blocked on architectural decisions
   - Items blocked on external dependencies
   - Action: Escalate to team lead with decision required date

4. Mark Completed/Deferred (5 min)
   - Move resolved items to archive
   - Rename deferred items with reason and re-eval date
   - Update status in tracking spreadsheet

OUTCOME: Zero new items >3 days without classification
```

**Automation:** Add to CI/CD schedule:
```bash
# .github/workflows/todo-scan.yml
on:
  schedule:
    - cron: '0 16 * * FRI'  # Every Friday 4 PM
jobs:
  scan-todos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Scan for new TODOs
        run: grep -r "TODO\|FIXME" . > /tmp/todos.txt
      - name: Report (in issue comment)
        run: gh issue create --title "Weekly TODO Scan" --body "$(cat /tmp/todos.txt)"
```

#### Monthly Backlog Audit

**First Monday of each month (1 hour):**

```markdown
MONTHLY AUDIT CHECKLIST

1. Generate Backlog Report (15 min)
   - Count: Total items / By priority / By category
   - Age: Items >14 days old without activity
   - Status: Pending / In-progress / Blocked / Completed / Deferred

   Command:
   ls -la todos/ | wc -l  # Total count
   grep -l "pending" todos/*.md | wc -l  # Pending count
   find todos/ -mtime +14 -name "*pending*" # Aging items

2. Identify Systemic Issues (15 min)
   - Are certain categories always blocked? (e.g., "All auth items blocked on team lead")
   - Are any items duplicated? (same issue filed twice)
   - Is there a pattern to deferred items? (e.g., "All integration work deferred")
   - Root cause analysis: Why did these patterns emerge?

3. Clear Blockers (20 min)
   - For each blocked item >7 days:
     - Get decision from stakeholder
     - Update blocking reason with decision
     - Unblock or formally defer
   - Escalate to leadership if can't unblock

4. Generate Metrics Report (10 min)
   - Current backlog: X items (target: <5 new items/week)
   - Pending age: Average X days (target: <7 days)
   - P0/P1 resolution time: X hours (target: <24 hours)
   - Blocking items: X (target: 0)
   - Test pass rate: X% (target: >99.5%)

OUTCOME: <5 new items/week, zero blocked items >7 days old
```

#### Quarterly Strategic Review

**Once per quarter (2 hours):**

```markdown
QUARTERLY STRATEGIC REVIEW

1. Trend Analysis (30 min)
   - Are backlogs shrinking? (target: 80% resolution rate)
   - What categories have most issues? (pain points)
   - How often are parallel agents needed? (capacity planning)
   - Team sentiment: What's frustrating? (process issues)

2. Deferred Item Review (30 min)
   - Re-evaluate all deferred items
   - Move to active if conditions met
   - Re-defer with new target date if not ready
   - Archive if no longer relevant

3. Prevention Effectiveness (30 min)
   - Did any P0 items surprise us? (should have been caught earlier)
   - Did we hit any "I didn't know this was broken" moments?
   - Are our priority levels accurate?
   - Update prevention strategies based on findings

4. Capacity Planning (30 min)
   - How many parallel agents did we need this quarter?
   - Can we handle next quarter's expected backlog?
   - Do we need to hire / adjust team structure?
   - Plan for upcoming major refactors / features

OUTCOME: Updated prevention strategy, team alignment on Q next priorities
```

---

### 1.2 Define When TODOs Should Become Issues

**Problem:** Ambiguous boundary between inline TODOs and formal issues creates duplicate tracking.

**Solution:** Clear criteria for what stays in code vs. what becomes a GitHub issue.

#### TODO (Stays in Code)

Use inline TODOs for:
- **Implementation details** that don't need team discussion
- **Technical debt** under 8 hours effort
- **Minor refactors** with clear scope
- **Test improvements** under 2 hours
- **Documentation updates** under 1 hour
- **Code cleanup** (remove unused functions, simplify logic)

```typescript
// EXAMPLE: Stays as TODO comment
function processOrder(order: Order) {
  // TODO: Extract ModifierList to separate component (2 hours)
  // This improves component reusability but isn't blocking
  return applyModifiers(order);
}

// EXAMPLE: Stays as TODO comment
// TODO: Add caching for menu queries (1 hour, performance improvement)
const menu = await db.query('SELECT * FROM menu');
```

#### GitHub Issue (Formal Tracking)

Create a GitHub issue for:
- **P0 / P1 items** (all of them)
- **P2+ items** > 8 hours effort
- **Features** requiring specification / design
- **Items affecting users** (bugs, blocking features)
- **Items with external dependencies** (third-party APIs, team coordination)
- **Questions / decisions** requiring team input

```markdown
# GitHub Issue Template for TODOs

## Title
[P1] Fix voice checkout timeout on slow connections

## Description
Currently voice checkout fails if network latency >2s. Users on poor connections can't complete orders.

## Evidence
- Production logs: 40+ failures in past week
- User reports: Slack #support channel (6 complaints)
- Reproducible: Deploy to slow connection simulator

## Acceptance Criteria
- [ ] Increase timeout from 30s to 60s for voice checkout
- [ ] Add exponential backoff for failed requests
- [ ] Tests pass for slow connection simulation
- [ ] Metrics show zero timeouts on 2s latency

## Effort Estimate
3-5 hours

## Labels
- P1-High
- voice-ordering
- bug
- needs-specs (if true)
```

#### Decision Tree

```
Is this a TODO or GitHub Issue?

1. Does it affect P0/P1?
   YES → Create GitHub Issue ✓
   NO → Continue to #2

2. Will this take >8 hours?
   YES → Create GitHub Issue ✓
   NO → Continue to #3

3. Does it need team/external input?
   YES → Create GitHub Issue ✓
   NO → Use inline TODO ✓

4. Does it affect production / users?
   YES → Create GitHub Issue ✓
   NO → Use inline TODO ✓
```

---

### 1.3 Architecture Decision Gates

**Problem:** Major decisions (architectural, design) get made ad-hoc, creating rework.

**Solution:** Lightweight ADR process for decisions that span multiple days/files.

#### When to Document a Decision

Create an ADR for any change:
- Affecting >3 files
- Taking >2 days effort
- Changing APIs / interfaces
- Touching multi-tenant logic
- Impacting performance
- Requiring rollback plan

#### Lightweight ADR Format

```markdown
# ADR-XXX: Brief Decision Title

**Date:** 2025-11-29
**Status:** Proposed (→ Approved → Implemented)
**Effort:** 3 days
**Impact:** High (affects voice ordering)

## Context

Why are we making this change? What problem does it solve?

## Decision

What are we going to do?

## Alternatives Considered

- Alternative A: (why rejected?)
- Alternative B: (why rejected?)

## Consequences

- ✅ Positive: What gets better?
- ⚠️ Negative: What gets worse?
- 📋 Neutral: What changes but isn't better/worse?

## Rollback Plan

How do we undo this if it breaks?

## Owner

Who's making this decision? (required for accountability)

## Approval

Approved by: [Lead] on [date]
```

#### Place in Codebase

```
.claude/decisions/
├── ADR-001-snake-case-convention.md
├── ADR-002-multi-tenancy-architecture.md
├── ADR-003-embedded-orders-pattern.md
├── ADR-004-websocket-realtime-architecture.md
├── ADR-005-client-side-voice-ordering.md
├── ADR-006-dual-authentication-pattern.md
├── ADR-007-per-restaurant-configuration.md
├── ADR-008-slug-based-routing.md
├── ADR-009-error-handling-philosophy.md
└── ADR-010-remote-database-source-of-truth.md
```

---

## Part 2: Best Practices for TODO Management

### 2.1 TODO File Structure and Metadata

#### Standard TODO File Format

```markdown
# [NNN]-[status]-p[0-3]-[category]-[brief-title].md

## Metadata
- **ID:** NNN (0-padded, e.g., 001)
- **Status:** pending | in-progress | blocked | completed | deferred
- **Priority:** P0 | P1 | P2 | P3
- **Category:** voice-ordering | kds | payments | database | etc.
- **Created:** YYYY-MM-DD HH:MM
- **Updated:** YYYY-MM-DD HH:MM (auto-update on changes)
- **Owner:** @username or "unassigned"
- **Effort:** X hours or X days (estimated at creation, actual after done)
- **Dependencies:** [Links to other todo IDs if any]

## Problem Statement

What is broken or missing? Why does it matter?

## Impact
- **Severity:** Critical | High | Medium | Low
- **Affected Users:** Who notices this?
- **Business Impact:** Revenue loss? User experience degradation?

## Acceptance Criteria
- [ ] Specific, measurable condition 1
- [ ] Specific, measurable condition 2
- [ ] Tests pass (specify which)
- [ ] No performance regression

## Technical Details

### Current Behavior
What's happening now? (code snippets, screenshots, logs)

### Expected Behavior
What should happen? (code snippets, screenshots, desired outcome)

### Files Involved
- `path/to/file1.ts` - (specific lines or functions affected)
- `path/to/file2.tsx` - (specific lines or functions affected)

### Root Cause (if known)
Why is this happening?

## Solution Approach

How will we fix it? (high-level, not line-by-line)

### Option A
Pros: ...
Cons: ...

### Option B (Recommended)
Pros: ...
Cons: ...

## Progress Notes

### 2025-11-29 (Created)
- Initial report filed

### 2025-11-30 (In Progress)
- Started investigation
- Found root cause in X file
- Solution approach documented

### 2025-12-01 (Completed)
- Changes merged in commit abc1234
- Tests added: test/voice/checkout.test.ts
- Lessons: [lessons learned, if any]

## Resolution Summary (if completed)

### What Changed
List of files modified with summary

### Evidence
- Tests passing: `npm test -- voice/checkout`
- Performance impact: None (measured with flame graph)
- Backward compatibility: ✅ (no API changes)

### Lessons Learned
- What surprised us?
- What would we do differently?
- Any patterns for future similar work?

## Related Issues

- GitHub Issue: #123
- ADR: ADR-005
- Other TODOs: #002, #045
```

#### File Naming Convention

```
Format: [NNN]-[status]-p[priority]-[category]-[title].md

Examples:
001-pending-p0-security-strict-auth-validation.md
002-in-progress-p1-voice-modifier-pricing.md
003-completed-p2-kds-component-extraction.md
004-blocked-p1-payments-stripe-webhook-auth.md
005-deferred-p3-polish-color-duplication-cleanup.md

Rules:
- ID: Zero-padded to 3 digits (001, 002, 010, 100)
- Status: Lowercase (pending, in-progress, blocked, completed, deferred)
- Priority: p0, p1, p2, p3 (lowercase)
- Category: Single word, no spaces (use hyphens)
- Title: Kebab-case, brief but descriptive
- Total length: <80 characters (fits in most shells)
```

---

### 2.2 Status Lifecycle and Transitions

#### Valid State Transitions

```
         ┌─────────────────────────────────┐
         │ PENDING (newly created)         │
         └──┬──────────────────────────────┘
            │
            ├─────→ IN-PROGRESS (work started)
            │       │
            │       ├─→ BLOCKED (waiting for something)
            │       │   └─→ IN-PROGRESS (unblocked, resume)
            │       │       └─→ COMPLETED (done!)
            │       │           └─→ DEFERRED (post-completion review)
            │       │
            │       └─→ COMPLETED (done!)
            │           └─→ DEFERRED (post-completion review)
            │
            └─────→ BLOCKED (can't start, waiting for decision/other work)
                    └─→ PENDING (unblocked, try again)

Special Paths:
├─ PENDING → DEFERRED (decided not to do, document why)
└─ IN-PROGRESS → PENDING (paused, will resume later)
```

#### Status Update Protocol

**When status changes:**
1. Update file name (rename file)
2. Update `Status` in metadata
3. Update `Updated` timestamp
4. Add entry to "Progress Notes" section
5. If blocked: Document blocking reason
6. If completed: Add "Resolution Summary" section
7. Commit with message: `docs(todos): update [NNN] status to [new-status]`

**Example commit messages:**
```bash
# Starting work
docs(todos): update 002 status to in-progress

# Blocked waiting for decision
docs(todos): update 045 status to blocked - waiting for ADR-012 approval

# Completed and deferred for next phase
docs(todos): update 089 status to deferred - post-mvp optimization
```

#### Time Limits Before Action Required

```
Status          Time Limit    Action Required
──────────────────────────────────────────────
pending         7 days        If still not started, either start or defer
in-progress     3 days        If no progress, assess blockers / escalate
blocked         7 days        If still blocked, escalate to lead
deferred        90 days       Re-evaluate, move to pending or archive
```

---

### 2.3 Dependency Tracking

#### Identifying Dependencies

```markdown
## Dependencies Section

### Blocks Other Items
- TODO-045 (voice checkout real-time notifications)
- TODO-089 (monitoring dashboard - needs metrics API)

### Blocked By Other Items
- TODO-002 (voice modifier pricing - needed for checkout calculations)
- ADR-005 (client-side voice processing architecture)

### External Dependencies
- Twilio API account (for SMS notifications)
- OpenAI Realtime API (for voice transcription)
- Stripe webhook setup (for payment confirmations)

Dependency Order (must do in this sequence):
1. TODO-002 (voice modifier pricing)
2. TODO-001 (checkpoint / checkpoint)
3. This item (TODO-045)
4. TODO-089 (notifications)
```

#### Dependency Resolution Pattern

```markdown
Before marking as completed, verify:

□ All blocking dependencies resolved (TODO-002 ✓)
□ No unresolved external dependencies (Twilio account ✓)
□ Items that depend on this are ready to proceed
  (TODO-045 can start immediately after merge)
```

---

### 2.4 When to Defer vs. Resolve

#### Decision Matrix

```
           Effort
         Low   High
Impact  ┌────┬─────┐
High    │RES │PLAN │  Resolve immediately | Plan for next sprint
        ├────┼─────┤
Low     │DEF │SKIP │  Defer with eval date | Skip entirely
        └────┴─────┘

RESOLVE NOW (Q1):
- P0 items (any effort)
- P1 items + Low effort
- Blocking other work

PLAN NEXT SPRINT (Q2):
- P1 items + High effort (needs specification)
- P2 items + Medium effort (performance, quality)

DEFER (Q3):
- P3 items + Low effort (if still not done after 2 reviews)
- P2 items + Low effort (if truly optional)

SKIP (Q4):
- P3 items + High effort
- Items that would require rearchitecture
- Items with unclear business value
```

#### Deferred Item Template

When deferring an item (mark as `deferred-[reason]`):

```markdown
# 087-deferred-post-mvp-monitoring-datadog-integration.md

## Why Deferred

**Decision:** This feature is valuable but not critical for MVP.

**Reasoning:**
- Current logger is sufficient for early-stage operations
- DataDog requires additional cost ($$$)
- Will re-evaluate when scaling to 3+ restaurants

## Unblock Conditions

Revisit when:
- [ ] Migrated 3+ restaurants to production
- [ ] Observing >10K requests/day
- [ ] Executive approval for DataDog cost obtained
- [ ] Clear ROI identified

## Re-evaluation Schedule

- **Next check:** 2026-Q1 (January 1)
- **If still not ready:** Push to 2026-Q2
- **If not done by:** 2026-Q2, archive as "accepted limitation"

## Owner

Engineering Lead (final decision authority)
Last reviewed: 2025-11-29
```

---

## Part 3: Parallel Agent Processing Guidelines

### 3.1 When to Use Parallel Agents

#### Factors Favoring Parallel Agents

```
✅ USE PARALLEL AGENTS WHEN:

1. Backlog Size
   - 6-15 items: 2-3 agents recommended
   - 16-50 items: 4-6 agents recommended
   - 50+ items: Parallel audit first, then 6-8 agents

2. Scope Characteristics
   - Items in different code areas (no merge conflicts)
   - Clear, isolated concerns (no architectural debates needed)
   - Mix of verification + quick fixes + deferral
   - Time-sensitive (need results in hours, not days)

3. Team Capacity
   - 3+ people available for parallel work
   - Can afford to have 1 person on coordination/testing
   - Time-zone allows synchronous standup

4. Risk Tolerance
   - OK with parallel testing (multiple PRs open)
   - Can handle merge conflicts (someone managing)
   - Have capability to rollback if needed
```

#### Factors Favoring Sequential Work

```
❌ DON'T USE PARALLEL AGENTS WHEN:

1. Backlog Size
   - <6 items (too small, overhead not worth it)
   - Single item, single fix (always sequential)

2. Scope Characteristics
   - Tightly coupled issues (same files, same classes)
   - Complex architectural decisions needed
   - High risk of merge conflicts
   - Require extensive team discussion

3. Team Capacity
   - Only 1-2 people available
   - Everyone needed for other critical work
   - No one to coordinate / handle blockers

4. Risk Tolerance
   - Can't afford multiple PRs / testing complexity
   - Need single, stable output
   - No rollback capability
```

---

### 3.2 How to Identify Independent vs. Dependent Tasks

#### Independence Criteria

**Tasks are INDEPENDENT if:**
- They modify different files
- They don't share state/configuration
- No sequential dependency (A must complete before B starts)
- Won't cause merge conflicts
- Can be tested in isolation

**Example (Independent):**
```
Agent 1: P0 security - Fix STRICT_AUTH enforcement
  - Files: server/src/middleware/auth.ts
  - Tests: server/tests/security/auth.proof.test.ts
  - No conflicts with Agent 2/3

Agent 2: P1 Voice - Fix modifier pricing
  - Files: client/src/modules/voice/VoiceCheckout.ts
  - Tests: client/src/__tests__/voice/pricing.test.ts
  - Separate codebase, no conflicts

Agent 3: P2 KDS - Extract ModifierList component
  - Files: client/src/components/kds/OrderGroupCard.tsx
  - Tests: client/src/components/__tests__/kds/ModifierList.test.tsx
  - Separate component, no conflicts
```

#### Dependency Patterns

**Sequential dependency (A → B):**
```
Agent 1: Implement API endpoint
Agent 2: Add client hook to use that endpoint (DEPENDS on Agent 1)

→ Run sequentially: Agent 1 first, then Agent 2
```

**Shared state dependency:**
```
Agent 1: Refactor AuthContext
Agent 2: Add 2FA to AuthContext (DEPENDS on Agent 1's new structure)

→ Run sequentially OR both agents coordinate on interface
```

**File conflict:**
```
Agent 1: Refactor utils/helpers.ts (adds 50 lines)
Agent 2: Add test to same file (adds 20 lines, different location)

→ Can run parallel IF merge strategy clear (always possible with conflicts)
```

#### Dependency Mapping Template

Before launching parallel agents:

```markdown
# Dependency Mapping for Backlog Resolution

## Agent Assignments

### Agent 1: P0 Security (5 items)
- Files: server/src/middleware/auth.ts, server/src/utils/websocket.ts
- Tests: server/tests/security/*.ts
- Dependencies: NONE
- Conflicts: None expected

### Agent 2: P1 Voice/State (11 items)
- Files: client/src/modules/voice/*, server/src/services/voice*
- Tests: client/__tests__/voice/*, server/tests/voice/*
- Dependencies: NONE (voice code is isolated)
- Conflicts: None expected

### Agent 3: P2 KDS (5 items)
- Files: client/src/components/kds/*
- Tests: client/__tests__/kds/*
- Dependencies: NONE (KDS is isolated component)
- Conflicts: None expected

### Agent 4: P2 DB/Testing (5 items)
- Files: server/src/services/*, server/tests/*
- Tests: server/tests/database/*
- Dependencies: Agent 1 (needs STRICT_AUTH to pass tests)
- Conflicts: None expected (different modules)

### Agent 5: P3 Polish (12 items)
- Files: Scattered (PaymentModal, colors, cleanup)
- Tests: Various
- Dependencies: None
- Conflicts: NONE (polish items don't overlap)

## Merge Order

1. **First:** Agent 1 (foundational security, needed by others)
2. **Then:** Agents 2, 3, 5 in parallel (independent)
3. **Finally:** Agent 4 (depends on Agent 1)

## Potential Conflicts

| Agent 1 vs 2 | None |
| Agent 1 vs 3 | None |
| Agent 1 vs 4 | Sequential (4 depends on 1) |
| Agent 2 vs 3 | None |
| Agent 2 vs 5 | None |
| Agent 3 vs 5 | SHARED FILE: colors.ts (coordinate) |

## Coordination Plan

- Agent 3 owns colors.ts structure
- Agent 5 runs color cleanup AFTER Agent 3 complete
```

---

### 3.3 Optimal Batch Sizes

#### Agent Count vs. Backlog Size

```
Backlog Size    Agents   Duration   Complexity   Risk
───────────────────────────────────────────────────────
1-2 items       1        <4 hours   Very Low     Very Low
3-5 items       2-3      4-8 hours  Low          Low
6-15 items      3-4      8-24h      Medium       Medium
16-30 items     5-6      24-48h     Medium-High  Medium
31-50 items     6-8      48-72h     High         High
50+ items       Audit 1st then      Very High    Very High
                6-8 agents
```

#### Coordination Overhead

```
Agents      Overhead   Merge Complexity   Recommendation
──────────────────────────────────────────────────────────
1           None       Trivial            Always OK
2-3         5-10%      Simple             Good fit
4-5         10-15%     Moderate           Still manageable
6-8         15-25%     Complex            Need coordination
9+          >25%       Very complex       Usually too much
```

**Rule of thumb:** Don't exceed 8 parallel agents. Merge complexity and coordination overhead exceed time savings.

#### Batching Strategy for Large Backlogs

```
50+ item backlog:

Phase 1: Parallel Audit (1 agent, 2-4 hours)
- Categorize by priority (P0/P1/P2/P3)
- Identify dependencies
- Create scope definition for each batch
- Set acceptance criteria

Phase 2: Parallel Resolution - Batch 1 (4-6 agents, 24-48h)
- P0 items (critical fixes)
- P1 items that enable other work
- Independent quick wins

Phase 3: Parallel Resolution - Batch 2 (3-4 agents, 24-48h)
- Remaining P1/P2 items
- Deferrals with clear reasoning
- Lower-risk polish items

Result: 50+ items resolved in 3-5 days, not 50+ days
```

---

### 3.4 Handling Agent Failures and Blockers

#### Failure Modes and Recovery

```
FAILURE MODE          CAUSE                RECOVERY
─────────────────────────────────────────────────────────────
Agent doesn't        Scope too vague      - Coordinator clarifies with agent
start work          Items not understood  - Provide more context / examples
                                           - Restart agent with clearer brief

Agent gets blocked   Unclear requirement  - Pull in person who knows
                    Decision needed      - Get decision within 2 hours
                    External dependency  - Provide workaround or defer

Agent finds new      Hidden dependencies  - Reassign to appropriate agent
issues              Unrelated bugs       - File separately, assign later
                    Scope creep          - Stay focused on original scope

Tests fail on       Integration issue    - Coordinator tests locally first
agent changes       Different environment - Provide test setup guidance
                    Test flakiness       - Increase timeout / stabilize test

Agent overruns      Effort estimate off  - Decide: continue or defer rest
time box            Scope creep          - Cut scope to fit time box
                    Lack of progress     - Swap in different person
```

#### Time Box Enforcement

```
Priority   Time Box    Action if Overrun
──────────────────────────────────────────
P0         4 hours     STOP at 4h, escalate if incomplete
P1         8 hours     STOP at 8h, defer rest to next sprint
P2         2 days      STOP at 2d, defer or continue with approval
P3         1 day       STOP at 1d, defer all polish beyond this

Escalation Path:
- Agent hits time box → Coordinator checks status
- If blocked: unblock immediately
- If stuck: swap in different person OR split scope
- If close to done: get lead approval to exceed by 1 hour max
```

---

## Part 4: TODO Resolution Workflow Checklist

### 4.1 Before Resolution

Use this checklist before launching parallel agents:

```markdown
## PRE-RESOLUTION CHECKLIST (2-4 hours before starting)

### Backlog Preparation
- [ ] Run current test suite for baseline
  Command: npm test -- --run --json > /tmp/baseline.json

- [ ] Scan codebase for all pending TODOs
  Command: grep -r "TODO\|FIXME" client/src/ server/src/ > /tmp/all-todos.txt

- [ ] Count and categorize
  - [ ] Total items: ___
  - [ ] P0 items: ___
  - [ ] P1 items: ___
  - [ ] P2 items: ___
  - [ ] P3 items: ___

### Priority Stratification
- [ ] P0 items documented with clear scope and acceptance criteria
  Each P0 has:
  - [ ] Problem statement
  - [ ] Acceptance criteria (measurable)
  - [ ] Estimated effort (hours)
  - [ ] Owner assigned

- [ ] P1 items have effort estimates
  - [ ] Quick wins identified (<1 hour)
  - [ ] Medium items identified (1-3 hours)
  - [ ] Complex items identified (>3 hours)

- [ ] P2/P3 items reviewed
  - [ ] Any that should be P1? (re-prioritize if yes)
  - [ ] Deferrals identified and documented

### Dependency Analysis
- [ ] Create dependency map (see template in Part 3.2)
  - [ ] Which items block others?
  - [ ] Which items depend on others?
  - [ ] Any circular dependencies? (should have none)

- [ ] Merge order determined
  - [ ] Phase 1 items (can run in parallel): ___
  - [ ] Phase 2 items (after Phase 1 merges): ___
  - [ ] Sequential items (must do in order): ___

### Agent Assignment
- [ ] Agents allocated (1 per isolated concern)
  - [ ] Agent 1: ___ (scope + files)
  - [ ] Agent 2: ___ (scope + files)
  - [ ] Agent 3: ___ (scope + files)
  - [ ] ... (up to 8 agents max)

- [ ] Each agent has:
  - [ ] Clear scope definition
  - [ ] List of files/modules involved
  - [ ] Acceptance criteria
  - [ ] Time box (P0: 4h, P1: 8h, P2: 2d, P3: 1d)
  - [ ] Success metrics

### Infrastructure Ready
- [ ] Coordination method established
  - [ ] Daily standup time (when?): ___
  - [ ] Communication channel (Slack/Discord): ___
  - [ ] Escalation path (who to contact): ___

- [ ] Testing strategy clear
  - [ ] Run tests after each agent completes? YES / NO
  - [ ] Run full suite before final commit? YES / NO
  - [ ] E2E tests needed? YES / NO

- [ ] Merge strategy documented
  - [ ] Who merges? (coordinator?)
  - [ ] PR review required? (agent count affects this)
  - [ ] Squash vs. preserve commits?
  - [ ] Final verification steps?

### Documentation Ready
- [ ] Resolution tracking sheet created
  Agent | Status | Started | Duration | Merged | Notes
  ─────┼────────┼─────────┼──────────┼────────┼────────

- [ ] Resolution log template ready
  (will document what each agent found/fixed)

DECISION: Ready to launch? YES / NO
If NO: What's missing?
```

---

### 4.2 During Resolution

Daily standup template and in-flight management:

```markdown
## DAILY STANDUP (10 minutes, every morning)

### Agent Updates (2 min each)

**Agent 1 (P0 Security):**
- Yesterday: Completed items X, Y; started Z
- Today: Will finish Z and start W
- Blockers: None
- Status: ON TIME ✓

**Agent 2 (P1 Voice):**
- Yesterday: Completed A, B
- Today: Working on C, planning D
- Blockers: Waiting for Decision on ADR-007
- Status: BLOCKED - escalating now

**Agent 3 (P2 KDS):**
- Yesterday: Completed L, M, N
- Today: Starting O, P
- Blockers: None
- Status: AHEAD OF SCHEDULE ✓

### Coordinator Check-In (3 min)
- [ ] Any blockers to unblock?
  - ADR-007 needed for Agent 2 → Coordinator will get decision

- [ ] Any merge conflicts to address?
  - Agent 1 and 3 both modified colors.ts
  - → Plan merge strategy before both complete

- [ ] Test status?
  - Run tests after Agent 1 complete? YES
  - Current pass rate: 99.7%

### Next Steps
- Agent 2: Will start on Task C after blocker removed (1 hour)
- Coordinator: Get ADR-007 decision by EOD
- All: No other issues, continue as planned

DECISIONS MADE: None required today
```

#### In-Flight Management

**If agent gets blocked:**
```markdown
ESCALATION PROTOCOL

1. Agent reports blocker (in standup)
2. Coordinator assesses
3. Actions within 1 hour:
   - Decision needed: Get from lead ASAP
   - External dependency: Find workaround or defer
   - Scope unclear: Provide example / clarification
   - Different skill needed: Swap in different person
4. Unblock and resume OR formally defer
```

**If tests fail:**
```markdown
TEST FAILURE RESPONSE

1. Identify which agent's changes broke tests
2. Agent reviews their changes vs. test failure
3. If clear root cause:
   - Agent fixes immediately
   - Re-run tests
   - Continue if pass OR revert if complex fix needed
4. If not clear:
   - Coordinator checks locally
   - If reproducible: agent investigates
   - If flaky: increase timeout / quarantine test, continue
```

**If merge conflict appears:**
```markdown
MERGE CONFLICT RESOLUTION

1. Coordinator identifies conflict early
2. Communicate to affected agents
3. Agree on merge order:
   - "Agent 1 merges first, Agent 3 rebases and resolves"
   - OR "Both agents coordinate on final version"
4. Execute merge with human review
5. Run tests immediately after merge
```

---

### 4.3 After Resolution

Post-mortem and documentation:

```markdown
## POST-RESOLUTION REVIEW (2-4 hours after final merge)

### Verification Checklist
- [ ] All items marked completed or properly deferred
- [ ] All todo files updated with resolution status
- [ ] No new blocker issues discovered

### Testing
- [ ] Full server test suite passes
  Command: npm run test:server
  Result: ___ / ___ tests passing

- [ ] Full client test suite passes
  Command: npm run test:client
  Result: ___ / ___ tests passing

- [ ] E2E tests pass (if applicable)
  Command: npm run test:e2e
  Result: ___ / ___ tests passing

- [ ] Type checking passes
  Command: npm run typecheck
  Result: ✓ No type errors

- [ ] Memory usage acceptable
  Command: ps aux | grep node
  Result: ___ MB (target: <2GB)

### Metrics Collection
- [ ] Total items in backlog: ___
  - [ ] Completed: ___
  - [ ] Deferred: ___
  - [ ] Failed: ___

- [ ] Effort accuracy
  - [ ] Estimated total: ___ hours
  - [ ] Actual total: ___ hours
  - [ ] Variance: ___ %

- [ ] Time per priority
  - [ ] P0: ___ hours (target: 4h)
  - [ ] P1: ___ hours (target: 8h)
  - [ ] P2: ___ hours (target: 2d)
  - [ ] P3: ___ hours (target: 1d)

### Lessons Learned
- What surprised us?
- What would we do differently?
- What patterns should we document?
- Any process improvements?

### Documentation
- [ ] Create resolution summary document
  - [ ] What was fixed
  - [ ] What was deferred and why
  - [ ] Metrics / statistics
  - [ ] Lessons learned

- [ ] Update PREVENTION_STRATEGIES.md if needed
  - [ ] New patterns discovered?
  - [ ] Process improvements identified?
  - [ ] Add to "Future Prevention" section

### Final Commit
- [ ] All todo files renamed from pending → completed/deferred
- [ ] Resolution summary added to codebase
- [ ] Single consolidated commit with message:

  ```
  docs(todos): resolve [count] item backlog via parallel agents

  Resolved via parallel agent processing:
  - P0: [count] items (security, critical)
  - P1: [count] items (features, high priority)
  - P2: [count] items (technical debt)
  - P3: [count] items (polish)

  Key improvements:
  - [Major fix 1]
  - [Major fix 2]

  Metrics:
  - Test pass rate: 99.7%
  - Effort estimate accuracy: [%]
  - Parallel agents: [count]
  - Resolution time: [duration]

  See: docs/solutions/backlog-resolution-[date].md
  ```

### Commit Example
```
docs(todos): resolve 45 item backlog via parallel agents

Resolved via parallel agent processing (24-hour session):
- P0: 2 items (security enforcement)
- P1: 11 items (voice/state features)
- P2: 20 items (technical debt, validation)
- P3: 12 items (polish, cleanup)

Key improvements:
- STRICT_AUTH enforcement (security)
- Voice modifier pricing calculation
- KDS component memoization
- Error message sanitization
- Rate limiting for anonymous users

Metrics:
- Test pass rate: 99.8%
- Files modified: 15
- Server tests: 396/396 passing
- Client tests: 747/749 passing

See: .claude/solutions/parallel-agent-backlog-resolution.md
```
```

---

## Part 5: Comprehensive Prevention Checklist

### Daily Checks

```markdown
DAILY (5 minutes)
- [ ] Any P0 items appeared? (check Slack, GitHub issues)
- [ ] Any agents blocked? (unblock if needed)
- [ ] Any critical test failures? (investigate if new)
```

### Weekly Checks

```markdown
EVERY FRIDAY (30 minutes) @ 4:00 PM

Triage:
- [ ] Scan for new TODO/FIXME comments
- [ ] Categorize by priority
- [ ] File new items as todo.md
- [ ] Set owner for each item
- [ ] Identify blocking items (>3 days)

Status Update:
- [ ] Mark completed items as 'completed'
- [ ] Move resolved items to archive
- [ ] Update status for all in-progress items
- [ ] Review blocked items - still blocked?

Metrics:
- [ ] New items this week: ___
- [ ] Completed items: ___
- [ ] Pending items: ___
- [ ] Blocked items: ___

Result:
- [ ] Commit with message: "docs(todos): weekly triage [date]"
```

### Monthly Checks

```markdown
FIRST MONDAY OF MONTH (1 hour)

Audit:
- [ ] Total backlog count
- [ ] Items by priority (P0/P1/P2/P3)
- [ ] Items by age (>7 days, >14 days)
- [ ] Items by status (pending/blocked/deferred)

Analysis:
- [ ] Systemic patterns (e.g., all auth items blocked)
- [ ] Duplicate items (same issue filed twice)
- [ ] Aging items needing decision
- [ ] Deferred items ready to revisit?

Report:
- [ ] Generate metrics report
- [ ] Identify root causes of slow resolution
- [ ] Recommendations for process improvement

Action:
- [ ] Unblock anything >7 days old
- [ ] Escalate systemic issues to lead
- [ ] Archive resolved items
- [ ] Commit report: "docs(todos): monthly audit [date]"
```

### Quarterly Checks

```markdown
ONCE PER QUARTER (2 hours)

Strategic Review:
- [ ] Backlog growth rate (trending up/down?)
- [ ] Component pain points (which modules have most issues?)
- [ ] Team satisfaction (frustrated with process?)
- [ ] Parallel agent effectiveness (was it worth doing?)

Capacity Planning:
- [ ] Expected backlog next quarter
- [ ] Team availability for parallel work
- [ ] Skill gaps (areas we can't resolve quickly?)
- [ ] Do we need to hire?

Prevention Improvements:
- [ ] Did any P0 items surprise us?
- [ ] Did we hit any "I didn't know this was broken"?
- [ ] Update priority levels if inaccurate
- [ ] Improve triage process if needed

Deferred Review:
- [ ] Which deferred items are now ready?
- [ ] Which deferred items should we archive?
- [ ] Any new conditions met for re-evaluation?

Commit:
- [ ] Update PREVENTION_STRATEGIES.md with findings
- [ ] Commit: "docs(todos): quarterly strategic review [quarter]"
```

---

## Part 6: Success Metrics & Monitoring

### Key Performance Indicators

```
METRIC                    CURRENT TARGET  MONITORING
─────────────────────────────────────────────────────────────────
New items/week           <5 items        Weekly
Avg pending age          <7 days         Weekly
Blocked items            0 items         Daily
P0 resolution time       <24h            Weekly
P1 resolution time       <3 days         Weekly
Test pass rate           >99.5%          Continuous
Backlog accumulation     0 (net)         Monthly
Effort estimate accuracy ±20%            Post-resolution
```

### Dashboard (Monthly Report)

```markdown
# TODO Backlog Health Dashboard [Date]

## Current State
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total backlog | 12 | <15 | ✅ |
| Pending items | 8 | <10 | ✅ |
| Blocked items | 0 | 0 | ✅ |
| Avg pending age | 4 days | <7 | ✅ |
| Completed this month | 18 | >10 | ✅ |
| Deferred items | 3 | <5 | ✅ |

## By Priority
| Priority | Count | P0 | P1 | P2 | P3 |
|----------|-------|----|----|----|----|
| Pending | 8 | 0 | 1 | 4 | 3 |
| In-progress | 2 | 0 | 1 | 1 | 0 |
| Blocked | 0 | 0 | 0 | 0 | 0 |
| Deferred | 3 | 0 | 0 | 1 | 2 |

## Trends
- Backlog decreased 35% (was 19 items)
- New items: 5 (within target)
- Resolution rate: 18 items completed in 30 days
- No P0 items in backlog (all resolved immediately)

## Risks
- P1 KDS items aging (4 days pending)
- One item blocked on architecture decision (ADR-012)

## Recommendations
1. Unblock architecture decision by EOW
2. Schedule KDS work for next 2 weeks
3. Continue current triage discipline

---
Generated: [Date]
Next review: [Next month]
```

---

## Part 7: Real-World Examples

### Example 1: Small Backlog (5 items)

```markdown
SCENARIO: 5 pending items, no urgency

APPROACH: Sequential (1 agent)
Time: 1 day
Risk: Very low

WORKFLOW:
1. Friday triage: Categorize items
   - 2 P2 items (4 hours each = 8 hours)
   - 3 P3 items (1 hour each = 3 hours)
   - Total: 11 hours estimated

2. Monday: 1 agent works through all
   - Start P2 items (higher priority)
   - Then P3 items (if time allows)
   - Update todo status as completing

3. Tuesday: Verify all tests pass
   - npm test: 99.8% pass rate ✅
   - Run together in single commit

RESULT: All items completed by Tuesday EOD
```

### Example 2: Medium Backlog (25 items)

```markdown
SCENARIO: 25 pending items, mixed priorities

APPROACH: Parallel (4 agents)
Time: 2-3 days
Risk: Medium

BREAKDOWN:
Agent 1: P0/P1 Security (4 items, 8 hours)
Agent 2: P1 Features (7 items, 12 hours)
Agent 3: P2 Refactoring (8 items, 16 hours)
Agent 4: P3 Polish (6 items, 6 hours)

WORKFLOW:
1. Monday morning: Triage & dependency mapping
   - Document what's blocking what
   - Define agent scopes clearly

2. Monday 2 PM: Launch 4 agents in parallel
   - Each agent has clear acceptance criteria
   - Daily standups to track progress

3. Tuesday EOD: First merges (Agent 1, 4)
   - Run tests after Agent 1 merges
   - Agent 4 follows if no conflicts

4. Wednesday EOD: Remaining agents merge
   - Agent 2 merges (features depend on security)
   - Agent 3 merges (refactoring depends on features)

5. Wednesday late: Final verification
   - All tests pass (npm test)
   - No regressions
   - Single consolidated commit

RESULT: 25 items resolved in 2 days (vs. 10+ days sequential)
```

### Example 3: Large Backlog (50 items)

```markdown
SCENARIO: 50 item backlog (P0-P3 mix), critical path

APPROACH: Parallel audit → Batched parallel resolution
Time: 5 days
Risk: Medium-High (requires coordination)

PHASE 1: Parallel Audit (1 agent, 1 day)
- Categorize all 50 items
- Estimate effort for each
- Identify dependencies
- Create scope definition for each batch
- Output: Clear batching plan

PHASE 2: Batch 1 Resolution (6 agents, 2 days)
- P0 items (must resolve first, security/critical)
- P1 quick wins (high priority, low effort)
- Foundation work needed for Batch 2
- Tests: Run after each merge

PHASE 3: Batch 2 Resolution (4 agents, 2 days)
- Remaining P1 items
- P2 items (technical debt)
- Deferrals (clearly documented)
- Final tests: Full suite pass

TIMELINE:
Monday: Audit + Batch 1 starts
Tuesday: Batch 1 complete + merge
Wednesday: Batch 2 in progress
Thursday: Batch 2 complete + final testing
Friday: Verification + documentation

RESULT: 50 items resolved in 5 days (vs. 50+ days sequential)
```

---

## Conclusion

### The Prevention Framework in 3 Steps

**1. Stop Accumulation**
- Weekly triage (Fridays) - 30 minutes
- Monthly audit (first Monday) - 1 hour
- Architecture gates (for >2 day work) - documented ADRs

**2. Enable Rapid Resolution**
- Parallel agents (when backlog >5 items)
- 1 agent = 1 concern (no overlaps)
- Time-boxed by priority (P0: 4h, P1: 8h, P2: 2d, P3: 1d)
- Consolidated commits (not per-agent)

**3. Maintain Discipline**
- Status tracking (pending → in-progress → blocked/completed/deferred)
- Dependency mapping (before launching agents)
- Daily standups (10 minutes during resolution)
- Monthly metrics reporting

### Expected Outcomes

With this framework:
- New items: <5 per week (vs. 45 accumulated)
- Pending age: <7 days (vs. weeks aging)
- Blocked items: 0 (vs. 5+ items stuck)
- Resolution time: Hours for 45 items (vs. weeks sequential)
- Team satisfaction: High (predictable, visible progress)

### Next Steps

1. **Implement Weekly Triage** (starting this Friday)
   - Schedule Friday 4 PM slot
   - Use triage checklist
   - File new todos with metadata

2. **Set Up Monthly Audit** (first Monday next month)
   - Generate metrics dashboard
   - Report to team
   - Update prevention strategies based on findings

3. **Document Deferred Items**
   - Review current backlog
   - Any items that should be deferred?
   - Document why + re-eval date

4. **Practice Parallel Agents**
   - When next backlog >5 items appears
   - Use dependency mapping template
   - Run daily standups
   - Document lessons learned

---

**Document Control**
- **Version:** 1.0
- **Created:** 2025-11-29
- **Last Updated:** 2025-11-29
- **Owner:** Prevention Strategist
- **Status:** Active (enforced)
- **Next Review:** 2026-Q1 (January 1)

**This framework is the single source of truth for TODO backlog management.**
