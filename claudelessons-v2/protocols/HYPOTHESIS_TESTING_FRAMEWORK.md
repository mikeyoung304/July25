# Hypothesis Testing Framework (HTF)

**Version**: 1.0
**Created**: 2025-11-16
**Purpose**: Force systematic hypothesis validation before making changes

---

## Core Principle

> **"Never fix what you haven't proven broken. Never change what you don't understand."**

The HTF requires you to state a hypothesis, design a test, predict the outcome, observe the actual result, and make a decision based on the data - not assumptions.

---

## HTF Template

Every debugging action must follow this format:

```
┌──────────────────────────────────────────────────┐
│ HYPOTHESIS TESTING RECORD                        │
├──────────────────────────────────────────────────┤
│ Timestamp: 2025-11-16 10:30:00                   │
│ Issue: Build failing with "Cannot find module X" │
├──────────────────────────────────────────────────┤
│ HYPOTHESIS:                                      │
│ Module X is missing from node_modules            │
│                                                  │
│ TEST COMMAND:                                    │
│ find node_modules -name "X" -type d              │
│                                                  │
│ EXPECTED RESULT:                                 │
│ Empty output (module not found)                  │
│                                                  │
│ ACTUAL RESULT:                                   │
│ node_modules/X                                   │
│                                                  │
│ CONCLUSION:                                      │
│ ❌ HYPOTHESIS REJECTED                           │
│ Module exists, so import path must be wrong      │
│                                                  │
│ NEXT HYPOTHESIS:                                 │
│ Import path is incorrect in source file          │
└──────────────────────────────────────────────────┘
```

---

## Multi-Hypothesis Testing

When multiple causes are possible, test them **in parallel**:

```javascript
// claudelessons-v2/protocols/multi-hypothesis.js

class HypothesisTest {
  constructor(name, testCommand, expectedOutcome) {
    this.name = name;
    this.testCommand = testCommand;
    this.expectedOutcome = expectedOutcome;
    this.actualOutcome = null;
    this.result = null;
  }

  async execute() {
    console.log(`\n🔬 Testing: ${this.name}`);
    console.log(`   Command: ${this.testCommand}`);
    console.log(`   Expected: ${this.expectedOutcome}`);

    const startTime = Date.now();
    this.actualOutcome = await exec(this.testCommand);
    const duration = Date.now() - startTime;

    console.log(`   Actual: ${this.actualOutcome}`);

    this.result = this.actualOutcome === this.expectedOutcome
      ? 'CONFIRMED'
      : 'REJECTED';

    console.log(`   Result: ${this.result} (${duration}ms)`);

    return this;
  }
}

// Usage Example
async function diagnoseModuleNotFound(moduleName) {
  const hypotheses = [
    new HypothesisTest(
      'Module not installed',
      `npm ls ${moduleName}`,
      'not found'
    ),
    new HypothesisTest(
      'Import path incorrect',
      `grep -r "from.*${moduleName}" src/ | grep -v node_modules`,
      'contains wrong path'
    ),
    new HypothesisTest(
      'TypeScript config excludes module',
      `cat tsconfig.json | jq '.exclude | any(test("${moduleName}"))'`,
      'true'
    ),
    new HypothesisTest(
      'Module exists but in wrong location',
      `find . -name "${moduleName}" -not -path "*/node_modules/*"`,
      'found'
    )
  ];

  // Test all hypotheses in parallel
  const results = await Promise.all(
    hypotheses.map(h => h.execute())
  );

  // Find confirmed hypotheses
  const confirmed = results.filter(r => r.result === 'CONFIRMED');

  if (confirmed.length === 0) {
    console.log('\n❌ No hypotheses confirmed. Escalating...');
    escalateToSubagents(results);
  } else {
    console.log(`\n✅ ${confirmed.length} hypothesis(es) confirmed:`);
    confirmed.forEach(h => console.log(`   - ${h.name}`));
    return confirmed;
  }
}
```

---

## Real-World Examples

### Example 1: JWT Scope Bug (Post-Incident Analysis)

**What Actually Happened** (assumption-based):
```
Developer: "Supabase JWT contains everything we need"
  → Removed custom JWT creation
  → Deployed to production
  → All auth failed
  → 10 days to diagnose
```

**What Should Have Happened** (HTF-based):
```
┌──────────────────────────────────────────────────┐
│ HYPOTHESIS 1: Supabase JWT has 'scope' field     │
├──────────────────────────────────────────────────┤
│ TEST COMMAND:                                    │
│ TOKEN=$(curl -s POST /api/auth/login ... |       │
│   jq -r '.token')                                │
│ echo $TOKEN | cut -d'.' -f2 | base64 -d |        │
│   jq '.scope'                                    │
│                                                  │
│ EXPECTED: ["orders:create", "menu:read", ...]   │
│ ACTUAL: null                                     │
│                                                  │
│ CONCLUSION: ❌ REJECTED                          │
│ Supabase JWT does NOT include scope field        │
│                                                  │
│ DECISION: Must create custom JWT with scope      │
│                                                  │
│ TIME TO IDENTIFY: 2 minutes                      │
│ VS ACTUAL: 10 days                               │
│ TIME SAVED: 99.98%                               │
└──────────────────────────────────────────────────┘
```

### Example 2: Build Failure Investigation

```javascript
// Systematic hypothesis testing
const buildFailureHypotheses = [
  {
    name: 'Stale cache',
    test: 'ls -la node_modules/.cache | wc -l',
    expected: '>0',
    action: 'rm -rf node_modules/.cache && npm rebuild'
  },
  {
    name: 'Dependency version mismatch',
    test: 'npm ls | grep -i invalid',
    expected: 'Contains "invalid"',
    action: 'npm ci'
  },
  {
    name: 'TypeScript version incompatible',
    test: 'npx tsc --version && cat package.json | jq .devDependencies.typescript',
    expected: 'Versions differ',
    action: 'npm install typescript@latest'
  },
  {
    name: 'Recent code change broke types',
    test: 'git diff HEAD~1 --stat | grep "src/"',
    expected: 'Shows changed files',
    action: 'git diff HEAD~1 -- src/ | npx tsc --noEmit'
  }
];

async function systematicBuildDiagnosis() {
  console.log('🔍 SYSTEMATIC BUILD DIAGNOSIS');
  console.log('════════════════════════════════\n');

  for (const hypothesis of buildFailureHypotheses) {
    console.log(`📋 Hypothesis: ${hypothesis.name}`);

    const result = await exec(hypothesis.test);
    const confirmed = evaluateExpected(result, hypothesis.expected);

    if (confirmed) {
      console.log(`✅ CONFIRMED`);
      console.log(`🔧 Recommended action: ${hypothesis.action}`);

      // Execute fix
      const shouldFix = await askUser(`Execute: ${hypothesis.action}? (y/n)`);
      if (shouldFix) {
        await exec(hypothesis.action);
        console.log('✓ Fix applied. Retrying build...');

        const buildSuccess = await exec('npm run build');
        if (buildSuccess) {
          console.log('✅ BUILD SUCCESSFUL');
          return {
            hypothesis: hypothesis.name,
            action: hypothesis.action,
            timeToResolve: elapsed()
          };
        }
      }
    } else {
      console.log(`❌ REJECTED\n`);
    }
  }

  console.log('⚠️  No standard hypothesis confirmed.');
  console.log('🚀 Escalating to parallel investigation...');
  return escalate();
}
```

### Example 3: Production vs Development Disparity

```
┌──────────────────────────────────────────────────┐
│ ISSUE: Works in dev, fails in production         │
├──────────────────────────────────────────────────┤
│ HYPOTHESIS 1: Environment variable difference    │
│                                                  │
│ TEST COMMAND:                                    │
│ # In dev:                                        │
│ env | grep -E "NODE|PORT|DB" | sort > dev.env    │
│ # In prod:                                       │
│ ssh prod 'env | grep -E "NODE|PORT|DB" | sort'   │
│   > prod.env                                     │
│ diff dev.env prod.env                            │
│                                                  │
│ EXPECTED: Differences found                      │
│ ACTUAL: Only PORT differs (3000 vs 8080)         │
│                                                  │
│ CONCLUSION: ⚠️  PARTIAL                          │
│ Port difference unlikely to cause issue          │
│                                                  │
│ NEXT: Test hypothesis 2                          │
├──────────────────────────────────────────────────┤
│ HYPOTHESIS 2: Node version mismatch              │
│                                                  │
│ TEST COMMAND:                                    │
│ node --version  # dev                            │
│ ssh prod 'node --version'  # prod                │
│                                                  │
│ EXPECTED: Different versions                     │
│ ACTUAL:                                          │
│   Dev:  v20.10.0                                 │
│   Prod: v18.17.1                                 │
│                                                  │
│ CONCLUSION: ✅ CONFIRMED                         │
│ Major version difference found                   │
│                                                  │
│ ACTION: Update prod to Node 20                   │
├──────────────────────────────────────────────────┤
│ VERIFICATION:                                    │
│ docker run -it node:18.17.1 npm run build        │
│   → Reproduces prod error                        │
│ docker run -it node:20.10.0 npm run build        │
│   → Works correctly                              │
│                                                  │
│ ✅ ROOT CAUSE CONFIRMED                          │
└──────────────────────────────────────────────────┘
```

---

## HTF Integration with CLI

```bash
# Start hypothesis testing session
npx claudelessons htf start

# This launches interactive mode:

┌──────────────────────────────────────────────────┐
│ HYPOTHESIS TESTING FRAMEWORK                     │
│ Interactive Session                              │
└──────────────────────────────────────────────────┘

What is your issue?
> Build fails with "Cannot find module '@/components/Header'"

What do you think the cause is? (your hypothesis)
> The import path is using alias @ but TypeScript doesn't know about it

Great. Let's test that.

TEST COMMAND SUGGESTION:
cat tsconfig.json | jq '.compilerOptions.paths."@/*"'

Is this the right test? (y/n/edit): y

▸ Running test...

RESULT:
null

Expected result?
> Should show ["src/*"]

Actual vs Expected: DIFFERENT

✅ HYPOTHESIS CONFIRMED: @ alias not configured

Recommended fix:
Add to tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}

Apply fix? (y/n): y

▸ Applying fix...
✅ Fix applied

Retest build? (y/n): y

▸ Running: npm run build
✅ BUILD SUCCESSFUL

Session complete. Adding to knowledge base...
```

---

## HTF Templates by Issue Type

### Template: Module Resolution

```yaml
issue_type: module_not_found
hypotheses:
  - name: Module not installed
    test: npm ls {{module_name}}
    expected: "missing: {{module_name}}"
    action: npm install {{module_name}}

  - name: Import path wrong
    test: grep -r "import.*{{module_name}}" src/
    expected: "Shows incorrect path"
    action: "Fix import statement"

  - name: TypeScript alias misconfigured
    test: cat tsconfig.json | jq '.compilerOptions.paths'
    expected: "null or missing alias"
    action: "Add path mapping to tsconfig.json"

  - name: Module in wrong node_modules
    test: find . -name "{{module_name}}" | grep -v ".git"
    expected: "Found in unexpected location"
    action: "npm dedupe or npm install --force"
```

### Template: Type Errors

```yaml
issue_type: typescript_error
hypotheses:
  - name: Type definition missing
    test: npm ls @types/{{library_name}}
    expected: "not found"
    action: npm install -D @types/{{library_name}}

  - name: Type definition outdated
    test: |
      LOCAL=$(npm ls {{library}} | grep -o "@[0-9.]*")
      TYPES=$(npm ls @types/{{library}} | grep -o "@[0-9.]*")
      echo "$LOCAL vs $TYPES"
    expected: "Versions differ"
    action: npm update @types/{{library}}

  - name: Strict mode caught real bug
    test: git diff HEAD~1 -- "{{file_with_error}}"
    expected: "Recent change visible"
    action: "Revert or fix recent change"

  - name: Circular dependency
    test: npx madge --circular src/
    expected: "Shows circular reference"
    action: "Refactor to break cycle"
```

### Template: Runtime Errors

```yaml
issue_type: runtime_error
hypotheses:
  - name: Data shape changed
    test: |
      curl -s {{api_endpoint}} | jq 'keys | sort'
      # Compare with expected schema
    expected: "Missing expected fields"
    action: "Update API call or fix backend"

  - name: Environment variable missing
    test: env | grep {{VAR_NAME}}
    expected: "Empty output"
    action: "Add to .env"

  - name: Middleware order wrong
    test: grep -A5 "app.use" server/index.ts
    expected: "Auth middleware after route"
    action: "Reorder middleware"

  - name: Database schema outdated
    test: |
      psql -c "\d {{table_name}}"
      # Check for expected column
    expected: "Column missing"
    action: "Run migration"
```

---

## HTF Best Practices

### 1. Hypothesis Quality

**BAD Hypothesis** (too vague):
```
"Something is wrong with the database"
```

**GOOD Hypothesis** (specific, testable):
```
"The 'payment_method' column is missing from the orders table,
causing INSERT statements to fail"

TEST: psql -c "\d orders" | grep payment_method
EXPECTED: Empty output (column doesn't exist)
```

### 2. Test Design

**BAD Test** (requires interpretation):
```
TEST: Look at the logs
EXPECTED: Error message about database
```

**GOOD Test** (unambiguous result):
```
TEST: docker logs api-server 2>&1 | grep -c "ECONNREFUSED"
EXPECTED: > 0 (connection refused errors present)
```

### 3. Expected vs Actual

Always document BOTH:

```
EXPECTED: npm ls returns 0 exit code
ACTUAL:   npm ls returns 1 (has errors)

EXPECTED: JWT decoded.scope = ["orders:create"]
ACTUAL:   JWT decoded.scope = null

EXPECTED: Test suite passes (100%)
ACTUAL:   3 tests fail (97%)
```

### 4. Decision Logic

```javascript
function makeDecision(expected, actual) {
  if (actual === expected) {
    return {
      result: 'CONFIRMED',
      action: 'Apply documented fix',
      confidence: 'HIGH'
    };
  }

  if (closeEnough(actual, expected)) {
    return {
      result: 'PARTIAL',
      action: 'Investigate further',
      confidence: 'MEDIUM'
    };
  }

  return {
    result: 'REJECTED',
    action: 'Try next hypothesis',
    confidence: 'HIGH'
  };
}
```

---

## HTF Metrics

Track hypothesis testing effectiveness:

```json
{
  "htf_sessions": {
    "total": 67,
    "avg_hypotheses_tested": 2.3,
    "first_hypothesis_correct": 34,
    "accuracy_rate": "50.7%",
    "avg_time_to_correct_hypothesis": "8.5 minutes",
    "vs_assumption_based_debugging": "-92%",
    "escalations_prevented": 52
  }
}
```

---

## Integration with Diagnostic Decision Tree

HTF is used at every decision point in the DDT:

```
DDT Step: "Is this a clean environment?"
   ↓
HTF: Test cleanliness hypothesis
   → COMMAND: ls node_modules/.cache | wc -l
   → EXPECTED: 0 (clean)
   → ACTUAL: 145 (dirty)
   → DECISION: Run Clean Slate Protocol
```

---

## AI Agent Integration

When an AI agent encounters an issue:

```javascript
// Automatic HTF invocation
async function aiDebugWorkflow(error) {
  console.log('🤖 AI Agent: Encountered error');
  console.log('📋 Initiating HTF...');

  // 1. Generate hypotheses from error pattern
  const hypotheses = await generateHypotheses(error);

  // 2. Test each hypothesis
  const results = await Promise.all(
    hypotheses.map(h => testHypothesis(h))
  );

  // 3. Select confirmed hypotheses
  const confirmed = results.filter(r => r.confirmed);

  // 4. Apply fix or escalate
  if (confirmed.length === 1) {
    await applyFix(confirmed[0]);
  } else if (confirmed.length > 1) {
    await askUserToChoose(confirmed);
  } else {
    await escalateToSubagents(error, results);
  }
}
```

---

## Success Criteria

HTF is successful when:

1. ✅ Every hypothesis has a clear test command
2. ✅ Every test produces unambiguous output
3. ✅ Actual results are documented (not just "didn't work")
4. ✅ Decision logic is explicit and data-driven
5. ✅ No fixes applied without confirmed hypothesis

---

## Common Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Fix Before Test
```
Developer: "It's probably the cache, let me clear it"
  → rm -rf node_modules
  → npm install
  → "Hmm, still broken. Maybe it's TypeScript version?"
  → npm install typescript@latest
  → "Still broken..."

TIME WASTED: 30+ minutes
KNOWLEDGE GAINED: Zero
```

### ✅ Correct Pattern: Test Then Fix
```
Developer: "Let me test the cache hypothesis first"
  → ls -la node_modules/.cache
  → RESULT: No .cache directory (hypothesis REJECTED)
Developer: "OK, not the cache. Next hypothesis..."
  → npm ls | grep UNMET
  → RESULT: 3 unmet dependencies found (hypothesis CONFIRMED)
  → npm install (targeted fix)
  → ✅ Build succeeds

TIME SPENT: 5 minutes
KNOWLEDGE GAINED: Unmet dependencies cause this error
```

---

**Version**: 1.0
**Last Updated**: 2025-11-16
**Integration**: Claudelessons v2.0
**Status**: Ready for implementation
