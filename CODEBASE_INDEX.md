# Rebuild 6.0 - Codebase Index & Navigation Guide

## Quick Start Navigation

This repository contains three complementary mapping documents:

1. **MONOREPO_STRUCTURE.md** - Exhaustive directory-by-directory breakdown with every major file listed
2. **SUBSYSTEM_MAP.txt** - Quick reference showing client/server implementations for each feature
3. **CODEBASE_INDEX.md** (this file) - Navigation guide and frequently needed paths

## Documentation Navigation

For comprehensive documentation, see:
- [index.md](/index.md) - Complete documentation index
- [docs/README.md](/docs/README.md) - Organized by Diátaxis framework

---

## Finding Things Quickly

### I need to add/modify...

#### Authentication
- **Client auth UI**: `/client/src/components/auth/`
- **Auth state**: `/client/src/contexts/AuthContext.tsx`, `RoleContext.tsx`
- **Server auth**: `/server/src/middleware/auth.ts`, `/server/src/routes/auth.routes.ts`
- **PIN/Station auth**: `/server/src/services/auth/pinAuth.ts`, `stationAuth.ts`

#### Orders & Checkout
- **Checkout page**: `/client/src/pages/CheckoutPage.tsx`
- **Order display**: `/client/src/modules/orders/components/`
- **Order API**: `/server/src/routes/orders.routes.ts`
- **Order logic**: `/server/src/services/orders.service.ts`
- **Order state machine**: `/server/src/services/orderStateMachine.ts`

#### Voice Ordering
- **Voice hooks**: `/client/src/modules/voice/hooks/`
- **Voice services**: `/client/src/modules/voice/services/`
- **WebRTC**: `/client/src/modules/voice/services/WebRTCVoiceClient.ts`
- **Server AI**: `/server/src/ai/` (core, adapters, functions)
- **Voice routes**: `/server/src/routes/ai.routes.ts`, `voice-config.routes.ts`

#### Kitchen Display (KDS)
- **Main KDS page**: `/client/src/pages/KitchenDisplayOptimized.tsx`
- **KDS components**: `/client/src/modules/kitchen/components/`
- **Real-time updates**: `/client/src/hooks/useKitchenOrdersRealtime.ts`
- **WebSocket handler**: `/server/src/routes/realtime.routes.ts`

#### Menu
- **Menu display**: `/client/src/modules/menu/`
- **Menu API**: `/server/src/routes/menu.routes.ts`
- **Fuzzy search**: `/client/src/utils/fuzzyMenuMatcher.ts`
- **Menu service**: `/server/src/services/menu.service.ts`

#### Payments
- **Payment UI**: `/client/src/components/payments/`
- **Payment routes**: `/server/src/routes/payments.routes.ts`, `terminal.routes.ts`
- **Payment service**: `/server/src/services/payment.service.ts`
- **Webhooks**: `/server/src/routes/webhook.routes.ts`

#### Tables & Floor Plan
- **Floor plan UI**: `/client/src/modules/floor-plan/components/`
- **Floor plan hooks**: `/client/src/modules/floor-plan/hooks/`
- **Server view**: `/client/src/pages/ServerView.tsx`
- **Table API**: `/server/src/routes/tables.routes.ts`
- **Table service**: `/server/src/services/table.service.ts`

#### WebSocket / Real-time
- **Client WebSocket**: `/client/src/services/websocket/`
- **Order subscriptions**: `/client/src/services/realtime/orderSubscription.ts`
- **Server WebSocket**: `/server/src/routes/realtime.routes.ts`
- **Connection pooling**: `/shared/utils/websocket-pool.ts`

#### HTTP/API Client
- **Unified HTTP client**: `/client/src/services/http/httpClient.ts` (MUST use this)
- **Request batching**: `/client/src/services/http/RequestBatcher.ts`
- **Never**: Use fetch() directly

#### Types & Contracts
- **All types**: `/shared/types/` (order, menu, api, etc.)
- **Contracts**: `/shared/contracts/` (order.ts, payment.ts)
- **Validations**: `/server/src/validation/` + `/client/src/utils/validation.ts`

---

## By Feature/Subsystem

### Authentication System
**Files**: `/client/src/contexts/`, `/client/src/components/auth/`, `/server/src/middleware/auth.ts`

Key Implementation Points:
- Dual auth: Supabase (primary) + localStorage JWT (fallback)
- Roles enforced via RoleContext + RBAC middleware
- Restaurant isolation via RLS policies + restaurantAccess middleware

### Orders Subsystem
**Files**: `/client/src/modules/orders/`, `/server/src/routes/orders.routes.ts`, `/server/src/services/`

State Machine Flow:
```
pending → confirmed → preparing → ready → served → completed
         ↓
      cancelled
```

Key Components:
- OrderCard, VirtualizedOrderList for UI
- useOrderData, useOrderActions, useOrderSubscription for state
- OrderService for API calls
- OrderStateMachine for business logic

### Kitchen Display System (KDS)
**Files**: `/client/src/modules/kitchen/`, `/client/src/pages/KitchenDisplayOptimized.tsx`

Performance Optimizations:
- Virtual scrolling via VirtualizedOrderGrid
- Touch-optimized components for tablets
- Real-time updates via WebSocket
- Connection status monitoring

### Voice Ordering
**Files**: `/client/src/modules/voice/`, `/server/src/ai/`

Architecture:
- Client: WebRTC client with OpenAI Realtime API
- Server: AI core (chat, transcriber, TTS, order-NLP)
- Adapters: OpenAI implementations
- State management: VoiceStateMachine
- Checkout integration: VoiceCheckoutOrchestrator

### Menu System
**Files**: `/client/src/modules/menu/`, `/server/src/services/menu.service.ts`

Features:
- Fuzzy search matching (fuzzyMenuMatcher.ts)
- 5-minute response caching
- Menu ID mapping for consistency
- DTO transformation via menu.mapper.ts

---

## Test File Locations

### Client Tests (collocated)
```
/client/src/
├── contexts/__tests__/AuthContext.test.tsx
├── components/auth/__tests__/WorkspaceAuthModal.test.tsx
├── components/shared/__tests__/ErrorBoundary.test.tsx
├── components/shared/controls/SoundControl.test.tsx
├── components/shared/timers/ElapsedTimer.test.tsx
├── hooks/__tests__/useAsyncState.test.ts
├── modules/voice/services/__tests__/*.test.ts
├── modules/orders/components/__tests__/OrderCard.test.tsx
├── modules/kitchen/components/__tests__/KDSOrderCard.test.tsx
├── modules/floor-plan/components/__tests__/chip-monkey.test.tsx
├── services/**/__tests__/*.test.ts
├── utils/__tests__/fuzzyMenuMatcher.test.ts
└── pages/__tests__/CheckoutPage.demo.test.tsx
```

### Server Tests
```
/server/src/
├── middleware/__tests__/auth.test.ts
├── middleware/__tests__/restaurantAccess.test.ts
├── routes/__tests__/orders.rctx.test.ts
├── ai/functions/realtime-menu-tools.test.ts
└── ai/functions/tests/realtime-menu-tools.spec.ts

/server/tests/
├── config/env-validation.test.ts
├── security/*.test.ts (9 files)
├── contracts/*.test.ts (3 files)
├── services/*.test.ts
└── (other integration tests)
```

### E2E Tests (Playwright)
```
/tests/
├── e2e/auth/*.spec.ts (login tests)
├── e2e/checkout-*.spec.ts (payment flows)
├── e2e/*-kds-*.spec.ts (kitchen tests)
├── e2e/voice-*.spec.ts (voice ordering)
├── e2e/production-*.spec.ts (full flows)
├── e2e/workspace-*.spec.ts (auth flows)
├── performance/*.spec.ts
├── a11y/accessibility.spec.ts
└── visual/homepage.spec.ts
```

---

## Running Tests

```bash
# All tests
npm test

# Client only
npm run test:client

# Server only
npm run test:server

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Specific test file
npm run test:server -- src/routes/__tests__/orders.rctx.test.ts

# Healthy tests only (skip quarantined)
npm run test:healthy
```

---

## Middleware Stack

**Request flows through (in order)**:

1. `security-headers.ts` - Sets security headers
2. `requestLogger.ts` - Logs incoming requests
3. `validation.ts` - Basic validation
4. `auth.ts` - JWT/Supabase authentication
5. `restaurantAccess.ts` - Restaurant ID isolation (RLS)
6. `rbac.ts` - Role-based access control
7. `rateLimiter.ts` - Rate limiting
8. `requestSanitizer.ts` - Input sanitization
9. `async routes...` - Route handlers
10. `errorHandler.ts` - Error catching
11. `responseTransform.ts` - Snake_case transformation

---

## Key Files to Know

### Architectural Decision Records
See: `/docs/` for ADRs

- ADR-001: Snake_case everywhere
- ADR-006: Dual authentication pattern
- ADR-010: Remote-first database

### Core Configuration
- `/client/src/config/env.schema.ts` - Client env vars
- `/server/src/config/env.schema.ts` - Server env vars
- `/shared/types/index.ts` - Type exports

### Debugging Tools
- `logger.ts` (client & server) - Use logger not console.log
- `/client/src/services/monitoring/` - Performance monitoring
- `/shared/utils/error-handling.ts` - Error utilities
- `/claude-lessons3/SYMPTOM_INDEX.md` - 600+ hours debugging knowledge

### Performance
- `/client/src/services/performance/performanceMonitor.ts`
- `/shared/utils/websocket-pool.ts` - Connection pooling
- `/client/src/utils/fuzzyMenuMatcher.ts` - Efficient search
- `/client/src/components/shared/lists/VirtualizedOrderList.tsx` - Virtual scrolling

---

## Critical Rules

### 1. Use snake_case EVERYWHERE
- Database: `customer_name`, `total_amount`
- API responses: `customer_id`, `order_status`
- Client code: `customer_name`, not `customerName`
- Enforced by `responseTransform.ts` middleware

### 2. MUST use unified HTTP client
```typescript
import { httpClient } from 'services/http/httpClient';
// Never:
fetch('/api/...')
axios.get('/api/...')
```

### 3. MUST include restaurant_id
Every database operation includes `restaurant_id`:
- Enforced at DB level (RLS policies)
- Validated in API (restaurantAccess middleware)
- Used in client context (RestaurantContext)

### 4. NO direct console.log
```typescript
// Use instead:
import { logger } from 'utils/logger';
logger.info('Message', { data });
```

### 5. Remote-first database
```bash
# DO THIS FIRST when starting work:
npx prisma db pull

# Never manually edit prisma/schema.prisma
```

---

## Database & Migrations

**Location**: `/supabase/migrations/` (history only)

**Process**:
1. Make changes in Supabase dashboard or migration
2. Run `npx prisma db pull` to sync schema
3. Commit updated `prisma/schema.prisma`
4. Use Prisma types everywhere

**Commands**:
```bash
npx prisma db pull        # Sync schema from remote
npm run db:push           # Push migrations
npm run db:seed           # Seed test data
npx prisma studio        # GUI browser for DB
```

---

## Common Patterns

### Adding an API Endpoint

1. Create route handler in `/server/src/routes/new.routes.ts`
2. Create service in `/server/src/services/new.service.ts`
3. Export from `/server/src/routes/index.ts`
4. Register in `/server/src/server.ts`
5. Call from client via `httpClient.get('/api/...')`

### Adding a Page

1. Create `/client/src/pages/NewPage.tsx`
2. Create route in routing config
3. Wrap with auth guards if needed: `withProtectedRoute`, `RoleGuard`
4. Use `PageLayout` for consistent layout

### Adding a Hook

1. Create `/client/src/hooks/useNewHook.ts`
2. Optional: Add test `/client/src/hooks/__tests__/useNewHook.test.ts`
3. Export from `/client/src/hooks/index.ts` if it's shared
4. Use in components

### Adding a Type

1. Create in `/shared/types/new.types.ts`
2. Export from `/shared/types/index.ts`
3. Use in client + server

### Adding Voice Feature

1. Client: `/client/src/modules/voice/`
2. Server: `/server/src/ai/` + `/server/src/routes/ai.routes.ts`
3. Types: `/shared/types/voice.types.ts`
4. Services coordinate via `/server/src/services/ai.service.ts`

---

## Development Commands

```bash
# Start everything
npm run dev

# Start individual services
npm run dev:client          # Vite on 5173
npm run dev:server          # Express on 3001
npm run dev:supabase        # With local DB

# Health check
npm run health

# Type check
npm run typecheck
npm run typecheck:quick     # Pre-commit

# Linting
npm run lint

# Memory check
npm run memory:check

# Database
npx prisma db pull
npm run db:push
npm run db:seed

# Testing
npm test
npm run test:watch
npm run test:e2e
npm run test:healthy

# Documentation
npm run docs:drift
npm run docs:validate
python3 scripts/validate_links.py
```

---

## Project Statistics

| Metric | Count |
|--------|-------|
| TypeScript/TSX Files | 400+ |
| Type Definition Files | 50+ |
| Test Files | 119 |
| Custom Hooks | 40+ |
| UI Components | 100+ |
| API Routes | 15 |
| Services | 25+ |
| Middleware | 15+ |
| Test Pass Rate | 85%+ |
| Documentation Health | 97.4% |

---

## Version Info

- **Project**: Rebuild 6.0
- **Status**: v6.0.14 (90% production ready)
- **React**: 18.3.1
- **Node**: 18+
- **TypeScript**: 5.x
- **Database**: Supabase (remote-first)
- **Frontend**: Vite
- **Backend**: Express
- **Testing**: Vitest (unit) + Playwright (E2E)

---

## External Resources

- **CLAUDE.md** - Claude Code specific guidance
- **docs/** - Full documentation (69 files)
- **claude-lessons3/** - Debugging knowledge base (600+ hours)
- **MONOREPO_STRUCTURE.md** - Detailed file structure
- **SUBSYSTEM_MAP.txt** - Quick reference by subsystem

---

## Getting Help

1. Check `claude-lessons3/SYMPTOM_INDEX.md` for error patterns
2. Search `docs/` for feature documentation
3. Look at existing tests for usage examples
4. Review `MONOREPO_STRUCTURE.md` for file locations
5. Reference `SUBSYSTEM_MAP.txt` for architectural overview
