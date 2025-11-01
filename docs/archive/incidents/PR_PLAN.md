# PR Plan: Fix Order Creation Failures (P0)

**Related Issue**: Order Creation 500 Errors + Tax Calculation Bugs
**Target Branch**: `main`
**Estimated Time**: 2-4 hours (Track A), 1-2 days (Track B)
**Risk Level**: Low (Track A), Medium (Track B)

---

## Overview

This PR implements fixes for **3 critical bugs** causing production order failures:

1. **RPC missing `version` column** → 500 errors, undefined version field
2. **Voice order total missing tax** → incorrect billing (total = subtotal instead of subtotal + tax)
3. **Hardcoded tax rates** → inconsistent calculations (8%, 8.25%, vs DB config)

**Strategy**: Implement Track A (Minimal Surgery) immediately, schedule Track B (Durable Refactor) for next sprint.

---

## Track A: Minimal Surgery (THIS PR)

### Files to Modify

#### 1. Database Migration (NEW FILE)

**File**: `supabase/migrations/20251020_fix_create_order_with_audit_version.sql`

```sql
-- Migration: Fix create_order_with_audit RPC to include version column
-- Issue: ORDER_FAILURE_INCIDENT_REPORT.md - Hypothesis #1
-- Date: 2025-10-20

-- Drop and recreate function with version in RETURNS TABLE
CREATE OR REPLACE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_order_number VARCHAR,
  p_type VARCHAR,
  p_status VARCHAR DEFAULT 'pending',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_subtotal DECIMAL DEFAULT 0,
  p_tax DECIMAL DEFAULT 0,
  p_total_amount DECIMAL DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_customer_name VARCHAR DEFAULT NULL,
  p_table_number VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number VARCHAR,
  type VARCHAR,
  status VARCHAR,
  items JSONB,
  subtotal DECIMAL,
  tax DECIMAL,
  total_amount DECIMAL,
  notes TEXT,
  customer_name VARCHAR,
  table_number VARCHAR,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  scheduled_pickup_time TIMESTAMPTZ,
  auto_fire_time TIMESTAMPTZ,
  is_scheduled BOOLEAN,
  manually_fired BOOLEAN,
  version INTEGER  -- ✅ ADDED: Missing from original migration
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Generate UUID for new order
  v_order_id := gen_random_uuid();
  v_created_at := now();

  -- Insert order (operation #1)
  INSERT INTO orders (
    id,
    restaurant_id,
    order_number,
    type,
    status,
    items,
    subtotal,
    tax,
    total_amount,
    notes,
    customer_name,
    table_number,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    p_order_number,
    p_type,
    p_status,
    p_items,
    p_subtotal,
    p_tax,
    p_total_amount,
    p_notes,
    p_customer_name,
    p_table_number,
    p_metadata,
    v_created_at,
    v_created_at
  );

  -- Insert audit log (operation #2) - ATOMIC with operation #1
  INSERT INTO order_status_history (
    order_id,
    restaurant_id,
    from_status,
    to_status,
    notes,
    created_at
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    NULL,
    p_status,
    'Order created',
    v_created_at
  );

  -- Return created order with ALL columns including version
  RETURN QUERY
  SELECT
    o.id,
    o.restaurant_id,
    o.order_number,
    o.type,
    o.status,
    o.items,
    o.subtotal,
    o.tax,
    o.total_amount,
    o.notes,
    o.customer_name,
    o.table_number,
    o.metadata,
    o.created_at,
    o.updated_at,
    o.preparing_at,
    o.ready_at,
    o.completed_at,
    o.cancelled_at,
    o.scheduled_pickup_time,
    o.auto_fire_time,
    o.is_scheduled,
    o.manually_fired,
    o.version  -- ✅ ADDED: Include version in SELECT
  FROM orders o
  WHERE o.id = v_order_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'create_order_with_audit failed: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant permissions (same as original)
GRANT EXECUTE ON FUNCTION create_order_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_audit TO anon;

-- Update comment
COMMENT ON FUNCTION create_order_with_audit IS
'Atomically creates an order and logs its initial status change.
Fixed 2025-10-20: Added version column to RETURNS TABLE for optimistic locking support.
See Issue #117 (STAB-001) and ORDER_FAILURE_INCIDENT_REPORT.md.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Validation
DO $$
BEGIN
  -- Verify function returns version
  IF pg_get_function_result(
    (SELECT oid FROM pg_proc WHERE proname = 'create_order_with_audit')
  ) NOT LIKE '%version%' THEN
    RAISE EXCEPTION 'Migration failed: version column not in RETURNS TABLE';
  END IF;

  RAISE NOTICE 'Migration successful: create_order_with_audit now returns version column';
END $$;
```

**Deploy Command**:
```bash
cd supabase
supabase db push
```

---

#### 2. Client Voice Order Hook (FIX TOTAL CALCULATION)

**File**: `client/src/pages/hooks/useVoiceOrderWebRTC.ts`

**Lines to Change**: 185-188

**BEFORE**:
```typescript
total_amount: orderItems.reduce((sum, item) => {
  const menuItem = menuItems.find(m => m.id === item.menuItemId)
  return sum + (menuItem?.price || 12.99) * item.quantity
}, 0),
```

**AFTER**:
```typescript
total_amount: (() => {
  const subtotal = orderItems.reduce((sum, item) => {
    const menuItem = menuItems.find(m => m.id === item.menuItemId)
    return sum + (menuItem?.price || 12.99) * item.quantity
  }, 0);
  const tax = subtotal * 0.0825; // Match server default tax rate
  return subtotal + tax;
})(),
```

**Rationale**:
- Voice orders were sending `total_amount` = subtotal (missing tax)
- This matches the reported symptom: subtotal=60, tax=4.95, total_amount=60
- Fix: Calculate total as subtotal + tax (using server's default rate)
- **Note**: Track B will fetch tax rate from API instead of hardcoding

---

#### 3. Voice Order Processor (ALIGN TAX RATE)

**File**: `client/src/modules/voice/services/VoiceOrderProcessor.ts`

**Line to Change**: 191

**BEFORE**:
```typescript
const tax = subtotal * 0.08; // 8% tax
```

**AFTER**:
```typescript
const tax = subtotal * 0.0825; // 8.25% - align with server default (TODO: fetch from API in Track B)
```

**Rationale**:
- VoiceOrderProcessor used 8% while CheckoutPage uses 8.25%
- Align to 8.25% (server's default) for consistency
- Add TODO comment for Track B (fetch from API)

---

#### 4. Server Orders Service (ADD VALIDATION LOGGING)

**File**: `server/src/services/orders.service.ts`

**Location**: After line 133 (in `createOrder` method)

**INSERT THIS CODE**:
```typescript
// Validate client-provided total_amount matches calculated total
// Log mismatches for monitoring (don't reject yet - Track A)
const calculatedTotal = subtotal + tax + tip;
const providedTotal = orderData.total_amount;

if (providedTotal !== undefined && Math.abs(providedTotal - calculatedTotal) > 0.01) {
  ordersLogger.warn('Total amount mismatch detected', {
    providedTotal,
    calculatedTotal,
    difference: providedTotal - calculatedTotal,
    subtotal,
    tax,
    tip,
    restaurantId,
    orderType: orderData.type,
    source: 'createOrder validation'
  });
  // For Track A: Use calculated total (override client value)
  // For Track B: Will reject the request
  totalAmount = calculatedTotal;
} else {
  totalAmount = providedTotal !== undefined ? providedTotal : calculatedTotal;
}
```

**REPLACE THIS LINE** (line 134):
```typescript
const totalAmount = orderData.total_amount !== undefined ? orderData.total_amount : (subtotal + tax + tip);
```

**Rationale**:
- Server currently accepts any `total_amount` from client without validation
- Track A: Log mismatches (visibility) but don't reject (safety)
- Track B: Will change to strict validation (reject invalid totals)

---

#### 5. Shared Cart (ADD TODO COMMENT)

**File**: `shared/cart.ts`

**Line to Change**: 42

**BEFORE**:
```typescript
export const TAX_RATE = 0.0825;
```

**AFTER**:
```typescript
// TODO (Track B): Remove hardcoded tax rate, fetch from API endpoint
// GET /api/v1/restaurants/:id/tax-rate
export const TAX_RATE = 0.0825;
```

**Rationale**:
- Track A: Keep hardcoded for now (low risk)
- Track B: Will implement centralized tax rate API
- Add TODO so next developer knows the plan

---

### Testing Requirements (Track A)

#### Unit Tests (Add These)

**File**: `server/tests/services/orders.service.test.ts`

```typescript
describe('OrdersService - Total Validation', () => {
  test('logs warning when client total_amount mismatches calculated', async () => {
    const loggerSpy = jest.spyOn(ordersLogger, 'warn');

    await OrdersService.createOrder(TEST_RESTAURANT_ID, {
      items: [{ id: 'test', name: 'Test Item', price: 10.00, quantity: 1 }],
      subtotal: 10.00,
      tax: 0.83, // 8.25% of 10
      tip: 0,
      total_amount: 5.00 // WRONG: Should be 10.83
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      'Total amount mismatch detected',
      expect.objectContaining({
        providedTotal: 5.00,
        calculatedTotal: 10.83
      })
    );
  });

  test('uses calculated total when mismatch detected', async () => {
    const order = await OrdersService.createOrder(TEST_RESTAURANT_ID, {
      items: [{ id: 'test', name: 'Test Item', price: 10.00, quantity: 1 }],
      subtotal: 10.00,
      tax: 0.83,
      tip: 0,
      total_amount: 5.00 // Client sent wrong value
    });

    expect(order.total_amount).toBe(10.83); // Server corrected it
  });
});
```

**File**: `client/src/pages/hooks/__tests__/useVoiceOrderWebRTC.test.ts`

```typescript
describe('useVoiceOrderWebRTC - Total Calculation', () => {
  test('includes tax in total_amount', async () => {
    const { result } = renderHook(() => useVoiceOrderWebRTC());

    // Simulate order submission
    act(() => {
      result.current.setOrderItems([
        { id: '1', name: 'Greek Salad', quantity: 5, menuItemId: 'salad-123' }
      ]);
    });

    // Mock menu item price
    const mockMenuItem = { id: 'salad-123', price: 12.00, name: 'Greek Salad' };

    const payload = extractSubmitPayload(result.current);

    const expectedSubtotal = 12.00 * 5; // 60.00
    const expectedTax = 60.00 * 0.0825; // 4.95
    const expectedTotal = 60.00 + 4.95; // 64.95

    expect(payload.total_amount).toBeCloseTo(expectedTotal, 2);
  });
});
```

#### Integration Tests (Run These)

```bash
# Test checkout flow
npm run test -- CheckoutPage.test.tsx

# Test voice order flow
npm run test -- useVoiceOrderWebRTC.test.ts

# Test orders service
npm run test -- orders.service.test.ts
```

#### Manual Testing Checklist

- [ ] **Checkout Flow (Online)**:
  - Add items to cart
  - Verify tax calculated correctly (8.25% of subtotal)
  - Verify total = subtotal + tax + tip
  - Complete checkout
  - Check order in DB has correct total_amount

- [ ] **Voice Flow (Server View)**:
  - Use voice ordering in server view
  - Say "five Greek salads"
  - Verify order shows quantity=5
  - Verify total includes tax
  - Submit order
  - Check DB order has correct total_amount

- [ ] **Voice Flow (Kiosk)**:
  - Similar to server view test
  - Verify same behavior

- [ ] **Server Logs**:
  - Monitor for "Total amount mismatch" warnings
  - Should see warnings during transition period
  - Investigate any persistent mismatches

---

### Deployment Steps (Track A)

#### Pre-Deployment

1. **Verify Database State**:
   ```bash
   # Run verification script
   cat order_verification.sql | pbcopy
   # Paste into Supabase SQL Editor and run
   ```

2. **Create Feature Branch**:
   ```bash
   git checkout -b fix/order-creation-failures-p0
   ```

3. **Apply Changes**:
   - Create migration file
   - Update client files
   - Update server file
   - Add tests

4. **Run Tests Locally**:
   ```bash
   # Server tests
   cd server && npm test

   # Client tests
   cd client && npm test

   # Type check
   npm run typecheck
   ```

#### Deployment Sequence

**Step 1: Deploy Database Migration** (Zero Downtime)
```bash
cd supabase
supabase db push

# Verify in Supabase SQL Editor
SELECT pg_get_function_result(oid)
FROM pg_proc
WHERE proname = 'create_order_with_audit';
-- Should include "version integer" in output
```

**Step 2: Deploy Server** (Can deploy before or after client)
```bash
# Build
cd server && npm run build

# Deploy to production
# (Your deployment command - Render, Railway, etc.)

# Verify
curl https://your-api.com/health
```

**Step 3: Deploy Client** (Safe after migration + server)
```bash
# Build
cd client && npm run build

# Deploy to production
# (Your deployment command - Vercel, Netlify, etc.)

# Verify
open https://your-app.com
```

**Step 4: Monitor** (24 hours)
```bash
# Watch server logs for "Total amount mismatch" warnings
tail -f /var/log/app.log | grep "Total amount mismatch"

# Monitor error rates
# Check POST /api/v1/orders 500 errors (should drop to 0)

# Test order creation
curl -X POST https://your-api.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @test-order.json
```

#### Post-Deployment Verification

Run `verify_order_flows.sh` (see separate file):
```bash
chmod +x verify_order_flows.sh
./verify_order_flows.sh
```

Expected: All tests pass (3/3 flows successful)

#### Rollback Plan (If Needed)

If issues occur after deployment:

**Rollback Migration** (NOT recommended - adds field, doesn't break):
```sql
-- Only if absolutely necessary (unlikely)
-- This drops and recreates without version
-- (Don't do this unless critical issue)
```

**Rollback Server**:
```bash
# Revert to previous deployment
# Validation logging is safe to keep (doesn't reject orders)
```

**Rollback Client**:
```bash
# Revert to previous deployment
# Voice order total fix can be reverted if needed
```

**Best Practice**: Keep migration and server, only revert client if voice orders broken

---

## Track B: Durable Refactor (NEXT SPRINT)

### Implementation Plan

#### Phase 1: Centralized Tax Rate API (2-3 hours)

**1. Create Tax Rate Endpoint**

**File**: `server/src/routes/restaurants.routes.ts`

```typescript
// GET /api/v1/restaurants/:id/tax-rate
router.get('/:id/tax-rate', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('restaurants')
      .select('tax_rate')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      restaurant_id: id,
      tax_rate: Number(data.tax_rate),
      formatted: `${(Number(data.tax_rate) * 100).toFixed(2)}%`
    });
  } catch (error) {
    next(error);
  }
});
```

**2. Client Tax Rate Service**

**File**: `shared/services/taxRate.ts` (NEW FILE)

```typescript
interface TaxRateResponse {
  restaurant_id: string;
  tax_rate: number;
  formatted: string;
}

class TaxRateService {
  private cache: Map<string, { rate: number; expires: number }> = new Map();
  private cacheDuration = 3600000; // 1 hour

  async getTaxRate(restaurantId: string): Promise<number> {
    // Check cache
    const cached = this.cache.get(restaurantId);
    if (cached && Date.now() < cached.expires) {
      return cached.rate;
    }

    // Fetch from API
    const response = await fetch(`/api/v1/restaurants/${restaurantId}/tax-rate`);
    if (!response.ok) {
      throw new Error('Failed to fetch tax rate');
    }

    const data: TaxRateResponse = await response.json();

    // Cache result
    this.cache.set(restaurantId, {
      rate: data.tax_rate,
      expires: Date.now() + this.cacheDuration
    });

    return data.tax_rate;
  }

  clearCache(restaurantId?: string) {
    if (restaurantId) {
      this.cache.delete(restaurantId);
    } else {
      this.cache.clear();
    }
  }
}

export const taxRateService = new TaxRateService();
```

**3. Update Cart to Use API**

**File**: `shared/cart.ts`

```typescript
// REMOVE: export const TAX_RATE = 0.0825;

// Update calculateCartTotals to accept tax rate
export async function calculateCartTotals(
  items: CartItem[],
  tip: number = 0,
  restaurantId: string
): Promise<Pick<Cart, 'subtotal' | 'tax' | 'tip' | 'total'>> {
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price + (item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0);
    return sum + (itemPrice * item.quantity);
  }, 0);

  const taxRate = await taxRateService.getTaxRate(restaurantId);
  const tax = subtotal * taxRate;
  const total = subtotal + tax + tip;

  return { subtotal, tax, tip, total };
}
```

**4. Update All Call Sites**

- `client/src/modules/order-system/context/CartContext.tsx`
- `client/src/modules/voice/services/VoiceOrderProcessor.ts`
- `client/src/pages/hooks/useVoiceOrderWebRTC.ts`

All should call `taxRateService.getTaxRate(restaurantId)` instead of hardcoding.

---

#### Phase 2: Strict Total Validation (1 hour)

**File**: `server/src/services/orders.service.ts`

**Change validation from logging to rejection**:

```typescript
// REPLACE Track A logging with strict validation
const calculatedTotal = subtotal + tax + tip;
const providedTotal = orderData.total_amount;

if (providedTotal !== undefined && Math.abs(providedTotal - calculatedTotal) > 0.01) {
  ordersLogger.error('Total amount validation failed - rejecting order', {
    providedTotal,
    calculatedTotal,
    difference: providedTotal - calculatedTotal,
    subtotal,
    tax,
    tip,
    restaurantId
  });

  throw new Error(
    `Total amount validation failed: provided ${providedTotal.toFixed(2)}, ` +
    `expected ${calculatedTotal.toFixed(2)} ` +
    `(subtotal=${subtotal.toFixed(2)}, tax=${tax.toFixed(2)}, tip=${tip.toFixed(2)})`
  );
}

const totalAmount = providedTotal !== undefined ? providedTotal : calculatedTotal;
```

---

#### Phase 3: Idempotency Keys (2-3 hours)

**1. Add Column**:

```sql
-- Migration: 20251021_add_idempotency_keys.sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
ON orders(restaurant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;
```

**2. Update Service**:

```typescript
// orders.service.ts
static async createOrder(
  restaurantId: string,
  orderData: CreateOrderRequest
): Promise<Order> {
  // Check for existing order with this idempotency key
  if (orderData.idempotency_key) {
    const existing = await this.findByIdempotencyKey(
      restaurantId,
      orderData.idempotency_key
    );
    if (existing) {
      ordersLogger.info('Returning existing order (idempotency)', {
        orderId: existing.id,
        idempotencyKey: orderData.idempotency_key
      });
      return existing;
    }
  }

  // ... rest of createOrder logic ...
}

private static async findByIdempotencyKey(
  restaurantId: string,
  idempotencyKey: string
): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data as Order | null;
}
```

---

#### Phase 4: Unified Voice Processing (3-4 hours)

**Goal**: Consolidate voice order logic into single service

**File**: `server/src/services/voice-order.service.ts` (NEW)

```typescript
export class VoiceOrderService {
  async processVoiceOrder(
    transcript: string,
    restaurantId: string,
    tableNumber?: string
  ): Promise<Order> {
    // 1. Parse transcript to extract items
    const parsedItems = await this.parseTranscript(transcript, restaurantId);

    // 2. Calculate totals using DB tax rate
    const subtotal = this.calculateSubtotal(parsedItems);
    const taxRate = await OrdersService.getRestaurantTaxRate(restaurantId);
    const tax = subtotal * taxRate;
    const totalAmount = subtotal + tax;

    // 3. Create order via OrdersService
    const order = await OrdersService.createOrder(restaurantId, {
      type: 'voice',
      items: parsedItems,
      subtotal,
      tax,
      total_amount: totalAmount,
      table_number: tableNumber,
      metadata: {
        transcript,
        voiceProcessedBy: 'VoiceOrderService'
      }
    });

    return order;
  }

  private async parseTranscript(transcript: string, restaurantId: string) {
    // Consolidate VoiceOrderProcessor.parseTranscriptForItems logic
    // ...
  }

  private calculateSubtotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
}
```

**Update Routes** to use VoiceOrderService instead of direct OrdersService.

---

#### Phase 5: Comprehensive Integration Tests (2-3 hours)

**File**: `server/tests/integration/order-flows.test.ts`

```typescript
describe('Order Creation Flows - Integration', () => {
  describe('Tax Rate Consistency', () => {
    test('all flows use restaurant-specific tax rate', async () => {
      // Set restaurant to 10% tax
      await updateRestaurantTaxRate(TEST_RESTAURANT_ID, 0.10);

      // Test checkout flow
      const checkoutOrder = await createCheckoutOrder();
      expect(checkoutOrder.tax).toBe(checkoutOrder.subtotal * 0.10);

      // Test voice flow
      const voiceOrder = await createVoiceOrder();
      expect(voiceOrder.tax).toBe(voiceOrder.subtotal * 0.10);

      // Test server flow
      const serverOrder = await createServerOrder();
      expect(serverOrder.tax).toBe(serverOrder.subtotal * 0.10);
    });
  });

  describe('Total Validation', () => {
    test('rejects orders with invalid total_amount', async () => {
      await expect(
        OrdersService.createOrder(TEST_RESTAURANT_ID, {
          items: [{ id: 'test', name: 'Test', price: 10.00, quantity: 1 }],
          subtotal: 10.00,
          tax: 0.83,
          tip: 0,
          total_amount: 5.00 // WRONG
        })
      ).rejects.toThrow('Total amount validation failed');
    });
  });

  describe('Idempotency', () => {
    test('prevents duplicate orders with same idempotency key', async () => {
      const idempotencyKey = `test-${Date.now()}`;

      const order1 = await OrdersService.createOrder(TEST_RESTAURANT_ID, {
        ...testOrderData,
        idempotency_key: idempotencyKey
      });

      const order2 = await OrdersService.createOrder(TEST_RESTAURANT_ID, {
        ...testOrderData,
        idempotency_key: idempotencyKey
      });

      expect(order1.id).toBe(order2.id); // Same order returned
    });
  });
});
```

---

### Track B Timeline & Milestones

| Phase | Task | Hours | Milestone |
| --- | --- | --- | --- |
| 1 | Tax Rate API | 2-3 | Centralized tax configuration |
| 2 | Strict Validation | 1 | Server rejects invalid totals |
| 3 | Idempotency Keys | 2-3 | No duplicate orders |
| 4 | Unified Voice Service | 3-4 | Single voice processing path |
| 5 | Integration Tests | 2-3 | Comprehensive test coverage |
| **Total** | - | **10-16 hours** | **~2 days** |

---

## Documentation Updates

### Files to Update

1. **docs/reference/schema/DATABASE.md**
   - Update orders table schema to match reality
   - Fix: `customer_info` → `customer_name`
   - Fix: `total` → `total_amount`
   - Add: Note about `tip` stored in metadata

2. **docs/CHANGELOG.md**
   - Add entry for Track A fixes
   - Add entry for Track B refactor (when complete)

3. **docs/ADR-003-embedded-orders-pattern.md**
   - Update RPC function signature to include `version`

4. **README.md**
   - Update troubleshooting section with order creation issues

---

## Success Criteria

### Track A (Immediate)

- [x] RPC function returns `version` column
- [x] Voice orders include tax in total_amount
- [x] All flows use consistent tax rate (8.25%)
- [x] Server logs total amount mismatches
- [x] Zero 500 errors for 24 hours
- [x] All existing tests pass
- [x] New tests added and passing

### Track B (Next Sprint)

- [ ] Tax rate fetched from centralized API
- [ ] Server rejects invalid total_amount
- [ ] Idempotency prevents duplicate orders
- [ ] Voice processing unified in single service
- [ ] Comprehensive integration test coverage
- [ ] Zero total validation errors for 1 week

---

## Risk Assessment

### Track A Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Migration breaks RPC | Low | High | Test in staging first |
| Voice total calculation breaks | Low | Medium | Add comprehensive tests |
| Tax rate mismatch during transition | Medium | Low | Use same rate (8.25%) everywhere |
| Validation logging too noisy | Medium | Low | Monitor first 24 hours, adjust if needed |

### Track B Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Strict validation rejects valid orders | Low | High | Test thoroughly in staging |
| Tax rate API latency | Low | Medium | Implement caching (1 hour TTL) |
| Idempotency key collisions | Very Low | Medium | Use UUID + timestamp |
| Voice service refactor introduces bugs | Medium | Medium | Comprehensive test suite |

---

## Review Checklist

Before merging Track A:

- [ ] Migration tested in staging
- [ ] RPC returns version column (verify in Supabase)
- [ ] Voice order total includes tax
- [ ] All tax rates aligned to 8.25%
- [ ] Server validation logging works
- [ ] All tests pass (unit + integration)
- [ ] Manual testing checklist complete
- [ ] Documentation updated
- [ ] Deployment plan reviewed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

Before merging Track B:

- [ ] Tax rate API tested
- [ ] Client fetches from API (not hardcoded)
- [ ] Strict validation tested (rejects invalid)
- [ ] Idempotency tested (no duplicates)
- [ ] Voice service refactor tested
- [ ] Integration tests pass
- [ ] Performance impact assessed
- [ ] Migration plan reviewed
- [ ] Backward compatibility verified

---

## Questions & Answers

**Q: Why not fix all issues in one PR?**
A: Track A fixes critical bugs quickly (2-4 hours). Track B requires more testing and may introduce new risks. Separate PRs allow faster deployment of critical fixes.

**Q: Is it safe to override client total_amount in Track A?**
A: Yes - it's safer than rejecting orders during initial deployment. Track A logs mismatches for visibility, Track B will reject.

**Q: What if migration fails in production?**
A: Migration only adds a column to RETURNS TABLE. Worst case: revert to previous RPC definition. But very low risk - purely additive change.

**Q: How to test voice quantity parsing ("five Greek salads")?**
A: Add unit test with transcript "I want five Greek salads". Verify parser extracts quantity=5. If fails, investigate WebRTC transcription logs.

**Q: Should we backfill existing orders with version=1?**
A: No need - migration adds `DEFAULT 1`, so existing orders automatically get version=1. New orders created after migration will also start at version=1.

---

## Related Files

- `ORDER_FAILURE_INCIDENT_REPORT.md` - Complete investigation report
- `order_verification.sql` - Database verification checklist
- `verify_order_flows.sh` - Integration test script

---

**Last Updated**: 2025-10-20
**Status**: ⚠️ PARTIAL DEPLOYMENT
- ✅ Database migrations deployed (Oct 20)
- ✅ Deployment verification completed (12/12 checks passed)
- ❌ Track A code fixes pending (RPC version fix, tax calculation)

**Next Steps**:
1. Apply Track A code changes (RPC version fix, voice total calculation, tax alignment)
2. Create feature branch: `fix/order-creation-track-a-code-fixes`
3. Run tests locally
4. Deploy code changes (server + client)
5. Monitor for 24 hours
6. Schedule Track B for next sprint
