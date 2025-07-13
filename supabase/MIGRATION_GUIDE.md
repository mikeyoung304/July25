# Supabase Migration Guide

## Quick Start

### First Time Setup
```bash
# 1. Login to Supabase (only needed once)
supabase login

# 2. Start development with automatic checks
npm run dev:supabase
```

The `dev:supabase` script will:
- ✅ Check if you're logged in
- ✅ Link the project if needed
- ✅ Apply any pending migrations
- ✅ Start the development servers

### Regular Development
```bash
# Just use the smart script - it handles everything
npm run dev:supabase

# Or if you're already set up, use the regular dev
npm run dev
```

## Migration Commands

### Apply Migrations
```bash
npm run db:push
```

### Create a New Migration
```bash
npm run db:migration:new your_migration_name
```

This creates a new file in `supabase/migrations/`. Edit it with your SQL changes.

### Reset Database (CAUTION!)
```bash
npm run db:reset
```

### Check Database Status
```bash
npm run db:status
```

## Common Issues

### "Not logged in to Supabase"
Run `supabase login` and follow the browser prompt.

### "Project not linked"
The script will automatically link to project `xiwfhcikfdoshxwbtjxt`.

### "Migration failed"
1. Check the SQL syntax in your migration file
2. Look for error details in the terminal
3. You can always apply SQL manually in Supabase dashboard

## Migration Best Practices

1. **Name migrations clearly**: Use descriptive names like `add_user_profiles_table`
2. **Keep migrations small**: One logical change per migration
3. **Test locally first**: Run migrations in development before production
4. **Never edit old migrations**: Create new ones to fix issues

## Project Structure
```
supabase/
├── config.toml          # Supabase configuration
├── migrations/          # SQL migration files
│   └── 20240712000000_initial_schema.sql
└── MIGRATION_GUIDE.md   # This file
```

## Why This Setup?

This setup solves the copy/paste problem by:
1. Using official Supabase CLI for migrations
2. Tracking migration files in version control
3. Providing a smart script that checks login status
4. Making migrations repeatable and shareable with your team