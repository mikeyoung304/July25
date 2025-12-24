# Strategic Roadmap: Restaurant OS Q4 2025

**Last Updated:** 2025-11-25
**Issue Type:** Strategic Planning
**Priority:** P0 (Business Critical)
**Current Status:** 99% Production Ready

---

## Executive Summary

Restaurant OS v6.0.17 is **99% production-ready** for online ordering with excellent test coverage (99.8%). The system requires focused work in three areas:

1. **Voice Ordering Hardening** - 8 P1 critical issues affecting reliability (12-18 hours)
2. **Load Test Validation** - Prove 100 concurrent user capacity (7-10 hours)
3. **Technical Debt Reduction** - 41 pending items tracked, prioritize high-impact (ongoing)

---

## Current State Assessment

### System Health Scorecard

| Category | Status | Score | Action Required |
|----------|--------|-------|-----------------|
| Online Ordering | Production Ready | 99% | None |
| Voice Ordering | Critical Issues | 65% | P1 - Week 1 |
| Payment Processing | Stripe Integrated | 98% | None |
| Test Coverage | 99.8% Pass Rate | 98% | Maintain |
| Load Testing | Infrastructure Added | 70% | Validate |
| Technical Debt | 41 Open Items | 35% | Prioritize |

### Key Metrics

- **Test Pass Rate:** 99.8% (430/431 tests)
- **Production Readiness:** 99% (enterprise-grade)
- **Documentation Health:** 90.4% link health
- **Pending TODOs:** 41 items (23 P1, 15 P2, 3 P3)
- **Critical Blockers:** 0 for online ordering, 8 for voice ordering

---

## Priority 1: Voice Ordering Hardening

**Effort:** 12-18 hours | **Risk:** Medium | **Sprint:** Week 1

### Critical Issues (8 Items)

| ID | Issue | Impact | Hours | Files |
|----|-------|--------|-------|-------|
| VOI-001 | Competing state management (3 systems) | Race conditions | 4-6 | VoiceEventHandler.ts, VoiceStateMachine.ts, WebRTCVoiceClient.ts |
| VOI-002 | Data channel race condition (TOCTOU) | Message loss | 1-2 | WebRTCConnection.ts |
| VOI-003 | Modifier pricing bug (revenue loss) | $3.50/order | 2-3 | realtime-menu-tools.ts |
| VOI-004 | Missing input validation | Security vulnerability | 3-4 | realtime-menu-tools.ts |
| VOI-005 | Console.log violations (27+) | PII exposure, CI failures | 1-2 | Voice modules |
| VOI-006 | Message queue memory allocation | Performance | 1 | VoiceEventHandler.ts:800-802 |
| VOI-007 | Microphone permission changes undetected | Silent failures | 1-2 | WebRTCConnection.ts |
| VOI-008 | Connection timeout not propagated | Poor UX | 1 | WebRTCVoiceClient.ts |

### Acceptance Criteria

```gherkin
Feature: Voice Ordering Production Readiness

Scenario: Single State Source of Truth
  Given VoiceStateMachine as the FSM
  When state changes occur anywhere in voice module
  Then all mutations go through VoiceStateMachine
  And no direct state mutations exist outside FSM
  And state is consistent across all components

Scenario: Modifier Pricing Accuracy
  When user orders "Burger with extra cheese (+$1.50)"
  Then CartItem includes modifier with price
  And subtotal = base_price + modifier_price
  And tax includes modifier amount
  And customer is charged correctly

Scenario: Data Channel Reliability
  When data channel is ready
  And queued messages exist
  Then all messages are flushed in order
  And no TOCTOU race conditions occur
  And channel close during flush is handled gracefully
```

### Implementation Plan

**Day 1-2:** State Management + Input Validation
- Dev A: VOI-001 (Eliminate competing state systems)
- Dev B: VOI-004 (Zod schema validation)

**Day 3-4:** Data Channel + Pricing
- Dev A: VOI-002 (Fix TOCTOU race condition)
- Dev B: VOI-003 (Modifier pricing fix)

**Day 5:** Quick Wins
- Dev A: VOI-005, VOI-006 (Logging + Memory)
- Dev B: VOI-007, VOI-008 (Microphone + Timeout)

---

## Priority 2: Load Test Validation

**Effort:** 7-10 hours | **Risk:** Low | **Sprint:** Week 2

### Targets

| Metric | Target | Current |
|--------|--------|---------|
| Concurrent Users | 100+ sustained 7 min | 0 (untested) |
| P95 Response Time | <500ms | Unknown |
| P99 Response Time | <1000ms | Unknown |
| Error Rate | <1% | Unknown |
| WebSocket Latency P95 | <100ms | Unknown |

### Acceptance Criteria

```gherkin
Feature: Production Capacity Verification

Scenario: Sustained Load Test
  Given k6 test environment configured
  When test ramps to 100 virtual users
  And sustains for 7 minutes
  Then P95 response time < 500ms
  And error rate < 1%
  And no memory leaks detected
  And all WebSocket connections stable

Scenario: Payment Processing Under Load
  When 100 concurrent payment requests occur
  Then Stripe receives all requests
  And idempotency prevents duplicates
  And success rate > 99%
  And no cross-tenant data leakage
```

### Implementation Plan

**Phase 1:** Resurrect & Update k6 Tests (3-4 hours)
- Copy from `scripts/archive/2025-09-25/load-test/`
- Update endpoints for Stripe migration
- Convert to snake_case per ADR-001
- Update payment test tokens

**Phase 2:** CI/CD Integration (2-3 hours)
- Workflow already created (`.github/workflows/load-tests.yml`)
- Configure GitHub secrets (DONE)
- Test manual trigger
- Verify nightly schedule

**Phase 3:** Baseline & Documentation (2 hours)
- Run tests 3x, average results
- Document baselines
- Create interpretation runbook
- Set regression thresholds

---

## Priority 3: Technical Debt Reduction

**Effort:** 20-30 hours | **Risk:** Low | **Sprint:** Weeks 3-6

### High-Impact Items (P1)

| ID | Item | Hours | Impact |
|----|------|-------|--------|
| 003 | Dual hook architecture | 6-8 | State management clarity |
| 004 | Rate limiting session endpoint | 2-3 | Security |
| 007 | RTC connection state monitoring | 2-3 | Reliability |
| 020 | Timeout race condition | 2-3 | Stability |
| 021 | Error state transition | 3-4 | Robustness |

### Medium-Impact Items (P2)

| ID | Item | Hours | Impact |
|----|------|-------|--------|
| 028 | useState re-renders | 4-5 | Performance |
| 031 | Multi-seat isolation | 3-4 | Security |
| 009 | Checkout orchestrator coupling | 3-4 | Maintainability |
| 024 | Verbose error messages | 2-3 | Debugging |

### Phased Approach

**Phase 1 (Weeks 1-2):** Voice ordering blockers (covered in Priority 1)
**Phase 2 (Weeks 3-4):** Performance + isolation items
**Phase 3 (Weeks 5-6):** Code cleanup + minor fixes

---

## Priority 4: Production Monitoring

**Effort:** 8-11 hours | **Risk:** Low | **Sprint:** Weeks 3-4

### Components

1. **OpenTelemetry Integration** (4-6 hours)
   - Instrument voice ordering paths
   - Track state transitions
   - Monitor message queue depth
   - Capture performance metrics

2. **Alerting Rules** (2-3 hours)
   - P1: Error rate >5%
   - P1: Response time P95 >500ms
   - P2: Memory growth >100MB/hour
   - P3: WebSocket disconnect rate >2%

3. **Incident Runbook** (2 hours)
   - Alert interpretation guide
   - Escalation procedures
   - Common resolutions
   - Debug commands

---

## Priority 5: Feature Expansion (Future)

### Wave 1: Q1 2026 - Stripe Terminal
- Hardware: Stripe Terminal M2
- Offline mode support
- PCI compliance verification
- **Effort:** 20 hours

### Wave 2: Q2 2026 - Delivery Integrations
- DoorDash API integration
- Uber Eats API integration (optional)
- Bidirectional status sync
- **Effort:** 25 hours

### Wave 3: Q3 2026 - AI Menu Recommendations
- ML model on order history
- Real-time suggestions
- A/B testing framework
- **Effort:** 30 hours

---

## Risk Assessment

### Critical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Voice ordering race conditions cause lost orders | High | Critical | Complete VOI-001, VOI-002 in Week 1 |
| Modifier pricing bug affects revenue | High | High | Complete VOI-003 in Week 1 |
| Load test reveals capacity issues | Medium | High | Run before peak traffic |
| State management drift causes debugging chaos | High | Medium | Enforce single FSM source |

### Medium Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Input validation bypass | Medium | Medium | Complete VOI-004 in Week 1 |
| Console logging exposes PII | Medium | Medium | Complete VOI-005 in Week 1 |
| Performance degradation undetected | Medium | High | Establish load test baseline |

---

## Success Metrics

### End of Week 1

| Metric | Target |
|--------|--------|
| P1 Voice Issues Resolved | 8/8 |
| Console.log Violations | 0 |
| Voice Module Test Coverage | 100% |
| Manual QA Passed | ✓ |

### End of Week 3

| Metric | Target |
|--------|--------|
| Load Test Passing | 100 VUs sustained |
| Performance Baselines | Documented |
| Production Confidence | 99%+ |
| Alert Detection Latency | <30s |

### End of Week 6

| Metric | Target |
|--------|--------|
| Technical Debt Items Closed | 20+ |
| Code Quality Score | A+ |
| System Uptime | 99.9% |
| Team Velocity | Sustainable |

---

## Resource Requirements

### Team Composition
- **Developer A** (Full-stack): Voice ordering + WebRTC
- **Developer B** (Backend): Payment processing + security
- **DevOps Engineer** (Part-time): Load testing + monitoring

### Estimated Effort

| Priority | Hours | Timeline |
|----------|-------|----------|
| P1: Voice Hardening | 12-18 | Week 1 |
| P2: Load Testing | 7-10 | Week 2 |
| P3: Tech Debt | 20-30 | Weeks 3-6 |
| P4: Monitoring | 8-11 | Weeks 3-4 |
| **Total** | **47-69** | **6 weeks** |

---

## Decision Points

### Questions for Stakeholders

1. **Voice Ordering Priority:** Is voice ordering on the critical path for launch, or can it be hardened post-launch?

2. **Load Testing Environment:** Should we use staging (Render) or set up a dedicated load testing environment?

3. **Technical Debt Strategy:** Address all P1 items first, or interleave with feature work?

4. **Feature Expansion Timeline:** When should Stripe Terminal integration begin?

5. **Monitoring Investment:** Full OpenTelemetry setup now, or lightweight alerting first?

---

## References

### Internal Documentation
- `CLAUDE.md` - Project guidelines and current status
- `docs/PRODUCTION_STATUS.md` - Production readiness tracking
- `docs/ROADMAP.md` - Feature roadmap
- `todos/` - 54 tracked items with priorities
- `.claude/lessons/` - 6 codified incident patterns

### Research Sources
- Restaurant POS best practices (GoTab, Square, Stripe)
- OpenAI Realtime API documentation
- k6 load testing guides
- Multi-tenant architecture patterns

---

**Generated with Claude Code**

*This plan is ready for review. Discuss priorities and timeline with stakeholders before implementation.*
