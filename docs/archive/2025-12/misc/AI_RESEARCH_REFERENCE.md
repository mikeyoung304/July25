# AI Deep Research Reference Guide

**Purpose**: Enable external AI agents to identify blind spots, refactor opportunities, and technical debt in the Restaurant OS codebase.

**Version**: 6.0.14 | **Tests**: 430/431 passing (99.8%) | **Date**: 2025-11-29

---

## What You're Analyzing

**Restaurant OS** - A multi-tenant SaaS platform for restaurant operations:
- Online ordering (kiosk, web, voice)
- Kitchen Display System (KDS)
- Point of Sale
- Payment processing (Stripe)
- Real-time order tracking (WebSocket)

**Scale**: ~63,000 lines TypeScript across client/server/shared monorepo

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (React 18 + Vite)         Port 5173                 │
│  - React Router for navigation                              │
│  - Tailwind CSS for styling                                 │
│  - httpClient for ALL API calls (single entry point)        │
│  - Supabase JS for auth                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVER (Express + TypeScript)    Port 3001                 │
│  - JWT authentication middleware                            │
│  - RBAC permission system                                   │
│  - Supabase client for database                             │
│  - WebSocket for real-time updates                          │
│  - OpenAI for voice transcription                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DATABASE (Supabase/PostgreSQL)                             │
│  - Row Level Security (RLS) for tenant isolation            │
│  - All tables scoped by restaurant_id                       │
│  - Realtime subscriptions enabled                           │
└─────────────────────────────────────────────────────────────┘
```

### Directory Map

| Path | Purpose | Complexity |
|------|---------|------------|
| `client/src/components/` | UI components | High - many files |
| `client/src/services/http/httpClient.ts` | Single API client | Critical path |
| `client/src/contexts/` | React state (Auth, Cart, Restaurant) | Medium |
| `server/src/api/routes/` | REST endpoints | Medium |
| `server/src/middleware/` | Auth, RBAC, validation | Critical |
| `server/src/services/` | Business logic | High complexity |
| `server/src/ai/` | Voice/AI features | Over-engineered (127 files) |
| `shared/types/` | TypeScript definitions | Source of truth |

---

## Critical Constraints (Do Not Violate)

### 1. Multi-Tenancy
Every database query MUST filter by `restaurant_id`. This is enforced at three layers but application layer is where bugs happen.

**Where to look for violations**: Any file with `supabase.from()` calls that might be missing `.eq('restaurant_id', ...)`.

### 2. Snake Case Convention
ALL data uses `snake_case` - database, API, client state. No transformations between layers.

**Where to look for violations**: Search for camelCase in API payloads or type definitions.

### 3. CommonJS Module System
The `shared/` package MUST remain CommonJS. Adding `"type": "module"` breaks Render deployments.

### 4. Memory Limits
- Development: 3GB max
- Production target: 1GB
- Watch for: Uncleared intervals, large state accumulation, memory leaks in WebSocket handlers

---

## Known Technical Debt

### High Priority (Find More Like These)

| Issue | Location | Impact |
|-------|----------|--------|
| 161 `any` types | Throughout codebase | Type safety gaps |
| Over-engineered voice stack | `server/src/ai/` (127 files) | Bundle bloat, maintenance burden |
| Inconsistent error boundaries | `client/src/pages/` | User sees white screen on errors |
| Some N+1 queries | Order listing endpoints | Performance on large datasets |
| Test coverage ~60% | Gaps in integration tests | Regression risk |

### Medium Priority

| Issue | Location | Impact |
|-------|----------|--------|
| Duplicate utility functions | `client/src/utils/`, `server/src/utils/` | Code duplication |
| Inconsistent loading states | Various pages | Poor UX during fetches |
| CORS wildcard | Server config | Security (accepts `*.vercel.app`) |
| Some components missing memoization | Kitchen display components | Unnecessary re-renders |

---

## Areas to Investigate

### 1. Performance Bottlenecks

**Client Bundle**
- Current: ~800KB, Target: <500KB
- Voice/AI modules loaded eagerly - candidate for lazy loading
- Check `client/vite.config.ts` for code splitting opportunities

**Database Queries**
- Look for missing indexes on frequently-queried columns
- Check for N+1 patterns in order listing with items
- Examine queries in `server/src/services/OrdersService.ts`

**React Performance**
- Kitchen display re-renders on every WebSocket message
- Large lists without virtualization
- Check `client/src/components/kitchen/` for optimization opportunities

### 2. Security Audit Points

**Authentication**
- Dual auth system (Supabase + localStorage) - intentional but complex
- Check `server/src/middleware/auth.ts` for edge cases
- PIN authentication tokens in localStorage (XSS risk in hostile environments)

**Input Validation**
- Check all routes in `server/src/api/routes/` for Zod schema coverage
- Look for raw user input reaching database queries

**RLS Coverage**
- Verify all tenant tables have RLS policies
- Check `supabase/migrations/` for policy definitions

### 3. Code Quality Opportunities

**Type Safety**
- Search for `any` type usage
- Look for type assertions (`as SomeType`) that might hide bugs
- Check API response types match actual server responses

**Error Handling**
- Look for swallowed errors (empty catch blocks)
- Check async functions for proper error propagation
- Verify user-facing error messages are helpful

**Testing Gaps**
- E2E coverage for critical paths (checkout, KDS flow)
- Integration tests for WebSocket events
- Edge cases in order status transitions

### 4. Architecture Smells

**Over-Engineering**
- `server/src/ai/` has 127 files for voice feature - could be simplified
- Multiple abstraction layers that add complexity without clear benefit
- Check for premature abstractions

**Under-Engineering**
- Some business logic in React components instead of services
- Direct Supabase calls scattered instead of through service layer
- Missing repository pattern in some areas

**Coupling Issues**
- Components that know too much about data fetching
- Services with mixed responsibilities
- Check for circular dependencies

---

## Key Files to Examine

### Critical Path (Bugs Here = Outage)

| File | Why Critical |
|------|--------------|
| `client/src/services/http/httpClient.ts` | All API calls go through here |
| `server/src/middleware/auth.ts` | Authentication for all requests |
| `server/src/middleware/rbac.ts` | Permission checks |
| `server/src/services/OrdersService.ts` | Core business logic |
| `shared/types/order.types.ts` | Order type definitions |

### High Churn (Frequent Changes = Bug Risk)

| File | Risk Factor |
|------|-------------|
| `client/src/pages/KitchenDisplay.tsx` | Complex state, real-time updates |
| `client/src/contexts/AuthContext.tsx` | Dual auth complexity |
| `server/src/api/routes/orders.ts` | Many edge cases |
| `server/src/utils/websocket.ts` | Connection management |

### Complexity Hotspots

| File | Cyclomatic Complexity |
|------|----------------------|
| `server/src/ai/voice/` | High - multiple adapters |
| `client/src/components/orders/` | Medium-High |
| `server/src/services/PaymentService.ts` | Medium - Stripe integration |

---

## Database Schema (Key Tables)

| Table | Purpose | Watch For |
|-------|---------|-----------|
| `orders` | Customer orders | Items stored as JSONB - schema drift risk |
| `menu_items` | Menu products | Price as NUMERIC - precision issues |
| `restaurants` | Tenant root | Settings as JSONB - validation gaps |
| `user_restaurants` | User-tenant mapping | Role field - ensure valid values |
| `order_status_history` | Audit trail | Ensure all transitions logged |

**Order Status Flow** (must be enforced):
```
new → pending → confirmed → preparing → ready → picked-up → completed
                    ↓
                cancelled
```

---

## Past Incidents (Learn From These)

| ID | Category | What Happened | Root Cause |
|----|----------|---------------|------------|
| CL-AUTH-001 | Auth | Login loops | STRICT_AUTH env drift |
| CL-AUTH-002 | Auth | KDS 401 errors | Missing dual-auth check |
| CL-DB-001 | Database | Column not found | Migration not synced to Prisma |
| CL-WS-001 | WebSocket | No transcription | Handler registered after connection |
| CL-MEM-001 | Memory | Server OOM | setInterval without cleanup |
| CL-API-001 | External | Voice stopped working | OpenAI model deprecated silently |
| CL-TEST-001 | Testing | Tests pass, prod fails | Mock drift from interfaces |

Full details: `.claude/lessons/README.md`

---

## What Good Looks Like Here

**Service Pattern**
```
server/src/services/OrdersService.ts
- Single responsibility
- All methods take restaurant_id first
- Proper error handling with typed errors
- Clear separation from route handlers
```

**Component Pattern**
```
client/src/components/ui/
- Small, focused components
- Props properly typed
- No business logic
- Composable
```

**Type Pattern**
```
shared/types/order.types.ts
- Single source of truth
- Exported and used everywhere
- Snake_case field names
- Discriminated unions for status
```

---

## Reporting Format

When you find issues, please structure findings as:

```
## [Category]: [Brief Title]

**Severity**: Critical | High | Medium | Low
**Location**: file/path.ts:line_number
**Current Behavior**: What happens now
**Problem**: Why this is an issue
**Suggested Fix**: Specific recommendation
**Effort Estimate**: Small | Medium | Large
```

### Categories to Use
- **Security**: Auth, validation, injection, data exposure
- **Performance**: Speed, memory, bundle size, queries
- **Reliability**: Error handling, edge cases, race conditions
- **Maintainability**: Code quality, duplication, complexity
- **Architecture**: Design patterns, coupling, separation
- **Testing**: Coverage gaps, flaky tests, missing scenarios

---

## Questions to Answer

1. **Where are we most likely to have a production incident?**
2. **What's the biggest refactor opportunity for code health?**
3. **Where is performance being left on the table?**
4. **What security issues need immediate attention?**
5. **What patterns should we establish/enforce going forward?**

---

## Quick Reference

**Test Commands**: `npm test` | `npm run test:client` | `npm run test:server`
**Type Check**: `npm run typecheck`
**Dev Server**: `npm run dev` (starts both client:5173 and server:3001)

**Test Restaurant IDs** (for multi-tenant testing):
- `11111111-1111-1111-1111-111111111111`
- `22222222-2222-2222-2222-222222222222`

**Demo Credentials**: `{role}@restaurant.com` / `Demo123!`
(Roles: Manager, Server, Kitchen, Expo)
