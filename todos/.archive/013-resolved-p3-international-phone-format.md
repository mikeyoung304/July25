---
status: resolved
priority: p3
issue_id: "013"
tags: [ux, internationalization, validation]
dependencies: []
---

# Phone Format Doesn't Support International

## Problem Statement
Phone number input only supports US format. International customers cannot enter their phone numbers correctly.

## Findings
- Location: `client/src/pages/CheckoutPage.tsx:73`
- Hardcoded US phone format
- No country code support
- Validation fails for international numbers

## Proposed Solutions

### Option 1: Use libphonenumber or similar
- **Pros**: Proper international support
- **Cons**: Additional dependency
- **Effort**: Medium
- **Risk**: Low

### Option 2: Accept any format
- **Pros**: Simple, no new deps
- **Cons**: Less validation
- **Effort**: Small
- **Risk**: Low

## Recommended Action
For MVP, relax validation to accept more formats. Long-term, add proper international phone library.

## Technical Details
- **Affected Files**: `CheckoutPage.tsx`, validation logic
- **Related Components**: Form validation
- **Database Changes**: No

## Acceptance Criteria
- [ ] International phone numbers accepted
- [ ] Basic format validation maintained
- [ ] User-friendly error messages

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- i18n issue identified during testing
- Status set to ready
- Priority P3 - nice to have for broader user base

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P11
