# Runbook: Post Dual-Auth Rollout

**Status**: ACTIVE
**Owner**: Platform Team
**Last Updated**: 2025-10-18
**Related**: [ADR-006](../ADR-006-dual-authentication-pattern.md), PR #102

---

## Executive Summary

This runbook guides the staged rollout of the dual authentication pattern, transitioning from deprecated `kiosk_demo` role to canonical `customer` role for public online orders.

**Migration Goal**: Zero-downtime transition from `kiosk_demo` to `customer` role.

**Key Feature**: Backwards-compatible alias pattern allows both roles during transition.

**Timeline**: 2-4 weeks (Dev → Staging → Canary → Production)

---

## Prerequisites

Before starting rollout:

### 1. Environment Variables

Ensure these variables are set in **all environments** (dev, staging, prod):

```bash
# Enable dual auth pattern (default: false)
AUTH_DUAL_AUTH_ENABLE=true

# Accept kiosk_demo as customer alias (default: true)
# Set to 'false' once migration complete
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true

# Required for client flow tracking
X-Client-Flow=online|kiosk|server
```

### 2. Database Migration

Apply customer role scopes migration:

```bash
# Local/Dev
npm run db:migration:new  # Already done: 20251018_add_customer_role_scopes.sql
supabase migration up

# Staging
supabase db push --db-url $STAGING_DATABASE_URL

# Production (requires approval)
supabase db push --db-url $PRODUCTION_DATABASE_URL
```

### 3. Client Updates

Deploy client changes that:
- Replace `kiosk_demo` with `customer` in auth flows
- Update token generation to use `customer` role
- Maintain backwards compatibility via localStorage fallback

### 4. Monitoring Setup

Configure monitoring for:
- Authentication success/failure rates
- Role usage distribution (customer vs kiosk_demo)
- Deprecation warning counts
- 401 Unauthorized errors

---

## Rollout Stages

### Stage 1: Development & Local Testing

**Duration**: 1-2 days
**Goal**: Validate dual auth works in local environment

#### Actions

1. **Apply DB Migration**
   ```bash
   cd /path/to/rebuild-6.0
   npm run db:push
   ```

2. **Set Environment Variables**
   ```bash
   # Add to .env
   AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true
   ```

3. **Run Manual Validation Checklist**
   - [ ] Server starts without errors
   - [ ] Customer role can create orders (POST /api/v1/orders)
   - [ ] Server role can create orders
   - [ ] Kiosk_demo role still works (logs WARN)
   - [ ] Token refresh works for both roles
   - [ ] 401 errors return helpful messages
   - [ ] X-Client-Flow header captured in logs

4. **Run Integration Tests**
   ```bash
   npm run test:server
   # Verify: 7/7 orders.auth.test.ts passing
   ```

5. **Manual Testing**
   - Navigate to http://localhost:5173
   - Log in as demo user (kiosk_demo)
   - Verify orders work
   - Check logs for deprecation warning
   - Log in as customer (if client updated)
   - Verify orders work
   - Check no deprecation warning

#### Success Criteria
- ✅ All 7 auth integration tests pass
- ✅ Manual orders flow works for both roles
- ✅ Logs show deprecation warnings for kiosk_demo
- ✅ No 401 errors for valid tokens

#### Rollback
If issues found:
```bash
# Revert .env change
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false

# Or revert PR #102
git revert <commit-sha>
npm run dev
```

---

### Stage 2: Staging Deployment

**Duration**: 24-48 hours
**Goal**: Validate in production-like environment with real data

#### Actions

1. **Deploy to Staging**
   ```bash
   # Deploy server
   git push staging main

   # Deploy client
   vercel --prod --env VITE_API_BASE_URL=$STAGING_API_URL

   # Apply migration
   supabase db push --db-url $STAGING_DATABASE_URL
   ```

2. **Set Staging Env Vars**
   ```bash
   # Render (server)
   render env set AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true

   # Vercel (client)
   vercel env add AUTH_ACCEPT_KIOSK_DEMO_ALIAS production true
   ```

3. **Monitor for 24 Hours**
   ```bash
   # Check auth role distribution
   LOG_DIR=/var/log/restaurant-os/ ./scripts/monitor-auth-roles.sh

   # Check error rates
   # (Use your APM tool - examples below)

   # Loki query example
   {app="restaurant-os"} |= "401" | json | role="customer" or role="kiosk_demo"

   # Datadog query example
   service:restaurant-os status:error @auth.role:(customer OR kiosk_demo)

   # Grafana query example
   rate(http_requests_total{status="401", role=~"customer|kiosk_demo"}[5m])
   ```

4. **Trending Analysis**
   Track these metrics over 24h:
   - Customer role usage: Should be **increasing**
   - Kiosk_demo role usage: Should be **decreasing**
   - Deprecation warnings: Should trend down
   - 401 error rate: Should be **< 0.5%**

#### Success Criteria
- ✅ Zero production incidents
- ✅ 401 error rate < 0.5%
- ✅ Customer role usage > 50% (if clients deployed)
- ✅ Deprecation warnings trending down
- ✅ No performance degradation

#### Rollback
If >1% 401 errors or critical bug:
```bash
# Set flag to false (rejects kiosk_demo)
render env set AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false

# OR revert deployment
git revert <commit-sha>
git push staging main

# OR emergency: Disable dual auth entirely
render env set AUTH_DUAL_AUTH_ENABLE=false
```

**Rollback Time**: ~5 minutes (env var change)
**Rollback Impact**: Clients using kiosk_demo will get 403 errors until they update

---

### Stage 3: Production Canary (5-10%)

**Duration**: 2-4 hours
**Goal**: Test in production with limited blast radius

#### Actions

1. **Deploy to Canary**
   ```bash
   # Deploy to 5% of production servers
   # (Adjust based on your deployment platform)

   # Render: Use branch deployment
   render deploy --branch canary --percentage 5

   # OR manual: Deploy to single instance
   ssh prod-api-1
   cd /app/restaurant-os
   git pull
   npm run build
   pm2 restart restaurant-os
   ```

2. **Monitor Canary**
   ```bash
   # Real-time monitoring (first 30 min)
   tail -f /var/log/restaurant-os/app.log | grep -E "401|403|kiosk_demo"

   # Check specific instance health
   curl https://api.july25.com/health
   ```

3. **Check Metrics (Every 30 min)**
   - 401/403 error rate (target: <0.5%)
   - Customer vs kiosk_demo ratio
   - Order creation success rate (target: >99.5%)
   - Average response time (should be unchanged)

#### Success Criteria
- ✅ Canary error rate ≤ baseline
- ✅ No spike in 401/403 errors
- ✅ Order success rate >99.5%
- ✅ Customer role working correctly

#### Rollback
If canary shows elevated errors:
```bash
# Rollback canary instances
render deploy rollback

# OR disable on affected instances
ssh prod-api-1
echo "AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false" >> /app/.env
pm2 restart restaurant-os
```

**Rollback Time**: ~2 minutes
**Blast Radius**: 5-10% of traffic

---

### Stage 4: Production Full Rollout (100%)

**Duration**: 1-2 hours
**Goal**: Complete production deployment

#### Actions

1. **Deploy to All Production Instances**
   ```bash
   # Full production deployment
   render deploy --branch main --percentage 100

   # OR rolling deployment
   for instance in prod-api-{1..5}; do
     ssh $instance
     cd /app/restaurant-os
     git pull
     npm run build
     pm2 restart restaurant-os
     sleep 60  # Stagger deployments
   done
   ```

2. **Post-Deployment Checks**
   ```bash
   # Health check all instances
   for i in {1..5}; do
     curl https://api-$i.july25.com/health
   done

   # Check auth metrics
   ./scripts/monitor-auth-roles.sh

   # Verify no alerts firing
   # (Check your monitoring dashboard)
   ```

3. **Monitor for 2 Hours**
   - Every 15 min: Check error rates
   - Every 30 min: Run monitoring script
   - Every 1 hour: Review deprecation warnings

#### Success Criteria
- ✅ All instances healthy
- ✅ 401 error rate < baseline + 10%
- ✅ No customer-reported issues
- ✅ Order creation working normally

#### Rollback
If critical production issue:
```bash
# Emergency: Revert entire deployment
render deploy rollback

# Fastest: Disable via env var (30 seconds)
render env set AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false --all

# Nuclear option: Disable dual auth entirely
render env set AUTH_DUAL_AUTH_ENABLE=false --all
```

**Rollback Time**: 30 seconds (env var) to 5 minutes (full revert)

---

## Post-Rollout

### 1 Week Later: Migration Progress Check

```bash
# Run monitoring script
LOG_DIR=/var/log/restaurant-os/ DAYS_BACK=7 ./scripts/monitor-auth-roles.sh

# Expected output:
# Customer role tokens:       15,234  (85%)
# Kiosk_demo role tokens:      2,567  (15%)
# Deprecation warnings:        2,567
```

**Action Items**:
- If kiosk_demo > 20%: Identify unmigrated clients, send migration notice
- If kiosk_demo < 5%: Plan final cutover (Stage 5)

### 2 Weeks Later: Prepare for Cutover

**Pre-cutover checklist**:
- [ ] Kiosk_demo usage < 5%
- [ ] All known clients migrated to customer role
- [ ] Monitoring confirms low deprecation warning count
- [ ] Stakeholders notified of cutover date

### Stage 5: Final Cutover (Future)

**Not part of this rollout - planned for 4-6 weeks post-launch**

Actions:
1. Set `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false` in production
2. Monitor for rejected kiosk_demo attempts
3. Update CI: Set `MIGRATION_STAGE=post` in GitHub Actions
4. Remove kiosk_demo scopes from database (future migration)

---

## Monitoring Queries

### Loki (Log Aggregation)

```logql
# Auth role distribution
{app="restaurant-os"} |= "role" | json | line_format "{{.role}}"

# Deprecation warnings
{app="restaurant-os"} |= "kiosk_demo.*deprecated"

# 401 errors by role
{app="restaurant-os"} | json | status="401" | line_format "{{.role}}"
```

### Datadog (APM)

```datadog
# Error rate by role
sum:http.requests{service:restaurant-os,status:401}.as_count() by {role}

# Auth success rate
(sum:http.requests{service:restaurant-os,endpoint:/api/v1/orders,status:201}.as_count() /
 sum:http.requests{service:restaurant-os,endpoint:/api/v1/orders}.as_count()) * 100

# Deprecation warning rate
sum:log.warn{service:restaurant-os,message:*kiosk_demo*deprecated*}.as_count()
```

### Grafana (Prometheus)

```promql
# 401 error rate by role
rate(http_requests_total{status="401", role=~"customer|kiosk_demo"}[5m])

# Auth role distribution
sum by (role) (increase(http_requests_total{endpoint="/api/v1/orders"}[1h]))

# Deprecation warning count
increase(log_messages_total{level="warn", message=~".*kiosk_demo.*deprecated.*"}[1h])
```

### Custom Script

```bash
# Run monitoring script with custom params
LOG_DIR=/var/log/restaurant-os/ \
LOG_PATTERN="app-*.log" \
DAYS_BACK=1 \
./scripts/monitor-auth-roles.sh
```

---

## Troubleshooting

### Issue: High 401 Error Rate

**Symptoms**: >1% of requests returning 401 Unauthorized

**Diagnosis**:
```bash
# Check which role is failing
grep "401" /var/log/restaurant-os/app.log | grep -oP 'role":\K"[^"]*"' | sort | uniq -c

# Check token expiry
grep "Token expired" /var/log/restaurant-os/app.log | tail -20
```

**Fixes**:
1. If customer tokens failing: Check JWT_SECRET matches between issuer and verifier
2. If kiosk_demo rejected: Verify `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true`
3. If tokens expired: Check token TTL, may need to increase

### Issue: Kiosk Demo Not Aliasing

**Symptoms**: 403 Forbidden for kiosk_demo despite flag enabled

**Diagnosis**:
```bash
# Check env var is set
echo $AUTH_ACCEPT_KIOSK_DEMO_ALIAS

# Check server picked up env var
curl http://localhost:3001/health | jq '.config.auth'

# Check logs for rejection
grep "kiosk_demo.*rejected" /var/log/restaurant-os/app.log
```

**Fixes**:
1. Restart server: `pm2 restart restaurant-os`
2. Verify .env file: `cat .env | grep AUTH_ACCEPT`
3. Check env var not overridden: `printenv | grep AUTH`

### Issue: Customer Role Not Working

**Symptoms**: 403 Forbidden for customer role

**Diagnosis**:
```bash
# Check DB migration applied
psql $DATABASE_URL -c "SELECT * FROM role_scopes WHERE role='customer';"

# Check scopes assigned
psql $DATABASE_URL -c "SELECT scope_name FROM role_scopes WHERE role='customer';"
```

**Fixes**:
1. Apply migration: `supabase migration up`
2. Verify scopes: Should include orders:create, orders:read, menu:read, payments:process
3. Check role in routes: `server/src/routes/orders.routes.ts:39` should list 'customer'

### Issue: Monitoring Script No Data

**Symptoms**: Script reports 0 auth events

**Diagnosis**:
```bash
# Check log directory
ls -la $LOG_DIR

# Check log file permissions
ls -l $LOG_DIR/*.log

# Check log format
head -20 $LOG_DIR/app.log
```

**Fixes**:
1. Set correct LOG_DIR: `LOG_DIR=/var/log/restaurant-os/ ./scripts/monitor-auth-roles.sh`
2. Check log rotation: Logs may be compressed (.gz)
3. Adjust DAYS_BACK: `DAYS_BACK=30 ./scripts/monitor-auth-roles.sh`

---

## Success Metrics

### Week 1
- [x] 0 production incidents
- [x] 401 error rate < 0.5%
- [x] Customer role usage > 50%

### Week 2
- [ ] Customer role usage > 80%
- [ ] Kiosk_demo usage < 20%
- [ ] Deprecation warnings trending down

### Week 4
- [ ] Customer role usage > 95%
- [ ] Kiosk_demo usage < 5%
- [ ] Ready for final cutover

---

## Contacts

**Escalation Path**:
1. Platform Team: @platform-team (Slack)
2. On-call Engineer: PagerDuty escalation
3. Technical Lead: @tech-lead (emergency only)

**Related Documentation**:
- [ADR-006: Dual Authentication Pattern](../ADR-006-dual-authentication-pattern.md)
- [AUTHENTICATION_ARCHITECTURE.md](../AUTHENTICATION_ARCHITECTURE.md)
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)

---

**Document Version**: 1.0
**Next Review**: 2025-11-18 (1 month post-rollout)
