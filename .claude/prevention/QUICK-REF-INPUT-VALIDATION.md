# Quick Reference: Input Validation & Error Safety

**Use this during code review, pre-commit checks, and daily development.**

---

## Checklist for Code Review

### Input Validation
- [ ] User input objects are filtered for `__proto__`, `constructor`, `prototype`
- [ ] String inputs validated for format (regex) and length (substring/limit)
- [ ] All `parseInt()` calls have radix specified: `parseInt(x, 10)`
- [ ] Numeric inputs have bounds: `Math.min(MAX, Math.max(MIN, value))`
- [ ] No object spreading of untrusted input: `const x = { ...untrusted }`

### Error Handling
- [ ] Error properties accessed with type guard: `error instanceof Error`
- [ ] Optional properties checked with `in` operator: `'status' in error`
- [ ] No assumptions about error shape
- [ ] Error logging uses safe extraction function

### Array Operations
- [ ] Collecting multiple stats uses single-pass `reduce()`
- [ ] No multiple `filter()` calls on same array
- [ ] Accumulator pattern used for group-by operations

### Code Quality
- [ ] No dead code in exported functions/types
- [ ] Unused exports marked `@deprecated` with reason or removed
- [ ] No console.log, use `logger` instead

---

## Code Snippets (Copy/Paste Ready)

### Safe Object Input
```typescript
function sanitizeObjectInput(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {}
  return Object.fromEntries(
    Object.entries(input).filter(([key]) =>
      !['__proto__', 'constructor', 'prototype'].includes(key)
    )
  )
}
```

### Safe Error Property Access
```typescript
function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  if (typeof error === 'object' && error !== null) {
    return {
      message: (error as any).message ?? String(error),
      status: typeof (error as any).status === 'number' ? (error as any).status : undefined
    }
  }
  return { message: String(error), status: undefined }
}
```

### Safe Numeric Parsing
```typescript
function parseMetricValue(value: unknown, min = 0, max = 1_000_000): number {
  if (typeof value !== 'string' && typeof value !== 'number') return min
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed))
}
```

### Single-Pass Array Stats
```typescript
const stats = tables.reduce((acc, t) => {
  acc.totalTables++
  acc.totalSeats += t.seats
  if (t.status === 'available') {
    acc.availableTables++
    acc.availableSeats += t.seats
  }
  return acc
}, { totalTables: 0, totalSeats: 0, availableTables: 0, availableSeats: 0 })
```

### Timestamp Validation
```typescript
function validateTimestamp(timestamp: unknown): string {
  if (typeof timestamp !== 'string') return new Date().toISOString()
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) {
    return new Date().toISOString()
  }
  return timestamp.substring(0, 30)  // Limit length
}
```

---

## Common Mistakes

### WRONG: Prototype Pollution
```typescript
const stats = { ...userInput }  // Dangerous!
```
**FIX:** `const stats = sanitizeObjectInput(userInput)`

### WRONG: Unsafe Error Access
```typescript
logger.error(error.message, error.status)  // Could crash
```
**FIX:** Use `getErrorDetails(error)` or check `error instanceof Error`

### WRONG: Multiple Array Iterations
```typescript
const available = tables.filter(t => t.status === 'available').length
const occupied = tables.filter(t => t.status === 'occupied').length
// 7 more filters...
```
**FIX:** Single-pass reduce() collecting all stats

### WRONG: parseInt Without Radix
```typescript
const count = parseInt(userInput)  // "08" becomes 0 (octal)
```
**FIX:** `parseInt(userInput, 10)`

### WRONG: No Numeric Bounds
```typescript
const count = parseInt(input) || 0  // Could be 9999999999
```
**FIX:** `Math.min(MAX, Math.max(MIN, parseInt(input, 10) || 0))`

---

## Pre-Commit Hook Commands

```bash
# Check for prototype pollution patterns
grep -r '__proto__\|constructor' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules client/ server/ && \
  echo "ERROR: Found suspicious prototype pollution patterns" && exit 1

# Check for parseInt without radix
grep -r 'parseInt([^,)]*\)' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules client/ server/ | \
  grep -v 'parseInt.*,[[:space:]]*10' && \
  echo "WARNING: Found parseInt without radix"

# Run type checking
npm run typecheck:quick
```

---

## Testing (Copy/Paste Test Cases)

### Input Validation Tests
```typescript
test('sanitizeObjectInput filters dangerous keys', () => {
  const input = { '__proto__': { admin: true }, name: 'safe' }
  const result = sanitizeObjectInput(input)
  expect(result).not.toHaveProperty('__proto__')
  expect(result.name).toBe('safe')
})

test('validateTimestamp limits length', () => {
  const long = '2025-12-03T' + 'A'.repeat(1000)
  const result = validateTimestamp(long)
  expect(result.length).toBeLessThanOrEqual(30)
})

test('parseMetricValue uses radix 10', () => {
  expect(parseMetricValue('08')).toBe(8)  // Not 0
})
```

### Error Handling Tests
```typescript
test('getErrorDetails handles all error types', () => {
  // Error instance
  expect(getErrorDetails(new Error('test')).message).toBe('test')

  // Object with status
  expect(getErrorDetails({ status: 404, message: 'Not found' }).status).toBe(404)

  // String
  expect(getErrorDetails('error string').message).toBe('error string')
})
```

---

## ESLint Config Additions

```javascript
// eslint.config.js
rules: {
  '@typescript-eslint/no-explicit-any': ['warn', { fixToUnknown: false }],
  '@typescript-eslint/no-unused-vars': ['warn', { exports: true }],
  'no-eval': 'error',
  'no-implied-eval': 'error'
}
```

---

## When to Ask for Help

- **Unclear if input is safe:** Ask in PR review
- **Error handling looks complex:** Extract to getErrorDetails() helper
- **Array operation seems slow:** Consider single-pass reduce()
- **Unsure about type guards:** Check if `instanceof Error` applies

---

## Resources

- **Prototype Pollution:** Full guide in INPUT-VALIDATION-AND-ERROR-SAFETY.md
- **Error Type Safety:** Patterns section in INPUT-VALIDATION-AND-ERROR-SAFETY.md
- **Array Performance:** Accumulator patterns in INPUT-VALIDATION-AND-ERROR-SAFETY.md

**Last Updated:** 2025-12-03
