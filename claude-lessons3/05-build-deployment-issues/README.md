# build deployment issues

## Files in this category:
- **LESSONS.md** - Incidents, patterns, and quick reference
- **PREVENTION.md** - How to prevent these issues

# Build & Deployment Issues: The 30-Commit Cascade

**Total Impact:** 82 hours of blocked development
**Root Cause:** Monorepo workspace compilation complexity
**Key Pattern:** Single issue triggers cascading failures across multiple systems
**Date Range:** October 5 - November 17, 2025

---

## Executive Summary

The Restaurant OS project experienced multiple severe build and deployment incidents that collectively blocked development for 82 hours. The most dramatic was the "Vercel Monorepo Cascade" on November 17, 2025, which required **30 sequential commits** over 9 hours to resolve a single monorepo build configuration issue.

### Impact Breakdown

| Incident | Duration | Impact | Commits |
|----------|----------|--------|---------|
| **Vercel Monorepo Cascade** | 9 hours | Complete client deployment blocked | 30 |
| **CI Infrastructure Blockage** | 16 days | All PRs blocked, no merges possible | 5 |
| **Memory Optimization Journey** | 3 weeks | Dev environment instability | 15+ |
| **Render tsx Confusion** | 2 days | Backend deployment broken | 8 |
| **Environment Variable Drift** | 2 weeks | Inconsistent behavior across environments | 12 |

**Total:** 82 hours of direct development time lost, plus immeasurable opportunity cost from blocked features.

---

## The 30-Commit Cascade: A Timeline

### November 17, 2025: The Day Everything Broke

**Context:** Attempting to deploy client to Vercel after environment variable overhaul (ba99b4a2).

**Initial Problem:** Vercel build failing with "vite: command not found"

#### Commits 1-5: "Just install vite"
```bash
6d3ce4fe fix(build): add vite to root devDependencies
17f9a8e5 fix(build): use npx vite to fix Vercel monorepo build
aacee034 fix(build): remove npx from vite commands
e42c565a fix(build): use npm exec for vite in monorepo workspace
f03a5fcb fix(vercel): build shared workspace before client
```

**Learning:** Root workspace needs vite available, but workspace context matters.

#### Commits 6-15: "The TypeScript Nightmare"
```bash
cab2ac49 fix(shared): use npx tsc to fix Vercel build
79363f45 fix(build): add TypeScript to root devDependencies
8ac44e13 fix(client): remove tsconfig extends to fix Vercel build
75f79ddf fix(shared): use npm exec for tsc in monorepo workspace
11aafbaa fix(shared): use npx tsc instead of npm exec
2eb81ea8 fix(build): use cd instead of --workspace for proper PATH resolution
d9b20189 fix(build): add build:vercel script for proper monorepo compilation
8d4145a0 fix(deploy): update GitHub secrets and fix Vercel build command
7ef495ea fix(deploy): use npx tsc instead of npm exec for Vercel build
e9e0ffae fix(build): use direct path to tsc binary for Vercel
```

**Learning:** Workspace builds have different PATH resolution than local development. TypeScript compiler must be accessible from workspace context.

#### Commits 16-25: "Dependencies Hell"
```bash
30ccdcc5 fix(build): use full path to TypeScript compiler for Vercel
18df9039 fix(build): use tsc with tsconfig.json for shared workspace
ace52271 fix(build): use workspace build script for TypeScript compilation
ad8be1d4 fix(build): use npx tsc in shared workspace for Vercel compatibility
16aaf66f fix(build): use relative path to tsc binary in shared workspace
3f7824cf fix(build): move TypeScript to dependencies in shared workspace
8bdab711 fix(build): call TypeScript compiler via node directly
ec6c9a90 fix(build): move build-essential packages to dependencies for Vercel
0cc07d12 fix(build): make rollup-plugin-visualizer import conditional
454f72c7 fix(deploy): add scope and auto-confirm to vercel env pull
```

**Learning:** Vercel installs `dependencies` but not `devDependencies` for workspace packages. Build tools must be in `dependencies` for monorepo builds.

#### Commits 26-30: "PostCSS and Resolution"
```bash
e2f0ec67 fix(deploy): explicitly pass VERCEL_TOKEN to vercel env pull
fa2cc867 fix(build): move PostCSS toolchain to root for Vercel workspace builds
68c43c63 fix(build): use require.resolve() in postcss.config.js
6716ca2c fix(build): use canonical PostCSS plugin array syntax
f68d02ac fix(build): use workspace syntax in build:vercel to preserve module resolution
```

**Learning:** PostCSS plugins must be resolved from root workspace context. Configuration syntax matters for workspace compatibility.

#### Final Solution: Commits 31-32
```bash
d6f56b63 fix(vercel): override NODE_ENV during install to include devDependencies
9406a3ff refactor(vercel): use --production=false flag instead of NODE_ENV override
```

**The Breakthrough:** Vercel's `npm ci` was installing with `--production` flag, excluding `devDependencies` which contained critical build tools.

**Root Cause:** Misunderstanding of Vercel's build environment and npm workspace dependency resolution.

---

## Key Lessons: Why This Happened

### 1. Monorepo Complexity
- **Local development** works differently than **workspace builds**
- PATH resolution differs between root and workspace contexts
- Dependencies vs devDependencies matters differently in monorepos

### 2. Vercel-Specific Behavior
- Default `npm ci` runs with `--production` flag
- Workspaces need explicit `--production=false`
- Custom install commands override framework defaults
- PostCSS/Vite/TypeScript must be accessible from workspace context

### 3. Environment Detection Gap
- No automated test for "builds in Vercel environment"
- No CI check for monorepo workspace compilation
- No validation of vercel.json configuration

### 4. Cascading Failure Pattern
```
Initial symptom: "vite: command not found"
    ↓
Try fixing with npx → Wrong, masks real issue
    ↓
Add to devDependencies → Wrong, Vercel ignores devDeps
    ↓
Move to dependencies → Partially correct, but workspace issue
    ↓
Fix workspace resolution → Getting warmer
    ↓
Override NODE_ENV → Hacky but works
    ↓
Use --production=false → Correct solution
```

Each "fix" seemed logical in isolation but didn't address root cause.

---

## Other Major Incidents

### CI Infrastructure Blockage (Oct 5-21, 2025)

**Impact:** 16 days, all PRs blocked

**Root Cause:** Environment variable validation added to `vite.config.ts` expected production secrets in CI environment.

```typescript
// The Problem
if (mode === 'production') {
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', ...];
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error('Missing required environment variables');
  }
}
```

**Why It Broke:**
- GitHub Actions doesn't have Vercel's environment variables
- Smoke tests ran `npm run build` which triggered validation
- No secrets configured in GitHub Actions
- Block all PRs for 16 days

**Solution:** Conditional validation based on CI environment
```typescript
if (mode === 'production' && !process.env.CI) {
  // Strict validation only for actual deployments
}
```

**Lesson:** Environment validation must be context-aware. CI != Production.

---

### Memory Optimization Journey (3 weeks)

**Journey:** 12GB → 6GB → 3GB → Target 1GB

**Timeline:**
- **Week 1:** Discovered memory leaks (VoiceWebSocketServer, AuthRateLimiter)
- **Week 2:** Fixed 5 critical leaks, reduced to 6GB
- **Week 3:** Optimized bundles, manual chunks, reduced to 3GB
- **Ongoing:** Target 1GB for production

**Key Issues Found:**
1. **VoiceWebSocketServer** - 60s interval with no cleanup reference
2. **AuthRateLimiter** - Module-level interval never cleared
3. **ErrorTracker** - 5 global window listeners never removed
4. **Console Monkey-Patching** - Accumulated wrappers
5. **WebSocket Pools** - Unclosed connections

**Impact:** Development environment unstable above 6GB, builds failing above 12GB.

**Fixes:**
```typescript
// Before: Memory leak
constructor() {
  setInterval(() => this.cleanup(), 60000); // No reference!
}

// After: Proper cleanup
private cleanupInterval: NodeJS.Timeout | null = null;

constructor() {
  this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
}

shutdown() {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }
}
```

**Current Status:**
```javascript
NODE_OPTIONS='--max-old-space-size=3072' // Development
NODE_OPTIONS='--max-old-space-size=3072' // Build
// Target: 1024MB production
```

---

### Render tsx Confusion (2 days)

**Problem:** Backend deployment failing with "tsx: not found"

**Root Cause:** Production start script used development tool
```json
// Before (WRONG)
{
  "start": "tsx src/server.ts"  // tsx only in devDependencies
}

// After (CORRECT)
{
  "start": "node dist/server.js",  // Use compiled code
  "start:dev": "tsx src/server.ts"  // Dev only
}
```

**Contributing Factors:**
1. Build script had `|| true` suppressing errors
2. @types packages in devDependencies (needed for production build)
3. TypeScript implicit `any` errors masked

**Complete Fix:**
1. Changed start script to use compiled code
2. Moved @types to dependencies
3. Removed error suppression
4. Fixed TypeScript type annotations
5. Added fallbacks for optional env vars

**Lesson:** Development tools (tsx, ts-node) should never run in production.

---

### Environment Variable Drift (2 weeks)

**Discovered:** 15 .env files with 80% inconsistency

**Files Found:**
- `.env` (root)
- `.env.local`
- `.env.production`
- `.env.development`
- `.env.test`
- `client/.env`
- `client/.env.local`
- `client/.env.example`
- `server/.env`
- `server/.env.local`
- `server/.env.test`
- `server/.env.example`
- `supabase/.env`
- `tests/.env`
- `.env.example` (root)

**Issues:**
1. Same variable with different values across files
2. Outdated credentials (OpenAI key exposed)
3. Missing variables in some files
4. No validation or drift detection

**Solution:**
1. Reduced to 3 files: `.env.example`, `client/.env.example`, `server/.env.example`
2. Implemented Zod validation schemas
3. Created CI/CD workflow for drift detection
4. Rotated all compromised secrets
5. Added pre-commit validation hook

**Impact:**
- Voice ordering broken due to missing `VITE_USE_REALTIME_VOICE`
- KDS auth broken due to wrong `DEFAULT_RESTAURANT_ID` format
- Production deploys inconsistent

---

## Cost Analysis

### Direct Costs (Measurable)

**Developer Time:**
- Vercel cascade: 9 hours (30 commits, trial-and-error)
- CI blockage: 16 days × 2 hours/day = 32 hours
- Memory optimization: 3 weeks × 5 hours/week = 15 hours
- Render deployment: 2 days × 4 hours/day = 8 hours
- Environment drift: 2 weeks × 4 hours/week = 8 hours
- Investigation/documentation: 10 hours

**Total:** 82 hours = 2+ weeks of engineering time

**At $100/hour:** $8,200 direct cost

### Indirect Costs (Estimated)

**Opportunity Cost:**
- Features blocked during CI outage: 16 days
- Unable to deploy fixes during incidents
- Team morale impact
- Customer-facing features delayed

**Technical Debt:**
- Incomplete memory optimization (still ongoing)
- Band-aid fixes that need proper solutions
- Documentation debt
- Testing debt (no CI for monorepo builds)

**Estimated Total Cost:** $25,000-$30,000 including opportunity cost

---

## Prevention Investment

**What We Built:**
1. Environment validation CI workflow
2. Memory leak detection tests
3. Comprehensive documentation (this guide)
4. Pre-commit hooks for validation
5. Improved vercel.json configuration
6. Build environment parity checks

**Investment:** ~20 hours

**ROI:** If prevents even ONE similar incident, pays for itself 4x over.

---

## Current Status (November 19, 2025)

###  Resolved
- Vercel monorepo builds working with `--production=false`
- CI environment validation conditional
- Render deployment using compiled code
- Environment variables consolidated and validated
- Critical memory leaks fixed

###  Monitoring
- Memory usage trending toward 1GB target (currently 3GB)
- Weekly environment drift checks
- Build time monitoring (target <5 minutes)

### 🚧 In Progress
- Additional memory optimizations
- E2E tests for build configurations
- Automated rollback procedures
- Production monitoring dashboard

---

## Next Steps

### For Developers
1. Read [PATTERNS.md](./PATTERNS.md) - Understand monorepo build patterns
2. Review [PREVENTION.md](./PREVENTION.md) - Know how to avoid these issues
3. Keep [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) handy for commands

### For AI Agents
1. Read [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - Specific guidance for agents
2. Check NODE_OPTIONS before any build operation
3. Verify workspace compilation order
4. Test with production builds locally

### For Leadership
1. Review [INCIDENTS.md](./INCIDENTS.md) - Full incident timeline
2. Assess prevention measures ROI
3. Allocate time for technical debt reduction
4. Consider CI/CD monitoring investment

---

## Key Takeaways

1. **Monorepos are complex** - Local dev ≠ CI ≠ Production
2. **Environment parity matters** - Small differences compound
3. **One issue cascades** - Fix root cause, not symptoms
4. **Prevention is cheaper** - 20 hours investment vs 82 hours debugging
5. **Documentation pays off** - This guide will save future developers weeks

---

## Related Documentation

- [PATTERNS.md](./PATTERNS.md) - Build patterns and best practices
- [INCIDENTS.md](./INCIDENTS.md) - Detailed incident timeline and analysis
- [PREVENTION.md](./PREVENTION.md) - Solutions and configurations
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Commands and checklists
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - AI-specific guidance

---

**Last Updated:** November 19, 2025
**Document Version:** 1.0.0
**Status:** Active - Under continuous improvement

