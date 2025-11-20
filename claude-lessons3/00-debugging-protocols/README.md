# Debugging Protocols - Quick Start

## What This Is

**Systematic debugging methodologies** extracted from 70+ days of production incidents. These protocols help you debug **unknown issues** efficiently.

## How It's Different from Other Lessons

| Other Lessons (01-10) | This (00) |
|-----------------------|-----------|
| "What went wrong and how to fix it" | "How to debug unknown issues" |
| Domain-specific knowledge | Universal debugging methods |
| Incident reports + solutions | Protocols + frameworks |
| **Use when**: You recognize the error | **Use when**: You don't know where to start |

## The 5 Protocols

### 1. Hypothesis Testing Framework (HTF)
**When**: You have a theory about what's wrong
**Time**: 5-10 minutes
**Output**: Confirmed or rejected hypothesis with evidence

```bash
HYPOTHESIS: JWT missing scope field
TEST: echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope'
EXPECTED: Array of scopes
ACTUAL: null
CONCLUSION: ❌ REJECTED → Must add scope before jwt.sign()
```

### 2. Error Pattern Library (EPL)
**When**: Error message doesn't make sense
**Time**: 2-5 minutes
**Output**: Real cause + fix commands

```bash
Misleading: "Cannot find module @/components/Header"
Real cause: TypeScript path alias not configured
Fix: Add {"paths": {"@/*": ["./src/*"]}} to tsconfig.json
Time saved: 15-30 minutes
```

### 3. Clean Slate Protocol (CSP)
**When**: "It was working before" / environment suspected
**Time**: 0.5-20 minutes (4 graduated levels)
**Output**: Known-good state or confirmation that issue is NOT environment

```bash
Level 0: Clear cache (30s)
Level 1: Reinstall dependencies (2-5 min)
Level 2: Reset global state (5-10 min)
Level 3: Nuclear option (10-20 min)
```

### 4. Diagnostic Decision Tree (DDT)
**When**: No idea where to start
**Time**: 15-30 minutes (time-boxed steps)
**Output**: Systematic path to root cause

```
Build Failed → Is environment clean?
  ↓ YES              ↓ NO
Step 2          CSP Level 1
```

### 5. Parallel Investigation Triggers (PIT)
**When**: Multiple theories, time budget exceeded, or complex issue
**Time**: 20-40 minutes
**Output**: High-confidence findings from parallel research

```bash
Condition: 3+ hypotheses with >20% confidence each
Action: Launch parallel investigations
Result: Synthesize findings by confidence
```

## Quick Decision Flow

```
┌─────────────────────────────────────┐
│ Encountering an unknown issue       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 1. Check EPL (2 min)                │
│    Known misleading error?          │
└─────────────────────────────────────┘
   Found? → Apply fix → Done
   Not found? ↓
┌─────────────────────────────────────┐
│ 2. Have hypothesis? → HTF (5 min)   │
│    Test before fixing               │
└─────────────────────────────────────┘
   Confirmed? → Apply fix → Done
   Rejected? ↓
┌─────────────────────────────────────┐
│ 3. Environment issue? → CSP (5-20m) │
│    Clean slate verification         │
└─────────────────────────────────────┘
   Fixed? → Document → Done
   Not fixed? ↓
┌─────────────────────────────────────┐
│ 4. Complex? → DDT + PIT (30-60 min) │
│    Systematic investigation         │
└─────────────────────────────────────┘
   Resolved? → Document → Done
   Still stuck? → Escalate with logs
```

## Real-World Example

**Scenario**: Login returns 401, authentication modal loops

### Without Protocols (48 days - actual CL-AUTH-001)
```
1. "Credentials are correct, weird..."
2. "Let me check the auth middleware"
3. "Maybe it's the JWT secret?"
4. "Try different browsers?"
5. "Works locally, must be Render issue?"
6. [Repeat daily for 48 days]
```

### With Protocols (5 minutes)
```
1. Check EPL: "401 Unauthorized loop"
   → Found: EPL-007 (Supabase auth + STRICT_AUTH)

2. Run test command:
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.restaurant_id'
   → Result: null (pattern confirmed)

3. Go to domain lesson:
   claude-lessons3/01-auth-authorization-issues/
   → Section: CL-AUTH-001

4. Apply documented fix:
   Replace supabase.auth.signInWithPassword()
   with custom auth endpoint

5. Verify: Login successful ✅
```

**Time saved**: 48 days → 5 minutes (99.99% reduction)

## When to Use Each Protocol

| Scenario | Protocol | File Section |
|----------|----------|--------------|
| Error message is confusing | EPL | Error Pattern Library |
| "I think it's X" | HTF | Hypothesis Testing Framework |
| "Worked yesterday" | CSP | Clean Slate Protocol |
| "Where do I start?" | DDT | Diagnostic Decision Tree |
| Multiple possible causes | PIT | Parallel Investigation Triggers |
| Time pressure | DDT (time-boxed) | Quick Reference |
| Already tried everything | CSP Level 3 → PIT | Emergency Decision Flow |

## Integration with Domain Lessons

These protocols **complement** the domain-specific lessons:

```
00-debugging-protocols/    ← HOW to debug (methods)
   LESSONS.md

01-auth-authorization/     ← WHAT went wrong (incidents)
   LESSONS.md              ← Solutions for auth issues

02-database-supabase/      ← Database-specific incidents
   LESSONS.md

...and so on
```

**Use together**:
1. Use protocols (00) to identify root cause
2. Check domain lesson (01-10) for solution pattern
3. Apply fix from domain lesson
4. Document new pattern in EPL if error was misleading

## File Contents

### LESSONS.md (Main File)

1. **Protocol 1: HTF** - Hypothesis testing templates, real examples, anti-patterns
2. **Protocol 2: EPL** - Misleading error catalog (EPL-001 through EPL-007)
3. **Protocol 3: CSP** - 4 levels of environment reset with verification
4. **Protocol 4: DDT** - Decision trees for build/type/production errors
5. **Protocol 5: PIT** - Parallel investigation triggers and synthesis
6. **Integration Guide** - How to combine with domain lessons
7. **Quick Reference** - Protocol selection matrix, emergency flow

## Success Metrics

Target: **80% of issues resolved in <30 minutes**

Track:
- HTF accuracy rate (% first hypothesis correct)
- EPL hit rate (% errors found in library)
- CSP resolution level (which level typically works)
- DDT time savings (vs ad-hoc debugging)
- PIT success rate (% parallel investigations successful)

## Common Patterns

### Pattern 1: Unknown Error
```
EPL lookup → Not found
  ↓
HTF with multiple hypotheses
  ↓
None confirmed → PIT (parallel investigation)
  ↓
Find root cause → Add to EPL for next time
```

### Pattern 2: Environment Drift
```
"Works on my machine"
  ↓
CSP Level 1 (reinstall dependencies)
  ↓
Still fails → CSP Level 2 (global reset)
  ↓
Fixed → Document which level worked
```

### Pattern 3: Time Pressure
```
DDT (time-boxed steps, 30 min budget)
  ↓
Step exceeds 150% time → Trigger PIT
  ↓
Parallel investigation → Find answer within budget
```

## Adding New Patterns

When you discover something new:

1. **Fix the issue** using protocols
2. **Document in domain lesson** (category 01-10)
3. **If error was misleading** → Add to EPL in this file
4. **If new hypothesis type** → Update HTF templates
5. **If new decision branch** → Add to DDT

This creates a **learning system** that gets smarter over time.

---

**Source**: Extracted from claudelessons-v2 (70+ production incidents)
**Time Range**: 2025-06 through 2025-11
**Incident Days**: 70+
**Categories Covered**: Auth, Database, React, Websocket, Build, Testing, API, Performance, Security, Documentation

**See**: LESSONS.md for complete protocols and examples
