# Naming Lexicon

**Last Updated:** 2025-10-31

**Version:** 2025-10-18
**Format:** Canonical term registry

## Roles (Application Identity)

### customer
- **Status:** ✅ Stable (v6.0.14+)
- **Definition:** Public-facing self-service user (online orders, kiosk)
- **Use Cases:** CheckoutPage, KioskCheckoutPage, online ordering
- **Aliases:** `kiosk_demo` (DEPRECATED, remove after migration)
- **Not:** `kiosk`, `guest`, `public`

### server
- **Status:** ✅ Stable
- **Definition:** In-restaurant staff member assisting customers
- **Use Cases:** ServerView, voice ordering for dine-in, table management
- **Not:** `waiter`, `staff`, `employee`

### manager
- **Status:** ✅ Stable
- **Definition:** Restaurant manager with staff/menu/reporting access
- **Not:** `admin` (admin is system-level, manager is restaurant-level)

### owner
- **Status:** ✅ Stable
- **Definition:** Restaurant owner with full access to their restaurant(s)

## Headers

### X-Client-Flow
- **Values:** `online`, `kiosk`, `server`
- **Purpose:** Identify originating client context for telemetry
- **Not:** `X-Flow-Type`, `Client-Type`

### X-Restaurant-ID
- **Format:** UUID v4
- **Purpose:** Multi-tenant restaurant context
- **Not:** `Restaurant-Id` (wrong case), `X-Restaurant` (missing ID suffix)

## Scopes (Permissions)

See [ROLE_SCOPE_MATRIX.md](./ROLE_SCOPE_MATRIX.md) for complete list.

## Deprecated Terms

### kiosk_demo
- **Status:** ⚠️ DEPRECATED (v6.0.8)
- **Replaced By:** `customer`
- **Removal:** After 30 days zero usage
- **Why:** Confusing name suggested demo-only use; `customer` is clearer
