# Reality Auditor v3 Setup — Phase 9

**Date**: 2025-10-15
**Branch**: docs/stragglers-sweep-v6.0.8
**Status**: ✅ COMPLETE — Automated nightly documentation sync checks configured

## Summary

Created automated **Reality Auditor v3** system for continuous documentation-to-code sync validation. Runs nightly to detect when codebase changes invalidate documentation claims.

## Components Created

### 1. Reality Audit Script (`scripts/reality-audit.sh`)

**Purpose**: Re-run reality greps and auto-create PR if mismatches detected

**Functionality**:
1. Checkout main branch and pull latest
2. Run `npm run docs:check` to execute reality greps
3. Extract any "REALITY CHECK FAILED" errors
4. If failures detected:
   - Create timestamped audit branch: `docs/reality-audit-YYYY-MM-DD-HHMMSS`
   - Generate detailed audit report in `reports/`
   - Commit report to audit branch
   - Push branch to origin
   - Create PR with failure details and recommended actions
5. If all greps pass:
   - Exit successfully with no PR

**Exit Codes**:
- `0` — All reality greps pass (no action needed)
- Creates PR — Reality grep failures detected (requires review)

### 2. GitHub Actions Workflow (`.github/workflows/reality-audit.yml`)

**Triggers**:
- **Scheduled**: Daily at 03:00 UTC (cron: `0 3 * * *`)
- **Manual**: workflow_dispatch (can be triggered manually from GitHub Actions UI)

**Workflow Steps**:
1. Checkout repository (full history)
2. Setup Node.js 20
3. Install dependencies
4. Configure Git with bot credentials
5. Run `scripts/reality-audit.sh`
6. Continue on error (don't fail workflow if issues found)
7. Print summary

**Environment**:
- Uses `GITHUB_TOKEN` for PR creation (no additional secrets required)
- Bot identity: "Reality Auditor Bot <bot@reality-auditor.local>"

## Reality Greps Monitored

The auditor validates 6 critical implementation claims:

| # | Check | Documentation Claim | Code Evidence Pattern |
|---|-------|---------------------|----------------------|
| 1 | CORS allowlist | No wildcard origins | `allowedOrigins.*\[` in server/src |
| 2 | WebSocket JWT auth | JWT required for WS connections | `verifyWebSocketAuth` in server/src |
| 3 | RLS policies | Row-level security enabled | `ENABLE ROW LEVEL SECURITY` in supabase/migrations |
| 4 | Refresh latch | Concurrent refresh prevention | `refreshInProgressRef` + timer patterns in client |
| 5 | WS reconnect backoff | Exponential backoff reconnection | `exponential backoff` in client/src |
| 6 | Voice split effects | Separated audio effect lifecycle | `separate effect` in voice hooks |

## Automated PR Details

When reality greps fail, the system automatically creates a PR with:

**Title**: `docs: reality audit YYYY-MM-DD — sync issues detected`

**Labels**: `documentation`, `automated`

**Content**:
- Audit timestamp
- Failure count
- Specific grep failures (quoted)
- Link to detailed audit report
- Recommended next steps
- Reality greps reference table

**Branch**: `docs/reality-audit-YYYY-MM-DD-HHMMSS`

**Reports**: Saved in `reports/reality_audit_YYYY-MM-DD-HHMMSS.md`

## Example Audit Report

```markdown
# Reality Audit Report

**Date**: 2025-10-15 03:00:15 UTC
**Branch**: docs/reality-audit-2025-10-15-030015
**Status**: ❌ FAILED — 2 reality grep mismatch(es)

## Failures Detected

- REALITY CHECK FAILED: No evidence of "WebSocket JWT authentication" in codebase
- REALITY CHECK FAILED: No evidence of "Refresh token latch/rotation" in codebase

## Recommended Actions

1. Review codebase changes that invalidated documentation claims
2. Update documentation to reflect current implementation
3. Update reality grep patterns if implementation moved
4. Re-run docs:check after fixes
```

## Usage

### Manual Trigger
```bash
# Run audit locally
bash scripts/reality-audit.sh

# Run via GitHub Actions (manual trigger)
# Go to Actions tab → Reality Auditor v3 → Run workflow
```

### Review Audit PRs
1. Check for PRs labeled `automated` + `documentation`
2. Review audit report in `reports/reality_audit_*.md`
3. Fix documentation OR update grep patterns
4. Re-run `npm run docs:check` to verify
5. Close audit PR once resolved

### Disable Audits
```bash
# Temporarily disable scheduled runs:
# Comment out the schedule trigger in .github/workflows/reality-audit.yml
```

## Benefits

### Documentation Quality
- **Continuous validation**: Catches doc-code drift within 24 hours
- **Automated detection**: No manual audit needed
- **Evidence-based**: Each failure includes code search patterns

### Developer Experience
- **Auto-branching**: Creates isolated audit branch per run
- **Auto-PR**: No manual issue creation needed
- **Actionable reports**: Clear next steps for fixing mismatches

### Technical Debt
- **Early warning**: Detects drift before it becomes stale
- **Low maintenance**: Runs automatically with no config changes
- **Audit trail**: Historical reports show sync patterns over time

## Files Created

- `scripts/reality-audit.sh` (executable)
- `.github/workflows/reality-audit.yml`
- `reports/reality_auditor_v3_setup.md` (this file)

## Next Steps

1. ✅ Commit Reality Auditor v3 files
2. Monitor first nightly run (next day at 03:00 UTC)
3. Review any audit PRs created
4. Adjust grep patterns if needed based on initial runs

---

**Generated**: 2025-10-15 (Docs Launch Orchestrator v6.0.8 — Phase 9)
