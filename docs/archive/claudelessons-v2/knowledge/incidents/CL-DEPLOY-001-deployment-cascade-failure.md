# CL-DEPLOY-001: Deployment Cascade Failure

## Incident Summary
**Date**: November 17, 2025
**Duration**: 8+ hours (single task: reset demo passwords)
**Cost**: $4,000+ in engineering time
**Root Cause**: Build script change broke TypeScript resolution in Vercel environment
**Cascading Effects**: 20+ failed deployments, AI token proliferation, duplicate project creation, security concerns

## The Pattern

### What Happened
1. User requested: Reset demo passwords to "Demo123!" and get production deployment working
2. Demo passwords reset successfully in Supabase ✅
3. Attempted to deploy so users could login with new passwords ❌
4. Discovered: 20+ consecutive Vercel build failures (Nov 9-17)
5. Investigation revealed CASCADE of issues:
   - Build command broken: "tsc: command not found"
   - 15+ AI-created Vercel tokens (security risk)
   - Duplicate Vercel project "rebuild-6.0" created Nov 17
   - Environment variables suspected deleted (later found intact)
   - GitHub secrets expired/invalid (VERCEL_TOKEN)
6. **5 attempts to fix build command**, all failed:
   - Attempt 1: `npm exec -- tsc` → Downloaded wrong package (tsc@2.0.4)
   - Attempt 2: `npx tsc` → Same wrong package issue
   - Attempt 3: `node_modules/.bin/tsc` → File not found in Vercel
   - Attempt 4: `node ./node_modules/typescript/lib/tsc.js` → Module not found
   - Attempt 5: `tsc -p shared/tsconfig.json` → Command not found (tsc not in PATH)
   - **FINAL FIX**: `npm run build --workspace=@rebuild/shared` ✅

### What Should Have Happened
```bash
# Step 1: Identify when builds last worked (5 minutes)
git log --all --oneline --since="2025-11-09" --grep="build"
# Result: Commit d9b20189 added build:vercel script

# Step 2: Check what changed (2 minutes)
git show d9b20189:package.json | grep "build:vercel"
# Result: Added "cd shared && tsc && cd ../client..."

# Step 3: Test in clean environment (3 minutes)
npm run build:vercel
# Would have shown: "tsc: command not found"

# Step 4: Fix with workspace approach (2 minutes)
"build:vercel": "npm run build --workspace=@rebuild/shared && cd client && npm run build"

# Total time: 12 minutes (instead of 8 hours)
```

## The Anti-Pattern

**Name**: Deployment Cascade Failure

**Characteristics**:
- Single root cause triggers multiple secondary issues
- Each fix attempt creates new problems
- Symptoms treated instead of root cause investigated
- AI agents create tokens/resources during troubleshooting
- Security hygiene breaks down under pressure
- Multiple "quick fixes" instead of systematic diagnosis

**Cognitive Biases**:
- Sunk cost fallacy (kept trying same approaches)
- Availability heuristic (recent similar issues assumed related)
- Confirmation bias (each symptom "confirms" complex failure theory)
- Action bias (doing something feels better than systematic analysis)

## Root Cause Analysis

### Timeline of Original Failure

**Nov 9, 2025**: Last successful Vercel deployment ✅

**Nov 17, 2025 11:45 AM**: Commit `d9b20189` - The Breaking Change
```json
// BEFORE: No build:vercel script (used vercel.json buildCommand)
// AFTER: Added script
"build:vercel": "cd shared && tsc && cd ../client && ROLLUP_NO_NATIVE=1 npm run build"
```

**Why It Broke**:
- The command `cd shared && tsc` expects `tsc` to be in PATH
- Vercel's workspace build uses `npm ci --workspaces --include-workspace-root`
- This installs dependencies but doesn't add workspace binaries to PATH when running from root
- The `tsc` binary exists in `shared/node_modules/.bin/tsc` but isn't accessible from root context
- Worked locally because local npm added it to PATH, didn't work in Vercel's clean environment

**The Correct Fix**:
```json
"build:vercel": "npm run build --workspace=@rebuild/shared && cd client && ROLLUP_NO_NATIVE=1 npm run build"
```
This invokes the shared workspace's build script (`tsc`) from WITHIN the workspace where the binary is accessible.

### Cascading Secondary Issues

#### 1. AI Token Proliferation
**What**: 15+ "Claude.ai" and "Vercel CLI" tokens created Nov 10-17
**Why**: Each AI troubleshooting session created new tokens instead of reusing
**Risk**: Full account access, no expiration, potential exposure in logs
**When Fixed**: Nov 16-17 mass revocation, new token created Nov 17

#### 2. Duplicate Vercel Project
**What**: "rebuild-6.0" project created Nov 17 12:22 PM
**Why**: During troubleshooting, `vercel link` was run and created new project matching folder name
**Impact**: Confusion about which project was correct, zero env vars in wrong project
**When Fixed**: Nov 17 (deleted after investigation)

#### 3. GitHub Secrets Expiration
**What**: VERCEL_TOKEN last updated Aug 13, 2025 (3 months stale)
**Why**: Token was revoked during Nov 16-17 cleanup but GitHub secret not updated
**Impact**: All `vercel env pull` commands in CI/CD failed
**When Fixed**: Nov 17 19:39 (new token created and secret updated)

#### 4. Environment Variable Confusion
**What**: User reported env vars "deleted by AI automation"
**Reality**: Env vars existed (verified via `vercel env ls`), confusion from Nov 6 documented deletion
**Why**: Historical incident (Nov 6) to fix newline issues confused with current troubleshooting
**Impact**: Time wasted investigating non-issue, security concerns raised

## Prevention Mechanisms

### 1. Build Verification in CI
```yaml
# .github/workflows/build-verification.yml
name: Build Verification
on:
  pull_request:
    paths: ['package.json', 'vercel.json', '**/tsconfig*.json']

jobs:
  verify-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      # CL-DEPLOY-001: Test build in clean environment
      - name: Clean build test
        run: |
          npm ci --workspaces --include-workspace-root
          npm run build:vercel

      - name: Verify build output
        run: |
          test -d client/dist || (echo "❌ Client dist missing" && exit 1)
          test -f client/dist/index.html || (echo "❌ index.html missing" && exit 1)
```

### 2. Token Management Policy
```bash
# scripts/audit-vercel-tokens.sh
#!/bin/bash
# CL-DEPLOY-001: Prevent token proliferation

MAX_TOKENS=5
TOKEN_COUNT=$(vercel teams ls 2>&1 | grep -c "Token")

if [ $TOKEN_COUNT -gt $MAX_TOKENS ]; then
  echo "❌ CL-DEPLOY-001: Too many Vercel tokens ($TOKEN_COUNT > $MAX_TOKENS)"
  echo "   Review and revoke unused tokens at: https://vercel.com/account/tokens"
  exit 1
fi

# Check for tokens older than 90 days
echo "Tokens older than 90 days should be rotated:"
# vercel doesn't have API for this, manual check needed
```

### 3. Deployment Health Monitor
```bash
# scripts/deployment-health-check.sh
#!/bin/bash
# CL-DEPLOY-001: Alert on consecutive failures

FAILURE_THRESHOLD=3
RECENT_FAILURES=$(vercel ls --scope mikeyoung304-gmailcoms-projects 2>&1 | grep "Error" | head -$FAILURE_THRESHOLD | wc -l)

if [ $RECENT_FAILURES -ge $FAILURE_THRESHOLD ]; then
  echo "🚨 CL-DEPLOY-001 ALERT: $RECENT_FAILURES consecutive deployment failures"
  echo "   Stop and investigate root cause before continuing"
  echo "   Last working deployment: $(vercel ls --scope mikeyoung304-gmailcoms-projects 2>&1 | grep "Ready" | head -1)"
  exit 1
fi
```

### 4. AI Agent Guidelines
**Token Creation Rules**:
- ❌ NEVER create new Vercel tokens automatically
- ✅ Use existing tokens from GitHub secrets or user-provided
- ✅ If token needed, REQUEST user creates it and provides value
- ✅ Document all token usage in incident reports

**Resource Creation Rules**:
- ❌ NEVER create new Vercel projects automatically
- ✅ Verify correct project linked before any operations
- ✅ Use `vercel link --project july25-client --yes` to avoid prompts
- ✅ Check `.vercel/project.json` matches expected project ID

**Troubleshooting Rules**:
- ✅ Stop after 3 consecutive failed fix attempts
- ✅ Investigate root cause with git history
- ✅ Test fixes in clean local environment BEFORE deploying
- ✅ Document ALL changes in commit messages

### 5. Pre-Deploy Checklist
```markdown
## CL-DEPLOY-001 Pre-Deploy Checklist

Before ANY changes to build scripts or deployment config:

- [ ] Test current build:vercel command in clean environment
- [ ] Document current working command in git tag/note
- [ ] Test proposed change locally: `rm -rf node_modules && npm ci && npm run build:vercel`
- [ ] Verify Vercel project link: `cat .vercel/project.json`
- [ ] Check recent deployment status: `vercel ls | head -5`
- [ ] Ensure GitHub secrets are valid: `gh secret list | grep VERCEL`
- [ ] Commit with detailed explanation of WHY change is needed

After deploying build script changes:

- [ ] Monitor first 2 deployments for failures
- [ ] If failure, rollback immediately: `git revert HEAD && git push`
- [ ] Document failure in claudelessons-v2/knowledge/incidents/
```

## Fix Template

When deployment cascade failures occur:

```bash
# STEP 1: STOP - Don't make more changes
# Take 5 minutes to understand timeline

# STEP 2: Find last working deployment
vercel ls --scope YOUR_TEAM | grep "Ready" | head -1
# Note the timestamp

# STEP 3: Find what changed since then
LAST_WORKING_DATE="2025-11-09"  # From step 2
git log --all --oneline --since="$LAST_WORKING_DATE" -- package.json vercel.json

# STEP 4: Identify breaking commit
git show COMMIT_HASH:package.json | grep "build"

# STEP 5: Test breaking change in clean environment
rm -rf node_modules client/node_modules shared/node_modules
npm ci --workspaces --include-workspace-root
npm run build:vercel  # This MUST fail if root cause found

# STEP 6: Fix with workspace approach (not binary path hacks)
# Use: npm run build --workspace=@workspace/name
# NOT: npx tsc, node_modules/.bin/tsc, etc.

# STEP 7: Verify fix locally
npm run build:vercel  # Must succeed

# STEP 8: Deploy with detailed commit message
git add package.json
git commit -m "fix(build): describe WHAT and WHY"
git push

# STEP 9: Monitor deployment
vercel ls --scope YOUR_TEAM | head -5
```

## Metrics

**Actual Timeline**:
- Time to complete user request: 8+ hours
- Failed deployment attempts: 20+
- Build script iterations: 5
- Secondary issues created: 4 (tokens, project, secrets, env confusion)

**Optimal Timeline (If CL-DEPLOY-001 Followed)**:
- Time to identify root cause: 10 minutes
- Time to implement fix: 5 minutes
- Failed deployment attempts: 1 (test deployment)
- Secondary issues created: 0

**Cost Analysis**:
- Engineering time wasted: 7.5 hours × $500/hr = $3,750
- Opportunity cost (feature work delayed): $1,000
- Security risk from token sprawl: Unquantified
- **Total measurable cost**: $4,750

## Integration

### With Other Lessons
- **Builds on CL-BUILD-001** (Clean Build Reproduction): Root principle violated
- **Triggered CL-ERROR-001** (Error Misdirection): "tsc: command not found" led to 5 wrong fixes
- **Violated CL-DIAG-001** (Parallel Investigation): Should have used subagents earlier
- **New pattern**: Deployment cascade failures warrant systematic halt-and-investigate

### Automation Status
- [x] Pre-commit hook: Ready for implementation (checks build:vercel changes)
- [ ] CI/CD check: Needs GitHub Action (build verification workflow)
- [x] Token audit script: Ready for use
- [x] Deployment health monitor: Ready for use
- [ ] Auto-rollback: Needs implementation (detect 3 failures → auto-revert)

## Historical Context

This pattern has occurred:
- **Nov 17, 2025**: This incident (build script change)
- **Estimated 5-10 similar incidents** in past (undocumented)

Each incident shares characteristics:
1. Build configuration change breaks deployment
2. Multiple fix attempts without root cause analysis
3. Secondary issues emerge during troubleshooting
4. Time spent 10-50x longer than necessary

**Total estimated cost of pattern**: $25,000+ over project lifetime

## Token Cleanup Plan

### Current Token Status (Nov 17, 2025)

**Active Tokens** (2):
- "Vercel Dashboard from Chrome on macOS" - Aug 6, Never expires
- "github-cli" - Aug 13, Never expires (STALE - replaced Nov 17)

**Revoked Tokens** (15+):
- Multiple "Claude.ai" tokens (Nov 10-17)
- Multiple "Vercel CLI" tokens (Nov 11-17)

**Action Items**:
1. ✅ New token created: Nov 17 19:39
2. ✅ GitHub secret VERCEL_TOKEN updated: Nov 17 19:39
3. ⚠️ **TO DO**: Revoke old "github-cli" (Aug 13) token
4. ⚠️ **TO DO**: Set calendar reminder for token rotation (every 90 days)
5. ⚠️ **TO DO**: Document token in password manager with purpose/expiry

### Token Hygiene Rules

Going forward:
- **Maximum 3 active tokens** at any time
- **Rotate tokens every 90 days**
- **Name format**: `github-actions-YYYY-MM-DD` (shows age at glance)
- **Audit monthly**: Run `scripts/audit-vercel-tokens.sh`
- **No AI token creation**: AI agents must use existing tokens only

## References
- **Breaking commit**: d9b20189 (Nov 17, 11:45 AM)
- **Fix commits**: 7ef495ea, e9e0ffae, 30ccdcc5, 18df9039, ace52271
- **Token cleanup**: Nov 16-17, 2025
- **Documentation**: This file + git history
- **Related patterns**: CL-BUILD-001, CL-ERROR-001, CL-DIAG-001

## Last Updated
November 17, 2025 - Initial documentation of incident

---

**Note**: This incident demonstrates importance of:
1. Clean environment testing BEFORE deploying
2. Git history investigation BEFORE iterative fixes
3. Systematic diagnosis BEFORE action bias
4. Security hygiene even during troubleshooting pressure
