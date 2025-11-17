# Vercel Token Cleanup Checklist

**Created**: November 17, 2025
**Incident**: CL-DEPLOY-001 (Deployment Cascade Failure)
**Purpose**: Immediate cleanup of proliferated Vercel tokens

## Current State Analysis

### Active Tokens (As of Nov 17, 2025 19:39)

1. ✅ **"GitHub-Actions-Deploy"** or similar
   - Created: Nov 17, 2025 19:39
   - Purpose: GitHub Actions CI/CD
   - Expiration: Never
   - **Status**: KEEP - Currently in use in GitHub secrets

2. ⚠️ **"github-cli"**
   - Created: Aug 13, 2025
   - Purpose: GitHub Actions (REPLACED)
   - Expiration: Never
   - **Action**: REVOKE (replaced by new token)

3. ✅ **"Vercel Dashboard from Chrome on macOS"**
   - Created: Aug 6, 2025
   - Purpose: Browser access
   - Expiration: Never
   - **Status**: KEEP - Used for manual operations

### Revoked Tokens (Already cleaned up)

- Multiple "Claude.ai" tokens (5-8 tokens)
- Multiple "Vercel CLI" tokens (7-10 tokens)
- **Status**: Already revoked Nov 16-17, 2025

## Immediate Action Items

### Step 1: Verify New Token is Working
```bash
# Test new token from GitHub Actions
gh run list --limit 1
# Should show recent run with new commit

# Check if deployment succeeded
vercel ls --scope mikeyoung304-gmailcoms-projects | head -5
# Should show recent "Ready" deployment
```

**Status**: ⬜ Not started
**Owner**: AI/User
**ETA**: 5 minutes

### Step 2: Revoke Old "github-cli" Token (Aug 13)
1. Go to: https://vercel.com/account/tokens
2. Find: "github-cli" created Aug 13, 2025
3. Click: "..." → "Revoke"
4. Confirm: Yes, revoke

**Status**: ⬜ Not started
**Owner**: User (requires manual browser action)
**ETA**: 2 minutes

### Step 3: Document Current Tokens
Create a secure note in password manager with:
```
Vercel Tokens - Restaurant OS Project
=====================================

1. GitHub-Actions-Deploy
   - Purpose: CI/CD pipeline for july25-client project
   - Created: Nov 17, 2025
   - Stored in: GitHub Secrets (VERCEL_TOKEN)
   - Rotate by: Feb 15, 2026 (90 days)

2. Vercel Dashboard Browser
   - Purpose: Manual Vercel dashboard access
   - Created: Aug 6, 2025
   - Stored in: Browser only
   - Rotate by: Feb 3, 2026 (if still needed)

MAX TOKENS: 3
AUDIT FREQUENCY: Monthly (1st of each month)
ROTATION POLICY: Every 90 days
```

**Status**: ⬜ Not started
**Owner**: User
**ETA**: 5 minutes

### Step 4: Set Token Rotation Reminders
Add calendar events:
- **Feb 15, 2026**: Rotate GitHub-Actions-Deploy token
- **Dec 1, 2025**: Monthly token audit
- **Jan 1, 2026**: Monthly token audit
- **Feb 1, 2026**: Monthly token audit

**Status**: ⬜ Not started
**Owner**: User
**ETA**: 3 minutes

### Step 5: Implement Token Audit Script
```bash
# Add to monthly cron or GitHub Actions schedule
# File: scripts/audit-vercel-tokens.sh

#!/bin/bash
# CL-DEPLOY-001: Monthly Vercel token audit

echo "=== Vercel Token Audit ==="
echo "Date: $(date)"
echo ""

# This would ideally use Vercel API, but manual check for now
echo "Manual steps:"
echo "1. Visit: https://vercel.com/account/tokens"
echo "2. Count active tokens (should be ≤ 3)"
echo "3. Check token ages (revoke any > 90 days old)"
echo "4. Verify each token has documented purpose"
echo ""
echo "Expected tokens:"
echo "- GitHub-Actions-Deploy (CI/CD)"
echo "- Vercel Dashboard Browser (Manual access)"
echo ""
echo "If more than 3 tokens exist, investigate and revoke extras."
```

**Status**: ⬜ Not started
**Owner**: AI
**ETA**: 10 minutes (create + test script)

## Prevention Measures

### Rule 1: No Automatic Token Creation
**Policy**: AI agents MUST NOT create Vercel tokens automatically

**Implementation**:
- Add check to AI agent guidelines
- Raise error if AI attempts `vercel login` or token creation
- Require user interaction for all new tokens

**Enforcement**: Code review + documentation

### Rule 2: Maximum 3 Active Tokens
**Policy**: Never have more than 3 active Vercel tokens

**Rationale**:
1. GitHub Actions (1 token)
2. Local CLI (1 token, optional)
3. Browser/Emergency (1 token)

**Enforcement**: Monthly audit script

### Rule 3: 90-Day Rotation
**Policy**: Rotate all tokens every 90 days

**Process**:
1. Calendar reminder triggers
2. Create new token with date suffix: `github-actions-2026-02-15`
3. Update GitHub secret
4. Test deployment
5. Revoke old token
6. Update password manager
7. Set next reminder

**Enforcement**: Calendar + checklist

### Rule 4: Named with Purpose and Date
**Policy**: All tokens must follow naming convention

**Format**: `{purpose}-{YYYY-MM-DD}`

**Examples**:
- `github-actions-2025-11-17`
- `local-cli-2025-12-01`
- `emergency-access-2025-11-20`

**Rationale**: Easy to identify age and purpose at glance

**Enforcement**: Documentation + manual review

## Security Implications

### Risk: Token Leakage
**Scenario**: Old tokens left active after replacement
**Impact**: Unauthorized access to Vercel account
**Mitigation**: Immediate revocation of replaced tokens (this checklist)

### Risk: Token in Logs
**Scenario**: AI session logs might contain token values
**Impact**: Tokens exposed in conversation history
**Mitigation**:
1. Revoke all AI-created tokens (done Nov 16-17)
2. Prevent future AI token creation (new policy)
3. Audit AI session logs for token values (manual check needed)

### Risk: No Expiration
**Scenario**: Tokens set to "Never expires"
**Impact**: Indefinite access if compromised
**Mitigation**: 90-day rotation policy (compensates for no-expiry)

## Completion Criteria

This checklist is complete when:
- [ ] New token verified working in GitHub Actions
- [ ] Old "github-cli" (Aug 13) token revoked
- [ ] Current tokens documented in password manager
- [ ] Rotation reminders added to calendar
- [ ] Audit script created and tested
- [ ] Total active tokens ≤ 3
- [ ] All tokens follow naming convention
- [ ] CL-DEPLOY-001 incident report references this checklist

## Last Updated
November 17, 2025 - Initial checklist creation
