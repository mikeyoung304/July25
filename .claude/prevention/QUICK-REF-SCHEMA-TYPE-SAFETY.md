# Schema-Type Safety Quick Reference

**Use this during code review and development.** Full details: [CHECKLIST-SCHEMA-TYPE-SAFETY.md](./CHECKLIST-SCHEMA-TYPE-SAFETY.md)

---

## Red Flags (Stop and Review)

| Red Flag | What's Wrong | Quick Fix |
|----------|-------------|-----------|
| API returns `capacity`, type expects `seats` | Field mismatch | Rename field consistently across all layers |
| `as any` with no comment | Unchecked assertion | Add TODO comment or use union type |
| Field renamed in DB but not in shared types | Schema drift | Update all usages: `grep -r "old_field"` |
| No validation on payment/financial data | Accepts invalid values | Add `validatePaymentStatus()` function |
| Transformation has no tests | Silently broken | Add unit test with round-trip check |

---

## Code Review Checklist (2 minutes)

### Schema Alignment
- [ ] Database field name = Shared type field name OR clearly documented transformation
- [ ] API returns field name that matches shared types
- [ ] Type comments explain any DB ↔ API field mapping

**Example Check:**
```typescript
// In shared/types/table.types.ts
export interface Table {
  seats: number;    // ✓ Clear what this is
  x: number;       // ✓ Comment explains "stored as x_pos in DB"
}

// In server API route - verify it returns these exact fields
const transformed = data.map(row => ({
  seats: row.seats,  // ✓ Matches type
  x: row.x_pos,     // ✓ Same as type (transformed)
}));
```

### Type Safety
- [ ] No new `as any` without TODO comment
- [ ] If `as any` exists, TODO says why and when to remove
- [ ] Complex transformations use mapping functions, not inline assertions

**Example Check:**
```typescript
// ❌ Bad: Undocumented
paymentStatus: order.payment_status as any

// ✅ Good: Documented with reason
// TODO-XXX: Remove when payment_status enum is finalized
paymentStatus: order.payment_status as 'pending' | 'completed'

// ✅ Better: Use function
paymentStatus: mapPaymentStatus(order.payment_status)
```

---

## Testing Checklist (Before Commit)

```bash
# 1. Type check
npm run typecheck:quick

# 2. Run transformer tests
npm run test -- transformers.test.ts

# 3. Check for new `as any` without docs
grep -r "as any" shared/types | grep -v TODO

# 4. Build to catch issues
npm run build
```

---

## Pattern Reference

### Field Transformation Pattern

```typescript
// ✓ CORRECT: Database → API field transformation documented

export interface Table {
  seats: number;     // No transform: same as DB
  x: number;        // Transform: stored as x_pos in DB
  y: number;        // Transform: stored as y_pos in DB
  type: TableShape; // Transform: stored as shape in DB
}

// API Route (server/src/routes/tables.routes.ts)
const transformedData = data.map(table => ({
  seats: table.seats,        // Keep as-is
  x: table['x_pos'],        // Explicit transform
  y: table['y_pos'],        // Explicit transform
  type: table['shape'],     // Explicit transform
}));
```

### Type Assertion Pattern

```typescript
// ❌ WRONG: Using `as any`
paymentStatus: order.payment_status as any

// ✓ RIGHT: Union type with all valid values
paymentStatus: order.payment_status === 'paid'
  ? 'completed'
  : (order.payment_status as 'pending' | 'failed' | 'refunded')

// ✓ BEST: Mapping function (reusable)
function mapPaymentStatus(status: DB_Status): Client_Status {
  const map: Record<DB_Status, Client_Status> = {
    'paid': 'completed',
    'pending': 'pending',
    'processing': 'processing',
    'failed': 'failed',
    'refunded': 'refunded'
  };
  return map[status];
}
```

### Validation Pattern

```typescript
// For safety-critical data (payments, quantities, etc.)

function validatePaymentStatus(value: unknown): PaymentStatus {
  const valid = ['pending', 'processing', 'completed', 'failed', 'refunded'];
  if (!valid.includes(String(value))) {
    throw new TypeTransformationError(
      `Invalid payment status: ${value}`,
      'payment_status',
      value
    );
  }
  return value as PaymentStatus;
}

// Usage
try {
  const status = validatePaymentStatus(order.payment_status);
  // Now safely use status
} catch (error) {
  logger.error('Invalid payment status', { error, order });
  // Handle gracefully
}
```

---

## Common Mistakes (Avoid These)

1. **Field renamed in one place but not all**
   ```typescript
   // ❌ Database has seats, but API returns capacity
   const table = {
     capacity: row.seats  // Wrong field name!
   };
   // Fix: Use capacity everywhere or seats everywhere
   ```

2. **`as any` left in production**
   ```typescript
   // ❌ No reason given
   const x = value as any;
   // Fix: Add TODO and specific type union
   const x = value as 'option1' | 'option2'; // TODO-XXX: Replace when fixed
   ```

3. **Transformation not tested for round-trip**
   ```typescript
   // ❌ No test that data survives round-trip
   // Fix: Test shared → client → shared preserves data
   it('survives round-trip', () => {
     const original = createMockOrder();
     const transformed = toClient(original);
     const backToShared = toShared(transformed);
     expect(backToShared).toEqual(original);
   });
   ```

4. **No validation on type boundaries**
   ```typescript
   // ❌ Invalid values slip through
   return { paymentStatus: data.payment_status as any };
   // Fix: Validate before using
   if (!validStatuses.includes(data.payment_status)) {
     throw new Error('Invalid status');
   }
   ```

---

## Things to Know

- **TypeScript Strict Mode:** Enforced in tsconfig.base.json (strict: true)
- **CLAUDE.md Rule:** "No `any`, no type assertions without reason"
- **Commit 0728e1ee:** Fixed both issues (TODO-142, TODO-143)
- **Project Standard:** Snake case everywhere (db, API, types)

---

## When to Escalate

Contact reviewer if:
- Unsure whether a type assertion needs documentation
- Field transformation required but unclear how to document
- Test cases don't catch a schema mismatch
- Type validation logic is complex

---

## Related Documents

- [CHECKLIST-SCHEMA-TYPE-SAFETY.md](./CHECKLIST-SCHEMA-TYPE-SAFETY.md) - Full prevention framework
- [CODE-PATTERNS-REFERENCE.md](./CODE-PATTERNS-REFERENCE.md) - Complete code examples
- [CLAUDE.md](../CLAUDE.md) - Type system rules
- TypeScript strict mode docs: https://www.typescriptlang.org/tsconfig#strict

---

**Last Updated:** 2025-12-03
**Based On:** TODO-142 (Table Schema Mismatch), TODO-143 (Type Assertions)
