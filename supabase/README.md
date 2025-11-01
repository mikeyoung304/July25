# Supabase Configuration

**Last Updated:** 2025-11-01

Supabase backend configuration, database migrations, and functions.

## Directory Structure

```
supabase/
├── migrations/          # Database schema migrations
├── functions/          # Edge functions
├── seed.sql           # Initial database seed data
└── config.toml        # Supabase configuration
```

## Documentation

- [Migrations](./migrations/README.md) - Database migration management
- [Migration Baseline](./MIGRATION_BASELINE.md) - Migration system baseline and reconciliation

## Related Documentation

- [Database Schema](../docs/reference/schema/DATABASE.md) - Complete database reference
- [Supabase Connection Guide](../docs/SUPABASE_CONNECTION_GUIDE.md) - Connection workflows and troubleshooting
- [Deployment Guide](../docs/how-to/operations/DEPLOYMENT.md) - Production deployment procedures

## Key Concepts

### Migrations

Database migrations are SQL files that modify the schema. See [migrations/README.md](./migrations/README.md) for:
- Naming conventions
- Deployment workflow
- Common issues
- Best practices

### Baseline

The migration baseline ensures consistency between local and production schemas. See [MIGRATION_BASELINE.md](./MIGRATION_BASELINE.md) for reconciliation procedures.

---

**Part of the [Restaurant OS Documentation](../docs/README.md)**
