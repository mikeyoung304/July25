# Parallel TODO Resolution: Quick Reference Card

**For:** Fast reference during parallel resolution sessions
**Use:** Print or keep open during execution

---

## Critical Limits (DO NOT EXCEED)

```
✅ SAFE: 5-6 parallel agents maximum
⚠️  RISKY: 7-8 agents (system strain)
❌ CRASH: 9+ agents (system overload)

Memory needed: 2 GB per agent + 2 GB OS overhead
Example: 6 agents = 14 GB required

Before launching: Check free memory
MacOS: vm_stat | grep "Pages free"
Linux: free -h
```

---

## Five-Phase Workflow

```
1. ANALYZE (30-60 min)
   ├─ Read all TODO files
   ├─ Count by priority (P0/P1/P2/P3)
   ├─ Identify already-fixed items
   └─ Estimate effort

2. PLAN (30-45 min)
   ├─ Create dependency graph
   ├─ Define wave groups
   ├─ Assign agent scopes
   └─ Identify risks

3. EXECUTE (2-4 hours per wave)
   ├─ Check memory: >8 GB free?
   ├─ Launch 5-6 agents (stagger by 30s)
   ├─ Monitor every 15 min
   └─ Handle blockers immediately

4. VERIFY (30-60 min)
   ├─ Review changes
   ├─ Run full test suite
   ├─ Check for regressions
   └─ Verify no debug code left

5. COMMIT (15-30 min)
   ├─ Update TODO files
   ├─ Write descriptive commit
   ├─ Create resolution summary
   └─ Clean up temp files
```

---

## Pre-Flight Checklist (Before Starting)

```markdown
CRITICAL CHECKS
- [ ] Available memory: ___ GB (need >8 GB)
- [ ] Git status: Clean
- [ ] Tests passing: Baseline established
- [ ] TODO count: ___ items

WAVE PLANNING
- [ ] Agent count per wave: ___ (MAX 6!)
- [ ] Dependency graph created: Y/N
- [ ] Each agent has clear scope: Y/N
- [ ] File conflicts identified: Y/N

DECISION: Safe to launch? Y/N
```

---

## In-Flight Monitoring (Every 15 min)

```markdown
SYSTEM HEALTH
- [ ] Memory: ___ GB / 16 GB (alert if >12 GB)
- [ ] Swap: ___ GB (alert if >1 GB)
- [ ] All agents responding: Y/N

ACTION IF LIMITS EXCEEDED
Memory >12 GB → Pause remaining agents
Agent stuck >2 min → Restart or defer
Tests failing → Stop, investigate, fix
```

---

## Wave Sizing Guide

```
TODOs    → Agents per Wave
─────────────────────────────
1-5      → 1 (sequential)
6-15     → 3-4
16-30    → 5-6
31-50    → 5-6 (multiple waves)
50+      → Audit first, then waves
```

---

## Common Pitfalls & Quick Fixes

```
PITFALL: Too many agents
FIX: Reduce to 5-6 max per wave

PITFALL: TODO already fixed
FIX: Verify first, mark resolved

PITFALL: Missing dependencies
FIX: Map dependencies before launching

PITFALL: File conflicts
FIX: Assign clear file ownership

PITFALL: Agent stuck
FIX: Provide clearer scope/examples
```

---

## Memory Calculation Formula

```
Required Memory = (Agents × 2 GB) + 2 GB overhead

Examples:
3 agents = 8 GB required
5 agents = 12 GB required
6 agents = 14 GB required
8 agents = 18 GB required ❌ TOO MUCH!
```

---

## Verification Checklist (Before Commit)

```markdown
- [ ] Server tests: ___ / ___ passing
- [ ] Client tests: ___ / ___ passing
- [ ] Type check: PASS / FAIL
- [ ] No debug code: grep -r "console.log"
- [ ] TODO files updated: All resolved items renamed
- [ ] Commit message written: Lists all TODOs
```

---

## Emergency Procedures

```
SYSTEM OVERLOAD
1. Kill newest agents first
2. Wait for memory to stabilize
3. Continue with 3-4 agents only

AGENT FROZEN
1. Check last output (what was it doing?)
2. Kill agent process
3. Restart with clearer instructions

TESTS FAILING
1. Identify which agent caused failure
2. Revert that agent's changes
3. Fix issue manually
4. Re-run agent if needed

MERGE CONFLICTS
1. Stop parallel work
2. Resolve conflicts manually
3. Continue with smaller waves
```

---

## Success Criteria

```
✓ >90% TODOs resolved
✓ Tests at same pass rate (±0.5%)
✓ No regressions
✓ All TODO files updated
✓ System stable (no crashes)
✓ Time saved >50% vs sequential
```

---

**Keep this card visible during parallel resolution sessions!**

**Full documentation:** [PARALLEL-TODO-RESOLUTION-BEST-PRACTICES.md](./PARALLEL-TODO-RESOLUTION-BEST-PRACTICES.md)
