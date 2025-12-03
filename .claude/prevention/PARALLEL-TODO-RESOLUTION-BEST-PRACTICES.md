# Parallel TODO Resolution: Best Practices & Prevention Strategies

**Document Status:** Codified Best Practices
**Date Created:** 2025-12-03
**Based On:** Successful resolution of 11+ TODOs via parallel workflow (commit 0728e1ee)
**Scope:** Safe parallel processing patterns for large TODO backlogs

---

## Executive Summary

Parallel TODO resolution can compress weeks of sequential work into hours, but spawning too many agents simultaneously crashes systems. This document codifies the memory management best practices, workflow patterns, and prevention strategies discovered through real-world parallel agent orchestration.

**Key Learning:** The system initially crashed when spawning all agents at once. Success came from wave-based execution with strict agent limits (5-6 maximum per wave).

---

## Part 1: Memory Management Best Practices

### 1.1 Safe Agent Limits

#### Golden Rule: Maximum 5-6 Parallel Agents

```
SYSTEM CAPACITY LIMITS (MacOS with 16GB RAM)

Agents    Memory Usage    Risk Level    Status
──────────────────────────────────────────────────
1-2       2-4 GB         Very Low      ✅ Always safe
3-4       4-7 GB         Low           ✅ Safe for most work
5-6       7-10 GB        Medium        ⚠️  Safe with monitoring
7-8       10-13 GB       High          ❌ System strain likely
9+        13+ GB         Critical      ❌ Crash imminent

RECOMMENDATION: Never exceed 6 parallel agents
```

#### Memory Overhead per Agent

Each Claude Code agent consumes:
- **Base memory:** ~1.2-1.5 GB (Node.js + TypeScript compiler + Vite)
- **Code reading:** +200-400 MB (reading/analyzing files)
- **Testing overhead:** +500-800 MB (if running tests)
- **Peak usage:** ~2-2.5 GB per agent

```
Example calculation for 8 agents:
8 agents × 2 GB average = 16 GB
+ 2 GB OS overhead
+ 1 GB safety margin
= 19 GB REQUIRED (exceeds 16 GB system → CRASH)
```

### 1.2 Pre-Flight System Check

Before launching parallel agents, verify available memory:

```bash
# MacOS
vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//' | awk '{printf "%.2f GB\n", $1 * 4096 / 1024 / 1024 / 1024}'

# Linux
free -h | grep "Mem:" | awk '{print $7}'

# Decision rule:
# Available memory > 8 GB → Safe to launch 5-6 agents
# Available memory 4-8 GB → Launch 3-4 agents only
# Available memory < 4 GB → Sequential work (1 agent)
```

### 1.3 Wave-Based Execution Pattern

**Pattern:** Break large batches into waves, wait for wave completion before starting next.

```
WAVE-BASED EXECUTION (50+ TODOs)

Wave 1 (6 agents, 2-4 hours):
├─ Agent 1: P0/P1 Security items (5 TODOs)
├─ Agent 2: P1 Voice items (8 TODOs)
├─ Agent 3: P2 KDS items (6 TODOs)
├─ Agent 4: P2 Database items (5 TODOs)
├─ Agent 5: P3 Polish items (7 TODOs)
└─ Agent 6: P3 Cleanup items (5 TODOs)

Wait for all agents to complete ✓
Verify tests pass ✓
Commit changes ✓

Wave 2 (4 agents, 2-4 hours):
├─ Agent 7: Remaining P2 items (6 TODOs)
├─ Agent 8: Deferred review items (4 TODOs)
├─ Agent 9: Documentation updates (3 TODOs)
└─ Agent 10: Final verification (2 TODOs)

TOTAL: 50+ TODOs resolved in 4-8 hours wallclock
vs. 50+ hours sequential
```

### 1.4 Resource Monitoring During Execution

**Active monitoring checklist:**

```markdown
DURING PARALLEL EXECUTION

Every 15 minutes, check:
- [ ] Memory usage: `top` or Activity Monitor
      Target: <12 GB used (safe margin)

- [ ] Swap usage: Should remain minimal
      If swap >2 GB → STOP, too much memory pressure

- [ ] Agent responsiveness:
      Each agent should respond within 30 seconds
      If any agent frozen >2 min → Kill and restart

- [ ] Disk I/O:
      Should be steady, not thrashing
      If constant disk activity → Swap thrashing, STOP

Action if limits exceeded:
1. Pause remaining agents
2. Wait for current agents to complete
3. Continue with smaller wave size (3-4 agents)
```

---

## Part 2: TODO Resolution Workflow

### 2.1 Five-Phase Resolution Process

```
┌─────────────────────────────────────────────────────┐
│                 PHASE 1: ANALYZE                     │
│  Read all TODO files + identify dependencies        │
│  Duration: 30-60 minutes                             │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 PHASE 2: PLAN                        │
│  Create dependency graph + group into waves          │
│  Duration: 30-45 minutes                             │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 PHASE 3: EXECUTE                     │
│  Run agents in parallel waves (max 5-6 per wave)    │
│  Duration: 2-4 hours per wave                        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 PHASE 4: VERIFY                      │
│  Check agent results + run full test suite          │
│  Duration: 30-60 minutes                             │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 PHASE 5: COMMIT                      │
│  Update TODO files + create consolidated commit     │
│  Duration: 15-30 minutes                             │
└─────────────────────────────────────────────────────┘
```

### 2.2 Phase 1: Analysis (Pre-Resolution)

**Objective:** Understand the full scope before making any changes.

```markdown
ANALYSIS PHASE CHECKLIST (30-60 minutes)

1. Read All TODO Files (15 min)
   - [ ] Count total TODOs: ___ items
   - [ ] Break down by priority:
         P0: ___ | P1: ___ | P2: ___ | P3: ___
   - [ ] Note any blocking/blocked relationships

2. Verify Current State (15 min)
   - [ ] Run baseline tests: npm test
         Server: ___ / ___ passing
         Client: ___ / ___ passing
   - [ ] Check git status: Should be clean
   - [ ] Note any existing issues

3. Identify Already-Fixed Items (10 min)
   - [ ] Scan TODO descriptions vs. current code
   - [ ] Look for recent commits that may have resolved items
   - [ ] Mark candidates for "already fixed" verification

4. Categorize by Independence (10 min)
   - [ ] Group independent items (can run in parallel)
   - [ ] Identify sequential dependencies (must run in order)
   - [ ] Flag potential file conflicts

5. Estimate Effort (10 min)
   - [ ] Quick wins (<1 hour): ___
   - [ ] Medium items (1-3 hours): ___
   - [ ] Complex items (>3 hours): ___

OUTPUT: Analysis report with groupings and wave plan
```

### 2.3 Phase 2: Planning (Dependency Mapping)

**Objective:** Create a safe execution plan that prevents conflicts.

```markdown
PLANNING PHASE CHECKLIST (30-45 minutes)

1. Create Dependency Graph (15 min)
   - [ ] Map which TODOs block others
   - [ ] Identify shared files (potential conflicts)
   - [ ] Note external dependencies (APIs, migrations)

2. Define Wave Groups (15 min)
   - [ ] Wave 1: Independent high-priority items
         Agent count: ___
         Expected duration: ___

   - [ ] Wave 2: Items dependent on Wave 1
         Agent count: ___
         Expected duration: ___

   - [ ] Wave 3: Remaining items + cleanup
         Agent count: ___
         Expected duration: ___

3. Assign Agent Scopes (10 min)
   For each agent:
   - [ ] Clear scope definition (which TODOs)
   - [ ] File ownership (which files they'll modify)
   - [ ] Acceptance criteria (how to verify success)
   - [ ] Time box (max hours before defer)

4. Identify Risks (5 min)
   - [ ] Merge conflicts (shared files)
   - [ ] Test dependencies (flaky tests)
   - [ ] Memory constraints (too many agents)
   - [ ] Blocking decisions (architecture choices)

OUTPUT: Detailed wave plan with agent assignments
```

### 2.4 Phase 3: Execution (Parallel Processing)

**Objective:** Safely execute waves with monitoring.

```markdown
EXECUTION PHASE CHECKLIST (per wave, 2-4 hours)

BEFORE STARTING WAVE
- [ ] Check available memory: ___ GB free
      (Need >8 GB for 5-6 agents)
- [ ] Git status clean: No uncommitted changes
- [ ] Tests passing: Baseline established
- [ ] Agent assignments confirmed

DURING WAVE EXECUTION
- [ ] Launch agents (stagger by 30s to reduce spike)
      Agent 1 start → wait 30s → Agent 2 start → ...

- [ ] Monitor every 15 minutes:
      - Memory usage: ___ GB / 16 GB
      - Agent responsiveness: All agents responding? Y/N
      - Unexpected errors: Any agent stuck?

- [ ] Handle blockers immediately:
      If agent blocked: Provide clarification within 30 min
      If agent fails: Investigate, restart, or defer
      If memory spike: Pause remaining agents

AFTER WAVE COMPLETES
- [ ] Collect all agent outputs
- [ ] Review changes for conflicts
- [ ] Run tests before merging
- [ ] Update TODO files with status

OUTPUT: Completed changes for one wave
```

### 2.5 Phase 4: Verification (Quality Checks)

**Objective:** Ensure no regressions or issues introduced.

```markdown
VERIFICATION PHASE CHECKLIST (30-60 minutes)

1. Code Review (15 min)
   - [ ] Review all changed files
   - [ ] Check for unintended changes
   - [ ] Verify TODO status updates
   - [ ] Look for debug code left behind

2. Test Suite (20 min)
   - [ ] Server tests: npm run test:server
         Expected: ___ / ___ passing
         Actual: ___ / ___ passing

   - [ ] Client tests: npm run test:client
         Expected: ___ / ___ passing
         Actual: ___ / ___ passing

   - [ ] Type check: npm run typecheck
         Result: Pass / Fail

3. Regression Check (10 min)
   - [ ] Spot-check critical user flows:
         Login → ✓ / ✗
         Place order → ✓ / ✗
         Kitchen display → ✓ / ✗

4. Performance Sanity (5 min)
   - [ ] Dev server starts: <30 seconds
   - [ ] Page load time: <3 seconds
   - [ ] No console errors: ✓ / ✗

DECISION: Ready to commit? YES / NO
If NO: What needs fixing?
```

### 2.6 Phase 5: Commit (Documentation)

**Objective:** Create clear history and update tracking.

```markdown
COMMIT PHASE CHECKLIST (15-30 minutes)

1. Update TODO Files (10 min)
   - [ ] Rename completed: pending → resolved/completed
   - [ ] Add resolution notes to each file
   - [ ] Archive obsolete items
   - [ ] Update deferred items with reasons

2. Create Consolidated Commit (10 min)
   - [ ] Stage all changes: git add .
   - [ ] Write descriptive commit message:

   Template:
   ```
   fix: resolve [N] TODOs from code review backlog

   - TODO-XXX: [Brief description of fix]
   - TODO-YYY: [Brief description of fix]
   - TODO-ZZZ: Already implemented, marked resolved

   Wave execution:
   - Wave 1: [N] items (P0/P1 priority)
   - Wave 2: [N] items (P2/P3 priority)

   Test results:
   - Server: [N]/[N] passing
   - Client: [N]/[N] passing

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

3. Post-Commit Documentation (5 min)
   - [ ] Update ORCHESTRATION_STATUS.md if exists
   - [ ] Create resolution summary in .claude/solutions/
   - [ ] Update backlog metrics

4. Clean Up (5 min)
   - [ ] Remove temporary files
   - [ ] Clear any debug logs
   - [ ] Run health check: npm run health

OUTPUT: Clean commit with full documentation
```

---

## Part 3: Prevention Checklist

### 3.1 Pre-Flight Checklist (Before Starting)

**Use this checklist BEFORE launching any parallel resolution:**

```markdown
PRE-FLIGHT CHECKLIST FOR PARALLEL TODO RESOLUTION

SYSTEM READINESS
- [ ] Available memory: ___ GB (need >8 GB)
- [ ] Git status: Clean working directory
- [ ] Tests passing: Baseline established
- [ ] No running dev servers: Kill any active npm processes

BACKLOG ASSESSMENT
- [ ] Total TODO count: ___
      < 6 items → Sequential work (1 agent)
      6-15 items → Small parallel (3-4 agents)
      16-30 items → Medium parallel (5-6 agents per wave)
      30+ items → Large parallel (multiple waves)

- [ ] Priority breakdown documented:
      P0: ___ | P1: ___ | P2: ___ | P3: ___

- [ ] Already-fixed candidates identified: ___
      (Verify these first to avoid wasted work)

DEPENDENCY ANALYSIS
- [ ] Dependency graph created: YES / NO
- [ ] Independent items grouped: ___ items
- [ ] Sequential dependencies noted: ___ items
- [ ] File conflicts identified: ___ potential conflicts

WAVE PLANNING
- [ ] Wave count determined: ___ waves
- [ ] Agent assignments per wave: ___ agents/wave
      CRITICAL: Do not exceed 6 agents per wave!

- [ ] Each agent has:
      - Clear scope (which TODOs)
      - File ownership (which files)
      - Time box (max hours)
      - Success criteria

RISK ASSESSMENT
- [ ] Merge conflict risk: Low / Medium / High
      If High: Consider smaller waves or sequential

- [ ] Memory risk: Low / Medium / High
      If Medium/High: Reduce agent count

- [ ] Test flakiness: Any known flaky tests? Y/N
      If Yes: Plan to rerun or quarantine

- [ ] Blocking decisions: Any architecture decisions needed? Y/N
      If Yes: Get decisions BEFORE starting

DECISION: Ready to launch? YES / NO

If NO, what's blocking? _______________
```

### 3.2 In-Flight Checklist (During Execution)

**Monitor these metrics every 15 minutes during execution:**

```markdown
IN-FLIGHT MONITORING (Every 15 minutes)

SYSTEM HEALTH
- [ ] Memory usage: ___ GB / 16 GB
      Green: <10 GB | Yellow: 10-12 GB | Red: >12 GB

- [ ] Swap usage: ___ GB
      Green: <1 GB | Yellow: 1-2 GB | Red: >2 GB

- [ ] CPU usage: ___%
      Normal: <80% | Elevated: 80-90% | Critical: >90%

AGENT STATUS
- [ ] All agents responding: YES / NO
      If NO: Which agent stuck? ___ (investigate)

- [ ] Progress updates received: YES / NO
      Each agent should report every 30 min

- [ ] Unexpected errors: Any agents failed? Y/N
      If Yes: Agent ___ failed with error: ___

QUALITY INDICATORS
- [ ] No duplicate work: Agents not overlapping? Y/N
- [ ] File conflicts: Any merge conflicts emerging? Y/N
- [ ] Test failures: Any new test failures? Y/N

ACTION ITEMS
If memory >12 GB:
- [ ] Pause remaining agents
- [ ] Wait for current wave to complete
- [ ] Reduce next wave size

If agent stuck >2 min:
- [ ] Review agent output
- [ ] Provide clarification or restart
- [ ] Consider deferring if complex

If tests failing:
- [ ] Identify which agent's changes caused failure
- [ ] Pause related work
- [ ] Fix before continuing
```

### 3.3 Post-Completion Checklist

**After all waves complete, before final commit:**

```markdown
POST-COMPLETION VERIFICATION

CODE QUALITY
- [ ] Review all changes: git diff main
- [ ] No debug code left: grep -r "console.log\|debugger"
- [ ] No TODOs added: grep -r "TODO\|FIXME" in changed files
- [ ] Formatting consistent: Run linter/prettier

TEST COVERAGE
- [ ] Full server test suite: npm run test:server
      Result: ___ / ___ passing (expect 100%)

- [ ] Full client test suite: npm run test:client
      Result: ___ / ___ passing (expect >99.5%)

- [ ] Type checking: npm run typecheck
      Result: PASS / FAIL (must be PASS)

- [ ] E2E smoke tests: npm run test:e2e
      Result: ___ / ___ passing

DOCUMENTATION
- [ ] TODO files updated:
      - Completed items renamed (pending → resolved)
      - Resolution notes added
      - Deferred items documented with reasons

- [ ] Commit message written:
      - Lists all resolved TODOs
      - Includes test results
      - Notes any deferred items

- [ ] Resolution summary created:
      - .claude/solutions/todo-resolution-[date].md
      - Includes metrics and lessons learned

METRICS COLLECTION
- [ ] Total TODOs addressed: ___
      - Completed: ___
      - Already fixed: ___
      - Deferred: ___

- [ ] Wave execution:
      - Wave 1: ___ items, ___ hours
      - Wave 2: ___ items, ___ hours
      - Total: ___ hours wallclock

- [ ] Effort accuracy:
      - Estimated: ___ hours
      - Actual: ___ hours
      - Variance: ___% (target: <±20%)

DECISION: Ready to merge? YES / NO
```

---

## Part 4: Common Pitfalls & Prevention

### 4.1 Pitfall: Spawning Too Many Agents

**Symptom:** System becomes unresponsive, swap usage spikes, agents freeze

**Root Cause:** Each agent consumes ~2 GB memory. 8+ agents = 16+ GB required.

**Prevention:**
```markdown
BEFORE LAUNCHING AGENTS

1. Calculate required memory:
   [Agent count] × 2 GB + 2 GB OS overhead = Required GB

2. Compare to available:
   Available: ___ GB (from vm_stat or free)
   Required: ___ GB

3. Decision rule:
   Required < Available → SAFE
   Required ≥ Available → UNSAFE (reduce agents)

Example:
8 agents × 2 GB = 16 GB + 2 GB = 18 GB required
Available: 12 GB
18 GB > 12 GB → UNSAFE! Reduce to 5 agents maximum
```

**Recovery:**
If system already overloaded:
1. Kill agents one by one (newest first)
2. Wait for memory to stabilize
3. Restart with smaller wave (3-4 agents)

### 4.2 Pitfall: Not Checking if TODO Already Resolved

**Symptom:** Agent spends hours implementing something already fixed

**Root Cause:** TODOs filed before fix was made, not updated after fix merged

**Prevention:**
```markdown
VERIFICATION-FIRST APPROACH

For each TODO:
1. Read the TODO claim
2. Check current codebase
3. If already implemented → Mark as resolved, move on
4. If not implemented → Add to active work list

Example:
TODO-095: "Remove dual state management (useTableStatus + TableContext)"

Check: Does useTableStatus.ts still exist?
→ git ls-files | grep useTableStatus
→ No results → Already deleted!

Action: Mark TODO-095 as resolved with note:
"Verified removed in commit abc1234"
```

**Time saved:** ~50% of TODOs are often already fixed. Verify first!

### 4.3 Pitfall: Not Updating TODO Files Immediately

**Symptom:** Same TODO worked on multiple times, duplicate effort

**Root Cause:** Agent resolves TODO but doesn't update status file

**Prevention:**
```markdown
IMMEDIATE STATUS UPDATES

Agent workflow:
1. Read TODO file
2. Resolve issue
3. **IMMEDIATELY** update TODO file:
   - Rename: pending → resolved
   - Add resolution notes
   - Commit status change
4. Move to next TODO

Don't batch status updates!
Update after EACH TODO resolved, not at end of wave.
```

### 4.4 Pitfall: Missing Dependencies Between TODOs

**Symptom:** Agent B fails because it depends on Agent A's work (not done yet)

**Root Cause:** Didn't map dependencies before launching agents

**Prevention:**
```markdown
DEPENDENCY MAPPING (Required step)

For each TODO:
1. Read implementation approach
2. Ask: "Does this depend on any other TODO?"
   - Same file modifications?
   - Needs API endpoint from another TODO?
   - Requires type definitions from another TODO?

3. Mark dependencies:
   TODO-097 DEPENDS ON TODO-096 (needs unified table types)

4. Group into waves:
   Wave 1: TODO-096 (independent)
   Wave 2: TODO-097 (depends on Wave 1)

Never launch dependent TODOs in same wave!
```

### 4.5 Pitfall: Conflicting File Changes

**Symptom:** Merge conflicts when combining agent changes

**Root Cause:** Multiple agents modified same file without coordination

**Prevention:**
```markdown
FILE OWNERSHIP ASSIGNMENT

When assigning agents:
1. List all files each agent will modify
2. Check for overlaps:
   Agent 1: table.types.ts
   Agent 2: table.types.ts
   → CONFLICT DETECTED

3. Resolution strategies:

   Option A: Sequential (safer)
   - Agent 1 completes first
   - Agent 2 starts after Agent 1 merges

   Option B: Coordinate (parallel)
   - Agents agree on interface BEFORE starting
   - Assign different sections:
     Agent 1: Lines 1-50
     Agent 2: Lines 51-100

   Option C: Split scope
   - Agent 1: table.types.ts
   - Agent 2: Different file (no overlap)

ALWAYS prefer Option C (no overlap) when possible
```

---

## Part 5: Success Metrics & Lessons Learned

### 5.1 Metrics to Track

```markdown
RESOLUTION METRICS TEMPLATE

## Execution Summary
- **Total TODOs:** ___ items
- **Waves executed:** ___
- **Agents used:** ___ total (___ max per wave)
- **Wallclock time:** ___ hours
- **Sequential estimate:** ___ hours
- **Time saved:** ___ hours (___%)

## Resolution Breakdown
| Status | Count | Percentage |
|--------|-------|------------|
| Completed (fixed) | ___ | ___% |
| Resolved (already done) | ___ | ___% |
| Deferred | ___ | ___% |
| Failed/Blocked | ___ | ___% |

## Effort Accuracy
- **Estimated:** ___ hours
- **Actual:** ___ hours
- **Variance:** ___% (target: <±20%)

## Quality Metrics
- **Tests passing:** ___% (target: >99.5%)
- **Type errors:** 0 (must be zero)
- **Code review issues:** ___ (target: <5)
- **Regressions:** ___ (target: 0)

## Resource Usage
- **Peak memory:** ___ GB / 16 GB
- **Peak CPU:** ___%
- **Swap used:** ___ GB (target: <1 GB)
```

### 5.2 Lessons Learned Template

```markdown
LESSONS LEARNED: [Resolution Session Date]

## What Worked Well
1. ___
2. ___
3. ___

## What Didn't Work
1. ___
2. ___
3. ___

## What We'd Do Differently
1. ___
2. ___
3. ___

## New Patterns Discovered
1. ___
2. ___
3. ___

## Prevention Strategies to Add
1. ___
2. ___
3. ___

## Process Improvements for Next Time
1. ___
2. ___
3. ___
```

### 5.3 Success Criteria

A parallel TODO resolution is successful when:

```markdown
DEFINITION OF SUCCESS

✓ >90% of TODOs resolved (completed or properly deferred)
✓ Tests passing at same rate as before (±0.5%)
✓ No regressions introduced
✓ All TODO files updated with current status
✓ Clear documentation of what was done
✓ Lessons learned documented for next time
✓ System remained stable throughout (no crashes)
✓ Time saved vs. sequential approach (>50%)
```

---

## Part 6: Quick Reference Guide

### 6.1 Decision Tree: Should I Use Parallel Agents?

```
START: I have [N] TODOs to resolve

┌─ N < 6 items?
│  YES → Use sequential (1 agent) ✓
│  NO → Continue
│
├─ Available memory > 8 GB?
│  NO → Use sequential (1 agent) ✓
│  YES → Continue
│
├─ Items mostly independent?
│  NO → Use sequential (1 agent) ✓
│  YES → Continue
│
├─ Time-sensitive (need done today)?
│  NO → Use sequential (spread over days) ✓
│  YES → Continue
│
└─ Risk tolerance?
   Low → Use sequential ✓
   Medium/High → Use parallel (3-6 agents) ✓
```

### 6.2 Wave Sizing Guide

```
TODO Count → Wave Plan

1-5 items:
Sequential (1 agent)

6-15 items:
Single wave (3-4 agents)

16-30 items:
2 waves (5-6 agents each)

31-50 items:
3 waves (5-6 agents each)

50+ items:
Audit first (1 agent)
Then 4-5 waves (5-6 agents each)
```

### 6.3 Troubleshooting Guide

```markdown
COMMON ISSUES & FIXES

ISSUE: System running out of memory
FIX: Kill agents, reduce wave size to 3-4 agents

ISSUE: Agent stuck/unresponsive
FIX: Kill agent, investigate blocker, restart with clearer scope

ISSUE: Tests failing after agent changes
FIX: Revert agent's changes, investigate failure, fix, re-apply

ISSUE: Merge conflicts
FIX: Resolve manually, or rerun agents sequentially

ISSUE: Agent doing duplicate work
FIX: Better scoping - provide explicit file/TODO assignments

ISSUE: Agent can't decide on approach
FIX: Provide clear acceptance criteria and examples
```

---

## Conclusion

Parallel TODO resolution is powerful but requires discipline:

1. **Memory management:** Never exceed 5-6 agents per wave
2. **Wave-based execution:** Break large batches into manageable waves
3. **Verification-first:** Check if TODOs already resolved (~50% are!)
4. **Immediate updates:** Mark TODOs as resolved right after fixing
5. **Dependency mapping:** Prevent conflicts by understanding relationships
6. **Active monitoring:** Check system health every 15 minutes

Follow these practices and you can safely resolve 50+ TODOs in hours instead of weeks.

---

**Document Control**
- **Version:** 1.0
- **Created:** 2025-12-03
- **Owner:** Prevention Strategist
- **Status:** Active
- **Next Review:** 2026-Q1
- **Related:** [BACKLOG_PREVENTION_FRAMEWORK.md](../BACKLOG_PREVENTION_FRAMEWORK.md)
