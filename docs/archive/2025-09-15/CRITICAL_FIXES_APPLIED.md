# Critical Fixes Applied - September 10, 2025

## Overview

This document records the critical fixes applied to resolve order submission failures in the Restaurant OS v6.0.4 system.

## Issue Summary

**Problem**: Orders were failing to submit with "Failed to submit order" error, even though items were correctly displayed in the cart UI.

**Root Cause**: Authentication middleware was not assigning role-based scopes to authenticated users, causing all order submissions to fail with "Insufficient permissions" (401 error).

## Fixes Applied

### 1. Authentication Scope Assignment Fix

**File**: `/server/src/middleware/auth.ts`

**Issue**: The authentication middleware was setting user scopes from the JWT token only:
```javascript
// OLD CODE (line 126)
scopes: decoded.scope || [],  // Always empty unless JWT contains scopes
```

**Fix Applied**: Modified to use role-based scopes when JWT doesn't contain explicit scopes:
```javascript
// NEW CODE (line 127)
import { ROLE_SCOPES } from './rbac';
// ...
scopes: decoded.scope || ROLE_SCOPES[decoded.role] || [],  // Use role-based scopes if JWT doesn't have them
```

**File**: `/server/src/middleware/rbac.ts`

**Change**: Exported ROLE_SCOPES to make it available for the auth middleware:
```javascript
// Line 47 - Added export
export const ROLE_SCOPES: Record<string, ApiScope[]> = {
```

**Impact**: This ensures that users with roles like 'server', 'manager', etc., automatically receive their appropriate scopes (including 'orders:create') during authentication.

### 2. API Field Name Corrections (Previously Applied)

**File**: `/client/src/pages/hooks/useVoiceOrderWebRTC.ts`

**Issue**: Client was sending snake_case field names, but server expects camelCase.

**Fixes Applied** (lines 282-305):
- `table_number` → `tableNumber`
- `customer_name` → `customerName`
- `order_type` → `type`
- `modifications` → `modifiers` (with proper structure)
- Added required fields: `price`, `subtotal`, `tax`, `tip`

### 3. Voice Order Duplicate Prevention (Previously Applied)

**File**: `/client/src/pages/components/VoiceOrderModal.tsx`

**Fix Applied** (line 96): Disabled server-side order detection in server mode to prevent double addition:
```javascript
onOrderDetected={mode === 'kiosk' ? voiceOrder.handleOrderData : undefined}
```

### 4. Test Suite Compatibility (Already Present)

**File**: `/client/test/setup.ts`

**Status**: Vitest compatibility shim was already present on line 11:
```javascript
(global as any).jest = vi
```

## Verification Steps

1. **Test Authentication**:
   - Log in as a user with 'server' or 'manager' role
   - Check browser console for authentication details

2. **Test Order Submission**:
   - Navigate to Server View
   - Select a table and seat
   - Add items via voice or manual selection
   - Click "Submit Order"
   - Verify order is created successfully

3. **Check Server Logs**:
   - Look for successful POST to `/api/v1/orders` with 201 status
   - Verify no "Insufficient permissions" errors

## Related Configuration

### Role-Based Scopes (from rbac.ts)

The following roles have 'orders:create' scope:
- `owner`: Full access including orders:create
- `manager`: Full operational access including orders:create
- `server`: Order management including orders:create
- `kiosk_demo`: Limited access including orders:create

Roles WITHOUT 'orders:create':
- `cashier`: Payment processing only
- `kitchen`: Read-only order access
- `expo`: Read-only order access

## Testing Checklist

- [x] Authentication middleware imports ROLE_SCOPES
- [x] ROLE_SCOPES is exported from rbac.ts
- [x] Scope assignment uses role-based fallback
- [x] Server has been restarted to apply changes
- [x] Field names are in camelCase format
- [x] Required financial fields are included
- [x] Voice ordering doesn't duplicate items

## Known Issues Resolved

1. **401 Unauthorized**: Fixed by proper scope assignment
2. **Field name mismatches**: Fixed by camelCase conversion
3. **Missing required fields**: Fixed by adding price, subtotal, tax, tip
4. **Duplicate items in cart**: Fixed by disabling redundant handler

## Next Steps

If orders still fail after these fixes:

1. **Check JWT Token Contents**:
   ```javascript
   console.log('Token decoded:', decoded);
   console.log('User role:', decoded.role);
   console.log('Assigned scopes:', ROLE_SCOPES[decoded.role]);
   ```

2. **Verify Role in Database**:
   - Check user_restaurants table for correct role assignment
   - Ensure role name matches ROLE_SCOPES keys exactly

3. **Add Debug Logging**:
   ```javascript
   // In auth.ts after line 127
   logger.info('User authenticated', {
     userId: decoded.sub,
     role: decoded.role,
     scopes: req.user.scopes
   });
   ```

## Deployment Notes

**IMPORTANT**: After deploying these changes to production:
1. Restart all server instances to ensure middleware changes take effect
2. Clear any cached authentication tokens
3. Monitor logs for any authentication errors
4. Test with different user roles to verify scope assignment

---

*Fixes applied by: Claude (AI Assistant)*  
*Date: September 10, 2025*  
*Version: 6.0.4*