# API Client Consolidation - Quick Summary

## Current State: 3 API Clients + Legacy Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT FRAGMENTED STATE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🔴 httpClient (416 LOC)                                        │
│     ├─ Extends: SecureAPIClient                                │
│     ├─ Features: Cache, Dedup, Batching, Auth                  │
│     ├─ Users: 48 occurrences (12 files)                        │
│     └─ Status: PRIMARY - Feature complete                      │
│                                                                   │
│  🔴 secureApi (234 LOC)                                         │
│     ├─ Type: Base class                                         │
│     ├─ Features: Timeout, Retry, Sanitization, CSRF           │
│     ├─ Direct Users: 2 files                                    │
│     └─ Status: Only extends httpClient, not used directly      │
│                                                                   │
│  🟡 useApiRequest Hook (185 LOC)                               │
│     ├─ Type: React Hook wrapper                                 │
│     ├─ Features: State mgmt, Auth, Restaurant ID              │
│     ├─ Users: 9 occurrences (4 files)                         │
│     └─ Status: Duplicate logic, bypasses httpClient            │
│                                                                   │
│  🟠 api Facade (43 LOC)                                         │
│     ├─ Type: Delegator pattern                                  │
│     ├─ Features: Delegates to domain services                   │
│     ├─ Users: 9 occurrences (8 files)                         │
│     └─ Status: Backward compat, adds indirection               │
│                                                                   │
│  🟡 Direct fetch() (8 files)                                   │
│     ├─ Type: Raw fetch calls                                    │
│     ├─ Issues: Bypasses all httpClient features               │
│     └─ Status: Should be consolidated                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Target State: Single Unified Client

```
┌─────────────────────────────────────────────────────────────────┐
│               UNIFIED SINGLE CLIENT ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ useHttpClient() Hook (NEW - 100 LOC)                       │
│     └─ Provides: React state mgmt wrapper                       │
│                                                                   │
│  ✅ httpClient (ENHANCED - 416 LOC + batching)                 │
│     ├─ Provides:                                                │
│     │  ├─ Supabase + localStorage auth                         │
│     │  ├─ x-restaurant-id multi-tenancy                        │
│     │  ├─ ResponseCache (LRU + TTL)                            │
│     │  ├─ Request deduplication                                │
│     │  ├─ Request batching (opt-in)                            │
│     │  ├─ Retry logic (exponential backoff)                    │
│     │  ├─ Timeout handling (AbortController)                   │
│     │  ├─ Input sanitization                                   │
│     │  ├─ Error handling (APIError)                            │
│     │  └─ GET/POST/PUT/PATCH/DELETE                            │
│     └─ Used by: ALL API calls (singleton)                      │
│                                                                   │
│  ✅ Domain Services (THIN WRAPPERS - optional)                 │
│     └─ Use: httpClient directly                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Consolidation Impact

| Metric | Current | Target | Change |
|--------|---------|--------|--------|
| API Client Files | 3 | 1 | -67% |
| Hook Wrappers | 1 | 1 | - |
| Facade Layers | 1 | 0 | -100% |
| Direct fetch() Calls | 8 | 0 | -100% |
| Total API Code (LOC) | ~878 | ~520 | -41% |
| Import Paths | Multiple | Single (httpClient) | Unified |
| Feature Duplication | High | Zero | Complete |

## Migration Effort Breakdown

| Phase | Task | Effort | Risk | Deliverable |
|-------|------|--------|------|-------------|
| **1** | Create useHttpClient() hook | 2-3 days | Low | New hook, tests |
| **2** | Migrate 4 useApiRequest consumers | 1-2 days | Low-Med | 4 files updated |
| **3** | Migrate 9 api facade consumers | 1 day | Low | 9 files updated |
| **4** | Delete deprecated code | 1 day | Very Low | 2 files deleted |
| | **TOTAL** | **5-7 days** | **Low** | **Single client** |

## Files to Delete (Complete Removal)

```
client/src/
├── hooks/
│   └── useApiRequest.ts          (185 LOC) ← DELETE
└── services/
    └── api.ts                     (43 LOC)  ← DELETE

Total: 228 LOC removed
```

## Files to Migrate (Update Import Statements)

```
client/src/
├── modules/voice/services/
│   ├── VoiceOrderProcessor.ts     (api → menuService)
│   ├── VoiceCheckoutOrchestrator.ts (useApiRequest → useHttpClient)
│   └── orderIntegration.ts        (api → menuService)
├── hooks/
│   ├── useOrderHistory.ts         (api → orderService)
│   ├── useKioskOrderSubmission.ts (useApiRequest → useHttpClient)
│   ├── useSquareTerminal.ts       (useApiRequest → useHttpClient)
│   └── useKitchenOrdersRealtime.ts (api → orderService)
└── services/
    └── stationRouting.ts          (api import removal)

Total: 9 files to update
```

## Files to Create

```
client/src/services/http/
└── hooks.ts                       (NEW - 100 LOC)
    ├── useHttpClient<T>()         React hook wrapper
    └── Full state management

Total: 1 new file
```

## Files to Enhance

```
client/src/services/http/
└── httpClient.ts                  (416 → ~450 LOC)
    ├── Activate RequestBatcher
    ├── Add batch option parameter
    ├── Consolidate caching logic
    └── Export useHttpClient from hooks

Total: ~40 LOC additions
```

## Key Decision Points

| Decision | Current | Recommendation | Rationale |
|----------|---------|-----------------|-----------|
| **Batching** | Initialized, unused | Opt-in | Safer, measurable impact |
| **secureApi.ts** | Base class | Keep initially | Allow time for deprecation |
| **Domain Services** | Use httpClient | Keep wrappers | Provides abstraction layer |
| **Cache Strategy** | Dual-layer | Single ResponseCache | Reduce complexity |
| **Error Handling** | Multiple patterns | Unified APIError | Consistency |

## Success Metrics

### Code Quality
- ✅ Build succeeds with no errors
- ✅ ESLint passes all checks
- ✅ All imports resolve correctly
- ✅ No circular dependencies

### Functionality
- ✅ All auth scenarios work (Supabase, localStorage, none)
- ✅ Multi-tenancy headers working
- ✅ Cache invalidation on mutations
- ✅ Request deduplication working

### Testing
- ✅ All existing tests pass
- ✅ New useHttpClient tests pass
- ✅ Integration tests for request flow
- ✅ E2E tests for checkout flow

### Performance
- ✅ No latency regression
- ✅ No bundle size increase
- ✅ Cache hit ratio maintained
- ✅ Batching reduces requests 20%+ (when enabled)

## Quick Reference: Client Comparison

### httpClient
```typescript
import { httpClient } from '@/services/http/httpClient'

// Singleton instance
const data = await httpClient.get('/api/v1/menu')
const created = await httpClient.post('/api/v1/orders', orderData)

// Automatic features:
// - Caching with TTL
// - Request deduplication
// - Auth header injection
// - Restaurant ID header
// - Error handling
```

### useHttpClient (NEW)
```typescript
import { useHttpClient } from '@/services/http'

// In React component
const { data, loading, error, get, post } = useHttpClient()
const items = await get('/api/v1/menu')

// Provides:
// - React state management
// - Loading/error states
// - All httpClient features
```

### api Facade (TO DELETE)
```typescript
import { api } from '@/services/api'

// Delegates to services (unnecessary indirection)
const items = await api.getMenuItems()

// Issues:
// - Adds layer: api → service → httpClient
// - No unique value
// - Should be removed
```

---

## Next Steps

1. **Review** this report with team
2. **Approve** Phase 1 approach (useHttpClient hook creation)
3. **Schedule** 5-7 day implementation window
4. **Prepare** test environment and rollback plan
5. **Execute** phases 1-4 sequentially
6. **Verify** all success criteria met

---

**Generated:** November 9, 2025
**Status:** Ready for team review and approval
**Scope:** Phase 2 Technical Roadmap - API Client Consolidation

