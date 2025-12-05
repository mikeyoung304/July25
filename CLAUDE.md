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
python3 scripts/validate_links.py  # Check documentation links (90.4% health)
```

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
// Client-side (uses @/ path alias)
import { httpClient } from '@/services/http/httpClient';
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
// Client-side
import { logger } from '@/services/logger';

// Server-side
import { logger } from '../utils/logger';

logger.info('Message', { data });
// Never use console.log - enforced by pre-commit hook
```

## Current Status (v6.0.17)

- **Production Readiness**: 99%
- **Test Pass Rate**: 99.8% (430/431 tests passing)
- **Payment System**: Stripe (migrated from Square)
- **Fall Menu**: Deployed and operational

### Recent Improvements
- Stripe payment integration (migrated from Square)
- Fall menu deployed
- Voice ordering with gpt-4o-transcribe model
- Slug-based restaurant routing (e.g., /order/grow)
- Complete documentation suite updated

### Known Considerations
- localStorage for auth tokens is intentional for shared devices
- CSRF disabled for REST APIs (using JWT + RBAC instead)
- Demo mode requires DEMO_LOGIN_ENABLED=true
- Voice ordering requires OpenAI Realtime API
- Payment processing uses Stripe (STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY)

## Order Status Flow
All 8 states must be handled (see `shared/types/order.types.ts`):
```
new → pending → confirmed → preparing → ready → picked-up → completed
                ↓
             cancelled
```

## Environment Variables
Critical for production:
- `KIOSK_JWT_SECRET` - Required, no fallback
- `SUPABASE_SERVICE_KEY` - Server-side only
- `OPENAI_API_KEY` - Server-side only (never expose to client)
- `STRIPE_SECRET_KEY` - Server-side payment processing (sk_test_... or sk_live_...)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Client-side Stripe Elements (pk_test_... or pk_live_...)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification (whsec_...)

## WebSocket Events
Real-time updates for orders and kitchen display. Connection pooling implemented for performance.

## Voice Ordering
Client-side WebRTC with OpenAI Realtime API. Menu context cached 5 minutes. Ephemeral tokens (60s expiry) for security.

## Test Debugging

For test failures and E2E debugging, see [.github/TEST_DEBUGGING.md](.github/TEST_DEBUGGING.md).

**Quick reference:**
- Demo creds: `{role}@restaurant.com` / `Demo123!`
- Available roles: Manager, Server, Kitchen, Expo
- E2E requires both servers: `npm run dev:e2e`

## Lessons Learned

Codified lessons from major incidents. Check before working on:
- **Auth code**: [CL-AUTH-001](.claude/lessons/CL-AUTH-001-strict-auth-drift.md) - STRICT_AUTH drift
- **Vercel deploy**: [CL-BUILD-001](.claude/lessons/CL-BUILD-001-vercel-production-flag.md) - devDeps issue
- **Shell scripts**: [CL-BUILD-003](.claude/lessons/CL-BUILD-003-xargs-empty-input.md) - BSD xargs false positive
- **Database changes**: [CL-DB-001](.claude/lessons/CL-DB-001-migration-sync.md) - migration sync
- **WebSocket/WebRTC**: [CL-WS-001](.claude/lessons/CL-WS-001-handler-timing-race.md) - timing race
- **setInterval usage**: [CL-MEM-001](.claude/lessons/CL-MEM-001-interval-leaks.md) - memory leaks
- **API integration**: [CL-API-001](.claude/lessons/CL-API-001-model-deprecation.md) - silent deprecation

Full index: [.claude/lessons/README.md](.claude/lessons/README.md)