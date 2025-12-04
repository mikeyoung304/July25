---
title: Menu Item Availability Toggle Writing to Wrong Database Column
slug: menu-service-wrong-column-86-item
category: database-issues
component: menu-service
severity: P1
symptoms:
  - 86-item toggle appears to work in UI but doesn't persist to database
  - Menu item availability not updating in database after toggle
  - Database writes failing silently or updating wrong column
  - is_available column being written instead of available column
tags:
  - menu-service
  - database-schema
  - column-mismatch
  - 86-item-management
  - data-persistence
  - snake-case
related_prs:
  - 152
created: 2025-12-04
verified: true
---

# Database Field Mismatch in 86-Item Management

## Problem Description

The 86-item management feature (toggling menu item availability) was failing to persist changes to the database. When staff attempted to mark items as unavailable (or vice versa), the API would return success but the database state remained unchanged. This rendered the feature non-functional despite the UI and API layer appearing to work correctly.

The issue manifested in `server/src/services/menu.service.ts:218` where the service layer was attempting to write to a non-existent database column `is_available`, while the actual Prisma schema column was named `available`.

## Root Cause Analysis

This was a **schema-to-API naming convention mismatch** caused by inconsistent boolean field naming patterns across architectural layers:

### Layer Discrepancy

1. **API Layer Convention**: Used `is_available` following common RESTful boolean naming patterns (prefix boolean fields with `is_`, `has_`, etc.)
2. **Database Schema**: Used `available` for brevity and consistency with SQL column naming conventions
3. **Service Layer Error**: The service layer was not performing the necessary field mapping between these two conventions

### Why It Occurred

The codebase follows snake_case across all layers (per ADR-001), which correctly eliminated camelCase/snake_case transformations. However, this created a false sense of security that field names would always match 1:1 between layers. The service layer assumed the API contract field name (`is_available`) matched the database column name, bypassing the necessary field mapping.

### Code Path

```typescript
// API receives: { is_available: false }
// Service layer attempted:
const { data, error } = await supabase
  .from('menu_items')
  .update({
    is_available: updates.is_available,  // ❌ Column doesn't exist
    updated_at: new Date().toISOString()
  })
// Supabase silently ignored the unknown field
```

## Solution

The fix required mapping the API field name to the correct database column name in the service layer:

### Before (Broken)

```typescript
// server/src/services/menu.service.ts:218
const { data, error } = await supabase
  .from('menu_items')
  .update({
    is_available: updates.is_available,  // ❌ Wrong field name
    updated_at: new Date().toISOString()
  })
  .eq('id', itemId)
  .eq('restaurant_id', restaurantId)
  .select()
  .single();
```

### After (Fixed)

```typescript
// server/src/services/menu.service.ts:218
const { data, error } = await supabase
  .from('menu_items')
  .update({
    available: updates.is_available,  // ✅ Correct database column
    updated_at: new Date().toISOString()
  })
  .eq('id', itemId)
  .eq('restaurant_id', restaurantId)
  .select()
  .single();
```

### Key Changes

- **Field mapping added**: `available` (database) ← `is_available` (API)
- **Preserved API contract**: External API still accepts `is_available` for consistency
- **Service layer responsibility**: Field name transformation now correctly handled at the service boundary

## Verification

### Test Coverage

The fix was validated against the comprehensive test suite:

- **417 tests passing** (full server test suite)
- **15 new security tests** added for the menu PATCH endpoint
- **Multi-tenant validation**: Tested with both test restaurant IDs to ensure tenant isolation

### New Tests Added

File: `server/tests/menu.routes.security.test.ts`

**Authentication Tests (3):**
- Rejects unauthenticated requests
- Rejects invalid tokens
- Rejects expired tokens

**RBAC Enforcement (5):**
- Owner role can update availability
- Manager role can update availability
- Server role denied (403)
- Kitchen role denied (403)
- Customer role denied (403)

**Input Validation (4):**
- Rejects missing `is_available` field
- Rejects non-boolean `is_available`
- Accepts boolean true
- Accepts boolean false

**Multi-Tenant Isolation (3):**
- Updates only for authenticated restaurant
- Returns 404 for items in other restaurants
- Ignores X-Restaurant-ID header spoofing

## Prevention Strategies

### 1. Always Verify Column Names Against Prisma Schema

```bash
# Before implementing database operations
npx prisma db pull  # Sync schema from remote Supabase
```

Then check the generated schema:
```prisma
model menu_items {
  available  Boolean?  @default(true)  // ← Actual column name
}
```

### 2. Use Explicit Mapping Functions

When API contracts differ from database schema:

```typescript
// Boundary layer mapping
function mapApiToDb(apiData: { is_available: boolean }) {
  return {
    available: apiData.is_available  // Explicit mapping
  };
}
```

### 3. Code Review Checklist

- [ ] Do field names match the Prisma schema?
- [ ] Is there explicit mapping if API differs from DB?
- [ ] Are queries scoped to `restaurant_id`?

## Related Documentation

- **ADR-001**: Snake_case Convention for All Layers
- **ADR-010**: Remote Database as Single Source of Truth
- **CL-DB-001**: Migration Bifurcation & Schema Drift (P0 incident)
- **CL-TYPE-001**: Schema Mismatch and Type Assertions

## Key Takeaway

The remote-first database pattern (ADR-010) means the Prisma schema is the authoritative source. When API contracts use different field names than the database, **explicit mapping must occur at the service layer boundary**.
