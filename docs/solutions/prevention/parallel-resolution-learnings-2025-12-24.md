---
title: "Prevention Strategies: TOCTOU, Logging, and Deduplication Patterns"
category: prevention
problem_type: code_quality
severity: p2
date_created: 2025-12-24
detection_method: multi-agent-code-review
tags: [toctou, race-condition, logging, deduplication, code-review, prevention]
---

# Prevention Strategies: Parallel Resolution Learnings

## Summary

This document captures prevention strategies for three issues discovered during parallel TODO resolution on 2025-12-24:

| Issue | Pattern | Detection Method |
|-------|---------|------------------|
| TOCTOU Race Condition | Check-then-act without atomicity | Code review |
| Console vs Logger | Using console.* instead of structured logger | Pre-commit hook gap |
| Array vs Map Deduplication | Using push() when deduplication needed | Code review |

---

## 1. TOCTOU (Time-Of-Check-To-Time-Of-Use) Prevention

### What is TOCTOU?

A race condition where the system state changes between checking a condition and acting on it:

```typescript
// VULNERABLE: Check-then-act pattern
if (!this.registry.has(key)) {        // CHECK at time T1
  const value = await compute(key);    // Time passes...
  this.registry.set(key, value);       // ACT at time T2 - key may exist now!
}
```

### Code Review Checklist

When reviewing code, watch for these patterns:

- [ ] **Existence checks followed by writes**
  ```typescript
  // RED FLAG
  if (!exists(file)) { writeFile(file, data); }
  ```

- [ ] **Map/Set has() followed by set()**
  ```typescript
  // RED FLAG
  if (!map.has(key)) { map.set(key, value); }
  ```

- [ ] **Database record existence checks**
  ```typescript
  // RED FLAG
  const user = await db.findUser(id);
  if (!user) { await db.createUser(id, data); }
  ```

- [ ] **Async operations between check and act**
  ```typescript
  // RED FLAG - async gap creates window for race
  if (!cache.has(key)) {
    const data = await fetchData();  // <-- Other code can run here
    cache.set(key, data);
  }
  ```

### When to Use Atomic Operations

| Scenario | Solution |
|----------|----------|
| Map/Set insert-if-missing | Use `Map.set()` directly (idempotent) |
| Database upsert | Use `ON CONFLICT DO UPDATE` or `upsert()` |
| File creation | Use `O_CREAT | O_EXCL` flags or atomic rename |
| Counter increment | Use `Map.set(key, (Map.get(key) || 0) + 1)` |
| Distributed systems | Use transactions or compare-and-swap |

### Safe Patterns

```typescript
// SAFE: Unconditional set (idempotent for Maps)
this.registry.set(key, value);

// SAFE: Single atomic operation
await db.user.upsert({
  where: { id },
  update: data,
  create: { id, ...data }
});

// SAFE: Use Map.get() and handle missing case
const existing = this.cache.get(key);
if (existing) return existing;
const value = await compute(key);
this.cache.set(key, value);  // Might overwrite, but that's OK
return value;
```

### Red Flags to Watch For

1. **Guard clauses with side effects**: `if (!X) { createX(); }`
2. **"First one wins" logic**: Assumes only one caller reaches a code path
3. **Lazy initialization with existence checks**
4. **Async gaps between read and write operations**
5. **Comments like "only add if not present"**

---

## 2. Logging Convention Enforcement

### Current State

The pre-commit hook (`.husky/pre-commit`) checks for `console.log` and `console.debug`, but misses:

- `console.warn`
- `console.error`
- `console.info`
- `console.trace`

### Recommended Pre-Commit Enhancement

```bash
# Enhanced console check in .husky/pre-commit
# Check for ALL console methods (not just log/debug)
echo "[husky] Checking for console.* statements..."
JS_FILES=$(git diff --cached --name-only | grep -E '\.(js|jsx|ts|tsx)$' | grep -v 'tests/reporters/' || true)
if [ -n "$JS_FILES" ]; then
  if echo "$JS_FILES" | xargs grep -l 'console\.\(log\|debug\|warn\|error\|info\|trace\)' 2>/dev/null; then
    echo ""
    echo "ERROR: console.* found in staged files!"
    echo "   Use 'logger' from 'utils/logger' instead"
    echo ""
    echo "Replacements:"
    echo "   console.log   -> logger.info"
    echo "   console.debug -> logger.debug"
    echo "   console.warn  -> logger.warn"
    echo "   console.error -> logger.error"
    echo ""
    exit 1
  fi
fi
```

### ESLint Rule Recommendations

Add to `client/eslint.config.js` and `server/eslint.config.js`:

```javascript
rules: {
  // Ban all console methods
  'no-console': ['error', {
    allow: []  // No exceptions in source code
  }],
}
```

For files that legitimately need console (reporters, CLI tools):

```javascript
// In specific file overrides
{
  files: ['tests/reporters/**/*.ts', 'scripts/**/*.js'],
  rules: {
    'no-console': 'off'
  }
}
```

### Structured Logging Best Practices

```typescript
// WRONG: Unstructured console logging
console.error('Failed to load order', orderId, error.message);

// CORRECT: Structured logger with context
import { logger } from '@/services/logger';

logger.error('Failed to load order', {
  orderId,
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,
  restaurantId  // Always include tenant context
});
```

### Logger Benefits Over Console

| Feature | console.* | Structured Logger |
|---------|-----------|-------------------|
| JSON output | No | Yes |
| Log levels | Basic | Configurable |
| Timestamps | No | Automatic |
| Context fields | Manual | Built-in |
| Production filtering | No | Yes |
| Monitoring integration | No | Yes (Sentry, etc.) |

---

## 3. Collection Deduplication Pattern

### When to Use Map vs Array

| Use Case | Data Structure | Reason |
|----------|----------------|--------|
| Unique items by key | `Map<K, V>` | O(1) lookup, automatic deduplication |
| Ordered list, duplicates OK | `Array<T>` | Preserves insertion order |
| Unique items, no key needed | `Set<T>` | O(1) membership test |
| Need both order and uniqueness | `Map<K, V>` | Map preserves insertion order |

### Common Scenarios Requiring Deduplication

1. **Event handlers receiving duplicate events**
   ```typescript
   // WRONG: Duplicates accumulate
   private tests: TestInfo[] = [];
   onTestEnd(test: TestCase) {
     this.tests.push({ ...test });  // Same test retried = duplicate
   }

   // CORRECT: Map deduplicates by key
   private tests: Map<string, TestInfo> = new Map();
   onTestEnd(test: TestCase) {
     const key = `${test.file}:${test.title}`;
     this.tests.set(key, { ...test });  // Latest result wins
   }
   ```

2. **Aggregating results from multiple sources**
   ```typescript
   // WRONG: Merge creates duplicates
   const allItems = [...source1, ...source2];

   // CORRECT: Use Map to dedupe
   const itemMap = new Map<string, Item>();
   for (const item of [...source1, ...source2]) {
     itemMap.set(item.id, item);
   }
   const allItems = Array.from(itemMap.values());
   ```

3. **Caching with potential re-fetches**
   ```typescript
   // Map naturally handles "upsert" semantics
   cache.set(key, value);  // Overwrites if exists, adds if not
   ```

### Pattern Template for Playwright Reporters

```typescript
import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

interface TestInfo {
  title: string;
  file: string;
  status: string;
}

class DeduplicatingReporter implements Reporter {
  // Use Map with composite key for deduplication
  private results: Map<string, TestInfo> = new Map();

  onTestEnd(test: TestCase, result: TestResult): void {
    // Composite key ensures uniqueness
    const key = `${test.location.file}:${test.title}`;

    // Map.set() is idempotent - no TOCTOU race condition
    this.results.set(key, {
      title: test.title,
      file: test.location.file,
      status: result.status,
    });
  }

  onEnd(result: FullResult): void {
    // Convert to array only when needed
    const tests = Array.from(this.results.values());
    // Process deduplicated results...
  }
}
```

### Deduplication Decision Tree

```
Need to track items?
  |
  +-- By unique key? --> Use Map<key, value>
  |
  +-- Just presence? --> Use Set<value>
  |
  +-- Order matters, no key? --> Array + filter/reduce
  |
  +-- Performance critical? --> Map (O(1) vs O(n) for Array.includes)
```

---

## 4. General Prevention

### How These Issues Were Detected

All three issues were identified through **multi-agent parallel code review**:

1. **Discovery phase**: Automated scanning of recent commits
2. **Analysis phase**: Multiple AI agents reviewed code in parallel
3. **Cross-validation**: Agents checked each other's findings
4. **Categorization**: Issues tagged by type (TOCTOU, logging, deduplication)

### Multi-Agent Review Approach

The parallel resolution workflow (`/resolve_todo_parallel`) enables:

- **5-6 agents** reviewing different files simultaneously
- **Wave-based execution** to respect memory limits (~500MB per agent)
- **Automatic deduplication** of findings
- **Priority ordering** (P1 security > P2 code quality > P3 cleanup)

See: `docs/solutions/process-issues/parallel-agent-todo-resolution.md`

### Adding Similar Checks to CI

#### 1. TOCTOU Pattern Detection

Add a grep-based check to CI:

```yaml
# .github/workflows/ci.yml
- name: Check for TOCTOU patterns
  run: |
    # Check for has() followed by set() pattern
    if grep -rn "\.has(" --include="*.ts" --include="*.tsx" | \
       xargs -I{} sh -c 'file=$(echo {} | cut -d: -f1); line=$(echo {} | cut -d: -f2); \
       sed -n "$((line)),\$((line+3))p" "$file" | grep -q "\.set("'; then
      echo "WARNING: Potential TOCTOU pattern detected"
      echo "Review: has() followed by set() may have race conditions"
    fi
```

#### 2. Console Usage Detection (Enhanced)

```yaml
# .github/workflows/ci.yml
- name: Check for console statements
  run: |
    # Exclude test reporters which legitimately use console
    if grep -rn "console\.\(log\|debug\|warn\|error\|info\|trace\)" \
       --include="*.ts" --include="*.tsx" \
       --exclude-dir=tests/reporters \
       --exclude-dir=node_modules; then
      echo "ERROR: console.* found in source files"
      echo "Use logger from utils/logger instead"
      exit 1
    fi
```

#### 3. Array Push in Event Handlers

```yaml
# .github/workflows/ci.yml
- name: Check for array push in handlers
  run: |
    # Check reporter files for push() without Map usage
    for file in tests/reporters/*.ts; do
      if grep -q "\.push(" "$file" && ! grep -q "new Map" "$file"; then
        echo "WARNING: $file uses push() without Map - verify deduplication"
      fi
    done
```

### Prevention Checklist Summary

Before committing code that:

- [ ] **Checks existence before writing** - Consider atomic operations
- [ ] **Uses console.*` anywhere** - Replace with structured logger
- [ ] **Collects items from events** - Use Map for automatic deduplication
- [ ] **Has async gaps in read-modify-write** - Verify no race conditions

---

## Related Documentation

- [CL-WS-001: Handler Timing Race](../../../.claude/lessons/CL-WS-001-handler-timing-race.md)
- [CL-MEM-001: Interval Leaks](../../../.claude/lessons/CL-MEM-001-interval-leaks.md)
- [Parallel Agent TODO Resolution](../process-issues/parallel-agent-todo-resolution.md)
- [Multi-Layer Hardening](../code-quality-issues/multi-layer-hardening-p2-backlog.md)

---

**Last updated:** 2025-12-24
**Detection method:** Multi-agent parallel code review
