# TODO Backlog Management - Quick Reference

**Print this. Pin it. Use it.**

---

## When You Find a TODO

```
❓ Is this new?

YES → File as: [NNN]-pending-p[0-3]-[category]-[title].md
     Include: Problem statement + acceptance criteria
     Categorize: P0, P1, P2, or P3
     Owner: Assign to someone
     Go to "WEEKLY TRIAGE" section below

NO → Is it in the todo folder?
     YES → Already tracked, skip
     NO → Create new file for tracking
```

---

## Weekly Triage (Every Friday, 4 PM)

```
⏱️  30 minutes

□ Scan:         grep -r "TODO\|FIXME" client/src/ server/src/
□ Count:        ls todos/ | wc -l
□ Categorize:   File new items with priority
□ Unblock:      Any items >3 days without progress?
□ Archive:      Move completed items to .archive/
□ Commit:       git add todos/ && git commit -m "docs(todos): weekly triage [date]"

✅ DONE
```

---

## Monthly Audit (First Monday, 1 hour)

```
📊 Metrics

□ Count:      Total / P0 / P1 / P2 / P3
□ Age:        Items >7 days old without progress?
□ Status:     Pending / In-progress / Blocked / Completed
□ Blocked:    Any items stuck >7 days? Escalate!
□ Report:     Create dashboard (see BACKLOG_PREVENTION_FRAMEWORK.md)
□ Commit:     git add . && git commit -m "docs(todos): monthly audit [date]"

✅ DONE
```

---

## Status Lifecycle

```
PENDING (⏸️  Not started)
  ↓
IN-PROGRESS (🔄 Work in progress)
  ├→ BLOCKED (⛔ Waiting for something)
  │   ↓
  │   IN-PROGRESS (resumed)
  │   ↓
  └→ COMPLETED (✅ Done!)
     ↓
     DEFERRED (⏰ Intentionally deferring)

Action: Update filename + status field
Example: 001-pending-... → 001-in-progress-...
```

---

## Status Update Protocol

When status changes:
```bash
# 1. Rename file
mv 001-pending-p0-auth.md 001-in-progress-p0-auth.md

# 2. Update status in file
# Before: Status: pending
# After:  Status: in-progress

# 3. Add progress note
# Add to "Progress Notes" section with date

# 4. Commit
git add todos/001-in-progress-p0-auth.md
git commit -m "docs(todos): update 001 status to in-progress"
```

---

## Time Limits Before Action

```
Status      Days    Action
─────────────────────────────────────────────
pending     7       If not started, defer or start it
in-prog.    3       If no progress, escalate
blocked     7       If still blocked, escalate to lead
deferred    90      Re-evaluate, move to pending or archive
```

---

## When to Use Parallel Agents

```
Backlog Size        Decision
───────────────────────────────
1-2 items           Use 1 agent (sequential)
3-5 items           Use 2-3 agents (parallel)
6-15 items          Use 4-5 agents (parallel)
16-50 items         Use 6-8 agents (parallel)
50+ items           Parallel audit first, then batch

Rule: Don't exceed 8 agents
```

---

## Launching Parallel Agents

**Before:**
```
□ Run tests (baseline):    npm test -- --run
□ Map dependencies:        Which items block which?
□ Assign scopes:           Agent 1 = P0, Agent 2 = P1, etc.
□ Define time boxes:       P0: 4h, P1: 8h, P2: 2d, P3: 1d
□ Setup coordination:      Daily standup, communication channel
```

**Daily During:**
```
□ Standup (10 min):       What did you do? What's next? Blocked?
□ Escalate blockers:      Get decisions within 1 hour
□ Run tests:              After each major merge
```

**After:**
```
□ Verify all items:       Completed or deferred?
□ Run full test suite:    npm test
□ Generate metrics:       Effort accuracy, time per priority
□ Document lessons:       What surprised us?
□ Single commit:          Consolidate all changes
```

---

## Priority Quick Reference

```
P0 (Critical)
├─ Security issues
├─ Production bugs
├─ Blocking critical features
└─ Time box: 4 hours max

P1 (High)
├─ Important features
├─ Important refactors
├─ Blocking development
└─ Time box: 8 hours max

P2 (Medium)
├─ Code quality
├─ Performance improvements
├─ Minor bugs
└─ Time box: 2 days max

P3 (Low)
├─ Polish
├─ Nice-to-haves
├─ Technical debt
└─ Time box: 1 day max
```

---

## TODO vs GitHub Issue

```
Use TODO (inline):         Use GitHub Issue:
├─ <8 hours effort        ├─ P0 / P1 (always)
├─ P2/P3 items            ├─ >8 hours effort
├─ Implementation detail   ├─ Needs specification
└─ No team discussion      ├─ Affects users
                           └─ Needs external input
```

---

## Deferred Item Format

```markdown
# XXX-deferred-[reason]-[title].md

## Why Deferred
(Clear reason)

## Unblock Conditions
- [ ] Condition 1
- [ ] Condition 2

## Re-evaluation Date
[Month/Quarter]

## Owner
[Who decided]
```

---

## Dependency Types

```
INDEPENDENT (can run parallel):
├─ Different files
├─ No shared state
└─ No sequential dependency

SEQUENTIAL (must run in order):
├─ A must complete before B starts
├─ B depends on A's output
└─ Common: API endpoint (Agent 1) → Client hook (Agent 2)

SHARED STATE (need coordination):
├─ Both agents modify same file
└─ Merge strategy must be clear
```

---

## Quick Wins (Do These First)

```
Type              Time    Impact   Example
─────────────────────────────────────────────────────────
Configuration    15 min  High     Add feature flag
Uncomment code   10 min  High     Uncomment API broadcast
Find/replace     20 min  Medium   Rename deprecated roles
Inline calls     30-45m  Medium   Add Twilio call
Test fixes       15-60m  Low      Update test expectations
```

---

## Merge Order (Parallel Agents)

```
1. Merge P0 items FIRST (security/critical)
2. Then P1 items (features, high priority)
3. Then P2 items (technical debt)
4. Then P3 items (polish)

Reason: Each phase might depend on previous
Example: P1 features depend on P0 security fixes
```

---

## Common Blockers & Recovery

```
Blocker              Solution                  Time
─────────────────────────────────────────────────────
Architectural        Get decision from lead    1 hour
decision pending     (if >1h, defer item)

External             Find workaround OR        30 min
dependency           defer until available

Unclear              Provide example /         15 min
requirement          clarification

Test failure         Coordinator diagnoses     30 min
                     locally first

Merge conflict       Communicate merge order   30 min
                     to both agents
```

---

## Memory Check

```bash
# During development
ps aux | grep node | awk '{print $6/1024 " MB"}'

# Should be <2GB for dev / <1GB for production
# If exceeding:
├─ Clear caches
├─ Remove event listeners
├─ Fix circular references
└─ Reduce bundle size
```

---

## Test Quick Reference

```bash
# Run locally before committing
npm test                    # All tests
npm run test:server         # Server only
npm run test:client         # Client only
npm run test:watch          # Watch mode

# Check coverage
npm test -- --coverage

# Run specific test
npm test -- --grep "specific test name"

# Target: >99% pass rate (allow 1-2 flaky tests)
```

---

## Git Commands for Todo Management

```bash
# Status overview
ls todos/ | sort
grep -h "Status:" todos/*.md | sort | uniq -c

# Count by priority
ls todos/*-p0-* | wc -l   # P0 count
ls todos/*-p1-* | wc -l   # P1 count
ls todos/*-p2-* | wc -l   # P2 count
ls todos/*-p3-* | wc -l   # P3 count

# Age of pending items
find todos/ -name "*pending*" -mtime +7
# Lists items >7 days old

# Archive completed items
mv todos/001-completed-* .archive/

# Review recent changes
git log --oneline todos/ | head -20
```

---

## Weekly Ritual

```
Every Friday, 4:00 PM

1. Check for new TODOs ........... 5 min
2. Categorize by priority ........ 10 min
3. Look for items aging >3 days .. 10 min
4. Mark completed items ......... 3 min
5. Commit changes ............... 2 min

TOTAL: 30 minutes
```

---

## Monthly Ritual

```
First Monday of Month, 1 hour

1. Count backlog ................. 5 min
2. Identify systemic issues ....... 15 min
3. Unblock any items >7 days ...... 20 min
4. Generate metrics report ....... 10 min
5. Commit documentation .......... 10 min

TOTAL: 1 hour
```

---

## Emergency Escalation

```
P0 SECURITY ISSUE

1. Acknowledge (5 min)
2. Assess impact (10 min)
3. Communicate to team (5 min)
4. Mitigate or rollback (15 min)
5. Fix properly (same day)
6. Document post-mortem (next day)

Target: Resolved within 24 hours
```

---

## Success Checklist

```
□ New items: <5/week
□ Pending age: <7 days
□ Blocked items: 0
□ P0 resolution: <24 hours
□ Tests passing: >99.5%
□ Weekly triage: Done
□ Monthly audit: Done
□ Team sentiment: Positive
```

---

## Where to Find Help

```
For detailed info:
- Prevention strategies: .claude/BACKLOG_PREVENTION_FRAMEWORK.md
- Parallel agent process: .claude/solutions/parallel-agent-backlog-resolution.md
- Auth patterns: .claude/lessons/
- ADRs: .claude/decisions/
- This quick ref: .claude/BACKLOG_QUICK_REFERENCE.md
```

---

**Last Updated:** 2025-11-29
**Framework Version:** 1.0
**Status:** Active
