---
status: complete
priority: p2
issue_id: "199"
tags: [testing, code-quality, maintainability, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# Magic Timeout Values in Tests Without Explanation

## Problem Statement

Test files contain hardcoded timeout values (5000, 10000, 30000ms) without comments explaining why those specific values were chosen, making it hard to tune for CI performance.

## Solution Implemented

Created comprehensive timeout constants file at `tests/e2e/constants/timeouts.ts`:

```typescript
export const TIMEOUTS = {
  // Page Load Timeouts
  PAGE_HYDRATION: 5_000,      // React hydration after SSR
  DASHBOARD_LOAD: 10_000,     // Dashboard tiles to appear
  FULL_PAGE_LOAD: 15_000,     // Full page with all assets

  // Network/API Timeouts
  API_RESPONSE: 10_000,       // Standard API response
  ORDER_SUBMISSION: 15_000,   // Order POST and response
  AUTH_COMPLETE: 10_000,      // Login and token storage

  // WebSocket/Real-time Timeouts
  WEBSOCKET_CONNECT: 15_000,  // WS connection establishment
  WEBSOCKET_RECONNECT: 10_000,// WS reconnection
  REALTIME_UPDATE: 5_000,     // Real-time order updates

  // Voice/Media Timeouts
  VOICE_INIT: 30_000,         // Microphone + SDK init
  VOICE_TOKEN: 10_000,        // OpenAI ephemeral token

  // UI Animation/Transition
  MODAL_ANIMATION: 2_000,     // Modal open/close
  NAVIGATION: 3_000,          // View transitions
  FLOOR_PLAN_UPDATE: 3_000,   // Floor plan UI update
  LOADING_CHECK: 5_000,       // Loading state debounce

  // Element Visibility
  ELEMENT_VISIBLE: 5_000,     // Quick elements
  ELEMENT_AFTER_NETWORK: 10_000, // Elements after API calls
  ELEMENT_IMMEDIATE: 2_000,   // Already present elements
};
```

Also exports:
- `PRODUCTION_TIMEOUTS` - Extended timeouts for cold starts
- `TEST_CONFIG` - Production URL and demo credentials

**Files Updated:**
- `tests/e2e/auth/login.smoke.spec.ts`
- `tests/e2e/kds/kitchen-display.smoke.spec.ts`
- `tests/e2e/orders/server-order-flow.smoke.spec.ts`
- All new production/ test files

## Acceptance Criteria

- [x] Timeout constants file created with documented values
- [x] Key smoke tests updated to use constants
- [x] Comments explain what each timeout is waiting for
- [x] Production-specific timeouts for Vercel cold starts

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |
| 2025-12-05 | Completed | Created timeouts.ts with full documentation |
