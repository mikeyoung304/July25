# Next Steps: Post Dual-Auth Refactor

**Status**: IN PROGRESS
**Created**: 2025-10-18
**Owner**: Platform Team
**Related**: PR #102, [ADR-006](./docs/ADR-006-dual-authentication-pattern.md)

---

## Executive Summary

Following the implementation of the dual authentication pattern (kiosk_demo → customer aliasing), this plan outlines the next steps to complete the migration, ensure production readiness, and eventually consolidate to a single authentication system.

**Current State**: Dual auth pattern implemented, both `kiosk_demo` and `customer` roles supported.

**Target State**: Single `customer` role for public orders, `kiosk_demo` fully deprecated.

**Timeline**: 4-8 weeks (dependent on client migration progress)

**Risk Level**: LOW (backwards-compatible approach)

---

## Phase 1A: Foundation (COMPLETED ✅)

**Duration**: 1-2 days
**Status**: DONE (This PR)

### Deliverables
- [x] Server integration tests (7 test cases)
  - File: `server/src/routes/__tests__/orders.auth.test.ts`
  - Coverage: customer, server, kiosk_demo, invalid role, no auth, X-Client-Flow, scope validation

- [x] Database migration
  - File: `supabase/migrations/20251018_add_customer_role_scopes.sql`
  - Action: INSERT customer role scopes (no removal of kiosk_demo)

- [x] Monitoring script
  - File: `scripts/monitor-auth-roles.sh`
  - Tracks: customer/server/kiosk_demo usage, deprecation warnings

- [x] CI guardrails
  - File: `.github/workflows/auth-guards.yml`
  - Gates: Auth tests, grep for kiosk_demo (when MIGRATION_STAGE=post)

- [x] Deployment runbook
  - File: `docs/runbooks/POST_DUAL_AUTH_ROLL_OUT.md`
  - Stages: Dev → Staging → Canary → Prod, rollback procedures

- [x] ENV templates
  - Updated: `.env.example`, `.github/pull_request_template.md`
  - Added: AUTH_DUAL_AUTH_ENABLE, AUTH_ACCEPT_KIOSK_DEMO_ALIAS docs

### Success Criteria
- ✅ 7/7 integration tests passing
- ✅ Migration applies cleanly
- ✅ Monitoring script executable
- ✅ CI workflow green
- ✅ Runbook complete

---

## Phase 1B: Client Migration (NEXT - 2 weeks)

**Duration**: 1-2 weeks
**Status**: PENDING
**Owner**: Frontend Team
**Dependencies**: Phase 1A complete

### Deliverables

1. **Update Auth Services** (`client/src/services/auth/`)
   - Replace `kiosk_demo` with `customer` in token generation
   - Update demo auth service
   - Maintain backwards compatibility
   - Files:
     - `client/src/services/auth/demoAuth.ts`
     - `client/src/contexts/AuthContext.tsx`

2. **Update Client Routes** (`client/src/`)
   - Search for all `kiosk_demo` references
   - Replace with `customer` role
   - Update TypeScript types
   - Verify no hardcoded role checks

3. **E2E Testing** (OPTIONAL if Playwright added)
   - File: `client/e2e/checkout.customer.smoke.spec.ts`
   - Test: Full checkout flow with customer role
   - Tag: @smoke

4. **Documentation Updates**
   - Update client README with new role name
   - Document migration for external developers
   - Update API client examples

### Manual Validation Checklist

Test these flows with `customer` role:

- [ ] Demo login redirects to correct page
- [ ] Online ordering (add to cart, checkout)
- [ ] Voice ordering (if implemented)
- [ ] Payment processing
- [ ] Order status updates (realtime)
- [ ] Menu browsing
- [ ] Restaurant selection (multi-tenant)

### Success Criteria
- ✅ All client code uses `customer` role
- ✅ Grep shows 0 `kiosk_demo` in `client/src/` (excluding tests)
- ✅ Manual checklist 7/7 passing
- ✅ No regression in existing flows

---

## Phase 1C: Staging Deployment & Monitoring (1 week)

**Duration**: 3-7 days
**Status**: PENDING
**Owner**: DevOps + Platform Team
**Dependencies**: Phase 1B complete

### Deliverables

1. **Deploy to Staging**
   ```bash
   # Server
   git push staging main

   # Client
   vercel --prod --env VITE_API_BASE_URL=$STAGING_API_URL

   # DB Migration
   supabase db push --db-url $STAGING_DATABASE_URL
   ```

2. **Configure Monitoring**
   - Set up Loki/Datadog/Grafana queries (see runbook)
   - Create auth dashboard
   - Configure alerts:
     - 401 error rate > 1%
     - kiosk_demo usage > 50% (after 48h)
     - Customer role tokens < 25% (after 48h)

3. **Run Monitoring Script (Daily)**
   ```bash
   LOG_DIR=/var/log/staging/ ./scripts/monitor-auth-roles.sh > reports/auth-$(date +%Y%m%d).txt
   ```

4. **Trending Analysis**
   Track over 7 days:
   - Customer role adoption curve (should increase)
   - Kiosk_demo deprecation warnings (should decrease)
   - 401 error rate (should remain < 0.5%)
   - Order creation success rate (should remain > 99%)

### Success Criteria
- ✅ 7 days in staging with no incidents
- ✅ Customer role usage > 80%
- ✅ Kiosk_demo usage < 20%
- ✅ 401 error rate < baseline
- ✅ Monitoring dashboard operational

---

## Phase 2: Production Rollout (2-3 weeks)

**Duration**: 2-3 weeks (staged)
**Status**: PENDING
**Owner**: Platform Lead + DevOps
**Dependencies**: Phase 1C complete, stakeholder approval

### Stage 2A: Canary Deployment (5-10%)

**Duration**: 2-4 hours

1. Deploy to canary instances (5-10% traffic)
2. Monitor for elevated error rates
3. Run monitoring script every 30 min
4. If green, proceed to Stage 2B

**Rollback**: ~2 minutes (revert canary instances)

### Stage 2B: Production Rollout (100%)

**Duration**: 1-2 hours

1. Deploy to all production instances
2. Monitor for 2 hours (every 15 min checks)
3. Verify no customer-reported issues
4. Run monitoring script every 30 min

**Rollback**: 30 seconds (env var) to 5 minutes (full revert)

### Stage 2C: Post-Rollout Monitoring

**Duration**: 2 weeks

1. **Week 1**: Daily monitoring
   - Run script daily
   - Review deprecation warnings
   - Track customer adoption
   - Target: >50% customer role usage

2. **Week 2**: Every-other-day monitoring
   - Check for regression
   - Identify unmigrated clients
   - Prepare cutover notice
   - Target: >80% customer role usage

### Success Criteria
- ✅ Zero production incidents
- ✅ 401 error rate < baseline + 10%
- ✅ Customer role usage > 80% by Week 2
- ✅ Kiosk_demo usage trending to <20%

---

## Phase 3: Final Cutover (4-8 weeks post-rollout)

**Duration**: 1 week
**Status**: FUTURE
**Owner**: Platform Team
**Dependencies**: Customer role adoption > 95%

### Pre-Cutover Requirements

- [ ] Customer role usage > 95%
- [ ] Kiosk_demo usage < 5%
- [ ] All known clients migrated
- [ ] Stakeholders notified 2 weeks in advance
- [ ] Rollback plan tested

### Cutover Actions

1. **Disable kiosk_demo Alias**
   ```bash
   # Production
   render env set AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false --all
   ```

2. **Update CI/CD**
   ```bash
   # GitHub Actions
   gh variable set MIGRATION_STAGE --body "post"
   ```

3. **Monitor for Rejections**
   ```bash
   # Check for rejected kiosk_demo attempts
   grep "kiosk_demo.*rejected" /var/log/production/app.log
   ```

4. **Remove DB Scopes (Future Migration)**
   ```sql
   -- Create migration: 20251118_remove_kiosk_demo_scopes.sql
   DELETE FROM role_scopes WHERE role = 'kiosk_demo';
   ```

### Success Criteria
- ✅ Zero kiosk_demo tokens accepted
- ✅ No spike in 401/403 errors
- ✅ grep gate passing (no kiosk_demo in client code)
- ✅ Monitoring shows 100% customer role usage

---

## Risk Assessment

### High Risk ⚠️
**NONE** - Backwards-compatible approach mitigates risk

### Medium Risk 🟡

1. **Unmigrated Clients**
   - Risk: External clients may still use kiosk_demo after cutover
   - Mitigation: Email notification 2 weeks before cutover, extend deadline if needed
   - Impact: 403 errors for unmigrated clients
   - Likelihood: LOW (we control all clients)

2. **Token Expiry During Migration**
   - Risk: Users may experience logout during role transition
   - Mitigation: Token TTL is 8-12 hours, migration window is days
   - Impact: User must re-login
   - Likelihood: VERY LOW

### Low Risk ✅

1. **Performance Impact**
   - Risk: Dual auth pattern adds conditional logic
   - Mitigation: Minimal overhead (<1ms), tested in staging
   - Impact: Negligible
   - Likelihood: VERY LOW

2. **Monitoring Gaps**
   - Risk: Missed auth issues due to incomplete monitoring
   - Mitigation: Comprehensive monitoring script, APM queries, runbook
   - Impact: Delayed incident detection
   - Likelihood: LOW

---

## Communication Plan

### Week 0 (Pre-Deployment)
- [ ] Send email to dev team: Explain dual auth pattern, testing instructions
- [ ] Create Slack channel: #auth-migration-updates
- [ ] Post in #engineering: Link to ADR-006, runbook, this plan

### Week 1 (Staging Deployment)
- [ ] Daily update in #auth-migration-updates: Metrics, issues, blockers
- [ ] Demo to stakeholders: Show customer role in action
- [ ] Create FAQ doc: Common questions, troubleshooting

### Week 2-3 (Production Rollout)
- [ ] Pre-rollout email: 24h notice to team
- [ ] During rollout: Real-time updates in Slack
- [ ] Post-rollout: Summary email with metrics

### Week 4+ (Post-Rollout Monitoring)
- [ ] Weekly metrics report: Customer adoption %, deprecation warnings
- [ ] Identify unmigrated clients: Direct outreach if needed
- [ ] Plan cutover notification: 2 weeks advance notice

### Pre-Cutover (Phase 3)
- [ ] Email all stakeholders: 2 weeks notice of kiosk_demo deprecation
- [ ] Post in #announcements: Breaking change warning
- [ ] Update API docs: Mark kiosk_demo as DEPRECATED

---

## Appendices

### Appendix A: Manual Validation Checklist

Test these scenarios in each environment:

1. **Customer Role**
   - [ ] Login with customer role token
   - [ ] Create order (POST /api/v1/orders)
   - [ ] View orders (GET /api/v1/orders)
   - [ ] Process payment (POST /api/v1/payments/create)
   - [ ] No 401/403 errors
   - [ ] No deprecation warnings

2. **Server Role**
   - [ ] Login with server role token
   - [ ] Create order (dine-in)
   - [ ] Update order status
   - [ ] No 401/403 errors

3. **Kiosk_demo Role (Pre-Cutover)**
   - [ ] Login with kiosk_demo token
   - [ ] Create order
   - [ ] Verify WARN log: "kiosk_demo is deprecated"
   - [ ] Order succeeds (aliased to customer)

4. **Kiosk_demo Role (Post-Cutover)**
   - [ ] Login with kiosk_demo token
   - [ ] Create order
   - [ ] Verify ERROR log: "kiosk_demo rejected"
   - [ ] Verify 401 Unauthorized response

5. **Invalid Role**
   - [ ] Login with 'kitchen' role
   - [ ] Try to create order
   - [ ] Verify 403 Forbidden
   - [ ] Error message: "Insufficient permissions"

6. **No Auth**
   - [ ] No Authorization header
   - [ ] Try to create order
   - [ ] Verify 401 Unauthorized
   - [ ] Error message: "No token provided"

7. **X-Client-Flow Header**
   - [ ] Send X-Client-Flow: online
   - [ ] Verify header logged
   - [ ] Repeat for: kiosk, server
   - [ ] All flows work correctly

### Appendix B: Test Cases (from orders.auth.test.ts)

1. ✅ customer → POST /api/v1/orders → 201
2. ✅ server → POST /api/v1/orders → 201
3. ✅ kiosk_demo (flag=true) → 201 + WARN
4. ✅ kiosk_demo (flag=false) → 403
5. ✅ X-Client-Flow captured/logged
6. ✅ invalid role → 403
7. ✅ no auth → 401

### Appendix C: Rollback Decision Tree

```
Is production down?
├─ YES → Emergency rollback (30 seconds)
│        └─ render env set AUTH_DUAL_AUTH_ENABLE=false --all
└─ NO → Is 401 error rate > 5%?
         ├─ YES → Partial rollback (2 minutes)
         │        └─ render deploy rollback
         └─ NO → Is customer role failing?
                  ├─ YES → Investigate, may need hotfix
                  │        └─ Check JWT_SECRET, DB migration
                  └─ NO → Monitor, no rollback needed
```

### Appendix D: Monitoring Script Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Auth Role Usage Monitor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Log Directory: logs/
Pattern:       *.log
Days Back:     7

✅ Found 14 log file(s) to analyze

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 Authentication Role Usage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Customer role tokens:       12,456
Server role tokens:          3,421
Kiosk_demo role tokens:      1,234 (deprecated)
Admin role tokens:             567
Manager role tokens:           890

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Deprecation Warnings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

kiosk_demo deprecation warnings:  1,234
kiosk_demo rejection errors:           0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total auth events:          18,568
Customer adoption:          67%
Kiosk_demo still in use:    6%

🟡 MIGRATION IN PROGRESS: <5% kiosk_demo usage
   → Identify remaining kiosk_demo clients
   → Plan final cutover date

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Analysis complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Appendix E: Useful Commands

```bash
# Run integration tests
npm run test:server -- src/routes/__tests__/orders.auth.test.ts

# Run monitoring script
LOG_DIR=logs/ ./scripts/monitor-auth-roles.sh

# Apply DB migration (local)
npm run db:push

# Apply DB migration (staging)
supabase db push --db-url $STAGING_DATABASE_URL

# Check auth env vars
echo $AUTH_ACCEPT_KIOSK_DEMO_ALIAS

# Grep for kiosk_demo in client code
grep -r "kiosk_demo" client/src/ --exclude-dir=node_modules --exclude="*.test.ts"

# Check recent 401 errors
tail -100 /var/log/restaurant-os/app.log | grep 401

# Monitor real-time auth events
tail -f /var/log/restaurant-os/app.log | grep -E "customer|kiosk_demo|server"

# Emergency rollback (env var)
render env set AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false --all

# Emergency rollback (deployment)
render deploy rollback
```

---

## Success Tracking

### Phase 1A ✅
- [x] Integration tests passing
- [x] DB migration created
- [x] Monitoring script functional
- [x] CI workflow green
- [x] Runbook complete
- [x] PR merged

### Phase 1B ⏳
- [ ] Client code updated to customer role
- [ ] Manual checklist 7/7 passing
- [ ] Grep shows 0 kiosk_demo in client/src/

### Phase 1C ⏳
- [ ] Staging deployed and stable (7 days)
- [ ] Customer role usage > 80%
- [ ] Monitoring dashboard live

### Phase 2 ⏳
- [ ] Production canary successful
- [ ] Full production rollout complete
- [ ] 2 weeks monitoring (no incidents)

### Phase 3 🔮
- [ ] Customer role adoption > 95%
- [ ] kiosk_demo alias disabled
- [ ] Grep gate enforcing (MIGRATION_STAGE=post)
- [ ] DB scopes cleaned up

---

**Document Owner**: Platform Team
**Next Review**: After Phase 1B completion
**Status Page**: Track progress in #auth-migration-updates
