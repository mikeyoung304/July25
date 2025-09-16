# Technical Debt Registry

## Top 20 Issues by Blast Radius × Effort

| Rank | Issue | Blast Radius | Effort | Score | Evidence |
|------|-------|--------------|--------|-------|----------|
| 1 | Missing KDS status handlers | Critical | Low | 10 | `StationStatusBar.tsx:45`, `useTableGrouping.tsx` |
| 2 | Status validation schemas incomplete | Critical | Low | 10 | `/shared/types/validation.ts` missing 'new' |
| 3 | Memory leaks in WebSocket/WebRTC | High | Medium | 8 | 12 useEffects missing cleanup |
| 4 | Restaurant ID gaps | High | Low | 8 | `useOrderSubmission.ts:59` env var only |
| 5 | Field transform chaos | High | High | 7 | 15+ ad-hoc transform locations |
| 6 | Missing RLS policies | Critical | Medium | 7 | orders, menu_items, restaurants tables |
| 7 | Node crypto in client | High | Low | 7 | `client/src/utils/crypto.ts` |
| 8 | 100+ extraneous packages | Medium | Low | 6 | `deps_unused.csv`, commitlint suite |
| 9 | Test suite 18% failures | Medium | High | 5 | 58/316 tests failing |
| 10 | Duplicate error boundaries | Medium | Low | 5 | 3 implementations found |
| 11 | Orphaned files (41) | Low | Low | 4 | `orphan_files.csv` |
| 12 | Split payment UI missing | Medium | High | 4 | Backend done, no frontend |
| 13 | Dev code in production | Medium | Low | 4 | MockDataBanner, VoiceDebugPanel |
| 14 | Webhook auth missing | High | Medium | 4 | `/api/v1/webhooks/*` unprotected |
| 15 | Bundle over target | Low | Medium | 3 | 109KB vs 100KB target |
| 16 | Stale documentation | Low | High | 2 | 73 files >90 days old |
| 17 | ADR-007 conflict | Low | Low | 2 | Two different ADR-007 files |
| 18 | Missing integration tests | Medium | High | 2 | No E2E order flow tests |
| 19 | WebSocket no backoff | Medium | Medium | 2 | Reconnection storms possible |
| 20 | Legacy field support | Low | Medium | 1 | `transformLegacyOrderPayload()` |

## Debt Categories

### 🔴 Critical Architecture Flaws
- **Inconsistent data contracts**: Field names vary across layers
- **Missing abstraction boundaries**: Transforms scattered in domain code
- **Incomplete error handling**: Missing status cases cause crashes
- **Memory management gaps**: Long-running components leak resources

### 🟡 Security & Compliance Debt
- **Missing RLS**: Database vulnerable to service key compromise  
- **Unprotected endpoints**: Webhooks, some table routes
- **Test token paths**: Not fully rejected everywhere
- **Debug code in prod**: Information disclosure risk

### 🟢 Maintenance & Quality Debt
- **Dead code**: 41 orphaned files, 100+ unused exports
- **Package bloat**: 100+ unnecessary dependencies
- **Test coverage**: 18% failure rate blocks verification
- **Documentation rot**: 73 stale files, missing ADRs

## Code Smells Inventory

### Duplication (High Priority)
- 3 error boundary implementations
- 2 cart context variations (should be 1)
- Multiple auth check patterns
- Repeated WebSocket connection logic

### Coupling (Medium Priority) 
- Components directly accessing snake_case fields
- Kiosk tightly coupled to environment variables
- Test files importing implementation details
- WebSocket handlers mixed with business logic

### Complexity (Low Priority)
- 15+ field transformation points
- Switch statements without exhaustive checks
- Nested ternary operators in JSX
- Complex useEffect dependencies

## Refactoring Opportunities

### Quick Wins (< 2 hours each)
1. Add missing status cases
2. Fix validation schemas
3. Remove duplicate error boundaries
4. Delete orphaned test files
5. Add useEffect cleanup

### Medium Efforts (2-8 hours)
1. Centralize field transforms
2. Fix restaurant_id propagation
3. Remove extraneous packages
4. Consolidate auth patterns
5. Add webhook protection

### Major Refactors (> 8 hours)
1. Implement split payment UI
2. Add comprehensive RLS
3. Fix all failing tests
4. Create integration test suite
5. Document architecture decisions

## Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Test pass rate | 81.6% | 95% | -13.4% |
| Bundle size | 109KB | 100KB | +9KB |
| Type errors | 560 | 0 | +560 |
| ESLint warnings | 573 | 0 | +573 |
| Orphaned files | 41 | 0 | +41 |
| Stale docs | 73 | <10 | +63 |
| Memory leaks | 12 | 0 | +12 |
| Coverage | Unknown | 60% | ? |

## Debt Payment Strategy

### Sprint 1 (Days 1-3): Stop the Bleeding
- Fix validation schemas
- Add missing status handlers
- Fix memory leaks
- Remove Node crypto

### Sprint 2 (Days 4-7): Security Hardening  
- Add RLS policies
- Protect webhooks
- Fix restaurant_id gaps
- Remove test tokens

### Sprint 3 (Week 2): Quality Improvement
- Fix failing tests
- Remove orphaned files
- Consolidate duplicates
- Update documentation

### Sprint 4 (Week 3): Architecture Cleanup
- Centralize transforms
- Add integration tests
- Implement split payments
- Document decisions