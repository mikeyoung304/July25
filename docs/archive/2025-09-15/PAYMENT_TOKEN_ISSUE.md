# Payment Token Caching Issue

## Problem
When updating authentication scopes (e.g., adding `payments:process` to demo tokens), existing cached tokens in the browser continue to be used, causing 403 Forbidden errors on payment endpoints.

## Root Cause
- Demo tokens are cached in `sessionStorage` with key `DEMO_AUTH_TOKEN`
- The `DemoAuthService` (client/src/services/auth/demoAuth.ts) checks cached tokens before fetching new ones
- When backend scopes are updated, frontend continues using old cached tokens until they expire (1 hour)

## Symptoms
- Payment processing returns 403 Forbidden even after adding `payments:process` scope to demo tokens
- Error in console: `POST http://localhost:3001/api/v1/payments/create 403 (Forbidden)`
- PaymentErrorBoundary displays error screen

## Solution

### Immediate Fix (User Action Required)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run: `sessionStorage.removeItem('DEMO_AUTH_TOKEN');`
4. Refresh the page
5. New token with updated scopes will be fetched

### Long-term Solutions

#### Option 1: Version Token Scopes
Add a version identifier to tokens that changes when scopes are updated:
```javascript
const TOKEN_VERSION = 'v2'; // Increment when scopes change
const STORAGE_KEY = `DEMO_AUTH_TOKEN_${TOKEN_VERSION}`;
```

#### Option 2: Validate Token Scopes
Check if cached token has required scopes before using it:
```javascript
if (cachedToken && !hasRequiredScopes(cachedToken, ['payments:process'])) {
  sessionStorage.removeItem(STORAGE_KEY);
  cachedToken = null;
}
```

#### Option 3: Shorter Cache Duration
Reduce token cache time to minimize impact of scope changes:
```javascript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes instead of full token lifetime
```

## Prevention
1. Include scope validation in token caching logic
2. Document scope requirements in CLAUDE.md
3. Add development mode option to bypass token caching
4. Implement token refresh mechanism when 403 errors occur

## Related Files
- `client/src/services/auth/demoAuth.ts` - Token caching logic
- `server/src/routes/auth.routes.ts` - Token generation with scopes
- `server/src/routes/payments.routes.ts` - Payment endpoint requiring scope
- `client/src/pages/CheckoutPage.tsx` - Payment flow implementation

## Required Scopes for Demo Mode
```javascript
const DEMO_SCOPES = [
  'menu:read',        // View menu items
  'orders:create',    // Create orders
  'ai.voice:chat',    // Voice ordering
  'payments:process'  // Process payments (REQUIRED for checkout)
];
```