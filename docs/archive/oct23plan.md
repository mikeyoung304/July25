# October 23, 2025 - Critical Bug Fix & Production Launch Plan

**Status:** 🚨 CRITICAL - Production Completely Broken
**Priority:** P0 - All hands on deck
**Estimated Time:** 2-3 hours
**Last Updated:** October 23, 2025

---

## Executive Summary

### Current State
- **Production Status:** ❌ NON-FUNCTIONAL
- **Affected Systems:** Authentication, Orders, Payments, Voice AI, KDS
- **User Impact:** Cannot login, cannot place orders, cannot process payments
- **Testing Environment:** july25.onrender.com (Render) + july25.vercel.app (Vercel)

### Root Cause
**PRIMARY:** Missing `SUPABASE_JWT_SECRET` environment variable in production (Render deployment)

**Evidence:**
- Server code REQUIRES JWT_SECRET for demo auth (auth.routes.ts:44)
- Server code REQUIRES JWT_SECRET for token validation (auth.ts:52)
- Environment config makes it OPTIONAL (environment.ts:72)
- Production deployment missing this critical variable
- Local `.env` HAS JWT_SECRET → local works
- Production `.env` MISSING JWT_SECRET → production fails

**SECONDARY:** Voice AI quality degradation (dropping items from orders)

### Solution Overview
1. Add `SUPABASE_JWT_SECRET` to Render environment variables (UNBLOCKS everything)
2. Add startup validation to prevent this in future
3. Run automated Playwright tests to verify fixes
4. Address voice AI quality separately

---

## Table of Contents

1. [Root Cause Analysis](#root-cause-analysis)
2. [Supabase Deep Dive](#supabase-deep-dive)
3. [Phased Fix Plan](#phased-fix-plan)
4. [Voice AI Quality Issue](#voice-ai-quality-issue)
5. [Testing Strategy](#testing-strategy)
6. [Production Deployment Checklist](#production-deployment-checklist)
7. [Prevention Measures](#prevention-measures)
8. [Timeline](#timeline)
9. [Success Criteria](#success-criteria)

---

## Root Cause Analysis

### Primary Issue: Authentication System Complete Failure

#### Symptom Chain
1. ✅ User clicks "Login as Server" (demo login)
2. ✅ AuthContext.loginAsDemo() fires
3. ✅ POST request to `/api/v1/auth/demo-session`
4. ❌ Server checks for `SUPABASE_JWT_SECRET`
5. ❌ Environment variable missing
6. ❌ Server throws: "Server authentication not configured"
7. ❌ Client gets 500 error
8. ❌ No token returned to client
9. ❌ localStorage never gets auth_session saved
10. ❌ Subsequent API requests have no Authorization header
11. ❌ Server rejects with 401 Unauthorized
12. ❌ Error: "NO authentication available for API request"

#### User Experience
From screenshot analysis:
```
[WARN] NO authentication available for API request (no Supabase or localStorage session)
Failed to load resources: july25.onrender.com/-1/payments/create:1 (403)
Failed to load resources: july25.onrender.com/api/v1/orders:1 (401)
Demo payment error: Error: No access to this restaurant
Error submitting order: Error: Failed to submit order
Order submission failed: {"message":"Insufficient permissions","statusCode":401}
```

### Configuration Mismatch Bug

**The Bug:**
```typescript
// server/src/config/environment.ts:72
supabase: {
  ...
  ...(env.SUPABASE_JWT_SECRET ? { jwtSecret: env.SUPABASE_JWT_SECRET } : {}),
  //    ^ OPTIONAL - conditional spread operator
}

// server/src/routes/auth.routes.ts:44
const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
if (!jwtSecret) {
  logger.error('⛔ JWT_SECRET not configured - demo auth cannot proceed');
  throw new Error('Server authentication not configured');
  //    ^ REQUIRED - throws runtime error
}

// server/src/middleware/auth.ts:52
const jwtSecret = config.supabase.jwtSecret;
if (!jwtSecret) {
  logger.error('⛔ JWT_SECRET not configured - authentication cannot proceed');
  throw new Error('Server authentication not configured');
  //    ^ REQUIRED - rejects all tokens
}
```

**Why This Slipped Through:**
1. No startup validation enforces JWT_SECRET presence
2. Server starts successfully even without it
3. Failure only occurs at runtime when auth is attempted
4. Local development has JWT_SECRET in `.env`
5. Tests run locally where environment is complete
6. Production deployment process doesn't validate env vars

### Timeline of Auth Changes

**Recent Commits (Oct 16, 2025):**
- `2f6dd91`: Fixed demo auth endpoint path (/kiosk → /demo-session)
- `4cc65ae`: Bypassed restaurant access check for demo users
- `94b6ea4`: Fixed httpClient to read localStorage tokens

These fixes worked LOCALLY but didn't address production environment configuration gap.

### Why Tests Didn't Catch This

**Test Environment:**
- Uses local `.env` with JWT_SECRET configured
- Mock tokens bypass actual JWT validation
- No integration tests against production
- Smoke tests created Oct 22 but never run against prod

**Gap:** No pre-deployment validation of production environment variables

---

## Supabase Deep Dive

### Connection Configuration Audit

**Local Development (Works):**
```bash
# .env (local)
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_KEY=<service_key>
SUPABASE_JWT_SECRET=jEvdTDmyqrvlx1m/ANFZMgS4PNLnLQJci5SHfJ391ZegBE0WaHzNdD8Uia/ow7cRXQDlfyOsVxX4kyb/Vv6CYQ==
# ^ This is present and working
```

**Production Render (Broken):**
```bash
# Environment variables in Render dashboard
SUPABASE_URL=✅ Present
SUPABASE_SERVICE_KEY=✅ Present
SUPABASE_JWT_SECRET=❌ MISSING (likely)
# ^ This absence breaks everything
```

### Getting the JWT Secret

**Steps:**
1. Go to https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt
2. Click "Settings" in left sidebar
3. Click "API" section
4. Scroll to "JWT Settings"
5. Copy "JWT Secret" value (base64-encoded, ~88 characters)
6. Paste into Render environment variables

**Security Note:** JWT secret is sensitive but not as critical as service role key. It's used to VERIFY tokens, not to bypass RLS.

### Supabase Connection Verification

**Test Database Connectivity:**
```bash
# Direct PostgreSQL connection
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT 1 as connected, current_database(), current_user;"

# Expected: connected | postgres | postgres
```

**Check Migration Status:**
```bash
# Verify migrations applied
supabase migration list --linked

# Expected: All migrations marked as "Remote" and "Local"
```

**Validate JWT Secret Format:**
```bash
# Should be base64-encoded, exactly 88 characters
echo -n "$SUPABASE_JWT_SECRET" | wc -c
# Expected: 88

# Should decode to 64 bytes
echo "$SUPABASE_JWT_SECRET" | base64 -d | wc -c
# Expected: 64
```

### Supabase RLS Policies

**Current State:**
- RLS enabled on all tenant tables (orders, tables, menu_items, etc.)
- Policies filter by restaurant_id
- Service role key bypasses RLS (server-side only)
- Anon key enforces RLS (client-side)
- Demo tokens validated with JWT secret

**Verification:**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'tables', 'restaurants');

-- Expected: All rows should have rowsecurity = true
```

---

## Phased Fix Plan

### PHASE 1: Local Environment Verification (30 min)

**Objective:** Establish baseline - prove system works locally

**Steps:**

1. **Start Development Server**
   ```bash
   # Terminal 1: Start backend
   cd /Users/mikeyoung/CODING/rebuild-6.0
   npm run dev

   # Wait for: "Server listening on port 3001"
   ```

2. **Verify Environment Variables**
   ```bash
   # Check JWT_SECRET is present
   grep SUPABASE_JWT_SECRET .env

   # Expected: SUPABASE_JWT_SECRET=jEvdTDmyqrvlx1m/...
   ```

3. **Manual Testing**
   - Open browser: http://localhost:5173
   - Click "Login as Server"
   - Verify login succeeds (no 401/403 errors)
   - Create test order
   - Verify order submits successfully
   - Check console for errors

4. **Run Playwright Smoke Tests**
   ```bash
   # Run critical path tests
   npm run test:e2e:smoke

   # Expected output:
   # ✅ Authentication - Smoke Tests
   #   ✅ should login as server role successfully
   #   ✅ should persist session across page reload
   # ✅ Server Order Flow - Smoke Tests
   #   ✅ should create and submit a simple order
   # ✅ Kitchen Display System - Smoke Tests
   #   ✅ should load KDS interface successfully
   ```

5. **Document Baseline**
   - ✅ Local auth works: YES/NO
   - ✅ Local orders work: YES/NO
   - ✅ Local KDS works: YES/NO
   - ✅ Smoke tests pass: X/Y tests

**Success Criteria:**
- Dev server starts without errors
- All smoke tests pass
- Manual demo login succeeds
- Order submission succeeds
- No 401/403 errors in console

**If Phase 1 Fails:**
- STOP - Fix local environment first
- Check `.env` file exists
- Verify all required packages installed: `npm install`
- Check port 3001 not in use: `lsof -ti:3001`

---

### PHASE 2: Production Environment Fix (15 min)

**Objective:** Add missing JWT_SECRET to production, unblock authentication

**Steps:**

1. **Get JWT Secret from Supabase**
   - Navigate to: https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt
   - Settings → API → JWT Settings
   - Copy "JWT Secret" value
   - Store securely (password manager)

2. **Add to Render Environment Variables**
   ```
   Steps:
   1. Go to https://dashboard.render.com
   2. Select "july25-server" service
   3. Click "Environment" tab
   4. Click "Add Environment Variable"
   5. Key: SUPABASE_JWT_SECRET
   6. Value: <paste JWT secret from Supabase>
   7. Click "Save Changes"
   8. Service will auto-redeploy (5-7 min)
   ```

3. **Monitor Deployment**
   ```bash
   # Watch deployment logs in Render dashboard
   # Look for:
   # - "Build successful"
   # - "Server listening on port 3001"
   # - NO errors about JWT_SECRET
   ```

4. **Test Production Demo-Session Endpoint**
   ```bash
   # Test endpoint directly with curl
   curl -X POST https://july25.onrender.com/api/v1/auth/demo-session \
     -H "Content-Type: application/json" \
     -d '{
       "role": "server",
       "restaurantId": "11111111-1111-1111-1111-111111111111"
     }'

   # Expected response:
   # {
   #   "user": {
   #     "id": "demo:server:abc123",
   #     "role": "server",
   #     "scopes": ["menu:read", "orders:create", ...]
   #   },
   #   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   #   "expiresIn": 3600,
   #   "restaurantId": "11111111-1111-1111-1111-111111111111"
   # }

   # If error response, check Render logs for JWT_SECRET error
   ```

5. **Test Production Demo Login (Browser)**
   - Open: https://july25.vercel.app (or production frontend URL)
   - Click "Login as Server"
   - Open browser DevTools → Network tab
   - Look for:
     - POST request to `/api/v1/auth/demo-session` → Status 200
     - Response includes `token` field
     - Subsequent API requests include `Authorization: Bearer ...` header
     - No 401/403 errors

**Success Criteria:**
- JWT_SECRET added to Render
- Deployment completes successfully
- curl test returns valid token
- Browser demo login succeeds
- No "Server authentication not configured" errors

**If Phase 2 Fails:**
- Check JWT_SECRET value (88 chars, base64)
- Verify environment variable saved in Render
- Check deployment logs for startup errors
- Test with curl to isolate frontend vs backend
- Verify CORS headers allow frontend origin

---

### PHASE 3: Code Hardening (45 min)

**Objective:** Prevent this issue from recurring

**Task 1: Add Startup Validation (15 min)**

File: `server/src/config/environment.ts`

```typescript
// After line 46 (in validateEnvironment function):
export function validateEnvironment(): void {
  try {
    validateEnv();

    // CRITICAL: Enforce JWT_SECRET presence
    if (!env.SUPABASE_JWT_SECRET) {
      throw new Error(
        'CRITICAL: SUPABASE_JWT_SECRET is required for authentication. ' +
        'Get it from Supabase Dashboard → Settings → API → JWT Settings'
      );
    }

    // Validate JWT_SECRET format (should be base64, ~88 chars)
    if (env.SUPABASE_JWT_SECRET.length !== 88) {
      console.warn(
        '⚠️  SUPABASE_JWT_SECRET length unexpected. ' +
        `Expected 88 chars, got ${env.SUPABASE_JWT_SECRET.length}. ` +
        'Verify this is the JWT Secret, not the anon/service key.'
      );
    }

    if (env.NODE_ENV !== 'development' && !env.AI_DEGRADED_MODE && !env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in production. Set AI_DEGRADED_MODE=true to use stubs.');
    }

    // ... rest of validation
  }
}
```

**Task 2: Make JWT_SECRET Required in Config (10 min)**

File: `server/src/config/environment.ts`

```typescript
// Line 72 - Remove conditional spread:
export function getConfig(): EnvironmentConfig {
  return {
    // ... other config
    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceKey: env.SUPABASE_SERVICE_KEY,
      jwtSecret: env.SUPABASE_JWT_SECRET, // Remove conditional - always required
    },
    // ... rest of config
  };
}
```

**Task 3: Update TypeScript Interface (5 min)**

File: `server/src/config/environment.ts`

```typescript
// Line 10 - Remove optional operator:
export interface EnvironmentConfig {
  // ... other fields
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
    jwtSecret: string; // Remove '?' - no longer optional
  };
  // ... rest of interface
}
```

**Task 4: Create Deployment Validation Script (15 min)**

File: `scripts/validate-production-env.sh`

```bash
#!/bin/bash
# Validate production environment variables before deployment

set -e

echo "🔍 Validating production environment variables..."

# Check for .env file
if [ ! -f ".env" ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Load .env
source .env

# Critical variables
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_KEY"
  "SUPABASE_JWT_SECRET"
  "SUPABASE_ANON_KEY"
  "DEFAULT_RESTAURANT_ID"
  "FRONTEND_URL"
)

# Check each variable
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING+=("$var")
  fi
done

# Report results
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  for var in "${MISSING[@]}"; do
    echo "   - $var"
  done
  exit 1
else
  echo "✅ All required environment variables present"
fi

# Validate JWT_SECRET format
if [ ${#SUPABASE_JWT_SECRET} -ne 88 ]; then
  echo "⚠️  Warning: SUPABASE_JWT_SECRET length is ${#SUPABASE_JWT_SECRET}, expected 88"
  echo "   This might not be the JWT secret. Check Supabase Dashboard → API → JWT Settings"
fi

echo "✅ Environment validation complete"
```

Make executable:
```bash
chmod +x scripts/validate-production-env.sh
```

**Task 5: Update Deployment Docs (5 min)**

File: `docs/how-to/operations/DEPLOYMENT.md`

Add CRITICAL section at top:
```markdown
## 🚨 CRITICAL: Required Environment Variables

Before deploying, ensure these variables are set in production:

### Backend (Render) - CRITICAL
- `SUPABASE_JWT_SECRET` ⚠️ **REQUIRED** - Get from Supabase Dashboard → API → JWT Settings
  - Without this, ALL authentication will fail
  - 88 characters, base64-encoded
  - Test locally first: `echo $SUPABASE_JWT_SECRET | wc -c` should output 88

### Validation Before Deploy
```bash
# Run validation script
./scripts/validate-production-env.sh

# Expected: ✅ All required environment variables present
```
```

**Success Criteria:**
- Server won't start without JWT_SECRET
- TypeScript enforces non-null JWT_SECRET
- Validation script catches missing vars
- Deployment docs updated with critical warning

**Testing:**
```bash
# Test startup validation locally
unset SUPABASE_JWT_SECRET
npm run dev

# Expected: Error: "CRITICAL: SUPABASE_JWT_SECRET is required"

# Restore variable and test again
export SUPABASE_JWT_SECRET=<value>
npm run dev

# Expected: Server starts successfully
```

---

### PHASE 4: Automated Testing & Verification (30 min)

**Objective:** Prove everything works with automated tests

**Task 1: Run Local Smoke Tests (5 min)**

```bash
# Ensure dev server is running
npm run dev

# In another terminal:
npm run test:e2e:smoke

# Expected: All tests pass
```

**Task 2: Run Full E2E Test Suite (10 min)**

```bash
npm run test:e2e

# Expected results:
# ✅ Authentication
#   ✅ Demo login (server, cashier, kitchen, manager, owner)
#   ✅ Session persistence
#   ✅ Role-based navigation
# ✅ Server Order Flow
#   ✅ Create order
#   ✅ Add menu items
#   ✅ Submit order
# ✅ Kitchen Display System
#   ✅ Load KDS interface
#   ✅ Display orders
#   ✅ WebSocket connection
#   ✅ Status updates
```

**Task 3: Manual Production Testing (15 min)**

Test on production (july25.vercel.app):

1. **Authentication Flow**
   - Login as Server → ✅
   - Login as Cashier → ✅
   - Login as Kitchen → ✅
   - Session persists on reload → ✅

2. **Server Order Flow**
   - Create new order → ✅
   - Add "Classic Burger" → ✅
   - Add "French Fries" → ✅
   - Submit order → ✅
   - No 401/403 errors → ✅

3. **Voice Order Flow**
   - Start voice order → ✅
   - Say: "I'd like a burger and fries" → ✅
   - Verify items captured correctly → ⚠️ (Known issue)
   - Submit order → ✅

4. **Kitchen Display**
   - Open KDS view → ✅
   - Verify orders appear → ✅
   - WebSocket connected → ✅
   - Update order status → ✅

5. **Customer Checkout**
   - Browse menu → ✅
   - Add items to cart → ✅
   - Proceed to checkout → ✅
   - Enter payment details → ✅
   - Complete order → ✅

**Task 4: Monitor Production Logs (5 min)**

```bash
# In Render dashboard, check logs for:
# - No "Server authentication not configured" errors
# - No 401/403 errors from /api/v1/auth/demo-session
# - Successful JWT validation
# - Normal request flow

# Look for patterns like:
# ✅ demo_session_created { user_id: 'demo:server:xyz', restaurant_id: '111...' }
# ✅ auth_success { user_id: 'demo:server:xyz' }
# ❌ NO: "⛔ JWT_SECRET not configured"
```

**Success Criteria:**
- All smoke tests pass (3/3)
- Full E2E suite passes (8+ tests)
- Manual production testing succeeds (5/5 flows)
- No authentication errors in production logs
- Performance metrics acceptable (<2s for order submission)

---

## Voice AI Quality Issue

### Issue Details

**User Report (Screenshot Analysis):**
- User said: "I'd like to order two Greek salads, no dressing, one pimento cheese."
- System captured: "2x Greek Salad, No dressing"
- Missing: "one pimento cheese"

**Impact:**
- P1 severity (affects order accuracy)
- Revenue loss (items not captured)
- Customer frustration
- Server needs to manually add items

### Root Cause Hypotheses

**Hypothesis 1: Menu Context Missing**
- Voice AI doesn't have "Pimento Cheese" in active menu context
- Solution: Verify menu items passed to voice recognition

**Hypothesis 2: Acoustic Model Issue**
- "Pimento cheese" not recognized as single item
- Heard as: "pimento" + "cheese" (two separate words)
- Solution: Add to custom vocabulary

**Hypothesis 3: Prompt Engineering**
- AI prompt doesn't emphasize capturing ALL items
- Focuses on "main items" vs "additions"
- Solution: Update system prompt

**Hypothesis 4: Multiple Items Handling**
- AI struggles with lists longer than 2 items
- Pattern: "two X, no Y, one Z" → captures X and Y, drops Z
- Solution: Improve list parsing logic

### Investigation Plan

**Step 1: Check Menu Database (5 min)**
```sql
-- Verify "Pimento Cheese" exists in menu
SELECT name, category, is_active
FROM menu_items
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'
  AND LOWER(name) LIKE '%pimento%cheese%';

-- Expected: One row with is_active = true
```

**Step 2: Review Voice AI Logs (10 min)**
```bash
# Search for the specific order in logs
grep -r "Greek salad" server/logs/ | grep -i "pimento"

# Check voice transcription endpoint logs
# Look for raw transcription before item extraction
```

**Step 3: Test Voice Recognition (15 min)**
```bash
# Test various phrasings:
# 1. "Two Greek salads and one pimento cheese"
# 2. "I want two Greek salads plus a pimento cheese"
# 3. "Give me two Greek salads, also add pimento cheese"
# 4. "Two Greek salads, one pimento cheese, no dressing"

# Document which phrasings work vs fail
```

**Step 4: Review AI Prompt (10 min)**

File to check: `server/src/services/ai/voiceOrderPrompt.ts` (or similar)

Look for:
- Menu context inclusion
- Item extraction instructions
- List handling logic
- Edge case handling

**Step 5: Test with Menu Context (15 min)**

Add explicit menu context to voice prompt:
```typescript
const menuContext = `
Available menu items:
- Classic Burger ($12.99)
- Greek Salad ($8.99)
- Pimento Cheese ($4.99)
- French Fries ($3.99)
...

When customer mentions any of these items (or variations like "pimento" alone),
extract the complete menu item name from the list above.
`;
```

### Fix Strategies

**Short-term (If menu context is issue):**
1. Add "Pimento Cheese" to custom vocabulary
2. Update voice prompt with explicit menu list
3. Add post-processing to catch "pimento" → "Pimento Cheese"

**Medium-term (If list parsing is issue):**
1. Implement structured extraction (JSON schema)
2. Use function calling for item extraction
3. Add validation: "Did I miss anything?"

**Long-term (If model limitation):**
1. Fine-tune model on restaurant order data
2. Upgrade to GPT-4 or Claude 3
3. Implement multi-pass extraction

### Testing Protocol

After implementing fix:
```bash
# Test script with 10 sample orders
./tests/voice-ai-quality-test.sh

# Should achieve:
# - 100% accuracy for single items
# - 95%+ accuracy for 2-3 item orders
# - 90%+ accuracy for 4+ item orders
# - 100% accuracy for menu items in database
```

---

## Testing Strategy

### Automated Testing Architecture

**Framework:** Playwright (TypeScript)
**Location:** `/tests/e2e/`
**CI Integration:** GitHub Actions (runs on every PR)

### Test Coverage

#### Smoke Tests (Critical Path - Fast)
File: `tests/e2e/**/*.smoke.spec.ts`
Run time: 2-3 minutes
Purpose: Catch critical regressions quickly

Tests:
- `auth/login.smoke.spec.ts`
  - Demo login for server role
  - Session persistence on reload
- `orders/server-order-flow.smoke.spec.ts`
  - Create and submit simple order
  - Menu items display with prices
- `kds/kitchen-display.smoke.spec.ts`
  - KDS interface loads
  - Order cards display
  - WebSocket connection indicator

#### Full E2E Suite (Comprehensive)
File: `tests/e2e/**/*.spec.ts`
Run time: 10-15 minutes
Purpose: Complete regression coverage

Additional tests:
- `auth/login.spec.ts`
  - All roles (server, cashier, kitchen, manager, owner)
  - Role-based navigation
  - Logout functionality
  - Error handling
- `orders/order-lifecycle.spec.ts`
  - Order creation
  - Status transitions
  - Payment processing
  - Order history
- `kds/real-time-updates.spec.ts`
  - WebSocket subscriptions
  - Order status updates
  - Multi-station testing

### Running Tests

**Locally:**
```bash
# Start dev server first
npm run dev

# In another terminal:
# Smoke tests (fast)
npm run test:e2e:smoke

# Full suite
npm run test:e2e

# Specific test file
npx playwright test tests/e2e/auth/login.smoke.spec.ts

# Debug mode (opens browser)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed
```

**CI/CD:**
```yaml
# Already configured in .github/workflows/
# Runs automatically on:
# - Every push to main
# - Every pull request
# - Can be triggered manually
```

### Test Fixtures

**Location:** `tests/e2e/fixtures/`

**test-users.ts:**
```typescript
export const TEST_USERS = {
  server: { role: 'server', displayName: 'Test Server' },
  cashier: { role: 'cashier', displayName: 'Test Cashier' },
  kitchen: { role: 'kitchen', displayName: 'Test Kitchen' },
  // ...
};
```

**test-data.ts:**
```typescript
export const TEST_MENU_ITEMS = {
  burger: { name: 'Classic Burger', price: 12.99 },
  fries: { name: 'French Fries', price: 3.99 },
  // ...
};

export const TEST_ORDERS = {
  simple: {
    items: [TEST_MENU_ITEMS.burger, TEST_MENU_ITEMS.fries],
    expectedTotal: 16.98
  }
};
```

**test-helpers.ts:**
```typescript
// Reusable helper functions
export async function loginAsRole(page, role) { ... }
export async function waitForWebSocket(page) { ... }
export async function clearAppState(page) { ... }
```

### Failure Analysis

**If tests fail:**

1. **Check server is running**
   ```bash
   curl http://localhost:3001/health
   # Expected: {"status":"ok"}
   ```

2. **Check environment variables**
   ```bash
   grep SUPABASE_JWT_SECRET .env
   # Expected: SUPABASE_JWT_SECRET=<value>
   ```

3. **Check browser console**
   ```bash
   npx playwright test --headed
   # Open DevTools, check for errors
   ```

4. **Run single test with trace**
   ```bash
   npx playwright test tests/e2e/auth/login.smoke.spec.ts --trace on
   # View trace: npx playwright show-trace trace.zip
   ```

5. **Check test output**
   ```bash
   # HTML report generated automatically
   npx playwright show-report
   ```

---

## Production Deployment Checklist

### Pre-Deployment Verification

**Environment Variables:**
- [ ] `SUPABASE_URL` set in Render
- [ ] `SUPABASE_SERVICE_KEY` set in Render
- [ ] `SUPABASE_JWT_SECRET` set in Render ⚠️ CRITICAL
- [ ] `SUPABASE_ANON_KEY` set in Render
- [ ] `OPENAI_API_KEY` set in Render (or AI_DEGRADED_MODE=true)
- [ ] `DEFAULT_RESTAURANT_ID` set in Render
- [ ] `FRONTEND_URL` set correctly
- [ ] `SQUARE_ACCESS_TOKEN` set (production token)

**Code Quality:**
- [ ] All TypeScript errors resolved: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] No ESLint errors: `npm run lint`
- [ ] All tests pass: `npm run test`

**Testing:**
- [ ] Smoke tests pass locally: `npm run test:e2e:smoke`
- [ ] Full E2E suite passes: `npm run test:e2e`
- [ ] Manual testing completed (see checklist below)

**Documentation:**
- [ ] CHANGELOG.md updated with version
- [ ] Migration notes documented (if schema changes)
- [ ] Environment variable changes documented

### Deployment Steps

**Backend (Render):**
1. [ ] Push to main branch: `git push origin main`
2. [ ] Render auto-deploys (monitor in dashboard)
3. [ ] Wait for build to complete (5-10 min)
4. [ ] Check logs for startup errors
5. [ ] Verify "Server listening on port 3001"

**Frontend (Vercel):**
1. [ ] Vercel auto-deploys from main
2. [ ] Wait for deployment (2-3 min)
3. [ ] Check deployment logs
4. [ ] Verify build succeeded

### Post-Deployment Verification

**Health Checks:**
```bash
# Backend health
curl https://july25.onrender.com/health
# Expected: {"status":"ok"}

# Frontend loads
curl -I https://july25.vercel.app
# Expected: 200 OK
```

**Authentication:**
- [ ] Demo login (server) works
- [ ] Demo login (cashier) works
- [ ] Demo login (kitchen) works
- [ ] Session persists on reload
- [ ] No 401/403 errors in console

**Order Flow:**
- [ ] Create new order as server
- [ ] Add multiple menu items
- [ ] Submit order successfully
- [ ] Order appears in KDS
- [ ] Status updates work

**Voice Ordering:**
- [ ] Voice order interface loads
- [ ] Microphone permission works
- [ ] Order submission succeeds
- [ ] Items captured correctly (verify against known issue)

**Customer Checkout:**
- [ ] Browse public menu
- [ ] Add items to cart
- [ ] Proceed to checkout
- [ ] Payment form loads
- [ ] Test order completes

**Real-time Features:**
- [ ] WebSocket connects successfully
- [ ] KDS receives live order updates
- [ ] Order status changes reflect immediately
- [ ] No connection drops for 5 minutes

### Production Monitoring (First 30 Minutes)

**Watch Render Logs:**
```
Dashboard → july25-server → Logs

Look for:
✅ "Server listening on port 3001"
✅ "demo_session_created"
✅ "auth_success"
✅ Normal API request patterns

Avoid:
❌ "JWT_SECRET not configured"
❌ "Server authentication not configured"
❌ Repeated 401/403 errors
❌ Crash/restart loops
```

**Watch Vercel Logs:**
```
Dashboard → july25-client → Logs

Look for:
✅ Successful page loads
✅ API requests returning 200
✅ Normal client activity

Avoid:
❌ Failed API calls
❌ Auth errors
❌ Build errors
```

**Monitor Error Rates:**
```bash
# Check Supabase logs
# Dashboard → Logs → Database logs
# Look for unusual error spikes

# Check Sentry (if configured)
# Real-time error tracking
```

### Rollback Procedure

**If Critical Issues Found:**

1. **Immediate Rollback (Render):**
   ```
   Dashboard → july25-server → Deployments
   Click "Rollback" on previous successful deployment
   Wait 2-3 min for rollback to complete
   ```

2. **Immediate Rollback (Vercel):**
   ```
   Dashboard → july25-client → Deployments
   Click "..." → "Redeploy" on previous deployment
   Wait 1-2 min for redeployment
   ```

3. **Post-Rollback:**
   - Verify production is stable
   - Investigate issue locally
   - Fix and re-test before next deployment
   - Update deployment checklist to prevent recurrence

**Emergency Contact:**
- Check Render status: https://status.render.com
- Check Vercel status: https://www.vercel-status.com
- Check Supabase status: https://status.supabase.com

---

## Prevention Measures

### Immediate (Today)

1. **Startup Validation**
   - ✅ Add JWT_SECRET validation to `validateEnvironment()`
   - ✅ Server won't start without required vars
   - ✅ Clear error message with fix instructions

2. **Deployment Checklist**
   - ✅ Created comprehensive checklist above
   - ✅ Includes environment variable verification
   - ✅ Includes testing requirements

3. **Documentation Update**
   - ✅ DEPLOYMENT.md updated with CRITICAL section
   - ✅ Environment variable importance emphasized
   - ✅ JWT_SECRET acquisition steps documented

### Short-term (This Week)

4. **Pre-Deployment Script**
   ```bash
   # ./scripts/validate-production-env.sh
   # Run before every deployment
   # Checks all required env vars present
   # Validates format where applicable
   ```

5. **Staging Environment**
   ```
   Create Render staging service:
   - Same env vars as production
   - Deploy feature branches for testing
   - Catch env issues before production
   ```

6. **Automated Environment Parity Check**
   ```bash
   # Compare local .env vs Render env vars
   # Alert on mismatches
   # Run in CI pipeline
   ```

### Medium-term (Next Sprint)

7. **Infrastructure as Code**
   ```yaml
   # render.yaml
   services:
     - type: web
       name: july25-server
       env: node
       envVars:
         - key: SUPABASE_JWT_SECRET
           sync: false  # Manual - sensitive
         - key: NODE_ENV
           value: production
   ```

8. **Production Smoke Tests in CI**
   ```yaml
   # .github/workflows/production-smoke-tests.yml
   # Runs every hour against production
   # Alerts on failures
   # Tests critical paths without side effects
   ```

9. **Monitoring & Alerting**
   ```
   Setup Sentry:
   - Error tracking
   - Performance monitoring
   - Custom alerts for auth failures

   Setup Uptime Monitoring:
   - Ping health endpoint every 5 min
   - Alert on downtime
   - Alert on error rate spikes
   ```

### Long-term (Next Month)

10. **Environment Variable Encryption**
    ```
    Use Render's secret management:
    - Encrypt sensitive values
    - Rotate secrets regularly
    - Audit access logs
    ```

11. **Disaster Recovery Drills**
    ```
    Monthly exercises:
    - Simulate production outage
    - Practice rollback procedure
    - Test backup restoration
    - Measure recovery time
    ```

12. **Comprehensive Monitoring Dashboard**
    ```
    Grafana dashboard showing:
    - API response times
    - Error rates by endpoint
    - Authentication success/failure rates
    - Database query performance
    - WebSocket connection stability
    ```

---

## Timeline

### Total Estimated Time: 2-3 hours

**Phase 1: Local Verification** (30 min)
- Start dev server (5 min)
- Manual testing (10 min)
- Run smoke tests (10 min)
- Document baseline (5 min)

**Phase 2: Production Fix** (15 min)
- Get JWT secret (5 min)
- Add to Render (2 min)
- Wait for deployment (5 min)
- Test with curl (3 min)

**Phase 3: Code Hardening** (45 min)
- Add startup validation (15 min)
- Make JWT_SECRET required (10 min)
- Create validation script (15 min)
- Update docs (5 min)

**Phase 4: Testing** (30 min)
- Run smoke tests (5 min)
- Run full E2E suite (10 min)
- Manual production testing (15 min)

**Buffer Time** (30 min)
- Unexpected issues
- Additional testing
- Documentation updates

### Critical Path

**Blocking Dependencies:**
1. Phase 2 MUST complete before Phase 4
2. Local verification (Phase 1) should precede production fix (Phase 2)
3. Code hardening (Phase 3) can run parallel to testing (Phase 4)

**Fastest Path to Production:**
1. Phase 2 only (15 min) - Quick fix
2. Then Phase 4 (30 min) - Verification
3. Then Phase 3 (45 min) - Prevention
4. Phase 1 as needed - Troubleshooting

**Safest Path:**
1. Phase 1 (30 min) - Prove local works
2. Phase 2 (15 min) - Fix production
3. Phase 4 (30 min) - Verify fix
4. Phase 3 (45 min) - Prevent recurrence

---

## Success Criteria

### Functional Requirements

**Authentication:**
- ✅ Demo login works for all roles (server, cashier, kitchen, manager, owner)
- ✅ Session persists across page reloads
- ✅ Role-based navigation enforced
- ✅ Logout clears session properly
- ✅ No 401/403 errors for authenticated users

**Order Management:**
- ✅ Server can create orders
- ✅ Order submission succeeds
- ✅ Orders appear in KDS within 2 seconds
- ✅ Status updates propagate correctly
- ✅ Payment processing works

**Real-time Features:**
- ✅ WebSocket connects on page load
- ✅ Connection remains stable (no drops)
- ✅ Order updates received in real-time
- ✅ Multiple clients can connect simultaneously

**Voice Ordering:**
- ✅ Voice interface loads
- ✅ Microphone permission granted
- ✅ Order submission succeeds
- ⚠️ Item recognition >90% accurate (known issue, separate fix)

### Quality Requirements

**Testing:**
- ✅ All smoke tests pass (3/3 suites)
- ✅ Full E2E suite passes (>90% pass rate)
- ✅ No flaky tests in CI
- ✅ Test coverage >80% for critical paths

**Performance:**
- ✅ Page load <3 seconds
- ✅ API response time <500ms (p95)
- ✅ Order submission <2 seconds end-to-end
- ✅ WebSocket latency <100ms

**Code Quality:**
- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 errors
- ✅ Build: succeeds in <2 minutes
- ✅ No security vulnerabilities (high/critical)

### Operational Requirements

**Deployment:**
- ✅ Deployment succeeds (exit code 0)
- ✅ No rollbacks required
- ✅ Environment variables validated
- ✅ Startup logs show no errors

**Monitoring:**
- ✅ Health endpoint returns 200
- ✅ Error rate <1% (excluding known issues)
- ✅ No 5xx errors in logs
- ✅ Uptime >99.9% in first 24 hours

**Documentation:**
- ✅ CHANGELOG.md updated
- ✅ DEPLOYMENT.md includes JWT_SECRET steps
- ✅ README.md accurate
- ✅ Runbook updated with new procedures

---

## Appendix

### Related Documents

- **SUPABASE_CONNECTION_GUIDE.md** - Comprehensive Supabase connection docs
- **DEPLOYMENT.md** - Deployment procedures and environment setup
- **CHANGELOG.md** - Version history and notable changes
- **TESTING_CHECKLIST.md** - Complete testing procedures
- **RUNBOOKS.md** - Operational procedures for common incidents

### Environment Variable Reference

**Server (Render):**
```bash
# Authentication
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret_88_chars>  # ⚠️ CRITICAL
SUPABASE_ANON_KEY=<anon_key>

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://july25.vercel.app
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# AI
OPENAI_API_KEY=<openai_key>
# OR set AI_DEGRADED_MODE=true for stub implementations

# Payments
SQUARE_ACCESS_TOKEN=<production_token>
SQUARE_ENVIRONMENT=production
SQUARE_LOCATION_ID=<location_id>
SQUARE_APP_ID=<app_id>
```

**Client (Vercel):**
```bash
VITE_API_BASE_URL=https://july25.onrender.com
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_DEMO_PANEL=1
VITE_SQUARE_APPLICATION_ID=<square_app_id>
VITE_SQUARE_LOCATION_ID=<square_location_id>
```

### Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run test:e2e:smoke        # Run smoke tests
npm run test:e2e              # Run full E2E suite

# Deployment
git push origin main          # Deploy to production
./scripts/validate-production-env.sh  # Validate env vars

# Supabase
supabase migration list --linked  # Check migration status
PGPASSWORD="..." psql "..."       # Direct database query

# Monitoring
curl https://july25.onrender.com/health  # Health check
npx playwright show-report                # View test results
```

---

**Document Status:** 🟢 ACTIVE
**Owner:** Engineering Team
**Next Review:** After Phase 2 completion
**Last Updated:** October 23, 2025
