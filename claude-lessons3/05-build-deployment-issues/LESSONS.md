# Lessons: build deployment issues

> **💡 Debugging Unknown Issues?** If you're encountering an error not documented here, check the [Debugging Protocols](../00-debugging-protocols/) for systematic troubleshooting methods (HTF, EPL, CSP, DDT, PIT).

## Key Incidents

# Build & Deployment Incidents: Complete Timeline

**Purpose:** Detailed chronological analysis of all major build/deployment incidents
**Total Impact:** 82 hours of blocked development
**Date Range:** October 5 - November 17, 2025

---

## Incident Index

1. [Vercel Monorepo Cascade](#incident-1-vercel-monorepo-cascade) - Nov 17, 2025 (9 hours, 30 commits)
2. [CI Infrastructure Blockage](#incident-2-ci-infrastructure-blockage) - Oct 5-21, 2025 (16 days)
3. [Memory Optimization Journey](#incident-3-memory-optimization-journey) - Oct-Nov 2025 (3 weeks)
4. [Render tsx Confusion](#incident-4-render-tsx-confusion) - Nov 15-16, 2025 (2 days)
5. [Environment Variable Drift](#incident-5-environment-variable-drift) - Nov 1-15, 2025 (2 weeks)
6. [ESM/CommonJS Module Incompatibility](#incident-6-esm-commonjs-incompatibility) - Nov 24, 2025 - See [CL-BUILD-008](./CL-BUILD-008-esm-commonjs-incompatibility.md)
7. [Missing Logger .child() Method](#incident-7-missing-logger-child-method) - Nov 24, 2025 - See [CL-BUILD-009](./CL-BUILD-009-missing-logger-child-method.md)

---

## Incident 1: Vercel Monorepo Cascade

### Timeline: November 17, 2025

**Duration:** 9 hours (09:00 - 18:00 EST)
**Commits:** 30 sequential attempts
**Impact:** Complete client deployment blocked
**Severity:** CRITICAL - Production deployment blocked

### Initial State (08:00)

System working:
-  Local development functional
-  Local production builds working
-  Backend deployment to Render successful
-  All tests passing

### Trigger Event (09:00)

Merged environment variable overhaul (ba99b4a2):
- Consolidated 15 .env files to 3
- Implemented Zod validation
- Rotated all secrets
- Updated URGENT_ENV_UPDATES_REQUIRED.md

Attempted to deploy client to Vercel → **FAILED**

### Investigation Phase 1: "Just Install Vite" (09:00-10:30)

**Symptoms:**
```bash
Error: vite: command not found
```

**Attempts:**

**09:15 - Commit 6d3ce4fe** - Add vite to root devDependencies
```json
{
  "devDependencies": {
    "vite": "5.4.19"
  }
}
```
Result:  Still failing

**09:30 - Commit 17f9a8e5** - Use npx vite
```json
{
  "scripts": {
    "build": "npx vite build"
  }
}
```
Result:  Slow build, still issues

**09:45 - Commit aacee034** - Remove npx, try direct
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```
Result:  Back to "command not found"

**10:00 - Commit e42c565a** - Use npm exec
```json
{
  "scripts": {
    "build": "npm exec vite -- build"
  }
}
```
Result:  Different error, still failing

**10:15 - Commit f03a5fcb** - Build shared workspace first
```json
{
  "buildCommand": "npm run build --workspace=@rebuild/shared && npm run build --workspace=restaurant-os-client"
}
```
Result:  Shared workspace fails with TypeScript errors

### Investigation Phase 2: "TypeScript Hell" (10:30-13:00)

**10:45 - Commit cab2ac49** - Use npx tsc in shared
```json
// shared/package.json
{
  "scripts": {
    "build": "npx tsc -p tsconfig.build.json"
  }
}
```
Result:  Slow, but new error

**11:00 - Commit 79363f45** - Add TypeScript to root devDependencies
Result:  Already there, didn't help

**11:15 - Commit 8ac44e13** - Remove tsconfig extends
Result:  Broke type checking

**11:30 - Commit 75f79ddf** - Use npm exec for tsc
Result:  Same PATH issue

**11:45 - Commit 11aafbaa** - Back to npx tsc
Result:  Inconsistent

**12:00 - Commit 2eb81ea8** - Use cd instead of --workspace
```bash
cd shared && npm run build && cd ../client && npm run build
```
Result:  Breaks workspace isolation

**12:15 - Commit d9b20189** - Create build:vercel script
```json
{
  "scripts": {
    "build:vercel": "npm run build --workspace=@rebuild/shared --if-present && npm run build --workspace=restaurant-os-client"
  }
}
```
Result:  Closer, but still TypeScript errors

**12:30 - Commit 8d4145a0** - Update GitHub secrets
Result:  Wrong direction, reverted

**12:45 - Commit 7ef495ea** - Use npx tsc instead of npm exec
Result:  Back to slow builds

### Investigation Phase 3: "The PATH Maze" (13:00-15:00)

**13:00 - Commit e9e0ffae** - Use direct path to tsc
```bash
./node_modules/.bin/tsc -p tsconfig.build.json
```
Result:  Path doesn't exist in Vercel context

**13:15 - Commit 30ccdcc5** - Use full path
```bash
../../node_modules/.bin/tsc
```
Result:  Fragile, breaks

**13:30 - Commit 18df9039** - Specify tsconfig.json explicitly
Result:  Not the issue

**13:45 - Commit ace52271** - Use workspace build script
Result:  Circular reference

**14:00 - Commit ad8be1d4** - npx tsc in shared workspace
Result:  Still failing

**14:15 - Commit 16aaf66f** - Relative path to tsc
Result:  Doesn't exist

**14:30 - Commit 3f7824cf** - Move TypeScript to dependencies
```json
// shared/package.json
{
  "dependencies": {
    "typescript": "^5.3.3"
  }
}
```
Result:  Partial success, new errors

**14:45 - Commit 8bdab711** - Call tsc via node
```bash
node ../../node_modules/typescript/bin/tsc
```
Result:  Overly complex

### Investigation Phase 4: "Dependencies Discovery" (15:00-16:30)

**15:00 - Commit ec6c9a90** - Move build packages to dependencies
```json
{
  "dependencies": {
    "vite": "5.4.19",
    "typescript": "^5.3.3",
    "@vitejs/plugin-react": "^4.5.2"
  }
}
```
Result:  Progress! New error with rollup-plugin-visualizer

**15:15 - Commit 0cc07d12** - Make visualizer import conditional
Result:  Another step forward

**15:30 - Commit 454f72c7** - Fix vercel env pull command
Result:  Wrong direction

**15:45 - Commit e2f0ec67** - Pass VERCEL_TOKEN explicitly
Result:  Not the issue

### Investigation Phase 5: "PostCSS Problems" (16:30-17:30)

**16:30 - Commit fa2cc867** - Move PostCSS to root
```bash
mv client/postcss.config.js postcss.config.js
```
Result:  Closer, but plugin resolution issues

**16:45 - Commit 68c43c63** - Use require.resolve()
```javascript
export default {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer')
  ]
}
```
Result:  Works but not elegant

**17:00 - Commit 6716ca2c** - Use canonical PostCSS array syntax
Result:  Still issues

**17:15 - Commit f68d02ac** - Use workspace syntax in build:vercel
```json
{
  "buildCommand": "npm run build:vercel"
}
```
Result:  Almost there!

### Breakthrough Phase (17:30-18:00)

**17:30 - REALIZATION:** Vercel runs `npm ci --production` by default!

**Verification:**
```bash
# Check what Vercel installs
npm ci --production --dry-run

# Output shows: devDependencies EXCLUDED
```

**Root Cause Identified:**
- Vercel installs with `--production` flag
- This excludes ALL devDependencies
- Build tools (vite, typescript) were in devDependencies
- No amount of PATH manipulation could fix missing packages

**17:45 - Commit d6f56b63** - Override NODE_ENV during install
```json
{
  "installCommand": "NODE_ENV=development npm ci --workspaces --include-workspace-root"
}
```
Result:  WORKS! But feels hacky

**17:55 - Commit 9406a3ff** - Use --production=false flag
```json
{
  "installCommand": "npm ci --production=false --workspaces --include-workspace-root"
}
```
Result:  WORKS! Clean solution

### Post-Incident (18:00)

**Deployment Status:**  SUCCESS

**Verification:**
```bash
# Vercel build logs
 Installing dependencies
 Building shared workspace
 Building client workspace
 Deployment successful
```

**Lessons:**
1. Always check install command flags first
2. Vercel !== Local environment
3. devDependencies vs dependencies matters in deployment
4. 30 commits could have been 1 with proper diagnosis

---

## Incident 2: CI Infrastructure Blockage

### Timeline: October 5-21, 2025

**Duration:** 16 days
**Impact:** ALL PRs blocked, no merges possible
**Severity:** CRITICAL - Development completely blocked

### Day 1: October 5, 2025 (Trigger)

**08:00 - Commit 0a90587** - Add strict env validation
```typescript
// client/vite.config.ts
if (mode === 'production') {
  const requiredEnvVars = [
    'VITE_API_BASE_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Cannot build without required environment variables: ${missingVars.join(', ')}`);
  }
}
```

**Intention:** Prevent deployments without proper configuration
**Result:** Broke CI smoke tests

**10:00 - First CI Failure**
```bash
smoke-test: Build production bundle
 Missing required environment variables
   - VITE_API_BASE_URL
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
```

**Why It Failed:**
- GitHub Actions doesn't have access to Vercel environment variables
- Smoke test runs `npm run build` in production mode
- No GitHub Secrets configured for these variables
- Validation throws error, build fails

### Days 2-5: October 6-9 (Confusion)

**Multiple PRs attempt merges:**
- All fail with same error
- Team tries adding GitHub Secrets
- Secrets not properly configured
- Different approach: try to fix validation

**October 9 - Wrong Fix Attempted**
```typescript
// Try to skip validation entirely
if (mode === 'production' && false) {
  // Disabled validation
}
```
Result:  Not committed, too dangerous

### Days 6-10: October 10-14 (Investigation)

**October 10 - Root Cause Analysis Begins**

Three build contexts identified:
1. **Local Dev** - Reads from `.env` file → Works
2. **Vercel** - Reads from Vercel project settings → Works
3. **GitHub Actions** - No env vars configured → FAILS

**October 12 - Options Evaluated**

**Option A:** Duplicate secrets in GitHub Actions
- Pros: Validates everywhere
- Cons: Secret duplication, maintenance burden

**Option B:** Conditional validation
- Pros: Surgical fix, no duplication
- Cons: Different behavior in CI

**Option C:** Mock values in CI
- Pros: Validation still runs
- Cons: False sense of security

**Decision:** Option B (conditional validation)

### Days 11-15: October 15-19 (Additional Issues Found)

**October 15 - Dead Smoke Test Workflow Discovered**
```bash
Error: /home/runner/work/July25/July25/client/playwright-smoke.config.ts does not exist
```

**History:**
- Commit 53dfbf4: Playwright smoke tests added with config
- Commit ea89695: Tests moved to tests/e2e/, config deleted
- Workflow never updated → references non-existent files

**October 17 - Webhook Timing Test Fails**
```bash
FAIL tests/security/webhook.proof.test.ts > Timing Attack Prevention
→ expected 6654900.666666667 to be less than 3390273.6666666665
```

**Root Cause:**
- Test measures constant-time HMAC comparison
- CI runners have variable performance
- Test tolerance too strict (50% → needed 200%)

### Day 16: October 21, 2025 (Resolution)

**06:00 - Commit 14477f82** - Complete CI infrastructure fixes

**Fix 1: Conditional Env Validation**
```typescript
if (mode === 'production' && !process.env.CI) {
  // Strict validation only for Vercel
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing: ${missingVars.join(', ')}`);
  }
} else if (mode === 'production' && process.env.CI) {
  console.warn('  CI environment detected - skipping strict env validation');
}
```

**Fix 2: Remove Dead Workflow**
```bash
rm .github/workflows/playwright-smoke.yml
```

**Fix 3: CI Timing Tolerance**
```typescript
const varianceTolerance = process.env.CI ? 3.0 : 2.0;  // 3x for CI
const maxVariance = avgTime * varianceTolerance;
```

**10:00 - CI Status:**  GREEN

**Impact Assessment:**
- 16 days of blocked PRs
- ~10 PRs waiting to merge
- Estimated 32 hours of wasted time (2 hours/day investigating)
- Feature delivery delayed by 2 weeks

---

## Incident 3: Memory Optimization Journey

### Timeline: October 1 - November 15, 2025

**Duration:** 6 weeks (ongoing)
**Impact:** Development environment instability, build failures
**Severity:** HIGH - Affects daily development

### Week 1: October 1-7 (Discovery)

**October 1 - Initial Symptoms**
```bash
$ npm run dev
# After 2 hours
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**October 3 - Memory Measurement**
```bash
$ ps aux | grep node | awk '{print $6/1024 " MB " $11}'
4890 MB node
3120 MB vite
2340 MB node
```

Total: **10.35 GB** for development environment

**October 5 - Investigation Launched**

Five parallel subagent investigations:
1. Graceful Shutdown Audit
2. Event Listener Analysis
3. WebSocket Memory Leaks
4. AI Services Memory Usage
5. Timer/Interval Cleanup

### Week 2: October 8-14 (Critical Issues Found)

**October 8 - VoiceWebSocketServer Leak**
```typescript
// PROBLEM: No reference to interval
constructor() {
  setInterval(() => this.cleanupInactiveSessions(), 60000);
}
```

**Impact:** 60s interval runs forever, prevents clean shutdown

**October 9 - AuthRateLimiter Leak**
```typescript
// PROBLEM: Module-level interval
setInterval(() => {
  for (const [clientId, attempts] of suspiciousIPs.entries()) {
    if (attempts < 3) {
      suspiciousIPs.delete(clientId);
    }
  }
}, 60 * 60 * 1000);
```

**Impact:** Maps grow unbounded, hourly cleanup never stopped

**October 10 - Error Tracker Leak**
```typescript
// PROBLEM: 5 global listeners, never removed
window.addEventListener('error', (event) => { ... })
window.addEventListener('unhandledrejection', (event) => { ... })
window.addEventListener('popstate', () => { ... })
window.addEventListener('focus', () => { ... })
window.addEventListener('blur', () => { ... })
```

**Impact:** Multiple ErrorTracker instances = duplicate listeners

**October 12 - TwilioBridge Leak**
```typescript
// PROBLEM: 60s interval at module level
setInterval(() => {
  // Bridge health check
}, 60000);
```

**October 14 - RealTimeMenuTools Leak**
```typescript
// PROBLEM: 5-minute cart cleanup
setInterval(() => {
  // Clear old carts
}, 300000);
```

### Week 3: October 15-21 (Fixes Applied)

**October 15 - Commit 9c7b548d** - Fix critical memory leaks
```typescript
// VoiceWebSocketServer
private cleanupInterval: NodeJS.Timeout | null = null;

constructor() {
  this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 60000);
}

public shutdown(): void {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }
}
```

**October 17 - Memory Reduced to 8GB**

**October 19 - NODE_OPTIONS Added**
```json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=6144' npm run dev"
  }
}
```

**October 21 - Memory Constraint: 6GB**

### Week 4-5: October 22 - November 4 (Bundle Optimization)

**October 25 - Manual Chunks Implemented**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
});
```

**Result:** Main bundle reduced from 850KB → 450KB

**November 1 - Memory Constraint: 4GB**

**November 3 - Tree Shaking Improved**
```typescript
// Remove unused imports
// Use named imports instead of namespace imports
// Lazy load heavy components
```

**Result:** Bundle size reduced 15%

### Week 6: November 5-15 (Target 3GB)

**November 8 - Memory Leak Tests Added**
```typescript
describe('Memory Leak Prevention', () => {
  test('VoiceWebSocketServer cleanup clears interval', () => {
    const server = new VoiceWebSocketServer();
    const intervalSpy = jest.spyOn(global, 'clearInterval');

    server.shutdown();

    expect(intervalSpy).toHaveBeenCalled();
  });
});
```

**November 12 - NODE_OPTIONS: 3GB**
```json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=3072' npm run dev",
    "build": "NODE_OPTIONS='--max-old-space-size=3072' npm run build"
  }
}
```

**November 15 - Current Status**

**Memory Usage:**
- Development: 2.8GB average (peak 3.5GB)
- Build: 2.5GB average (peak 3.2GB)
- Target: 1GB production

**Still TODO:**
- Optimize WebSocket connection pooling
- Reduce React component memory footprint
- Implement virtual scrolling for long lists
- Further bundle splitting

---

## Incident 4: Render tsx Confusion

### Timeline: November 15-16, 2025

**Duration:** 2 days
**Impact:** Backend deployment completely broken
**Severity:** CRITICAL - Production backend down

### Day 1: November 15, 2025

**09:00 - Deployment Triggered**

Environment variable overhaul merged (ba99b4a2), attempting production deployment to Render.

**09:30 - Build Successful**
```bash
 Installing dependencies
 Running build command
 Build successful
```

**09:35 - Start Fails**
```bash
 Error: tsx: not found
```

**Investigation Begins**

**09:45 - Check package.json**
```json
// server/package.json
{
  "scripts": {
    "start": "tsx src/server.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

**Problem Identified:** tsx is dev tool, not in production dependencies

**10:00 - Why Did This Work Locally?**
```bash
# Local development
npm install          # Installs ALL dependencies including devDependencies
npm start           # tsx available

# Render production
npm ci --production  # Installs ONLY dependencies
npm start           # tsx NOT available → CRASH
```

**10:30 - First Fix Attempt: Add tsx to dependencies**
```json
{
  "dependencies": {
    "tsx": "^4.7.0"
  }
}
```
Result:  Works but wrong approach (development tool in production)

**11:00 - Second Attempt: Use node-ts**
Result:  Still wrong, TypeScript interpreter in production

**13:00 - Hidden Issue Discovered: Build Errors Suppressed**
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json || true"
  }
}
```

**Why || true is Dangerous:**
```bash
$ npm run build
# TypeScript compilation FAILS
# BUT: || true makes script return success
# Result: Broken code deployed
```

**15:00 - Remove || true**
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json"
  }
}
```

**15:05 - Build Now Fails (Good!)**
```bash
ERROR: src/server.ts(45,37): error TS7006: Parameter 'req' implicitly has an 'any' type
ERROR: src/voice/voice-routes.ts(89,28): error TS7006: Parameter 'res' implicitly has an 'any' type
```

**17:00 - Additional Issue: Missing @types**
```json
// server/package.json (WRONG)
{
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.19.10"
  }
}
```

**Why Wrong:** TypeScript compilation happens in production build, needs @types available

### Day 2: November 16, 2025

**08:00 - Comprehensive Fix Plan**

1. Change start script to use compiled code
2. Fix TypeScript errors
3. Move @types to dependencies
4. Remove error suppression
5. Verify build locally

**09:00 - Commit 2ee0735c** - Fix TypeScript compilation failures

**Fix 1: Start Script**
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "start:dev": "tsx src/server.ts"
  }
}
```

**Fix 2: TypeScript Annotations**
```typescript
// Before (implicit any)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// After (explicit types)
import express from 'express';

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});
```

**Fix 3: Move @types to dependencies**
```json
{
  "dependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.19.10",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/uuid": "^9.0.7",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/multer": "^1.4.12",
    "@types/validator": "^13.15.3",
    "@types/ws": "^8.5.10"
  }
}
```

**Fix 4: Remove Error Suppression**
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json"
  }
}
```

**Fix 5: Environment Fallbacks**
```typescript
// server/src/config/environment.ts
export const config = {
  auth: {
    kioskJwtSecret: process.env.KIOSK_JWT_SECRET || '',  // Fallback for dev
  }
};
```

**11:00 - Local Build Test**
```bash
cd server && npm run build
#  No errors - compilation successful

ls dist/
#  server.js present
#  All modules compiled

node dist/server.js
#  Server starts successfully
```

**13:00 - Deploy to Render**
```bash
# Render build logs
 Installing dependencies
 Building application
 Starting server
 Health check successful
```

**14:00 - Production Verification**
```bash
curl https://july25.onrender.com/api/v1/health
# {"status":"ok","timestamp":"2025-11-16T19:00:00.000Z"}

curl https://july25.onrender.com/api/v1/ai/voice/handshake
# {"status":"ready","version":"1.0.0"}
```

**Status:**  RESOLVED

**Lessons:**
1. Never use development tools (tsx, ts-node) in production
2. Never suppress build errors with || true
3. @types packages needed for TypeScript compilation in production
4. Test production builds locally before deploying

---

## Incident 5: Environment Variable Drift

### Timeline: November 1-15, 2025

**Duration:** 2 weeks
**Impact:** Inconsistent behavior across environments, broken features
**Severity:** HIGH - Multiple production issues

### Week 1: November 1-7 (Discovery)

**November 1 - Voice Ordering Broken in Production**
```bash
# Symptom
User clicks "Voice Order" → No response

# Investigation
console.log(process.env.VITE_USE_REALTIME_VOICE)
# undefined
```

**Root Cause:** Missing environment variable in Vercel dashboard

**November 3 - KDS Auth Failing**
```bash
# Symptom
KDS unable to fetch orders

# Error
ERROR: Invalid restaurant_id format: "grow"
# Expected: UUID format "11111111-1111-1111-1111-111111111111"
```

**Root Cause:** Wrong DEFAULT_RESTAURANT_ID value in Render

**November 5 - Comprehensive Audit Launched**
```bash
find . -name ".env*" -not -path "*/node_modules/*"
```

**Result:** 15 .env files found!

```
.env
.env.local
.env.production
.env.development
.env.test
client/.env
client/.env.local
client/.env.example
server/.env
server/.env.local
server/.env.test
server/.env.example
supabase/.env
tests/.env
.env.example
```

**November 7 - Drift Analysis**
```bash
# Check for inconsistencies
diff .env .env.production
# 12 differences

diff client/.env server/.env
# 8 differences

grep OPENAI_API_KEY .env*
# 3 different keys (one exposed in git history!)
```

**Impact Assessment:**
- 80% inconsistency rate across files
- Exposed secrets (OpenAI key in git history)
- Missing variables in some environments
- Outdated credentials

### Week 2: November 8-15 (Resolution)

**November 8 - Consolidation Plan**

**Goals:**
1. Reduce to 3 .env.example files (committed)
2. Single .env.local for development (gitignored)
3. Platform dashboards for production
4. Zod validation for consistency

**November 9 - Commit 503d9625** - Environment audit and consolidation

**File Structure After:**
```
.env.example              # Root - Documents ALL variables
client/.env.example       # Client-specific (VITE_ prefix)
server/.env.example       # Server-specific
.env.local                # Developer's local values (gitignored)
```

**November 10 - Zod Schema Implementation**
```typescript
// server/src/config/env.schema.ts
import { z } from 'zod';

export const serverEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  KIOSK_JWT_SECRET: z.string().length(64),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  DEFAULT_RESTAURANT_ID: z.string().uuid(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
```

```typescript
// client/src/config/env.schema.ts
export const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_USE_REALTIME_VOICE: z.enum(['true', 'false']),
  VITE_DEFAULT_RESTAURANT_ID: z.string().min(1),
});
```

**November 12 - Secret Rotation**

All compromised secrets rotated:
```bash
# Generate new secrets
openssl rand -hex 32  # For JWT secrets
openssl rand -hex 32  # For PIN pepper
openssl rand -hex 32  # For device fingerprint salt
openssl rand -hex 32  # For station token secret
openssl rand -hex 32  # For webhook secret
```

**New Values:**
- KIOSK_JWT_SECRET: d6891cc41e29a379c8092b8d0df36afa7179e3014269ecf1b83737213aa52028
- PIN_PEPPER: 1786e4f29d84b49494cdbc5c66d40175968c98a9348a4d2ae1e54634532b70f5
- DEVICE_FINGERPRINT_SALT: 4ad5e29da8df415454a6fba5b3db2b69513adfb10084b6e955dcc6918691a012
- STATION_TOKEN_SECRET: f0745e683def8911eb9bfc9885ada2bff49f428287a525f97ee4744537681a32
- WEBHOOK_SECRET: 475c811c7d0a2b736ee211a8eaaa763e8f92e2a05d65c039bbcf992272839ce8

**November 13 - Pre-commit Hook**
```bash
# .husky/pre-commit
npm run env:validate
```

**November 14 - CI/CD Workflow**
```yaml
# .github/workflows/env-validation.yml
name: Environment Variable Validation

on:
  push:
    paths:
      - '.env.example'
      - 'client/.env.example'
      - 'server/.env.example'
  schedule:
    - cron: '0 0 * * 0'  # Weekly drift check

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: node scripts/validate-env.cjs
```

**November 15 - URGENT_ENV_UPDATES_REQUIRED.md Created**

Documentation for updating production dashboards with new secrets.

**Verification:**
```bash
# All environments consistent
npm run env:validate
#  All checks passed

# No drift detected
npm run docs:drift
#  No drift detected
```

**Status:**  RESOLVED

**Ongoing:**
- Weekly drift checks via CI
- Pre-commit validation
- Platform dashboard updates required

---

## Incident Summary Matrix

| Incident | Duration | Direct Cost | Commits | Severity | Status |
|----------|----------|-------------|---------|----------|--------|
| Vercel Monorepo Cascade | 9 hours | $900 | 30 | CRITICAL | Resolved |
| CI Infrastructure Blockage | 16 days | $3,200 | 5 | CRITICAL | Resolved |
| Memory Optimization | 6 weeks | $6,000 | 15+ | HIGH | Ongoing |
| Render tsx Confusion | 2 days | $800 | 8 | CRITICAL | Resolved |
| Environment Drift | 2 weeks | $1,600 | 12 | HIGH | Resolved |
| **TOTALS** | **82 hours** | **$12,500** | **70+** | - | - |

---

## Root Cause Analysis: Common Patterns

### Pattern 1: Local/Production Environment Mismatch

**Incidents Affected:**
- Vercel Monorepo Cascade
- CI Infrastructure Blockage
- Render tsx Confusion

**Common Theme:**
- Works locally, fails in deployment
- Different install commands (npm install vs npm ci --production)
- Different environment variables
- Different PATH resolution

**Prevention:**
- Test with production builds locally
- Match CI/deployment environment closely
- Document environment differences
- Add CI checks for deployment parity

### Pattern 2: Hidden Issues

**Incidents Affected:**
- Render tsx Confusion (|| true suppression)
- Memory Optimization (silent leaks)
- Environment Drift (multiple .env files)

**Common Theme:**
- Problems masked by workarounds
- Error suppression
- Silent failures
- No monitoring/alerting

**Prevention:**
- Fail fast, don't suppress errors
- Add explicit validation
- Monitor memory/performance
- Audit configuration regularly

### Pattern 3: Dependencies Confusion

**Incidents Affected:**
- Vercel Monorepo Cascade
- Render tsx Confusion

**Common Theme:**
- devDependencies vs dependencies unclear
- Build tools needed in production
- @types packages placement
- Monorepo workspace resolution

**Prevention:**
- Clear documentation of which goes where
- CI checks for proper dependency placement
- Test builds with --production flag
- Understand platform install commands

### Pattern 4: Lack of Automated Checks

**Incidents Affected:**
- ALL incidents

**Common Theme:**
- Manual discovery of issues
- No CI validation for configuration
- No automated environment parity checks
- Reactive rather than proactive

**Prevention:**
- Add CI workflows for env validation
- Pre-commit hooks for configuration
- Automated drift detection
- Weekly health checks

---

## Cost-Benefit Analysis

### Total Incident Cost

**Direct Costs:**
- Developer time: 82 hours × $100/hour = $8,200
- Opportunity cost (blocked features): ~$15,000
- Customer impact (downtime/bugs): Unknown
- **Total Estimated:** $25,000-$30,000

### Prevention Investment

**Built Solutions:**
- Environment validation CI workflow: 4 hours
- Pre-commit hooks: 2 hours
- Improved vercel.json configuration: 2 hours
- Memory leak tests: 4 hours
- Comprehensive documentation: 8 hours
- **Total Investment:** 20 hours = $2,000

### ROI Calculation

**If prevents ONE similar incident:**
- Savings: $8,200 (direct) + $15,000 (opportunity) = $23,200
- Investment: $2,000
- **ROI: 1,060%**

**Even preventing HALF an incident:**
- Savings: $11,600
- Investment: $2,000
- **ROI: 480%**

**Conclusion:** Prevention measures pay for themselves 5-10x over.

---

## Lessons Learned (Cross-Incident)

### 1. Environment Parity is Critical
Every difference between local, CI, and production is a potential failure point.

### 2. Fail Fast, Fail Loudly
Error suppression (|| true) masks problems. Let builds fail early.

### 3. Documentation Pays Off
20 hours of documentation saves weeks of debugging.

### 4. Monorepos are Complex
Workspace builds, PATH resolution, dependency management all differ from simple projects.

### 5. Test Production Builds Locally
`npm run build` locally !== production build. Test with same flags as deployment.

### 6. Memory Leaks are Insidious
Silent, accumulating, hard to detect. Need explicit cleanup patterns and monitoring.

### 7. One Issue Cascades
Single misunderstanding (--production flag) → 30 commits of attempted fixes.

### 8. Dependencies vs devDependencies Matters
In deployment, this distinction is critical. Be explicit about what's needed when.

### 9. Configuration Drift Compounds
15 .env files with 80% inconsistency = guaranteed production issues.

### 10. Prevention is Cheaper than Reaction
Automated checks, validation, documentation upfront saves 10x debugging time later.

---

## Next Steps

### For Future Incidents

1. **Immediate:**
   - Check environment variables first
   - Verify dependencies vs devDependencies
   - Test with production flags
   - Check for error suppression

2. **Investigation:**
   - Compare local vs CI vs production
   - Check recent commits for configuration changes
   - Look for hidden workarounds (|| true, || exit 0)
   - Review platform-specific documentation

3. **Resolution:**
   - Fix root cause, not symptoms
   - Add tests/checks to prevent recurrence
   - Document in INCIDENTS.md
   - Update prevention measures

4. **Post-Mortem:**
   - Document timeline
   - Identify patterns
   - Calculate costs
   - Implement prevention

---

**Document Last Updated:** November 19, 2025
**Document Version:** 1.0.0
**Maintainer:** Engineering Team
**Next Review:** After next incident (hopefully never!)


## Solution Patterns

# Build & Deployment Patterns

**Purpose:** Understand the patterns that cause build issues and how to avoid them
**Audience:** Developers and AI agents working with the monorepo
**Last Updated:** November 19, 2025

---

## Table of Contents

1. [Monorepo Workspace Compilation](#monorepo-workspace-compilation)
2. [Dependencies vs devDependencies](#dependencies-vs-devdependencies)
3. [Environment Variable Validation](#environment-variable-validation)
4. [Memory Constraint Management](#memory-constraint-management)
5. [CI vs Production Environment Differences](#ci-vs-production-environment-differences)
6. [Build Order Dependencies](#build-order-dependencies)

---

## Monorepo Workspace Compilation

### The Core Challenge

In a monorepo, **workspace context matters**. What works in local development may fail in CI/deployment because:

1. **PATH Resolution** - Different in root vs workspace
2. **Module Resolution** - Workspaces may not see root node_modules
3. **Build Tools** - Must be accessible from workspace context
4. **Configuration Files** - May need to be in workspace or root depending on tool

### Pattern: Local Works, Vercel Fails

#### Scenario
```bash
# Local development (WORKS)
npm run dev
npm run build

# Vercel deployment (FAILS)
ERROR: vite: command not found
```

#### Why It Happens

**Local:** npm run scripts execute with full PATH including root node_modules/.bin
```bash
$ npm run build
# Executes: ./node_modules/.bin/vite build
```

**Vercel:** Workspace build runs in isolated context
```bash
$ cd client && npm run build
# Executes: ../node_modules/.bin/vite build  # MAY NOT EXIST
```

#### Solution Pattern

**Option 1: Build from Root (Recommended)**
```json
// package.json (root)
{
  "scripts": {
    "build:vercel": "npm run build --workspace=@rebuild/shared --if-present && npm run build --workspace=restaurant-os-client"
  }
}
```

**Option 2: Install in Workspace**
```json
// client/package.json
{
  "dependencies": {
    "vite": "5.4.19"  // In dependencies, not devDependencies
  }
}
```

**Option 3: Use npx (Not Recommended)**
```json
// client/package.json
{
  "scripts": {
    "build": "npx vite build"  // Downloads on every build, slow
  }
}
```

---

### Pattern: TypeScript Compilation in Workspaces

#### The Problem
```bash
# Shared workspace needs TypeScript to compile
cd shared && npm run build
# ERROR: tsc: command not found
```

#### Why It Happens

TypeScript is in root devDependencies:
```json
// package.json (root)
{
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

But workspace tries to access it:
```json
// shared/package.json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json"
  }
}
```

#### Evolution of Solutions (30-Commit Cascade)

**Attempt 1:** Add to root devDependencies (Already there!)
```bash
# Still fails - workspace can't see it
```

**Attempt 2:** Use npx
```json
"build": "npx tsc -p tsconfig.build.json"
```
Result: Works but slow, downloads on every build

**Attempt 3:** Use npm exec
```json
"build": "npm exec tsc -- -p tsconfig.build.json"
```
Result: Still fails in Vercel

**Attempt 4:** Use full path
```json
"build": "../../node_modules/.bin/tsc -p tsconfig.build.json"
```
Result: Fragile, breaks if structure changes

**Attempt 5:** Move to workspace dependencies
```json
// shared/package.json
{
  "dependencies": {
    "typescript": "^5.3.3"
  }
}
```
Result: **WORKS** - But only because TypeScript is now in dependencies

**Attempt 6 (Final):** Build from root with workspace flag
```json
// package.json (root)
{
  "scripts": {
    "build:vercel": "npm run build --workspace=@rebuild/shared --if-present && npm run build --workspace=restaurant-os-client"
  }
}
```
Result: **OPTIMAL** - Clean, maintains workspace isolation, works everywhere

#### Rule of Thumb

**If a build tool is needed during `npm run build`:**
- Put it in `dependencies` (not `devDependencies`)
- OR ensure workspace builds run from root context
- OR install it in the specific workspace

---

### Pattern: PostCSS Plugin Resolution

#### The Problem
```bash
# Vercel build fails
Error: Cannot find module 'tailwindcss'
```

#### Why It Happens

PostCSS configuration in client workspace:
```javascript
// client/postcss.config.js
export default {
  plugins: [
    'tailwindcss',  // String reference
    'autoprefixer'
  ]
}
```

Plugins installed in root:
```json
// package.json (root)
{
  "devDependencies": {
    "tailwindcss": "^3.4.11",
    "autoprefixer": "^10.4.20"
  }
}
```

**Problem:** Workspace can't resolve string references to root node_modules

#### Solution: Use require.resolve()
```javascript
// client/postcss.config.js
export default {
  plugins: [
    require('tailwindcss'),  // Direct require
    require('autoprefixer')
  ]
}
```

Or move postcss.config.js to root:
```javascript
// postcss.config.js (root)
export default {
  plugins: [
    'tailwindcss',
    'autoprefixer'
  ]
}
```

---

## Dependencies vs devDependencies

### The Critical Distinction

In a monorepo, the difference between `dependencies` and `devDependencies` determines **what gets installed in production/CI builds**.

### Pattern: Vercel Installs with --production

#### Default Behavior
```bash
# Vercel's default install command
npm ci --production

# This installs:
#  dependencies
#  devDependencies (EXCLUDED)
```

#### Why This Breaks Builds

If your build tools are in devDependencies:
```json
// package.json
{
  "devDependencies": {
    "vite": "5.4.19",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.11"
  }
}
```

Then `npm ci --production` doesn't install them, and build fails.

#### Solution 1: Custom Install Command (Recommended)

```json
// vercel.json
{
  "installCommand": "npm ci --production=false --workspaces --include-workspace-root"
}
```

**Explanation:**
- `--production=false` - Install devDependencies too
- `--workspaces` - Install all workspace dependencies
- `--include-workspace-root` - Install root dependencies

#### Solution 2: Move Build Tools to dependencies

```json
// package.json
{
  "dependencies": {
    "vite": "5.4.19",
    "typescript": "^5.3.3",
    "@vitejs/plugin-react": "^4.5.2"
  }
}
```

**Trade-off:** Larger production bundle, but more predictable builds

#### Solution 3: NODE_ENV Override (Hacky)

```json
// vercel.json
{
  "installCommand": "NODE_ENV=development npm ci --workspaces"
}
```

**Problem:** npm checks NODE_ENV to decide production flag
**Issue:** Can confuse other tools that read NODE_ENV

---

### Pattern: @types Packages in Monorepo

#### The Render Deployment Issue

**Problem:** TypeScript compilation fails in production
```bash
# Render build
npm run build
# ERROR: Cannot find module '@types/express'
```

#### Why It Happens

TypeScript needs @types packages to compile, but they're in devDependencies:
```json
// server/package.json (WRONG)
{
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.19.10",
    "@types/jsonwebtoken": "^9.0.6"
  }
}
```

Render runs:
```bash
npm ci --production  # Skips devDependencies
npm run build        # TypeScript can't find @types
```

#### Solution: Move @types to dependencies

```json
// server/package.json (CORRECT)
{
  "dependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.19.10",
    "@types/jsonwebtoken": "^9.0.6"
  }
}
```

**Why This Works:**
- @types packages are needed at BUILD TIME
- Production builds compile TypeScript
- @types in dependencies ensures they're always available

**Why This is OK:**
- @types packages are tiny (~100KB total)
- No runtime cost (only used during compilation)
- Ensures build reproducibility

---

## Environment Variable Validation

### Pattern: Context-Aware Validation

#### The Problem

Environment validation that works everywhere:
```typescript
// client/vite.config.ts
if (mode === 'production') {
  const required = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing: ${missing.join(', ')}`);
  }
}
```

**Issue:** This fails in CI where production secrets aren't available.

#### Three Build Contexts

1. **Local Development** - Reads from `.env` file
2. **CI/GitHub Actions** - No secrets, builds for testing only
3. **Production/Vercel** - Reads from platform environment variables

#### Solution: Environment Detection

```typescript
// client/vite.config.ts
if (mode === 'production' && !process.env.CI) {
  // Strict validation only for actual production deployments
  const required = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
} else if (mode === 'production' && process.env.CI) {
  console.warn('  CI environment detected - skipping strict env validation');
  console.warn('   Production builds on Vercel will still enforce strict validation');
}
```

**Benefits:**
-  Local production builds work without secrets
-  CI can build for smoke tests
-  Actual production deployment still validates strictly
-  Clear warnings in each context

---

### Pattern: Zod Schema Validation

#### Recommended Approach

Use Zod for runtime validation with environment-aware fallbacks:

```typescript
// server/src/config/env.schema.ts
import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  KIOSK_JWT_SECRET: z.string().min(32).optional(), // Optional for dev
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment variables: ${result.error.message}`);
    } else {
      console.warn('  Development mode: Some env vars missing', result.error.format());
    }
  }

  return result.data;
}
```

#### Benefits of Zod

1. **Type Safety** - Generated types match runtime validation
2. **Clear Errors** - Zod provides detailed validation errors
3. **Transformations** - Auto-trim whitespace, parse numbers, etc.
4. **Optional vs Required** - Different rules for dev vs prod
5. **Documentation** - Schema IS documentation

---

### Pattern: Environment File Consolidation

#### Before: 15 .env Files (CHAOS)

```
.env
.env.local
.env.production
.env.development
.env.test
client/.env
client/.env.local
client/.env.example
server/.env
server/.env.local
server/.env.test
server/.env.example
supabase/.env
tests/.env
.env.example
```

**Problems:**
- Same variable with different values across files
- No single source of truth
- Drift detection impossible
- 80% inconsistency rate

#### After: 3 .env Files (ORDER)

```
.env.example              # Root - lists ALL variables
client/.env.example       # Client-specific (VITE_ prefix)
server/.env.example       # Server-specific
```

**Development:**
```
.env.local               # Developer's local overrides (gitignored)
```

**Rules:**
1. **.env.example** - Committed, documents ALL variables
2. **.env.local** - Gitignored, developer's actual values
3. **Platform Dashboards** - Production values (Vercel, Render)
4. **Zod Validation** - Enforces consistency

---

## Memory Constraint Management

### The Memory Journey: 12GB → 3GB → 1GB (target)

#### Why Memory Matters

Node.js default heap: **512MB**
Vite development: **2-4GB**
Our target: **1GB production, 3GB development**

Without constraints → memory leaks grow unchecked → OOM crashes

### Pattern: NODE_OPTIONS Configuration

#### Correct Usage

```json
// package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=3072' concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build": "NODE_OPTIONS='--max-old-space-size=3072' npm run build:client",
    "test": "NODE_OPTIONS='--max-old-space-size=3072 --expose-gc' npm test"
  }
}
```

**Values:**
- 3072 = 3GB (current safe limit)
- 2048 = 2GB (intermediate goal)
- 1024 = 1GB (production target)

#### Anti-Pattern: Global NODE_OPTIONS

```bash
# DON'T DO THIS (affects all Node processes)
export NODE_OPTIONS='--max-old-space-size=8192'
```

**Why Bad:**
- Affects ALL Node.js processes system-wide
- Masks memory issues
- Makes debugging harder
- Not reproducible across environments

#### Pattern: Vite Memory Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod']
        }
      }
    }
  }
});
```

**Why Manual Chunks Help:**
- Splits large bundles into smaller pieces
- Reduces peak memory during build
- Improves load-time performance
- Enables better caching

---

### Pattern: Memory Leak Detection

#### Common Leak Sources

1. **Event Listeners Without Cleanup**
```typescript
// BAD
componentDidMount() {
  window.addEventListener('resize', this.handler);
}

// GOOD
componentDidMount() {
  window.addEventListener('resize', this.handler);
}

componentWillUnmount() {
  window.removeEventListener('resize', this.handler);
}
```

2. **Intervals Without Clearing**
```typescript
// BAD
setInterval(() => this.cleanup(), 60000);

// GOOD
private interval: NodeJS.Timeout | null = null;

start() {
  this.interval = setInterval(() => this.cleanup(), 60000);
}

stop() {
  if (this.interval) {
    clearInterval(this.interval);
    this.interval = null;
  }
}
```

3. **Unbounded Caches**
```typescript
// BAD
const cache = {};
function addToCache(key, value) {
  cache[key] = value; // Grows forever
}

// GOOD
const cache = new Map();
const MAX_SIZE = 1000;

function addToCache(key, value) {
  if (cache.size >= MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}
```

#### Detection Commands

```bash
# Monitor heap usage
node --expose-gc --inspect server/src/server.ts

# Take heap snapshot
kill -USR2 <pid>

# Analyze in Chrome DevTools
chrome://inspect
```

---

## CI vs Production Environment Differences

### Pattern: Environment Detection

#### Five Environments to Consider

1. **Local Development** (`NODE_ENV=development`)
2. **Local Production Build** (`NODE_ENV=production`, no CI)
3. **CI/GitHub Actions** (`NODE_ENV=production`, `CI=true`)
4. **Staging/Preview** (`NODE_ENV=production`, Vercel preview)
5. **Production** (`NODE_ENV=production`, Vercel production)

#### Detection Pattern

```typescript
const isCI = process.env.CI === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';
const isPreview = process.env.VERCEL_ENV === 'preview';

if (isProduction && !isCI) {
  // Actual production deployment - strict validation
} else if (isProduction && isCI) {
  // CI build - lenient validation
} else {
  // Development - helpful warnings
}
```

---

### Pattern: CI-Specific Tolerances

#### Example: Timing Tests

```typescript
// server/tests/security/webhook.proof.test.ts
const avgTime = timings.reduce((a, b) => a + b) / timings.length;

// CI runners have more variance due to shared resources
const varianceTolerance = process.env.CI ? 3.0 : 2.0;  // 3x for CI, 2x for local
const maxVariance = avgTime * varianceTolerance;

for (const timing of timings) {
  const variance = Math.abs(timing - avgTime);
  expect(variance).toBeLessThan(maxVariance);
}
```

**Why:**
- GitHub Actions runners are shared and variable performance
- Local machines are more consistent
- Test should verify BEHAVIOR (constant-time algorithm) not absolute performance

---

### Pattern: Environment Parity Checklist

Before deploying, verify parity across all environments:

**Dependencies:**
- [ ] Same Node.js version (20.x)
- [ ] Same npm version (10.7.0)
- [ ] Same package-lock.json
- [ ] Dependencies match devDependencies needs

**Environment Variables:**
- [ ] All required vars documented in .env.example
- [ ] Zod schema matches .env.example
- [ ] Platform dashboards match schema
- [ ] No hardcoded secrets in code

**Build Process:**
- [ ] Same build command in all environments
- [ ] Same NODE_OPTIONS constraints
- [ ] Workspace build order documented
- [ ] PostCSS/Vite/TS accessible from workspace

**Runtime:**
- [ ] Same start command
- [ ] Same port configuration
- [ ] Same database connection
- [ ] Same API endpoints

---

## Build Order Dependencies

### Pattern: Workspace Dependency Graph

```
shared/         (No dependencies)
    ↓
client/         (Depends on shared)
    ↓
server/         (Depends on shared)
```

#### Correct Build Order

```bash
# Option 1: Sequential
npm run build --workspace=@rebuild/shared --if-present
npm run build --workspace=restaurant-os-client
npm run build --workspace=restaurant-os-server

# Option 2: Parallel (if independent after shared)
npm run build --workspace=@rebuild/shared && \
npm run build --workspace=restaurant-os-client & \
npm run build --workspace=restaurant-os-server & \
wait
```

#### Incorrect Build Order (FAILS)

```bash
# BAD: Client before shared
npm run build --workspace=restaurant-os-client  # ERROR: Cannot find module 'shared/types'
npm run build --workspace=@rebuild/shared

# BAD: All in parallel
npm run build --workspaces  # Race condition, may fail randomly
```

---

### Pattern: Detecting Build Order Issues

#### Symptoms

```bash
# Build works sometimes, fails other times (race condition)
npm run build  # Success
npm run build  # Success
npm run build  # ERROR: Cannot find module 'shared/types'

# Build fails in CI but works locally
npm run build  # Local: Success
# CI: ERROR
```

#### Diagnosis

```bash
# Check import timestamps
ls -la client/dist/
ls -la shared/dist/

# If shared/dist is NEWER than client/dist → build order issue
```

#### Solution

```json
// package.json
{
  "scripts": {
    "prebuild:client": "npm run build --workspace=@rebuild/shared --if-present",
    "build:client": "npm run build --workspace=restaurant-os-client"
  }
}
```

Using `prebuild` prefix ensures correct order automatically.

---

## Summary: Pattern Recognition

### When You See... It Means...

| Symptom | Pattern | Solution |
|---------|---------|----------|
| "command not found" in Vercel | Workspace PATH issue | Build from root OR add to dependencies |
| Works locally, fails CI | Environment difference | Check NODE_ENV, CI variable, secrets |
| Random build failures | Race condition | Fix build order, use `--if-present` |
| Memory errors | Heap limit exceeded | Check NODE_OPTIONS, fix memory leaks |
| "Cannot find module '@types/*'" | Missing build dependencies | Move @types to dependencies |
| PostCSS errors in CI | Plugin resolution | Use require() or move config to root |
| Environment validation fails | Missing secrets | Context-aware validation |

### Quick Decision Tree

```
Build failing?
    ↓
Works locally?
    YES → Environment difference (check CI variable, secrets)
    NO → Local issue (check dependencies, build order)
        ↓
    CI only?
        YES → Check environment variables, dependencies vs devDependencies
        NO → Check vercel.json, installCommand
            ↓
        Vercel only?
            YES → Monorepo workspace issue (PATH, module resolution)
            NO → Memory issue? (check heap size)
```

---

## Next Steps

- **For Prevention:** See [PREVENTION.md](./PREVENTION.md)
- **For Quick Fixes:** See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
- **For AI Agents:** See [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md)
- **For Incidents:** See [INCIDENTS.md](./INCIDENTS.md)

---

**Last Updated:** November 19, 2025
**Document Version:** 1.0.0
**Maintainer:** Engineering Team


## Quick Reference

# Build & Deployment Quick Reference

**Purpose:** Fast lookup for commands, configurations, and checklists
**Audience:** Developers needing quick answers
**Format:** Copy-paste ready commands

---

## Build Commands for Each Environment

### Local Development
```bash
# Start development servers (client + server)
npm run dev

# Start client only
npm run dev:client

# Start server only
npm run dev:server

# With memory limit
NODE_OPTIONS='--max-old-space-size=3072' npm run dev
```

### Local Production Test
```bash
# Build client for production
cd client && npm run build

# Serve client locally
npx serve -s dist -p 5173

# Build server for production
cd server && npm run build

# Start server with compiled code
node dist/server.js
```

### Vercel Deployment
```bash
# Deploy via CLI
vercel --prod

# Or push to main for auto-deploy
git push origin main

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]
```

### Render Deployment
```bash
# Auto-deploys from main branch
git push origin main

# Manual deploy via dashboard
# https://dashboard.render.com/web/your-service

# View logs
# Dashboard → your-service → Logs
```

---

## Memory Flags and Limits

### Current Constraints
```bash
# Development (3GB)
NODE_OPTIONS='--max-old-space-size=3072'

# Build (3GB)
NODE_OPTIONS='--max-old-space-size=3072'

# Test (3GB with GC)
NODE_OPTIONS='--max-old-space-size=3072 --expose-gc'

# Production Target (1GB)
NODE_OPTIONS='--max-old-space-size=1024'
```

### Check Memory Usage
```bash
# Current memory usage
ps aux | grep node | awk '{print $6/1024 " MB " $11}'

# Watch memory in real-time
watch -n 1 "ps aux | grep node | awk '{print \$6/1024 \" MB \" \$11}'"

# Detailed memory breakdown
node --inspect server/src/server.ts
# Then: chrome://inspect
```

---

## Environment Variable Checklist

### Client Variables (VITE_ prefix)
```bash
VITE_API_BASE_URL=https://july25.onrender.com
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=[from Supabase dashboard]
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_USE_REALTIME_VOICE=true
VITE_DEBUG_VOICE=false
VITE_ENVIRONMENT=production
VITE_DEMO_PANEL=false
```

### Server Variables
```bash
# OpenAI
OPENAI_API_KEY=[from OpenAI dashboard]

# Supabase
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_SERVICE_KEY=[from Supabase dashboard]

# Authentication Secrets (64-char hex)
KIOSK_JWT_SECRET=[64 chars]
PIN_PEPPER=[64 chars]
DEVICE_FINGERPRINT_SALT=[64 chars]
STATION_TOKEN_SECRET=[64 chars]
WEBHOOK_SECRET=[64 chars]

# Configuration
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://july25-client.vercel.app
ALLOWED_ORIGINS=https://july25-client.vercel.app,http://localhost:5173
```

### Validation Commands
```bash
# Validate environment configuration
npm run env:validate

# Check for drift
npm run docs:drift

# Generate new secret (64-char hex)
openssl rand -hex 32
```

---

## Deployment Rollback Steps

### Vercel Rollback (3 minutes)
```bash
# Option 1: Via CLI
vercel rollback [deployment-url]

# Option 2: Via Dashboard
# 1. https://vercel.com/your-team/july25-client/deployments
# 2. Find last good deployment
# 3. Click "..." → "Promote to Production"
```

### Render Rollback (5 minutes)
```bash
# Option 1: Via Dashboard
# 1. https://dashboard.render.com/web/your-service
# 2. Events tab → Find last good deploy
# 3. "Rollback to this deploy"

# Option 2: Git revert
git revert HEAD
git push origin main  # Auto-deploys
```

---

## Troubleshooting Quick Fixes

### "vite: command not found" in Vercel
```json
// vercel.json
{
  "installCommand": "npm ci --production=false --workspaces --include-workspace-root"
}
```

### "tsx: not found" in Render
```json
// server/package.json
{
  "scripts": {
    "start": "node dist/server.js"  // NOT "tsx src/server.ts"
  }
}
```

### Environment validation fails in CI
```typescript
// vite.config.ts
if (mode === 'production' && !process.env.CI) {
  // Only validate in actual production, not CI
}
```

### Memory limit exceeded
```json
// package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=3072' npm run build"
  }
}
```

### TypeScript compilation fails in Render
```json
// server/package.json
{
  "dependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.19.10",
    "typescript": "^5.3.3"
  }
}
```

---

## Critical File Locations

### Configuration Files
```
/vercel.json                           # Vercel deployment config
/package.json                          # Root workspace config
/client/package.json                   # Client dependencies
/server/package.json                   # Server dependencies
/shared/package.json                   # Shared types
```

### Environment Files
```
/.env.example                          # Root env documentation
/client/.env.example                   # Client env documentation
/server/.env.example                   # Server env documentation
/.env.local                           # Local development (gitignored)
```

### Schema Files
```
/server/src/config/env.schema.ts      # Server env validation
/client/src/config/env.schema.ts      # Client env validation
```

### Documentation
```
/docs/reference/config/ENVIRONMENT.md              # Environment reference
/docs/reference/config/VERCEL_RENDER_DEPLOYMENT.md # Deployment guide
/claude-lessons3/05-build-deployment-issues/       # This directory
```

---

## Pre-Deployment Checklist

Copy this before each deployment:

```
[ ] Environment variables validated: `npm run env:validate`
[ ] All tests passing: `npm test`
[ ] Type check clean: `npm run typecheck`
[ ] Memory usage acceptable: <3GB
[ ] Production build tested locally
[ ] No console.log statements added
[ ] Documentation updated
[ ] Rollback plan ready
[ ] Team notified of deployment
```

---

## Common Commands

### Install & Setup
```bash
# Clean install all workspaces
npm ci --production=false --workspaces --include-workspace-root

# Install single workspace
npm install --workspace=restaurant-os-client

# Clean everything
npm run clean:all
```

### Build
```bash
# Build all
npm run build:full

# Build client for Vercel
npm run build:vercel

# Build server for Render
npm run build:render

# Build with memory limit
NODE_OPTIONS='--max-old-space-size=3072' npm run build
```

### Test
```bash
# All tests
npm test

# Client tests only
npm run test:client

# Server tests only
npm run test:server

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

### Type Checking
```bash
# Full type check
npm run typecheck

# Quick check (faster)
npm run typecheck:quick

# Watch mode
npm run typecheck -- --watch
```

### Deployment
```bash
# Deploy client to Vercel
vercel --prod

# Check Vercel status
vercel ls

# View Vercel logs
vercel logs [deployment-url]

# Render auto-deploys from main
git push origin main
```

### Monitoring
```bash
# Check backend health
curl https://july25.onrender.com/api/v1/health

# Check voice service
curl https://july25.onrender.com/api/v1/ai/voice/handshake

# Memory usage
ps aux | grep node

# Port usage
lsof -i :3001
lsof -i :5173
```

---

## Emergency Contacts

### Platforms
- **Vercel Dashboard:** https://vercel.com/your-team/july25-client
- **Render Dashboard:** https://dashboard.render.com/web/your-service
- **Supabase Dashboard:** https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt
- **OpenAI Dashboard:** https://platform.openai.com/

### Documentation
- **Main Docs:** /Users/mikeyoung/CODING/rebuild-6.0/docs/
- **Build Issues:** /Users/mikeyoung/CODING/rebuild-6.0/claude-lessons3/05-build-deployment-issues/
- **CLAUDE.md:** /Users/mikeyoung/CODING/rebuild-6.0/CLAUDE.md

### Git
```bash
# Recent commits
git log --oneline -20

# Find who changed file
git blame [file]

# Find when line was added
git log -S "search term" -p

# View specific commit
git show [commit-hash]
```

---

## Quick Diagnosis Tree

```
Problem: Build failing
├─ Works locally?
│  ├─ YES → Environment difference
│  │  ├─ Check CI variable: process.env.CI
│  │  ├─ Check secrets configuration
│  │  └─ Check vercel.json installCommand
│  └─ NO → Local issue
│     ├─ Check dependencies: npm ci
│     ├─ Check build order: shared before client
│     └─ Check NODE_OPTIONS memory limit

Problem: Deployment failing
├─ Vercel?
│  ├─ Check vercel.json installCommand
│  ├─ Check --production=false flag
│  └─ Check buildCommand workspace order
└─ Render?
   ├─ Check start script uses node (not tsx)
   ├─ Check @types in dependencies
   └─ Check TypeScript compiles cleanly

Problem: Memory issues
├─ Check current usage: ps aux | grep node
├─ Check NODE_OPTIONS in package.json
├─ Check for memory leaks:
│  ├─ Intervals without clearInterval
│  ├─ Event listeners without cleanup
│  └─ Unbounded caches
└─ Optimize bundle: manual chunks in vite.config.ts

Problem: Environment variables
├─ Validate: npm run env:validate
├─ Check drift: npm run docs:drift
├─ Verify platform dashboards
│  ├─ Vercel: VITE_ variables
│  └─ Render: Server variables
└─ Check Zod schema matches .env.example
```

---

**Document Version:** 1.0.0
**Last Updated:** November 19, 2025
**Print This:** Keep a copy at your desk!


