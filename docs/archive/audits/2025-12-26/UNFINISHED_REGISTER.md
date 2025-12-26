# Unfinished Work Register

> **Generated**: 2025-12-26
> **Agent**: B2 - Unfinished Work / TODO Archaeology
> **Project**: rebuild-6.0 (Restaurant OS)

This document catalogs all unfinished work, TODOs, stubs, deprecated code, and partially-implemented features found in the codebase.

---

## Table of Contents

1. [Summary](#summary)
2. [Active TODOs with Issue Tracking](#active-todos-with-issue-tracking)
3. [Deprecated Code (Active in Codebase)](#deprecated-code-active-in-codebase)
4. [Placeholder Implementations](#placeholder-implementations)
5. [Incomplete Test Coverage](#incomplete-test-coverage)
6. [Refactored Files Not Migrated](#refactored-files-not-migrated)
7. [Future Enhancements (Documented)](#future-enhancements-documented)
8. [Deferred Work (By Design)](#deferred-work-by-design)
9. [Skipped E2E Tests](#skipped-e2e-tests)
10. [Recommendations](#recommendations)

---

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| Active TODOs with Issue Tracking | 7 | P1-P3 |
| Deprecated Code Needing Migration | 11 | P2 |
| Placeholder Implementations | 4 | P2-P3 |
| Incomplete Test Assertions | 90+ | P3 |
| Refactored Files Not Migrated | 2 | P2 |
| Skipped E2E Tests | 47 | P2-P3 |
| Deferred Work (By Design) | 3 | P3 |

---

## Active TODOs with Issue Tracking

### [TODO-014] Station Assignment Uses Keyword Matching

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/StationStatusBar.tsx:87-93`
- **Type**: TODO
- **Content**:
  ```typescript
  // TODO: Refactor to use menu item metadata when menu system supports
  // station assignments at the item level.
  // See: TODO_ISSUES.csv #14
  // TODO: This should ideally come from the menu item metadata
  // For now, we'll do simple keyword matching
  ```
- **Intent Guess**: Current keyword matching is fragile; should read station from menu_items.station_id column
- **Status in TODO_ISSUES.csv**: Open
- **Recommended Action**: FINISH (when menu metadata schema updated)
- **Effort**: M (2-3 days)

---

### [TODO-145] Single-Pass Stats Calculation

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useServerView.ts:163`
- **Type**: TODO (Performance)
- **Content**:
  ```typescript
  // TODO-145: Single-pass stats calculation (O(n) instead of O(7n))
  ```
- **Intent Guess**: Was marked as O(7n) but code shows single-pass reduce already implemented
- **Git Evidence**: Likely fixed but comment not removed
- **Recommended Action**: REMOVE (appears already implemented)
- **Effort**: S (verify and delete comment)

---

### [TODO-147] Type-Safe Error Property Access

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useServerView.ts:117`
- **Type**: TODO (TypeScript)
- **Content**:
  ```typescript
  // TODO-147: Type-safe error property access
  ```
- **Intent Guess**: Replace manual type guards with proper error type narrowing
- **Recommended Action**: FINISH
- **Effort**: S (0.5 days)

---

### [TODO-070] DataDog/New Relic Forwarding

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/metrics.ts:70`
- **Type**: TODO (Integration)
- **Content**:
  ```typescript
  // TODO: Implement DataDog/New Relic forwarding when needed
  ```
- **Intent Guess**: Placeholder for APM integration when monitoring APIs are configured
- **Status in TODO_ISSUES.csv**: #10 marked Closed (basic structure exists)
- **Recommended Action**: DOCUMENT (add to ops runbook when keys available)
- **Effort**: M (3-5 days when needed)

---

### [TODO-096] Type Inconsistency DatabaseTable vs Table

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/core/supabase.ts`
- **Type**: Architecture
- **Content**: Two different Table types with mismatched fields and status types
- **Status in TODO_ISSUES.csv**: Open
- **Recommended Action**: FINISH
- **Effort**: M (2-3 days)

---

### [TODO-102] Optimize Health Check Database Query

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/metrics.ts:140-153`
- **Type**: Performance
- **Content**: Health check queries restaurants table - could use simpler query
- **Status in TODO_ISSUES.csv**: Open (P3)
- **Recommended Action**: FINISH (low priority)
- **Effort**: S (0.5 days)

---

### [TODO-021] Remove @ts-ignore Suppressions

- **File**: Multiple test files
- **Type**: Code Quality
- **Content**: 9 type suppressions remain (Chrome-specific APIs like `performance.memory`)
- **Status in TODO_ISSUES.csv**: Open (reduced from 11)
- **Recommended Action**: DOCUMENT (legitimate for Chrome API)
- **Effort**: S

---

## Deprecated Code (Active in Codebase)

### VoiceEventHandler TurnState (DEPRECATED)

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceEventHandler.ts:418-503`
- **Type**: Deprecated (Migration Required)
- **Content**:
  ```typescript
  /**
   * @deprecated Use VoiceStateMachine instead - this type is kept for backward compatibility with tests
   */
  export type TurnState = 'idle' | 'recording' | 'committing' | 'waiting_user_final' | 'waiting_response';

  // DEPRECATED: Kept only for backward compatibility with tests
  private turnState: TurnState = 'idle';
  ```
- **Intent Guess**: Phase 2 refactor replaced TurnState with VoiceStateMachine; test migration incomplete
- **Git Evidence**: Part of PHASE 2 refactor mentioned in WebRTCVoiceClient.ts
- **Recommended Action**: FINISH (migrate remaining tests to VoiceStateMachine)
- **Effort**: M (2-3 days)

---

### Legacy TurnState in WebRTCVoiceClient

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts:40-47`
- **Type**: Deprecated
- **Content**:
  ```typescript
  // DEPRECATED: Legacy TurnState type - replaced by VoiceStateMachine
  // Kept for backward compatibility with external consumers
  export type TurnState = ...
  ```
- **Recommended Action**: QUARANTINE (wait for external consumers to migrate)
- **Effort**: S (once consumers identified)

---

### kiosk_demo Role Backward Compatibility

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts:173`
- **Type**: Deprecated
- **Content**:
  ```typescript
  // DEPRECATED: Use 'customer' role instead (backwards compat via AUTH_ACCEPT_KIOSK_DEMO_ALIAS)
  ```
- **Status in TODO_ISSUES.csv**: #12 Closed (role actively rejected)
- **Recommended Action**: REMOVE (after verifying no active usage)
- **Effort**: S

---

### mapToCamelCase / mapToSnakeCase (No-Op Functions)

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/mappers/menu.mapper.ts:96-101`
- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/mappers/cart.mapper.ts:96-103`
- **Type**: Deprecated (ADR-001)
- **Content**:
  ```typescript
  /**
   * @deprecated Use direct assignment instead - this function is a no-op
   */
  export function mapToCamelCase<T = any>(dbRecord: any): T {
    // ADR-001: No transformation - return as-is since we use snake_case everywhere
    return dbRecord as T;
  }
  ```
- **Intent Guess**: Post-ADR-001 migration cleanup not completed
- **Recommended Action**: REMOVE (search for callers first)
- **Effort**: S (0.5 days)

---

### Cart Mapper "Kept for potential future use"

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/mappers/cart.mapper.ts:7-8`
- **Type**: Abandoned Code
- **Content**:
  ```typescript
  // Note: These mappers are largely unused as orders.service.ts returns
  // raw snake_case data directly. Kept for potential future use.
  ```
- **Recommended Action**: REMOVE (if unused after 6 months)
- **Effort**: S

---

## Placeholder Implementations

### Stripe Terminal Integration (Not Implemented)

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/terminal.routes.ts:12-77`
- **Type**: Placeholder (Full File)
- **Content**:
  ```typescript
  /**
   * These routes are placeholders for Stripe Terminal hardware integration.
   * Stripe Terminal is used for in-person payments with physical card readers.
   */
  router.post('/checkout', authenticate, validateRestaurantAccess, async (_req, res) => {
    res.status(501).json({
      success: false,
      error: 'Terminal payments not configured',
      message: 'Stripe Terminal integration is not set up...',
    });
  });
  ```
- **Intent Guess**: Future integration for physical card readers
- **Recommended Action**: DOCUMENT (add to product roadmap)
- **Effort**: L (5-10 days when needed)

---

### Mobile Payments (Apple Pay, Google Pay)

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kiosk/KioskCheckoutPage.tsx:326`
- **Type**: Placeholder
- **Content**:
  ```typescript
  case 'mobile':
    // Placeholder for mobile payments (Apple Pay, Google Pay, etc.)
    form.setFieldError('general', 'Mobile payments not yet supported');
    break;
  ```
- **Recommended Action**: DOCUMENT (product roadmap)
- **Effort**: L (requires Stripe integration work)

---

### Real Notification Services (SMS, Email, Refunds)

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orderStateMachine.ts:296`
- **Type**: Placeholder (Documented)
- **Content**:
  ```typescript
  // Real notification services (SMS, email, Stripe refunds) are deferred to future work.
  ```
- **Status in TODO_ISSUES.csv**: #7, #8 marked Closed (hooks implemented)
- **Intent Guess**: Hooks exist but actual SMS (Twilio) and Email (SendGrid) calls are stubbed
- **Recommended Action**: DOCUMENT (verify actual service integration)
- **Effort**: M (2-3 days each service)

---

### Memory Monitor Placeholder

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/websocket-pool.browser.ts:42`
- **Type**: Placeholder
- **Content**:
  ```typescript
  // Unused - kept as placeholder for memory monitor
  ```
- **Recommended Action**: REMOVE (if not needed after performance audit)
- **Effort**: S

---

## Incomplete Test Coverage

### Kitchen Component Tests with TODO Assertions

- **Files**:
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/ScheduledOrdersSection.test.tsx`
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/OrderGroupCard.test.tsx`
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/TouchOptimizedOrderCard.test.tsx`
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/VirtualizedOrderGrid.test.tsx`
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/FocusOverlay.test.tsx`
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/TableGroupCard.test.tsx`

- **Type**: Incomplete Tests
- **Content**: 90+ test cases with `// TODO: Verify ...` placeholder assertions
- **Example**:
  ```typescript
  it('expands section when header is clicked', () => {
    render(<ScheduledOrdersSection {...defaultProps} />)
    const header = screen.getByText(/Scheduled Orders/).closest('div')
    fireEvent.click(header!)
    // TODO: Verify detailed scheduled order items are visible
  })
  ```
- **Intent Guess**: Tests were scaffolded but assertions never completed
- **Recommended Action**: FINISH (or REMOVE if component behavior is covered elsewhere)
- **Effort**: M-L (2-5 days to complete all assertions)

---

## Refactored Files Not Migrated

### useSquareTerminal.refactored.ts

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/hooks/useSquareTerminal.refactored.ts`
- **Type**: Abandoned Refactor
- **Content**:
  ```typescript
  /**
   * useSquareTerminal - Refactored with FSM Pattern
   * PHASE 4: Replaced boolean flags and manual setInterval cleanup with
   * a deterministic Finite State Machine pattern.
   */
  ```
- **Intent Guess**: PHASE 4 refactor using TerminalStateMachine; original file still exists
- **Recommended Action**: FINISH (migrate to main file or delete if no longer needed)
- **Effort**: S-M

---

### UnifiedCartContext.refactored.tsx

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/contexts/UnifiedCartContext.refactored.tsx`
- **Type**: Abandoned Refactor
- **Content**:
  ```typescript
  /**
   * UnifiedCartContext - Refactored with Deterministic Sync Manager
   * PHASE 4: Replaced 3 racing useEffect hooks with a deterministic sync manager.
   */
  ```
- **Intent Guess**: Fixes race condition in cart hydration; not yet merged to main context
- **Recommended Action**: FINISH (test and replace original UnifiedCartContext.tsx)
- **Effort**: M (2-3 days to validate and migrate)

---

## Future Enhancements (Documented)

### React Query / SWR Integration

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/hooks/useRestaurantConfig.ts:135-143`
- **Type**: Future Enhancement
- **Content**:
  ```typescript
  /**
   * React Query / SWR-style hook (future enhancement)
   * For now, using simple useEffect-based fetching
   *
   * Future improvements:
   * - Add caching (React Query)
   * - Add retry logic
   * - Add refresh interval
   * - Add optimistic updates
   */
  ```
- **Recommended Action**: DOCUMENT (product roadmap)
- **Effort**: M (3-5 days)

---

### Commented-Out Code: Secure Token Generator

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/auth/stationAuth.ts:53-56`
- **Type**: Commented Code
- **Content**:
  ```typescript
  // Unused - left for potential future use
  // function _generateSecureToken(): string {
  //   return crypto.randomBytes(32).toString('hex');
  // }
  ```
- **Recommended Action**: REMOVE (can be regenerated if needed)
- **Effort**: S

---

## Deferred Work (By Design)

### [TODO-121] Monitoring Abstraction Layer

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/security.ts:132-216`
- **Status**: Deferred (YAGNI)
- **Reason**: No monitoring APIs configured; abstraction would be speculative
- **Recommended Action**: DOCUMENT (revisit when DataDog/New Relic keys available)

---

### [TODO-123] External API Rate Limiting

- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/metrics.ts:34-110`
- **Status**: Deferred (YAGNI)
- **Reason**: Speculative optimization; no external API batching needed yet
- **Recommended Action**: DOCUMENT

---

### [TODO-124] Magic Numbers Extraction

- **File**: Multiple files
- **Status**: Deferred (YAGNI)
- **Reason**: Over-aggressive extraction would add complexity without clear benefit
- **Recommended Action**: DOCUMENT (extract only when patterns emerge)

---

## Skipped E2E Tests

Tests intentionally skipped in E2E suite (47 total):

| Category | Count | Reason |
|----------|-------|--------|
| Voice Ordering | 4 | Requires microphone (CI incompatible) |
| Viewport Tests | 2 | UI measurement sensitivity |
| Cash Payment | 10 | Pending cash flow implementation |
| Card Payment | 7 | Stripe test environment issues |
| Demo Panel | 7 | VITE_DEMO_PANEL=false in CI |
| Realtime/WebSocket | 9 | Requires live Supabase connection |
| Production Smoke | 4 | Environment-specific |
| Auth/Permissions | 1 | Requires test user with limited permissions |
| StripePaymentForm | 1 | Client secret loading test suite |

**Key Files**:
- `/tests/e2e/cash-payment.spec.ts` - 10 skipped tests
- `/tests/e2e/card-payment.spec.ts` - 7 skipped tests
- `/tests/e2e/table-realtime.spec.ts` - 9 skipped tests
- `/tests/e2e/voice-ordering.spec.ts` - 1 skipped test
- `/tests/e2e/kiosk-voice-button.spec.ts` - 4 skipped tests

**Recommended Action**: QUARANTINE (most are by-design for CI limitations)

---

## Recommendations

### Immediate Actions (This Sprint)

1. **Remove TODO-145 comment** - Code already implements single-pass calculation
2. **Delete deprecated mapToCamelCase/mapToSnakeCase** - No-op functions after ADR-001
3. **Remove commented _generateSecureToken** - Dead code

### Short-Term (Next 2 Sprints)

1. **Complete VoiceStateMachine migration** - Finish deprecating TurnState in tests
2. **Migrate .refactored.ts files** - useSquareTerminal and UnifiedCartContext
3. **Audit incomplete test TODOs** - Either finish assertions or remove scaffolded tests

### Medium-Term (Backlog)

1. **Station assignment from menu metadata** (TODO-014) - Requires menu schema update
2. **Table type consolidation** (TODO-096) - Align DatabaseTable and Table types
3. **Enable skipped payment E2E tests** - Requires Stripe test environment fixes

### Long-Term (Product Roadmap)

1. **Stripe Terminal integration** - Physical card reader support
2. **Mobile payments** - Apple Pay, Google Pay via Stripe
3. **React Query migration** - Replace useEffect-based fetching

---

## Appendix: Search Patterns Used

```bash
# TODOs and FIXMEs
grep -r "TODO|FIXME|XXX|HACK" --include="*.ts" --include="*.tsx"

# Numbered TODOs
grep -r "TODO-\d+" --include="*.ts" --include="*.tsx"

# Deprecated annotations
grep -r "@deprecated|// DEPRECATED" --include="*.ts" --include="*.tsx"

# Stubs and placeholders
grep -ri "placeholder|stub|workaround" --include="*.ts" --include="*.tsx"

# Skipped tests
grep -r "describe\.skip|it\.skip|test\.skip" --include="*.test.ts" --include="*.spec.ts"

# Refactored files not migrated
find . -name "*.refactored.ts" -o -name "*.refactored.tsx"
```

---

*This register should be updated monthly or after major refactoring efforts.*
