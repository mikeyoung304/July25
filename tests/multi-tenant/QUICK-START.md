# 24-Hour Multi-Tenant Test - Quick Start Guide

**Goal**: Verify voice ordering system is safe for multi-tenant production deployment

**What you're testing**: The 4 P0 fixes we just implemented

**Time required**: 24 hours automated + 1 hour setup/review

---

## Prerequisites

1. ✅ All 4 P0 fixes committed (you just did this!)
2. ✅ Staging environment with remote Supabase
3. ✅ Two test restaurants in database
4. ✅ `SUPABASE_SERVICE_KEY` in your `.env` file

---

## Step 1: Verify Test Restaurants Exist (5 minutes)

```bash
# Check if test restaurants are in database
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  -h aws-0-us-east-1.pooler.supabase.com \
  -p 6543 -d postgres -U postgres.kpyydxuvhwltoxnwpjdn \
  -c "SELECT id, name FROM restaurants WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');"
```

**Expected output**:
```
                  id                  |        name
--------------------------------------+--------------------
 11111111-1111-1111-1111-111111111111 | Test Restaurant A
 22222222-2222-2222-2222-222222222222 | Test Restaurant B
```

**If restaurants don't exist**: Run `npm run db:seed` to create them

---

## Step 2: Start Monitoring Script (2 minutes)

```bash
# Make script executable
chmod +x tests/multi-tenant/monitor-24h.js

# Start monitoring (runs for 24 hours)
node tests/multi-tenant/monitor-24h.js
```

**What it does**:
- Checks every 30 minutes for cross-restaurant contamination
- Logs all checks to `tests/multi-tenant/24h-monitoring-log.txt`
- Generates final report after 24 hours

**You'll see output like**:
```
[2025-11-21T...] INFO: === Starting 24-Hour Multi-Tenant Monitoring ===
[2025-11-21T...] INFO: Restaurant A: 11111111-1111-1111-1111-111111111111
[2025-11-21T...] INFO: Restaurant B: 22222222-2222-2222-2222-222222222222
[2025-11-21T...] SUCCESS: Order isolation check passed { ordersA: 5, ordersB: 3, growOrders: 0 }
```

---

## Step 3: Create Test Orders (Manual or Automated)

### Option A: Manual Testing (Recommended for First Run)

Open two browser windows side-by-side:

**Window 1: Restaurant A**
1. Go to `http://localhost:5173`
2. Login as `manager-a@test.com` / `Demo123!`
3. Go to Server view
4. Create voice orders every 15 minutes

**Window 2: Restaurant B**
1. Go to `http://localhost:5173` (incognito mode)
2. Login as `manager-b@test.com` / `Demo123!`
3. Go to Server view
4. Create voice orders every 15 minutes

### Option B: Automated Load (Advanced)

```bash
# Install dependencies
npm install --save-dev @playwright/test

# Run automated test (creates orders continuously)
npx playwright test tests/multi-tenant/24h-isolation.spec.ts --headed
```

---

## Step 4: Manual Checks (Every 4 Hours)

### Check 1: Memory Monitoring
1. Open Chrome DevTools (F12)
2. Go to Memory tab
3. Take heap snapshot
4. Check total heap size: should be < 150MB

### Check 2: Console Errors
1. Open Console tab
2. Look for errors (especially `[VoiceSessionConfig] Token refresh failed`)
3. Verify toast notification appears if token fails

### Check 3: KDS Isolation
1. Open Restaurant A KDS: `http://localhost:5173/kitchen`
2. Verify you only see Restaurant A orders
3. Open Restaurant B KDS (different browser/incognito)
4. Verify you only see Restaurant B orders

---

## Step 5: Review Results (After 24 Hours)

```bash
# Monitoring script will auto-generate report
cat tests/multi-tenant/24h-test-results.md
```

**Look for**:
```markdown
## Summary

- **Total Checks**: 48
- **Passed**: 48 (100%)
- **Failed**: 0
- **Overall**: ✅ PASSED

## Deployment Recommendation

✅ **SAFE TO DEPLOY**: All order isolation checks passed.
```

---

## Success Criteria (Must Pass All)

| Criteria | Target | Check |
|----------|--------|-------|
| Cross-restaurant contamination | 0 orders | Automated |
| Orders with 'grow' fallback | 0 orders | Automated |
| Memory leak | < 150MB heap | Manual |
| Cart race condition | 0 successful exploits | Manual |
| Token failure toasts | 100% shown | Manual |

---

## If Test FAILS

**STOP** - Do not deploy to production

**Debug Steps**:
1. Check `tests/multi-tenant/24h-monitoring-log.txt` for errors
2. Check `tests/multi-tenant/24h-test-results.json` for failure details
3. Review browser console logs
4. Take database snapshot for analysis

**Common Failure Scenarios**:

### Failure: "Found orders with restaurant_id='grow'"
**Root Cause**: P0-1 fix didn't work
**Action**: Review `client/src/pages/hooks/useVoiceOrderWebRTC.ts` - ensure no hardcoded fallback

### Failure: "CROSS-CONTAMINATION DETECTED"
**Root Cause**: RLS policies or client context issue
**Action**: Check server-side RLS policies, verify JWT contains correct restaurant_id

### Failure: Memory > 150MB
**Root Cause**: P0-3 fix didn't work
**Action**: Review `VoiceEventHandler.ts` - ensure LRU cache is working

---

## Quick Abort

If you need to stop the test early:

```bash
# Press Ctrl+C in terminal running monitor-24h.js
# Script will generate partial report

# Review partial results
cat tests/multi-tenant/24h-test-results.md
```

---

## After Test Passes

### Deploy to Production

```bash
# 1. Commit P0 fixes (if not already committed)
git add -A
git commit -m "fix(voice): resolve 4 P0 issues - 24h test passed"

# 2. Push to main
git push origin main

# 3. Deploy
npm run deploy
```

### Monitor Production

First 48 hours after deployment:
- Check Supabase logs for errors
- Monitor Sentry for exceptions
- Watch for customer support tickets about voice ordering

---

## Troubleshooting

### "SUPABASE_SERVICE_KEY environment variable not set"
**Fix**: Add to `.env` file:
```bash
SUPABASE_SERVICE_KEY=your-service-key-here
```

### "Cannot connect to database"
**Fix**: Check Supabase dashboard, verify database is online

### "No orders being created"
**Fix**: Ensure frontend is running (`npm run dev`), check OpenAI API key is set

---

## Questions?

- **Test Plan**: See `tests/multi-tenant/24H-TEST-PLAN.md`
- **P0 Fixes Summary**: See `/tmp/p0-fixes-summary.md`
- **Original Analysis**: See `VOICE_ORDERING_ULTRATHINK_ANALYSIS.md`

---

**Estimated Timeline**:
- Setup: 30 minutes
- Test running: 24 hours (automated)
- Review: 30 minutes
- **Total**: ~25 hours
