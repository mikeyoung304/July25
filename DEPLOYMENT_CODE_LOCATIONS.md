# DEPLOYMENT ECOSYSTEM - CODE LOCATIONS & SPECIFICS

## File Paths and Line Numbers with Issues

### 1. vercel.json
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/vercel.json`
**Issue:** Build command relies on workspace binary resolution which may fail

**Current (Lines 5):**
```json
"buildCommand": "npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client",
```

**Evolution:**
- **Original:** `npm run build --workspace shared && ...` (working)
- **c5459b00 (18:29):** Removed shared: `npm run build --workspace client` (broke)
- **f03a5fcb (11:05):** Re-added shared (current)

**Problem:** When Vercel runs this command, the workspace isolation prevents `npm exec -- tsc` from finding TypeScript binary.

---

### 2. root/package.json
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/package.json`
**Issue:** Contains workaround devDependencies that should be in workspaces

**Lines 108-109:**
```json
{
  "devDependencies": {
    "typescript": "^5.3.3",      // Added 79363f45 - WORKAROUND
    "vite": "5.4.19",             // Added 6d3ce4fe - WORKAROUND
    "@apidevtools/swagger-parser": "^12.1.0",
```

**Rationale:** Added so `npm exec` can find binaries when running from workspace context.

**Timeline:**
- **cab2ac49 (18:23):** Used `npx tsc` in shared (failed)
- **79363f45 (18:25):** Added typescript to root, changed to bare `tsc` (attempted fix)
- **6d3ce4fe (18:33):** Added vite to root (cascading fix)

**Status:** These should be removed once npm exec is properly working.

---

### 3. shared/package.json
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/package.json`
**Issue:** Correct implementation but needs validation

**Lines 27-29 (Build Scripts):**
```json
{
  "scripts": {
    "build": "npm exec -- tsc",
    "typecheck": "npm exec -- tsc --noEmit",
    "typecheck:quick": "npm exec -- tsc --noEmit",
```

**Evolution Timeline:**
- **Original:** `"build": "tsc"` 
- **cab2ac49 (18:23):** Changed to `"build": "npx tsc"` (Attempt 1)
- **79363f45 (18:25):** Reverted to `"build": "tsc"` (Attempt 2)
- **75f79ddf (11:19):** Changed to `"build": "npm exec -- tsc"` (Current - Attempt 3)

**Status:** Correct approach but untested on Vercel.

---

### 4. client/package.json
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/package.json`
**Issue:** INCONSISTENT - build script uses npm exec but others don't

**Problem Scripts:**

**Line 6 - dev script (INCONSISTENT):**
```json
"dev": "vite",  // Should be: "dev": "npm exec -- vite"
```

**Line 9 - build script (CORRECT):**
```json
"build": "NODE_ENV=production ROLLUP_NO_NATIVE=1 npm exec -- vite build",
```

**Line 12 - preview script (INCONSISTENT):**
```json
"preview": "vite preview --port 4173",  // Should use npm exec
```

**Line 21 - analyze script (INCONSISTENT):**
```json
"analyze": "vite build --mode analyze",  // Should use npm exec
```

**Evolution Timeline:**
- **Original:** `"build": "... vite build"`
- **17f9a8e5 (09:59):** Changed all to `npx vite` 
- **aacee034 (10:55):** Reverted to bare `vite` (revert of 17f9a8e5)
- **e42c565a (11:00):** Changed build only to `npm exec -- vite build`

**Status:** 
- Build script: OK ✅
- dev/preview/analyze: NEED FIXING ❌

---

### 5. client/tsconfig.app.json
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/tsconfig.app.json`
**Issue:** Missing extends due to Vercel limitation (EXPECTED)

**Lines 1-5 (approximate, based on diff):**
```json
{
  "extends": "../tsconfig.base.json",  // REMOVED by 8ac44e13
  "compilerOptions": {
```

**After 8ac44e13 (18:11):**
```json
{
  "compilerOptions": {
```

**Rationale:** Vercel deploys only client/ directory, cannot access parent tsconfig.base.json.

**Status:** This is required - DO NOT change back.

---

## Root Cause Evidence

### Evidence 1: Commit Timeline Shows Oscillation
```bash
$ git log --oneline 75f79ddf^...HEAD -- package.json shared/package.json client/package.json

75f79ddf  fix(shared): use npm exec for tsc in monorepo workspace
f03a5fcb  fix(vercel): build shared workspace before client
e42c565a  fix(build): use npm exec for vite in monorepo workspace context
aacee034  fix(build): remove npx from vite commands to fix Vercel deployment
17f9a8e5  fix(build): use npx vite to fix Vercel monorepo build
c5459b00  fix(vercel): remove shared workspace build from Vercel build command
6d3ce4fe  fix(build): add vite to root devDependencies for Vercel monorepo builds
79363f45  fix(build): add TypeScript to root devDependencies for Vercel
cab2ac49  fix(shared): use npx tsc to fix Vercel build
```

### Evidence 2: Vercel Build Command Changes
```bash
$ git log -p -- vercel.json | grep -A2 -B2 "buildCommand"

# c5459b00 (REMOVED shared)
-  "buildCommand": "ROLLUP_NO_NATIVE=1 npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client",
+  "buildCommand": "ROLLUP_NO_NATIVE=1 npm run build --workspace client",

# f03a5fcb (RE-ADDED shared)
-  "buildCommand": "ROLLUP_NO_NATIVE=1 npm run build --workspace client",
+  "buildCommand": "npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client",
```

---

## Diagnosis: Why Each Approach Failed

### Approach 1: Direct Command (`tsc`)
```json
// shared/package.json
"build": "tsc"
```
**Works locally:** YES - /repo/node_modules/.bin is in PATH
**Works on Vercel:** NO - workspace isolation doesn't include node_modules

**Error:** `tsc: command not found`

---

### Approach 2: npx Fallback (`npx tsc`)
```json
// shared/package.json  
"build": "npx tsc"
```
**Works locally:** YES - npx finds installed version
**Works on Vercel:** YES but SLOW - npx downloads latest from registry
**Problem:** May download different version (7.x vs installed 5.3.3)

**Evidence:** Commit 17f9a8e5 specifically says "npx downloads latest (7.2.2) causing failures"

---

### Approach 3: Root devDependencies (Workaround)
```json
// root/package.json
"devDependencies": {
  "typescript": "^5.3.3",
  "vite": "5.4.19"
}

// Then in workspace:
"build": "tsc"  // Now finds root's TypeScript
```
**Works:** YES - Root binaries available
**Problem:** 
- Violates npm workspace principle (binaries belong in workspace)
- Doesn't scale (every tool needs root entry)
- Clutters root package.json

---

### Approach 4: npm exec (CORRECT)
```json
// shared/package.json
"build": "npm exec -- tsc"
```
**Works locally:** YES - npm exec finds in workspace node_modules
**Should work on Vercel:** YES - npm exec is workspace-aware

**Advantage:** npm officially recommends for workspaces

**Status:** Current state, but UNTESTED on Vercel

---

## How npm exec Solves It

**Normal execution path (fails in workspace):**
```
shell → look for 'tsc' in PATH → fail
```

**npm exec path (works in workspace):**
```
npm exec -- tsc
  ↓
npm looks for 'tsc' in node_modules/.bin of current workspace
  ↓
/vercel/shared/node_modules/.bin/tsc (found!)
  ↓
success
```

---

## Critical Files Summary

| File | Status | Line | Issue | Action |
|------|--------|------|-------|--------|
| `/vercel.json` | Current | 5 | Two-step build untested | Test on Vercel |
| `/package.json` | Workaround | 108-109 | Root devDeps | Remove after validation |
| `/shared/package.json` | Current | 27-29 | npm exec pattern | Validate works |
| `/client/package.json` | Partially Fixed | 6,12,21 | Inconsistent vite usage | Fix all vite commands |
| `/client/tsconfig.app.json` | Expected | N/A | No extends | Leave as is |

---

## Test Checklist

- [ ] Deploy current HEAD to Vercel
- [ ] Check build succeeds or capture error
- [ ] If succeeds: remove root TypeScript/vite devDeps
- [ ] If fails: examine Vercel build logs for `npm exec` issues
- [ ] Standardize all vite commands to npm exec
- [ ] Verify shared/dist is built before client build

---

**Document Created:** 2025-11-17
**Based on Analysis:** git log + file content inspection
**Confidence:** HIGH
