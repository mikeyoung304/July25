# Payment 500 Error - Root Cause Analysis
**Date:** October 23, 2025
**Status:** ✅ PHASE 1 COMPLETE - Configuration Needed
**Severity:** P1 - Revenue Blocking

---

## ✅ PHASE 1 COMPLETE (October 24, 2025)

**Database Migration Deployed:**
- ✅ `payment_audit_logs` table created in production
- ✅ RLS policies active for multi-tenancy
- ✅ Performance indexes added
- ✅ Deployed via direct psql connection (Oct 24, 2025 02:52 AM)

**Migration Details:**
- File: `supabase/migrations/20251023000000_add_payment_audit_logs.sql`
- Table: `payment_audit_logs` with full PCI compliance features
- Indexes: 9 performance indexes added
- Views: `payment_audit_summary` view created
- Functions: `get_payment_stats()` function added

**Verification:**
```bash
psql -h aws-0-us-east-2.pooler.supabase.com \
  -U postgres.xiwfhcikfdoshxwbtjxt \
  -d postgres \
  -c "\dt payment_audit_logs"

Result: Relation found ✅
```

---

## 🔍 Executive Summary

Payment endpoint returns **HTTP 500 Internal Server Error** when processing payments in production.

**Root Cause Identified:**
1. ✅ FIXED: Missing `payment_audit_logs` table - DEPLOYED Oct 24, 2025
2. ⏳ PENDING: Square API credentials not configured in Render

**Current Status:**
- ✅ RBAC fix is working - we're reaching payment logic
- ✅ Database audit table deployed to production
- ⏳ Square API configuration needed in Render dashboard

**Next Step:** Configure `SQUARE_ACCESS_TOKEN` in Render environment variables

---

## 📊 Test Results

```
✅ Auth: Working (demo session created)
✅ Orders: Working (order created with correct total $10.80)
❌ Payments: HTTP 500 (internal server error)
```

---

## 🔬 Root Cause Analysis

### Code Flow:
1. Payment request arrives → RBAC check ✅ PASSES
2. Order validation ✅ PASSES
3. Payment amount calculation ✅ PASSES
4. Square API call → **500 ERROR HERE** ❌

### Where It Fails:

**File:** `server/src/services/payment.service.ts`
**Method:** `logPaymentAttempt()` (lines 196-245)

```typescript
// This code tries to log to payment_audit_logs table
const { error } = await supabase
  .from('payment_audit_logs')
  .insert(auditLog);

if (error) {
  // FAIL-FAST: Per ADR-009, audit logging is mandatory for PCI compliance
  throw new Error('Payment processing unavailable - audit system failure.');
}
```

**Why This Fails:**
- Per ADR-009 and SECURITY.md, payment audit logging is **mandatory** for PCI DSS compliance
- Code uses **fail-fast** pattern - if audit log fails, payment must be blocked
- If `payment_audit_logs` table doesn't exist → audit fails → 500 error

---

## 💡 Solutions (Choose One)

### ✅ **Solution 1: Demo Mode** (Recommended for Testing - 5 minutes)

**Quick fix to unblock testing and launch prep:**

1. **Set Demo Mode in Render:**
   ```
   SQUARE_ACCESS_TOKEN=demo
   ```

2. **What This Does:**
   - ✅ Skips real Square API calls
   - ✅ Mocks successful payments (returns fake payment ID)
   - ✅ Allows full user flow testing
   - ✅ No credit card processing (safe)
   - ⚠️  Won't process real payments

3. **When to Use:**
   - Internal testing
   - Demo environments
   - Before Square account is set up
   - While debugging audit log issues

**Deploy:** Restart Render service after adding env var

---

### ✅ **Solution 2: Fix Audit Log Table** (Recommended for Production - 30 minutes)

**Proper fix for real payment processing:**

1. **Check if table exists:**
   ```bash
   supabase db diff --linked
   ```

2. **Create migration if needed:**
   ```sql
   -- Create payment_audit_logs table
   CREATE TABLE IF NOT EXISTS payment_audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     user_id TEXT,
     restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
     amount BIGINT NOT NULL, -- in cents
     payment_method TEXT DEFAULT 'card',
     payment_id TEXT,
     status TEXT NOT NULL CHECK (status IN ('initiated', 'processing', 'success', 'failed', 'refunded')),
     error_code TEXT,
     error_detail TEXT,
     ip_address TEXT,
     user_agent TEXT,
     idempotency_key TEXT,
     metadata JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );

   -- Indexes for performance
   CREATE INDEX idx_payment_audit_order ON payment_audit_logs(order_id);
   CREATE INDEX idx_payment_audit_restaurant ON payment_audit_logs(restaurant_id);
   CREATE INDEX idx_payment_audit_status ON payment_audit_logs(status);
   CREATE INDEX idx_payment_audit_created ON payment_audit_logs(created_at DESC);

   -- RLS policies (multi-tenancy)
   ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

   CREATE POLICY payment_audit_restaurant_access ON payment_audit_logs
     FOR ALL
     USING (restaurant_id = current_setting('app.restaurant_id', true)::uuid);
   ```

3. **Deploy migration:**
   ```bash
   supabase db push --linked
   ```

4. **Configure Square credentials in Render:**
   ```
   SQUARE_ACCESS_TOKEN=<your-square-token>
   SQUARE_LOCATION_ID=<your-square-location-id>
   SQUARE_ENVIRONMENT=sandbox  # or 'production'
   ```

5. **Verify startup logs show:**
   ```
   ✅ Square credentials validated successfully
   ```

---

### ✅ **Solution 3: Hybrid Approach** (Best for Gradual Rollout - 1 hour)

**Use demo mode while setting up payment infrastructure:**

**Phase 1 (Today):**
1. Set `SQUARE_ACCESS_TOKEN=demo` in Render
2. Test all user flows with mock payments
3. Verify RBAC, orders, auth all working

**Phase 2 (This Week):**
1. Create `payment_audit_logs` table
2. Set up Square sandbox credentials
3. Test with real Square sandbox API
4. Verify audit logging works

**Phase 3 (Production):**
1. Switch to `SQUARE_ENVIRONMENT=production`
2. Update to production Square token
3. Monitor payment success rates
4. Keep fail-fast audit logging

---

## 🔧 Diagnostic Commands

### Test Demo Mode Locally:
```bash
# Set demo mode
export SQUARE_ACCESS_TOKEN=demo

# Restart server
npm run dev

# Test payment (should work)
bash ./scripts/test-payment-properly.sh
```

### Check Table Exists:
```bash
# From local
supabase db diff --linked

# Or query directly
psql $DATABASE_URL -c "SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'payment_audit_logs'
);"
```

### View Render Logs:
```bash
# Check startup validation
gh run logs <deploy-run-id> | grep "Square"

# Or from Render dashboard:
# → Logs → Search for "Square" or "payment_audit"
```

---

## 📋 Decision Matrix

| Scenario | Solution | Timeline | Risk |
|----------|----------|----------|------|
| **Need to test flows today** | Demo Mode | 5 min | Low |
| **Need real payments this week** | Fix Audit Table | 30 min | Low |
| **Gradual rollout preferred** | Hybrid | 1 hour | Very Low |
| **Already have Square account** | Solution 2 only | 30 min | Low |

---

## ✅ Recommended Action Plan

**✅ PHASE 1 COMPLETE (October 24, 2025):**
1. ✅ Created `payment_audit_logs` migration
2. ✅ Deployed to Supabase production database
3. ✅ Verified table exists and is accessible

**⏳ PHASE 2 PENDING (Next Step - 5 minutes):**
1. Access Render dashboard
2. Navigate to: Environment → Environment Variables
3. Add one of the following:

**Option A - Demo Mode (Recommended for Testing):**
```
SQUARE_ACCESS_TOKEN=demo
```

**Option B - Sandbox Mode (For Integration Testing):**
```
SQUARE_ACCESS_TOKEN=<your-sandbox-token>
SQUARE_LOCATION_ID=<your-sandbox-location-id>
SQUARE_ENVIRONMENT=sandbox
```

**Option C - Production Mode (For Live Payments):**
```
SQUARE_ACCESS_TOKEN=<your-production-token>
SQUARE_LOCATION_ID=<your-production-location-id>
SQUARE_ENVIRONMENT=production
```

4. Restart Render service
5. Test payment endpoint

See **DEPLOYMENT.md** → Square API Configuration for detailed instructions on obtaining credentials.

---

## 🎯 Success Criteria

**Phase 1 (Database) - ✅ COMPLETE:**
- ✅ `payment_audit_logs` table exists in production
- ✅ RLS policies active
- ✅ Performance indexes created
- ✅ Audit logging functions deployed

**Phase 2 (Configuration) - ⏳ PENDING:**
- ⏳ `SQUARE_ACCESS_TOKEN` configured in Render
- ⏳ Payment endpoint returns 200 (success) or 400 (card declined)
- ⏳ NO 500 errors
- ⏳ Audit logs created for each payment attempt
- ⏳ Full order → payment flow works end-to-end

---

## 📚 Related Documentation

- **DEPLOYMENT.md:** Square API Configuration section (updated Oct 24, 2025)
- **ADR-009:** Error Handling Philosophy (fail-fast vs fail-safe)
- **SECURITY.md:** PCI DSS compliance requirements (lines 167-204)
- **P0-FIX-ROADMAP.md:** Payment audit logging fix (#120 - STAB-004)
- **STABILITY_AUDIT_PROGRESS.md:** Current progress tracking
- **payment.service.ts:** Payment validation and audit logging
- **payments.routes.ts:** Square API integration

---

## 🚨 Critical Notes

1. ✅ Audit logging table deployed - PCI compliance infrastructure in place
2. **DO NOT disable fail-fast audit logging** - it's required for PCI compliance
3. **Demo mode is safe** - no real credit cards processed
4. **Test in sandbox first** - don't go straight to production Square
5. ⏳ **Next blocker:** Square API credentials in Render

---

**Status:** Phase 1 Complete - Ready for Configuration
**Next Step:** Configure SQUARE_ACCESS_TOKEN in Render
**ETA to Resolution:** 5 minutes (Render dashboard configuration)
