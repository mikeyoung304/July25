# Diagnostic Decision Tree (DDT) Protocol

**Version**: 1.0
**Created**: 2025-11-16
**Purpose**: Real-time diagnostic guidance to prevent multi-day debugging sessions

---

## Overview

The Diagnostic Decision Tree provides **binary decision points** with specific commands at each step. This prevents assumption-based debugging and ensures systematic investigation.

### Key Principles

1. **Test, Don't Assume**: Every hypothesis must have a verification command
2. **Time-Boxed Steps**: Max 15 minutes per decision point
3. **Automatic Escalation**: Launch subagents when uncertainty exceeds threshold
4. **Parallel Investigation**: Multiple paths explored simultaneously

---

## Decision Tree: Build Failures

```
┌─────────────────────────────────────────┐
│ BUILD FAILED                            │
│ Time Budget: 30 minutes                 │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Is this a clean environment?    │
│ Time: 5 minutes                         │
│                                         │
│ RUN: ls -la node_modules/.cache         │
│      ls -la dist/                       │
│      npm ls --depth=0 | grep UNMET      │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
      YES                    NO ──────┐
        │                             │
        ▼                             ▼
┌──────────────────┐      ┌─────────────────────────┐
│ Go to STEP 2     │      │ EXECUTE: Clean Slate    │
└──────────────────┘      │ Protocol (CSP)          │
                          │                         │
                          │ RUN:                    │
                          │ rm -rf node_modules     │
                          │ rm -rf dist             │
                          │ rm -rf .vite            │
                          │ npm ci                  │
                          │                         │
                          │ THEN: Retry build       │
                          └─────────────────────────┘
                                      ▼
                          ┌─────────────────────────┐
                          │ Build successful?       │
                          └─────────────────────────┘
                                      ▼
                              ┌───────┴───────┐
                              │               │
                            YES              NO
                              │               │
                              ▼               ▼
                        ┌──────────┐    ┌──────────┐
                        │ RESOLVED │    │ STEP 2   │
                        │ Add to   │    └──────────┘
                        │ EPL as   │
                        │ "cache   │
                        │ issue"   │
                        └──────────┘

┌─────────────────────────────────────────┐
│ STEP 2: Is the error message clear?     │
│ Time: 10 minutes                        │
│                                         │
│ RUN: npm run build 2>&1 | tee build.log│
│      grep -i "error" build.log          │
│      grep -i "cannot find" build.log    │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
  CLEAR ERROR          VAGUE ERROR
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌────────────────────────┐
│ Go to STEP 3     │   │ TRIGGER: Error Pattern │
│                  │   │ Library (EPL) lookup   │
│                  │   │                        │
│                  │   │ RUN:                   │
│                  │   │ npx claudelessons      │
│                  │   │   search "$(grep -i    │
│                  │   │   error build.log |    │
│                  │   │   head -1)"            │
│                  │   │                        │
│                  │   │ IF NO MATCH:           │
│                  │   │ → LAUNCH SUBAGENT 1    │
│                  │   │   (Error analysis)     │
│                  │   │ → LAUNCH SUBAGENT 2    │
│                  │   │   (Recent changes)     │
└──────────────────┘   └────────────────────────┘

┌─────────────────────────────────────────┐
│ STEP 3: Error category detection        │
│ Time: 5 minutes                         │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ Run error categorization:               │
│                                         │
│ grep -i "cannot find module"  → TYPE 1  │
│ grep -i "typescript.*error"   → TYPE 2  │
│ grep -i "syntax.*error"       → TYPE 3  │
│ grep -i "import.*failed"      → TYPE 4  │
│ grep -i "out of memory"       → TYPE 5  │
│ DEFAULT                       → TYPE 6  │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
    TYPE 1-5             TYPE 6 (Unknown)
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌────────────────────────┐
│ Go to specific   │   │ ESCALATE:              │
│ error handler    │   │ Parallel Investigation │
│ (see below)      │   │ Triggers (PIT)         │
│                  │   │                        │
│                  │   │ LAUNCH 3 SUBAGENTS:    │
│                  │   │ 1. Git bisect finder   │
│                  │   │ 2. Dependency analyzer │
│                  │   │ 3. Config validator    │
│                  │   │                        │
│                  │   │ Time limit: 20 min     │
└──────────────────┘   └────────────────────────┘
```

---

## Type-Specific Handlers

### TYPE 1: Module Not Found

```
┌─────────────────────────────────────────┐
│ MODULE NOT FOUND ERROR                  │
│ Time Budget: 15 minutes                 │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Extract module name             │
│                                         │
│ RUN: grep "Cannot find module" build.log│
│      | sed "s/.*'\(.*\)'.*/\1/"         │
│ SAVE: $MODULE_NAME                      │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 2: Check if module exists          │
│                                         │
│ RUN: npm ls $MODULE_NAME                │
│      find node_modules -name $MODULE_NAME│
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
     FOUND                NOT FOUND
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌────────────────────────┐
│ Path resolution  │   │ Missing dependency     │
│ issue            │   │                        │
│                  │   │ RUN:                   │
│ HYPOTHESIS:      │   │ npm install $MODULE_NAME│
│ Import path      │   │                        │
│ incorrect        │   │ IF FAILS:              │
│                  │   │ Check package.json     │
│ TEST:            │   │ for typos              │
│ grep -r "import  │   │                        │
│ .*$MODULE_NAME"  │   │ RUN:                   │
│ src/             │   │ cat package.json |     │
│                  │   │ jq '.dependencies'     │
│ FIX:             │   │                        │
│ Correct import   │   │ EXPECTED:              │
│ path in code     │   │ Module listed          │
└──────────────────┘   └────────────────────────┘
```

### TYPE 2: TypeScript Errors

```
┌─────────────────────────────────────────┐
│ TYPESCRIPT ERROR                        │
│ Time Budget: 20 minutes                 │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Count unique errors             │
│                                         │
│ RUN: grep "TS[0-9]" build.log |         │
│      awk '{print $1}' | sort -u | wc -l │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
    < 5 ERRORS           > 5 ERRORS
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌────────────────────────┐
│ Targeted fix     │   │ SYSTEMATIC ERROR       │
│                  │   │                        │
│ HYPOTHESIS:      │   │ HYPOTHESIS:            │
│ Recent code      │   │ Type definition broken │
│ change broke     │   │ OR config change       │
│ types            │   │                        │
│                  │   │ TEST:                  │
│ TEST:            │   │ git diff HEAD~1        │
│ git log --since  │   │   tsconfig.json        │
│ "1 hour ago"     │   │   package.json         │
│ --oneline        │   │   src/types/           │
│                  │   │                        │
│ DECISION:        │   │ IF CHANGED:            │
│ Revert last      │   │ → Revert config        │
│ commit and test  │   │ IF NOT CHANGED:        │
│                  │   │ → LAUNCH SUBAGENT      │
│ Max time: 10 min │   │   (Type system audit)  │
└──────────────────┘   └────────────────────────┘
```

### TYPE 3: Syntax Errors

```
┌─────────────────────────────────────────┐
│ SYNTAX ERROR                            │
│ Time Budget: 10 minutes                 │
│                                         │
│ CRITICAL: Often misleading!             │
│ Real cause may be elsewhere             │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Run Hypothesis Testing Framework│
│                                         │
│ HYPOTHESIS 1: Recent file had bad syntax│
│ TEST: git diff HEAD --name-only |       │
│       xargs -I {} npx eslint {}         │
│ EXPECTED: ESLint catches syntax error   │
│ ACTUAL: ___________________________     │
│                                         │
│ IF ACTUAL != EXPECTED:                  │
│ → Syntax error is RED HERRING           │
│ → Real issue is type/module problem     │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 2: Check Error Pattern Library     │
│                                         │
│ RUN: npx claudelessons search           │
│      "misleading syntax error"          │
│                                         │
│ COMMON CAUSES:                          │
│ 1. Missing dependency (shows as syntax) │
│ 2. TypeScript version mismatch          │
│ 3. Circular dependency                  │
│                                         │
│ ACTION: Run dependency validator        │
│ RUN: npm ls | grep -i "invalid"         │
└─────────────────────────────────────────┘
```

---

## Decision Tree: Deployment Failures

```
┌─────────────────────────────────────────┐
│ DEPLOYMENT FAILED                       │
│ Time Budget: 45 minutes                 │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Environment check               │
│ Time: 5 minutes                         │
│                                         │
│ RUN:                                    │
│ - env | grep -E "NODE|PORT|DATABASE"    │
│ - compare with .env.example             │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 2: Build vs Runtime failure?       │
│                                         │
│ CHECK: Does "docker build" succeed?     │
│ RUN: docker build -t test .             │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
    BUILD FAILS          RUNTIME FAILS
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌────────────────────────┐
│ Use BUILD        │   │ STEP 3: Check logs     │
│ decision tree    │   │                        │
│ (above)          │   │ RUN:                   │
│                  │   │ docker logs container  │
│                  │   │                        │
│                  │   │ LOOK FOR:              │
│                  │   │ - Port conflicts       │
│                  │   │ - DB connection fails  │
│                  │   │ - Missing env vars     │
└──────────────────┘   └────────────────────────┘
                                      ▼
                          ┌─────────────────────────┐
                          │ STEP 4: Local reproduction│
                          │                         │
                          │ HYPOTHESIS:             │
                          │ Works local, fails prod │
                          │                         │
                          │ TEST:                   │
                          │ 1. Copy prod env vars   │
                          │ 2. Run locally          │
                          │ 3. Compare behavior     │
                          │                         │
                          │ EXPECTED: Same failure  │
                          │ ACTUAL: ___________     │
                          │                         │
                          │ IF DIFFERENT:           │
                          │ → ESCALATE to PIT       │
                          │   (Environment drift)   │
                          └─────────────────────────┘
```

---

## Decision Tree: Type Errors in Production

```
┌─────────────────────────────────────────┐
│ TYPE ERROR IN PRODUCTION                │
│ Time Budget: 60 minutes                 │
│                                         │
│ CRITICAL: Follow HTF strictly           │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Can you reproduce locally?      │
│ Time: 15 minutes                        │
│                                         │
│ HYPOTHESIS: Same input → same error     │
│                                         │
│ TEST COMMAND:                           │
│ curl -X POST localhost:3000/api/endpoint│
│   -H "Content-Type: application/json"   │
│   -d '${PRODUCTION_REQUEST_BODY}'       │
│                                         │
│ EXPECTED: Same TypeError               │
│ ACTUAL: _________________________       │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
     CAN REPRO            CANNOT REPRO
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌────────────────────────┐
│ STEP 2:          │   │ ENVIRONMENT SPECIFIC   │
│ Add breakpoint   │   │                        │
│                  │   │ LAUNCH SUBAGENT:       │
│ RUN:             │   │ "Compare prod vs dev:  │
│ 1. Add console   │   │  - Node version        │
│    .log before   │   │  - Dependencies        │
│    error line    │   │  - Environment vars    │
│ 2. Inspect value │   │  - Request headers     │
│ 3. Check type    │   │  - Database schema"    │
│                  │   │                        │
│ LOOK FOR:        │   │ Time limit: 20 min     │
│ - undefined      │   │                        │
│ - null           │   │ ESCALATE if not found  │
│ - wrong type     │   └────────────────────────┘
└──────────────────┘
         ▼
┌──────────────────────────────────────────┐
│ STEP 3: Trace data source                │
│                                          │
│ QUESTION: Where did this value come from?│
│                                          │
│ CHECK IN ORDER:                          │
│ 1. Request body   → Log req.body         │
│ 2. Database query → Log query result     │
│ 3. External API   → Log API response     │
│ 4. Transform      → Log before/after     │
│                                          │
│ HYPOTHESIS: Data shape changed           │
│                                          │
│ TEST: Check recent migrations/API changes│
│ RUN: git log --since="1 week ago"        │
│      --grep="migration\|schema\|api"     │
└──────────────────────────────────────────┘
```

---

## Escalation Triggers

### Automatic Subagent Launch Conditions

Launch subagents when:

1. **Time Exceeded**: Step exceeds time budget by 50%
2. **Uncertainty High**: Cannot categorize error after 2 attempts
3. **Multiple Paths**: 3+ possible root causes
4. **Environment Mismatch**: Local works, prod fails
5. **Recurring Pattern**: Same error type seen 3+ times

### Escalation Command

```bash
# claudelessons-v2/scripts/escalate.sh
npx claudelessons escalate \
  --error "$ERROR_MESSAGE" \
  --log "build.log" \
  --context "$(git log -1 --oneline)" \
  --budget "remaining-time-in-minutes"

# This will:
# 1. Launch 3 parallel subagents
# 2. Each investigates different hypothesis
# 3. Results synthesized after time limit
# 4. Best path recommended
```

---

## Time Budget Enforcement

### Built-in Timers

```javascript
// claudelessons-v2/enforcement/diagnostic-timer.js
class DiagnosticTimer {
  constructor(stepName, budgetMinutes) {
    this.stepName = stepName;
    this.budgetMs = budgetMinutes * 60 * 1000;
    this.startTime = Date.now();

    this.warningTimer = setTimeout(() => {
      console.warn(`⚠️  ${stepName}: 75% of time budget used`);
    }, this.budgetMs * 0.75);

    this.escalationTimer = setTimeout(() => {
      console.error(`🚨 ${stepName}: Time budget exceeded. ESCALATING.`);
      this.escalate();
    }, this.budgetMs);
  }

  complete() {
    clearTimeout(this.warningTimer);
    clearTimeout(this.escalationTimer);
    const elapsed = (Date.now() - this.startTime) / 1000 / 60;
    console.log(`✅ ${this.stepName} completed in ${elapsed.toFixed(1)} minutes`);
  }

  escalate() {
    exec(`npx claudelessons escalate --step="${this.stepName}"`);
  }
}

// Usage
const timer = new DiagnosticTimer('Module Resolution', 15);
// ... do diagnostic work ...
timer.complete();
```

---

## Integration with Existing Claudelessons

### Add to `.claudelessons-rc.json`

```json
{
  "diagnostics": {
    "enabled": true,
    "defaultBudget": 30,
    "autoEscalate": true,
    "parallelAgents": 3,
    "decisionTrees": [
      "build-failure",
      "deployment-failure",
      "type-error",
      "test-failure"
    ]
  }
}
```

### CLI Commands

```bash
# Start diagnostic session
npx claudelessons diagnose --type=build-failure

# This will:
# 1. Launch interactive decision tree
# 2. Show current step and options
# 3. Execute test commands
# 4. Auto-escalate if needed
# 5. Document findings in knowledge base

# Example session:
$ npx claudelessons diagnose --type=build-failure

┌─────────────────────────────────────────┐
│ DIAGNOSTIC SESSION: Build Failure       │
│ Time Budget: 30 minutes                 │
│ Started: 2025-11-16 10:30:00            │
└─────────────────────────────────────────┘

STEP 1: Clean environment check
▸ Running: ls -la node_modules/.cache
  Result: Directory exists, 145MB

❓ Is this a clean environment? (y/n): n

▸ Executing Clean Slate Protocol
  → Removing node_modules... ✓
  → Removing dist... ✓
  → Running npm ci... ✓ (45s)

▸ Retrying build...
  ✅ Build successful!

DIAGNOSIS: Stale cache caused build failure
SOLUTION: Clean install resolved issue
ADDED TO: Error Pattern Library (EPL-047)

Session completed in 3.2 minutes
```

---

## Success Metrics

Track effectiveness:

```json
{
  "diagnostic_sessions": {
    "total": 45,
    "resolved_without_escalation": 38,
    "avg_time_to_resolution": "12.3 minutes",
    "vs_manual_debugging": "-85%",
    "escalations": {
      "total": 7,
      "successful": 7,
      "avg_subagent_time": "18 minutes"
    }
  }
}
```

---

## Next Steps

1. Implement decision trees for remaining error types
2. Build automated test command executor
3. Create subagent orchestration system
4. Add ML-based error categorization
5. Integrate with IDE for real-time guidance

---

**Version**: 1.0
**Last Updated**: 2025-11-16
**Integration**: Claudelessons v2.0
**Status**: Ready for implementation
