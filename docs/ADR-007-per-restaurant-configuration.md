# ADR-007: Per-Restaurant Configuration Pattern

**Status**: Accepted
**Date**: 2025-10-19
**Deciders**: Development Team
**Related**: STAB-003 (Issue #119), DATABASE.md, ADR-002 (Multi-Tenancy)

---

## Context

The codebase had **three different hardcoded tax rates** across multiple services:
- `orders.service.ts` line 99: **7%** (0.07)
- `payment.service.ts` line 31: **8%** (0.08)
- `DATABASE.md` line 124: **8.25%** (0.0825)

This created:
- **Revenue discrepancies**: Orders calculated with 7%, payments with 8%
- **Data inconsistency**: Different totals in different parts of the system
- **Compliance risk**: Incorrect tax collection for different jurisdictions
- **Inflexibility**: Cannot support multi-location restaurants with different tax rates

### Real-World Requirements

Restaurant businesses need per-location configuration for:
- **Tax rates** (varies by city, county, state)
- **Business hours** (different locations have different hours)
- **Service fees** (delivery fees, platform fees vary by location)
- **Tipping defaults** (15%, 18%, 20% suggestions)
- **Rounding rules** (some jurisdictions require specific rounding)
- **Receipt customization** (footer text, branding per location)

Without a standard pattern, developers might create inconsistent approaches for each configuration type.

---

## Decision

We establish a **column-based** per-restaurant configuration pattern:

### Pattern: Direct Columns on `restaurants` Table

For **frequently accessed, typed configuration values**, add columns directly to the `restaurants` table rather than using a generic JSONB `settings` column.

**Rationale**:
1. **Type safety**: Database enforces types (DECIMAL for tax_rate, not string)
2. **Query performance**: Indexed columns are faster than JSONB queries
3. **Validation**: CHECK constraints enforce business rules
4. **Clarity**: Schema documents available settings
5. **Migration safety**: ALTER TABLE with DEFAULT ensures no null values

### Example: Tax Rate Configuration

```sql
ALTER TABLE restaurants
ADD COLUMN tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0825;

COMMENT ON COLUMN restaurants.tax_rate IS
  'Sales tax rate in decimal format (0.0825 = 8.25%).
   Configurable per location for compliance with local tax jurisdictions.';

CREATE INDEX idx_restaurants_tax_rate ON restaurants(tax_rate);
```

**Access Pattern**:
```typescript
// Service layer: Fetch once, use many times
private static async getRestaurantTaxRate(restaurantId: string): Promise<number> {
  const { data } = await supabase
    .from('restaurants')
    .select('tax_rate')
    .eq('id', restaurantId)
    .single();

  return data?.tax_rate ?? 0.0825; // Fallback to default
}

// Usage in order creation
const taxRate = await this.getRestaurantTaxRate(restaurantId);
const tax = subtotal * taxRate;
```

---

## Alternatives Considered

### Alternative 1: JSONB `settings` Column

```sql
ALTER TABLE restaurants
ADD COLUMN settings JSONB DEFAULT '{}';

-- Access via:
SELECT settings->>'tax_rate' FROM restaurants WHERE id = $1;
```

**Pros**:
- Flexible - add any setting without migrations
- Single column for all configuration

**Cons**:
- ❌ No type safety (everything is string)
- ❌ No CHECK constraints (can't enforce valid ranges)
- ❌ Slower queries (JSONB index required for performance)
- ❌ Schema doesn't document available settings
- ❌ Easy to create typos (`tax_rate` vs `taxRate` vs `tax-rate`)
- ❌ No compile-time TypeScript type checking

**Decision**: Rejected for frequently-accessed, typed values like tax rates.

**When to use JSONB**: Rare, truly dynamic, or experimental settings.

### Alternative 2: Separate `restaurant_settings` Table

```sql
CREATE TABLE restaurant_settings (
  restaurant_id UUID REFERENCES restaurants(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (restaurant_id, key)
);
```

**Pros**:
- Normalized design
- Can add settings without migrations

**Cons**:
- ❌ Requires JOINs for every query
- ❌ No type safety (values are TEXT)
- ❌ More complex queries
- ❌ Violates multi-tenancy pattern (ADR-002: keep data in main tables)

**Decision**: Rejected - adds complexity without clear benefit.

### Alternative 3: Service-Level Configuration

Keep hardcoded values in service layer as "constants":

```typescript
class PaymentService {
  private static readonly TAX_RATES = {
    'restaurant-1': 0.07,
    'restaurant-2': 0.08,
  };
}
```

**Pros**:
- Simple to implement
- No database changes

**Cons**:
- ❌ Requires code deployment to change tax rates (unacceptable)
- ❌ Cannot scale to hundreds of restaurants
- ❌ Not multi-tenant friendly
- ❌ Tax rates are **data**, not code

**Decision**: Rejected - this is what caused the original bug.

---

## Implementation Guidelines

### When to Add Column vs JSONB

**Use direct column** when:
- ✅ Frequently accessed (every order, every payment)
- ✅ Has specific data type (DECIMAL, INTEGER, BOOLEAN, DATE)
- ✅ Needs validation (CHECK constraints)
- ✅ Needs indexing for queries
- ✅ Will be stable over time (unlikely to become deprecated)

**Use JSONB `metadata`** when:
- ✅ Rarely accessed (experimental features)
- ✅ Truly dynamic schema (unknown keys)
- ✅ Temporary data (will be moved to columns later)
- ✅ Optional debugging/diagnostic data

### Pattern Template

```sql
-- 1. Add column with sensible default
ALTER TABLE restaurants
ADD COLUMN {setting_name} {type} NOT NULL DEFAULT {default_value};

-- 2. Add documentation
COMMENT ON COLUMN restaurants.{setting_name} IS '{description}';

-- 3. Add index if queried (optional)
CREATE INDEX idx_restaurants_{setting_name} ON restaurants({setting_name});

-- 4. Add CHECK constraint if needed (optional)
ALTER TABLE restaurants
ADD CONSTRAINT check_{setting_name}_range
CHECK ({setting_name} >= {min} AND {setting_name} <= {max});
```

### Service Layer Pattern

```typescript
/**
 * Get restaurant-specific configuration value
 * Pattern: Cache at request level, fetch from DB only once
 */
private static async getRestaurantConfig<T>(
  restaurantId: string,
  column: string,
  defaultValue: T
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(column)
      .eq('id', restaurantId)
      .single();

    if (error) {
      logger.error(`Failed to fetch restaurant ${column}`, { error, restaurantId });
      return defaultValue;
    }

    return data?.[column] ?? defaultValue;
  } catch (error) {
    logger.error(`Exception fetching restaurant ${column}`, { error, restaurantId });
    return defaultValue;
  }
}

// Specific getters with type safety
private static async getRestaurantTaxRate(restaurantId: string): Promise<number> {
  return this.getRestaurantConfig<number>(restaurantId, 'tax_rate', 0.0825);
}
```

---

## Future Settings to Add

Based on this pattern, we should add:

### Immediate (Next Sprint)
- [ ] `service_fee_rate DECIMAL(5,4)` - Platform/service fee percentage
- [ ] `requires_tip BOOLEAN DEFAULT FALSE` - Force tip selection at checkout
- [ ] `default_tip_percentage INTEGER DEFAULT 18` - Pre-selected tip amount

### Soon (Next Quarter)
- [ ] `business_hours JSONB` - Opening hours by day (dynamic schema acceptable here)
- [ ] `auto_accept_orders BOOLEAN DEFAULT TRUE` - Require manual confirmation
- [ ] `order_prep_time_minutes INTEGER DEFAULT 15` - Estimated prep time
- [ ] `supports_delivery BOOLEAN DEFAULT FALSE` - Enable delivery option
- [ ] `delivery_radius_miles DECIMAL(4,1)` - Delivery coverage area

### Eventually
- [ ] `currency_code TEXT DEFAULT 'USD'` - Multi-currency support
- [ ] `time_zone TEXT DEFAULT 'America/Los_Angeles'` - Local time for reports
- [ ] `receipt_footer_text TEXT` - Custom receipt messages

---

## Consequences

### Positive

✅ **Single source of truth**: Tax rate stored once, used consistently
✅ **Type safety**: Database enforces DECIMAL type, prevents string/number confusion
✅ **Consistency**: OrdersService and PaymentService now use same value
✅ **Flexibility**: Each restaurant can have different tax rate (SF: 8.625%, Oakland: 9.25%)
✅ **Compliance**: Correct tax collection per jurisdiction
✅ **Auditability**: Changes tracked via updated_at timestamp
✅ **Performance**: Indexed column, fast lookups
✅ **Clear pattern**: Future developers know how to add configuration

### Negative

⚠️ **Migration required**: Must run database migration to add column
- **Mitigation**: DEFAULT value ensures all existing restaurants get 8.25%

⚠️ **Additional query**: Fetches tax rate from DB for each order
- **Mitigation**: Single SELECT, indexed query is fast (<1ms)
- **Future optimization**: Could cache in Redis if needed

⚠️ **Schema changes**: Adding new settings requires migrations
- **Mitigation**: This is actually positive - schema documents available settings
- **Mitigation**: Use JSONB only for truly dynamic data

---

## Migration Strategy

### For Existing Restaurants

```sql
-- Default all existing restaurants to 8.25% (California standard)
-- Migration handles this with: DEFAULT 0.0825

-- If some restaurants need different rates, update after migration:
UPDATE restaurants
SET tax_rate = 0.09
WHERE city = 'San Francisco'; -- SF has higher rate

UPDATE restaurants
SET tax_rate = 0.0725
WHERE state = 'Texas'; -- TX rate varies by locality
```

### For New Restaurants

UI should prompt for tax rate during restaurant creation:
```typescript
interface CreateRestaurantRequest {
  name: string;
  address: string;
  tax_rate: number; // Required field in UI
  // ... other fields
}
```

**Validation**:
```typescript
if (tax_rate < 0 || tax_rate > 0.25) {
  throw BadRequest('Tax rate must be between 0% and 25%');
}
```

---

## Related Documentation

- **Issue #119**: Fix hardcoded tax rates (STAB-003)
- **DATABASE.md**: Updated with `tax_rate` column documentation
- **ADR-002**: Multi-tenancy architecture (restaurant-scoped data)
- **SECURITY.md**: Updated with fail-fast policy (related ADR-009)

---

## Revision History

- **2025-10-19**: Initial ADR created
  - Establishes column-based pattern for per-restaurant configuration
  - Documents tax_rate as first example
  - Provides template for future settings
  - Resolves STAB-003 (three different hardcoded values)
