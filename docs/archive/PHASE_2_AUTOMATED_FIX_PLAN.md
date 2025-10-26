# Phase 2: Automated Test Suite Repair Plan

**Goal:** Fix all 19 quarantined tests to achieve 100% test suite operational status

**Current Status:** 17/36 files passing (47%)
**Target Status:** 36/36 files passing (100%)
**Estimated Time:** 4-6 hours (automated execution)

---

## Execution Strategy

Each phase will:
1. **Investigate** - Read test files to understand failures
2. **Diagnose** - Identify root causes
3. **Fix** - Make targeted corrections
4. **Verify** - Run tests to confirm fixes
5. **Update** - Remove from quarantine list if passing
6. **Report** - Document changes made

---

## Phase 2.1: Import/Path Issues (Est. 30 min)

**Status:** 🎯 Quick Wins
**Files:** 3
**Complexity:** Low

### Files to Fix:
1. `src/modules/kitchen/components/__tests__/KDSOrderCard.test.tsx`
2. `src/modules/orders/components/__tests__/OrderCard.test.tsx`
3. `src/modules/floor-plan/components/__tests__/chip-monkey.test.tsx`

### Approach:
1. Read each test file to identify import errors
2. Use Glob to find actual component locations
3. Fix import paths or create missing barrel exports
4. Verify component files exist, create stubs if needed
5. Run tests individually to verify fixes

### Success Criteria:
- All 3 files pass their tests
- No import resolution errors
- Tests run without file-not-found errors

---

## Phase 2.2: Router Context Issues (Est. 45 min)

**Status:** 🎯 Quick Wins
**Files:** 4
**Complexity:** Low

### Files to Fix:
1. `src/modules/order-system/__tests__/checkout-simple.test.tsx`
2. `src/modules/order-system/__tests__/checkout.e2e.test.tsx`
3. `src/modules/order-system/context/CartContext.test.tsx`
4. `src/pages/__tests__/CheckoutPage.demo.test.tsx`

### Approach:
1. Create test utility: `tests/utils/RouterWrapper.tsx`
   ```typescript
   export const RouterWrapper = ({ children }) => (
     <MemoryRouter>{children}</MemoryRouter>
   );
   ```

2. Update each test to wrap components in RouterWrapper
3. Fix any route-dependent assertions

### Success Criteria:
- All 4 files pass their tests
- No "useNavigate must be used within RouterProvider" errors
- Router-dependent functionality works

---

## Phase 2.3: Supabase Auth Mocks (Est. 30 min)

**Status:** 🎯 Quick Win
**Files:** 1
**Complexity:** Low-Medium

### Files to Fix:
1. `src/contexts/__tests__/AuthContext.test.tsx`

### Approach:
1. Enhance `client/test/setup.ts` with better Supabase mocks:
   ```typescript
   vi.mock('@supabase/supabase-js', () => ({
     createClient: vi.fn(() => ({
       auth: {
         signInWithPassword: vi.fn(),
         signOut: vi.fn(),
         getSession: vi.fn(),
         onAuthStateChange: vi.fn(() => ({
           data: { subscription: { unsubscribe: vi.fn() } }
         }))
       }
     }))
   }));
   ```

2. Update AuthContext.test.tsx to use proper mocks
3. Handle async auth state changes properly

### Success Criteria:
- AuthContext.test.tsx passes all 3 tests
- No Supabase client errors
- Token refresh logic works

---

## Phase 2.4: MediaRecorder/Audio API Mocks (Est. 1.5 hours)

**Status:** ⚡ Moderate
**Files:** 4
**Complexity:** Medium

### Files to Fix:
1. `src/modules/voice/components/HoldToRecordButton.test.tsx`
2. `src/modules/voice/components/RecordingIndicator.test.tsx`
3. `src/modules/voice/services/orderIntegration.integration.test.tsx`
4. `src/modules/voice/services/orderIntegration.test.ts`

### Approach:
1. Enhance `client/test/setup.ts` MediaRecorder mock:
   ```typescript
   class MockMediaRecorder {
     state = 'inactive';
     ondataavailable = null;
     onstop = null;
     onerror = null;

     start() {
       this.state = 'recording';
       // Simulate data available
       setTimeout(() => {
         if (this.ondataavailable) {
           this.ondataavailable({ data: new Blob(['mock']) });
         }
       }, 100);
     }

     stop() {
       this.state = 'inactive';
       if (this.onstop) this.onstop();
     }

     pause() { this.state = 'paused'; }
     resume() { this.state = 'recording'; }
   }

   global.MediaRecorder = MockMediaRecorder;
   ```

2. Enhance Audio mock with proper event simulation
3. Update tests to work with enhanced mocks
4. Use fake timers properly with vi.useFakeTimers()

### Success Criteria:
- All 4 voice tests pass
- Recording simulation works
- Audio playback simulation works
- No "MediaRecorder is not defined" errors

---

## Phase 2.5: API Service Mocks (Est. 1 hour)

**Status:** ⚡ Moderate
**Files:** 2
**Complexity:** Medium

### Files to Fix:
1. `src/modules/orders/hooks/__tests__/useOrderData.test.ts`
2. `src/services/orders/__tests__/OrderService.test.ts`

### Approach:
1. Create comprehensive API mock in `tests/mocks/api.ts`:
   ```typescript
   export const mockApi = {
     orders: {
       getOrders: vi.fn(),
       getOrder: vi.fn(),
       createOrder: vi.fn(),
       updateOrder: vi.fn(),
       deleteOrder: vi.fn(),
     },
     // ... other endpoints
   };
   ```

2. Update useOrderData.test.ts:
   - Mock the api module properly
   - Fix async/await patterns
   - Use waitFor correctly

3. Update OrderService.test.ts:
   - Mock HTTP client
   - Verify request/response handling

### Success Criteria:
- Both test files pass all tests
- API calls are properly mocked
- Async operations complete correctly
- No unhandled promise rejections

---

## Phase 2.6: Accessibility Test (Est. 30 min)

**Status:** ⚡ Moderate
**Files:** 1
**Complexity:** Medium

### Files to Fix:
1. `src/modules/order-system/__tests__/accessibility.test.tsx`

### Approach:
1. Install/verify jest-axe is available
2. Update test to properly use axe-core:
   ```typescript
   import { axe, toHaveNoViolations } from 'jest-axe';

   expect.extend(toHaveNoViolations);

   test('should have no accessibility violations', async () => {
     const { container } = render(<Component />);
     const results = await axe(container);
     expect(results).toHaveNoViolations();
   });
   ```

3. Fix any actual a11y violations found
4. Ensure components have proper ARIA attributes

### Success Criteria:
- Accessibility test passes
- No a11y violations detected
- jest-axe integration works

---

## Phase 2.7: Timing/Async Tests (Est. 2 hours)

**Status:** 🔴 Complex
**Files:** 3
**Complexity:** High

### Files to Fix:
1. `src/components/shared/timers/ElapsedTimer.test.tsx`
2. `src/services/websocket/WebSocketService.test.ts`
3. `src/hooks/__tests__/useKitchenOrdersRealtime.test.ts`

### Approach:

#### ElapsedTimer.test.tsx:
1. Use `vi.useFakeTimers()` properly
2. Wrap all timer interactions in `act()`:
   ```typescript
   vi.useFakeTimers();

   test('timer updates', () => {
     render(<ElapsedTimer />);
     act(() => {
       vi.advanceTimersByTime(1000);
     });
     expect(screen.getByText('00:01')).toBeInTheDocument();
   });
   ```

3. Clean up timers in afterEach

#### WebSocketService.test.ts:
1. Mock WebSocket with proper event simulation:
   ```typescript
   class MockWebSocket {
     readyState = 1;
     onopen = null;
     onmessage = null;
     onclose = null;
     onerror = null;

     constructor(url) {
       setTimeout(() => {
         if (this.onopen) this.onopen({});
       }, 0);
     }

     send(data) {
       // Simulate response
       setTimeout(() => {
         if (this.onmessage) {
           this.onmessage({ data: JSON.stringify({}) });
         }
       }, 0);
     }

     close() {
       setTimeout(() => {
         if (this.onclose) this.onclose({});
       }, 0);
     }
   }
   ```

2. Use waitFor for async assertions
3. Handle reconnection logic properly

#### useKitchenOrdersRealtime.test.ts:
1. Fix race condition handling
2. Use proper async/await patterns
3. Mock WebSocket state changes correctly

### Success Criteria:
- All 3 files pass their tests
- No flaky test failures
- Timers work predictably
- WebSocket events fire correctly
- Race conditions handled properly

---

## Phase 2.8: React 18 Error Boundary (Est. 1 hour)

**Status:** 🔴 Complex
**Files:** 1
**Complexity:** High

### Files to Fix:
1. `src/components/shared/errors/__tests__/ErrorBoundary.test.tsx`

### Approach:
1. Update test to use React 18 patterns:
   ```typescript
   import { ErrorBoundary } from 'react-error-boundary';

   const ThrowError = () => {
     throw new Error('Test error');
   };

   test('catches errors', () => {
     const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

     render(
       <ErrorBoundary fallback={<div>Error occurred</div>}>
         <ThrowError />
       </ErrorBoundary>
     );

     expect(screen.getByText('Error occurred')).toBeInTheDocument();
     spy.mockRestore();
   });
   ```

2. Handle console.error suppression properly
3. Test error recovery mechanisms
4. Verify componentDidCatch behavior

### Success Criteria:
- ErrorBoundary test passes all scenarios
- Errors are caught and displayed properly
- No unhandled error warnings
- React 18 concurrent mode compatible

---

## Phase 2.9: Final Verification (Est. 30 min)

**Status:** 🎯 Verification
**Complexity:** Low

### Approach:
1. Remove all files from `client/tests/quarantine.list`
2. Run full test suite: `npm run test:client`
3. Verify all 36 files pass
4. Generate test coverage report
5. Update TEST_SUITE_RESTORATION_SUMMARY.md with final results
6. Commit all changes with detailed message

### Success Criteria:
- ✅ **36/36 test files passing**
- ✅ **~350+ tests passing**
- ✅ **0 files in quarantine**
- ✅ **100% test suite operational**
- ✅ **Test coverage report generated**

---

## Rollback Plan

If any phase fails:
1. **Keep fixes that work** - Don't rollback successful fixes
2. **Re-quarantine failing file** - Add back to quarantine.list
3. **Document the issue** - Add detailed notes to quarantine.list
4. **Continue to next phase** - Don't block on one failure

---

## Progress Tracking

Each phase will update:
- ✅ Todo list with current status
- 📊 TEST_SUITE_RESTORATION_SUMMARY.md with latest metrics
- 📝 Git commits for each logical group of fixes
- 🔍 Detailed logs in `/tmp/phase-{X}-results.txt`

---

## Automation Approach

I will execute this plan in autonomous mode:
1. **Read** test files and understand failures
2. **Research** best practices for each issue type
3. **Implement** fixes systematically
4. **Test** after each change
5. **Document** all changes made
6. **Report** progress after each phase

This plan is designed to be fully autonomous - I can execute it without user intervention, making intelligent decisions at each step based on test results.

**Ready to execute when you give the go-ahead!**
