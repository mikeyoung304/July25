---
status: complete
priority: p3
issue_id: "188"
tags: [testing, cleanup, code-quality, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-testing-audit
---

# Remove Debug Test Files from E2E Suite

## Problem Statement

Debug test files with excessive console.log statements and incomplete implementations are polluting the test suite:
- `voice-ordering-debug.spec.ts` (209 lines, 40+ console.logs)
- Tests never complete properly (infinite waits)
- Production URLs hardcoded

## Findings

### Pattern Recognition Agent Discovery

**Location:** `tests/e2e/voice-ordering-debug.spec.ts`

**Issues Found:**
- 40+ `console.log()` statements with emojis
- Tests use infinite loops waiting for UI
- Hardcoded production URL
- Commented-out test blocks
- Never maintained because it's "debug"

**Example:**
```typescript
console.log('🧪 Starting voice ordering debug test...');
console.log('✓ Found microphone button');
await page.waitForTimeout(4000);  // Excessive wait
```

## Proposed Solutions

### Solution A: Delete Debug Files (Recommended)

**Effort:** 15 minutes | **Risk:** None

```bash
rm tests/e2e/voice-ordering-debug.spec.ts
```

### Solution B: Move to Separate Debug Directory

**Effort:** 30 minutes | **Risk:** None

```bash
mkdir tests/e2e/debug/
mv tests/e2e/*-debug.spec.ts tests/e2e/debug/

# Update playwright.config.ts testIgnore
testIgnore: ['**/debug/**']
```

## Recommended Action

Implement Solution A. Debug files should not be committed to the repository.

## Technical Details

**Files to Remove:**
- `tests/e2e/voice-ordering-debug.spec.ts`

**Alternative for Debugging:**
```bash
# Use Playwright's built-in debug tools
npx playwright test --debug
npx playwright test --ui
await page.pause();  # In test code
```

## Acceptance Criteria

- [ ] Debug test files removed from repository
- [ ] No `console.log` statements in E2E tests
- [ ] Developers use `--debug` flag instead of debug files

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |

## Resources

- Pattern Recognition agent findings
