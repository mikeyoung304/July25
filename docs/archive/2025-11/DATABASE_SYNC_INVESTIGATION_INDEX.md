# Database Role_Scopes Synchronization Investigation - Document Index

**Investigation Date:** November 7, 2025  
**Status:** CRITICAL MISMATCHES IDENTIFIED  
**Risk Level:** HIGH  

---

## Quick Navigation

### For Decision Makers
Start here if you need a high-level understanding of the issues:
- **[DATABASE_SYNC_EXECUTIVE_SUMMARY.txt](DATABASE_SYNC_EXECUTIVE_SUMMARY.txt)** (8.9 KB)
  - Visual timeline of migrations
  - Risk assessment
  - Required actions

### For Developers
Start here if you need to understand and fix the issues:
- **[DATABASE_SYNC_QUICK_REFERENCE.txt](DATABASE_SYNC_QUICK_REFERENCE.txt)** (7.8 KB)
  - Immediate actions (4 steps)
  - SQL queries to run
  - Key file locations
  - Naming convention rules

### For Deep Dive Analysis
Start here if you need complete details:
- **[DATABASE_ROLE_SCOPES_SYNC_INVESTIGATION.md](DATABASE_ROLE_SCOPES_SYNC_INVESTIGATION.md)** (14 KB)
  - Executive summary
  - All 5 critical issues detailed
  - Evidence and references
  - Step-by-step recommendations

### For Role Comparison
Start here if you need to compare individual roles:
- **[ROLE_SCOPE_CODE_VS_DATABASE_COMPARISON.md](ROLE_SCOPE_CODE_VS_DATABASE_COMPARISON.md)** (9.2 KB)
  - Role-by-role definitions
  - Code vs database comparison
  - Summary table
  - Specific mismatches

---

## Critical Issues at a Glance

### Issue 1: Column Name Mismatch
- **Where:** Migrations 20251013 & 20251018
- **Problem:** Using `scope_name` column instead of `scope`
- **Impact:** Data may not insert correctly
- **Status:** Needs database verification

### Issue 2: Server Role Permission Mismatch
- **Code:** 6 scopes (NO tables:manage)
- **Database:** 7 scopes (YES tables:manage)
- **Impact:** Server users have unexpected permissions
- **Status:** Code explicitly removed this permission

### Issue 3: Customer Role Mismatch
- **Code:** 4 scopes with `menu:manage`
- **Database:** 5 scopes with `menu:read` + `ai.voice:chat`
- **Impact:** Scope names don't match
- **Status:** Data may not exist due to column issue

### Issue 4: Incomplete Migrations
- **Coverage:** Only 2 of 8 roles (server, kitchen)
- **Missing:** owner, manager, cashier, expo, customer
- **Status:** Unknown which migrations ran in production

### Issue 5: No Verification
- **Gap:** No automated sync validation
- **Risk:** Mismatches accumulate silently
- **Solution:** Need CI/CD checks

---

## Role Scope Status Summary

| Role | Code Count | DB Status | Issue | Status |
|------|-----------|-----------|-------|--------|
| owner | 15 | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| manager | 14 | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| server | 6 | 7 | Extra tables:manage | ✗ OUT OF SYNC |
| kitchen | 2 | 2 | Perfect match | ✓ IN SYNC |
| cashier | 3 | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| expo | 2 | ? | Missing from 20251029 | ⚠️ UNKNOWN |
| customer | 4 | 5 | Wrong scope names | ✗ OUT OF SYNC |
| kiosk_demo | 4 | ? | Wrong column name | ✗ PROBLEMATIC |

---

## Manager Role Verification: tables:manage Status

**Question:** Does manager have `tables:manage` in the database?

**Answer:** **PROBABLY YES** (but unconfirmed)

**Evidence:**
- Code includes it (line 136 of rbac.ts)
- Archived migration includes it (line 144 of 20250130_auth_tables.sql)
- Not mentioned in 20251029, but may exist from earlier migrations

**How to Verify:**
```sql
SELECT scope FROM role_scopes WHERE role = 'manager' ORDER BY scope;
```

**Expected Result:**
```
orders:create
orders:delete
orders:read
orders:status
orders:update
payments:process
payments:read
payments:refund
reports:export
reports:view
staff:manage
staff:schedule
tables:manage
menu:manage
```

---

## Key Files to Reference

### Code Definition
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts`

Key sections:
- **Lines 12-41:** ApiScope enum with all available scopes
- **Lines 43-102:** Dual-source architecture documentation
- **Lines 103-181:** ROLE_SCOPES constant with all role definitions
- **Lines 122-137:** Manager role definition (14 scopes)
- **Lines 139-147:** Server role definition (6 scopes)
- **Lines 174-180:** Customer role definition (4 scopes)

### Database Schema (Prisma)
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/prisma/schema.prisma`

Key sections:
- **Lines 403-409:** `api_scopes` model
- **Lines 595-604:** `role_scopes` model

### Migration Files
**Location:** `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/`

- **20251029_sync_role_scopes_with_rbac_v2.sql** (Latest, partial fix)
- **20251018_add_customer_role_scopes.sql** (Problematic - wrong column)
- **20251013_emergency_kiosk_demo_scopes.sql** (Problematic - wrong column)
- **.archive/20250130_auth_tables.sql** (Original, archived)

---

## Immediate Actions Required

### Step 1: Query Production Database
```bash
psql $DATABASE_URL
```

Check schema:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'role_scopes' AND table_schema = 'public';
```

Check data:
```sql
SELECT role, COUNT(*) FROM role_scopes GROUP BY role;
SELECT scope FROM role_scopes WHERE role = 'server' ORDER BY scope;
SELECT scope FROM role_scopes WHERE role = 'manager' ORDER BY scope;
```

### Step 2: Analyze Results
- If `scope_name` column exists → Migrations 20251013/20251018 ran
- If `scope` column exists → 20251029 may have run
- Check each role to see what scopes exist

### Step 3: Create Corrective Migration
Based on Step 2 findings, create new migration to:
- Fix server role (remove tables:manage)
- Fix customer role (use correct scope names)
- Add all missing roles (owner, manager, cashier, expo)

### Step 4: Verify and Monitor
- Confirm all roles have correct scopes
- Test each role's permissions
- Add to CI/CD verification

---

## Database Schema

### api_scopes Table
```
scope (TEXT, PRIMARY KEY)     - The scope identifier like 'orders:create'
description (TEXT, nullable)  - Human readable description
```

### role_scopes Table
```
role (TEXT)                   - The role name like 'manager', 'server'
scope (TEXT, FOREIGN KEY)     - References api_scopes.scope
Composite Primary Key: [role, scope]
Indexes: idx_role_scopes_role, idx_role_scopes_scope
```

### Manager Role Expected Scopes (14 total)
1. orders:create
2. orders:read
3. orders:update
4. orders:delete
5. orders:status
6. payments:process
7. payments:refund
8. payments:read
9. reports:view
10. reports:export
11. staff:manage
12. staff:schedule
13. menu:manage
14. **tables:manage** - KEY SCOPE for restaurant management

---

## Dual-Source Architecture Overview

### Database Source (Client-side Authorization)
- Queried during login
- Embedded in JWT token
- Client uses to show/hide UI elements
- Location: `api_scopes` + `role_scopes` tables

### Code Source (Server-side API Protection)
- No database query per request (performance)
- Uses `requireScopes()` middleware
- Checks JWT scopes against code definitions
- Location: `server/src/middleware/rbac.ts` (ROLE_SCOPES constant)

### Critical Requirement
**These MUST stay in sync!**

Current Status: **NOT IN SYNC**
- Server role differs (code: 6 scopes, DB migration: 7 scopes)
- Customer role differs (scope names don't match)
- Multiple roles missing from recent migrations

---

## Naming Convention Standards

### Correct Format
Pattern: `resource:action` (with COLON)

Examples:
- `orders:create` - Create new orders
- `orders:read` - View orders
- `tables:manage` - Full table management
- `menu:read` - View menu items

### Wrong Format (NEVER USE)
Pattern: `resource.action` (with DOT)

Examples:
- `orders.write` - DON'T USE
- `menu.read` - DON'T USE
- `tables.manage` - DON'T USE

### Action Types
- **create:** Create new records
- **read:** View records
- **update:** Modify existing records
- **delete:** Remove records
- **status:** Update status only
- **manage:** Full management of resource
- **process:** Process operations (e.g., payments:process)
- **refund:** Refund operations
- **schedule:** Scheduling operations

---

## Migration History Timeline

```
2025-01-30: 20250130_auth_tables.sql (ARCHIVED)
  └─ Complete initial role/scope definitions
     └─ Uses scope_name column

2025-10-13: 20251013_emergency_kiosk_demo_scopes.sql
  └─ Creates/updates kiosk_demo scopes
  └─ PROBLEM: Uses scope_name column (doesn't exist)
  └─ Status: Likely failed

2025-10-18: 20251018_add_customer_role_scopes.sql
  └─ Adds customer role scopes
  └─ PROBLEM: Uses scope_name column (doesn't exist)
  └─ PROBLEM: Scope names don't match code
  └─ Status: Likely failed

2025-10-29: 20251029_sync_role_scopes_with_rbac_v2.sql
  └─ Sync server and kitchen with RBAC code
  └─ Uses correct scope column
  └─ PROBLEM: Adds tables:manage to server (contradicts code)
  └─ PROBLEM: Only covers 2 of 8 roles
  └─ Status: Likely partial success
```

---

## Risk Assessment

### Current Risk Level: HIGH

**Potential Issues:**
1. API requests fail with 403 Forbidden (scope mismatch)
2. Users see UI elements for features they lack permissions for
3. JWT tokens have scopes that don't match API checks
4. Server users may access restricted features
5. Some roles entirely missing their permissions

**Impact on Users:**
- Server users may have unexpected table management abilities
- Managers may have unexpected table management abilities
- Customers may see voice ordering options that don't work
- Entire roles (owner, expo, etc.) may be missing permissions

---

## Long-Term Solutions

### 1. Automated Verification
Create script: `scripts/verify-rbac-sync.sh`
- Compare code ROLE_SCOPES with database
- Run after every deployment
- Fail if mismatch detected

### 2. CI/CD Integration
Add to deployment pipeline:
- Check code ↔ database sync
- Block deployment if out of sync
- Log all scope changes

### 3. Documentation
Update RBAC documentation:
- Clear dual-source architecture overview
- Step-by-step sync procedures
- Troubleshooting guide
- Common pitfalls

### 4. Monitoring
Implement permission monitoring:
- Log when permissions are checked
- Alert on scope mismatches
- Track API access denied events
- Monitor role changes

---

## Document Summary

| Document | Size | Purpose | Audience |
|----------|------|---------|----------|
| DATABASE_SYNC_EXECUTIVE_SUMMARY.txt | 8.9 KB | High-level overview | Managers, Decision makers |
| DATABASE_SYNC_QUICK_REFERENCE.txt | 7.8 KB | Developer quick start | Developers, DevOps |
| DATABASE_ROLE_SCOPES_SYNC_INVESTIGATION.md | 14 KB | Complete analysis | Architects, Senior devs |
| ROLE_SCOPE_CODE_VS_DATABASE_COMPARISON.md | 9.2 KB | Role comparison | Devs, QA, Testers |
| DATABASE_SYNC_INVESTIGATION_INDEX.md | This file | Navigation hub | Everyone |

---

## How to Use This Investigation

1. **If you're a manager:** Read DATABASE_SYNC_EXECUTIVE_SUMMARY.txt
2. **If you're a developer:** Read DATABASE_SYNC_QUICK_REFERENCE.txt
3. **If you need details:** Read DATABASE_ROLE_SCOPES_SYNC_INVESTIGATION.md
4. **If you're comparing roles:** Read ROLE_SCOPE_CODE_VS_DATABASE_COMPARISON.md
5. **If you need to navigate:** You're reading the right file now!

---

## Questions & Answers

### Q: Does manager have tables:manage in the database?
**A:** Probably yes, but needs verification. Code includes it, archived migration includes it.

### Q: What's the status of the customer role?
**A:** Out of sync. Migration has wrong scope names and wrong column reference.

### Q: Which migrations actually ran in production?
**A:** Unknown. Requires database query to determine (check if scope_name or scope column exists).

### Q: What should I do first?
**A:** Connect to production database and run the queries in Step 1 of DATABASE_SYNC_QUICK_REFERENCE.txt

### Q: Is this critical?
**A:** Yes. Authorization may fail silently or grant unexpected permissions.

---

**Investigation Completed:** November 7, 2025  
**Status:** Ready for database verification and corrective action  
**Severity:** Critical - High risk to production authorization

