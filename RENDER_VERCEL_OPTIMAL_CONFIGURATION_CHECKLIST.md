# Render & Vercel Optimal Configuration Checklist

**Last Updated**: November 13, 2025
**Purpose**: Complete line-by-line checklist for optimal Render (backend) and Vercel (frontend) configuration

---

## 🚀 RENDER.COM CONFIGURATION (Backend)

### 1. Service Settings

#### General Tab
- [ ] **Service Name**: `july25-server` (or your preferred name)
- [ ] **Region**: Select closest to your users (e.g., Oregon USA West)
- [ ] **Branch**: `main` (production) or create separate service for staging
- [ ] **Root Directory**: `./` (monorepo root)
- [ ] **Environment**: `Node`
- [ ] **Build Command**: `cd server && npm ci --production=false && npm run build`
- [ ] **Start Command**: `cd server && npm run start`
- [ ] **Node Version**: Specify `20.x` in engines (package.json) or environment

#### Instance Settings
- [ ] **Plan**:
  - Development: `Starter ($7/month)` - 512MB RAM
  - Production: `Standard ($25/month)` - 2GB RAM (recommended)
  - High Traffic: `Pro ($85/month)` - 4GB RAM
- [ ] **Number of Instances**:
  - Development: `1`
  - Production: `2+` for high availability
- [ ] **Health Check Path**: `/api/v1/health`
- [ ] **Auto-Deploy**: `Yes` (for main branch)

#### Advanced Settings
- [ ] **Docker Command**: Leave blank (using Node.js environment)
- [ ] **Pre-Deploy Command**: Leave blank
- [ ] **Auto-scaling**:
  - Min instances: `1`
  - Max instances: `3` (adjust based on traffic)
  - Target CPU: `70%`
  - Target Memory: `70%`

### 2. Environment Variables (All Required for Production)

#### TIER 1: Core Database & Config (CRITICAL - Server won't start without these)
```bash
□ NODE_ENV=production
□ PORT=3001
□ DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111  # MUST be UUID format!
□ DATABASE_URL=postgresql://[user]:[password]@[host]:6543/postgres  # Use port 6543 for pooler!
□ SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co  # Your project URL
□ SUPABASE_ANON_KEY=eyJ...  # Your anon key
□ SUPABASE_SERVICE_KEY=eyJ...  # Your service key
□ SUPABASE_JWT_SECRET=your-jwt-secret-base64-encoded  # CRITICAL for auth
```

#### TIER 2: Authentication & Security (REQUIRED for production)
```bash
□ KIOSK_JWT_SECRET=<generate-32+-char-random-string>  # Min 32 chars
□ STATION_TOKEN_SECRET=<generate-32+-char-random-string>  # Min 32 chars
□ PIN_PEPPER=<generate-32+-char-random-string>  # Min 32 chars
□ DEVICE_FINGERPRINT_SALT=<generate-32+-char-random-string>  # Min 32 chars
□ FRONTEND_URL=https://july25-client.vercel.app  # Your Vercel URL
□ ALLOWED_ORIGINS=https://july25-client.vercel.app,https://*.vercel.app
```

#### TIER 3: Payment Processing (REQUIRED for payments)
```bash
□ SQUARE_ENVIRONMENT=production  # or 'sandbox' for testing
□ SQUARE_ACCESS_TOKEN=EAAA...  # Production tokens start with EAAA
□ SQUARE_LOCATION_ID=L...  # Your Square location
□ SQUARE_APP_ID=sq0idp-...  # Your Square app ID
□ SQUARE_WEBHOOK_SIGNATURE_KEY=...  # For webhook security
```

#### TIER 4: AI Services (Optional but recommended)
```bash
□ OPENAI_API_KEY=sk-...  # For voice ordering
□ OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
□ AI_DEGRADED_MODE=false  # Set true to disable AI features
```

#### TIER 5: Feature Flags & Settings
```bash
□ AUTH_DUAL_AUTH_ENABLE=true  # Support both auth methods
□ AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true  # Accept legacy roles
□ STRICT_AUTH=true  # CRITICAL for production multi-tenant security
□ LOG_LEVEL=info  # debug|info|warn|error
□ LOG_FORMAT=json  # For structured logging
□ CACHE_TTL_SECONDS=300
□ RATE_LIMIT_WINDOW_MS=60000
□ RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Custom Domains
- [ ] **Domain**: Add your custom domain if needed
- [ ] **SSL Certificate**: Auto-provisioned by Render
- [ ] **Force HTTPS**: Always enabled

### 4. Deploy Hooks
- [ ] **Deploy Hook URL**: Save for GitHub Actions integration
- [ ] **Auto Deploy**: Enable for main branch
- [ ] **PR Previews**: Consider enabling for staging

### 5. Monitoring & Alerts
- [ ] **Enable Metrics**: CPU, Memory, Response Time
- [ ] **Set Up Alerts**:
  - Memory > 80%
  - CPU > 80%
  - Response time > 2s
  - Error rate > 1%
- [ ] **Log Streams**: Configure (Datadog, LogDNA, etc.)

---

## 🎨 VERCEL CONFIGURATION (Frontend)

### 1. Project Settings

#### General Tab
- [ ] **Project Name**: `july25-client`
- [ ] **Framework Preset**: `Vite`
- [ ] **Root Directory**: `./` (monorepo root)
- [ ] **Build & Development Settings**:
  - Build Command: `ROLLUP_NO_NATIVE=1 npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client`
  - Output Directory: `client/dist`
  - Install Command: `npm ci --workspaces --include-workspace-root`
  - Development Command: Default

#### Node.js Version
- [ ] **Node Version**: `20.x` (match Render backend)

### 2. Environment Variables

#### Production Environment
```bash
# Core API Configuration
□ VITE_API_BASE_URL=https://july25.onrender.com
□ VITE_ENVIRONMENT=production

# Supabase Configuration
□ VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
□ VITE_SUPABASE_ANON_KEY=eyJ...  # Your anon key

# Restaurant Configuration
□ VITE_DEFAULT_RESTAURANT_ID=grow  # Frontend uses slug (backend converts to UUID)

# Square Payment UI
□ VITE_SQUARE_APP_ID=sq0idp-...  # Must match backend
□ VITE_SQUARE_LOCATION_ID=L...  # Must match backend
□ VITE_SQUARE_ENVIRONMENT=production  # Must match backend

# Feature Flags
□ VITE_USE_MOCK_DATA=false
□ VITE_USE_REALTIME_VOICE=true
□ VITE_ENABLE_PERF=false
□ VITE_DEBUG_VOICE=false
□ VITE_DEMO_PANEL=0  # CRITICAL: Must be 0 in production!

# Voice/AI Features
□ VITE_OPENAI_API_KEY=sk-...  # For client-side voice WebRTC
□ VITE_OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03

# New Customer ID Flow
□ VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=false
```

#### Preview Environment (for PR deployments)
```bash
# Same as production but with:
□ VITE_API_BASE_URL=https://july25.onrender.com  # Or staging backend if available
□ VITE_ENVIRONMENT=preview
□ VITE_SQUARE_ENVIRONMENT=sandbox  # Use sandbox for preview
□ VITE_DEMO_PANEL=1  # Can enable for preview demos
```

### 3. Domains & Git

#### Domains Tab
- [ ] **Production Domain**: Your custom domain (e.g., `app.yourdomain.com`)
- [ ] **Preview Domains**: Automatic for each PR
- [ ] **Domain Aliases**: Add www if needed
- [ ] **SSL Certificates**: Auto-provisioned

#### Git Integration
- [ ] **Connected Repository**: `yourorg/yourrepo`
- [ ] **Production Branch**: `main`
- [ ] **Preview Branches**: All branches (or specific pattern)
- [ ] **Ignored Build Step**: Add if needed for docs-only changes

### 4. Functions (if using Vercel Functions)
- [ ] **Functions Region**: Match Render region
- [ ] **Max Duration**: 10s (default) or upgrade for longer

### 5. Security Headers (already in vercel.json)
✅ Already configured in vercel.json:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: microphone=(self)

### 6. Performance

#### Speed Insights
- [ ] **Enable Speed Insights**: Yes (free tier available)
- [ ] **Web Analytics**: Enable for traffic monitoring

#### Build & Output
- [ ] **Build Cache**: Enabled by default
- [ ] **Image Optimization**: Enabled
- [ ] **Edge Network**: All regions (default)

### 7. Integrations
- [ ] **GitHub**: Already connected
- [ ] **Monitoring**: Consider adding (Sentry, LogRocket)
- [ ] **Analytics**: Consider adding (Google Analytics, Mixpanel)

---

## 🔍 VERIFICATION CHECKLIST

### After Render Deployment
```bash
# 1. Health Check
□ curl https://july25.onrender.com/api/v1/health
   Expected: {"status":"healthy","version":"6.0.6",...}

# 2. Auth Test
□ curl -X POST https://july25.onrender.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"server@restaurant.com","password":"Demo123!","restaurantId":"11111111-1111-1111-1111-111111111111"}'
   Expected: JWT token with scope field

# 3. Restaurant Slug Resolution
□ curl https://july25.onrender.com/api/v1/restaurants/grow
   Expected: Restaurant data

# 4. Menu API
□ curl https://july25.onrender.com/api/v1/menu -H "x-restaurant-id: grow"
   Expected: Menu items array
```

### After Vercel Deployment
```bash
# 1. Site Loads
□ Open https://july25-client.vercel.app
   Expected: Login page appears

# 2. Demo Login Works
□ Click Server workspace
□ Login with server@restaurant.com / Demo123!
   Expected: Successful login to dashboard

# 3. API Connection
□ Open browser DevTools Network tab
□ Check API calls go to correct backend
   Expected: Requests to https://july25.onrender.com/api/v1/*

# 4. Payment UI Loads
□ Navigate to payment screen
□ Check Square payment form loads
   Expected: Payment form appears (sandbox or production based on env)
```

---

## ⚠️ CRITICAL WARNINGS

### Security Checklist
- [ ] ❗ **NEVER** set `VITE_DEMO_PANEL=1` in production
- [ ] ❗ **NEVER** commit real API keys to git
- [ ] ❗ **NEVER** use sandbox Square credentials in production
- [ ] ❗ **ALWAYS** use UUID format for DEFAULT_RESTAURANT_ID in Render
- [ ] ❗ **ALWAYS** use port 6543 (pooler) not 5432 for DATABASE_URL in serverless

### Multi-Environment Setup (Recommended)
```
Production:
├── Render: july25-server (main branch)
├── Vercel: july25-client (main branch)
└── Database: Supabase Production

Staging:
├── Render: july25-server-staging (staging branch)
├── Vercel: july25-client preview (PR branches)
└── Database: Supabase Staging (separate project)
```

### Common Issues & Solutions

1. **"Restaurant ID Required" Error**
   - Ensure DEFAULT_RESTAURANT_ID is UUID format in Render
   - Frontend can use slug, backend needs UUID

2. **"No access to this restaurant" Error**
   - Check user_restaurants table has entries
   - Verify restaurant_id matches

3. **CORS Errors**
   - Add Vercel URL to ALLOWED_ORIGINS in Render
   - Include wildcards for preview deployments

4. **Payment Failures**
   - Verify SQUARE_ENVIRONMENT matches between Render and Vercel
   - Check token format (EAAA for production)

5. **Auth Token Missing Scope**
   - Verify SUPABASE_JWT_SECRET is set correctly
   - Check role_scopes table has entries

---

## 📋 QUICK REFERENCE

### Render Environment (All Required)
```bash
# Copy this block for Render
NODE_ENV=production
PORT=3001
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
DATABASE_URL=postgresql://...@.../postgres?pgbouncer=true&connection_limit=1
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
KIOSK_JWT_SECRET=<random-32-chars>
STATION_TOKEN_SECRET=<random-32-chars>
PIN_PEPPER=<random-32-chars>
DEVICE_FINGERPRINT_SALT=<random-32-chars>
FRONTEND_URL=https://july25-client.vercel.app
ALLOWED_ORIGINS=https://july25-client.vercel.app,https://*.vercel.app
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=EAAA...
SQUARE_LOCATION_ID=L...
SQUARE_APP_ID=sq0idp-...
OPENAI_API_KEY=sk-...
AUTH_DUAL_AUTH_ENABLE=true
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true
STRICT_AUTH=true
LOG_LEVEL=info
```

### Vercel Environment (All Required)
```bash
# Copy this block for Vercel
VITE_API_BASE_URL=https://july25.onrender.com
VITE_ENVIRONMENT=production
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_DEFAULT_RESTAURANT_ID=grow
VITE_SQUARE_APP_ID=sq0idp-...
VITE_SQUARE_LOCATION_ID=L...
VITE_SQUARE_ENVIRONMENT=production
VITE_USE_MOCK_DATA=false
VITE_USE_REALTIME_VOICE=true
VITE_DEMO_PANEL=0
VITE_OPENAI_API_KEY=sk-...
```

---

## ✅ FINAL CHECKLIST

Before going live:
- [ ] All Render environment variables set
- [ ] All Vercel environment variables set
- [ ] Health check passing
- [ ] Demo users can login
- [ ] Payment form loads (correct environment)
- [ ] No sensitive data in logs
- [ ] Monitoring/alerts configured
- [ ] Custom domains configured (optional)
- [ ] Backup/recovery plan in place

---

**Document Version**: 1.0
**Last Review Date**: November 13, 2025
**Next Review Date**: December 13, 2025