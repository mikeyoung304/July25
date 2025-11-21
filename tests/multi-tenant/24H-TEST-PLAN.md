# 24-Hour Multi-Tenant Test Plan

**Date**: 2025-11-21
**Purpose**: Verify voice ordering system is safe for multi-tenant production deployment
**Duration**: 24 hours continuous testing
**Environment**: Staging (remote Supabase)

---

## Test Objectives

Verify all 4 P0 fixes work correctly in multi-tenant environment:

1. **P0-1 Fix Verification**: Orders never use hardcoded `restaurant_id = 'grow'`
2. **P0-2 Fix Verification**: Cart lock prevents race conditions during checkout
3. **P0-3 Fix Verification**: Memory stays bounded (no leaks in long sessions)
4. **P0-4 Fix Verification**: Token refresh failures show user notifications

---

## Test Environment Setup

### Restaurants
- **Restaurant A**: `11111111-1111-1111-1111-111111111111` (Test Restaurant Alpha)
- **Restaurant B**: `22222222-2222-2222-2222-222222222222` (Test Restaurant Beta)

### Test Users
```sql
-- Restaurant A users
manager-a@test.com (Manager role)
server-a@test.com (Server role)

-- Restaurant B users
manager-b@test.com (Manager role)
server-b@test.com (Server role)
```

### Load Pattern (per restaurant)
- **Kiosk orders**: Every 10 minutes (144 orders/day)
- **Server orders**: Every 15 minutes (96 orders/day)
- **Total**: ~240 orders/day per restaurant
- **Concurrent**: Both restaurants run simultaneously

---

## Test Scenarios

### Scenario 1: Order Isolation Verification
**Frequency**: Every 30 minutes
**Steps**:
1. Create order as Restaurant A server
2. Create order as Restaurant B server
3. Query Restaurant A's KDS - should see only A's orders
4. Query Restaurant B's KDS - should see only B's orders
5. Verify database: `SELECT restaurant_id FROM orders WHERE id IN (last_10_order_ids)`

**Success Criteria**:
- ✅ 0 cross-restaurant orders visible in KDS
- ✅ All orders have correct `restaurant_id` in database

### Scenario 2: Cart Race Condition Test
**Frequency**: Every 2 hours
**Steps**:
1. Start kiosk voice order (add 3 items)
2. Click "Checkout & Pay Now"
3. Immediately say "Add 2 more burgers" via voice
4. Verify toast appears: "Please complete checkout first"
5. Verify cart doesn't change during checkout

**Success Criteria**:
- ✅ Voice orders blocked when `isCheckingOut = true`
- ✅ Toast notification appears
- ✅ Payment amount matches cart before checkout

### Scenario 3: Memory Leak Monitoring
**Frequency**: Every hour
**Steps**:
1. Open Chrome DevTools Memory profiler
2. Take heap snapshot
3. Record:
   - Total heap size
   - Number of Map/LRUCache entries
   - transcriptMap size
4. Compare to baseline (hour 0)

**Success Criteria**:
- ✅ Heap size increase < 50MB over 24 hours
- ✅ transcriptMap never exceeds 50 entries
- ✅ No memory warnings in console

### Scenario 4: Token Refresh Failure Handling
**Frequency**: Every 4 hours
**Steps**:
1. Mock token refresh failure (modify VoiceSessionConfig temporarily)
2. Wait for token to expire (~60 seconds)
3. Verify toast appears: "Voice connection lost. Please refresh the page."
4. Verify user can recover by refreshing

**Success Criteria**:
- ✅ Toast notification appears 100% of the time
- ✅ No silent failures in console logs
- ✅ Connection recovers after refresh

### Scenario 5: Concurrent Orders
**Frequency**: Every hour
**Steps**:
1. Start Restaurant A server order (voice)
2. Simultaneously start Restaurant B kiosk order (voice)
3. Both orders should complete successfully
4. Verify Restaurant A order goes to Restaurant A KDS
5. Verify Restaurant B order goes to Restaurant B KDS

**Success Criteria**:
- ✅ Both orders complete without errors
- ✅ No order contamination
- ✅ WebSocket broadcasts go to correct restaurant

---

## Monitoring & Logging

### Database Queries (Every Hour)

```sql
-- Check for cross-restaurant contamination
SELECT
  restaurant_id,
  COUNT(*) as order_count
FROM orders
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY restaurant_id;

-- Should return:
-- 11111111... | 10 (Restaurant A)
-- 22222222... | 10 (Restaurant B)
-- NO OTHER restaurant_ids!

-- Check for 'grow' fallback (P0-1 regression)
SELECT COUNT(*) FROM orders
WHERE restaurant_id = 'grow'
  AND created_at > NOW() - INTERVAL '24 hours';
-- Should return: 0
```

### Browser Console Monitoring
- Watch for: `[VoiceSessionConfig] Token refresh failed`
- Verify toast appears when this logs
- Watch for: Memory warnings or OOM errors

### Metrics to Track
| Metric | Baseline (Hour 0) | Target (Hour 24) |
|--------|-------------------|------------------|
| Browser heap size | ~100MB | < 150MB |
| transcriptMap entries | 0-10 | < 50 |
| Orders (Restaurant A) | 0 | ~240 |
| Orders (Restaurant B) | 0 | ~240 |
| Cross-contamination | 0 | 0 |
| Token failure toasts | 0 | 100% shown |

---

## Success Criteria (Gate to Production)

### Critical (Must Pass All)
- ✅ **Zero cross-restaurant contamination**: No orders visible across restaurant boundaries
- ✅ **Zero 'grow' fallback**: No orders with hardcoded restaurant_id
- ✅ **Memory bounded**: Heap < 150MB after 24 hours
- ✅ **Cart lock works**: Race condition prevented 100% of attempts
- ✅ **Error feedback**: Token failures show toast 100% of time

### Nice-to-Have (Monitor but Don't Block)
- ⚠️ Order completion rate > 95%
- ⚠️ WebSocket connection uptime > 99%
- ⚠️ Voice transcription accuracy > 90%

---

## Rollback Plan

If any critical criteria FAIL:
1. **STOP**: Do not deploy to production
2. **Document**: Capture screenshots, logs, database state
3. **Debug**: Identify root cause
4. **Fix**: Apply hotfix
5. **Re-test**: Run 24-hour test again

---

## Test Execution Instructions

### 1. Pre-Test Setup (30 minutes)
```bash
# Ensure database has test restaurants
npm run db:seed -- --restaurants=test-multi-tenant

# Verify restaurants exist
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  -h aws-0-us-east-1.pooler.supabase.com \
  -p 6543 -d postgres -U postgres.kpyydxuvhwltoxnwpjdn \
  -c "SELECT id, name FROM restaurants WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');"
```

### 2. Start Test (2 minutes)
```bash
# Terminal 1: Start monitoring script
node tests/multi-tenant/monitor-24h.js

# Terminal 2: Start automated test
npx playwright test tests/multi-tenant/24h-isolation.spec.ts --headed
```

### 3. During Test (Manual checks every 4 hours)
- Check monitoring logs for anomalies
- Take heap snapshots in DevTools
- Verify no errors in browser console

### 4. After 24 Hours (30 minutes)
```bash
# Generate report
node tests/multi-tenant/generate-report.js

# Review results
cat tests/multi-tenant/24h-test-results.md

# If all pass: Deploy to production
# If any fail: Execute rollback plan
```

---

## Emergency Contacts

- **On-Call Engineer**: Check monitoring script output
- **Database Issues**: Check Supabase logs
- **Memory Issues**: Take heap snapshot, analyze with Chrome DevTools

---

**Estimated Setup**: 1 hour
**Test Duration**: 24 hours (automated)
**Report Generation**: 30 minutes
**Total**: 25.5 hours
