# Server Order Placement Flow - Ultrathink Diagnostic Report
**Date:** 2025-11-08
**Investigation Type:** Comprehensive Root Cause Analysis
**Methods Used:** MCP Sequential Thinking + Multi-Agent Codebase Exploration

---

## Executive Summary

This diagnostic report identifies and analyzes two critical issues in the server order placement flow:

1. **CRITICAL BUG: Manager Permission Denial** - Database column name mismatch prevents ALL users from receiving scopes in their JWT tokens
2. **UX Issue: Missing Input Method Selection** - No explicit "Voice vs Tap Screen" choice before order entry

---

## Issue #1: Manager "No Permission" Error 🚨 CRITICAL

### Problem Statement
Managers attempting to place orders from the server view see a disabled button with the message "Voice Order (No Permission)" despite the manager role being configured with `orders:create` permission.

### Root Cause Analysis

#### The Bug (CRITICAL)
**File:** `server/src/routes/auth.routes.ts`
**Lines:** 78, 162, 312

```typescript
// ❌ WRONG - Queries non-existent column
const { data: scopesData, error: scopesError } = await supabase
  .from('role_scopes')
  .select('scope')  // ✅ Fixed: column is 'scope' not 'scope_name' ← WRONG COMMENT!
  .eq('role', userRole.role);

const scopes = scopesData?.map(s => s.scope) || [];  // Returns empty array
```

**The comment claims this is "fixed" but it's actually BROKEN.**

#### Database Schema (CORRECT)
**File:** `supabase/migrations/20251013_emergency_kiosk_demo_scopes.sql`
**Lines:** 16-22

```sql
CREATE TABLE IF NOT EXISTS role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  scope_name TEXT REFERENCES api_scopes(scope_name) ON DELETE CASCADE,  -- ✓ Column is 'scope_name'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, scope_name)
);
```

#### What Happens

1. **Login Flow:**
   - User logs in with manager role
   - Auth endpoint queries: `.select('scope')` from role_scopes table
   - Database has `scope_name` column, NOT `scope` column
   - Query returns NULL or empty for the scope field
   - JWT token gets `scopes: []` (empty array)

2. **Permission Check (Client):**
   - `ServerView.tsx:31`: `const canCreateOrders = hasScope('orders:create')`
   - `hasScope` checks: `user?.scopes?.includes('orders:create')`
   - Returns `false` because scopes array is empty
   - UI shows disabled button

3. **Permission Check (Server):**
   - `orders.routes.ts:66-70`: Checks `req.user.scopes.includes(ApiScope.ORDERS_CREATE)`
   - Throws `Unauthorized('Missing required scope: orders:create')`

#### Evidence Trail

| Location | Line(s) | Issue |
|----------|---------|-------|
| `auth.routes.ts` | 78, 85 | Selects wrong column `scope` instead of `scope_name` |
| `auth.routes.ts` | 162 | PIN login - same bug |
| `auth.routes.ts` | 312 | GET /auth/me - same bug |
| `20251013_emergency_kiosk_demo_scopes.sql` | 19 | Database schema defines `scope_name` |
| `ServerView.tsx` | 30-31 | Client checks empty scopes array |
| `SeatSelectionModal.tsx` | 141-167 | Shows "No Permission" UI |

#### Impact
- **ALL ROLES** are affected (not just managers)
- No user can place orders because scopes are never loaded into JWT
- Affects: servers, managers, owners - anyone using authenticated order placement
- Does NOT affect anonymous customer orders (kiosk/online flows)

---

## Issue #2: Input Method Selection Flow

### Problem Statement
Expected behavior: After clicking table/seat, server should be asked "Voice input or Tap screen input?"
Actual behavior: Directly opens VoiceOrderModal with voice mode as default, with inline toggle to switch modes.

### Current Flow

```
User clicks table
    ↓
SeatSelectionModal opens
    ↓
User selects seat
    ↓
"Start Voice Order" button appears ← ONLY VOICE OPTION
    ↓
User clicks button
    ↓
VoiceOrderModal opens with inputMode='voice' (hardcoded default)
    ↓
User can toggle to touch mode INSIDE the modal ← NOT EXPLICIT CHOICE
```

### Expected Flow

```
User clicks table
    ↓
SeatSelectionModal opens
    ↓
User selects seat
    ↓
TWO BUTTONS appear:
  - "Start Voice Order"
  - "Start Touch Order"  ← MISSING
    ↓
User makes explicit choice
    ↓
VoiceOrderModal opens with selected mode as initial state
```

### Code Analysis

#### Current Implementation
**File:** `client/src/pages/components/SeatSelectionModal.tsx`
**Lines:** 141-167

```tsx
{canCreateOrders ? (
  <ActionButton
    onClick={onStartVoiceOrder}  // ← Only voice option
    disabled={!selectedSeat}
    color="#4ECDC4"
  >
    Start Voice Order
  </ActionButton>
) : (
  // Permission denied UI
)}
```

**File:** `client/src/pages/components/VoiceOrderModal.tsx`
**Line:** 60

```tsx
const [inputMode, setInputMode] = useState<OrderInputMode>('voice')  // ← Hardcoded default
```

#### Component Locations

| Component | File | Purpose |
|-----------|------|---------|
| `OrderInputSelector` | `client/src/components/shared/OrderInputSelector.tsx:44-177` | Voice/Touch toggle (exists but buried) |
| `SeatSelectionModal` | `client/src/pages/components/SeatSelectionModal.tsx` | Seat picker with single voice button |
| `VoiceOrderModal` | `client/src/pages/components/VoiceOrderModal.tsx` | Order builder with inline mode switch |

#### What's Missing
1. **No "Start Touch Order" button** in SeatSelectionModal
2. **No intermediate modal** asking for input method choice
3. **No way to pass initial mode** to VoiceOrderModal
4. **Input method selection is secondary**, not primary user choice

---

## Solutions & Fixes

### Fix #1: Database Column Name Bug (CRITICAL - P0)

#### Required Changes

**File:** `server/src/routes/auth.routes.ts`

**Location 1 - Lines 76-85 (Login endpoint):**
```typescript
// ✅ CORRECT FIX
const { data: scopesData, error: scopesError } = await supabase
  .from('role_scopes')
  .select('scope_name')  // ← Change from 'scope' to 'scope_name'
  .eq('role', userRole.role);

if (scopesError) {
  logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
}

const scopes = scopesData?.map(s => s.scope_name) || [];  // ← Change from s.scope to s.scope_name
```

**Location 2 - Lines 159-169 (PIN login):**
```typescript
// Same fix needed
const { data: scopesData, error: scopesError } = await supabase
  .from('role_scopes')
  .select('scope_name')  // ← Change
  .eq('role', userRole.role);

const scopes = scopesData?.map(s => s.scope_name) || [];  // ← Change
```

**Location 3 - Lines 308-319 (GET /auth/me):**
```typescript
// Same fix needed
const { data: scopesData, error: scopesError } = await supabase
  .from('role_scopes')
  .select('scope_name')  // ← Change
  .eq('role', userRole.role);

const scopes = scopesData?.map(s => s.scope_name) || [];  // ← Change
```

---

## Recommendations

1. **Immediate Action Required:**
   - Fix database column name bug in auth.routes.ts (3 locations)
   - Deploy to production ASAP
   - Test with all user roles

2. **Follow-up Actions:**
   - Implement dual button UI for input method selection
   - Add integration tests for scope loading
   - Add database migration validation to prevent column name mismatches

3. **Prevention:**
   - Add type safety for database queries (use TypeScript with Supabase types)
   - Code review checklist item: "Verify database column names match query"
   - Add E2E test: "Manager can place order" (would have caught this bug)

---

**End of Report**
