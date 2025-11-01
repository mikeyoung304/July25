# Dual Authentication Strategy: Public Customers vs Staff Servers
**Date**: 2025-10-18
**Status**: Analysis Complete - Ready for Implementation
**Context**: Fixing "No access to this restaurant" error in online ordering without breaking recent staff server fixes

---

## Executive Summary

The application has **two distinct user flows** that currently conflict:
1. **Public Customers**: Anonymous users ordering online from home for pickup
2. **Staff Servers**: Logged-in employees placing orders for customers in the restaurant

Recent commits (01840de, 4cc65ae) fixed authentication for staff servers using the `'server'` role. However, the public customer checkout flow incorrectly uses the same `'server'` role, causing authentication to fail or creating architectural confusion.

**Recommended Solution**: Update CheckoutPage to explicitly use `'kiosk_demo'` role for public customers while preserving `'server'` role for staff workflows.

---

## Current State Analysis

### What Works ✅
- Staff server authentication with `'server'` role (commits 01840de, 4cc65ae)
- Demo user bypass in `restaurantAccess.ts` middleware (checks for "demo:" prefix)
- Order creation API accepts both `'kiosk_demo'` and `'server'` roles
- KDS receives orders via WebSocket real-time updates
- Multi-tenant architecture with restaurant_id isolation

### What's Broken ❌
- CheckoutPage (public customer flow) defaults to `'server'` role
- Semantic confusion: "server" implies employee, not customer
- Authentication fails on production Vercel deployment
- Two flows treated as the same thing, breaking one when fixing the other

### Recent Git History
```
01840de - Added 'server' role to order endpoints allowed roles
4cc65ae - Demo users bypass restaurant check in restaurantAccess middleware
```

These commits specifically enabled staff servers to create orders. We must preserve this functionality.

---

## Two User Flows (Detailed)

### Flow 1: Public Customer Online Ordering
**Route**: `/order/:restaurantId` → `/checkout`
**Component**: `CheckoutPage.tsx`
**User Type**: Anonymous public customer
**Use Case**: Customer at home orders online for pickup
**Order Type**: `'online'`
**Current Auth**: Calls `DemoAuthService.getDemoToken()` (defaults to 'server' ❌)
**Should Use**: `'kiosk_demo'` role (self-service customer)

**Payment Flow**:
- Square Web Payments SDK
- Customer enters credit card
- Payment processed before order submitted
- Order only created if payment succeeds

**Key Files**:
- `client/src/pages/CheckoutPage.tsx:51-52` - Calls getDemoToken()
- `client/src/services/auth/demoAuth.ts` - Provides JWT tokens

---

### Flow 2: Staff Server In-Restaurant Ordering
**Route**: `/server`
**Component**: `ServerView.tsx`
**User Type**: Logged-in employee (staff server)
**Use Case**: Server places order for customer at table
**Order Type**: (need to verify - likely 'dine_in' or 'phone')
**Current Auth**: Uses `'server'` role ✅ (recently fixed)
**Should Use**: `'server'` role (logged-in staff member)

**Payment Flow**:
- Payment may be deferred (pay at table or counter)
- Different from online pre-payment
- May involve cash, card reader, or other POS methods

**Key Files**:
- `client/src/pages/ServerView.tsx:67` - RoleGuard for ['server', 'admin']
- Uses voice ordering (OpenAI Realtime API), NOT CheckoutPage
- Never navigates to /checkout route

---

## Authentication Architecture

### demoAuth.ts Current Implementation
```typescript
// File: client/src/services/auth/demoAuth.ts

export class DemoAuthService {
  private static async fetchDemoToken(role: string = 'server'): Promise<{ token: string; expiresIn: number }> {
    // Calls POST /api/v1/auth/demo-session with role
  }

  static async getDemoToken(role: string = 'server'): Promise<string> {
    // Returns cached or fresh JWT token
  }
}

export const getDemoToken = (role: string = 'server') => DemoAuthService.getDemoToken(role);
```

**Problem**: Default role is 'server', but this is semantically wrong for public customers.

### Server-Side Middleware Chain

1. **authenticate** (`server/src/middleware/auth.ts`)
   - Verifies JWT token signature
   - Extracts user ID and role from token
   - Adds `req.user` with { id, role, restaurant_id }

2. **restaurantAccess** (`server/src/middleware/restaurantAccess.ts`)
   - Checks if user has access to restaurant
   - **KEY FIX (commit 4cc65ae)**: Bypasses database check for demo users
   ```typescript
   if (req.user?.id?.startsWith('demo:')) {
     // Demo user - bypass database check
     req.restaurantId = restaurantId;
     return next();
   }
   ```

3. **requireRole** (`server/src/middleware/rbac.ts`)
   - Checks if user role matches allowed roles
   - Lines 205-222: Special handling for 'kiosk_demo' (bypasses user_restaurants)
   - Lines 224-233: Other roles query user_restaurants table

### POST /api/v1/orders Allowed Roles
```typescript
// File: server/src/routes/orders.routes.ts:39
router.post('/',
  authenticate,
  requireRole(['admin', 'manager', 'user', 'kiosk_demo', 'server']), // Both roles allowed
  async (req, res) => { ... }
)
```

Both `'kiosk_demo'` and `'server'` are permitted to create orders.

---

## Solution Options

### Option A: CheckoutPage Uses 'kiosk_demo' Role ⭐ RECOMMENDED

**Change**: Update CheckoutPage to explicitly pass role parameter
**Implementation**:
```typescript
// File: client/src/pages/CheckoutPage.tsx:51
// BEFORE (incorrect)
const token = await DemoAuthService.getDemoToken(); // defaults to 'server'

// AFTER (correct)
const token = await DemoAuthService.getDemoToken('kiosk_demo'); // explicit role
```

**Pros**:
- ✅ Simple one-line change in CheckoutPage
- ✅ Semantically correct (self-service customer = kiosk-like)
- ✅ Already supported by middleware (kiosk_demo bypasses user_restaurants check)
- ✅ Doesn't break staff 'server' role functionality
- ✅ Preserves demoAuth.ts default for other use cases

**Cons**:
- ⚠️ "Demo" in role name implies test/dev, not production (future: rename to 'customer')

**Risk**: LOW - Targeted fix, doesn't change defaults or other flows

---

### Option B: Create New 'online_customer' Role

**Change**: Add new role specifically for public online orders
**Implementation**:
1. Server: Add 'online_customer' to allowed roles in orders.routes.ts
2. Server: Add 'online_customer' handling in rbac.ts middleware
3. Client: Update CheckoutPage to use new role
4. Update JWT generation endpoint

**Pros**:
- ✅ Semantically perfect for public online orders
- ✅ Clear separation between kiosk vs online ordering
- ✅ Future-proof for different business rules (e.g., different permissions)

**Cons**:
- ❌ Requires changes in multiple server files
- ❌ More complex, more code to maintain
- ❌ Overkill if kiosk_demo already works functionally

**Risk**: MEDIUM - More changes = more potential bugs

---

### Option C: Context Detection (Dynamic Role Selection)

**Change**: Make CheckoutPage detect context and choose role dynamically
**Implementation**:
```typescript
// Detect if user is staff or customer
const role = isStaffLoggedIn() ? 'server' : 'kiosk_demo';
const token = await DemoAuthService.getDemoToken(role);
```

**Pros**:
- ✅ Flexible, handles both contexts automatically

**Cons**:
- ❌ Complex logic, harder to debug
- ❌ Tight coupling between components
- ❌ Not clear how to reliably detect context
- ❌ CheckoutPage is ONLY used by public customers (ServerView doesn't use it)

**Risk**: HIGH - Unnecessary complexity, not architecturally sound

---

### Option D: Remove Auth for Public Orders

**Change**: Make public online orders completely anonymous (no token)
**Implementation**: Skip authentication for certain order types

**Pros**:
- ✅ Simplest for customers

**Cons**:
- ❌ Security risk (no rate limiting, spam prevention)
- ❌ Can't track customer identity for order history
- ❌ Violates current authentication architecture
- ❌ Opens door to abuse (fake orders, DoS attacks)

**Risk**: VERY HIGH - Security nightmare

---

## Recommended Implementation Plan

### Phase 1: Immediate Fix (Option A)

**Step 1**: Revert Incorrect Changes
```bash
# Revert the changes made to demoAuth.ts (changing default from 'server' to 'kiosk_demo')
git restore client/src/services/auth/demoAuth.ts
```

**Step 2**: Update CheckoutPage
```typescript
// File: client/src/pages/CheckoutPage.tsx
// Line 51-52

// CHANGE FROM:
const token = await DemoAuthService.getDemoToken();

// CHANGE TO:
const token = await DemoAuthService.getDemoToken('kiosk_demo');
```

**Step 3**: Verify KioskCheckoutPage
```typescript
// File: client/src/components/kiosk/KioskCheckoutPage.tsx
// Ensure it also explicitly uses 'kiosk_demo' role
const token = await DemoAuthService.getDemoToken('kiosk_demo');
```

**Why This Works**:
- CheckoutPage is ONLY used by public customers (route: /order → /checkout)
- ServerView (staff flow) uses voice ordering, never touches CheckoutPage
- Explicit role parameter means we don't change demoAuth.ts defaults
- Preserves recent fixes for 'server' role authentication

---

### Phase 2: Testing Strategy

**Test 1: Public Customer Online Ordering**
1. Navigate to https://july25-client.vercel.app/order/11111111-1111-1111-1111-111111111111
2. Add items to cart
3. Proceed to checkout
4. Enter payment details (use Square test card: 4111 1111 1111 1111)
5. Submit order
6. **Expected**: Order created with type='online', no auth errors
7. **Verify**: Order appears on KDS display

**Test 2: Staff Server Ordering**
1. Navigate to https://july25-client.vercel.app/server
2. Log in as server role (or use PIN)
3. Use voice ordering to create an order
4. **Expected**: Order created successfully with 'server' role
5. **Verify**: Order appears on KDS display

**Test 3: Kiosk Ordering**
1. Navigate to kiosk view (if accessible)
2. Add items to cart via kiosk interface
3. Complete checkout
4. **Expected**: Order created with type='kiosk'
5. **Verify**: Order appears on KDS display

**Regression Testing**:
- Run existing integration tests
- Check that no other components call `getDemoToken()` without explicit role
- Verify authentication middleware still works for all roles

---

### Phase 3: Documentation Updates

**Update ADR-006**: Dual Authentication Architecture Pattern
- Document the two user flows (public customers vs staff servers)
- Explain role semantics ('kiosk_demo' vs 'server')
- Note that CheckoutPage uses 'kiosk_demo' explicitly
- Document future consideration: rename 'kiosk_demo' to 'customer' for production

**Update AUTHENTICATION_ARCHITECTURE.md**:
- Add section on "Role Selection by User Flow"
- Document explicit role passing pattern
- Add troubleshooting guide for auth errors by context

**Update TROUBLESHOOTING.md**:
- Add "No access to this restaurant" error for CheckoutPage
- Solution: Verify CheckoutPage uses 'kiosk_demo' role
- Add diagnostic: Check browser console for auth token role

---

## Future Improvements

### Short-term (Next Sprint)
1. **Rename 'kiosk_demo' to 'customer'** for production clarity
   - Update server allowed roles
   - Update client role references
   - Update documentation
   - Migration path: Support both names during transition

2. **Add Integration Tests**
   - Test public customer checkout with 'kiosk_demo' auth
   - Test staff server ordering with 'server' auth
   - Test authentication failures and error messages

3. **Payment Flow Divergence**
   - Document differences between online payment (pre-pay) and server payment (deferred)
   - Consider if different payment processors needed
   - Plan for table payment flow when ready

### Long-term (Future Releases)
1. **Real Authentication for Staff**
   - Replace demo tokens with proper email/password auth via Supabase
   - Implement session management with refresh tokens
   - Add role-based permissions system (RBAC)

2. **Customer Accounts** (Optional)
   - Allow public customers to create accounts
   - Store order history, favorite items, payment methods
   - Quick reorder from past orders

3. **API Key Authentication for Integrations**
   - Support restaurant owners integrating with external systems
   - Webhook authentication for order status updates
   - Third-party delivery service integration

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| CheckoutPage change breaks public ordering | Low | High | Thorough testing on staging before production |
| Staff server flow accidentally affected | Very Low | High | No changes to ServerView or demoAuth defaults |
| Payment flow issues on production | Low | High | Test with Square sandbox, monitor error rates |
| Recent commits not deployed to Vercel | Medium | Medium | Verify production deployment includes commits 01840de, 4cc65ae |
| Other components call getDemoToken() without role | Low | Medium | Search codebase for all getDemoToken() calls |

---

## Key Architectural Insights

### ADR-006: Dual Authentication Pattern
The application implements **two coexisting authentication systems**:
1. **Supabase Sessions** (Primary): Email/password auth, production-ready
2. **localStorage Sessions** (Fallback): Demo/PIN/station auth, development/testing

The `httpClient.ts` checks both:
```typescript
// Priority 1: Supabase session
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  headers.set('Authorization', `Bearer ${session.access_token}`);
} else {
  // Priority 2: localStorage (demo/PIN/station)
  const savedSession = localStorage.getItem('auth_session');
  // ... use saved token
}
```

**Implication**: Both public customers and staff servers use demo tokens (localStorage path) until proper auth is implemented. This is acceptable for development/staging but should be replaced with Supabase auth for production.

### Multi-Tenant RBAC
Every API request requires:
1. `Authorization: Bearer <JWT>` header with role claim
2. `X-Restaurant-ID: <uuid>` header for multi-tenancy
3. Role must be in allowed roles list for endpoint
4. Restaurant ID must match user's authorized restaurants (or bypass for demo users)

### Order Type Semantics
- `'online'`: Public customer pre-paid online order for pickup
- `'kiosk'`: In-store self-service kiosk order (may be pre-paid or pay at counter)
- `'dine_in'`: Table service order placed by staff server
- `'phone'`: Phone order taken by staff, customer pays on arrival
- `'delivery'`: Third-party delivery service order

Each order type may have different payment flows, fulfillment processes, and business rules.

---

## Success Criteria

### Definition of Done
- [x] Sequential thinking analysis complete
- [ ] oct18plan.md created with comprehensive plan
- [ ] demoAuth.ts reverted to original state (default 'server' role preserved)
- [ ] CheckoutPage updated to use 'kiosk_demo' explicitly
- [ ] KioskCheckoutPage verified to use 'kiosk_demo' explicitly
- [ ] All three user flows tested on staging environment
- [ ] Orders appear on KDS for all three flows
- [ ] No authentication errors in any flow
- [ ] Documentation updated (ADR-006, AUTHENTICATION_ARCHITECTURE.md, TROUBLESHOOTING.md)

### Acceptance Tests
1. ✅ Public customer can complete online order checkout without auth errors
2. ✅ Staff server can create orders via ServerView voice interface
3. ✅ Kiosk orders work in in-store self-service kiosks
4. ✅ All orders appear on KDS in real-time
5. ✅ No regression in existing functionality
6. ✅ Clear error messages if authentication fails

---

## Questions for Team Discussion

1. **Production Readiness**: Are commits 01840de and 4cc65ae deployed to Vercel production? If not, when is next deployment?

2. **Role Naming**: Should we rename 'kiosk_demo' to 'customer' or 'online_customer' for production? When?

3. **Payment Flow**: How should staff server payment flow differ from online pre-payment? Do we need different Square integration patterns?

4. **Order Types**: Does ServerView create 'dine_in' or 'phone' orders? Need to verify and document.

5. **Future Auth**: What's the timeline for replacing demo tokens with proper Supabase authentication for staff?

6. **Customer Accounts**: Do we want to support optional customer accounts for order history, or keep fully anonymous?

---

## Implementation Checklist

### Immediate (Today)
- [ ] Revert demoAuth.ts to preserve 'server' default
- [ ] Update CheckoutPage.tsx line 51 to use explicit 'kiosk_demo' role
- [ ] Search codebase for other `getDemoToken()` calls without explicit role
- [ ] Commit changes with clear message referencing this plan

### Next 24 Hours
- [ ] Deploy to staging environment
- [ ] Test all three user flows on staging
- [ ] Monitor for authentication errors
- [ ] Verify orders reach KDS successfully

### Before Production Deploy
- [ ] Update ADR-006 documentation
- [ ] Update AUTHENTICATION_ARCHITECTURE.md
- [ ] Update TROUBLESHOOTING.md
- [ ] Add integration tests for both auth contexts
- [ ] Code review with team
- [ ] Get approval for production deployment

### Post-Deploy Monitoring
- [ ] Monitor Sentry/logs for authentication errors
- [ ] Track order success rates by type (online, kiosk, server)
- [ ] Verify KDS receives orders from all sources
- [ ] Monitor payment success rates
- [ ] Gather feedback from staff testing

---

## Conclusion

The root cause of the "No access to this restaurant" error is that **CheckoutPage (public customer flow) incorrectly uses the 'server' role**, which was recently fixed to work for logged-in staff members. The two distinct user flows have different authentication needs:

- **Public Customers** → Use `'kiosk_demo'` role (self-service, anonymous)
- **Staff Servers** → Use `'server'` role (logged-in, employee)

**Recommended fix**: Update CheckoutPage to explicitly use `'kiosk_demo'` role, preserving the default 'server' role for other use cases. This is a simple, low-risk change that properly separates the two authentication contexts without breaking recent staff server fixes.

The plan is ready for implementation. No context window needed - all information is contained in this document.

---

**Document Version**: 1.0
**Author**: Claude (AI Assistant)
**Review Status**: Pending team review
**Implementation Status**: Not started
