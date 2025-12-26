# Post-Mortem Index

**Last Updated:** 2025-11-18

This directory contains blameless post-mortem analyses of production incidents.

## Post-Mortems

### 2025-11

**[2025-11-12 - JWT Scope Bug](2025-11-12-jwt-scope-bug.md)**
- Kitchen/Expo roles unable to update orders
- Root cause: JWT missing `orders.write` scope
- Fix: Updated auth middleware scope assignment

**[2025-11-10 - React 3.18 Hydration Bug](2025-11-10-react-318-hydration-bug.md)**
- Hydration mismatches in production
- Root cause: React 3.18 regression
- Fix: Downgraded to React 3.17

### 2025-10

**[2025-10-21 - Schema Drift](../POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md)**
- Production schema diverged from git for 2 weeks
- Root cause: Manual Supabase Dashboard changes
- Fix: Automated drift detection workflow

**[2025-10-14 - Payment Credentials Mismatch](../POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md)**
- All payments failing (production using sandbox credentials)
- Root cause: Manual credential update without environment verification
- Fix: Proper credential rotation protocol

## Lessons Learned

### Deployment & Environment
- Always test build scripts in clean environment before production
- Environment variables need automated validation
- Dual deployment sources (Vercel Git + GitHub Actions) cause race conditions

### Authentication & Security
- JWT scopes must be validated at assignment time
- Demo panel exposure (`VITE_DEMO_PANEL=1`) is a security incident
- Token rotation must be tracked (prevent orphaned tokens)

### Schema & Database
- All schema changes MUST go through migration files
- Automated drift detection prevents silent divergence
- RLS policies need comprehensive testing

## Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD
**Duration:** X hours
**Severity:** P0/P1/P2
**Impact:** [Users affected, revenue lost, etc.]

## Summary
[1-2 sentence summary]

## Timeline
- HH:MM - Event happened
- HH:MM - Detected
- HH:MM - Mitigated
- HH:MM - Resolved

## Root Cause
[5 Whys analysis]

## Resolution
[What fixed it]

## Action Items
- [ ] Immediate fix (owner, deadline)
- [ ] Prevent recurrence (owner, deadline)
- [ ] Monitoring improvement (owner, deadline)

## Lessons Learned
[What we learned]
```

## Related Documentation

- [Incidents](../incidents/README.md)
- [Deployment Guide](../reference/config/VERCEL_RENDER_DEPLOYMENT.md)
