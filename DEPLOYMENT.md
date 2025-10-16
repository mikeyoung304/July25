# Deployment Guide

## Environments & Secrets

**Required:**
- `KIOSK_JWT_SECRET` (no fallback; server fails fast if unset)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL` (prod), `ALLOWED_ORIGINS` (CSV)

**Optional (non-prod only):**
- `DEMO_LOGIN_ENABLED=true` to enable `/api/v1/auth/demo-session`

## CORS (Production)
- Origin must match `FRONTEND_URL` or be in `ALLOWED_ORIGINS`.
- Requests from unlisted origins are rejected (403).

## WebSocket (Production)
- JWT required for connection; anonymous or dev bypass is disabled in prod.

## Release Flow
1. **Staging:** apply DB migrations; run unit + e2e; artifact audit (no secrets).
2. **RC:** tag `v6.0.8-rc.1`.
3. **Canary:** 5–10% traffic for 60–120m; monitor 5xx, WS reconnect churn, login errors, KDS lag/dups.
4. **Rollout:** 100% if green; otherwise revert last PR or rollback to previous tag.

## Rollback (App)
- Revert merge of last change-set PR; deploy previous image `vX.Y.Z`.

## Rollback (DB)
- Keep hot-patch SQL scripts to relax/reapply RLS or constraints temporarily (see [DATABASE.md](./DATABASE.md)).

## Post-Deploy Checks
- WS reconnects/min < 0.2; KDS e2e happy path under 1s (P95); no CORS rejections from allowed domains.

## Square Integration

### Payment Integration Architecture

**Square SDK v43** is used for payment processing. Authentication uses the `token` property (not `accessToken` as in prior versions).

**Implementation:** `server/src/routes/payments.routes.ts:7,28` (Source: SQUARE_INTEGRATION@9abd2d9, verified)
```typescript
import { SquareClient, SquareEnvironment } from 'square';
const client = new SquareClient({ token: process.env['SQUARE_ACCESS_TOKEN']! });
```

### Credential Validation at Startup

Server validates that `SQUARE_LOCATION_ID` matches the access token on startup. Logs prominent warnings if mismatch detected. (Source: SQUARE_INTEGRATION@9abd2d9, verified)

**Implementation:** `server/src/routes/payments.routes.ts:37-101`
- Fetches locations from Square API
- Validates configured location exists in access token's permitted locations
- Fails fast with error logging on mismatch

### Idempotency Keys

Idempotency keys shortened to 26 characters to stay within Square's 45-character limit. (Source: SQUARE_INTEGRATION@9abd2d9, verified)

**Format:** `{last_12_order_id}-{timestamp}` (12 + 1 + 13 = 26 chars)

**Implementation:** `server/src/services/payment.service.ts:84`
```typescript
const idempotencyKey = `${order.id.slice(-12)}-${Date.now()}`;
```

### Server-Side Amount Validation

Server NEVER trusts client-provided amounts. All payment amounts are validated server-side. (Source: SQUARE_INTEGRATION@9abd2d9, verified)

**Implementation:** `server/src/routes/payments.routes.ts:132,158`
- `PaymentService.validatePaymentRequest()` recalculates totals
- Payment request uses server-calculated amount: `amountMoney: { amount: BigInt(serverAmount) }`

### Payment Endpoint

Primary payment creation endpoint: `POST /api/v1/payments/create` (Source: SQUARE_INTEGRATION@9abd2d9, verified)

**Implementation:** `server/src/routes/payments.routes.ts:104`
- Requires authentication and restaurant access validation
- Returns payment result or error

### Demo Mode Support

Supports demo mode with `SQUARE_ACCESS_TOKEN=demo` for development/testing. (Source: SQUARE_INTEGRATION@9abd2d9, verified)

**Implementation:** `server/src/routes/payments.routes.ts:171`

### Payment Audit Logs

Payment audit logs created for PCI compliance (7-year retention recommended). (Source: SQUARE_INTEGRATION@9abd2d9, verified)

**Implementation:** `server/src/routes/payments.routes.ts:212`
```typescript
await PaymentService.logPaymentAttempt({ orderId, amount, status, ... })
```

### Required Environment Variables

- `SQUARE_ACCESS_TOKEN` - Square API access token
- `SQUARE_LOCATION_ID` - Square location ID (must match access token)

**Configuration:** Referenced in `server/src/config/env.ts`, `server/src/config/environment.ts` (Source: SQUARE_INTEGRATION@9abd2d9, verified)

## WebSockets

### JWT Authentication Required

WebSocket connections require authentication. In production mode, connections without valid JWT are rejected. (Source: WEBSOCKET_EVENTS@9abd2d9, verified)

**Implementation:** `server/src/middleware/auth.ts:114` + `server/src/utils/websocket.ts:52-61`
```typescript
export async function verifyWebSocketAuth(request) {
  // Validates JWT signature
  // Rejects connections with no token (line 124)
  // Returns restaurantId from decoded JWT
}
```

On connection:
```typescript
const auth = await verifyWebSocketAuth(request);
if (!auth) {
  console.log("WebSocket authentication failed");
  ws.close(1008, 'Unauthorized');
}
```

### Failed Authentication Handling

Failed authentication closes connection with WebSocket close code `1008` (Policy Violation). (Source: WEBSOCKET_EVENTS@9abd2d9, verified)

**Implementation:** `server/src/utils/websocket.ts:55`

### WebSocket Events

Core order events: (Source: WEBSOCKET_EVENTS@9abd2d9, verified)
- `order:created` - New order created
- `order:updated` - Order modified
- `order:status` - Order status changed

**Implementation:** `server/src/utils/websocket.ts:191,206`

### Restaurant Context Scoping

Restaurant context automatically scoped from JWT. All WebSocket events filtered by `restaurantId` from authenticated token. (Source: WEBSOCKET_EVENTS@9abd2d9, verified)

**Implementation:** `server/src/middleware/auth.ts` - Auth returns `restaurantId` from decoded JWT

<a id="auth-migration"></a>
## Authentication Migration

### Frontend Direct Supabase Authentication

Frontend authenticates directly with Supabase using `signInWithPassword()`. Backend `/api/v1/auth/login` endpoint removed. (Source: MIGRATION_V6_AUTH@9abd2d9, verified)

**Implementation:** `client/src/contexts/AuthContext.tsx:180`
```typescript
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

### Race Condition Prevention

Race condition between `setSession()` and navigation eliminated using `refreshInProgressRef`. (Source: MIGRATION_V6_AUTH@9abd2d9, verified)

**Implementation:** `client/src/contexts/AuthContext.tsx:60`
```typescript
const refreshInProgressRef = useRef(false);
// Prevents concurrent session refresh calls
```

### Database Migrations

Supabase migrations and RLS policies exist for user authentication schema and restaurant multi-tenancy. (Source: MIGRATION_V6_AUTH@9abd2d9, verified)

**Implementation:** `supabase/migrations/` - 6 SQL migration files found

## Incidents & Post-Mortems

### Post-Mortem: Square Credential Mismatch Incident (October 14, 2025)

**Incident Summary** (Source: POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14@9abd2d9, verified)

Single-character typo in `SQUARE_LOCATION_ID` caused payment failures. Configured value was `L3V8KTKZN0DHD` but correct value is `L1V8KTKZN0DHD` (L3 vs L1).

**Root Cause:** Environment variable typo
**Impact:** All payment attempts failed
**Resolution Time:** ~2 hours

**Fix: Startup Validation** (Source: POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14@9abd2d9, verified)

Server now validates `SQUARE_LOCATION_ID` matches access token on startup.

**Implementation:** `server/src/routes/payments.routes.ts:37-101`
```typescript
// STARTUP VALIDATION: Verify Square credentials match
const locationsResponse = await client.locations.list();
const locationIds = locations.map(loc => loc.id);
if (!locationIds.includes(configuredLocation)) {
  console.error('SQUARE_LOCATION_ID mismatch!');
}
```

**Fix: SDK v43 Migration** (Source: POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14@9abd2d9, verified)

Migrated to Square SDK v43 with updated method names.

**Changes:**
- `createPayment()` → `create()`
- `accessToken` property → `token` property
- Response no longer wrapped in `.result`

**Implementation:** `server/src/routes/payments.routes.ts:185`

## Contributor Ops Handoff

### Multi-Tenancy Requirement

All features must support multi-tenant operation with `restaurant_id` scoping. (Source: CONTRIBUTING@9abd2d9, verified)

**Pattern:** Include `restaurant_id` in all data operations

**Implementation:** `shared/types/order.types.ts:46`
```typescript
interface Order {
  restaurant_id: string;
  // ... other fields
}
```

### Deployment Procedures

For operational and deployment procedures, see the sections above:
- **Environment Setup**: [Environments & Secrets](#environments--secrets)
- **Release Process**: [Release Flow](#release-flow)
- **Rollback Procedures**: [Rollback (App)](#rollback-app) and [Rollback (DB)](#rollback-db)
- **Payment Integration**: [Square Integration](#square-integration)
- **Real-time Features**: [WebSockets](#websockets)
- **Authentication**: [Authentication Migration](#authentication-migration)

## Provider Specifics (Vercel)

### URLs
- **Production:** https://july25-client.vercel.app
- **Backend API:** https://july25.onrender.com
- **Preview:** Auto-generated per PR/branch

### Client Environment Variables (Vercel Dashboard)
- `VITE_API_BASE_URL` = https://july25.onrender.com
- `VITE_SUPABASE_URL` = [Your Supabase URL]
- `VITE_SUPABASE_ANON_KEY` = [Your Supabase anon key]
- `VITE_DEFAULT_RESTAURANT_ID` = 11111111-1111-1111-1111-111111111111
- `VITE_DEMO_PANEL` = 1 (optional, non-prod only)

### Build Configuration
- **Framework preset:** Vite + React
- **Build output:** client/dist
- **Node version:** 20.x
- **Build flag:** `ROLLUP_NO_NATIVE=1` (required to prevent native module errors)
- **Monorepo:** Deploy from repository root only; never from `/client`, `/server`, or `/shared`

### Deployment Commands
```bash
npm run deploy              # Safe production deployment with checks
vercel link --project july25-client --yes  # Link to correct project
vercel ls                   # List deployments
vercel rollback [url]       # Emergency rollback
```

### Project IDs (reference)
- Project: `prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n`
- Org: `team_OesWPwxqmdOsNGDnz0RqS4kA`

### Common Issues
- **Blank page post-deploy:** Check env vars set in Vercel Dashboard; verify backend at july25.onrender.com/health
- **Multiple projects in dashboard:** Delete duplicates; remove `.vercel` from subdirectories; always deploy from root
- **Build fails (Rollup):** Ensure `ROLLUP_NO_NATIVE=1` is set in build command
