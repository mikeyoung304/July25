# Deployment Security Verification Checklist

**Use before every production deployment to ensure security hardening remains intact**

---

## Pre-Deployment (Development Environment)

### Code Review Phase
```
AUTHENTICATION & AUTHORIZATION
☐ All auth tokens stored in HTTPOnly cookies, not localStorage
☐ Login responses contain { user } only, never { token }
☐ Logout endpoint clears both auth_token and csrf_token cookies
☐ STRICT_AUTH defaults to true (not explicitly set to 'false' in code)
☐ Demo users require DEMO_MODE=enabled (not hardcoded)
☐ Demo users scoped to JWT restaurant_id (cannot access other restaurants)
☐ Restaurant ID validated as UUID regex on every request
☐ No X-Restaurant-ID header used for authenticated users
☐ kiosk_demo role completely removed/rejected
☐ All JWT validation catches TokenExpiredError separately
☐ No test tokens (test:*) supported

CSRF PROTECTION
☐ CSRF token generated with crypto.randomBytes(32)
☐ CSRF token in non-HTTPOnly cookie (httpOnly: false)
☐ CSRF cookie sameSite: 'strict', secure: true in production
☐ All POST/PUT/DELETE require X-CSRF-Token header
☐ CSRF validation uses crypto.timingSafeEqual()
☐ Length check before timing-safe comparison
☐ GET/HEAD/OPTIONS requests skip CSRF check
☐ httpClient includes CSRF token in all non-GET requests

PIN VERIFICATION & BRUTE FORCE
☐ PIN verification uses bcrypt.compareSync()
☐ Dummy hash pre-computed for user-not-found case
☐ bcrypt.compareSync() called even when user not found
☐ All PIN verification failures return generic error: "Invalid PIN"
☐ No early returns that leak timing information
☐ PIN attempt counter increments atomically
☐ 5 failed attempts trigger 15 minute lockout
☐ Successful login resets attempt counter to 0
☐ Lockout timestamp checked before validation
☐ Locked users still return generic error

WEBHOOK SECURITY
☐ Webhook signatures verified with crypto.timingSafeEqual()
☐ Signature buffer length checked before comparison
☐ Webhook timestamp verified (must be < 5 minutes old)
☐ Timestamp validation rejects older webhooks
☐ WEBHOOK_SECRET required, no fallback
☐ Webhook rejection logged with event ID
☐ Idempotency keys used for critical operations (refunds)
☐ Stripe API calls include idempotencyKey parameter

SECRETS MANAGEMENT
☐ STATION_TOKEN_SECRET required, not optional
☐ DEVICE_FINGERPRINT_SALT required, not optional
☐ PIN_PEPPER required in production, not optional
☐ No fallback secrets (no || 'default')
☐ validateEnvironment() checks for all required secrets
☐ Server crashes on startup if secrets missing
☐ Error messages guide users to find secrets
☐ No hardcoded secrets in code
☐ No default values in environment.ts

MULTI-TENANCY & FILTERING
☐ Every database query includes restaurant_id filter
☐ restaurant_id comes from req.user.restaurant_id (JWT)
☐ No queries without WHERE restaurant_id = $1
☐ RLS policies enforced in Supabase
☐ Cross-tenant access attempts logged with user ID
☐ Audit service called for suspicious access

LOGGING & AUDIT
☐ Auth failures logged (user not found, token expired, etc.)
☐ Demo access logged (successful and denied)
☐ Restaurant access denials logged
☐ CSRF token mismatches logged
☐ PIN attempt failures logged
☐ Demo mode disabled attempts logged
☐ Cross-tenant access attempts logged
☐ User IP and user-agent logged for security events
☐ Audit logging is fire-and-forget (doesn't block requests)
```

---

### Test Phase
```
☐ CSRF protection tests: token present, token matching, mismatches
☐ Timing-safe PIN tests: consistent timing for all failures
☐ PIN attempt counter tests: 5 failures = lockout, unlock after 15 min
☐ HTTPOnly cookie tests: auth_token not readable, CSRF token readable
☐ Demo mode tests: rejected when disabled, allowed when enabled
☐ STRICT_AUTH tests: rejected without restaurant_id, accepted with it
☐ Restaurant ID validation tests: UUID format, invalid format rejected
☐ Webhook signature tests: invalid signature rejected, valid accepted
☐ Webhook timestamp tests: old webhooks rejected, recent accepted
☐ Full auth flow E2E tests: login → authenticated requests → logout
☐ ALL security tests passing in CI/CD
```

---

## Pre-Deployment (Render/Production Configuration)

### Environment Variables Setup
```
REQUIRED SECRETS (will crash if missing)
☐ KIOSK_JWT_SECRET set to production value (32+ random characters)
☐ STATION_TOKEN_SECRET set to production value (32+ random characters)
☐ DEVICE_FINGERPRINT_SALT set to production value (32+ random characters)
☐ PIN_PEPPER set to production value (32+ random characters)
☐ WEBHOOK_SECRET set to production value (32+ random characters)
☐ SUPABASE_JWT_SECRET set to actual JWT secret from Supabase dashboard
  └─ Location: Supabase Dashboard → Settings → API → JWT Secret
  └─ Format: Base64 string, ~88 characters
☐ SUPABASE_URL set to production database URL
☐ SUPABASE_ANON_KEY set to production anon key
☐ SUPABASE_SERVICE_KEY set to production service key (server only)

SECURITY CONFIGURATION
☐ STRICT_AUTH not set (defaults to true/enabled)
☐ DEMO_MODE not set (defaults to disabled)
  └─ If explicitly set, value is NOT 'enabled'
☐ NODE_ENV set to 'production'
☐ CORS_ORIGIN set to actual frontend domain (not wildcard *)

HTTPS & SECURITY HEADERS
☐ SSL certificate installed and valid (not expired)
☐ HTTPS enforced (http redirects to https)
☐ Secure cookies enforced (NODE_ENV='production' triggers secure flag)
☐ CORS headers set correctly (origin, credentials)
```

### Render Configuration
```
SETTINGS
☐ Environment → Environment Variables → All required vars set above
☐ Plans & Pricing → Plan is paid (not free tier, for production readiness)
☐ Redirects → HTTP to HTTPS enabled
☐ Health Checks → Configured to detect startup failures

BUILD
☐ Build command includes environment validation
  └─ Example: npm install && npm run build && node -e "require('./server/dist/config/environment').validateEnvironment()"
☐ Failing builds fail hard (don't deploy)
☐ Build logs accessible for debugging

SECRETS MANAGEMENT
☐ No secrets in git (checked .env files not committed)
☐ All secrets in Render environment, not in code
☐ Secret values NOT visible in Render dashboard during creation
  └─ (But verified set correctly with obfuscated values)
☐ Secrets rotated at least quarterly (plan rotation schedule)
```

---

## Deployment Checklist (Pre-Deploy)

### Final Code Verification
```
☐ All security tests passing locally
☐ All security tests passing in CI/CD
☐ No console.log statements (use logger only)
☐ No TODO comments about security fixes
☐ No commented-out fallback code
☐ No hardcoded environment values
☐ Security review completed (approved by security reviewer)
```

### Deployment Steps
```
☐ BEFORE deploying:
   1. Verify all environment variables in Render
   2. Run production build locally: NODE_ENV=production npm run build
   3. Confirm build succeeds without warnings about missing env vars
   4. Read deployment diff one more time
   5. Have a rollback plan ready

☐ DURING deployment:
   1. Deploy to staging first (if available)
   2. Run basic smoke tests
   3. Check server logs for startup messages
   4. Verify "STRICT_AUTH enabled by default" in logs
   5. Verify "DEMO_MODE disabled by default" (or no demo mode warning)
   6. Confirm no security warnings on startup

☐ AFTER deployment:
   1. Check server is responding (curl health endpoint)
   2. Verify HTTPS is working
   3. Test login flow manually
   4. Verify auth_token cookie is HTTPOnly (DevTools → Application → Cookies)
   5. Verify CSRF token cookie is readable (DevTools → Console → document.cookie)
   6. Test logout and session cleared
   7. Verify error messages are generic (no user enumeration)
```

---

## Post-Deployment Verification

### Health Checks
```
☐ Server responding to requests (5xx status indicates failure)
☐ All required secrets loaded (check in server logs)
☐ STRICT_AUTH enabled (check warning not in logs, or logs say "enabled")
☐ DEMO_MODE disabled (check no demo access logs)
☐ HTTPS working (certificate valid)
☐ CORS allowing credentials (credentials in requests work)
☐ Audit logging working (check audit_logs table for entries)
```

### Security Function Tests
```
☐ Login: HTTPOnly cookie set, response has no token
☐ Logout: Cookies cleared server-side
☐ CSRF: POST without token fails with 403
☐ CSRF: POST with mismatched token fails with 403
☐ Demo: Demo tokens rejected if DEMO_MODE not set
☐ PIN: Wrong PIN returns generic error (no "user not found")
☐ PIN: 5 failures lock account (6th attempt still fails)
☐ Webhook: Invalid signature rejected with 401
☐ Restaurant: Cannot access wrong restaurant (gets 403)
☐ Restaurant: UUID validation rejects invalid format
```

### Production Monitoring
```
☐ Application error rate normal (< 1% of requests)
☐ Authentication error rate normal (< 5% of login attempts)
☐ No "STATION_TOKEN_SECRET" errors in logs
☐ No "DEMO_MODE" unexpected access in logs
☐ No "STRICT_AUTH" validation failures unless intentional
☐ No timing patterns in PIN authentication (all ~100ms)
☐ Webhook processing latency normal (< 1 second)
☐ Audit logs capturing security events
```

---

## Rollback Checklist

If security issues detected after deployment:

```
IMMEDIATE (< 5 minutes)
☐ Notify security team immediately
☐ Prepare rollback to previous version
☐ Note what went wrong for post-mortem

ROLLBACK (5-15 minutes)
☐ Revert to previous Render deployment
☐ Verify previous version health checks pass
☐ Confirm users can login again
☐ Verify no broken security features in rollback

POST-ROLLBACK (same day)
☐ Root cause analysis
☐ Fix the issue in code
☐ Re-run full test suite (including security tests)
☐ Get additional security review before re-deploying
☐ Deploy to staging first for 24 hours
```

---

## Monthly Security Review

Run this checklist monthly to ensure security hardening hasn't drifted:

```
CODE REVIEW
☐ Grep for localStorage.setItem('token') - should not exist
☐ Grep for localStorage.getItem('token') - should not exist
☐ Grep for res.json({ token - responses should not contain token
☐ Grep for process.env.SECRET || - should not have fallbacks
☐ Grep for process.env.DEMO_MODE || - demo mode should be explicit
☐ Grep for req.headers['x-restaurant-id'] - auth users shouldn't use
☐ Check no new test tokens (test:* prefix in code)
☐ Check no new hardcoded defaults

ENVIRONMENT REVIEW
☐ KIOSK_JWT_SECRET changed since last rotation? (if not, schedule change)
☐ STATION_TOKEN_SECRET changed since last rotation?
☐ WEBHOOK_SECRET changed since last rotation?
☐ All other required secrets present in production?
☐ No hardcoded defaults in use?

TEST REVIEW
☐ Run full test suite, especially security tests
☐ Coverage for CSRF protection > 90%
☐ Coverage for PIN verification > 90%
☐ Coverage for webhook verification > 90%
☐ All security tests passing

DEPLOYMENT REVIEW
☐ No security-related issues in recent PRs
☐ All security PRs merged without workarounds
☐ No TODO comments about security
☐ No console.log for sensitive data
```

---

## Documentation Updates

When deploying security changes:

```
☐ CLAUDE.md updated if architecture changed
☐ .claude/prevention/ docs updated with new checks
☐ ADR updated if new decisions made
☐ README updated if setup changed
☐ Team notified of new security requirements
☐ Onboarding updated for new developers
☐ Security runbook updated with new escalation procedures
```

---

## Security Incident Response

If security vulnerability detected in production:

```
1. IMMEDIATE (< 15 minutes)
   ☐ Isolate affected system if possible
   ☐ Notify security team
   ☐ Assess severity (P0/P1/P2/P3)
   ☐ Determine if customer data at risk
   ☐ Note affected restaurant IDs

2. SHORT-TERM (< 1 hour)
   ☐ Prepare patch
   ☐ Test patch thoroughly
   ☐ Get security review
   ☐ Deploy patch

3. POST-INCIDENT (same day)
   ☐ Root cause analysis
   ☐ Determine how this bypassed prevention
   ☐ Update prevention checklist
   ☐ Update tests to catch this issue
   ☐ Notify customers (if required)
   ☐ Document in solutions/

4. FOLLOW-UP (next week)
   ☐ Security review of entire codebase
   ☐ All team training on new vulnerability
   ☐ Update PREVENTION-INDEX with new pattern
   ☐ Plan prevents similar issues from happening again
```

---

## Success Metrics

For a secure deployment:

```
✅ 100% of required environment variables set
✅ 0 hardcoded secrets in code
✅ 0 fallback defaults being used
✅ 100% of security tests passing
✅ < 5% authentication error rate
✅ 0 known vulnerabilities in dependencies
✅ All audit logs recording correctly
✅ No timing-based user enumeration possible
✅ Multi-tenant isolation verified working
✅ Webhook signature verification confirmed
```

---

## Contacts & Escalation

```
SECURITY QUESTIONS
→ security-team@company.com

DEPLOYMENT ISSUES
→ devops@company.com

AUTHENTICATION BUGS
→ @auth-expert (PR team)

WEBHOOK/PAYMENT ISSUES
→ @payments-expert (PR team)
```

---

## Related Documents

- `.claude/prevention/SECURITY-HARDENING-PREVENTION.md` - Full prevention guide
- `.claude/prevention/QUICK-REF-SECURITY-HARDENING.md` - Quick reference for code review
- `plans/security-remediation-v2.md` - Implementation plan
- `CLAUDE.md` - Architecture decisions
- `.env.production.example` - Example of required vars

---

**Last Updated**: 2025-12-29
**Use Before**: Every production deployment
**Review Frequency**: Monthly minimum, after any security incident
**Owner**: Security Team / DevOps
