# Voice Server Mode Gap Analysis Checklist

## Date: 2025-09-10
## Status: Root Causes Identified

## Gap Analysis Matrix

| Hypothesis | Status | Evidence | Impact |
|------------|--------|----------|--------|
| **State Disconnect** | ✅ CONFIRMED | Preview UI never writes to cart or calls payment path | CRITICAL |
| **Auth Mismatch** | ❌ Not Issue | Server uses proper JWT with orders:create scope | Low |
| **API Base URL/CORS** | ❌ Not Issue | Orders API call succeeds with correct base URL | None |
| **Parser→SKU Mapping** | ✅ CONFIRMED | menu_item_id undefined, using fallback prices | HIGH |
| **Event Bus Gap** | ❌ Partial Issue | Events emit but with wrong status ('pending' not 'confirmed') | MEDIUM |
| **Legacy Glue** | ✅ CONFIRMED | Stale voice hook bypasses modern payment flow | CRITICAL |

## Detailed Analysis

### 1. State Disconnect ✅ CRITICAL

**Evidence:**
- `useVoiceOrderWebRTC` maintains local state: `useState<OrderItem[]>([])`
- Does NOT use `UnifiedCartContext`
- `submitOrder()` directly calls `/api/v1/orders` then stops
- No integration with `VoiceCheckoutOrchestrator` or payment flow

**Impact:**
- Orders created but never paid for
- No Square Terminal integration
- No payment method selection
- Orders stuck in 'pending' status

### 2. Auth Mismatch ❌ NOT AN ISSUE

**Evidence:**
- Server page uses `useAuth()` → Supabase JWT
- Token includes required scope: `orders:create`
- Authentication succeeds: `201 Created` response
- `requireScope(['orders:create'])` passes in backend

**Impact:**
- None - auth is working correctly

### 3. API Base URL/CORS ❌ NOT AN ISSUE

**Evidence:**
- `VITE_API_BASE_URL=http://localhost:3001` correctly configured
- `apiUrl()` helper properly constructs URLs
- Order creation POST succeeds
- No CORS errors in console

**Impact:**
- None - API communication works

### 4. Parser→SKU Mapping ✅ HIGH IMPACT

**Evidence:**
```javascript
// useVoiceOrderWebRTC.ts:173-175
menu_item_id: item.menuItemId,  // undefined
price: menuItems.find(m => m.id === item.menuItemId)?.price || 12.99  // fallback
```
- `menuItemId` is undefined for voice-parsed items
- Using hardcoded fallback price ($12.99)
- No proper menu item resolution

**Impact:**
- Incorrect pricing
- Missing item details
- Square API may reject invalid items

### 5. Event Bus Gap ❌ PARTIAL ISSUE

**Evidence:**
- WebSocket event DOES emit: `order:created`
- Includes correct `restaurant_id`
- BUT status is 'pending' not 'confirmed'
- KDS may filter out 'pending' orders

**Code Reference:**
```typescript
// orders.service.ts:173-174
broadcastNewOrder(this.wss, data);  // data.status = 'pending'
```

**Impact:**
- KDS might not display pending orders
- Kitchen won't see orders until confirmed

### 6. Legacy Glue ✅ CRITICAL

**Evidence:**
- `useVoiceOrderWebRTC` is a legacy hook from early implementation
- Predates `UnifiedCartContext` architecture
- Predates `VoiceCheckoutOrchestrator`
- No payment flow integration
- Comments indicate it's a simplified path

**Impact:**
- Completely bypasses modern checkout flow
- No payment processing
- No proper order lifecycle

## Root Cause Summary

### Primary Issues (Must Fix)

1. **Missing Payment Integration** ✅
   - After order creation, no call to `/api/v1/terminal/checkout`
   - No Square Terminal device selection
   - No payment method choice

2. **Cart Context Bypass** ✅
   - Not using `UnifiedCartContext`
   - Missing checkout orchestration
   - Violates single source of truth

3. **Incomplete Order Flow** ✅
   - Orders created as 'pending'
   - Never transition to 'confirmed'
   - No payment status tracking

### Secondary Issues (Should Fix)

4. **Menu Item Resolution** ✅
   - Voice parsing doesn't resolve to menu IDs
   - Using fallback prices
   - Missing modifier handling

5. **Mode Differentiation** ✅
   - Server and kiosk use same conversational UI
   - Server shouldn't have TTS responses
   - No "listen-only" mode for servers

## Fix Priority

### Phase 1 - Immediate Patch
1. Add payment flow after order creation
2. Integrate Square Terminal checkout
3. Update order status to 'confirmed' after payment

### Phase 2 - Proper Integration
1. Migrate to UnifiedCartContext
2. Use VoiceCheckoutOrchestrator
3. Implement proper mode separation

### Phase 3 - Complete Solution
1. Fix menu item resolution
2. Add server-specific voice UI (no TTS)
3. Implement device selection/pairing
4. Add comprehensive tests

## Verification Criteria

- [ ] Order creation followed by payment call
- [ ] Square Terminal checkout initiated
- [ ] Order status transitions to 'confirmed'
- [ ] KDS receives confirmed orders
- [ ] Payment completes successfully
- [ ] Receipt generated
- [ ] Table status updated