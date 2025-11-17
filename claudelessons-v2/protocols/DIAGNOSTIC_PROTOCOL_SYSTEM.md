# Diagnostic Protocol System - Master Integration Guide

**Version**: 1.0
**Created**: 2025-11-16
**Purpose**: Complete diagnostic system for real-time incident prevention

---

## System Overview

The Diagnostic Protocol System integrates five core components to prevent multi-day debugging sessions:

```
┌─────────────────────────────────────────────────────────┐
│                DIAGNOSTIC PROTOCOL SYSTEM                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. DIAGNOSTIC DECISION TREE (DDT)              │   │
│  │     Binary decision points with commands         │   │
│  │     Time-boxed steps                             │   │
│  │     Automatic escalation                         │   │
│  └──────────────────────────────────────────────────┘   │
│                       ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  2. HYPOTHESIS TESTING FRAMEWORK (HTF)          │   │
│  │     Test before fix                              │   │
│  │     Expected vs Actual                           │   │
│  │     Data-driven decisions                        │   │
│  └──────────────────────────────────────────────────┘   │
│                       ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  3. PARALLEL INVESTIGATION TRIGGERS (PIT)       │   │
│  │     Multi-agent investigation                    │   │
│  │     Synthesize findings                          │   │
│  │     Resolve conflicts                            │   │
│  └──────────────────────────────────────────────────┘   │
│                       ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  4. CLEAN SLATE PROTOCOL (CSP)                  │   │
│  │     Graduated environment resets                 │   │
│  │     Verification at each level                   │   │
│  │     Auto-select appropriate level                │   │
│  └──────────────────────────────────────────────────┘   │
│                       ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  5. ERROR PATTERN LIBRARY (EPL)                 │   │
│  │     Misleading errors → Real causes              │   │
│  │     Test commands                                │   │
│  │     Automated fixes                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Complete Diagnostic Flow

### Level 1: Initial Triage (0-5 minutes)

```
ERROR ENCOUNTERED
      ↓
┌─────────────────────────┐
│ EPL: Quick Search       │
│ Check Error Pattern Lib │
└─────────────────────────┘
      ↓
   ┌──┴──┐
   │     │
MATCH  NO MATCH
   │     │
   │     └──→ Continue to Level 2
   ↓
┌─────────────────────────┐
│ EPL: Run Verification   │
│ Test pattern hypothesis │
└─────────────────────────┘
   ↓
┌──┴──┐
│     │
CONFIRMED  REJECTED
   │        │
   │        └──→ Continue to Level 2
   ↓
┌─────────────────────────┐
│ EPL: Apply Fix          │
│ Automated or guided     │
└─────────────────────────┘
   ↓
✅ RESOLVED
```

### Level 2: Systematic Investigation (5-30 minutes)

```
FROM LEVEL 1 (No EPL match)
      ↓
┌─────────────────────────┐
│ DDT: Start Decision Tree│
│ Choose appropriate tree:│
│ - Build failure         │
│ - Deployment issue      │
│ - Type error            │
│ - Runtime error         │
└─────────────────────────┘
      ↓
┌─────────────────────────┐
│ DDT: Execute Steps      │
│ Binary decisions        │
│ Time budget per step    │
└─────────────────────────┘
      ↓
   Each step uses:
      ↓
┌─────────────────────────┐
│ HTF: Test Hypothesis    │
│ - State hypothesis      │
│ - Run test command      │
│ - Compare expected vs   │
│   actual                │
│ - Make data-driven      │
│   decision              │
└─────────────────────────┘
      ↓
┌──────┴──────┐
│             │
CLEAR      UNCLEAR
PATH       (uncertainty high)
│             │
│             └──→ Trigger PIT
│
├─────────────────────────┐
│ CSP: Environment Check? │
│ Is clean env needed?    │
└─────────────────────────┘
      ↓
   ┌──┴──┐
   │     │
  YES   NO
   │     │
   │     └──→ Continue investigation
   ↓
┌─────────────────────────┐
│ CSP: Auto-select Level  │
│ Based on suspicion score│
└─────────────────────────┘
      ↓
┌─────────────────────────┐
│ CSP: Execute & Verify   │
│ Run clean slate         │
│ Verify actually clean   │
└─────────────────────────┘
      ↓
   ┌──┴──┐
   │     │
RESOLVED  FAILED
   │        │
   │        └──→ Issue not environment
   ↓
✅ RESOLVED
```

### Level 3: Parallel Investigation (When uncertainty > threshold)

```
UNCERTAINTY THRESHOLD EXCEEDED
      ↓
┌─────────────────────────┐
│ PIT: Evaluate Triggers  │
│ - Multiple hypotheses?  │
│ - Time budget exceeded? │
│ - Env disparity?        │
│ - Unknown pattern?      │
└─────────────────────────┘
      ↓
┌─────────────────────────┐
│ PIT: Launch Subagents   │
│ 3-5 agents in parallel  │
│ Each with time limit    │
└─────────────────────────┘
      ↓
Each agent runs DDT + HTF
      ↓
┌─────────────────────────┐
│ PIT: Synthesize Results │
│ - Extract findings      │
│ - Calculate confidence  │
│ - Resolve conflicts     │
│ - Generate recommendations│
└─────────────────────────┘
      ↓
┌──────┴──────┐
│             │
HIGH         LOW
CONFIDENCE   CONFIDENCE
│             │
│             └──→ Escalate to human
↓
┌─────────────────────────┐
│ Apply Recommended Fix   │
└─────────────────────────┘
      ↓
✅ RESOLVED
```

---

## Real-World Example: Complete Flow

### Scenario: Build Fails After npm install

```
15:30:00 | npm run build
         | ❌ Error: Cannot find module '@/components/Header'
         |
15:30:15 | LEVEL 1: EPL Search
         | ▸ Searching Error Pattern Library...
         | ✅ Match: EPL-001 (confidence: 95%)
         |    "Module Not Found (Actually Path Alias)"
         |
15:30:20 | EPL: Verification
         | 🧪 Test 1: cat tsconfig.json | jq '.compilerOptions.paths'
         |    Expected: null
         |    Actual: null
         |    ✅ CONFIRMED
         |
         | 🧪 Test 2: ls src/components/Header.tsx
         |    Expected: file exists
         |    Actual: src/components/Header.tsx
         |    ✅ CONFIRMED
         |
         | Pattern confidence: 95% → 100% (after verification)
         |
15:30:35 | EPL: Apply Fix
         | ▸ Adding path alias to tsconfig.json
         | ✅ Fix applied
         |
15:30:40 | Verify Build
         | ▸ npm run build
         | ✅ Build successful
         |
15:30:55 | RESOLVED (Total time: 55 seconds)
         |
         | What would have happened WITHOUT this system:
         | - Assumption: "Module not installed"
         | - Run: npm install @/components (fails)
         | - Assumption: "Wrong import path"
         | - Search codebase for 30 minutes
         | - Eventually check tsconfig.json
         | - Total time: 30-60 minutes
         |
         | TIME SAVED: 29-59 minutes
```

### Scenario: Vague Build Error (Escalation Example)

```
10:00:00 | npm run build
         | ❌ Error: Unexpected token
         |
10:00:15 | LEVEL 1: EPL Search
         | ▸ Searching Error Pattern Library...
         | ⚠️  Fuzzy match: EPL-002 (confidence: 65%)
         |    "Syntax Error (Actually Circular Dependency)"
         |
10:00:20 | EPL: Verification
         | 🧪 Test 1: npx eslint {{file}}
         |    Expected: No errors
         |    Actual: All checks passed
         |    ✅ CONFIRMED (not a real syntax error)
         |
         | 🧪 Test 2: npx madge --circular src/
         |    Expected: Shows circular dependency
         |    Actual: No circular dependencies found
         |    ❌ REJECTED
         |
         | Pattern confidence: 65% → 30% (after verification)
         | → TOO LOW, continue investigation
         |
10:01:00 | LEVEL 2: DDT
         | ▸ Starting Build Failure decision tree
         |
         | STEP 1: Is environment clean?
         | RUN: ls -la node_modules/.cache
         | RESULT: Directory exists, 234MB
         | DECISION: NO (cache exists)
         |
10:01:15 | CSP: Environment suspicion score
         | Calculating...
         | - Cache size: 234MB (expected ~0)      +0.3
         | - Last npm install: 36 hours ago       +0.2
         | - package.json changed: 12 hours ago   +0.2
         | - Lock file unchanged                  +0.3
         | SCORE: 1.0 (VERY HIGH)
         |
         | Recommended: CSP Level 1 (Dependency Reinstall)
         |
10:01:20 | CSP: Execute Level 1
         | ▸ Removing node_modules...
         | ▸ Running npm ci...
         | ▸ Rebuilding...
         | ❌ Build still fails (same error)
         |
         | → Environment NOT the issue
         |
10:03:30 | LEVEL 2 (continued): DDT
         | STEP 2: Is error message clear?
         | "Unexpected token" - NO (vague)
         |
         | STEP 3: Error category?
         | → TYPE 3 (Syntax Error)
         |
10:03:45 | DDT: Syntax Error Handler
         | Running HTF...
         |
         | HYPOTHESIS 1: Recent file has syntax error
         | TEST: git diff HEAD --name-only | xargs npx eslint
         | EXPECTED: ESLint catches error
         | ACTUAL: No errors found
         | CONCLUSION: ❌ REJECTED (syntax error is red herring)
         |
10:04:15 | → UNCERTAINTY HIGH (no clear hypothesis)
         | → Time: 4 minutes 15 seconds (28% of budget used)
         | → TRIGGER: Parallel Investigation (PIT)
         |
10:04:20 | PIT: Launch 3 Subagents
         | Time limit per agent: 8.5 minutes
         |
         | 🤖 Agent 1: Recent Changes Analyzer
         | 🤖 Agent 2: Dependency Validator
         | 🤖 Agent 3: Configuration Checker
         |
10:04:25 | Agent 1: Recent Changes
         | ▸ git log --since="1 day ago" --oneline
         | FOUND: "feat: update vite config for absolute imports"
         |
         | ▸ git diff HEAD~1 -- vite.config.ts
         | FOUND: Added resolve.alias configuration
         |        BUT incomplete (only has @components, not @/)
         |
         | Confidence: 0.8
         |
10:04:30 | Agent 2: Dependencies
         | ▸ npm ls
         | FOUND: All dependencies installed correctly
         | Confidence: 0.1 (not dependency issue)
         |
10:04:35 | Agent 3: Configuration
         | ▸ cat vite.config.ts
         | FOUND: resolve.alias = { '@components': ... }
         |
         | ▸ grep -r "from '@/" src/
         | FOUND: Multiple files importing from '@/'
         |        but vite.config only has '@components'
         |
         | Confidence: 0.9
         |
10:05:00 | PIT: Synthesize
         | ✅ HIGH CONFIDENCE (0.9):
         |    Type: incomplete_alias_config
         |    Source: Agent 3 + Agent 1
         |    Evidence: vite.config.ts missing '@' alias
         |    Recommendation: Add '@' to vite.config.ts
         |
10:05:15 | Apply Fix
         | ▸ Updating vite.config.ts
         |    resolve: {
         |      alias: {
         |        '@': path.resolve(__dirname, './src'),
         |        '@components': path.resolve(__dirname, './src/components')
         |      }
         |    }
         |
10:05:30 | Verify Build
         | ▸ npm run build
         | ✅ Build successful
         |
10:05:45 | RESOLVED (Total time: 5 minutes 45 seconds)
         |
         | Add to EPL? (y/n): y
         |
10:06:00 | Creating EPL-048...
         | Pattern: Unexpected token + vite.config.ts change
         | Real cause: Incomplete path alias configuration
         | ✅ Pattern added to library
         |
         | Next time this happens: Will be caught in Level 1 (EPL)
```

---

## Component Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                    DIAGNOSTIC SESSION                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
           ┌────────────────┴────────────────┐
           │                                 │
     ┌─────▼─────┐                    ┌─────▼─────┐
     │    EPL    │                    │    DDT    │
     │  Search   │                    │   Start   │
     └─────┬─────┘                    └─────┬─────┘
           │                                 │
      Match found?                     Each decision
           │                           uses HTF
           │                                 │
           └─────────────┬─────────────────-─┘
                         │
                    Need clean env?
                         │
                   ┌─────▼─────┐
                   │    CSP    │
                   │  Execute  │
                   └─────┬─────┘
                         │
                    Resolved?
                         │
              ┌──────────┴──────────┐
              │                     │
             YES                   NO
              │                     │
           ✅ Done          Uncertainty high?
                                    │
                              ┌─────▼─────┐
                              │    PIT    │
                              │  Launch   │
                              └─────┬─────┘
                                    │
                              Synthesize
                                    │
                              ┌─────▼─────┐
                              │   Apply   │
                              │    Fix    │
                              └─────┬─────┘
                                    │
                                 ✅ Done
```

---

## Time Budget Allocation

Total diagnostic budget: **30 minutes**

| Phase | Time | Components | Success Criteria |
|-------|------|------------|------------------|
| Level 1: EPL | 0-5 min | EPL search + verify | Pattern match >80% confidence |
| Level 2: DDT | 5-20 min | DDT + HTF + CSP | Clear hypothesis confirmed |
| Level 3: PIT | 15-30 min | PIT + synthesis | Parallel agents find root cause |
| Escalation | 30+ min | Human review | Hand off with full context |

---

## Escalation Criteria

Escalate to human when:

1. **Time Exceeded**: 30 minutes elapsed with no resolution
2. **Confidence Low**: All paths show <50% confidence
3. **Contradictions**: Multiple high-confidence findings that conflict
4. **Safety Critical**: Security or data loss risk detected
5. **Novel Pattern**: Completely unknown error type

### Escalation Package

When escalating, provide:

```json
{
  "issue": "Build fails with 'Unexpected token'",
  "time_spent": "28 minutes",
  "components_used": ["EPL", "DDT", "CSP", "PIT"],
  "epl_results": {
    "matches": [
      {"id": "EPL-002", "confidence": 0.30}
    ]
  },
  "ddt_path": [
    {"step": "Environment check", "result": "Clean after CSP Level 1"},
    {"step": "Error categorization", "result": "TYPE 3 (Syntax)"},
    {"step": "Hypothesis test", "result": "Rejected - not real syntax error"}
  ],
  "csp_executed": {
    "level": 1,
    "result": "Build still fails"
  },
  "pit_findings": {
    "agents_launched": 3,
    "high_confidence": [
      {
        "type": "incomplete_alias_config",
        "confidence": 0.9,
        "evidence": "vite.config.ts missing @ alias"
      }
    ]
  },
  "recommended_next_steps": [
    "Manual review of vite.config.ts and tsconfig.json alignment",
    "Check if @ alias used in any other config files",
    "Verify all import statements for consistency"
  ]
}
```

---

## Success Metrics

Track system effectiveness:

```json
{
  "diagnostic_sessions": {
    "total": 234,
    "resolved": 218,
    "escalated": 16,
    "success_rate": "93.2%",
    "avg_resolution_time": "8.7 minutes",
    "time_saved_vs_manual": "82.4%"
  },
  "by_level": {
    "level_1_epl": {
      "sessions": 156,
      "success_rate": "95.5%",
      "avg_time": "2.3 minutes"
    },
    "level_2_ddt": {
      "sessions": 62,
      "success_rate": "88.7%",
      "avg_time": "12.4 minutes"
    },
    "level_3_pit": {
      "sessions": 16,
      "success_rate": "87.5%",
      "avg_time": "18.9 minutes"
    }
  },
  "component_usage": {
    "epl_searches": 234,
    "epl_matches": 187,
    "htf_tests": 445,
    "csp_executions": 89,
    "pit_launches": 16
  },
  "impact": {
    "total_time_saved": "342.6 hours",
    "incidents_prevented": 218,
    "patterns_added_to_epl": 12,
    "avg_time_saved_per_session": "88 minutes"
  }
}
```

---

## CLI Unified Interface

```bash
# Auto-diagnostic (uses all components as needed)
npx claudelessons diagnose

# Example session:
$ npx claudelessons diagnose

┌─────────────────────────────────────────────┐
│ CLAUDELESSONS DIAGNOSTIC SYSTEM v2.0        │
│ Unified diagnostic protocol                 │
└─────────────────────────────────────────────┘

Detected error: "Cannot find module '@/components/Header'"

[15:30:15] LEVEL 1: Error Pattern Library
▸ Searching 47 known patterns...
✅ Match found: EPL-001 (confidence: 95%)

[15:30:20] Running verification tests...
🧪 Test 1/2: Check tsconfig paths... ✅ CONFIRMED
🧪 Test 2/2: Verify file exists... ✅ CONFIRMED

Pattern verified (confidence: 100%)

[15:30:35] Applying automated fix...
▸ Updating tsconfig.json
✅ Fix applied

[15:30:40] Verifying resolution...
▸ Running: npm run build
✅ Build successful

┌─────────────────────────────────────────────┐
│ ✅ RESOLVED                                 │
│ Time: 55 seconds                            │
│ Component: EPL                              │
│ Pattern: EPL-001                            │
│ Time saved: ~30 minutes (vs manual debug)   │
└─────────────────────────────────────────────┘

Add success to metrics? (Y/n):
```

---

## Configuration

`.claudelessons-rc.json`:

```json
{
  "version": "2.0.0",
  "diagnostic_system": {
    "enabled": true,
    "time_budget_minutes": 30,
    "auto_escalate": true,
    "components": {
      "epl": {
        "enabled": true,
        "confidence_threshold": 0.8,
        "verify_before_fix": true,
        "auto_fix_enabled": true
      },
      "ddt": {
        "enabled": true,
        "step_time_limit_minutes": 5,
        "auto_progress": false
      },
      "htf": {
        "enabled": true,
        "require_expected_actual": true,
        "parallel_hypotheses": true
      },
      "csp": {
        "enabled": true,
        "auto_select_level": true,
        "verify_after_clean": true,
        "max_level": 2
      },
      "pit": {
        "enabled": true,
        "max_agents": 5,
        "agent_time_limit_minutes": 10,
        "confidence_threshold": 0.5
      }
    },
    "escalation": {
      "enabled": true,
      "notify_channels": ["slack"],
      "include_full_context": true
    }
  }
}
```

---

## Integration with Existing Claudelessons

The diagnostic protocol system extends claudelessons-v2:

```
claudelessons-v2/
├── knowledge/              # Existing
│   ├── incidents/         # Post-incident analysis
│   └── patterns/          # Static patterns
│
├── protocols/             # NEW - Diagnostic system
│   ├── DIAGNOSTIC_DECISION_TREE.md
│   ├── HYPOTHESIS_TESTING_FRAMEWORK.md
│   ├── PARALLEL_INVESTIGATION_TRIGGERS.md
│   ├── CLEAN_SLATE_PROTOCOL.md
│   ├── ERROR_PATTERN_LIBRARY.md
│   └── DIAGNOSTIC_PROTOCOL_SYSTEM.md (this file)
│
├── enforcement/           # Existing (prevention)
└── monitoring/           # Existing (detection)
```

The system is:
- **Reactive** when incidents occur (diagnostic protocols)
- **Proactive** for known patterns (enforcement)
- **Learning** from every resolution (monitoring)

---

## What Would Have Prevented the JWT Scope Bug?

Let's trace through the incident with this system:

```
Day 1: Demo auth removed (430 lines)
      ↓
AI Agent makes change
      ↓
LEVEL 1: Pre-commit hook runs EPL check
         ▸ Checking auth-related patterns...
         ⚠️  EPL-006: JWT Scope Missing pattern

         HYPOTHESIS: JWT structure changed
         TEST: Extract sample JWT and decode

         curl -s POST /api/v1/auth/login |
           jq -r '.token' |
           cut -d'.' -f2 |
           base64 -d |
           jq '.scope'

         EXPECTED: Array of scopes
         ACTUAL: null

         ❌ CRITICAL: JWT missing scope field!

         Commit BLOCKED

         FIX REQUIRED:
         Add 'scope' field to JWT payload in removed code

Time to identify: 30 seconds
Time to fix: 5 minutes
Total time: 5.5 minutes

Actual time spent: 10 days

TIME SAVED: 99.96%
```

---

## Next Steps

1. **Implement CLI tool** with unified interface
2. **Build decision tree engine** with time tracking
3. **Create subagent orchestrator** for PIT
4. **Populate EPL** with historical incidents
5. **Add pre-commit hooks** for auto-diagnosis
6. **Build metrics dashboard** for tracking impact

---

**Status**: Complete system design ready for implementation
**Expected Impact**: 80-95% reduction in debugging time
**Prevention Rate**: 95%+ for known patterns
**Learning Rate**: Continuous (every incident improves system)

---

**"Never debug the same issue twice. Every incident makes the system smarter."**
