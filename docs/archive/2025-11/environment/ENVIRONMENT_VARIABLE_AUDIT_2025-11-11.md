# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: Environment Audits

---

# Environment Variable Ecosystem Audit — Grow Restaurant OS v6.0

**Audit Date:** 2025-11-11
**Auditor:** Claude Code (Comprehensive Analysis)
**Scope:** End-to-end environment variable usage, validation, documentation, and security
**Branch:** stabilization-initiative
**Production Status:** 95% ready (Phase 2B deployed)

---

## Executive Summary

This comprehensive audit examined **429 environment variable usages** across **60+ files** in the Grow Restaurant OS codebase. The investigation revealed:

### Key Findings

✅ **Strengths:**
- Comprehensive 3-tier validation system (ADR-009 fail-fast philosophy)
- Extensive documentation across 10+ files
- Strong TypeScript type safety for config access
- Monorepo architecture with clear VITE_ prefix convention
- Production-specific validation for critical secrets

⚠️ **Critical Issues Identified:**
1. **3 hardcoded security defaults** that bypass fail-fast validation
2. **Demo mode allows production bypass** for payment validation
3. **VITE_OPENAI_API_KEY exposure risk** documented but marked for removal
4. **Multi-level fallback chains** create unexpected dependencies
5. **Inconsistent documentation** across .env.example and ENVIRONMENT.md

### Risk Level: 🟡 MEDIUM-HIGH
- **Immediate blockers:** 0 (system functional)
- **Security vulnerabilities:** 5 (3 critical, 2 high priority)
- **Documentation gaps:** 12 variables
- **Code hygiene issues:** 8 patterns requiring refactor

---

## Comprehensive Environment Variable Table

### Legend
- **Tier 1:** Required in all environments (dev, staging, prod)
- **Tier 2:** Required in production, warnings in dev
- **Tier 3:** Optional with sensible defaults
- ⚠️ = Security concern
- 🔧 = Requires immediate fix
- 📝 = Documentation gap

---

### A. Core Server Configuration

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **NODE_ENV** | No | 3 | `server/src/config/env.ts:41`<br/>`logger.ts:6`<br/>`~28 files` | `'development'` | ✅ .env.example:13<br/>ENVIRONMENT.md:37 | Vercel auto-sets | Safe |
| **PORT** | No | 3 | `server/src/config/env.ts:42`<br/>`server.ts:155` | `3001` | ✅ .env.example:14 | Render/Vercel | Safe |
| **DEFAULT_RESTAURANT_ID** | Yes | 1 | `server/src/config/env.ts:61`<br/>`shared/config:111-113` | `'grow'` fallback<br/>⚠️ should require UUID | ✅ .env.example:15<br/>ENVIRONMENT.md:39 | Manual config | ⚠️ Accepts slug but code expects UUID |

---

### B. Database & Supabase

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **DATABASE_URL** | Yes | 1 | `server/src/config/env.ts:53`<br/>`prisma/schema.prisma:13` | Empty string<br/>**Throws if missing** | ✅ .env.example:29<br/>ENVIRONMENT.md:40 | Supabase CLI | Safe - fail-fast |
| **SUPABASE_URL** | Yes | 1 | `server/src/config/env.ts:54`<br/>`database.ts:12`<br/>`~15 files` | Empty string<br/>**Throws if missing** | ✅ .env.example:21<br/>ENVIRONMENT.md:15 | Supabase dashboard | Safe - fail-fast |
| **SUPABASE_ANON_KEY** | Yes | 1 | `server/src/config/env.ts:55`<br/>`database.ts:13`<br/>`~12 files` | Empty string<br/>**Throws if missing** | ✅ .env.example:22<br/>ENVIRONMENT.md:16 | Supabase dashboard | Safe - fail-fast |
| **SUPABASE_SERVICE_KEY** | Yes | 1 | `server/src/config/env.ts:56`<br/>`database.ts:14`<br/>`ai/functions:57-58` | Empty string<br/>**Throws if missing** | ✅ .env.example:23<br/>ENVIRONMENT.md:17 | Supabase dashboard | **CRITICAL** - Bypasses RLS |
| **SUPABASE_JWT_SECRET** | Yes | 2 | `server/src/config/environment.ts:107`<br/>`middleware/auth.ts:45` | Empty string<br/>**Throws in prod** | ✅ .env.example:24<br/>ENVIRONMENT.md:18 | Supabase Settings→API | **CRITICAL** - JWT signing |

---

### C. Authentication Secrets 🔧

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **PIN_PEPPER** 🔧 | No* | 2 | `server/src/services/auth/pinAuth.ts:17` | **HARDCODED:**<br/>`'default-pepper-change-in-production'` | ✅ .env.example:54<br/>ENVIRONMENT.md:23 | Manual config | **CRITICAL VULNERABILITY**<br/>Weak default bypasses validation |
| **DEVICE_FINGERPRINT_SALT** 🔧 | No* | 2 | `server/src/services/auth/stationAuth.ts:13` | **HARDCODED:**<br/>`'device-salt-change-in-production'` | ✅ .env.example:55<br/>ENVIRONMENT.md:24 | Manual config | **CRITICAL VULNERABILITY**<br/>Weak default for device binding |
| **STATION_TOKEN_SECRET** 🔧 | No* | 2 | `server/src/services/auth/stationAuth.ts:11` | **3-TIER FALLBACK:**<br/>1. STATION_TOKEN_SECRET<br/>2. KIOSK_JWT_SECRET<br/>3. `'station-secret-change-in-production'` | ⚠️ Not in .env.example<br/>📝 Missing from ENVIRONMENT.md | Manual config | **CRITICAL VULNERABILITY**<br/>Complex fallback chain |
| **KIOSK_JWT_SECRET** | No* | 2 | `server/src/config/env.ts:72`<br/>`routes/auth.routes.ts:40-41` | Empty string<br/>**Throws in prod** | ⚠️ Not in .env.example | Manual config | Medium - used in fallback |
| **FRONTEND_URL** | Yes* | 2 | `server/src/config/env.ts:63`<br/>`server.ts:111-125 (CORS)` | `'http://localhost:5173'`<br/>Warns if missing scheme | ✅ .env.example:56 | Vercel auto-detects | Safe with validation |
| **AUTH_DUAL_AUTH_ENABLE** | No | 3 | `middleware/auth.ts:39`<br/>`.env.example:61` | `false` (implicit) | ✅ .env.example:61<br/>ENVIRONMENT.md:43 | Manual feature flag | Safe - feature flag |
| **AUTH_ACCEPT_KIOSK_DEMO_ALIAS** | No | 3 | `middleware/auth.ts:67` | `true` (default) | ✅ .env.example:66<br/>ENVIRONMENT.md:44 | Manual feature flag | Safe - backwards compat |
| **STRICT_AUTH** | No | 3 | `middleware/auth.ts:39`<br/>`.env.example:84` | `false`<br/>⚠️ **Should be true in prod** | ✅ .env.example:84 (detailed)<br/>📝 Not in ENVIRONMENT.md | Manual security flag | **HIGH PRIORITY**<br/>Must be true for multi-tenant |

\* = Tier 2: Errors in production, warnings in development

---

### D. Payment Processing (Square)

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **SQUARE_ACCESS_TOKEN** ⚠️ | No* | 2 | `server/src/routes/payments.routes.ts:33`<br/>`terminal.routes.ts:15` | Empty string<br/>⚠️ **Demo mode bypass** | ✅ .env.example:44<br/>ENVIRONMENT.md:20 | Square Developer Console | **VULNERABILITY**<br/>Line 70-72: Demo mode in prod |
| **SQUARE_LOCATION_ID** | No* | 2 | `server/src/routes/payments.routes.ts:82`<br/>`health.routes.ts:17-24` | Empty string or `'demo'` | ✅ .env.example:45<br/>ENVIRONMENT.md:21 | Square Developer Console | Medium - validated at runtime |
| **SQUARE_APP_ID** | No* | 2 | `server/src/config/env.ts:138`<br/>`shared/config:125-126` | `'demo'` fallback | ✅ .env.example (implied)<br/>ENVIRONMENT.md (implied) | Square Developer Console | Low - public identifier |
| **SQUARE_ENVIRONMENT** | No | 3 | `server/src/config/env.ts:40`<br/>`payments.routes:30,256` | `'sandbox'`<br/>⚠️ **Warns if sandbox in prod** | ✅ .env.example:46<br/>ENVIRONMENT.md:41 | Manual toggle | **MEDIUM PRIORITY**<br/>Warning only, not enforced |
| **SQUARE_WEBHOOK_SIGNATURE_KEY** | No | 3 | `middleware/webhookSignature.ts:45` | No default<br/>Optional | ✅ .env.example:47<br/>ENVIRONMENT.md:22 | Square Developer Console | Medium - webhook security |

\* = Tier 2: Errors in production if payments enabled

---

### E. AI/LLM Services

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **OPENAI_API_KEY** | No** | 3 | `server/src/ai/index.ts:39`<br/>`voice/openai-adapter.ts:54`<br/>`~6 files` | `undefined`<br/>Optional unless AI required | ✅ .env.example:34<br/>ENVIRONMENT.md:19 | OpenAI Platform | Safe - optional degradation |
| **OPENAI_REALTIME_MODEL** | No | 3 | `server/src/voice/openai-adapter.ts:60`<br/>`voice-routes:177-178` | `'gpt-4o-realtime-preview-2025-06-03'` | ✅ .env.example:35 (commented) | Auto-default | Safe |
| **AI_DEGRADED_MODE** | No | 3 | `server/src/config/env.ts:67`<br/>`shared/config:121-122` | `false` | ✅ .env.example:38 (commented) | Manual feature flag | Safe - allows AI opt-out |
| **VITE_OPENAI_API_KEY** ⚠️ 🔧 | No | N/A | **SHOULD NOT EXIST**<br/>Found in: `.env.example:131` | N/A | ⚠️ .env.example:131<br/>**SECURITY RISK** | **DO NOT SET** | **CRITICAL SECURITY ISSUE**<br/>Exposes API key to browser |

\** = Required in production unless AI_DEGRADED_MODE=true

---

### F. Client Configuration (VITE_ Prefix)

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **VITE_API_BASE_URL** | Yes | 1 | `client/src/config/env-validator.ts:27`<br/>`shared/config:81-84` | No default<br/>**Throws if missing** | ✅ .env.example:109<br/>ENVIRONMENT.md:50 | Vercel build-time | Safe - validated |
| **VITE_SUPABASE_URL** | Yes | 1 | `client/src/config/env-validator.ts:33`<br/>`shared/config:91-92` | No default<br/>**Throws if missing**<br/>Format: `*.supabase.co` | ✅ .env.example:110<br/>ENVIRONMENT.md:25 | Vercel build-time | Safe - validated |
| **VITE_SUPABASE_ANON_KEY** | Yes | 1 | `client/src/config/env-validator.ts:39`<br/>`shared/config:96-97` | No default<br/>**Throws if missing** | ✅ .env.example:111<br/>ENVIRONMENT.md:26 | Vercel build-time | Safe - public key |
| **VITE_DEFAULT_RESTAURANT_ID** | Yes | 1 | `client/src/config/env-validator.ts:45`<br/>`shared/config:111-113` | No default<br/>**Throws if missing**<br/>Accepts UUID or slug | ✅ .env.example:112<br/>ENVIRONMENT.md:51 | Vercel build-time | Safe - validated |
| **VITE_ENVIRONMENT** | No | 3 | `client/src/config/env-validator.ts:62`<br/>`shared/config:69` | Inferred from NODE_ENV | ✅ .env.example:113<br/>ENVIRONMENT.md:52 | Vercel auto-sets | Safe |
| **VITE_SQUARE_APP_ID** | Yes* | 2 | `shared/config:130-131` | `'demo'` fallback | ✅ .env.example:116<br/>ENVIRONMENT.md:27 | Square Developer Console | Low - public identifier |
| **VITE_SQUARE_LOCATION_ID** | Yes* | 2 | `shared/config:127` | Empty string | ✅ .env.example:117<br/>ENVIRONMENT.md:28 | Manual config | Medium - payment context |
| **VITE_SQUARE_ENVIRONMENT** | No | 3 | `shared/config:125` | `'sandbox'` | ✅ .env.example:118<br/>ENVIRONMENT.md:53 | Manual toggle | Safe |
| **VITE_USE_MOCK_DATA** | No | 3 | `shared/config:137` | `false` | ✅ .env.example:121<br/>ENVIRONMENT.md:54 | Manual feature flag | Safe |
| **VITE_USE_REALTIME_VOICE** | No | 3 | `shared/config:141` | `false` | ✅ .env.example:122<br/>ENVIRONMENT.md:55 | Manual feature flag | Safe |
| **VITE_ENABLE_PERF** | No | 3 | `.env.example:123` | `false` | ✅ .env.example:123<br/>ENVIRONMENT.md:56 | Manual feature flag | Safe |
| **VITE_DEBUG_VOICE** | No | 3 | `.env.example:124` | `false` | ✅ .env.example:124<br/>ENVIRONMENT.md:57 | Manual feature flag | Safe |
| **VITE_DEMO_PANEL** ⚠️ | No | 3 | `.env.example:129`<br/>`tests:113-229` | `'0'` (string)<br/>**MUST be '0' in prod** | ✅ .env.example:129 (detailed)<br/>ENVIRONMENT.md:58 | **CRITICAL: Set to '0'** | **SECURITY RISK**<br/>Exposes demo credentials |

\* = If payments enabled on client

---

### G. Logging & Monitoring

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **LOG_LEVEL** | No | 3 | `server/src/utils/logger.ts:4`<br/>`environment.ts:116-117` | `'info'` | ✅ .env.example:89<br/>ENVIRONMENT.md:45 | Manual config | Safe - runtime override |
| **LOG_FORMAT** | No | 3 | `server/src/utils/logger.ts:5`<br/>`environment.ts:117` | `'json'` | ✅ .env.example:90<br/>ENVIRONMENT.md:46 | Manual config | Safe - runtime override |
| **ALLOWED_ORIGINS** | No | 3 | `server/src/server.ts:111-125`<br/>`voice-routes:24` | Auto-generated from FRONTEND_URL + Vercel vars | ✅ .env.example:91 (commented) | Auto-configured | Safe |
| **SENTRY_DSN** | No | 3 | `server/src/config/sentry.ts:18-20` | Empty - initialization skipped | ✅ .env.example:92 (commented)<br/>📝 Not in ENVIRONMENT.md | Sentry.io | Safe - optional |
| **SENTRY_ENVIRONMENT** | No | 3 | `sentry.ts:19` | Falls back to NODE_ENV | 📝 Not documented | Auto-fallback | Safe |
| **SENTRY_TRACES_SAMPLE_RATE** | No | 3 | `sentry.ts:20` | `0.1` (10%) | 📝 Not documented | Auto-default | Safe |

---

### H. Performance & Rate Limiting

| Variable | Required | Tier | Context (Code Location) | Default/Fallback | Docs | Production Set | Security Notes |
|----------|----------|------|------------------------|------------------|------|----------------|----------------|
| **CACHE_TTL_SECONDS** | No | 3 | `server/src/config/environment.ts:120` | `300` (5 minutes) | ✅ .env.example:97<br/>ENVIRONMENT.md:47 | Manual tuning | Safe |
| **RATE_LIMIT_WINDOW_MS** | No | 3 | `environment.ts:123` | `60000` (1 minute) | ✅ .env.example:98<br/>ENVIRONMENT.md:48 | Manual tuning | Safe |
| **RATE_LIMIT_MAX_REQUESTS** | No | 3 | `environment.ts:124` | `100` | ✅ .env.example:99<br/>ENVIRONMENT.md:49 | Manual tuning | Safe |

---

### I. Production Infrastructure (Not Yet Implemented)

The following variables are documented in `/config/.env.production.template` but **NOT used in code**:

| Variable | Documented | Used in Code | Notes |
|----------|-----------|--------------|-------|
| **DB_POOL_MIN** | ✅ | ❌ | Future: Database connection pooling |
| **DB_POOL_MAX** | ✅ | ❌ | Future: Database connection pooling |
| **DB_POOL_IDLE_TIMEOUT** | ✅ | ❌ | Future: Database connection pooling |
| **WS_MAX_CONNECTIONS** | ✅ | ❌ | Future: WebSocket scaling |
| **WS_PING_INTERVAL** | ✅ | ❌ | Future: WebSocket keep-alive |
| **WS_PING_TIMEOUT** | ✅ | ❌ | Future: WebSocket timeout |
| **REDIS_URL** | ✅ | ❌ | Future: Caching/session store |
| **REDIS_PREFIX** | ✅ | ❌ | Future: Key namespacing |
| **REDIS_TTL** | ✅ | ❌ | Future: Cache expiration |
| **CDN_URL** | ✅ | ❌ | Future: Static asset CDN |
| **CDN_ENABLED** | ✅ | ❌ | Future: CDN toggle |
| **STORAGE_PROVIDER** | ✅ | ❌ | Future: File storage (local/s3) |
| **AWS_ACCESS_KEY_ID** | ✅ | ❌ | Future: S3 integration |
| **AWS_SECRET_ACCESS_KEY** | ✅ | ❌ | Future: S3 integration |
| **AWS_REGION** | ✅ | ❌ | Future: S3 region |
| **AWS_S3_BUCKET** | ✅ | ❌ | Future: S3 bucket name |
| **CSP_ENABLED** | ✅ | ❌ | Partially implemented in security-headers.ts |
| **CSP_DIRECTIVES** | ✅ | ❌ | Partially implemented in security-headers.ts |
| **HSTS_ENABLED** | ✅ | ❌ | Partially implemented in security-headers.ts |
| **HSTS_MAX_AGE** | ✅ | ❌ | Partially implemented in security-headers.ts |

---

## Gap Analysis: Code vs Documentation

### 1. Variables Used in Code BUT Missing from Docs

| Variable | Used Where | Impact | Recommendation |
|----------|-----------|--------|----------------|
| **STATION_TOKEN_SECRET** | `auth/stationAuth.ts:11` | Medium | Add to .env.example with security note |
| **KIOSK_JWT_SECRET** | `auth.routes.ts:40-41` | Medium | Add to .env.example |
| **SENTRY_ENVIRONMENT** | `sentry.ts:19` | Low | Document in ENVIRONMENT.md |
| **SENTRY_TRACES_SAMPLE_RATE** | `sentry.ts:20` | Low | Document in ENVIRONMENT.md |
| **WEBHOOK_SECRET** | `webhookSignature.ts:45` | Medium | Add to .env.example |
| **npm_package_version** | `metrics.ts:40, health.routes.ts` | Low | Document as auto-provided |
| **CI** | `playwright.config.ts, vite.config.ts` | Low | Document as CI auto-provided |
| **RENDER** | `rateLimiter.ts:6` | Low | Document as Render auto-provided |
| **VERCEL_URL** | `server.ts:115` | Low | Document as Vercel auto-provided |
| **VERCEL_BRANCH_URL** | `server.ts:116` | Low | Document as Vercel auto-provided |
| **VERCEL_DEPLOYMENT_URL** | `server.ts:117` | Low | Document as Vercel auto-provided |
| **RENDER_EXTERNAL_URL** | `server.ts:114` | Low | Document as Render auto-provided |

### 2. Variables Documented BUT Not Used in Code

| Variable | Documented Where | Likely Reason | Recommendation |
|----------|------------------|---------------|----------------|
| **VITE_OPENAI_API_KEY** | .env.example:131 | Historical - client voice (removed) | **REMOVE from .env.example** |
| **DIRECT_URL** | ENVIRONMENT.md:64 | Planned but not implemented | Remove or mark as "Future" |
| **ANTHROPIC_API_KEY** | ENVIRONMENT.md:79 | Planned but not implemented | Remove or mark as "Future" |
| **CLIENT_URL** | ENVIRONMENT.md:84 | Duplicate of FRONTEND_URL | Consolidate documentation |
| **ENABLE_REALTIME_STREAMING** | ENVIRONMENT.md:85 | Planned but not implemented | Remove or mark as "Future" |
| **SUPABASE_SERVICE_ROLE_KEY** | ENVIRONMENT.md:69 | Different name - should be SUPABASE_SERVICE_KEY | Fix documentation typo |
| **JWT_SECRET** | ENVIRONMENT.md:70 | Different name - should be SUPABASE_JWT_SECRET | Fix documentation typo |

### 3. Documentation Inconsistencies

| Variable | .env.example | ENVIRONMENT.md | Actual Code | Fix Required |
|----------|--------------|----------------|-------------|--------------|
| **SUPABASE_SERVICE_KEY** | ✅ Correct name | ❌ Says "SUPABASE_SERVICE_ROLE_KEY" | ✅ Uses SUPABASE_SERVICE_KEY | Fix ENVIRONMENT.md line 69 |
| **SUPABASE_JWT_SECRET** | ✅ Correct name | ❌ Says "JWT_SECRET" | ✅ Uses SUPABASE_JWT_SECRET | Fix ENVIRONMENT.md line 70 |
| **STRICT_AUTH** | ✅ Detailed (lines 68-84) | ❌ Missing entirely | ✅ Used in middleware/auth.ts:39 | Add to ENVIRONMENT.md |
| **VITE_DEMO_PANEL** | ✅ Security warning | ❌ Basic entry only | ✅ Used in tests | Enhance ENVIRONMENT.md docs |

---

## Security Risk Assessment

### 🔴 CRITICAL (Fix Before Next Deploy)

#### 1. Hardcoded Authentication Defaults (3 variables)

**File:** `server/src/services/auth/pinAuth.ts:17`
```typescript
const PIN_PEPPER = process.env['PIN_PEPPER'] || 'default-pepper-change-in-production';
```

**Problem:**
- If `PIN_PEPPER` environment variable is not set, falls back to predictable string
- Attackers can compute PINs offline using known default
- Bypasses fail-fast validation in env.ts

**Impact:** Complete compromise of PIN authentication system

**Fix Required:**
```typescript
const PIN_PEPPER = process.env['PIN_PEPPER'];
if (!PIN_PEPPER) {
  throw new Error('PIN_PEPPER environment variable is required');
}
```

**Files to Fix:**
- `server/src/services/auth/pinAuth.ts:17` — PIN_PEPPER
- `server/src/services/auth/stationAuth.ts:13` — DEVICE_FINGERPRINT_SALT
- `server/src/services/auth/stationAuth.ts:11` — STATION_TOKEN_SECRET (remove fallback chain)

---

#### 2. Payment Demo Mode Bypass in Production

**File:** `server/src/routes/payments.routes.ts:70-72`
```typescript
if (!process.env['SQUARE_ACCESS_TOKEN'] ||
    process.env['SQUARE_ACCESS_TOKEN'] === 'demo' ||
    process.env['NODE_ENV'] === 'development') {  // ← PROBLEM
```

**Problem:**
- Line 72 allows `NODE_ENV=development` to skip payment validation
- Can bypass Square credential checks even with production token set
- Demo orders may be created in production

**Impact:** Payment processing bypass, potential financial loss

**Fix Required:**
```typescript
// Only allow demo mode if EXPLICITLY in development AND missing token
if (process.env['NODE_ENV'] === 'development' &&
    (!process.env['SQUARE_ACCESS_TOKEN'] ||
     process.env['SQUARE_ACCESS_TOKEN'] === 'demo')) {
```

---

#### 3. VITE_OPENAI_API_KEY Documentation (Exposes Secret to Browser)

**File:** `.env.example:131`
```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here # Required for client-side voice WebRTC
```

**Problem:**
- `VITE_` prefix exposes variable to browser bundle
- OpenAI API key visible in client-side JavaScript
- Historical issue - already removed from code but still documented

**Impact:** API key theft, unauthorized usage, billing fraud

**Fix Required:**
- Remove line 131 from `.env.example`
- Add comment: `# REMOVED: VITE_OPENAI_API_KEY - Security risk (API keys must be server-only)`
- Verify no usage in client code (already verified clean)

---

### 🟡 HIGH PRIORITY (Fix in Next Sprint)

#### 4. STRICT_AUTH Should Be Required in Production

**File:** `server/src/middleware/auth.ts:39`
```typescript
const strictAuth = process.env['STRICT_AUTH'] === 'true';
```

**Problem:**
- Defaults to `false` for backwards compatibility
- Production deployments may forget to enable
- Creates multi-tenant security risk (cross-restaurant data access)

**Impact:** Potential data leakage across restaurant accounts

**Recommendation:**
- Add validation in `env.ts`: If `NODE_ENV=production`, require `STRICT_AUTH=true`
- Warn in logs if production has `STRICT_AUTH=false`
- Update .env.example default to `true`

---

#### 5. SQUARE_ENVIRONMENT Warning Only (Not Enforced)

**File:** `server/src/config/env.ts:155-159`
```typescript
if (squareEnv === 'sandbox') {
  console.warn('⚠️  WARNING: SQUARE_ENVIRONMENT is sandbox in production');
}
```

**Problem:**
- Only warns but doesn't prevent startup
- Production could run with sandbox environment
- Payments would fail but app would continue

**Impact:** Revenue loss, customer frustration

**Recommendation:**
- Change to error in production: `throw new Error(...)`
- Require explicit `SQUARE_ENVIRONMENT=production` for live payments

---

### 🟢 MEDIUM PRIORITY (Address in Future Refactor)

6. **Multi-Level Fallback for STATION_TOKEN_SECRET** — Creates complexity, use single source
7. **Weak Length Validation** — Minimum 32 chars enforced with warning, should error
8. **Test Values Accepted in Validation** — Strings like 'demo', 'test-dummy' pass validation
9. **Empty String Fallbacks** — Some variables use empty string instead of undefined
10. **Runtime Config Overrides** — LOG_LEVEL, LOG_FORMAT can change without validation
11. **Default Restaurant ID Accepts Non-UUID** — Should enforce UUID format in backend
12. **CSP/HSTS Variables Documented But Not Fully Implemented** — Remove from docs or complete implementation

---

## Deployment Platform Requirements

### Vercel (Frontend Client)

**Build-Time Variables (8 required):**
```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_DEFAULT_RESTAURANT_ID=grow
VITE_ENVIRONMENT=production
VITE_SQUARE_APP_ID=sq0idp-...
VITE_SQUARE_LOCATION_ID=L3V8...
VITE_SQUARE_ENVIRONMENT=production
```

**Critical Security Settings:**
```bash
VITE_DEMO_PANEL=0  # MUST be 0 in production
```

**Set Via:**
- Project Settings → Environment Variables
- Separate entries for Production, Preview, Development
- Auto-rebuilds on environment change

---

### Render (Backend Server)

**Required Variables (18):**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
OPENAI_API_KEY=sk-...
SQUARE_ACCESS_TOKEN=EAAA...  # Must start with EAAA
SQUARE_LOCATION_ID=L3V8...
SQUARE_ENVIRONMENT=production
SQUARE_WEBHOOK_SIGNATURE_KEY=...
PIN_PEPPER=<64+ char random string>
DEVICE_FINGERPRINT_SALT=<64+ char random string>
STATION_TOKEN_SECRET=<64+ char random string>
FRONTEND_URL=https://your-domain.com
STRICT_AUTH=true  # REQUIRED for multi-tenant security
LOG_LEVEL=info
```

**Set Via:**
- Service Dashboard → Environment tab
- Secret file option for multi-line values
- Auto-redeploys on changes

**Auto-Provided:**
- `RENDER=true`
- `RENDER_EXTERNAL_URL=https://...`

---

### Supabase

**Manual Setup Required:**
1. Create project → Get credentials
2. Settings → API → Copy:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
3. Settings → API → JWT Secret → Copy:
   - `SUPABASE_JWT_SECRET`
4. Database → Connection string → Copy:
   - `DATABASE_URL`

**Migrations:**
- Via Supabase CLI: `supabase db push`
- Via GitHub Actions (automated in CI/CD)
- Via manual psql execution (not recommended)

---

## Immediate Action Items

### Before Next Production Deploy (P0 Blockers)

- [ ] **Remove hardcoded defaults** in 3 auth files:
  - [ ] `pinAuth.ts:17` — Remove `|| 'default-pepper-change-in-production'`
  - [ ] `stationAuth.ts:13` — Remove `|| 'device-salt-change-in-production'`
  - [ ] `stationAuth.ts:11` — Simplify to single source, remove fallback chain

- [ ] **Fix payment demo mode bypass**:
  - [ ] `payments.routes.ts:70-72` — Restrict demo mode to dev environment only

- [ ] **Remove VITE_OPENAI_API_KEY from documentation**:
  - [ ] `.env.example:131` — Delete line with security comment
  - [ ] Verify no client code usage (already verified clean)

- [ ] **Enforce STRICT_AUTH in production**:
  - [ ] `env.ts` — Add validation: `if (NODE_ENV=prod) require STRICT_AUTH=true`
  - [ ] `.env.example:84` — Change default to `true`

### Documentation Fixes (P1 High Priority)

- [ ] **Add missing variables to .env.example**:
  - [ ] STATION_TOKEN_SECRET (with security note)
  - [ ] KIOSK_JWT_SECRET
  - [ ] WEBHOOK_SECRET

- [ ] **Fix ENVIRONMENT.md inconsistencies**:
  - [ ] Line 69: SUPABASE_SERVICE_ROLE_KEY → SUPABASE_SERVICE_KEY
  - [ ] Line 70: JWT_SECRET → SUPABASE_JWT_SECRET
  - [ ] Add STRICT_AUTH with detailed explanation
  - [ ] Add SENTRY_* variables

- [ ] **Remove future/unused variables from docs**:
  - [ ] VITE_OPENAI_API_KEY
  - [ ] DIRECT_URL (or mark as "Planned")
  - [ ] ANTHROPIC_API_KEY (or mark as "Planned")
  - [ ] ENABLE_REALTIME_STREAMING (or mark as "Planned")

### Code Hygiene (P2 Medium Priority)

- [ ] **Centralize all process.env access through env.ts**:
  - [ ] Audit 429 usages, consolidate to config functions
  - [ ] Remove direct `process.env['VAR']` access outside config files

- [ ] **Strengthen validation**:
  - [ ] Minimum 64 characters for all secrets (currently 32)
  - [ ] Reject test values in production (e.g., 'demo', 'test-dummy')
  - [ ] Enforce UUID format for DEFAULT_RESTAURANT_ID in backend

- [ ] **Simplify fallback logic**:
  - [ ] Remove multi-level fallbacks (STATION_TOKEN_SECRET)
  - [ ] Use `undefined` instead of empty string for missing optional vars

---

## Testing Recommendations

### 1. Environment Validation Test Suite

**Create:** `server/tests/config/env-integration.test.ts`

Test scenarios:
- ✅ Production mode rejects hardcoded defaults
- ✅ Production mode requires STRICT_AUTH=true
- ✅ Production mode rejects SQUARE_ENVIRONMENT=sandbox
- ✅ All secrets meet minimum length requirements
- ✅ Test values rejected in production
- ✅ VITE_DEMO_PANEL=1 blocked in production

### 2. Runtime Validation Monitoring

**Add to startup logs:**
```typescript
logger.info('Environment Validation Results', {
  tier1_required: 'PASSED',
  tier2_production: 'PASSED',
  tier3_optional: 'WARNINGS_IGNORED',
  security_audit: {
    strict_auth: process.env['STRICT_AUTH'],
    square_env: process.env['SQUARE_ENVIRONMENT'],
    demo_panel: process.env['VITE_DEMO_PANEL'],
  }
});
```

### 3. Pre-Deployment Checklist Script

**Create:** `scripts/pre-deploy-env-check.sh`

```bash
#!/bin/bash
# Pre-deployment environment validation

echo "🔍 Running pre-deployment environment checks..."

# Check for hardcoded defaults
if grep -r "default-pepper-change-in-production" server/src/; then
  echo "❌ BLOCKER: Hardcoded PIN_PEPPER default found"
  exit 1
fi

# Check STRICT_AUTH in production
if [ "$NODE_ENV" = "production" ] && [ "$STRICT_AUTH" != "true" ]; then
  echo "❌ BLOCKER: STRICT_AUTH must be true in production"
  exit 1
fi

# Check VITE_DEMO_PANEL
if [ "$NODE_ENV" = "production" ] && [ "$VITE_DEMO_PANEL" != "0" ]; then
  echo "❌ BLOCKER: VITE_DEMO_PANEL must be 0 in production"
  exit 1
fi

echo "✅ All pre-deployment checks passed"
```

---

## Recommended .env.example Updates

### Section to Add: Missing Critical Variables

```bash
# ====================
# Kiosk/Station Authentication (v6.0.5+)
# ====================
# CRITICAL: Generate unique secrets for each environment
# Use: openssl rand -base64 64
KIOSK_JWT_SECRET=generate-random-64-char-string-here
STATION_TOKEN_SECRET=generate-random-64-char-string-here

# ====================
# Webhook Security
# ====================
WEBHOOK_SECRET=your_webhook_signature_key_here
```

### Section to Remove: Security Risks

```bash
# REMOVED: Security vulnerability - API keys must never be client-side
# VITE_OPENAI_API_KEY was previously documented here but exposes
# credentials to browser. Voice features now use server-side API only.
```

### Section to Update: Production Requirements

```bash
# Strict Authentication Mode (Multi-Tenant Security)
# PRODUCTION REQUIREMENT: Must be 'true' in production environments
# Development: Can be 'false' for testing (backwards compatibility)
STRICT_AUTH=true  # Changed default from false to true
```

---

## Summary Statistics

### Environment Variables Inventory

- **Total documented:** 79 variables
- **Total code usages:** 429 instances
- **Files affected:** 60+ files
- **Documentation sources:** 10 files

### Risk Breakdown

- **Critical vulnerabilities:** 3 (hardcoded defaults)
- **High priority issues:** 2 (STRICT_AUTH, payment bypass)
- **Medium priority:** 7 (validation improvements)
- **Documentation gaps:** 12 variables
- **Documentation inconsistencies:** 4 variables

### Coverage Analysis

- **Variables with full docs:** 67 (85%)
- **Variables missing from docs:** 12 (15%)
- **Variables documented but unused:** 5 (6%)
- **Variables with inconsistent docs:** 4 (5%)

---

## Validation Against Production Checklist

| Category | Status | Notes |
|----------|--------|-------|
| **All Tier 1 required variables set** | ⚠️ PARTIAL | Hardcoded defaults bypass validation |
| **All Tier 2 production variables set** | ⚠️ PARTIAL | Demo mode allows bypass |
| **No test/demo values in production** | ❌ FAIL | Validation accepts 'demo' values |
| **Secrets meet minimum length** | ⚠️ WARN | 32 char min, should be 64 |
| **STRICT_AUTH enabled** | ❌ FAIL | Defaults to false |
| **VITE_DEMO_PANEL disabled** | ⚠️ WARN | Not validated at build time |
| **SQUARE_ENVIRONMENT=production** | ⚠️ WARN | Warning only, not enforced |
| **Documentation complete** | ⚠️ PARTIAL | 12 variables missing |
| **No hardcoded secrets** | ❌ FAIL | 3 hardcoded defaults |
| **Fail-fast validation working** | ⚠️ PARTIAL | Bypassed by defaults |

---

## Recommended Next Steps

### Phase 1: Immediate Security Fixes (This Week)
1. Remove 3 hardcoded defaults
2. Fix payment demo mode bypass
3. Remove VITE_OPENAI_API_KEY from docs
4. Add pre-deployment validation script

### Phase 2: Production Hardening (Next Sprint)
5. Enforce STRICT_AUTH=true in production
6. Strengthen secret length requirements (64 chars)
7. Error on SQUARE_ENVIRONMENT=sandbox in production
8. Add runtime environment audit logging

### Phase 3: Documentation & Testing (Next Month)
9. Complete .env.example with missing variables
10. Fix ENVIRONMENT.md inconsistencies
11. Create comprehensive environment test suite
12. Document auto-provided variables (CI, Vercel, Render)

### Phase 4: Code Quality (Future)
13. Centralize all process.env access through config
14. Refactor 429 usages to use typed getters
15. Remove unused documented variables
16. Implement environment drift detection

---

**Audit Completed:** 2025-11-11
**Next Review Recommended:** After Phase 1 security fixes deployed
**Document Version:** 1.0
**Reviewed By:** Founder (review pending)
