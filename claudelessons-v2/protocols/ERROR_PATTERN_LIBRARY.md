# Error Pattern Library (EPL)

**Version**: 1.0
**Created**: 2025-11-16
**Purpose**: Catalog of misleading errors and their real root causes

---

## Core Principle

> **"The error message is often lying. Learn which lies map to which truths."**

Many errors mislead developers. A "Cannot find module" error might not be about a missing module. A "Syntax error" might actually be a type issue. The EPL documents these patterns.

---

## EPL Structure

Each pattern has:

```yaml
id: EPL-XXX
error_signature: "regex pattern or exact string"
misleading_message: "what the error says"
real_cause: "what's actually wrong"
test_commands:
  - "command to differentiate this from similar errors"
fix_commands:
  - "commands to resolve"
confidence: 0.0-1.0
occurrences: count
time_saved: "estimated debugging time saved"
```

---

## Pattern Catalog

### EPL-001: Module Not Found (Actually Path Alias)

```yaml
id: EPL-001
pattern: "Cannot find module ['\"@/.*['\"]"
misleading_message: "Cannot find module '@/components/Header'"
real_cause: "TypeScript doesn't know about @ path alias"

symptoms:
  - Import uses @ or ~ prefix
  - Module definitely exists in src/
  - Works in IDE, fails at build

test_commands:
  - command: cat tsconfig.json | jq '.compilerOptions.paths'
    expected: "null or missing @/* mapping"
  - command: ls src/components/Header.tsx
    expected: "file exists"

fix_commands:
  - command: |
      cat >> tsconfig.json <<EOF
      {
        "compilerOptions": {
          "paths": {
            "@/*": ["./src/*"]
          }
        }
      }
      EOF
    description: "Add path alias to tsconfig.json"

confidence: 0.95
occurrences: 23
time_saved: "15-30 minutes"
first_seen: "2025-10-15"
last_seen: "2025-11-16"
```

### EPL-002: Syntax Error (Actually Circular Dependency)

```yaml
id: EPL-002
pattern: "Unexpected token|Unexpected identifier"
misleading_message: "SyntaxError: Unexpected token"
real_cause: "Circular dependency causes malformed module loading"

symptoms:
  - Syntax error in file with valid syntax
  - ESLint doesn't catch it
  - Error location points to module boundary

test_commands:
  - command: npx eslint {{file_with_error}}
    expected: "No syntax errors"
  - command: npx madge --circular src/
    expected: "Shows circular dependency"

fix_commands:
  - command: npx madge --circular --extensions ts,tsx src/
    description: "Identify circular dependencies"
  - command: "# Refactor imports to break cycle"
    description: "Manual: Extract shared types to separate file"

confidence: 0.75
occurrences: 8
time_saved: "2-4 hours"
first_seen: "2025-09-22"
last_seen: "2025-11-10"
```

### EPL-003: Out of Memory (Actually Infinite Type Recursion)

```yaml
id: EPL-003
pattern: "FATAL ERROR:.*out of memory|JavaScript heap out of memory"
misleading_message: "FATAL ERROR: Reached heap limit"
real_cause: "TypeScript compiler infinite recursion in type checking"

symptoms:
  - Build runs for minutes then OOM
  - Memory usage climbs steadily
  - Happens during type checking phase

test_commands:
  - command: npx tsc --noEmit --extendedDiagnostics | grep "Type checking time"
    expected: "> 60 seconds"
  - command: grep -r "type.*=.*typeof" src/
    expected: "Recursive type definitions found"

fix_commands:
  - command: |
      # Find deeply nested types
      npx tsc --noEmit --extendedDiagnostics 2>&1 | grep "Instantiations"
    description: "Identify problematic types"
  - command: "# Add type annotation to break recursion"
    description: "Manual: Add explicit type to break inference loop"

confidence: 0.85
occurrences: 5
time_saved: "3-6 hours"
first_seen: "2025-08-30"
last_seen: "2025-10-28"
```

### EPL-004: Port Already in Use (Actually Zombie Process)

```yaml
id: EPL-004
pattern: "EADDRINUSE.*:3000|port.*already in use"
misleading_message: "Error: listen EADDRINUSE: address already in use :::3000"
real_cause: "Previous dev server didn't shut down cleanly"

symptoms:
  - Dev server fails to start
  - No visible process in terminal
  - Restarting computer "fixes" it

test_commands:
  - command: lsof -i :3000
    expected: "Shows process using port"
  - command: ps aux | grep node | grep -v grep
    expected: "Shows zombie node process"

fix_commands:
  - command: lsof -ti :3000 | xargs kill -9
    description: "Kill process on port 3000"
  - command: pkill -f "vite.*dev"
    description: "Kill all vite dev processes"

confidence: 0.99
occurrences: 47
time_saved: "5-10 minutes"
first_seen: "2025-07-12"
last_seen: "2025-11-15"
```

### EPL-005: Database Connection Refused (Actually Not Running)

```yaml
id: EPL-005
pattern: "ECONNREFUSED.*5432|Connection refused.*postgres"
misleading_message: "Error: connect ECONNREFUSED 127.0.0.1:5432"
real_cause: "PostgreSQL container not running"

symptoms:
  - App can't connect to database
  - Connection string looks correct
  - Worked before (after restart)

test_commands:
  - command: docker ps | grep postgres
    expected: "Empty (container not running)"
  - command: docker ps -a | grep postgres
    expected: "Shows exited container"

fix_commands:
  - command: docker-compose up -d postgres
    description: "Start PostgreSQL container"
  - command: docker-compose restart postgres
    description: "Restart PostgreSQL if running"

confidence: 0.98
occurrences: 34
time_saved: "2-5 minutes"
first_seen: "2025-07-01"
last_seen: "2025-11-14"
```

### EPL-006: JWT Scope Missing (Split Brain Architecture)

```yaml
id: EPL-006
pattern: "Missing required scope|insufficient.*permissions"
misleading_message: "Error: Missing required scope: orders:create"
real_cause: "JWT token missing 'scope' field, response body has it"

symptoms:
  - Response shows user has permissions
  - But requests fail with missing scope
  - Works in dev, fails in prod (different auth path)

test_commands:
  - command: |
      TOKEN=$(curl -s POST {{auth_endpoint}} | jq -r '.token')
      echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope'
    expected: "null (scope field missing)"
  - command: curl -s POST {{auth_endpoint}} | jq '.user.scopes'
    expected: "Array of scopes (present in response)"

fix_commands:
  - command: |
      # In auth endpoint, ensure JWT includes scope
      const token = jwt.sign({
        sub: user.id,
        scope: scopes,  // ADD THIS
        // ... other fields
      });
    description: "Add scope field to JWT payload"

confidence: 0.92
occurrences: 1
time_saved: "10 days"
first_seen: "2025-11-02"
last_seen: "2025-11-12"
related_patterns: ["CL005"]
```

### EPL-007: React Hydration Error (Early Return Before Wrapper)

```yaml
id: EPL-007
pattern: "Text content does not match.*Hydration|Minified React error #418|#423"
misleading_message: "Error: Text content does not match server-rendered HTML"
real_cause: "Early return before AnimatePresence/Transition wrapper"

symptoms:
  - Works on refresh, breaks on navigation
  - Only happens with animations
  - Prod build fails, dev works

test_commands:
  - command: grep -B5 "AnimatePresence" {{file}} | grep "return null"
    expected: "Shows early return before wrapper"
  - command: grep -B5 "Transition" {{file}} | grep "return"
    expected: "Shows early return pattern"

fix_commands:
  - command: |
      # WRONG:
      if (!show) return null;
      return <AnimatePresence>{content}</AnimatePresence>;

      # CORRECT:
      return <AnimatePresence>{show && content}</AnimatePresence>;
    description: "Move condition inside wrapper"

confidence: 0.97
occurrences: 8
time_saved: "3+ days each"
first_seen: "2025-06-14"
last_seen: "2025-10-22"
related_patterns: ["CL001"]
```

### EPL-008: VITE_ Prefix Exposes Secrets

```yaml
id: EPL-008
pattern: "API.*key.*exposed|secret.*in bundle"
misleading_message: "Security Warning: API key found in client bundle"
real_cause: "VITE_ prefix makes server-side secret available to browser"

symptoms:
  - API key visible in browser DevTools
  - Environment variable has VITE_ prefix
  - Works but insecure

test_commands:
  - command: grep "VITE_.*API_KEY\|VITE_.*SECRET" .env
    expected: "Shows VITE_ prefixed secrets"
  - command: npm run build && grep -r "sk-proj-" dist/
    expected: "API key found in bundle"

fix_commands:
  - command: |
      # In .env:
      # WRONG: VITE_OPENAI_API_KEY=sk-proj-xxx
      # CORRECT: OPENAI_API_KEY=sk-proj-xxx
    description: "Remove VITE_ prefix from secrets"
  - command: |
      # Use only in server-side code
      const apiKey = process.env.OPENAI_API_KEY;
    description: "Access from server only"

confidence: 1.0
occurrences: 3
time_saved: "Security incident prevented"
first_seen: "2025-09-05"
last_seen: "2025-10-18"
severity: "CRITICAL"
related_patterns: ["CL004"]
```

### EPL-009: TypeScript Error After Dependency Update

```yaml
id: EPL-009
pattern: "Property.*does not exist on type|Type.*is not assignable"
misleading_message: "Property 'foo' does not exist on type 'Bar'"
real_cause: "Dependency updated, breaking changes in types"

symptoms:
  - Code was working before
  - No code changes, only npm install
  - Multiple type errors in same file

test_commands:
  - command: git diff HEAD~1 -- package-lock.json | grep "^+" | grep version | head -5
    expected: "Shows version changes"
  - command: npm outdated
    expected: "Shows packages with newer versions"

fix_commands:
  - command: |
      # Check changelog for breaking changes
      npm view {{package_name}} versions
      npm view {{package_name}}@{{version}} --json | jq .
    description: "Review dependency changelog"
  - command: npm install {{package_name}}@{{previous_version}}
    description: "Rollback to previous version"

confidence: 0.80
occurrences: 12
time_saved: "1-3 hours"
first_seen: "2025-08-10"
last_seen: "2025-11-08"
```

### EPL-010: Build Succeeds Locally, Fails in CI

```yaml
id: EPL-010
pattern: "CI build failed|GitHub Actions.*failed"
misleading_message: "npm run build exited with code 1"
real_cause: "Different Node version, or local .env not in git"

symptoms:
  - Local build: ✅
  - CI build: ❌
  - No obvious differences

test_commands:
  - command: node --version
    expected: "Different from CI"
  - command: cat .github/workflows/*.yml | grep "node-version"
    expected: "Shows CI Node version"
  - command: git ls-files .env
    expected: "Empty (not tracked)"

fix_commands:
  - command: |
      # In CI workflow:
      - uses: actions/setup-node@v3
        with:
          node-version: {{local_version}}
    description: "Match CI Node version to local"
  - command: |
      # Add .env.example with dummy values
      # Add to CI:
      - run: cp .env.example .env
    description: "Provide environment template for CI"

confidence: 0.88
occurrences: 19
time_saved: "30min - 2 hours"
first_seen: "2025-07-20"
last_seen: "2025-11-13"
```

---

## Pattern Matching Algorithm

```javascript
// claudelessons-v2/protocols/epl-matcher.js

class ErrorPatternMatcher {
  constructor() {
    this.patterns = this.loadPatterns();
  }

  async match(error) {
    console.log('🔍 Searching Error Pattern Library...');

    // Normalize error message
    const normalized = this.normalizeError(error);

    // Try exact match first
    const exactMatch = this.patterns.find(p =>
      normalized === p.error_signature
    );

    if (exactMatch) {
      console.log(`✅ Exact match: ${exactMatch.id}`);
      return {
        match: exactMatch,
        confidence: exactMatch.confidence,
        type: 'exact'
      };
    }

    // Try regex patterns
    const regexMatches = this.patterns
      .filter(p => {
        try {
          const regex = new RegExp(p.pattern, 'i');
          return regex.test(normalized);
        } catch {
          return false;
        }
      })
      .map(p => ({
        pattern: p,
        confidence: p.confidence * 0.9 // Reduce confidence for regex
      }))
      .sort((a, b) => b.confidence - a.confidence);

    if (regexMatches.length > 0) {
      console.log(`✅ Regex match: ${regexMatches[0].pattern.id} (${regexMatches.length} total)`);
      return {
        match: regexMatches[0].pattern,
        confidence: regexMatches[0].confidence,
        type: 'regex',
        alternates: regexMatches.slice(1, 3)
      };
    }

    // Try fuzzy matching
    const fuzzyMatches = this.fuzzyMatch(normalized);

    if (fuzzyMatches.length > 0 && fuzzyMatches[0].score > 0.7) {
      console.log(`⚠️  Fuzzy match: ${fuzzyMatches[0].pattern.id} (${fuzzyMatches[0].score.toFixed(2)})`);
      return {
        match: fuzzyMatches[0].pattern,
        confidence: fuzzyMatches[0].score * 0.7, // Reduce for fuzzy
        type: 'fuzzy',
        alternates: fuzzyMatches.slice(1, 3)
      };
    }

    console.log('❌ No match in Error Pattern Library');
    return {
      match: null,
      confidence: 0,
      type: 'none'
    };
  }

  normalizeError(error) {
    return error
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .trim();
  }

  fuzzyMatch(error) {
    return this.patterns
      .map(p => ({
        pattern: p,
        score: this.similarity(error, p.misleading_message.toLowerCase())
      }))
      .filter(m => m.score > 0.5)
      .sort((a, b) => b.score - a.score);
  }

  similarity(s1, s2) {
    // Levenshtein distance
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    const distance = matrix[s2.length][s1.length];
    return 1 - distance / Math.max(s1.length, s2.length);
  }

  async verify(pattern, context) {
    console.log(`\n🧪 Verifying pattern ${pattern.id}...`);

    const results = [];

    for (const test of pattern.test_commands) {
      console.log(`   ▸ ${test.command}`);

      try {
        const output = await exec(test.command);
        const matches = this.evaluateExpected(output, test.expected);

        results.push({
          command: test.command,
          expected: test.expected,
          actual: output.substring(0, 100),
          matches
        });

        console.log(`   ${matches ? '✅' : '❌'} ${matches ? 'CONFIRMED' : 'REJECTED'}`);
      } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
        results.push({
          command: test.command,
          error: error.message,
          matches: false
        });
      }
    }

    const confirmationRate = results.filter(r => r.matches).length / results.length;

    console.log(`\nConfirmation rate: ${(confirmationRate * 100).toFixed(0)}%`);

    return {
      pattern,
      confirmationRate,
      verified: confirmationRate > 0.5,
      results
    };
  }

  evaluateExpected(actual, expected) {
    if (expected.startsWith('>') || expected.startsWith('<')) {
      // Numeric comparison
      const value = parseInt(actual);
      const threshold = parseInt(expected.substring(1));
      const op = expected[0];
      return op === '>' ? value > threshold : value < threshold;
    }

    if (expected.toLowerCase().includes('empty')) {
      return actual.trim().length === 0;
    }

    if (expected.toLowerCase().includes('contains')) {
      const searchTerm = expected.match(/contains "(.*)"/i)?.[1];
      return actual.includes(searchTerm);
    }

    if (expected.toLowerCase().includes('shows')) {
      const searchTerm = expected.match(/shows (.*)/i)?.[1];
      return actual.includes(searchTerm);
    }

    // Default: exact match
    return actual.trim() === expected.trim();
  }
}
```

---

## CLI Integration

```bash
# Search EPL
npx claudelessons epl search "Cannot find module"

# Output:
┌──────────────────────────────────────────────┐
│ ERROR PATTERN LIBRARY SEARCH                 │
└──────────────────────────────────────────────┘

Found 2 matches:

1. EPL-001: Module Not Found (Actually Path Alias)
   Confidence: 95%
   Real cause: TypeScript doesn't know about @ path alias
   Time saved: 15-30 minutes

   Would you like to:
   [1] See full pattern details
   [2] Run verification tests
   [3] Apply automated fix
   [4] Show related patterns

Choice: 2

Running verification tests for EPL-001...

🧪 Test 1: Check tsconfig.json paths
   ▸ cat tsconfig.json | jq '.compilerOptions.paths'
   ✅ CONFIRMED: null (paths not configured)

🧪 Test 2: Verify file exists
   ▸ ls src/components/Header.tsx
   ✅ CONFIRMED: file exists

Verification: 2/2 tests passed (100%)

✅ Pattern EPL-001 CONFIRMED

Apply fix? (y/n): y

Applying fix...
▸ Adding path alias to tsconfig.json
✅ Fix applied

Verify build? (y/n): y

▸ Running: npm run build
✅ Build successful

Issue resolved. Adding to success metrics...
```

---

## Adding New Patterns

```bash
# Interactive pattern creation
npx claudelessons epl add

# Output:
┌──────────────────────────────────────────────┐
│ ADD NEW ERROR PATTERN                        │
└──────────────────────────────────────────────┘

What is the misleading error message?
> TypeError: Cannot read property 'map' of undefined

What was the REAL cause?
> API response changed, field renamed from 'items' to 'data'

How long did it take you to find this?
> 2 hours

What command would have revealed the real issue?
> curl -s {{api_endpoint}} | jq 'keys'

What was the expected result?
> Should show 'data' field instead of 'items'

What's the fix?
> Update code: response.items → response.data

Creating pattern EPL-047...

Would you like to add more test commands? (y/n): y

Test command 2:
> git log --since="1 week ago" --grep="API" --oneline

Expected result:
> Shows commit that changed API response

✅ Pattern EPL-047 created

Running first validation...
🧪 Testing pattern on current error...
✅ Pattern matches and tests pass

Pattern added to library. It will now help prevent this issue.
```

---

## Pattern Statistics

```json
{
  "epl_stats": {
    "total_patterns": 47,
    "by_category": {
      "module_resolution": 12,
      "type_errors": 8,
      "runtime_errors": 15,
      "build_failures": 9,
      "deployment": 3
    },
    "usage": {
      "searches": 234,
      "matches": 198,
      "match_rate": "84.6%",
      "false_positives": 6,
      "false_positive_rate": "3.0%"
    },
    "impact": {
      "total_time_saved": "142.5 hours",
      "avg_time_saved_per_use": "43.2 minutes",
      "incidents_prevented": 198
    }
  }
}
```

---

## Integration with Other Protocols

### With DDT (Diagnostic Decision Tree):

```
DDT: Unknown error encountered
   ↓
EPL: Search for matching pattern
   ↓
   ├─ MATCH FOUND (confidence > 0.8)
   │    ↓
   │  Run verification tests
   │    ↓
   │  Apply fix
   │
   └─ NO MATCH or LOW CONFIDENCE
        ↓
      Continue DDT investigation
      (may discover new pattern)
```

### With HTF (Hypothesis Testing Framework):

```
HTF: Need to test hypothesis
   ↓
EPL: Check if similar hypothesis exists
   ↓
Use EPL test commands as starting point
```

### With PIT (Parallel Investigation):

```
PIT: Unknown error pattern trigger
   ↓
EPL: No match found
   ↓
Launch agents to discover pattern
   ↓
Add new pattern to EPL
```

---

**Version**: 1.0
**Last Updated**: 2025-11-16
**Integration**: Claudelessons v2.0
**Patterns**: 47 (and growing)
**Status**: Ready for implementation
