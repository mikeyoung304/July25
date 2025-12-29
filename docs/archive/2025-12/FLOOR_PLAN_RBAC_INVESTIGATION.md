# RBAC and Permission Investigation for Floor Plan Operations

## Investigation Summary

This investigation examined the Role-Based Access Control (RBAC) system specifically for floor plan operations, focusing on the manager role's permission requirements and backend API protection.

---

## 1. API SCOPES RELATED TO FLOOR PLANS, TABLES, AND LAYOUTS

### Current API Scope Definitions

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts:12-41`

```typescript
export enum ApiScope {
  // Order Management
  ORDERS_CREATE = 'orders:create',
  ORDERS_READ = 'orders:read',
  ORDERS_UPDATE = 'orders:update',
  ORDERS_DELETE = 'orders:delete',
  ORDERS_STATUS = 'orders:status',
  
  // Payment Processing
  PAYMENTS_PROCESS = 'payments:process',
  PAYMENTS_REFUND = 'payments:refund',
  PAYMENTS_READ = 'payments:read',
  
  // Reporting & Analytics
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  
  // Staff Management
  STAFF_MANAGE = 'staff:manage',
  STAFF_SCHEDULE = 'staff:schedule',
  
  // System Administration
  SYSTEM_CONFIG = 'system:config',
  
  // Menu Management
  MENU_MANAGE = 'menu:manage',
  
  // Table Management
  TABLES_MANAGE = 'tables:manage'
}
```

### Floor Plan Related Scope
- **Scope Name:** `tables:manage`
- **Description:** Manage table layouts
- **Usage:** Controls all floor plan operations (create, read, update, delete tables)
- **Scope Format:** Uses colon-separated format (e.g., `tables:manage`) - CORRECT

---

## 2. MANAGER ROLE SCOPE ASSIGNMENTS

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts:103-181`

### Manager Role Definition

```typescript
manager: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_UPDATE,
  ApiScope.ORDERS_DELETE,
  ApiScope.ORDERS_STATUS,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.PAYMENTS_REFUND,
  ApiScope.PAYMENTS_READ,
  ApiScope.REPORTS_VIEW,
  ApiScope.REPORTS_EXPORT,
  ApiScope.STAFF_MANAGE,
  ApiScope.STAFF_SCHEDULE,
  ApiScope.MENU_MANAGE,
  ApiScope.TABLES_MANAGE     // ✅ MANAGER HAS FLOOR PLAN PERMISSIONS
],
```

### Complete Scope Matrix for All Roles

| Role | TABLES_MANAGE | ORDERS | PAYMENTS | REPORTS | STAFF | MENU | SYSTEM_CONFIG |
|------|---------------|--------|----------|---------|-------|------|---------------|
| **owner** | ✅ | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ | ✅ |
| **manager** | ✅ | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ | ❌ |
| **server** | ✅ | ✅ (create, read, update, status) | ✅ (process, read) | ❌ | ❌ | ❌ | ❌ |
| **cashier** | ❌ | ✅ (read) | ✅ (process, read) | ❌ | ❌ | ❌ | ❌ |
| **kitchen** | ❌ | ✅ (read, status) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **expo** | ❌ | ✅ (read, status) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. BACKEND ROUTE PROTECTION FOR FLOOR PLAN ENDPOINTS

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/tables.routes.ts:378-386`

### Protected Endpoints

```typescript
// Middleware chain order: authenticate -> validateRestaurantAccess -> requireScopes

// GET endpoints (NO scope required for reads)
router.get('/', authenticate, validateRestaurantAccess, getTables);
router.get('/:id', authenticate, validateRestaurantAccess, getTable);

// Mutation endpoints (REQUIRE tables:manage scope)
router.post('/', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.TABLES_MANAGE),  // ✅ PROTECTED
  createTable
);

router.put('/batch', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.TABLES_MANAGE),  // ✅ PROTECTED
  batchUpdateTables  // Used by floor plan editor to save layouts
);

router.put('/:id', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.TABLES_MANAGE),  // ✅ PROTECTED
  updateTable
);

router.delete('/:id', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.TABLES_MANAGE),  // ✅ PROTECTED
  deleteTable
);

router.patch('/:id/status', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.TABLES_MANAGE),  // ✅ PROTECTED
  updateTableStatus
);
```

### Middleware Execution Flow

1. **authenticate** - Validates JWT token, extracts user info
2. **validateRestaurantAccess** - Ensures user has access to the restaurant via `x-restaurant-id` header
3. **requireScopes(ApiScope.TABLES_MANAGE)** - Checks if user's role has the required scope

---

## 4. MIDDLEWARE CHECKING PERMISSIONS ON FLOOR PLAN OPERATIONS

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts:237-338`

### requireScopes Middleware Implementation

```typescript
export function requireScopes(...requiredScopes: ApiScope[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. Ensure user is authenticated
      if (!req.user) {
        return next(Unauthorized('Authentication required'));
      }

      // 2. Get restaurant context
      const restaurantId = req.restaurantId;
      if (!restaurantId) {
        return next(Forbidden('Restaurant context required'));
      }

      // 3. For admin/super_admin, grant all scopes (bypass check)
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        rbacLogger.debug('Admin user, granting all scopes', {
          userId: req.user.id,
          role: req.user.role
        });
        return next();
      }

      // 4. For demo users (ephemeral sessions), use JWT role-based scopes
      if (req.user.id?.startsWith('demo:')) {
        const roleScopes = getScopesForRole(req.user.role!);
        const hasRequiredScope = requiredScopes.some(scope =>
          roleScopes.includes(scope)
        );

        if (!hasRequiredScope) {
          rbacLogger.warn('Demo user lacks required scope', {
            userId: req.user.id,
            role: req.user.role,
            requiredScopes,
            userScopes: roleScopes
          });
          return next(Forbidden(`Insufficient permissions. Required: ${requiredScopes.join(', ')}`));
        }
        return next();
      }

      // 5. For regular users, query database for role
      const userRole = await getUserRestaurantRole(req.user.id, restaurantId);
      
      if (!userRole) {
        rbacLogger.warn('User has no role in restaurant', {
          userId: req.user.id,
          restaurantId
        });
        return next(Forbidden('No access to this restaurant'));
      }

      // 6. Get scopes for user's role
      const userScopes = getScopesForRole(userRole);
      
      // 7. Check if user has at least one required scope
      const hasRequiredScope = requiredScopes.some(scope => 
        userScopes.includes(scope)
      );
      
      if (!hasRequiredScope) {
        rbacLogger.warn('User lacks required scope', {
          userId: req.user.id,
          userRole,
          requiredScopes,
          userScopes
        });
        return next(Forbidden(`Insufficient permissions. Required: ${requiredScopes.join(', ')}`));
      }

      // 8. Store user's role and scopes in request
      req.user.role = userRole;
      req.user.scopes = userScopes;

      rbacLogger.debug('RBAC check passed', {
        userId: req.user.id,
        userRole,
        requiredScopes,
        userScopes
      });

      next();
    } catch (error) {
      rbacLogger.error('RBAC middleware error:', error);
      next(error);
    }
  };
}
```

### Permission Check Logic for Floor Plans

1. **User has `tables:manage` scope** (from manager role) → ✅ ALLOWED
2. **User lacks `tables:manage` scope** (e.g., cashier) → ❌ FORBIDDEN (403)

---

## 5. OWNER VS MANAGER PERMISSION DIFFERENCES FOR FLOOR PLANS

### Floor Plan Specific Permissions

| Operation | Owner | Manager | Server | Other |
|-----------|-------|---------|--------|-------|
| Create table | ✅ | ✅ | ✅ | ❌ |
| Update table position/layout | ✅ | ✅ | ✅ | ❌ |
| Batch update tables (floor plan save) | ✅ | ✅ | ✅ | ❌ |
| Delete table | ✅ | ✅ | ✅ | ❌ |
| Update table status (occupied/available) | ✅ | ✅ | ✅ | ❌ |
| Read table data | ✅ | ✅ | ✅ | ✅ |

### Key Difference: System Configuration

**Owner CAN:**
- `system:config` scope - System-level configurations

**Manager CANNOT:**
- `system:config` scope - Restricted to system owners only

### In Practice for Floor Plans

- **Owner and Manager have IDENTICAL floor plan permissions**
- Both can create, edit, and save floor plans
- Both can modify table layouts, positions, and properties
- The only functional difference is system config access, which doesn't affect floor plans

---

## PERMISSION MAPPINGS SUMMARY

### Client-Server Permission Flow

```
Frontend (FloorPlanEditor)
    ↓
TablePersistenceService.saveTables()
    ↓
TableService.batchUpdateTables() / createTable()
    ↓
POST /api/v1/tables (with x-restaurant-id header)
    ↓
Backend Authentication Stack:
    1. authenticate middleware
    2. validateRestaurantAccess middleware
    3. requireScopes(ApiScope.TABLES_MANAGE) middleware
    ↓
✅ Allowed (if user has tables:manage scope)
❌ Forbidden 403 (if user lacks tables:manage scope)
```

### Error Handling in Frontend

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/floor-plan/services/TablePersistenceService.ts:137-145`

```typescript
catch (error: any) {
  // ...error logging...
  
  if (error.status === 401) {
    toast.error('Authentication failed. Please sign in again.')
  } else if (error.status === 403) {
    toast.error('You do not have permission to save the floor plan.')  // ⚠️ KEY ERROR MESSAGE
  } else if (error.status === 400) {
    toast.error(`Invalid data: ${error.message || 'Please check table names and positions.'}`)
  } else {
    toast.error(`Failed to save floor plan: ${error.message || 'Unknown error'}`)
  }
}
```

---

## POTENTIAL PERMISSION GAPS IDENTIFIED

### Gap 1: Server Role Table Management (EXPECTED BEHAVIOR)

**Current Behavior:**
```typescript
server: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_UPDATE,
  ApiScope.ORDERS_STATUS,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.PAYMENTS_READ,
  ApiScope.TABLES_MANAGE  // ✅ Servers CAN manage tables
]
```

**Issue Comment in Code (Line 146):**
```typescript
// TABLES_MANAGE removed - servers should only update table status during service, not create/delete tables
```

**Gap:** The comment indicates a DECISION was made that servers should NOT have table management, but the scope IS assigned. This is contradictory.

**Recommendation:**
- Either remove `TABLES_MANAGE` from server scopes
- Or create a more granular scope like `TABLES_STATUS_ONLY` for servers

### Gap 2: No Frontend Permission Checks

**Issue:** FloorPlanEditor component doesn't verify permissions before attempting to save

**Current Flow:**
1. User can open FloorPlanEditor regardless of role
2. User can make edits to floor plan
3. Save fails with 403 Forbidden
4. Toast message appears

**Better Flow:**
1. Check permissions before showing editor
2. Hide save button for users without `tables:manage` scope
3. Show read-only view for users without permission

**File to Update:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/floor-plan/components/FloorPlanEditor.tsx`

### Gap 3: No Granular Floor Plan Scopes

**Current Scopes (Too Coarse):**
- `tables:manage` - Controls ALL table operations

**Potential Future Scopes (More Granular):**
- `tables:create` - Create new tables only
- `tables:update_layout` - Update positions/dimensions
- `tables:delete` - Delete tables
- `tables:read` - View tables only

**Current Impact:** Managers and servers can currently delete tables, which might not be intended.

### Gap 4: Status Update Permission

**Issue:** `updateTableStatus` (occupied/available) requires `tables:manage` scope

**Question:** Should table status updates require the same permission as creating tables? Currently:
- Server or manager can mark a table as "occupied" during service
- But this requires `tables:manage` scope
- Could be more granular: `tables:update_status` vs `tables:manage`

---

## DATABASE MIGRATION VERIFICATION

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql`

### Scope Definition in Database

```sql
INSERT INTO api_scopes (scope, description) VALUES
  ('tables:manage', 'Manage table layouts')
ON CONFLICT (scope) DO NOTHING;
```

### Role Scope Assignment

```sql
INSERT INTO role_scopes (role, scope) VALUES
  ('manager', 'tables:manage'),
  ('server', 'tables:manage'),
  -- ... other scopes
ON CONFLICT (role, scope) DO NOTHING;
```

**Verification Query:**
```sql
SELECT role, scope FROM role_scopes WHERE role IN ('owner', 'manager', 'server') ORDER BY role, scope;
```

Expected output includes `tables:manage` for manager and server.

---

## TESTING REQUIREMENTS

### Test Case 1: Manager Can Save Floor Plan
```
Role: manager
Action: Create and save tables in floor plan editor
Expected: ✅ Save succeeds (200/201)
```

### Test Case 2: Server Can Save Floor Plan
```
Role: server
Action: Create and save tables in floor plan editor
Expected: ✅ Save succeeds (200/201)
Concern: Comment suggests this SHOULD NOT be allowed
```

### Test Case 3: Cashier Cannot Save Floor Plan
```
Role: cashier
Action: POST to /api/v1/tables with table data
Expected: ❌ 403 Forbidden
```

### Test Case 4: Kitchen Cannot Save Floor Plan
```
Role: kitchen
Action: POST to /api/v1/tables with table data
Expected: ❌ 403 Forbidden
```

---

## RECOMMENDATIONS

### Immediate Actions (High Priority)

1. **Resolve Server Role Ambiguity**
   - Remove `TABLES_MANAGE` from server scope OR
   - Change scope name to `TABLES_STATUS_UPDATE` to reflect actual intent
   - Update database migration accordingly

2. **Add Frontend Permission Check**
   - Modify FloorPlanEditor to check user scopes before rendering
   - Hide/disable save button for users without permission
   - Show explicit "You don't have permission" message

3. **Update Error Messages**
   - Change generic "permission denied" to "Floor plan management not available for your role"

### Medium Priority

4. **Create Granular Scopes**
   - Consider splitting `tables:manage` into:
     - `tables:create` - Create new tables
     - `tables:read` - View tables
     - `tables:update_position` - Move/resize tables
     - `tables:update_status` - Change occupied/available status
     - `tables:delete` - Delete tables

5. **Add Comprehensive Tests**
   - Unit tests for RBAC middleware with floor plan operations
   - Integration tests for each role saving floor plans
   - E2E tests for permission errors

6. **Documentation**
   - Document scope hierarchy and what each can do
   - Create permission matrix for all roles
   - Document database schema for api_scopes and role_scopes

### Long-term Improvements

7. **Implement Server Role Restrictions**
   - Decide: Should servers create/delete tables or only update status?
   - Implement more granular permission checks
   - Consider location/station-based permissions

8. **Add Audit Logging**
   - Log all floor plan modifications with user ID
   - Track scope enforcement decisions
   - Enable compliance/audit trails

---

## CONFIGURATION SUMMARY

### Current Working Configuration
- ✅ Manager can save floor plans
- ✅ Owner can save floor plans
- ✅ Server can save floor plans (AMBIGUOUS - see Gap 2)
- ✅ Cashier/Kitchen/Expo blocked from floor plan operations
- ✅ GET endpoints accessible to authenticated users
- ✅ POST/PUT/DELETE endpoints require `tables:manage` scope

### Database Sync Status
- ✅ api_scopes table contains `tables:manage`
- ✅ role_scopes table assigns `tables:manage` to manager
- ✅ Server role scopes match rbac.ts definitions

---

## FILES INVOLVED IN PERMISSION SYSTEM

### Backend RBAC
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts` - Scope definitions and middleware
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts` - Authentication middleware
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/restaurantAccess.ts` - Restaurant access validation
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/tables.routes.ts` - Table endpoint protection

### Frontend Floor Plan
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/floor-plan/components/FloorPlanEditor.tsx` - Main editor (NO permission checks)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/floor-plan/services/TablePersistenceService.ts` - Save/load logic
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/tables/TableService.ts` - API calls

### Database
- `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql` - Scope sync migration

---

