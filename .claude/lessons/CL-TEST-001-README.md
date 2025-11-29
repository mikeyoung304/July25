# CL-TEST-001: Test Mock Drift Prevention - Complete Documentation Set

**Issue:** Test mock objects becoming out of sync with TypeScript interfaces, causing tests to pass while production code fails.

**Impact:** False confidence in test coverage, delayed bug detection, wasted debugging time.

**Status:** Complete prevention strategy documented across 4 comprehensive documents.

---

## Documentation Structure

### 1. Main Lesson (812 lines)
**File:** `CL-TEST-001-mock-drift-prevention.md`

Comprehensive deep-dive covering:
- Problem statement with real codebase examples
- 10 core prevention strategies with code patterns
- Integration with current codebase
- Common mistakes and how to avoid them
- References and related lessons

**When to read:** Full context needed, implementation planning, architecture decisions

**Key sections:**
1. TypeScript Strict Mode in Tests
2. Centralized Mock Factories
3. Mock-to-Type Compatibility Audit
4. Class-Based Mock Pattern for Browser APIs
5. Time Testing Pattern
6. Service Mock Pattern
7. Periodic Mock Audit Schedule
8. Pattern-Based Mock Generation
9. Runtime Mock Validation
10. Documentation Standards

---

### 2. Quick Reference (151 lines)
**File:** `TEST_MOCK_QUICK_REFERENCE.md`

Fast reference guide for developers:
- Core prevention patterns (5 main ones)
- Before/after code examples
- PR review checklist
- Quick command reference
- Where to find examples in codebase

**When to read:** Need a quick reminder, don't have 10 minutes for full lesson

**Quick patterns:**
- Always type your mocks
- Use mock factories
- Class-based browser API mocks
- Fixed timestamps
- Complete service mocks

---

### 3. Implementation Guide (513 lines)
**File:** `MOCK_DRIFT_IMPLEMENTATION_GUIDE.md`

Step-by-step practical implementation:
- 5-phase rollout (5 weeks)
- Creating factory directories and files
- Service mock patterns
- Documentation standards
- CI/CD integration
- Team training approach
- Common pitfalls and solutions
- Validation checklist
- Rollout timeline

**When to read:** Planning to implement prevention strategies, creating factories, setting up automation

**Phases:**
1. Foundation (Week 1) - Create factories
2. Service Mocks (Week 1) - Centralize mocks
3. Documentation (Week 2) - Add sync points
4. CI/CD Integration (Week 2) - Automate checks
5. Team Training (Week 3) - Adopt patterns

---

### 4. PR Review Checklist (484 lines)
**File:** `MOCK_DRIFT_PR_CHECKLIST.md`

Practical checklist for code reviewers:
- 9-part review process
- Type annotation checking
- Factory function validation
- Required field verification
- Timestamp handling
- Service mock completeness
- Browser API patterns
- Type checking validation
- Special handling for type changes
- Quick decision matrix
- Common approval comments
- Sample review questions

**When to read:** Reviewing PRs that modify interfaces or add tests, training reviewers

**Key sections:**
1. Type Annotations - require explicit types
2. Factory Usage - catch repeated patterns
3. Missing Fields - ensure completeness
4. Timestamps - verify deterministic
5. Service Mocks - check all methods
6. Browser APIs - validate constructors
7. Type Checking - verify compilation
8. Type Changes - special requirements
9. Documentation - check headers

---

## Quick Navigation

### For Different Roles

**Developers Writing Tests:**
1. Start with: `TEST_MOCK_QUICK_REFERENCE.md`
2. Implement using: `MOCK_DRIFT_IMPLEMENTATION_GUIDE.md` (Phase 1-2)
3. Deep dive if needed: `CL-TEST-001-mock-drift-prevention.md`

**Code Reviewers:**
1. Start with: `MOCK_DRIFT_PR_CHECKLIST.md`
2. Reference: `TEST_MOCK_QUICK_REFERENCE.md` for patterns
3. Deep dive if needed: `CL-TEST-001-mock-drift-prevention.md`

**Architecture/DevOps:**
1. Start with: `MOCK_DRIFT_IMPLEMENTATION_GUIDE.md`
2. Reference: `CL-TEST-001-mock-drift-prevention.md` for strategy
3. Use checklist: `MOCK_DRIFT_PR_CHECKLIST.md` for validation

**Team Leads/Managers:**
1. Overview: This README
2. Implementation: `MOCK_DRIFT_IMPLEMENTATION_GUIDE.md`
3. Rollout: 5-phase plan with timeline

---

## The Core Problem (in 30 seconds)

```typescript
// Interface changes...
export interface Order {
  id: string;
  restaurant_id: string;  // ← NEW
  order_number: string;
}

// But test mock doesn't update
const mockOrder = { id: '1', order_number: '001' };

// Test passes! But production fails at runtime
```

---

## The Solution (in 30 seconds)

```typescript
// 1. Always type your mocks
const mockOrder: Order = { /* TypeScript catches errors */ };

// 2. Use factories for consistency
const order = createMockOrder({ status: 'preparing' });

// 3. No 'any', fixed timestamps, complete service mocks
// 4. Class-based constructors for browser APIs
// 5. Verify with npm run typecheck before committing
```

---

## Critical Rules

**Never:**
- Use `const mock: any`
- Create timestamps with `new Date().toISOString()`
- Mock only part of a service interface
- Use `vi.fn().mockImplementation()` for constructors

**Always:**
- Add explicit type annotations to mocks
- Use factory functions from `tests/factories/`
- Include all required interface fields
- Use class-based pattern for ResizeObserver, IntersectionObserver
- Run `npm run typecheck` before committing

---

## Implementation Checklist

- [ ] Reviewed `CL-TEST-001-mock-drift-prevention.md`
- [ ] Read `TEST_MOCK_QUICK_REFERENCE.md` (quick patterns)
- [ ] Understand 10 core strategies
- [ ] Create `/tests/factories/` directory
- [ ] Implement order factory as example
- [ ] Create centralized service mocks
- [ ] Update 3-5 existing tests with factories
- [ ] Add type annotations to all mocks
- [ ] Run `npm run typecheck` and verify no errors
- [ ] Create mock audit script
- [ ] Add to pre-commit hooks
- [ ] Train team on patterns
- [ ] Update PR template with checklist

---

## Key Metrics to Track

- % of mocks with type annotations (target: 100%)
- % of tests using factory functions (target: 100% for repeated patterns)
- Type-checking pass rate (target: 100%)
- Test pass rate when interfaces change (should be 0 failures with prevention)
- Time to fix test failures after type change (should decrease from hours to minutes)

---

## Files Modified/Created

**New documentation:**
- ✅ `CL-TEST-001-mock-drift-prevention.md` - Main lesson (812 lines)
- ✅ `TEST_MOCK_QUICK_REFERENCE.md` - Quick guide (151 lines)
- ✅ `MOCK_DRIFT_IMPLEMENTATION_GUIDE.md` - Step-by-step (513 lines)
- ✅ `MOCK_DRIFT_PR_CHECKLIST.md` - Review guide (484 lines)
- ✅ `CL-TEST-001-README.md` - This file (overview)

**Updated documentation:**
- ✅ `.claude/lessons/README.md` - Added CL-TEST-001 to index

**To be created (Phase 1-2):**
- `/tests/factories/` - Directory for factory functions
- `/tests/mocks/` - Directory for service mocks
- `scripts/audit-mocks.ts` - Mock validation script
- `.husky/pre-commit` - Hook for mock validation

---

## Reference Quick Links

| Document | Use Case | Length |
|----------|----------|--------|
| `CL-TEST-001-mock-drift-prevention.md` | Full strategy | 812 lines |
| `TEST_MOCK_QUICK_REFERENCE.md` | Quick patterns | 151 lines |
| `MOCK_DRIFT_IMPLEMENTATION_GUIDE.md` | Implementation | 513 lines |
| `MOCK_DRIFT_PR_CHECKLIST.md` | Code review | 484 lines |
| `CL-TEST-001-README.md` | Navigation | 300 lines |
| **Total** | **Complete system** | **~2,260 lines** |

---

## Implementation Timeline

**Week 1 - Foundation:**
- Day 1-2: Create factories directory and order factory
- Day 3-4: Update 5-10 existing tests
- Day 5: Code review and refinement

**Week 2 - Automation & Docs:**
- Day 1-2: Create audit script and add to CI/CD
- Day 3-4: Update documentation and PR template
- Day 5: Testing and validation

**Week 3 - Adoption:**
- Day 1: Team training session
- Day 2-5: Review PRs using checklist, enforce patterns

**Ongoing:**
- Code review checklist enforcement
- Monthly metric tracking
- Update factories as types evolve

---

## Common Questions

**Q: Do I need to read all 4 documents?**
A: No. Quick reference (151 lines) for daily work, full lesson if designing system, checklist for reviews.

**Q: Can we implement this incrementally?**
A: Yes! Phase 1 of implementation guide covers the foundation. Can rollout in stages.

**Q: What if we have 1000 existing tests?**
A: Prioritize: (1) New tests, (2) Tests for changed types, (3) High-traffic services, (4) Gradual migration of others.

**Q: Will this slow down test writing?**
A: No - faster after setup. First test takes 5 min (create factory), subsequent tests take 30 seconds (use factory).

**Q: What about E2E tests?**
A: Similar patterns apply. Create factories for API response mocks, use same typing rules.

---

## Success Criteria

**Implementation successful when:**
1. All new tests use mocks from factories
2. All mocks have explicit type annotations
3. `npm run typecheck` passes 100%
4. Test audit script runs in CI/CD
5. PR template enforces checklist
6. Team completes training
7. Zero test failures when interface changes (at PR review)

---

## Related Lessons

- **CL-AUTH-001**: Similar drift issue with authentication
- **CL-DB-001**: Similar drift issue with database schemas
- **CL-TEST-002** (future): Mock reset patterns and lifecycle management
- **CL-TEST-003** (future): E2E test data factories

---

## Document Statistics

| Aspect | Value |
|--------|-------|
| Total Lines | ~2,260 |
| Main Strategies | 10 |
| Code Examples | 50+ |
| Implementation Phases | 5 |
| Team Training Sections | 3 |
| PR Checklist Items | 45+ |
| Time to Read Main Lesson | 20-30 min |
| Time to Read Quick Ref | 5-10 min |
| Time to Read Checklist | 15-20 min |
| Time to Implement Phase 1 | 1-2 days |
| Time to Implement Full System | 2-3 weeks |

---

## Document Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-28 | 1.0 | Initial creation - all 5 documents |
| - | TBD | Phase 1 implementation complete |
| - | TBD | Phase 2 automation complete |
| - | TBD | Team adoption metrics |

---

## Getting Started

1. **Right Now:** Read `TEST_MOCK_QUICK_REFERENCE.md` (5 min)
2. **This Week:** Read `CL-TEST-001-mock-drift-prevention.md` (30 min)
3. **Next Week:** Follow `MOCK_DRIFT_IMPLEMENTATION_GUIDE.md` Phase 1 (2 days)
4. **Week 3:** Train team using `MOCK_DRIFT_PR_CHECKLIST.md`
5. **Ongoing:** Enforce in code reviews

---

**Created:** 2025-11-28
**Lesson ID:** CL-TEST-001
**Category:** Testing / Maintenance
**Impact Level:** High (prevents runtime failures caught as test successes)
**Recommended For:** All developers, all code reviewers
