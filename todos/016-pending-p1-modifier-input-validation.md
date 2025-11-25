# TODO-016: Add Input Validation for Voice Modifier Names

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 016
- **Tags**: security, voice, validation, prompt-injection, code-review
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Security Analysis

---

## Problem Statement

The `lookupModifierPrices()` function accepts modifier names directly from voice input without validation, creating a prompt injection vulnerability. Malicious or malformed voice input could potentially manipulate pricing logic or cause unexpected database queries.

---

## Findings

### Evidence Location
- `server/src/ai/functions/realtime-menu-tools.ts:135-165` - lookupModifierPrices implementation
- `server/src/ai/functions/realtime-menu-tools.ts:124-185` - add_to_order tool

### Vulnerable Code
```typescript
// Line 135-165: No validation on modifier names
async function lookupModifierPrices(
  modifiers: Array<{ type: string; value: string }>,
  restaurantId: string
): Promise<Record<string, number>> {
  const priceMap: Record<string, number> = {};

  // Directly uses modifier.value without validation
  for (const modifier of modifiers) {
    const rule = await prisma.modifier_rule.findFirst({
      where: {
        restaurant_id: restaurantId,
        modifier_name: modifier.value, // ❌ Unvalidated input
        // ... rest of query
      }
    });
  }
  return priceMap;
}
```

### Attack Vector Example
```typescript
// Voice input: "Add a burger with ' OR '1'='1 modifier"
// Could potentially cause SQL injection if Prisma doesn't sanitize
// Or cause DoS with extremely long modifier names (10KB+)
```

### Impact
- **Security Risk**: Potential SQL injection or query manipulation
- **DoS Risk**: Unbounded input length could cause memory issues
- **Data Integrity**: Invalid modifiers could corrupt order data
- **Scope**: Affects all voice orders with modifiers

---

## Proposed Solutions

### Option A: Whitelist Validation with Schema (Recommended)
**Pros**: Strongest security, prevents all invalid input, type-safe
**Cons**: Requires maintaining modifier whitelist
**Effort**: Medium (3-4 hours)
**Risk**: Low - fail-fast approach prevents issues

**Implementation**:
```typescript
import { z } from 'zod';

const ModifierSchema = z.object({
  type: z.enum(['size', 'temperature', 'preparation', 'addon']),
  value: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Invalid modifier format')
});

async function lookupModifierPrices(
  modifiers: Array<{ type: string; value: string }>,
  restaurantId: string
): Promise<Record<string, number>> {
  // Validate all modifiers first
  const validated = modifiers.map(m => ModifierSchema.parse(m));

  // Continue with database lookup
  // ...
}
```

### Option B: Length + Character Validation
**Pros**: Simple, low overhead
**Cons**: Doesn't prevent all malicious input
**Effort**: Low (1-2 hours)
**Risk**: Medium - may miss edge cases

**Implementation**:
```typescript
function validateModifier(modifier: { type: string; value: string }) {
  if (!modifier.value || modifier.value.length > 100) {
    throw new Error('Invalid modifier length');
  }
  if (!/^[a-zA-Z0-9\s\-]+$/.test(modifier.value)) {
    throw new Error('Invalid modifier characters');
  }
}
```

### Option C: Database Whitelist Check
**Pros**: Uses existing data, no hardcoded lists
**Cons**: Database query overhead, doesn't prevent DoS
**Effort**: Low (1-2 hours)
**Risk**: Medium - still vulnerable to length attacks

---

## Recommended Action

**Option A** - Implement Zod schema validation with whitelist:

1. Create `ModifierSchema` in `server/src/ai/functions/schemas/modifier.schema.ts`
2. Add validation to `lookupModifierPrices()` before database query
3. Update `add_to_order` tool to validate `_args.modifiers` array
4. Add unit tests for validation edge cases
5. Document valid modifier patterns in API docs
6. Add error logging for rejected inputs (potential security monitoring)

---

## Technical Details

### Affected Files
- `server/src/ai/functions/realtime-menu-tools.ts` (primary fix)
- `server/src/ai/functions/schemas/modifier.schema.ts` (new file)
- `server/src/ai/functions/__tests__/realtime-menu-tools.test.ts` (add tests)

### Validation Rules
```typescript
// Allowed modifier types (from menu system)
type: 'size' | 'temperature' | 'preparation' | 'addon'

// Value constraints
- Min length: 1 character
- Max length: 50 characters
- Pattern: alphanumeric, spaces, hyphens only
- No special characters: <>{}[]|;:'"=
```

### Error Handling
```typescript
try {
  const validated = ModifierSchema.parse(modifier);
} catch (error) {
  logger.warn('Invalid modifier input rejected', {
    modifier,
    error: error.message,
    restaurantId
  });
  // Don't include modifier in order
  continue;
}
```

---

## Acceptance Criteria

- [ ] Zod schema created for modifier validation
- [ ] `lookupModifierPrices()` validates all inputs before database query
- [ ] `add_to_order` tool validates `_args.modifiers` parameter
- [ ] Max length enforced (50 characters)
- [ ] Character whitelist enforced (alphanumeric + spaces + hyphens)
- [ ] Invalid inputs logged for security monitoring
- [ ] Unit tests cover: valid modifiers, too long, invalid chars, SQL injection attempts
- [ ] Manual test: voice order with modifiers works correctly
- [ ] Manual test: malformed modifier input is rejected gracefully

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From code review security analysis |

---

## Resources

- [Prisma SQL Injection Prevention](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#sql-injection)
- [Zod Schema Validation](https://zod.dev/)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
