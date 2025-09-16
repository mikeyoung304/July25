# Risk Assessment Report

## P0 - Critical Production Blockers

### 1. KDS Status Validation Schema Bug
**Impact**: Orders with 'new' status rejected  
**Evidence**: `/shared/types/validation.ts` - Missing 'new' in Zod schema  
**Fix Time**: 10 minutes  
**Risk**: Every new order fails validation

### 2. Missing Order Status Handlers
**Impact**: Runtime crashes in KDS displays  
**Evidence**: `StationStatusBar.tsx:45` - No 'cancelled' case  
**Fix Time**: 30 minutes  
**Risk**: ErrorBoundary failures, incorrect metrics

### 3. Node.js Crypto in Client Code
**Impact**: Build failures in browser environments  
**Evidence**: `client/src/utils/crypto.ts` importing Node crypto  
**Fix Time**: 1 hour  
**Risk**: Production builds may fail

### 4. Restaurant ID Bypass in Kiosk
**Impact**: Orders assigned to wrong restaurant  
**Evidence**: `useOrderSubmission.ts:59` - Uses env var only  
**Fix Time**: 2 hours  
**Risk**: Multi-tenant data leakage

### 5. Memory Leaks in WebSocket/WebRTC
**Impact**: Browser crashes after 4-6 hours  
**Evidence**: Missing cleanup in 12 useEffect hooks  
**Fix Time**: 3 hours  
**Risk**: Kiosk/KDS terminals crash daily

## P1 - Security & Data Integrity

### 6. Missing RLS Policies
**Impact**: Database vulnerable if service key compromised  
**Evidence**: orders, menu_items, restaurants tables lack RLS  
**Fix Time**: 4 hours  
**Risk**: Data breach potential

### 7. Webhook Endpoints Unprotected
**Impact**: External services can trigger actions  
**Evidence**: `/api/v1/webhooks/*` no auth guards  
**Fix Time**: 2 hours  
**Risk**: Unauthorized system manipulation

### 8. Test Tokens Not Fully Rejected
**Impact**: Potential auth bypass in edge cases  
**Evidence**: Some endpoints don't check for test tokens  
**Fix Time**: 2 hours  
**Risk**: Authentication compromise

### 9. Field Transformation Inconsistencies
**Impact**: API contract mismatches cause failures  
**Evidence**: 15+ locations with ad-hoc transforms  
**Fix Time**: 8 hours  
**Risk**: Order submission failures

### 10. Split Payment UI Missing
**Impact**: Feature advertised but unusable  
**Evidence**: Backend complete, no frontend  
**Fix Time**: 16 hours  
**Risk**: Customer dissatisfaction

## P2 - Technical Debt & Performance

### 11. 100+ Extraneous NPM Packages
**Impact**: Slow builds, security vulnerabilities  
**Evidence**: `deps_unused.csv` - commitlint suite unused  
**Fix Time**: 2 hours  
**Risk**: Supply chain attacks

### 12. Test Suite 18.4% Failure Rate
**Impact**: Can't verify payment flows  
**Evidence**: 58 of 316 tests failing  
**Fix Time**: 8 hours  
**Risk**: Regressions go undetected

### 13. Orphaned Files (41 identified)
**Impact**: Bundle bloat, confusion  
**Evidence**: `orphan_files.csv`  
**Fix Time**: 4 hours  
**Risk**: 150-200KB unnecessary code

### 14. Duplicate Error Boundaries
**Impact**: Inconsistent error handling  
**Evidence**: 3 competing implementations  
**Fix Time**: 2 hours  
**Risk**: Errors handled differently

### 15. Development Code in Production
**Impact**: Bundle size, security leaks  
**Evidence**: MockDataBanner, VoiceDebugPanel in prod  
**Fix Time**: 1 hour  
**Risk**: Debug info exposed

### 16. Documentation Debt (73 stale files)
**Impact**: Misleading information  
**Evidence**: CONTRIBUTING.md 138 days old  
**Fix Time**: 8 hours  
**Risk**: Developer confusion

### 17. ADR-007 Conflict
**Impact**: Architectural confusion  
**Evidence**: Two different ADR-007 files  
**Fix Time**: 30 minutes  
**Risk**: Wrong decisions followed

### 18. Bundle Size Over Target
**Impact**: Slow initial load  
**Evidence**: Main chunk 109KB (target 100KB)  
**Fix Time**: 4 hours  
**Risk**: Poor mobile performance

### 19. Missing Integration Tests
**Impact**: E2E flows not verified  
**Evidence**: No tests for order→payment→KDS flow  
**Fix Time**: 16 hours  
**Risk**: Critical path failures

### 20. WebSocket Reconnection Storms
**Impact**: Server overload during network issues  
**Evidence**: No exponential backoff implemented  
**Fix Time**: 4 hours  
**Risk**: Cascading failures

## Risk Matrix

| Risk | Probability | Impact | Detection | Mitigation |
|------|------------|--------|-----------|------------|
| Status validation | High | Critical | Easy | Fix schemas |
| Memory leaks | High | High | Medium | Add cleanup |
| Missing RLS | Low | Critical | Hard | Add policies |
| Field mismatches | Medium | High | Easy | Centralize transforms |
| Test failures | Certain | Medium | Immediate | Fix or delete |

## Immediate Actions Required

1. **Fix validation schemas** - Add missing statuses
2. **Add cleanup to useEffects** - Prevent memory leaks  
3. **Remove Node crypto** - Use Web Crypto API
4. **Fix restaurant_id in kiosk** - Use context not env
5. **Add default cases** - All status switches

## Security Recommendations

1. Enable RLS on all tables
2. Add webhook signature validation
3. Remove all test token paths
4. Audit all auth bypass conditions
5. Add rate limiting to all endpoints