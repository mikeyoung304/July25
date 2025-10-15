# Agent 1: Multi-Tenancy Guardian

**Priority**: CRITICAL
**Estimated Runtime**: 30-45 minutes
**Focus**: Data leak prevention through restaurant_id enforcement

## Mission

Scan the entire codebase to identify potential data leak vulnerabilities where `restaurant_id` filtering is missing or improperly implemented. This is enterprise-critical as multi-tenant data leaks can expose customer data across restaurant boundaries.

## Why This Matters

Based on git history analysis, your architecture requires **EVERY database operation** to include `restaurant_id` filtering. Missing this filter can expose:
- Order data across restaurants
- Customer PII across tenants
- Menu items and pricing across competitors
- Financial transactions across businesses

## Scan Strategy

### 1. Database Query Analysis
**Target Files**: `server/src/routes/**/*.ts`, `server/src/services/**/*.ts`

**Detection Steps**:
1. Glob for all TypeScript files in server/
2. Grep for Supabase query patterns:
   - `.from('table_name')`
   - `.select()`
   - `.insert()`
   - `.update()`
   - `.delete()`
3. For each match, analyze if query chain includes:
   - `.eq('restaurant_id', restaurant_id)` OR
   - `.eq('restaurant_id', req.user.restaurant_id)` OR
   - Proper WHERE clause with restaurant_id

**Example Violation**:
```typescript
// ❌ CRITICAL VIOLATION
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('status', 'pending');  // Missing restaurant_id filter!

// ✅ CORRECT
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', req.user.restaurant_id)
  .eq('status', 'pending');
```

### 2. API Endpoint Validation
**Target Files**: `server/src/routes/**/*.ts`

**Detection Steps**:
1. Find all Express route handlers (GET, POST, PUT, DELETE)
2. Verify each route extracts `restaurant_id`:
   - From `req.user.restaurant_id`
   - From authenticated session
   - Never from client input (req.body.restaurant_id is suspicious!)
3. Check that restaurant_id is used in all downstream queries

**Example Violation**:
```typescript
// ❌ CRITICAL VIOLATION - Accepting restaurant_id from client
router.post('/orders', async (req, res) => {
  const { restaurant_id, order_data } = req.body;  // DANGEROUS!
  // Attacker can set any restaurant_id
});

// ✅ CORRECT - Using authenticated restaurant_id
router.post('/orders', async (req, res) => {
  const { restaurant_id } = req.user;  // From auth token
  const { order_data } = req.body;
  // Safe - restaurant_id from trusted source
});
```

### 3. RLS Policy Verification
**Target**: Supabase Dashboard policies (reference in code comments)

**Detection Steps**:
1. Search for comments mentioning RLS or "Row Level Security"
2. Check for tables that should have RLS but may not
3. Flag any table that stores restaurant-specific data without RLS policy

### 4. Test Coverage Analysis
**Target Files**: `**/*.test.ts`, `**/*.spec.ts`

**Detection Steps**:
1. Search for multi-tenant test scenarios
2. Flag test files that don't test with multiple restaurant IDs
3. Look for test data using the standard restaurant IDs:
   - `11111111-1111-1111-1111-111111111111`
   - `22222222-2222-2222-2222-222222222222`

## Detection Patterns

### Critical Violations (Severity: CRITICAL)
- [ ] Supabase query without restaurant_id in WHERE clause
- [ ] API endpoint accepting restaurant_id from client (req.body/req.query)
- [ ] Bulk operations (delete, update) without restaurant_id scoping
- [ ] JOIN queries that don't enforce restaurant_id on all tables

### High-Risk Patterns (Severity: HIGH)
- [ ] Optional restaurant_id filtering (if/else branches)
- [ ] Raw SQL queries without parameterized restaurant_id
- [ ] Cached queries that don't include restaurant_id in cache key
- [ ] WebSocket broadcasts without restaurant_id scoping

### Medium-Risk Patterns (Severity: MEDIUM)
- [ ] Test files without multi-tenant scenarios
- [ ] Missing restaurant_id validation in middleware
- [ ] Admin endpoints without restaurant_id audit logging

## Report Template

Generate report at: `/scans/reports/[timestamp]/multi-tenancy-guardian.md`

```markdown
# Multi-Tenancy Guardian - Overnight Scan Report

**Generated**: [ISO timestamp]
**Scan Duration**: [time in minutes]
**Files Scanned**: [count]

## Executive Summary

[2-3 sentence overview of findings]

**Total Issues Found**: X
- CRITICAL: X (immediate data leak risk)
- HIGH: X (potential data leak risk)
- MEDIUM: X (weak multi-tenancy)

**Estimated Fix Effort**: X hours
**Recommended Priority**: Fix CRITICAL issues within 24 hours

## Critical Findings

### 1. [File Path:Line] - Missing restaurant_id Filter
**Severity**: CRITICAL
**Table**: orders
**Risk**: All restaurants can see each other's orders

**Current Code**:
```typescript
const orders = await supabase
  .from('orders')
  .select('*');
```

**Recommended Fix**:
```typescript
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', req.user.restaurant_id);
```

**Impact**: Immediate data leak - orders from all restaurants exposed
**Effort**: 5 minutes (add one line)

[Repeat for each CRITICAL finding]

## High-Risk Findings

[Same format as above, but for HIGH severity]

## Medium-Risk Findings

[Same format as above, but for MEDIUM severity]

## Statistics

### Files with Issues
- Total files scanned: X
- Files with violations: Y (Z%)
- Clean files: A (B%)

### Most Problematic Files
1. server/src/routes/orders.ts - 5 violations
2. server/src/services/menu.ts - 3 violations
[etc.]

### Issue Distribution
- Database queries: X issues
- API endpoints: Y issues
- Test coverage: Z gaps

## Affected Tables
- `orders` - X violations
- `menu_items` - Y violations
- `customers` - Z violations

## Test Coverage Gaps

Files without multi-tenant tests:
- [ ] server/src/routes/orders.test.ts
- [ ] server/src/services/menu.test.ts

## Next Steps

### Immediate Actions (Today)
1. Fix CRITICAL violations in [file list]
2. Review API endpoints accepting restaurant_id from client
3. Add restaurant_id validation middleware

### Short-term (This Week)
1. Fix HIGH severity violations
2. Add multi-tenant test scenarios
3. Audit RLS policies in Supabase Dashboard

### Long-term (This Sprint)
1. Create restaurant_id validation utility
2. Add ESLint rule to enforce restaurant_id in queries
3. Implement automatic multi-tenant test generation

## Validation Checklist

Before marking this scan as complete, verify:
- [ ] All .from() calls analyzed
- [ ] All API routes checked for restaurant_id extraction
- [ ] Test files scanned for multi-tenant coverage
- [ ] File:line references are accurate
- [ ] Fix suggestions are tested and valid
```

## Success Criteria

- [ ] All TypeScript files in server/ scanned
- [ ] All Supabase client queries analyzed
- [ ] At least 50 files reviewed
- [ ] Report generated with accurate file:line references
- [ ] Findings categorized by severity
- [ ] Fix suggestions provided for all CRITICAL issues
- [ ] Executive summary provides actionable next steps

## Tools to Use

- **Glob**: Find all .ts files in server/
- **Grep**: Search for `.from(`, `.select(`, `.eq('restaurant_id'`
- **Read**: Examine files with suspicious patterns
- **Bash**: Run TypeScript compiler to verify syntax

## Exclusions

Do NOT flag:
- Test files that explicitly test cross-restaurant scenarios (by design)
- Admin endpoints that legitimately query across restaurants (but flag if no audit logging)
- Migration scripts (but review for safety)
- Utility functions that don't touch the database

## Output Requirements

1. Save report to `/scans/reports/[timestamp]/multi-tenancy-guardian.md`
2. Include summary statistics at the top
3. Sort findings by severity (CRITICAL first)
4. Limit to top 20 most critical findings (full list in appendix)
5. Use file:line format for easy navigation in IDE
6. Include code samples for context
7. Estimate fix effort for each finding

## Example Finding Format

```markdown
### Finding #1: Unfiltered Order Query
**File**: server/src/routes/orders.ts:45
**Severity**: CRITICAL
**Table**: orders
**Impact**: All restaurants can access each other's orders

**Code Context**:
```typescript
// Line 43-47
router.get('/orders', async (req, res) => {
  const orders = await supabase.from('orders').select('*');  // ← VIOLATION
  res.json(orders);
});
```

**Fix**:
```typescript
router.get('/orders', async (req, res) => {
  const { restaurant_id } = req.user;
  const orders = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurant_id);  // ← ADD THIS
  res.json(orders);
});
```

**Effort**: 2 minutes
**Testing**: Verify with two restaurant IDs to ensure data isolation
```

## End of Agent Definition
