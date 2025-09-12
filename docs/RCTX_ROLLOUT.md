# Restaurant Context Enforcement Rollout Plan

## Overview
This document outlines the rollout plan for restaurant context enforcement (PR #22, tag: `rctx-enforcement-v1`).

## Feature Flag Rollout Steps

### Phase 1: Canary (10%)
```bash
# Enable AUTH_V2 for 10% of traffic
export FEATURE_AUTH_V2=true
export AUTH_V2_ROLLOUT_PERCENTAGE=10
```

### Phase 2: Partial (50%)
```bash
# After 24 hours with no issues
export AUTH_V2_ROLLOUT_PERCENTAGE=50
```

### Phase 3: Full Rollout (100%)
```bash
# After 48 hours at 50%
export AUTH_V2_ROLLOUT_PERCENTAGE=100
```

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Error Rates**
   - `RESTAURANT_CONTEXT_MISSING` (400 errors)
   - `RESTAURANT_ACCESS_DENIED` (403 errors)
   - Order creation failure rate

2. **Dashboard Links**
   - Supabase Dashboard: Check RLS policy violations
   - Application logs: Filter by error codes above
   - Order success rate: Monitor for drops

### Alert Thresholds
- `RESTAURANT_CONTEXT_MISSING` > 1% of requests → Investigate
- `RESTAURANT_ACCESS_DENIED` > 0.5% of requests → Verify membership data
- Order failure rate increase > 2% → Consider rollback

## Rollback Procedure

### Quick Rollback (< 5 minutes)
```bash
# Disable feature flag immediately
export FEATURE_AUTH_V2=false
```

### Full Rollback (if needed)
```bash
# Revert to previous tag
git checkout main
git revert 924ce96  # Merge commit SHA
git push origin main

# Deploy reverted version
npm run build
npm run deploy
```

### Hotfix Process
If specific issues found:
1. Create hotfix branch from `rctx-enforcement-v1`
2. Apply minimal fix
3. Test with `scripts/verify-tenancy-and-cache.cjs`
4. Deploy hotfix with feature flag at 10%

## Frontend Requirements

### Critical: Staff Flows Must Set Header
All staff authentication flows MUST include the `X-Restaurant-ID` header:

```javascript
// Required for all staff API calls
const headers = {
  'Authorization': `Bearer ${token}`,
  'X-Restaurant-ID': restaurantId  // REQUIRED for staff tokens
};
```

### Kiosk Mode (Customer Tokens)
Kiosk/customer tokens include restaurant context in the token itself and can optionally omit the header (fallback supported).

## Success Criteria
- Zero increase in authentication errors after 72 hours
- Restaurant context properly enforced (verified via logs)
- No performance degradation
- All integration tests passing

## Communication Plan
1. **Pre-rollout**: Notify frontend team about header requirement
2. **During rollout**: Monitor Slack #alerts channel
3. **Post-rollout**: Update documentation with lessons learned

## Rollout Timeline
- **Day 1**: Enable at 10% (monitor closely)
- **Day 2**: Increase to 50% if stable
- **Day 3**: Full rollout to 100%
- **Day 7**: Remove legacy middleware file
- **Day 14**: Remove feature flag (make permanent)