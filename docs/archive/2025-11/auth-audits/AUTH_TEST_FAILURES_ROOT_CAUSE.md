# Auth Test Failures - Root Cause Analysis

## Summary
The 3 failing auth tests in `orders.auth.test.ts` return 400 Bad Request instead of 401/403 because the `validateBody` middleware executes BEFORE the route handler's authentication checks, and all three tests send invalid request bodies that fail validation.

## Failing Tests

### 1. Invalid role test (line 337)
**Test:** Sends token with 'kitchen' role (unauthorized for orders:create)
**Expected:** 401 or 403
**Actual:** 400 Bad Request
**Why it fails:** Request body missing required fields (`id` and `menu_item_id` in items array). Body validation fails before route handler checks user role/scopes.

### 2. No auth header test (line 373)
**Test:** Sends request without Authorization header
**Expected:** 401 Unauthorized
**Actual:** 400 Bad Request
**Why it fails:** Request body missing required fields (`id` and `menu_item_id` in items array). Body validation fails before route handler checks authentication.

### 3. Malformed auth header test (line 385)
**Test:** Sends 'Invalid token format' instead of 'Bearer {token}'
**Expected:** 401 Unauthorized
**Actual:** 400 Bad Request
**Why it fails:** Request body missing required fields (`id` and `menu_item_id` in items array). Body validation fails before route handler checks authentication.

## Root Cause

### Middleware Execution Order Problem

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts`
**Line:** 41

```javascript
router.post('/', optionalAuth, validateBody(OrderPayload), async (req: AuthenticatedRequest, res, next) => {
```

**Execution flow:**
1. `optionalAuth` middleware runs - sets `req.user` if valid token present, or continues without auth
2. `validateBody(OrderPayload)` middleware runs - validates request body against Zod schema
3. Route handler runs - checks authentication/authorization requirements (lines 46-71)

### The Problem

The `validateBody` middleware (from `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/validate.ts` line 8) immediately returns 400 when validation fails:

```javascript
if (!r.success) {
  res.status(400).json({ error: 'INVALID_REQUEST', details: r.error.flatten() });
  return; // STOPS HERE - route handler never runs
}
```

### Test Body Validation Failure

All three failing tests send request bodies with incomplete item data:

```javascript
items: [{ name: 'Test', quantity: 1, price: 1.00 }]
```

But `OrderPayload` schema requires (`/Users/mikeyoung/CODING/rebuild-6.0/shared/contracts/order.ts` lines 6-8):

```typescript
export const OrderItem = z.object({
  id: z.string().min(1),           // REQUIRED - missing in tests
  menu_item_id: z.string().min(1), // REQUIRED - missing in tests
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  // ...
});
```

Since validation fails BEFORE the route handler executes, the authentication checks at lines 56-71 never run, and the tests receive 400 instead of 401/403.

### Why This Design Exists

The route uses `optionalAuth` (not `authenticate`) because it needs to support two distinct flows:
- **Customer orders** (online/kiosk via X-Client-Flow header) - anonymous, no auth required
- **Staff orders** (dine-in/server flow) - authentication required

The auth logic is in the route handler (lines 46-71), not in middleware, to allow conditional authentication based on `X-Client-Flow` header.

## Fix Required

**Option 1: Fix Test Data (Recommended)**
Update the test bodies to include required fields:

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/routes/orders.auth.test.ts`
**Lines to fix:** 326-342, 365-374, 376-386

```javascript
// OLD (fails validation):
items: [{ name: 'Test', quantity: 1, price: 1.00 }]

// NEW (passes validation):
items: [{
  id: 'item-uuid-test',
  menu_item_id: 'menu-item-test',
  name: 'Test',
  quantity: 1,
  price: 1.00
}]
```

**Option 2: Move Auth Checks Before Validation**
Replace `optionalAuth` with custom middleware that performs auth checks before validation:

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts`
**Line:** 41

```javascript
// Create custom middleware that checks auth requirements BEFORE validation
const checkOrderAuth: RequestHandler = (req: AuthenticatedRequest, res, next) => {
  const clientFlow = (req.headers['x-client-flow'] as string)?.toLowerCase();
  const isCustomerOrder = clientFlow === 'online' || clientFlow === 'kiosk';

  if (!isCustomerOrder && !req.user) {
    return next(Unauthorized('Authentication required for staff orders'));
  }
  next();
};

router.post('/', optionalAuth, checkOrderAuth, validateBody(OrderPayload), async (req, res, next) => {
  // ... rest of handler
});
```

**Recommendation:** Use Option 1. It's simpler, maintains the existing middleware order, and ensures tests accurately reflect real-world request payloads. Option 2 duplicates auth logic and increases complexity.

## Verification

After fixing test data (Option 1), verify with:

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0/server
npm test -- tests/routes/orders.auth.test.ts
```

Expected results:
- Line 337 test: Returns 401 or 403 (scope/role check fails)
- Line 373 test: Returns 401 (no auth header for staff order)
- Line 385 test: Returns 401 (malformed auth header)

All tests should now fail with correct auth error codes instead of validation errors.
