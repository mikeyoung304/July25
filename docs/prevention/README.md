# Prevention Strategies Index

Prevention strategies for common incidents and architectural issues in rebuild-6.0.

## Active Prevention Strategies

### CL-AUTH-002: Dual-Auth Pattern Consistency

**Issue**: WebSocketService didn't implement dual-auth like httpClient, causing 401 errors for station auth users.

**Learning**: When ADR-006 specifies dual-auth, ALL authenticated services must implement BOTH methods.

**Documents**:
- **Main Lesson**: [CL-AUTH-002-websocket-dual-auth-prevention.md](../.claude/lessons/CL-AUTH-002-websocket-dual-auth-prevention.md)
  - 4 prevention strategies
  - Code review checklist (35+ items)
  - Pattern consistency framework
  - Testing strategy (7+ test cases)
  - 4-phase implementation rollout

- **Quick Reference**: [AUTH_PATTERN_QUICK_REFERENCE.md](../.claude/lessons/AUTH_PATTERN_QUICK_REFERENCE.md)
  - 5-minute implementation guide
  - Copy-paste pattern
  - Developer checklist
  - Red flags for code review

- **Before/After**: [AUTH_PATTERN_BEFORE_AFTER.md](../.claude/lessons/AUTH_PATTERN_BEFORE_AFTER.md)
  - Problematic vs. correct implementation
  - Side-by-side code comparison
  - Test coverage comparison
  - Problem manifestation walkthrough

- **Summary**: [AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md](./AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md)
  - Executive summary for technical leads
  - 4 main prevention strategies
  - Implementation timeline
  - Success metrics

**Canonical References**:
- Implementation: `/client/src/services/http/httpClient.ts:109-148`
- Working Example: `/client/src/services/websocket/WebSocketService.ts:86-126`
- Architecture Decision: `/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`

**For**:
- Code Reviewers: Use checklist to verify dual-auth implementation
- Developers: Read 5-min quick reference before creating new authenticated service
- Technical Leads: Follow 4-phase rollout plan to implement prevention

**Success Criteria**:
- 100% of authenticated services pass dual-auth checklist
- >80% auth test coverage (both Supabase and localStorage)
- 0 401 errors from missing auth pattern
- <2 days to implement auth in new service

---

## How to Use Prevention Strategies

### When Creating New Authenticated Services

1. **Read Quick Reference** (5 minutes)
   - File: [AUTH_PATTERN_QUICK_REFERENCE.md](../.claude/lessons/AUTH_PATTERN_QUICK_REFERENCE.md)
   - Copy-paste pattern from `/client/src/services/http/httpClient.ts:109-148`
   - Add tests for both auth methods

2. **Code Review**
   - Reviewer uses 35-item checklist from CL-AUTH-002
   - Verify Supabase + localStorage implementation
   - Confirm 7+ tests for both auth paths
   - Approve only if all items checked

### When Planning Implementation

1. **Read Executive Summary** (15 minutes)
   - File: [AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md](./AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md)
   - Understand all 4 strategies
   - Follow 4-phase rollout plan

2. **Implement Phase 1** (Week 1)
   - Create service template
   - Create validation script
   - Update PR template
   - Add to lessons index

### When Debugging Auth Issues

1. **Check Before/After Examples**
   - File: [AUTH_PATTERN_BEFORE_AFTER.md](../.claude/lessons/AUTH_PATTERN_BEFORE_AFTER.md)
   - See what problems look like
   - Understand correct implementation

2. **Review Red Flags**
   - Missing Supabase check (only localStorage)
   - Missing localStorage fallback (only Supabase)
   - No token expiration validation
   - Silent auth failures
   - Incomplete test coverage

---

## Related Incidents

- **CL-AUTH-001**: STRICT_AUTH drift in environment (complementary lesson)
  - File: [CL-AUTH-001-strict-auth-drift.md](../.claude/lessons/CL-AUTH-001-strict-auth-drift.md)
  - When local dev and production use different auth configs

---

## Reference Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| CL-AUTH-002-websocket-dual-auth-prevention.md | Main lesson with strategies | Developers, Technical Leads |
| AUTH_PATTERN_QUICK_REFERENCE.md | 5-min implementation guide | Developers |
| AUTH_PATTERN_BEFORE_AFTER.md | Visual comparison of patterns | Reviewers, Debugging |
| AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md | Executive summary | Technical Leads, Managers |
| PREVENTION_STRATEGY_DELIVERABLE.md | Complete overview | Project Coordinators |

---

## Metrics & Monitoring

### Success Metrics

- 100% of authenticated services pass dual-auth checklist
- >80% auth test coverage
- 0 401 errors from missing auth
- <2 days to implement auth
- 0 auth-related code review issues

### Monitoring

- Track 401 errors (should stay near 0)
- Monitor auth test coverage (>80%)
- Run validation script on each PR
- Alert on pattern violations
- Quarterly architecture review

---

## Status

**Created**: 2025-11-27
**Status**: ACTIVE - Implementation in progress
**Owner**: Technical Lead
**Next Review**: After first new authenticated service implementation

When 3+ services successfully implement pattern with zero issues, promote to PROVEN status.

---

## Implementation Checklist

- [ ] Phase 1: Create templates and scripts (Week 1)
- [ ] Phase 2: Train team and add tooling (Week 2)
- [ ] Phase 3: Update documentation (Week 3)
- [ ] Phase 4: Monitor and track metrics (Ongoing)

See detailed timeline in [AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md](./AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md)
