# API Client Consolidation - Implementation Timeline & Checklist

## Overview
**Total Duration:** 5-7 business days  
**Start Date:** [To be scheduled]  
**Target Completion:** [+5-7 days]  
**Team Size:** 1-2 developers  
**Complexity:** Medium (Low risk, well-scoped)

---

## Phase 1: Foundation (Days 1-3)

### Objective
Create the new `useHttpClient()` hook and enhance httpClient with request batching.

### Day 1: Hook Implementation

#### Task 1.1: Create useHttpClient Hook (4 hours)
**File:** `/client/src/services/http/hooks.ts` (NEW)

**Checklist:**
- [ ] Create new file `client/src/services/http/hooks.ts`
- [ ] Implement `useHttpClient<T>()` hook
  - [ ] useState for data, loading, error
  - [ ] useCallback for execute wrapper
  - [ ] Implement get, post, put, patch, del methods
  - [ ] Add reset method
- [ ] Export interface `UseHttpClientReturn<T>`
- [ ] Add comprehensive JSDoc comments

**Code Template:**
```typescript
import { useState, useCallback } from 'react'
import { httpClient } from './httpClient'

export interface UseHttpClientReturn<T = unknown> {
  data: T | undefined
  loading: boolean
  error: Error | null
  execute: (fn: () => Promise<T>) => Promise<T>
  get: (endpoint: string, options?: any) => Promise<T>
  post: (endpoint: string, data?: unknown, options?: any) => Promise<T>
  put: (endpoint: string, data?: unknown, options?: any) => Promise<T>
  patch: (endpoint: string, data?: unknown, options?: any) => Promise<T>
  del: (endpoint: string, options?: any) => Promise<T>
  reset: () => void
}

export function useHttpClient<T = unknown>(): UseHttpClientReturn<T> {
  // Implementation (see main report)
}
```

**Verification:**
- [ ] No TypeScript errors
- [ ] Compiles successfully
- [ ] Hook properly typed

---

#### Task 1.2: Create Unit Tests for useHttpClient (3 hours)
**File:** `/client/src/services/http/__tests__/hooks.test.ts` (NEW)

**Test Coverage:**
- [ ] Test successful GET request
  - [ ] data is set correctly
  - [ ] loading is true during request, false after
  - [ ] error is null on success
- [ ] Test failed request
  - [ ] error is set on failure
  - [ ] data remains unchanged
  - [ ] loading is false on error
- [ ] Test reset functionality
  - [ ] Clears data, error, loading
- [ ] Test state transitions
  - [ ] Correct sequence: idle → loading → success/error
- [ ] Test multiple concurrent requests
  - [ ] Each maintains separate state

**Commands:**
```bash
npm test -- hooks.test.ts
```

**Pass Criteria:**
- [ ] All tests pass
- [ ] 100% coverage for new code
- [ ] No console errors

---

#### Task 1.3: Update http/index.ts Exports (1 hour)
**File:** `/client/src/services/http/index.ts`

**Changes:**
- [ ] Add export for `useHttpClient` hook
- [ ] Add export for `UseHttpClientReturn` type
- [ ] Keep existing exports

**Updated Export:**
```typescript
export { httpClient, getCurrentRestaurantId, setCurrentRestaurantId, APIError } from './httpClient'
export type { HttpRequestOptions } from './httpClient'
export { useHttpClient } from './hooks'
export type { UseHttpClientReturn } from './hooks'
export { RestaurantIdProvider } from './RestaurantIdProvider'
```

**Verification:**
- [ ] No circular imports
- [ ] All exports accessible

---

### Day 2: Hook Testing & Documentation

#### Task 2.1: Comprehensive Hook Testing (4 hours)
**Test Scenarios:**

1. **Auth scenarios:**
   - [ ] Supabase JWT present
   - [ ] localStorage token present
   - [ ] No token
   - [ ] Expired token

2. **Restaurant ID handling:**
   - [ ] Restaurant ID from context
   - [ ] Fallback to env var
   - [ ] Fallback to default

3. **Request methods:**
   - [ ] GET request flow
   - [ ] POST with data
   - [ ] PUT with data
   - [ ] PATCH with data
   - [ ] DELETE request

4. **Error handling:**
   - [ ] Network error
   - [ ] 4xx response
   - [ ] 5xx response
   - [ ] Timeout
   - [ ] Invalid JSON response

**Command:**
```bash
npm test -- hooks.test.ts --coverage
```

**Success Criteria:**
- [ ] 100% line coverage
- [ ] All scenarios tested
- [ ] All tests green

---

#### Task 2.2: Integration Test Setup (3 hours)
**File:** `/client/src/__tests__/api-integration.test.ts` (NEW)

**Test Case:**
```typescript
describe('useHttpClient integration', () => {
  it('should fetch and cache menu items', async () => {
    // Mock httpClient behavior
    // Call useHttpClient hook
    // Verify data, loading, error states
    // Verify cache is used on second call
  })
})
```

**Verification:**
- [ ] Mock httpClient properly
- [ ] Test full request/cache flow
- [ ] Tests pass

---

### Day 3: Request Batching & Integration

#### Task 3.1: Activate Request Batching (2 hours)
**File:** `/client/src/services/http/httpClient.ts`

**Changes to request() method:**
- [ ] Add `batch?: boolean` parameter to `HttpRequestOptions`
- [ ] Check if batching enabled before making request
- [ ] Route to RequestBatcher for GET requests
- [ ] Fallback to direct request on batch failure

**Code Addition:**
```typescript
async request<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
  const {
    params,
    skipAuth = false,
    skipRestaurantId = false,
    skipTransform = false,
    batch = false, // NEW
    ...requestOptions
  } = options

  // Add batching for GET requests when enabled
  if (batch && requestOptions.method === 'GET') {
    try {
      return await this.batcher.batch<T>('GET', endpoint, params)
    } catch (error) {
      logger.warn('Batching failed, falling back to direct request', error)
      // Fall through to regular request
    }
  }

  // ... rest of implementation
}
```

**Verification:**
- [ ] No TypeScript errors
- [ ] Existing tests still pass
- [ ] Batching optional (doesn't break current behavior)

---

#### Task 3.2: Consolidate Caching (2 hours)
**File:** `/client/src/services/http/httpClient.ts`

**Changes:**
- [ ] Review dual caching (simple cache + ResponseCache)
- [ ] Decide: Keep dual or consolidate to ResponseCache only
- [ ] If consolidating:
  - [ ] Update get() method
  - [ ] Remove simple cache Map
  - [ ] Update clear() method
  - [ ] Update window.__httpCache debug helper

**Option A: Keep Dual (Safer)**
- No changes required
- Simple cache provides fast access
- ResponseCache provides LRU + memory limits

**Option B: Consolidate (Simpler)**
- Remove simple cache logic
- Rely only on ResponseCache
- Update tests accordingly

**Recommendation:** Option A (Keep Dual) - Lower risk

**Verification:**
- [ ] Cache still works correctly
- [ ] TTL values still enforced
- [ ] Tests pass

---

#### Task 3.3: End-to-end Test (1 hour)

**Test Scenario:**
1. Call useHttpClient hook
2. Make GET request (should cache)
3. Make same GET request (should use cache)
4. Make POST request (should invalidate cache)
5. Make same GET request (should fetch fresh)

**Commands:**
```bash
npm test
npm run build
```

**Success Criteria:**
- [ ] All unit tests pass
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No console warnings

---

## Phase 2: Hook Migration (Days 4-5)

### Objective
Migrate 4 useApiRequest consumers to useHttpClient.

### Day 4: VoiceCheckout & Kiosk Migration

#### Task 4.1: Migrate VoiceCheckoutOrchestrator (2 hours)
**File:** `/client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts`

**Current Code:**
```typescript
import { useApiRequest } from '@/hooks/useApiRequest'

export class VoiceCheckoutOrchestrator extends EventEmitter {
  private apiClient: ReturnType<typeof useApiRequest> | null = null
  
  initialize(apiClient: ReturnType<typeof useApiRequest>) {
    this.apiClient = apiClient
  }
}
```

**Updated Code:**
```typescript
import { useHttpClient } from '@/services/http'

export class VoiceCheckoutOrchestrator extends EventEmitter {
  private httpClient: ReturnType<typeof useHttpClient> | null = null
  
  initialize(httpClient: ReturnType<typeof useHttpClient>) {
    this.httpClient = httpClient
  }
}
```

**Checklist:**
- [ ] Replace import statement
- [ ] Rename apiClient to httpClient
- [ ] Update type annotation
- [ ] Update JSDoc if present
- [ ] Verify all methods using this.apiClient still work

**Testing:**
```bash
npm test -- VoiceCheckoutOrchestrator
```

**Verification:**
- [ ] Tests pass
- [ ] No TypeScript errors

---

#### Task 4.2: Migrate useKioskOrderSubmission (1.5 hours)
**File:** `/client/src/hooks/kiosk/useKioskOrderSubmission.ts`

**Changes:**
- [ ] Replace useApiRequest import with useHttpClient
- [ ] Update hook initialization
- [ ] Update state management if needed
- [ ] Verify error handling still works

**Checklist:**
- [ ] Import updated
- [ ] Hook interface matches
- [ ] All methods still functional
- [ ] Error handling preserved

**Testing:**
```bash
npm test -- useKioskOrderSubmission
```

---

#### Task 4.3: Verify Related Tests (1.5 hours)
**Files:**
- `/client/src/services/http/__tests__/hooks.test.ts` (from Phase 1)
- `/client/src/modules/voice/services/__tests__/VoiceCheckoutOrchestrator.test.ts`
- `/client/src/hooks/kiosk/__tests__/useKioskOrderSubmission.test.ts`

**Actions:**
- [ ] Update test mocks to use useHttpClient
- [ ] Verify mock data structure matches
- [ ] Run all tests
- [ ] Fix any failing tests

**Commands:**
```bash
npm test -- --testPathPattern="(VoiceCheckout|useKiosk)" --coverage
```

---

### Day 5: Terminal & Additional Migrations

#### Task 5.1: Migrate useSquareTerminal (1.5 hours)
**File:** `/client/src/hooks/useSquareTerminal.ts`

**Changes:**
- [ ] Replace useApiRequest with useHttpClient
- [ ] Verify Payment integration still works
- [ ] Check error handling

**Testing:**
```bash
npm test -- useSquareTerminal
```

---

#### Task 5.2: Integration Test - Complete Hook Migration (2 hours)

**Test Plan:**
1. Test VoiceCheckoutOrchestrator with useHttpClient
2. Test useKioskOrderSubmission with useHttpClient
3. Test useSquareTerminal with useHttpClient
4. Test all three work together in a flow

**Commands:**
```bash
npm test -- --testPathPattern="(Voice|Kiosk|Square)" --coverage
npm run build
```

**Success Criteria:**
- [ ] All useApiRequest consumers migrated
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No console errors

---

#### Task 5.3: End-of-Phase Verification (1 hour)

**Checklist:**
- [ ] All 4 useApiRequest consumers updated
- [ ] useApiRequest.ts still exists (not deleted yet)
- [ ] All tests passing
- [ ] Build successful
- [ ] No remaining useApiRequest imports in migrated files

**Commands:**
```bash
grep -r "useApiRequest" client/src --include="*.ts" --exclude-dir=node_modules
# Should only find: hooks/useApiRequest.ts itself
npm test
npm run build
```

---

## Phase 3: Facade Migration (Day 6)

### Objective
Migrate 9 api facade consumers to domain services.

### Day 6: Api Facade Elimination

#### Task 6.1: Migrate VoiceOrderProcessor (1 hour)
**File:** `/client/src/modules/voice/services/VoiceOrderProcessor.ts`

**Before:**
```typescript
import { api } from '@/services/api'
const items = await api.getMenuItems()
```

**After:**
```typescript
import { menuService } from '@/services'
const items = await menuService.getMenuItems()
```

**Checklist:**
- [ ] Replace api import with service
- [ ] Update all api.* calls to service calls
- [ ] Verify method names match
- [ ] Test still passes

---

#### Task 6.2: Migrate orderIntegration (1 hour)
**File:** `/client/src/modules/voice/services/orderIntegration.ts`

**Changes:**
- [ ] Replace api import with relevant services
- [ ] Update api.getMenuItems() → menuService.getMenuItems()

---

#### Task 6.3: Migrate useOrderHistory & useKitchenOrdersRealtime (1 hour)
**Files:**
- `/client/src/hooks/useOrderHistory.ts`
- `/client/src/hooks/useKitchenOrdersRealtime.ts`

**Changes:**
- [ ] Replace api → orderService, orderHistoryService imports
- [ ] Update all api.* calls

---

#### Task 6.4: Clean Up stationRouting.ts (30 min)
**File:** `/client/src/services/stationRouting.ts`

**Actions:**
- [ ] Remove api import
- [ ] Verify file still compiles
- [ ] Check if any api functionality actually used

**Checklist:**
- [ ] Import removed
- [ ] No compilation errors

---

#### Task 6.5: Verify All Migrations (1 hour)

**Commands:**
```bash
# Check for remaining api imports
grep -r "from.*api['\"]" client/src --include="*.ts" | grep -v "services/api.ts"

# Should only show in api.ts itself and tests
npm test
npm run build
```

**Success Criteria:**
- [ ] All 9 api facade consumers migrated
- [ ] No remaining api imports (except in api.ts)
- [ ] All tests pass
- [ ] Build successful

---

## Phase 4: Cleanup (Day 7)

### Objective
Delete deprecated files and verify final state.

### Day 7: Final Cleanup & Verification

#### Task 7.1: Delete Deprecated Files (30 min)

**Files to Delete:**
1. `/client/src/hooks/useApiRequest.ts` (185 LOC)
2. `/client/src/services/api.ts` (43 LOC)

**Actions:**
```bash
rm client/src/hooks/useApiRequest.ts
rm client/src/services/api.ts
```

**Checklist:**
- [ ] Verify no other files import these
- [ ] Git clean after deletion
- [ ] No dangling imports

**Verification:**
```bash
grep -r "useApiRequest" client/src
grep -r "services/api" client/src
# Both should return nothing
```

---

#### Task 7.2: Update Service Exports (30 min)
**Files:**
- `/client/src/services/index.ts`
- `/client/src/services/http/index.ts`

**Changes to services/index.ts:**
```typescript
// Remove this line:
// export * from './api'

// Keep everything else:
export { orderService } from './orders/OrderService'
export { orderHistoryService } from './orders/OrderHistoryService'
// ... etc
```

**Changes to services/http/index.ts:**
```typescript
// Already done in Phase 1, but verify:
export { httpClient, getCurrentRestaurantId, setCurrentRestaurantId, APIError } from './httpClient'
export type { HttpRequestOptions } from './httpClient'
export { useHttpClient } from './hooks'
export type { UseHttpClientReturn } from './hooks'
export { RestaurantIdProvider } from './RestaurantIdProvider'
```

**Verification:**
```bash
npm run build
```

---

#### Task 7.3: Final Comprehensive Test (1 hour)

**Test Categories:**

1. **Unit Tests**
   ```bash
   npm test
   ```
   - [ ] All tests pass
   - [ ] No skipped tests
   - [ ] Coverage maintained or improved

2. **Build Verification**
   ```bash
   npm run build
   ```
   - [ ] No errors
   - [ ] No warnings
   - [ ] Bundle size acceptable

3. **Type Checking**
   ```bash
   npx tsc --noEmit
   ```
   - [ ] No TypeScript errors
   - [ ] All types resolved

4. **Linting**
   ```bash
   npm run lint
   ```
   - [ ] No linting errors
   - [ ] No unused imports
   - [ ] Code quality maintained

5. **Search Verification**
   ```bash
   grep -r "useApiRequest\|services/api\|secureApi\|fetch(" client/src --include="*.ts"
   ```
   - [ ] No useApiRequest imports
   - [ ] No api facade imports
   - [ ] No secureApi direct usage
   - [ ] Only legitimate fetch() calls (RequestBatcher, WebRTC, tests)

---

#### Task 7.4: Documentation Update (30 min)

**Files to Update:**
- [ ] Create `API_CLIENT_USAGE_GUIDE.md`
- [ ] Update main README with new pattern
- [ ] Add migration notes for future developers

**Example Documentation:**
```markdown
# Using httpClient in Macon OS

## Service Layer
```typescript
import { httpClient } from '@/services/http/httpClient'

export class MyService {
  async getData() {
    return httpClient.get('/api/v1/data')
  }
}
```

## Component/Hook Level
```typescript
import { useHttpClient } from '@/services/http'

export function MyComponent() {
  const { data, loading, error, get } = useHttpClient()
  
  useEffect(() => {
    get('/api/v1/data')
  }, [])
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>{JSON.stringify(data)}</div>
}
```
```

---

#### Task 7.5: Final Verification & Sign-off (30 min)

**Checklist:**
- [ ] All tests passing
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Documentation updated
- [ ] Team notified of changes
- [ ] Git commit with clear message

**Final Commands:**
```bash
npm test
npm run build
npm run lint
git status
git log --oneline -10
```

---

## Success Criteria Checklist

### Phase 1 Completion
- [ ] useHttpClient hook created and tested
- [ ] httpClient request batching activated
- [ ] All existing tests pass
- [ ] Build succeeds
- [ ] No TypeScript errors

### Phase 2 Completion
- [ ] All 4 useApiRequest consumers migrated
- [ ] All tests passing
- [ ] Build succeeds
- [ ] Hook types correctly applied

### Phase 3 Completion
- [ ] All 9 api facade consumers migrated
- [ ] No remaining api imports
- [ ] All tests passing
- [ ] Build succeeds

### Phase 4 Completion (FINAL)
- [ ] Deprecated files deleted
- [ ] No orphaned imports
- [ ] All exports updated
- [ ] Full test suite passes
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] Team signoff obtained

---

## Rollback Plan

### If Critical Issue Discovered

**Immediate Actions:**
1. Stop deployment
2. Document the issue
3. Revert last commit
4. Identify root cause

**Git Rollback:**
```bash
git revert HEAD~1..HEAD
git push origin main
```

**Testing After Rollback:**
```bash
npm test
npm run build
```

**Recovery:**
- Fix identified issue
- Re-execute phase that failed
- Additional testing before proceeding

---

## Communication Plan

### Daily Status
- **Start of day:** Brief standup on blockers
- **End of day:** Summary of completed tasks

### Phase Completion
- Notify team when each phase completes
- Share test results
- Request code review if needed

### Final Sign-off
- Present consolidated architecture
- Demonstrate new usage patterns
- Discuss benefits (41% code reduction, 0 duplicates)

---

## Performance Metrics (Track Throughout)

### Before & After Comparison

| Metric | Before | Target | How to Measure |
|--------|--------|--------|-----------------|
| API Client Files | 3 | 1 | `find client/src -name "*client*" -o -name "*api*.ts"` |
| Total API Code (LOC) | ~878 | ~550 | `wc -l` on all API files |
| Duplicate Features | High | Zero | Feature matrix comparison |
| Direct fetch() Calls | 8 | 0 | `grep -c "fetch("` |
| Build Time | Baseline | Equal or better | `time npm run build` |
| Bundle Size | Baseline | Equal or better | Check dist/ size |
| Test Coverage | Current | Maintained+ | `npm test -- --coverage` |

---

## Risk Mitigation Strategies

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Breaking auth | High | Comprehensive auth testing in Phase 2 |
| Cache issues | Medium | Keep dual cache in Phase 1, test extensively |
| Batch failures | Low | Make batching opt-in, not default |
| Import errors | Medium | Use grep to verify all imports clean |
| Performance degradation | Low | Monitor build time & bundle size |

---

**Total Duration:** 5-7 business days  
**Ready for:** Team review and scheduling

