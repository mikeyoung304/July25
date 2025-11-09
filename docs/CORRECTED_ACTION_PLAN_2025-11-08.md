# Corrected Action Plan - Post-Gatekeeper Review
## November 8, 2025

**Status:** APPROVED FOR IMPLEMENTATION
**Timeline:** 1 hour total
**Approved By:** Technical Lead (Gatekeeper Authority)

**Context:** Following technical gatekeeper review of AI-generated audit recommendations, **3 of 10 proposals were approved** for immediate implementation. See [GATEKEEPER_REVIEW_2025-11-08.md](./GATEKEEPER_REVIEW_2025-11-08.md) for full analysis.

---

## ✅ Approved Fixes (Immediate Implementation)

### Fix #1: Tax Rate Standardization (P0 - CRITICAL)

**Problem:** OrdersService uses 8% default, PaymentService uses 8.25% default
**Impact:** Financial discrepancy in payment validation
**Effort:** 30 minutes

**Implementation:**

```javascript
// File: server/src/services/orders.service.ts

// Line 86-87: Change default rate
- ordersLogger.warn('Using default tax rate 0.08 (8%) due to fetch error');
- return 0.08;
+ ordersLogger.warn('Using default tax rate 0.0825 (8.25%) due to fetch error');
+ return 0.0825;

// Line 92: Change fallback rate
- return 0.08;
+ return 0.0825;

// Line 98: Change final fallback
- return 0.08;
+ return 0.0825;
```

**Testing:**
```bash
# Run order service tests
npm test -- orders.service.test.ts

# Verify payment validation consistency
# Create test order → verify order.tax === payment.tax
```

**Success Criteria:**
- All tax rate calculations use 0.0825 (8.25%)
- Order totals match payment totals
- Tests pass

**File Reference:** server/src/services/orders.service.ts:86-87, 92, 98

---

### Fix #2: CORS Origin Allowlist (P0 - SECURITY)

**Problem:** Voice routes allow ANY origin with wildcard `*`
**Impact:** Security vulnerability - any website can access voice API
**Effort:** 30 minutes

**Implementation:**

```javascript
// File: server/src/voice/voice-routes.ts

// Replace lines 23-28 with:
voiceRoutes.use((req, res, next) => {
  // Add CORS headers for voice endpoints - SECURE VERSION
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-restaurant-id');
  next();
});
```

**Environment Configuration:**

Add to `.env`:
```bash
# Production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Add to `server/src/config/env.ts`:
```typescript
export const env = {
  // ... existing config
  ALLOWED_ORIGINS: getString('ALLOWED_ORIGINS', 'http://localhost:5173'),
} as const;
```

**Testing:**
```bash
# Test from allowed origin (should work)
curl -H "Origin: http://localhost:5173" \
  http://localhost:3001/api/v1/voice/session

# Test from disallowed origin (should be blocked)
curl -H "Origin: https://evil.com" \
  http://localhost:3001/api/v1/voice/session

# Verify Access-Control-Allow-Origin header matches request origin
```

**Success Criteria:**
- Only configured origins can access voice routes
- Production environment variable configured
- CORS headers include only requesting origin (not wildcard)
- Tests from allowed/disallowed origins behave correctly

**File References:**
- server/src/voice/voice-routes.ts:23-28
- server/src/config/env.ts (add ALLOWED_ORIGINS)

---

### Fix #3: Delete Duplicate Route File (P2 - TECH DEBT)

**Problem:** Two table route files exist (active vs dead code)
**Impact:** Code confusion, potential future bugs
**Effort:** 5 minutes

**Implementation:**

```bash
# Delete the OLD, UNUSED file
rm server/src/api/routes/tables.ts

# Keep the ACTIVE file
# server/src/routes/tables.routes.ts (last modified Nov 7)
```

**Verification:**

```bash
# Check that tables.routes.ts is the one being used
grep -r "tables.routes" server/src/

# Should find import in main router file
# Should NOT find any references to api/routes/tables.ts
```

**Testing:**
```bash
# Verify table endpoints still work
curl http://localhost:3001/api/v1/tables \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-restaurant-id: YOUR_RESTAURANT_ID"

# Should return table list (not 404)
```

**Success Criteria:**
- server/src/api/routes/tables.ts deleted
- server/src/routes/tables.routes.ts still present and working
- Table API endpoints function correctly
- No broken imports

**File References:**
- server/src/api/routes/tables.ts (DELETE THIS)
- server/src/routes/tables.routes.ts (KEEP THIS)

---

## Implementation Sequence

Execute fixes in this order to minimize risk:

### Step 1: Fix #3 - Delete Duplicate (5 min)
**Reason:** Safest, pure cleanup
```bash
rm server/src/api/routes/tables.ts
npm run build  # Verify no broken imports
```

### Step 2: Fix #1 - Tax Rate (30 min)
**Reason:** Critical financial bug, no dependencies
```bash
# Edit server/src/services/orders.service.ts
# Change all 0.08 → 0.0825
npm test -- orders.service.test.ts
```

### Step 3: Fix #2 - CORS (30 min)
**Reason:** Requires environment configuration
```bash
# Edit server/src/voice/voice-routes.ts
# Add ALLOWED_ORIGINS to env.ts
# Update .env file
npm run dev  # Test with curl
```

**Total Time:** ~1 hour

---

## Testing Checklist

- [ ] Fix #3: Table endpoints return data (not 404)
- [ ] Fix #3: `npm run build` succeeds with no errors
- [ ] Fix #1: Order tax calculation uses 0.0825
- [ ] Fix #1: Payment validation matches order totals
- [ ] Fix #1: Orders service tests pass
- [ ] Fix #2: Allowed origin receives CORS headers
- [ ] Fix #2: Disallowed origin blocked or no CORS headers
- [ ] Fix #2: Production ALLOWED_ORIGINS configured
- [ ] All: Server starts without errors
- [ ] All: No TypeScript compilation errors

---

## Deployment Steps

### Development
```bash
# 1. Implement all 3 fixes
# 2. Run tests
npm test

# 3. Start dev server
npm run dev

# 4. Manual testing
# - Test table endpoints
# - Test voice CORS (allowed + disallowed origins)
# - Create test order and verify tax calculation
```

### Production
```bash
# 1. Add ALLOWED_ORIGINS to production environment variables
# Vercel: vercel env add ALLOWED_ORIGINS
# Other: Update .env or hosting config

# 2. Deploy
git add .
git commit -m "fix: critical tax rate, CORS, and duplicate code issues

- Standardize tax rate to 8.25% across orders and payments
- Implement CORS origin allowlist for voice routes (security)
- Remove duplicate table route file (tech debt cleanup)

See: docs/CORRECTED_ACTION_PLAN_2025-11-08.md"

git push

# 3. Verify deployment
# - Check ALLOWED_ORIGINS env var set correctly
# - Test voice CORS from production domain
# - Monitor error logs for CORS issues
```

---

## Rollback Plan

### If Fix #1 (Tax) Causes Issues
```bash
# Revert to 0.08 if needed
git revert HEAD~1
```
**Unlikely to fail** - purely arithmetic change

### If Fix #2 (CORS) Blocks Legitimate Traffic
```bash
# Add missing origin to ALLOWED_ORIGINS
vercel env add ALLOWED_ORIGINS "existing,neworigin.com"

# Or temporarily revert
git revert HEAD~1
```
**Risk:** If ALLOWED_ORIGINS misconfigured

### If Fix #3 (Delete) Breaks Imports
```bash
# Restore file from git
git checkout HEAD~1 -- server/src/api/routes/tables.ts
```
**Unlikely to fail** - file is dead code

---

## Success Metrics

**After Deployment:**
- ✅ No CORS errors in production logs
- ✅ Voice ordering works from production domain
- ✅ Order totals equal payment totals (no tax mismatch)
- ✅ Table endpoints respond successfully
- ✅ No 404 errors on table routes
- ✅ No TypeScript compilation errors
- ✅ All existing tests pass

---

## What's NOT in This Plan

The following proposals from the AI audit were **REJECTED** by gatekeeper review:

❌ **Re-enable CSRF for orders/payments/tables**
- Reason: Just fixed 2 days ago for production bug (commit 1e4296c4)
- Impact: Would break floor plan saves

❌ **Remove dual auth pattern**
- Reason: Violates ADR-006
- Impact: Would break PIN/station/demo authentication

🔍 **Requires Investigation:**
- Auth race conditions (may already be fixed)
- Timeout protection strategy (selective approach needed)
- WebSocket deadlock (may be resolved by recent fix)
- localStorage auth tokens (evaluate alternatives)

See [GATEKEEPER_REVIEW_2025-11-08.md](./GATEKEEPER_REVIEW_2025-11-08.md) for full analysis.

---

## Related Documentation

- **[GATEKEEPER_REVIEW_2025-11-08.md](./GATEKEEPER_REVIEW_2025-11-08.md)** - Why proposals were approved/rejected
- **[Archive: AI Audits](./archive/2025-11/README.md)** - Original audit documents (archived)
- **[ADR-006: Dual Authentication Pattern](./explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)** - Why dual auth must stay
- **[FLOOR_PLAN_RBAC_INVESTIGATION.md](./FLOOR_PLAN_RBAC_INVESTIGATION.md)** - Why CSRF was disabled

---

**Created:** 2025-11-08
**Status:** READY FOR IMPLEMENTATION
**Estimated Completion:** 1 hour
**Next Step:** Implement Fix #3 (delete duplicate file)
