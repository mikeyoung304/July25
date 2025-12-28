# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Architecture

### Monorepo Structure
```
rebuild-6.0/
├── client/           # React 18.3.1 + Vite frontend (port 5173)
├── server/           # Express + TypeScript backend (port 3001)
├── shared/           # Shared types and utilities
└── supabase/         # Database migrations (remote-first)
```

## Critical Architectural Decisions

### 1. Snake Case Convention (ADR-001)
**ALL layers use snake_case** - database, API, and client. No transformations.
```typescript
// ✅ CORRECT everywhere
{ customer_name: "John", total_amount: 29.99 }

// ❌ NEVER use camelCase
{ customerName: "John", totalAmount: 29.99 }
```

### 2. Dual Authentication Pattern (ADR-006)
The `httpClient` checks BOTH Supabase and localStorage for tokens:
1. **Supabase Auth** (primary): Production users with email
2. **localStorage JWT** (fallback): Demo users, PIN auth, station auth (KDS)

This is intentional to support shared devices and demo mode.

### 3. Remote-First Database (ADR-010)
The remote Supabase database is the single source of truth:
- Migrations document history, not current state
- Prisma schema is GENERATED from remote via `npx prisma db pull`
- Never modify Prisma schema manually

### 4. Multi-Tenancy
**EVERY database operation must include restaurant_id.** Enforced at all layers:
- Database: RLS policies
- API: Middleware validation
- Client: Context providers

Test restaurant IDs: `11111111-1111-1111-1111-111111111111`, `22222222-2222-2222-2222-222222222222`

## Enforced Patterns

### Memory Constraints
```javascript
Development/Tests: 4GB (NODE_OPTIONS='--max-old-space-size=4096 --expose-gc')
Production: Target 1GB
```

### API Client
```typescript
import { httpClient } from '@/services/http/httpClient';
// Never create new API clients or use fetch directly
```

### Type System
```typescript
import { Order, Table, User } from '@rebuild/shared/types';
// Never define types locally in components
```

### Module System (Critical)
The codebase uses **CommonJS** for Node.js compatibility:
- **DO NOT** add `"type": "module"` to shared/package.json - breaks Render deployments

### Logging
```typescript
import { logger } from '@/services/logger';  // client
import { logger } from '../utils/logger';    // server
// Never use console.log - enforced by pre-commit hook
```

## Order Status Flow
All 8 states must be handled (see `shared/types/order.types.ts`):
```
new → pending → confirmed → preparing → ready → picked-up → completed
                ↓
             cancelled
```

## Environment Variables
Critical:
- `KIOSK_JWT_SECRET` - Required, no fallback
- `SUPABASE_SERVICE_KEY` - Server-side only
- `OPENAI_API_KEY` - Server-side only
- `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

Optional (Semantic Search):
- `ENABLE_SEMANTIC_SEARCH` - Enable vector similarity search (default: false)
- `OPENAI_EMBEDDING_MODEL` - Embedding model (default: text-embedding-3-small)
- `OPENAI_EMBEDDING_DIMENSIONS` - Vector dimensions (default: 1536)

## Test Debugging

See [.github/TEST_DEBUGGING.md](.github/TEST_DEBUGGING.md).

- Demo creds: `{role}@restaurant.com` / `Demo123!`
- Roles: Manager, Server, Kitchen, Expo
- E2E requires: `npm run dev:e2e`

## Plugins & Workflows

See `~/.claude/PLUGIN_INDEX.md` for all available agents, commands, and skills.

**Key commands:** `/workflows:plan`, `/workflows:work`, `/workflows:review`, `/workflows:compound`

## Solution Documentation

Past incidents and fixes are documented in `docs/solutions/` by category:
- `auth-issues/` - Authentication patterns
- `security-issues/` - Security vulnerabilities
- `build-errors/` - Build and deployment fixes
- `database-issues/` - Migration and schema drift
- `performance-issues/` - Memory leaks, race conditions
- `test-failures/` - Test infrastructure fixes
- `integration-issues/` - External API issues

Search with: `grep -r "symptom" docs/solutions/`

## Known Considerations

### In-Memory Rate Limiting (MenuEmbeddingService)
The `MenuEmbeddingService` uses an in-memory Map for rate limiting embedding generation requests. This has the following implications:
- **Resets on server restart**: Rate limit counters are cleared when the server restarts
- **Not distributed**: Multiple server instances do not share rate limit state
- **Acceptable for single-instance deployment**: Current Render deployment runs a single instance

For horizontal scaling, consider migrating to Redis-backed rate limiting (see TODO-231).
