# Vercel Deployment Problem Analysis - Executive Summary

**Date**: November 24, 2025
**Status**: Complete investigation completed
**Location**: See full analysis at `docs/archive/2025-11/VERCEL_DEPLOYMENT_COMPREHENSIVE_ANALYSIS.md`

## TL;DR - What's Happening

The rebuild-6.0 repository experiences recurring Vercel deployment problems caused by **5 interconnected issues**:

### 1. Monorepo PATH Resolution (Primary Issue)
- **What**: Build scripts work locally but fail in Vercel's isolated workspace
- **Why**: Local npm adds workspace binaries to PATH; Vercel doesn't
- **Evidence**: Nov 17 incident - 13 commits trying different PATH solutions
- **Fix**: Use `npm run build --workspace=X` pattern (not bare `tsc`)

### 2. Rogue .vercel Directories (Architectural)
- **What**: Running `vercel link` from subdirectories creates duplicate projects
- **Evidence**: Oct 26 created server/.vercel/ (ghost project, still visible in git history)
- **Current**: Only root .vercel/ exists (ghost was cleaned up)
- **Risk**: Could happen again - no CI/CD prevention

### 3. Build Script Fragility (Process)
- **What**: Root uses `npm run build --workspace=`, shared uses bare `tsc`, client uses `npm exec -- vite`
- **Why**: Multiple places define build behavior with inconsistent patterns
- **Problem**: Changes to one script break others

### 4. Credential & Token Management (Security)
- **What**: Nov 17 incident created 15-20 Vercel tokens automatically
- **Why**: Scripts triggered OAuth flow instead of using explicit --token parameter
- **Impact**: Tokens have full account access, no expiration, never cleaned up

### 5. Environment File Sprawl (Operational)
- **What**: 15+ .env files with overlapping .gitignore rules
- **Issues**: Configuration drift, newline contamination (Nov 6), VITE_DEMO_PANEL=1 in production
- **Target**: Consolidate to 2 files (.env + .env.example)

---

## Current State (Working)

### What Exists Now

**✅ Active .vercel Directory**
```
/root/.vercel/project.json
├── projectId: prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n
├── orgId: team_OesWPwxqmdOsNGDnz0RqS4kA
└── projectName: july25-client (CORRECT)
```

**✅ No Ghost Projects**
- server/.vercel/ - Does NOT exist (cleaned up)
- client/.vercel/ - Does NOT exist (correct, no subdirectory projects)

**✅ Deployment Pipeline Working**
- vercel.json configured correctly
- build:vercel script functional
- GitHub Actions automated deployment active

**✅ Safeguards in Place**
- vercel-deploy.sh checks for rogue directories
- pre-deploy-validation.sh validates environment variables
- GitHub workflows reduced from 27 to 11 (removed race conditions)

---

## Historical Pattern - Why It Keeps Happening

### The Recurring Cycle

```
1. Developer adds feature/fix
   ↓
2. Commits change to build configuration or environment
   ↓
3. Works locally (npm adds binaries to PATH)
   ↓
4. Deployed to Vercel (isolated workspace, PATH doesn't include binaries)
   ↓
5. Build fails with "X: command not found"
   ↓
6. Developer tries multiple quick fixes (trial & error)
   - Attempt 1: npx X → Downloads wrong package
   - Attempt 2: Direct path → File not found in Vercel
   - Attempt 3: npm exec -- X → Takes time to work
   ↓
7. Each failed attempt creates new Vercel token (if using OAuth flow)
   ↓
8. System eventually stabilizes with workarounds
   ↓
9. Cycle repeats when next build change needed
```

### Evidence of Cycle

**Oct 26, 2025** - Ghost project created (commit 64a8ed58)
- Ran `vercel link` from server/ directory
- Created second Vercel project
- Could have been prevented by workflow guard

**Nov 6, 2025** - Environment variable contamination discovered
- Variables had literal \n characters
- Routing and auth broken
- Had persisted for days unnoticed

**Nov 17, 2025** - CATASTROPHIC 8-hour incident
- Single commit d9b20189 broke build
- 13 commits attempting fixes (trial & error)
- 15-20 tokens created automatically
- 27 GitHub workflows causing race conditions
- 8+ attempts using different PATH solutions

**Current** - Stabilized but fragile
- System works but brittle
- Root causes not fully addressed
- Risk of recurrence high

---

## What Should Be Done

### Immediate (P0 - Today)

1. **Verify production environment**
   - [ ] Check VITE_DEMO_PANEL is 'false' (not '1')
   - [ ] Verify no secret exposure
   - [ ] Confirm only july25-client Vercel project active

2. **Token audit**
   - [ ] List all Vercel tokens in dashboard
   - [ ] Revoke excess tokens (keep max 3)
   - [ ] Document current tokens in docs/security/VERCEL_TOKENS.md

3. **No action needed on .vercel directories**
   - Only root .vercel/ exists (correct)
   - Ghost projects cleaned up
   - But CI/CD guard should be re-enabled

### This Week (P1)

1. **Re-enable deployment safeguard**
   - `.github/workflows-disabled/vercel-guard.yml` exists but disabled
   - Re-enable it to prevent future ghost projects
   - Time: 30 minutes

2. **Consolidate .env files**
   - Keep: .env (local, ignored), .env.example (template)
   - Delete: 13 other .env files
   - Time: 2 hours

3. **Fix .gitignore conflicts**
   - Clean up overlapping rules (lines 17, 64, 67, 70)
   - Time: 30 minutes

4. **Standardize build scripts**
   - Ensure all use `npm run build --workspace=` pattern
   - Remove bare `tsc` or `vite` commands
   - Time: 1 hour

### This Month (P2)

1. **Create deployment guard CI job**
   - Test build in clean Vercel-like environment
   - Prevent "works locally but fails in Vercel" issues
   - Time: 2 hours

2. **Document deployment targets**
   - Create DEPLOYMENT_MATRIX.md (service → platform mapping)
   - Client → Vercel, Server → Render, etc.
   - Time: 1 hour

3. **Consolidate scripts**
   - Current: 90+ scripts (31 deployment-related)
   - Target: 50-60 scripts (5 core deployment)
   - Time: 3 hours

---

## Prevention Strategy

### Key Rules

1. **All developers must**
   - Always work from project root (scripts enforce this)
   - Test build locally with `npm run build:vercel` before pushing
   - Never run `vercel link` from subdirectories

2. **All build scripts must**
   - Use `npm run build --workspace=X` pattern
   - NEVER use bare commands (tsc, vite without npm wrapper)
   - Explicitly specify --token in vercel commands

3. **All CI/CD must**
   - Test builds in clean environment (not just local)
   - Re-enable deployment guard workflow
   - Limit Vercel tokens to 3 maximum
   - Rotate tokens every 90 days

4. **All configuration must**
   - Have single source of truth (not replicated in multiple files)
   - Include validation checks (newlines, format, required vars)
   - Document why each file exists

---

## Files to Watch

### Configuration
- `.vercel/project.json` - Current Vercel project (july25-client)
- `vercel.json` - Build instructions
- `package.json` - Build scripts (watch build:vercel)
- `shared/package.json` - Watch build script
- `client/package.json` - Watch build script

### Deployment Scripts
- `scripts/vercel-deploy.sh` - Manual deployment safeguard
- `scripts/pre-deploy-validation.sh` - Pre-flight checks
- `.github/workflows/deploy-with-validation.yml` - Automated deployment
- `.github/workflows-disabled/vercel-guard.yml` - SHOULD BE ENABLED

### Environment
- `.env.example` - Template (only keep this + .env)
- `.env` - Local development (git ignored, not tracked)
- DELETE: All other .env.* files

---

## Quick Reference Commands

### Verify Current State
```bash
# Check Vercel project
cat .vercel/project.json | grep projectName

# Check for rogue directories
find . -name ".vercel" -type d | grep -v "^\.\/.vercel$"

# Check environment
head -20 .env.example

# Check GitHub workflows
ls .github/workflows/*.yml | wc -l
```

### Test Build (Before Pushing)
```bash
npm run build:vercel
```

### Safe Manual Deploy (If Needed)
```bash
npm run deploy
# Runs ./scripts/vercel-deploy.sh with safeguards
```

### Check What Will Deploy
```bash
cat vercel.json | grep buildCommand
cat package.json | grep '"build:vercel"'
```

---

## Summary

**Problem**: Recurring Vercel deployment failures due to monorepo complexity
**Current Status**: Working but fragile
**Root Causes**: 5 interconnected issues (PATH, rogue directories, scripts, tokens, env files)
**Prevention**: 6-8 hours of focused work to implement safeguards
**Risk Level**: Medium (could recur if build configuration changes)
**Recommendation**: Implement P0 + P1 tasks this week, P2 tasks this month

**Full analysis**: `/Users/mikeyoung/CODING/rebuild-6.0/docs/archive/2025-11/VERCEL_DEPLOYMENT_COMPREHENSIVE_ANALYSIS.md`

---

*This analysis was conducted on November 24, 2025 by Claude Code through comprehensive investigation of git history, configuration files, deployment scripts, and documentation.*
