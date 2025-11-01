# Contributing to Restaurant OS

**Last Updated:** 2025-10-31

Thank you for your interest in contributing to Restaurant OS! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository** and clone your fork locally
2. **Set up the development environment** following the instructions in [README.md](README.md)
3. **Create a feature branch** from `main` for your changes
4. **Make your changes** following our coding standards
5. **Test your changes** thoroughly
6. **Submit a pull request** with a clear description

## Development Workflow

### Branch Naming Convention

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

Example: `feat/add-table-reservation`

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(orders): add order status tracking

Implement real-time order status updates using WebSocket events.
Updates are pushed to kitchen display and customer views.

Closes #123
```

## Coding Standards

### TypeScript

- **Strict mode** must be enabled
- All code must pass TypeScript compilation
- Use explicit types rather than `any`
- Document complex types with JSDoc comments

### Code Style

- ESLint configuration is enforced
- Run `npm run lint:fix` before committing
- Follow existing code patterns in the codebase
- Use meaningful variable and function names

### Testing

- Write tests for new features
- Coverage is tracked in CI (see server coverage report for current levels)
- Current coverage baseline: ~23.47% (working to improve)
- Run `npm test` before submitting PR

## Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** for new features
3. **Ensure all tests pass**: `npm test`
4. **Verify TypeScript compilation**: `npm run typecheck`
5. **Fix linting issues**: `npm run lint:fix`
6. **Update the CHANGELOG.md** if applicable
7. **Request review** from maintainers

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] TypeScript compilation successful
- [ ] ESLint checks pass
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

## Quality Gates

All PRs must pass the following automated checks:

1. **TypeScript compilation** - Zero errors required
2. **ESLint** - Zero errors allowed
3. **Tests** - All tests must pass
4. **Coverage** - Coverage tracked (current baseline: ~23.47%)
5. **Bundle size** - Main chunk must stay under 100KB
6. **Guard checks** - No compiled JS in /shared directory

## Architecture Guidelines

### Multi-Tenancy

All features must support multi-tenant operation with `restaurant_id` scoping. Every database operation and API endpoint must enforce tenant isolation.

**See:** [DEPLOYMENT.md#multi-tenant-architecture](../operations/DEPLOYMENT.md#multi-tenant-architecture) for implementation patterns.

### Contributor Ops Handoff

Operational and deployment procedures have been moved to the canonical deployment guide for single-source-of-truth maintenance.

**For operational procedures, see [DEPLOYMENT.md#contributor-operations-handoff](../operations/DEPLOYMENT.md#contributor-operations-handoff):**
- Environment configuration
- Release and rollback procedures
- Payment integration setup
- WebSocket configuration
- Authentication architecture

### Performance

- Monitor bundle sizes with `npm run analyze`
- Use code splitting for routes
- Implement proper cleanup in React components
- Use WebSocket connection pooling

### Security

- Never commit secrets or API keys
- Validate all user input
- Use parameterized database queries
- Implement proper authentication checks
- Follow OWASP security guidelines

## Adding Protected Routes

When adding a new API route that requires authentication and authorization, follow this guide to ensure proper security and avoid common middleware ordering bugs.

### The Standard Pattern

All protected routes must follow this middleware order:

```typescript
router.METHOD('/path',
  authenticate,                      // 1. Verify JWT, set req.user
  validateRestaurantAccess,          // 2. Extract + validate restaurant ID, set req.restaurantId
  requireScopes(ApiScope.XXX),       // 3. Check permissions (requires both user and restaurantId)
  validateBody(Schema),              // 4. Validate request body (optional, for POST/PATCH)
  async (req: AuthenticatedRequest, res, next) => {
    // Your route handler - all dependencies satisfied
  }
);
```

**Why this order matters:** The `requireScopes()` middleware at `server/src/middleware/rbac.ts:202` checks for `req.restaurantId`. If `validateRestaurantAccess` runs after `requireScopes`, the context will be undefined and the request will fail with 403 errors.

### Step-by-Step Guide

#### 1. Determine Required Scopes

Check `server/src/middleware/rbac.ts:12-41` for available scopes:

```typescript
export enum ApiScope {
  ORDERS_CREATE = 'orders:create',
  ORDERS_READ = 'orders:read',
  ORDERS_UPDATE = 'orders:update',
  PAYMENTS_PROCESS = 'payments:process',
  // ... etc
}
```

**Naming Convention:** Always use colons (`:`) not dots (`.`). Example: `orders:create` not `orders.create`

#### 2. Add the Route with Correct Middleware Order

**Example - POST Route:**
```typescript
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';

router.post('/items',
  authenticate,                              // ✅ Always first
  validateRestaurantAccess,                  // ✅ Always before requireScopes
  requireScopes(ApiScope.MENU_MANAGE),      // ✅ After restaurant context
  validateBody(MenuItemPayload),             // ✅ Last middleware
  async (req: AuthenticatedRequest, res, next) => {
    const restaurantId = req.restaurantId!;  // Safe - validated by middleware
    const itemData = (req as any).validated; // Safe - validated by middleware

    // Your implementation
  }
);
```

**Example - GET Route:**
```typescript
router.get('/items',
  authenticate,
  validateRestaurantAccess,
  // No validateBody needed for GET
  async (req: AuthenticatedRequest, res, next) => {
    const restaurantId = req.restaurantId!;
    // Your implementation
  }
);
```

#### 3. Implement Multi-Tenancy

**Always scope database queries by restaurantId:**

```typescript
// ✅ CORRECT - Scoped by restaurant
const items = await db.menu_items
  .where('restaurant_id', restaurantId)
  .select();

// ❌ WRONG - No restaurant scoping (security vulnerability!)
const items = await db.menu_items.select();
```

**Always include restaurantId in created records:**

```typescript
// ✅ CORRECT
const newItem = await db.menu_items.insert({
  ...itemData,
  restaurant_id: restaurantId  // Multi-tenant scoping
});

// ❌ WRONG - Missing restaurant_id
const newItem = await db.menu_items.insert(itemData);
```

#### 4. If Adding New Scopes

If your route needs a scope that doesn't exist yet:

**Step 4a:** Add to ApiScope enum (`server/src/middleware/rbac.ts:12-41`)
```typescript
export enum ApiScope {
  // ... existing scopes
  REPORTS_EXPORT = 'reports:export',  // New scope
}
```

**Step 4b:** Add to role(s) in ROLE_SCOPES constant (`rbac.ts:103+`)
```typescript
manager: [
  // ... existing scopes
  ApiScope.REPORTS_EXPORT,  // Add to manager role
],
```

**Step 4c:** Create database migration (see `rbac.ts:43-102` for detailed procedure)
```sql
-- File: supabase/migrations/YYYYMMDD_add_reports_export_scope.sql

-- 1. Add to api_scopes table FIRST
INSERT INTO api_scopes (scope, description) VALUES
  ('reports:export', 'Export reports to CSV/PDF')
ON CONFLICT (scope) DO NOTHING;

-- 2. Add to role_scopes table
INSERT INTO role_scopes (role, scope) VALUES
  ('manager', 'reports:export')
ON CONFLICT (role, scope) DO NOTHING;
```

**Step 4d:** Apply migration
```bash
supabase db push --linked
```

**Step 4e:** Verify sync
```bash
# Query database to confirm scope exists
psql -c "SELECT role, scope FROM role_scopes WHERE scope = 'reports:export';"
```

### Protected Routes Checklist

Before submitting your PR, verify:

- [ ] Middleware order is correct: authenticate → validateRestaurantAccess → requireScopes → validateBody
- [ ] Correct scope(s) specified in requireScopes()
- [ ] Database queries scoped by restaurantId
- [ ] Created records include restaurant_id
- [ ] If new scope: Added to ApiScope enum
- [ ] If new scope: Added to ROLE_SCOPES constant
- [ ] If new scope: Database migration created and applied
- [ ] Tested with non-admin role (server, kitchen, customer)
- [ ] X-Restaurant-ID header included in test requests

### Reference Implementations

**Study these files for correct patterns:**

- `server/src/routes/payments.routes.ts:104-109` - POST route with all middleware
- `server/src/routes/orders.routes.ts:40` - POST route (fixed in commit 0ad5c77a)
- `server/src/routes/orders.routes.ts:18` - GET route with authentication
- `server/src/routes/auth.routes.ts:359` - GET route with restaurant context

### Common Mistakes to Avoid

**❌ Mistake 1: Wrong middleware order**
```typescript
router.post('/',
  authenticate,
  requireScopes(ApiScope.ORDERS_CREATE),  // ❌ WRONG - before validateRestaurantAccess
  validateRestaurantAccess,
  // ...
);
```
**Error:** 403 Forbidden - Restaurant context required

**✅ Fix:** Move validateRestaurantAccess before requireScopes

---

**❌ Mistake 2: Forgetting validateRestaurantAccess**
```typescript
router.post('/',
  authenticate,
  requireScopes(ApiScope.ORDERS_CREATE),  // ❌ Missing validateRestaurantAccess
  // ...
);
```
**Error:** 403 Forbidden - Restaurant context required

**✅ Fix:** Add validateRestaurantAccess middleware

---

**❌ Mistake 3: Using dot notation for scopes**
```typescript
INSERT INTO api_scopes (scope) VALUES ('orders.create');  // ❌ WRONG - uses dots
```
**Error:** Foreign key violation or scope mismatch

**✅ Fix:** Use colon notation: `'orders:create'`

---

**❌ Mistake 4: Testing only with admin role**
```bash
# Only testing with admin bypasses scope checks
curl -H "Authorization: Bearer $ADMIN_TOKEN" ...
```
**Problem:** Bug not discovered until production

**✅ Fix:** Test with server, kitchen, or customer role:
```bash
TOKEN=$(curl ... -d '{"email":"server@restaurant.com",...}' | jq -r '.session.accessToken')
curl -H "Authorization: Bearer $TOKEN" ...
```

### Related Documentation

- **Middleware Patterns:** [AUTHENTICATION_ARCHITECTURE.md - Middleware Patterns & Ordering](../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md#backend-express-middleware)
- **RBAC Architecture:** [AUTHENTICATION_ARCHITECTURE.md - Database Schema](../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md#database-schema)
- **Investigation Case Study:** [docs/investigations/workspace-auth-fix-2025-10-29.md](./investigations/workspace-auth-fix-2025-10-29.md)
- **Troubleshooting 403 Errors:** [TROUBLESHOOTING.md - 403 Forbidden Errors](#) (if added)

---

## Documentation

### When to Update Documentation

Update documentation when you:
- Add a new feature
- Change API endpoints
- Modify configuration options
- Update dependencies significantly
- Change deployment procedures

### Documentation Structure

- **README.md** - Project overview and setup
- **CLAUDE.md** - Development guidelines
- **docs/** - Detailed documentation
  - `01-getting-started/` - Setup and installation
  - `02-api/` - API reference
  - `03-features/` - Feature documentation
  - `04-architecture/` - System design
  - `05-deployment/` - Deployment guides
  - `06-development/` - Development guides

## Getting Help

- **Issues**: Check existing [GitHub Issues](https://github.com/mikeyoung304/July25/issues)
- **Discussions**: Ask questions in [Discussions](https://github.com/mikeyoung304/July25/discussions)
- **Documentation**: Refer to the [docs/](docs/) directory

## Release Process

For release procedures, rollback steps, and deployment workflows, see [DEPLOYMENT.md#normal-production-deployment-flow](../operations/DEPLOYMENT.md#normal-production-deployment-flow).

Releases follow [Semantic Versioning](https://semver.org/):
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, backward compatible

## License

By contributing to Restaurant OS, you agree that your contributions will be licensed under the project's license terms.

## Acknowledgments

Thank you to all contributors who help make Restaurant OS better!