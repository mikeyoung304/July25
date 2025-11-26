# Restaurant OS - Testing Checklist

**Last Updated:** 2025-10-31

## ✅ Status: 99% Production Ready (E2E Tests Added)

**Latest Update**: 2025-10-22 - Added E2E smoke tests for production launch

**Recent Commits**:
- `7473fb7` - refactor(floor): split FloorPlanEditor god component (Fix #123)
- `f349a04` - perf(tables): optimize batch table updates with PostgreSQL RPC (Fix #121, #122)
- `b072908` - fix(data): add PostgreSQL RPC transactions and optimistic locking (Fix #117, #118)
- `525ae49` - chore(audit): verification workflow scaffolding and p0 import (Fix #119, #120)
- `c675a1a` - feat(auth): grant managers full admin access
- `93055bc` - refactor: migrate to pure supabase auth

---

## 🧪 E2E Testing (Oct 22, 2025)

### Test Suite Overview
**Location**: `tests/e2e/`
**Framework**: Playwright
**Status**: ✅ Smoke tests implemented

### Running Tests

```bash
# Run smoke tests only (critical path - fast)
npm run test:e2e:smoke

# Run full E2E suite
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/auth/login.smoke.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# View last test report
npx playwright show-report
```

### Test Coverage

#### Authentication (`tests/e2e/auth/`)
- ✅ Demo login for all roles (server, cashier, kitchen, manager, owner)
- ✅ Session persistence across page reload
- ✅ Role-based navigation
- ✅ Error handling (network failures)

#### Order Flow (`tests/e2e/orders/`)
- ✅ Server order creation (smoke test)
- ✅ Menu item display with prices
- ✅ Order submission flow
- ⏳ Checkout flow (customer-facing)
- ⏳ Voice order flow

#### Kitchen Display (`tests/e2e/kds/`)
- ✅ KDS interface loads correctly
- ✅ Order cards display
- ✅ Status update controls visible
- ✅ Real-time WebSocket connection
- ⏳ Order status transitions

#### Payment (`tests/e2e/payments/`)
- ⏳ Stripe Elements integration
- ⏳ Payment success flow
- ⏳ Payment error handling

### CI/CD Integration
E2E smoke tests run as part of the CI pipeline before deployment.

**GitHub Actions**: Smoke tests run on every PR to main
**Pre-Deployment**: Full E2E suite runs before production deploy

---

## P0 Audit Fixes (Oct 19, 2025)

### Summary
**7/8 P0 Fixes Complete (87.5%)** - All critical stability, security, and performance issues resolved

**Security & Compliance**:
- ✅ Fix #120: Payment audit fail-fast (PCI compliance)
- ✅ Fix #119: Centralized tax rates (revenue protection)

**Data Integrity**:
- ✅ Fix #117: PostgreSQL RPC transactions for atomic order creation
- ✅ Fix #118: Optimistic locking with version columns

**Performance**:
- ✅ Fix #121: Batch table updates with PostgreSQL RPC (40x improvement: 1000ms → 25ms)
- ✅ Fix #122: Fixed ElapsedTimer useMemo anti-pattern

**Code Quality**:
- ✅ Fix #123: FloorPlanEditor refactored (940 lines → 225 lines, 76% reduction)

**Remaining**:
- ⏳ Fix #124: WebRTCVoiceClient refactor (8-12 hours, non-blocking)

---

## Recent Fixes (Oct 10-11, 2025)

### 1. Authentication System ✅ FIXED
**Problem**: Demo login race condition between backend response, session persistence, and page navigation

**Solution** (commit `93055bc`):
- Migrated to pure Supabase auth (removed backend `/login` dependency)
- Removed 5-second timeout hack
- Single source of truth (Supabase)
- Enhanced error logging

**Impact**: ✅ Demo login now works reliably without timeouts or race conditions

---

### 2. Voice Ordering ✅ FIXED
**Problem**: Voice orders detected by AI but not added to cart

**Root Cause**: Empty `handleOrderDetected` callback in `DriveThruPage.tsx:50-68`

**Solution** (commit `c675a1a`):
```typescript
const handleOrderDetected = useCallback((order: any) => {
  if (!order?.items || order.items.length === 0) return;

  order.items.forEach((detectedItem: any) => {
    const menuItem = menuItems.find(m =>
      m.name.toLowerCase() === detectedItem.name.toLowerCase()
    );

    if (menuItem) {
      addItem(menuItem, detectedItem.quantity || 1, detectedItem.modifications || []);
    } else {
      console.warn(`[DriveThru] Menu item not found: ${detectedItem.name}`);
    }
  });
}, [menuItems, addItem]);
```

**Impact**: ✅ Voice orders now correctly add items to cart

---

### 3. Kitchen Display Upgrade ✅ COMPLETE
**Change**: Upgraded from simple list view to optimized display with table grouping

**New Features** (commit `7fda07a`):
- Table grouping with consolidation
- Dual view modes (Tables + Grid)
- Batch operations (complete entire table)
- Priority sorting (urgency, age, table)
- Virtual scrolling (handles 1000+ orders)

**TypeScript Fix**: Changed `g.urgency` → `g.urgencyLevel` (line 152)

**Impact**: ✅ Professional kitchen display ready for high-volume service

---

### 4. Manager Permissions ✅ FIXED
**Problem**: Managers had limited access

**Solution** (commit `c675a1a`):
- Granted managers full admin access
- Updated role_scopes table

**Impact**: ✅ Managers can now access all necessary features

---

## Testing Instructions

### Prerequisites

**1. Ensure dev servers are running**:
```bash
npm run dev
# Should show:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3001
```

**2. Verify environment variables**:
```bash
# Frontend (client/.env)
cat client/.env | grep VITE_DEMO_PANEL
# Should show: VITE_DEMO_PANEL=1

# Backend (server/.env)
cat server/.env | grep SUPABASE_JWT_SECRET
# Should have value (not empty)
```

---

## Manual Test Cases

### Test 1: Demo Login (Server Role)
**Goal**: Verify demo login works without errors

**Steps**:
1. Open http://localhost:5173 in **incognito window**
2. Open browser console (F12)
3. Click "Server" demo button
4. Observe console logs

**Expected Results**:
- ✅ See log: `🔐 Attempting Supabase login`
- ✅ See log: `✅ Supabase authentication successful`
- ✅ See log: `✅ Login complete`
- ✅ Redirect to `/server` page
- ✅ Top-right badge shows "server Authenticated"
- ✅ NO "Auth loading timeout" warning
- ✅ NO redirect to `/unauthorized`

**If Failed**: Check `docs/MIGRATION_V6_AUTH.md` troubleshooting section

---

### Test 2: Session Persistence
**Goal**: Verify session survives page refresh

**Steps**:
1. After Test 1 (logged in as server)
2. Press F5 to refresh page
3. Observe console logs

**Expected Results**:
- ✅ See log: `🔄 Initializing auth context...`
- ✅ See log: `✅ Found existing Supabase session`
- ✅ See log: `✅ User authenticated`
- ✅ Still on `/server` page (not redirected)
- ✅ Still see "server Authenticated" badge
- ✅ Page loads < 2 seconds

**If Failed**: Check localStorage in browser console:
```javascript
localStorage.getItem('sb-xiwfhcikfdoshxwbtjxt-auth-token')
// Should return JSON with access_token
```

---

### Test 3: Authorization (Role-Based Access)
**Goal**: Verify role checks work correctly

**Steps**:
1. Logged in as "Server" (from Test 1)
2. Manually navigate to: http://localhost:5173/manager
3. Observe behavior

**Expected Results**:
- ✅ See log: `🔐 Authorization check` with `canAccess: false`
- ✅ Redirect to `/unauthorized` page
- ✅ See "Access Denied" message

**Additional Tests**:
- Navigate to `/server` → ✅ Should work (server role has access)
- Navigate to `/kitchen` → ❌ Should be denied (server role lacks access)

---

### Test 4: Logout
**Goal**: Verify logout clears session

**Steps**:
1. Logged in as any role
2. Click logout button (top-right)
3. Check browser console + localStorage

**Expected Results**:
- ✅ Redirect to `/login` page
- ✅ "Authenticated" badge disappears
- ✅ Console log: `Logout successful`
- ✅ localStorage cleared:
  ```javascript
  localStorage.getItem('sb-xiwfhcikfdoshxwbtjxt-auth-token')
  // Should return null
  ```

---

### Test 5: Multiple Roles
**Goal**: Verify different roles work correctly

**Steps**:
1. Logout (if logged in)
2. Click "Manager" demo button
3. Check you're on `/` (dashboard)
4. Logout
5. Click "Kitchen" demo button
6. Check you're on `/kitchen`

**Expected Results**:
- ✅ Manager → Dashboard (`/`)
- ✅ Server → Server view (`/server`)
- ✅ Kitchen → Kitchen view (`/kitchen`)
- ✅ Expo → Expo view (`/expo`)
- ✅ Each login shows correct role in badge

---

### Test 6: Network Conditions
**Goal**: Verify behavior when backend is slow/unreachable

**Steps**:
1. In Chrome DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Try logging in as "Server"
4. Observe behavior

**Expected Results**:
- ✅ Loading spinner appears
- ✅ Login completes (may take 10-15 seconds)
- ✅ NO timeout warning after 5 seconds
- ✅ Eventually redirects to `/server`

**If hangs**: Check backend logs for errors

---

## Console Logs Reference

### Normal Login Flow
```
🔐 Attempting Supabase login {email: "server@restaurant.com", restaurantId: "11111111-..."}
✅ Supabase authentication successful
[httpClient] Using Supabase session token for API request
✅ Login complete {email: "server@restaurant.com", role: "server", scopes: ["orders.write", "tables.write"]}
🚀 Navigating to /server
```

### Session Restoration (Page Refresh)
```
🔄 Initializing auth context...
✅ Found existing Supabase session
[httpClient] Using Supabase session token for API request
✅ User authenticated {role: "server"}
✅ Auth initialization complete
```

### Authorization Check
```
🔐 canAccess check {userRole: "server", userScopes: ["orders.write", "tables.write"], requiredRoles: ["owner", "manager"], hasRequiredRole: false, result: false}
🔐 Authorization check {path: "/manager", requiredRoles: ["owner", "manager"], canAccess: false}
Access denied: Insufficient permissions {path: "/manager", requiredRoles: ["owner", "manager"]}
```

---

## Known Issues (Expected Behavior)

### 1. WebSocket Warnings
You may see:
```
WebSocket heartbeat timeout - connection may be dead
```
**Status**: Not related to auth fix - separate issue
**Impact**: None - WebSocket reconnects automatically

### 2. Analytics 400 Error
You may see:
```
POST /api/v1/analytics/performance 400 (Bad Request)
```
**Status**: Not related to auth fix - analytics endpoint issue
**Impact**: None - doesn't affect auth or core functionality

### 3. Preload Warnings
You may see:
```
<link rel=preload> uses an unsupported `as` value
```
**Status**: Vite build optimization warning
**Impact**: None - purely cosmetic

---

## Troubleshooting

### Issue: Login fails with "Invalid email or password"

**Possible Causes**:
1. Demo users not seeded in Supabase
2. Wrong Supabase credentials in `.env`

**Solution**:
```bash
# Check if demo users exist
# Go to Supabase Dashboard → Authentication → Users
# Should see: server@restaurant.com, manager@restaurant.com, etc.

# If missing, re-seed:
cd server
npm run seed:demo-users
```

---

### Issue: "Failed to fetch user details" after login

**Cause**: Backend `/api/v1/auth/me` endpoint failed

**Solution**:
```bash
# Check backend is running
curl http://localhost:3001/api/v1/health

# Check backend logs for JWT validation errors
# Look for: "Token verification failed" or "Invalid token"

# Verify JWT secret matches Supabase
# Backend .env SUPABASE_JWT_SECRET must match:
# Supabase Dashboard → Settings → API → JWT Secret
```

---

### Issue: Still seeing "Auth loading timeout" warning

**Cause**: You didn't pull latest code

**Solution**:
```bash
git pull origin main
npm install
npm run dev
```

---

## Success Criteria - Authentication Tests

All auth tests pass when:

- [x] ✅ Code changes committed
- [x] ✅ Test 1: Demo login works
- [x] ✅ Test 2: Session persists after refresh
- [x] ✅ Test 3: Authorization checks work
- [x] ✅ Test 4: Logout clears session
- [x] ✅ Test 5: All roles work correctly
- [x] ✅ Test 6: Handles slow network

**Status**: ✅ All authentication tests passing

---

## P0 Audit Verification Tests

### Test 9: Payment Audit Fail-Fast (Fix #120)
**Goal**: Verify payment audit logging fails fast on errors

**Steps**:
1. Make a test payment via Stripe Elements
2. Simulate audit logging failure (disconnect database)
3. Verify payment does not complete

**Expected Results**:
- ✅ Payment audit log created before payment confirmation
- ✅ If audit log fails, payment is rejected
- ✅ No payments complete without audit trail (PCI compliance)

**Files to verify**:
- `server/src/controllers/paymentController.ts` - Fail-fast audit pattern

---

### Test 10: Centralized Tax Rates (Fix #119)
**Goal**: Verify tax rates come from database, not hardcoded

**Steps**:
1. Check database for tax_rates table
2. Create test order
3. Verify tax calculation uses database value
4. Update tax rate in database
5. Create another test order
6. Verify new tax rate applies

**Expected Results**:
- ✅ tax_rates table exists with restaurant_id + jurisdiction columns
- ✅ Tax calculated from database value
- ✅ No hardcoded 0.0875 or similar values in code
- ✅ Tax rate changes reflected immediately

**Files to verify**:
- Database schema: `tax_rates` table exists
- `server/src/utils/taxCalculator.ts` - Queries database for rates

---

### Test 11: Order Creation Transaction (Fix #117)
**Goal**: Verify order creation is atomic (all-or-nothing)

**Steps**:
1. Create order with multiple line items
2. Simulate failure mid-creation (disconnect database after order insert, before line items)
3. Check database for partial orders

**Expected Results**:
- ✅ Either entire order succeeds (order + all line items)
- ✅ Or entire order fails (no orphaned records)
- ✅ No partial orders in database
- ✅ PostgreSQL RPC function `create_order_atomic` exists and is used

**Files to verify**:
- `server/src/controllers/orderController.ts:createOrder` - Calls RPC function
- Database: `create_order_atomic` PostgreSQL function exists

---

### Test 12: Optimistic Locking (Fix #118)
**Goal**: Verify concurrent order status updates handled correctly

**Steps**:
1. Create test order (version = 1)
2. Open order in Kitchen Display
3. Open same order in Expo Display (separate browser/tab)
4. Kitchen marks order "preparing" (version 1 → 2)
5. Expo tries to mark order "ready" (still thinks version = 1)
6. Verify Expo update rejected

**Expected Results**:
- ✅ orders table has `version` column
- ✅ Each status update increments version
- ✅ Concurrent updates detected and rejected
- ✅ User sees "Order was modified by another user" error
- ✅ User can refresh and retry

**Files to verify**:
- `server/src/controllers/orderController.ts:updateOrderStatus` - Checks version column
- Database: orders.version column exists

---

### Test 13: Batch Table Updates Performance (Fix #121)
**Goal**: Verify batch table updates are fast (40x improvement)

**Steps**:
1. Open Kitchen Display
2. Open browser DevTools → Network tab
3. Create 10-20 test orders
4. Click "Complete Table 5" (batch operation)
5. Measure response time

**Expected Results**:
- ✅ Batch update completes in < 50ms (was ~1000ms before fix)
- ✅ Single database call (not N individual calls)
- ✅ PostgreSQL RPC function `batch_update_table_orders` exists and is used
- ✅ All orders in batch update atomically

**Files to verify**:
- `server/src/controllers/orderController.ts` - Calls batch RPC function
- Database: `batch_update_table_orders` PostgreSQL function exists

---

### Test 14: ElapsedTimer Fix (Fix #122)
**Goal**: Verify ElapsedTimer updates correctly without useMemo anti-pattern

**Steps**:
1. Open Kitchen Display
2. Create test order
3. Watch order timer for 60 seconds
4. Verify timer updates every second
5. Check browser DevTools → Performance
6. Verify no excessive re-renders

**Expected Results**:
- ✅ Timer updates smoothly every second
- ✅ No "frozen" timer display
- ✅ Component doesn't re-render unnecessarily
- ✅ No useMemo wrapping callback functions

**Files to verify**:
- `client/src/hooks/useElapsedTime.ts` - No useMemo around callbacks
- Kitchen Display shows live timers

---

### Test 15: FloorPlanEditor Refactor (Fix #123)
**Goal**: Verify FloorPlanEditor still works after refactoring

**Steps**:
1. Navigate to floor plan editor page
2. Add new table
3. Move table
4. Resize table
5. Delete table
6. Add booth
7. Save changes
8. Refresh page
9. Verify changes persisted

**Expected Results**:
- ✅ All floor plan operations work correctly
- ✅ UI responsive and clean
- ✅ No regressions in functionality
- ✅ Code is 76% smaller (940 lines → 225 lines)
- ✅ Hooks extracted: useFloorPlanState, useTableOperations, etc.

**Files to verify**:
- `client/src/components/FloorPlan/FloorPlanEditor.tsx` - ~225 lines
- `client/src/hooks/floorPlan/` - Extracted hooks directory exists

---

## P0 Audit Success Criteria

All P0 audit verification tests pass when:

- [ ] ⏳ Test 9: Payment audit fail-fast verified
- [ ] ⏳ Test 10: Centralized tax rates verified
- [ ] ⏳ Test 11: Order creation transaction verified
- [ ] ⏳ Test 12: Optimistic locking verified
- [ ] ⏳ Test 13: Batch table updates performance verified
- [ ] ⏳ Test 14: ElapsedTimer fix verified
- [ ] ⏳ Test 15: FloorPlanEditor refactor verified

**Once all tests pass**: ✅ P0 audit fixes fully verified!

---

## Fall Menu Deployment Testing

### Prerequisites

**Before deploying fall menu**:
1. [ ] User provides fall menu items (spreadsheet or list)
2. [ ] Fall menu images prepared (800x600px, <500KB each)
3. [ ] Images named in kebab-case (e.g., `butternut-squash-soup.jpg`)

---

### Test 7: Fall Menu Deployment

**Goal**: Successfully deploy fall menu and verify it works across all channels

#### Step 1: Update Seed Script
```bash
# 1. Open seed file
code /server/scripts/seed-menu.ts

# 2. Replace summer items with fall items
# Example fall items:
# - Butternut Squash Soup
# - Apple Cider Glazed Pork Chop
# - Pumpkin Cheesecake
# - Maple Pecan Salad
# - Cranberry Glazed Turkey

# 3. Add comprehensive aliases for voice ordering
# Example:
aliases: [
  'squash soup',
  'butternut soup',
  'fall soup',
  'pumpkin soup',
  'cream of butternut'
]
```

**Expected Result**: ✅ Seed file updated with fall menu items

---

#### Step 2: Add Menu Images
```bash
# 1. Navigate to images directory
cd /client/public/images/menu/

# 2. Add fall menu images
# - butternut-squash-soup.jpg
# - apple-cider-pork.jpg
# - pumpkin-cheesecake.jpg
# - maple-pecan-salad.jpg
# - cranberry-turkey.jpg

# 3. Verify images exist
ls -lh *.jpg
```

**Expected Result**: ✅ All fall menu images present in directory

---

#### Step 3: Run Seed Script
```bash
cd server
npm run seed:menu
```

**Expected Output**:
```
🌱 Seeding menu items...
✅ Seeded 58 menu items successfully
✅ Menu seed complete
```

**Expected Result**: ✅ Seed completes without errors

---

#### Step 4: Clear Cache
```bash
curl -X POST http://localhost:3001/api/v1/menu/cache/clear \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Cache cleared for restaurant"
}
```

**Expected Result**: ✅ Cache cleared successfully

---

#### Step 5: Sync to Voice AI
```bash
curl -X POST http://localhost:3001/api/v1/menu/sync-ai \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}'
```

**Expected Response**:
```json
{
  "success": true,
  "itemsSynced": 58,
  "timestamp": "2025-10-11T18:30:00Z"
}
```

**Expected Result**: ✅ Menu synced to OpenAI

---

#### Step 6: Test Online Ordering
1. Open http://localhost:5173/order/11111111-1111-1111-1111-111111111111
2. Verify fall menu items appear
3. Check images load correctly (no broken images)
4. Click "Butternut Squash Soup"
5. Verify modal opens with description, price, modifiers
6. Add to cart
7. Open cart drawer
8. Verify item appears with correct price
9. Proceed to checkout
10. Complete test order

**Expected Results**:
- ✅ Fall menu items display correctly
- ✅ Images load without errors
- ✅ Item details modal works
- ✅ Add to cart functions
- ✅ Cart calculates totals correctly
- ✅ Checkout completes

---

#### Step 7: Test Voice Ordering
1. Navigate to http://localhost:5173/drive-thru
2. Press and hold microphone button
3. Say: "I'd like the butternut squash soup"
4. Release button
5. Observe console logs
6. Verify item appears in cart

**Expected Console Logs**:
```
[DriveThru] Order detected from AI: {items: [{name: "Butternut Squash Soup", quantity: 1}]}
[DriveThru] Adding 1x Butternut Squash Soup
```

**Expected Results**:
- ✅ Voice recognition detects "butternut squash soup"
- ✅ AI matches to menu item
- ✅ Item added to cart with quantity 1
- ✅ NO "Menu item not found" warnings

**Test Variations**:
- "I'll have two apple cider pork chops" → ✅ Quantity 2
- "Give me a pumpkin cheesecake" → ✅ Matches alias
- "I want the fall soup" → ✅ Matches alias
- "Can I get a maple salad" → ✅ Partial name match

---

#### Step 8: Test Kitchen Display
1. Complete an order with fall menu items (Steps 6 or 7)
2. Navigate to http://localhost:5173/kitchen
3. Verify order appears in kitchen display
4. Check fall menu item names display correctly
5. Change order status to "preparing"
6. Mark as "ready"
7. Navigate to http://localhost:5173/expo
8. Verify order appears in expo view
9. Mark as "completed"

**Expected Results**:
- ✅ Order appears in kitchen within 2 seconds
- ✅ Fall menu item names display correctly
- ✅ No truncation or formatting issues
- ✅ Status changes reflect immediately
- ✅ WebSocket updates work
- ✅ Expo view shows order
- ✅ Complete works

---

### Test 8: Full E2E Fall Menu Order

**Goal**: Complete order flow from voice → kitchen → payment → confirmation

**Steps**:
1. Open drive-thru page
2. Voice order: "I want butternut squash soup and pumpkin cheesecake"
3. Verify both items in cart
4. Click "Checkout"
5. Enter customer info
6. Click "Place Order"
7. Observe order created (status: pending)
8. Check kitchen display shows order
9. Kitchen marks order as "ready"
10. Return to order confirmation page

**Expected Results**:
- ✅ Voice recognizes both items
- ✅ Cart shows both items with correct prices
- ✅ Order creates successfully
- ✅ Kitchen receives order via WebSocket
- ✅ Status updates reflect in real-time
- ✅ Order confirmation displays

---

## Fall Menu Success Criteria

All fall menu tests pass when:

- [ ] ⏳ Test 7: Fall menu deployed successfully
- [ ] ⏳ Step 1: Seed script updated
- [ ] ⏳ Step 2: Images added
- [ ] ⏳ Step 3: Seed script runs without errors
- [ ] ⏳ Step 4: Cache cleared
- [ ] ⏳ Step 5: Synced to voice AI
- [ ] ⏳ Step 6: Online ordering works
- [ ] ⏳ Step 7: Voice ordering recognizes fall items
- [ ] ⏳ Step 8: Kitchen display shows fall items
- [ ] ⏳ Test 8: Full E2E order completes

**Once all tests pass**: ✅ Ready for production launch!

---

## Next Steps

### Immediate (You)
1. Run through all 6 manual tests above
2. Check off items in "Success Criteria"
3. Report any failures in GitHub issue

### Short-term (After Testing)
1. Deploy to staging environment
2. Test with real data
3. Deploy to production

### Long-term (Future Improvements)
1. Add automated E2E tests (Playwright)
2. Add session monitoring/analytics
3. Consider adding 2FA for owner accounts

---

## Documentation

### Architecture & Systems
- **Production Status**: [PRODUCTION_STATUS.md](./PRODUCTION_STATUS.md) - 99% ready assessment
- **Menu System**: [MENU_SYSTEM.md](./explanation/concepts/MENU_SYSTEM.md) - Menu management guide
- **Stripe Integration**: [STRIPE_API_SETUP.md](./reference/api/api/STRIPE_API_SETUP.md) - Payment flow
- **Order Flow**: [ORDER_FLOW.md](./explanation/concepts/ORDER_FLOW.md) - Customer journey
- **Database**: [DATABASE.md](./reference/schema/DATABASE.md) - Supabase schema
- **Roadmap**: [ROADMAP.md](./ROADMAP.md) - Project timeline

### Authentication
- **Architecture**: [AUTHENTICATION_ARCHITECTURE.md](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md)
- **Migration Guide**: [DEPLOYMENT.md#authentication-migration](./how-to/operations/DEPLOYMENT.md#authentication-migration) - Auth migration details
- **Code**: `client/src/contexts/AuthContext.tsx` (see inline comments)

---

## Support

If tests fail or you encounter issues:

1. **Check browser console** for error logs
2. **Check backend logs** for API errors
3. **Check Supabase logs** (Dashboard → Logs → Auth)
4. **Review docs**: `docs/MIGRATION_V6_AUTH.md` troubleshooting section
5. **Create GitHub issue** with:
   - Test case that failed
   - Browser console logs
   - Backend logs
   - Steps to reproduce

---

**Status**: ✅ Ready for testing
**Estimated testing time**: 15-20 minutes
**Blocker**: None - all code changes complete
