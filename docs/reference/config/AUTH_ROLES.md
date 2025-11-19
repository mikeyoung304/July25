# Authentication Roles

**Last Updated:** 2025-11-19
**Version**: 6.0.14 (Originally documented in v6.0.8)

## Role Definitions

### customer (Public Self-Service)
**Use Cases**: Online ordering, kiosk ordering, any public-facing self-service flow
**Permissions**:
- `orders:create` - Create new orders
- `orders:read` - View own orders
- `payments:process` - Complete payments
- `menu:read` - View menu items

**Client Usage**:
```typescript
import { useAuth } from '@/contexts/AuthContext';

// In CheckoutPage or KioskCheckoutPage
const { loginAsDemo, isAuthenticated } = useAuth();

// Ensure customer is authenticated
if (!isAuthenticated) {
  await loginAsDemo('customer');
}
```

**Deprecated (v6.0.9)**: `getCustomerToken()` from `roleHelpers` stores tokens in sessionStorage (incompatible with httpClient). Use `AuthContext.loginAsDemo('customer')` instead.

### owner (Restaurant Owner)
**Use Cases**: Full administrative access, system configuration, financial oversight
**Permissions**: All 15 scopes
- `orders:create`, `orders:read`, `orders:update`, `orders:delete`, `orders:status`
- `payments:process`, `payments:refund`, `payments:read`
- `reports:view`, `reports:export`
- `staff:manage`, `staff:schedule`
- `system:config` - System-level configuration (owner only)
- `menu:manage` - Manage menu items
- `tables:manage` - Manage floor plan and table layout

### manager (Operations Manager)
**Use Cases**: Day-to-day operations, staff management, financial operations
**Permissions**: All except `system:config` (14 scopes)
- `orders:create`, `orders:read`, `orders:update`, `orders:delete`, `orders:status`
- `payments:process`, `payments:refund`, `payments:read`
- `reports:view`, `reports:export`
- `staff:manage`, `staff:schedule`
- `menu:manage` - Manage menu items
- `tables:manage` - Manage floor plan and table layout

### server (Wait Staff)
**Use Cases**: Taking orders, processing payments, table service, voice ordering
**Permissions**: 6 scopes
- `orders:create` - Create orders for customers
- `orders:read` - View orders
- `orders:update` - Modify orders
- `orders:status` - Update order status
- `payments:process` - Process payments
- `payments:read` - View payment details

**Note**: Servers can view tables but cannot modify floor plan layout (no `tables:manage` scope)

**Client Usage**:
```typescript
import { useAuth } from '@/contexts/AuthContext';

// In ServerView or voice ordering hooks
const { loginAsDemo } = useAuth();

// Login as server for staff operations
await loginAsDemo('server');
```

**Deprecated (v6.0.9)**: `getServerToken()` from `roleHelpers` stores tokens in sessionStorage (incompatible with httpClient). Use `AuthContext.loginAsDemo('server')` instead.

### kitchen (Kitchen Staff)
**Use Cases**: Kitchen display system, order preparation, status updates
**Permissions**: 2 scopes
- `orders:read` - View incoming orders
- `orders:status` - Update order preparation status (e.g., preparing, ready)

### expo (Expeditor)
**Use Cases**: Order coordination, quality control, expediting orders to servers
**Permissions**: 2 scopes
- `orders:read` - View orders ready for service
- `orders:status` - Update order delivery status

### cashier (Cashier/Host)
**Use Cases**: Payment processing, customer checkout
**Permissions**: 3 scopes
- `orders:read` - View orders for checkout
- `payments:process` - Process payments
- `payments:read` - View payment details

### kiosk_demo (DEPRECATED - Alias to 'customer')
**Status**: DEPRECATED in v6.0.8
**Behavior**: When `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true` (default), tokens with role='kiosk_demo' are automatically aliased to 'customer' with a warning log
**Migration**: Update all JWT token generators to issue 'customer' role instead
**Timeline**: Will be removed in future version after migration complete

## X-Client-Flow Header

All order creation requests now include an `X-Client-Flow` header to identify the originating client context:

- `X-Client-Flow: online` - CheckoutPage (public online orders)
- `X-Client-Flow: kiosk` - KioskCheckoutPage (in-store self-service)
- `X-Client-Flow: server` - ServerView (staff-assisted orders)

This header enables server-side telemetry and flow-specific business logic.

## Migration Guide

### Phase 1: Deploy with Backwards Compatibility (v6.0.8)
1. Deploy code with `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true`
2. Old 'kiosk_demo' tokens continue to work (aliased to 'customer')
3. New code issues 'customer' tokens via `getCustomerToken()`

### Phase 2: Update Token Generators
Update any remaining services that generate JWTs:
```typescript
// OLD
const token = jwt.sign({ sub: userId, role: 'kiosk_demo', ... }, secret);

// NEW
const token = jwt.sign({ sub: userId, role: 'customer', ... }, secret);
```

### Phase 3: Disable Alias (Future)
After confirming no 'kiosk_demo' tokens are being issued:
1. Set `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false`
2. Test thoroughly
3. Monitor logs for rejected kiosk_demo tokens
4. If none found for 30 days, remove kiosk_demo from ROLE_SCOPES

## Testing

### Customer Role Test
```bash
# Generate customer token
curl -X POST http://localhost:3001/api/v1/auth/demo-session \
  -H "Content-Type: application/json" \
  -d '{"role": "customer", "restaurantId": "11111111-1111-1111-1111-111111111111"}'

# Create order with customer token
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer <customer_token>" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -H "X-Client-Flow: online" \
  -H "Content-Type: application/json" \
  -d '{...order data...}'
```

### Server Role Test
```bash
# Generate server token
curl -X POST http://localhost:3001/api/v1/auth/demo-session \
  -H "Content-Type: application/json" \
  -d '{"role": "server", "restaurantId": "11111111-1111-1111-1111-111111111111"}'

# Create order with server token
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer <server_token>" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -H "X-Client-Flow: server" \
  -H "Content-Type: application/json" \
  -d '{...order data...}'
```

### Alias Test (with AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true)
```bash
# Generate kiosk_demo token (deprecated)
curl -X POST http://localhost:3001/api/v1/auth/demo-session \
  -H "Content-Type: application/json" \
  -d '{"role": "kiosk_demo", "restaurantId": "11111111-1111-1111-1111-111111111111"}'

# Should succeed (aliased to customer) with WARN log:
# "⚠️ auth: role 'kiosk_demo' is deprecated; treating as 'customer'"
```

## See Also
- [October 18 Plan - Archived] - Complete dual-auth architecture analysis
- [docs/AUTHENTICATION_ARCHITECTURE.md](../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Full authentication documentation
- [.env.example](../.env.example) - AUTH_ACCEPT_KIOSK_DEMO_ALIAS configuration
