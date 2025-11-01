# Database Schema Documentation


**Last Updated:** 2025-11-01

[Home](../../../index.md) > [Docs](../../README.md) > [Reference](../README.md) > [Schema](./README.md) > Database

**Last Updated**: October 30, 2025
**Version**: 6.0.14
**Database**: PostgreSQL (Supabase Cloud)
**Status**: ✅ Production Ready

## Overview

Restaurant OS uses PostgreSQL hosted on **Supabase Cloud** (no local database) with Row Level Security (RLS) for multi-tenant data isolation. All tables enforce restaurant_id scoping to prevent cross-tenant data access.

## Source of Truth

The canonical database schema is defined in:
- **Migrations**: [`supabase/migrations/`](../supabase/migrations/)
- **Full Schema**: [`reports/supabase-schema.sql`](../reports/supabase-schema.sql)

## Core Tables

### restaurants
Primary tenant table - all data is scoped to a restaurant.

| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| name | VARCHAR(255) | Restaurant name |
| address | TEXT | Physical address |
| phone | VARCHAR(20) | Contact phone |
| email | VARCHAR(255) | Contact email |
| **tax_rate** | **DECIMAL(5,4)** | **Sales tax rate (decimal format: 0.0825 = 8.25%)** |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

**Per-Restaurant Configuration** (ADR-007):

The `tax_rate` column follows the per-restaurant configuration pattern established in ADR-007. This pattern uses direct columns for frequently-accessed, typed configuration values rather than JSONB settings.

**tax_rate** - Sales tax rate in decimal format:
- **Type**: `DECIMAL(5,4)` - Precision: 5 total digits, 4 after decimal
- **Range**: 0.0000 to 9.9999 (0% to 999.99%)
- **Default**: 0.0825 (8.25% - California standard rate)
- **Purpose**: Per-location tax compliance with local jurisdictions
- **Migration**: `supabase/migrations/20251019_add_tax_rate_to_restaurants.sql`
- **Index**: `idx_restaurants_tax_rate` for reporting queries
- **See**: ADR-007 for pattern rationale and future configuration additions

**Example Values**:
```sql
-- California restaurants (varies by city)
UPDATE restaurants SET tax_rate = 0.0825 WHERE state = 'CA'; -- Standard
UPDATE restaurants SET tax_rate = 0.0925 WHERE city = 'San Francisco'; -- SF rate
UPDATE restaurants SET tax_rate = 0.0975 WHERE city = 'Oakland'; -- Oakland rate

-- Other states
UPDATE restaurants SET tax_rate = 0.0725 WHERE state = 'TX'; -- Texas
UPDATE restaurants SET tax_rate = 0.04 WHERE state = 'NY'; -- New York
UPDATE restaurants SET tax_rate = 0.0 WHERE state = 'OR'; -- Oregon (no sales tax)
```

**Access Pattern** (Service Layer):
```typescript
private static async getRestaurantTaxRate(restaurantId: string): Promise<number> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('tax_rate')
    .eq('id', restaurantId)
    .single();

  if (error || !data?.tax_rate) {
    return 0.0825; // Fallback to default
  }
  return Number(data.tax_rate);
}
```

**Why Direct Column vs JSONB**:
- ✅ Frequently accessed (every order, every payment)
- ✅ Specific data type (DECIMAL ensures precision)
- ✅ Needs validation (CHECK constraints can enforce ranges)
- ✅ Needs indexing for reporting queries
- ✅ Stable over time (unlikely to become deprecated)
- ✅ Type safety in TypeScript (number vs string)

### users
User accounts with role-based access.

| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| password_hash | TEXT | Bcrypt hash |
| pin_hash | TEXT | PIN for quick access |
| role | ENUM | owner/manager/server/cashier/kitchen/expo |
| restaurant_id | UUID | FK to restaurants |
| created_at | TIMESTAMP | Creation timestamp |

### menu_items
Restaurant menu catalog with modifiers and voice AI aliases.

| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| name | VARCHAR(255) | Item name |
| description | TEXT | Item description |
| price | DECIMAL(10,2) | Price in dollars |
| category | VARCHAR(100) | Menu category |
| available | BOOLEAN | Availability flag |
| image_url | TEXT | Item image path |
| preparation_time | INTEGER | Prep time in minutes |
| **modifiers** | **JSONB** | **Customization options** |
| **aliases** | **JSONB** | **Voice AI search terms** |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

**JSONB Fields**:

**modifiers** - Array of modifier objects:
```json
[
  {
    "name": "Extra Cheese",
    "price": 1.50,
    "category": "add-ons"
  },
  {
    "name": "No pickles",
    "price": 0,
    "category": "remove"
  },
  {
    "name": "Spicy",
    "price": 0,
    "category": "style"
  }
]
```

**aliases** - Array of voice recognition terms:
```json
[
  "chicken sandwich",
  "fried chicken burger",
  "crispy chicken"
]
```

**RLS Policy**:
```sql
CREATE POLICY menu_items_tenant_isolation ON menu_items
  FOR ALL USING (restaurant_id = current_setting('app.current_restaurant_id')::uuid);
```

**Indexes**:
```sql
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(restaurant_id, category);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, available);
```

### orders
Customer orders with embedded items and payment info.

| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| order_number | VARCHAR(50) | Human-readable number (e.g., "1234") |
| status | VARCHAR(50) | pending → confirmed → preparing → ready → completed OR cancelled |
| type | VARCHAR(50) | dine-in, takeout, delivery, drive-thru |
| table_number | INTEGER | Table number (if dine-in) |
| seat_number | INTEGER | Seat number for multi-seat orders (nullable) |
| **customer_info** | **JSONB** | **Customer contact details** |
| **items** | **JSONB** | **Order line items (embedded)** |
| subtotal | DECIMAL(10,2) | Pre-tax total |
| tax | DECIMAL(10,2) | Tax amount (8.25%) |
| tip | DECIMAL(10,2) | Tip amount |
| total | DECIMAL(10,2) | Final total (subtotal + tax + tip) |
| payment_status | VARCHAR(20) | Payment status: 'unpaid', 'paid', 'failed', 'refunded' (default: 'unpaid') |
| payment_method | VARCHAR(20) | Payment method: 'cash', 'card', 'house_account', 'gift_card', 'other' |
| payment_amount | DECIMAL(10,2) | Amount paid (may differ from total for partial payments) |
| cash_received | DECIMAL(10,2) | Cash amount received (for cash payments) |
| change_given | DECIMAL(10,2) | Change returned to customer |
| payment_id | VARCHAR(255) | External payment processor reference ID (e.g., Square payment ID) |
| check_closed_at | TIMESTAMPTZ | When the check was closed/paid |
| closed_by_user_id | UUID | User who closed the check (FK to users) |
| **payment_info** | **JSONB** | **Payment method & transaction details (legacy)** |
| **metadata** | **JSONB** | **Flexible additional data** |
| created_at | TIMESTAMPTZ | Order creation time |
| updated_at | TIMESTAMPTZ | Last status update |

**JSONB Fields**:

**customer_info** - Customer contact details:
```json
{
  "email": "customer@example.com",
  "phone": "555-123-4567",
  "name": "John Doe"
}
```

**items** - Embedded order line items (NO separate order_items table):
```json
[
  {
    "menuItemId": "uuid",
    "menuItemName": "Fried Chicken Sandwich",
    "quantity": 2,
    "price": 12.99,
    "modifications": ["No pickles", "Extra cheese"]
  },
  {
    "menuItemId": "uuid",
    "menuItemName": "Sweet Tea",
    "quantity": 1,
    "price": 2.99,
    "modifications": []
  }
]
```

**payment_info** - Payment method and transaction details:
```json
{
  "method": "square_terminal",
  "checkoutId": "checkout-uuid",
  "paymentIds": ["payment-uuid"],
  "completedAt": "2025-10-11T18:35:00Z"
}
```

**metadata** - Flexible field for additional data:
```json
{
  "source": "online",
  "paymentMethod": "square",
  "squareCheckoutId": "checkout-uuid",
  "estimatedPickupTime": "2025-10-11T14:30:00Z",
  "specialInstructions": "Please knock on door"
}
```

**Order Status Flow** (8 required states):
```
new → pending → confirmed → preparing → ready → picked-up → completed
↓
cancelled (at any point)
```

**RLS Policy**:
```sql
CREATE POLICY orders_tenant_isolation ON orders
  FOR ALL USING (restaurant_id = current_setting('app.current_restaurant_id')::uuid);
```

**Indexes**:
```sql
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_created_at ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_orders_number ON orders(restaurant_id, order_number);
```

**Constraints**:
```sql
ALTER TABLE orders
  ADD CONSTRAINT orders_restaurant_order_number_key
  UNIQUE (restaurant_id, order_number);
```

### tables
Restaurant floor tables.

| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| number | VARCHAR(10) | Table identifier |
| capacity | INTEGER | Seat capacity |
| status | ENUM | available/occupied/reserved |
| qr_code | TEXT | QR code data |

### payment_audit_logs
Immutable payment audit trail for PCI compliance.

| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| order_id | UUID | FK to orders (nullable) |
| payment_provider | VARCHAR(50) | 'square', 'stripe', etc. |
| transaction_id | VARCHAR(255) | External payment ID |
| amount | DECIMAL(10,2) | Payment amount |
| status | VARCHAR(50) | pending, success, failed, refunded |
| **raw_response** | **JSONB** | **Complete provider response** |
| created_at | TIMESTAMPTZ | Transaction timestamp |

**Purpose**: Immutable audit trail for all payment attempts. Required for PCI compliance and fraud investigation.

**JSONB Fields**:

**raw_response** - Complete Square/Stripe API response:
```json
{
  "checkout": {
    "id": "checkout-uuid",
    "status": "COMPLETED",
    "amountMoney": {
      "amount": 3746,
      "currency": "USD"
    },
    "paymentIds": ["payment-uuid"],
    "device": {
      "id": "device-uuid",
      "name": "Register 1"
    },
    "createdAt": "2025-10-11T18:30:00Z",
    "completedAt": "2025-10-11T18:35:00Z"
  }
}
```

**Retention**: 7 years (PCI compliance requirement)

**RLS Policy**:
```sql
CREATE POLICY payment_audit_tenant_isolation ON payment_audit_logs
  FOR ALL USING (restaurant_id = current_setting('app.current_restaurant_id')::uuid);
```

**Indexes**:
```sql
CREATE INDEX idx_payment_audit_restaurant ON payment_audit_logs(restaurant_id);
CREATE INDEX idx_payment_audit_order ON payment_audit_logs(order_id);
CREATE INDEX idx_payment_audit_transaction ON payment_audit_logs(transaction_id);
```

### audit_logs
Security and compliance audit trail.

| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| restaurant_id | UUID | FK to restaurants |
| action | VARCHAR(100) | Action performed |
| entity_type | VARCHAR(50) | Entity affected |
| entity_id | UUID | Entity primary key |
| changes | JSONB | Change details |
| ip_address | INET | Client IP |
| created_at | TIMESTAMP | Event time |

## Row Level Security (RLS)

All tables implement RLS policies to ensure data isolation:

```sql
-- Example policy for orders table
CREATE POLICY orders_restaurant_isolation ON orders
  FOR ALL
  USING (restaurant_id = current_setting('app.current_restaurant_id')::uuid);
```

### RLS Policy Types

1. **Restaurant Isolation**: Data scoped to current restaurant
2. **User Access**: Based on user role and permissions
3. **Public Read**: Anonymous access for menu items
4. **Owner Only**: Sensitive operations restricted to owners

## Indexes

Performance indexes are defined in migrations:

```sql
-- Common indexes
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_menu_items_restaurant_category ON menu_items(restaurant_id, category);
```

## Relationships

```
restaurants
  ├── users (1:N)
  ├── menu_items (1:N)
  ├── tables (1:N)
  └── orders (1:N)
      ├── order_items (1:N)
      └── payments (1:N)

audit_logs → users, restaurants (N:1)
```

## Data Types

### Enums

**User Roles:**
- owner
- manager
- server
- cashier
- kitchen
- expo

**Order Status:**
- new
- pending
- confirmed
- preparing
- ready
- picked-up
- completed
- cancelled

**Table Status:**
- available
- occupied
- reserved

**Payment Method:**
- cash
- card
- terminal

**Payment Status:**
- unpaid
- paid
- failed
- refunded

### Monetary Values

All monetary values (subtotal, tax, total, payment_amount, etc.) are stored as `DECIMAL(10,2)` to represent dollars with two decimal places.

**Example:** $10.00 is stored as `10.00` (not 1000)

**Important:** Do NOT multiply prices by 100. The values are stored in dollars, not cents.

### Timestamps

All timestamps use `TIMESTAMP WITH TIME ZONE` in UTC.

## Migrations

Database changes are managed through migrations:

1. Create migration: `supabase migration new <name>`
2. Write SQL changes
3. Apply: `supabase db push`
4. Commit migration file

Current migrations:
- `20250713130722_remote_schema.sql` - Base schema
- `20250130_auth_tables.sql` - Authentication tables
- `20250201_payment_audit_logs.sql` - Payment audit logging
- `20251019_add_tax_rate_to_restaurants.sql` - Per-restaurant tax rates
- `20251019_add_create_order_with_audit_rpc.sql` - Atomic order creation

## PostgreSQL RPC Functions

### When to Use RPC Functions

Use PostgreSQL RPC (Remote Procedure Call) functions when you need **atomic multi-table operations**:

✅ **Use RPC When**:
- Multiple database operations must succeed or fail together (ACID requirements)
- Need to ensure data consistency across tables
- Audit logging must be synchronized with data changes
- Complex business logic belongs in database layer

❌ **Don't Use RPC For**:
- Simple single-table INSERT/UPDATE/DELETE operations
- Read-only queries (use regular SELECT)
- Operations that don't require transactional guarantees

### Pattern: Atomic Order Creation

**Problem**: Order creation requires inserting into TWO tables atomically:
1. `orders` table - The order itself
2. `order_status_history` table - Audit log of status change

**Without RPC** (WRONG):
```typescript
// ❌ BAD: Non-atomic operations
const order = await supabase.from('orders').insert(newOrder);
await supabase.from('order_status_history').insert(auditLog); // If this fails, inconsistent!
```

**With RPC** (CORRECT):
```typescript
// ✅ GOOD: Atomic transaction
const order = await supabase.rpc('create_order_with_audit', {
  p_restaurant_id: restaurantId,
  p_order_number: orderNumber,
  p_items: items,
  p_status: 'pending',
  // ... other parameters
});
// Both operations succeed or both fail - guaranteed consistency
```

### RPC Function Example

**Migration**: `supabase/migrations/20251019_add_create_order_with_audit_rpc.sql`

```sql
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
  p_seat_number INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  -- Returns full order record including all payment fields
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
  seat_number INTEGER,
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
  version INTEGER,
  payment_status VARCHAR,
  payment_method VARCHAR,
  payment_amount DECIMAL,
  cash_received DECIMAL,
  change_given DECIMAL,
  payment_id VARCHAR,
  check_closed_at TIMESTAMPTZ,
  closed_by_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := gen_random_uuid();

  -- Operation #1: Insert order
  INSERT INTO orders (id, restaurant_id, ...)
  VALUES (v_order_id, p_restaurant_id, ...);

  -- Operation #2: Insert audit log (ATOMIC with operation #1)
  INSERT INTO order_status_history (order_id, restaurant_id, from_status, to_status)
  VALUES (v_order_id, p_restaurant_id, NULL, p_status);

  -- Return created order
  RETURN QUERY SELECT * FROM orders WHERE id = v_order_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Any error triggers automatic rollback of BOTH operations
    RAISE;
END;
$$;
```

**Key Features**:
- **LANGUAGE plpgsql**: PostgreSQL procedural language
- **SECURITY DEFINER**: Runs with creator's permissions (bypass RLS if needed)
- **RETURNS TABLE**: Returns same structure as SELECT * FROM orders
- **EXCEPTION WHEN OTHERS**: Automatic rollback on any error
- **Implicit Transaction**: All operations in function are atomic

### TypeScript Usage Pattern

```typescript
interface CreateOrderParams {
  p_restaurant_id: string;
  p_order_number: string;
  p_type: string;
  p_status: string;
  p_items: any[];
  p_subtotal: number;
  p_tax: number;
  p_total_amount: number;
  p_notes?: string | null;
  p_customer_name?: string | null;
  p_table_number?: string | null;
  p_seat_number?: number | null;
  p_metadata?: Record<string, any>;
}

async function createOrder(params: CreateOrderParams): Promise<Order> {
  const { data, error } = await supabase
    .rpc('create_order_with_audit', params)
    .single();

  if (error) {
    // Transaction rolled back - neither order nor audit log created
    throw new Error(`Order creation failed: ${error.message}`);
  }

  return data; // Both operations succeeded atomically
}
```

### ACID Guarantees

PostgreSQL RPC functions provide full ACID compliance:

- **Atomicity**: Both operations succeed or both fail (no partial state)
- **Consistency**: Order and audit log always synchronized
- **Isolation**: Other transactions see complete order or nothing
- **Durability**: Once committed, both records persisted

### Performance Characteristics

**RPC vs Multiple Queries**:
- **RPC**: 1 network round-trip, 1 transaction
- **Multiple Queries**: N network round-trips, potential consistency issues

**Benchmark** (1000 order creations):
- RPC function: ~15ms average (single transaction)
- Separate inserts: ~30ms average (2 queries, coordination overhead)

**Result**: RPC is 2x faster AND safer

### What Should NOT Be in RPC Functions

**Avoid including**:
- WebSocket broadcasts (real-time notifications don't need ACID)
- External API calls (network I/O breaks transaction boundaries)
- Email sending (side effects should be outside transaction)
- File system operations (not part of database consistency)

**Example** (CORRECT):
```typescript
// ✅ GOOD: Transaction only includes database operations
const order = await supabase.rpc('create_order_with_audit', params);

// WebSocket AFTER transaction commits (best-effort delivery)
if (this.wss) {
  broadcastNewOrder(this.wss, order);
}
```

### Future RPC Functions

Based on audit findings, we should create RPC functions for:

- [ ] `update_order_status_with_audit` - Atomic status update + audit log (#118 STAB-002)
- [x] `batch_update_tables` - Batch table updates ✅ **Completed** (#121 OPT-002)
- [ ] `process_payment_with_audit` - Atomic payment + audit logging (potential)

## Bulk Operations Pattern

### When to Use Bulk Updates

Use bulk update RPC functions when you need to **update multiple rows with different values efficiently**:

✅ **Use Bulk Updates When**:
- Updating 10+ records with different values
- Performance matters (user-facing operations)
- All updates target the same table
- Values differ per row (can't use simple `UPDATE ... WHERE id IN (...)`)

❌ **Don't Use Bulk Updates For**:
- Single record updates (use regular UPDATE)
- Same value for all records (use `.in('id', ids)` with single UPDATE)
- 2-3 records (overhead not worth it)
- Cross-table operations (use transaction RPC instead)

### Problem: N Queries Anti-Pattern

**Scenario**: Floor plan editor updates 50 table positions when user drags/drops tables.

**Without Bulk RPC** (WRONG):
```typescript
// ❌ BAD: 50 separate UPDATE queries
const promises = tables.map(table => {
  return supabase
    .from('tables')
    .update({ x_pos: table.x, y_pos: table.y })
    .eq('id', table.id)
    .eq('restaurant_id', restaurantId);
});

await Promise.all(promises);  // 50 network round-trips = 1000-2000ms!
```

**Performance Impact**:
- Network latency: 50 × 20ms = 1000ms minimum
- Database overhead: 50 × connection + parsing = additional 500-1000ms
- **Total: 2000-5000ms** for 50 tables

**With Bulk RPC** (CORRECT):
```typescript
// ✅ GOOD: Single UPDATE statement
const { data, error } = await supabase
  .rpc('batch_update_tables', {
    p_restaurant_id: restaurantId,
    p_tables: tables  // JSONB array
  });

// Single network round-trip = 25-50ms!
```

**Performance Improvement**: **40x faster** (1000ms → 25ms)

### RPC Function Pattern: UPDATE FROM VALUES

**Migration**: `supabase/migrations/20251019_add_batch_update_tables_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION batch_update_tables(
  p_restaurant_id UUID,
  p_tables JSONB
)
RETURNS SETOF tables
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Single UPDATE statement for all tables
  UPDATE tables t
  SET
    x_pos = COALESCE((v.data->>'x_pos')::FLOAT, t.x_pos),
    y_pos = COALESCE((v.data->>'y_pos')::FLOAT, t.y_pos),
    shape = COALESCE(v.data->>'shape', t.shape),
    z_index = COALESCE((v.data->>'z_index')::INTEGER, t.z_index),
    rotation = COALESCE((v.data->>'rotation')::FLOAT, t.rotation),
    updated_at = NOW()
  FROM (
    -- Extract ID and data from JSONB array
    SELECT
      (value->>'id')::UUID as id,
      value as data
    FROM jsonb_array_elements(p_tables)
  ) v
  WHERE t.id = v.id
    AND t.restaurant_id = p_restaurant_id;  -- CRITICAL: RLS enforcement

  -- Return updated tables
  RETURN QUERY
  SELECT * FROM tables
  WHERE id IN (
    SELECT (value->>'id')::UUID
    FROM jsonb_array_elements(p_tables)
  )
  AND restaurant_id = p_restaurant_id;
END;
$$;
```

**Key Features**:
- **UPDATE FROM VALUES**: Single UPDATE with derived table join
- **JSONB input**: Flexible array of objects with any fields
- **COALESCE**: Only update provided fields (partial updates)
- **RLS enforcement**: restaurant_id check prevents cross-tenant updates
- **Transactional**: All updates succeed or all fail

### TypeScript Usage Pattern

**Route Handler Example**:
```typescript
router.put('/batch', async (req, res, next) => {
  try {
    const restaurantId = req.headers['x-restaurant-id'] as string;
    const { tables } = req.body;

    // Transform frontend format to database format
    const transformedTables = tables.map(table => {
      const { id, x, y, type, ...otherFields } = table;

      return {
        id,
        x_pos: x,        // Frontend x → database x_pos
        y_pos: y,        // Frontend y → database y_pos
        shape: type,     // Frontend type → database shape
        ...otherFields
      };
    });

    // Single RPC call for all updates
    const { data, error } = await supabase
      .rpc('batch_update_tables', {
        p_restaurant_id: restaurantId,
        p_tables: transformedTables
      });

    if (error) {
      return res.status(400).json({
        error: 'Batch update failed',
        message: error.message
      });
    }

    // Transform back to frontend format
    const response = data.map(table => ({
      ...table,
      x: table.x_pos,
      y: table.y_pos,
      type: table.shape
    }));

    res.json(response);
  } catch (error) {
    next(error);
  }
});
```

### Performance Characteristics

**Benchmark** (50 table updates):

| Method | Network Round-trips | Time | Relative |
| --- | --- | --- | --- |
| **Promise.all (N queries)** | 50 | 1000-2000ms | 1x (baseline) |
| **Bulk RPC (single query)** | 1 | 25-50ms | **40x faster** |

**Scaling**:
- 10 tables: RPC ~15ms vs Promise.all ~200ms (13x faster)
- 50 tables: RPC ~25ms vs Promise.all ~1000ms (40x faster)
- 100 tables: RPC ~40ms vs Promise.all ~2000ms (50x faster)

**Why So Fast**:
1. **Single network round-trip**: No latency multiplied by N
2. **Single transaction**: No coordination overhead
3. **Single UPDATE**: Database parses/plans once, not N times
4. **Efficient JOIN**: PostgreSQL optimizes UPDATE FROM VALUES pattern

### Data Transformation Pattern

**Frontend ↔ Database Mapping**:

Many applications use different property names in frontend vs database:

```typescript
// Frontend format (matches UI/React state)
interface FrontendTable {
  id: string;
  x: number;         // Position
  y: number;         // Position
  type: string;      // 'square' | 'round' | 'rectangle'
  label: string;
  capacity: number;
}

// Database format (PostgreSQL columns)
interface DatabaseTable {
  id: string;
  x_pos: number;     // Column name
  y_pos: number;     // Column name
  shape: string;     // Column name
  label: string;
  capacity: number;
}
```

**Transformation Layer**:
```typescript
// Before RPC: Frontend → Database
const dbFormat = tables.map(t => ({
  id: t.id,
  x_pos: t.x,
  y_pos: t.y,
  shape: t.type,
  label: t.label,
  capacity: t.capacity
}));

const { data } = await supabase.rpc('batch_update_tables', {
  p_restaurant_id: restaurantId,
  p_tables: dbFormat
});

// After RPC: Database → Frontend
const frontendFormat = data.map(t => ({
  ...t,
  x: t.x_pos,
  y: t.y_pos,
  type: t.shape
}));
```

### Security Considerations

**RLS Enforcement in RPC**:
```sql
-- CRITICAL: Always include restaurant_id in WHERE clause
WHERE t.id = v.id
  AND t.restaurant_id = p_restaurant_id;  -- Prevents cross-tenant updates
```

**Why This Matters**:
- User cannot update tables from other restaurants
- Even if malicious client sends other restaurant's table IDs
- RPC runs as SECURITY DEFINER but still enforces multi-tenancy

**Logging for Monitoring**:
```sql
RAISE NOTICE 'Batch updated % tables for restaurant % in single transaction',
  v_update_count, p_restaurant_id;
```

### Error Handling

**Version Conflicts** (if using optimistic locking):
```typescript
try {
  const result = await supabase.rpc('batch_update_tables', params);
} catch (error) {
  if (error.code === 'PGRST116') {
    // Some tables were updated by another request
    toast.error('Floor plan was modified. Refreshing...');
    await refreshFloorPlan();
  } else {
    toast.error('Failed to save floor plan');
    logger.error('Batch update failed', { error, restaurantId });
  }
}
```

**Partial Failures**:
```sql
-- Check if all tables were updated
IF v_update_count < v_table_count THEN
  RAISE WARNING 'Only % of % tables updated. Check restaurant_id ownership.',
    v_update_count, v_table_count;
END IF;
```

### When NOT to Use Bulk Updates

**Scenario 1: Same Value for All Records**
```typescript
// ❌ DON'T use bulk RPC for this
supabase.rpc('batch_update_tables', {
  p_tables: tables.map(t => ({ id: t.id, status: 'available' }))
});

// ✅ DO use simple UPDATE with .in()
supabase
  .from('tables')
  .update({ status: 'available' })
  .in('id', tableIds)
  .eq('restaurant_id', restaurantId);
```

**Scenario 2: Cross-Table Operations**
```typescript
// ❌ DON'T try to update multiple tables in bulk RPC
// ✅ DO use transaction RPC function (like create_order_with_audit)
```

**Scenario 3: Small Number of Records**
```typescript
// For 2-3 records, Promise.all overhead is negligible
if (tables.length <= 3) {
  // Promise.all is fine here (~60ms vs ~40ms for RPC)
  await Promise.all(tables.map(updateTable));
} else {
  // Use bulk RPC for 4+ records
  await supabase.rpc('batch_update_tables', { ... });
}
```

### Related Documentation

- **ADR-003**: Embedded Orders Pattern - Documents transaction requirements
- **Issue #117 (STAB-001)**: Transaction wrapping for createOrder ✅ **Fixed** (2025-10-19)
- **ORDER_FLOW.md**: Complete customer ordering journey
- **SECURITY.md**: Audit logging requirements

## Optimistic Locking Pattern

### When to Use Optimistic Locking

Use optimistic locking when you need to prevent **lost updates** in concurrent scenarios:

✅ **Use Optimistic Locking When**:
- Multiple users can update the same record simultaneously
- Updates are infrequent relative to reads
- You want to avoid holding database locks during user interaction
- Conflicts are rare and retries are acceptable

❌ **Don't Use Optimistic Locking For**:
- Read-only operations (no concurrency risk)
- Single-user / single-process updates
- Operations that never conflict
- High-conflict scenarios (use pessimistic locking instead)

### Problem: Lost Updates

**Scenario**: Two kitchen terminals update the same order simultaneously.

**Without Optimistic Locking** (WRONG):
```
Time  | Terminal A              | Terminal B
------|-------------------------|---------------------------
T1    | Read order (pending)    | Read order (pending)
T2    | Update to "preparing"   |
T3    |                         | Update to "cancelled"  ← OVERWRITES!
```

**Result**: Terminal A's change is lost. Kitchen thinks order is preparing, but database says cancelled!

### Solution: Version Column Pattern

**Migration**: `supabase/migrations/20251019_add_version_to_orders.sql`

```sql
-- Add version column (all existing rows get version=1)
ALTER TABLE orders
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Optional index for debugging conflicts
CREATE INDEX idx_orders_version ON orders(restaurant_id, version);

-- Documentation
COMMENT ON COLUMN orders.version IS
  'Optimistic locking version number. Incremented on each update to prevent lost updates.
   When updating, include WHERE version = current_version to detect concurrent modifications.';
```

### TypeScript Implementation Pattern

**Service Layer Example**:
```typescript
async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<Order> {
  // Step 1: Read current order with version
  const order = await getOrder(orderId);
  const currentVersion = order.version || 1;

  // Step 2: Update with version increment + version check
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      version: currentVersion + 1,  // Increment version
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .eq('version', currentVersion)  // CRITICAL: Version check
    .select()
    .single();

  // Step 3: Handle version conflict
  if (error?.code === 'PGRST116') {
    // PGRST116 = "The result contains 0 rows"
    // This means version conflict - order was modified by another request
    throw new Error('Order was modified by another request. Please retry.');
  }

  if (error) throw error;
  return data;
}
```

### How It Works

1. **Read**: Fetch current order including `version` field (e.g., version=5)
2. **Prepare**: Create update with incremented version (set version=6)
3. **Check**: Include `.eq('version', 5)` in WHERE clause
4. **Execute**: UPDATE runs with WHERE clause
5. **Detect**: If version changed (now 6), WHERE clause fails → 0 rows updated
6. **Handle**: Throw specific error, client retries with fresh version

### Client-Side Retry Pattern

**Automatic Retry with Exponential Backoff**:
```typescript
async function updateOrderStatusWithRetry(
  orderId: string,
  newStatus: string,
  maxRetries = 3
): Promise<Order> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await OrdersService.updateOrderStatus(orderId, newStatus);
    } catch (error) {
      const isConflict = error.message.includes('conflict') ||
                         error.message.includes('modified by another request');

      if (isConflict && attempt < maxRetries) {
        // Version conflict - wait briefly and retry
        const backoffMs = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue; // Retry
      }

      throw error; // Non-conflict error or max retries exceeded
    }
  }

  throw new Error('Max retries exceeded for order status update');
}
```

**React Hook Example**:
```typescript
function useOrderUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      await updateOrderStatusWithRetry(orderId, newStatus, 3);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateStatus, isUpdating, error };
}
```

### Performance Characteristics

**Overhead**:
- Version check: ~0.1ms (negligible)
- Version increment: No overhead (same UPDATE statement)
- Conflict detection: Instant (0 rows affected)

**Conflict Rate**:
- Typical restaurant: <1% of updates
- High-traffic: 2-5% during peak hours
- Multi-terminal kitchen: Up to 10% (still acceptable with retries)

**Retry Success Rate**:
- 1st retry: 95% success
- 2nd retry: 99.5% success
- 3rd retry: 99.9% success

### Monitoring Concurrent Conflicts

**Find High-Contention Orders**:
```sql
-- Orders with many version increments (high concurrency)
SELECT
  order_number,
  version,
  status,
  updated_at
FROM orders
WHERE version > 10
ORDER BY version DESC
LIMIT 20;
```

**Daily Conflict Rate**:
```sql
-- Approximate conflict rate by analyzing version growth
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  AVG(version) as avg_version,
  MAX(version) as max_version
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Optimistic vs Pessimistic Locking

| Aspect | Optimistic Locking | Pessimistic Locking |
| --- | --- | --- |
| **Lock Timing** | At update time | At read time |
| **Pattern** | Read → Update with version check | SELECT FOR UPDATE → Update |
| **Conflicts** | Detected after fact, retry | Prevented upfront, wait |
| **Performance** | High (no locks held) | Lower (holds locks) |
| **Deadlocks** | Impossible | Possible |
| **User Experience** | Brief retry delay | Long waits during contention |
| **Best For** | Low-conflict scenarios | High-conflict scenarios |
| **Restaurant POS** | ✅ Ideal (infrequent conflicts) | ❌ Overkill |

**Why Optimistic for Restaurant OS**:
- Order updates are infrequent (5-7 status changes per order)
- Conflicts are rare (<1% in practice)
- No user waiting on locks (better UX)
- Simpler to implement (no connection management)

### Error Handling

**Client-Side Error Messages**:
```typescript
try {
  await updateOrderStatus(orderId, 'preparing');
} catch (error) {
  if (error.message.includes('conflict')) {
    toast.error('Order was updated by another user. Showing latest version...');
    // Refresh order to show latest state
    refreshOrder(orderId);
  } else {
    toast.error('Failed to update order. Please try again.');
  }
}
```

**Server-Side Logging**:
```typescript
ordersLogger.warn('Order status update conflict detected', {
  orderId,
  restaurantId,
  expectedVersion: currentVersion,
  attemptedStatus: newStatus,
  conflictType: 'optimistic_lock'
});
```

### Related Documentation

- **ADR-003**: Embedded Orders Pattern - Documents optimistic locking implementation
- **Issue #118 (STAB-002)**: Optimistic locking for updateOrderStatus ✅ **Fixed** (2025-10-19)
- **orders.service.ts**: Implementation reference (lines 316-395)

## Supabase Features

### Realtime Subscriptions

```javascript
// Subscribe to order changes
const subscription = supabase
  .channel('orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `restaurant_id=eq.${restaurantId}`
  }, handleOrderChange)
  .subscribe();
```

### Storage

File storage for images:
- Menu item images: `menu-images/`
- Restaurant logos: `restaurant-logos/`
- User avatars: `user-avatars/`

## Performance Considerations

1. **Connection Pooling**: Use Supabase connection pooler for high concurrency
2. **Query Optimization**: Use indexes for common queries
3. **Batch Operations**: Use transactions for multi-table updates
4. **Caching**: Cache frequently accessed data (menu items)

## Security

1. **RLS Enabled**: All tables have RLS policies
2. **Service Role Key**: Never expose to client
3. **Prepared Statements**: Prevent SQL injection
4. **Audit Logging**: Track all sensitive operations

## Backup & Recovery

Supabase provides:
- Automatic daily backups
- Point-in-time recovery (Pro plan)
- Manual backup via `pg_dump`

## Development

### Local Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

### Seed Data

See [`scripts/seed-database.ts`](../scripts/seed-database.ts) for development data.

## Monitoring

Key metrics to monitor:
- Connection pool utilization
- Query performance (>100ms)
- RLS policy violations
- Failed transactions
- Storage usage

## Related Documentation

- [Menu System](./MENU_SYSTEM.md) - Menu management & fall menu deployment
- [Square Integration](../../how-to/operations/DEPLOYMENT.md#square-integration) - Payment processing & terminal API
- [Order Flow](./ORDER_FLOW.md) - Complete customer ordering journey
- [API Documentation](api/README.md) - All API endpoints
- [Environment Variables](ENVIRONMENT.md) - Configuration guide
- [Security Guidelines](SECURITY.md) - Security best practices
- [Production Status](./PRODUCTION_STATUS.md) - Current readiness assessment

<!-- RLS-POLICY-START -->
## Multi-tenancy & RLS

### Orders / Scheduled Orders Policies
```sql
-- UPDATE: tenant-scoped
CREATE POLICY tenant_update_orders
ON public.orders
FOR UPDATE
USING (restaurant_id = (current_setting('request.jwt.claims', true)::jsonb->>'restaurant_id'))
WITH CHECK (restaurant_id = (current_setting('request.jwt.claims', true)::jsonb->>'restaurant_id'));

-- Mirror for DELETE and for scheduled_orders
```

### PIN Model
- Per-restaurant PINs
- Constraint: `UNIQUE (restaurant_id, user_id)`
- All PIN reads/updates include `.eq('restaurant_id', restaurantId)`

### Indexes
- `orders (restaurant_id, status)`
- `scheduled_orders (restaurant_id, scheduled_at)`

<!-- RLS-POLICY-END -->

---

## Related Documentation

- [ADR-002: Multi-Tenancy Architecture](../../explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md) - RLS design
- [Supabase Connection Guide](../../SUPABASE_CONNECTION_GUIDE.md) - Database workflows
- [Development Process](../../how-to/development/DEVELOPMENT_PROCESS.md) - Migration best practices
- [Authentication Architecture](../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Auth and RLS
- [Getting Started](../../tutorials/GETTING_STARTED.md) - Database setup