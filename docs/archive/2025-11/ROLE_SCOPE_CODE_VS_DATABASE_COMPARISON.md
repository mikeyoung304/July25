# ROLE SCOPE DEFINITIONS: CODE vs DATABASE COMPARISON

## COLOR CODING
- ✓ = In sync (code matches database)
- ✗ = Out of sync (mismatch found)
- ? = Unknown (requires database query to verify)
- ⚠️ = Partial/Incomplete (only partial role coverage)

---

## OWNER ROLE

### Code Definition (rbac.ts:104-120)
```typescript
owner: [
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
  ApiScope.SYSTEM_CONFIG,
  ApiScope.MENU_MANAGE,
  ApiScope.TABLES_MANAGE
]
```
**Count:** 15 scopes

### Database Definition
- **Latest Migration**: 20251029_sync_role_scopes_with_rbac_v2.sql
- **Owner mentioned?**: NO ⚠️
- **Status**: MISSING - not included in migration 20251029
- **Archived (20250130)**: YES - was included in original archived migration
- **Current State?**: UNKNOWN - depends on which migrations ran

---

## MANAGER ROLE

### Code Definition (rbac.ts:122-137)
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
  ApiScope.TABLES_MANAGE  ← KEY SCOPE
]
```
**Count:** 14 scopes
**Key feature:** INCLUDES 'tables:manage'

### Database Definition
- **Latest Migration**: 20251029_sync_role_scopes_with_rbac_v2.sql
- **Manager mentioned?**: NO ⚠️
- **Status**: MISSING - not included in migration 20251029
- **Archived (20250130)**: YES - was included in original (line 144)
- **Current State?**: UNKNOWN
- **Note**: If archived migration ran, manager should have 14 scopes with tables:manage

---

## SERVER ROLE - CRITICAL MISMATCH ✗

### Code Definition (rbac.ts:139-147)
```typescript
server: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_UPDATE,
  ApiScope.ORDERS_STATUS,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.PAYMENTS_READ
  // TABLES_MANAGE removed - servers should only update table status during service
]
```
**Count:** 6 scopes
**Key feature:** EXCLUDES 'tables:manage' (intentionally removed per comment)

### Database Definition (Migration 20251029:30-38)
```sql
INSERT INTO role_scopes (role, scope) VALUES
  ('server', 'orders:create'),
  ('server', 'orders:read'),
  ('server', 'orders:update'),
  ('server', 'orders:status'),
  ('server', 'payments:process'),
  ('server', 'payments:read'),
  ('server', 'tables:manage')   ← WRONG!
ON CONFLICT (role, scope) DO NOTHING;
```
**Count:** 7 scopes
**Mismatch:** Migration adds 'tables:manage' which code explicitly removed

### Status: OUT OF SYNC ✗
- **Migration verification expects:** 7 server scopes (lines 58-60 of 20251029)
- **Code defines:** 6 server scopes (no tables:manage)
- **Result:** If migration ran, server has extra scope that code doesn't expect

---

## KITCHEN ROLE

### Code Definition (rbac.ts:155-158)
```typescript
kitchen: [
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_STATUS
]
```
**Count:** 2 scopes

### Database Definition (Migration 20251029:40-44)
```sql
INSERT INTO role_scopes (role, scope) VALUES
  ('kitchen', 'orders:read'),
  ('kitchen', 'orders:status')
ON CONFLICT (role, scope) DO NOTHING;
```
**Count:** 2 scopes

### Status: IN SYNC ✓
- Verification expects exactly 2 kitchen scopes (line 62 of 20251029)
- Both code and migration agree
- No discrepancies found

---

## CASHIER ROLE

### Code Definition (rbac.ts:149-153)
```typescript
cashier: [
  ApiScope.ORDERS_READ,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.PAYMENTS_READ
]
```
**Count:** 3 scopes

### Database Definition
- **Latest Migration**: 20251029_sync_role_scopes_with_rbac_v2.sql
- **Cashier mentioned?**: NO ⚠️
- **Status**: MISSING - not included in migration 20251029
- **Archived (20250130)**: YES - was included in original
- **Current State?**: UNKNOWN

---

## EXPO ROLE

### Code Definition (rbac.ts:160-163)
```typescript
expo: [
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_STATUS
]
```
**Count:** 2 scopes

### Database Definition
- **Latest Migration**: 20251029_sync_role_scopes_with_rbac_v2.sql
- **Expo mentioned?**: NO ⚠️
- **Status**: MISSING - not included in migration 20251029
- **Archived (20250130)**: YES - was included in original
- **Current State?**: UNKNOWN

---

## KIOSK_DEMO ROLE (DEPRECATED)

### Code Definition (rbac.ts:165-172)
```typescript
kiosk_demo: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.MENU_MANAGE
]
```
**Count:** 4 scopes
**Status:** DEPRECATED (use 'customer' instead)

### Database Definition
- **Latest Migration**: 20251018_add_customer_role_scopes.sql
- **Kiosk_demo mentioned?**: YES (noted as preserved for backwards compatibility)
- **Column name issue?**: YES - uses 'scope_name' (WRONG)
- **Status**: PROBLEMATIC ✗
  - Migration uses wrong column name 'scope_name'
  - Unknown if data actually inserted
  - Still marked for backwards compatibility
- **Archived (20250130)**: YES

---

## CUSTOMER ROLE (NEW)

### Code Definition (rbac.ts:174-180)
```typescript
customer: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.MENU_MANAGE  // Read-only for menu viewing
]
```
**Count:** 4 scopes
**Note:** Same as kiosk_demo, replaces deprecated kiosk_demo

### Database Definition (Migration 20251018:31-37)
```sql
INSERT INTO role_scopes (role, scope_name) VALUES
  ('customer', 'menu:read'),        ← WRONG SCOPE NAME!
  ('customer', 'orders:create'),
  ('customer', 'orders:read'),
  ('customer', 'ai.voice:chat'),    ← NOT IN CODE!
  ('customer', 'payments:process')
```
**Count:** 5 scopes (DIFFERENT!)

### Status: OUT OF SYNC ✗
- **Code scope names don't match migration:**
  - Code: 'menu:manage' (for managing menu)
  - Migration: 'menu:read' (for reading menu)
- **Migration has extra scope:** 'ai.voice:chat' (not in code definition)
- **Column name issue:** Uses 'scope_name' (WRONG)
- **Unknown if data inserted** due to column name mismatch

---

## SUMMARY TABLE

| Role | Code Count | DB Count | Column Issue | Scope Content Match | Migration Status | Overall Status |
|------|-----------|----------|--------------|-------------------|------------------|----------------|
| owner | 15 | ? | ? | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| manager | 14 | ? | ? | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| server | 6 | 7 | ✓ scope | ✗ DB has extra tables:manage | 20251029 | ✗ OUT OF SYNC |
| kitchen | 2 | 2 | ✓ scope | ✓ Exact match | 20251029 | ✓ IN SYNC |
| cashier | 3 | ? | ? | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| expo | 2 | ? | ? | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| kiosk_demo | 4 | ? | ✗ scope_name | Probably not inserted | 20251018 | ✗ PROBLEMATIC |
| customer | 4 | 5 | ✗ scope_name | ✗ Scope names differ | 20251018 | ✗ OUT OF SYNC |

---

## CRITICAL FINDINGS

### IMMEDIATE CONCERNS (Verified Mismatches):
1. **Server role**: Code has 6 scopes, migration adds 7 (extra: tables:manage)
2. **Customer role**: Code has 4 scopes, migration has 5 (extra: ai.voice:chat)
3. **Customer scopes**: Migration uses 'menu:read', code uses 'menu:manage'
4. **Column naming**: Migrations 20251013 & 20251018 use wrong column 'scope_name'

### UNKNOWN (Require Database Query):
1. **Owner role**: Not updated since archived migration
2. **Manager role**: Not updated since archived migration
3. **Cashier role**: Not updated since archived migration
4. **Expo role**: Not updated since archived migration
5. **Which migrations actually ran?**

### ARCHITECTURAL ISSUES:
1. **Dual-source not in sync**: Database and code disagree on server role
2. **No verification**: No script checks code ↔ database sync
3. **Incomplete migrations**: 20251029 only handles 2 of 8 roles
4. **Schema drift**: Column names changed (scope_name → scope) without consistent updates

---

## NEXT STEPS

### Priority 1: Determine Actual Database State
```sql
-- Check schema
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'role_scopes' AND table_schema = 'public';

-- Check actual data for each role
SELECT role, COUNT(*) as scope_count FROM role_scopes 
GROUP BY role ORDER BY role;

-- Show server role scopes
SELECT scope FROM role_scopes WHERE role = 'server' ORDER BY scope;

-- Show customer role scopes
SELECT scope FROM role_scopes WHERE role = 'customer' ORDER BY scope;
```

### Priority 2: Fix Known Mismatches
```sql
-- Remove incorrect scope from server
DELETE FROM role_scopes WHERE role = 'server' AND scope = 'tables:manage';

-- Fix customer scopes
-- (After determining what's actually in database)
```

### Priority 3: Create Comprehensive Migration
- Add owner role (15 scopes)
- Add/verify manager role (14 scopes)
- Add/verify cashier role (3 scopes)
- Add/verify expo role (2 scopes)
- Fix kiosk_demo (if needed)
- Fix customer role (4 scopes with correct names)

### Priority 4: Implement Verification
- Create script to compare code ROLE_SCOPES with database
- Add to CI/CD for every deploy
- Document the procedure in RBAC file

