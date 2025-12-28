---
status: ready
priority: p2
issue_id: "005"
tags: [configuration, ux, restaurant-config]
dependencies: []
---

# Hardcoded Estimated Time "15-20 minutes"

## Problem Statement
The estimated order time "15-20 minutes" is hardcoded in the checkout page. Different restaurants have different preparation times, and this should be configurable per restaurant.

## Findings
- Location: `client/src/pages/CheckoutPage.tsx:114,201`
- Hardcoded string "15-20 minutes"
- Same value in 2 places
- Misleading for restaurants with different prep times

## Proposed Solutions

### Option 1: Restaurant configuration setting
- **Pros**: Each restaurant can set their own time
- **Cons**: Requires database field
- **Effort**: Medium
- **Risk**: Low

### Option 2: Environment variable
- **Pros**: Simple, quick to implement
- **Cons**: Same for all restaurants
- **Effort**: Small
- **Risk**: Low

## Recommended Action
Add to restaurant configuration in database. For quick fix, use environment variable with default.

## Technical Details
- **Affected Files**: `client/src/pages/CheckoutPage.tsx`, restaurant config
- **Related Components**: Checkout flow, restaurant settings
- **Database Changes**: Optional - add `estimated_prep_time` to restaurant config

## Acceptance Criteria
- [ ] Estimated time is configurable
- [ ] Default value maintained for backwards compatibility
- [ ] Both occurrences updated
- [ ] Consider range format (e.g., "15-20 min" vs "20 min")

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- UX/configuration issue identified during testing
- Status set to ready
- Priority P2 - customer-facing but not critical

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P1
