# Testing Guides & Documentation

Complete testing documentation for rebuild-6.0, with emphasis on preventing test isolation issues.

---

## Quick Links

**I just want to fix my failing test:**
→ Start with [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) (2-minute read)

**I want to understand the problem:**
→ Read [test-isolation-prevention.md](./test-isolation-prevention.md) (15-minute read)

**I need copy-paste code patterns:**
→ Use [state-isolation-patterns.md](./state-isolation-patterns.md) (reference guide)

**I'm reviewing test code:**
→ Check [TESTING-STANDARDS.md](./TESTING-STANDARDS.md) (enforcement guide)

---

## Document Overview

### 1. QUICK-REFERENCE.md
**For**: Developers with a failing test
**Length**: 2 minutes
**Contains**:
- The 3-step solution
- Find & fix patterns
- Copy-paste template
- When you're stuck (decision tree)

### 2. test-isolation-prevention.md
**For**: Understanding root causes
**Length**: 15 minutes (detailed)
**Contains**:
1. Problem definition & symptoms
2. Detection checklist (identify the issue)
3. Prevention best practices (4 patterns)
4. Code patterns (dangerous vs. safe)
5. Test case suggestions
6. Real-world examples from your codebase
7. Debugging workflow
8. CI/CD best practices

### 3. state-isolation-patterns.md
**For**: Copy-paste code solutions
**Length**: Reference guide
**Contains**:
- Pattern 1: Unique identifier generator (recommended)
- Pattern 2: Service reset function
- Pattern 3: Complete mock reset
- Pattern 4: Global setup
- Pattern 5: Test data factory
- Pattern 6: Fixture cleanup
- Pattern 7: Module-level state with reset
- Pattern 8: Spy on module-level state
- Pattern 9: Quick isolation check
- Decision tree
- Common problems & solutions

### 4. TESTING-STANDARDS.md
**For**: Code review & enforcement
**Length**: 10 minutes
**Contains**:
- Executive summary (3 rules)
- Rule 1: Generate unique test IDs
- Rule 2: Clear mocks in afterEach
- Rule 3: Export reset functions
- Test file template
- Review checklist
- Common violations & fixes
- Enforcement guidelines

---

## The 3 Core Rules

All tests in rebuild-6.0 must follow these three rules:

### Rule 1: Generate Unique Test IDs
```typescript
let testCounter = 0;
let testId: string;

beforeEach(() => {
  testId = `test-${++testCounter}-${Date.now()}`;
});
```
**Why**: Prevents hardcoded ID reuse across tests

### Rule 2: Clear Mocks in afterEach
**Status**: Already configured in `tests/bootstrap.ts`
```typescript
// Runs automatically for all tests
afterEach(() => {
  vi.clearAllMocks();
});
```
**Why**: Prevents mock state from leaking between tests

### Rule 3: Export Reset Functions
```typescript
// In service with module-level state
export function resetServiceState() {
  cache.clear();
}

// In test
afterEach(() => resetServiceState());
```
**Why**: Cleans up stateful modules between tests

---

## The Problem: Module-Level State Pollution

Tests fail when they share mutable state at the module level.

```typescript
// ❌ BAD: This persists across ALL tests
const cache = new Map<string, Cart>();

export function getCart(sessionId: string) {
  return cache.get(sessionId);  // Sees data from previous tests!
}
```

**Symptom**: Test passes alone but fails when run with others.

```bash
npm run test -- mytest.test.ts    # PASS ✅
npm run test                      # FAIL ❌ - State pollution
```

---

## Solutions at a Glance

| Problem | Solution | Difficulty | Speed |
|---------|----------|-----------|-------|
| Hardcoded test IDs | Use unique ID generator | Easy | 2 min |
| Module-level Map/Set | Export reset function | Easy | 5 min |
| Mock persistence | Global mock clearing | Done | ✅ |
| Complex state | Dependency injection | Medium | 10 min |
| Need complete isolation | `vi.resetModules()` | Hard | 50ms slower |

---

## Recommended Reading Path

### For New Tests
1. Read [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
2. Copy pattern from [state-isolation-patterns.md](./state-isolation-patterns.md)
3. Use template from [TESTING-STANDARDS.md](./TESTING-STANDARDS.md)

### For Debugging Failing Tests
1. Start with [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - identify problem
2. Deep dive in [test-isolation-prevention.md](./test-isolation-prevention.md) - understand cause
3. Apply fix from [state-isolation-patterns.md](./state-isolation-patterns.md)

### For Code Review
1. Use checklist from [TESTING-STANDARDS.md](./TESTING-STANDARDS.md)
2. Reference violations section
3. Point to specific patterns in [state-isolation-patterns.md](./state-isolation-patterns.md)

### For Architecture Decisions
1. Read [test-isolation-prevention.md](./test-isolation-prevention.md) - Sections 2 & 3
2. Review patterns & tradeoffs
3. Check real-world examples from rebuild-6.0

---

## Key Takeaways

### What Causes Test Isolation Issues?
1. **Hardcoded test IDs** - Same ID reused across tests
2. **Module-level state** - Maps/Sets/arrays defined at module scope
3. **Unchecked mocks** - Mock implementations persist between tests
4. **No reset functions** - Stateful modules can't be cleaned up

### How to Prevent Issues?
1. **Generate unique IDs** - Counter + timestamp
2. **Clear mocks automatically** - Bootstrap setup (already done)
3. **Export reset functions** - For any stateful module
4. **Test in isolation & together** - Always run both ways

### How to Debug Issues?
1. Run test alone - passes?
2. Run full suite - fails?
3. → Check for hardcoded IDs or module-level state
4. → Apply appropriate fix from patterns guide

---

## Current Status in rebuild-6.0

### What's Already Implemented
- ✅ Vitest configuration with `isolate: true`
- ✅ Single-threaded test execution
- ✅ Global mock clearing in `tests/bootstrap.ts`
- ✅ Good examples in test files

### What Needs Manual Effort
- Developers must use unique test IDs
- Services must export reset functions
- Code reviewers must check for violations

---

## Testing Infrastructure

### Vitest Configuration
```typescript
// vitest.config.ts - Already configured
{
  test: {
    isolate: true,                              // ✅ Good
    poolOptions: { threads: { singleThread: true } }, // ✅ Good
    setupFiles: ['tests/setup.ts', 'tests/bootstrap.ts'], // ✅ Good
  },
}
```

### Bootstrap Setup
```typescript
// tests/bootstrap.ts - Already configured
afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
  vi.resetAllMocks();
});
```

### Test Commands
```bash
npm run test                 # Run all tests
npm run test -- specific     # Run specific file
npm run test:watch          # Watch mode
npm run test:healthy        # Exclude quarantined tests
npm run test:quick          # Quick run with minimal output
```

---

## Common Scenarios

### Scenario 1: "Test passes alone, fails in suite"
**Diagnosis**: Module-level state pollution
**Solution**: Use unique test IDs or export reset function
**Read**: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

### Scenario 2: "New test is breaking others"
**Diagnosis**: Hardcoded test ID or uncleaned mock
**Solution**: Generate unique IDs, check mock clearing
**Read**: [state-isolation-patterns.md](./state-isolation-patterns.md)

### Scenario 3: "Tests fail intermittently"
**Diagnosis**: State accumulation or race condition
**Solution**: Check for module-level state, ensure proper cleanup
**Read**: [test-isolation-prevention.md](./test-isolation-prevention.md) - Section 7

### Scenario 4: "Memory grows with each test"
**Diagnosis**: State is accumulating instead of being reused
**Solution**: Clear state in afterEach, export reset functions
**Read**: [test-isolation-prevention.md](./test-isolation-prevention.md) - Section 5

---

## Code Review Checklist

When reviewing test code:

### Must Have (✅)
- [ ] Unique test IDs using counter + timestamp
- [ ] Mock clearing in afterEach or global setup
- [ ] Reset functions for stateful modules
- [ ] Tests pass in isolation and together

### Must NOT Have (❌)
- [ ] Hardcoded test IDs like 'test-1', 'user-123'
- [ ] Shared module-level state without reset
- [ ] Tests that depend on execution order
- [ ] Missing cleanup hooks

### Should Review (⚠️)
- [ ] Complex state management
- [ ] Database/external service mocks
- [ ] Multiple describe blocks sharing state
- [ ] Global variables in test files

---

## Getting Help

### For Quick Fixes
1. Go to [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
2. Use the copy-paste template
3. Run: `npm run test && npm run test`

### For Deep Understanding
1. Read [test-isolation-prevention.md](./test-isolation-prevention.md)
2. Review Section 3: "Code Patterns to Watch For"
3. Look at examples from your codebase

### For Specific Patterns
1. Open [state-isolation-patterns.md](./state-isolation-patterns.md)
2. Find similar pattern to your use case
3. Copy exact code
4. Adapt variable names as needed

---

## Related Documentation

- **Architecture Decisions**: `/docs/explanation/architecture-decisions/`
- **API Documentation**: `/docs/api/`
- **Operational Guides**: `/docs/guides/operations/`
- **Performance**: `/docs/guides/performance/`

---

## File Locations

**In this directory:**
- `QUICK-REFERENCE.md` - 30-second solution
- `test-isolation-prevention.md` - Complete guide
- `state-isolation-patterns.md` - Code patterns
- `TESTING-STANDARDS.md` - Enforcement
- `README.md` - This file

**Key test files:**
- `/server/tests/bootstrap.ts` - Global setup
- `/server/vitest.config.ts` - Vitest configuration
- `/server/src/test-utils/index.ts` - Test utilities
- `/server/tests/ai/functions/realtime-menu-tools.test.ts` - Example pattern

---

## Contributing

When adding new tests:

1. ✅ Use unique IDs pattern from [state-isolation-patterns.md](./state-isolation-patterns.md) - Pattern 1
2. ✅ Follow template from [TESTING-STANDARDS.md](./TESTING-STANDARDS.md)
3. ✅ Run tests multiple times: `npm run test && npm run test`
4. ✅ Ensure test passes in isolation: `npm run test -- file.test.ts`

---

**Last Updated**: 2025-11-25
**Status**: Active - Enforced in all code reviews
**Maintainer**: Development Team

---

### Navigation
- [Quick Reference (Start here)](./QUICK-REFERENCE.md)
- [Complete Prevention Guide](./test-isolation-prevention.md)
- [Code Patterns Reference](./state-isolation-patterns.md)
- [Testing Standards](./TESTING-STANDARDS.md)
