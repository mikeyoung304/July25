# Database Migration Guide

## Overview

This guide covers database migration procedures for the Rebuild 6.0 project using Supabase.

## Migration Tools

- **Supabase CLI**: Used for generating and applying migrations
- **Direct SQL**: For complex migrations via Supabase dashboard

## Creating Migrations

### 1. Generate Migration from Schema Changes

```bash
# After making changes in Supabase dashboard
supabase db diff -f migration_name

# This creates: supabase/migrations/[timestamp]_migration_name.sql
```

### 2. Manual Migration Creation

```bash
# Create empty migration file
supabase migration new migration_name

# Edit the generated file in supabase/migrations/
```

## Applying Migrations

### Development

```bash
# Apply all pending migrations
supabase db push

# Reset database and reapply all migrations
supabase db reset
```

### Production

```bash
# Generate migration link
supabase migration list --project-ref your-project-ref

# Apply via Supabase dashboard or CLI
supabase db push --project-ref your-project-ref
```

## Migration Best Practices

1. **Always test locally first**
   ```bash
   supabase db reset
   npm run dev
   # Verify application works
   ```

2. **Include rollback statements**
   ```sql
   -- Up Migration
   ALTER TABLE orders ADD COLUMN new_field TEXT;
   
   -- Down Migration (in comments)
   -- ALTER TABLE orders DROP COLUMN new_field;
   ```

3. **Handle data migrations carefully**
   - Backup data before destructive changes
   - Use transactions for data consistency
   - Test with production-like data volumes

## Common Migration Scenarios

### Adding a Column
```sql
ALTER TABLE table_name 
ADD COLUMN column_name data_type DEFAULT default_value;
```

### Creating an Index
```sql
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

### Adding RLS Policy
```sql
CREATE POLICY "Users can view own orders" ON orders
FOR SELECT USING (auth.uid() = user_id);
```

## Troubleshooting

### Migration Failed
1. Check migration syntax
2. Verify dependencies exist
3. Check for conflicting changes
4. Review Supabase logs

### Out of Sync
```bash
# Pull remote schema
supabase db pull

# Generate diff
supabase db diff

# Resolve conflicts manually
```

## Related Documentation
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup