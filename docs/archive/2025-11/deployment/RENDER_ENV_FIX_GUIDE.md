# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Deployment Documentation

---

# Render Environment Variables Fix Guide
**Issue**: Server won't start due to missing/invalid environment variables
**Root Cause**: DEFAULT_RESTAURANT_ID changed from UUID to slug "grow"

---

## 🚨 Critical Issue

The Render deployment is failing with:
```
DEFAULT_RESTAURANT_ID must be a valid UUID format
SQUARE_APP_ID is required for payment processing
```

**Why**: The startup validation (added in commit `dbc009d5`) requires UUID format, but Render has slug `"grow"` instead.

---

## ✅ Solution: Update Render Environment Variables

### Step 1: Access Render Dashboard

1. Go to https://dashboard.render.com
2. Find and click on **july25-server** service
3. Go to **Environment** tab

### Step 2: Update DEFAULT_RESTAURANT_ID

**Current Value** (likely): `grow`
**Required Value**: `11111111-1111-1111-1111-111111111111`

**Action**:
```
Key: DEFAULT_RESTAURANT_ID
Value: 11111111-1111-1111-1111-111111111111
```

**Why UUID?**: The startup validation (`env.ts:118-123`) requires UUID format. The slug resolver middleware only works for HTTP requests, but validation happens at startup before any requests.

### Step 3: Add SQUARE_APP_ID

This variable is required in production for payment processing.

**Action**:
```
Key: SQUARE_APP_ID
Value: <your Square application ID>
```

**How to find it**:
1. Go to https://developer.squareup.com/apps
2. Select your application
3. Copy the **Application ID** (starts with `sq0idp-` or similar)

**If you don't have it**: You can temporarily set to a placeholder to get the server running:
```
SQUARE_APP_ID: sandbox-placeholder-app-id
```
(Payments won't work, but server will start)

### Step 4: Save and Redeploy

1. Click **Save Changes** in Render dashboard
2. Render will automatically trigger a new deployment
3. Monitor the **Logs** tab for startup success

---

## 🔍 Why This Happened

### Timeline of Events

1. **Previous State**: Render had `DEFAULT_RESTAURANT_ID="11111111-1111-1111-1111-111111111111"`
2. **Slug Migration**: Changed to `DEFAULT_RESTAURANT_ID="grow"` for easier configuration
3. **Commit dbc009d5 (P0.7)**: Added strict UUID validation at startup
4. **Today's Deploy**: Validation fails because "grow" is not a UUID

### Design Limitation

The current architecture has a mismatch:
- **Slug Resolver Middleware** (`server.ts:177`): Resolves slugs → UUIDs for HTTP requests
- **Startup Validation** (`env.ts:118-123`): Runs BEFORE middleware, requires UUID

**Slugs work fine in requests** (headers, query params) because middleware handles them.
**Slugs DON'T work in env vars** because validation happens at server startup.

---

## 🎯 Long-Term Solutions

### Option 1: Keep UUID in Env Vars (Recommended)
- Use UUID in `DEFAULT_RESTAURANT_ID` env var
- Slugs work everywhere else via middleware
- Simple, no code changes needed

### Option 2: Enhance Validation to Accept Slugs
Modify `env.ts` to:
1. Accept slugs in DEFAULT_RESTAURANT_ID
2. Query database at startup to resolve slug → UUID
3. Store resolved UUID in config

**Pros**: More flexible
**Cons**: Adds database dependency at startup, more complex

### Option 3: Make DEFAULT_RESTAURANT_ID Optional
Remove UUID validation if slug resolver can handle all cases.

**Pros**: Most flexible
**Cons**: Loses fail-fast benefits, harder to debug misconfigurations

---

## 📋 Required Environment Variables Summary

### TIER 1: Always Required
```bash
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=base64-encoded-secret
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111  # ⚠️ MUST BE UUID
```

### TIER 2: Production Required
```bash
# Payments
SQUARE_ACCESS_TOKEN=EAAA...  # Production token
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=production
SQUARE_APP_ID=sq0idp-...  # ⚠️ MISSING IN RENDER

# Auth Secrets
KIOSK_JWT_SECRET=<32+ char secret>
STATION_TOKEN_SECRET=<32+ char secret>
PIN_PEPPER=<32+ char secret>
DEVICE_FINGERPRINT_SALT=<32+ char secret>

# Frontend
FRONTEND_URL=https://july25-client.vercel.app
```

### TIER 3: Optional
```bash
OPENAI_API_KEY=sk-...  # Or set AI_DEGRADED_MODE=true
```

---

## 🧪 Verification After Fix

Once environment variables are updated and deployment completes:

### Test 1: Server Starts Successfully
```bash
curl -s "https://july25-server.onrender.com/api/v1/health" | jq .
```
**Expected**: JSON health response (not 404)

### Test 2: Auth Fix Works
```bash
# Login
TOKEN=$(curl -s -X POST "https://july25-server.onrender.com/api/v1/auth/pin-login" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","restaurantId":"11111111-1111-1111-1111-111111111111"}' \
  | jq -r '.token')

# Decode JWT
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```
**Expected**: JWT contains `"scope": ["orders:create", ...]`

### Test 3: Order Submission Works
```bash
curl -X POST "https://july25-server.onrender.com/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -d '{"items":[{"menu_item_id":"test","quantity":1,"unit_price":1200}],"table_number":"1","seat_number":1,"order_type":"dine_in"}' | jq .
```
**Expected**: 201 Created (not 401 Unauthorized)

---

## 🚨 Quick Fix Checklist

- [ ] Update `DEFAULT_RESTAURANT_ID` to UUID in Render
- [ ] Add `SQUARE_APP_ID` to Render environment
- [ ] Save changes (triggers auto-deploy)
- [ ] Wait 3-5 minutes for deployment
- [ ] Test server health endpoint
- [ ] Test JWT contains scopes
- [ ] Test order submission works

---

## 📞 If Still Failing

1. **Check Render Logs**: Look for new validation errors
2. **Verify All TIER 1 vars**: Ensure all required vars are set
3. **Check UUID Format**: Ensure DEFAULT_RESTAURANT_ID matches pattern
4. **Review .env.example**: Compare against local working environment

---

**Created**: 2025-11-12 15:15 UTC
**Issue**: Environment validation failure (not related to auth fix code)
**Status**: 🔴 RENDER ENV VARS NEED UPDATE
