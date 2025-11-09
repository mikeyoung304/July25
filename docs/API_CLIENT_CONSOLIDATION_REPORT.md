# API Client Consolidation Investigation Report
## Macon AI Restaurant OS - Phase 2 Refactoring

**Generated:** November 9, 2025  
**Phase:** 2 (Consolidation from 3 clients to 1)  
**Target Completion:** Single unified `httpClient` across codebase

---

## Executive Summary

This codebase currently contains **3 active API clients** providing overlapping HTTP communication capabilities:

1. **`httpClient`** (416 LOC) - Modern, feature-rich primary client with caching, batching, and request deduplication
2. **`secureApi`** (234 LOC) - Base HTTP client with security features (input sanitization, timeout, retry logic)
3. **`useApiRequest`** (185 LOC) - React Hook wrapper providing hooks-based API access with loading/error states

Additionally, there are **2 legacy patterns** still in use:
- **`api`** facade (43 LOC) - Delegates to domain services, marked as "backward compatibility"
- **Direct `fetch()` calls** in 8 files including test files and RequestBatcher itself

The goal is to consolidate everything into a single, feature-complete `httpClient` that all code paths use uniformly.

---

## Client Inventory

| Client | Path | LOC | Type | Usage Count | Primary Purpose |
|--------|------|-----|------|-------------|-----------------|
| **httpClient** | `services/http/httpClient.ts` | 416 | Singleton Class | 48 | Primary HTTP client with caching, batching, multi-tenancy |
| **secureApi** | `services/secureApi.ts` | 234 | Base Class | 2 | Security-hardened fetch wrapper (timeout, retry, sanitization) |
| **useApiRequest** | `hooks/useApiRequest.ts` | 185 | React Hook | 9 | Hooks-based API access with state management |
| **api** | `services/api.ts` | 43 | Facade | 9 | Legacy wrapper delegating to domain services |
| **fetch()** | Various | N/A | Direct calls | 8 | Raw fetch (should be eliminated) |

**Total API Client Code:** ~878 lines (excluding direct fetch calls)

---

## Detailed Client Analysis

### 1. HttpClient (PRIMARY - Recommended Target)

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts`  
**Lines of Code:** 416  
**Status:** Feature-complete, actively used

#### Capabilities
- **Class Structure:** Extends `SecureAPIClient` (inherits security features)
- **Authentication:** Dual support (Supabase JWT + localStorage demo/PIN/station tokens)
- **Multi-tenancy:** `x-restaurant-id` header injection with `setCurrentRestaurantId()` pattern
- **Request Methods:** GET, POST, PUT, PATCH, DELETE with TypeScript generics
- **Caching System:** Dual-layer caching
  - Simple in-memory cache with TTL per endpoint (configurable)
  - ResponseCache with LRU eviction and memory limits
- **Request Deduplication:** In-flight request tracking prevents duplicate concurrent requests
- **Request Batching:** RequestBatcher integration (but only initialized, not actively used)
- **Error Handling:** APIError class with status codes and details
- **Config:** Base URL from centralized config, dev/prod warnings
- **Cache Invalidation:** Automatic on mutations (POST, PUT, PATCH, DELETE)

#### Import Locations (48 total occurrences)
- OrderService (5 imports)
- MenuService (5 imports)
- TableService (1 import)
- WebSocketService (1 import + test)
- OrderService tests (20)
- Mock (1)
- Other services (10)

#### Current Issues
- RequestBatcher initialized but not actively integrated into main request flow
- Dual caching system (simple cache + ResponseCache) with some redundancy
- No active usage of batching endpoint despite infrastructure

---

### 2. SecureAPIClient (BASE CLASS)

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/secureApi.ts`  
**Lines of Code:** 234  
**Status:** Parent class to httpClient, minimally used directly

#### Capabilities
- **Request Methods:** Base implementation of GET, POST, PUT, PATCH, DELETE
- **Security Features:**
  - Input sanitization on URL params (via `sanitizeInput()`)
  - CSRF token support (currently disabled/commented)
  - X-Request-ID header generation for tracing
  - Same-origin credentials support
- **Timeout Handling:** 30s default, customizable per-request, AbortController
- **Retry Logic:** Exponential backoff with jitter for 5xx errors and 429 rate limiting
- **Error Handling:** APIError class with status codes and error details
- **Response Validation:** Content-type checking (application/json only)

#### Direct Usage
- **Only 2 files directly import SecureAPIClient:**
  1. `httpClient.ts` (extends it)
  2. `secureApi.ts` itself (creates singleton instance: `secureApi`)

#### Current State
- Acting as a base class is fine, but direct `secureApi` instance is never used
- All security features are inherited by httpClient properly

---

### 3. UseApiRequest (REACT HOOK WRAPPER)

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/hooks/useApiRequest.ts`  
**Lines of Code:** 185  
**Status:** Used in component-level code, needs integration path

#### Capabilities
- **Interface:** React Hook returning `ApiRequestReturn<T>`
- **State Management:** data, loading, error, execute, reset
- **Request Methods:** get, post, put, patch, del (using execute)
- **Authentication:** Supabase JWT or environment-based fallback
- **Headers:** Restaurant ID injection, custom headers support, Content-Type auto-setting
- **Error Handling:** Detailed error parsing with nested error object support
- **Content-Type Handling:** Graceful null return for non-JSON responses

#### Import Locations (9 total)
- VoiceCheckoutOrchestrator (3 imports)
- useKioskOrderSubmission (2)
- useSquareTerminal (2)
- useApiRequest itself (2)

#### Current Issues
- Uses raw `fetch()` directly, bypassing all httpClient features (caching, deduplication, batching)
- Duplicate header logic (restaurant ID, auth) already in httpClient
- No access to cache clearing/invalidation features
- Component-level state management could be unified with a service-level alternative

---

### 4. Legacy API Facade

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/api.ts`  
**Lines of Code:** 43  
**Status:** Marked as "backward compatibility", delegates to domain services

#### Pattern
```typescript
export const api = {
  getOrders: (filters) => orderService.getOrders(filters),
  submitOrder: (data) => orderService.submitOrder(data),
  getTables: () => tableService.getTables(),
  getMenuItems: () => menuService.getMenuItems(),
  // ... etc
}
```

#### Import Locations (9 total)
- VoiceOrderProcessor (1)
- orderIntegration (1)
- stationRouting (1)
- OrderHistoryService (1, commented out)
- useOrderHistory (2)
- useKitchenOrdersRealtime (1)
- Test files (2)

#### Current Issues
- **Double-wrapping:** api → domain service → httpClient (adds indirection)
- **No new value:** Domain services directly call httpClient, api adds no features
- **Migration blocker:** Some components still depend on this pattern

---

### 5. Direct fetch() Usage

**Files using raw fetch() (8 total):**
1. `useApiRequest.ts` - Primary implementation
2. `secureApi.ts` - Base client (expected)
3. `RequestBatcher.ts` - Batch endpoint fallback (expected)
4. `WebRTCConnection.ts` - WebRTC signaling (should stay, not REST)
5. `VoiceSessionConfig.ts` - Session fetches
6. `useOrderData.ts` - Order data loading
7. `useVoiceOrderWebRTC.ts` - WebRTC related
8. Test files (2) - useOrderData.test.ts

#### Analysis
- Some raw fetch usage is legitimate (WebRTC, session management)
- REST API calls should go through httpClient

---

## Architecture Comparison

### Current Architecture (Fragmented)
```
┌─────────────────────────────────────────────────────────┐
│               Component/Hook Layer                       │
├─────────────────────────────────────────────────────────┤
│  useApiRequest   │  useOrderData   │  Direct fetch()    │
└────────┬─────────┴────────┬────────┴────────┬───────────┘
         │ hooks            │ direct calls     │
         │                  │                  │
┌────────┴────────────────────┬────────────────┴───────────┐
│         Domain Services Layer                            │
│  OrderService │ MenuService │ TableService │ etc.       │
└────────┬──────────┬─────────────────────────────────────┘
         │ uses     │
┌────────┴──────────┴─────────────────────────────────────┐
│           HttpClient Ecosystem                          │
│  httpClient → SecureAPIClient → fetch()                │
│  + ResponseCache + RequestBatcher                       │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (Unified)
```
┌─────────────────────────────────────────────────────────┐
│               Component/Hook Layer                       │
└────────┬─────────────────────────────────────────────────┘
         │ useHttpClient() hook
┌────────┴─────────────────────────────────────────────────┐
│           Domain Services Layer (Optional)               │
│  OrderService │ MenuService │ TableService │ etc.       │
│  (thin wrappers, optional for future removal)           │
└────────┬─────────────────────────────────────────────────┘
         │ uses
┌────────┴─────────────────────────────────────────────────┐
│    Unified HttpClient (Feature-Complete)                │
│  GET/POST/PUT/PATCH/DELETE with:                       │
│  • Supabase + localStorage JWT auth                    │
│  • x-restaurant-id multi-tenancy                       │
│  • ResponseCache (LRU, TTL-based)                      │
│  • Request deduplication                               │
│  • Request batching infrastructure                     │
│  • Retry logic (exponential backoff)                   │
│  • Timeout handling (AbortController)                  │
│  • Input sanitization                                  │
│  • Error handling with APIError class                 │
└─────────────────────────────────────────────────────────┘
```

---

## Consolidation Analysis

### Feature Matrix

| Feature | httpClient | secureApi | useApiRequest |
|---------|-----------|-----------|---------------|
| **JWT Authentication** | ✅ Supabase + localStorage | ❌ | ✅ Supabase only |
| **Restaurant ID Header** | ✅ | ❌ | ✅ |
| **Input Sanitization** | ✅ (inherited) | ✅ | ❌ |
| **Timeout** | ✅ (inherited) | ✅ | ❌ |
| **Retry Logic** | ✅ (inherited) | ✅ | ❌ |
| **Request Deduplication** | ✅ In-flight tracking | ❌ | ❌ |
| **Response Caching** | ✅ Dual-layer (LRU) | ❌ | ❌ |
| **Request Batching** | ✅ Infrastructure | ❌ | ❌ |
| **React Hooks Interface** | ❌ | ❌ | ✅ |
| **Loading/Error State** | ❌ | ❌ | ✅ |

### Duplicate Functionality

| Capability | Location | Consolidate To |
|-----------|----------|-----------------|
| JWT Auth | httpClient, useApiRequest | Keep in httpClient |
| Restaurant ID | httpClient, useApiRequest | Keep in httpClient |
| Error Handling | httpClient, secureApi, useApiRequest | httpClient (consistent) |
| Request Method Wrappers | All three | httpClient |
| Headers Management | httpClient, useApiRequest | httpClient |

### What httpClient is Missing

For 100% consolidation, httpClient needs:

1. **React Hooks Wrapper** - `useHttpClient()` hook providing:
   - Loading/error/data state management
   - Async execution with state updates
   - Compatible with `useApiRequest()` consumers
   
2. **Request Batching Activation** - Currently infrastructure exists but isn't activated:
   - Integrate RequestBatcher into main request flow
   - Use batch endpoint for multiple concurrent GET requests
   - Intelligently decide when batching is beneficial

3. **Better Hooks Integration** - Direct DOM access:
   - useAsyncState (currently used by useApiRequest) could be integrated
   - Toast notifications on errors (currently in useApiRequest consumers)

### What Can Be Deleted

1. **secureApi.ts** - Fully absorbed by httpClient
2. **useApiRequest.ts** - Replace with `useHttpClient()` hook
3. **api.ts** - Delete (delegates to domain services)
4. **Domain service dependency on api facade** - They should directly call httpClient

---

## Migration Strategy

### Phase 1: Enhanced HttpClient (No Breaking Changes)
**Effort:** 2-3 days | **Risk:** Low

1. **Create `useHttpClient()` hook** in `services/http/hooks.ts`
   - Wraps httpClient with React state management
   - Provides same interface as useApiRequest
   - Returns { data, loading, error, get, post, put, patch, del }

2. **Activate Request Batching**
   - Uncomment/integrate RequestBatcher into httpClient.request()
   - Batch GET requests automatically for same endpoint
   - Configure batch thresholds

3. **Consolidate Caching**
   - Remove duplicate in-memory cache
   - Use only ResponseCache with LRU
   - Update TTL strategy

**Migration Path:**
```typescript
// Before
import { useApiRequest } from '@/hooks/useApiRequest';
const api = useApiRequest();

// After
import { useHttpClient } from '@/services/http';
const { get, post } = useHttpClient();
```

### Phase 2: Migrate useApiRequest Consumers (1-2 days)
**Effort:** 1-2 days | **Risk:** Low-Medium

**Files to migrate (4 total):**
1. VoiceCheckoutOrchestrator.ts - Replace useApiRequest with useHttpClient
2. useKioskOrderSubmission.ts - Replace useApiRequest with useHttpClient
3. useSquareTerminal.ts - Replace useApiRequest with useHttpClient
4. Tests using useApiRequest - Update mock/test patterns

**Validation:**
- All 4 files should work identically
- Toast/error handling can be moved to component level if needed

### Phase 3: Migrate api Facade Consumers (1 day)
**Effort:** 1 day | **Risk:** Low

**Files to migrate (9 total):**
1. VoiceOrderProcessor.ts - Direct httpClient usage
2. orderIntegration.ts - Direct httpClient usage
3. stationRouting.ts - Already uses api types, no actual calls
4. useOrderHistory.ts - Use orderService directly
5. useKitchenOrdersRealtime.ts - Use orderService directly
6. Tests - Update mock patterns

**Key Change:**
```typescript
// Before
import { api } from '@/services/api';
const items = await api.getMenuItems();

// After
import { menuService } from '@/services';
const items = await menuService.getMenuItems();
```

### Phase 4: Clean Up (1 day)
**Effort:** 1 day | **Risk:** Very Low

1. **Delete deprecated files:**
   - `services/api.ts` (legacy facade)
   - `hooks/useApiRequest.ts` (replaced by useHttpClient)
   - Consider deleting `services/secureApi.ts` if not used elsewhere

2. **Update exports:**
   - `services/http/index.ts` - Export useHttpClient
   - `services/index.ts` - Remove api facade

3. **Verify:**
   - All imports resolve correctly
   - Build succeeds
   - All tests pass
   - No fetch() calls outside RequestBatcher and secureApi base class

---

## Risk Assessment & Mitigation

### Risk 1: Breaking Authentication
**Severity:** High | **Likelihood:** Low

**Issue:** useHttpClient() might not handle all auth scenarios that useApiRequest() currently does.

**Mitigation:**
- Test with Supabase session, localStorage token, and no auth scenarios
- Keep auth logic in httpClient.request() method (already does)
- Create comprehensive test for all auth paths

**Testing:**
```typescript
// Test all auth scenarios
- Supabase JWT present → uses Bearer token
- localStorage token valid → uses Bearer token
- No token → request proceeds without auth
- Expired token → rejected
```

### Risk 2: Cache Invalidation Issues
**Severity:** Medium | **Likelihood:** Medium

**Issue:** Moving from dual-cache system to single ResponseCache might miss some invalidation cases.

**Mitigation:**
- Keep cache TTL per endpoint (already in place)
- Test cache behavior with mutations (POST, PUT, PATCH, DELETE)
- Verify TTL configuration matches original behavior

**Testing:**
```typescript
// Verify cache clearing
- POST /api/v1/orders → clears /api/v1/orders cache
- PUT /api/v1/tables/:id → clears /api/v1/tables cache
- GET after POST → returns fresh data, not cached
```

### Risk 3: Request Batching Performance
**Severity:** Low | **Likelihood:** Medium

**Issue:** Enabling request batching might introduce latency (50ms wait) or break assumptions about request immediacy.

**Mitigation:**
- Make batching opt-in initially: `options.batch = true`
- Monitor timing impact
- Provide metrics/stats on batching effectiveness

**Testing:**
```typescript
// Measure before/after
- Load time with/without batching
- Network requests count reduction
- Latency impact of 50ms batching delay
```

### Risk 4: Component State Management
**Severity:** Low | **Likelihood:** Low

**Issue:** useHttpClient() requires refactoring of component hooks that depend on loading/error state.

**Mitigation:**
- useHttpClient() returns same interface as useApiRequest()
- Components should work without changes
- Test specifically with VoiceCheckoutOrchestrator (most complex consumer)

**Testing:**
```typescript
// Components using useHttpClient should:
- Show loading spinner when loading = true
- Show errors when error !== null
- Display data when data is available
```

### Risk 5: Test Coverage
**Severity:** Medium | **Likelihood:** Medium

**Issue:** Tests might fail during migration if they're tightly coupled to useApiRequest().

**Mitigation:**
- Update test mocks to use httpClient directly
- Verify all unit tests pass with new setup
- Create integration test covering full request flow

---

## Consolidation Roadmap

### Timeline
- **Phase 1:** 2-3 days (Create useHttpClient hook, activate batching)
- **Phase 2:** 1-2 days (Migrate useApiRequest consumers)
- **Phase 3:** 1 day (Migrate api facade consumers)
- **Phase 4:** 1 day (Clean up, delete deprecated files)

**Total Effort:** 5-7 days  
**Total Risk Level:** Low (with proper testing)

### Milestones

#### Day 1-2: Foundation
- [ ] Create useHttpClient() hook in services/http/hooks.ts
- [ ] Implement loading/error/data state management
- [ ] Create unit tests for useHttpClient hook
- [ ] Activate RequestBatcher in httpClient.request()

#### Day 3: Hook Migration
- [ ] Migrate VoiceCheckoutOrchestrator to useHttpClient()
- [ ] Migrate useKioskOrderSubmission to useHttpClient()
- [ ] Migrate useSquareTerminal to useHttpClient()
- [ ] Update related tests

#### Day 4: Facade Migration
- [ ] Migrate VoiceOrderProcessor to direct httpClient
- [ ] Migrate orderIntegration to direct httpClient
- [ ] Update useOrderHistory to use services directly
- [ ] Update useKitchenOrdersRealtime to use services directly

#### Day 5: Cleanup
- [ ] Delete services/api.ts
- [ ] Delete hooks/useApiRequest.ts
- [ ] Update exports
- [ ] Run full test suite
- [ ] Final verification

---

## Implementation Code Examples

### Example 1: Create useHttpClient Hook

```typescript
// services/http/hooks.ts
import { useState, useCallback } from 'react';
import { httpClient } from './httpClient';

export interface UseHttpClientReturn<T = unknown> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  execute: (fn: () => Promise<T>) => Promise<T>;
  get: (endpoint: string, options?: any) => Promise<T>;
  post: (endpoint: string, data?: unknown, options?: any) => Promise<T>;
  put: (endpoint: string, data?: unknown, options?: any) => Promise<T>;
  patch: (endpoint: string, data?: unknown, options?: any) => Promise<T>;
  del: (endpoint: string, options?: any) => Promise<T>;
  reset: () => void;
}

export function useHttpClient<T = unknown>(): UseHttpClientReturn<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((endpoint: string, options?: any) => 
    execute(() => httpClient.get<T>(endpoint, options)), [execute]
  );

  const post = useCallback((endpoint: string, data?: unknown, options?: any) =>
    execute(() => httpClient.post<T>(endpoint, data, options)), [execute]
  );

  const put = useCallback((endpoint: string, data?: unknown, options?: any) =>
    execute(() => httpClient.put<T>(endpoint, data, options)), [execute]
  );

  const patch = useCallback((endpoint: string, data?: unknown, options?: any) =>
    execute(() => httpClient.patch<T>(endpoint, data, options)), [execute]
  );

  const del = useCallback((endpoint: string, options?: any) =>
    execute(() => httpClient.delete<T>(endpoint, options)), [execute]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    get,
    post,
    put,
    patch,
    del,
    reset,
  };
}
```

### Example 2: Migrate useApiRequest Consumer

```typescript
// Before
import { useApiRequest } from '@/hooks/useApiRequest';
import { VoiceCheckoutConfig } from '@rebuild/shared';

export class VoiceCheckoutOrchestrator {
  private apiClient: ReturnType<typeof useApiRequest> | null = null;
  
  initialize(apiClient: ReturnType<typeof useApiRequest>) {
    this.apiClient = apiClient;
  }
}

// After
import { useHttpClient } from '@/services/http';
import { VoiceCheckoutConfig } from '@rebuild/shared';

export class VoiceCheckoutOrchestrator {
  private httpClient: ReturnType<typeof useHttpClient> | null = null;
  
  initialize(httpClient: ReturnType<typeof useHttpClient>) {
    this.httpClient = httpClient;
  }
}

// Usage component remains the same:
// const api = useHttpClient();
// orchestrator.initialize(api);
```

### Example 3: Migrate api Facade Consumer

```typescript
// Before
import { api } from '@/services/api';

export class VoiceOrderProcessor {
  async loadMenuItems(restaurantId: string): Promise<void> {
    this.menuItems = await api.getMenuItems();
  }
}

// After
import { menuService } from '@/services';

export class VoiceOrderProcessor {
  async loadMenuItems(restaurantId: string): Promise<void> {
    this.menuItems = await menuService.getMenuItems();
  }
}
```

### Example 4: Enable Request Batching

```typescript
// In httpClient.ts request() method
async request<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
  const {
    params,
    skipAuth = false,
    skipRestaurantId = false,
    skipTransform = false,
    batch = false, // NEW: opt-in batching
    ...requestOptions
  } = options;

  // Add batching for GET requests when enabled
  if (batch && requestOptions.method === 'GET') {
    try {
      return await this.batcher.batch<T>('GET', endpoint, params);
    } catch (error) {
      logger.warn('Batching failed, falling back to direct request', error);
      // Fall through to regular request
    }
  }

  // ... rest of implementation
}
```

---

## Success Criteria

### Code Quality
- [ ] Zero references to deleted files (useApiRequest.ts, api.ts)
- [ ] All imports resolve correctly
- [ ] Build succeeds without warnings
- [ ] ESLint passes

### Functionality
- [ ] All 4 useApiRequest consumers work with useHttpClient
- [ ] All 9 api facade consumers work with domain services
- [ ] Authentication works in all scenarios (Supabase, localStorage, none)
- [ ] Cache invalidation works correctly on mutations

### Performance
- [ ] No regression in request latency
- [ ] No regression in bundle size (ideally smaller)
- [ ] Request batching reduces network calls by 20%+ (if enabled)

### Testing
- [ ] All existing tests pass
- [ ] New tests for useHttpClient hook (100% coverage)
- [ ] Integration tests for full request flow
- [ ] E2E tests covering checkout and order flows

### Documentation
- [ ] Update API client documentation
- [ ] Create migration guide for future developers
- [ ] Document batching behavior and opt-in pattern
- [ ] Add examples of httpClient usage

---

## Deletion Safety Checklist

### Before Deleting `useApiRequest.ts`
- [ ] All 4 consumers migrated to useHttpClient
- [ ] Hook tests updated/created
- [ ] No remaining imports in codebase
- [ ] Backup created if needed

### Before Deleting `api.ts`
- [ ] All 9 consumers migrated to domain services
- [ ] Domain services called directly
- [ ] No remaining imports (except for types if needed)
- [ ] Verify OrderHistoryService doesn't need it

### Before Deleting `secureApi.ts`
- [ ] Verify only httpClient extends it
- [ ] Move any unique security features to httpClient if needed
- [ ] Search for all imports of SecureAPIClient
- [ ] No other classes extend it

---

## Future Optimizations

### Not in Scope for Phase 2, but Recommended Later

1. **GraphQL Migration** - Replace REST batching with GraphQL
2. **Real-time Subscriptions** - Upgrade WebSocket usage
3. **Offline Support** - Service worker with httpClient
4. **Request Prioritization** - High-priority requests skip batching
5. **API Versioning** - Strategy for v1 → v2 migration

---

## Dependencies & Import Tree

### httpClient Dependencies
```
httpClient
├── SecureAPIClient (base class)
├── RequestBatcher
├── ResponseCache
├── supabase (auth)
├── config (getApiUrl, getRestaurantId)
└── logger

Consumers of httpClient (48):
├── OrderService
├── MenuService
├── TableService
├── WebSocketService
├── Performance monitoring
└── Tests (20 occurrences)
```

### useApiRequest Dependencies
```
useApiRequest
├── useAsyncState hook
├── useRestaurant hook
├── supabase (auth)
└── fetch (native)

Consumers of useApiRequest (9):
├── VoiceCheckoutOrchestrator (3)
├── useKioskOrderSubmission (2)
├── useSquareTerminal (2)
└── Tests
```

### api Facade Dependencies
```
api
├── orderService
├── menuService
├── tableService
├── orderHistoryService
└── orderStatisticsService

Consumers of api (9):
├── VoiceOrderProcessor
├── orderIntegration
├── useOrderHistory
├── useKitchenOrdersRealtime
└── Tests (2)
```

---

## Questions for Stakeholder Review

1. **Request Batching:** Should batching be enabled by default or opt-in? (Currently recommending opt-in)
2. **Domain Services:** After migration, should thin domain service wrappers be kept or removed entirely?
3. **Testing:** Should we create comprehensive integration tests for httpClient?
4. **Error Handling:** Is current httpClient error handling sufficient, or should we enhance toast notifications?
5. **Performance Monitoring:** Should we add timing metrics to track migration impact?

---

## Appendix: File Mapping

### Files Requiring Changes

| File | Change Type | Lines Affected | Risk |
|------|-------------|----------------|------|
| services/http/hooks.ts | Create New | N/A | Low |
| services/http/httpClient.ts | Enhance | ~50-100 | Medium |
| hooks/useApiRequest.ts | Delete | All | Low |
| services/api.ts | Delete | All | Low |
| modules/voice/services/VoiceCheckoutOrchestrator.ts | Migrate | ~10 | Low |
| hooks/kiosk/useKioskOrderSubmission.ts | Migrate | ~5 | Low |
| hooks/useSquareTerminal.ts | Migrate | ~5 | Low |
| modules/voice/services/VoiceOrderProcessor.ts | Migrate | ~5 | Low |
| modules/voice/services/orderIntegration.ts | Migrate | ~5 | Low |
| hooks/useOrderHistory.ts | Migrate | ~5 | Low |
| hooks/useKitchenOrdersRealtime.ts | Migrate | ~5 | Low |

### Files NOT Requiring Changes

| File | Reason |
|------|--------|
| services/http/RequestBatcher.ts | Works with httpClient as-is |
| services/cache/ResponseCache.ts | Works with httpClient as-is |
| services/secureApi.ts | Inherited by httpClient, keep for now |
| Domain services | Will call httpClient directly, no changes needed |
| All components using domain services | No changes, indirect consumers only |

---

## References

### Related Configuration Files
- VITE_API_BASE_URL environment variable
- VITE_DEFAULT_RESTAURANT_ID environment variable
- VITE_DEBUG_VOICE debug flag

### Related Documentation
- RestaurantContext/RestaurantIdProvider pattern
- Supabase auth integration
- Domain-driven service architecture

---

**Report Generated:** 2025-11-09  
**Next Steps:** Present findings to team, get approval for Phase 1, begin implementation

