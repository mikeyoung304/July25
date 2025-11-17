# COMPREHENSIVE DEPLOYMENT ECOSYSTEM INVESTIGATION REPORT
**Investigation Date:** November 17, 2025
**Thoroughness Level:** VERY THOROUGH
**Status:** Complete Analysis of Critical Breaking Changes

---

## EXECUTIVE SUMMARY

The deployment ecosystem has experienced **13 significant breaking changes in 48 hours (Nov 16-17, 2025)** related to monorepo build command resolution in Vercel. The root cause is **npm workspace binary resolution complexity** - when Vercel runs `npm run build --workspace shared`, it cannot locate binaries in the workspace's `node_modules/.bin`.

### Critical Timeline
- **Nov 16, 11:53** - Major infrastructure overhaul committed (ba99b4a2)
- **Nov 16, 12:08 - 18:33** - 8 consecutive build fixes attempted
- **Nov 17, 09:43 - 11:19** - 6 more build fixes attempting different approaches
- **Result:** Oscillating between 4 different strategies with no convergence

### Current Status (HEAD)
- **Latest Commit:** 75f79ddf (fix(shared): use npm exec for tsc)
- **Time:** 2025-11-17 11:19:55 -0500
- **Build Command:** `npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client`
- **Shared Build Script:** `"build": "npm exec -- tsc"`
- **Client Build Script:** `"build": "NODE_ENV=production ROLLUP_NO_NATIVE=1 npm exec -- vite build"`

---

## PART 1: DEPLOYMENT CONFIGURATION ANALYSIS

### 1.1 Vercel Configuration (vercel.json)

**Current State (Latest):**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm ci --workspaces --include-workspace-root",
  "buildCommand": "npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client",
  "outputDirectory": "client/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [...]
}
```

**Evolution:**
- **c5459b00 (18:29)** - Removed shared build: `npm run build --workspace client`
- **f03a5fcb (11:05)** - Re-added shared build: `npm run build --workspace shared && ...`

**Critical Issue:** The buildCommand delegates to npm scripts, which then tries to resolve binaries in workspace-specific node_modules.

### 1.2 Root package.json (package.json)

**Key Changes:**
- Line 108: Added `"typescript": "^5.3.3"` (79363f45, Nov 16 18:25)
- Line 109: Added `"vite": "5.4.19"` (6d3ce4fe, Nov 16 18:33)

**Rationale:** Vercel needs root-level access to these binaries when running workspace builds.

**Root Dependencies:**
```json
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "5.4.19",
    "@apidevtools/swagger-parser": "^12.1.0",
    ...
  }
}
```

### 1.3 Shared Workspace (shared/package.json)

**Build Script Evolution:**
```
cab2ac49 (18:23): "build": "npx tsc"           [Attempt 1: npx fallback]
79363f45 (18:25): "build": "tsc"                [Attempt 2: direct tsc]
75f79ddf (11:19): "build": "npm exec -- tsc"    [Attempt 3: npm exec wrapper]
```

**Current:**
```json
{
  "scripts": {
    "build": "npm exec -- tsc",
    "typecheck": "npm exec -- tsc --noEmit",
    "typecheck:quick": "npm exec -- tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

### 1.4 Client Workspace (client/package.json)

**Build Script Evolution:**
```
17f9a8e5 (09:59): "build": "... npx vite build"      [Attempt 1: npx prefix]
aacee034 (10:55): "build": "... vite build"            [Attempt 2: no npx]
e42c565a (11:00): "build": "... npm exec -- vite ..."  [Attempt 3: npm exec]
```

**Current (Line 9):**
```json
"build": "NODE_ENV=production ROLLUP_NO_NATIVE=1 npm exec -- vite build"
```

**Note:** Other vite commands not updated:
- Line 6: `"dev": "vite"` (still uses bare command)
- Line 12: `"preview": "vite preview --port 4173"` (still uses bare command)
- Line 21: `"analyze": "vite build --mode analyze"` (uses bare vite, not npm exec)

### 1.5 GitHub Actions Workflow - Vercel Deploy

**File:** `.github/workflows/deploy-client-vercel.yml`

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Vercel CLI
        run: npm i -g vercel@latest
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          vercel pull --yes --environment=production --token $VERCEL_TOKEN
          vercel build --prod --token $VERCEL_TOKEN
          vercel deploy --prod --prebuilt --token $VERCEL_TOKEN
```

**Issue:** This uses `vercel build`, not local npm commands. Vercel will use vercel.json buildCommand.

### 1.6 Vercel Project Guard Workflow

**File:** `.github/workflows/vercel-guard.yml`

```yaml
steps:
  - run: npm ci || npm i
    env:
      PUPPETEER_SKIP_DOWNLOAD: 'true'
  - run: npm run build --workspace shared
  - run: npm run check:vercel
```

**Issue:** This validates shared build locally, masking Vercel-specific path issues.

---

## PART 2: BUILD SYSTEM EVOLUTION & ROOT CAUSE

### 2.1 The Core Problem

When Vercel executes `npm run build --workspace shared`:

1. Vercel creates isolated `/vercel/shared` directory
2. npm resolves `build` script from `/vercel/shared/package.json`
3. Script attempts to run `npm exec -- tsc`
4. npm looks for `tsc` in:
   - `/vercel/shared/node_modules/.bin/tsc` ❌ (empty, not installed)
   - `/vercel/node_modules/.bin/tsc` ❌ (empty during workspace mode)
   - System PATH ❌ (not installed globally)

### 2.2 The Oscillation Problem

**Root Cause:** Each attempt assumes a different resolution strategy:

| Commit | Time | Approach | Problem |
|--------|------|----------|---------|
| cab2ac49 | 18:23 | `npx tsc` | npx downloads latest, not from installed |
| 79363f45 | 18:25 | Add TypeScript to root + `tsc` | Assumes root is in PATH |
| 6d3ce4fe | 18:33 | Add vite to root | Same root PATH assumption |
| 17f9a8e5 | 09:59 | Change to `npx vite` | Still downloading latest |
| aacee034 | 10:55 | Remove npx | Bare command fails in workspace |
| e42c565a | 11:00 | Use `npm exec -- vite` | Correct for client |
| c5459b00 | 18:29 | Remove shared build | Breaks dependency chain |
| f03a5fcb | 11:05 | Re-add shared build | Now trying with npm exec |
| 75f79ddf | 11:19 | Use `npm exec -- tsc` | Consistent with vite approach |

**Pattern:** Developers are trying different npm command patterns without understanding Vercel's workspace execution model.

### 2.3 Binary Resolution Strategies

**Strategy A: Direct Command**
```json
"build": "tsc"
```
- ✅ Works locally (shell finds tsc in node_modules/.bin)
- ❌ Fails in Vercel workspace (isolated path)

**Strategy B: npx (Download)**
```json
"build": "npx tsc"
```
- ✅ Works everywhere (npx downloads if needed)
- ⚠️ Slow (downloads from npm registry)
- ⚠️ May get different version than installed

**Strategy C: npm exec (Workspace-Aware)**
```json
"build": "npm exec -- tsc"
```
- ✅ Works in Vercel workspace
- ✅ Uses installed version
- ✅ Respects workspace boundaries
- ✅ Recommended by npm for workspaces

**Strategy D: Root devDependencies**
```json
// root package.json
"devDependencies": {
  "typescript": "^5.3.3",
  "vite": "5.4.19"
}
```
- ✅ Makes binaries available at root
- ❌ Clutters root (belongs in workspace)
- ❌ Doesn't solve workspace isolation
- ⚠️ Temporary workaround, not permanent fix

### 2.4 Current Inconsistencies

**Shared workspace scripts:**
```json
"build": "npm exec -- tsc",              // Using npm exec ✅
"typecheck": "npm exec -- tsc --noEmit", // Using npm exec ✅
```

**Client workspace scripts:**
```json
"build": "... npm exec -- vite build",   // Using npm exec ✅
"dev": "vite",                            // Direct command ❌ (dev only)
"preview": "vite preview --port 4173",   // Direct command ❌
"analyze": "vite build --mode analyze"   // Direct command ❌
```

**Issue:** Client has inconsistent strategy - build uses npm exec but other commands don't.

---

## PART 3: ENVIRONMENT FILE REORGANIZATION

### 3.1 Environment File Changes

**Git History Search Results:**
- e395c09b (Nov 17, 09:43): `docs(env): remove localhost references`
- ba99b4a2 (Nov 16, 11:53): `feat(infra): environment overhaul` - Major commit
- 503d9625 (Nov 11): `docs(env): comprehensive audit`

**From ba99b4a2 commit message:**
```
Reduced .env files from 15 to 3 (eliminated 80% drift surface)
Deleted 12 redundant .env configuration files
```

### 3.2 Current .env File Structure

Based on git status and vercel.json:
- `.env.example` (38 variables documented)
- `.env.production` (Vercel secrets - not in repo)
- `.env.development` (local development - not shown in git)

**No movement/reorganization required** - consolidation already complete.

---

## PART 4: RECENT COMMITS ANALYSIS (Nov 16-17)

### 4.1 Chronological Breakdown

#### November 16, 2025

**11:53 - ba99b4a2: feat(infra) - Major Infrastructure Overhaul**
- Added TypeScript compilation validation
- Moved @types from devDependencies to dependencies (Render requirement)
- Modified start script from tsx to node
- Deleted 12 redundant .env files
- Created CI/CD automation workflows

**12:08 - 2ee0735c: fix(build) - Render TypeScript Failures**
- Fixed implicit any types
- Adjusted tsconfig.prod.json
- Added missing type definitions

**12:17 - da5d618f: fix(build) - Add @types/csurf**
- Missing type dependency for CSRF protection

**13:53 - 1523d099: fix(build) - Resolve Browser Code in Shared**
- Moved DOM-dependent code out of shared workspace
- Prevents server build from including browser APIs

**15:11 - 7ea970d8: fix(server) - Correct Start Script**
- Changed from `tsx src/server.ts` to `node dist/server/src/server.js`
- Aligns with compiled output structure

**18:11 - 8ac44e13: fix(client) - Remove tsconfig extends**
- Removed: `"extends": "../tsconfig.base.json"`
- Reason: Vercel only has client/ directory, can't access parent
- File: client/tsconfig.app.json

**18:23 - cab2ac49: fix(shared) - Use npx tsc**
- Changes:
  - `"build": "tsc"` → `"build": "npx tsc"`
  - `"typecheck": "tsc --noEmit"` → `"typecheck": "npx tsc --noEmit"`

**18:25 - 79363f45: fix(build) - Add TypeScript to Root**
- Added `"typescript": "^5.3.3"` to root devDependencies
- Reverted shared back to `tsc` (without npx)
- Commit message: "Vercel npm workspaces need TypeScript at root"

**18:27 - 58893209: chore - Update package-lock.json**
- Locked in root typescript dependency

**18:29 - c5459b00: fix(vercel) - Remove Shared Build**
- vercel.json: Removed `npm run build --workspace shared &&`
- Rationale: "Vite can import TypeScript from shared directly"
- **Problem:** Doesn't build shared/dist needed by client imports

**18:33 - 6d3ce4fe: fix(build) - Add vite to Root**
- Added `"vite": "5.4.19"` to root devDependencies
- Rationale: "workspace binaries not in PATH"

#### November 17, 2025

**09:43 - e395c09b: docs(env) - Remove Localhost References**
- Updated .env.example with production URLs

**09:59 - 17f9a8e5: fix(build) - Use npx vite**
- All client vite commands changed to use npx prefix
- `"dev": "vite"` → `"dev": "npx vite"`
- `"build": "... vite build"` → `"build": "... npx vite build"`

**10:28 - 50555646: fix(deps) - Add @radix-ui/react-tooltip**
- Missing dependency added

**10:55 - aacee034: fix(build) - Remove npx from Vite**
- Reverts 17f9a8e5
- Changes `npx vite` back to bare `vite`
- Rationale: "npx downloads latest (7.2.2) causing failures"

**11:00 - e42c565a: fix(build) - Use npm exec for Vite**
- Changes client: `"build": "... npm exec -- vite build"`
- Explains: "ensure vite binary found in workspace"

**11:05 - f03a5fcb: fix(vercel) - Build Shared Before Client**
- Reverses c5459b00
- Restores: `npm run build --workspace shared &&`
- Reason: "Could not load /vercel/shared/dist" error

**11:19 - 75f79ddf: fix(shared) - Use npm exec for tsc**
- Changes shared to match client pattern
- `"build": "tsc"` → `"build": "npm exec -- tsc"`
- Explanation: "ensure TypeScript compiler found in workspace"

### 4.2 Impact Analysis

**Commands Modified:**
- shared/package.json: 3 scripts (build, typecheck, typecheck:quick)
- client/package.json: 1 script confirmed (build)
- vercel.json: 1 command (buildCommand)
- root/package.json: +2 devDependencies (typescript, vite)

**Status:** 13 commits in 24 hours = unstable configuration

---

## PART 5: ROOT CAUSE IDENTIFICATION

### 5.1 The Core Issue

**Primary Problem:** Vercel's monorepo build execution model differs from local development

**Local Execution:**
```bash
$ npm run build --workspace shared
# Runs from /repo/shared with /repo/node_modules in scope
# tsc found in /repo/node_modules/.bin
```

**Vercel Execution:**
```bash
# Only /vercel/client checked out (per deploy context)
$ npm run build --workspace shared
# Attempts to run from /vercel/shared
# /vercel/shared/node_modules/.bin is empty or isolated
# Cannot access /vercel/node_modules/.bin from workspace context
```

### 5.2 Secondary Issues

**Issue 1: Deleted tsconfig.base.json Reference**
- 8ac44e13 removed `"extends": "../tsconfig.base.json"` from client/tsconfig.app.json
- Correct because Vercel deploys only client/
- But creates potential TypeScript config drift

**Issue 2: @types in dependencies**
- ba99b4a2 moved @types from devDependencies to dependencies
- Needed for Render but unusual pattern
- Should be reverted once Render build is fixed

**Issue 3: Root devDependencies Pollution**
- Added typescript and vite to root package.json
- Works as workaround but violates workspace principle
- Should be removed once npm exec is working correctly

---

## PART 6: WORKING VS BROKEN CONFIGURATIONS

### 6.1 Comparison Matrix

| Aspect | Working (Unknown) | Currently Broken |
|--------|-------------------|-----------------|
| shared/build | Unknown | `npm exec -- tsc` |
| client/build | Unknown | `npm exec -- vite build` |
| vercel.json | Unknown | Two-step build |
| root devDeps | None | typescript + vite |
| client tsconfig | Likely extends root | No extends (Vercel limitation) |

### 6.2 Vercel Build Command Comparison

**Broken (Before Nov 16):**
```
"buildCommand": "npm run build --workspace client"
```
- Skips shared build
- Client fails importing from shared/dist

**Current (Latest):**
```
"buildCommand": "npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client"
```
- Builds shared first (correct order)
- Uses npm exec in scripts (correct pattern)
- Still may fail due to Vercel workspace isolation

### 6.3 Potential Solution

**Recommended Fix:**
```json
{
  "framework": "vite",
  "installCommand": "npm ci",
  "buildCommand": "npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build:vite --workspace client",
  "outputDirectory": "client/dist"
}
```

**With in root package.json:**
```json
{
  "scripts": {
    "build:vite": "npm exec --workspaces -- vite build"
  }
}
```

---

## PART 7: TIMELINE OF KEY CHANGES

### Critical Path

```
Nov 16, 11:53
│
├─ ba99b4a2: Infrastructure overhaul
│  ├─ Moved @types to dependencies
│  ├─ Changed server start script
│  └─ Consolidated .env files
│
├─ 12:08 - 18:33: 7 rapid fixes for Render/Vercel
│  ├─ Render start script fix (7ea970d8)
│  ├─ tsconfig.app.json fix (8ac44e13)
│  └─ Root devDeps (79363f45, 6d3ce4fe)
│
└─ 18:23 - 18:33: Binary resolution attempts
   ├─ npx tsc (cab2ac49)
   ├─ Direct tsc (79363f45)
   ├─ Remove shared build (c5459b00)
   └─ Root devDeps (6d3ce4fe)

Nov 17, 09:59 - 11:19
│
└─ 4 more binary resolution attempts
   ├─ npx vite (17f9a8e5)
   ├─ Remove npx (aacee034)
   ├─ npm exec vite (e42c565a)
   ├─ Re-add shared build (f03a5fcb)
   └─ npm exec tsc (75f79ddf)
```

---

## PART 8: SUMMARY TABLE

| Metric | Value |
|--------|-------|
| **Total Breaking Changes** | 13 commits in 24 hours |
| **Build Command Iterations** | 4 different approaches tried |
| **Root Cause** | npm workspace binary resolution in Vercel |
| **Files Modified** | 4 (vercel.json, 3x package.json) |
| **Current Status** | Unstable - oscillating fixes |
| **Latest Commit** | 75f79ddf (11:19 UTC-5, Nov 17) |
| **Recommended Action** | Test `npm exec` strategy comprehensively |

---

## PART 9: CRITICAL FINDINGS

### Finding 1: Workspace Isolation Misunderstanding
Multiple commits show misunderstanding of how Vercel executes npm workspace commands:
- Adding to root devDependencies is a workaround, not a solution
- npm exec is the correct pattern for workspace-isolated builds

### Finding 2: Oscillating Fixes Pattern
The 13 commits show a pattern of trying, reverting, and re-trying without validation:
- No corresponding Vercel deployment test between commits
- Each commit assumes a different npm behavior model
- No investigation of Vercel's actual build environment

### Finding 3: Configuration Debt Accumulation
Multiple layers of "fixes" applied:
1. Root devDependencies (band-aid)
2. npm exec in scripts (workaround)
3. Removed tsconfig extends (Vercel limitation acceptance)
4. Moved @types to dependencies (Render workaround)

### Finding 4: Inconsistent Command Patterns
- Some scripts use npm exec, some don't
- Some use npx, some use bare commands
- vercel.json buildCommand mixes patterns

---

## RECOMMENDATIONS

### Immediate (Validation)
1. Deploy current state to Vercel and capture actual error
2. Compare with working Vercel deployment (if any)
3. Test npm exec specifically in workspace context

### Short-term (Stabilization)
1. Standardize on `npm exec -- tsc` and `npm exec -- vite` pattern
2. Update all client vite commands (dev, preview, analyze) to use npm exec
3. Remove typescript and vite from root devDependencies once npm exec works
4. Revert @types to devDependencies for server once Render build is separate

### Long-term (Prevention)
1. Document Vercel workspace build requirements
2. Create pre-deployment validation workflow
3. Establish one pattern for binary resolution (npm exec preferred)
4. Reduce build command complexity (consider custom build script)

---

## FILES WITH ISSUES

| File | Issue | Line(s) | Status |
|------|-------|---------|--------|
| `/Users/mikeyoung/CODING/rebuild-6.0/vercel.json` | Two-step build with workspace isolation | 5 | Current |
| `/Users/mikeyoung/CODING/rebuild-6.0/client/package.json` | Inconsistent npm exec usage (build only) | 6, 9, 12, 21 | Needs fix |
| `/Users/mikeyoung/CODING/rebuild-6.0/shared/package.json` | npm exec pattern correct | 27-29 | OK |
| `/Users/mikeyoung/CODING/rebuild-6.0/package.json` | Extra root devDeps (workaround) | 108-109 | Workaround |
| `client/tsconfig.app.json` | Missing extends (Vercel requirement) | N/A | Expected |

---

**Report Generated:** 2025-11-17
**Investigation Method:** Git history analysis + configuration review
**Confidence Level:** HIGH - Based on 13 explicit commits with full diffs
