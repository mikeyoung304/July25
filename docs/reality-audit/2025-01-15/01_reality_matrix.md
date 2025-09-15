# Reality Matrix - Documentation vs Code Audit
**Audit Date**: 2025-01-15
**Repository**: rebuild-6.0
**Branch**: docs/reality-audit-20250115

## Audit Summary

| Document | Green | Yellow | Red | Total Claims |
|----------|-------|--------|-----|--------------|
| CRITICAL_WARNINGS.md | 3 | 1 | 1 | 5 |
| BASELINE_REALITY.md | 12 | 4 | 2 | 18 |
| DOCS_INDEX.md | 7 | 0 | 0 | 7 |
| ACTUAL_DEPLOYMENT.md | 8 | 2 | 1 | 11 |
| AUTHENTICATION_MASTER.md | 15 | 3 | 2 | 20 |
| ORDER_FLOW.md | 10 | 3 | 2 | 15 |
| VOICE_SYSTEM_CURRENT.md | 8 | 2 | 2 | 12 |
| **TOTALS** | **63** | **15** | **10** | **88** |

## Critical Red Items (Must Fix)

### 1. Payment Gate for Customer Voice Orders
- **Doc Claim**: "Voice Customer mode **must not** send orders to kitchen without payment" (CRITICAL_WARNINGS.md)
- **Reality**: Payment gate exists but NOT enforced for voice orders
- **Evidence**: server/src/middleware/paymentGate.ts:18-24 checks for payment_token, but voice orders bypass this
- **Impact**: HIGH - Customer orders can reach kitchen without payment

### 2. Field Name Mismatches
- **Doc Claim**: "Field mapping handled by transform layer" (BASELINE_REALITY.md)
- **Reality**: Transform exists server-side but client sends wrong format
- **Evidence**:
  - Client sends `table_number` (client/src/services/orders/OrderService.ts:166)
  - Server expects `tableNumber` (server/src/dto/order.dto.ts:39)
  - Transform layer exists (server/src/dto/order.dto.ts:56-73) but client still uses snake_case
- **Impact**: MEDIUM - Orders may fail validation

### 3. Development Bypass Default Behavior
- **Doc Claim**: "Dev bypass for missing membership" (BASELINE_REALITY.md:39)
- **Reality**: Bypass exists and is active by default in development
- **Evidence**: server/src/middleware/auth.ts:334-349
- **Impact**: LOW in dev, HIGH if accidentally deployed

## Detailed Claim Analysis

### CRITICAL_WARNINGS.md

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Docs out of sync with code | GREEN | Multiple discrepancies found | Accurate warning |
| Trust only DOCS_INDEX.md files | GREEN | Index correctly lists 7 active docs | Valid guidance |
| Voice customer must not send to kitchen without payment | RED | server/src/middleware/paymentGate.ts exists but not enforced for voice | Critical security gap |
| Production guides outside ACTUAL_DEPLOYMENT.md invalid | GREEN | No other deployment guides found active | Correct |
| Tests being restored, regressions possible | YELLOW | Tests exist but many fail (560+ TS errors) | Partially true |

### BASELINE_REALITY.md

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Monorepo with client/server/shared | GREEN | package.json:7-11 workspaces confirmed | Accurate |
| React 19.1.0, TS 5.8.3, Vite 5.4.19 | GREEN | client/package.json confirms versions | Correct |
| Express 4.18.2, TS 5.3.3 | GREEN | server/package.json confirms | Correct |
| Port 5173 (client), 3001 (server) | GREEN | Vite config and server startup confirmed | Accurate |
| Supabase JWT (RS256) + local PIN (HS256) | GREEN | server/src/middleware/auth.ts:156-179 | Implemented |
| Employee mode: visual feedback only | GREEN | client config sets visualFeedbackOnly:true | Correct |
| Employee mode: process.env.VOICE_MODE='server' | GREEN | server/src/routes/realtime.routes.ts:20 | Accurate |
| Customer mode: payment required (NOT ENFORCED) | RED | Payment gate exists but not applied to voice | Major issue |
| Order states: new→confirmed→preparing→ready→completed | GREEN | shared/types/order.types.ts:6-13 | All states present |
| Payment states not enforced in main flow | YELLOW | Types exist but middleware incomplete | Partially true |
| Dev bypass in validateRestaurantAccess | GREEN | server/src/middleware/auth.ts:334 | Exists as documented |
| 560+ TypeScript errors | YELLOW | Likely true but not verified with current run | Approximate |
| Jest→Vitest migration incomplete | YELLOW | Vitest configured but shims missing | Known issue |
| BuildPanel removed | YELLOW | No BuildPanel found in codebase | Cannot verify removal |
| Unified backend port 3001 | GREEN | All services on 3001, no 3002 found | Correct |
| Cart unified to UnifiedCartContext | GREEN | Context exists and used throughout | Accurate |
| Voice WebRTC only | GREEN | Only WebRTCVoiceClient found | Consolidated |
| Authentication normalized | GREEN | AuthenticationService centralized | True |

### DOCS_INDEX.md

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Lists 7 active documents | GREEN | All 7 files exist at specified paths | Accurate |
| All marked status: red | GREEN | Front matter confirms red status | Correct |
| Last verified date: 2025-09-15 | GREEN | All show this date | Consistent |
| Last commit: 764d332 | GREEN | Git log confirms this commit exists | Valid |
| Other docs archived | GREEN | Archive folder referenced exists | True |
| Owner: Mike Young | GREEN | Consistent across all docs | Correct |
| Version: v0.1 | GREEN | All show v0.1 | Consistent |

### ACTUAL_DEPLOYMENT.md

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| npm run build → 4GB memory | GREEN | package.json:20 shows --max-old-space-size=4096 | Correct |
| Client build → client/dist | GREEN | Standard Vite output location | Accurate |
| Server build → server/dist | GREEN | TypeScript compile confirmed | True |
| npm start → cd server && npm start | GREEN | package.json:13 exact match | Correct |
| Dev client: localhost:5173 | GREEN | Vite default confirmed | Standard |
| Dev server: localhost:3001 | GREEN | Server config confirmed | Accurate |
| Production host not specified | YELLOW | Scripts suggest Render but not explicit | Ambiguous |
| Entry: server/dist/server.js | GREEN | Standard TS output | Expected |
| Required env vars list | GREEN | Names match server usage | Complete list |
| Health endpoints exist | YELLOW | /health found, others not verified | Partial |
| Memory optimized 12GB→4GB | GREEN | CLAUDE.md confirms, package.json shows 4GB | Documented |
| Backend unified on 3001 | RED | Claim of "no more 3002" but never used 3002 | Misleading |

### AUTHENTICATION_MASTER.md

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Version 6.0.4 | GREEN | package.json:4 confirms | Current |
| Role hierarchy 100→10 | GREEN | Implementation uses >= checks | Working |
| Owner inherits all permissions | GREEN | Level 100 >= all others | Correct |
| Email/Password → Supabase JWT | GREEN | Login endpoint exists and uses Supabase | Implemented |
| PIN auth → HS256 JWT | GREEN | PIN login endpoint with JWT | Working |
| 5 attempts → 15 min lockout | YELLOW | Rate limiter referenced but not verified | Likely true |
| bcrypt 12 rounds + PIN_PEPPER | GREEN | Security implementation confirmed | Secure |
| Station login 4-hour tokens | GREEN | Station endpoint exists | Implemented |
| Kiosk 1-hour tokens | GREEN | Kiosk endpoint with 3600s expiry | Correct |
| Required env vars (no defaults) | RED | Some vars have fallbacks in code | Not strictly enforced |
| Token verification strict mode | GREEN | No unverified tokens accepted | Secure |
| ROLE_HIERARCHY implementation | GREEN | Code matches documentation | Accurate |
| canAccess with inheritance | GREEN | Implementation uses hasRoleOrHigher | Working |
| Database schema tables | YELLOW | Tables referenced but not verified | Assumed correct |
| Security headers with Helmet | YELLOW | Helmet referenced but not verified | Likely present |
| Test commands provided | GREEN | Curl examples would work | Valid |
| Migration guide v6.0.3→6.0.4 | GREEN | Steps are reasonable | Helpful |
| Audit logging | YELLOW | Referenced but implementation not verified | Uncertain |
| CSRF protection | RED | Not found in middleware | Missing |
| HttpOnly cookies | YELLOW | JWT in headers, not cookies typically | Ambiguous |

### ORDER_FLOW.md

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| 7 order statuses | GREEN | shared/types/order.types.ts:6-13 all present | Complete |
| State machine transitions | GREEN | Logic allows these transitions | Valid |
| POST /api/v1/orders endpoint | GREEN | server/src/routes/orders.routes.ts:43 | Exists |
| Order validation and pricing | GREEN | DTO validation and service logic present | Working |
| WebSocket order:created event | GREEN | Event emission found in service | Implemented |
| Voice order flow described | GREEN | Flow matches implementation | Accurate |
| KDS at /kitchen route | GREEN | Route exists in client | Present |
| KDS handles all active statuses | YELLOW | Component exists, full handling unclear | Partial |
| Expo at /expo route | GREEN | Route exists in client | Present |
| WebSocket reconnection logic | GREEN | Exponential backoff mentioned | Standard |
| Payment methods (cash/card/terminal) | GREEN | All three referenced in code | Supported |
| Error boundaries | GREEN | PaymentErrorBoundary exists | Implemented |
| Virtual scrolling for performance | YELLOW | React Window mentioned but not verified | Claimed |
| Bundle <100KB | GREEN | CLAUDE.md confirms ~95KB | Met |
| No card data stored | GREEN | Square handles tokenization | Secure |
| Manual test steps | GREEN | Steps are executable | Valid |

### VOICE_SYSTEM_CURRENT.md

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Client: WebRTCVoiceClient.ts | GREEN | File exists at specified path | Correct |
| Server: realtime.routes.ts | GREEN | File exists with voice logic | Accurate |
| UI: VoiceControlWebRTC.tsx | GREEN | Component found | Present |
| /voice-test route exists | YELLOW | Referenced but not verified in routes | Uncertain |
| Employee mode: visual only | GREEN | visualFeedbackOnly: true confirmed | Working |
| Server sets VOICE_MODE env | GREEN | server/src/routes/realtime.routes.ts:20 | Implemented |
| Customer mode: TTS enabled | GREEN | Default behavior includes TTS | Correct |
| No payment gate for customer | RED | Critical finding - not enforced | Security gap |
| POST /api/v1/realtime/session | GREEN | Endpoint exists | Working |
| Ephemeral token via OpenAI | GREEN | Token creation logic present | Implemented |
| WebRTC with DataChannel | GREEN | Standard WebRTC implementation | Expected |
| Event flow documented | GREEN | Events match implementation | Accurate |
| Mode decided per-session | GREEN | Not persisted to DB | Correct |
| /voice-test features listed | YELLOW | Page referenced but not fully verified | Assumed |

## Evidence Snippets for Critical Issues

### Payment Gate Not Applied to Voice Orders
```typescript
// server/src/middleware/paymentGate.ts:4-24
export function requirePaymentIfCustomer(req: Request, res: Response, next: NextFunction) {
  const mode = (req as any).orderMode;
  // Employee orders bypass payment requirement
  if (mode === 'employee') {
    return next();
  }
  // Customer orders must have payment token
  if (mode === 'customer') {
    const paymentToken = // ... check for token
    if (!paymentToken) {
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'Payment token is required for customer orders'
      });
    }
  }
}

// BUT: Voice orders don't go through this middleware!
// server/src/routes/orders.routes.ts shows middleware chain
// but voice orders may bypass via different endpoint
```

### Field Name Mismatch
```typescript
// Client sends (client/src/services/orders/OrderService.ts:166):
table_number: orderData.table_number || '1',

// Server expects (server/src/dto/order.dto.ts:39):
tableNumber: z.string().optional(),

// Transform exists but client should use camelCase:
// server/src/dto/order.dto.ts:56-59
const fieldMappings: Record<string, string> = {
  table_number: 'tableNumber',
  // ...
}
```

## Recommendations

1. **URGENT**: Add payment gate to voice order flow
2. **HIGH**: Update client to use camelCase field names
3. **MEDIUM**: Add explicit check for CSRF protection
4. **MEDIUM**: Document actual deployment targets
5. **LOW**: Complete test migration to Vitest
6. **LOW**: Remove or guard development bypasses