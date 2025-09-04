# Restaurant OS v6.0.3 - Production Deployment Checklist

**Date**: _______________  
**Deployment Version**: _______________  
**Deployed By**: _______________  
**Environment**: [ ] Staging [ ] Production

## 🔐 Pre-Deployment Security

### Credentials & Secrets
- [ ] All production API keys are encrypted
- [ ] `.env.production` file created (never committed)
- [ ] Square production credentials configured
- [ ] Supabase production keys set
- [ ] OpenAI API key secured
- [ ] JWT secrets generated (min 32 characters)
- [ ] PIN pepper generated
- [ ] Session secrets rotated
- [ ] No hardcoded credentials in code
- [ ] Git history checked for leaked secrets

### Security Configuration
- [ ] CSP headers configured
- [ ] HSTS enabled (production only)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Input sanitization active

## 📊 Performance Validation

### Bundle Size Check
```bash
npm run build
npm run check:bundle-size
```
- [ ] Main bundle < 80KB
- [ ] Vendor chunks < 50KB each
- [ ] Total JS < 500KB
- [ ] CSS < 30KB
- [ ] All performance budgets met

### Performance Metrics
- [ ] Lighthouse score > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] TTFB < 600ms

### Load Testing
```bash
npm run test:load
```
- [ ] 100 concurrent users tested
- [ ] <200ms API response time (p95)
- [ ] <500ms WebSocket latency
- [ ] No memory leaks detected
- [ ] Error rate < 1%

## 🗄️ Database Preparation

### Migrations
- [ ] All migrations reviewed
- [ ] Migrations tested on staging
- [ ] Rollback scripts prepared
- [ ] Backup taken before migration

### Optimization
```sql
-- Run optimization script
psql -U postgres -d restaurant_os -f scripts/database-optimization.sql
```
- [ ] Indexes created
- [ ] Statistics updated
- [ ] Connection pooling configured
- [ ] Materialized views created
- [ ] Slow query log enabled

### Backup & Recovery
- [ ] Full backup completed
- [ ] Backup verified restorable
- [ ] Point-in-time recovery enabled
- [ ] Disaster recovery plan documented

## 🧪 Testing Verification

### Automated Tests
```bash
npm run test:all
npm run test:e2e
```
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Coverage > 70%
- [ ] No console errors

### Manual Testing
- [ ] Customer flow: Browse → Order → Pay
- [ ] Kitchen flow: Receive → Prepare → Complete
- [ ] Expo flow: Ready → Pickup/Delivery
- [ ] Admin functions verified
- [ ] Voice ordering tested
- [ ] Multi-tenant isolation verified
- [ ] Payment processing verified
- [ ] WebSocket real-time updates working

## 🚀 Infrastructure Setup

### Environment Configuration
- [ ] Production environment variables set
- [ ] Redis configured for WebSocket scaling
- [ ] CDN configured for static assets
- [ ] SSL certificates valid
- [ ] Domain DNS configured
- [ ] Load balancer health checks configured

### Monitoring & Logging
- [ ] Sentry configured and tested
- [ ] Application logs configured
- [ ] Audit logs enabled
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set

### Auto-scaling
- [ ] Minimum instances: 2
- [ ] Maximum instances: 10
- [ ] Scale-up threshold: 70% CPU
- [ ] Scale-down threshold: 30% CPU
- [ ] Health check endpoint working

## 📦 Build & Deployment

### Build Process
```bash
npm run build:production
```
- [ ] Production build successful
- [ ] Source maps generated (separate files)
- [ ] Assets minified
- [ ] Console logs removed
- [ ] Environment variables verified

### Deployment Steps
```bash
# Blue-Green Deployment
./scripts/deploy-production.sh
```
- [ ] Blue environment ready
- [ ] Green environment deployed
- [ ] Smoke tests passed
- [ ] Database migrations applied
- [ ] Static assets uploaded to CDN

### Traffic Cutover
- [ ] 10% traffic to green
- [ ] Monitor for 15 minutes
- [ ] 50% traffic to green
- [ ] Monitor for 15 minutes
- [ ] 100% traffic to green
- [ ] Blue environment kept for rollback

## ✅ Post-Deployment Verification

### Application Health
- [ ] Home page loads
- [ ] Login works
- [ ] API endpoints responding
- [ ] WebSocket connections stable
- [ ] No 500 errors
- [ ] No 404 errors for assets

### Business Functions
- [ ] Can create order
- [ ] Payment processing works
- [ ] Kitchen display updates
- [ ] Expo display updates
- [ ] Reports generating
- [ ] Email notifications sending

### Performance Check
- [ ] Response times normal
- [ ] Database queries fast
- [ ] Memory usage stable
- [ ] CPU usage normal
- [ ] No error spikes

## 🔄 Rollback Plan

### Rollback Triggers
- [ ] Error rate > 5%
- [ ] Response time > 1s
- [ ] Payment failures > 2%
- [ ] Critical bug found
- [ ] Database corruption

### Rollback Steps
1. [ ] Switch traffic back to blue
2. [ ] Verify blue environment stable
3. [ ] Rollback database if needed
4. [ ] Notify team
5. [ ] Create incident report

## 📝 Documentation

### Update Documentation
- [ ] Deployment notes added
- [ ] Version number updated
- [ ] CHANGELOG.md updated
- [ ] Known issues documented
- [ ] API documentation current

### Communication
- [ ] Team notified of deployment
- [ ] Customer support briefed
- [ ] Status page updated
- [ ] Release notes published

## 🎯 Success Criteria

### Technical Metrics
- [ ] Uptime: 99.9% achieved
- [ ] Error rate: <1%
- [ ] Response time: <200ms (p95)
- [ ] Memory usage: <80%
- [ ] CPU usage: <70%

### Business Metrics
- [ ] Orders processing successfully
- [ ] Payments completing
- [ ] Staff able to login
- [ ] Customers can order
- [ ] No revenue impact

## 📞 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | _______ | _______ |
| Backend Lead | _______ | _______ |
| Frontend Lead | _______ | _______ |
| Database Admin | _______ | _______ |
| On-Call Engineer | _______ | _______ |

## 🚨 Incident Response

### Severity Levels
- **P0**: Complete outage
- **P1**: Critical function broken
- **P2**: Degraded performance
- **P3**: Minor issue

### Response Times
- P0: 5 minutes
- P1: 15 minutes
- P2: 1 hour
- P3: 4 hours

## ✍️ Sign-off

### Deployment Approval
- [ ] Engineering Lead: _______________ Date: ___________
- [ ] QA Lead: _______________ Date: ___________
- [ ] Product Owner: _______________ Date: ___________
- [ ] Operations: _______________ Date: ___________

### Post-Deployment Review
- [ ] Deployment successful
- [ ] All checks passed
- [ ] Monitoring confirmed
- [ ] Team debriefed

**Notes**: 
_________________________________________________
_________________________________________________
_________________________________________________

---

**Next Deployment Date**: _______________  
**Next Review Date**: _______________