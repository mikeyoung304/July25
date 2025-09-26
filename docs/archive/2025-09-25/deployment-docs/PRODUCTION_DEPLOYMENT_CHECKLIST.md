# Production Deployment Checklist v6.0.4

**Target Date**: _____________  
**Deployment Lead**: _____________  
**Rollback Decision By**: _____________

## Pre-Deployment (T-7 Days)

### Infrastructure Readiness
- [ ] AWS/Vercel account configured with production access
- [ ] Domain name configured and SSL certificates valid
- [ ] CDN (CloudFlare) configured and tested
- [ ] Load balancer health checks passing
- [ ] Auto-scaling policies configured
- [ ] Database connection pooling optimized
- [ ] Redis cluster configured for WebSocket scaling
- [ ] Backup systems tested and verified

### Security Audit
- [ ] All secrets rotated and stored in secrets manager
- [ ] SUPABASE_JWT_SECRET set (32+ characters)
- [ ] PIN_PEPPER and DEVICE_FINGERPRINT_SALT configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured on all endpoints
- [ ] SQL injection testing completed
- [ ] XSS vulnerability scan completed
- [ ] OWASP Top 10 checklist reviewed

### Code Readiness
- [ ] All PRs merged to main branch
- [ ] No critical TypeScript errors
- [ ] ESLint errors resolved (warnings acceptable)
- [ ] Test coverage meets minimum (60/50/60)
- [ ] Bundle size under 100KB for main chunk
- [ ] Memory usage optimized (<4GB for builds)
- [ ] All console.log statements removed
- [ ] Error handling comprehensive

### Database Preparation
- [ ] Production database provisioned
- [ ] Migrations tested on staging copy
- [ ] RLS policies verified and enabled
- [ ] Indexes optimized for query patterns
- [ ] Backup strategy documented
- [ ] Restore procedure tested
- [ ] Connection pool sized appropriately
- [ ] Monitoring queries configured

---

## Pre-Deployment (T-1 Day)

### Environment Configuration
- [ ] All required environment variables set:
  ```
  ✓ SUPABASE_URL
  ✓ SUPABASE_SERVICE_KEY
  ✓ SUPABASE_JWT_SECRET
  ✓ FRONTEND_URL
  ✓ PIN_PEPPER
  ✓ DEVICE_FINGERPRINT_SALT
  ✓ SQUARE_ACCESS_TOKEN
  ✓ OPENAI_API_KEY
  ✓ SENTRY_DSN
  ✓ REDIS_URL
  ```
- [ ] Environment variables validated with script
- [ ] Staging environment matches production config
- [ ] Feature flags set for production

### External Services
- [ ] Square production credentials configured
- [ ] Square webhook endpoints registered
- [ ] OpenAI API limits increased for production
- [ ] Sentry project created and DSN set
- [ ] Email service configured and tested
- [ ] SMS service configured (if applicable)
- [ ] Monitoring alerts configured
- [ ] Status page prepared

### Team Preparation
- [ ] Deployment team briefed on procedure
- [ ] On-call schedule confirmed
- [ ] Rollback procedure documented
- [ ] Communication plan established
- [ ] Customer support team notified
- [ ] Maintenance window communicated

---

## Deployment Day (T-0)

### Pre-Flight Checks (1 Hour Before)
- [ ] Current production backup completed
- [ ] Staging smoke tests passing
- [ ] No active incidents in monitoring
- [ ] Team members in position
- [ ] Communication channels open
- [ ] Rollback environment ready

### Database Migration (30 Minutes)
- [ ] Maintenance mode enabled
- [ ] Database backup verified
- [ ] Run migrations:
  ```bash
  npm run db:migrate:production
  ```
- [ ] Verify migration success:
  ```sql
  SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 5;
  ```
- [ ] Test critical queries
- [ ] Verify RLS policies active

### Application Deployment (30 Minutes)

#### Step 1: Deploy Backend
- [ ] Deploy server to production:
  ```bash
  npm run deploy:server:production
  ```
- [ ] Verify health endpoint:
  ```bash
  curl https://api.restaurant-os.com/health
  ```
- [ ] Check error logs for issues
- [ ] Verify WebSocket connections
- [ ] Test authentication flow
- [ ] Verify payment processing

#### Step 2: Deploy Frontend
- [ ] Build production bundle:
  ```bash
  npm run build:production
  ```
- [ ] Deploy to CDN/hosting:
  ```bash
  npm run deploy:client:production
  ```
- [ ] Purge CDN cache:
  ```bash
  npm run cdn:purge
  ```
- [ ] Verify static assets loading
- [ ] Check bundle sizes
- [ ] Test critical user paths

### Post-Deployment Validation (1 Hour)

#### Smoke Tests
- [ ] Home page loads successfully
- [ ] User can log in (all auth methods)
- [ ] Menu items display correctly
- [ ] Order creation works
- [ ] Payment processing succeeds
- [ ] Voice ordering responds
- [ ] Kitchen display updates
- [ ] WebSocket real-time updates work
- [ ] Restaurant context (RCTX) enforced
- [ ] Mobile responsive design works

#### API Verification
- [ ] Test with RCTX headers:
  ```bash
  curl -X GET https://api.restaurant-os.com/api/v1/orders \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Restaurant-ID: $RESTAURANT_ID"
  ```
- [ ] Verify 400 without RCTX
- [ ] Verify 403 for unauthorized access
- [ ] Check response times <200ms
- [ ] Validate rate limiting works

#### Monitoring Checks
- [ ] Error rate <1%
- [ ] Response time <200ms (p95)
- [ ] CPU usage <60%
- [ ] Memory usage <75%
- [ ] Database connections stable
- [ ] No memory leaks detected
- [ ] WebSocket connections stable
- [ ] Payment success rate >99%

---

## Post-Deployment (T+1 Hour)

### Extended Monitoring
- [ ] Monitor error rates for 1 hour
- [ ] Check for any performance degradation
- [ ] Review user feedback channels
- [ ] Verify backup jobs running
- [ ] Check auto-scaling behavior
- [ ] Monitor database slow queries
- [ ] Review security alerts

### Documentation Updates
- [ ] Update deployment notes
- [ ] Document any issues encountered
- [ ] Update runbook with learnings
- [ ] Tag release in git:
  ```bash
  git tag -a v6.0.4 -m "Production release v6.0.4"
  git push origin v6.0.4
  ```
- [ ] Update status page to operational
- [ ] Send deployment summary to team

---

## Rollback Procedure (If Needed)

### Decision Criteria (Any of these trigger rollback)
- [ ] Error rate >5%
- [ ] Payment failures >3%
- [ ] Authentication broken
- [ ] Data corruption detected
- [ ] Performance degraded >50%
- [ ] Security vulnerability discovered

### Rollback Steps (15 Minutes)
1. [ ] Announce rollback decision
2. [ ] Enable maintenance mode
3. [ ] Switch load balancer to blue environment:
   ```bash
   npm run switch:blue
   ```
4. [ ] Restore database if needed:
   ```bash
   npm run db:restore --backup=pre-deployment
   ```
5. [ ] Clear all caches:
   ```bash
   npm run cache:clear:all
   ```
6. [ ] Verify rollback successful
7. [ ] Document rollback reason
8. [ ] Schedule post-mortem

---

## Success Criteria

### Immediate (T+1 Hour)
- ✅ All smoke tests passing
- ✅ Error rate <1%
- ✅ No critical alerts
- ✅ Core features operational

### Short-term (T+24 Hours)
- ✅ No customer complaints
- ✅ Performance metrics stable
- ✅ No security incidents
- ✅ Payment processing normal

### Long-term (T+7 Days)
- ✅ System stability maintained
- ✅ No memory leaks
- ✅ Customer satisfaction maintained
- ✅ Team confidence in system

---

## Communication Templates

### Maintenance Notice
```
Subject: Scheduled Maintenance - Restaurant OS Upgrade

We will be performing scheduled maintenance on [DATE] from [START] to [END] EST.

During this time:
- The system may be briefly unavailable
- Active sessions will be preserved
- No data will be lost

We appreciate your patience.
```

### Deployment Success
```
Subject: Restaurant OS v6.0.4 Successfully Deployed

The deployment of Restaurant OS v6.0.4 has been completed successfully.

New features:
- Enhanced security with RCTX enforcement
- Voice ordering improvements
- Payment processing upgrades

All systems are operational.
```

### Rollback Notice
```
Subject: Maintenance Extended - Rollback in Progress

We've identified an issue during deployment and are rolling back to ensure stability.

Expected resolution: [TIME]
Impact: [DESCRIPTION]

We'll update you once resolved.
```

---

## Sign-offs

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| DevOps Lead | | | |
| Security Lead | | | |
| Product Manager | | | |
| CTO | | | |

---

## Post-Deployment Review

**Date of Review**: _____________

### What Went Well
1. 
2. 
3. 

### What Could Be Improved
1. 
2. 
3. 

### Action Items
1. 
2. 
3. 

### Next Deployment Target
- Version: _____________
- Date: _____________
- Lead: _____________

---

**Remember**: It's better to delay deployment than to deploy with known issues. When in doubt, get a second opinion.