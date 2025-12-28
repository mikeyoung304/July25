---
status: ready
priority: p2
issue_id: "231"
tags: [architecture, code-quality, dry, code-review]
dependencies: []
---

# Duplicate Tax Rate Fetching Logic

## Problem Statement
`PaymentService.getRestaurantTaxRate()` duplicates logic from `OrdersService.getRestaurantTaxRate()`, violating DRY principle and creating sync risk. The code even acknowledges this with a comment.

## Findings
- **Source**: Architecture Strategist Review (2025-12-28)
- **Location**: `server/src/services/payment.service.ts` lines 71-109
- **Evidence**: Comment in code acknowledges duplication

```typescript
// PaymentService line 71-109:
// Comment: "MUST match OrdersService.getRestaurantTaxRate() to ensure consistency"
private static async getRestaurantTaxRate(restaurantId: string): Promise<number> {
  // ... exact same logic as OrdersService
}
```

## Proposed Solutions

### Option 1: Import from OrdersService (Recommended)
- **Pros**: Single source of truth, no sync risk
- **Cons**: Adds dependency between services
- **Effort**: Small
- **Risk**: Low

```typescript
// In PaymentService:
import { OrdersService } from './orders.service';

// Replace private method with:
const taxRate = await OrdersService.getRestaurantTaxRate(restaurantId);
```

### Option 2: Extract to TaxService
- **Pros**: Clean separation, reusable
- **Cons**: Another service file
- **Effort**: Small
- **Risk**: Low

### Option 3: Extract to shared utility
- **Pros**: Usable by any service
- **Cons**: May be overkill for single use
- **Effort**: Small
- **Risk**: Low

## Recommended Action
Option 1 - Import from OrdersService to eliminate duplication with minimal change.

## Technical Details
- **Affected Files**: `server/src/services/payment.service.ts`
- **Related Components**: Order and payment calculations
- **Database Changes**: No

## Acceptance Criteria
- [ ] Single source of truth for tax rate fetching
- [ ] Payment calculations use same logic as order calculations
- [ ] ~40 lines of duplicate code removed
- [ ] Tests continue to pass

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Architecture Strategist Agent
**Actions:**
- Identified DRY violation with acknowledged comment
- Assessed as MEDIUM priority

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
