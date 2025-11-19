# 🚀 AI-Optimized Production Deployment Plan

**Last Updated:** 2025-10-31

## Executive Summary
**Current State:** 65-70% complete | 73% test pass rate (314/430 tests)
**Target State:** 95%+ test pass rate | Production deployment
**Timeline:** 30-40 hours total (can be parallelized to ~15-20 hours)
**Critical Path:** Payment Configuration → Test Restoration → E2E Validation → Production

---

## PHASE 1: CRITICAL BLOCKERS [4-6 hours]
**Objective:** Fix payment system and verify security
**Can run 3 agents in parallel**

### Agent A: Payment System Configuration
1. Configure Square API in `.env`:
   - Add `SQUARE_ACCESS_TOKEN` (sandbox first)
   - Add `SQUARE_ENVIRONMENT=sandbox`
   - Add `SQUARE_LOCATION_ID`

2. Test payment endpoint:
   ```bash
   ./scripts/validate-square-credentials.sh
   curl -X POST http://localhost:3001/api/v1/payments/create \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"amount": 100, "source_id": "cnon:card-nonce-ok", "order_id": "test-order-id"}'
   ```
   **Success:** Returns 200 with payment confirmation

### Agent B: Security Verification
1. Run security test suite:
   ```bash
   cd server && npm test tests/security/*.test.ts
   ```
2. Verify multi-tenancy (already fixed):
   ```bash
   npm test tests/multi-tenancy.test.ts
   ```
   **Success:** All 24 multi-tenancy tests pass

### Agent C: Monitoring Setup
1. Configure error tracking (Sentry/LogRocket)
2. Set up performance monitoring
3. Create health check endpoint at `/api/health`

**Exit Criteria:** Payment returns 200, all security tests pass, monitoring active

---

## PHASE 2: TEST RESTORATION [16-20 hours]
**Objective:** Restore quarantined tests to reach 85%+ pass rate
**Can run 3 agents in parallel**

### Agent D: Quick Wins [4 hours] - Restores 42 tests
1. Add MediaRecorder polyfill to `client/test/setup.ts`:
   ```javascript
   // Restores 30 voice-related tests
   import 'mock-media-recorder';
   ```

2. Fix timer/async issues in tests:
   ```javascript
   // Add to test setup
   beforeEach(() => {
     vi.useFakeTimers();
   });
   afterEach(() => {
     vi.runOnlyPendingTimers();
     vi.useRealTimers();
   });
   ```
   **Target Files:** AuthContext.test.tsx, ElapsedTimer.test.tsx (12 tests)

### Agent E: Context Fixes [8 hours] - Restores 40 tests
1. Fix UnifiedCartContext mocking:
   - Update mock exports in `client/src/modules/order-system/context/CartContext.tsx`
   - Export both `useCart` hook and `CartContext` provider

2. Target files to fix:
   - checkout-simple.test.tsx
   - checkout.e2e.test.tsx
   - CartContext.test.tsx
   - CheckoutPage.demo.test.tsx

### Agent F: Component API Updates [8 hours] - Restores 25 tests
1. Update test props to match component signatures
2. Target files:
   - KDSOrderCard.test.tsx
   - OrderCard.test.tsx
   - Review component prop types and update tests

**Exit Criteria:** 85% test pass rate (365/430 tests)

---

## PHASE 3: PRODUCTION READINESS [8-10 hours]
**Objective:** E2E testing, performance validation, deployment prep
**Sequential execution required**

### Task 1: E2E Test Suite [4 hours]
1. Run full E2E suite:
   ```bash
   npm run test:e2e
   ```
2. Fix any failing E2E tests
3. Add critical path tests if missing

### Task 2: Performance Testing [2 hours]
1. Load test with 100 concurrent users:
   ```bash
   npx artillery quick --count 100 --num 1000 http://localhost:3001
   ```
2. Verify response times < 200ms for critical paths
3. Check memory usage remains stable

### Task 3: Build & Bundle Validation [2 hours]
1. Production build:
   ```bash
   npm run build
   npm run build:server
   ```
2. Bundle size check:
   ```bash
   npm run analyze
   ```
3. Verify no build errors

**Exit Criteria:** All E2E tests pass, performance targets met, clean build

---

## PHASE 4: DEPLOYMENT [2-4 hours]
**Objective:** Deploy to production with rollback capability

### Task 1: Staging Deployment [1 hour]
1. Deploy to staging:
   ```bash
   git push staging fix/stability-audit-completion:main
   ```
2. Run smoke tests on staging
3. Verify all integrations work

### Task 2: Production Deployment [1 hour]
1. Create deployment PR:
   ```bash
   gh pr create --base main --title "fix: production deployment v6.0.14"
   ```
2. Deploy with feature flags:
   - Enable for 10% of traffic first
   - Monitor for 30 minutes
   - Gradual rollout to 100%

### Task 3: Post-Deployment [1 hour]
1. Monitor error rates
2. Check performance metrics
3. Document deployment in CHANGELOG.md

**Exit Criteria:** Production deployment successful, error rate < 0.1%

---

## Risk Mitigation

### High Risk Items:
1. **Payment Integration Failure**
   - Mitigation: Test in sandbox first
   - Rollback: Use demo mode flag

2. **Performance Degradation**
   - Mitigation: Gradual rollout with monitoring
   - Rollback: Feature flags for instant revert

3. **Database Migration Issues**
   - Mitigation: Backup before deployment
   - Rollback: Restore from backup

---

## Parallel Execution Strategy

**Optimal parallelization (3 AI agents):**
- Phase 1: 3 agents parallel = 2 hours real time
- Phase 2: 3 agents parallel = 6-7 hours real time
- Phase 3: Sequential = 8-10 hours
- Phase 4: Sequential = 2-4 hours

**Total: ~18-23 hours with parallelization**

---

## TodoWrite Integration Points

Each phase start should update TodoWrite with:
- Phase tasks as todo items
- Mark items in_progress when starting
- Mark completed when verified
- Track blockers as separate items

---

## Verification Commands

After each phase, run:
```bash
# Test suite status
npm test -- --reporter=json > test-results.json

# Count passing tests
cat test-results.json | jq '.numPassedTests'

# Check for critical failures
npm test -- tests/critical-path.test.ts
```

---

## Progress Tracking

### Phase 1 Status: NOT STARTED
- [ ] Payment Configuration
- [ ] Security Verification
- [ ] Monitoring Setup

### Phase 2 Status: NOT STARTED
- [ ] MediaRecorder Polyfill (30 tests)
- [ ] Timer/Async Fixes (12 tests)
- [ ] Context Mocking Fixes (40 tests)
- [ ] Component API Updates (25 tests)

### Phase 3 Status: NOT STARTED
- [ ] E2E Test Suite
- [ ] Performance Testing
- [ ] Build Validation

### Phase 4 Status: NOT STARTED
- [ ] Staging Deployment
- [ ] Production Deployment
- [ ] Post-Deployment Monitoring

This plan is optimized for AI execution with specific commands, file paths, and parallel execution opportunities.