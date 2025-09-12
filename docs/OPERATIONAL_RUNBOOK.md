# Restaurant OS v6.0.4 - Operational Runbook

**Last Updated**: September 12, 2025  
**Purpose**: Day-to-day operations, monitoring, and incident response procedures

## Table of Contents
1. [System Health Checks](#system-health-checks)
2. [Daily Operations](#daily-operations)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Incident Response](#incident-response)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Contacts](#emergency-contacts)

---

## System Health Checks

### 🟢 Quick Health Check (2 min)
```bash
# 1. Check API health
curl https://your-domain.com/health

# 2. Check WebSocket status
wscat -c wss://your-domain.com/ws

# 3. Check database connectivity
npm run db:health

# 4. Check payment processing
curl -X GET https://your-domain.com/api/v1/payments/health
```

### 📊 Dashboard URLs
- **Production**: https://your-domain.com/admin/dashboard
- **Staging**: https://staging.your-domain.com/admin/dashboard
- **Monitoring**: https://sentry.io/organizations/restaurant-os
- **Database**: https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt
- **Payments**: https://squareup.com/dashboard

---

## Daily Operations

### Morning Checklist (9:00 AM)
- [ ] Check overnight error rates in Sentry
- [ ] Verify all restaurant locations are online
- [ ] Review payment processing from previous day
- [ ] Check database backup completion
- [ ] Monitor WebSocket connection stability
- [ ] Review any customer support tickets

### Deployment Windows
- **Production**: Tuesday/Thursday 2-4 AM EST
- **Staging**: Any time (automated on push to main)
- **Hotfixes**: Immediate with approval

### Key Metrics to Monitor
| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| API Response Time | <200ms | >500ms |
| Error Rate | <1% | >3% |
| WebSocket Connections | 100-500 | >1000 |
| Database CPU | <60% | >80% |
| Memory Usage | <75% | >90% |
| Payment Success Rate | >99% | <97% |

---

## Monitoring & Alerts

### Alert Channels
1. **Critical (P0)**: PagerDuty → On-call engineer
2. **High (P1)**: Slack #alerts → Dev team
3. **Medium (P2)**: Email → Team lead
4. **Low (P3)**: Dashboard → Daily review

### Key Alerts Configuration

#### Authentication Failures
```javascript
// Alert if >50 failed logins in 5 minutes
if (failedLogins > 50) {
  alert('Possible brute force attack', 'P1');
}
```

#### Restaurant Context Errors
```javascript
// Alert if RCTX errors spike
if (rctxErrors.rate > 10/minute) {
  alert('Restaurant context validation failing', 'P0');
}
```

#### Payment Processing
```javascript
// Alert on payment failures
if (paymentSuccessRate < 0.97) {
  alert('Payment processing degraded', 'P0');
}
```

---

## Common Issues & Solutions

### 1. 🔴 "Loading..." Screen Stuck

**Symptoms**: Application shows loading spinner indefinitely

**Solution**:
```bash
# 1. Check for compiled JS in shared/
find shared -name "*.js" -type f

# 2. If found, remove them
find shared -name "*.js" -type f -delete

# 3. Clear Vite cache
rm -rf client/node_modules/.vite

# 4. Restart development server
npm run dev
```

### 2. 🔴 Authentication Token Issues

**Symptoms**: 403 Forbidden errors, users logged out unexpectedly

**Solution**:
```javascript
// Clear cached tokens (browser console)
sessionStorage.clear();
localStorage.clear();

// Force token refresh
location.reload();
```

**Server-side check**:
```bash
# Verify JWT secret is set
echo $SUPABASE_JWT_SECRET | head -c 20

# Check auth middleware logs
tail -f logs/auth.log | grep ERROR
```

### 3. 🔴 Restaurant Context Missing (400 Errors)

**Symptoms**: API returns 400 RESTAURANT_CONTEXT_MISSING

**Solution**:
```javascript
// Ensure X-Restaurant-ID header is sent
const headers = {
  'Authorization': `Bearer ${token}`,
  'X-Restaurant-ID': restaurantId  // Required!
};
```

### 4. 🟡 WebSocket Disconnections

**Symptoms**: Real-time updates stop working

**Solution**:
```bash
# 1. Check WebSocket server
lsof -i :3001 | grep LISTEN

# 2. Restart WebSocket service
pm2 restart websocket-server

# 3. Monitor connections
pm2 logs websocket-server --lines 100
```

### 5. 🟡 High Memory Usage

**Symptoms**: Server becomes unresponsive, builds fail

**Solution**:
```bash
# 1. Check memory usage
free -h
pm2 monit

# 2. Restart with memory limit
pm2 restart restaurant-os --max-memory-restart 2G

# 3. For builds
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### 6. 🟡 Payment Processing Failures

**Symptoms**: Checkout fails, payment timeouts

**Solution**:
```bash
# 1. Check Square status
curl https://status.squareup.com/api/v2/status.json

# 2. Verify API credentials
npm run test:payments

# 3. Check webhook logs
tail -f logs/webhooks.log | grep square
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0** | Complete outage | 15 min | Site down, payments broken |
| **P1** | Major degradation | 30 min | Auth failures, data loss |
| **P2** | Minor degradation | 2 hours | Slow performance, UI bugs |
| **P3** | Non-critical | Next day | Cosmetic issues |

### Incident Response Procedure

#### 1. Acknowledge (5 min)
```bash
# Update status page
npm run status:update --level=investigating

# Notify stakeholders
npm run notify:incident --severity=P0
```

#### 2. Assess (10 min)
- Check error logs: `npm run logs:errors`
- Review metrics dashboard
- Identify affected components
- Estimate impact scope

#### 3. Mitigate (15-30 min)

**Quick Rollback**:
```bash
# Rollback to last known good
git checkout v6.0.3
npm run deploy:emergency

# Or use blue-green switch
npm run switch:blue
```

**Scale Resources**:
```bash
# Scale up instances
aws autoscaling set-desired-capacity --desired-capacity 10

# Increase database connections
npm run db:scale --connections=100
```

#### 4. Communicate
- Update status page every 30 min
- Post in #incidents Slack channel
- Email major customers if P0/P1

#### 5. Resolution
```bash
# Deploy fix
npm run deploy:hotfix

# Verify resolution
npm run test:smoke

# Update status
npm run status:update --level=resolved
```

#### 6. Post-Mortem (within 48h)
- Document timeline
- Identify root cause
- Action items to prevent recurrence
- Update runbook with learnings

---

## Maintenance Procedures

### Database Maintenance

#### Daily Backup Verification
```bash
# Check last backup
npm run backup:verify

# Test restore (staging only)
npm run backup:restore --env=staging --date=2025-09-12
```

#### Weekly Optimization
```sql
-- Run on Sunday 3 AM
VACUUM ANALYZE;
REINDEX DATABASE restaurant_os;
```

### Certificate Renewal
```bash
# Check expiry (30 days before)
certbot certificates

# Renew
certbot renew --nginx

# Verify
openssl x509 -in /etc/ssl/certs/restaurant-os.crt -text -noout
```

### Dependency Updates
```bash
# Weekly security patches (staging first)
npm audit fix

# Monthly minor updates
npm update

# Quarterly major updates (with testing)
npm run update:major
```

---

## Environment Management

### Environment Variables Check
```bash
# Verify all required vars
npm run env:check

# Required variables:
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_JWT_SECRET
OPENAI_API_KEY
SQUARE_ACCESS_TOKEN
FRONTEND_URL
PIN_PEPPER
DEVICE_FINGERPRINT_SALT
SENTRY_DSN
REDIS_URL
```

### Secrets Rotation (Quarterly)
1. Generate new secrets
2. Update in AWS Secrets Manager
3. Deploy to staging first
4. Monitor for 24h
5. Deploy to production
6. Archive old secrets

---

## Performance Optimization

### When to Optimize
- Response time >500ms consistently
- Memory usage >80%
- Database queries >1s
- Bundle size >150KB

### Quick Wins
```bash
# 1. Clear Redis cache
redis-cli FLUSHALL

# 2. Optimize database
npm run db:optimize

# 3. Restart services
pm2 restart all

# 4. Enable CDN caching
npm run cdn:purge
npm run cdn:warm
```

---

## Disaster Recovery

### Backup Locations
- **Database**: S3 bucket `s3://restaurant-os-backups/db/`
- **Code**: GitHub + AWS CodeCommit mirror
- **Configs**: AWS Secrets Manager
- **Media**: S3 bucket `s3://restaurant-os-media/`

### Recovery Procedures

#### Database Corruption
```bash
# 1. Stop application
pm2 stop all

# 2. Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d restaurant_os backup.sql

# 3. Verify data integrity
npm run db:verify

# 4. Restart application
pm2 start all
```

#### Complete System Recovery
```bash
# Use Infrastructure as Code
terraform apply -auto-approve

# Deploy application
npm run deploy:production

# Restore data
npm run restore:all
```

---

## Security Procedures

### Suspected Breach
1. **Immediate**: Rotate all secrets
2. **Investigate**: Check audit logs
3. **Contain**: Block suspicious IPs
4. **Communicate**: Notify security team
5. **Remediate**: Patch vulnerabilities

### Regular Security Tasks
- **Daily**: Review auth failures
- **Weekly**: Check for CVEs
- **Monthly**: Penetration test (staging)
- **Quarterly**: Full security audit

---

## Team Contacts

### On-Call Rotation
- **Week 1**: Alice (primary), Bob (backup)
- **Week 2**: Bob (primary), Charlie (backup)
- **Week 3**: Charlie (primary), Alice (backup)
- **Week 4**: Rotation repeats

### Emergency Contacts
| Role | Name | Phone | Email |
|------|------|-------|-------|
| CTO | John Doe | +1-XXX-XXX-XXXX | cto@restaurant-os.com |
| DevOps Lead | Jane Smith | +1-XXX-XXX-XXXX | devops@restaurant-os.com |
| Security | Sam Wilson | +1-XXX-XXX-XXXX | security@restaurant-os.com |
| Database Admin | Pat Brown | +1-XXX-XXX-XXXX | dba@restaurant-os.com |

### External Support
- **Supabase**: support@supabase.com
- **Square**: https://squareup.com/help
- **OpenAI**: https://help.openai.com
- **AWS**: Premium Support Console

---

## Useful Commands Reference

```bash
# Logs
pm2 logs restaurant-os --lines 1000
tail -f /var/log/restaurant-os/error.log

# Database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';"

# Redis
redis-cli INFO stats

# Network
netstat -tulpn | grep LISTEN
lsof -i :3001

# Disk
df -h
du -sh /var/log/*

# Process
ps aux | grep node
pm2 status

# Deploy
npm run deploy:staging
npm run deploy:production
npm run rollback:production
```

---

## Runbook Updates

This runbook should be updated:
- After each incident (lessons learned)
- When new features are deployed
- When monitoring thresholds change
- During quarterly review

**Last Review**: September 12, 2025  
**Next Review**: December 12, 2025

---

**Remember**: When in doubt, prioritize system stability over new features. It's better to rollback quickly than debug in production.