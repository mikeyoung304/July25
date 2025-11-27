# Fix Kiosk Checkout Flow: Restaurant 404 & Payment 500 Errors

## Overview

The kiosk checkout flow on production (Vercel + Render) is broken due to two cascading failures:
1. **Restaurant config endpoint returns 404** for slug "grow" - blocks cart calculations
2. **Payment confirm endpoint returns 500** - fails checkout completion

**Impact:** Users cannot complete orders via kiosk mode. Cart shows empty after failed checkout attempts.

## Problem Statement

### Bug 1: Restaurant Config 404
- **Endpoint:** `GET https://july25.onrender.com/api/v1/restaurants/grow/public`
- **Expected:** 200 with `{ tax_rate, currency, timezone }`
- **Actual:** 404 "Restaurant not found"

**Root Cause:** The `slug` column in the production `restaurants` table is either:
- Not populated (seed scripts don't include slug values)
- Has different casing ("Grow" vs "grow" - case-sensitive)
- Restaurant doesn't exist in production

### Bug 2: Payment Confirm 500
- **Endpoint:** `POST /api/v1/payments/confirm`
- **Expected:** 200 with payment confirmation
- **Actual:** 500 Internal Server Error

**Root Cause:** Multiple potential issues:
- `x-restaurant-id` header missing → `req.restaurantId` is undefined
- Order lookup fails (wrong restaurant ID passed)
- Stripe API call fails (timeout, auth, rate limit)

## Technical Analysis

### Current Implementation

#### Restaurant Config Flow
```
client/src/contexts/UnifiedCartContext.tsx:61
  → useRestaurantConfig(restaurantId)  // restaurantId = 'grow' (default)

client/src/hooks/useRestaurantConfig.ts:78
  → httpClient.get('/api/v1/restaurants/grow/public')

server/src/routes/restaurants.routes.ts:32
  → await query.eq('slug', id).single()  // CASE-SENSITIVE LOOKUP
  → 404 if not found
```

#### Payment Confirm Flow
```
client/src/components/kiosk/KioskCheckoutPage.tsx:235
  → processPayment('/api/v1/payments/confirm', { payment_intent_id, order_id })

client/src/services/http/httpClient.ts:152
  → headers.set('x-restaurant-id', restaurantId)  // MAY BE UNDEFINED!

server/src/routes/payments.routes.ts:221
  → if (!restaurantId) throw BadRequest(...)  // But we're seeing 500, not 400

server/src/routes/payments.routes.ts:291
  → OrdersService.getOrder(restaurantId, order_id)  // Fails if restaurantId wrong
```

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `server/src/routes/restaurants.routes.ts` | 10-57 | Public config endpoint with slug lookup |
| `server/src/routes/payments.routes.ts` | 207-339 | Payment confirmation endpoint |
| `client/src/hooks/useRestaurantConfig.ts` | 62-132 | Client-side config fetching |
| `client/src/contexts/UnifiedCartContext.tsx` | 45-79 | Cart with restaurant context |
| `client/src/services/http/httpClient.ts` | 151-170 | Header injection for API calls |
| `prisma/schema.prisma` | 572-597 | Restaurants table schema (slug exists) |
| `server/scripts/seed-restaurants.ts` | 31-68 | Seed script (MISSING slug values) |

## Proposed Solution

### Phase 1: Fix Production Data (Immediate)

**1.1 Add slug to production restaurant**

```sql
-- Run on Supabase production
UPDATE restaurants
SET slug = 'grow'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Verify
SELECT id, name, slug, tax_rate FROM restaurants WHERE slug = 'grow';
```

**1.2 Update seed script to include slugs**

```typescript
// server/scripts/seed-restaurants.ts
const restaurants = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Grow Fresh Local Food',
    slug: 'grow',  // ADD THIS
    timezone: 'America/New_York',
    tax_rate: 0.08,
    // ...
  }
];
```

### Phase 2: Defensive Server-Side Handling

**2.1 Case-insensitive slug lookup (optional)**

```typescript
// server/src/routes/restaurants.routes.ts:30-33
const { data: restaurant, error } = isUUID
  ? await query.eq('id', id).single()
  : await query.ilike('slug', id).single();  // Case-insensitive
```

**2.2 Better error messages**

```typescript
// server/src/routes/restaurants.routes.ts:34-42
if (error || !restaurant) {
  routeLogger.warn('Restaurant not found for public config', {
    restaurantIdOrSlug: id,
    isUUID,
    dbError: error?.message
  });
  throw NotFound(`Restaurant '${id}' not found (${isUUID ? 'by ID' : 'by slug'})`);
}
```

**2.3 Validate payment confirm has restaurant context**

```typescript
// server/src/routes/payments.routes.ts:218-228
const restaurantId = req.restaurantId;
if (!restaurantId) {
  routeLogger.error('Payment confirm missing restaurant ID', {
    headers: Object.keys(req.headers),
    hasXRestaurantId: !!req.headers['x-restaurant-id']
  });
  throw BadRequest('Restaurant ID is required. Send x-restaurant-id header.');
}
```

### Phase 3: Client-Side Resilience

**3.1 Block checkout when config fails**

```typescript
// client/src/contexts/UnifiedCartContext.tsx
export const UnifiedCartProvider: React.FC<Props> = ({ children }) => {
  const { taxRate, isLoading, error: configError } = useRestaurantConfig(restaurantId);

  // Expose config state to consumers
  const isConfigReady = !isLoading && !configError && taxRate > 0;

  return (
    <UnifiedCartContext.Provider value={{
      // ...existing values
      isConfigReady,
      configError,
    }}>
      {children}
    </UnifiedCartContext.Provider>
  );
};
```

**3.2 KioskCheckoutPage blocks checkout without config**

```typescript
// client/src/components/kiosk/KioskCheckoutPage.tsx
const { cart, isConfigReady, configError } = useUnifiedCart();

if (configError) {
  return (
    <div className="error-state">
      <p>Unable to load restaurant configuration</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}

// Disable checkout button if config not ready
<button disabled={!isConfigReady || isProcessing}>
  {!isConfigReady ? 'Loading...' : 'Complete Order'}
</button>
```

**3.3 Preserve cart on payment failure**

```typescript
// Cart is already preserved in localStorage - ensure we don't clear on error
// client/src/components/kiosk/KioskCheckoutPage.tsx:handlePaymentComplete

} catch (error) {
  logger.error('Payment failed', { error });
  setPaymentError(error instanceof Error ? error.message : 'Payment failed');
  // DO NOT call clearCart() here - let user retry
}
```

## Acceptance Criteria

### Must Have (P0)
- [ ] `GET /api/v1/restaurants/grow/public` returns 200 on production
- [ ] Kiosk checkout completes successfully with valid cart
- [ ] Cart items preserved in localStorage after failed checkout
- [ ] Clear error messages shown when checkout fails

### Should Have (P1)
- [ ] Checkout button disabled until restaurant config loads
- [ ] Seed script includes `slug` values for all restaurants
- [ ] Server logs include restaurant ID context for debugging
- [ ] Payment confirm returns 400 (not 500) when missing restaurant ID

### Nice to Have (P2)
- [ ] Case-insensitive slug lookup
- [ ] Retry button on config load failure
- [ ] Request ID tracing through payment flow

## Test Plan

### Manual Testing
1. Go to `https://july25-client.vercel.app/kiosk`
2. Add items to cart
3. Proceed to checkout
4. Verify tax calculation is correct (8%)
5. Complete demo payment
6. Verify order confirmation shown

### Automated Tests
```typescript
// tests/e2e/kiosk-checkout.spec.ts
test('kiosk checkout completes successfully', async ({ page }) => {
  await page.goto('/kiosk');
  // ... add items, checkout, verify confirmation
});

// server/tests/routes/restaurants.routes.test.ts
describe('GET /api/v1/restaurants/:id/public', () => {
  it('returns config for valid slug', async () => {
    const res = await request(app).get('/api/v1/restaurants/grow/public');
    expect(res.status).toBe(200);
    expect(res.body.tax_rate).toBe(0.08);
  });

  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get('/api/v1/restaurants/unknown/public');
    expect(res.status).toBe(404);
  });
});
```

## Implementation Checklist

### Phase 1: Production Data Fix (5 min)
- [ ] Run SQL to add slug='grow' to production restaurant
- [ ] Verify endpoint returns 200

### Phase 2: Seed Script Fix (10 min)
- [ ] Add `slug` field to `seed-restaurants.ts`
- [ ] Test seeding locally

### Phase 3: Server Improvements (30 min)
- [ ] Add better logging to restaurant routes
- [ ] Add restaurant ID validation to payment confirm
- [ ] Improve error messages

### Phase 4: Client Improvements (30 min)
- [ ] Expose `isConfigReady` from cart context
- [ ] Block checkout when config not loaded
- [ ] Add error state UI for config failures

### Phase 5: Testing (20 min)
- [ ] Add E2E test for kiosk checkout
- [ ] Add unit tests for slug lookup
- [ ] Manual test on production

## References

- `server/src/routes/restaurants.routes.ts:10-57` - Public config endpoint
- `server/src/routes/payments.routes.ts:207-339` - Payment confirm
- `client/src/hooks/useRestaurantConfig.ts:78` - Config fetch
- `client/src/contexts/UnifiedCartContext.tsx:45-79` - Cart context
- `prisma/schema.prisma:572-597` - Restaurants schema
- ADR-007: Per-Restaurant Configuration
- ADR-008: Slug-Based Restaurant Routing
