# Troubleshooting Guide


**Last Updated:** 2025-11-01

[Home](../../../index.md) > [Docs](../../README.md) > [How-To](../README.md) > [Troubleshooting](../../../README.md) > Troubleshooting Guide

**Last Updated**: October 30, 2025
**Version**: 6.0.14

This guide helps diagnose and resolve common issues in the Restaurant OS.

---

## Table of Contents

1. [Order Flow Issues](#order-flow-issues)
2. [Kitchen Display Problems](#kitchen-display-problems)
3. [Voice Ordering Issues](#voice-ordering-issues)
4. [Payment Failures](#payment-failures)
5. [Authentication Problems](#authentication-problems)
6. [WebSocket Connection Issues](#websocket-connection-issues)
7. [CORS Errors](#cors-errors)
8. [Database & RLS Problems](#database-rls-problems)
9. [Performance Issues](#performance-issues)
10. [Deployment Issues](#deployment-issues)

---

## Order Flow Issues

### Problem: Orders Not Appearing in Kitchen Display

**Symptoms**:
- Customer completes checkout
- Payment succeeds
- Order not showing on kitchen display

**Diagnosis Steps**:

1. **Check order was created in database**:
```bash
# In Supabase SQL Editor or psql
SELECT id, order_number, status, restaurant_id, created_at
FROM orders
WHERE restaurant_id = 'YOUR_RESTAURANT_ID'
ORDER BY created_at DESC
LIMIT 10;
```

2. **Check WebSocket connection**:
```typescript
// In browser console (kitchen display):
console.log('WebSocket state:', document.querySelector('.kitchen-display').__ws?.readyState);
// 1 = OPEN, 0 = CONNECTING, 2 = CLOSING, 3 = CLOSED
```

3. **Check order broadcast**:
```bash
# In server logs (Render or local):
grep "broadcastNewOrder" logs/server.log
# Should see: "Broadcast to restaurant: {restaurantId}"
```

**Common Causes & Fixes**:

| Cause | Fix |
| --- | --- |
| **WebSocket disconnected** | Refresh kitchen display, check network |
| **Wrong restaurant_id** | Verify JWT token contains correct restaurant_id |
| **Order status skip** | Order created with status='completed' (skipped kitchen) |
| **RLS policy blocking** | Check database RLS policies enabled |

**Quick Fix**:
```bash
# Restart kitchen display WebSocket
window.location.reload();

# Manually trigger sync
ws.send(JSON.stringify({ type: 'orders:sync' }));
```

---

### Problem: Order Stuck in "Pending" Status

**Symptoms**:
- Order created but never moves to "confirmed" or "preparing"
- Payment completed but order not progressing

**Diagnosis**:

```sql
-- Check order and payment status
SELECT
  o.id,
  o.order_number,
  o.status,
  o.payment_info,
  o.created_at,
  o.updated_at
FROM orders o
WHERE o.id = 'ORDER_ID';
```

**Common Causes**:

1. **Payment not linked**: `payment_info` is null or missing `paymentIds`
2. **Status update failed**: WebSocket message not sent
3. **Kitchen display not listening**: No staff monitoring orders

**Fix**:

```typescript
// Manually update order status (server-side or Supabase):
await supabase
  .from('orders')
  .update({ status: 'confirmed', updated_at: new Date().toISOString() })
  .eq('id', orderId);

// Broadcast update
broadcastOrderUpdate(wss, order);
```

---

### Problem: Duplicate Orders Created

**Symptoms**:
- Same order appears multiple times in kitchen display
- Customer charged once but 2+ orders in database

**Diagnosis**:

```sql
-- Find duplicate orders (same items, same time)
SELECT
  order_number,
  restaurant_id,
  total,
  created_at,
  COUNT(*) as count
FROM orders
WHERE restaurant_id = 'YOUR_RESTAURANT_ID'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY order_number, restaurant_id, total, created_at
HAVING COUNT(*) > 1;
```

**Common Causes**:

1. **Idempotency key not used**: Payment API called twice with different keys
2. **Double-click submit**: Client-side button not disabled during processing
3. **Network retry**: Request timed out, client retried, both succeeded

**Fix**:

```typescript
// Add idempotency to order creation
const idempotencyKey = `order-${restaurantId}-${Date.now()}-${Math.random()}`;

// Store in metadata
await supabase.from('orders').insert({
  ...orderData,
  metadata: { idempotencyKey },
});

// Check for duplicates before creating
const existing = await supabase
  .from('orders')
  .select('id')
  .eq('metadata->>idempotencyKey', idempotencyKey)
  .single();

if (existing) {
  return existing; // Return existing order
}
```

**Prevention**:
- Disable submit button after first click
- Use idempotency keys for all order creation
- Implement request deduplication middleware

---

## Kitchen Display Problems

### Problem: Kitchen Display Not Updating in Real-Time

**Symptoms**:
- New orders not appearing automatically
- Status changes not reflected
- Must manually refresh to see updates

**Diagnosis**:

```typescript
// Check WebSocket connection state (browser console)
const ws = window.__websocket_client__;
console.log('Connection state:', ws?.readyState);
console.log('Restaurant ID:', ws?.restaurantId);
console.log('Last message:', ws?.lastMessage);
```

**Common Causes**:

| Cause | Diagnosis | Fix |
| --- | --- | --- |
| **WebSocket closed** | `readyState === 3` | Implement auto-reconnect |
| **Wrong restaurant_id** | `ws.restaurantId !== actual` | Fix JWT token claim |
| **Firewall blocking** | Network tab shows failed upgrade | Configure firewall/proxy |
| **Tab backgrounded (mobile)** | iOS/Android suspend WebSocket | Reconnect on tab focus |

**Fix**:

```typescript
// Add auto-reconnect logic
useEffect(() => {
  let reconnectAttempts = 0;

  function connect() {
    const ws = new WebSocket(WS_URL);

    ws.onclose = () => {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(connect, delay);
    };

    ws.onopen = () => {
      reconnectAttempts = 0; // Reset on successful connection
      console.log('✅ Connected');
    };
  }

  connect();
}, []);
```

---

### Problem: Orders Missing Table Numbers

**Symptoms**:
- Table grouping shows "No Table" for dine-in orders
- Orders should have table_number but don't

**Diagnosis**:

```sql
-- Find orders missing table numbers
SELECT id, order_number, type, table_number
FROM orders
WHERE restaurant_id = 'YOUR_RESTAURANT_ID'
  AND type = 'dine-in'
  AND table_number IS NULL
ORDER BY created_at DESC;
```

**Common Causes**:

1. **Kiosk not configured**: Table number not passed from kiosk
2. **Server endpoint not populating**: API accepts but doesn't validate
3. **QR code missing table data**: QR codes don't include table number

**Fix**:

```typescript
// Server-side validation
router.post('/api/v1/orders', async (req, res) => {
  const { type, table_number } = req.body;

  if (type === 'dine-in' && !table_number) {
    return res.status(400).json({
      error: 'TABLE_NUMBER_REQUIRED',
      message: 'Table number required for dine-in orders',
    });
  }

  // ... create order
});
```

**Backfill Missing Table Numbers**:

```sql
-- If you know the pattern (e.g., order_number = table_number)
UPDATE orders
SET table_number = CAST(order_number AS INTEGER)
WHERE type = 'dine-in'
  AND table_number IS NULL
  AND order_number ~ '^[0-9]+$';
```

---

## Voice Ordering Issues

### Problem: Microphone Not Working

**Symptoms**:
- "Hold to Talk" button doesn't activate
- No audio waveform shown
- Browser shows no microphone permission request

**Diagnosis Steps**:

1. **Check browser permissions**:
```typescript
// In browser console:
navigator.permissions.query({ name: 'microphone' }).then(result => {
  console.log('Microphone permission:', result.state);
  // 'granted', 'denied', or 'prompt'
});
```

2. **Check microphone access**:
```typescript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('✅ Microphone works', stream))
  .catch(err => console.error('❌ Microphone error:', err));
```

3. **Check device list**:
```typescript
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const mics = devices.filter(d => d.kind === 'audioinput');
    console.log('Microphones:', mics);
  });
```

**Common Fixes**:

| Issue | Fix |
| --- | --- |
| **Permission denied** | Browser Settings → Privacy → Microphone → Allow |
| **No microphone detected** | Check system settings, plug in mic |
| **HTTPS required** | Microphone only works on HTTPS or localhost |
| **Browser not supported** | Use Chrome/Edge (best WebRTC support) |

**Quick Test**:
Visit https://webcammictest.com/ to verify microphone works outside your app.

---

### Problem: AI Doesn't Understand Orders

**Symptoms**:
- Transcript shows correct speech
- AI responds with "I didn't catch that"
- Items not added to cart

**Diagnosis**:

```typescript
// Check AI function calls (browser console)
window.__voice_client__?.on('function_call', (event) => {
  console.log('Function called:', event.name, event.arguments);
});

// Should see:
// Function called: add_to_order { items: [{...}] }
```

**Common Causes**:

1. **Menu not loaded**: AI doesn't know restaurant's menu items
2. **Item name mismatch**: Customer says "burger" but menu says "hamburger"
3. **Ambiguous request**: "I want two" (two what?)
4. **Context lost**: Long pause, AI forgot previous context

**Fix**:

**1. Verify menu context loaded**:
```typescript
// Server logs should show:
"✅ Menu context initialized for AI service"
"Loaded 47 menu items for restaurant: {restaurantId}"
```

**2. Add menu item aliases**:
```sql
-- Update menu items with common aliases
UPDATE menu_items
SET aliases = ARRAY['burger', 'hamburger', 'cheeseburger']
WHERE name = 'Classic Burger';
```

**3. Improve AI instructions**:
```typescript
const instructions = `
When customer's request is ambiguous:
- "I want two" → Ask: "Two of what item?"
- "Make it a large" → Ask: "Which item would you like large?"

When item not found:
- Search aliases (burger = hamburger = beef sandwich)
- Suggest closest match: "Did you mean Classic Burger?"
`;
```

---

### Problem: Voice Connection Drops Mid-Order

**Symptoms**:
- Voice works initially
- Connection lost after 30-60 seconds
- Must refresh to reconnect

**Diagnosis**:

```typescript
// Check WebRTC connection state
pc.oniceconnectionstatechange = () => {
  console.log('ICE state:', pc.iceConnectionState);
  // Should be: 'connected', not 'disconnected' or 'failed'
};

pc.onconnectionstatechange = () => {
  console.log('Connection state:', pc.connectionState);
};
```

**Common Causes**:

| Cause | Fix |
| --- | --- |
| **Ephemeral token expired** | Token has 60s TTL, implement refresh |
| **Network switch** | WiFi → Cellular, connection lost |
| **Firewall blocking** | Some firewalls block WebRTC, use VPN or different network |
| **ICE candidate failure** | NAT traversal failed, check STUN/TURN config |

**Fix - Auto-refresh ephemeral token**:

```typescript
const TOKEN_LIFETIME = 60000; // 60 seconds
const REFRESH_THRESHOLD = 10000; // Refresh with 10s remaining

let tokenExpiresAt = Date.now() + TOKEN_LIFETIME;

setInterval(async () => {
  const timeLeft = tokenExpiresAt - Date.now();

  if (timeLeft < REFRESH_THRESHOLD) {
    // Request new token
    const { token } = await fetch('/api/v1/realtime/session', {
      method: 'POST',
      body: JSON.stringify({ restaurantId }),
    }).then(r => r.json());

    // Reconnect with new token
    await voiceClient.reconnect(token);
    tokenExpiresAt = Date.now() + TOKEN_LIFETIME;
  }
}, 5000);
```

---

## Payment Failures

**For comprehensive Stripe setup and troubleshooting, see [STRIPE_API_SETUP.md](../../reference/api/api/STRIPE_API_SETUP.md)**

### Problem: Online Ordering Checkout Fails with "Internal server error"

**Symptoms**:
- Demo user clicks "Complete Order (Demo)"
- Shows "Internal server error"
- Order created but payment audit logging fails
- Render logs show: `invalid input syntax for type uuid: "demo:server:xyz"`

**Root Cause**:
The `payment_audit_logs.user_id` column requires UUID type, but demo users have string IDs like `"demo:server:xyz"` or `"demo:customer:abc"`. This was blocking ALL online orders for demo users.

**Status**: ✅ **FIXED in v6.0.13** (October 27, 2025)

**Solution Applied**:
1. Database migration made `user_id` column nullable
2. Demo user IDs now stored in `metadata.demoUserId` field
3. Real users still use UUID in `user_id` column (FK integrity maintained)
4. PCI compliance preserved (full audit trail for all payment attempts)

**Verification**:
```sql
-- Check that user_id is now nullable
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'payment_audit_logs' AND column_name = 'user_id';
-- Should show: is_nullable = 'YES'

-- Check demo user payments in audit log
SELECT id, user_id, metadata->>'demoUserId' as demo_user_id, status, amount
FROM payment_audit_logs
WHERE metadata->>'demoUserId' LIKE 'demo:%'
ORDER BY created_at DESC
LIMIT 10;
```

**Files Changed**:
- `supabase/migrations/20251027173500_fix_payment_audit_demo_users.sql`
- `server/src/routes/payments.routes.ts` (3 locations updated)

**Related**: ADR-006 (Dual Authentication Pattern)

---

### Problem: Stripe Payment Not Completing

**Symptoms**:
- Payment form loads
- Customer enters card details
- "Processing..." spinner never stops
- No payment recorded

**Diagnosis**:

```typescript
// Check Stripe Elements initialization (browser console)
console.log('Stripe:', window.Stripe);

// Check API response
fetch('/api/v1/payments/create', {
  method: 'POST',
  body: JSON.stringify({ orderId, paymentMethodId, amount }),
}).then(r => r.json()).then(console.log);
```

**Common Causes**:

| Cause | Fix |
| --- | --- |
| **Invalid API key** | Check `STRIPE_SECRET_KEY` environment variable |
| **Test vs Live mismatch** | Use test keys (sk_test_...) with test mode |
| **CORS blocking** | Add Stripe domain to CORS whitelist |
| **Network timeout** | Increase timeout, check Render/Vercel logs |

**Fix - Verify Stripe configuration**:

```bash
# .env.local (client)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Test mode for testing

# .env (server)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # optional
```

**Test Stripe connection**:

```bash
# Test payment flow end-to-end
./scripts/test-payment-flow.sh

# Manual API test (check Stripe Dashboard > Developers > Logs)
```

**See [STRIPE_API_SETUP.md](../../reference/api/api/STRIPE_API_SETUP.md) for detailed troubleshooting steps.**

---

### Problem: Demo Mode Not Working

**Symptoms**:
- `STRIPE_SECRET_KEY` not set or set to 'demo'
- Demo order button not showing
- Or demo button shows but payment fails

**Diagnosis**:

```typescript
// Check demo mode detection (client)
const isDemoMode = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                    import.meta.env.DEV;
console.log('Demo mode:', isDemoMode);
```

**Fix**:

```typescript
// Ensure demo payment endpoint exists (server)
router.post('/api/v1/payments/create', async (req, res) => {
  const { paymentMethodId, amount, orderId } = req.body;

  // Check for demo mode
  if (process.env.STRIPE_SECRET_KEY === 'demo' || process.env.NODE_ENV === 'development') {
    // Create mock payment
    return res.json({
      id: `demo-payment-${Date.now()}`,
      status: 'completed',
      amount,
      orderId,
    });
  }

  // Real Stripe payment logic...
});
```

---

## Authentication Problems

### Problem: Demo/PIN/Station Authentication Not Working

**Symptoms**:
- Logged in with demo/PIN/station but API returns 401 Unauthorized
- Kitchen Display shows mock "Classic Burger" instead of real orders
- Console shows "No authentication available for API request"

**Diagnosis**:

```typescript
// Check which auth method is active (browser console)

// 1. Check Supabase session (email/password auth)
const { data: { session } } = await supabase.auth.getSession();
console.log('Supabase session:', session);

// 2. Check localStorage session (demo/PIN/station auth)
const savedSession = localStorage.getItem('auth_session');
console.log('localStorage session:', savedSession ? JSON.parse(savedSession) : null);

// 3. Verify httpClient will find auth
if (session?.access_token) {
  console.log('✅ Will use SUPABASE auth (production)');
} else if (savedSession) {
  const parsed = JSON.parse(savedSession);
  if (parsed.session?.expiresAt > Date.now() / 1000) {
    console.log('✅ Will use LOCALSTORAGE auth (demo/PIN/station)');
  } else {
    console.log('❌ localStorage token EXPIRED');
  }
} else {
  console.log('❌ NO AUTH AVAILABLE');
}
```

**Common Causes & Fixes**:

| Cause | Diagnosis | Fix |
| --- | --- | --- |
| **localStorage session expired** | `expiresAt < Date.now() / 1000` | Re-login with demo/PIN |
| **Wrong localStorage format** | Parse error or missing fields | Clear localStorage, re-login |
| **Demo endpoint disabled** | `DEMO_LOGIN_ENABLED=false` on server | Set env var to `true` |
| **httpClient using old version** | No localStorage fallback code | Update to v6.0.14+ |

**Fix - Re-authenticate**:

```typescript
// Clear expired session
localStorage.removeItem('auth_session');

// Re-login (demo example)
await authContext.loginAsDemo('server');

// Verify new session created
const newSession = JSON.parse(localStorage.getItem('auth_session'));
console.log('New session expires:', new Date(newSession.session.expiresAt * 1000));
```

**Fix - Check httpClient version**:

```bash
# Verify httpClient has dual auth support (v6.0.14+)
grep -A 20 "Check Supabase session" client/src/services/http/httpClient.ts

# Should see both Supabase check AND localStorage fallback
```

**Related Documentation**:
- [ADR-006: Dual Authentication Pattern](../../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
- [AUTHENTICATION_ARCHITECTURE.md](../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md#dual-authentication-pattern-adr-006)

---

### Problem: 403 Forbidden - Restaurant Context Required

**Symptoms**:
- API returns `403 Forbidden` with error message "Restaurant context required"
- User is authenticated (has valid JWT) but requests fail
- Error occurs on protected endpoints (POST /orders, POST /payments, etc.)
- Stack trace points to `server/src/middleware/rbac.ts:202`

**Root Cause**: Middleware ordering violation. The `requireScopes()` middleware runs before `validateRestaurantAccess`, so `req.restaurantId` is undefined.

**Diagnosis**:

```bash
# Check backend logs for this error pattern
grep "Restaurant context required" logs/server.log

# Look for middleware order issue
grep -A 10 "router.post\|router.get" server/src/routes/*.routes.ts

# Compare with working pattern
cat server/src/routes/payments.routes.ts:104-109
```

**Common Causes**:

| Cause | Symptom | Fix |
| --- | --- | --- |
| **Wrong middleware order** | requireScopes before validateRestaurantAccess | Reorder: validateRestaurantAccess must run first |
| **Missing validateRestaurantAccess** | Only authenticate + requireScopes | Add validateRestaurantAccess middleware |
| **Missing X-Restaurant-ID header** | Client not sending header | Add header to HTTP client |

**Fix 1 - Correct Middleware Order**:

```typescript
// ❌ WRONG - requireScopes before validateRestaurantAccess
router.post('/items',
  authenticate,
  requireScopes(ApiScope.MENU_MANAGE),    // Runs second - no restaurantId yet!
  validateRestaurantAccess,                // Runs third - too late
  async (req, res) => { /* ... */ }
);

// ✅ CORRECT - validateRestaurantAccess before requireScopes
router.post('/items',
  authenticate,                            // 1. Set user
  validateRestaurantAccess,                // 2. Set restaurantId
  requireScopes(ApiScope.MENU_MANAGE),    // 3. Check permissions (has restaurantId now)
  async (req, res) => { /* ... */ }
);
```

**Fix 2 - Add Missing Middleware**:

```typescript
// ❌ WRONG - Missing validateRestaurantAccess
router.post('/items',
  authenticate,
  requireScopes(ApiScope.MENU_MANAGE),
  async (req, res) => { /* ... */ }
);

// ✅ CORRECT - All required middleware
router.post('/items',
  authenticate,
  validateRestaurantAccess,                // Add this
  requireScopes(ApiScope.MENU_MANAGE),
  async (req, res) => { /* ... */ }
);
```

**Fix 3 - Verify X-Restaurant-ID Header**:

```bash
# Test with curl to verify header is being sent
TOKEN="your_jwt_token_here"
RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \    # ← Must include this
  -H "Content-Type: application/json" \
  -d '{"items":[...]}'
```

**Verification**:

After fix, check logs for success:
```bash
grep "Restaurant access validated" logs/server.log  # ✅ validateRestaurantAccess passed
grep "RBAC check passed" logs/server.log            # ✅ requireScopes passed
```

**Related Documentation**:
- [AUTHENTICATION_ARCHITECTURE.md - Middleware Patterns](../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md#backend-express-middleware)
- [CONTRIBUTING.md - Adding Protected Routes](../development/CONTRIBUTING.md#adding-protected-routes)
- [Investigation Case Study](../../investigations/workspace-auth-fix-2025-10-29.md) - Real debugging example

---

### Problem: 403 Forbidden - Insufficient Permissions

**Symptoms**:
- API returns `403 Forbidden` with error message "Insufficient permissions. Required: orders:create"
- User is authenticated and restaurant context is set
- User role doesn't have the required scope

**Root Cause**: User's role lacks the required permission scope.

**Diagnosis**:

```bash
# Check what scopes the user's role has
psql -c "
  SELECT ur.role, rs.scope
  FROM user_restaurants ur
  JOIN role_scopes rs ON rs.role = ur.role
  WHERE ur.user_id = 'USER_ID_HERE'
    AND ur.restaurant_id = 'RESTAURANT_ID_HERE'
  ORDER BY rs.scope;
"

# Check what the endpoint requires
grep "requireScopes" server/src/routes/orders.routes.ts
```

**Common Causes**:

| Cause | Diagnosis | Fix |
| --- | --- | --- |
| **User has wrong role** | Kitchen user trying to create orders | Assign correct role (server, not kitchen) |
| **Database scope missing** | Code has scope, database doesn't | Run migration to sync scopes |
| **Scope naming mismatch** | Database has `orders.write`, code checks `orders:create` | Update database to use colon notation |

**Fix 1 - Assign Correct Role**:

```sql
-- Check current role
SELECT role FROM user_restaurants
WHERE user_id = 'USER_ID' AND restaurant_id = 'RESTAURANT_ID';

-- Update to correct role
UPDATE user_restaurants
SET role = 'server'  -- server can create orders
WHERE user_id = 'USER_ID' AND restaurant_id = 'RESTAURANT_ID';
```

**Fix 2 - Sync Database Scopes**:

If the scope exists in code (`server/src/middleware/rbac.ts`) but not in database:

```sql
-- 1. Check if scope exists in api_scopes
SELECT * FROM api_scopes WHERE scope = 'orders:create';

-- 2. If missing, add it
INSERT INTO api_scopes (scope, description) VALUES
  ('orders:create', 'Create new orders')
ON CONFLICT (scope) DO NOTHING;

-- 3. Add to role_scopes table
INSERT INTO role_scopes (role, scope) VALUES
  ('server', 'orders:create')
ON CONFLICT (role, scope) DO NOTHING;

-- 4. Verify
SELECT role, scope FROM role_scopes WHERE role = 'server' ORDER BY scope;
```

**Fix 3 - Fix Naming Convention**:

```sql
-- Check for legacy dot notation
SELECT * FROM api_scopes WHERE scope LIKE '%.%';

-- Delete legacy scopes
DELETE FROM role_scopes WHERE scope LIKE '%.%';
DELETE FROM api_scopes WHERE scope LIKE '%.%';

-- Add correct colon notation (see migration file for full list)
-- Reference: supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql
```

**Verification**:

```bash
# Test with corrected role
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"server@restaurant.com","password":"Demo123!"}' \
  | jq -r '.session.accessToken') |

curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"items":[...]}' \
  | jq |
```

**Related Documentation**:
- [RBAC Sync Procedure](../server/src/middleware/rbac.ts) - See comment at line 43-102
- [Investigation Case Study - Round 3](../../investigations/workspace-auth-fix-2025-10-29.md#round-3-database-scope-sync)

---

### Problem: 403 Forbidden - No Access to This Restaurant

**Symptoms**:
- API returns `403 Forbidden` with error message "No access to this restaurant"
- User is authenticated but not assigned to the restaurant
- Error occurs in `validateRestaurantAccess` middleware

**Root Cause**: User exists but has no entry in `user_restaurants` table for the requested restaurant.

**Diagnosis**:

```sql
-- Check user's restaurant assignments
SELECT ur.restaurant_id, ur.role, ur.is_active, r.name
FROM user_restaurants ur
JOIN restaurants r ON r.id = ur.restaurant_id
WHERE ur.user_id = 'USER_ID_HERE';

-- Check if restaurant exists
SELECT id, name FROM restaurants WHERE id = 'RESTAURANT_ID_HERE';
```

**Fix - Assign User to Restaurant**:

```sql
-- Add user to restaurant
INSERT INTO user_restaurants (user_id, restaurant_id, role, is_active)
VALUES (
  'USER_ID_HERE',
  'RESTAURANT_ID_HERE',
  'server',  -- or 'manager', 'kitchen', etc.
  true
)
ON CONFLICT (user_id, restaurant_id) DO UPDATE
SET is_active = true;

-- Verify assignment
SELECT * FROM user_restaurants
WHERE user_id = 'USER_ID_HERE'
  AND restaurant_id = 'RESTAURANT_ID_HERE';
```

**Verification**:

```bash
# Test with assigned user
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  | jq |

# Should return user with role
```

---

### Problem: "Unauthorized" Error on API Requests (Supabase Auth)

**Symptoms**:
- API returns 401 Unauthorized
- Frontend shows "Please log in"
- User is logged in with email/password but requests fail

**Diagnosis**:

```typescript
// Check Supabase JWT token (browser console)
const { data: { session } } = await supabase.auth.getSession();
console.log('Supabase session:', session);

if (session?.access_token) {
  // Decode JWT (without verification)
  const payload = JSON.parse(atob(session.access_token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

**Common Causes**:

| Cause | Fix |
| --- | --- |
| **Token expired** | `exp` timestamp in past → Refresh token |
| **Token not sent** | Missing `Authorization` header → Check axios config |
| **Wrong restaurant_id** | JWT `restaurant_id` doesn't match resource |
| **Invalid signature** | JWT_SECRET mismatch between environments |

**Fix - Automatic token refresh**:

```typescript
// Axios interceptor for token refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshToken = localStorage.getItem('refresh_token');
      const { data } = await axios.post('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });

      // Store new token
      localStorage.setItem('auth_token', data.token);

      // Retry original request
      error.config.headers['Authorization'] = `Bearer ${data.token}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

### Problem: RLS Policy Blocking Queries

**Symptoms**:
- Queries return empty results
- User should have access but data not visible
- Supabase logs show "policy violation"

**Diagnosis**:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'orders';

-- Check current session variables
SHOW app.restaurant_id;
```

**Common Causes**:

1. **Session variable not set**: `app.restaurant_id` not configured
2. **Wrong role**: Policy applies to `authenticated` but user is `anon`
3. **Policy logic error**: `USING` clause incorrect

**Fix**:

```typescript
// Ensure session variable set (server-side)
const { data, error } = await supabase.rpc('set_session_restaurant_id', {
  restaurant_id: req.user.restaurantId,
});

// Then query with RLS applied
const orders = await supabase.from('orders').select('*');
```

**Bypass RLS (admin/debug only)**:

```typescript
// Use service role key (server-side ONLY)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!, // Bypasses RLS
);

// Query without RLS restrictions
const allOrders = await supabaseAdmin.from('orders').select('*');
```

---

## WebSocket Connection Issues

### Problem: WebSocket Connection Fails

**Symptoms**:
- Browser console: "WebSocket connection failed"
- Kitchen display not updating
- Network tab shows failed WebSocket upgrade

**Diagnosis**:

```typescript
// Check WebSocket URL and headers
const ws = new WebSocket('wss://api.example.com?token=JWT_TOKEN');

ws.onopen = () => console.log('✅ Connected');
ws.onerror = (err) => console.error('❌ Error:', err);
ws.onclose = (event) => console.log('Closed:', event.code, event.reason);
```

**Common Error Codes**:

| Code | Meaning | Fix |
| --- | --- | --- |
| 1000 | Normal closure | Expected, no action |
| 1001 | Going away (server restart) | Auto-reconnect |
| 1006 | Abnormal closure (network) | Check firewall/proxy |
| 1008 | Policy violation (auth failed) | Fix JWT token |
| 1011 | Server error | Check server logs |

**Fix - Connection issues**:

```bash
# 1. Check server is running
curl https://api.example.com/health

# 2. Check WebSocket endpoint accessible
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://api.example.com

# Should return: 101 Switching Protocols
```

**Fix - Proxy/Load Balancer**:

```yaml
# Render: Enable WebSocket support
services:
  - type: web
    name: api
    env: node
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: WS_ENABLED
        value: true
    # WebSockets work by default on Render
```

---

## CORS Errors

### Problem: "Blocked by CORS policy" Error

**Symptoms**:
- Browser console: "Access to fetch at '...' from origin '...' has been blocked by CORS policy"
- API requests fail with CORS error
- Preflight OPTIONS requests fail

**Diagnosis**:

```bash
# Check CORS headers
curl -H "Origin: https://your-frontend.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-api.com/api/v1/orders

# Should return:
# Access-Control-Allow-Origin: https://your-frontend.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE
# Access-Control-Allow-Headers: Content-Type, Authorization
```

**Common Causes**:

| Cause | Fix |
| --- | --- |
| **Frontend URL not in allowlist** | Add to `ALLOWED_ORIGINS` env var |
| **Credentials not allowed** | Enable `credentials: true` in CORS config |
| **Wrong HTTP method** | Add method to `allowedMethods` array |
| **Custom header not allowed** | Add header to `allowedHeaders` array |

**Fix - Add origin to allowlist**:

```typescript
// server/src/server.ts
const allowedOrigins = new Set<string>([
  'http://localhost:5173',
  'https://your-frontend.vercel.app',
  'https://your-custom-domain.com', // Add your domain
]);

// Or use environment variable
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(origin => {
    allowedOrigins.add(origin.trim());
  });
}
```

**Fix - Vercel preview URLs**:

```typescript
// Auto-allow Vercel preview deployments
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.has(origin) ||
      origin.match(/^https:\/\/.*\.vercel\.app$/)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

### Problem: Custom Header Blocked by CORS

**Symptoms**:
- Browser console: "Request header X-Client-Flow is not allowed by Access-Control-Allow-Headers in preflight response"
- API requests with custom headers fail
- Preflight OPTIONS request succeeds but main request blocked

**Diagnosis**:

```bash
# Test custom header in preflight
curl -H "Origin: https://your-frontend.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type, X-Client-Flow" \
     -X OPTIONS \
     https://your-api.com/api/v1/orders

# Check response - should include X-Client-Flow in Access-Control-Allow-Headers
```

**Common Custom Headers in Restaurant OS**:
- `X-Client-Flow` - Order flow tracking (online, kiosk, server)
- `X-Restaurant-ID` - Multi-tenant context
- `x-request-id` - Request tracing
- `X-CSRF-Token` - CSRF protection
- `x-demo-token-version` - Demo auth versioning

**Fix - Add header to CORS allowlist**:

```typescript
// server/src/server.ts
app.use(cors({
  // ...other CORS config
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-restaurant-id',
    'X-Restaurant-ID',
    'x-request-id',
    'X-CSRF-Token',
    'x-demo-token-version',
    'X-Client-Flow',         // Add your custom header
    'x-client-flow',         // Case variations
  ],
}));
```

**CRITICAL**: If you add a new custom header to client requests, you MUST add it to the `allowedHeaders` array in `server/src/server.ts:145` to prevent CORS blocking.

**Related Documentation**:
- [DEPLOYMENT.md - CORS Configuration](../operations/DEPLOYMENT.md#production-diagnostics)
- [CHANGELOG.md - v6.0.9](../../CHANGELOG.md#609-2025-10-18-online-order-flow-fix-cors-auth)

---

## Database & RLS Problems

### Problem: Slow Queries

**Symptoms**:
- API requests take >1 second
- Kitchen display lags when loading orders
- Database CPU at 100%

**Diagnosis**:

```sql
-- Find slow queries
SELECT
  pid,
  now() - query_start as duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '1 second'
ORDER BY duration DESC;

-- Check missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename = 'orders'
ORDER BY n_distinct DESC;
```

**Common Issues**:

| Issue | Fix |
| --- | --- |
| **Missing index on restaurant_id** | `CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);` |
| **Sequential scan on large table** | Add index on frequently filtered columns |
| **Complex RLS policies** | Simplify `USING` clause or use materialized views |
| **N+1 queries** | Use `select('*, items(*)')` to join in one query |

**Fix - Add indexes**:

```sql
-- Critical indexes for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON orders(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON orders(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant
  ON menu_items(restaurant_id);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_orders_items_gin
  ON orders USING GIN (items);
```

---

## Performance Issues

### Problem: High Memory Usage

**Symptoms**:
- Server crashes with "Out of memory"
- Render logs: "R14 - Memory quota exceeded"
- Node.js heap out of memory

**Diagnosis**:

```bash
# Check memory usage
ps aux | grep node
# Look for RSS column (memory in KB)

# Monitor memory over time
watch -n 5 'ps aux | grep node'

# Node.js heap usage
node --expose-gc your-script.js
```

**Common Causes**:

1. **Memory leak in WebSocket connections**
2. **Large JSON payloads not garbage collected**
3. **Image uploads held in memory**
4. **Inefficient caching**

**Fix**:

```typescript
// 1. Limit WebSocket client tracking
const MAX_CLIENTS = 1000;

wss.on('connection', (ws) => {
  if (wss.clients.size > MAX_CLIENTS) {
    ws.close(1008, 'Server at capacity');
    return;
  }
});

// 2. Stream large responses
router.get('/api/v1/orders/export', async (req, res) => {
  const stream = supabase.from('orders').select('*').stream();

  res.setHeader('Content-Type', 'application/json');
  stream.pipe(res);
});

// 3. Implement response size limits
app.use(express.json({ limit: '1mb' }));
```

---

## Deployment Issues

### Problem: ESM/CommonJS Module Incompatibility

**Symptoms**:
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find module` on Render
- `"X" is not exported by` errors on Vercel/Vite builds
- Mixed module format errors between server and client
- `import.meta` errors when compiling to CommonJS

**Root Cause**:
- Server (Node.js) requires CommonJS modules
- Client browser files use ESM features (import.meta)
- TypeScript compilation doesn't add `.js` extensions for ESM
- Package.json `"type": "module"` conflicts with CommonJS compilation

**Solution**:

1. **Remove `"type": "module"` from shared/package.json**
```json
{
  "name": "@rebuild/shared",
  // Remove this line: "type": "module",
  "main": "dist/index.js"
}
```

2. **Configure TypeScript for CommonJS**
```json
// shared/tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

3. **Exclude ESM-only files from compilation**
```json
// shared/tsconfig.json
{
  "exclude": ["config/browser.ts"]  // Uses import.meta
}
```

4. **Update Vite config for CommonJS interop**
```javascript
// client/vite.config.ts
{
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /shared\/dist/],
      defaultIsModuleExports: true
    }
  },
  optimizeDeps: {
    include: ['@rebuild/shared/constants/business'],
    exclude: []  // Don't exclude workspace packages
  }
}
```

### Problem: Render Deployment Fails

**Symptoms**:
- Render build fails with error
- Deploy succeeds but app doesn't start
- Health check failures

**Diagnosis**:

```bash
# Check Render logs
# Dashboard → Service → Logs → Filter by "error"

# Common error patterns:
"Module not found"  # Missing dependency
"Port already in use"  # Process management issue
"ECONNREFUSED"  # Database connection failed
```

**Common Fixes**:

| Issue | Fix |
| --- | --- |
| **Missing dependency** | Add to `package.json` and commit |
| **Build timeout** | Increase build timeout in Render settings |
| **Environment variable missing** | Add in Render Dashboard → Environment |
| **Wrong Node version** | Set `NODE_VERSION` env var |

**Fix - Build command**:

```json
// package.json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && vite build",
    "build:server": "cd server && tsc",
    "start": "node server/dist/server.js"
  }
}
```

---

## Emergency Procedures

### System Down - Quick Recovery

1. **Check Render status**: https://status.render.com
2. **Check Supabase status**: https://status.supabase.com
3. **Check Vercel status**: https://vercel-status.com
4. **Restart services**:
   - Render: Dashboard → Service → Manual Deploy → "Clear build cache & deploy"
   - Vercel: Dashboard → Deployments → Redeploy

### Data Loss - Restore from Backup

```sql
-- Supabase automatic backups (point-in-time recovery)
-- Dashboard → Project → Database → Backups
-- Select restore point → Restore

-- Manual backup
pg_dump -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  > backup-$(date +%Y%m%d).sql
```

### Critical Bug - Rollback Deployment

```bash
# Render: Dashboard → Service → Deployments → Previous → "Rollback"

# Vercel:
vercel rollback https://july25-client.vercel.app

# Git rollback:
git revert HEAD
git push origin main
```

---

## Getting Help

### Logs Locations

| Service | Log Location |
| --- | --- |
| **Render (Server)** | Dashboard → Service → Logs |
| **Vercel (Client)** | Dashboard → Deployments → Function Logs |
| **Supabase (DB)** | Dashboard → Logs → Database |
| **Browser (Client)** | DevTools → Console (F12) |

### Debug Mode

Enable verbose logging:

```bash
# .env (server)
LOG_LEVEL=debug
DEBUG=*

# Browser console
localStorage.setItem('debug', '*');
location.reload();
```

### Support Channels

1. **Documentation**: Check `/docs` directory
2. **GitHub Issues**: https://github.com/your-repo/issues
3. **Team Chat**: Slack/Discord
4. **Emergency**: Contact on-call engineer

---

## Related Documentation

- [Auth Diagnostic Guide](./AUTH_DIAGNOSTIC_GUIDE.md) - Authentication debugging
- [Investigation Reports](../../investigations/) - Past incident analysis
- [Development Process](../development/DEVELOPMENT_PROCESS.md) - Development workflows
- [Deployment Guide](../operations/DEPLOYMENT.md) - Production deployment
- [Database Schema](../../reference/schema/DATABASE.md) - Database reference

---

**Last Updated**: October 30, 2025
**Maintainer**: Development Team
**Version**: 6.0.14
