# RLS Canary CI Integration

**Date**: 2025-09-04  
**Status**: ✅ **READY**

## Canary Checks

The RLS canary script (`scripts/ci/rls_canary.sql`) validates:

1. **No JWT Custom Claims**: Fails if any policy references `request.jwt.claims` or `auth.jwt() ->> 'restaurant_id'`
2. **FORCE RLS Enabled**: Fails if any critical table lacks FORCE RLS
3. **Membership Function Exists**: Fails if `is_member_of_restaurant()` is missing

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/security.yml
- name: RLS Security Check
  run: ./scripts/ci/check_rls.sh
```

Or in package.json:

```json
"scripts": {
  "test:rls": "./scripts/ci/check_rls.sh"
}
```

## Manual Run

```bash
./scripts/ci/check_rls.sh
```

## Expected Output

Success:
```
🔍 Running RLS Canary Checks...
✅ RLS Canary Passed - All policies secure
✅ RLS checks complete
```

Failure:
```
❌ RLS Canary Failed!
CANARY FAILED: Found 2 policies using JWT custom claims
```

## Protection

This canary ensures:
- RLS policies never regress to JWT claims
- All tables maintain FORCE RLS
- Core security functions remain intact