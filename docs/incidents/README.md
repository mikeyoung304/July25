# Incident Index

**Last Updated:** 2025-11-18

This directory tracks production incidents and their initial response documentation.

## Active Incidents

*None currently*

## Resolved Incidents

### 2025-11

**Nov 17, 2025 - Deployment Cascade Failure**
- **Duration:** 8+ hours
- **Impact:** All deployments failing (Vercel + Render)
- **Root Cause:** Build script change broke TypeScript compilation in Vercel
- **Resolution:** Fixed build:vercel script to use workspace approach
- **Cost:** $4,750+ engineering time
- **Post-mortem:** See `/docs/archive/2025-11/deployment/DEPLOYMENT_HISTORY_ANALYSIS.json`

**Nov 6, 2025 - Environment Variable Newline Contamination**
- **Duration:** Investigation ongoing
- **Impact:** Routing failures, authentication bypass
- **Root Cause:** Literal `\n` characters in Vercel environment variables
- **Resolution:** Created fix script, manually re-entered variables
- **Documentation:** See `/docs/archive/2025-11/environment/`

### 2025-10

**Oct 21, 2025 - Schema Drift Detection Failure**
- **Duration:** 2 weeks undetected
- **Impact:** Production schema diverged from git
- **Root Cause:** Manual schema changes in Supabase Dashboard
- **Resolution:** Implemented automated drift detection workflow
- **Post-mortem:** [2025-10-21-schema-drift.md](../postmortems/2025-10-21-schema-drift.md)

**Oct 14, 2025 - Square Payment Credentials Mismatch**
- **Duration:** 4 hours
- **Impact:** All payments failing in production
- **Root Cause:** Production using sandbox credentials
- **Resolution:** Updated to production Square credentials

## Incident Response Protocol

1. **Immediate Response** (0-15 min): Create incident doc, assess impact
2. **Mitigation** (15-60 min): Stop bleeding, update stakeholders
3. **Resolution** (1-4 hours): Root cause analysis, implement fix
4. **Post-Mortem** (within 48 hours): Blameless review, action items

## Related Documentation

- [Post-mortems](../postmortems/README.md)
- [Deployment Guide](../reference/config/VERCEL_RENDER_DEPLOYMENT.md)
