# TODO/FIXME Scan Summary

**Scan Date:** 2025-11-07
**Last Updated:** 2025-11-28
**Total Issues Found:** 26 (original) → 22 remaining
**Total Estimated Effort:** 51-82 developer days → ~40-65 remaining

---

## 2025-11-28 Audit Update

### Resolved Items (4 items closed)
| Item | Resolution | Commit |
|------|------------|--------|
| P0: Temporary Debug Code | ✅ Removed autofill from CheckoutPage, KioskCheckoutPage | eda61d1d |
| P0: Auth Test Failures | ✅ Fixed integration test (added required item fields) | eda61d1d |
| P1: Cache Clearing | ✅ Implemented clearAllCachesForRestaurantSwitch() | eda61d1d |
| Tests: AuthContext timeout | ✅ Fixed concurrent refresh test | eda61d1d |

### Current Status Summary
| Priority | Original | Resolved | Remaining |
|----------|----------|----------|-----------|
| P0 - Critical | 4 | 2 | 2 |
| P1 - High | 8 | 1 | 7 |
| P2 - Medium | 6 | 0 | 6 |
| P3 - Low | 3 | 0 | 3 |
| Tests | 5 | 1 | 4 |

---

## Quick Statistics

### By Priority
| Priority | Count | Effort (days) | Description |
|----------|-------|---------------|-------------|
| P0 - Critical | 2 | 5-8 | Must fix before production |
| P1 - High | 7 | 15-25 | Important features & security |
| P2 - Medium | 6 | 13-21 | Technical debt & enhancements |
| P3 - Low | 3 | 4.5-7.5 | Nice to have improvements |
| Tests | 4 | 5-8 | Test coverage gaps |

### By Category
| Category | Count | Top Issues |
|----------|-------|------------|
| Security | 4 | restaurant_id enforcement, kiosk_demo deprecation |
| Features | 9 | Notifications, real-time updates, monitoring |
| Cleanup | 3 | Debug code removal, deprecated code |
| Tests | 6 | Skipped E2E tests, failing unit tests |
| Refactoring | 4 | Type safety, station assignment |

### By Component
| Component | Count | Critical Issues |
|-----------|-------|-----------------|
| Authentication | 3 | Test failures, token validation |
| Orders | 5 | Notifications, refund processing |
| Multi-tenant | 2 | Cache clearing, token isolation |
| Monitoring | 4 | Analytics endpoint, health checks |
| Kitchen | 2 | Station assignment, notifications |
| Cart | 1 | Item removal |

---

## Critical Issues (DO FIRST)

### 1. Authentication Test Failures
**Severity:** Critical
**Effort:** 3-5 days
**Impact:** Blocks customer and server roles from creating orders

**What's broken:**
- Customer role getting 403 instead of 201 when creating orders
- Server role getting 403 instead of 201 when creating orders
- kiosk_demo role not working with compatibility flag

**Files:**
- `/server/tests/routes/orders.auth.test.ts` (5 skipped tests)

**Action:** Investigate auth middleware and RBAC configuration

---

### 2. Security: restaurant_id Not Enforced
**Severity:** Critical
**Effort:** 3-5 days
**Impact:** Multi-tenant security vulnerability

**What's broken:**
- Tokens without restaurant_id are accepted
- STRICT_AUTH flag not enforcing requirement
- Potential cross-tenant data access

**Files:**
- `/server/tests/security/auth.proof.test.ts`
- `/server/tests/security/rbac.proof.test.ts`

**Action:** Enforce restaurant_id in all tokens, enable STRICT_AUTH

---

### 3. Remove Temporary Debug Code
**Severity:** Critical (Production Risk)
**Effort:** 0.5 days
**Impact:** Could confuse users if deployed to production

**What's wrong:**
- Checkout pages auto-fill demo customer data
- Marked as "TEMPORARY DEBUG"
- Should be removed or feature-flagged

**Files:**
- `/client/src/pages/CheckoutPage.tsx`
- `/client/src/components/kiosk/KioskCheckoutPage.tsx`

**Action:** Remove or gate behind VITE_ENABLE_DEBUG_AUTOFILL

---

### 4. STRICT_AUTH Flag Not Working
**Severity:** Critical
**Effort:** 2-3 days
**Impact:** Security configuration not enforced

**What's broken:**
- STRICT_AUTH environment variable exists but doesn't work
- Should reject tokens without restaurant_id
- Test for this is skipped

**Files:**
- `/server/tests/security/rbac.proof.test.ts`

**Action:** Fix STRICT_AUTH enforcement, enable test

---

## High Priority Issues (NEXT SPRINT)

### Missing Features (18-29 days total)

1. **Real-time Table Updates** (3-5 days)
   - Supabase channels for table status changes
   - `/server/src/services/table.service.ts`

2. **Kitchen Notifications** (2-3 days)
   - Notify KDS when orders confirmed
   - `/server/src/services/orderStateMachine.ts`

3. **Customer Notifications** (2-3 days)
   - Notify customers when orders ready
   - `/server/src/services/orderStateMachine.ts`

4. **Refund Processing** (2-3 days)
   - Automated refunds for cancelled orders
   - `/server/src/services/orderStateMachine.ts`

5. **Cache Clearing** (3-5 days)
   - Clear cache when switching restaurants
   - `/tests/e2e/multi-tenant.e2e.test.tsx`

6. **Monitoring Integration** (3-5 days)
   - Forward metrics to DataDog/New Relic
   - `/server/src/routes/metrics.ts`

7. **Health Checks** (2-3 days)
   - Database, Redis, AI service checks
   - `/server/src/routes/metrics.ts`

8. **Deprecated Code Removal** (2-3 days)
   - Remove kiosk_demo role
   - Multiple files

---

## Medium Priority Issues (BACKLOG)

1. **Analytics Endpoint** (3-5 days) - Create server endpoint for performance data
2. **Station Assignment** (2-3 days) - Move from keywords to menu metadata
3. **Cart Item Removal** (1-2 days) - Implement remove functionality
4. **Drive Thru Navigation** (1 day) - Add checkout navigation
5. **Rate Limit Testing** (1-2 days) - Reset mechanism for tests
6. **Menu Seed Script** (0.5 days) - Make restaurant ID configurable

---

## Test Issues (FIX WHEN TIME ALLOWS)

### Skipped Tests Requiring Investigation

| Test | File | Reason | Effort |
|------|------|--------|--------|
| Customer orders | orders.auth.test.ts | 403 instead of 201 | Part of critical #1 |
| Server orders | orders.auth.test.ts | 403 instead of 201 | Part of critical #1 |
| kiosk_demo orders | orders.auth.test.ts | 403 with flag enabled | Part of critical #1 |
| Auth refresh | AuthContext.test.tsx | Timeout after 30s | 1-2 days |
| restaurant_id | rbac.proof.test.ts | STRICT_AUTH not working | Part of critical #4 |
| Basic routes | basic-routes.spec.ts | Unconditionally skipped | 1 day |
| Voice control | voice-control.e2e.test.ts | Not investigated | 2-3 days |
| KDS smoke test | kitchen-display.smoke.spec.ts | Unknown | 1 day |
| Demo panel | workspace-landing.spec.ts | Env var required | 1-2 days |

**Total Test Effort:** 6-10 days

---

## Code Quality Issues

### Type Safety (2-3 days)
- 11 `@ts-ignore` / `@ts-expect-error` suppressions
- Need proper type definitions for:
  - WebSocket mocks
  - Chrome performance API
  - Lighthouse API

### Technical Debt
- Keyword-based station assignment (fragile)
- Order metadata not extracted
- Memory monitoring not integrated

---

## Recommendations

### Week 1-2 (Critical)
```
Priority: Fix blocking issues
- [ ] Fix authentication test failures (3-5 days)
- [ ] Enforce restaurant_id in tokens (3-5 days)
- [ ] Remove temporary debug code (0.5 days)
- [ ] Fix STRICT_AUTH enforcement (2-3 days)
Total: 9-14 days
```

### Week 3-4 (High - Features)
```
Priority: Core functionality
- [ ] Implement order notifications (6-9 days)
- [ ] Add real-time table updates (3-5 days)
- [ ] Setup monitoring integration (5-8 days)
Total: 14-22 days
```

### Week 5-6 (High - Infrastructure)
```
Priority: Multi-tenant & observability
- [ ] Implement cache clearing (3-5 days)
- [ ] Remove deprecated code (2-3 days)
- [ ] Create analytics endpoint (3-5 days)
Total: 8-13 days
```

### Week 7-8 (Medium)
```
Priority: UX improvements
- [ ] Complete cart functionality (1-2 days)
- [ ] Refactor station assignment (2-3 days)
- [ ] Fix drive-thru navigation (1 day)
- [ ] Fix test isolation (1-2 days)
Total: 5-8 days
```

### Ongoing (Low Priority)
```
Priority: Developer experience
- [ ] Type safety improvements (2-3 days)
- [ ] Extract order metadata (1-2 days)
- [ ] Memory monitoring (1-2 days)
- [ ] Script improvements (0.5 days)
Total: 4.5-7.5 days
```

---

## Files Created

1. **TODO_COMMENTS_ANALYSIS.md** - Detailed analysis of all TODO/FIXME comments
2. **GITHUB_ISSUES_TEMPLATE.md** - Ready-to-paste GitHub issue templates
3. **TODO_SCAN_SUMMARY.md** - This file (quick reference)

---

## Search Patterns Used

### Code Markers
- `TODO` - 30+ instances
- `FIXME` - 0 instances
- `HACK` - 0 instances
- `XXX` - 0 instances
- `BUG` - 0 instances (in comments)

### Test Markers
- `it.skip()` / `test.skip()` - 18 instances
- `describe.skip()` - 1 instance

### Code Quality
- `@ts-ignore` / `@ts-expect-error` - 11 instances
- `DEPRECATED` / `deprecated` - 6 instances
- `TEMPORARY` / `PLACEHOLDER` - 2 instances

### Debug Code
- `console.error` - 174+ instances (mostly in error handling)
- `TEMPORARY DEBUG` - 2 instances (needs removal)

---

## Next Steps

1. **Review this summary** with team
2. **Prioritize critical issues** (Week 1-2)
3. **Create GitHub issues** from templates
4. **Assign to sprints** based on effort estimates
5. **Track progress** against recommendations
6. **Re-scan periodically** to catch new TODOs

---

## Notes

- All file paths are absolute from project root
- Effort estimates are for single developer
- Many issues can be worked in parallel
- Some issues may uncover additional work
- Test failures may indicate production bugs
- Security issues should be addressed ASAP

---

## Contact

For questions about this analysis:
- Review detailed report: `TODO_COMMENTS_ANALYSIS.md`
- Check issue templates: `GITHUB_ISSUES_TEMPLATE.md`
- Scan performed: 2025-11-07
