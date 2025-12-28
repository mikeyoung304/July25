---
status: ready
priority: p2
issue_id: "232"
tags: [typescript, type-safety, code-review]
dependencies: []
---

# Excessive `any` Type Usage in Payment Code

## Problem Statement
The payment service and email service use numerous `as any` casts for properties that already exist on the `Order` type. This violates CLAUDE.md's "TypeScript strict: No `any` without justification" rule.

## Findings
- **Source**: TypeScript Reviewer (2025-12-28)
- **Location**: Multiple files
- **Evidence**: 10+ unnecessary `any` casts

### payment.service.ts
| Line | Cast | Order Type Has |
|------|------|----------------|
| 121 | `(order as any).restaurant_id` | Yes - `restaurant_id: string` |
| 214 | `(order as any).status` | Yes - `status: OrderStatus` |
| 230 | `(order as any).payment_status` | Yes - `payment_status: PaymentStatus` |
| 360 | `const updateData: any = {...}` | Should have explicit type |

### email.service.ts
| Line | Cast | Issue |
|------|------|-------|
| 166 | `catch (error: any)` | Should use `unknown` |
| 194-213 | Multiple `(order as any)` | Order type has these fields |

## Proposed Solutions

### Option 1: Remove unnecessary casts (Recommended)
- **Pros**: Type-safe, catches errors at compile time
- **Cons**: May require fixing any actual type mismatches
- **Effort**: Small
- **Risk**: Low

```typescript
// Before:
const restaurantId = (order as any).restaurant_id;

// After:
const restaurantId = order.restaurant_id;
```

### Option 2: Fix type annotations
- **Pros**: Proper typing
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
// Before:
} catch (error: any) {

// After:
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
}
```

## Recommended Action
Remove all unnecessary `as any` casts and use `unknown` for caught errors.

## Technical Details
- **Affected Files**: `payment.service.ts`, `email.service.ts`
- **Related Components**: Payment processing, email notifications
- **Database Changes**: No

## Acceptance Criteria
- [ ] No unnecessary `as any` casts in payment code
- [ ] Error handlers use `unknown` instead of `any`
- [ ] `updateData` has explicit type definition
- [ ] TypeScript strict mode passes

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** TypeScript Reviewer Agent
**Actions:**
- Found 10+ `any` type violations
- Violations against CLAUDE.md TypeScript strict rule

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
