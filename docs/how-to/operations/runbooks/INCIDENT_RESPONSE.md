# Incident Response Playbook

**Last Updated:** 2025-11-19
**Version:** 1.0.0

[Home](../../../../index.md) > [Docs](../../../README.md) > [How-To](../../README.md) > [Operations](../../../README.md) > [Runbooks](./README.md) > Incident Response

---

## Executive Summary

This playbook defines the incident response process for Restaurant OS production incidents. Use this document during active incidents to guide your response, communication, and resolution efforts.

**Key Resources:**
- Production Dashboard: [Health Check](https://july25.onrender.com/api/health)
- Monitoring: Sentry (if configured)
- Escalation Contact: System owner
- Rollback Procedures: [Rollback Procedures - See deployment guide]

---

## Incident Severity Levels

### P0 - Critical (Complete Outage)

**Definition:** Complete service unavailability affecting all users

**Examples:**
- Complete backend API failure (all endpoints down)
- Database connection failure
- Authentication system completely broken
- Payment processing completely unavailable

**Response Time:**
- Detection to acknowledgment: 5 minutes
- Initial response: Immediate (24/7)
- Update frequency: Every 15 minutes

**Escalation:**
- Immediate notification to system owner
- Page on-call engineer immediately

**Resolution Target:** 1 hour

---

### P1 - High (Major Feature Outage)

**Definition:** Major feature unavailable or severely degraded affecting majority of users

**Examples:**
- Voice ordering system down
- Kitchen Display System (KDS) not updating
- WebSocket real-time updates failing
- Payment processing failing for all transactions
- All orders failing to create

**Response Time:**
- Detection to acknowledgment: 15 minutes
- Initial response: Within 1 hour
- Update frequency: Every 30 minutes

**Escalation:**
- Notify system owner within 15 minutes
- Page on-call engineer during business hours

**Resolution Target:** 4 hours

---

### P2 - Medium (Partial Feature Degradation)

**Definition:** Feature degradation affecting subset of users or non-critical features

**Examples:**
- Voice ordering degraded (high failure rate but some success)
- Slow API response times (>2s for critical paths)
- Payment processing intermittent failures
- Single restaurant isolation issue
- WebSocket connection instability

**Response Time:**
- Detection to acknowledgment: 1 hour
- Initial response: Within 4 hours (business hours)
- Update frequency: Daily

**Escalation:**
- Email system owner
- No immediate page required

**Resolution Target:** 1 business day

---

### P3 - Low (Minor Issues)

**Definition:** Minor issues with workarounds or affecting small user subset

**Examples:**
- Non-critical UI bugs
- Slow non-critical endpoints
- Minor data inconsistencies
- Single user authentication issues
- Performance degradation on non-critical paths

**Response Time:**
- Detection to acknowledgment: 4 hours (business hours)
- Initial response: Within 1 business day
- Update frequency: As needed

**Escalation:**
- Create ticket, no immediate notification

**Resolution Target:** 1 week

---

### P4 - Minimal (Cosmetic/Future Enhancement)

**Definition:** Cosmetic issues or feature requests

**Examples:**
- UI polish issues
- Documentation errors
- Feature enhancement requests
- Performance optimization opportunities

**Response Time:**
- Best effort

**Escalation:**
- None

**Resolution Target:** As scheduled

---

## Incident Response Process

### Phase 1: Detection & Acknowledgment

**1. Detect Incident**

Sources:
- Monitoring alerts (Sentry)
- Health check failures
- User reports
- Log analysis
- Performance monitoring

**2. Acknowledge Incident**

```bash
# Check health endpoints immediately
curl https://july25.onrender.com/api/health
curl https://july25.onrender.com/api/status
curl https://july25.onrender.com/api/ready

# Check Vercel frontend
curl https://july25-client.vercel.app/
```

**3. Create Incident Record**

Create file: `incidents/YYYY-MM-DD-HH-MM-brief-description.md`

Template:
```markdown
# Incident: [Brief Description]

**Incident ID:** INC-YYYYMMDD-HHMM
**Severity:** P[0-4]
**Started:** YYYY-MM-DD HH:MM UTC
**Status:** Investigating

## Impact
- Affected Services: [List]
- Affected Users: [All/Subset/None]
- Revenue Impact: [Yes/No]

## Timeline
- HH:MM UTC - Incident detected
- HH:MM UTC - Incident acknowledged
- HH:MM UTC - Investigation started

## Notes
[Ongoing investigation notes]
```

---

### Phase 2: Investigation

**1. Gather Information**

```bash
# Check Render logs (Backend)
# Go to: https://dashboard.render.com > Service > Logs

# Check Vercel logs (Frontend)
# Go to: https://vercel.com/dashboard > Project > Logs

# Check Supabase database
# Go to: https://app.supabase.com > Project > Database > Query Editor

# Run diagnostic query
SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour';
```

**2. Check Common Issues**

**Database Connection Issues:**
```bash
# Test database connectivity
curl https://july25.onrender.com/api/health | jq '.services.database'

# Expected: {"status":"ok","latency":<number>}
# If error: Check DATABASE_URL and SUPABASE_URL in Render env vars
```

**Authentication Issues:**
```bash
# Check JWT secret configuration
# Render Dashboard > Environment Variables
# Verify: SUPABASE_JWT_SECRET is set and matches Supabase dashboard

# Test auth endpoint
curl -X POST https://july25.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

**Payment Processing Issues:**
```bash
# Check Stripe configuration
curl https://july25.onrender.com/api/health | jq '.services.payments'

# Expected: {"status":"ok","provider":"stripe","environment":"sandbox"}
# If error: Check STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY
```

**Voice Ordering Issues:**
```bash
# Check AI service health
curl https://july25.onrender.com/api/status | jq '.services.ai'

# Expected: {"status":"healthy","provider":"openai"}
# If error: Check OPENAI_API_KEY in Render env vars
```

**3. Identify Root Cause**

Common root causes:
- Environment variable misconfiguration
- Database migration failure
- Third-party service outage (OpenAI, Stripe, Supabase)
- CORS configuration issue
- Rate limiting triggered
- Memory/resource exhaustion
- Deployment rollout issue

---

### Phase 3: Mitigation & Resolution

**Decision Tree:**

```
Is service completely down?
├─ YES → Execute emergency rollback (see ROLLBACK_PROCEDURES.md)
└─ NO → Continue investigation

Is it a configuration issue?
├─ YES → Fix environment variables in Render/Vercel dashboard
└─ NO → Continue

Is it a code bug?
├─ YES → Deploy hotfix OR rollback
└─ NO → Continue

Is it a third-party outage?
├─ YES → Enable degraded mode / fallback
└─ NO → Continue investigation
```

**Mitigation Strategies:**

**1. Quick Configuration Fix**
```bash
# Render environment variables
# 1. Go to Render Dashboard > Service > Environment
# 2. Update incorrect variables
# 3. Trigger manual deploy OR wait for auto-restart
```

**2. Emergency Rollback**
```bash
# See ROLLBACK_PROCEDURES.md for detailed steps

# Vercel (Frontend) - Rollback to previous deployment
# 1. Go to Vercel Dashboard > Deployments
# 2. Find last known good deployment
# 3. Click "..." > "Promote to Production"

# Render (Backend) - Rollback to previous commit
# 1. Go to Render Dashboard > Service > Manual Deploy
# 2. Select previous commit
# 3. Deploy
```

**3. Feature Flag Disable**
```bash
# Disable problematic features via environment variables
# Add to Vercel environment:
VITE_FEATURE_VOICE_ORDERING=false
VITE_FEATURE_REALTIME_UPDATES=false

# Trigger redeployment
vercel --prod
```

**4. Enable Degraded Mode**
```bash
# For AI/Voice issues - enable stub mode
# Render environment variable:
AI_DEGRADED_MODE=true

# For payment issues - enable demo mode
STRIPE_SECRET_KEY=demo
```

**5. Database Rollback**
```bash
# ONLY if database migration caused issue
# See ROLLBACK_PROCEDURES.md Section: Database Migration Rollback

# Local testing of rollback migration
./scripts/deploy-migration.sh supabase/migrations/<rollback_migration>.sql

# Production rollback (via GitHub Actions)
git push origin main
```

---

### Phase 4: Communication

**Internal Communication (All Severities)**

Update incident file every 15-30 minutes:
```markdown
## Timeline
- HH:MM UTC - Incident detected
- HH:MM UTC - Root cause identified: [Description]
- HH:MM UTC - Mitigation in progress: [Action]
- HH:MM UTC - Incident resolved
```

**External Communication (P0/P1 Only)**

**Initial Notification (within 15 min):**
```
Subject: [P0/P1] Restaurant OS Service Degradation

We are currently investigating [brief description of issue].

Affected: [Specific features/services]
Started: [Timestamp]
Status: Investigating

We will provide updates every [15/30] minutes.
```

**Progress Update (every 15-30 min):**
```
Subject: [P0/P1] Update: Restaurant OS Service Degradation

Update as of [Timestamp]:

Root Cause: [Description or "Still investigating"]
Mitigation: [Actions being taken]
ETA: [Estimated resolution time or "Unknown"]

Next update: [Timestamp]
```

**Resolution Notification:**
```
Subject: [RESOLVED] Restaurant OS Service Degradation

The incident affecting [services] has been resolved as of [Timestamp].

Root Cause: [Brief description]
Resolution: [What was done]
Duration: [Total time]

A post-incident review will be conducted within 48 hours.
```

---

### Phase 5: Recovery & Verification

**1. Verify Service Health**

```bash
# Health check
curl https://july25.onrender.com/api/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "server": {"status": "ok"},
    "database": {"status": "ok", "latency": <200},
    "payments": {"status": "ok"},
    "cache": {"status": "ok"}
  }
}

# Test critical paths
# 1. User authentication
# 2. Order creation
# 3. Payment processing
# 4. Kitchen display updates
# 5. Voice ordering (if applicable)
```

**2. Monitor for Recurrence**

```bash
# Watch logs for 30 minutes post-resolution
# Render: Dashboard > Logs (live tail)
# Vercel: Dashboard > Logs (live tail)

# Monitor error rates
# Check Sentry dashboard (if configured)

# Monitor performance
curl https://july25.onrender.com/api/status | jq '.services.database.latency'
# Should be < 200ms
```

**3. Update Incident Record**

```markdown
## Resolution
**Resolved:** YYYY-MM-DD HH:MM UTC
**Duration:** X hours Y minutes
**Root Cause:** [Detailed description]
**Resolution:** [Detailed description]

## Impact Assessment
- Users Affected: [Number/Percentage]
- Orders Lost: [Number]
- Revenue Impact: [$Amount]
- Downtime: [Duration]
```

---

## Post-Incident Review Process

**Required for:** P0, P1 incidents
**Timeline:** Within 48 hours of resolution
**Optional for:** P2 incidents

### 1. Schedule Review Meeting

**Attendees:**
- Incident commander
- On-call engineer
- System owner
- Relevant stakeholders

**Duration:** 1 hour

### 2. Review Template

Create file: `incidents/PIR-YYYYMMDD-brief-description.md`

```markdown
# Post-Incident Review: [Brief Description]

**Incident ID:** INC-YYYYMMDD-HHMM
**PIR Date:** YYYY-MM-DD
**Attendees:** [List]

## Incident Summary
- **Severity:** P[0-4]
- **Duration:** X hours Y minutes
- **Impact:** [Description]
- **Root Cause:** [Single sentence]

## Timeline
[Detailed timeline from incident file]

## Root Cause Analysis

### What Happened?
[Detailed description]

### Why Did It Happen?
[Contributing factors]

### Why Wasn't It Caught Earlier?
[Detection gaps]

## What Went Well?
- [List positive aspects of response]

## What Went Poorly?
- [List areas for improvement]

## Action Items

### Immediate (This Week)
- [ ] [Action] - Owner: [Name] - Due: [Date]

### Short-term (This Month)
- [ ] [Action] - Owner: [Name] - Due: [Date]

### Long-term (This Quarter)
- [ ] [Action] - Owner: [Name] - Due: [Date]

## Prevention Measures

### Monitoring Improvements
- [List new alerts/monitors to add]

### Code/Architecture Changes
- [List technical improvements]

### Process Changes
- [List process improvements]

### Documentation Updates
- [List docs to update]

## Lessons Learned
[Key takeaways for future incidents]
```

### 3. Follow-up

- Track action items in project management system
- Update runbooks based on lessons learned
- Share PIR with team
- Update monitoring/alerting as needed

---

## Common Incident Scenarios

### Scenario 1: Complete Backend Outage

**Symptoms:**
- All API endpoints return 502/503
- Health check fails
- Frontend shows "Cannot connect to server"

**Likely Causes:**
- Server process crashed
- Render deployment failed
- Database connection lost
- Out of memory

**Investigation:**
```bash
# Check Render logs for crash/error
# Check Render metrics for memory usage
# Check database health
curl https://july25.onrender.com/api/health
```

**Resolution:**
1. Check Render dashboard for deployment status
2. If deployment failed, rollback to previous version
3. If memory issue, restart service
4. If database issue, check Supabase status

---

### Scenario 2: Authentication Failures

**Symptoms:**
- Users cannot login
- "Invalid JWT" errors
- 401 Unauthorized responses

**Likely Causes:**
- SUPABASE_JWT_SECRET mismatch
- JWT secret not set in Render
- Supabase service outage

**Investigation:**
```bash
# Check JWT secret configuration
# Render > Environment > SUPABASE_JWT_SECRET

# Compare with Supabase dashboard
# Supabase > Settings > API > JWT Settings
```

**Resolution:**
1. Verify SUPABASE_JWT_SECRET matches Supabase dashboard
2. Update if mismatch
3. Restart Render service
4. Verify users can login

---

### Scenario 3: Payment Processing Failures

**Symptoms:**
- All payment attempts fail
- "Payment processing error" messages
- Health check shows payments status: "error"

**Likely Causes:**
- Invalid STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET mismatch
- Stripe API outage
- Key expired or revoked

**Investigation:**
```bash
# Check Stripe configuration
curl https://july25.onrender.com/api/health | jq '.services.payments'

# Check Render logs for Stripe API errors
# Look for: "Invalid API key" or "Webhook signature verification failed"
```

**Resolution:**
1. Verify STRIPE_SECRET_KEY is valid in Stripe dashboard
2. Verify STRIPE_WEBHOOK_SECRET matches webhook settings
3. Check Stripe API status page
4. Enable demo mode as temporary workaround: `STRIPE_SECRET_KEY=demo`
5. Contact Stripe support if API issue

---

### Scenario 4: Voice Ordering System Down

**Symptoms:**
- Voice ordering button not working
- "AI service unavailable" errors
- Health check shows AI status: "unhealthy"

**Likely Causes:**
- Invalid OPENAI_API_KEY
- OpenAI API quota exceeded
- OpenAI API outage
- OpenAI API key revoked

**Investigation:**
```bash
# Check AI service health
curl https://july25.onrender.com/api/status | jq '.services.ai'

# Check Render logs for OpenAI errors
# Look for: "Invalid API key" or "Rate limit exceeded"
```

**Resolution:**
1. Verify OPENAI_API_KEY is valid
2. Check OpenAI usage dashboard for quota
3. Check OpenAI status page
4. Enable AI degraded mode as temporary workaround: `AI_DEGRADED_MODE=true`
5. Disable voice ordering feature flag: `VITE_FEATURE_VOICE_ORDERING=false`

---

### Scenario 5: WebSocket Connection Failures

**Symptoms:**
- Kitchen displays not updating
- Real-time order updates not working
- "WebSocket connection failed" errors

**Likely Causes:**
- WebSocket authentication failing
- CORS configuration blocking WebSocket
- WebSocket server crashed
- Proxy/firewall blocking WebSocket

**Investigation:**
```bash
# Check WebSocket endpoint
# Browser console: Check for WebSocket errors

# Verify JWT authentication
# Server logs: Look for "WebSocket authentication failed"

# Check CORS configuration
# Server logs: Look for CORS errors
```

**Resolution:**
1. Verify WebSocket authentication logic
2. Check CORS allowedOrigins includes frontend URL
3. Restart backend service
4. Verify WebSocket connections in health check

---

### Scenario 6: Database Migration Failure

**Symptoms:**
- Deployment succeeds but queries fail
- "Column does not exist" errors
- "Relation does not exist" errors

**Likely Causes:**
- Migration syntax error
- Migration not applied
- Prisma schema out of sync

**Investigation:**
```bash
# Check which migrations are applied
# Supabase Dashboard > Database > Migrations

# Check Render logs for migration errors
# Look for: "Migration failed" or "Syntax error"

# Test migration locally
./scripts/deploy-migration.sh supabase/migrations/<migration>.sql
```

**Resolution:**
1. Create rollback migration (see ROLLBACK_PROCEDURES.md)
2. Deploy rollback migration
3. Fix original migration
4. Re-deploy fixed migration
5. Sync Prisma schema: `./scripts/post-migration-sync.sh`

---

## Escalation Paths

### L1 - On-Call Engineer (First Response)

**Responsibilities:**
- Acknowledge incident within SLA
- Perform initial investigation
- Attempt standard remediation
- Escalate if needed

**Authority:**
- Execute documented runbooks
- Restart services
- Rollback deployments
- Enable feature flags
- Update environment variables

**Escalate to L2 if:**
- Issue not resolved within 1 hour (P0/P1)
- Root cause unknown
- Requires code changes
- Affects multiple services

---

### L2 - System Owner (Escalation)

**Responsibilities:**
- Deep investigation
- Code changes/hotfixes
- Architecture decisions
- External vendor coordination

**Authority:**
- Deploy hotfixes
- Change system architecture
- Contact vendors (Stripe, OpenAI, Supabase)
- Declare extended outage

**Escalate to L3 if:**
- Vendor outage requiring business decision
- Security incident
- Data loss incident
- Legal/compliance impact

---

### L3 - Executive (Business Decision)

**Responsibilities:**
- Business continuity decisions
- Customer communication
- Legal/compliance
- Vendor escalation

**Authority:**
- Business decisions
- Customer compensation
- Legal consultation
- Public statements

---

## Tools & Resources

### Monitoring & Logs

- **Render Backend Logs:** https://dashboard.render.com
- **Vercel Frontend Logs:** https://vercel.com/dashboard
- **Supabase Database Logs:** https://app.supabase.com
- **Sentry (if configured):** [Your Sentry URL]

### Health Checks

- **Backend Health:** https://july25.onrender.com/api/health
- **Backend Status:** https://july25.onrender.com/api/status
- **Backend Readiness:** https://july25.onrender.com/api/ready
- **Frontend:** https://july25-client.vercel.app/

### External Status Pages

- **Supabase:** https://status.supabase.com
- **Stripe:** https://status.stripe.com
- **OpenAI:** https://status.openai.com
- **Render:** https://status.render.com
- **Vercel:** https://vercel-status.com

### Documentation

- **Deployment Guide:** [/docs/how-to/operations/DEPLOYMENT.md](../DEPLOYMENT.md)
- **Rollback Procedures:** [Rollback Procedures - See deployment guide]
- **Production Monitoring:** [Monitoring Guide - See deployment guide]

---

## Incident Response Checklist

Use this checklist during active incidents:

### Detection Phase
- [ ] Incident detected and acknowledged
- [ ] Severity level determined (P0-P4)
- [ ] Incident file created
- [ ] Appropriate stakeholders notified

### Investigation Phase
- [ ] Health checks performed
- [ ] Logs reviewed (Render, Vercel, Supabase)
- [ ] Affected services identified
- [ ] Impact scope determined
- [ ] Root cause identified (or investigating)

### Mitigation Phase
- [ ] Mitigation strategy selected
- [ ] Mitigation deployed
- [ ] Service health verified
- [ ] Monitoring for recurrence

### Communication Phase
- [ ] Initial notification sent (P0/P1)
- [ ] Progress updates sent (per SLA)
- [ ] Resolution notification sent
- [ ] Incident timeline documented

### Recovery Phase
- [ ] All services verified healthy
- [ ] Critical paths tested
- [ ] Monitoring confirmed normal
- [ ] Incident file updated with resolution

### Post-Incident Phase
- [ ] Post-incident review scheduled (P0/P1)
- [ ] Action items identified
- [ ] Documentation updated
- [ ] Prevention measures implemented

---

## Contact Information

**On-Call Engineer:**
- Email: [on-call email]
- Phone: [on-call phone]
- Slack: [on-call slack]

**System Owner:**
- Email: [owner email]
- Phone: [owner phone]
- Slack: [owner slack]

**Vendor Support:**
- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com
- OpenAI Support: https://help.openai.com
- Render Support: https://render.com/support
- Vercel Support: https://vercel.com/support

---

## Appendix: Incident Classifications

### Service Level Objectives (SLOs)

**Availability Targets:**
- Overall System: 99.9% uptime (43 minutes downtime/month)
- Authentication: 99.95% uptime
- Order Creation: 99.9% uptime
- Payment Processing: 99.5% uptime
- Voice Ordering: 99.0% uptime

**Performance Targets:**
- API Response Time (p95): < 200ms
- Database Query Time (p95): < 100ms
- Page Load Time (p95): < 2s
- WebSocket Message Latency: < 500ms

**Error Rate Targets:**
- Overall Error Rate: < 1%
- Payment Error Rate: < 2%
- Authentication Error Rate: < 0.5%

### Severity Impact Matrix

| Severity | Users Affected | Revenue Impact | SLO Impact | Example |
|----------|---------------|----------------|------------|---------|
| P0 | 100% | High | > 99.9% breach | Complete outage |
| P1 | > 50% | Medium-High | Approaching breach | Major feature down |
| P2 | 10-50% | Low-Medium | Within SLO | Intermittent issues |
| P3 | < 10% | Low | Within SLO | Minor bugs |
| P4 | Minimal | None | N/A | Cosmetic issues |

---

**Document Version:** 1.0.0
**Last Reviewed:** 2025-11-19
**Next Review:** 2025-12-19 (Monthly)
**Owner:** System Owner
