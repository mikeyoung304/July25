# Multi-Agent Orchestration Plan: Table Ordering & Payment Implementation

**Created:** 2025-10-29
**Status:** Ready for Execution
**Estimated Duration:** 4-5 days

---

## Agent Architecture

### Specialized Agents

1. **DATABASE_AGENT** - Schema migrations, indexes, database changes
2. **BACKEND_AGENT** - API endpoints, services, business logic
3. **FRONTEND_AGENT** - React components, hooks, UI/UX
4. **INTEGRATION_AGENT** - Square SDK, Supabase Realtime, webhooks
5. **TESTING_AGENT** - Unit, integration, and E2E tests
6. **DOCUMENTATION_AGENT** - API docs, component docs, guides

### Orchestrator Responsibilities

- Initialize and maintain orchestration state
- Enforce task dependencies
- Run quality gates between phases
- Coordinate rollbacks on failure
- Track progress and generate reports

---

## Execution Phases

### Phase 1: Sequential Seat Ordering (Days 1-2)

**Goal:** Enable servers to order for multiple seats with "Next Seat" and "Finish Table" workflow

**Strategy:** Waterfall → Parallel
1. DATABASE_AGENT creates seat_number migration
2. After migration: BACKEND, FRONTEND, TESTING agents work in parallel

**Tasks:**
- `DB_001`: Migration - add seat_number column (2h)
- `BE_001`: Update order creation API (2h)
- `BE_002`: Add seat validation (1h)
- `FE_001`: Create PostOrderPrompt component (3h)
- `FE_002`: Update SeatSelectionModal (2h)
- `FE_003`: Update useVoiceOrderWebRTC hook (2h)
- `TEST_001`: Create test fixtures (1h)
- `TEST_002`: Write integration tests (2h)
- `DOC_001`: Document seat ordering workflow (1h)

**Quality Gates:**
- [ ] Migration runs successfully on dev database
- [ ] API accepts seat_number parameter
- [ ] UI shows "Next Seat" and "Finish Table" buttons
- [ ] Integration test passes for multi-seat ordering
- [ ] Kitchen display shows seat numbers

**Duration:** 1.5 days

---

### Phase 2: Payment & Check Closing (Days 3-4)

**Goal:** Enable cash and card payments with tender selection UI

**Strategy:** Highly Parallel
1. DATABASE_AGENT adds payment fields
2. After migration: BACKEND, FRONTEND, INTEGRATION agents work fully parallel

**Tasks:**
- `DB_002`: Migration - add payment fields (2h)
- `BE_003`: Create POST /payments/cash endpoint (2h)
- `BE_004`: Update OrdersService.updateOrderPayment() (1h)
- `BE_005`: Update TableService status logic (1h)
- `FE_004`: Create CheckClosingScreen component (2h)
- `FE_005`: Create TenderSelection component (2h)
- `FE_006`: Create CashPayment component (3h)
- `FE_007`: Create CardPayment component (2h)
- `INT_001`: Verify Square SDK compatibility (2h)
- `INT_002`: Test payment audit logging (1h)
- `TEST_003`: E2E test for cash payment (2h)
- `TEST_004`: E2E test for card payment (2h)
- `DOC_002`: Document payment API (1h)

**Quality Gates:**
- [ ] Cash payment endpoint works correctly
- [ ] Card payment via Square works
- [ ] Table status auto-updates to "paid"
- [ ] Change calculation is accurate
- [ ] E2E tests pass for both payment types

**Duration:** 1.5 days

---

### Phase 3: Table Status Automation (Day 5)

**Goal:** Auto-update table status with real-time synchronization

**Strategy:** Parallel Tracks
BACKEND, FRONTEND, INTEGRATION agents all work in parallel

**Tasks:**
- `BE_006`: Add real-time status broadcast (2h)
- `BE_007`: Add auto-transition logic (1h)
- `FE_008`: Create useTableStatus hook (2h)
- `FE_009`: Update floor plan status colors (1h)
- `INT_003`: Configure Supabase Realtime (2h)
- `TEST_005`: Test real-time updates across devices (2h)

**Quality Gates:**
- [ ] Payment triggers status update
- [ ] Real-time broadcast works
- [ ] Multiple devices receive updates
- [ ] Auto-transition to "cleaning" works

**Duration:** 1 day

---

## Timeline

```
Day 1
├─ Morning:   DB_001 (DATABASE_AGENT)
├─ Afternoon: BE_001, BE_002, FE_001 (parallel)
└─ Evening:   FE_002, FE_003, TEST_001, TEST_002 (parallel)

Day 2
├─ Morning:   Phase 1 Quality Gates
├─ Afternoon: DB_002 (DATABASE_AGENT)
└─ Evening:   Phase 2 parallel work begins

Day 3
├─ All Day:   BE_003-005, FE_004-007, INT_001-002 (parallel)
└─ Evening:   TEST_003, TEST_004

Day 4
├─ Morning:   Phase 2 Quality Gates
├─ Afternoon: Phase 3 parallel work (BE_006-007, FE_008-009, INT_003)
└─ Evening:   TEST_005

Day 5
├─ Morning:   Phase 3 Quality Gates
├─ Afternoon: Full regression testing
└─ Evening:   Deployment preparation
```

---

## Coordination Protocol

1. Orchestrator creates `orchestration-state.json`
2. Agents read state and claim available tasks
3. Agents execute atomically and update state
4. Orchestrator monitors and enforces quality gates
5. Orchestrator unlocks next phase when gates pass

---

## Risk Mitigation

- **Database failures:** Test migrations first, maintain down() scripts
- **Concurrent edits:** File locking in orchestration state
- **Integration failures:** Quality gates between phases, rollback on fail
- **Third-party issues:** Demo mode, sandbox testing, feature flags

---

## Success Metrics

- Multi-seat ordering workflow complete (< 2 min per table)
- Payment processing (cash + card) functional
- Table status updates in real-time across devices
- All quality gates passed
- Full test coverage achieved
