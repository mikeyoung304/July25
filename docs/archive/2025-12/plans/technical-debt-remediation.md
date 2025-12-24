# Technical Debt Remediation Plan

## Overview

This plan addresses the hidden technical debt in rebuild-6.0 that has been "paved over" through skipped tests, quarantined files, and deferred work. The goal is to chart a path from the current 99.8% test pass rate (achieved by excluding ~51 tests) to genuine test health.

**Strategy**: Balanced approach - delete obviously obsolete tests, fix tests that still provide value.
**Timeline**: Full sprint
**Voice Tests**: Rewrite for new VoiceStateMachine API
**Process**: Light touch documentation only (no new tracking infrastructure)

## Problem Statement

### The "99.8% Illusion"

The reported test pass rate is achieved through systematic exclusion:
- **11 files** renamed with `.skip` extension (~25-30 individual tests)
- **Conditional E2E skips** in active files (by-design, not debt)
- **2 quarantined tests** in client quarantine list
- **0 open issues** in TODO_ISSUES.csv (all closed/by-design/deferred)

**True test coverage**: If all skipped files were included, pass rate would be closer to **~90%**.

### Debt Categories

| Category | Count | Root Cause |
|----------|-------|-----------|
| Voice/WebRTC Tests | ~30 tests | API refactored, tests reference non-existent methods |
| Auth Contract Tests | ~20 tests | Security fixes changed expected responses (403 vs 201) |
| Schema Drift Tests | ~14 tests | Test mocks use camelCase, impl uses snake_case (ADR-001) |
| E2E Infrastructure | ~18 skips | CI environment missing demo panel, Supabase, microphone |

---

## Technical Approach

### Root Cause Analysis

#### 1. Voice/WebRTC Tests

**What happened**: The WebRTCVoiceClient underwent major architectural refactoring in Oct-Nov 2025:

```typescript
// OLD ARCHITECTURE (tests were written for this)
class WebRTCVoiceClient {
  configureSession(config: RealtimeConfig) { ... }  // PUBLIC method
}

// NEW ARCHITECTURE (current implementation)
class WebRTCVoiceClient extends EventEmitter {
  private sessionConfig: VoiceSessionConfig;      // Delegated service
  private stateMachine: VoiceStateMachine;        // Event-driven states
  // No public configureSession() method
}
```

**Impact**: Tests calling `(client as any).configureSession.bind(client)` fail with "method not found"

**Files affected**:
- `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip`
- `client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip`
- `client/src/modules/voice/components/HoldToRecordButton.test.tsx.skip`
- `client/src/pages/hooks/__tests__/useVoiceOrderWebRTC.test.tsx.skip`

#### 2. Auth Contract Tests

**What happened**: Security fixes in Oct 2025 changed middleware behavior:

| Change | Before | After |
|--------|--------|-------|
| `optionalAuth` on orders | N/A | Allows anonymous customer orders |
| Header fallback | Accepted `X-Restaurant-ID` | Only trusts JWT (CL-AUTH-002) |
| `kiosk_demo` role | Allowed | Rejected at auth.ts:71 |
| STRICT_AUTH mode | Optional | Enforced when flag set |

**Impact**: Tests expecting 401 get 201 (anonymous allowed), tests without `restaurant_id` in JWT get 403

**Files affected**:
- `server/tests/routes/orders.auth.test.ts.skip`
- `server/tests/contracts/order.contract.test.ts.skip`
- `server/tests/middleware/auth-restaurant-id.test.ts.skip`

#### 3. Schema Drift (ADR-001)

**What happened**: Oct 12, 2025 commit `33705d9c` unified on snake_case across all layers

```typescript
// Test fixtures (BROKEN - use camelCase)
const mockOrder = { customerName: "John", totalAmount: 29.99 }

// Implementation (CORRECT - use snake_case per ADR-001)
const mockOrder = { customer_name: "John", total_amount: 29.99 }
```

**Files affected**:
- `client/src/services/stationRouting.test.ts.skip`
- `client/src/pages/__tests__/CheckoutPage.demo.test.tsx.skip`

#### 4. E2E Infrastructure

**What happened**: Tests written for local dev don't work in CI:

| Skip Reason | Tests | Environment Requirement |
|-------------|-------|------------------------|
| Microphone access | 1 | Hardware not available in CI |
| `VITE_DEMO_PANEL` | 7 | Feature flag not set in CI |
| Live Supabase | 7 | Requires real database connection |
| Limited permissions user | 1 | Test user doesn't exist |

---

## Implementation Phases

### Phase 0: Test Audit (1 hr) - CRITICAL FIRST STEP

**Goal**: Identify which tests are FIXABLE vs OBSOLETE before writing any code

**Tasks**:
- [ ] For each `.skip` file, check if referenced code still exists
- [ ] Label each test as: `DELETE` (obsolete), `FIX` (quick), or `REWRITE` (significant)
- [ ] Update effort estimates based on audit findings

**Triage Results** (from review analysis):

| File | Decision | Reason |
|------|----------|--------|
| `WebRTCVoiceClient.test.ts.skip` | **REWRITE** | Tests `configureSession()` removed in refactor - rewrite for new API |
| `order.contract.test.ts.skip` | **DELETE** | Schema already accepts both snake_case/camelCase - test assertion is wrong |
| `stationRouting.test.ts.skip` | **DELETE** | Tests mock implementation that never shipped |
| `orders.auth.test.ts.skip` | **FIX** | Change assertions from 403→201 for optionalAuth routes |
| `auth-restaurant-id.test.ts.skip` | **FIX** | Just rename - validates Oct 30 fix, should pass |
| `HoldToRecordButton.test.tsx.skip` | **FIX** | Update component text assertions |
| `RecordingIndicator.test.tsx.skip` | **FIX** | Update state enum references |
| `orderIntegration.integration.test.tsx.skip` | **REWRITE** | Add AuthProvider wrapper, update for new API |
| `useVoiceOrderWebRTC.test.tsx.skip` | **REWRITE** | Update hook for VoiceStateMachine API |
| `CheckoutPage.demo.test.tsx.skip` | **DELETE** | Demo panel feature, E2E covers this |
| `WorkspaceDashboard.test.tsx.skip` | **FIX** | One failing test - keyboard event spy |

**Summary**: 3 DELETE, 5 FIX (<30 min each), 3 REWRITE (1-2 hrs each)

---

### Phase 1: Auth Contract Alignment (2 hrs) - CAN PARALLELIZE

**Goal**: Fix auth tests to match current security model

**Tasks**:
- [ ] Update `orders.auth.test.ts` to expect 201 for anonymous orders (not 401)
- [ ] Add `restaurant_id` to all test JWT tokens
- [ ] Document `optionalAuth` vs `authenticate` middleware differences
- [ ] Verify `kiosk_demo` role rejection test passes
- [ ] Re-enable `server/tests/routes/orders.auth.test.ts.skip`

**Files to modify**:
```
server/tests/routes/orders.auth.test.ts.skip → orders.auth.test.ts
server/tests/contracts/order.contract.test.ts.skip → order.contract.test.ts
server/tests/middleware/auth-restaurant-id.test.ts.skip → auth-restaurant-id.test.ts
```

**Acceptance Criteria**:
- All auth tests pass with correct expectations
- Public endpoints remain accessible for kiosk/online flows
- Security fixes (CL-AUTH-002) preserved

---

### Phase 2: Schema Drift Resolution (1-2 hrs)

**Goal**: Align test fixtures with ADR-001 snake_case convention

**Tasks**:
- [ ] Audit all `.skip` files for camelCase usage
- [ ] Update mock objects to use snake_case:
  - `customerName` → `customer_name`
  - `totalAmount` → `total_amount`
  - `orderTime` → `order_time`
  - `tableNumber` → `table_number`
  - `paymentStatus` → `payment_status`
- [ ] Re-enable schema drift test files

**Files to modify**:
```
client/src/services/stationRouting.test.ts.skip → stationRouting.test.ts
client/src/pages/__tests__/CheckoutPage.demo.test.tsx.skip → CheckoutPage.demo.test.tsx
```

**Acceptance Criteria**:
- Zero camelCase in test fixtures
- All Order-related tests pass with snake_case payloads

---

### Phase 3: Voice/WebRTC Test Rewrite (4-5 hrs) - CAN PARALLELIZE

**Goal**: Rewrite voice tests for new service-delegated architecture (VoiceStateMachine API)

**Context**: The WebRTCVoiceClient underwent major architectural refactoring:
- OLD: Monolithic class with `configureSession()` method
- NEW: Delegated services (VoiceSessionConfig, VoiceStateMachine, WebRTCConnection)

**Tasks**:

**Quick Fixes (1 hr)**:
- [ ] Fix `HoldToRecordButton.test.tsx.skip` - update component text assertions
- [ ] Fix `RecordingIndicator.test.tsx.skip` - update VoiceState enum references

**Rewrites (3-4 hrs)**:
- [ ] Rewrite `WebRTCVoiceClient.test.ts.skip`:
  - Remove `configureSession()` method calls
  - Test new event-driven API (connect, startRecording, stopRecording, on/emit)
  - Mock VoiceSessionConfig service instead of internal methods
  - Update state assertions: `'idle'` → `VoiceState.IDLE`, etc.
- [ ] Rewrite `orderIntegration.integration.test.tsx.skip`:
  - Add AuthProvider wrapper
  - Update for new VoiceStateMachine transitions
- [ ] Rewrite `useVoiceOrderWebRTC.test.tsx.skip`:
  - Update hook to use new VoiceStateMachine API

**Reference Files** (use as patterns):
- `VoiceSessionConfig.test.ts` - 651 lines, passing, shows service testing pattern
- `VoiceStateMachine.test.ts` - 48 tests, 100% coverage, shows state transition testing

**Files to modify**:
```
client/src/modules/voice/components/HoldToRecordButton.test.tsx.skip → .test.tsx (FIX)
client/src/modules/voice/components/RecordingIndicator.test.tsx.skip → .test.tsx (FIX)
client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip → .test.ts (REWRITE)
client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip → .test.tsx (REWRITE)
client/src/pages/hooks/__tests__/useVoiceOrderWebRTC.test.tsx.skip → .test.tsx (REWRITE)
```

**Acceptance Criteria**:
- All 5 voice test files pass
- Tests use new VoiceStateMachine API patterns
- Voice ordering smoke test passes locally (connect → record → transcript → order)
- E2E voice tests documented to skip in CI (microphone requirement)

---

### Phase 4: Quarantine Cleanup (1-2 hrs)

**Goal**: Resolve remaining quarantined tests

**Tasks**:
- [ ] Fix `useOrderData.test.ts` (in quarantine list)
- [ ] Fix `WebSocketService.test.ts` edge cases (2 of 16 failing)
- [ ] Update quarantine.list to remove fixed tests

**Files to modify**:
```
client/src/modules/orders/hooks/__tests__/useOrderData.test.ts
client/src/services/websocket/WebSocketService.test.ts
client/tests/quarantine.list
```

**Acceptance Criteria**:
- Quarantine list is empty
- All previously quarantined tests pass

---

### Phase 5: Documentation & Cleanup (1 hr)

**Goal**: Light-touch documentation for remaining conditional skips (no new infrastructure)

**Tasks**:
- [ ] Add comments to E2E test files explaining WHY tests skip in CI
- [ ] Update `TEST_HEALTH.md` with current status
- [ ] Remove empty quarantine.list entries if all fixed
- [ ] Verify `npm test` passes with no skipped files remaining

**NOT doing** (per review feedback):
- ~~Create `skipInCI()` helper function~~ - current conditional skips work fine
- ~~Migrate to GitHub Issues~~ - CSV works for current scale, reassess if >100 items
- ~~Create project board~~ - this is process theater, not engineering

**Acceptance Criteria**:
- Each CI skip has inline comment explaining reason
- TEST_HEALTH.md reflects accurate current state
- No orphaned quarantine entries

---

## Success Metrics

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Test pass rate (all tests) | ~90% | 100% | `npm test` including .skip files |
| Skipped test files (.skip) | 11 | 0 | `find . -name "*.skip" \| wc -l` |
| Deleted test files | 0 | 3 | Obsolete tests removed cleanly |
| Quarantined tests | 2 | 0 | `quarantine.list` entries |
| Voice tests rewritten | 0 | 5 | New VoiceStateMachine API coverage |
| E2E conditional skips | ~18 | ~18 (documented) | By-design, not debt |

---

## Dependencies & Parallelization

**Optimized execution** (saves ~50% time vs sequential):

```
Phase 0: Test Audit (1 hr)
         ↓
    ┌────┼────┐
    ↓    ↓    ↓
Phase 1  Phase 2  Phase 3    ← RUN IN PARALLEL (3 developers)
(Auth)   (Schema) (Voice)
 2 hrs    1 hr    4-5 hrs
    └────┼────┘
         ↓
Phase 4: Quarantine (1-2 hrs) ← After Phases 1-3 complete
         ↓
Phase 5: Documentation (1 hr)
```

**Total time**:
- **Sequential**: 10-12 hours
- **Parallel (3 devs)**: 6-7 hours
- **Parallel (2 devs)**: 7-8 hours

---

## Risk Analysis & Mitigation

### Risk 1: Breaking Kiosk/Online Ordering Flow

**Description**: Tightening auth could break anonymous customer orders
**Probability**: Medium
**Impact**: High (production outage)
**Mitigation**:
- Verify `optionalAuth` preserves public endpoint access
- Run kiosk E2E test after auth changes

### Risk 2: Test Fixture Updates Introduce Regressions

**Description**: Bulk find-replace of camelCase could break assertions
**Probability**: Medium
**Impact**: Low (caught by tests)
**Mitigation**:
- Update one file at a time
- Run tests after each file change

### Risk 3: Voice Test Rewrite Takes Longer Than Expected

**Description**: New architecture may require more test changes than estimated
**Probability**: High
**Impact**: Medium (delays)
**Mitigation**:
- Start with VoiceSessionConfig tests (already passing)
- Use as reference for other voice tests

### Risk 4: E2E Tests Depend on Unavailable External Services

**Description**: Some E2E tests require live Supabase/microphone
**Probability**: Certain
**Impact**: Low (documented skips acceptable)
**Mitigation**:
- Accept as manual verification only
- Document clearly in test files

---

## References & Research

### Internal References
- ADR-001: Snake case convention - `docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md`
- ADR-005: Client-side voice ordering - `docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md`
- ADR-006: Dual authentication pattern - `docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`
- ADR-012: Voice state machine - `docs/explanation/architecture-decisions/ADR-012-voice-state-machine.md`
- CL-AUTH-002: Header fallback removal - `.claude/lessons/`
- CL-TEST-001: Mock drift prevention - `.claude/lessons/CL-TEST-001-mock-drift-prevention.md`

### Critical Files
- `server/src/middleware/auth.ts` - Core authentication, optionalAuth pattern
- `server/src/middleware/rbac.ts` - Role-scope matrix
- `shared/contracts/order.ts` - OrderPayload Zod schema
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` - Current voice API
- `client/src/modules/voice/services/VoiceStateMachine.ts` - State machine implementation

### Issue Tracking
- TODO_ISSUES.csv - 40 items with status
- client/tests/quarantine.list - 2 active quarantined tests
- test-quarantine/test-health.json - Quarantine metadata
