# Database Migrations Guide

## Overview

Restaurant OS uses Supabase for database management with custom migration scripts to handle schema changes and data seeding. This guide explains how to run migrations and troubleshoot common issues.

## Migration Scripts

### Core Commands

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status and database connection
npm run db:check

# Seed menu data
npm run seed:menu

# Seed table data
npm run seed:tables

# Check database integration
npm run check:integration
```

### Available Migration Scripts

Located in `/server/scripts/`:

1. **run-migrations.js** - Main migration runner
   - Reads SQL files from `/server/supabase/migrations/`
   - Applies them in alphabetical order
   - Tracks migration status

2. **migrate.ts** - TypeScript migration utilities
   - Helper functions for database operations
   - Schema validation

3. **seed-menu.ts** - Menu data seeding
   - Populates menu_categories and menu_items tables
   - Updates AI context for voice ordering

4. **seed-tables-simple.ts** - Table management setup
   - Creates restaurant table layouts
   - Sets up table status tracking

5. **integration-check.ts** - Database validation
   - Verifies table structure
   - Tests database connections
   - Validates RLS policies

## Migration Workflow

### 1. Running Migrations

```bash
cd server
npm run db:migrate
```

**What happens:**
- Script reads `/server/supabase/migrations/*.sql` files
- Executes each migration in order
- Logs success/failure for each migration
- Updates migration tracking table

### 2. Checking Status

```bash
npm run db:check
```

**Output includes:**
- Database connection status
- Applied migrations list
- Pending migrations
- Table structure validation

### 3. Seeding Data

**Menu data:**
```bash
npm run seed:menu
```
- Populates menu categories and items
- Updates OpenAI context for voice ordering
- Creates demo restaurant data

**Table data:**
```bash
npm run seed:tables
```
- Creates table layouts
- Sets up table numbering
- Initializes table status tracking

## Migration File Structure

### SQL Migration Files
Location: `/server/supabase/migrations/`

File naming convention:
```
YYYYMMDD_HHMMSS_description.sql
```

Example:
```
20250106_143000_add_auth_tables.sql
20250106_150000_add_performance_indexes.sql
```

### Performance Migrations
Special migration files for production optimization:

- `add-performance-indexes.sql` - Database indexing
- `database-optimization.sql` - Query optimization
- `discover-schema-and-index.sql` - Schema analysis

## Environment Requirements

### Required Environment Variables

```env
# Database Connection
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key

# Optional - for direct PostgreSQL access
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### Environment Files
- Root `.env` file contains all configuration
- Scripts automatically load from `../env` relative path

## Troubleshooting

### Common Issues

#### 1. Connection Errors
```
❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY
```

**Solution:**
- Verify `.env` file exists in project root
- Check environment variables are set
- Ensure service key has admin privileges

#### 2. Migration Failures
```
❌ Migration failed: table already exists
```

**Solution:**
- Check if migration was partially applied
- Use `npm run db:check` to see current state
- Manually fix conflicting schema changes

#### 3. Seed Data Conflicts
```
❌ Unique constraint violation
```

**Solution:**
- Clear existing data before re-seeding
- Use `UPSERT` operations instead of `INSERT`
- Check for existing test data

#### 4. Permission Errors
```
❌ insufficient_privilege
```

**Solution:**
- Ensure using service role key (not anon key)
- Check RLS policies allow service role access
- Verify user permissions in Supabase dashboard

### Advanced Debugging

#### Check Database Connection
```bash
cd server
tsx scripts/integration-check.ts
```

#### Inspect Database Schema
```bash
tsx scripts/inspect-schema.js
```

#### Manual Migration Check
```sql
-- Check applied migrations
SELECT * FROM supabase_migrations.schema_migrations;

-- Check table structure
\d table_name

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

## Development Workflow

### Adding New Migrations

1. Create new SQL file in `/server/supabase/migrations/`
2. Use timestamp naming convention
3. Test migration locally
4. Add to version control
5. Deploy via `npm run db:migrate`

### Testing Migrations

```bash
# Dry run (check syntax)
npx supabase db diff

# Apply locally first
npx supabase db push

# Then deploy to cloud
npm run db:migrate
```

### Rollback Strategy

**Manual rollback required:**
1. Create reverse migration SQL
2. Apply via `npm run db:migrate`
3. Update migration tracking

**Example rollback:**
```sql
-- If you added a column
ALTER TABLE orders DROP COLUMN IF EXISTS new_column;

-- If you created a table  
DROP TABLE IF EXISTS new_table CASCADE;
```

## Production Considerations

### Pre-deployment Checklist

- [ ] Test migrations on staging database
- [ ] Backup production database
- [ ] Verify RLS policies don't break
- [ ] Check for data conflicts
- [ ] Plan rollback procedure

### Performance Migrations

Run performance optimizations separately:
```bash
# Apply performance indexes
psql -f server/scripts/add-performance-indexes.sql

# Database optimization
psql -f /scripts/database-optimization.sql
```

### Monitoring

After migrations:
- Check database performance metrics
- Monitor error logs for constraint violations
- Verify all services can connect
- Test critical user flows

## Support

For migration issues:
1. Check server logs: `/logs/`
2. Use integration check: `npm run check:integration`
3. Review Supabase dashboard for errors
4. Check migration tracking table for partial failures

Related documentation:
- [Server README](../server/README.md)
- [API Authentication](./API_AUTHENTICATION.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)