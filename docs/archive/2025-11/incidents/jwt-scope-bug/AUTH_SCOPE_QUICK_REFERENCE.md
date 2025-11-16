# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: JWT Scope Bug Investigation

---

# Authentication Scope Flow - Quick Reference Guide

## TL;DR - Where Scopes Come From

| When | Where | How |
|------|-------|-----|
| **Initial Login** | Database `role_scopes` table | Query by role |
| **Each Request** | JWT `scope` claim | Extract from token |
| **RBAC Check** | `ROLE_SCOPES` constant in code | Look up by user's role |
| **GET /me endpoint** | Database `role_scopes` table | Query by role |

---

## Three Key Files

### 1. Auth Middleware - `/server/src/middleware/auth.ts`
**What it does**: Verifies JWT and extracts scopes from JWT claims
**Key line**: `scopes: decoded.scope || []` (line 99)
**When**: Every authenticated request

```typescript
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: userRole,
  scopes: decoded.scope || [],  // ← From JWT
  restaurant_id: decoded.restaurant_id,
};
```

### 2. RBAC Middleware - `/server/src/middleware/rbac.ts`
**What it does**: Validates user has required scope and populates it if needed
**Key line**: `req.user.scopes = userScopes` (line 323)
**When**: Only when `requireScopes()` middleware is used

```typescript
const userScopes = getScopesForRole(userRole);
req.user.scopes = userScopes;  // ← From ROLE_SCOPES constant
```

### 3. Auth Routes - `/server/src/routes/auth.routes.ts`
**What it does**: Returns scopes to client during login
**Key lines**: 76-85 (email login), 160-169 (PIN login), 310-319 (GET /me)

```typescript
const { data: scopesData } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', userRole.role);
const scopes = scopesData?.map(s => s.scope) || [];
res.json({ user: { scopes } });
```

---

## The Scope Sources (Dual Architecture)

### Source 1: Database (Used at Login Time)
- **Table**: `role_scopes`
- **Query**: `SELECT scope FROM role_scopes WHERE role = 'manager'`
- **Files**: auth.routes.ts lines 76-85, 160-169, 310-319
- **Purpose**: Provide scopes to client for UI/UX decisions

### Source 2: Code Constant (Used for API Protection)
- **File**: rbac.ts lines 103-181
- **Constant**: `ROLE_SCOPES: Record<string, ApiScope[]>`
- **Purpose**: Performance (no DB query per request)
- **CRITICAL**: Must match database!

---

## Request Flow Diagram

```
Client sends JWT token
         ↓
authenticate() middleware
    jwt.verify() → decode JWT
         ↓
Extract req.user.scopes from decoded.scope claim
         ↓
[Optional] requireScopes() middleware
    - Verify user has required scope
    - Update req.user.scopes from ROLE_SCOPES constant
         ↓
Route handler
Access req.user.scopes
```

---

## Code Snippets for Common Tasks

### Get Scopes in a Route Handler
```typescript
// Scopes come from:
// 1. JWT claims (if included during login)
// 2. RBAC middleware (if requireScopes() was used)

const scopes = req.user?.scopes || [];

// Check if user has a scope
if (req.user?.scopes?.includes('orders:create')) {
  // User can create orders
}
```

### Add Scope Protection to a Route
```typescript
import { requireScopes, ApiScope } from '../middleware/rbac';

router.post('/orders/create',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.ORDERS_CREATE),  // ← Scope protection
  async (req, res) => {
    // req.user.scopes is now populated from ROLE_SCOPES
  }
);
```

### Query Database for Scopes
```typescript
const { data: scopesData } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', 'manager');

const scopes = scopesData?.map(s => s.scope) || [];
```

### Look Up Scopes from Code Constant
```typescript
import { getRoleScopesArray } from '../middleware/rbac';

const scopes = getRoleScopesArray('manager');
// Returns: ['orders:create', 'orders:read', 'payments:process', ...]
```

---

## API Scopes (All Available)

```typescript
enum ApiScope {
  // Orders
  ORDERS_CREATE = 'orders:create',
  ORDERS_READ = 'orders:read',
  ORDERS_UPDATE = 'orders:update',
  ORDERS_DELETE = 'orders:delete',
  ORDERS_STATUS = 'orders:status',
  
  // Payments
  PAYMENTS_PROCESS = 'payments:process',
  PAYMENTS_REFUND = 'payments:refund',
  PAYMENTS_READ = 'payments:read',
  
  // Reports
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  
  // Staff
  STAFF_MANAGE = 'staff:manage',
  STAFF_SCHEDULE = 'staff:schedule',
  
  // System
  SYSTEM_CONFIG = 'system:config',
  
  // Menu
  MENU_MANAGE = 'menu:manage',
  
  // Tables
  TABLES_MANAGE = 'tables:manage'
}
```

---

## Role Scope Mappings

| Role | Key Scopes |
|------|-----------|
| owner | All scopes (15) |
| manager | All except system:config (14) |
| server | orders:*, payments:process/read, tables:manage (6) |
| cashier | orders:read, payments:process/read (3) |
| kitchen | orders:read, orders:status (2) |
| expo | orders:read, orders:status (2) |
| customer | orders:*, payments:process, menu:manage (4) |
| admin | All scopes (implicit) |

---

## Adding a New Scope

### Step 1: Add to Code
```typescript
// In rbac.ts, add to enum:
REPORTS_DOWNLOAD = 'reports:download'

// Add to ROLE_SCOPES:
manager: [
  // ... existing scopes
  ApiScope.REPORTS_DOWNLOAD,
]
```

### Step 2: Create Migration
```sql
-- File: supabase/migrations/YYYYMMDD_add_reports_download.sql
INSERT INTO api_scopes (scope, description) VALUES
  ('reports:download', 'Download reports in various formats')
ON CONFLICT (scope) DO NOTHING;

INSERT INTO role_scopes (role, scope) VALUES
  ('manager', 'reports:download'),
  ('owner', 'reports:download')
ON CONFLICT (role, scope) DO NOTHING;
```

### Step 3: Apply & Verify
```bash
supabase db push --linked
# Query database to verify:
SELECT role, scope FROM role_scopes WHERE scope = 'reports:download';
```

---

## Common Issues

### Issue: User has JWT scope claim but API says "insufficient permissions"
**Cause**: JWT has scopes, but route uses `requireScopes()` which checks ROLE_SCOPES constant
**Fix**: Make sure ROLE_SCOPES matches database role_scopes table

### Issue: POST /login returns scopes but GET /me doesn't
**Cause**: GET /me endpoint queries role_scopes table separately
**Fix**: Ensure database role_scopes table is populated correctly

### Issue: Station tokens don't have scopes
**Status**: Known limitation - station auth doesn't populate scopes
**Workaround**: Station routes don't use scope protection, use role-based checks instead

### Issue: Scopes say "orders:read" but code checks "orders.read"
**Cause**: Naming convention - scopes use colons, not dots
**Fix**: Always use colons in scope names: `orders:read` not `orders.read`

---

## Environment Variables

```bash
# Auth configuration
SUPABASE_JWT_SECRET=your-secret-here
STRICT_AUTH=true                          # Require restaurant_id in JWT
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true        # Allow kiosk_demo → customer role

# Optional for dev
NODE_ENV=development
KIOSK_JWT_SECRET=dev-kiosk-secret-here
```

---

## Database Tables

### api_scopes
```sql
CREATE TABLE api_scopes (
  id UUID PRIMARY KEY,
  scope TEXT UNIQUE NOT NULL,    -- e.g., 'orders:create'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### role_scopes
```sql
CREATE TABLE role_scopes (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL,            -- e.g., 'manager'
  scope TEXT NOT NULL,           -- e.g., 'orders:create'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (scope) REFERENCES api_scopes(scope),
  UNIQUE(role, scope)
);
```

---

## Testing Scope Authorization

### Test with cURL
```bash
# Get a token first
TOKEN=$(your-auth-method-here)
RESTAURANT_ID="your-restaurant-id"

# Test endpoint with scope protection
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"items": [...]}'

# If you get 403 Forbidden, user lacks required scope
```

### Test in Code
```typescript
// In test file
expect(req.user?.scopes).toContain('orders:create');
expect(req.user?.scopes).not.toContain('system:config');
```

---

## See Also
- Full trace: `/AUTH_SCOPE_FLOW_TRACE.md`
- RBAC middleware: `/server/src/middleware/rbac.ts`
- Auth middleware: `/server/src/middleware/auth.ts`
- Auth routes: `/server/src/routes/auth.routes.ts`
- Migrations: `/supabase/migrations/`
