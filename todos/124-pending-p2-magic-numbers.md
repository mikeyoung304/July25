---
status: pending
priority: p2
issue_id: "124"
tags: [code-quality, maintainability, configuration, magic-numbers]
dependencies: []
created_date: 2025-12-02
source: code-review-pr-151
---

# Magic Numbers Throughout Code

## Problem

Hardcoded numeric values (magic numbers) are scattered throughout the codebase without named constants. This makes the code harder to maintain and understand:

```typescript
// client/src/pages/ExpoPage.tsx:31
const { data: orders } = useQuery({
  queryKey: ['orders', restaurantId, 'ready'],
  queryFn: () => ordersApi.getOrders(restaurantId, { status: 'ready' }),
  refetchInterval: 60000  // ❌ What is 60000? Minutes? Seconds?
});

// client/src/pages/ExpoPage.tsx:38
const { data: recentOrders } = useQuery({
  queryKey: ['orders', restaurantId, 'recent'],
  queryFn: () => ordersApi.getRecentOrders(restaurantId),
  refetchInterval: 5000  // ❌ Why different from above?
});

// client/src/pages/ExpoPage.tsx:172
const cutoffTime = new Date(Date.now() - 20 * 60 * 1000);  // ❌ Why 20 minutes?

// server/src/middleware/security.ts:52
const fetchWithTimeout = (url: string, options: RequestInit, timeout = 5000) => {
  // ❌ Why 5 seconds?
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
};

// server/src/middleware/security.ts:138
windowMs: 60000,  // ❌ 1 minute? Why?
max: 5,

// server/src/middleware/security.ts:216
maxWaitTime: 10000,  // ❌ 10 seconds?

// server/src/middleware/security.ts:266
skipFailedRequests: false,
skipSuccessfulRequests: true,
max: 100,  // ❌ Why 100?

// server/src/routes/metrics.ts:34
const timeout = 5000;  // ❌ Same as security.ts but defined separately
```

## Risk Assessment

- **Severity:** IMPORTANT
- **Impact:**
  - **Unclear Intent:** Readers must guess what numbers mean
  - **Scattered Configuration:** Same values redefined in multiple places
  - **Hard to Tune:** Performance tuning requires finding all instances
  - **Inconsistency Risk:** Related values may drift apart
  - **Maintenance Burden:** Changes require searching codebase
- **Likelihood:** High (every change to timeouts/limits requires investigation)

## Examples of Problems Caused

1. **Timeout Mismatch:** Security middleware uses 5000ms, but is it consistent?
2. **Polling Frequency:** ExpoPage uses both 60000ms and 5000ms - why different?
3. **Rate Limits:** Multiple rate limiters use different `max` values - is this intentional?
4. **Cutoff Times:** 20-minute cutoff hardcoded - business logic hidden in calculation

## Required Fix

Extract all magic numbers to named constants at module level:

### Fix 1: Client-Side Constants

```typescript
// client/src/pages/ExpoPage.tsx
const POLLING_INTERVALS = {
  READY_ORDERS: 60_000,      // 1 minute - ready orders change less frequently
  RECENT_ORDERS: 5_000,      // 5 seconds - active orders need real-time updates
  KITCHEN_STATUS: 10_000     // 10 seconds - kitchen state updates
} as const;

const ORDER_FILTERS = {
  RECENT_CUTOFF_MINUTES: 20  // Show orders from last 20 minutes
} as const;

// Usage
const { data: orders } = useQuery({
  queryKey: ['orders', restaurantId, 'ready'],
  queryFn: () => ordersApi.getOrders(restaurantId, { status: 'ready' }),
  refetchInterval: POLLING_INTERVALS.READY_ORDERS
});

const { data: recentOrders } = useQuery({
  queryKey: ['orders', restaurantId, 'recent'],
  queryFn: () => ordersApi.getRecentOrders(restaurantId),
  refetchInterval: POLLING_INTERVALS.RECENT_ORDERS
});

const cutoffTime = new Date(
  Date.now() - ORDER_FILTERS.RECENT_CUTOFF_MINUTES * 60 * 1000
);
```

### Fix 2: Server-Side Constants

```typescript
// server/src/middleware/security.ts
const TIMEOUTS = {
  EXTERNAL_API_REQUEST: 5_000,    // 5 seconds for monitoring APIs
  RATE_LIMIT_WINDOW: 60_000       // 1 minute window
} as const;

const RATE_LIMITS = {
  AUTH_ATTEMPTS: {
    WINDOW_MS: TIMEOUTS.RATE_LIMIT_WINDOW,
    MAX_REQUESTS: 5               // Max 5 login attempts per minute
  },
  API_REQUESTS: {
    WINDOW_MS: TIMEOUTS.RATE_LIMIT_WINDOW,
    MAX_REQUESTS: 100             // Max 100 API calls per minute
  },
  MONITORING_FORWARD: {
    MAX_WAIT_TIME: 10_000         // 10 seconds max queue wait
  }
} as const;

// Usage
const fetchWithTimeout = (
  url: string,
  options: RequestInit,
  timeout = TIMEOUTS.EXTERNAL_API_REQUEST
) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
};

const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_ATTEMPTS.WINDOW_MS,
  max: RATE_LIMITS.AUTH_ATTEMPTS.MAX_REQUESTS,
  message: 'Too many login attempts'
});

const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.API_REQUESTS.WINDOW_MS,
  max: RATE_LIMITS.API_REQUESTS.MAX_REQUESTS,
  skipSuccessfulRequests: true
});
```

### Fix 3: Shared Configuration File (Advanced)

For values used across files:

```typescript
// server/src/config/constants.ts
export const TIMEOUTS = {
  EXTERNAL_API: 5_000,
  DATABASE_QUERY: 10_000,
  WEBSOCKET_PING: 30_000
} as const;

export const RATE_LIMITS = {
  AUTH: { windowMs: 60_000, max: 5 },
  API: { windowMs: 60_000, max: 100 },
  METRICS: { windowMs: 60_000, max: 50 }
} as const;

export const POLLING_INTERVALS = {
  ORDERS: 5_000,
  METRICS: 60_000,
  HEALTH_CHECK: 30_000
} as const;

export const BUSINESS_RULES = {
  RECENT_ORDERS_CUTOFF_MINUTES: 20,
  SESSION_TIMEOUT_MINUTES: 30,
  ORDER_PREP_WARNING_MINUTES: 15
} as const;
```

## Naming Convention

Use these patterns for clarity:

```typescript
// Time durations - suffix with unit
const POLLING_INTERVAL_MS = 5_000;
const SESSION_TIMEOUT_MINUTES = 30;
const CACHE_TTL_SECONDS = 300;

// Counts/limits - use descriptive names
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_BATCH_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

// Use underscores for readability
const LONG_NUMBER = 60_000;  // 60_000 is clearer than 60000
```

## Files to Modify

- `client/src/pages/ExpoPage.tsx` - Extract polling intervals and cutoff times
- `server/src/middleware/security.ts` - Extract timeouts and rate limits
- `server/src/routes/metrics.ts` - Extract timeout (or import from security.ts)

## Files to Create (Optional)

- `client/src/config/constants.ts` - Shared client constants
- `server/src/config/constants.ts` - Shared server constants

## Verification

- Search codebase for remaining magic numbers: `grep -r '[0-9]{4,}' src/`
- Verify all timeouts/intervals still work as expected
- Test rate limiting still triggers correctly
- Test polling intervals unchanged
- Run full test suite to catch regressions

## References

- **Clean Code (Martin):** Chapter 17 - "G25: Replace Magic Numbers with Named Constants"
- **Refactoring (Fowler):** "Replace Magic Number with Symbolic Constant"
- **ESLint Rule:** `no-magic-numbers`
- Related: Could add ESLint rule to prevent future magic numbers
