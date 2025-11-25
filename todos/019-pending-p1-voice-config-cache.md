# TODO-019: Add Caching for Voice Configuration API Calls

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 019
- **Tags**: performance, voice, caching, api, code-review
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Performance Analysis

---

## Problem Statement

The `useDynamicConfig` hook fetches voice configuration from the API on EVERY component mount, causing 200-500ms delays each time the voice ordering modal opens/closes. This creates a poor user experience and wastes API calls for data that rarely changes.

The configuration data (OpenAI API key, session instructions) is effectively static during a user session but is re-fetched unnecessarily.

---

## Findings

### Evidence Location
- `client/src/modules/voice/hooks/useVoiceCommerce.ts:277-313` - useDynamicConfig implementation
- `client/src/modules/voice/hooks/useVoiceCommerce.ts:85-88` - useEffect triggers fetch on mount

### Current Code (No Caching)
```typescript
// Line 277-313: Fetches on every mount
const useDynamicConfig = (): UseDynamicConfigResult => {
  const [config, setConfig] = useState<VoiceCommerceConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // ❌ API call every time hook mounts
        const response = await httpClient.get<VoiceCommerceConfig>(
          '/api/voice/realtime-session'
        );

        if (!response.data) {
          throw new Error('No config data received');
        }

        setConfig(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []); // Empty deps but re-runs on every mount

  return { config, error, isLoading };
};
```

### Performance Impact
```typescript
// User flow:
// 1. Open voice modal → API call (300ms)
// 2. Close modal → component unmounts
// 3. Open modal again → API call AGAIN (300ms)
// 4. Repeat 5 times → 1.5 seconds wasted

// Config data is static during session:
// - OpenAI API key: doesn't change
// - Session instructions: doesn't change
// - Model settings: doesn't change
```

### Component Lifecycle Issue
```typescript
// useVoiceCommerce line 85-88
useEffect(() => {
  if (isOpen && !config) {
    // Loads config, but config is lost on modal close
    // because component unmounts
  }
}, [isOpen]);
```

---

## Proposed Solutions

### Option A: Module-Level Cache with TTL (Recommended)
**Pros**: Survives component unmount, simple, configurable TTL
**Cons**: Global state (acceptable for config)
**Effort**: Low (2-3 hours)
**Risk**: Low - isolated change

**Implementation**:
```typescript
// Module-level cache (outside component)
let configCache: {
  data: VoiceCommerceConfig | null;
  timestamp: number;
  error: string | null;
} = {
  data: null,
  timestamp: 0,
  error: null,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const useDynamicConfig = (): UseDynamicConfigResult => {
  const [config, setConfig] = useState<VoiceCommerceConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      const now = Date.now();

      // Check cache first
      if (
        configCache.data &&
        now - configCache.timestamp < CACHE_TTL_MS
      ) {
        setConfig(configCache.data);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Cache miss - fetch from API
      try {
        const response = await httpClient.get<VoiceCommerceConfig>(
          '/api/voice/realtime-session'
        );

        if (!response.data) {
          throw new Error('No config data received');
        }

        // Update cache
        configCache = {
          data: response.data,
          timestamp: now,
          error: null,
        };

        setConfig(response.data);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        configCache.error = errorMsg;
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, error, isLoading };
};
```

### Option B: React Context Provider for Config
**Pros**: React-idiomatic, centralized state
**Cons**: Requires provider wrapper, more boilerplate
**Effort**: Medium (3-4 hours)
**Risk**: Low - standard React pattern

### Option C: localStorage Cache
**Pros**: Persists across page reloads
**Cons**: Security risk (stores API key), sync complexity
**Effort**: Medium (3-4 hours)
**Risk**: High - API key exposure risk

---

## Recommended Action

**Option A** - Add module-level cache with 5-minute TTL:

1. Create module-level cache object above `useDynamicConfig`
2. Check cache on hook mount (with timestamp validation)
3. Return cached data if fresh (< 5 minutes old)
4. Fetch from API only on cache miss or stale data
5. Update cache after successful fetch
6. Add manual cache invalidation function (for testing)
7. Add unit tests for cache hit/miss scenarios

---

## Technical Details

### Affected Files
- `client/src/modules/voice/hooks/useVoiceCommerce.ts` (primary fix)
- `client/src/modules/voice/hooks/__tests__/useVoiceCommerce.test.ts` (add tests)

### Cache Strategy
```typescript
// Cache key: None needed (single config per app instance)
// Cache lifetime: 5 minutes
// Cache invalidation: Time-based TTL
// Cache storage: Module-level variable

type ConfigCache = {
  data: VoiceCommerceConfig | null;
  timestamp: number; // Unix timestamp
  error: string | null;
};
```

### Performance Improvement
```typescript
// Before: API call every modal open
// Open modal 5 times = 5 API calls × 300ms = 1500ms

// After: API call once, cache hits
// Open modal 5 times = 1 API call × 300ms = 300ms
// Improvement: 80% reduction in API calls and latency
```

### Cache Invalidation
```typescript
// Manual invalidation (for testing/development)
export function invalidateConfigCache(): void {
  configCache = {
    data: null,
    timestamp: 0,
    error: null,
  };
}

// Automatic invalidation on TTL expiry (5 minutes)
```

---

## Acceptance Criteria

- [ ] Module-level cache implemented above `useDynamicConfig`
- [ ] Cache TTL set to 5 minutes
- [ ] Cache hit returns data without API call
- [ ] Cache miss or stale data triggers API fetch
- [ ] Cache updated after successful API fetch
- [ ] Manual `invalidateConfigCache()` function exported
- [ ] Unit test: first call fetches from API
- [ ] Unit test: second call returns cached data
- [ ] Unit test: call after TTL expires fetches from API
- [ ] Manual test: open voice modal 3 times, see only 1 API call
- [ ] Performance test: modal open time < 50ms (vs 300ms before)

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From code review performance analysis |

---

## Resources

- [React Hooks Caching Patterns](https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state)
- [Chrome DevTools Network Tab](https://developer.chrome.com/docs/devtools/network/)
- [Module-Level State in React](https://kentcdodds.com/blog/application-state-management-with-react)
