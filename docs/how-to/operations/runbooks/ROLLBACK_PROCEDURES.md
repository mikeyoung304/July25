# Rollback Procedures

**Last Updated:** 2025-11-19
**Version:** 1.0.0

[Home](../../../../index.md) > [Docs](../../../README.md) > [How-To](../../README.md) > [Operations](../../../README.md) > [Runbooks](./README.md) > Rollback Procedures

---

## Executive Summary

This document provides step-by-step procedures for rolling back deployments, database migrations, and feature flags in Restaurant OS production environments. Use these procedures during incidents to quickly restore service.

**Critical Principles:**
1. **Speed over perfection** - Rollback first, investigate later
2. **Verify before proceeding** - Test each step
3. **Document everything** - Note what you did and why
4. **Communicate status** - Update stakeholders frequently

**Rollback Decision Matrix:**

| Incident Severity | Rollback Type | Time Constraint |
|------------------|---------------|-----------------|
| P0 - Complete outage | Full rollback | < 5 minutes |
| P1 - Major feature down | Service rollback | < 15 minutes |
| P2 - Degraded performance | Feature flag disable | < 30 minutes |
| P3 - Minor issue | Investigate first | No rush |

---

## Table of Contents

1. [Emergency Rollback Quick Reference](#emergency-rollback-quick-reference)
2. [Frontend Rollback (Vercel)](#frontend-rollback-vercel)
3. [Backend Rollback (Render)](#backend-rollback-render)
4. [Database Migration Rollback](#database-migration-rollback)
5. [Feature Flag Management](#feature-flag-management)
6. [Environment Variable Rollback](#environment-variable-rollback)
7. [Emergency Shutdown Procedures](#emergency-shutdown-procedures)
8. [Post-Rollback Verification](#post-rollback-verification)
9. [Rollback Troubleshooting](#rollback-troubleshooting)

---

## Emergency Rollback Quick Reference

### 5-Minute Complete Rollback (P0 Incidents)

**Use when:** Complete system outage, all users affected

**Steps:**
```bash
# 1. Rollback Frontend (Vercel) - 1 minute
# Go to: https://vercel.com/dashboard
# Click: Deployments > Last working deployment > "..." > Promote to Production

# 2. Rollback Backend (Render) - 2 minutes
# Go to: https://dashboard.render.com
# Click: Service > Manual Deploy > Select previous commit > Deploy

# 3. Verify - 2 minutes
curl https://july25.onrender.com/api/health
curl https://july25-client.vercel.app/

# Expected: Both return 200 OK
```

**Communication Template:**
```
[P0] Emergency rollback executed
- Frontend: Rolled back to [deployment-id]
- Backend: Rolled back to [commit-sha]
- Status: Verifying service health
- ETA: 5 minutes
```

---

### 15-Minute Service Rollback (P1 Incidents)

**Use when:** Major feature broken, service degraded

**Steps:**
```bash
# 1. Identify last known good version
git log --oneline -20  # Review recent commits

# 2. Rollback affected service only
# See service-specific sections below

# 3. Disable problematic feature flag (if applicable)
# See Feature Flag Management section

# 4. Verify critical paths
./scripts/verify-production.sh  # If exists
```

---

## Frontend Rollback (Vercel)

### Method 1: Dashboard Rollback (Recommended)

**Time:** 1-2 minutes
**Risk:** Low (instant rollback)

**Steps:**

1. **Access Vercel Dashboard**
   ```
   URL: https://vercel.com/dashboard
   Navigate to: Your Project > Deployments
   ```

2. **Find Last Known Good Deployment**
   - Review recent deployments
   - Look for deployment before incident started
   - Check deployment status (should be "Ready")
   - Note: Deployment timestamp and commit SHA

3. **Promote to Production**
   ```
   1. Click "..." menu next to deployment
   2. Select "Promote to Production"
   3. Confirm promotion
   ```

4. **Verify Rollback**
   ```bash
   # Check deployment is live
   curl https://july25-client.vercel.app/

   # Expected: Returns 200 OK with HTML content
   ```

**Rollback Time:** 30-60 seconds

---

### Method 2: CLI Rollback

**Time:** 2-3 minutes
**Risk:** Low
**Requires:** Vercel CLI installed

**Steps:**

```bash
# 1. List recent deployments
vercel ls

# Output example:
# Age  Deployment                           State    URL
# 5m   july25-client-abc123.vercel.app     READY    https://july25-client.vercel.app
# 2h   july25-client-xyz789.vercel.app     READY    https://july25-client-xyz789.vercel.app

# 2. Promote specific deployment
vercel promote july25-client-xyz789.vercel.app --yes

# 3. Verify
curl https://july25-client.vercel.app/
```

---

### Method 3: Git-Based Rollback

**Time:** 5-10 minutes
**Risk:** Medium (triggers new build)
**Use when:** Dashboard/CLI not available

**Steps:**

```bash
# 1. Find last known good commit
git log --oneline -20

# Example output:
# a1b2c3d fix: broken feature
# d4e5f6g feat: add new feature  <-- This broke production
# g7h8i9j fix: minor bug        <-- Last known good

# 2. Revert to last known good
git revert d4e5f6g  # Revert the breaking commit

# OR create revert commit
git revert --no-commit d4e5f6g
git commit -m "revert: rollback breaking feature (incident INC-20251119)"

# 3. Push to trigger deployment
git push origin main

# 4. Monitor Vercel deployment
# Watch: https://vercel.com/dashboard > Deployments

# 5. Wait for build completion (2-5 minutes)

# 6. Verify
curl https://july25-client.vercel.app/
```

**Rollback Time:** 5-10 minutes (includes build time)

---

### Frontend Rollback Verification

**Checklist:**
```bash
# 1. Site loads
curl -f https://july25-client.vercel.app/ || echo "FAIL"

# 2. API connectivity
# Browser console: Check for API errors

# 3. Authentication works
# Test: Login with demo credentials

# 4. Critical paths work
# Test: View menu, add item to cart

# 5. No console errors
# Browser console: Check for JavaScript errors
```

---

## Backend Rollback (Render)

### Method 1: Manual Deploy from Dashboard (Recommended)

**Time:** 2-5 minutes
**Risk:** Low

**Steps:**

1. **Access Render Dashboard**
   ```
   URL: https://dashboard.render.com
   Navigate to: Service (july25) > Manual Deploy
   ```

2. **Find Last Known Good Commit**
   ```
   # In Render dashboard, review:
   - Deployment history
   - Commit messages
   - Deployment timestamps

   # Match with Git history
   git log --oneline -20
   ```

3. **Deploy Previous Commit**
   ```
   1. Click "Manual Deploy"
   2. Select branch: main
   3. Select commit: [last known good SHA]
   4. Click "Deploy"
   ```

4. **Monitor Deployment**
   ```
   # Watch deployment logs in Render dashboard
   # Typical deployment time: 2-3 minutes

   # Look for:
   - "Build succeeded"
   - "Deploy succeeded"
   - "Your service is live"
   ```

5. **Verify Service Health**
   ```bash
   # Wait for deployment to complete, then:
   curl https://july25.onrender.com/api/health

   # Expected response:
   {
     "status": "healthy",
     "services": {
       "server": {"status": "ok"},
       "database": {"status": "ok"}
     }
   }
   ```

**Rollback Time:** 3-5 minutes

---

### Method 2: Git Revert and Push

**Time:** 5-10 minutes
**Risk:** Medium (triggers CI/CD)

**Steps:**

```bash
# 1. Identify breaking commit
git log --oneline -20

# Example:
# a1b2c3d fix: update payment logic
# d4e5f6g feat: new voice ordering  <-- Breaking change
# g7h8i9j fix: auth bug            <-- Last known good

# 2. Create revert commit
git revert d4e5f6g

# Commit message template:
# revert: rollback voice ordering feature (INC-20251119-1200)
#
# This reverts commit d4e5f6g.
#
# Reason: Voice ordering causing P0 incident
# Incident: INC-20251119-1200
# Rollback by: [Your name]

# 3. Push to trigger auto-deployment
git push origin main

# 4. Monitor GitHub Actions
# URL: https://github.com/your-org/your-repo/actions

# 5. Monitor Render deployment
# URL: https://dashboard.render.com

# 6. Verify deployment
curl https://july25.onrender.com/api/health
```

**Rollback Time:** 5-10 minutes (includes CI/CD pipeline)

---

### Method 3: Emergency Restart

**Time:** 1-2 minutes
**Risk:** High (temporary outage during restart)
**Use when:** Service hung, not responding

**Steps:**

1. **Restart via Render Dashboard**
   ```
   1. Go to: https://dashboard.render.com
   2. Click: Service > Manual Deploy > Restart
   3. Confirm restart
   ```

2. **Wait for Service to Start**
   ```
   # Typically 30-60 seconds
   # Watch logs in Render dashboard
   ```

3. **Verify Health**
   ```bash
   curl https://july25.onrender.com/api/health
   ```

**Note:** This does NOT rollback code, only restarts the service. Use only if service is hung.

---

### Backend Rollback Verification

**Checklist:**
```bash
# 1. Health check passes
curl https://july25.onrender.com/api/health

# Expected: {"status":"healthy"}

# 2. Database connectivity
curl https://july25.onrender.com/api/health | jq '.services.database.status'

# Expected: "ok"

# 3. Authentication works
curl -X POST https://july25.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo"}'

# Expected: Returns token

# 4. Order creation works
# Test via frontend or API

# 5. Payment processing works
curl https://july25.onrender.com/api/health | jq '.services.payments.status'

# Expected: "ok"
```

---

## Database Migration Rollback

**CRITICAL:** Database rollbacks are high-risk. Always backup before rollback.

### Pre-Rollback Checklist

**Before executing database rollback:**
- [ ] Incident severity is P0 or P1
- [ ] Migration is confirmed as root cause
- [ ] Database backup is recent (< 24 hours)
- [ ] Rollback migration has been tested locally
- [ ] Stakeholders are notified
- [ ] Rollback window is scheduled (low traffic)

---

### Method 1: Rollback Migration (Recommended)

**Time:** 5-15 minutes
**Risk:** Medium (requires rollback migration file)

**Steps:**

1. **Create Rollback Migration**
   ```bash
   # Template: supabase/migrations/YYYYMMDDHHMMSS_rollback_<description>.sql

   # Example: Rolling back payment_fields addition
   # File: supabase/migrations/20251119120000_rollback_add_payment_fields.sql

   -- Rollback migration for 20251029155239_add_payment_fields_to_orders.sql

   -- Drop new columns
   ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
   ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
   ALTER TABLE orders DROP COLUMN IF EXISTS payment_id;

   -- Drop new indexes
   DROP INDEX IF EXISTS idx_orders_payment_status;

   -- Update RPC function (if modified)
   CREATE OR REPLACE FUNCTION create_order(...)
   RETURNS uuid AS $$
   -- Previous version of function
   $$ LANGUAGE plpgsql;

   -- Add comment
   COMMENT ON TABLE orders IS 'Rolled back payment fields migration on 2025-11-19';
   ```

2. **Test Rollback Migration Locally**
   ```bash
   # Apply rollback migration to local database
   ./scripts/deploy-migration.sh supabase/migrations/20251119120000_rollback_add_payment_fields.sql

   # Verify schema
   psql $DATABASE_URL -c "\d orders"

   # Test application locally
   npm run dev
   # Test critical paths: auth, order creation, payments
   ```

3. **Deploy Rollback Migration to Production**
   ```bash
   # Commit rollback migration
   git add supabase/migrations/20251119120000_rollback_add_payment_fields.sql
   git commit -m "migration: rollback payment fields (INC-20251119-1200)"

   # Push to trigger GitHub Actions migration workflow
   git push origin main

   # Monitor GitHub Actions
   # URL: https://github.com/your-org/your-repo/actions
   # Workflow: .github/workflows/deploy-migrations.yml
   ```

4. **Sync Prisma Schema**
   ```bash
   # After rollback migration is applied
   ./scripts/post-migration-sync.sh

   # This will:
   # 1. Pull schema from database
   # 2. Update prisma/schema.prisma
   # 3. Generate Prisma client
   ```

5. **Commit Prisma Schema Changes**
   ```bash
   git add prisma/schema.prisma
   git commit -m "chore: sync Prisma schema after rollback migration"
   git push origin main
   ```

**Rollback Time:** 10-15 minutes

---

### Method 2: Manual SQL Rollback (Emergency)

**Time:** 2-5 minutes
**Risk:** HIGH (manual SQL, can cause data loss)
**Use when:** Rollback migration not available, P0 incident

**Steps:**

1. **Access Supabase SQL Editor**
   ```
   URL: https://app.supabase.com
   Navigate to: Project > SQL Editor
   ```

2. **Create Backup Query**
   ```sql
   -- ALWAYS backup before manual changes
   -- Example: Backup orders table
   CREATE TABLE orders_backup_20251119 AS
   SELECT * FROM orders;

   -- Verify backup
   SELECT COUNT(*) FROM orders_backup_20251119;
   ```

3. **Execute Rollback SQL**
   ```sql
   -- Example: Remove payment_method column
   ALTER TABLE orders DROP COLUMN payment_method;

   -- Verify
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'orders';
   ```

4. **Test Application**
   ```bash
   # Immediately test critical paths
   curl https://july25.onrender.com/api/health

   # Test order creation
   # Use frontend or API
   ```

**WARNING:** Manual SQL bypasses migration tracking. You MUST create a corresponding migration file afterward:

```bash
# After manual rollback, create migration file
cat > supabase/migrations/20251119120000_rollback_manual.sql <<EOF
-- Manual rollback executed on 2025-11-19 12:00 UTC
-- Original change: Added payment_method column
-- Rollback: Removed payment_method column

ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;

-- This migration documents manual change in production
-- for migration history tracking
EOF

git add supabase/migrations/20251119120000_rollback_manual.sql
git commit -m "migration: document manual rollback of payment_method"
git push origin main
```

---

### Method 3: Point-in-Time Recovery (Last Resort)

**Time:** 30-60 minutes
**Risk:** VERY HIGH (data loss, complete restore)
**Use when:** Catastrophic migration failure, data corruption

**CRITICAL:** This will restore the ENTIRE database to a previous point in time. All data changes after that point will be LOST.

**Steps:**

1. **Confirm Point-in-Time Recovery Required**
   - [ ] Migration caused data corruption
   - [ ] No rollback migration possible
   - [ ] Manual rollback failed
   - [ ] Stakeholders approve data loss
   - [ ] Backup point identified (timestamp)

2. **Execute Point-in-Time Recovery**
   ```
   1. Go to: Supabase Dashboard > Database > Backups
   2. Select backup before migration
   3. Click "Restore"
   4. Confirm restore (IRREVERSIBLE)
   5. Wait for restore (10-30 minutes)
   ```

3. **Update Application**
   ```bash
   # After restore, may need to rollback application code
   # to match database schema

   # Find commit before migration
   git log --oneline --grep="migration"

   # Rollback to that commit
   git revert <commit-sha>
   git push origin main
   ```

4. **Verify and Communicate**
   ```bash
   # Verify database health
   curl https://july25.onrender.com/api/health

   # Communicate data loss
   # Inform stakeholders of restore point and data loss
   ```

**Recovery Time:** 30-60 minutes (plus application rollback)

---

### Database Rollback Verification

**Checklist:**
```bash
# 1. Migration history is correct
# Supabase Dashboard > Database > Migrations
# Verify rollback migration is listed

# 2. Schema matches expectations
psql $DATABASE_URL -c "\d orders"

# 3. Prisma schema is synced
git status  # Should show no changes after sync

# 4. Application starts without errors
# Check Render logs for startup errors

# 5. Critical queries work
curl https://july25.onrender.com/api/v1/orders

# 6. No schema-related errors in logs
# Check Render logs for "column does not exist" errors
```

---

## Feature Flag Management

**Purpose:** Disable problematic features without code rollback

**Feature Flag System:** Environment variable based (VITE_FEATURE_*)

### Disable Feature via Vercel Dashboard

**Time:** 2-3 minutes
**Risk:** Low

**Steps:**

1. **Access Vercel Environment Variables**
   ```
   URL: https://vercel.com/dashboard
   Navigate to: Project > Settings > Environment Variables
   ```

2. **Add/Update Feature Flag**
   ```
   Variable Name: VITE_FEATURE_<FEATURE_NAME>
   Value: false
   Environment: Production

   Example:
   VITE_FEATURE_VOICE_ORDERING=false
   VITE_FEATURE_REALTIME_UPDATES=false
   ```

3. **Trigger Redeployment**
   ```
   Method 1: Vercel Dashboard
   - Go to: Deployments
   - Click: "Redeploy" on latest deployment

   Method 2: CLI
   vercel --prod
   ```

4. **Verify Feature Disabled**
   ```bash
   # Check frontend
   # Feature should not be visible/functional

   # Check browser console
   # Should see: "Feature VOICE_ORDERING is disabled"
   ```

**Rollback Time:** 3-5 minutes (includes build)

---

### Available Feature Flags

| Flag Name | Purpose | Default | Impact |
|-----------|---------|---------|--------|
| VITE_FEATURE_VOICE_ORDERING | Voice ordering | true | Removes voice order button |
| VITE_FEATURE_REALTIME_UPDATES | WebSocket updates | true | Disables real-time KDS updates |
| VITE_USE_MOCK_DATA | Mock data mode | false | Uses mock data instead of API |
| VITE_DEBUG_VOICE | Voice debugging | false | Enables voice debug logging |

---

### Backend Feature Flags (Render)

**Time:** 3-5 minutes
**Risk:** Low

**Steps:**

1. **Access Render Environment Variables**
   ```
   URL: https://dashboard.render.com
   Navigate to: Service > Environment
   ```

2. **Add/Update Feature Flag**
   ```
   Variable Name: <FEATURE_FLAG_NAME>
   Value: false

   Example:
   AI_DEGRADED_MODE=true  # Disables AI features
   SQUARE_ACCESS_TOKEN=demo  # Demo mode for payments
   ```

3. **Service Auto-Restarts**
   ```
   # Render automatically restarts service when env vars change
   # Monitor: Dashboard > Logs
   # Wait: 1-2 minutes for restart
   ```

4. **Verify Feature Disabled**
   ```bash
   curl https://july25.onrender.com/api/status | jq '.services.ai'

   # If AI_DEGRADED_MODE=true, expect:
   # {"status":"degraded","provider":"stubs"}
   ```

**Rollback Time:** 2-3 minutes (includes restart)

---

## Environment Variable Rollback

**Purpose:** Revert configuration changes

### Vercel Environment Variable Rollback

**Time:** 2-5 minutes

**Steps:**

1. **Access Environment History**
   ```
   URL: https://vercel.com/dashboard
   Navigate to: Project > Settings > Environment Variables
   ```

2. **Identify Incorrect Variable**
   ```
   # Review recent changes
   # Note: Vercel doesn't have env var history
   # Must manually track or restore from Git
   ```

3. **Restore from Git History**
   ```bash
   # If you track env vars in Git (not recommended for secrets)
   git log --oneline -- .env.example

   # Find last known good values
   git show <commit>:.env.example
   ```

4. **Update Variable**
   ```
   1. Click "Edit" next to variable
   2. Update value
   3. Save
   4. Redeploy
   ```

**Best Practice:** Document all environment variable changes in incident notes.

---

### Render Environment Variable Rollback

**Time:** 2-3 minutes

**Steps:**

1. **Access Environment Variables**
   ```
   URL: https://dashboard.render.com
   Navigate to: Service > Environment
   ```

2. **Update Variable**
   ```
   1. Find incorrect variable
   2. Click "Edit"
   3. Update value to last known good
   4. Save (triggers auto-restart)
   ```

3. **Monitor Restart**
   ```
   # Watch: Dashboard > Logs
   # Wait: 1-2 minutes for restart
   ```

**Common Rollbacks:**
```bash
# Square configuration
SQUARE_ACCESS_TOKEN=<previous-token>
SQUARE_LOCATION_ID=<previous-location-id>

# JWT secret
SUPABASE_JWT_SECRET=<previous-secret>

# OpenAI key
OPENAI_API_KEY=<previous-key>
```

---

## Emergency Shutdown Procedures

**Use when:** Security incident, data breach, or uncontrollable errors

### Complete System Shutdown

**Time:** 1-2 minutes
**Risk:** VERY HIGH (complete outage)

**Steps:**

1. **Disable Frontend (Vercel)**
   ```
   Method 1: Delete deployment domain
   1. Go to: Vercel Dashboard > Project > Settings > Domains
   2. Remove production domain
   3. Confirm removal

   Method 2: Add password protection
   1. Go to: Vercel Dashboard > Project > Settings > Password Protection
   2. Enable password protection
   3. Set password
   ```

2. **Disable Backend (Render)**
   ```
   1. Go to: Render Dashboard > Service
   2. Click: Suspend
   3. Confirm suspension
   ```

3. **Communicate Outage**
   ```
   Subject: [P0] Emergency Maintenance - System Offline

   Restaurant OS has been taken offline for emergency maintenance.

   Reason: [Security incident / Data integrity issue / etc]
   Status: System suspended
   ETA: Under investigation

   Updates will be provided every 15 minutes.
   ```

**Shutdown Time:** 2-3 minutes

---

### Partial Shutdown (Feature-Specific)

**Use when:** Single feature causing issues

**Steps:**

1. **Disable Feature Flag** (See Feature Flag Management)

2. **Block Endpoint via Middleware** (Requires code change)
   ```javascript
   // server/src/middleware/feature-gate.ts
   export function disableFeature(featurePath: string) {
     return (req, res, next) => {
       if (req.path.startsWith(featurePath)) {
         return res.status(503).json({
           error: 'Feature temporarily disabled',
           message: 'This feature is undergoing maintenance'
         });
       }
       next();
     };
   }

   // server/src/server.ts
   app.use(disableFeature('/api/v1/ai/voice'));  // Disable voice ordering
   ```

3. **Deploy** (See Backend Rollback)

---

### Database Read-Only Mode

**Use when:** Database integrity issues, need to prevent writes

**Steps:**

1. **Enable Read-Only Mode**
   ```sql
   -- Supabase SQL Editor
   -- Revoke INSERT/UPDATE/DELETE from application role

   REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
   FROM authenticated;

   -- Application can only SELECT
   ```

2. **Update Application to Handle Read-Only**
   ```javascript
   // server/src/middleware/read-only.ts
   export function readOnlyMode(req, res, next) {
     if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
       return res.status(503).json({
         error: 'System in read-only mode',
         message: 'Write operations temporarily disabled'
       });
     }
     next();
   }
   ```

3. **Restore Write Access**
   ```sql
   -- Restore permissions
   GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
   TO authenticated;
   ```

---

## Post-Rollback Verification

### Verification Checklist

**System Health:**
```bash
# 1. Health checks pass
curl https://july25.onrender.com/api/health
curl https://july25-client.vercel.app/

# 2. No errors in logs
# Check Render and Vercel dashboards

# 3. Database accessible
curl https://july25.onrender.com/api/health | jq '.services.database'

# 4. Third-party services working
curl https://july25.onrender.com/api/health | jq '.services.payments'
curl https://july25.onrender.com/api/status | jq '.services.ai'
```

---

**Critical User Flows:**
```bash
# 1. User authentication
# Test: Login with demo credentials

# 2. Order creation
# Test: Create order via frontend

# 3. Payment processing
# Test: Process test payment

# 4. Kitchen display updates
# Test: KDS shows new orders

# 5. Voice ordering (if enabled)
# Test: Voice order flow
```

---

**Performance Metrics:**
```bash
# 1. Response times normal
# Check: API response times < 200ms

# 2. Database latency normal
curl https://july25.onrender.com/api/health | jq '.services.database.latency'
# Expected: < 100ms

# 3. No memory leaks
# Check: Render metrics, memory usage stable

# 4. No error spikes
# Check: Sentry dashboard
```

---

### Post-Rollback Monitoring

**First Hour:**
- Check health every 5 minutes
- Monitor error rates in Sentry
- Watch for user reports
- Track key metrics

**First 24 Hours:**
- Check health every hour
- Review error trends
- Monitor performance metrics
- Verify no regressions

**Post-Incident Review:**
- Schedule within 48 hours
- Document root cause
- Update runbooks
- Implement prevention measures

---

## Rollback Troubleshooting

### Rollback Failed - Frontend Still Broken

**Symptoms:** Vercel rollback completed, but site still broken

**Possible Causes:**
1. Browser cache
2. CDN cache not cleared
3. Wrong deployment promoted
4. Environment variables not updated

**Solutions:**
```bash
# 1. Clear CDN cache
# Vercel Dashboard > Project > Settings > Advanced > Clear Cache

# 2. Verify deployment
vercel ls  # Check which deployment is live

# 3. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)

# 4. Check environment variables
# Vercel Dashboard > Settings > Environment Variables
# Verify all required variables are set
```

---

### Rollback Failed - Backend Still Broken

**Symptoms:** Render rollback completed, but API still broken

**Possible Causes:**
1. Build failed
2. Environment variables missing
3. Database migration incompatible
4. Service not restarted

**Solutions:**
```bash
# 1. Check build logs
# Render Dashboard > Logs
# Look for build errors

# 2. Verify environment variables
# Render Dashboard > Environment
# Compare with .env.example

# 3. Check database schema compatibility
# May need to rollback database migration too

# 4. Manual restart
# Render Dashboard > Manual Deploy > Restart
```

---

### Database Rollback Failed

**Symptoms:** Rollback migration applied, but errors persist

**Possible Causes:**
1. Rollback migration incomplete
2. Prisma schema not synced
3. Data constraints violated
4. Application code not compatible

**Solutions:**
```bash
# 1. Check migration was applied
# Supabase Dashboard > Database > Migrations

# 2. Verify schema
psql $DATABASE_URL -c "\d orders"

# 3. Sync Prisma schema
./scripts/post-migration-sync.sh

# 4. Check for data constraint violations
# Supabase Dashboard > Database > Logs

# 5. May need to rollback application code too
# See Backend Rollback section
```

---

### Rollback Successful But Performance Degraded

**Symptoms:** System working but slow

**Possible Causes:**
1. Database not optimized for old schema
2. Missing indexes
3. Cache not warmed
4. Connection pool exhausted

**Solutions:**
```bash
# 1. Check database latency
curl https://july25.onrender.com/api/health | jq '.services.database.latency'

# 2. Rebuild indexes (if needed)
# Supabase Dashboard > SQL Editor
REINDEX TABLE orders;

# 3. Restart to clear connection pool
# Render Dashboard > Manual Deploy > Restart

# 4. Monitor for improvement
# Watch response times over 30 minutes
```

---

## Rollback Documentation Template

**After every rollback, document the following:**

```markdown
# Rollback Report: INC-YYYYMMDD-HHMM

**Date:** YYYY-MM-DD HH:MM UTC
**Severity:** P[0-4]
**Executed By:** [Name]
**Duration:** [Minutes]

## What Was Rolled Back?
- [ ] Frontend (Vercel)
- [ ] Backend (Render)
- [ ] Database Migration
- [ ] Feature Flag
- [ ] Environment Variables

## Rollback Details

**Frontend:**
- Deployment ID: [deployment-id]
- Commit SHA: [commit-sha]
- Method: [Dashboard/CLI/Git]

**Backend:**
- Commit SHA: [commit-sha]
- Method: [Dashboard/Git Revert]

**Database:**
- Migration Rolled Back: [filename]
- Method: [Rollback Migration/Manual SQL/PITR]

**Feature Flags:**
- Flags Disabled: [list]

**Environment Variables:**
- Variables Changed: [list]

## Verification Results
- [ ] Health checks passing
- [ ] Critical flows tested
- [ ] Error rates normal
- [ ] Performance normal

## Root Cause
[Brief description of what caused need for rollback]

## Prevention Measures
[What will prevent this from happening again]

## Follow-up Actions
- [ ] Create rollback migration file (if manual SQL used)
- [ ] Update documentation
- [ ] Schedule post-incident review
- [ ] Implement prevention measures
```

---

## Rollback Best Practices

### Do's:
- Always verify health checks after rollback
- Document every rollback action
- Communicate status frequently
- Test rollback procedures regularly
- Keep last 5 deployments easily accessible
- Create rollback migrations before forward migrations
- Sync Prisma schema after database rollback
- Monitor for 24 hours post-rollback

### Don'ts:
- Don't rollback without verifying root cause (if time permits)
- Don't skip verification steps
- Don't forget to update Prisma schema
- Don't execute database rollback without backup
- Don't use point-in-time recovery unless absolutely necessary
- Don't rollback during peak traffic (if P2/P3)
- Don't forget to document rollback in Git history

---

## Appendix: Rollback Commands Reference

### Vercel
```bash
# List deployments
vercel ls

# Promote deployment
vercel promote <deployment-url> --yes

# Rollback via Git
git revert <commit-sha>
git push origin main
```

### Render
```bash
# View logs
render logs --service <service-name> --tail 100

# No CLI rollback - use dashboard
```

### Database
```bash
# Test migration locally
./scripts/deploy-migration.sh supabase/migrations/<migration>.sql

# Sync Prisma after rollback
./scripts/post-migration-sync.sh

# Backup before rollback
psql $DATABASE_URL -c "CREATE TABLE <table>_backup AS SELECT * FROM <table>;"
```

### Git
```bash
# Revert commit
git revert <commit-sha>

# Revert without commit (for multiple reverts)
git revert --no-commit <commit-sha>
git revert --no-commit <commit-sha2>
git commit -m "revert: rollback multiple commits"

# View commit history
git log --oneline -20
git log --oneline --graph --all
```

---

**Document Version:** 1.0.0
**Last Reviewed:** 2025-11-19
**Next Review:** 2025-12-19 (Monthly)
**Owner:** System Owner
