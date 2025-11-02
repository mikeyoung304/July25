# Operational Runbooks

**Last Updated:** 2025-10-31

Quick-reference incident response procedures. Each runbook is a step-by-step guide requiring no additional context.

## Table of Contents
1. [Order Submission Fails with 500 Error](#1-order-submission-fails-with-500-error)
2. [Order Submission Fails with 403 Error](#2-order-submission-fails-with-403-error)
3. [Schema Drift Detected](#3-schema-drift-detected)
4. [Vercel Build Failures](#4-vercel-build-failures)
5. [WebSocket Connection Issues](#5-websocket-connection-issues)

---

## <a name="order-submission-500"></a>1. Order Submission Fails with 500 Error

**Symptoms:** Order submission returns 500 status code, console shows "column does not exist" or similar database error.

**Steps:**
1. Check server logs for exact error message
2. If error mentions missing column:
   ```bash
   # Check for unapplied migrations
   cd /path/to/repo
   ls supabase/migrations/
   ```
3. Verify Supabase schema:
   ```bash
   # Connect to Supabase
   PGPASSWORD="xxx" psql "postgresql://postgres@db.xxx.supabase.co:5432/postgres?sslmode=require"

   # Check if column exists
   \d+ restaurants
   ```
4. If column missing, deploy migrations:
   ```bash
   supabase db push --linked
   ```
5. Verify deployment:
   ```bash
   supabase db diff --linked  # Should show no changes
   ```
6. Test order submission again

**See also:** [Schema Drift Runbook](#3-schema-drift-detected)

---

## <a name="order-submission-403"></a>2. Order Submission Fails with 403 Error

**Symptoms:** Order submission returns 403 Forbidden, auth token invalid.

**Steps:**
1. Check browser console for auth errors
2. Verify auth token exists:
   ```javascript
   // Browser console
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Supabase session:', session);
   console.log('localStorage:', localStorage.getItem('auth_session'));
   ```
3. If no token, re-authenticate
4. If token exists but invalid:
   - Check server logs for JWT verification errors
   - Verify `SUPABASE_ANON_KEY` matches client and server
5. Test with fresh login

**See also:** [AUTH_DIAGNOSTIC_GUIDE.md](./how-to/troubleshooting/AUTH_DIAGNOSTIC_GUIDE.md)

---

## <a name="schema-drift"></a>3. Schema Drift Detected

**Symptoms:** Local migrations/ folder has files not present in Supabase cloud schema.

**Steps:**
1. List local migrations:
   ```bash
   ls -la supabase/migrations/
   ```
2. Check which migrations are applied to Supabase:
   ```bash
   supabase db diff --linked
   ```
3. If diff shows changes, migrations need deployment:
   ```bash
   supabase db push --linked
   ```
4. If push fails with conflicts:
   ```bash
   # Deploy specific migration via psql
   PGPASSWORD="xxx" psql "postgresql://..." -f supabase/migrations/XXXXX_migration_name.sql
   ```
5. Verify sync:
   ```bash
   supabase db diff --linked  # Should be empty
   ```
6. Update CHANGELOG.md with deployment details

**Prevention:** See [SUPABASE_CONNECTION_GUIDE.md](./SUPABASE_CONNECTION_GUIDE.md#migration-workflow)

---

## <a name="vercel-build-fail"></a>4. Vercel Build Failures

**Symptoms:** Vercel deployment fails with "Could not load..." or import path errors.

**Steps:**
1. Check Vercel build logs for exact error
2. If "Could not load /path/to/file":
   - Verify file exists at that path in repo
   - Check import path uses correct @/ alias
3. Common import path fixes:
   ```typescript
   // ❌ WRONG
   import { supabase } from '@/config/supabase'

   // ✅ CORRECT
   import { supabase } from '@/core/supabase'
   ```
4. Test build locally:
   ```bash
   npm run build
   ```
5. If local build succeeds but Vercel fails:
   - Clear Vercel build cache
   - Check environment variables match

**See also:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## <a name="websocket-issues"></a>5. WebSocket Connection Issues

**Symptoms:** KDS not receiving real-time updates, "WebSocket disconnected" in console.

**Steps:**
1. Check WebSocket server status:
   ```bash
   curl http://your-server.com/health
   ```
2. Verify client connection:
   ```javascript
   // Browser console
   console.log('WS connected:', window.wsConnected);
   ```
3. Check for connection loops in console
4. If multiple connections:
   - Refresh page
   - Check useEffect cleanup functions
5. Server-side:
   - Check server logs for WebSocket errors
   - Verify CORS allows WebSocket origin

**See also:** [ADR-004-websocket-realtime-architecture.md](./explanation/architecture-decisions/ADR-004-websocket-realtime-architecture.md)

---

**Last Updated:** 2025-10-21
**Maintained by:** Engineering Team
**Feedback:** Create GitHub issue with "runbook" label
