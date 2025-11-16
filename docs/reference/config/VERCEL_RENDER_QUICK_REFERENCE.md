# Vercel & Render Environment Variable Quick Reference

**Last Updated**: 2025-11-14
**Purpose**: Public-safe quick reference for environment variable configuration
**For detailed audit with actual values**: See `.env-audit-with-secrets.md` (git-ignored)

---

## 📋 OVERVIEW

This guide provides a quick reference for configuring environment variables across:
- **Vercel** (Frontend/Client) - React/Vite application
- **Render** (Backend/Server) - Node.js Express API

### Key Principles
1. **Client variables** MUST have `VITE_` prefix (exposed to browser)
2. **Server variables** MUST NOT be in Vercel (security risk)
3. **Shared values** (like Supabase URL) need to be set in BOTH platforms with appropriate prefixes

---

## 🎨 VERCEL CONFIGURATION (Frontend)

### Required Environment Variables

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `VITE_API_BASE_URL` | `https://july25.onrender.com` | Points to Render backend |
| `VITE_SUPABASE_URL` | `https://[project-ref].supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Public anon key (safe to expose) |
| `VITE_DEFAULT_RESTAURANT_ID` | `grow` | Frontend uses slug format |
| `VITE_ENVIRONMENT` | `production` | Environment indicator |
| `VITE_DEMO_PANEL` | `0` | **MUST be 0 in production!** |

### Optional Variables

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `VITE_SQUARE_APP_ID` | `sq0idp-...` | For payment UI (production) or `sandbox-sq0idb-...` (sandbox) |
| `VITE_SQUARE_LOCATION_ID` | `L1V8...` | Your Square location |
| `VITE_SQUARE_ENVIRONMENT` | `production` or `sandbox` | Must match backend |
| `VITE_OPENAI_API_KEY` | `sk-proj-...` | For client-side voice WebRTC |
| `VITE_USE_MOCK_DATA` | `false` | Feature flag |
| `VITE_USE_REALTIME_VOICE` | `true` | Enable voice features |
| `VITE_FEATURE_NEW_CUSTOMER_ID_FLOW` | `false` | Feature flag |
| `STRICT_AUTH` | `true` | Build-time flag for strict auth mode |

### How to Set

```bash
# Via Vercel Dashboard
# 1. Go to Vercel Dashboard → your-project → Settings → Environment Variables
# 2. Add each variable for "Production" environment
# 3. Redeploy to apply changes

# Via Vercel CLI
vercel env add VITE_DEMO_PANEL production
# Enter value: 0
```

---

## 🚀 RENDER CONFIGURATION (Backend)

### Critical Variables (Server won't start without these)

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3001` | Backend port |
| `DEFAULT_RESTAURANT_ID` | `11111111-1111-1111-1111-111111111111` | **MUST be UUID format!** |
| `DATABASE_URL` | `postgresql://user:pass@host:6543/db?pgbouncer=true` | **Use port 6543 for pooler!** |
| `SUPABASE_URL` | `https://[project-ref].supabase.co` | Your Supabase project |
| `SUPABASE_ANON_KEY` | `eyJ...` | Public anon key |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | **SECRET - server only!** |
| `SUPABASE_JWT_SECRET` | `[base64-string]` | **CRITICAL for auth** |

### Authentication & Security

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `KIOSK_JWT_SECRET` | `[random-32+-chars]` | For kiosk auth |
| `STATION_TOKEN_SECRET` | `[random-32+-chars]` | For station auth |
| `PIN_PEPPER` | `[random-32+-chars]` | For PIN hashing |
| `DEVICE_FINGERPRINT_SALT` | `[random-32+-chars]` | For device binding |
| `FRONTEND_URL` | `https://july25-client.vercel.app` | For CORS |
| `ALLOWED_ORIGINS` | `https://july25-client.vercel.app,https://*.vercel.app` | CORS whitelist |
| `STRICT_AUTH` | `true` | **REQUIRED for production!** Multi-tenant security |
| `AUTH_DUAL_AUTH_ENABLE` | `true` | Support both auth methods |
| `AUTH_ACCEPT_KIOSK_DEMO_ALIAS` | `true` | Accept legacy roles |

### Payment Processing (Square)

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `SQUARE_ENVIRONMENT` | `production` or `sandbox` | Payment environment |
| `SQUARE_ACCESS_TOKEN` | `EAAA...` | **Production starts with EAAA** |
| `SQUARE_LOCATION_ID` | `L1V8...` | Your Square location |
| `SQUARE_APP_ID` | `sq0idp-...` | Production format |

### AI Services (Optional)

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `OPENAI_API_KEY` | `sk-proj-...` | For voice ordering backend |
| `OPENAI_REALTIME_MODEL` | `gpt-4o-realtime-preview-2025-06-03` | Voice model |

### How to Set

```bash
# Via Render Dashboard
# 1. Go to Render Dashboard → your-service → Environment
# 2. Add each variable as Key-Value pair
# 3. Save changes (triggers auto-deploy)

# Via Render CLI (if available)
render env set NODE_ENV=production
```

---

## 🚨 CRITICAL WARNINGS

### 1. VITE_DEMO_PANEL Security
```bash
# ❌ NEVER in production
VITE_DEMO_PANEL=1

# ✅ Always in production
VITE_DEMO_PANEL=0
```
**Why**: Value of `1` exposes demo credentials on production login page

---

### 2. DEFAULT_RESTAURANT_ID Format
```bash
# Backend (Render) - MUST be UUID
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111  # ✅ Correct

# Frontend (Vercel) - Can be slug
VITE_DEFAULT_RESTAURANT_ID=grow  # ✅ Correct

# ❌ WRONG - Don't use slug in Render
DEFAULT_RESTAURANT_ID=grow  # Backend expects UUID!
```

---

### 3. Database Connection Port
```bash
# ✅ Correct for serverless (Render)
DATABASE_URL=postgresql://...@host:6543/db?pgbouncer=true&connection_limit=1
#                                    ^^^^ Port 6543 with pooler

# ❌ Wrong for serverless
DATABASE_URL=postgresql://...@host:5432/db  # Direct connection, no pooling
```

---

### 4. Newline Contamination
```bash
# ❌ WRONG - literal \n in value
VITE_DEFAULT_RESTAURANT_ID="grow\n"

# ✅ CORRECT
VITE_DEFAULT_RESTAURANT_ID="grow"
```
**Check for this**: `vercel env pull .env.check && cat .env.check | grep '\\n'`

---

### 5. CORS Configuration
```bash
# ❌ Missing preview deployments
ALLOWED_ORIGINS=https://july25-client.vercel.app

# ✅ Includes preview URLs
ALLOWED_ORIGINS=https://july25-client.vercel.app,https://*.vercel.app,https://*-mikeyoung304-gmailcoms-projects.vercel.app
```

---

## ✅ VERIFICATION CHECKLIST

### After Vercel Deployment
```bash
# 1. Pull env and check for issues
vercel env pull .env.vercel.check
cat .env.vercel.check | grep '\\n'  # Should return nothing

# 2. Check site loads
curl -I https://july25-client.vercel.app
# Expected: HTTP 200

# 3. Verify API calls go to correct backend
# Open DevTools → Network tab → Check API requests
# Expected: https://july25.onrender.com/api/v1/*
```

### After Render Deployment
```bash
# 1. Health check
curl https://july25.onrender.com/api/v1/health
# Expected: {"status":"healthy","version":"6.0.6",...}

# 2. Restaurant slug resolution
curl https://july25.onrender.com/api/v1/restaurants/grow
# Expected: Restaurant data with UUID

# 3. Auth test
curl -X POST https://july25.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"server@restaurant.com","password":"Demo123!","restaurantId":"11111111-1111-1111-1111-111111111111"}'
# Expected: JWT token with scope field

# 4. CORS test
curl -I -X OPTIONS https://july25.onrender.com/api/v1/menu \
  -H "Origin: https://july25-client.vercel.app"
# Expected: Access-Control-Allow-Origin header present
```

---

## 📊 PLATFORM COMPARISON

| Concern | Vercel (Frontend) | Render (Backend) |
|---------|-------------------|------------------|
| **Variables Prefix** | `VITE_` required for client access | No prefix needed |
| **Secrets Safety** | Only public/client-safe values | Can store sensitive secrets |
| **Build Process** | Vite injects `VITE_*` at build time | Runtime environment variables |
| **Environment Count** | Production, Preview, Development | Per-service (typically just Production) |
| **Deployment Trigger** | Git push to branch | Git push OR manual deploy |
| **Auto-Deploy** | Yes (per branch config) | Yes (per service config) |
| **Preview Deploys** | Automatic for PRs | Manual or separate service |

---

## 🔗 RELATED DOCUMENTATION

- **`.env-audit-with-secrets.md`** - Complete audit with actual values (git-ignored)
- **`RENDER_VERCEL_OPTIMAL_CONFIGURATION_CHECKLIST.md`** - Comprehensive deployment checklist
- **`docs/reference/config/ENVIRONMENT.md`** - Variable reference documentation
- **`docs/learning-path/04_ENVIRONMENT_SETUP.md`** - Developer setup guide
- **`.env.example`** - Template for local development

---

## 🎯 COMMON ISSUES & SOLUTIONS

### Issue: "Restaurant ID Required" Error
**Cause**: DEFAULT_RESTAURANT_ID not UUID format in Render
**Solution**: Use UUID format `11111111-1111-1111-1111-111111111111` in Render

---

### Issue: CORS Errors on Preview Deployments
**Cause**: Vercel preview URLs not in ALLOWED_ORIGINS
**Solution**: Add wildcard `https://*.vercel.app` to Render ALLOWED_ORIGINS

---

### Issue: Payment Form Not Loading
**Cause**: VITE_SQUARE_* variables missing in Vercel
**Solution**: Add VITE_SQUARE_APP_ID, VITE_SQUARE_LOCATION_ID, VITE_SQUARE_ENVIRONMENT to Vercel

---

### Issue: "Blank login page" or Vite errors
**Cause**: Missing VITE_ prefix on client variables
**Solution**: Ensure all client-side vars have VITE_ prefix in Vercel

---

### Issue: Database Connection Failures
**Cause**: Wrong port or missing pooler settings
**Solution**: Use port 6543 with `?pgbouncer=true&connection_limit=1` in DATABASE_URL

---

### Issue: Auth tokens missing scope field
**Cause**: SUPABASE_JWT_SECRET not set in Render
**Solution**: Add SUPABASE_JWT_SECRET (from Supabase Dashboard → Settings → API)

---

## 📝 MAINTENANCE

### When to Update This Guide
- After adding new environment variables
- After changing deployment platforms
- After major architecture changes
- Monthly audit (recommended)

### How to Audit Current State
```bash
# 1. Compare local vs Vercel
vercel env pull .env.vercel.current
diff .env .env.vercel.current

# 2. Check Render via Dashboard
# Go to Render Dashboard → Service → Environment tab
# Compare against this guide

# 3. Run automated checks
npm run env:check  # If available
```

---

**Document Version**: 1.0
**Last Review Date**: 2025-11-14
**Next Review Date**: 2025-12-14
