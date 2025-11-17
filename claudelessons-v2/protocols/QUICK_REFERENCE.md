# Diagnostic Protocol System - Quick Reference

**One-page cheat sheet for incident response**

---

## When You Hit An Error

### 1. Check EPL First (1-2 min)
```bash
npx claudelessons epl search "your error message"
```

**If match found (confidence >80%):**
- Run verification tests
- Apply fix
- Done ✅

**If no match:**
- Continue to step 2

---

### 2. Run Diagnostic Session (5-30 min)
```bash
npx claudelessons diagnose
```

This will:
1. Search EPL automatically
2. Launch appropriate decision tree
3. Use HTF at each step
4. Trigger PIT if stuck
5. Suggest CSP if environment issue

---

### 3. Manual Investigation (if needed)

Follow this order:

#### A. Check Environment (CSP)
```bash
npx claudelessons csp check
```

If suspicion score > 0.6:
```bash
npx claudelessons csp auto
```

#### B. Systematic Debugging (DDT + HTF)

For each hypothesis:
1. **State hypothesis clearly**
   ```
   "The module is not installed"
   ```

2. **Design test command**
   ```bash
   npm ls module-name
   ```

3. **Predict expected result**
   ```
   Expected: "not found"
   ```

4. **Run test and compare**
   ```bash
   npm ls module-name
   # Actual: module-name@1.0.0
   ```

5. **Make decision**
   ```
   Expected ≠ Actual
   → Hypothesis REJECTED
   → Try next hypothesis
   ```

#### C. If Multiple Hypotheses (PIT)
```bash
npx claudelessons pit --error="error message"
```

This launches 3-5 parallel investigation agents.

---

## Quick Commands

### EPL Operations
```bash
# Search patterns
npx claudelessons epl search "error text"

# Add new pattern
npx claudelessons epl add

# List all patterns
npx claudelessons epl list
```

### CSP Operations
```bash
# Check if needed
npx claudelessons csp check

# Auto-select level
npx claudelessons csp auto

# Run specific level
npx claudelessons csp run --level=1
```

### HTF Operations
```bash
# Start hypothesis testing session
npx claudelessons htf start

# Test specific hypothesis
npx claudelessons htf test "hypothesis text"
```

### PIT Operations
```bash
# Auto-trigger (when uncertainty high)
npx claudelessons pit auto

# Manual launch
npx claudelessons pit --agents=3 --time-limit=10
```

---

## Decision Tree Quick Guide

### Build Failures

```
1. Environment clean?
   → ls -la node_modules/.cache
   → If exists: CSP Level 0

2. Error message clear?
   → grep -i "error" build.log
   → If vague: Search EPL

3. Error category?
   → Module not found: Check paths
   → TypeScript error: Check types
   → Syntax error: Often misleading
```

### Deployment Failures

```
1. Build or runtime failure?
   → docker build -t test .
   → If build fails: Use build tree

2. Environment variables?
   → env | grep -E "NODE|PORT|DB"
   → diff local.env prod.env

3. Local reproduction?
   → Copy prod env
   → Run locally
   → Compare behavior
```

### Type Errors

```
1. Can reproduce locally?
   → Same input in dev
   → If can't: Environment specific

2. Recent dependency update?
   → git diff HEAD~1 package-lock.json
   → Check changelogs

3. Type source?
   → Request body
   → Database query
   → External API
   → Transform function
```

---

## Time Budget Guidelines

| Task | Time Limit | Action if Exceeded |
|------|------------|--------------------|
| EPL search | 2 min | Continue to DDT |
| EPL verification | 3 min | Continue to DDT |
| DDT step | 5 min | Escalate to PIT |
| HTF hypothesis | 3 min | Try next hypothesis |
| CSP Level 0 | 1 min | Try Level 1 |
| CSP Level 1 | 5 min | Try Level 2 |
| CSP Level 2 | 10 min | Try Level 3 |
| PIT agents | 10 min each | Synthesize findings |
| Total session | 30 min | Escalate to human |

---

## Common Patterns (EPL Quick Ref)

### EPL-001: Module Not Found → Path Alias
```bash
# Error: Cannot find module '@/...'
# Real cause: Missing path alias in tsconfig.json
# Fix: Add "@/*": ["./src/*"] to compilerOptions.paths
```

### EPL-002: Syntax Error → Circular Dependency
```bash
# Error: Unexpected token
# Real cause: Circular import
# Test: npx madge --circular src/
```

### EPL-004: Port In Use → Zombie Process
```bash
# Error: EADDRINUSE :::3000
# Real cause: Previous dev server still running
# Fix: lsof -ti :3000 | xargs kill -9
```

### EPL-005: DB Connection Refused → Not Running
```bash
# Error: ECONNREFUSED 127.0.0.1:5432
# Real cause: PostgreSQL container stopped
# Fix: docker-compose up -d postgres
```

### EPL-006: JWT Scope Missing → Split Brain
```bash
# Error: Missing required scope
# Real cause: JWT payload missing 'scope' field
# Test: echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.scope'
```

### EPL-007: React Hydration → Early Return
```bash
# Error: Text content mismatch #418
# Real cause: return null before AnimatePresence
# Fix: Move condition inside wrapper
```

### EPL-008: API Key Exposed → VITE_ Prefix
```bash
# Error: Secret in client bundle
# Real cause: VITE_ prefix exposes to browser
# Fix: Remove VITE_ prefix, use server-side only
```

---

## HTF Template

```
┌──────────────────────────────────────────┐
│ HYPOTHESIS:                              │
│ [Clear, specific, testable statement]   │
│                                          │
│ TEST COMMAND:                            │
│ [Command that produces unambiguous       │
│  output]                                 │
│                                          │
│ EXPECTED RESULT:                         │
│ [What you predict BEFORE running test]  │
│                                          │
│ ACTUAL RESULT:                           │
│ [What actually happened]                 │
│                                          │
│ CONCLUSION:                              │
│ ✅ CONFIRMED - Apply fix                │
│ ❌ REJECTED  - Next hypothesis           │
│ ⚠️  PARTIAL  - Investigate further      │
└──────────────────────────────────────────┘
```

---

## CSP Level Selection

```
Suspicion Score =
  + 0.3 if cache exists
  + 0.2 if npm install > 24h ago
  + 0.3 if package.json changed but not lock file
  + 0.2 if node_modules size unexpected

Score 0.0-0.3  → Level 0 (cache clear, 30s)
Score 0.3-0.6  → Level 1 (reinstall, 3min)
Score 0.6-0.8  → Level 2 (global reset, 8min)
Score 0.8-1.0  → Level 3 (nuclear, 20min)
```

---

## PIT Triggers

Launch parallel agents when:

- ❌ Multiple hypotheses (≥3) with similar confidence
- ⏱️ Time budget exceeded by 50%
- 🔄 Testing same hypothesis twice
- 🌍 Dev works, prod fails
- ❓ Error not in EPL

---

## Escalation Checklist

Before escalating to human, ensure you've:

- [ ] Searched EPL
- [ ] Followed DDT for error type
- [ ] Used HTF for each hypothesis
- [ ] Checked environment with CSP
- [ ] Launched PIT if uncertain
- [ ] Documented all findings
- [ ] Captured error logs
- [ ] Listed remaining hypotheses

---

## Success Metrics

Track these for each session:

```json
{
  "issue": "Brief description",
  "start_time": "ISO timestamp",
  "components_used": ["EPL", "DDT", "HTF", "CSP", "PIT"],
  "resolution_time_minutes": 5.7,
  "pattern_matched": "EPL-001",
  "confidence": 0.95,
  "outcome": "resolved"
}
```

---

## Anti-Patterns to Avoid

### ❌ DON'T:
- Fix before testing hypothesis
- Assume without verifying
- Skip documenting expected result
- Try random solutions
- Clear environment first
- Run multiple fixes simultaneously

### ✅ DO:
- State hypothesis explicitly
- Test before changing
- Document expected vs actual
- Follow systematic process
- Check EPL first
- Apply one fix at a time

---

## Integration with Git Workflow

### Pre-commit
```bash
# Automatically run EPL check
npx claudelessons epl check --staged
```

### Pre-push
```bash
# Verify no known issues
npx claudelessons check --comprehensive
```

### CI/CD
```yaml
- name: Claudelessons Check
  run: npx claudelessons diagnose --ci-mode
```

---

## Key Principles

1. **EPL First**: Check known patterns before investigating
2. **Test Before Fix**: Use HTF to verify hypothesis
3. **Time-Boxed**: Respect budget, escalate if exceeded
4. **Parallel When Uncertain**: Use PIT for efficiency
5. **Clean Slate Wisely**: Don't assume environment without evidence
6. **Document Everything**: Expected vs actual, always
7. **Learn From Each**: Add new patterns to EPL

---

## Emergency Quick-Fix

If you need immediate resolution:

```bash
# Nuclear option (20 min, but high success rate)
git stash  # Save work
npx claudelessons csp run --level=3
npm test
```

Only use when:
- Production down
- No time for investigation
- All else failed

After resolution, still:
- Document what was wrong
- Add to EPL
- Update metrics

---

## Help Commands

```bash
# Show help
npx claudelessons --help

# Show EPL patterns
npx claudelessons epl list

# Show recent incidents
npx claudelessons incidents

# Show success metrics
npx claudelessons stats

# Interactive tutorial
npx claudelessons tutorial
```

---

## Contact / Escalation

When escalating:
1. Gather all diagnostic output
2. Include time spent per component
3. List all hypotheses tested
4. Provide error logs
5. Note any security concerns

Format:
```
Issue: [one-line description]
Time spent: [X minutes]
Components: EPL → DDT → CSP → PIT
EPL results: [matches found]
DDT path: [steps taken]
CSP level: [if run]
PIT findings: [if launched]
Remaining hypotheses: [list]
Logs: [attached]
```

---

**Print this page and keep it visible during debugging sessions**

**Remember: 80% of issues resolve in < 5 minutes with systematic approach**
