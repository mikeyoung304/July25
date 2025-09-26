# Migration Guide: v6.0.3 → v6.0.4

**Critical**: This version contains breaking changes. Read this guide completely before upgrading.

## Overview

Version 6.0.4 introduces mandatory restaurant context (RCTX) enforcement, hardened authentication, and new required environment variables. Migration time: **2-4 hours**.

## Pre-Migration Checklist

- [ ] Full database backup completed
- [ ] Current version is 6.0.3 or higher
- [ ] Test environment available
- [ ] All environment variables documented
- [ ] Team notified of maintenance window
- [ ] Rollback plan prepared

## Breaking Changes ⚠️

### 1. Restaurant Context (RCTX) Required

**What Changed**: All staff API endpoints now require explicit restaurant context via `X-Restaurant-ID` header.

**Before (v6.0.3)**:
```javascript
// This worked without restaurant context
const response = await fetch('/api/v1/orders', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**After (v6.0.4)**:
```javascript
// Now requires X-Restaurant-ID header
const response = await fetch('/api/v1/orders', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Restaurant-ID': restaurantId  // REQUIRED!
  }
});
```

**Migration Steps**:
1. Search codebase for all API calls
2. Add `X-Restaurant-ID` header to staff endpoints
3. Update API client utilities
4. Test each endpoint

**Affected Endpoints**:
- `/api/v1/orders/*`
- `/api/v1/tables/*`
- `/api/v1/menu/*` (write operations)
- `/api/v1/staff/*`
- `/api/v1/reports/*`

### 2. Authentication Token Scopes

**What Changed**: Demo and kiosk tokens now require additional scopes for payment processing.

**Required Scopes**:
```javascript
const requiredScopes = [
  'menu:read',
  'orders:create',
  'ai.voice:chat',
  'payments:process'  // NEW - Required for checkout
];
```

**Migration Steps**:
1. Clear browser session storage:
   ```javascript
   sessionStorage.removeItem('DEMO_AUTH_TOKEN');
   ```
2. Update token generation to include new scopes
3. Test payment flow end-to-end

### 3. Environment Variables

**New Required Variables**:

```bash
# Server (.env)
SUPABASE_JWT_SECRET=xxx        # NEW - Required for JWT validation
FRONTEND_URL=https://...       # NEW - Required for CORS
PIN_PEPPER=xxx                 # NEW - Required for PIN hashing
DEVICE_FINGERPRINT_SALT=xxx    # NEW - Required for device binding
SQUARE_ACCESS_TOKEN=xxx        # NEW - Required for payments

# Client (.env)
VITE_SQUARE_APP_ID=xxx        # NEW - For payment UI
VITE_SQUARE_LOCATION_ID=xxx   # NEW - For payment processing
```

**Migration Steps**:
1. Generate secure values for new secrets
2. Update `.env` files in both client and server
3. Update deployment configurations
4. Restart all services

### 4. CORS Configuration

**What Changed**: CORS now uses strict allowlist instead of wildcard.

**Migration Steps**:
1. Set `FRONTEND_URL` environment variable
2. Update any additional origins in `server/src/server.ts`
3. Test cross-origin requests

### 5. Database Migrations

**Required Migrations**:
```bash
# Run in order
npm run db:migrate:rctx        # Restaurant context validation
npm run db:migrate:auth        # Auth improvements
npm run db:migrate:payments    # Payment tables
```

## Step-by-Step Migration

### Phase 1: Preparation (30 min)

```bash
# 1. Backup current state
pg_dump $DATABASE_URL > backup_v6.0.3_$(date +%Y%m%d).sql

# 2. Create migration branch
git checkout -b migration/v6.0.4
git pull origin main

# 3. Install dependencies
npm install

# 4. Update environment files
cp .env .env.backup
# Add new required variables to .env
```

### Phase 2: Code Updates (1 hour)

```bash
# 1. Update API calls for RCTX
npm run migrate:add-restaurant-context

# 2. Update authentication
npm run migrate:update-auth

# 3. Fix any TypeScript errors
npm run typecheck
```

### Phase 3: Database Migration (30 min)

```bash
# 1. Run migrations
npm run db:migrate

# 2. Verify migrations
npm run db:verify

# 3. Update RLS policies
npm run db:update-rls
```

### Phase 4: Testing (1 hour)

```bash
# 1. Run test suite
npm test

# 2. Test critical flows manually
- User login/logout
- Order creation with restaurant context
- Payment processing
- Voice ordering
- Real-time updates

# 3. Load testing
npm run test:load
```

### Phase 5: Deployment (30 min)

```bash
# 1. Deploy to staging
npm run deploy:staging

# 2. Smoke test staging
npm run test:staging

# 3. Deploy to production
npm run deploy:production

# 4. Monitor for 30 minutes
npm run monitor:production
```

## Rollback Plan

If issues arise, rollback immediately:

```bash
# 1. Revert code
git checkout v6.0.3
npm run deploy:emergency

# 2. Restore database
psql $DATABASE_URL < backup_v6.0.3_$(date +%Y%m%d).sql

# 3. Clear caches
redis-cli FLUSHALL
npm run cdn:purge

# 4. Notify team
npm run notify:rollback
```

## Common Migration Issues

### Issue 1: 400 RESTAURANT_CONTEXT_MISSING Errors

**Solution**:
```javascript
// Add restaurant context to all API calls
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'X-Restaurant-ID': getRestaurantId()  // Add this
  }
});
```

### Issue 2: 403 RESTAURANT_ACCESS_DENIED Errors

**Cause**: User not member of restaurant

**Solution**:
```sql
-- Check user restaurant membership
SELECT * FROM user_restaurants 
WHERE user_id = 'xxx' AND restaurant_id = 'yyy';

-- Add membership if missing
INSERT INTO user_restaurants (user_id, restaurant_id, role)
VALUES ('xxx', 'yyy', 'server');
```

### Issue 3: Payment Processing Failures

**Solution**:
1. Verify Square credentials in `.env`
2. Check payment scope in token
3. Clear session storage
4. Test with Square sandbox first

### Issue 4: WebSocket Connection Failures

**Solution**:
```javascript
// Ensure restaurant_id in WebSocket connection
const ws = new WebSocket(`wss://api/ws?token=${token}&restaurant_id=${restaurantId}`);
```

## Post-Migration Checklist

- [ ] All API endpoints responding correctly
- [ ] Authentication working for all user types
- [ ] Payment processing successful
- [ ] Voice ordering functional
- [ ] Real-time updates working
- [ ] No increase in error rates
- [ ] Performance metrics normal
- [ ] Backup verified restorable

## Testing Scripts

### Verify RCTX Enforcement
```bash
# Should return 400 without X-Restaurant-ID
curl -X GET http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN"

# Should return 200 with X-Restaurant-ID
curl -X GET http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
```

### Test Payment Flow
```bash
npm run test:payments -- --env=production
```

### Verify Voice System
```bash
npm run test:voice -- --real-api
```

## Support

### Migration Support Hours
- **Monday-Friday**: 9 AM - 6 PM EST
- **Emergency**: 24/7 via PagerDuty

### Contact
- **Slack**: #migration-support
- **Email**: migration@restaurant-os.com
- **Docs**: https://docs.restaurant-os.com/migration

## Version Compatibility Matrix

| Component | v6.0.3 | v6.0.4 | Compatible |
|-----------|--------|--------|------------|
| Database Schema | ✓ | ✓ | Yes with migrations |
| API Endpoints | ✓ | ✓ | No - RCTX required |
| WebSocket Protocol | ✓ | ✓ | Yes |
| Authentication | ✓ | ✓ | Partial - new scopes |
| Payment Processing | ✓ | ✓ | Yes with env vars |

## Timeline

- **Week 1**: Test migration in staging
- **Week 2**: Migrate production (maintenance window)
- **Week 3**: Monitor and optimize
- **Week 4**: Document lessons learned

---

**Important**: This migration includes security improvements that cannot be skipped. Ensure all steps are completed to maintain system security and stability.