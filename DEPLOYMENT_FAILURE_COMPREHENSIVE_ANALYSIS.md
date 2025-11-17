# Comprehensive Deployment Failure Analysis
**Date**: November 17, 2025
**Duration**: 9+ hours (ongoing)
**Status**: UNRESOLVED - Multiple platforms failing

---

## Executive Summary

Both Vercel (frontend) and Render (backend) deployments are failing. We have attempted 8+ different fixes for the Vercel build issue, all targeting the TypeScript compilation step in the shared workspace. Every fix works locally but fails in Vercel's environment.

**Critical Pattern**: Every solution that works on local machine fails in Vercel with different errors, suggesting a fundamental difference in how Vercel's build environment handles npm workspaces and TypeScript.

---

## Current Deployment Status

### Vercel (Frontend - Client)
- **Status**: ❌ FAILING (20+ consecutive failures since Nov 9)
- **Project**: july25-client
- **Error**: "tsc: command not found" or similar TypeScript binary resolution issues
- **Last Successful Deploy**: November 9, 2025
- **Breaking Commit**: d9b20189 (Nov 17, 11:45 AM)

### Render (Backend - Server)
- **Status**: ❌ FAILING (user reports failure)
- **Details**: Not yet investigated in this session
- **Impact**: Both frontend and backend are down

---

## Root Cause Timeline

### The Breaking Change (Commit d9b20189)

**What Changed**:
```json
// BEFORE (working):
// No build:vercel script - vercel.json used default build command

// AFTER (broken):
"build:vercel": "cd shared && tsc && cd ../client && ROLLUP_NO_NATIVE=1 npm run build"
```

**Why It Broke**:
1. Command executes from ROOT context
2. `cd shared && tsc` expects `tsc` to be in PATH
3. Vercel's workspace build doesn't add workspace binaries to PATH when running from root
4. TypeScript is installed but binary is at `shared/node_modules/.bin/tsc` (not accessible)

---

## All Attempted Fixes (Chronological)

### Attempt 1: npm exec -- tsc (Commit 8d4145a0)
```json
"build:vercel": "npm exec -- tsc -p shared && cd client && ..."
```

**Expected**: npm exec finds local TypeScript binary
**Result**: ❌ Downloaded wrong package `tsc@2.0.4` instead of using `typescript@5.3.3`
**Error**: "This is not the tsc command you are looking for"
**Why Failed**: npm exec without workspace context downloads from registry

---

### Attempt 2: npx tsc (Commit 7ef495ea)
```json
"build:vercel": "npx tsc -p shared && cd client && ..."
```

**Expected**: npx finds local TypeScript binary
**Result**: ❌ Same as Attempt 1 - downloaded wrong package `tsc@2.0.4`
**Error**: "This is not the tsc command you are looking for"
**Why Failed**: npx behavior identical to npm exec in this context

---

### Attempt 3: node_modules/.bin/tsc (Commit e9e0ffae)
```json
"build:vercel": "node_modules/.bin/tsc -p shared && cd client && ..."
```

**Expected**: Direct binary path should work
**Result**: ❌ File not found
**Error**: "sh: line 1: node_modules/.bin/tsc: No such file or directory"
**Why Failed**: Path doesn't exist or isn't accessible from root in Vercel's environment

---

### Attempt 4: node ./node_modules/typescript/lib/tsc.js (Commit 30ccdcc5)
```json
"build:vercel": "node ./node_modules/typescript/lib/tsc.js -p shared && cd client && ..."
```

**Expected**: Calling tsc.js directly via node should work
**Result**: ❌ Module not found
**Error**: "Error: Cannot find module '/vercel/path0/node_modules/typescript/lib/tsc.js'"
**Why Failed**: File doesn't exist at that absolute path in Vercel

---

### Attempt 5: Plain tsc with different flag (Commit 18df9039)
```json
"build:vercel": "tsc -p shared/tsconfig.json && cd client && ..."
```

**Expected**: Using full path to tsconfig might help
**Result**: ❌ Command not found
**Error**: "sh: line 1: tsc: command not found"
**Why Failed**: Same PATH issue as original

---

### Attempt 6: npm run build --workspace (Commit ace52271) - DIFFERENT APPROACH
```json
"build:vercel": "npm run build --workspace=@rebuild/shared --if-present && cd client && ..."
```

**Shared workspace package.json**:
```json
"scripts": {
  "build": "tsc"
}
```

**Expected**: Running build script WITHIN workspace should have tsc in PATH
**Result**: ❌ Still command not found
**Error**: "sh: line 1: tsc: command not found"
**Why Failed**: Even from within workspace, tsc not in PATH

---

### Attempt 7: npx tsc in shared workspace (Commit ad8be1d4)
```json
// shared/package.json
"scripts": {
  "build": "npx tsc"
}
```

**Expected**: npx should find local TypeScript
**Result**: ❌ Downloaded wrong package again
**Error**: Downloaded `tsc@2.0.4` instead of using local `typescript@5.3.3`
**Why Failed**: Same npx issue as Attempt 2

---

### Attempt 8: Relative path to root tsc binary (Commit 16aaf66f)
```json
// shared/package.json
"scripts": {
  "build": "../node_modules/.bin/tsc"
}
```

**Expected**: Relative path from shared to root node_modules should work
**Result**: ❌ File not found
**Error**: "sh: line 1: ../node_modules/.bin/tsc: No such file or directory"
**Why Failed**: Path doesn't resolve correctly in Vercel's environment

---

### Attempt 9: TypeScript in shared dependencies (Commit 3f7824cf)
```json
// shared/package.json
"dependencies": {
  "typescript": "^5.3.3",  // Moved from devDependencies
  ...
},
"devDependencies": {}
```

**Expected**: TypeScript in dependencies = always installed, tsc in PATH
**Result**: ❌ Still command not found
**Error**: "sh: line 1: tsc: command not found"
**Why Failed**: Moving to dependencies didn't add binary to PATH

---

### Attempt 10: node ../node_modules/typescript/lib/tsc.js (Commit 8bdab711)
```json
// shared/package.json
"scripts": {
  "build": "node ../node_modules/typescript/lib/tsc.js"
}
```

**Expected**: Call tsc.js from shared workspace with relative path to root
**Result**: ❌ Module not found
**Error**: "Error: Cannot find module '/vercel/path0/node_modules/typescript/lib/tsc.js'"
**Why Failed**: Same as Attempt 4 - file doesn't exist at expected location

---

### Current Attempt (In Progress): TypeScript in ROOT dependencies
```json
// Root package.json
"dependencies": {
  "typescript": "^5.3.3",  // Moved from devDependencies
  ...
}
```

**Hypothesis**: Root dependencies are ALWAYS installed in Vercel
**Expected**: tsc binary should be accessible from workspace build scripts
**Status**: Testing interrupted - not yet deployed

---

## Environment Differences Analysis

### Local Environment (WORKS)
```bash
# Structure:
rebuild-6.0/
├── node_modules/
│   ├── .bin/
│   │   └── tsc -> ../typescript/bin/tsc
│   └── typescript/
│       └── lib/tsc.js
├── shared/
│   ├── node_modules/ (symlinked to root)
│   └── package.json
└── package.json

# When running: npm run build --workspace=@rebuild/shared
# Current directory: /Users/mikeyoung/CODING/rebuild-6.0/shared
# PATH includes: /Users/mikeyoung/CODING/rebuild-6.0/node_modules/.bin
# Result: tsc found and executes ✓
```

### Vercel Environment (FAILS)
```bash
# Structure (inferred from errors):
/vercel/path0/
├── node_modules/ (??)
│   └── typescript/ (?? - errors suggest it doesn't exist or isn't accessible)
├── shared/
│   ├── node_modules/ (??)
│   └── package.json
└── package.json

# When running: npm run build --workspace=@rebuild/shared
# Current directory: /vercel/path0/shared
# PATH: Unknown - clearly doesn't include node_modules/.bin
# Result: tsc command not found ✗

# Error evidence suggests:
# 1. /vercel/path0/node_modules/typescript/lib/tsc.js doesn't exist
# 2. ../node_modules/.bin/tsc doesn't exist
# 3. npx/npm exec downloads from registry instead of finding local
```

---

## Critical Questions (NEED ANSWERS)

### 1. Where is TypeScript Actually Installed in Vercel?
- Root package.json has it in devDependencies (currently)
- Does `npm ci --workspaces --include-workspace-root` install devDependencies in production?
- If NODE_ENV=production, are devDependencies skipped?

### 2. What is the Actual File Structure in Vercel?
- Does `/vercel/path0/node_modules/typescript/` exist?
- Does `/vercel/path0/node_modules/.bin/tsc` exist?
- Does `/vercel/path0/shared/node_modules/` exist?
- Is it a symlink or actual directory?

### 3. How Does Vercel Set PATH for Workspace Build Scripts?
- When running `npm run build --workspace=@rebuild/shared`
- Is `/vercel/path0/node_modules/.bin` in PATH?
- Is `/vercel/path0/shared/node_modules/.bin` in PATH?

### 4. Why Does npx Download Instead of Using Local?
- Local: npx finds `typescript@5.3.3` in node_modules
- Vercel: npx downloads `tsc@2.0.4` from registry
- Suggests npx doesn't see any local typescript installation

### 5. Vercel Install Command Behavior
```json
// vercel.json
"installCommand": "npm ci --workspaces --include-workspace-root"
```
- Does this install ALL package.json dependencies?
- Does it respect NODE_ENV=production?
- Are devDependencies installed?
- Are workspace package dependencies installed?

---

## Configuration Files

### vercel.json
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm ci --workspaces --include-workspace-root",
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "client/dist",
  ...
}
```

### Root package.json (current state)
```json
{
  "name": "restaurant-os",
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "build:vercel": "npm run build --workspace=@rebuild/shared --if-present && cd client && ROLLUP_NO_NATIVE=1 npm run build"
  },
  "devDependencies": {
    "typescript": "^5.3.3",  // CURRENTLY HERE - might be the problem!
    ...
  }
}
```

### shared/package.json (current state)
```json
{
  "name": "@rebuild/shared",
  "scripts": {
    "build": "tsc"  // FAILS: command not found
  },
  "dependencies": {
    "typescript": "^5.3.3",  // ADDED but didn't help
    ...
  }
}
```

---

## Render Failure (Backend)

**Status**: Not yet investigated
**User Report**: "render also failed"
**Impact**: Backend API unavailable

### Potential Causes
1. Similar build issues with TypeScript
2. Environment variable problems
3. Dependency installation failures
4. Database migration issues

### Investigation Needed
- [ ] Check Render build logs
- [ ] Verify environment variables are set
- [ ] Check if related to same TypeScript/workspace issues
- [ ] Verify database connection

---

## System-Wide Patterns

### What Works Locally But Fails in Vercel
1. ✓ Local: `tsc` command
2. ✓ Local: `npx tsc` (finds local)
3. ✓ Local: `npm exec -- tsc` (finds local)
4. ✓ Local: `../node_modules/.bin/tsc`
5. ✓ Local: `node ../node_modules/typescript/lib/tsc.js`

### What Fails in Vercel
1. ✗ Vercel: All of the above
2. ✗ Vercel: Any reference to TypeScript binary
3. ✗ Vercel: Even workspace-local build scripts

### Hypothesis: NODE_ENV=production Issue
```bash
# .env.production.temp shows:
NODE_ENV="production"

# If npm ci respects this:
# - devDependencies are NOT installed
# - TypeScript in root devDependencies = not available
# - shared/dependencies has TypeScript but binary still not in PATH
```

---

## Untested Approaches

### Option A: Force TypeScript Installation
```json
// Root package.json - move to dependencies (CURRENT ATTEMPT)
"dependencies": {
  "typescript": "^5.3.3"
}
```
**Status**: Modified but not yet tested/deployed

### Option B: Use Explicit Install in Build Command
```json
// vercel.json
"buildCommand": "npm install typescript --no-save && npm run build:vercel"
```
**Risk**: Might timeout or fail

### Option C: Inline TypeScript in Build Script
```json
// shared/package.json
"scripts": {
  "build": "npm install --no-save typescript && npx tsc"
}
```
**Risk**: Installs on every build (slow)

### Option D: Skip Shared Build Entirely
- Change Vite to import TypeScript source directly
- Problem: Tried this - export paths don't work without compiled output

### Option E: Pre-compile Shared Before Vercel
- Commit compiled `shared/dist/` to git
- Problem: Violates gitignore, bad practice

### Option F: Use Different Build Tool
- Replace tsc with esbuild or swc
- Problem: Requires rewriting build configuration

---

## Missing Information

### From Vercel Build Logs
- [ ] Full install command output (what actually gets installed)
- [ ] Directory listing of /vercel/path0/node_modules/
- [ ] Directory listing of /vercel/path0/shared/node_modules/
- [ ] Full PATH environment variable during build
- [ ] NODE_ENV value during install vs build

### From Render Build Logs
- [ ] Any error messages
- [ ] When did it start failing
- [ ] Is it related to Vercel issues

---

## Recommended Next Steps

### Immediate (For AI Auditor)
1. **Verify TypeScript Installation in Vercel**
   - Add debug command to log what's actually installed
   - `vercel.json`: Add step to `ls -la node_modules/ | grep typescript`

2. **Check NODE_ENV Behavior**
   - Force install all dependencies regardless of NODE_ENV
   - Try: `npm ci --workspaces --include-workspace-root --include=dev`

3. **Inspect Vercel PATH**
   - Add `echo $PATH` to build command before running tsc
   - Check if node_modules/.bin is included

4. **Try Absolute Path Hack**
   - Use `$(npm root)/.bin/tsc` which dynamically finds node_modules
   - Or `$(npm bin)/tsc`

5. **Investigate Render Separately**
   - Check if it's the same issue or different
   - Might provide clues about workspace problems

### Strategic (Root Cause)
1. **Understand Vercel's Workspace Handling**
   - How does `npm ci --workspaces` work with NODE_ENV=production?
   - Are workspace dependencies installed differently?

2. **Consider Alternative Architectures**
   - Should shared be a workspace or separate package?
   - Should we use pnpm instead of npm?
   - Should we use TypeScript project references differently?

---

## Success Criteria

For a fix to be considered successful, it must:
1. ✓ Pass Vercel build (client successfully deploys)
2. ✓ Pass Render build (server successfully deploys)
3. ✓ Work in clean environment (no reliance on cache)
4. ✓ Not require manual intervention
5. ✓ Be maintainable (no hacky workarounds)

---

## Timeline Recap

- **Nov 9**: Last successful deployment ✓
- **Nov 17, 11:45 AM**: Commit d9b20189 breaks builds ✗
- **Nov 17, 12:00-20:00**: 8+ hours attempting fixes
- **Nov 17, 20:30**: User requests comprehensive analysis (this document)

---

## For the Next AI Agent

If you're reading this, here's what you need to know:

1. **Don't assume local behavior = Vercel behavior**
   - Every fix that works locally has failed in Vercel
   - Focus on Vercel-specific constraints

2. **The real problem might not be TypeScript**
   - Could be npm workspaces + NODE_ENV=production
   - Could be Vercel's build cache
   - Could be fundamental workspace setup issue

3. **We need visibility first**
   - Add logging to see what's actually installed
   - Add logging to see actual PATH
   - Add logging to see file structure

4. **Consider starting fresh**
   - Maybe revert d9b20189 entirely
   - Maybe monorepo setup is wrong
   - Maybe we need different approach to shared code

5. **Check Render too**
   - Don't hyperfocus on Vercel
   - Backend failure might be related
   - Or might be completely separate issue

**Good luck. We need it.**

---

## Appendix: All Related Commits

1. `d9b20189` - Breaking change (added build:vercel with cd + tsc)
2. `2eb81ea8` - Used --workspace flag
3. `6240109f` - Tried explicit path
4. `b0cb7d04` - Tried direct tsc
5. `11aafbaa` - Tried npx tsc
6. `f37479bd` - Fixed workflow file extensions (unrelated)
7. `8d4145a0` - npm exec -- tsc attempt
8. `7ef495ea` - npx tsc in build command
9. `e9e0ffae` - node_modules/.bin/tsc direct path
10. `30ccdcc5` - node ./node_modules/typescript/lib/tsc.js
11. `9a4f99ce` - Test deployment with new token
12. `18df9039` - tsc -p shared/tsconfig.json
13. `ace52271` - npm run build --workspace approach
14. `ad8be1d4` - npx tsc in shared workspace
15. `16aaf66f` - Relative path ../node_modules/.bin/tsc
16. `3f7824cf` - TypeScript to shared dependencies
17. `8bdab711` - node ../node_modules/typescript/lib/tsc.js
18. **CURRENT**: TypeScript to root dependencies (uncommitted)
