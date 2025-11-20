# Build & Deployment Issue Prevention

**Purpose:** Solutions, configurations, and preventive measures
**Status:** Active - These patterns prevent future incidents
**Last Updated:** November 19, 2025

---

## Quick Prevention Checklist

Before any deployment:
- [ ] Verify vercel.json has `--production=false`
- [ ] Check NODE_OPTIONS is set correctly
- [ ] Run environment validation: `npm run env:validate`
- [ ] Test with production build locally
- [ ] Verify workspace build order
- [ ] Check for error suppression (`|| true`)

---

## 1. Correct vercel.json Configuration

### The Complete Working Configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm ci --production=false --workspaces --include-workspace-root",
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "microphone=(self), camera=(), geolocation=()" }
      ]
    }
  ]
}
```

### Key Configuration Explained

**installCommand:**
```bash
npm ci --production=false --workspaces --include-workspace-root
```
- `npm ci` - Clean install (faster, more reliable than `npm install`)
- `--production=false` - **CRITICAL:** Install devDependencies too (build tools!)
- `--workspaces` - Install all workspace dependencies
- `--include-workspace-root` - Include root workspace dependencies

**buildCommand:**
```bash
npm run build:vercel
```
This runs (from package.json):
```json
{
  "build:vercel": "npm run build --workspace=@rebuild/shared --if-present && ROLLUP_NO_NATIVE=1 npm run build --workspace=restaurant-os-client"
}
```
- Builds shared workspace first (dependency)
- Then builds client workspace
- `--if-present` prevents failure if shared has no build script
- `ROLLUP_NO_NATIVE=1` prevents native module issues

---

## 2. Workspace Build Order Commands

### Correct Build Script in package.json

```json
{
  "scripts": {
    "build:vercel": "npm run build --workspace=@rebuild/shared --if-present && ROLLUP_NO_NATIVE=1 npm run build --workspace=restaurant-os-client",
    "build:render": "cd server && npm run build",
    "build:full": "npm run build:vercel && npm run build:render"
  }
}
```

### Why This Order Matters

```
Dependency Graph:
shared/         ← Base, no dependencies
    ↓
client/         ← Depends on shared
    ↓
server/         ← Depends on shared
```

**Sequential Build (Correct):**
```bash
# Step 1: Build shared
npm run build --workspace=@rebuild/shared

# Step 2: Build client (now has access to compiled shared)
npm run build --workspace=restaurant-os-client

# Step 3: Build server (now has access to compiled shared)
npm run build --workspace=restaurant-os-server
```

**Parallel Build (WRONG - Race Condition):**
```bash
# All at once - client/server may try to import shared before it's compiled
npm run build --workspaces
```

---

## 3. Environment Variable Validation with Zod

### Server-Side Validation

```typescript
// server/src/config/env.schema.ts
import { z } from 'zod';

export const serverEnvSchema = z.object({
  // Required in all environments
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Required in production, optional in development
  OPENAI_API_KEY: z.string().min(1).optional(),
  KIOSK_JWT_SECRET: z.string().length(64).optional(),
  PIN_PEPPER: z.string().length(64).optional(),

  // Optional with defaults
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Multi-format support (UUID or slug)
  DEFAULT_RESTAURANT_ID: z.string().min(1),
});

export function validateServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    if (process.env.NODE_ENV === 'production') {
      // Strict in production
      console.error('Environment validation failed:', result.error.format());
      throw new Error('Invalid environment configuration');
    } else {
      // Warn in development
      console.warn('  Some environment variables missing (OK for development)');
      console.warn(result.error.format());
    }
  }

  return result.data;
}
```

### Client-Side Validation

```typescript
// client/src/config/env.schema.ts
import { z } from 'zod';

export const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_DEFAULT_RESTAURANT_ID: z.string().min(1),
  VITE_USE_REALTIME_VOICE: z.enum(['true', 'false']).default('false'),
  VITE_DEBUG_VOICE: z.enum(['true', 'false']).default('false'),
  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
});

export function validateClientEnv(mode: string, env: Record<string, string>) {
  if (mode === 'production' && !process.env.CI) {
    // Strict validation for production deployments
    const result = clientEnvSchema.safeParse(env);

    if (!result.success) {
      throw new Error(`Missing required environment variables: ${Object.keys(result.error.flatten().fieldErrors).join(', ')}`);
    }

    return result.data;
  } else if (mode === 'production' && process.env.CI) {
    // Lenient for CI
    console.warn('  CI environment detected - skipping strict env validation');
  }

  return clientEnvSchema.partial().parse(env);
}
```

### Usage in vite.config.ts

```typescript
import { validateClientEnv } from './src/config/env.schema';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  // Validate before building
  validateClientEnv(mode, env);

  return {
    // ... rest of config
  };
});
```

---

## 4. Memory Optimization Techniques

### Correct NODE_OPTIONS Usage

```json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=3072' concurrently --kill-others-on-fail \"npm run dev:server\" \"npm run dev:client\"",
    "build": "NODE_OPTIONS='--max-old-space-size=3072' npm run build:client",
    "test": "NODE_OPTIONS='--max-old-space-size=3072 --expose-gc' npm test"
  }
}
```

**Values:**
- `3072` = 3GB (current safe limit for development/build)
- `2048` = 2GB (intermediate goal)
- `1024` = 1GB (production target)

**Additional Flags:**
- `--expose-gc` - Enable manual garbage collection for tests
- `--inspect` - Enable debugging (for memory profiling)

### Vite Manual Chunks Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework (loaded first, cached longest)
          vendor: ['react', 'react-dom', 'react-router-dom'],
          
          // Large UI libraries (loaded on demand)
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
          
          // Feature modules (lazy loaded)
          voice: ['./src/modules/voice'],
          kds: ['./src/modules/kds'],
          payments: ['./src/modules/payments'],
        }
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500, // KB
  }
});
```

### Memory Leak Prevention Pattern

```typescript
// Correct pattern for intervals/timers
class MyService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  start() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Correct pattern for event listeners
class MyComponent {
  private handleResize = () => {
    // Handler logic
  };

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }
}
```

---

## 5. CI Environment Detection

### Environment Detection Utility

```typescript
// shared/utils/environment.ts
export function detectEnvironment() {
  const isCI = process.env.CI === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const isRender = !!process.env.RENDER;

  return {
    isCI,
    isProduction,
    isVercel,
    isPreview,
    isRender,
    isDevelopment: !isProduction,
    isLocalProduction: isProduction && !isCI && !isVercel && !isRender,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  };
}
```

### Using Environment Detection

```typescript
import { detectEnvironment } from 'shared/utils/environment';

const env = detectEnvironment();

if (env.isProduction && !env.isCI) {
  // Actual production deployment - strict validation
  validateStrictly();
} else if (env.isProduction && env.isCI) {
  // CI build - lenient validation
  console.warn('CI environment - using lenient validation');
} else {
  // Development - helpful warnings
  validateWithWarnings();
}
```

---

## 6. Render Deployment Configuration

### Correct package.json for Render

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "start:dev": "tsx src/server.ts",
    "build": "tsc -p tsconfig.build.json"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@types/express": "^4.17.21",
    "@types/node": "^20.19.10",
    "@types/jsonwebtoken": "^9.0.6",
    "typescript": "^5.3.3"
  }
}
```

**Key Points:**
- `start` uses compiled JavaScript (not tsx)
- @types packages in dependencies (needed for compilation)
- TypeScript in dependencies (Render compiles in production)

### Render Dashboard Configuration

**Build Command:**
```bash
npm install && npm run build:render
```

**Start Command:**
```bash
npm run -w server start
```

**Environment Variables (27 required):**
```
OPENAI_API_KEY=[from OpenAI dashboard]
KIOSK_JWT_SECRET=[64-char hex]
PIN_PEPPER=[64-char hex]
DEVICE_FINGERPRINT_SALT=[64-char hex]
STATION_TOKEN_SECRET=[64-char hex]
WEBHOOK_SECRET=[64-char hex]
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_SERVICE_KEY=[from Supabase]
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
FRONTEND_URL=https://july25-client.vercel.app
ALLOWED_ORIGINS=https://july25-client.vercel.app,http://localhost:5173
```

---

## 7. Automated Validation

### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

echo " Running pre-commit checks..."

# Environment validation
echo "Validating environment configuration..."
npm run env:validate || exit 1

# Documentation drift check
echo "Checking for documentation drift..."
npm run docs:drift || echo "  Documentation drift detected"

# Type checking (quick)
echo "Running type check..."
npm run typecheck:quick || exit 1

# No console.log
echo "Checking for console statements..."
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -n 'console\.log' > /dev/null; then
  echo " Found console.log statements. Please remove or use logger."
  git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -n 'console\.log'
  exit 1
fi

echo " Pre-commit checks passed!"
```

### CI Workflow for Environment Validation

```yaml
# .github/workflows/env-validation.yml
name: Environment Variable Validation

on:
  push:
    paths:
      - '.env.example'
      - 'client/.env.example'
      - 'server/.env.example'
      - '**/env.schema.ts'
  pull_request:
    paths:
      - '.env.example'
      - 'client/.env.example'
      - 'server/.env.example'
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --production=false

      - name: Validate environment configuration
        run: node scripts/validate-env.cjs

      - name: Check for drift
        run: npm run docs:drift

      - name: Test environment schemas
        run: npm test -- env.schema.test.ts
```

### Validation Script

```javascript
// scripts/validate-env.cjs
const fs = require('fs');
const path = require('path');

function validateEnvFile(filePath, requiredPrefix = '') {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const vars = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');

    if (requiredPrefix && !key.startsWith(requiredPrefix)) {
      console.error(` ${filePath}: Variable ${key} should start with ${requiredPrefix}`);
      process.exit(1);
    }

    vars[key] = value;
  }

  return vars;
}

// Validate client env vars
console.log('Validating client/.env.example...');
const clientVars = validateEnvFile('client/.env.example', 'VITE_');

// Validate server env vars
console.log('Validating server/.env.example...');
const serverVars = validateEnvFile('server/.env.example');

// Check for hardcoded secrets
console.log('Checking for hardcoded secrets...');
for (const [key, value] of Object.entries({...clientVars, ...serverVars})) {
  if (key.includes('SECRET') || key.includes('KEY')) {
    if (value && value !== 'your-secret-here' && value.length > 20) {
      console.error(` ${key} appears to have a real secret value in .env.example`);
      process.exit(1);
    }
  }
}

console.log(' Environment validation passed!');
```

---

## 8. Testing Production Builds Locally

### Local Production Build Test

```bash
# Test client production build
cd client
npm run build
npx serve -s dist -p 5173

# Test in browser
open http://localhost:5173

# Test server production build
cd server
npm run build
node dist/server.js

# Test API
curl http://localhost:3001/api/v1/health
```

### Production Build Environment Variables

Create `.env.production.local` (gitignored):
```bash
# Client
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_USE_REALTIME_VOICE=true

# Server
OPENAI_API_KEY=your-openai-key
KIOSK_JWT_SECRET=your-64-char-hex
SUPABASE_SERVICE_KEY=your-service-key
```

---

## 9. Deployment Rollback Steps

### Vercel Rollback

**Via Dashboard:**
1. Visit https://vercel.com/your-team/july25-client/deployments
2. Find last known good deployment
3. Click "..." menu → "Promote to Production"
4. Confirm promotion

**Via CLI:**
```bash
vercel rollback [deployment-url]
```

### Render Rollback

**Via Dashboard:**
1. Visit https://dashboard.render.com/web/your-service
2. Go to "Events" tab
3. Find last successful deploy
4. Click "Rollback to this deploy"

**Via Manual Deploy:**
```bash
# Revert git commit locally
git revert HEAD
git push origin main

# Render auto-deploys from main branch
```

### Emergency Hotfix Process

```bash
# 1. Create hotfix branch from last known good commit
git checkout -b hotfix/emergency-fix [last-good-commit]

# 2. Apply minimal fix
# ... edit files ...

# 3. Test locally
npm run build
npm test

# 4. Commit and push
git commit -m "hotfix: critical production issue"
git push origin hotfix/emergency-fix

# 5. Deploy directly (bypass PR if needed)
vercel --prod  # For client
# Or merge to main for Render auto-deploy
```

---

## 10. Monitoring and Alerts

### Health Check Endpoints

```typescript
// server/src/routes/health.ts
import express from 'express';

export const healthRoutes = express.Router();

healthRoutes.get('/health', (req: express.Request, res: express.Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    environment: process.env.NODE_ENV,
  };

  res.json(health);
});

healthRoutes.get('/health/ready', async (req: express.Request, res: express.Response) => {
  // Check dependencies
  try {
    await checkDatabaseConnection();
    await checkOpenAIConnection();

    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});
```

### Uptime Monitoring

**Render:**
1. Go to Dashboard → Your Service → Settings
2. Enable "Health Check Path": `/api/v1/health`
3. Set check interval: 30 seconds

**External (Recommended):**
- UptimeRobot: https://uptimerobot.com/
- Better Uptime: https://betteruptime.com/
- Pingdom: https://www.pingdom.com/

### Error Alerting

```typescript
// server/src/middleware/errorHandler.ts
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Sentry, Rollbar, etc.
  }

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id,
  });
}
```

---

## Summary: Prevention Checklist

### Before Every Deployment

- [ ] Environment variables validated with Zod
- [ ] Production build tested locally
- [ ] Memory usage checked (`ps aux | grep node`)
- [ ] No console.log statements
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Rollback plan ready

### Configuration Files to Verify

- [ ] `vercel.json` - installCommand has `--production=false`
- [ ] `package.json` - build:vercel script correct order
- [ ] `.env.example` - all variables documented
- [ ] `env.schema.ts` - validation matches .env.example

### CI/CD Checks to Have

- [ ] Environment validation workflow
- [ ] Pre-commit hooks for validation
- [ ] Weekly drift detection
- [ ] Memory leak tests
- [ ] Production build tests

---

**Document Version:** 1.0.0
**Last Updated:** November 19, 2025
**Status:** Active
