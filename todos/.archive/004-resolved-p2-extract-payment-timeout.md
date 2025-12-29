---
status: resolved
priority: p2
issue_id: "004"
tags: [configuration, payments, maintainability]
dependencies: []
---

# Hardcoded 30-Second Timeout in Payment Routes

## Problem Statement
The 30-second timeout value (30000ms) is hardcoded in 6 places in `payments.routes.ts`. This makes it difficult to configure for different environments or adjust based on operational needs.

## Findings
- Location: `server/src/routes/payments.routes.ts` (6 occurrences)
- Hardcoded `30000` timeout value
- No environment variable or config option
- Same value repeated, violates DRY principle

## Proposed Solutions

### Option 1: Extract to environment variable with default
- **Pros**: Configurable per environment, single source of truth
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
const PAYMENT_TIMEOUT_MS = parseInt(process.env.PAYMENT_TIMEOUT_MS || '30000', 10);

// Use PAYMENT_TIMEOUT_MS instead of hardcoded 30000
```

## Recommended Action
Create a config constant for payment timeout, use environment variable with sensible default.

## Technical Details
- **Affected Files**: `server/src/routes/payments.routes.ts`
- **Related Components**: Payment processing, configuration
- **Database Changes**: No

## Acceptance Criteria
- [ ] Timeout extracted to config/environment variable
- [ ] All 6 occurrences use the constant
- [ ] Default value maintained (30000ms)
- [ ] Documentation updated

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- Maintainability issue identified during testing
- Status set to ready
- Priority P2 - important but not urgent

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P2
