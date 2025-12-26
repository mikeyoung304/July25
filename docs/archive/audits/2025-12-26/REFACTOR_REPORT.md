# Code Smell & Refactor Report

Generated: 2025-12-26
Codebase: rebuild-6.0 (Restaurant OS)

## Executive Summary

This report identifies code smells and mechanical refactor opportunities across the codebase. Files are organized by severity (P1=Critical, P2=Important, P3=Minor).

**Statistics:**
- God Files (>500 lines): 25+ files
- Total Console Logging Violations: 164 client + 10 server occurrences
- Duplicated Error Handling Pattern: 23 files
- Magic Numbers: Multiple occurrences

---

## P1 - Critical Issues

### [server/src/ai/functions/realtime-menu-tools.ts:1-1163] - God File

- **Severity**: P1
- **Lines Affected**: 1163
- **Evidence**: Single file contains: menu item types, cart types, validation functions, cache management, modifier pricing logic, tax rate calculations, CRUD operations for 8 different menu tools, cart persistence, and cleanup scheduler.
- **Mechanical Refactor**: YES
- **Proposed Fix**: Split into:
  1. `types/menu-tools.types.ts` - All interfaces and types (lines 8-110)
  2. `services/cart.service.ts` - Cart CRUD and persistence (lines 376-486)
  3. `services/modifier-pricing.service.ts` - Modifier lookup logic (lines 248-371)
  4. `validators/menu-input.validator.ts` - Input validation (lines 190-239)
  5. `tools/menu-function-tools.ts` - Tool definitions only
- **Verification**: Run `npm run typecheck && npm run test:server` after extraction

---

### [client/src/modules/voice/services/VoiceEventHandler.ts:1-1271] - God File with Type Explosion

- **Severity**: P1
- **Lines Affected**: 1271 (420 lines are type definitions)
- **Evidence**: Contains 30+ interface/type definitions mixed with implementation. Types for OpenAI Realtime API events should be in separate file.
- **Mechanical Refactor**: YES
- **Proposed Fix**: Extract types to `types/realtime-events.types.ts`
- **Safe Diff**:
```diff
--- a/client/src/modules/voice/services/VoiceEventHandler.ts
+++ b/client/src/modules/voice/services/VoiceEventHandler.ts
@@ -1,430 +1,10 @@
 /* eslint-env browser */
 import { EventEmitter } from '@/services/utils/EventEmitter';
 import { LRUCache } from 'lru-cache';
 import { logger } from '@/services/logger';
 import { VOICE_CONFIG } from '../constants';
+import {
+  RealtimeEvent, SessionCreatedEvent, SessionUpdatedEvent,
+  SpeechStartedEvent, SpeechStoppedEvent, AudioBufferCommittedEvent,
+  // ... all other types
+} from '../types/realtime-events.types';

-// Move all interfaces (lines 59-449) to separate file
```
- **Verification**: `npm run typecheck:quick && npm run test:client`

---

### [client/src/modules/floor-plan/components/FloorPlanCanvas.tsx:130-475] - Long Function (drawTable)

- **Severity**: P1
- **Lines Affected**: 345 lines
- **Evidence**: The `drawTable` function handles: gradient creation for 6 status colors, 3 shape types including a 180-line monkey drawing, selection highlighting, and text rendering.
- **Mechanical Refactor**: YES
- **Proposed Fix**: Extract to separate functions:
  1. `getTableGradient(ctx, table)` - lines 145-181
  2. `drawChipMonkey(ctx, table)` - lines 189-371
  3. `drawSelectionHighlight(ctx, table, zoomLevel)` - lines 397-448
  4. `drawTableLabel(ctx, table, zoomLevel)` - lines 450-472
- **Verification**: Visual regression test with `npm run test:e2e -- --grep "floor plan"`

---

### [server/src/services/orders.service.ts:1-820] - God File with Mixed Concerns

- **Severity**: P1
- **Lines Affected**: 820
- **Evidence**: Mixes tax calculation, order CRUD, payment processing, voice order handling, WebSocket broadcasting, and seat validation.
- **Mechanical Refactor**: PARTIAL
- **Proposed Fix**:
  1. Extract `TaxCalculationService` - lines 87-152
  2. Extract `OrderValidationService` - lines 768-818 (seat validation)
  3. Keep core order CRUD in this file
- **Verification**: `npm run test:server -- orders`

---

## P2 - Important Issues

### [Duplicate Pattern: error instanceof Error ? error.message : String(error)] - 23 Files

- **Severity**: P2
- **Lines Affected**: ~50 occurrences
- **Evidence**: Found in 23 files including:
  - `server/src/routes/orders.routes.ts`
  - `server/src/services/orders.service.ts`
  - `client/src/services/websocket/WebSocketService.ts`
  - `client/src/modules/voice/services/VoiceEventHandler.ts`
- **Mechanical Refactor**: YES
- **Proposed Fix**: Create and use shared utility:
```typescript
// shared/utils/error-utils.ts
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```
- **Safe Diff**:
```diff
--- a/server/src/routes/orders.routes.ts
+++ b/server/src/routes/orders.routes.ts
@@ -1,5 +1,6 @@
 import { Router } from 'express';
+import { getErrorMessage } from '@rebuild/shared';

 // Replace occurrences:
-const msg = error instanceof Error ? error.message : String(error);
+const msg = getErrorMessage(error);
```
- **Verification**: `npm run typecheck && npm test`

---

### [client/src/components/kiosk/KioskCheckoutPage.tsx:1-732] - Long Component with Duplicate Payment Logic

- **Severity**: P2
- **Lines Affected**: 732
- **Evidence**:
  - Terminal payment handler (lines 207-225)
  - Card payment handler (lines 227-281)
  - Cash payment handler (lines 300-324)
  All share similar order creation, navigation, and voice orchestrator notification patterns.
- **Mechanical Refactor**: YES
- **Proposed Fix**: Extract common payment completion logic:
```typescript
// hooks/usePaymentCompletion.ts
function usePaymentCompletion(voiceOrchestrator) {
  const completePayment = (order, paymentMethod, paymentId?) => {
    navigate('/order-confirmation', { state: {...} });
    voiceOrchestrator?.handlePaymentSuccess(order);
  };
  return { completePayment };
}
```
- **Verification**: E2E payment tests pass

---

### [client/src/services/websocket/WebSocketService.ts:1-720] - Long File with Nested Class

- **Severity**: P2
- **Lines Affected**: 720
- **Evidence**: Contains two classes (`WebSocketService` and `OptimisticWebSocketService`) in one file. The optimistic update logic (lines 582-714) should be separate.
- **Mechanical Refactor**: YES
- **Proposed Fix**: Extract `OptimisticWebSocketService` to `OptimisticWebSocketService.ts`
- **Verification**: `npm run test:client -- WebSocket`

---

### [server/src/routes/payments.routes.ts:1-775] - Inconsistent Error Handling

- **Severity**: P2
- **Lines Affected**: 775
- **Evidence**: Three different error handling patterns:
  1. Lines 211-223: Stripe card error check with `error.type`
  2. Lines 349-360: Different Stripe error handling
  3. Lines 508-524: Different again for cash payment
- **Mechanical Refactor**: YES
- **Proposed Fix**: Create unified Stripe error handler:
```typescript
function handleStripeError(error: any, res: Response, next: NextFunction) {
  if (error.type === 'StripeCardError') {
    return res.status(400).json({ success: false, error: 'Card error', detail: error.message });
  }
  if (error.type === 'StripeInvalidRequestError') {
    return res.status(400).json({ success: false, error: 'Invalid payment', detail: error.message });
  }
  next(error);
}
```
- **Verification**: `npm run test:server -- payments`

---

### [shared/utils/error-handling.ts:1-852] - God File

- **Severity**: P2
- **Lines Affected**: 852
- **Evidence**: Single `EnterpriseErrorHandler` class with 18+ methods handling: error creation, logging, remote reporting, user notification, recovery strategies, pattern tracking, and statistics.
- **Mechanical Refactor**: YES
- **Proposed Fix**: Split into:
  1. `ErrorReporter.ts` - Remote reporting (lines 663-687)
  2. `ErrorRecovery.ts` - Recovery strategies (lines 502-589)
  3. `ErrorPatternTracker.ts` - Pattern analysis (lines 468-497)
- **Verification**: `npm run test -- error-handling`

---

### [client/src/contexts/AuthContext.tsx:1-577] - Long Context with Duplicate localStorage Patterns

- **Severity**: P2
- **Lines Affected**: 577
- **Evidence**: localStorage session parsing repeated 3 times:
  - Lines 99-119 (initializeAuth)
  - Lines 237-241 (login)
  - Lines 305-309 (loginWithPin)
- **Mechanical Refactor**: YES
- **Proposed Fix**: Extract to utility:
```typescript
// utils/auth-storage.ts
export function saveAuthSession(data: AuthSessionData): void {
  localStorage.setItem('auth_session', JSON.stringify(data));
}
export function getAuthSession(): AuthSessionData | null {
  const saved = localStorage.getItem('auth_session');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (parsed.session?.expiresAt > Date.now() / 1000) {
      return parsed;
    }
  } catch { /* ignore */ }
  localStorage.removeItem('auth_session');
  return null;
}
```
- **Verification**: Auth flow tests pass

---

## P3 - Minor Issues

### [Magic Numbers - Rate Limiter Configuration]

- **Severity**: P3
- **Lines Affected**: ~20
- **Evidence**: `server/src/middleware/rateLimiter.ts` contains hardcoded values:
  - Line 51: `15 * 60 * 1000` (15 minutes)
  - Line 52: `10000` vs `1000` (dev vs prod limits)
  - Line 62: `1 * 60 * 1000` (1 minute)
- **Mechanical Refactor**: YES
- **Proposed Fix**: Extract to constants:
```typescript
const RATE_LIMIT_CONFIG = {
  GLOBAL_WINDOW_MS: 15 * 60 * 1000,
  GLOBAL_MAX_DEV: 10000,
  GLOBAL_MAX_PROD: 1000,
  SENSITIVE_WINDOW_MS: 1 * 60 * 1000,
  // ...
};
```
- **Verification**: `npm run test:server`

---

### [Magic Numbers - JWT Expiry Times]

- **Severity**: P3
- **Lines Affected**: ~8
- **Evidence**: `server/src/routes/auth.routes.ts`:
  - Line 103: `8 * 60 * 60` (8 hours for email login)
  - Line 189: `12 * 60 * 60` (12 hours for staff)
- **Mechanical Refactor**: YES
- **Proposed Fix**: Create `config/auth.config.ts` with named constants
- **Verification**: Auth tests pass

---

### [Deep Nesting - server/src/middleware/security.ts:407-460]

- **Severity**: P3
- **Lines Affected**: 53
- **Evidence**: `detectSuspiciousActivity` has 4 levels of nesting with multiple regex checks
- **Mechanical Refactor**: YES
- **Proposed Fix**: Extract pattern checks to array and iterate:
```typescript
const SUSPICIOUS_PATTERNS = [
  { pattern: /sql_pattern/gi, name: 'SQL injection' },
  { pattern: /xss_pattern/gi, name: 'XSS attempt' },
  // ...
];

function detectSuspiciousPatterns(input: string): string[] {
  return SUSPICIOUS_PATTERNS
    .filter(p => p.pattern.test(input))
    .map(p => p.name);
}
```
- **Verification**: Security tests pass

---

### [Console.log Usage in Client Code]

- **Severity**: P3
- **Lines Affected**: 164 occurrences across 36 files
- **Evidence**: Pre-commit hook should catch these, but many exist in:
  - Debug panels and example files (acceptable)
  - Test setup files (acceptable)
  - Production code (needs fix): `client/src/core/supabase.ts`, `client/src/App.tsx`
- **Mechanical Refactor**: YES
- **Proposed Fix**: Replace with `logger.debug()` or `logger.info()`
- **Verification**: `npm run lint && npm run test:client`

---

### [server/src/middleware/rbac.ts:104-188] - Repeated Scope Definitions

- **Severity**: P3
- **Lines Affected**: 84
- **Evidence**: `ROLE_SCOPES` duplicates many scopes across roles. Owner and manager share 90% of scopes.
- **Mechanical Refactor**: YES
- **Proposed Fix**: Use role inheritance:
```typescript
const BASE_STAFF_SCOPES = [ORDERS_CREATE, ORDERS_READ, MENU_READ];
const PAYMENT_SCOPES = [PAYMENTS_PROCESS, PAYMENTS_READ];

const ROLE_SCOPES = {
  kitchen: [...BASE_STAFF_SCOPES, ORDERS_STATUS],
  server: [...BASE_STAFF_SCOPES, ...PAYMENT_SCOPES, ORDERS_UPDATE],
  manager: [...server, REPORTS_VIEW, STAFF_MANAGE],
  owner: [...manager, SYSTEM_CONFIG],
};
```
- **Verification**: RBAC tests pass

---

## Recommendations

### Immediate Actions (This Sprint)

1. **Extract VoiceEventHandler types** - High impact, low risk, enables future voice work
2. **Create getErrorMessage utility** - Eliminates 50 duplicate patterns
3. **Split realtime-menu-tools.ts** - Currently hardest file to maintain

### Technical Debt Backlog

4. Extract FloorPlanCanvas drawing functions
5. Unify payment error handling
6. Create auth-storage utilities
7. Consolidate rate limiter configuration

### Monitoring

- Set up file size alerts: warn if any file exceeds 600 lines
- Add pre-commit hook for console.log (currently exists but has gaps)
- Consider SonarQube or similar for automated code smell detection

---

## Appendix: Files by Size

| File | Lines | Priority |
|------|-------|----------|
| client/src/modules/voice/services/VoiceEventHandler.ts | 1271 | P1 |
| server/src/ai/functions/realtime-menu-tools.ts | 1163 | P1 |
| client/src/modules/floor-plan/components/FloorPlanCanvas.tsx | 985 | P1 |
| shared/utils/error-handling.ts | 852 | P2 |
| server/src/services/orders.service.ts | 819 | P1 |
| server/src/routes/payments.routes.ts | 775 | P2 |
| client/src/modules/voice/services/WebRTCConnection.ts | 773 | P2 |
| client/src/components/kiosk/KioskCheckoutPage.tsx | 732 | P2 |
| client/src/services/websocket/WebSocketService.ts | 719 | P2 |
| client/src/contexts/AuthContext.tsx | 577 | P2 |

---

*Report generated by Agent C2 - Code Smell & Refactor Hotspots*
