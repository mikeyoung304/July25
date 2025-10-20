# 🎯 Audit Action Checklist - Week by Week

**Start Date**: ____________
**Team Lead**: ____________
**Sprint**: ____________

---

## ⚡ Week 1 - Critical Fixes (P0)

### Database & Performance
- [ ] **[1h]** Add composite indexes to orders table
  - `CREATE INDEX idx_orders_restaurant_status_created ON orders(...)`
  - Test query performance before/after
  - Expected: 90% speedup on kitchen display queries

- [ ] **[2h]** Fix N+1 query in checkDuplicateLabel
  - File: `server/src/routes/tables.routes.ts:12-44`
  - Combine two queries into one
  - Test with 20+ tables

- [ ] **[3h]** Fix batch update inefficiency
  - File: `server/src/routes/tables.routes.ts:365-401`
  - Use PostgreSQL UPDATE FROM or Supabase upsert
  - Test with 50+ table updates

### Data Integrity
- [ ] **[4h]** Add transactions to order creation
  - File: `server/src/services/orders.service.ts:71-191`
  - Wrap in Supabase RPC transaction
  - Test rollback on partial failure

- [ ] **[5h]** Implement optimistic locking for orders
  - Add `version` column to orders table
  - Update WHERE clauses to check version
  - Test concurrent update scenarios

### Compliance & Security
- [ ] **[4h]** Fix hardcoded tax rate
  - Add `tax_rate` column to restaurants table
  - Migration with default 0.08
  - Update PaymentService to load from DB
  - Add admin UI for configuration

- [ ] **[5h]** Make payment audit logging mandatory
  - File: `server/src/services/payment.service.ts:156-200`
  - Fail payment if audit log fails
  - Add fallback logging
  - Set up monitoring alerts

### Critical Bugs
- [ ] **[1h]** Fix ElapsedTimer stale display
  - File: `client/src/components/shared/timers/ElapsedTimer.tsx:18-40`
  - Replace useMemo with useState + setInterval
  - Test timer updates every second

**Week 1 Total**: ~25 hours (5 days @ 5h/day focused work)

---

## 🔧 Week 2 - High Priority (P1)

### Code Cleanup
- [ ] **[3h]** Fix O(n²) algorithm in useTableGrouping
  - File: `client/src/hooks/useTableGrouping.ts:44-174`
  - Merge two-pass into single iteration
  - Benchmark before/after with 50 orders

- [ ] **[3h]** Combine redundant filters in kitchen hooks
  - File: `client/src/hooks/useKitchenOrdersOptimized.ts:19-62`
  - Single pass for all order categorization
  - Test with 100+ orders

- [ ] **[3h]** Fix memory leaks in useAsyncState
  - File: `client/src/hooks/useAsyncState.ts:35-50`
  - Add AbortController support
  - Test component unmount during async operation

### Authentication
- [ ] **[4h]** Fix auth state consistency bug
  - File: `client/src/contexts/AuthContext.tsx:171-233`
  - Implement rollback on partial failure
  - Add timeout for network issues

- [ ] **[3h]** Fix auto-refresh timer race condition
  - File: `client/src/contexts/AuthContext.tsx:507-543`
  - Remove refreshSession from dependencies
  - Use refs for function access

### Documentation
- [ ] **[5m]** Update React version in README
  - Change "React 19" to "React 18.3.1"
  - File: `README.md:7`

- [ ] **[5m]** Add missing order status to docs
  - Add 'picked-up' status
  - File: `docs/DEPLOYMENT.md:543-559`

- [ ] **[10m]** Sync package.json versions
  - Root: 6.0.8, Client: 6.0.6
  - Decide on versioning strategy

**Week 2 Total**: ~20 hours

---

## 🏗️ Week 3-4 - Refactoring (P1-P2)

### God Object Decomposition - Phase 1
- [ ] **[8h]** Start WebRTCVoiceClient refactoring
  - Extract AudioManager class
  - Extract TokenManager class
  - File: `client/src/modules/voice/services/WebRTCVoiceClient.ts`
  - Goal: Reduce to <500 lines

- [ ] **[8h]** Continue WebRTCVoiceClient refactoring
  - Extract StateManager class
  - Extract EventHandler pattern
  - Write unit tests for each component

### AI Module Consolidation
- [ ] **[6h]** Consolidate /ai and /voice directories
  - Merge duplicate OpenAI adapter implementations
  - Choose single implementation
  - Update all imports

- [ ] **[4h]** Extract business logic from AI module
  - Move cart operations to cart.service.ts
  - Move menu search to menu.service.ts
  - File: `server/src/ai/functions/realtime-menu-tools.ts`

- [ ] **[3h]** Remove AI bloat wrapper layers
  - Eliminate AIService (366 lines)
  - Call adapters directly from routes
  - Update route handlers

### Deprecated Code Migration
- [ ] **[4h]** Migrate from DemoAuthService
  - Find all DemoAuthService.getDemoToken() calls
  - Replace with AuthContext.loginAsDemo()
  - Remove deprecated service

- [ ] **[3h]** Migrate from roleHelpers
  - Replace getCustomerToken/getServerToken
  - Use AuthContext directly
  - Delete roleHelpers.ts

- [ ] **[4h]** Migrate from CartContext to UnifiedCartContext
  - Search for CartContext imports
  - Update to UnifiedCartContext
  - Remove old CartContext

**Week 3-4 Total**: ~40 hours (2 weeks)

---

## 📊 Week 5-8 - Technical Debt (Medium Priority)

### Type Safety Improvements
- [ ] **[16h]** Fix 'any' types in critical paths (Phase 1)
  - Auth modules (50 'any' → proper types)
  - Payment modules (30 'any' → proper types)
  - Orders modules (40 'any' → proper types)
  - Enable stricter TypeScript checks

- [ ] **[12h]** Fix 'any' types in critical paths (Phase 2)
  - Kitchen display modules
  - WebSocket modules
  - Voice modules

### Logging Standardization
- [ ] **[8h]** Remove console.log from production code (Phase 1)
  - Replace with logger service (50 files)
  - Add ESLint rule to prevent new console.log
  - Set up pre-commit hook

- [ ] **[8h]** Remove console.log from production code (Phase 2)
  - Continue replacement (50 files)
  - Configure log levels properly
  - Test production logging

### Complete Missing Features
- [ ] **[6h]** Implement order state machine hooks
  - Kitchen notifications (WebSocket)
  - Customer notifications (email/SMS)
  - Refund processing (Square API)
  - File: `server/src/services/orderStateMachine.ts:240-254`

- [ ] **[4h]** Enable performance monitoring
  - Create /api/v1/analytics/performance endpoint
  - Implement metrics storage
  - Uncomment client reporting
  - File: `client/src/services/monitoring/performance.ts:289-303`

- [ ] **[4h]** Add health checks
  - Database health check
  - Redis health check (if used)
  - AI service health check
  - File: `server/src/routes/metrics.ts:21,56`

**Week 5-8 Total**: ~58 hours (4 weeks)

---

## 🎓 Ongoing - Prevention & Culture

### Code Quality Gates
- [ ] Add ESLint rules to prevent common issues
  ```json
  {
    "no-console": ["error", { "allow": ["error"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "max-lines": ["warn", 300],
    "max-lines-per-function": ["warn", 50]
  }
  ```

- [ ] Set up pre-commit hooks with Husky
  ```bash
  npm install --save-dev husky lint-staged
  npx husky init
  ```

- [ ] Create PR template with quality checklist

### Knowledge Sharing
- [ ] Document refactoring patterns used
- [ ] Create "Before/After" examples
- [ ] Share lessons learned in team meeting
- [ ] Update architecture docs

### Metrics Tracking
- [ ] Weekly tech debt burndown chart
- [ ] Track 'any' type usage over time
- [ ] Monitor bundle size changes
- [ ] Database query performance dashboard

---

## 📈 Progress Tracking

| Week | Planned | Completed | Blocked | Notes |
|------|---------|-----------|---------|-------|
| 1    | 8 items | ___ / 8   | ___     |       |
| 2    | 8 items | ___ / 8   | ___     |       |
| 3-4  | 9 items | ___ / 9   | ___     |       |
| 5-8  | 8 items | ___ / 8   | ___     |       |

## 🎯 Success Metrics

### Performance
- [ ] Kitchen display query time: ~~500-2000ms~~ → <50ms (90% improvement)
- [ ] Batch table update: ~~2-5s~~ → <500ms (80% improvement)
- [ ] Kitchen hook render: ~~100-200ms~~ → <30ms (70% improvement)

### Code Quality
- [ ] 'any' type usage: ~~587~~ → <200 (66% reduction)
- [ ] console.log files: ~~131~~ → 0 (100% removal)
- [ ] Files >300 lines: ~~20~~ → <10 (50% reduction)

### Stability
- [ ] Data inconsistency bugs: ~~Possible~~ → Prevented (transactions)
- [ ] Race conditions: ~~Present~~ → Mitigated (locking)
- [ ] Audit trail gaps: ~~Possible~~ → Impossible (mandatory logging)

### Technical Debt
- [ ] Deprecated services: ~~3~~ → 0 (100% migrated)
- [ ] TODO markers: ~~27~~ → <10 (63% addressed)
- [ ] AI module size: ~~3500 lines~~ → <2000 lines (43% reduction)

---

## 🚨 Blockers & Risks

| Issue | Impact | Owner | Status | Resolution |
|-------|--------|-------|--------|------------|
|       |        |       |        |            |

## 💡 Lessons Learned

| Date | Lesson | Action Taken |
|------|--------|--------------|
|      |        |              |

---

**Last Updated**: ____________
**Next Review**: ____________
**Overall Progress**: ____%
