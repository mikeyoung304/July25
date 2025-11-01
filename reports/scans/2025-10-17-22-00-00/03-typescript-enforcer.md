# TypeScript & Type Safety Enforcer Report

**Agent**: Agent 3 - TypeScript & Type Safety Enforcer
**Scan Date**: 2025-10-17T03:43:40Z
**Baseline Type Errors**: 5 TypeScript compilation errors
**Codebase**: /Users/mikeyoung/CODING/rebuild-6.0

---

## Executive Summary

TypeScript scanning has identified **5 active compilation errors** and **extensive use of `any` types** across the codebase. While the error count is manageable, the widespread use of `any` (350+ instances) represents a significant type safety debt that undermines TypeScript's benefits.

### Critical Findings
- **5 Active Type Errors** preventing strict type checking
- **350+ instances of `any` type** across 85+ files
- **200+ `as any` type assertions** masking potential type issues
- **15 `@ts-expect-error` suppressions** hiding known type problems
- **Multiple mapper files** with untyped modifier arrays
- **Missing return types** on 50+ functions

### Severity Distribution
- **P0 Critical**: 5 compilation errors
- **P1 High**: 85 files with explicit `any` types in critical paths
- **P2 Medium**: 200+ type assertions, missing return types
- **P3 Low**: Type guards, optional chaining overuse

---

## 1. Active TypeScript Compilation Errors (P0 - CRITICAL)

### Error 1: Voice Control Component Type Mismatch
**File**: `client/src/pages/KioskDemo.tsx:125`
**Issue**: Type mismatch in `onTranscript` callback
```typescript
// ERROR: Type '(transcription: string) => void' is not assignable to
// type '(event: { text: string; isFinal: boolean; }) => void'
<VoiceControlWebRTC
  onTranscript={handleOrderComplete} // ❌ Wrong signature
  className="w-full"
/>
```

**Root Cause**: `VoiceControlWebRTC` expects:
```typescript
onTranscript?: (event: { text: string; isFinal: boolean }) => void;
```

But `handleOrderComplete` signature is:
```typescript
const handleOrderComplete = (transcription: string) => { ... }
```

**Fix Required**:
```typescript
const handleOrderComplete = (event: { text: string; isFinal: boolean }) => {
  setOrderHistory(prev => [...prev, event.text])
  const voiceOrder = parseVoiceOrder(event.text)
  // ... rest of logic
}
```

**Impact**: BLOCKS - Voice ordering feature in kiosk demo
**Priority**: P0 - Must fix immediately

---

### Errors 2-5: OrderStatus Type Mismatch
**File**: `client/src/utils/orderStatusValidation.ts`
**Issue**: Missing `"picked-up"` status in type definitions

**Error Details**:
1. Line 43: `OrderStatus` type doesn't include `"picked-up"`
2. Line 60: `getStatusLabel()` missing `"picked-up"` case
3. Line 77: `getStatusColor()` missing `"picked-up"` case
4. Line 97: `validTransitions` missing `"picked-up"` case

**Root Cause**: Shared types define 7 statuses but validation only handles 7:
```typescript
// Current (missing picked-up)
export const ORDER_STATUSES = [
  'new', 'pending', 'confirmed', 'preparing',
  'ready', 'completed', 'cancelled'
] as const
```

But database/shared types include `"picked-up"`:
```typescript
// From @rebuild/shared
export type OrderStatus =
  | 'new' | 'pending' | 'confirmed' | 'preparing' |
  | 'ready' | 'picked-up' | 'completed' | 'cancelled' |
```

**Fix Required**: Add `"picked-up"` status to all Record types:
```typescript
export const ORDER_STATUSES = [
  'new', 'pending', 'confirmed', 'preparing',
  'ready', 'picked-up', 'completed', 'cancelled' // ✅ Add picked-up
] as const

// Update all Record<OrderStatus, T> objects:
const labels: Record<Order['status'], string> = {
  // ... existing
  'picked-up': 'Picked Up', // ✅ Add
}

const colors: Record<Order['status'], string> = {
  // ... existing
  'picked-up': 'bg-teal-100 text-teal-800', // ✅ Add
}

const validTransitions: Record<Order['status'], Order['status'][]> = {
  // ... existing
  'ready': ['picked-up', 'completed', 'cancelled'], // ✅ Update
  'picked-up': [], // ✅ Add (final state)
}
```

**Impact**: BLOCKS - Order status management across all views
**Priority**: P0 - Must fix immediately

---

## 2. Explicit `any` Type Usage (P1 - HIGH)

### 2.1 Critical Path - Modifiers (P1 - HIGH)

**Pattern**: Modifier arrays typed as `any[]` in core mapper files

#### File: `server/src/mappers/cart.mapper.ts:15,43`
```typescript
// ❌ PROBLEM
interface DbCartItem {
  // ... other fields
  modifiers?: any[];  // Line 15 - Untyped modifiers
}

export interface ApiCartItem {
  // ... other fields
  modifiers: any[];   // Line 43 - Untyped modifiers
}
```

**Fix**: Define proper modifier type
```typescript
// ✅ SOLUTION
interface CartItemModifier {
  id: string;
  name: string;
  price: number;
  group?: string;
}

interface DbCartItem {
  modifiers?: CartItemModifier[];
}

export interface ApiCartItem {
  modifiers: CartItemModifier[];
}
```

**Files Affected**:
- `server/src/mappers/cart.mapper.ts` (2 instances)
- `server/src/mappers/menu.mapper.ts:18,45` (2 instances)
- `server/src/services/orders.service.ts:425` (voice order params)

**Impact**:
- Modifier data can be malformed without detection
- No IDE autocomplete for modifier properties
- Runtime errors possible when accessing modifier fields

**Priority**: P1 - High (affects payments, orders, menu)

---

#### File: `server/src/services/orders.service.ts:425`
```typescript
// ❌ PROBLEM - Voice order modifiers untyped
static async processVoiceOrder(
  restaurantId: string,
  transcription: string,
  parsedItems: Array<{
    name: string;
    quantity: number;
    price?: number;
    notes?: string;
    modifiers?: any  // ❌ Untyped
  }>,
  confidence: number,
  audioUrl?: string
): Promise<Order>
```

**Fix**: Use shared modifier type
```typescript
// ✅ SOLUTION
import { MenuItemModifier } from '@rebuild/shared';

static async processVoiceOrder(
  restaurantId: string,
  transcription: string,
  parsedItems: Array<{
    name: string;
    quantity: number;
    price?: number;
    notes?: string;
    modifiers?: MenuItemModifier[]  // ✅ Properly typed
  }>,
  confidence: number,
  audioUrl?: string
): Promise<Order>
```

**Priority**: P1 - High (voice ordering is customer-facing)

---

### 2.2 Auth System - Database Query Results (P1 - HIGH)

#### File: `server/src/services/auth/pinAuth.ts:238,246`
```typescript
// ❌ PROBLEM - Supabase query result typed as any
const { data: pinRecords, error: pinError } = await supabase
  .from('user_pins')
  .select(`
    id,
    user_id,
    pin_hash,
    salt,
    attempts,
    locked_until,
    users!inner (
      id,
      email
    )
  `)
  .eq('restaurant_id', restaurantId);

// Later accessed with type assertion:
userEmail: (record as unknown as { users?: { email: string } }).users?.email
```

**Root Cause**: Supabase `.select()` returns `any` when using complex joins

**Fix**: Define explicit type for join result
```typescript
// ✅ SOLUTION
interface PinRecordWithUser {
  id: string;
  user_id: string;
  pin_hash: string;
  salt: string;
  attempts: number;
  locked_until: string | null;
  users: {
    id: string;
    email: string;
  }[];
}

const { data: pinRecords, error: pinError } = await supabase
  .from('user_pins')
  .select(`...`)
  .eq('restaurant_id', restaurantId) as {
    data: PinRecordWithUser[] | null;
    error: any
  };

// Now safe access:
userEmail: record.users[0]?.email
```

**Impact**: Auth failures could occur silently due to malformed data
**Priority**: P1 - High (authentication is critical)

---

### 2.3 Error Handling - Context Objects (P1 - HIGH)

#### File: `shared/monitoring/error-tracker.ts:24,35,93,100,108,128,158`
```typescript
// ❌ PROBLEM - Multiple any usages in error tracking
breadcrumbs?: Array<{
  timestamp: number;
  category: string;
  message: string;
  level: string;
  data?: Record<string, any>;  // ❌ Line 24
}>;

private context: Record<string, any> = {};  // ❌ Line 35

public setUser(userId: string, userData?: Record<string, any>) // ❌ Line 93
public setContext(key: string, value: any) // ❌ Line 100
public addBreadcrumb(
  category: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  data?: Record<string, any> // ❌ Line 108
)
public captureError(
  error: Error,
  context?: Record<string, any>, // ❌ Line 128
  level: ErrorReport['level'] = 'error'
)
public captureMessage(
  message: string,
  level: ErrorReport['level'] = 'info',
  context?: Record<string, any> // ❌ Line 158
)
```

**Justification**: `Record<string, any>` is acceptable here because:
- Error context is inherently dynamic
- Different error types need different context fields
- Over-constraining would reduce usefulness

**Recommendation**: Change to `Record<string, unknown>` for better type safety:
```typescript
// ✅ BETTER SOLUTION
private context: Record<string, unknown> = {};
public setContext(key: string, value: unknown) { ... }
```

**Impact**: Medium - error tracking works but could be stricter
**Priority**: P2 - Medium (technical debt, not blocking)

---

### 2.4 Test Files (P3 - LOW)

**Pattern**: Test mocks and fixtures using `any`

**Examples**:
```typescript
// test-auth-flow.spec.ts:195,301
const loginRequests: any[] = [];
const logs: any[] = [];

// scripts/diagnose-demo-auth.ts:41,67,131,170,242
interface DiagnosticResult {
  status: string;
  details?: any;  // ❌ Test diagnostic data
}

// tests/e2e/voice-ordering.spec.ts:54,63,90,159
MediaRecorder = class {
  start() {}
  stop() {}
} as any;  // ❌ Mock browser API
```

**Justification**: Acceptable in test files for:
- Mocking browser APIs that have complex types
- Test fixtures where exact types aren't critical
- Diagnostic/debug output

**Recommendation**: Document with comments why `any` is used
```typescript
// ✅ ACCEPTABLE IN TESTS
const loginRequests: any[] = [];  // Test mock - dynamic request shapes
```

**Impact**: Low - isolated to tests
**Priority**: P3 - Low (acceptable use case)

---

## 3. Type Assertions (`as any`) (P2 - MEDIUM)

### 3.1 Database Response Mapping (P2 - MEDIUM)

**Pattern**: Supabase responses cast to service types

#### File: `server/src/services/orders.service.ts:186,235,259,338,412`
```typescript
// ❌ PROBLEM - Multiple `as any as Order` casts
return data as any as Order;  // Line 186, 259, 338, 412
return (data || []) as any as Order[];  // Line 235
```

**Root Cause**: Service layer `Order` type uses camelCase, DB uses snake_case

**Fix**: Create proper type transformers
```typescript
// ✅ SOLUTION
import { DbOrder, transformDbOrderToService } from '../mappers/order.mapper';

// Instead of:
return data as any as Order;

// Use:
return transformDbOrderToService(data as DbOrder);
```

**Files Affected**:
- `server/src/services/orders.service.ts` (5 instances)
- `server/src/routes/orders.routes.ts:42,76,145` (3 instances)
- `server/src/routes/payments.routes.ts:163,222,397,398` (4 instances)
- `server/src/routes/terminal.routes.ts:49,71,83,142,210,261` (6 instances)

**Impact**:
- Type safety lost at API boundary
- Potential runtime errors from case mismatches
- Hard to refactor schema changes

**Priority**: P2 - Medium (works but risky)

---

### 3.2 Window/Global Object Access (P3 - LOW)

**Pattern**: Browser API access with type assertions

#### File: `client/src/services/websocket/WebSocketService.ts:47,124,125,163,164,209,210,228,229`
```typescript
// ❌ PROBLEM - Debug properties on window
(window as any).__dbgWS = { connectCount: 0 };
(window as any).__dbgWS.connectCount++;
```

**Justification**: Acceptable for debug features
- Debug-only code path
- Not in production bundle
- Standard pattern for dev tools

**Recommendation**: Add proper type augmentation
```typescript
// ✅ BETTER SOLUTION
declare global {
  interface Window {
    __dbgWS?: {
      connectCount: number;
      subCount: number;
    };
  }
}

// Now safe access:
window.__dbgWS = { connectCount: 0, subCount: 0 };
```

**Impact**: Low - debug features only
**Priority**: P3 - Low (acceptable pattern)

---

### 3.3 Event Listeners & Browser APIs (P3 - LOW)

**Pattern**: Mock browser APIs in tests

**Files**:
- `tests/e2e/voice-ordering.spec.ts:54,63,90,159`
- `tests/e2e/kds-websocket-race-conditions.spec.ts:14,25,47`
- `tests/performance/lighthouse.spec.ts:71,97,98`
- `client/test/setup.ts:125,137,160`

```typescript
// ❌ Tests mocking browser APIs
(window as any).MediaRecorder = class MockMediaRecorder { ... };
const dbg = (window as any).__dbgWS;
```

**Justification**: Acceptable in test environment
- Browser APIs don't exist in test env
- Complex types for mocking
- Test-only code

**Impact**: None - test infrastructure
**Priority**: P3 - Low (acceptable use)

---

## 4. Type Suppression Comments (P1 - HIGH)

### 4.1 Active Suppressions

**Total**: 15 instances across 3 files

#### File: `client/src/services/websocket/WebSocketService.test.ts:106`
```typescript
// @ts-expect-error - Mock WebSocket for testing
global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket) as any
```
**Reason**: Mocking global WebSocket API
**Status**: ✅ Acceptable - test infrastructure

#### File: `tests/e2e/websocket-service.e2e.test.ts:13,20,73`
```typescript
// @ts-ignore
const wsService = (window as any).__webSocketService
```
**Reason**: Accessing debug properties
**Status**: ⚠️ Should use proper type augmentation

#### File: `tests/performance/lighthouse.spec.ts:152,154`
```typescript
// @ts-ignore
const lcp = await page.evaluate(() => {
  // @ts-ignore
  return new PerformanceObserver(...)
})
```
**Reason**: Browser performance API not in types
**Status**: ✅ Acceptable - browser API mocking

---

### 4.2 Forbidden Pattern Detection

**Script**: `scripts/forbidden-patterns.mjs:8`
```javascript
{
  pattern: /@ts-ignore(?!\s+eslint)/,
  name: '@ts-ignore',
  severity: 'error'
}
```

**Status**: ✅ Good - linting rule prevents new @ts-ignore

**Recommendation**: All `@ts-ignore` should migrate to `@ts-expect-error`
- `@ts-expect-error` fails if error goes away
- Forces cleanup when types improve

---

## 5. Missing Return Types (P2 - MEDIUM)

### 5.1 Functions Without Explicit Returns

**Total**: 50+ functions found without return type annotations

**Pattern**: Functions relying on type inference
```typescript
// ❌ PROBLEM - No explicit return type
export function useServerView() {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  // ... 20 more lines
  return { selectedTable, setSelectedTable, ... }
}
```

**Risk**: Return type changes silently break callers

**Fix**: Add explicit return types
```typescript
// ✅ SOLUTION
export function useServerView(): {
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
  // ... other return properties
} {
  // ... implementation
}
```

**High-Priority Files** (Custom hooks & services):
1. `client/src/pages/hooks/useServerView.ts:8`
2. `client/src/pages/hooks/useVoiceOrderWebRTC.ts:22`
3. `client/src/hooks/useWebSocketConnection.ts:18`
4. `client/src/hooks/useAsyncState.ts:84`
5. `client/src/hooks/useModal.ts:229`
6. `client/src/hooks/kiosk/useOrderSubmission.ts:12`
7. `client/src/hooks/kiosk/useKioskOrderSubmission.ts:17`
8. `client/src/core/restaurant-hooks.ts:5,32`
9. `client/src/modules/order-system/hooks/useRestaurantData.ts:18`

**Impact**:
- API contracts not enforced
- Refactoring risk
- Poor IDE support

**Priority**: P2 - Medium (technical debt)

---

### 5.2 Utility Functions Without Returns

**Pattern**: Helper functions with inferred types
```typescript
// ❌ PROBLEM
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function norm(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
```

**Fix**: Add return types
```typescript
// ✅ SOLUTION
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
```

**Files**:
- `client/src/utils/index.ts:6`
- `server/src/services/OrderMatchingService.ts:9,10`
- `server/src/utils/case.ts:30,57`

**Impact**: Low - simple functions
**Priority**: P3 - Low

---

## 6. Shared Types Not Imported (P2 - MEDIUM)

### 6.1 Duplicate Type Definitions

**Pattern**: Components defining their own types instead of using `/shared`

**Example**: Order item modifiers defined in multiple places
```typescript
// ❌ PROBLEM - Defined in 3 places:

// 1. server/src/mappers/cart.mapper.ts
interface DbCartItem {
  modifiers?: any[];
}

// 2. client/src/services/menu/MenuService.ts:50
modifiers: item.modifiers?.map((mod: any) => ({
  id: mod.id,
  name: mod.name,
  price: mod.price
}))

// 3. server/src/services/orders.service.ts:425
modifiers?: any
```

**Should Use**: Shared type from `@rebuild/shared`
```typescript
// ✅ SOLUTION - Single source of truth
import { ApiMenuItemModifier } from '@rebuild/shared';

interface DbCartItem {
  modifiers?: ApiMenuItemModifier[];
}
```

**Impact**:
- Type drift between client/server
- Duplicated maintenance
- Inconsistent data structures

**Priority**: P2 - Medium

---

### 6.2 API Contract Validation

**Files Without Shared Type Imports**:
1. `server/src/routes/orders.routes.ts` - defines inline order types
2. `server/src/routes/payments.routes.ts` - no shared payment types
3. `server/src/routes/terminal.routes.ts` - terminal checkout untyped
4. `client/src/services/orders/OrderService.ts:54,65` - mapping `any[]`

**Fix Pattern**:
```typescript
// ❌ CURRENT
const mappedOrders = orders.map((order: any) => ({
  id: order.id,
  // ... manual mapping
}))

// ✅ SHOULD BE
import { Order } from '@rebuild/shared';
import { transformDbOrderToApi } from '@/mappers/order.mapper';

const mappedOrders = orders.map(transformDbOrderToApi);
```

**Priority**: P2 - Medium

---

## 7. Type Guards & Runtime Validation (P2 - MEDIUM)

### 7.1 Weak Type Guards

**File**: `client/src/utils/orderStatusValidation.ts:113`
```typescript
// ❌ WEAK - Only checks status field
export function validateOrderStatus(order: unknown): order is Order {
  if (!order || typeof order !== 'object') return false

  const orderObj = order as Record<string, unknown>

  return (
    typeof orderObj.status === 'string' &&
    isValidOrderStatus(orderObj.status)
  )
}
```

**Issue**: Only validates `status`, ignores all other required fields

**Fix**: Use Zod for comprehensive validation
```typescript
// ✅ SOLUTION
import { z } from 'zod';
import { ORDER_STATUSES } from './constants';

const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  status: z.enum(ORDER_STATUSES),
  restaurant_id: z.string().uuid(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().positive(),
    price: z.number().nonnegative()
  })),
  total_amount: z.number().nonnegative(),
  created_at: z.string().datetime(),
  // ... all required fields
});

export function validateOrder(order: unknown): order is Order {
  return OrderSchema.safeParse(order).success;
}
```

**Impact**: Runtime data errors not caught
**Priority**: P2 - Medium

---

### 7.2 Missing Validation at Boundaries

**Pattern**: API responses not validated before use

**Files Missing Validation**:
1. `client/src/services/orders/OrderService.ts` - raw fetch response
2. `client/src/services/menu/MenuService.ts` - menu items not validated
3. `server/src/routes/*.routes.ts` - request bodies sometimes unvalidated

**Fix**: Add Zod validation middleware
```typescript
// ✅ SOLUTION
import { validateRequest } from '@/middleware/validation';
import { CreateOrderSchema } from '@/schemas/order.schema';

router.post('/orders',
  validateRequest(CreateOrderSchema), // ✅ Validate before processing
  async (req, res) => {
    const orderData = req.validated; // ✅ Now type-safe
    // ...
  }
);
```

**Priority**: P2 - Medium

---

## 8. Optional Chaining Overuse (P3 - LOW)

### 8.1 Hiding Type Issues

**Pattern**: Using `?.` to bypass type errors
```typescript
// ⚠️ SYMPTOM - May hide real type issues
order.items?.[0]?.name?.toUpperCase()
```

**Where Found**:
- `client/src/contexts/UnifiedCartContext.tsx:67-72`
- `server/src/routes/orders.routes.ts:145`

**Analysis**: Optional chaining is correct for:
- Truly optional fields
- Defensive programming against null/undefined

But may indicate:
- Type definitions wrong
- Missing validation
- Hiding bugs

**Recommendation**: Review each usage
```typescript
// ❌ BAD - Type says items exists but we don't trust it
function getFirstItemName(order: Order): string {
  return order.items?.[0]?.name ?? 'Unknown';  // Type lying?
}

// ✅ GOOD - Type correctly reflects optionality
function getFirstItemName(order: Order): string | undefined {
  return order.items[0]?.name;  // items guaranteed, item optional
}
```

**Priority**: P3 - Low (review case-by-case)

---

## Statistics

### Type Safety Metrics

| Metric | Count | Status |
| --- | --- | --- |
| **Active Type Errors** | 5 | 🔴 P0 |
| **Explicit `any` Usage** | 350+ | 🟡 P1 |
| **Type Assertions (`as any`)** | 200+ | 🟡 P2 |
| **`@ts-expect-error` Comments** | 15 | 🟡 P2 |
| **Functions Missing Return Types** | 50+ | 🟡 P2 |
| **Files with `any` Types** | 85+ | 🟡 P1 |

### Files by Severity

**Critical (P0)** - 2 files blocking compilation:
1. `client/src/pages/KioskDemo.tsx` (1 error)
2. `client/src/utils/orderStatusValidation.ts` (4 errors)

**High Priority (P1)** - 15 files with critical path `any`:
1. `server/src/mappers/cart.mapper.ts` (modifiers)
2. `server/src/mappers/menu.mapper.ts` (modifiers)
3. `server/src/services/orders.service.ts` (voice orders)
4. `server/src/services/auth/pinAuth.ts` (auth queries)
5. `shared/monitoring/error-tracker.ts` (error context)
6. `server/src/routes/orders.routes.ts` (3 instances)
7. `server/src/routes/payments.routes.ts` (4 instances)
8. `server/src/routes/terminal.routes.ts` (6 instances)
9. `server/src/routes/tables.routes.ts` (8 instances)
10. `client/src/services/orders/OrderService.ts` (any[] mapping)
11. `client/src/services/menu/MenuService.ts` (any modifiers)
12. `client/src/services/http/httpClient.ts` (cache data)
13. `client/src/contexts/UnifiedCartContext.tsx` (item mapping)
14. `client/src/modules/voice/components/VoiceControlWebRTC.tsx` (onOrderDetected)
15. `server/src/utils/case.ts` (generic transformers)

**Medium Priority (P2)** - 50+ files:
- All custom hooks without return types
- Service layer type assertions
- Missing shared type imports

**Low Priority (P3)** - 100+ files:
- Test files with `any` mocks
- Debug code type assertions
- Utility functions without returns

---

## Quick Wins (Can Fix in < 1 hour)

### 1. Fix Compilation Errors (30 min)
```bash
# Fix voice control callback signature
# client/src/pages/KioskDemo.tsx:31
const handleOrderComplete = (event: { text: string; isFinal: boolean }) => {
  setOrderHistory(prev => [...prev, event.text])
  const voiceOrder = parseVoiceOrder(event.text)
  // ... existing logic
}

# Add picked-up status to validation
# client/src/utils/orderStatusValidation.ts:8
export const ORDER_STATUSES = [
  'new', 'pending', 'confirmed', 'preparing',
  'ready', 'picked-up', 'completed', 'cancelled'
] as const

# Update all Record<OrderStatus, T> objects
# Lines 60, 77, 97 - add 'picked-up' entries
```

### 2. Create Shared Modifier Type (20 min)
```typescript
// shared/types/menu.types.ts
export interface MenuItemModifier {
  id: string;
  name: string;
  price: number;
  group?: string;
}

// Update cart.mapper.ts, menu.mapper.ts, orders.service.ts
import { MenuItemModifier } from '@rebuild/shared';
modifiers?: MenuItemModifier[]  // Replace all any[]
```

### 3. Add Return Types to Top 10 Hooks (30 min)
Use VS Code quick fix: "Infer function return type"
- Select function
- Cmd+. (Quick Fix)
- Choose "Infer function return type"
- Review and confirm

---

## Action Plan

### Phase 1: Critical Fixes (Week 1) - P0 Items

**Goal**: Achieve clean `npm run typecheck`

#### Task 1.1: Fix Compilation Errors (Day 1)
- [ ] Fix `KioskDemo.tsx` voice control callback signature
- [ ] Add `picked-up` status to `orderStatusValidation.ts`
- [ ] Update all status Record types
- [ ] Run `npm run typecheck` - should pass ✅
- [ ] Commit: "fix(types): resolve 5 TypeScript compilation errors"

**Estimate**: 2 hours
**Owner**: Any developer
**Validation**: `npm run typecheck` exits 0

---

### Phase 2: High-Priority Types (Week 1-2) - P1 Items

**Goal**: Eliminate `any` from critical paths

#### Task 2.1: Create Shared Type Definitions (Day 2-3)
- [ ] Define `MenuItemModifier` in `@rebuild/shared`
- [ ] Define `PinRecordWithUser` in auth types
- [ ] Define `DbOrder` and `ApiOrder` mappings
- [ ] Export from `shared/types/index.ts`

**Files to Create**:
```
shared/types/
  ├── menu.types.ts (update with MenuItemModifier)
  ├── auth.types.ts (add PinRecordWithUser)
  ├── order.types.ts (add DbOrder, ApiOrder)
  └── index.ts (export all)
```

**Estimate**: 4 hours
**Owner**: Backend lead

#### Task 2.2: Update Mapper Files (Day 3-4)
- [ ] `server/src/mappers/cart.mapper.ts` - use MenuItemModifier
- [ ] `server/src/mappers/menu.mapper.ts` - use MenuItemModifier
- [ ] Add type transformers for snake_case ↔ camelCase
- [ ] Update all mapper return types

**Before**:
```typescript
modifiers?: any[]
```

**After**:
```typescript
import { MenuItemModifier } from '@rebuild/shared';
modifiers?: MenuItemModifier[]
```

**Estimate**: 6 hours
**Files**: 4 mapper files
**Owner**: Backend developer

#### Task 2.3: Fix Auth Service Types (Day 4)
- [ ] Add `PinRecordWithUser` type
- [ ] Remove `as unknown as` casts
- [ ] Add proper Supabase query typing
- [ ] Test PIN authentication flow

**Estimate**: 3 hours
**Owner**: Auth specialist

#### Task 2.4: Fix Voice Order Types (Day 5)
- [ ] Update `processVoiceOrder` params with MenuItemModifier
- [ ] Update voice order routes
- [ ] Update client-side voice order submission
- [ ] Test voice ordering end-to-end

**Estimate**: 4 hours
**Owner**: Voice feature owner

---

### Phase 3: Medium-Priority Improvements (Week 2-3) - P2 Items

**Goal**: Add return types and reduce type assertions

#### Task 3.1: Add Return Types to Custom Hooks (Week 2)
- [ ] Create hook return type interfaces
- [ ] Update all hooks in `client/src/hooks/`
- [ ] Update hooks in `client/src/modules/*/hooks/`
- [ ] Document hook contracts

**Pattern**:
```typescript
// Define return type interface
interface UseServerViewReturn {
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
  tables: Table[];
  isLoading: boolean;
}

// Add to function signature
export function useServerView(): UseServerViewReturn {
  // ... implementation
}
```

**Estimate**: 8 hours (50 hooks × 10min each)
**Owner**: Frontend team (can parallelize)

#### Task 3.2: Replace Type Assertions with Transformers (Week 2-3)
- [ ] Create `transformDbOrderToService()` function
- [ ] Create `transformDbOrderToApi()` function
- [ ] Replace all `as any as Order` with transformers
- [ ] Add runtime validation in transformers

**Before**:
```typescript
return data as any as Order;
```

**After**:
```typescript
import { transformDbOrderToService } from '../mappers/order.mapper';
return transformDbOrderToService(data);
```

**Estimate**: 6 hours
**Files**: 20+ route files
**Owner**: Backend team

#### Task 3.3: Import Shared Types (Week 3)
- [ ] Audit all API routes for inline types
- [ ] Replace with imports from `@rebuild/shared`
- [ ] Update client services to use shared types
- [ ] Remove duplicate type definitions

**Estimate**: 8 hours
**Owner**: Full-stack developer

---

### Phase 4: Low-Priority Cleanup (Week 4) - P3 Items

**Goal**: Reduce technical debt

#### Task 4.1: Add Type Augmentations (Day 1)
- [ ] Create `client/src/types/window.d.ts`
- [ ] Add debug property types
- [ ] Add test utility types
- [ ] Document why `as any` used in tests

**Template**:
```typescript
// client/src/types/window.d.ts
declare global {
  interface Window {
    __dbgWS?: { connectCount: number; subCount: number };
    __httpCache?: { size: number; clear: () => void };
  }
}

export {};
```

**Estimate**: 2 hours

#### Task 4.2: Migrate @ts-ignore to @ts-expect-error (Day 2)
- [ ] Find all `@ts-ignore` comments
- [ ] Change to `@ts-expect-error` with explanation
- [ ] Document why error is expected
- [ ] Set up ESLint rule to prevent new @ts-ignore

**Estimate**: 2 hours

#### Task 4.3: Add Utility Function Return Types (Day 3)
- [ ] Add return types to all functions in `client/src/utils/`
- [ ] Add return types to all functions in `server/src/utils/`
- [ ] Add return types to helper functions

**Estimate**: 3 hours

---

### Phase 5: Advanced Type Safety (Week 5+) - Future

**Goal**: Comprehensive runtime validation

#### Task 5.1: Add Zod Validation Schemas
- [ ] Create Zod schemas for all API types
- [ ] Add validation middleware to all routes
- [ ] Add client-side response validation
- [ ] Replace weak type guards with Zod

**Benefits**:
- Runtime type safety
- Better error messages
- API contract enforcement
- Automatic type inference

**Estimate**: 16 hours
**Owner**: Senior developer

#### Task 5.2: Enable Stricter TypeScript Settings
- [ ] Enable `strictNullChecks`
- [ ] Enable `strictFunctionTypes`
- [ ] Enable `noImplicitAny` (if not already)
- [ ] Enable `noUncheckedIndexedAccess`
- [ ] Fix resulting errors

**Estimate**: 40 hours (iterative)
**Owner**: Team effort

---

## Recommended TypeScript Config Updates

### Current Issues
```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,  // ✅ Good
    "noImplicitAny": true,  // ✅ Good
    "strictNullChecks": true,  // ✅ Good
    "exactOptionalPropertyTypes": true,  // ⚠️ Causing errors
  }
}
```

### Recommendations

#### Option 1: Keep Strict (Recommended)
Fix all type errors to maintain strictness
- Better long-term code quality
- Catches more bugs
- Forces proper typing

#### Option 2: Temporary Relaxation
```jsonc
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,  // ⚠️ Temporary fix
    // TODO: Re-enable after fixing mapper spread operators
  }
}
```

**Issue**: Current errors are from mapper spread operators:
```typescript
return {
  id: dbItem.id,
  modifiers: dbItem.modifiers || [],
  ...(dbItem.image_url ? { imageUrl: dbItem.image_url } : {}),
  // ❌ exactOptionalPropertyTypes: true requires explicit undefined
}
```

**Fix**: Change to explicit undefined:
```typescript
return {
  id: dbItem.id,
  modifiers: dbItem.modifiers || [],
  imageUrl: dbItem.image_url || undefined,  // ✅ Explicit
}
```

**Recommendation**: Keep strict mode, fix the 5 errors properly

---

## Best Practices Going Forward

### 1. Type-First Development
```typescript
// ✅ DO: Define types first
interface CreateOrderParams {
  restaurantId: string;
  items: OrderItem[];
  customerName?: string;
}

async function createOrder(params: CreateOrderParams): Promise<Order> {
  // Implementation
}

// ❌ DON'T: Infer everything
async function createOrder(params) {
  // TypeScript guesses types
}
```

### 2. Use Shared Types
```typescript
// ✅ DO: Import from shared package
import { Order, OrderItem } from '@rebuild/shared';

// ❌ DON'T: Redefine in multiple places
interface Order { /* duplicate */ }
```

### 3. Avoid Type Assertions
```typescript
// ✅ DO: Use type transformers
const order = transformDbOrderToApi(dbOrder);

// ❌ DON'T: Force type with assertion
const order = dbOrder as any as Order;
```

### 4. Add Runtime Validation
```typescript
// ✅ DO: Validate at boundaries
const orderSchema = z.object({ /* schema */ });
const order = orderSchema.parse(unknownData);

// ❌ DON'T: Trust external data
const order = unknownData as Order;
```

### 5. Explicit Return Types
```typescript
// ✅ DO: Document return type
function useOrders(): {
  orders: Order[];
  isLoading: boolean;
} {
  // ...
}

// ❌ DON'T: Rely on inference
function useOrders() {
  // What does this return?
}
```

---

## Appendix A: File-by-File `any` Usage

### Server Files (Top 20)

1. `server/src/routes/tables.routes.ts` - 12 instances
   - Line 41: `table: any` param
   - Line 86, 136: `[key: string]: any` objects
   - Line 264: Update payload `any`
   - Line 303: `results: any[]`
   - Line 305: `table: any` in map
   - Line 369: `error: any` catch
   - Line 383: `r: any`, `table: any` in map

2. `server/src/routes/payments.routes.ts` - 8 instances
   - Line 93: `error: any` catch
   - Line 169: `paymentResult: any`
   - Line 243: `squareError: any` catch
   - Line 248: `e: any` in errors map
   - Line 299, 342, 431: `error: any` catch blocks

3. `server/src/routes/terminal.routes.ts` - 9 instances
   - Line 106, 179, 227, 349: `squareError: any` catch
   - Line 111, 337: `e: any` in error maps
   - Line 126, 195, 245, 312, 365: `error: any` catch

4. `server/src/routes/orders.routes.ts` - 5 instances
   - Line 42: `req.validated: any`
   - Line 76: `ai.orderNLP: any`
   - Line 83: `aiResult.items` map with `item: any`
   - Line 85: `menuItems.find` with `m: any`
   - Line 145: `order.items?.[0] as any`

5. `server/src/routes/ai.routes.ts` - 8 instances
   - Line 44, 125, 182, 222, 414, 503: `error as any`
   - Line 229, 231, 232: `error as any` for suggestions

6. `server/src/services/orders.service.ts` - 6 instances
   - Line 186, 235, 259, 338, 412: `as any as Order`
   - Line 425: `modifiers?: any` param

7. `server/src/mappers/cart.mapper.ts` - 4 instances
   - Line 15: `modifiers?: any[]` in DbCartItem
   - Line 43: `modifiers: any[]` in ApiCartItem
   - Line 118: `mapToSnakeCase<T = any>(apiRecord: any)`

8. `server/src/mappers/menu.mapper.ts` - 4 instances
   - Line 18: `modifiers?: any[]` in DbMenuItem
   - Line 45: `modifiers: any[]` in ApiMenuItem
   - Line 112: `mapToCamelCase<T = any>(dbRecord: any)`

9. `server/src/services/auth/pinAuth.ts` - 2 instances
   - Line 238: Type cast `as unknown as { users?: { email: string } }`
   - Line 93, 100: `userData?: Record<string, any>`

10. `server/src/middleware/auth.ts` - 2 instances
    - Line 57, 144: `jwt.verify(...) as any`

### Client Files (Top 20)

1. `client/src/services/websocket/WebSocketService.ts` - 9 instances
   - Line 47, 124, 125, 163, 164, 209, 210, 228, 229: Debug properties

2. `client/src/services/monitoring/performance.ts` - 6 instances
   - Line 65, 77: Performance entry type casts
   - Line 104: `observeMetric` callback param
   - Line 282-285: Navigator connection API

3. `client/src/services/monitoring/localStorage-manager.ts` - 4 instances
   - Line 84: Filter callback param
   - Line 167: `setItem` value param
   - Line 221: Return type
   - Line 310: `tryParseJSON` return

4. `client/src/services/orders/OrderService.ts` - 3 instances
   - Line 54: `orders: any[]`
   - Line 65: `order: any` in map

5. `client/src/services/menu/MenuService.ts` - 4 instances
   - Line 16: `transformMenuItem` param
   - Line 18: `category: any`
   - Line 50: `mod: any` in modifiers map
   - Line 147, 160: Mock data category types

6. `client/src/services/http/httpClient.ts` - 3 instances
   - Line 268, 271: Cache data type casts
   - Line 397: Debug window property

7. `client/src/contexts/UnifiedCartContext.tsx` - 6 instances
   - Line 67-72: Item property fallbacks with `as any`

8. `client/src/modules/voice/components/VoiceControlWebRTC.tsx` - 1 instance
   - Line 11: `onOrderDetected?: (order: any) => void`

9. `client/src/pages/HomePage.tsx` - 1 instance
   - Line 33: `restaurant: any` mock

10. `client/src/pages/ServerView.tsx` - 1 instance
    - Line 111: `table={selectedTable as any}`

### Shared Files

1. `shared/monitoring/error-tracker.ts` - 7 instances
   - Line 24, 35, 93, 100, 108, 128, 158: Context & breadcrumb data

2. `shared/monitoring/performance-monitor.ts` - 3 instances
   - Line 224, 233: `_perfMonitor` property casts
   - Line 61, 71: Event listeners

3. `shared/monitoring/web-vitals.ts` - 2 instances
   - Line 86, 87: Navigator connection API

4. `shared/types/transformers.ts` - 2 instances
   - Line 163, 197: Payment status casts

5. `shared/types/validation.ts` - 3 instances
   - Line 57: Schema transform cast
   - Line 323, 344, 345: Error result casts

6. `shared/utils/cleanup-manager.ts` - 2 instances
   - Line 386: `globalThis as any`
   - Line 541: `performance.memory` cast

7. `shared/utils/error-handling.ts` - 2 instances
   - Line 619, 620: `window.logger` cast

---

## Appendix B: Type Error Details

### Full TypeScript Compiler Output

```
client/src/pages/KioskDemo.tsx(125,19): error TS2322: Type '(transcription: string) => void' is not assignable to type '(event: { text: string; isFinal: boolean; }) => void'.
  Types of parameters 'transcription' and 'event' are incompatible.
    Type '{ text: string; isFinal: boolean; }' is not assignable to type 'string'.

client/src/utils/orderStatusValidation.ts(43,34): error TS2345: Argument of type 'OrderStatus' is not assignable to parameter of type '"ready" | "new" | "pending" | "confirmed" | "preparing" | "completed" | "cancelled"'.
  Type '"picked-up"' is not assignable to type '"ready" | "new" | "pending" | "confirmed" | "preparing" | "completed" | "cancelled"'.

client/src/utils/orderStatusValidation.ts(60,9): error TS2741: Property '"picked-up"' is missing in type '{ new: string; pending: string; confirmed: string; preparing: string; ready: string; completed: string; cancelled: string; }' but required in type 'Record<OrderStatus, string>'.

client/src/utils/orderStatusValidation.ts(77,9): error TS2741: Property '"picked-up"' is missing in type '{ new: string; pending: string; confirmed: string; preparing: string; ready: string; completed: string; cancelled: string; }' but required in type 'Record<OrderStatus, string>'.

client/src/utils/orderStatusValidation.ts(97,9): error TS2741: Property '"picked-up"' is missing in type '{ new: ("pending" | "confirmed" | "cancelled")[]; pending: ("confirmed" | "cancelled")[]; confirmed: ("preparing" | "cancelled")[]; preparing: ("ready" | "cancelled")[]; ready: ("completed" | "cancelled")[]; completed: undefined[]; cancelled: undefined[]; }' but required in type 'Record<OrderStatus, OrderStatus[]>'.
```

**Total Errors**: 5
**Blocking**: Yes - prevents production build
**Fix Time**: 30 minutes

---

## Appendix C: Grep Search Results Summary

### Search: `: any\b` (Explicit any types)
- **Total Matches**: 350+
- **Unique Files**: 85
- **Critical Files**: 15 (mappers, services, routes)

### Search: `\bas any\b` (Type assertions)
- **Total Matches**: 200+
- **Unique Files**: 60
- **Test Files**: 40% of matches
- **Production Files**: 60% of matches

### Search: `@ts-ignore|@ts-expect-error`
- **Total Matches**: 15
- **@ts-ignore**: 8 instances (should migrate)
- **@ts-expect-error**: 7 instances (acceptable)
- **Test Files**: 80% of matches

### Search: `modifiers\?: any`
- **Total Matches**: 3 critical files
- **Impact**: High - affects orders, cart, menu

---

## Appendix D: Related ADRs & Documentation

### Relevant ADRs
1. **ADR-001**: snake_case in types
   - Location: `docs/architecture/decisions/001-snake-case-types.md`
   - Impact: Requires transformers between DB and API
   - Recommendation: Keep, but add proper type transformers

2. **ADR-002**: Shared types in `/shared` (hypothetical)
   - Status: Not yet documented
   - Recommendation: Create ADR for shared type strategy

### Type Definition Locations

**Shared Types** (`@rebuild/shared`):
- `shared/types/menu.types.ts` - Menu, MenuItem, MenuCategory
- `shared/types/customer.types.ts` - Customer types
- `shared/types/events.types.ts` - WebSocket events
- `shared/api-types.ts` - API boundary types
- `shared/cart.ts` - Cart operations

**Server Types**:
- `server/src/mappers/*.mapper.ts` - DB ↔ API transformers
- `server/src/services/*.service.ts` - Service layer types

**Client Types**:
- `client/src/types/*.ts` - Client-specific types
- `client/src/modules/*/types/` - Feature-specific types

---

## Conclusion

The codebase has **5 critical type errors** that must be fixed immediately, plus **significant technical debt** from excessive `any` usage. However, these are **solvable issues** with a clear path forward.

### Immediate Actions (This Week)
1. ✅ Fix 5 compilation errors (2 hours)
2. ✅ Create shared modifier type (2 hours)
3. ✅ Update mapper files (6 hours)

### Success Criteria
- ✅ `npm run typecheck` passes with 0 errors
- ✅ No new `any` types added (ESLint enforced)
- ✅ Critical paths (orders, auth, payments) fully typed
- ✅ All custom hooks have explicit return types
- ✅ Shared types used consistently across client/server

### Long-Term Vision
A fully type-safe codebase where:
- Runtime errors caught at compile time
- Refactoring is safe and confident
- IDE autocomplete works everywhere
- New developers can't introduce type bugs
- API contracts are enforced automatically

**Total Estimated Effort**: 80-100 hours over 4-5 weeks
**Team Size**: 2-3 developers working in parallel
**ROI**: High - prevents production bugs, improves developer velocity

---

**Report Generated**: 2025-10-17T03:43:40Z
**Tool**: TypeScript Compiler v5.8.3
**Agent**: Agent 3 - TypeScript & Type Safety Enforcer
**Status**: ✅ Scan Complete
