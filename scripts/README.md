# Documentation Drift Detection Scripts

**Last Updated:** 2025-11-01

## Overview

These scripts automatically detect when documentation falls behind code changes. They run in CI on every PR that touches migrations, routes, or configuration.

## Scripts

### 1. check-schema-drift.cjs

Compares `docs/reference/schema/DATABASE.md` with actual database schema from migration files.

**Checks:**
- New columns added to tables but not documented
- Documented columns that may be missing
- Core tables: restaurants, users, menu_items, orders, tables, payment_audit_logs, audit_logs

**Usage:**
```bash
npm run docs:drift:schema
# or
node scripts/check-schema-drift.cjs
```

**Exit codes:**
- `0`: No drift detected
- `1`: Drift detected or error

### 2. check-api-drift.cjs

Compares `docs/reference/api/openapi.yaml` with actual API routes in `server/src/routes/*.ts`.

**Checks:**
- Undocumented endpoints (exist in code but not in OpenAPI spec)
- Obsolete documentation (documented but not implemented)
- Enum consistency (order status, payment status, etc.)

**Usage:**
```bash
npm run docs:drift:api
# or
node scripts/check-api-drift.cjs
```

**Dependencies:**
- Requires `js-yaml` package (already in dependencies)

**Exit codes:**
- `0`: No drift detected
- `1`: Drift detected or error

### 3. check-config-drift.cjs

Compares `docs/reference/config/ENVIRONMENT.md` with `.env.example`.

**Checks:**
- Undocumented environment variables
- Documented variables missing from .env.example
- Required variables without placeholder values
- Metadata consistency

**Usage:**
```bash
npm run docs:drift:config
# or
node scripts/check-config-drift.cjs
```

**Exit codes:**
- `0`: No drift detected
- `1`: Drift detected or error

## Running All Checks

Run all drift detection checks at once:

```bash
npm run docs:drift
```

This runs all three scripts in sequence and reports any issues.

## CI Integration

These scripts run automatically in GitHub Actions on every PR that touches:

- Database migrations (`supabase/migrations/*.sql`)
- API routes (`server/src/routes/*.ts`)
- Configuration files (`.env.example`)
- Documentation files (`docs/**/*.md`)

**Workflow:** `.github/workflows/docs-check.yml` (drift-detection job)

**Behavior:**
- Runs on every PR
- Fails PR if drift detected
- Posts comment on PR with actionable instructions
- Shows detailed drift report in GitHub Actions summary

## Local Development Workflow

### Before Committing Code Changes

If you're making changes that affect the schema, API, or config:

1. **Make your code changes** (migrations, routes, env vars)
2. **Run drift detection:**
   ```bash
   npm run docs:drift
   ```
3. **Fix any drift:**
   - **Schema:** Update `docs/reference/schema/DATABASE.md`
   - **API:** Update `docs/reference/api/openapi.yaml`
   - **Config:** Update `docs/reference/config/ENVIRONMENT.md`
4. **Verify fix:**
   ```bash
   npm run docs:drift
   ```
5. **Commit both code AND documentation changes together**

### Example: Adding a New Column

```bash
# 1. Create migration
npm run db:migration:new add_new_column

# 2. Write migration SQL
# ALTER TABLE orders ADD COLUMN new_column VARCHAR(50);

# 3. Run drift detection (will fail)
npm run docs:drift:schema
# Output: ❌ Column 'new_column' not documented

# 4. Update DATABASE.md
# Add new_column to orders table documentation

# 5. Verify fix
npm run docs:drift:schema
# Output: ✅ No drift detected

# 6. Commit everything together
git add supabase/migrations/20XX_add_new_column.sql
git add docs/reference/schema/DATABASE.md
git commit -m "feat: add new_column to orders table"
```

## Fixing Drift

### Schema Drift

**Error:**
```
⚠️  DRIFT DETECTED in table 'orders':
   Column 'seat_number' exists in migration
   but is NOT documented in DATABASE.md
```

**Fix:**
1. Open `docs/reference/schema/DATABASE.md`
2. Find the `orders` table section
3. Add new column to markdown table:
   ```markdown
   | seat_number | INTEGER | Seat number for multi-seat ordering |
   ```

### API Drift

**Error:**
```
⚠️  UNDOCUMENTED ENDPOINT: POST /menu/sync-ai
   Found in: menu.routes.ts
```

**Fix:**
1. Open `docs/reference/api/openapi.yaml`
2. Add endpoint definition:
   ```yaml
   /menu/sync-ai:
     post:
       summary: Sync menu to AI service
       tags: [Menu]
       responses:
         '200':
           description: Menu synced
   ```

### Config Drift

**Error:**
```
⚠️  UNDOCUMENTED VARIABLE: NEW_FEATURE_FLAG
   Found in: .env.example
```

**Fix:**
1. Open `docs/reference/config/ENVIRONMENT.md`
2. Add to appropriate section:
   ```markdown
   | NEW_FEATURE_FLAG | boolean | ❌ No | false | Enable new feature |
   ```

## How It Works

### Schema Detection

1. Parses `DATABASE.md` for documented tables/columns
2. Parses all `.sql` migration files for `ALTER TABLE` and `CREATE TABLE` statements
3. Compares documented vs actual schema
4. Reports missing documentation

### API Detection

1. Parses `openapi.yaml` for documented endpoints
2. Scans `server/src/routes/*.ts` for `router.get/post/put/patch/delete` calls
3. Normalizes paths (`:id` → `{id}`)
4. Compares documented vs actual endpoints
5. Reports undocumented or obsolete endpoints

### Config Detection

1. Parses `ENVIRONMENT.md` for documented variables
2. Parses `.env.example` for actual variables
3. Compares documented vs actual
4. Checks metadata (required/optional, placeholders)
5. Reports missing or undocumented variables

## Known Limitations

### False Positives

**Schema detection may flag columns from base schema:**
- Base schema columns (created in initial migration) may show as "documented but not in migrations"
- This is expected and can be ignored if the column exists in the database
- Only flag columns missing from both docs AND migrations

**API detection may miss dynamic routes:**
- Routes generated dynamically at runtime won't be detected
- Middleware-based routes may not be captured
- WebSocket upgrades are intentionally skipped

### Performance

- **Fast:** All checks complete in < 5 seconds
- **Lightweight:** Only requires Node.js + js-yaml
- **No database connection:** Works purely from static analysis

## Troubleshooting

### "require is not defined" Error

**Problem:** Scripts fail with ES module error

**Solution:** Scripts should use `.cjs` extension (already configured)

### "js-yaml not found" Error

**Problem:** API drift check fails with missing dependency

**Solution:**
```bash
npm install js-yaml
```

### Script Exits with Code 0 but Shows Warnings

**Expected behavior:** Some warnings are informational and don't fail the check. Only errors with "DRIFT DETECTED" fail the build.

## Maintenance

### Adding New Tables to Schema Check

Edit `check-schema-drift.cjs`:

```javascript
const CORE_TABLES = [
  'restaurants',
  'users',
  'menu_items',
  'orders',
  'tables',
  'payment_audit_logs',
  'audit_logs',
  'your_new_table'  // Add here
];
```

### Excluding Routes from API Check

Edit `check-api-drift.cjs`:

```javascript
// In parseActualEndpoints()
if (routePath.includes('internal') || routePath.includes('test')) {
  continue; // Skip internal/test routes
}
```

## Future Improvements

- [ ] **Schema:** Parse actual Supabase schema via REST API
- [ ] **API:** Detect route middleware and decorators
- [ ] **Config:** Validate env var types match documentation
- [ ] **All:** Generate auto-fix suggestions
- [ ] **All:** Support for multiple environments (dev/prod)

## Related Documentation

- [Documentation Standards](../docs/DOCUMENTATION_STANDARDS.md)
- [CI/CD Workflows](../docs/how-to/development/CI_CD_WORKFLOWS.md)
- [Contributing Guide](../docs/how-to/development/CONTRIBUTING.md)

---

**Version:** 1.0.0
**Created:** 2025-11-01
**Automation Level:** Runs on every PR
