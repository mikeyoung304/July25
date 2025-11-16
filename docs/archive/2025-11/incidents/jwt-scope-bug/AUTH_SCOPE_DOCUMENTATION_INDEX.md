# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: JWT Scope Bug Investigation

---

# Authentication Scope Documentation - Complete Index

## Overview
This is a comprehensive set of documentation tracing how user scopes are populated through the authentication middleware in the Restaurant OS v6.0 application.

---

## Documents Included

### 1. AUTH_SCOPE_FLOW_TRACE.md (19 KB)
**Purpose**: Complete technical deep-dive into scope population

**Contents**:
- Detailed explanation of all 4 authentication paths
- Path 1: Email/password login (managers/owners)
- Path 2: PIN authentication (servers/cashiers)
- Path 3: JWT token verification (subsequent requests)
- Path 4: RBAC middleware (scope enforcement)
- Dual-source architecture explanation
- Database schema
- Complete request flow diagrams
- Scope definitions and API enum
- Code snippets showing where scopes are assigned
- Database migration references

**When to Read**: When you need complete understanding of the system

**Key Sections**:
- Section 2-4: The three authentication paths
- Section 5: RBAC middleware (most important for API protection)
- Section 6: Dual-source architecture (critical for understanding sync issues)
- Section 9: Request flow diagram
- Section 11: Scope assignment summary table

---

### 2. AUTH_SCOPE_QUICK_REFERENCE.md (8 KB)
**Purpose**: TL;DR reference guide for developers

**Contents**:
- Where scopes come from (table format)
- Three key files with code snippets
- Dual-source architecture overview
- Request flow diagram
- Common code snippets
- All API scopes (enum)
- Role scope mappings (table)
- How to add a new scope (step-by-step)
- Common issues and fixes
- Environment variables
- Database tables schema
- Testing procedures

**When to Read**: When you need quick answers or implementing features

**Key Sections**:
- TL;DR table at top
- Role Scope Mappings table
- Adding a New Scope (step-by-step)
- Common Issues section

---

### 3. AUTH_SCOPE_DETAILED_FLOW.md (24 KB)
**Purpose**: ASCII diagrams showing complete request lifecycle

**Contents**:
- Phase 1: Login flow with all steps
- Phase 2: Subsequent requests (middleware chain)
- Phase 3: GET /me endpoint
- Phase 4: PIN-based authentication
- Data flow diagram showing scope sources
- Code execution trace example (manager creating order)
- Summary matrix of components
- Critical dependencies diagram

**When to Read**: When you need to visualize how requests flow through middleware

**Key Sections**:
- Complete Request Lifecycle (with ASCII art)
- Data Flow Diagram
- Code Execution Trace Example
- Summary Matrix

---

## Quick Navigation Guide

### "How do I..."

#### ...understand where scopes come from?
Start: AUTH_SCOPE_QUICK_REFERENCE.md → "The Scope Sources" section
Then: AUTH_SCOPE_DETAILED_FLOW.md → "Data Flow Diagram"

#### ...add a new scope?
Start: AUTH_SCOPE_QUICK_REFERENCE.md → "Adding a New Scope" section
Then: AUTH_SCOPE_FLOW_TRACE.md → "Section 16: Sync Requirements"

#### ...debug a scope authorization error?
Start: AUTH_SCOPE_QUICK_REFERENCE.md → "Common Issues" section
Then: AUTH_SCOPE_DETAILED_FLOW.md → "Code Execution Trace Example"

#### ...understand the auth middleware?
Start: AUTH_SCOPE_DETAILED_FLOW.md → "PHASE 2: SUBSEQUENT REQUESTS"
Then: AUTH_SCOPE_FLOW_TRACE.md → "Section 4: PATH 3: JWT TOKEN VERIFICATION"

#### ...understand RBAC enforcement?
Start: AUTH_SCOPE_FLOW_TRACE.md → "Section 5: PATH 4: RBAC MIDDLEWARE"
Then: AUTH_SCOPE_DETAILED_FLOW.md → "Code Execution Trace Example"

#### ...understand the dual-source architecture?
Start: AUTH_SCOPE_FLOW_TRACE.md → "Section 6: SCOPE SOURCES"
Then: AUTH_SCOPE_QUICK_REFERENCE.md → "The Scope Sources (Dual Architecture)"

#### ...implement a new route with scope protection?
Start: AUTH_SCOPE_QUICK_REFERENCE.md → "Add Scope Protection to a Route"
Then: AUTH_SCOPE_FLOW_TRACE.md → "Section 10: SCOPE ASSIGNMENT SUMMARY TABLE"

---

## Key Files Referenced

### Code Files
- `/server/src/middleware/auth.ts` - JWT verification & scope extraction
- `/server/src/middleware/rbac.ts` - RBAC enforcement & ROLE_SCOPES constant
- `/server/src/routes/auth.routes.ts` - Login endpoints & scope queries
- `/server/src/middleware/restaurantAccess.ts` - Restaurant validation
- `/server/src/services/auth/pinAuth.ts` - PIN validation

### Database Files
- `/supabase/migrations/.archive/20250130_auth_tables.sql` - Initial schema
- `/supabase/migrations/20251018_add_customer_role_scopes.sql` - Customer role
- `/supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql` - Scope naming fix

### Database Tables
- `api_scopes` - Defines available scopes
- `role_scopes` - Maps roles to scopes
- `user_restaurants` - User-restaurant associations
- `user_profiles` - User profile data

---

## Critical Code Lines

### Where Scopes Are Assigned

| Location | File | Line(s) | What Happens |
|----------|------|---------|--------------|
| **Login** | auth.routes.ts | 76-85 | Query role_scopes, return scopes to client |
| **PIN Login** | auth.routes.ts | 160-169 | Query role_scopes, return scopes to client |
| **Auth Middleware** | auth.ts | 99 | Extract scope from JWT claim |
| **RBAC Middleware** | rbac.ts | 323 | Update req.user.scopes from ROLE_SCOPES constant |
| **GET /me** | auth.routes.ts | 310-319 | Query role_scopes, return scopes to client |

---

## Scope Sources (Dual Architecture)

### Source 1: Database (At Login Time)
- **Table**: `role_scopes`
- **Query**: `SELECT scope FROM role_scopes WHERE role = ?`
- **Files**: 
  - auth.routes.ts:76-85 (email login)
  - auth.routes.ts:160-169 (PIN login)
  - auth.routes.ts:310-319 (GET /me)

### Source 2: Code Constant (During API Requests)
- **File**: rbac.ts:103-181
- **Constant**: `ROLE_SCOPES: Record<string, ApiScope[]>`
- **Used by**: requireScopes() middleware

### Source 3: JWT Claims (In transit)
- **Optional**: JWT `scope` claim (if issued)
- **Used by**: authenticate() middleware at line 99
- **Current Status**: Usually empty array

---

## Role Scope Mappings Summary

| Role | Scopes | Use Case |
|------|--------|----------|
| **owner** | All 15 | Restaurant owner - full access |
| **manager** | All except system:config | Manager - no system config |
| **server** | 6 scopes | Servers - take orders, process payments |
| **cashier** | 3 scopes | Cashiers - read orders, process payments |
| **kitchen** | 2 scopes | Kitchen staff - view and update order status |
| **expo** | 2 scopes | Expo staff - view and update order status |
| **customer** | 4 scopes | Public/online customers - create orders |
| **admin** | All scopes | System admin - implicit access |

**For details**: See AUTH_SCOPE_QUICK_REFERENCE.md → "Role Scope Mappings"

---

## Available API Scopes

```
Orders:
  - orders:create
  - orders:read
  - orders:update
  - orders:delete
  - orders:status

Payments:
  - payments:process
  - payments:refund
  - payments:read

Reports:
  - reports:view
  - reports:export

Staff:
  - staff:manage
  - staff:schedule

System:
  - system:config

Menu:
  - menu:manage

Tables:
  - tables:manage
```

---

## Authentication Flow Summary

```
1. User logs in (email/password or PIN)
   ↓
2. POST /login or POST /pin-login
   ↓
3. Query role_scopes table → get scopes
   ↓
4. Return JWT token + scopes to client
   ↓
5. Client stores JWT in localStorage
   ↓
6. Client sends JWT in Authorization header
   ↓
7. authenticate() middleware extracts JWT claims
   ↓
8. req.user populated from JWT claims
   ↓
9. Optional: requireScopes() middleware validates & updates req.user.scopes
   ↓
10. Route handler accesses req.user.scopes
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SUPABASE_JWT_SECRET` | JWT verification secret | Generated by Supabase |
| `STRICT_AUTH` | Require restaurant_id in JWT | true/false |
| `AUTH_ACCEPT_KIOSK_DEMO_ALIAS` | Allow kiosk_demo → customer | true/false |
| `NODE_ENV` | Environment (affects auth handling) | development/production |

---

## Common Issues & Solutions

### Issue: "Insufficient permissions" on endpoint I should have access to
**Likely Causes**:
1. Role doesn't have required scope in ROLE_SCOPES constant
2. role_scopes table not synced with ROLE_SCOPES constant
3. User's role in user_restaurants table is different

**Solution**:
1. Check ROLE_SCOPES in rbac.ts for your role
2. Verify role_scopes table matches ROLE_SCOPES
3. Check user_restaurants table for correct role

---

### Issue: "Scopes mismatch" or sync problems
**Likely Cause**: ROLE_SCOPES constant doesn't match role_scopes table

**Solution**: Create migration to sync
```bash
# See AUTH_SCOPE_QUICK_REFERENCE.md → "Adding a New Scope" for steps
```

---

### Issue: Station tokens fail scope checks
**Status**: Known limitation - station auth doesn't include scopes

**Workaround**: Use role-based checks instead of scope-based

---

## Testing

### Test Scope Authorization
```bash
TOKEN=$(get-token)
RESTAURANT_ID="your-id"

# Test with scope protection
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"items": [...]}'

# Expected:
# - 201 Created if user has orders:create scope
# - 403 Forbidden if user lacks scope
```

---

## Migration Checklist (Adding New Scope)

- [ ] Add to ApiScope enum (rbac.ts:12-41)
- [ ] Add to ROLE_SCOPES constant (rbac.ts:103-181)
- [ ] Create database migration file
- [ ] INSERT into api_scopes table (migration)
- [ ] INSERT into role_scopes table (migration)
- [ ] Run: `supabase db push --linked`
- [ ] Verify with database query
- [ ] Test endpoint with scope protection
- [ ] Update documentation if needed

---

## Related Documentation

- ADR-006: Dual Authentication Pattern
- AUTHENTICATION_ARCHITECTURE.md (docs/)
- Migration files (supabase/migrations/)

---

## Version Information

- **Created**: November 12, 2025
- **For**: Restaurant OS v6.0
- **Last Updated**: November 12, 2025
- **Auth System Version**: P0.9 Phase 2B

---

## Summary

User scopes flow through the system via three paths:

1. **Login Time**: Database `role_scopes` table → client response
2. **Middleware**: JWT claims → req.user.scopes
3. **Enforcement**: ROLE_SCOPES constant → validation & req.user.scopes update

**Critical Rule**: ROLE_SCOPES constant MUST stay in sync with role_scopes table.

For implementation details, see the specific documents above.
