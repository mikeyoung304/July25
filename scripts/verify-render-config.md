# Render Configuration Verification Guide

**Purpose**: Step-by-step guide to verify your Render backend configuration
**Last Updated**: 2025-11-14

---

## 🔐 ACCESS RENDER DASHBOARD

### Step 1: Login to Render
1. Go to https://dashboard.render.com/
2. Login with your account credentials
3. You should see your services list

### Step 2: Select Your Service
1. Click on **"july25"** (or your backend service name)
2. You'll see the service overview page

---

## ✅ VERIFICATION CHECKLIST

### 1. SERVICE SETTINGS

#### Navigate to: Overview Tab
- [ ] **Service Name**: Verify it's your backend service (july25 or july25-server)
- [ ] **Service Type**: Should be "Web Service"
- [ ] **Region**: Note which region (e.g., Oregon USA West)
- [ ] **Status**: Should show "Live" with green indicator

#### Navigate to: Settings → General
- [ ] **Environment**: Should be "Node"
- [ ] **Build Command**: Should be `cd server && npm ci --production=false && npm run build`
- [ ] **Start Command**: Should be `cd server && npm run start`
- [ ] **Branch**: Should be `main` (for production)
- [ ] **Auto-Deploy**: Should be "Yes"

#### Navigate to: Settings → Instance
- [ ] **Plan Type**: Note current plan (Starter/Standard/Pro)
- [ ] **Memory**: Note RAM allocation
- [ ] **CPU**: Note CPU allocation
- [ ] **Number of Instances**: Note count (recommended 2+ for production)

---

### 2. ENVIRONMENT VARIABLES

#### Navigate to: Environment Tab

Click on the "Environment" tab in the left sidebar. You should see a list of environment variables.

#### CRITICAL VARIABLES (Must be present)

| Variable | Expected Value Format | Status | Notes |
|----------|----------------------|--------|-------|
| `NODE_ENV` | `production` | ☐ | Exact value |
| `PORT` | `3001` | ☐ | Exact value |
| `DEFAULT_RESTAURANT_ID` | `11111111-1111-1111-1111-111111111111` | ☐ | **MUST be UUID format** |
| `DATABASE_URL` | `postgresql://postgres.xxx:***@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true` | ☐ | Check port 6543 and pgbouncer=true |
| `SUPABASE_URL` | `https://xiwfhcikfdoshxwbtjxt.supabase.co` | ☐ | Your project URL |
| `SUPABASE_PROJECT_REF` | `xiwfhcikfdoshxwbtjxt` | ☐ | Project reference |
| `SUPABASE_ANON_KEY` | `eyJ...` (long JWT) | ☐ | Starts with eyJ |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (long JWT) | ☐ | Starts with eyJ |
| `SUPABASE_JWT_SECRET` | Base64 string (long) | ☐ | **CRITICAL for auth** |

#### AUTHENTICATION VARIABLES (Must be present)

| Variable | Expected Value Format | Status | Notes |
|----------|----------------------|--------|-------|
| `KIOSK_JWT_SECRET` | Random string (32+ chars) | ☐ | Check length >= 32 |
| `STATION_TOKEN_SECRET` | Random string (32+ chars) | ☐ | Check length >= 32 |
| `PIN_PEPPER` | Random string (32+ chars) | ☐ | Check length >= 32 |
| `DEVICE_FINGERPRINT_SALT` | Random string (32+ chars) | ☐ | Check length >= 32 |
| `STRICT_AUTH` | `true` | ☐ | **MUST be true for production** |
| `AUTH_DUAL_AUTH_ENABLE` | `true` | ☐ | Recommended |
| `AUTH_ACCEPT_KIOSK_DEMO_ALIAS` | `true` | ☐ | Recommended |

#### CORS CONFIGURATION (Must be present)

| Variable | Expected Value Format | Status | Notes |
|----------|----------------------|--------|-------|
| `FRONTEND_URL` | `https://july25-client.vercel.app` | ☐ | Your Vercel URL |
| `ALLOWED_ORIGINS` | `https://july25-client.vercel.app,https://*.vercel.app` | ☐ | **Must include wildcard for previews** |

#### SQUARE PAYMENT VARIABLES (Required for payments)

| Variable | Expected Value Format | Status | Notes |
|----------|----------------------|--------|-------|
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` | ☐ | Currently should be sandbox |
| `SQUARE_ACCESS_TOKEN` | `EAAA...` (prod) or `sandbox-...` | ☐ | Production starts with EAAA |
| `SQUARE_LOCATION_ID` | `L...` | ☐ | Your location ID |
| `SQUARE_APP_ID` | `sq0idp-...` (prod) or `sandbox-sq0idb-...` | ☐ | Check format matches environment |

#### OPENAI VARIABLES (Optional but recommended)

| Variable | Expected Value Format | Status | Notes |
|----------|----------------------|--------|-------|
| `OPENAI_API_KEY` | `sk-proj-...` | ☐ | For voice ordering |
| `OPENAI_REALTIME_MODEL` | `gpt-4o-realtime-preview-2025-06-03` | ☐ | Optional |

#### LOGGING & MONITORING (Optional)

| Variable | Expected Value Format | Status | Notes |
|----------|----------------------|--------|-------|
| `LOG_LEVEL` | `info` or `debug` | ☐ | Recommended: info |
| `LOG_FORMAT` | `json` | ☐ | For structured logging |
| `SENTRY_DSN` | `https://...@sentry.io/...` | ☐ | Optional error tracking |

---

### 3. COMMON ISSUES TO CHECK

#### Issue 1: DATABASE_URL Port
**Check for**: Port number in DATABASE_URL
```
CORRECT:   postgresql://...@host:6543/postgres?pgbouncer=true
INCORRECT: postgresql://...@host:5432/postgres
```
**Why**: Serverless environments need connection pooling (port 6543)

#### Issue 2: DEFAULT_RESTAURANT_ID Format
**Check for**: UUID vs slug format
```
CORRECT:   11111111-1111-1111-1111-111111111111
INCORRECT: grow
```
**Why**: Backend expects UUID format, frontend handles slug-to-UUID conversion

#### Issue 3: Trailing Spaces or Newlines
**Check for**: Extra whitespace in values
```
CORRECT:   true
INCORRECT: true\n  or  true  (with spaces)
```
**Why**: Can cause parsing errors and failed comparisons

#### Issue 4: Missing Wildcard in ALLOWED_ORIGINS
**Check for**: Wildcard pattern for Vercel previews
```
CORRECT:   https://july25-client.vercel.app,https://*.vercel.app
INCORRECT: https://july25-client.vercel.app
```
**Why**: Preview deployments have different URLs and will fail CORS

#### Issue 5: STRICT_AUTH Value
**Check for**: Must be exactly "true" in production
```
CORRECT:   true
INCORRECT: false  or  TRUE  or  1
```
**Why**: Multi-tenant security requires strict authentication

---

## 📸 SCREENSHOT GUIDE

### What to Screenshot for Verification

1. **Service Overview**
   - Take screenshot showing service name and "Live" status

2. **Environment Variables List**
   - Scroll through all env vars and take screenshots
   - Variables will show "Encrypted" for values - that's normal
   - We need to see the NAMES of all variables present

3. **Service Settings**
   - Screenshot of Build Command and Start Command
   - Screenshot of Instance settings (Plan, RAM, CPU)

---

## 🔍 HOW TO VERIFY VARIABLE VALUES

Since Render encrypts variable values in the dashboard, you can:

### Option 1: Use the Automated Script
Run the verification script (created separately):
```bash
npm run verify:render
```

### Option 2: Check Logs
1. Go to "Logs" tab in Render Dashboard
2. Look for startup logs that might show config validation
3. Check for any warnings about missing variables

### Option 3: Test via API
Use the health endpoint to verify configuration:
```bash
curl https://july25.onrender.com/api/v1/health
```

Expected response should include:
```json
{
  "status": "healthy",
  "version": "6.0.6",
  "database": "connected",
  "supabase": "configured",
  "environment": "production"
}
```

---

## 🚨 RED FLAGS TO WATCH FOR

### 🔴 Service Not Starting
- Check Logs tab for errors
- Common causes:
  - Missing required environment variable
  - DATABASE_URL connection failure
  - Build command failure

### 🔴 Variables Not Showing in List
If you see fewer than ~30 environment variables, you're missing some.

**Expected count**: Approximately 30-35 variables total
- ~9 Supabase/Database vars
- ~7 Auth/Security vars
- ~2 CORS vars
- ~4 Square vars
- ~2 OpenAI vars
- ~5 Logging/Feature flags
- ~3 Node/Server config

### 🔴 Build/Deploy Failures
- Check "Events" tab for recent deployments
- Look for failed deploys (red X)
- Click on failed deploy to see error logs

---

## ✅ VERIFICATION OUTPUT

After completing this checklist, fill out:

### Service Configuration
- Service Name: _______________
- Region: _______________
- Plan Type: _______________
- Number of Instances: _______________
- Auto-Deploy: ☐ Enabled ☐ Disabled

### Environment Variables Status
- Total Variables Present: _____
- CRITICAL Variables (11): ☐ All Present ☐ Missing Some
- AUTH Variables (7): ☐ All Present ☐ Missing Some
- CORS Variables (2): ☐ All Present ☐ Missing Some
- SQUARE Variables (4): ☐ All Present ☐ Missing Some
- OPENAI Variables (2): ☐ Present ☐ Not Set (Optional)

### Critical Values Verified
- ☐ `DEFAULT_RESTAURANT_ID` is UUID format
- ☐ `DATABASE_URL` uses port 6543
- ☐ `STRICT_AUTH` is set to `true`
- ☐ `ALLOWED_ORIGINS` includes wildcard for Vercel previews
- ☐ `SUPABASE_JWT_SECRET` is present

### Issues Found
List any issues discovered:
1. _______________
2. _______________
3. _______________

---

## 🔧 HOW TO FIX ISSUES

### Add Missing Variable
1. Go to Environment tab
2. Click "Add Environment Variable" button
3. Enter Key and Value
4. Click "Save Changes"
5. Render will auto-deploy with new variable

### Update Existing Variable
1. Go to Environment tab
2. Find the variable in the list
3. Click the "Edit" icon (pencil)
4. Update the value
5. Click "Save Changes"
6. Render will auto-deploy

### Delete Variable
1. Go to Environment tab
2. Find the variable in the list
3. Click the "Delete" icon (trash)
4. Confirm deletion
5. Render will auto-deploy

---

## 📝 NEXT STEPS

After verification:
1. Document any issues found in the "Issues Found" section above
2. Run the automated verification scripts (see separate script files)
3. Compare findings with `.env-audit-with-secrets.md`
4. Fix any discrepancies found
5. Re-run verification to confirm fixes

---

**Related Files**:
- `.env-audit-with-secrets.md` - Complete audit with actual values
- `scripts/verify-env-health.sh` - Automated verification script
- `scripts/verify-render-api.sh` - API-based verification script
