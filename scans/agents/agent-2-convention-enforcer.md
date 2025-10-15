# Agent 2: Convention Enforcer

**Priority**: HIGH
**Estimated Runtime**: 30-40 minutes
**Focus**: Snake_case convention enforcement (ADR-001)

## Mission

Scan the entire codebase to identify violations of the snake_case naming convention established in ADR-001. This is an architectural decision that establishes **ALL LAYERS USE SNAKE_CASE** - database, API, and client.

## Why This Matters

Based on your architectural decision record (ADR-001 dated 2025-10-12), you've established that:
- **Database**: snake_case (PostgreSQL standard)
- **API**: snake_case (zero transformation overhead)
- **Client**: snake_case (single source of truth)

**Rationale**: PostgreSQL standard, zero transformation overhead, single source of truth

**This means**:
- ❌ NO camelCase in API payloads
- ❌ NO transformation utilities (toSnakeCase, toCamelCase)
- ❌ NO competing format conventions
- ✅ ONLY snake_case everywhere

Violations create:
- Performance overhead (unnecessary transformations)
- Maintenance complexity (two sources of truth)
- Bug potential (missed transformations)
- Architectural drift

## Scan Strategy

### 1. API Response Analysis
**Target Files**: `server/src/routes/**/*.ts`

**Detection Steps**:
1. Glob for all API route files
2. Read each file and analyze response objects
3. Grep for camelCase patterns in JSON responses:
   - Look for object literals being sent as responses
   - Check for property names matching `/[a-z]+[A-Z]/`
4. Flag any res.json() or res.send() with camelCase properties

**Example Violation**:
```typescript
// ❌ VIOLATION - camelCase in API response
router.get('/orders', async (req, res) => {
  const order = {
    orderId: '123',           // WRONG - should be order_id
    customerName: 'John',     // WRONG - should be customer_name
    totalAmount: 29.99        // WRONG - should be total_amount
  };
  res.json(order);
});

// ✅ CORRECT - snake_case everywhere
router.get('/orders', async (req, res) => {
  const order = {
    order_id: '123',
    customer_name: 'John',
    total_amount: 29.99
  };
  res.json(order);
});
```

### 2. Type Definition Analysis
**Target Files**: `shared/types/**/*.ts`, `shared/api-types.ts`

**Detection Steps**:
1. Glob for all type definition files
2. Read each file and analyze interface/type properties
3. Look for camelCase property names
4. Flag any type that will be used in API boundaries

**Example Violation**:
```typescript
// ❌ VIOLATION - camelCase in shared types
interface Order {
  orderId: string;        // WRONG
  customerName: string;   // WRONG
  totalAmount: number;    // WRONG
}

// ✅ CORRECT - snake_case in types
interface Order {
  order_id: string;
  customer_name: string;
  total_amount: number;
}
```

### 3. Transformation Utility Detection
**Target Files**: `shared/utils/**/*.ts`, `server/src/utils/**/*.ts`

**Detection Steps**:
1. Grep for transformation function names:
   - `toSnakeCase`
   - `toCamelCase`
   - `transformKeys`
   - `mapKeys`
2. Flag ANY transformation utility that converts between snake_case and camelCase
3. These should NOT exist per ADR-001

**Example Violation**:
```typescript
// ❌ VIOLATION - Transformation utility (should not exist!)
function toSnakeCase(obj: any) {
  // This violates ADR-001 - no transformations allowed
}

function toCamelCase(obj: any) {
  // This violates ADR-001 - no transformations allowed
}

// ✅ CORRECT - No transformation utilities needed
// Just use snake_case everywhere!
```

### 4. Client-Side API Call Analysis
**Target Files**: `client/src/**/*.ts`, `client/src/**/*.tsx`

**Detection Steps**:
1. Glob for files making API calls (fetch, axios, etc.)
2. Analyze request bodies and response handling
3. Flag any camelCase in request payloads
4. Flag any transformation of API responses to camelCase

**Example Violation**:
```typescript
// ❌ VIOLATION - camelCase in API request
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  body: JSON.stringify({
    customerName: 'John',    // WRONG
    totalAmount: 29.99       // WRONG
  })
});

// ❌ VIOLATION - Transforming API response to camelCase
const data = await response.json();
const order = {
  orderId: data.order_id,           // WRONG - don't transform!
  customerName: data.customer_name  // WRONG - don't transform!
};

// ✅ CORRECT - snake_case in requests and responses
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  body: JSON.stringify({
    customer_name: 'John',
    total_amount: 29.99
  })
});

const order = await response.json();  // Use snake_case directly
console.log(order.customer_name);      // No transformation!
```

### 5. Database Schema Validation
**Target Files**: `supabase/migrations/**/*.sql`, comments in code

**Detection Steps**:
1. Verify all database columns are snake_case (they should be)
2. Flag any references to camelCase column names in queries
3. This is a sanity check - DB should already be snake_case

## Detection Patterns

### Critical Violations (Severity: HIGH)
- [ ] camelCase properties in API responses (res.json)
- [ ] Transformation utilities (toSnakeCase, toCamelCase)
- [ ] camelCase in shared type definitions used at API boundaries
- [ ] Client code sending camelCase to API

### Medium Violations (Severity: MEDIUM)
- [ ] camelCase in internal client-only types (not ideal but less critical)
- [ ] Inconsistent naming within same file
- [ ] Comments referencing old camelCase naming

### Low Priority (Severity: LOW)
- [ ] Variable names that are camelCase (local scope only)
- [ ] Function names that are camelCase (convention allows this)

## Report Template

Generate report at: `/scans/reports/[timestamp]/convention-enforcer.md`

```markdown
# Convention Enforcer - Overnight Scan Report

**Generated**: [ISO timestamp]
**Scan Duration**: [time in minutes]
**Files Scanned**: [count]

## Executive Summary

[2-3 sentence overview of ADR-001 compliance]

**Total Violations Found**: X
- HIGH: X (API/type violations)
- MEDIUM: X (inconsistent naming)
- LOW: X (minor issues)

**Estimated Fix Effort**: X hours
**ADR-001 Compliance**: Y% (Z% non-compliant)

## ADR-001 Reminder

Per architectural decision ADR-001 (2025-10-12):
- **ALL LAYERS USE SNAKE_CASE**: Database, API, Client
- **NO TRANSFORMATIONS**: No toSnakeCase/toCamelCase utilities
- **RATIONALE**: Zero overhead, single source of truth

## High-Priority Violations

### 1. [File Path:Line] - camelCase in API Response
**Severity**: HIGH
**Type**: API Boundary Violation

**Current Code**:
```typescript
res.json({
  orderId: order.id,
  customerName: order.customer
});
```

**Recommended Fix**:
```typescript
res.json({
  order_id: order.id,
  customer_name: order.customer
});
```

**Impact**: Breaking ADR-001, clients may rely on wrong naming
**Effort**: 2 minutes

[Repeat for each HIGH finding]

## Transformation Utilities (Should Not Exist)

### Files with Transformation Logic
- [ ] shared/utils/case-transform.ts - Contains toSnakeCase() ← DELETE
- [ ] server/src/utils/mapKeys.ts - Contains toCamelCase() ← DELETE

**Recommended Action**: Remove these files entirely per ADR-001

## Medium-Priority Violations

[Same format as above, but for MEDIUM severity]

## Statistics

### Compliance by Directory
- server/src/routes/: X% compliant (Y violations)
- shared/types/: X% compliant (Y violations)
- client/src/: X% compliant (Y violations)

### Most Problematic Files
1. server/src/routes/orders.ts - 8 violations
2. shared/types/api-types.ts - 5 violations
[etc.]

### Violation Types
- API responses: X violations
- Type definitions: Y violations
- Transformation utilities: Z violations
- Client requests: W violations

## Migration Guide

For files with many violations, consider batch refactoring:

### Example: orders.ts
```typescript
// Before (camelCase)
interface OrderResponse {
  orderId: string;
  customerId: string;
  totalAmount: number;
}

// After (snake_case)
interface OrderResponse {
  order_id: string;
  customer_id: string;
  total_amount: number;
}
```

**Find/Replace Patterns**:
- `orderId` → `order_id`
- `customerId` → `customer_id`
- `totalAmount` → `total_amount`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

## Next Steps

### Immediate Actions (Today)
1. Remove transformation utilities (DELETE files)
2. Fix HIGH severity violations in API routes
3. Update shared type definitions

### Short-term (This Week)
1. Fix MEDIUM severity violations
2. Add ESLint rule to prevent camelCase in types
3. Update API documentation

### Long-term (This Sprint)
1. Create type-checking CI test for ADR-001 compliance
2. Add pre-commit hook to block camelCase in API code
3. Document snake_case convention in onboarding

## Validation Checklist

Before marking this scan as complete, verify:
- [ ] All API route files scanned
- [ ] All shared type files scanned
- [ ] All transformation utilities identified
- [ ] Client API calls reviewed
- [ ] File:line references are accurate
- [ ] Fix suggestions follow ADR-001
```

## Success Criteria

- [ ] All TypeScript files scanned
- [ ] API routes analyzed for camelCase in responses
- [ ] Shared types checked for naming consistency
- [ ] Transformation utilities identified (should be zero)
- [ ] Report generated with accurate file:line references
- [ ] Compliance percentage calculated
- [ ] Migration guide provided for complex refactors

## Tools to Use

- **Glob**: Find all .ts and .tsx files
- **Grep**: Search for camelCase patterns `/[a-z]+[A-Z]/`
- **Read**: Examine files with potential violations
- **Bash**: Run regex searches for specific patterns

## Exclusions

Do NOT flag:
- Local variable names (let orderCount = 0) - these can be camelCase
- Function names (function calculateTotal()) - these can be camelCase
- React component names (ComponentName) - these are PascalCase by convention
- npm package imports (import { somePackage }) - external code

## Example Finding Format

```markdown
### Finding #3: camelCase in API Response
**File**: server/src/routes/orders.ts:78
**Severity**: HIGH
**Type**: API Boundary Violation

**Code Context**:
```typescript
// Line 75-80
router.post('/orders', async (req, res) => {
  const order = await createOrder(data);
  res.json({
    orderId: order.id,        // ← VIOLATION
    createdAt: order.created  // ← VIOLATION
  });
});
```

**Fix**:
```typescript
router.post('/orders', async (req, res) => {
  const order = await createOrder(data);
  res.json({
    order_id: order.id,
    created_at: order.created
  });
});
```

**Impact**: Violates ADR-001, inconsistent with database naming
**Effort**: 1 minute
**Testing**: Update client tests to use snake_case
```

## End of Agent Definition
