# Prevention Strategies: Input Validation & Error Safety

**Document Date:** 2025-12-03
**Based On:** Fixed issues TODO-144 through TODO-150 (commit 0728e1ee)
**Scope:** Input validation, prototype pollution, error handling, array performance, dead code cleanup

---

## Executive Summary

Six critical code quality and security issues were identified and fixed:

1. **Prototype Pollution Risk** (TODO-144) - Unsanitized object spreading
2. **Array Performance** (TODO-145) - Multiple redundant iterations (7x overhead)
3. **Dead Code** (TODO-146) - 200+ lines of unused exports
4. **Error Type Safety** (TODO-147) - Unsafe error property access
5. **Input Validation** (TODO-148) - Timestamp validation missing
6. **parseInt Safety** (TODO-150) - Missing radix and bounds checking

These issues span security (prototype pollution, input validation), performance (array iteration), type safety (error handling), and code hygiene (dead code). This document provides prevention strategies to stop them from recurring.

---

## Prevention Strategies

### 1. Input Validation & Sanitization

#### Best Practices

1. **Always validate before spreading objects**
   ```typescript
   // CORRECT: Sanitize before using
   const sanitized = typeof input === 'object' && input !== null && !Array.isArray(input)
     ? Object.fromEntries(
         Object.entries(input).filter(([key]) =>
           !['__proto__', 'constructor', 'prototype'].includes(key)
         )
       )
     : {}

   // WRONG: Spreading without validation
   const merged = { ...unsafeInput } // Prototype pollution risk
   ```

2. **Validate string inputs for format and length**
   ```typescript
   // CORRECT: ISO 8601 timestamp with length limit
   const timestamp = typeof metrics.timestamp === 'string' &&
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metrics.timestamp)
     ? metrics.timestamp.substring(0, 30)
     : new Date().toISOString()

   // WRONG: No format or length validation
   const timestamp = metrics.timestamp || new Date().toISOString()
   ```

3. **Always specify radix in parseInt()**
   ```typescript
   // CORRECT: Explicit base-10 parsing
   const count = parseInt(input, 10) || 0

   // WRONG: Radix omitted (interprets "08" as octal)
   const count = parseInt(input) || 0
   ```

4. **Add reasonable bounds to numeric inputs**
   ```typescript
   // CORRECT: Bounds applied
   const slowRenders = Math.min(1_000_000, Math.max(0, parseInt(metrics.slowRenders, 10) || 0))

   // WRONG: No upper bound (unbounded memory if huge values)
   const slowRenders = parseInt(metrics.slowRenders) || 0
   ```

#### Code Patterns to Follow

**Pattern 1: Safe Object Filtering**
```typescript
// Filter dangerous prototype pollution keys
function sanitizeObjectInput(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(input).filter(([key]) =>
      !['__proto__', 'constructor', 'prototype'].includes(key)
    )
  )
}
```

**Pattern 2: Safe Numeric Parsing**
```typescript
// Parse integer with radix and bounds
function parseMetricValue(value: unknown, min = 0, max = 1_000_000): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return min
  }
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed))
}

// Usage
const slowRenders = parseMetricValue(metrics.slowRenders, 0, 1_000_000)
```

**Pattern 3: String Validation & Length Limiting**
```typescript
// Validate format and limit length to prevent injection
function validateTimestamp(timestamp: unknown): string {
  if (typeof timestamp !== 'string') {
    return new Date().toISOString()
  }

  // Match ISO 8601 start pattern
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) {
    return new Date().toISOString()
  }

  // Limit length (prevent log injection)
  return timestamp.substring(0, 30)
}
```

**Pattern 4: Null/Array Type Guards**
```typescript
// Comprehensive type checking for objects
function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Usage
if (isValidObject(input)) {
  const stats = sanitizeObjectInput(input)
}
```

---

### 2. Error Type Safety

#### Best Practices

1. **Always use type guards before accessing error properties**
   ```typescript
   // CORRECT: Type guard first
   const errorMessage = error instanceof Error ? error.message : 'Unknown error'

   // WRONG: Assumes error has .message
   const errorMessage = error.message // Could crash if error is a string
   ```

2. **Use in operator for optional properties**
   ```typescript
   // CORRECT: Check property existence
   const status = 'status' in error && typeof error.status === 'number'
     ? error.status
     : undefined

   // WRONG: Accessing without checking
   const status = error.status
   ```

3. **Create type guards for custom error types**
   ```typescript
   // CORRECT: Reusable type guard
   function isAPIError(error: unknown): error is { status: number; message: string } {
     return (
       typeof error === 'object' &&
       error !== null &&
       'status' in error &&
       'message' in error &&
       typeof (error as any).status === 'number' &&
       typeof (error as any).message === 'string'
     )
   }

   // Usage
   if (isAPIError(error)) {
     logger.error('API error', { status: error.status, message: error.message })
   }
   ```

#### Code Patterns to Follow

**Pattern 1: Safe Error Property Access**
```typescript
// Safe error property extraction
function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, any>
    return {
      message: typeof obj.message === 'string' ? obj.message : String(error),
      status: typeof obj.status === 'number' ? obj.status : undefined,
      code: typeof obj.code === 'string' ? obj.code : undefined
    }
  }

  return {
    message: String(error),
    status: undefined,
    code: undefined
  }
}
```

**Pattern 2: Error Logging Helper**
```typescript
// Consistent error logging with type safety
function logError(context: string, error: unknown, metadata?: Record<string, any>) {
  const details = getErrorDetails(error)
  logger.error(context, {
    ...details,
    ...metadata
  })
}

// Usage
logError('Failed to load floor plan:', error, { isInitial: true })
```

**Pattern 3: Error Boundary Type Guard**
```typescript
// For React error boundaries
function isReactError(error: unknown): error is Error {
  return error instanceof Error
}

// For fetch errors
function isFetchError(error: unknown): error is { status: number; statusText: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'statusText' in error
  )
}
```

---

### 3. Array Performance

#### Best Practices

1. **Use single-pass reduce instead of multiple filters**
   ```typescript
   // CORRECT: Single pass (O(n) complexity)
   const stats = tables.reduce((acc, table) => {
     acc.totalTables++
     acc.totalSeats += table.seats
     if (table.status === 'available') {
       acc.availableTables++
       acc.availableSeats += table.seats
     } else if (table.status === 'occupied') {
       acc.occupiedTables++
     }
     // ... more conditions
     return acc
   }, { totalTables: 0, availableTables: 0, ... })

   // WRONG: Multiple passes (O(7n) with 7 filters)
   const available = tables.filter(t => t.status === 'available').length
   const occupied = tables.filter(t => t.status === 'occupied').length
   const reserved = tables.filter(t => t.status === 'reserved').length
   // ... 4 more filter operations
   ```

2. **Collect multiple statistics in a single iteration**
   ```typescript
   // CORRECT: All stats in one pass
   const stats = useMemo(() => {
     return tables.reduce((acc, t) => {
       acc.totalTables++
       acc.totalSeats += t.seats
       acc[`${t.status}Tables`] = (acc[`${t.status}Tables`] || 0) + 1
       return acc
     }, { totalTables: 0, totalSeats: 0, ... })
   }, [tables])
   ```

3. **Avoid unnecessary intermediate arrays**
   ```typescript
   // CORRECT: Direct reduce
   const availableSeats = tables.reduce((sum, t) =>
     t.status === 'available' ? sum + t.seats : sum, 0)

   // WRONG: Creates intermediate array
   const availableSeats = tables
     .filter(t => t.status === 'available')  // Creates new array
     .reduce((sum, t) => sum + t.seats, 0)   // Iterates it
   ```

#### Code Patterns to Follow

**Pattern 1: Multi-Stat Accumulator**
```typescript
interface TableStats {
  totalTables: number
  totalSeats: number
  availableTables: number
  availableSeats: number
  occupiedTables: number
  reservedTables: number
  paidTables: number
}

function calculateTableStats(tables: Table[]): TableStats {
  return tables.reduce((acc, t) => {
    acc.totalTables++
    acc.totalSeats += t.seats

    if (t.status === 'available') {
      acc.availableTables++
      acc.availableSeats += t.seats
    } else if (t.status === 'occupied') {
      acc.occupiedTables++
    } else if (t.status === 'reserved') {
      acc.reservedTables++
    } else if (t.status === 'paid') {
      acc.paidTables++
    }

    return acc
  }, {
    totalTables: 0,
    totalSeats: 0,
    availableTables: 0,
    availableSeats: 0,
    occupiedTables: 0,
    reservedTables: 0,
    paidTables: 0
  })
}
```

**Pattern 2: Efficient useMemo Hook**
```typescript
// In React component
const stats = useMemo(() => {
  return tables.reduce((acc, t) => {
    // Single pass through array
    acc.totalTables++
    acc.totalSeats += t.seats
    if (t.status === 'available') acc.availableTables++
    return acc
  }, { totalTables: 0, totalSeats: 0, availableTables: 0 })
}, [tables])
```

**Pattern 3: Group-By Accumulator**
```typescript
// When you need to group by multiple dimensions
const groupedStats = items.reduce((acc, item) => {
  const key = item.category
  if (!acc[key]) acc[key] = { count: 0, total: 0 }
  acc[key].count++
  acc[key].total += item.value
  return acc
}, {} as Record<string, { count: number; total: number }>)
```

---

### 4. Dead Code Cleanup

#### Best Practices

1. **Regular exports audit to identify unused code**
   ```bash
   # Find all exported functions/types
   grep -r "export " shared/types/transformers.ts

   # Check each export for usage
   grep -r "ClientOrder" client/src/
   grep -r "transformSharedTableToClient" .
   ```

2. **Document before removing (if genuinely planned for future use)**
   ```typescript
   // ❌ Don't: Just delete without documentation
   // export const UnusedFunction = ...

   // ✅ Do: Document if keeping for future use
   /**
    * @deprecated Planned for use in table sync feature (issue #123)
    * Remove after implementing real-time table updates
    * Last reviewed: 2025-12-03
    */
   export const transformSharedTableToClient = ...

   // ✅ Do: Delete if truly dead code
   // (No comment = was dead, just remove)
   ```

3. **Use ESLint to catch unused exports**
   ```javascript
   // Add to .eslintrc.js
   rules: {
     '@typescript-eslint/no-unused-vars': ['warn', {
       exports: true,
       argsIgnorePattern: '^_'
     }]
   }
   ```

#### Code Patterns to Follow

**Pattern 1: Identify Dead Code**
```bash
# Find unused exports
grep -r "^export " shared/types/transformers.ts | awk '{print $3}' |
while read export; do
  if ! grep -r "$export" --exclude="transformers.ts" .; then
    echo "UNUSED: $export"
  fi
done
```

**Pattern 2: Document Intentionally Kept Code**
```typescript
/**
 * @internal
 * @deprecated
 *
 * Not currently used but kept for:
 * - Reference implementation
 * - Future real-time sync feature (see issue #456)
 *
 * Review for removal: Q1 2026
 * Last used: 2025-08-15
 */
export const legacyTransformer = (...) => { ... }
```

**Pattern 3: Regular Dead Code Audits**
```typescript
// Add to your CI/CD pipeline
// scripts/audit-dead-code.ts

function auditDeadCode() {
  const exported = findAllExports('shared/types/')
  const unused = exported.filter(exp => !isImportedAnywhere(exp))

  if (unused.length > 0) {
    console.warn(`Found ${unused.length} unused exports:`)
    unused.forEach(exp => console.warn(`  - ${exp.name} in ${exp.file}`))
  }

  return unused.length === 0
}
```

---

### 5. Suggested ESLint Rules & Automated Checks

#### ESLint Configuration

```javascript
// eslint.config.js or .eslintrc.js

rules: {
  // Input validation
  'no-invalid-regexp': 'error',  // Catch bad regex patterns
  'no-eval': 'error',            // Prevent dynamic code execution

  // Error handling
  '@typescript-eslint/no-explicit-any': ['warn', {
    fixToUnknown: false,
    ignoreRestArgs: true
  }],

  // Array operations
  'no-multiple-empty-lines': ['warn', { max: 1 }],

  // Dead code
  '@typescript-eslint/no-unused-vars': ['warn', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    exports: true  // Flag unused exports
  }],

  'no-unreachable': 'error',
  'no-unused-expressions': 'warn',

  // Security
  'no-console': ['warn', { allow: ['warn', 'error'] }],  // No console.log
  'no-eval': 'error',
  'no-implied-eval': 'error',
  '@typescript-eslint/restrict-template-expressions': 'warn'
}
```

#### TypeScript Strict Mode Configuration

```json
{
  "compilerOptions": {
    // Error handling
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Dead code
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

#### Pre-Commit Hooks

```bash
#!/bin/bash
# .husky/pre-commit

# Run type checking
npm run typecheck:quick

# Check for prototype pollution patterns
if grep -r '__proto__\|constructor' \
   --include='*.ts' --include='*.tsx' \
   --exclude-dir=node_modules client/ server/; then
  echo "ERROR: Found suspicious prototype pollution patterns"
  exit 1
fi

# Check for parseInt without radix
if grep -r 'parseInt([^,)]*\)' \
   --include='*.ts' --include='*.tsx' \
   --exclude-dir=node_modules client/ server/ |
   grep -v 'parseInt.*,[[:space:]]*10'; then
  echo "WARNING: Found parseInt without radix specified"
  exit 1
fi

# Check for error.message without type guard
if grep -r '\.message\|\.status' \
   --include='*.ts' --include='*.tsx' |
   grep -v 'instanceof Error\|isAPIError\|getErrorDetails'; then
  echo "WARNING: Found potential unsafe error property access"
  # Don't fail, just warn
fi

npm run lint
```

#### GitHub Actions Workflow

```yaml
# .github/workflows/code-quality.yml

name: Code Quality Checks

on: [push, pull_request]

jobs:
  validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for prototype pollution patterns
        run: |
          if grep -r '__proto__\|constructor\|\.prototype' \
             --include='*.ts' --include='*.tsx' \
             --exclude-dir=node_modules client/ server/; then
            echo "ERROR: Found prototype pollution risk patterns"
            exit 1
          fi

      - name: Check parseInt usage
        run: |
          # Flag parseInt without radix
          grep -r 'parseInt([^,)]*\)' \
            --include='*.ts' \
            --exclude-dir=node_modules client/ server/ | \
            grep -v 'parseInt.*,[[:space:]]*10' && \
            echo "ERROR: Found parseInt without radix" && exit 1 || true

      - name: Type checking
        run: npm run typecheck

      - name: Unused exports check
        run: |
          npm run test -- --coverage --collectCoverageFrom='["src/**/*.ts","!src/**/*.d.ts"]'
```

---

## Implementation Checklist

### For All New Code

- [ ] Input objects are filtered for dangerous keys (__proto__, constructor, prototype)
- [ ] String inputs are validated for format and limited in length
- [ ] parseInt() calls always specify radix (base 10)
- [ ] Numeric inputs have reasonable bounds (min/max)
- [ ] Error properties accessed safely with instanceof/in operators
- [ ] Array operations use single-pass reduce when collecting multiple stats
- [ ] No unused exports in public API surfaces

### For Code Review

**When reviewing PRs:**

- [ ] Check user input handling (spread operators, object merging)
- [ ] Verify error handling uses type guards
- [ ] Look for multiple iterations over same array
- [ ] Scan for parseInt() without radix
- [ ] Review new exports are actually used
- [ ] Validate string inputs have length limits

### Automated Checks (CI/CD)

Add these to your pipeline:

1. **ESLint rules** - Catch unused exports, any types
2. **TypeScript strict mode** - Enforce type safety
3. **Custom grep checks** - Flag dangerous patterns (prototype pollution, unsafe parseInt)
4. **Unused code detection** - Regular audits of dead code

---

## Testing Strategy

### Unit Tests for Input Validation

```typescript
describe('Input Validation', () => {
  describe('sanitizeObjectInput', () => {
    it('filters dangerous prototype pollution keys', () => {
      const input = { '__proto__': { admin: true }, name: 'safe' }
      const result = sanitizeObjectInput(input)
      expect(result).not.toHaveProperty('__proto__')
      expect(result.name).toBe('safe')
    })

    it('handles non-objects gracefully', () => {
      expect(sanitizeObjectInput('string')).toEqual({})
      expect(sanitizeObjectInput(null)).toEqual({})
      expect(sanitizeObjectInput([1, 2, 3])).toEqual({})
    })
  })

  describe('validateTimestamp', () => {
    it('accepts valid ISO 8601 timestamps', () => {
      const valid = '2025-12-03T14:30:00Z'
      expect(validateTimestamp(valid)).toBe(valid)
    })

    it('rejects invalid timestamps', () => {
      expect(validateTimestamp('not-a-date')).toMatch(/\d{4}-\d{2}-\d{2}/)
      expect(validateTimestamp(null)).toMatch(/\d{4}-\d{2}-\d{2}/)
    })

    it('limits length to prevent injection', () => {
      const long = '2025-12-03T' + 'A'.repeat(1000)
      const result = validateTimestamp(long)
      expect(result.length).toBeLessThanOrEqual(30)
    })
  })

  describe('parseMetricValue', () => {
    it('uses radix 10 for parsing', () => {
      // "08" without radix would be octal
      expect(parseMetricValue('08')).toBe(8)
    })

    it('respects min/max bounds', () => {
      expect(parseMetricValue(5000000, 0, 100)).toBe(100)
      expect(parseMetricValue(-5, 0, 100)).toBe(0)
    })
  })
})
```

### Unit Tests for Error Handling

```typescript
describe('Error Handling', () => {
  describe('getErrorDetails', () => {
    it('handles Error instances safely', () => {
      const error = new Error('test')
      const result = getErrorDetails(error)
      expect(result.message).toBe('test')
    })

    it('handles objects with status property', () => {
      const error = { status: 404, message: 'Not found' }
      const result = getErrorDetails(error)
      expect(result.status).toBe(404)
      expect(result.message).toBe('Not found')
    })

    it('handles strings and other types', () => {
      const result = getErrorDetails('simple error')
      expect(result.message).toBe('simple error')
      expect(result.status).toBeUndefined()
    })
  })
})
```

### Performance Tests for Array Operations

```typescript
describe('Array Performance', () => {
  it('calculateTableStats uses single pass', () => {
    const tables = Array(1000).fill(null).map((_, i) => ({
      id: i,
      status: ['available', 'occupied', 'reserved', 'paid'][i % 4],
      seats: 2
    }))

    const start = performance.now()
    const stats = calculateTableStats(tables)
    const elapsed = performance.now() - start

    // Should complete in <5ms (7 iterations = ~10ms, 1 iteration = ~1ms)
    expect(elapsed).toBeLessThan(5)
    expect(stats.totalTables).toBe(1000)
  })
})
```

---

## Common Pitfalls to Avoid

### 1. Prototype Pollution

**Pitfall:** Spreading user input without filtering
```typescript
// ❌ WRONG
const config = { ...userInput }  // Dangerous!
```

**Prevention:**
```typescript
// ✅ CORRECT
const config = sanitizeObjectInput(userInput)
```

### 2. Array Performance

**Pitfall:** Multiple filters for related stats
```typescript
// ❌ WRONG
const available = tables.filter(t => t.status === 'available').length
const occupied = tables.filter(t => t.status === 'occupied').length
// ... 5 more filters (7x overhead)
```

**Prevention:**
```typescript
// ✅ CORRECT
const stats = tables.reduce((acc, t) => {
  acc.totalTables++
  if (t.status === 'available') acc.availableTables++
  // ... all conditions in one pass
  return acc
}, { ... })
```

### 3. Error Handling

**Pitfall:** Assuming error shape
```typescript
// ❌ WRONG
console.error(error.message, error.status)  // Could crash
```

**Prevention:**
```typescript
// ✅ CORRECT
const message = error instanceof Error ? error.message : String(error)
const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined
```

### 4. Input Validation

**Pitfall:** No validation on numeric input
```typescript
// ❌ WRONG
const count = parseInt(input)  // Missing radix, no bounds
```

**Prevention:**
```typescript
// ✅ CORRECT
const count = Math.min(MAX_VALUE, Math.max(0, parseInt(input, 10) || 0))
```

### 5. Dead Code

**Pitfall:** Keeping unused code without documentation
```typescript
// ❌ WRONG
export const unusedFunction = () => { ... }  // Why is this here?
```

**Prevention:**
```typescript
// ✅ CORRECT
/**
 * @deprecated Planned for Q1 2026 refactor (issue #123)
 * Remove when implementing real-time sync
 */
export const legacyTransformer = () => { ... }

// ✅ OR BETTER: Just delete it
// (Deleted code is in git history if needed)
```

---

## Summary Table

| Issue | Prevention | Lint Rule | Test |
|-------|-----------|-----------|------|
| Prototype Pollution | Filter `__proto__`, `constructor`, `prototype` | Custom rule | Unit test spread |
| Array Performance | Use single-pass reduce | `complexity` rule | Performance test <5ms |
| Dead Code | Remove or document with `@deprecated` | `no-unused-vars` + `exports: true` | Export audit script |
| Error Type Safety | Use `instanceof Error` + `in` operator | `@typescript-eslint/no-explicit-any` | Type-specific error tests |
| String Validation | Regex + length limit | Custom rule | Format validation tests |
| parseInt Radix | Always specify radix 10 | Custom grep check | Octal/decimal tests |

---

## Automation Recommendations

### 1. Pre-Commit Hook (Priority: HIGH)

```bash
npm run lint        # Catches most issues
npm run typecheck   # Type safety
```

### 2. ESLint Custom Rule (Priority: MEDIUM)

Create a custom ESLint rule to detect:
- `parseInt()` without radix
- Object spread on user input
- Error property access without guards

### 3. GitHub Actions (Priority: LOW)

Weekly audit for:
- Dead code accumulation
- Type assertion creep
- Unused exports

### 4. Code Review Template (Priority: HIGH)

Add to PR checklist:
- [ ] Input validation: objects filtered, strings validated
- [ ] Error handling: all error property access has type guards
- [ ] Array operations: no redundant iterations
- [ ] Numeric input: parseInt has radix, bounds applied

---

## Implementation Timeline

**Immediate (This Sprint):**
- Add pre-commit hook with lint checks
- Update code review checklist
- Document patterns in team wiki

**Short Term (Next 2 weeks):**
- Enable `noUnusedLocals` and `noUnusedParameters` in TypeScript
- Create custom ESLint rule for parseInt
- Add dead code audit script

**Medium Term (Next 1-2 months):**
- Weekly automated dead code audit
- Quarterly code review of array operations
- Refactor any remaining unsafe error handling

---

## References

- **OWASP Prototype Pollution:** https://owasp.org/www-community/attacks/Prototype_pollution
- **MDN parseInt Radix:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
- **TypeScript Strict Mode:** https://www.typescriptlang.org/tsconfig#strict
- **ESLint Unused Variables:** https://typescript-eslint.io/rules/no-unused-vars/

---

**Document Owner:** Engineering Team
**Last Updated:** 2025-12-03
**Review Cycle:** Quarterly
**Next Review:** 2026-Q1
