# Database Schema Documentation

**Last Updated**: 2025-09-26
**Version**: See [VERSION.md](VERSION.md)
**Database**: PostgreSQL (Supabase)

## Overview

Restaurant OS uses PostgreSQL hosted on Supabase with Row Level Security (RLS) for multi-tenant data isolation.

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
Restaurant menu catalog.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| name | VARCHAR(255) | Item name |
| description | TEXT | Item description |
| price | INTEGER | Price in cents |
| category | VARCHAR(100) | Menu category |
| available | BOOLEAN | Availability flag |
| image_url | TEXT | Item image |
| created_at | TIMESTAMP | Creation timestamp |

### orders
Customer orders with status tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| restaurant_id | UUID | FK to restaurants |
| table_id | UUID | FK to tables |
| status | ENUM | pending/preparing/ready/delivered/completed/cancelled |
| total | INTEGER | Total in cents |
| created_at | TIMESTAMP | Order time |
| updated_at | TIMESTAMP | Last update |

### order_items
Line items within orders.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | FK to orders |
| menu_item_id | UUID | FK to menu_items |
| quantity | INTEGER | Item quantity |
| price | INTEGER | Price at order time |
| modifiers | JSONB | Custom modifications |

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

### payments
Payment transaction records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | FK to orders |
| amount | INTEGER | Amount in cents |
| method | ENUM | cash/card/terminal |
| status | ENUM | pending/completed/failed/refunded |
| processor_id | VARCHAR(255) | External payment ID |
| created_at | TIMESTAMP | Transaction time |

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

- [API Documentation](api/README.md)
- [Environment Variables](ENVIRONMENT.md)
- [Security Guidelines](SECURITY.md)