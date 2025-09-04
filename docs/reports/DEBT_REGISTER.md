# Technical Debt Register

## Critical (P0)
None - RLS issue resolved! ✅

## High Priority (P1)
1. **Incomplete user-scoped client adoption**
   - Impact: Security/tenant isolation
   - Effort: Medium (2-3 hours)
   - Files: payments.routes.ts, terminal.routes.ts, users.routes.ts
   
2. **Missing requireScopes middleware**
   - Impact: Authorization granularity
   - Effort: Low (1 hour)
   - Status: Commented out in users.routes.ts

## Medium Priority (P2)
1. **PIN authentication route**
   - Impact: UX for staff
   - Effort: Low (1 hour)
   - Status: PINs seeded, route exists but untested

2. **Station tokens implementation**
   - Impact: Shared device auth
   - Effort: Medium (2-3 hours)
   - Status: Table exists, no implementation

3. **Service consolidation**
   - Impact: Code maintainability
   - Effort: High (1-2 days)
   - Note: Many services still use admin client directly

## Low Priority (P3)
1. **TypeScript errors (~500 remaining)**
   - Impact: Developer experience
   - Effort: Medium (4-6 hours)
   - Status: Non-blocking, gradual fix

2. **Test coverage (60% target)**
   - Impact: Reliability
   - Effort: High (2-3 days)
   - Current: Unknown

3. **Bundle size optimization**
   - Impact: Performance
   - Effort: Medium (2-4 hours)
   - Target: <100KB main chunk

## Quick Wins
✅ RLS policies fixed - no JWT claims needed
✅ Tables route working with user clients
✅ Orders route/service refactored
✅ All test users can authenticate
✅ Membership-based tenant isolation working