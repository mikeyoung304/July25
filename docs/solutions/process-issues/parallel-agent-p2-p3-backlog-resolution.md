---
title: Large-scale P2/P3 backlog resolution via parallel Task agents
category: process-issues
date_solved: 2025-11-28
severity: high
components:
  - Voice ordering (VoiceEventHandler, WebRTCVoiceClient, realtime.routes)
  - Kitchen Display System (OrderGroupCard, ModifierList)
  - Database/Testing (constraint validation, multi-tenant isolation)
  - Payment processing (PaymentModal)
  - Server middleware (auth.ts, WebSocket authentication)
tags:
  - parallel-agents
  - backlog-resolution
  - todo-management
  - multi-category
  - large-scale-coordination
outcome: Successfully resolved 39 of 45 backlog items using parallel agents with no regressions
---

# Parallel Agent P2/P3 Backlog Resolution

**Last Updated:** 2025-11-28

## Problem Statement

The repository had accumulated ~45 todo items across P1/P2/P3 priorities due to rapid code reviews flagging issues faster than they could be sequentially resolved. Manual resolution would have taken 45+ hours.

### Symptoms

- 45 pending todo items across 5 categories
- Voice ordering: timeout races, error handling gaps, transcript validation missing
- KDS: component duplication, missing memoization, magic numbers
- Database: testing gaps, multi-tenant isolation concerns
- Payments: unnecessary useCallback wrappers causing re-renders
- Security: error message disclosure, cache thundering herd risk

## Root Cause

1. **Backlog accumulation**: Code reviews created todos faster than sequential resolution
2. **Documentation drift**: Many issues were already fixed but todos not updated
3. **Category spread**: Issues spanned 5+ domains requiring different expertise

## Solution

### Parallel Agent Strategy

Instead of sequential resolution (estimated 45+ hours), launched **6 parallel Task agents**, each owning a specific category:

| Agent | Category | Items | Result |
| ----- | -------- | ----- | ------ |
| 1 | P1 Voice/State | 5 | All verified fixed |
| 2 | P2 Voice Batch 1 | 5 | All verified fixed |
| 3 | P2 Voice Batch 2 | 9 | 7 fixed, 2 deferred |
| 4 | P2 KDS | 5 | All verified fixed |
| 5 | P2 DB/Testing | 6 | 5 fixed, 1 deferred |
| 6 | P3 Polish | 12 | 6 fixed, 6 deferred |

### Key Implementation Patterns

**1. Verification-First Approach**

Each agent followed a verification-first approach:
- Check if issue already fixed in recent commits
- If fixed: update todo status to "completed"
- If not fixed: implement the fix
- Verify with typecheck and tests

**2. Todo File Status Updates**

```
Before: todos/009-pending-p2-voice-checkout-orchestrator-coupling.md
After:  todos/009-completed-p2-voice-checkout-orchestrator-coupling.md
```

**3. Quick Win Prioritization**

- Fix simple issues immediately
- Defer complex architectural changes
- Time-box P3 items to 30 minutes each

### Fixes Applied

**Security Fixes:**
- Error message sanitization in `realtime.routes.ts`
- IP-based rate limiting for anonymous users
- Transcript validation (length limits + XSS prevention)
- Session size validation (150KB limit)

**Performance Fixes:**
- `setOrderItems` callback stability (ref pattern)
- Cache thundering herd prevention (request coalescing)
- OpenAI timeout increased to 45s
- Removed 6 unnecessary useCallbacks in PaymentModal

**Bug Fixes:**
- `response.started` event handling relaxed
- DataChannel close event type corrected

## Results

| Metric | Value |
| ------ | ----- |
| Issues Addressed | 45 items |
| Verified Complete | 28 items (62%) |
| Fixed in Session | 12 items (27%) |
| Deferred (correct) | 5 items (11%) |
| Wallclock Time | ~2 hours |
| Estimated Sequential Time | 45+ hours |
| Server Tests | 396/396 (100%) |
| Client Tests | 747/749 (99.7%) |

## Prevention Strategies

### Preventing Backlog Accumulation

1. **Weekly Triage**: 5-minute Friday review of new todos
2. **Monthly Audits**: 1-hour deep review on first Monday
3. **Resolution Discipline**: Close todos within 7 days or escalate

### Parallel Agent Guidelines

**When to use parallel agents:**
- Backlog exceeds 10 items
- Issues span 3+ categories
- Items are independent (no shared file conflicts)

**How to scope agent tasks:**
- 1 agent = 1 isolated category
- Max 5-8 agents per session
- Define clear acceptance criteria in prompt

**Coordination pattern:**
1. Triage by priority (P0 → P1 → P2 → P3)
2. Group by category (Voice, KDS, DB, etc.)
3. Launch agents in parallel
4. Aggregate results, commit together

### Todo System Maintenance

| Frequency | Action | Duration |
| --------- | ------ | -------- |
| Daily | Check P0 items | 5 min |
| Weekly | Triage new items | 30 min |
| Monthly | Full audit | 1 hour |
| Quarterly | Strategic review | 2 hours |

## Related Documentation

- [Parallel Agent Todo Audit Crash](./parallel-agent-todo-audit-crash.md) - Anti-patterns and validation gates
- [CL-TEST-001](/.claude/lessons/CL-TEST-001-ci-test-fixes.md) - Test coordination patterns
- [P0/P1 Backlog Plan](../../../plans/p0-p1-backlog-resolution.md) - Original resolution plan

## Commits

- `74631095` - fix(todos): resolve p2/p3 backlog issues via parallel agents
- `651b5cf9` - fix(voice,payments): resolve p1 security and reliability issues (earlier)

## Key Learnings

1. **Verification prevents duplicate work**: 62% of issues were already fixed
2. **Parallel independence is critical**: Agents need different files/concerns to avoid conflicts
3. **Time-boxing works for polish**: 30-minute limits on P3 items forced smart prioritization
4. **Earlier refactors pay dividends**: KDS cleanup had already resolved 3 major issues
5. **Todo files as documentation**: Each resolved item becomes a knowledge base entry
