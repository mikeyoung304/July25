# TODO-225: Missing JSDoc on New Split Services

**Priority:** P3 (Minor - Documentation)
**Category:** Documentation
**Source:** Code Review - Architecture Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Observation

The newly split services have minimal JSDoc documentation:

```typescript
// error-reporter.ts
export class ErrorReporter {
  report(error: Error) { ... }  // What does this do? Where does it report?
}

// order-calculation.service.ts
export function calculateOrderTotal(items: OrderItem[]): number { ... }
// Missing: What does it include? Tax? Tips? Discounts?
```

## Recommendation

Add JSDoc for public APIs:

```typescript
/**
 * Reports errors to external monitoring services (Sentry, etc.)
 *
 * @param error - The error to report
 * @param context - Additional context for debugging
 * @returns void - Reporting is fire-and-forget
 *
 * @example
 * errorReporter.report(new AppError('Payment failed', 'PAYMENT_ERROR'));
 */
report(error: Error, context?: Record<string, unknown>): void { ... }
```

## Files Affected

- `shared/utils/error-reporter.ts`
- `shared/utils/error-recovery.ts`
- `server/src/services/orders/order-calculation.service.ts`
- `server/src/services/orders/order-validation.service.ts`

## Impact

- Documentation gap
- Onboarding friction
- IDE tooltip quality
