# Deployment Guide

**Last Updated:** 2025-10-31

[Home](../../../index.md) > [Docs](../../README.md) > [How-To](../README.md) > [Operations](./README.md) > Deployment

This guide covers deploying Restaurant OS to production environments.

---

## 🤖 AI Agent Quick Start

**TL;DR for AI Agents:** This system uses **fully automated CI/CD deployment**.

### Normal Production Deployment Flow:
```
git push origin main → GitHub Actions → Database Migrations → Render (Backend) → Vercel (Frontend)
```

**What you should do:**
1. ✅ Test migrations locally using `./scripts/deploy-migration.sh <file>`
2. ✅ Run `./scripts/post-migration-sync.sh` to sync Prisma schema
3. ✅ Commit Prisma schema changes
4. ✅ Push to main: `git push origin main`
5. ✅ CI/CD handles everything else automatically

**What you should NOT do:**
- ❌ Don't manually deploy to Render/Vercel (auto-deploys on push to main)
- ❌ Don't run migrations directly on production (CI/CD does this)
- ❌ Don't use `supabase db push` for production (use scripts/deploy-migration.sh locally, CI/CD for prod)

**Key Files:**
- `.github/workflows/deploy-migrations.yml` - Auto-deploys migrations on push to main
- `scripts/deploy-migration.sh` - LOCAL testing of migrations before push
- `scripts/post-migration-sync.sh` - Syncs Prisma schema after migrations
- `docs/SUPABASE_CONNECTION_GUIDE.md` - Reference for troubleshooting only

**Related Documentation:**
- Database troubleshooting → [SUPABASE_CONNECTION_GUIDE.md](./SUPABASE_CONNECTION_GUIDE.md)
- CI/CD workflows → [CI_CD_WORKFLOWS.md](./CI_CD_WORKFLOWS.md)
- Migration system → [supabase/MIGRATION_BASELINE.md](../supabase/MIGRATION_BASELINE.md)

---

## Quick Deploy

### Frontend (Vercel)
```bash
# Deploy to Vercel
npm run deploy
```

### Backend (Render)
```bash
# Deploy to Render
git push origin main
```

## Environment Variables

### Frontend (Vercel)
Required environment variables for the client:

```bash
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_SQUARE_APPLICATION_ID=your-square-app-id
VITE_SQUARE_LOCATION_ID=your-square-location-id
```

### Backend (Render)
Required environment variables for the server:

```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=your-openai-key
SQUARE_ACCESS_TOKEN=your-square-token  # See Square API Configuration below
SQUARE_LOCATION_ID=your-square-location-id
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-key
```

#### Critical Environment Variables

**SQUARE_ACCESS_TOKEN** (REQUIRED for payments):
- Demo mode: `SQUARE_ACCESS_TOKEN=demo` - Mock payments for testing
- Production: Get from Square Dashboard → Developer → Access Tokens
- Sandbox: Get from Square Dashboard → Sandbox → Access Tokens

**SUPABASE_JWT_SECRET** (REQUIRED for authentication):
- Get from Supabase Dashboard → Settings → API → JWT Settings
- Server will fail to start if missing (fail-fast security requirement)

**SUPABASE_SERVICE_KEY** (REQUIRED for database operations):
- Get from Supabase Dashboard → Settings → API → Service Role Key
- Never expose to client-side code

## Production Deployment

### Prerequisites
- Node.js 20.x
- npm 10.7.0+
- Vercel CLI installed
- Render account configured
- Supabase project setup

### Step-by-Step Deployment

#### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure production environment variables
# See ENVIRONMENT.md for complete variable reference
```

#### 2. Build Verification
```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run tests
npm test

# Build both client and server
npm run build:full
```

#### 3. Database Setup
```bash
# Apply database migrations
npm run db:push

# Seed initial data (if needed)
npm run db:seed
```

#### 4. Frontend Deployment (Vercel)
```bash
# Link to Vercel project
npm run vercel:link

# Deploy to production
npm run deploy
```

#### 5. Backend Deployment (Render)
```bash
# Push to main branch (triggers auto-deploy)
git push origin main

# Monitor deployment in Render dashboard
```

## Deployment Checklist

<a id="pre-deployment-checklist"></a>

### Pre-deployment
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build successful locally (`npm run build:full`)
- [ ] Security audit passed
- [ ] Performance benchmarks met

### Post-deployment
- [ ] Health check endpoints responding
- [ ] Database connectivity verified
- [ ] WebSocket connections working
- [ ] Payment processing functional
- [ ] Voice ordering operational
- [ ] Kitchen display systems active
- [ ] Authentication flows working

## Verification Steps

### Health Checks
```bash
# Frontend health
curl https://your-app.vercel.app/

# Backend health
curl https://your-api.onrender.com/api/health

# Voice system health
curl https://your-api.onrender.com/api/v1/ai/voice/handshake
```

### Functional Testing
- Test complete order flow
- Verify payment processing
- Check real-time updates
- Validate voice ordering
- Confirm multi-tenant isolation

## Troubleshooting

### Common Issues

**Build Failures**
- Check Node.js version (requires 20.x)
- Verify all dependencies installed (`npm install`)
- Check for TypeScript errors (`npm run typecheck`)
- Review memory limits (increase if needed)

**Runtime Errors**
- Verify environment variables are set
- Check database connection string
- Review application logs in Render/Vercel dashboards
- Validate JWT secret configuration

**Performance Issues**
- Monitor memory usage (should be <4GB)
- Check database query performance
- Review WebSocket connection counts
- Verify bundle size (<100KB main chunk)

**Voice Ordering Issues**
- Verify OpenAI API key is valid
- Check WebRTC connection setup
- Validate microphone permissions
- Review voice service logs

<a id="release-flow"></a>

## Rollback Procedure

If deployment issues occur:

### 1. Immediate Rollback
```bash
# Vercel - rollback frontend
vercel rollback

# Render - use dashboard to rollback to previous deployment
# Or redeploy previous commit:
git revert HEAD
git push origin main
```

### 2. Database Rollback (if needed)
```bash
# Rollback database migrations
supabase db reset --linked
```

### 3. Verification After Rollback
- Test critical user flows
- Verify all systems operational
- Monitor error rates and performance

## CI/CD Pipeline

The deployment process is automated through GitHub Actions:

1. **Pull Request**: 
   - Runs tests and type checking
   - Builds client and server
   - Runs security scans
   - Performs bundle analysis

2. **Merge to Main**: 
   - Automatically deploys to production
   - Runs smoke tests
   - Updates deployment status

3. **Health Checks**: 
   - Verifies deployment success
   - Monitors key metrics
   - Alerts on failures

### Manual Deployment Override

If automated deployment fails:

```bash
# Frontend manual deploy
vercel --prod

# Backend manual deploy
git push render main

# Force rebuild
render deploy --service-id your-service-id
```

## Monitoring & Observability

### Health Endpoints
- Frontend: `https://your-app.vercel.app/`
- Backend API: `https://your-api.onrender.com/api/health`
- Voice Service: `https://your-api.onrender.com/api/v1/ai/voice/handshake`
- WebSocket: `wss://your-api.onrender.com/ws`

### Key Metrics to Monitor
- Response times (<200ms API, <2s page load)
- Error rates (<1% for critical flows)
- Memory usage (<4GB server)
- WebSocket connections
- Database query performance
- Voice ordering success rate

### Logging
- Vercel: Function logs in dashboard
- Render: Service logs in dashboard  
- Application: Structured JSON logging with Winston
- Database: Supabase logs and metrics

### Alerting
- Set up alerts for:
  - High error rates
  - Slow response times
  - Memory usage spikes
  - Database connection issues
  - Payment processing failures

## Security Considerations

### Production Security Checklist
- [ ] All secrets stored in environment variables
- [ ] HTTPS enforced on all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] JWT secrets rotated regularly
- [ ] Database RLS policies active
- [ ] Input validation on all endpoints
- [ ] Security headers configured

### Regular Maintenance
- Update dependencies monthly
- Rotate secrets quarterly
- Review access logs weekly
- Monitor security advisories
- Perform security audits

---

## Square API Configuration

**For complete Square setup instructions, see [SQUARE_API_SETUP.md](../SQUARE_API_SETUP.md)**

This section provides a quick reference. For step-by-step instructions, troubleshooting, and testing, refer to the comprehensive Square API Setup Guide.

### Quick Setup

**Required Environment Variables:**
```bash
# Server-side (Render)
SQUARE_ACCESS_TOKEN=your-access-token
SQUARE_ENVIRONMENT=sandbox  # or 'production'
SQUARE_LOCATION_ID=your-location-id

# Client-side (Vercel)
VITE_SQUARE_APP_ID=your-app-id
VITE_SQUARE_LOCATION_ID=your-location-id
VITE_SQUARE_ENVIRONMENT=sandbox  # or 'production'
```

### Getting Square Credentials

**Production Credentials:**
1. Log in to [Square Dashboard](https://squareup.com/dashboard)
2. Navigate to: **Developer** → **Access Tokens**
3. Copy your **Production Access Token**
4. Copy your **Production Location ID**
5. Add to Render environment variables:
   ```
   SQUARE_ACCESS_TOKEN=<production-token>
   SQUARE_LOCATION_ID=<production-location-id>
   SQUARE_ENVIRONMENT=production
   ```

**Sandbox/Testing Credentials:**
1. Log in to [Square Dashboard](https://squareup.com/dashboard)
2. Navigate to: **Developer** → **Sandbox** → **Access Tokens**
3. Copy your **Sandbox Access Token**
4. Copy your **Sandbox Location ID**
5. Add to Render environment variables:
   ```
   SQUARE_ACCESS_TOKEN=<sandbox-token>
   SQUARE_LOCATION_ID=<sandbox-location-id>
   SQUARE_ENVIRONMENT=sandbox
   ```

**Demo Mode (No Square Account Required):**
For testing without a Square account or payment processing:
```
SQUARE_ACCESS_TOKEN=demo
```

**What Demo Mode Does:**
- Skips real Square API calls
- Mocks successful payment responses
- Returns fake payment IDs
- Allows full user flow testing
- Does NOT process real credit cards
- Safe for internal testing and demos

**When to Use Each Mode:**
- **Demo**: Internal testing, development, no Square account yet
- **Sandbox**: Integration testing with Square's test environment
- **Production**: Live payment processing with real credit cards

### Credential Validation

The server validates Square credentials on startup:
- Verifies `SQUARE_LOCATION_ID` exists in access token's permitted locations
- Logs prominent warnings if mismatch detected
- Fails fast with error logging on invalid configuration

**Check Render logs for:**
```
✅ Square credentials validated successfully
```

**Or error message:**
```
🚨 SQUARE_LOCATION_ID mismatch detected!
```

### Testing Square Configuration

```bash
# Validate credentials
./scripts/validate-square-credentials.sh

# Test payment flow
./scripts/test-payment-flow.sh
```

**For detailed troubleshooting and testing instructions, see [SQUARE_API_SETUP.md](../SQUARE_API_SETUP.md)**

---

## Square Integration

### Payment Integration Architecture

**Square SDK v43 Integration**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

Square Node.js SDK v43 is used for payment processing. Authentication uses the `token` property (not `accessToken` as in prior versions).

**Implementation:** `server/src/routes/payments.routes.ts:7,28`
```typescript
import { SquareClient, SquareEnvironment } from 'square';
const client = new SquareClient({ token: process.env['SQUARE_ACCESS_TOKEN']! });
```

**Credential Validation at Startup**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

Server validates that `SQUARE_LOCATION_ID` matches the access token on startup. Logs prominent warnings if mismatch detected.

**Implementation:** `server/src/routes/payments.routes.ts:37-101`
- Fetches locations from Square API
- Validates configured location exists in access token's permitted locations
- Fails fast with error logging on mismatch

**Idempotency Keys**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

Idempotency keys shortened to 26 characters to stay within Square's 45-character limit.

**Format:** `{last_12_order_id}-{timestamp}` (12 + 1 + 13 = 26 chars)

**Implementation:** `server/src/services/payment.service.ts:84`
```typescript
const idempotencyKey = `${order.id.slice(-12)}-${Date.now()}`;
```

**Server-Side Amount Validation**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

Server NEVER trusts client-provided amounts. All payment amounts are validated server-side.

**Implementation:** `server/src/routes/payments.routes.ts:132,158`
- `PaymentService.validatePaymentRequest()` recalculates totals
- Payment request uses server-calculated amount: `amountMoney: { amount: BigInt(serverAmount) }`

**Payment Endpoint**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

Primary payment creation endpoint: `POST /api/v1/payments/create`

**Implementation:** `server/src/routes/payments.routes.ts:104`
- Requires authentication and restaurant access validation
- Returns payment result or error

**Demo Mode Support**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

Supports demo mode with `SQUARE_ACCESS_TOKEN=demo` for development/testing.

**Implementation:** `server/src/routes/payments.routes.ts:171`

**Payment Audit Logs**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

Payment audit logs created for PCI compliance (7-year retention recommended).

**Implementation:** `server/src/routes/payments.routes.ts:212`
```typescript
await PaymentService.logPaymentAttempt({ orderId, amount, status, ... })
```

**Required Environment Variables**
_(Source: SQUARE_INTEGRATION.md@79d1619, verified)_

- `SQUARE_ACCESS_TOKEN` - Square API access token
- `SQUARE_LOCATION_ID` - Square location ID (must match access token)

**Configuration:** Referenced in `server/src/config/env.ts`, `server/src/config/environment.ts`

---

## WebSockets

### WebSocket Authentication

**JWT Authentication Required**
_(Source: WEBSOCKET_EVENTS.md@79d1619, verified)_

WebSocket connections require authentication. In production mode, connections without valid JWT are rejected.

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

**Failed Authentication Handling**
_(Source: WEBSOCKET_EVENTS.md@79d1619, verified)_

Failed authentication closes connection with WebSocket close code `1008` (Policy Violation).

**Implementation:** `server/src/utils/websocket.ts:55`

**WebSocket Events**
_(Source: WEBSOCKET_EVENTS.md@79d1619, verified)_

Core order events:
- `order:created` - New order created
- `order:updated` - Order modified
- `order:status` - Order status changed

**Implementation:** `server/src/utils/websocket.ts:191,206`

**Restaurant Context Scoping**
_(Source: WEBSOCKET_EVENTS.md@79d1619, verified)_

Restaurant context automatically scoped from JWT. All WebSocket events filtered by `restaurantId` from authenticated token.

**Implementation:** `server/src/middleware/auth.ts` - Auth returns `restaurantId` from decoded JWT

---

<a id="incidents-postmortems"></a>

## Incidents & Post-Mortems

### Square Credential Mismatch Incident (October 14, 2025)

**Incident Summary**
_(Source: POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md@79d1619, verified)_

Single-character typo in `SQUARE_LOCATION_ID` caused payment failures. Configured value was `L3V8KTKZN0DHD` but correct value is `L1V8KTKZN0DHD` (L3 vs L1).

- **Root Cause:** Environment variable typo
- **Impact:** All payment attempts failed
- **Resolution Time:** ~2 hours

**Fix: Startup Validation**
_(Source: POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md@79d1619, verified)_

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

**Fix: SDK v43 Migration**
_(Source: POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md@79d1619, verified)_

Migrated to Square SDK v43 with updated method names.

**Changes:**
- `createPayment()` → `create()`
- `accessToken` property → `token` property
- Response no longer wrapped in `.result`

**Implementation:** `server/src/routes/payments.routes.ts:185`

---

<a id="auth-migration"></a>

## Authentication Migration

### Authentication Migration v6.0

**Frontend Direct Supabase Authentication**
_(Source: MIGRATION_V6_AUTH.md@79d1619, verified)_

Frontend authenticates directly with Supabase using `signInWithPassword()`. Backend `/api/v1/auth/login` endpoint removed.

**Implementation:** `client/src/contexts/AuthContext.tsx:180`
```typescript
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

**Race Condition Prevention**
_(Source: MIGRATION_V6_AUTH.md@79d1619, verified)_

Race condition between `setSession()` and navigation eliminated using `refreshInProgressRef`.

**Implementation:** `client/src/contexts/AuthContext.tsx:60`
```typescript
const refreshInProgressRef = useRef(false);
// Prevents concurrent session refresh calls
```

**Database Migrations**
_(Source: MIGRATION_V6_AUTH.md@79d1619, verified)_

Supabase migrations and RLS policies exist for user authentication schema and restaurant multi-tenancy.

**Implementation:** `supabase/migrations/` - 6 SQL migration files found

---

<a id="contributor-ops-handoff"></a>

## Contributor Operations Handoff

### Multi-Tenant Architecture

<a id="multi-tenancy-requirement"></a>



**Multi-Tenancy Requirement**
_(Source: CONTRIBUTING.md@79d1619, verified)_

All features must support multi-tenant operation with `restaurant_id` scoping.

**Pattern:** Include `restaurant_id` in all data operations

**Implementation:** `shared/types/order.types.ts:46`
```typescript
interface Order {
  restaurant_id: string;
  // ... other fields
}
```

---

## KDS Deploy

### Kitchen Display System

**Order Statuses**
_(Source: KDS-BIBLE.md@79d1619, verified)_

7 order statuses must be handled by KDS:
- `new` - Order just created
- `pending` - Order submitted
- `confirmed` - Order accepted by kitchen
- `preparing` - Actively being prepared
- `ready` - Ready for pickup
- `completed` - Order fulfilled
- `cancelled` - Order cancelled

**Implementation:** `shared/types/order.types.ts:6`
```typescript
export type OrderStatus =
  'new' | 'pending' | 'confirmed' | 'preparing' |
  'ready' | 'picked-up' | 'completed' | 'cancelled'
```

**WebSocket Real-Time Updates**
_(Source: KDS-BIBLE.md@79d1619, verified)_

KDS receives real-time order updates via WebSocket connection with restaurant-scoped events.

**Implementation Files:**
- `server/src/utils/websocket.ts` - WebSocket server implementation
- `client/src/hooks/useKitchenOrdersRealtime.ts` - Client-side real-time hook
- `client/src/pages/KitchenDisplayOptimized.tsx` - Main KDS display
- `client/src/components/kitchen/OrderCard.tsx` - Order card component
- `client/src/components/errors/KitchenErrorBoundary.tsx` - Error boundary

---

## Production Diagnostics

### CORS Configuration

**CORS Allowlist (No Wildcards)**
_(Source: PRODUCTION_DIAGNOSTICS.md@79d1619, verified)_

CORS configuration uses explicit allowlist. No wildcard (`*`) origins permitted.

**Implementation:** `server/src/server.ts:64-126`
```typescript
const allowedOrigins = new Set<string>([...]);
// FRONTEND_URL added to allowed origins (line 105)
// ALLOWED_ORIGINS env var parsed and added (lines 98-101)
// Origin matching logic (line 126)
```

**Environment Variables:**
- `FRONTEND_URL` - Primary frontend URL (has default fallback)
- `ALLOWED_ORIGINS` - Additional allowed origins (comma-separated, has default fallback)

**Configuration:** `server/src/config/env.ts`

**Custom Headers Allowed**:
The following custom headers are permitted in CORS requests (server/src/server.ts:145):
- `Authorization` - JWT bearer tokens
- `Content-Type` - Request body type
- `x-restaurant-id` / `X-Restaurant-ID` - Multi-tenant context (both case variations accepted)
- `x-request-id` - Request tracing
- `X-CSRF-Token` - CSRF protection
- `x-demo-token-version` - Demo auth versioning
- `X-Client-Flow` / `x-client-flow` - Order flow tracking (online, kiosk, server)

**Critical**: If adding new custom headers to client requests, they MUST be added to the `allowedHeaders` array in `server/src/server.ts` to prevent CORS blocking.

### WebSocket Authentication

**Production WebSocket Authentication**
_(Source: PRODUCTION_DIAGNOSTICS.md@79d1619, verified)_

Production WebSocket path rejects missing/invalid JWT.

**Implementation:** `server/src/utils/websocket.ts:52` calls `verifyWebSocketAuth()`

### Historical Incidents

**September 23, 2025 Production Incident**
_(Source: PRODUCTION_DIAGNOSTICS.md@79d1619, verified)_

Historical incident documenting production system failures due to missing environment variables and CORS misconfiguration. Full incident report archived in `docs/archive/2025-10/2025-10-15_PRODUCTION_DIAGNOSTICS.md`.

**Root Causes:**
- Missing environment variables in Vercel deployment
- CORS blocking between frontend and backend
- Missing JWT secrets in Render
- WebSocket authentication failures

**Resolution:** Environment variables configured, CORS allowlist updated, JWT secrets added.

---

## Related Documentation

- [Production Status](../../PRODUCTION_STATUS.md) - Readiness assessment
- [Deployment Checklist](./runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Pre-flight checklist
- [Deployment Success Report](./runbooks/PRODUCTION_DEPLOYMENT_SUCCESS.md) - Verification
- [CI/CD Workflows](../development/CI_CD_WORKFLOWS.md) - Automation
- [Supabase Connection Guide](../../SUPABASE_CONNECTION_GUIDE.md) - Database migrations
- [Square API Setup](../../reference/api/SQUARE_API_SETUP.md) - Payment configuration

---

**Last Updated**: October 30, 2025
**Version**: 6.0.14
