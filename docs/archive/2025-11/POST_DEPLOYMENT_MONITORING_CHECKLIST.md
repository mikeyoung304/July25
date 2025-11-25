# Post-Deployment Monitoring Checklist
## P0 Security Fixes - November 21, 2025

**Deployment Time:** 2025-11-21 18:30 EST
**Next Review:** 2025-11-22 18:30 EST (24 hours)

---

## 🚨 Critical Metrics (Check Every 4 Hours)

### 1. HTTP 403 Forbidden Errors
**Query:** Check production logs for `Restaurant access denied`

**Expected Behavior:**
- ✅ 20-50 occurrences/hour (legitimate rejections)
- ✅ Consistent pattern across hours
- ❌ >200/hour → INVESTIGATE

**Command:**
```bash
# Check Render logs
# Look for: "error: 'Restaurant access denied'"
# Group by endpoint and count
```

**Action if Alert:**
- Identify which endpoints have highest 403 rate
- Check if specific users/IPs affected
- Verify client is sending `x-restaurant-id` header
- Review recent code changes to those endpoints

---

### 2. HTTP 500 Internal Server Errors
**Query:** Count 500 errors by endpoint

**Expected Behavior:**
- ✅ <5 occurrences/hour (baseline unchanged)
- ❌ >20/hour → CRITICAL ISSUE

**Command:**
```bash
# Check Render error logs
# Filter for: status=500
# Group by endpoint
```

**Action if Alert:**
- Check if errors correlate with specific restaurants
- Review error stack traces for Prisma errors
- Verify database connection pool healthy
- Consider rollback if error rate >5% of traffic

---

### 3. Security Audit Log Activity
**Query:** Check security_audit_logs table for new records

**Expected Behavior:**
- ✅ 0-5 records/day initially
- ✅ event_type shows legitimate rejections
- ❌ >100/day → POTENTIAL ATTACK

**Command:**
```sql
-- Run every 4 hours
SELECT
  event_type,
  severity,
  COUNT(*) as count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM security_audit_logs
WHERE created_at > NOW() - INTERVAL '4 hours'
GROUP BY event_type, severity
ORDER BY count DESC;
```

**Action if Alert:**
- Identify patterns (same user, IP, restaurant)
- Check if legitimate traffic or attack
- Review user_agent strings for automation
- Consider rate limiting if attack confirmed

---

## ⚠️ Warning Signs (Check Daily)

### 4. Database Performance
**Query:** Check query latency on security_audit_logs table

**Expected Behavior:**
- ✅ p95 latency <50ms for inserts
- ✅ p95 latency <100ms for selects
- ❌ >500ms → PERFORMANCE ISSUE

**Command:**
```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'security_audit_logs'
ORDER BY idx_scan DESC;
```

**Action if Slow:**
- Review slow query log for table
- Check if indexes being used (idx_scan > 0)
- Consider adding covering indexes
- Monitor foreign key constraint overhead

---

### 5. Foreign Key Constraint Violations
**Query:** Check for constraint errors in database logs

**Expected Behavior:**
- ✅ 0 violations (schema prevents invalid data)
- ❌ >0 violations → DATA INTEGRITY ISSUE

**Command:**
```sql
-- Check PostgreSQL logs for constraint errors
-- Look for: "violates foreign key constraint"
-- Specific constraints:
--   - fk_security_audit_authenticated_restaurant
--   - fk_security_audit_attempted_restaurant
```

**Action if Violations:**
- Identify source of invalid restaurant_ids
- Check if application code bypassing validation
- Review recent data imports/migrations
- Fix data source before removing constraint

---

### 6. Test Suite Status
**Current Status:** 34/63 passing (54%)

**Expected Progress:**
- ✅ Day 1: Identified failures (completed)
- ✅ Day 2-3: Test fixtures updated
- ✅ Day 7: >90% pass rate
- ❌ Day 14: Still <80% → BLOCKING ISSUE

**Command:**
```bash
npm run test:server -- tables.routes.security.test.ts
npm run test:server -- ai.routes.security.test.ts
```

**Action if Not Improving:**
- Prioritize test stabilization to P0
- Assign dedicated developer time
- Consider quarantining flaky tests
- Block PRs touching security routes until tests pass

---

## ✅ Success Indicators (24-Hour Review)

### Hour 4 Checkpoint (Nov 21, 22:30 EST)
- [ ] 403 errors appearing in logs (10-50 count)
- [ ] 500 errors stable at baseline (<20 count)
- [ ] Security audit logs empty or <5 records
- [ ] No customer escalations about access issues

### Hour 12 Checkpoint (Nov 22, 06:30 EST)
- [ ] 403 pattern consistent with hour 4
- [ ] Database query latency within expected range
- [ ] No foreign key constraint violations
- [ ] Render health check passing

### Hour 24 Checkpoint (Nov 22, 18:30 EST)
- [ ] Total 403s: 480-1200 (expected range)
- [ ] Total 500s: <120 (baseline maintained)
- [ ] Security audit logs: <10 records total
- [ ] No rollback required
- [ ] Test suite improvement plan started

**If All Checkpoints Pass:** Deployment considered successful, move to weekly monitoring.

---

## 🔧 Quick Reference Commands

### Check Prisma Client Status
```bash
npx prisma generate
# Should complete without errors
# Verify types include new relations
```

### Verify Foreign Keys in Production
```bash
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'security_audit_logs'::regclass AND contype = 'f';"
```

### Check Recent Security Audit Events
```bash
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT * FROM security_audit_logs ORDER BY created_at DESC LIMIT 10;"
```

### Monitor 403 Error Rate
```bash
# In Render dashboard:
# Logs → Filter by "Restaurant access denied"
# Analytics → HTTP Status Codes → 403
```

---

## 🚨 Escalation Procedure

### Level 1: Warning (Yellow)
**Trigger:** Single metric outside expected range
**Response Time:** 1 hour
**Actions:**
1. Gather diagnostic data
2. Check for related metrics
3. Document in incident log
4. Continue monitoring

### Level 2: Alert (Orange)
**Trigger:** Multiple metrics outside range OR single critical metric
**Response Time:** 15 minutes
**Actions:**
1. Page on-call engineer
2. Start incident response process
3. Prepare rollback plan
4. Notify stakeholders

### Level 3: Critical (Red)
**Trigger:** Production outage OR data integrity issue
**Response Time:** Immediate
**Actions:**
1. Execute rollback immediately
2. Page senior engineering leadership
3. Activate war room
4. Document timeline for post-mortem

**Rollback Decision Matrix:**
| Symptom | Threshold | Action |
|---------|-----------|--------|
| 500 errors | >5% of traffic | Rollback code |
| 403 errors | >1000/hour | Investigate (expected) |
| Data loss | Any occurrence | Rollback database |
| Customer escalations | >10 in 1 hour | Rollback code |
| Performance | >50% degradation | Investigate, rollback if DB |

---

## 📊 Monitoring Dashboard URLs

**Render (Application):**
- Health: https://dashboard.render.com/web/[service-id]
- Logs: https://dashboard.render.com/web/[service-id]/logs
- Metrics: https://dashboard.render.com/web/[service-id]/metrics

**Supabase (Database):**
- Dashboard: https://supabase.com/dashboard/project/xiwfhcikfdoshxwbtjxt
- Logs: https://supabase.com/dashboard/project/xiwfhcikfdoshxwbtjxt/logs/postgres-logs
- Performance: https://supabase.com/dashboard/project/xiwfhcikfdoshxwbtjxt/reports/query-performance

---

## 📝 Incident Log Template

Use this template if any issues arise:

```
## Incident: [Brief Description]
**Time Detected:** [Timestamp]
**Severity:** [Yellow/Orange/Red]
**Detected By:** [Monitoring/User Report]

### Symptoms
- [Metric 1]: [Value] (expected: [Range])
- [Metric 2]: [Value] (expected: [Range])

### Timeline
- [HH:MM] - Issue detected
- [HH:MM] - Investigation started
- [HH:MM] - Root cause identified
- [HH:MM] - Fix applied
- [HH:MM] - Verification complete

### Root Cause
[Description of what caused the issue]

### Resolution
[What was done to fix it]

### Prevention
[What will prevent this in the future]

### Related Commits
- Code: [commit hash]
- Migration: [commit hash]
```

---

## 📅 Weekly Review Checklist (After 7 Days)

**Review Date:** November 28, 2025

- [ ] Analyze 7-day trend of 403 errors
- [ ] Review all security_audit_logs entries
- [ ] Check database query performance metrics
- [ ] Verify test suite at >90% pass rate
- [ ] Update documentation with lessons learned
- [ ] Plan performance optimizations if needed
- [ ] Schedule post-deployment retrospective

---

**Monitoring Owner:** TBD
**Backup Contact:** TBD
**Escalation Path:** TBD

**Last Updated:** 2025-11-21 18:30 EST
