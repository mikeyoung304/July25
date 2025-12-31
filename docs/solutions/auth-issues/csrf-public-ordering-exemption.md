---
title: CSRF Protection Blocking Public Kiosk/Online Orders
slug: csrf-public-ordering-exemption
problem_type: authentication
components:
  - server.ts
  - csrf.ts
  - CheckoutPage.tsx
  - CardPayment.tsx
symptoms:
  - 403 Forbidden on POST /api/v1/orders from kiosk
  - 403 Forbidden on POST /api/v1/payments/create-payment-intent
  - "CSRF token required" error message
  - Kiosk orders fail despite X-Client-Flow: kiosk header
  - Online checkout fails for anonymous customers
root_cause: |
  CSRF middleware requires both a cookie (auth_token with embedded CSRF) and X-CSRF-Token header.
  Public ordering flows (kiosk, online) never authenticate - users don't log in.
  Without login, no CSRF cookie is set, so all POST requests fail CSRF validation.
severity: high
date_solved: 2025-12-31
tags:
  - csrf
  - authentication
  - kiosk
  - public-orders
  - security
related_docs:
  - docs/solutions/auth-issues/cross-origin-samesite-cookie-auth-failure.md
  - docs/solutions/security-issues/csrf-protection.md
  - docs/quick-reference/csrf-auth-endpoints.md
---

# CSRF Protection Blocking Public Kiosk/Online Orders

## Problem

Public ordering flows (kiosk self-service, online checkout) fail with 403 Forbidden because CSRF middleware blocks requests without valid CSRF tokens.

## Symptoms Observed

1. Kiosk: Add item to cart → Checkout → 403 Forbidden on POST /api/v1/orders
2. Online: Complete checkout form → 403 on payment processing
3. Console shows "CSRF token required"
4. Network tab shows X-Client-Flow header is present but request still blocked

## Root Cause

CSRF protection works by:
1. Server sets CSRF cookie on login (`setCsrfCookie(res)`)
2. Client reads cookie and sends value in `X-CSRF-Token` header
3. Server validates header matches cookie

**The Problem:** Public ordering flows are **unauthenticated by design**:
- Kiosk users walk up and order without logging in
- Online customers checkout without creating accounts
- No login = no CSRF cookie = all POST requests fail

## Solution

Exempt public ordering flows from CSRF protection while maintaining security through alternative mechanisms.

### Server CSRF Exemption (server.ts)

```typescript
// CSRF protection - exempt endpoints that don't have CSRF token yet
app.use((req, res, next) => {
  // Exempt Stripe webhooks from CSRF (they use signature verification instead)
  if (req.path === '/api/v1/payments/webhook') {
    return next();
  }
  // Exempt auth endpoints - users don't have CSRF token before authenticating
  if (req.path.startsWith('/api/v1/auth/login') ||
      req.path.startsWith('/api/v1/auth/pin-login') ||
      req.path.startsWith('/api/v1/auth/station-login') ||
      req.path.startsWith('/api/v1/auth/refresh')) {
    return next();
  }
  // Exempt public ordering flows (kiosk/online) - these users never logged in
  // so they don't have a CSRF cookie. Security is maintained via:
  // - X-Client-Flow header validation in orders.routes.ts
  // - X-Restaurant-ID header requirement
  // - Server-side order total calculation (no client-trusted amounts)
  const clientFlow = (req.headers['x-client-flow'] as string)?.toLowerCase();
  if ((clientFlow === 'kiosk' || clientFlow === 'online') &&
      (req.path.startsWith('/api/v1/orders') || req.path.startsWith('/api/v1/payments'))) {
    return next();
  }
  return csrfProtection(req, res, next);
});
```

### Security Maintained By

Even without CSRF, public orders are protected by:

| Mechanism | What It Prevents |
|-----------|------------------|
| X-Client-Flow header validation | Requests must explicitly identify as kiosk/online |
| X-Restaurant-ID header required | Orders tied to specific restaurant |
| Server-side total calculation | Client cannot manipulate prices |
| Stripe payment verification | Payment amounts verified by Stripe |
| Rate limiting | Abuse prevention |

### Client Headers (CheckoutPage.tsx)

```typescript
// Orders
const orderResponse = await createOrder('/api/v1/orders', {
  type: 'online',
  items: cart.items.map(item => ({...})),
  // ... order data
}, {
  headers: {
    'X-Client-Flow': 'online'  // or 'kiosk'
  }
});

// Payments
const paymentResponse = await processPayment('/api/v1/payments/create-payment-intent', {
  order_id: order.id,
  token,
  idempotency_key: `checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
}, {
  headers: {
    'X-Client-Flow': 'online'
  }
});
```

## Additional Fix: Payment Endpoint

During testing, also discovered wrong payment endpoint:

| Incorrect | Correct |
|-----------|---------|
| `/api/v1/payments/create` | `/api/v1/payments/create-payment-intent` |

Fixed in both `CheckoutPage.tsx` and `CardPayment.tsx`.

## Files Changed

| File | Change |
|------|--------|
| `server/src/server.ts` | Added CSRF exemption for kiosk/online flows |
| `client/src/pages/CheckoutPage.tsx` | Added X-Client-Flow header, fixed payment endpoint |
| `client/src/components/payments/CardPayment.tsx` | Fixed payment endpoint |

## Prevention Strategies

### New Public Endpoint Checklist

When adding endpoints that serve unauthenticated users:

- [ ] Add CSRF exemption in server.ts with comment explaining why
- [ ] Implement alternative security (rate limiting, validation)
- [ ] Document in endpoint comments
- [ ] Test with fresh browser (no cookies)

### Code Review Checklist

- [ ] Public endpoints have CSRF exemption
- [ ] Client sends X-Client-Flow header for public flows
- [ ] Server validates X-Client-Flow before exempting
- [ ] No sensitive operations rely solely on client input

## Verification

Tested full order flow:

1. Kiosk → View Menu → Add Fall Sampler → Checkout
2. Order created successfully (201)
3. Payment processed (demo mode)
4. Order appears in Kitchen Display as "Kiosk order"
5. Kitchen shows order with correct details

## Related Documentation

- [Cross-Origin Auth Fix](./cross-origin-samesite-cookie-auth-failure.md)
- [CSRF Protection Setup](../security-issues/csrf-protection.md)
- [CSRF/Auth Quick Reference](../../quick-reference/csrf-auth-endpoints.md)
