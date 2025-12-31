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

## Current Status (2025-12)

- **Security audit:** Complete (see `docs/archive/2025-12/security-audit/`)
- **Security score:** ~70/100 (up from 55/100)
- **P0 issues:** 0 (all resolved)
- **P1 issues:** 2 remaining (in-memory rate limiting, PIN race condition)
- **Active plan:** `plans/security-remediation-v2.md`
- **Next milestone:** P1 security hardening (optional for launch)

### Security Fixes Completed (2025-12-29)
| Issue | Severity | Fix |
|-------|----------|-----|
| Demo User Bypass | P0 | Gated behind `DEMO_MODE` env var |
| localStorage Token Exposure | P0 | HTTPOnly cookies for auth |
| Weak Secret Fallbacks | P0 | Fail-fast (no defaults) |
| Refund Idempotency | P0 | Idempotency key on all Stripe refunds |
| STRICT_AUTH Not Mandatory | P1 | Defaults to `true` |
| PIN Timing Attack | P1 | Timing-safe comparison |
| Webhook Replay | P1 | Timestamp verification |
| CSRF Protection | - | Added X-CSRF-Token validation |

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

### Quick Links (Most Used)

| Problem | Solution |
|---------|----------|
| Auth token issues | `docs/solutions/auth-issues/websocket-station-auth-dual-pattern.md` |
| Cross-origin auth failure | `docs/solutions/auth-issues/cross-origin-samesite-cookie-auth-failure.md` |
| STRICT_AUTH drift | `docs/solutions/auth-issues/strict-auth-environment-drift.md` |
| Multi-tenant isolation | `docs/solutions/security-issues/multi-tenant-isolation-rls-cache.md` |
| Demo bypass prevention | `docs/solutions/security-issues/demo-bypass-prevention.md` |
| Memory leaks | `docs/solutions/performance-issues/interval-memory-leaks.md` |
| Build failures | `docs/solutions/build-errors/` |
| Test failures | `docs/solutions/test-failures/` |
| Schema drift | `docs/solutions/database-issues/migration-bifurcation-schema-drift.md` |

### ADR Quick Links

| Decision | ADR |
|----------|-----|
| Snake case everywhere | `docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md` |
| Multi-tenant isolation | `docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md` |
| Dual auth pattern | `docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md` |
| Fail-fast philosophy | `docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md` |
| Remote DB truth | `docs/explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md` |
| CommonJS required | `docs/explanation/architecture-decisions/ADR-016-module-system-commonjs.md` |

## Compound Engineering

### The Learning Loop

Every non-trivial fix **MUST** compound:
1. Fix the problem
2. Document in `docs/solutions/{category}/`
3. If recurring, add to CLAUDE.md Quick Links
4. If architectural, create or update ADR

**Signs you should compound:**
- Debugging took >15 min
- Solution wasn't obvious
- You'd want to find this later
- It affects security or payments

### Mandatory Reviews

After writing significant code:

| Code Type | Invoke Agent |
|-----------|--------------|
| Auth/security | `security-sentinel` |
| Database queries | `performance-oracle` |
| State management | `architecture-strategist` |
| Any significant change | `code-simplicity-reviewer` |

## Prevention Patterns

### Security (CRITICAL)

| Pattern | Rule | Violation Example |
|---------|------|-------------------|
| No fallback secrets | `const x = process.env.X` (crash if missing) | `process.env.X \|\| 'default'` |
| HTTPOnly cookies | Sensitive tokens in cookies | `localStorage.setItem('token')` |
| CSRF protection | All POST/PUT/DELETE need CSRF | Missing X-CSRF-Token header |
| Timing-safe auth | Always compare against hash | Early return on user not found |

### Multi-Tenancy (CRITICAL)

| Pattern | Rule | Violation Example |
|---------|------|-------------------|
| Explicit tenant filter | Every query includes restaurant_id | `SELECT * FROM orders` |
| RLS enforcement | All tables have RLS policies | New table without RLS |
| Context validation | Middleware validates restaurant_id | Direct database access |

### Payments (CRITICAL)

| Pattern | Rule | Violation Example |
|---------|------|-------------------|
| Server-side totals | Never trust client amounts | Using client-sent total |
| Idempotency keys | All Stripe calls have keys | Missing idempotency on refund |
| Two-phase logging | Log before AND after | Only logging success |

## Debugging Quick Reference

### Auth Issues
1. Check localStorage for `token` / `demo_token`
2. Check cookie for `auth_token` (won't show in console if HTTPOnly)
3. Check Supabase session: `supabase.auth.getSession()`
4. Check server logs for auth middleware

### Payment Issues
1. Check Stripe Dashboard for payment intent status
2. Check server logs for idempotency key
3. Check `payment_intents` table for local record
4. Verify webhook received: check `stripe_events` table

### State Issues
1. Check current order status in database
2. Verify transition is valid (see Order Status Flow)
3. Check for race conditions in concurrent updates

## Compound Engineering Protocol

### After Every Non-Trivial Fix

1. **Immediate**: Run `/workflows:compound` if debugging took >15 min
2. **Check**: Does CLAUDE.md Quick Links need update?
3. **Check**: Does this need an ADR?

### Signs You Must Compound

- [ ] Debugging took >15 minutes
- [ ] Solution wasn't obvious
- [ ] You'd want to find this later
- [ ] It affects security or payments
- [ ] You created a workaround

### Review Triggers (Proactive)

After writing:
- Auth/security code → invoke `security-sentinel`
- Database queries → invoke `performance-oracle`
- State management → invoke `architecture-strategist`
- Any significant change → invoke `code-simplicity-reviewer`

## Known Considerations

### In-Memory Rate Limiting (MenuEmbeddingService)
The `MenuEmbeddingService` uses an in-memory Map for rate limiting embedding generation requests. This has the following implications:
- **Resets on server restart**: Rate limit counters are cleared when the server restarts
- **Not distributed**: Multiple server instances do not share rate limit state
- **Acceptable for single-instance deployment**: Current Render deployment runs a single instance

For horizontal scaling, consider migrating to Redis-backed rate limiting (see TODO-231).
