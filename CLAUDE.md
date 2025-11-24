# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev                 # Start both client (5173) and server (3001) with 3GB memory limit
npm run dev:client         # Start client only
npm run dev:server         # Start server only
npm run dev:supabase       # Start with Supabase local DB
```

### Testing
```bash
npm test                   # Run all tests (client + server) with 3GB memory
npm run test:client        # Client tests only
npm run test:server        # Server tests only
npm run test:watch         # Watch mode for client tests
npm run test:e2e          # E2E tests with Playwright
npm run test:quick        # Quick test run with minimal output
npm run test:healthy      # Run only healthy (non-quarantined) tests
```

### Build & Deploy
```bash
npm run build             # Build server (Render deployment)
npm run build:client      # Build client with 3GB memory
npm run build:vercel      # Build for Vercel deployment
npm run deploy            # Deploy via Vercel script
```

### Database
```bash
npm run db:push           # Push migrations to Supabase
npm run db:status         # Check migration status
npm run db:seed           # Seed database with test data
npx prisma db pull        # Sync Prisma schema from remote DB
./scripts/post-migration-sync.sh  # Sync after migration
```

### Code Quality
```bash
npm run typecheck         # Type check all workspaces
npm run typecheck:quick   # Quick type check (pre-commit)
npm run lint              # Lint configuration files
npm run memory:check      # Check Node/Vite memory usage
```

### Documentation & Health
```bash
npm run health            # System health check
npm run docs:drift        # Check for documentation drift
npm run docs:validate     # Validate documentation
python3 scripts/validate_links.py  # Check documentation links (97.4% health)
```

### Claude Lessons v4 (Debugging Aid)
The repository has a comprehensive lessons system with 600+ hours of debugging knowledge:
- **Quick error lookup**: Search `claude-lessons3/SYMPTOM_INDEX.md` by error message (85% faster than category browsing)
- **Uncle Claude agent**: Invoke `@uncle-claude <problem>` for guided troubleshooting
- **Coverage**: 23 common errors mapped to solutions (401 auth, WebSocket timeout, hydration, env vars, etc.)
- **Example**: "401 Unauthorized" → direct link to CL-AUTH-001 (STRICT_AUTH environment drift)

## Architecture

### Monorepo Structure
```
rebuild-6.0/
├── client/           # React 18.3.1 + Vite frontend (port 5173)
├── server/           # Express + TypeScript backend (port 3001)
├── shared/           # Shared types and utilities
└── supabase/         # Database migrations (remote-first)
```

### Critical Architectural Decisions

#### 1. Snake Case Convention (ADR-001)
**ALL layers use snake_case** - database, API, and client. No transformations between layers.
```typescript
// ✅ CORRECT everywhere
{ customer_name: "John", total_amount: 29.99 }

// ❌ NEVER use camelCase
{ customerName: "John", totalAmount: 29.99 }
```

#### 2. Dual Authentication Pattern (ADR-006)
The `httpClient` checks BOTH Supabase and localStorage for tokens:
1. **Supabase Auth** (primary): Production users with email
2. **localStorage JWT** (fallback): Demo users, PIN auth, station auth (KDS)

This is intentional to support shared devices and demo mode.

#### 3. Remote-First Database (ADR-010)
The remote Supabase database is the single source of truth:
- Migrations document history, not current state
- Prisma schema is GENERATED from remote via `npx prisma db pull`
- Never modify Prisma schema manually

#### 4. Multi-Tenancy
**EVERY database operation must include restaurant_id**. This is enforced at all layers:
- Database: RLS policies
- API: Middleware validation
- Client: Context providers

Test with multiple restaurant IDs:
- `11111111-1111-1111-1111-111111111111`
- `22222222-2222-2222-2222-222222222222`

### Memory Constraints
```javascript
// Hard limits enforced by CI/CD
Development: 3GB (NODE_OPTIONS='--max-old-space-size=3072')
Production: Target 1GB
```

### API Client Rules
Only use the single unified HTTP client:
```typescript
import { httpClient } from 'services/http/httpClient';
// Never create new API clients or use fetch directly
```

### Type System
All types from shared workspace only:
```typescript
import { Order, Table, User } from 'shared/types';
// Never define types locally in components
```

### Module System (Critical)
The codebase uses **CommonJS** for Node.js compatibility:
- **Shared module**: Compiles to CommonJS (no `"type": "module"`)
- **Server**: Uses CommonJS (`require()` statements)
- **Client**: Vite handles both ESM and CommonJS
- **browser.ts exception**: Stays as TypeScript source (uses `import.meta`)

**DO NOT** add `"type": "module"` to shared/package.json - it breaks Render deployments.

### Logging
```typescript
import { logger } from 'utils/logger';
logger.info('Message', { data });
// Never use console.log - enforced by pre-commit hook
```

## Current Status (v6.0.14)

- **Production Readiness**: 90% (was 65%)
- **Test Pass Rate**: 85%+ (365+ passing, 2 quarantined)
- **Documentation Health**: 97.4% link health
- **API Documentation**: 95% accuracy (100% endpoint coverage)

### Recent Improvements
- Voice ordering fixed (whisper-1 → gpt-4o-transcribe model)
- 161 broken documentation links repaired
- Complete operational documentation (incident response, monitoring, rollback)
- CI/CD workflows for documentation validation

### Known Considerations
- localStorage for auth tokens is intentional for shared devices
- CSRF disabled for REST APIs (using JWT + RBAC instead)
- Demo mode requires DEMO_LOGIN_ENABLED=true
- Voice ordering requires OpenAI Realtime API

## Order Status Flow
All 7 states must be handled:
```
pending → confirmed → preparing → ready → served → completed
         ↓
      cancelled
```

## Environment Variables
Critical for production:
- `KIOSK_JWT_SECRET` - Required, no fallback
- `SUPABASE_SERVICE_KEY` - Server-side only
- `OPENAI_API_KEY` - Server-side only (never expose to client)

## WebSocket Events
Real-time updates for orders and kitchen display. Connection pooling implemented for performance.

## Voice Ordering
Client-side WebRTC with OpenAI Realtime API. Menu context cached 5 minutes. Ephemeral tokens (60s expiry) for security.

## Test Debugging Quick Reference

### Quick Diagnostics
```bash
# Check if both servers running for E2E tests
lsof -i :5173  # Vite frontend
lsof -i :3001  # Express backend

# Verify E2E infrastructure
npm run dev:e2e  # Should start BOTH servers

# Check test health
npm run test:server -- env-validation.test.ts  # Should be 14/14
npx playwright test tests/e2e/basic-routes.spec.ts --project=chromium  # Smoke test
```

### Common Gotchas (Symptom → Root Cause)

**"E2E tests timeout waiting for [data-testid='app-ready']"**
→ Performance marks ≠ DOM elements. App.tsx creates the marker AFTER splash screen (~6s delay).

**"WebSocket connection timeout on attempt 1"**
→ Backend not running. E2E needs BOTH servers: `npm run dev:e2e`

**"CI=true makes E2E tests fail"**
→ Fixed. Playwright now always starts servers via `dev:e2e` script.

**"Tests expect email input but can't find it"**
→ DevAuthOverlay uses Card components, not forms. Navigate to `/login` page.

**"expect().toThrow() fails with 'process.exit unexpectedly called'"**
→ Code must throw errors, not call process.exit(). See EnvValidationError pattern in server/src/config/env.ts

### E2E Login Flow (VITE_DEMO_PANEL=1)
```
/login page
  ↓ Click DevAuthOverlay Card (.min-h-[120px])
  ↓ Real Supabase auth (not mock)
/home page
  ↓ Click Workspace Card (.min-h-[200px])
/workspace (e.g., /server, /kitchen)
```

**Available roles**: Manager, Server, Kitchen, Expo (NOT cashier, owner)
**Demo creds**: `{role}@restaurant.com` / `Demo123!`

### E2E Server Requirements
- Frontend: Vite on port 5173
- Backend: Express on port 3001 (for WebSocket, API calls)
- Both auto-start via `npm run dev:e2e` in Playwright config
- CI environments: Servers start fresh every run (reuseExistingServer: false)