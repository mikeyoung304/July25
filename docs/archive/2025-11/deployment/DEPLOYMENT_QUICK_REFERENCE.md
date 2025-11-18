# DEPLOYMENT ECOSYSTEM - QUICK REFERENCE GUIDE

## TL;DR - What Happened

**In 24 hours (Nov 16-17), 13 commits changed the build configuration 4 times** trying to fix npm workspace binary resolution in Vercel. The problem: when Vercel runs `npm run build --workspace shared`, it can't find `tsc` in the isolated workspace.

## Current State (HEAD: 75f79ddf)

```json
// vercel.json
"buildCommand": "npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client"

// shared/package.json
"build": "npm exec -- tsc"

// client/package.json
"build": "NODE_ENV=production ROLLUP_NO_NATIVE=1 npm exec -- vite build"

// root/package.json (workaround)
"typescript": "^5.3.3",
"vite": "5.4.19"
```

## The Problem

Vercel's workspace isolation means workspace scripts can't find binaries in node_modules. Four strategies were tried:

| Strategy | Status | Issue |
|----------|--------|-------|
| Direct command (`tsc`) | Failed | Not in PATH |
| npx prefix (`npx tsc`) | Works but slow | Downloads from registry |
| npm exec (`npm exec -- tsc`) | Should work | Current approach |
| Root devDeps | Works | Band-aid, not solution |

## Current Issues (Need Fixing)

| File | Line | Issue | Fix |
|------|------|-------|-----|
| client/package.json | 6, 12, 21 | Inconsistent vite usage | Use `npm exec -- vite` everywhere |
| package.json | 108-109 | Root devDeps | Remove once npm exec works |
| vercel.json | 5 | Two-step build | May need custom script |
| client/tsconfig.app.json | N/A | No extends | Required for Vercel isolation |

## Chronology of 13 Commits

### Nov 16 (First Wave - 8 commits)
```
11:53 ba99b4a2  Infrastructure overhaul (big change: moved @types to deps)
12:08 2ee0735c  Fix Render TypeScript errors
12:17 da5d618f  Add @types/csurf
13:53 1523d099  Move browser code out of shared
15:11 7ea970d8  Fix server start script
18:11 8ac44e13  Remove tsconfig extends (Vercel requirement)
18:23 cab2ac49  Try: npx tsc
18:25 79363f45  Try: tsc + TypeScript to root
18:27 58893209  Lock package-lock.json
18:29 c5459b00  Try: Remove shared build entirely
18:33 6d3ce4fe  Try: vite to root devDeps
```

### Nov 17 (Second Wave - 5 commits)
```
09:43 e395c09b  Docs: remove localhost references
09:59 17f9a8e5  Try: npx vite
10:28 50555646  Add @radix-ui/react-tooltip
10:55 aacee034  Try: Remove npx (revert to bare vite)
11:00 e42c565a  Try: npm exec -- vite
11:05 f03a5fcb  Try: Re-add shared build
11:19 75f79ddf  Try: npm exec -- tsc (current state)
```

## Why This Happened

1. **ba99b4a2** triggered cascading failures:
   - Moved @types to dependencies (Render requirement)
   - Changed start script (broke Render)
   - Each fix created new problems

2. **Monorepo complexity**: npm workspaces have special PATH resolution:
   - Local: binaries in node_modules/.bin
   - Vercel: isolated workspace, can't access node_modules

3. **No validation**: Each commit deployed without testing first

## Recommended Next Steps

### Immediate
1. Test current npm exec approach in actual Vercel build
2. Capture actual error message from Vercel

### Short-term (fix today)
1. Standardize: use `npm exec -- vite` for ALL vite commands
2. Verify shared build outputs dist/
3. Test client imports from shared/dist

### Medium-term (cleanup)
1. Remove typescript and vite from root devDependencies
2. Document why client/tsconfig.app.json has no extends
3. Create pre-deployment checklist

## Files to Monitor

- `/Users/mikeyoung/CODING/rebuild-6.0/vercel.json` - Build command
- `/Users/mikeyoung/CODING/rebuild-6.0/client/package.json` - Build scripts
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/package.json` - Build scripts
- `/Users/mikeyoung/CODING/rebuild-6.0/package.json` - Root devDeps (should be empty)

## Git Commands to Understand the Oscillation

```bash
# See all 13 commits
git log --oneline 75f79ddf^...HEAD -- package.json vercel.json

# See what changed in each
git show cab2ac49:shared/package.json   # npx tsc attempt
git show 79363f45:shared/package.json   # direct tsc + root TS
git show 75f79ddf:shared/package.json   # npm exec tsc (current)

# See Vercel build command changes
git log -p c5459b00..f03a5fcb -- vercel.json
```

## Key Insight

The oscillation between 4 approaches (npx, direct, npm exec, root deps) shows developers solving without understanding. **npm exec is the correct approach** for npm workspaces, but needs validation before declaring victory.

---

**Created:** 2025-11-17
**Last Updated:** 2025-11-17
**Status:** Unstable - Requires immediate Vercel deployment test
