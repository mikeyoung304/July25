# Database Schema Documentation

**Last Updated**: October 11, 2025
**Version**: 6.0.7
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
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Restaurant name |
| address | TEXT | Physical address |
| phone | VARCHAR(20) | Contact phone |
| email | VARCHAR(255) | Contact email |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

### users
User accounts with role-based access.

| Column | Type | Description |
|--------|------|-------------|
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
|--------|------|-------------|
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
|--------|------|-------------|
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| order_number | VARCHAR(50) | Human-readable number (e.g., "1234") |
| status | VARCHAR(50) | pending → confirmed → preparing → ready → completed OR cancelled |
| type | VARCHAR(50) | dine-in, takeout, delivery, drive-thru |
| table_number | INTEGER | Table number (if dine-in) |
| **customer_info** | **JSONB** | **Customer contact details** |
| **items** | **JSONB** | **Order line items (embedded)** |
| subtotal | DECIMAL(10,2) | Pre-tax total |
| tax | DECIMAL(10,2) | Tax amount (8.25%) |
| tip | DECIMAL(10,2) | Tip amount |
| total | DECIMAL(10,2) | Final total (subtotal + tax + tip) |
| **payment_info** | **JSONB** | **Payment method & transaction details** |
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

**Order Status Flow** (7 required states):
```
pending → confirmed → preparing → ready → served → completed
↓
cancelled
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
|--------|------|-------------|
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| number | VARCHAR(10) | Table identifier |
| capacity | INTEGER | Seat capacity |
| status | ENUM | available/occupied/reserved |
| qr_code | TEXT | QR code data |

### payment_audit_logs
Immutable payment audit trail for PCI compliance.

| Column | Type | Description |
|--------|------|-------------|
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
|--------|------|-------------|
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
- pending
- preparing
- ready
- delivered
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
- pending
- completed
- failed
- refunded

### Monetary Values

All monetary values are stored as **integers in cents** to avoid floating-point precision issues.
- $10.00 = 1000
- $0.99 = 99

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
- [Square Integration](./SQUARE_INTEGRATION.md) - Payment processing & terminal API
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