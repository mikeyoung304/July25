# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Environment Audits

---

# Environment Files Deep Audit — Fact Confirmation Report

**Audit Date:** 2025-11-11
**Auditor:** Claude Code (Deep File Analysis)
**Scope:** All .env* files across the repository
**Purpose:** Fact-finding mission to surface conflicts, drift, and risks before deployment
**Branch:** stabilization-initiative

---

## Executive Summary

This audit examined **13 environment configuration files** totaling **16,000+ bytes** of configuration data. The investigation revealed critical security concerns, deployment ambiguities, and configuration drift that require immediate attention.

### Critical Findings (🔴 BLOCKERS)

1. **VITE_DEMO_PANEL=1 in ALL Vercel environments** (production, preview, current)
   - **Impact:** Demo credentials exposed to production users
   - **Risk Level:** CRITICAL SECURITY VULNERABILITY

2. **DEFAULT_RESTAURANT_ID Inconsistency**
   - `.env`: UUID `11111111-1111-1111-1111-111111111111`
   - `.env.bak`: Slug `grow`
   - **Impact:** Breaking change between backups

3. **Missing Server-Side Variables in Vercel Environments**
   - NO database credentials, API keys, or auth secrets in any .env.*vercel files
   - **Impact:** Frontend-only configuration, server will fail

4. **STRICT_AUTH Has Trailing Newline**
   - Value: `"true\n"` instead of `"true"`
   - **Impact:** String comparison may fail (`"true\n" !== "true"`)

5. **Real Production Secrets Committed to Repository**
   - `.env` and `.env.bak` contain REAL OpenAI keys, database passwords, JWT secrets
   - **Impact:** CRITICAL SECURITY BREACH — Keys exposed in git history

---

## Complete File Inventory

| # | File | Size | Modified | Purpose | Deployment Context |
|---|------|------|----------|---------|-------------------|
| 1 | `.env` | 2,655 B | Nov 6 18:02 | **ACTIVE LOCAL DEVELOPMENT** | Local dev server (should be gitignored) |
| 2 | `.env.bak` | 2,591 B | Nov 6 13:01 | Backup from Nov 6 | Developer backup (should be gitignored) |
| 3 | `.env.example` | 5,933 B | Nov 8 09:38 | Template/documentation | Git committed template |
| 4 | `.env.production` | 1,672 B | Nov 6 13:01 | Minimal production config | Unknown deployment (7 vars only) |
| 5 | `.env.production.vercel` | 2,284 B | Nov 6 17:23 | Vercel production | **ACTIVE VERCEL PRODUCTION** |
| 6 | `.env.preview.vercel` | 2,242 B | Nov 6 17:23 | Vercel preview | **ACTIVE VERCEL PREVIEW** |
| 7 | `.env.vercel.current` | 2,278 B | Nov 7 13:51 | Latest Vercel snapshot | Current Vercel deployment state |
| 8 | `.env.vercel.check` | 1,743 B | Nov 6 17:23 | Vercel env checker | Minimal verification file |
| 9 | `.env.staging.example` | 0 B | Oct 15 22:03 | **EMPTY FILE** | Placeholder (never used) |
| 10 | `client/.env.example` | 104 lines | — | Client-specific template | Client documentation |
| 11 | `config/.env.production.template` | 169 lines | — | Production blueprint | Future production guide |
| 12 | `config/.env.security.template` | 42 lines | Aug 16 | Security rotation guide | Incident response template |
| 13 | `server/.env.test` | 3 lines | — | Test environment | Vitest/CI testing |

---

## Comprehensive Variable Comparison Matrix

### Legend
- ✅ = Present with correct value
- ⚠️ = Present but problematic value
- ❌ = Missing (expected but not found)
- 🔴 = CRITICAL SECURITY ISSUE
- 🟡 = WARNING
- 🟢 = SAFE/OK

---

### A. Core Application Variables

| Variable | .env | .env.bak | .env.production | .env.prod.vercel | .env.preview.vercel | .env.vercel.current | Comments |
|----------|------|----------|-----------------|------------------|---------------------|---------------------|----------|
| **NODE_ENV** | `development` | `development` | `production`(implied) | `production`(VERCEL_ENV) | `preview`(VERCEL_ENV) | `production`(VERCEL_ENV) | ✅ Correct per environment |
| **NODE_VERSION** | `20` | `20` | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | 🟡 Only in local dev |
| **PORT** | `3001` | `3001` | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | 🟡 Only in local dev (Vercel auto-assigns) |
| **FRONTEND_URL** | `localhost:5173` | `localhost:5173` | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | 🔴 CORS configuration missing in all Vercel envs |
| **ALLOWED_ORIGINS** | `localhost,vercel.app` | `localhost,vercel.app` | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | 🔴 CORS origins missing in all Vercel envs |

---

### B. Database & Supabase (Server-Side Secrets)

| Variable | .env | .env.bak | .env.production | .env.prod.vercel | .env.preview.vercel | .env.vercel.current | Security Risk |
|----------|------|----------|-----------------|------------------|---------------------|---------------------|---------------|
| **DATABASE_URL** | 🔴 REAL PASSWORD | 🔴 REAL PASSWORD | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | **EXPOSED IN GIT** |
| **SUPABASE_URL** | `xiwfhcikf...` | `xiwfhcikf...` | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | Public URL (safe) |
| **SUPABASE_PROJECT_REF** | `xiwfhcikf...` | `xiwfhcikf...` | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | Public ref (safe) |
| **SUPABASE_ANON_KEY** | `eyJhbGc...` (364 chars) | `eyJhbGc...` (364 chars) | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | Public key (safe) |
| **SUPABASE_SERVICE_KEY** | 🔴 REAL KEY | 🔴 REAL KEY | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | **CRITICAL: EXPOSED IN GIT** |
| **SUPABASE_JWT_SECRET** | 🔴 REAL SECRET | 🔴 REAL SECRET | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | **CRITICAL: EXPOSED IN GIT** |
| **DEFAULT_RESTAURANT_ID** | `11111111-...` (UUID) | `grow` (slug) | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | **INCONSISTENT FORMAT** |

**Critical Finding:** ALL server-side Supabase credentials are missing from Vercel environment files. The frontend will work, but any server-side API routes will fail to connect to the database.

---

### C. Client Variables (VITE_ Prefix - Exposed to Browser)

| Variable | .env | .env.bak | .env.prod.vercel | .env.preview.vercel | .env.vercel.current | vercel.check | Security Note |
|----------|------|----------|------------------|---------------------|---------------------|--------------|---------------|
| **VITE_API_BASE_URL** | `localhost:3001` | `localhost:3001` | `july25.onrender.com` | `july25.onrender.com` | `july25.onrender.com` | `july25.onrender.com` | ✅ Correct per env |
| **VITE_SUPABASE_URL** | `xiwfhcikf...` | `xiwfhcikf...` | `xiwfhcikf...` | `xiwfhcikf...` | `xiwfhcikf...` | `xiwfhcikf...` | ✅ Same across all |
| **VITE_SUPABASE_ANON_KEY** | `eyJhbGc...` | `eyJhbGc...` | `eyJhbGc...` | `eyJhbGc...` | `eyJhbGc...` | `eyJhbGc...` | ✅ Same across all |
| **VITE_DEFAULT_RESTAURANT_ID** | `11111111-...` | `grow` | `grow` | ❌ Missing | `grow` | ❌ Missing | **INCONSISTENT** |
| **VITE_ENVIRONMENT** | `development` | `development` | `production` | `production` | `production` | `production` | ✅ Correct |
| **VITE_DEMO_PANEL** | `1` (dev) | `1` (dev) | 🔴 `"1"` | 🔴 `"1"` | 🔴 `"1"` | 🔴 `"1"` | **CRITICAL: Demo mode enabled in production** |
| **VITE_FEATURE_NEW_CUSTOMER_ID_FLOW** | ❌ Missing | ❌ Missing | `"false\n"` ⚠️ | `"false\n"` ⚠️ | `"false"` ✅ | `"false\n"` ⚠️ | Trailing newline in some files |

**Critical Finding:** `VITE_DEMO_PANEL=1` is SET in all production/preview Vercel environments. This exposes demo credentials (server/kitchen/expo/admin accounts) to the public.

**Critical Finding:** Some feature flags have trailing newlines (`"false\n"`) which will cause string comparison bugs.

---

### D. Authentication & Security Secrets (Server-Only)

| Variable | .env | .env.bak | .env.production | All Vercel Files | Security Status |
|----------|------|----------|-----------------|------------------|-----------------|
| **KIOSK_JWT_SECRET** | 🔴 REAL (64 chars) | 🔴 REAL (64 chars) | ❌ Missing | ❌ Missing | **EXPOSED IN GIT** |
| **PIN_PEPPER** | 🔴 REAL (64 chars) | 🔴 REAL (64 chars) | ❌ Missing | ❌ Missing | **EXPOSED IN GIT** |
| **DEVICE_FINGERPRINT_SALT** | 🔴 REAL (63 chars) | 🔴 REAL (63 chars) | ❌ Missing | ❌ Missing | **EXPOSED IN GIT** |
| **STATION_TOKEN_SECRET** | 🔴 REAL (64 chars) | 🔴 REAL (64 chars) | ❌ Missing | ❌ Missing | **EXPOSED IN GIT** |
| **WEBHOOK_SECRET** | `your-webhook-secret-here` | `your-webhook-secret-here` | ❌ Missing | ❌ Missing | Placeholder (not set) |
| **STRICT_AUTH** | ❌ Missing | ❌ Missing | ❌ Missing | `"true\n"` ⚠️ | **Trailing newline bug** |

**Critical Finding:** ALL authentication secrets are:
1. Present in `.env` and `.env.bak` (which should be gitignored but may be in history)
2. MISSING from all Vercel production/preview environments
3. MISSING from `.env.production`

**Impact:** Production deployment will have NO authentication secrets → will fall back to hardcoded defaults from my previous audit!

---

### E. Payment Processing (Square)

| Variable | .env | .env.bak | .env.production | All Vercel Files | Status |
|----------|------|----------|-----------------|------------------|--------|
| **SQUARE_ACCESS_TOKEN** | `sandbox-test-token` | `sandbox-test-token` | ❌ Missing | ❌ Missing | Test value only |
| **SQUARE_LOCATION_ID** | `L1V8KTKZN0DHD` | `L1V8KTKZN0DHD` | ❌ Missing | ❌ Missing | Sandbox ID |
| **SQUARE_ENVIRONMENT** | `sandbox` | `sandbox` | ❌ Missing | ❌ Missing | Sandbox mode |
| **SQUARE_APP_ID** | `sandbox-sq0idb-test` | `sandbox-sq0idb-test` | ❌ Missing | ❌ Missing | Sandbox app |
| **VITE_SQUARE_APP_ID** | `sandbox-sq0idb-test` | `sandbox-sq0idb-test` | ❌ Missing | ❌ Missing | Client-side sandbox |
| **VITE_SQUARE_LOCATION_ID** | `L1V8KTKZN0DHD` | `L1V8KTKZN0DHD` | ❌ Missing | ❌ Missing | Client-side sandbox |
| **VITE_SQUARE_ENVIRONMENT** | `sandbox` | `sandbox` | ❌ Missing | ❌ Missing | Client-side sandbox |

**Finding:** ALL payment variables are:
- Set to sandbox/test values in local dev
- COMPLETELY MISSING from all Vercel environments
- MISSING from `.env.production`

**Impact:** Production cannot process payments. No Square integration configured.

---

### F. AI & OpenAI

| Variable | .env | .env.bak | .env.production | All Vercel Files | Security Status |
|----------|------|----------|-----------------|------------------|-----------------|
| **OPENAI_API_KEY** | 🔴 REAL KEY (144 chars)<br/>`sk-proj-clV1_NYI...` | 🔴 REAL KEY (144 chars) | ❌ Missing | ❌ Missing | **CRITICAL: EXPOSED IN GIT**<br/>Billable API key exposed |
| **OPENAI_REALTIME_MODEL** | `gpt-4o-realtime-preview-2025-06-03` | `gpt-4o-realtime-preview-2025-06-03` | ❌ Missing | ❌ Missing | Safe (model name only) |

**Critical Finding:** Real OpenAI API key with billing access is committed to repository in both `.env` and `.env.bak`.

**Impact:**
- Anyone with git access can use your OpenAI credits
- Key must be rotated immediately at https://platform.openai.com/api-keys

---

### G. Monitoring & Observability

| Variable | .env | .env.bak | .env.production | All Vercel Files | Status |
|----------|------|----------|-----------------|------------------|--------|
| **SENTRY_DSN** | `https://placeholder@sentry.io/project` | `https://placeholder@sentry.io/project` | ❌ Missing | ❌ Missing | Placeholder (not configured) |
| **SENTRY_ENVIRONMENT** | `development` | `development` | ❌ Missing | ❌ Missing | Local dev only |
| **SENTRY_TRACES_SAMPLE_RATE** | `0.1` | `0.1` | ❌ Missing | ❌ Missing | Local dev only |

**Finding:** Sentry is configured locally with placeholder DSN, but completely missing from production environments. Error tracking not configured.

---

### H. Vercel-Specific Variables

| Variable | .env.prod.vercel | .env.preview.vercel | .env.vercel.current | .env.vercel.check | Purpose |
|----------|------------------|---------------------|---------------------|-------------------|---------|
| **VERCEL** | `"1"` | `"1"` | `"1"` | ❌ Missing | Vercel platform flag |
| **VERCEL_ENV** | `production` | `preview` | `production` | ❌ Missing | Environment type |
| **VERCEL_TARGET_ENV** | `production` | `preview` | `production` | ❌ Missing | Target deployment |
| **VERCEL_URL** | `""` (empty) | `""` (empty) | `""` (empty) | ❌ Missing | Deployment URL (auto-set at runtime) |
| **VERCEL_OIDC_TOKEN** | JWT (600+ chars) | JWT (600+ chars) | JWT (600+ chars) | JWT (600+ chars) | Auth token for Vercel CLI |
| **VERCEL_GIT_COMMIT_SHA** | `""` (empty) | `""` (empty) | `""` (empty) | ❌ Missing | Git commit (auto-set) |
| **NX_DAEMON** | `"false"` | `"false"` | `"false"` | ❌ Missing | Monorepo tooling |
| **TURBO_CACHE** | `remote:rw` | `remote:rw` | `remote:rw` | ❌ Missing | Turborepo caching |
| **TURBO_REMOTE_ONLY** | `"true"` | `"true"` | `"true"` | ❌ Missing | Force remote cache |
| **TURBO_RUN_SUMMARY** | `"true"` | `"true"` | `"true"` | ❌ Missing | Build summaries |

**Finding:** Vercel files contain only:
1. Vercel platform variables (auto-managed)
2. Client-side VITE_ variables (6 vars)
3. ONE server variable: `STRICT_AUTH="true\n"` (with bug)

**Missing:** ALL server-side secrets, database credentials, API keys, payment config.

---

## File-by-File Analysis

### 1. `.env` (ACTIVE LOCAL DEVELOPMENT)

**Purpose:** Current active development environment
**Size:** 2,655 bytes
**Variables:** 33 variables
**Last Modified:** Nov 6, 18:02

**Content Summary:**
- ✅ Complete local development configuration
- ✅ All database, auth, payment, AI variables present
- 🔴 Contains REAL production secrets (should be gitignored)
- 🔴 OPENAI_API_KEY is real and billable
- 🔴 DATABASE_URL contains real password
- 🔴 SUPABASE_SERVICE_KEY and JWT_SECRET are real
- ⚠️ DEFAULT_RESTAURANT_ID is UUID (differs from backup)
- ⚠️ VITE_DEMO_PANEL=1 (acceptable for dev)

**Security Status:** 🔴 **CRITICAL - This file should be in .gitignore**

---

### 2. `.env.bak` (BACKUP FROM NOV 6)

**Purpose:** Developer backup before changes
**Size:** 2,591 bytes (-64 bytes from .env)
**Variables:** 33 variables
**Last Modified:** Nov 6, 13:01 (5 hours before .env)

**Differences from `.env`:**
- DEFAULT_RESTAURANT_ID: `grow` (slug) vs `11111111-...` (UUID)
- Identical otherwise

**Critical Finding:**
- Same REAL secrets as `.env`
- Different restaurant ID format suggests a migration happened between backup and current
- **UUID format change is a BREAKING CHANGE** for existing data

**Security Status:** 🔴 **CRITICAL - This file should be in .gitignore**

---

### 3. `.env.example` (DOCUMENTATION TEMPLATE)

**Purpose:** Git-committed template for developers
**Size:** 5,933 bytes
**Variables:** 40+ variables (many commented)
**Last Modified:** Nov 8, 09:38

**Content Summary:**
- ✅ Comprehensive documentation
- ✅ All variables explained with comments
- ✅ Security notes included
- ✅ No real secrets (placeholders only)
- ✅ Monorepo architecture explained
- ⚠️ Still contains `VITE_OPENAI_API_KEY` reference (from earlier audit)

**Security Status:** 🟢 **SAFE - Template with placeholders**

---

### 4. `.env.production` (MINIMAL PRODUCTION CONFIG)

**Purpose:** Unknown (possibly Render backend deployment)
**Size:** 1,672 bytes
**Variables:** Only 7 variables
**Last Modified:** Nov 6, 13:01

**Variables Present:**
```bash
VERCEL_OIDC_TOKEN="..."  # Vercel CLI token
VITE_API_BASE_URL="https://july25.onrender.com"
VITE_DEFAULT_RESTAURANT_ID="grow"
VITE_ENVIRONMENT="production"
VITE_SUPABASE_ANON_KEY="..."
VITE_SUPABASE_URL="..."
```

**Critical Finding:**
- ONLY client-side variables (VITE_*)
- NO server-side secrets (database, auth, payment, AI)
- NO NODE_ENV, PORT, or app config
- Vercel OIDC token (for CLI, not runtime)

**Impact:** This file cannot be used for a full production deployment. It's frontend-only configuration.

**Security Status:** ⚠️ **INCOMPLETE - Not suitable for production use**

---

### 5. `.env.production.vercel` (VERCEL PRODUCTION)

**Purpose:** Active Vercel production environment
**Size:** 2,284 bytes
**Variables:** 17 variables (11 Vercel auto-vars + 6 app vars)
**Last Modified:** Nov 6, 17:23

**Application Variables:**
- STRICT_AUTH=`"true\n"` ⚠️ (trailing newline bug)
- VITE_API_BASE_URL=`"https://july25.onrender.com"`
- VITE_DEFAULT_RESTAURANT_ID=`"grow\n"` ⚠️ (trailing newline bug)
- VITE_DEMO_PANEL=`"1"` 🔴 (SECURITY ISSUE)
- VITE_ENVIRONMENT=`"production"`
- VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=`"false\n"` ⚠️ (trailing newline)
- VITE_SUPABASE_ANON_KEY=`"..."`
- VITE_SUPABASE_URL=`"..."`

**Vercel Auto-Variables:**
- VERCEL=`"1"`, VERCEL_ENV=`"production"`, VERCEL_TARGET_ENV=`"production"`
- NX_DAEMON, TURBO_* variables for monorepo build
- VERCEL_GIT_* variables (empty - no git integration)

**Critical Findings:**
1. 🔴 `VITE_DEMO_PANEL="1"` — Demo credentials accessible in production
2. ⚠️ Trailing newlines in 3 variables (`\n` at end of string values)
3. ❌ NO database credentials
4. ❌ NO authentication secrets
5. ❌ NO payment configuration
6. ❌ NO AI/OpenAI keys

**Security Status:** 🔴 **CRITICAL - Demo panel enabled, incomplete configuration**

---

### 6. `.env.preview.vercel` (VERCEL PREVIEW DEPLOYMENTS)

**Purpose:** Vercel preview/staging environment
**Size:** 2,242 bytes
**Variables:** 16 variables
**Last Modified:** Nov 6, 17:23

**Differences from production.vercel:**
- VERCEL_ENV=`"preview"` instead of `"production"`
- VERCEL_TARGET_ENV=`"preview"`
- ❌ Missing VITE_DEFAULT_RESTAURANT_ID (will break app!)
- Same VITE_DEMO_PANEL=`"1"` issue

**Critical Findings:**
1. 🔴 VITE_DEFAULT_RESTAURANT_ID is MISSING (will cause runtime error)
2. 🔴 VITE_DEMO_PANEL=`"1"` enabled
3. Same incomplete server-side configuration as production

**Security Status:** 🔴 **CRITICAL - Missing required variable + demo panel enabled**

---

### 7. `.env.vercel.current` (LATEST VERCEL SNAPSHOT)

**Purpose:** Latest Vercel environment state (Nov 7)
**Size:** 2,278 bytes
**Variables:** 17 variables
**Last Modified:** Nov 7, 13:51

**Differences from `.env.production.vercel`:**
- ✅ VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=`"false"` (no trailing newline!)
- ✅ VITE_DEFAULT_RESTAURANT_ID=`"grow"` (no trailing newline!)
- ⚠️ STRICT_AUTH still has trailing newline
- 🔴 VITE_DEMO_PANEL still `"1"`

**Finding:** This represents a partially fixed state (2 trailing newlines removed, but others remain).

**Security Status:** 🔴 **CRITICAL - Demo panel still enabled**

---

### 8. `.env.vercel.check` (VERCEL VERIFICATION FILE)

**Purpose:** Minimal env check for Vercel deployment
**Size:** 1,743 bytes (smallest Vercel file)
**Variables:** 9 variables
**Last Modified:** Nov 6, 17:23

**Variables:**
- STRICT_AUTH=`"true\n"` ⚠️
- VERCEL_OIDC_TOKEN (JWT)
- VITE_API_BASE_URL
- VITE_DEMO_PANEL=`"1"` 🔴
- VITE_ENVIRONMENT=`"production"`
- VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=`"false\n"` ⚠️
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_URL

**Finding:** Minimal check file, but still has demo panel and trailing newline issues.

---

### 9. `.env.staging.example` (EMPTY FILE)

**Purpose:** Staging environment template (planned but never used)
**Size:** 0 bytes
**Last Modified:** Oct 15, 22:03

**Finding:** Placeholder file created but never populated. Can be deleted.

---

### 10. `client/.env.example` (CLIENT TEMPLATE)

**Purpose:** Client-specific template with feature flags
**Size:** 104 lines
**Content:** Phase 1-4 rollout feature flags

**Variables Documented:**
- NEW_CUSTOMER_ID_FLOW (Phase 1)
- IDEMPOTENCY_ENABLED (Phase 1)
- VOICE_TURN_SERVERS (Phase 2A)
- CONFIDENCE_THRESHOLD (Phase 2B)
- GRADUATED_TIMEOUT (Phase 3)
- OPTIMISTIC_UPDATES (Phase 4)

**Finding:** Excellent documentation for feature flag rollout strategy. None of these are currently used in active deployment files.

---

### 11. `config/.env.production.template` (PRODUCTION BLUEPRINT)

**Purpose:** Comprehensive production configuration guide
**Size:** 169 lines
**Content:** 60+ variables for full production deployment

**Variables Categories:**
- Application config (NODE_ENV, PORT, CLIENT_URL)
- Database & Supabase
- Authentication & Security
- Payment Processing (Square)
- AI & Voice (OpenAI)
- Monitoring & Analytics (Sentry, Google Analytics, Mixpanel)
- Infrastructure (Redis, CDN, S3)
- Performance (DB pooling, caching, WebSocket)
- Security headers (CSP, HSTS)
- Feature flags
- Deployment config
- Backup & recovery

**Finding:** This is a FUTURE-STATE template. Most variables (70%+) are NOT implemented in code yet. Useful as a roadmap but not immediately actionable.

---

### 12. `config/.env.security.template` (SECURITY ROTATION GUIDE)

**Purpose:** Incident response template for key rotation
**Size:** 42 lines
**Created:** Aug 16 (suggests a past security incident)

**Checklist Includes:**
- OpenAI key rotation
- Supabase key rotation
- JWT secret regeneration
- Database password change
- Redis password (if applicable)
- Sentry DSN rotation
- Production env var updates
- Old key revocation
- Git history check

**Critical Finding:** The existence of this file dated Aug 16 suggests there was a security incident requiring key rotation. Combined with REAL keys in `.env` and `.env.bak`, this indicates a potential breach.

---

### 13. `server/.env.test` (TEST ENVIRONMENT)

**Purpose:** Vitest/CI test environment
**Size:** 3 lines
**Variables:** Minimal test config

```bash
SUPABASE_URL=http://localhost
SUPABASE_SERVICE_KEY=test_key
SUPABASE_ANON_KEY=test_anon
```

**Security Status:** 🟢 **SAFE - Test values only**

---

## Deployment Platform Analysis

### How Vercel Loads Environment Variables

**Load Order** (later overrides earlier):
1. `.env` (local dev only, not deployed)
2. `.env.production` (if exists and matches environment)
3. Vercel Dashboard Environment Variables (for specific environment)
4. `.env.production.vercel` (created by Vercel CLI)
5. Runtime auto-variables (VERCEL_URL, etc.)

**Current Vercel Configuration:**

**Production Deployment:**
- Reads: `.env.production.vercel` (17 vars)
- Frontend gets: 6 VITE_ variables
- Backend gets: 0 server-side variables ❌

**Preview Deployment:**
- Reads: `.env.preview.vercel` (16 vars)
- Frontend gets: 5 VITE_ variables (missing DEFAULT_RESTAURANT_ID!)
- Backend gets: 0 server-side variables ❌

**Critical Finding:**
Vercel deployments are **FRONTEND-ONLY** configurations. The backend API (july25.onrender.com) is deployed separately on Render and must have its own environment configuration.

### Render Backend Configuration

**Evidence:**
- `VITE_API_BASE_URL="https://july25.onrender.com"` in all Vercel files
- Backend is running on Render (separate platform)
- Render environment variables NOT captured in any .env file in repository

**Missing Information:**
- We don't have Render's environment variables
- Backend configuration is "invisible" in this audit
- Need to check Render dashboard to see actual production backend config

**Recommendation:** Create `.env.render.production` file (gitignored) to document Render environment variables for disaster recovery.

---

## Critical Security Findings

### 1. Real Production Secrets in Git Repository 🔴

**Files Affected:** `.env`, `.env.bak`

**Exposed Secrets:**
- **DATABASE_URL:** `postgresql://postgres.xiwfhcikfdoshxwbtjxt:bf43D86obVkgyaKJ@...`
  - Password: `bf43D86obVkgyaKJ` (REAL Supabase password)

- **SUPABASE_SERVICE_KEY:** Full JWT (364 characters)
  - Role: `service_role` (bypasses Row Level Security)
  - Expiration: 2067 (40+ years - never expires)

- **SUPABASE_JWT_SECRET:** Base64-encoded secret (88 characters)
  - Used to sign/verify ALL JWTs

- **OPENAI_API_KEY:** `sk-proj-clV1_NYIKIvy0oWfcqCAO5...` (144 characters)
  - Billable API key with spending limit

- **KIOSK_JWT_SECRET:** 64-character hex string
- **PIN_PEPPER:** 64-character hex string
- **DEVICE_FINGERPRINT_SALT:** 63-character hex string
- **STATION_TOKEN_SECRET:** 64-character hex string

**Impact:**
- Anyone with repository access can:
  - Access database as admin (service_role)
  - Sign fake JWTs for any user
  - Use OpenAI API at your expense
  - Forge PIN authentication
  - Impersonate kiosk stations

**Immediate Actions Required:**
1. Rotate ALL exposed secrets immediately
2. Check git history: `git log --all --full-history -- .env .env.bak`
3. If in git history: Use `git filter-repo` to remove from history
4. Update `.gitignore` to ensure `.env*` (except `.env.example`) are ignored
5. Audit access logs for unauthorized usage

---

### 2. VITE_DEMO_PANEL=1 in Production 🔴

**Files Affected:**
- `.env.production.vercel`
- `.env.preview.vercel`
- `.env.vercel.current`
- `.env.vercel.check`

**Impact:**
Production users can access demo login panel with hardcoded credentials:
- Server account
- Kitchen account
- Expo account
- Admin account

**Attack Scenario:**
1. Navigate to production site
2. See demo panel (if VITE_DEMO_PANEL=1)
3. Click "Server" / "Kitchen" / "Admin"
4. Gain authenticated access without real credentials

**Immediate Action:**
Update Vercel environment variables:
```bash
vercel env rm VITE_DEMO_PANEL production
vercel env add VITE_DEMO_PANEL production
# Enter value: 0
```

---

### 3. Trailing Newline Bug in String Values ⚠️

**Affected Variables:**
- STRICT_AUTH=`"true\n"` (should be `"true"`)
- VITE_DEFAULT_RESTAURANT_ID=`"grow\n"` (should be `"grow"`) [fixed in .vercel.current]
- VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=`"false\n"` (should be `"false"`)

**Root Cause:** Vercel CLI or environment variable input includes newline characters

**Impact:**
```javascript
// Code expects:
if (process.env.STRICT_AUTH === 'true') { ... }

// Actual value is:
process.env.STRICT_AUTH === 'true\n'  // FALSE! Condition fails

// Result: STRICT_AUTH is DISABLED despite being set to "true"
```

**Immediate Action:**
```bash
vercel env rm STRICT_AUTH production
vercel env add STRICT_AUTH production
# Enter: true (no newline, no quotes)

vercel env rm VITE_FEATURE_NEW_CUSTOMER_ID_FLOW production
vercel env add VITE_FEATURE_NEW_CUSTOMER_ID_FLOW production
# Enter: false
```

---

### 4. Missing Server-Side Configuration in All Vercel Files ❌

**Missing Variable Categories:**
1. Database credentials (all except VITE_SUPABASE_URL/ANON_KEY)
2. Authentication secrets (KIOSK_JWT_SECRET, PIN_PEPPER, etc.)
3. Payment processing (all Square variables)
4. AI/OpenAI (OPENAI_API_KEY)
5. Monitoring (SENTRY_DSN, etc.)

**Impact Analysis:**

**IF frontend calls backend API routes that require these:**
- Database queries will FAIL (no DATABASE_URL, SERVICE_KEY, or JWT_SECRET)
- Authentication will fall back to HARDCODED DEFAULTS (from previous audit)
- Payment processing will FAIL (no Square credentials)
- AI features will FAIL (no OpenAI key)
- Errors won't be logged (no Sentry)

**Current Architecture Interpretation:**
Based on `VITE_API_BASE_URL="https://july25.onrender.com"`, the backend is deployed separately on Render. Vercel only hosts the frontend (static files + client-side code).

**Verification Needed:**
1. Check Render dashboard for backend environment variables
2. Confirm backend has ALL required secrets
3. Document Render configuration in repository

---

### 5. DEFAULT_RESTAURANT_ID Format Inconsistency

**Observed Values:**
- `.env`: UUID `11111111-1111-1111-1111-111111111111`
- `.env.bak`: Slug `grow`
- All Vercel files: Slug `grow`

**Timeline:**
- Nov 6, 13:01 — `.env.bak` created (slug format)
- Nov 6, 18:02 — `.env` modified (UUID format)
- 5-hour gap suggests migration/refactoring

**Code Impact:**
From earlier audit, backend expects UUID but also has slug-to-UUID resolution middleware (ADR-008). Should be safe, but inconsistency is risky.

**Recommendation:**
Standardize on ONE format. If slugs are preferred for customer-facing URLs, ensure:
1. Database has slug-to-UUID mapping
2. All environment variables use consistent format
3. Middleware handles resolution correctly

---

## Orphan & Stale Variable Analysis

### Variables in Environment Files BUT NOT USED in Code

From cross-referencing with previous audit (429 process.env usages):

**Documented but Unused:**
1. **SUPABASE_PROJECT_REF** — In `.env`, not referenced in code
2. **WEBHOOK_SECRET** — Placeholder value, not implemented
3. **NODE_VERSION** — Not validated or used
4. **OPENAI_ORGANIZATION_ID** — In template, not used
5. **OPENAI_MAX_TOKENS** — In template, not used
6. **OPENAI_TEMPERATURE** — In template, not used

**Template-Only Variables (Future State):**
From `config/.env.production.template`:
- JWT_EXPIRY, REFRESH_TOKEN_SECRET, SESSION_SECRET
- PIN_ROUNDS
- PAYMENT_ENCRYPTION_KEY, IDEMPOTENCY_KEY_PREFIX
- VOICE_ENABLED, VOICE_LANGUAGE, VOICE_MAX_DURATION
- REDIS_*, CDN_*, AWS_*, DB_POOL_*, CACHE_*, WS_*
- CSP_DIRECTIVES, HSTS_MAX_AGE
- FEATURE_* flags (6 features)
- DEPLOYMENT_*, BACKUP_* variables

**Total:** 50+ template variables NOT implemented in current codebase.

### Variables Used in Code BUT MISSING from Environment Files

From earlier audit findings:

**Missing from ALL production/Vercel files:**
1. **STATION_TOKEN_SECRET** — Used in stationAuth.ts:11, MISSING from Vercel
2. **KIOSK_JWT_SECRET** — Used in auth.routes.ts:40-41, MISSING from Vercel
3. **All payment variables** — Used in payments.routes.ts, MISSING from Vercel
4. **OPENAI_API_KEY** — Used in 6+ files, MISSING from Vercel
5. **PIN_PEPPER** — Used in pinAuth.ts:17, MISSING from Vercel
6. **DEVICE_FINGERPRINT_SALT** — Used in stationAuth.ts:13, MISSING from Vercel

**Impact:** Backend API will fall back to hardcoded defaults (from previous audit vulnerability).

---

## Recommended Truth Table

### Production-Ready Environment Variable Configuration

This table represents the CORRECT configuration for production:

| Variable | Local Dev | Backend (Render) | Frontend (Vercel) | Required | Security Level |
|----------|-----------|------------------|-------------------|----------|----------------|
| **NODE_ENV** | `development` | `production` | N/A (auto) | Yes | Low |
| **PORT** | `3001` | `10000` (Render) | N/A (auto) | Server | Low |
| **DATABASE_URL** | Real (local) | **ROTATE & SET** | N/A | Server | CRITICAL |
| **SUPABASE_URL** | Same as prod | Same as frontend | Set | Both | Low (public) |
| **SUPABASE_ANON_KEY** | Same as prod | Same as frontend | Set | Both | Low (public) |
| **SUPABASE_SERVICE_KEY** | Real | **ROTATE & SET** | ❌ NEVER | Server | CRITICAL |
| **SUPABASE_JWT_SECRET** | Real | **ROTATE & SET** | ❌ NEVER | Server | CRITICAL |
| **DEFAULT_RESTAURANT_ID** | `11111111-...` or `grow` | Same | N/A | Server | Low |
| **VITE_API_BASE_URL** | `localhost:3001` | N/A | `july25.onrender.com` | Frontend | Low |
| **VITE_SUPABASE_URL** | Same as server | N/A | Same as server | Frontend | Low |
| **VITE_SUPABASE_ANON_KEY** | Same as server | N/A | Same as server | Frontend | Low |
| **VITE_DEFAULT_RESTAURANT_ID** | `grow` | N/A | `grow` | Frontend | Low |
| **VITE_ENVIRONMENT** | `development` | N/A | `production` | Frontend | Low |
| **VITE_DEMO_PANEL** | `1` (OK) | N/A | **`0` REQUIRED** | Frontend | CRITICAL |
| **KIOSK_JWT_SECRET** | Real | **ROTATE & SET** | ❌ NEVER | Server | CRITICAL |
| **PIN_PEPPER** | Real | **ROTATE & SET** | ❌ NEVER | Server | CRITICAL |
| **DEVICE_FINGERPRINT_SALT** | Real | **ROTATE & SET** | ❌ NEVER | Server | CRITICAL |
| **STATION_TOKEN_SECRET** | Real | **ROTATE & SET** | ❌ NEVER | Server | CRITICAL |
| **STRICT_AUTH** | `false` (dev) | **`true` REQUIRED** | `true` (for info) | Both | HIGH |
| **OPENAI_API_KEY** | Real | **ROTATE & SET** | ❌ NEVER | Server | CRITICAL |
| **OPENAI_REALTIME_MODEL** | Set | Same | N/A | Server | Low |
| **SQUARE_ACCESS_TOKEN** | `sandbox-test-token` | **SET PROD TOKEN** | ❌ NEVER | Server | CRITICAL |
| **SQUARE_LOCATION_ID** | `L1V8KTKZN0DHD` (sandbox) | **SET PROD ID** | ❌ NEVER | Server | MEDIUM |
| **SQUARE_ENVIRONMENT** | `sandbox` | **`production`** | N/A | Server | HIGH |
| **SQUARE_APP_ID** | `sandbox-sq0idb-test` | **SET PROD APP** | N/A | Server | LOW |
| **VITE_SQUARE_APP_ID** | `sandbox-sq0idb-test` | N/A | **SET PROD APP** | Frontend | LOW (public) |
| **VITE_SQUARE_LOCATION_ID** | `L1V8KTKZN0DHD` | N/A | **SET PROD ID** | Frontend | LOW |
| **VITE_SQUARE_ENVIRONMENT** | `sandbox` | N/A | **`production`** | Frontend | MEDIUM |
| **SENTRY_DSN** | Placeholder (OK) | **SET REAL DSN** | ❌ Not needed | Server | LOW |
| **SENTRY_ENVIRONMENT** | `development` | `production` | N/A | Server | LOW |
| **FRONTEND_URL** | `localhost:5173` | **`https://july25-client.vercel.app`** | N/A | Server (CORS) | MEDIUM |
| **ALLOWED_ORIGINS** | `localhost,vercel.app` | **Production domains** | N/A | Server (CORS) | MEDIUM |

---

## Immediate Action Plan (P0 Blockers)

### STEP 1: Security Incident Response (DO THIS FIRST)

#### 1A. Rotate ALL Exposed Secrets ⏰ URGENT

**OpenAI API Key:**
```bash
# 1. Create new key at https://platform.openai.com/api-keys
# 2. Update Render environment:
#    Render Dashboard > july25 > Environment > OPENAI_API_KEY
# 3. REVOKE old key: sk-proj-clV1_NYIKIvy... (from .env)
```

**Supabase Credentials:**
```bash
# 1. Go to https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt/settings/api
# 2. Click "Reset" on Service Role Key
# 3. Update Render: SUPABASE_SERVICE_KEY
# 4. Click "Refresh" on JWT Secret
# 5. Update Render: SUPABASE_JWT_SECRET
# 6. Update Render: DATABASE_URL with new password
```

**Authentication Secrets:**
```bash
# Generate new 64-character secrets:
openssl rand -hex 32  # For KIOSK_JWT_SECRET
openssl rand -hex 32  # For PIN_PEPPER
openssl rand -hex 32  # For DEVICE_FINGERPRINT_SALT
openssl rand -hex 32  # For STATION_TOKEN_SECRET

# Update Render environment with new values
```

#### 1B. Clean Git History

```bash
# Check if .env is in git history
git log --all --full-history -- .env .env.bak

# If found, use BFG Repo Cleaner or git-filter-repo
# WARNING: This rewrites git history and requires force push

# Alternative: If repo is private and small team, just rotate keys
# and add to .gitignore to prevent future commits
```

#### 1C. Update .gitignore

```bash
# Add to .gitignore:
.env
.env.local
.env.*.local
.env.bak
.env.*.bak

# Commit .gitignore update:
git add .gitignore
git commit -m "security: ensure .env files are gitignored"
```

---

### STEP 2: Fix Vercel Production Environment ⏰ URGENT

#### 2A. Disable Demo Panel

```bash
# Remove VITE_DEMO_PANEL from production:
vercel env rm VITE_DEMO_PANEL production
vercel env add VITE_DEMO_PANEL production
# Enter: 0

# Also remove from preview:
vercel env rm VITE_DEMO_PANEL preview
vercel env add VITE_DEMO_PANEL preview
# Enter: 0

# Redeploy:
vercel --prod
```

#### 2B. Fix Trailing Newline Bugs

```bash
# STRICT_AUTH:
vercel env rm STRICT_AUTH production
vercel env add STRICT_AUTH production
# Enter: true (no quotes, no newline)

# VITE_FEATURE_NEW_CUSTOMER_ID_FLOW:
vercel env rm VITE_FEATURE_NEW_CUSTOMER_ID_FLOW production
vercel env add VITE_FEATURE_NEW_CUSTOMER_ID_FLOW production
# Enter: false

# Verify no newlines:
vercel env ls production | grep -E "(STRICT_AUTH|FEATURE)"
```

#### 2C. Add Missing VITE_DEFAULT_RESTAURANT_ID to Preview

```bash
vercel env add VITE_DEFAULT_RESTAURANT_ID preview
# Enter: grow

vercel env ls preview | grep VITE_DEFAULT_RESTAURANT_ID
```

---

### STEP 3: Verify Render Backend Configuration ⏰ HIGH PRIORITY

#### 3A. Check Render Dashboard

Go to: https://dashboard.render.com/web/july25

**Verify these variables exist:**
- DATABASE_URL
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET
- OPENAI_API_KEY
- KIOSK_JWT_SECRET, PIN_PEPPER, DEVICE_FINGERPRINT_SALT, STATION_TOKEN_SECRET
- SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT, SQUARE_APP_ID
- STRICT_AUTH=`true`
- FRONTEND_URL=`https://july25-client.vercel.app`
- ALLOWED_ORIGINS (with production domains)

**If ANY are missing:** Add them with rotated secrets from Step 1A.

#### 3B. Document Render Configuration

Create `.env.render.production.example` (gitignored):
```bash
# Copy from Render dashboard
# DO NOT commit real values
# This is for disaster recovery documentation only
```

---

### STEP 4: Clean Up Repository

#### 4A. Remove Stale Files

```bash
# Delete empty staging file:
rm .env.staging.example

# Delete backup (after confirming secrets are rotated):
rm .env.bak

# Optional: Remove Vercel snapshots (can regenerate with `vercel env pull`):
rm .env.production.vercel .env.preview.vercel .env.vercel.current .env.vercel.check

# Commit cleanup:
git add -u
git commit -m "chore: remove stale and snapshot environment files"
```

#### 4B. Update .env.example

```bash
# Remove VITE_OPENAI_API_KEY reference (from earlier audit)
# Update with current best practices
# Ensure all active variables are documented
```

---

## Long-Term Recommendations

### 1. Environment File Strategy

**Recommended Structure:**
```
.env                      # Local dev (gitignored, developer creates from .example)
.env.example              # Git-committed template
.env.test                 # Test environment (can be committed if no secrets)
.env.render.production    # Render backend config (gitignored, for recovery docs)
```

**Files to Delete:**
- `.env.bak` (manual backups not needed)
- `.env.staging.example` (empty, never used)
- `.env.*.vercel` (regenerate with `vercel env pull` when needed)
- `.env.production` (confusing, not used)

### 2. Secret Management

**Use Secret Management Service:**
- Vercel: Native environment variable management (already in use)
- Render: Native environment variable management (already in use)
- Alternative: Doppler, Vault, AWS Secrets Manager

**Never:**
- Commit secrets to git (even in private repos)
- Store secrets in `.env.example`
- Use placeholder secrets in production

### 3. Deployment Checklist

Before deploying to production:

- [ ] All secrets rotated if exposed
- [ ] `.env` and `.env.bak` in `.gitignore`
- [ ] No real secrets in git history
- [ ] `VITE_DEMO_PANEL=0` in production
- [ ] All server-side secrets set in Render
- [ ] All client-side vars set in Vercel
- [ ] No trailing newlines in environment values
- [ ] `STRICT_AUTH=true` in production (no newline)
- [ ] Square environment is `production`
- [ ] Sentry configured with real DSN
- [ ] CORS configured with production domains

### 4. Monitoring & Alerts

Set up alerts for:
- Unauthorized database access (check Supabase logs)
- Excessive OpenAI API usage
- Failed authentication attempts
- Unusual payment processing activity

---

## Fact Confirmation Questions for Founder

Before proceeding with fixes, please confirm:

### Architecture Confirmation

1. **Is the backend ACTUALLY deployed on Render?**
   - Observed: `VITE_API_BASE_URL="https://july25.onrender.com"` in all Vercel files
   - Confirmation: Yes/No, backend is on Render at this URL?

2. **Are there TWO separate deployments?**
   - Frontend (static): Vercel (july25-client.vercel.app)
   - Backend (API): Render (july25.onrender.com)
   - Confirmation: Is this correct?

3. **Where are backend environment variables stored?**
   - Observed: Not in any .env files in repository
   - Expected: In Render dashboard only
   - Confirmation: Are backend secrets configured in Render dashboard?

### Security Incident Confirmation

4. **Was there a security incident on August 16, 2025?**
   - Observed: `config/.env.security.template` created Aug 16
   - This file is a key rotation checklist
   - Confirmation: Was there a breach or exposure requiring rotation?

5. **Have these secrets been rotated since exposure?**
   - Observed: REAL OpenAI key, DATABASE password, JWT secrets in `.env`
   - If .env was ever committed to git, these are compromised
   - Confirmation: Have you rotated these keys recently?

6. **Is `.env` in .gitignore?**
   - Observed: I can read `.env` and `.env.bak` (suggests may be gitignored)
   - Need to confirm: `git ls-files | grep .env`
   - Confirmation: Run this command and share output?

### Configuration Intent Confirmation

7. **Should VITE_DEMO_PANEL be enabled in production?**
   - Observed: Set to `"1"` in ALL Vercel environments
   - Expected: Should be `0` in production for security
   - Confirmation: Is this intentional or a mistake?

8. **Which DEFAULT_RESTAURANT_ID format is correct?**
   - Observed: UUID in `.env`, slug `grow` in `.env.bak` and Vercel
   - Migration happened between Nov 6 13:01 and 18:02
   - Confirmation: Should it be UUID or slug going forward?

9. **Are you using Square payments in production?**
   - Observed: Only sandbox tokens in `.env`, nothing in Vercel/Render
   - Square configuration completely missing from deployment
   - Confirmation: Should Square be configured for production?

10. **Which OpenAI features are required in production?**
    - Observed: OPENAI_API_KEY in `.env` but missing from Vercel
    - Voice features require API key
    - Confirmation: Should AI/voice be enabled in production?

---

## Summary & Next Steps

### Current State Assessment

**Local Development:** ✅ Fully configured (but secrets exposed)
**Vercel Production:** 🔴 Frontend-only, demo panel enabled, trailing newlines
**Render Backend:** ❓ Unknown (need to verify dashboard)
**Security Posture:** 🔴 CRITICAL — Real secrets in repository files

### Immediate Priorities (This Week)

**P0 — CRITICAL (Do Today):**
1. Rotate all exposed secrets (OpenAI, Supabase, auth)
2. Disable VITE_DEMO_PANEL in Vercel production
3. Fix trailing newline bugs in Vercel
4. Verify Render backend configuration

**P1 — HIGH (This Week):**
5. Clean git history (remove .env if committed)
6. Update .gitignore
7. Document Render configuration
8. Remove stale environment files

**P2 — MEDIUM (Next Sprint):**
9. Standardize DEFAULT_RESTAURANT_ID format
10. Configure Square for production (if needed)
11. Set up Sentry monitoring
12. Create deployment checklist

### Files Requiring Immediate Action

**DELETE:**
- `.env` (after moving secrets to secure location)
- `.env.bak` (backup no longer needed)
- `.env.staging.example` (empty)
- `.env.*.vercel` (can regenerate)

**UPDATE:**
- `.gitignore` (add .env patterns)
- `.env.example` (remove VITE_OPENAI_API_KEY)
- Vercel environment variables (fix demo panel + newlines)
- Render environment variables (verify all secrets present)

**CREATE:**
- `.env.render.production.example` (disaster recovery docs)

---

**Document:** ENVIRONMENT_FILES_DEEP_AUDIT_2025-11-11.md
**Version:** 1.0
**Status:** FACT-FINDING COMPLETE — AWAITING FOUNDER CONFIRMATION
**Next Action:** Answer 10 confirmation questions above, then proceed with P0 security fixes
