# Lessons: Debugging Protocols

## Overview

This file contains **systematic debugging methodologies** extracted from 70+ days of production incidents. These protocols work alongside the domain-specific lessons in other categories.

**When to use this**: Unknown errors, vague symptoms, or when standard fixes don't work.

---

## Protocol 1: Hypothesis Testing Framework (HTF)

### Core Principle

> **"Never fix what you haven't proven broken. Never change what you don't understand."**

Every debugging action must follow this structure:

```
HYPOTHESIS: [Specific, testable claim]
TEST COMMAND: [Unambiguous verification]
EXPECTED RESULT: [Concrete prediction]
ACTUAL RESULT: [Observed outcome]
CONCLUSION: ✅ CONFIRMED / ❌ REJECTED
```

### Real-World Example: JWT Scope Bug

**What happened** (assumption-based, 10 days lost):
```
Developer: "The auth endpoint returns scopes in the response body, so RBAC should work"
→ Deployed to production
→ All role-based operations failed
→ 10 days to diagnose
```

**What SHOULD have happened** (HTF-based, 2 minutes):
```
┌──────────────────────────────────────────────────┐
│ HYPOTHESIS: JWT token contains 'scope' field     │
├──────────────────────────────────────────────────┤
│ TEST COMMAND:                                    │
│ TOKEN=$(curl -s POST /api/auth/login ... | \    │
│   jq -r '.session.access_token')                │
│ echo $TOKEN | cut -d'.' -f2 | base64 -d | jq   │
│                                                  │
│ EXPECTED: {"scope": ["orders:create", ...]}     │
│ ACTUAL: {"scope": null}                         │
│                                                  │
│ CONCLUSION: ❌ REJECTED                          │
│ JWT missing scope field - must add before sign()│
│                                                  │
│ TIME TO IDENTIFY: 2 minutes                      │
│ VS ACTUAL: 10 days                               │
│ TIME SAVED: 99.98%                               │
└──────────────────────────────────────────────────┘
```

### HTF Templates by Issue Type

#### Module Resolution Issues
```yaml
hypotheses:
  - name: Module not installed
    test: npm ls {{module_name}}
    expected: "missing: {{module_name}}"

  - name: Import path incorrect
    test: grep -r "from.*{{module_name}}" src/
    expected: "Shows incorrect path"

  - name: TypeScript alias misconfigured
    test: cat tsconfig.json | jq '.compilerOptions.paths'
    expected: "null or missing alias"
```

#### Type Errors
```yaml
hypotheses:
  - name: Type definition missing
    test: npm ls @types/{{library}}
    expected: "not found"

  - name: Recent code change broke types
    test: git diff HEAD~1 -- "{{file_with_error}}"
    expected: "Recent change visible"

  - name: Circular dependency
    test: npx madge --circular src/
    expected: "Shows circular reference"
```

#### Runtime Errors
```yaml
hypotheses:
  - name: Data shape changed
    test: curl -s {{api_endpoint}} | jq 'keys | sort'
    expected: "Missing expected fields"

  - name: Environment variable missing
    test: env | grep {{VAR_NAME}}
    expected: "Empty output"

  - name: Database schema outdated
    test: psql -c "\d {{table_name}}"
    expected: "Column missing"
```

### HTF Best Practices

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

### Anti-Pattern: Fix Before Test

```
❌ WRONG:
Developer: "It's probably the cache"
→ rm -rf node_modules
→ npm install
→ "Still broken. Maybe TypeScript version?"
→ npm install typescript@latest
→ "Still broken..."
TIME WASTED: 30+ minutes, KNOWLEDGE GAINED: Zero

✅ CORRECT:
Developer: "Let me test the cache hypothesis"
→ ls -la node_modules/.cache
→ RESULT: No .cache directory (hypothesis REJECTED)
→ Next hypothesis: npm ls | grep UNMET
→ RESULT: 3 unmet dependencies found (hypothesis CONFIRMED)
→ npm install (targeted fix)
→ ✅ Build succeeds
TIME SPENT: 5 minutes, KNOWLEDGE GAINED: Documented
```

---

## Protocol 2: Error Pattern Library (EPL)

### Core Principle

> **"The error message is often lying. Learn which lies map to which truths."**

### Pattern Structure

```yaml
id: EPL-XXX
misleading_message: "what the error says"
real_cause: "what's actually wrong"
test_commands:
  - command: "verification command"
    expected: "what confirms this pattern"
fix_commands:
  - "commands to resolve"
confidence: 0.0-1.0
time_saved: "estimated debugging time saved"
```

### Key Patterns from Production

#### EPL-001: "Cannot find module @/..." (Actually Path Alias)

```yaml
misleading_message: "Cannot find module '@/components/Header'"
real_cause: "TypeScript doesn't know about @ path alias"

symptoms:
  - Import uses @ or ~ prefix
  - Module exists in src/
  - Works in IDE, fails at build

test_commands:
  - cat tsconfig.json | jq '.compilerOptions.paths'
  - ls src/components/Header.tsx

fix:
  Add to tsconfig.json:
  {
    "compilerOptions": {
      "paths": { "@/*": ["./src/*"] }
    }
  }

confidence: 0.95
time_saved: "15-30 minutes"
```

#### EPL-002: "Syntax Error" (Actually Circular Dependency)

```yaml
misleading_message: "SyntaxError: Unexpected token"
real_cause: "Circular dependency causes malformed module loading"

symptoms:
  - Syntax error in file with valid syntax
  - ESLint doesn't catch it
  - Error location points to module boundary

test_commands:
  - npx eslint {{file_with_error}}  # Expect: No errors
  - npx madge --circular src/       # Expect: Shows cycle

fix:
  - Identify cycle with madge
  - Extract shared types to separate file
  - Break import dependency

confidence: 0.75
time_saved: "2-4 hours"
```

#### EPL-003: "Out of Memory" (Actually Infinite Type Recursion)

```yaml
misleading_message: "FATAL ERROR: Reached heap limit"
real_cause: "TypeScript compiler infinite recursion in type checking"

symptoms:
  - Build runs for minutes then OOM
  - Memory usage climbs steadily
  - Happens during type checking phase

test_commands:
  - npx tsc --noEmit --extendedDiagnostics | grep "Type checking time"
  - grep -r "type.*=.*typeof" src/

fix:
  - Find deeply nested types with --extendedDiagnostics
  - Add explicit type annotation to break inference loop

confidence: 0.85
time_saved: "3-6 hours"
```

#### EPL-007: "401 Unauthorized Loop" (Supabase Direct Auth + STRICT_AUTH)

```yaml
misleading_message: "Error: 401 Unauthorized / No token provided"
real_cause: "Frontend using Supabase direct auth (JWT missing restaurant_id),
             backend STRICT_AUTH=true requires it"

symptoms:
  - Login succeeds but immediate 401 on next request
  - "Authentication Required" modal loops forever
  - Works locally (STRICT_AUTH=false), fails production (STRICT_AUTH=true)
  - Credentials correct, token exists but backend rejects it

test_commands:
  - echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.restaurant_id'
  - grep "STRICT_AUTH" server/.env

fix:
  Replace Supabase direct auth with custom endpoint:

  // BEFORE (BROKEN)
  await supabase.auth.signInWithPassword({ email, password });

  // AFTER (FIXED)
  await httpClient.post('/api/v1/auth/login', {
    email,
    password,
    restaurantId: '11111111-1111-1111-1111-111111111111'
  });

confidence: 0.98
time_saved: "48 days (CL-AUTH-001)"
domain_lesson: "../01-auth-authorization-issues/LESSONS.md#cl-auth-001-strict_auth-environment-drift-48-days"
```

**🔗 After fixing**: See [Auth Lessons - CL-AUTH-001](../01-auth-authorization-issues/LESSONS.md#cl-auth-001-strict_auth-environment-drift-48-days) for complete incident details and prevention rules.

### How to Use EPL

When encountering an error:

1. **Search the pattern**: Check if error message matches known pattern
2. **Run test commands**: Verify this is the actual cause
3. **Apply fix**: Use documented solution
4. **Add new patterns**: Document if this is a new misleading error

---

## Protocol 3: Clean Slate Protocol (CSP)

### Core Principle

> **"When in doubt, start from a known-good state. But verify the slate is actually clean."**

### The 4 Levels (Graduated Escalation)

#### Level 0: Cache Clear (30 seconds)

**When**: Build worked before, minor changes since

```bash
# Clear build artifacts and caches
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/

# Rebuild
npm run build
```

**Verification**:
```bash
ls -la dist/ 2>/dev/null && echo "❌ dist/ exists" || echo "✓ Removed"
ls -la node_modules/.vite/ 2>/dev/null && echo "❌ .vite/ exists" || echo "✓ Removed"
```

#### Level 1: Dependency Reinstall (2-5 minutes)

**When**: Level 0 failed, or dependency changes suspected

```bash
# Remove and reinstall dependencies
rm -rf node_modules/
npm ci --prefer-offline

# Verify no unmet dependencies
npm ls --depth=0 | grep -i "UNMET"

# Rebuild
npm run build
```

**Verification**:
```bash
# Check install is fresh
stat -f %Sm node_modules/  # Shows install timestamp

# Verify lock file sync
npm ls --depth=0 2>&1 | grep -q "invalid" && \
  echo "❌ Lock file out of sync" || \
  echo "✓ Lock file valid"
```

#### Level 2: Global State Reset (5-10 minutes)

**When**: Level 1 failed, or global configuration suspected

```bash
# Clear global npm cache
npm cache clean --force

# Clear TypeScript cache
rm -rf ~/.ts-node/
rm -rf /tmp/ts-*

# Clear docker build cache (if using)
docker builder prune -f --filter "until=24h"

# Reinstall with frozen lockfile
npm ci --prefer-offline --frozen-lockfile

# Rebuild
npm run build
```

**Verification**:
```bash
npm cache verify
docker system df
lsof -i :3000 || echo "✓ Port 3000 free"
```

#### Level 3: Nuclear Option (10-20 minutes)

**When**: All else failed, starting completely fresh

```bash
# ⚠️  WARNING: This removes EVERYTHING

# 1. Stop all services
docker-compose down -v
pkill -f "node"

# 2. Remove all generated files
rm -rf node_modules/
rm -rf dist/
rm -rf .vite/
rm -rf .cache/
rm -rf coverage/
rm -rf *.log

# 3. Regenerate package lock
rm -f package-lock.json
npm install --package-lock-only

# 4. Fresh install
npm ci

# 5. Reset database (if applicable)
docker-compose up -d postgres
npm run db:migrate

# 6. Rebuild and test
npm run build
npm test -- --run
```

**If this fails**: Issue is NOT environment-related, investigate code/configuration.

### CSP Decision Logic

```
Error encountered
   ↓
Calculate suspicion score based on:
  - Recent npm install? (age of node_modules)
  - package.json changed without lock file update?
  - Last successful build age?
  - Error message mentions "cache" or "ENOENT"?
  - node_modules size unexpected?
   ↓
Score < 0.3 → CSP Level 0 (cache clear)
Score 0.3-0.6 → CSP Level 1 (reinstall)
Score 0.6-0.8 → CSP Level 2 (global reset)
Score > 0.8 → CSP Level 3 (nuclear)
```

### Pre-CSP Checklist

Before running CSP, verify you've tried non-destructive debugging:

- [ ] Read error message carefully
- [ ] Searched Error Pattern Library (EPL)
- [ ] Checked recent git commits
- [ ] Verified file exists
- [ ] Checked import paths
- [ ] Ran TypeScript compiler directly
- [ ] Checked for typos

If all above fail, CSP is appropriate.

---

## Protocol 4: Diagnostic Decision Tree (DDT)

### Core Principle

> **"Binary decision points with specific commands. Test, don't assume. Time-box every step."**

### Build Failure Decision Tree

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
│      npm ls --depth=0 | grep UNMET      │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
      CLEAN               NOT CLEAN
        │                     │
        ▼                     ▼
   STEP 2              CSP Level 1
                      (see Protocol 3)
                           ↓
                      Build succeeds? → RESOLVED
                           ↓
                       No → STEP 2
```

### Type Error Decision Tree

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
    < 5 ERRORS          > 5 ERRORS
        │                     │
        ▼                     ▼
  Targeted fix        Systematic error
  (recent change)     (config change)
        │                     │
    git log              git diff HEAD~1
    --since=1h            tsconfig.json
```

### Production Error Decision Tree

```
┌─────────────────────────────────────────┐
│ ERROR IN PRODUCTION                     │
│ Time Budget: 60 minutes                 │
└─────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ STEP 1: Can you reproduce locally?      │
│ Time: 15 minutes                        │
│                                         │
│ HYPOTHESIS: Same input → same error     │
│                                         │
│ TEST: curl localhost:3000/api/endpoint  │
│       -d '${PRODUCTION_REQUEST_BODY}'   │
└─────────────────────────────────────────┘
                   ▼
        ┌──────────┴──────────┐
        │                     │
    CAN REPRO           CANNOT REPRO
        │                     │
        ▼                     ▼
  Add logging         Environment-specific
  Inspect values      (compare Node version,
  Check types         dependencies, env vars,
                      database schema)
```

### Time Budget Enforcement

**Critical Rule**: Every diagnostic step has a time limit. If exceeded by 50%, ESCALATE.

```
STEP 1: 15 minutes budgeted
Time elapsed: 23 minutes (153%)
→ TRIGGER: Escalate to parallel investigation
```

---

## Protocol 5: Parallel Investigation Triggers (PIT)

### Core Principle

> **"When uncertainty is high, investigate in parallel. Don't waste time on serial guessing."**

### Automatic Trigger Conditions

Launch multiple investigation threads when:

#### 1. Multiple Equally-Likely Hypotheses (MEH)
```
CONDITION: 3+ hypotheses with >20% confidence each
TRIGGER: Launch N agents (one per hypothesis)
MAX: 5 parallel agents

EXAMPLE:
Build fails with vague error:
- Hypothesis 1 (30%): Dependency issue
- Hypothesis 2 (25%): TypeScript config
- Hypothesis 3 (25%): Recent code change
- Hypothesis 4 (20%): Environment variable

ACTION: Launch 4 parallel investigations
```

#### 2. Time Budget Exceeded (TBE)
```
CONDITION: Diagnostic step exceeds 150% of time budget
TRIGGER: Launch 3 standard investigation paths
TIMEOUT: Remaining time / 3

EXAMPLE:
Step budget: 15 minutes
Time elapsed: 23 minutes (153%)
→ Launch 3 agents with 2.3 minutes each
```

#### 3. Environmental Disparity Detected (EDD)
```
CONDITION: Works in environment A, fails in environment B
TRIGGER: Launch comparison agents

AGENTS:
1. Compare dependencies (package versions)
2. Compare environment variables
3. Compare runtime configurations
```

#### 4. Circular Investigation Detected (CID)
```
CONDITION: Testing same hypothesis twice
TRIGGER: Meta-analysis

EXAMPLE:
Diagnostic log shows:
- 10:30 - Test: Check if module installed
- 10:35 - Test: Check import path
- 10:40 - Test: Check if module installed (DUPLICATE!)

→ Launch investigation path analyzer
→ Generate novel hypotheses
```

#### 5. Unknown Error Pattern (UEP)
```
CONDITION: Error not in Error Pattern Library
TRIGGER: Research agents

AGENTS:
1. Search error message patterns
2. Check recent commits
3. Analyze dependency changes
4. Review similar issues
```

### Parallel Investigation Flow

```
Unknown error encountered
   ↓
Evaluate trigger conditions
   ↓
   ├─ MEH? → Launch per-hypothesis agents
   ├─ TBE? → Launch standard 3-path investigation
   ├─ EDD? → Launch environment comparison
   ├─ CID? → Launch meta-analysis
   └─ UEP? → Launch research agents
   ↓
All agents run in parallel (time-boxed)
   ↓
Synthesize findings by confidence:
   - High confidence (>0.7) → Apply fix
   - Medium (0.4-0.7) → Manual verification
   - Low (<0.4) → Further investigation
   ↓
Decision:
   - Clear finding → Fix and verify
   - No clear finding → Escalate to human
```

---

## Integration with Domain-Specific Lessons

These protocols work **alongside** the incident-based lessons in other categories:

### When to Use What

| Scenario | Use Protocol | Then Check Domain Lessons |
|----------|-------------|---------------------------|
| Unknown error, no idea where to start | DDT → HTF → EPL | Relevant category (auth, build, etc.) |
| Error matches known pattern | EPL first | Skip to domain lesson |
| "Works on my machine" | CSP Level 1-2 | Check deployment lessons |
| Vague symptoms, multiple theories | HTF + PIT | All potentially relevant categories |
| Time pressure, need systematic approach | DDT (time-boxed) | Quick reference sections |

### Example Integration: Authentication Issue

```
1. START: "Login returns 401 Unauthorized"

2. CHECK EPL: Is this a known misleading error?
   → Found: EPL-007 (Supabase direct auth + STRICT_AUTH)

3. RUN TEST COMMANDS from EPL:
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.restaurant_id'
   → Result: null (confirms EPL-007)

4. GO TO DOMAIN LESSON:
   claude-lessons3/01-auth-authorization-issues/LESSONS.md
   → Section: "CL-AUTH-001: STRICT_AUTH Environment Drift"

5. APPLY FIX from domain lesson:
   Replace supabase.auth.signInWithPassword()
   with httpClient.post('/api/v1/auth/login', ...)

6. VERIFY: Login successful

Total time: 5 minutes (vs 48 days without EPL)
```

---

## Quick Reference

### Protocol Selection Matrix

| Symptom | Protocol | Time Investment |
|---------|----------|----------------|
| "I have a theory about what's wrong" | HTF | 5-10 min |
| "Error message doesn't make sense" | EPL | 2-5 min |
| "Build was working, now it's not" | CSP | 0.5-20 min |
| "No idea where to start" | DDT | 15-30 min |
| "Multiple possible causes" | PIT | 20-40 min |
| "Tried everything, still broken" | CSP Level 3 → PIT | 30-60 min |

### Emergency Decision Flow

```
1. Read error message → Check EPL (2 min)
   Found? → Apply fix
   Not found? ↓

2. Have clear hypothesis? → Run HTF (5 min)
   Confirmed? → Apply fix
   Rejected? ↓

3. Environment suspected? → Run CSP (5-20 min)
   Fixed? → Document in EPL
   Not fixed? ↓

4. Complex/unknown issue? → Use DDT + PIT (30-60 min)
   Resolved? → Document in EPL + domain lesson
   Still stuck? → Escalate to human with full diagnostic log
```

---

## Success Metrics

Track protocol effectiveness:

- **HTF accuracy rate**: % of first hypotheses confirmed
- **EPL hit rate**: % of errors found in library
- **CSP resolution rate**: Which level typically resolves issues
- **DDT time savings**: Actual time vs traditional debugging
- **PIT success rate**: % of parallel investigations that find root cause

**Target**: 80% of issues resolved in <30 minutes using these protocols.

---

## Adding New Patterns

When you discover a new misleading error or effective technique:

1. **Document the incident** in relevant domain lesson
2. **Extract the pattern** into EPL if error message was misleading
3. **Update HTF templates** if new hypothesis type discovered
4. **Add to DDT** if new decision branch identified
5. **Update this file** with lessons learned

---

## References

- **Source**: Extracted from claudelessons-v2 (70+ days of production incidents)
- **Related ADRs**: ADR-001 (snake_case), ADR-006 (dual auth), ADR-010 (JWT standards)
- **Domain Lessons**: See category-specific LESSONS.md files (01-10)

---

**Last Updated**: 2025-11-19
**Incident Count**: 70+ days across 5 major categories
**Time Saved**: Estimated 95% reduction in debugging time vs ad-hoc approaches
