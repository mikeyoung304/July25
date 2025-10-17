# Grow App - Restaurant Management System

**Last Updated**: 2025-10-17
**Version**: 6.0.8
**Stack**: React 19.1.0, TypeScript 5.8.3, Vite 5.4.19, Express, Supabase

## Project Overview

Full-stack restaurant management system with AI-powered voice ordering, **professional kitchen display with table grouping**, and multi-tenant architecture. Built for enterprise use with strict data isolation.

### Recent Updates (v6.0.8)
- ✅ **CRITICAL FIX**: Dual authentication pattern in httpClient (demo/PIN/station + Supabase)
- ✅ Fixed KDS unable to fetch orders with demo authentication (was showing mock data)
- ✅ Created ADR-006: Dual Authentication Architecture Pattern
- ✅ Comprehensive documentation updates for production readiness
- 📄 See `docs/CHANGELOG.md` and `docs/ADR-006-dual-authentication-pattern.md` for full details

### Previous Updates (v6.0.7)
- ✅ Upgraded kitchen display to optimized version with table grouping
- ✅ Added dual view modes (Tables/Grid) for flexible workflows
- ✅ Implemented batch operations for complete table service
- ✅ Fixed auth scopes for kitchen/expo roles (`orders.write`)

## Critical Architecture Rules

### 1. Multi-Tenancy (ALWAYS ENFORCE)
- **EVERY database operation** must include `restaurant_id`
- Never expose data across restaurant boundaries
- Test with multiple restaurant IDs: `11111111-1111-1111-1111-111111111111`, `22222222-2222-2222-2222-222222222222`
- Verify RLS policies in Supabase

### 2. Data Layer Conventions (ENTERPRISE STANDARD - ADR-001)

**CRITICAL: ALL LAYERS USE SNAKE_CASE**

- **Database**: snake_case (`restaurant_id`, `order_status`)
- **API**: snake_case (`restaurant_id`, `order_status`)
- **Client**: snake_case (`restaurant_id`, `order_status`)
- **Rationale**: PostgreSQL standard, zero transformation overhead, single source of truth
- **Decision Date**: 2025-10-12 (See docs/ADR-001-snake-case-convention.md)

**DO NOT**:
- ❌ Add camelCase transformations
- ❌ Create competing format conventions
- ❌ Use camelCase in API payloads
- ❌ Transform between snake_case and camelCase

**Example**:
```typescript
// ✅ CORRECT
POST /api/v1/orders {
  type: 'online',
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  total_amount: 29.99
}

// ❌ WRONG
POST /api/v1/orders {
  type: 'online',
  customerName: 'John Doe',  // Don't use camelCase
  customerEmail: 'john@example.com',
  totalAmount: 29.99
}
```

### 3. Order Status Flow (7 Required States)
```
pending → confirmed → preparing → ready → served → completed
↓
cancelled
```
**All 7 must be handled** in any order-related code.

### 4. Security Rules
- API keys **NEVER** in client code
- Use `SUPABASE_SERVICE_KEY` server-side only
- Client gets `SUPABASE_ANON_KEY` with RLS
- Transform sensitive data at API boundary

### 5. Authentication Architecture (DUAL PATTERN - ADR-006)

**CRITICAL: Two Authentication Systems Coexist**

The application supports **TWO separate authentication paths**:
- **Supabase Sessions** (Primary): Email/password auth, production-ready
- **localStorage Sessions** (Fallback): Demo/PIN/station auth, development/testing

**httpClient Dual Auth Pattern** (`client/src/services/http/httpClient.ts`):
```typescript
// Priority Order:
// 1. Try Supabase session first (production path)
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  headers.set('Authorization', `Bearer ${session.access_token}`);
} else {
  // 2. Fallback to localStorage (demo/PIN/station path)
  const savedSession = localStorage.getItem('auth_session');
  if (savedSession) {
    const parsed = JSON.parse(savedSession);
    if (parsed.session?.accessToken && parsed.session?.expiresAt > Date.now() / 1000) {
      headers.set('Authorization', `Bearer ${parsed.session.accessToken}`);
    }
  }
}
```

**When Adding Auth-Required Features:**
1. Use httpClient for API calls (handles both auth paths automatically)
2. Test with BOTH auth methods: email/password AND demo login
3. Check both `supabase.auth.getSession()` and `localStorage.getItem('auth_session')`
4. Never assume only one auth system exists

**localStorage Token Format:**
```typescript
{
  session: {
    accessToken: string,    // JWT token
    expiresAt: number,      // Unix timestamp (12 hours default)
    role: string,           // e.g., "server", "kitchen", "expo"
    userId: string          // e.g., "demo:server:abc123"
  },
  user: {
    id: string,
    role: string,
    restaurant_id: string
  }
}
```

**Production Considerations:**
- ⚠️ localStorage auth has security tradeoffs (XSS vulnerability, no auto-refresh)
- See `docs/ADR-006-dual-authentication-pattern.md` for migration options
- Decision required before production launch (3 options available)
- Current implementation prioritizes development velocity over security

**Debug Auth Issues:**
```typescript
// Browser console - check which auth is active
const { data: { session } } = await supabase.auth.getSession();
const savedSession = localStorage.getItem('auth_session');
console.log('Supabase:', session);
console.log('localStorage:', savedSession ? JSON.parse(savedSession) : null);
```

## Project Structure
```
rebuild-6.0/
├── client/              # React 19 + Vite (port 5173)
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # UnifiedCartContext (single source of truth)
│   │   ├── modules/     # Feature modules (voice, payments, kds)
│   │   └── pages/       # Route pages
├── server/              # Express + TypeScript (port 3001)
│   ├── src/
│   │   ├── routes/      # API endpoints /api/v1/*
│   │   ├── services/    # Business logic
│   │   ├── ai/         # Voice ordering (OpenAI Realtime)
│   │   └── middleware/  # Auth, CORS, error handling
├── shared/              # Shared TypeScript types
│   ├── types/          # Type definitions
│   ├── api-types.ts   # API boundary types
│   └── utils/         # Transform utilities
└── supabase/           # Cloud database (no local DB)
```

## Development Commands
```bash
# Start everything (client + server)
npm run dev

# Build for production
npm run build

# Type checking (ALWAYS RUN BEFORE COMMITS)
npm run typecheck --workspaces

# Linting
npm run lint --workspaces

# Run tests
npm run test

# Memory check (48GB available, use 6GB dev, 12GB build)
ps aux | grep -E "node|vite" | awk '{sum+=$6} END {printf "%.0f MB\n", sum/1024}'
```

## Common Patterns

### Adding a New Multi-Tenant Feature

1. Add `restaurant_id` to all DB queries
2. Create RLS policy in Supabase Dashboard
3. Add types to `/shared/types` (use snake_case)
4. Use snake_case in API payloads (per ADR-001)
5. Add WebSocket events if real-time needed
6. Write tests with multiple restaurant contexts

### API Endpoint Pattern
```typescript
// server/src/routes/example.ts
router.get('/items', async (req, res) => {
  const { restaurant_id } = req.user; // snake_case per ADR-001
  const items = await db
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant_id); // ALWAYS filter

  res.json(items); // Return snake_case (no transformation)
});
```

### React Component Pattern
```typescript
// client/src/components/Example.tsx
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function Example() {
  const { restaurant_id } = useRestaurantContext(); // snake_case per ADR-001

  // Always include restaurant_id in queries
  const { data } = useQuery(['items', restaurant_id], () =>
    fetchItems(restaurant_id)
  );
}
```

## Technology Specifics

### Vite Configuration
- Manual chunks MUST be enabled (don't disable)
- Memory limit: 6GB dev, 12GB build
- Hot reload on env changes

### Supabase
- Cloud-only (no local database)
- RLS policies enforce multi-tenancy
- Use `supabase db pull` to sync schema

### WebSocket
- Real-time updates for orders/kitchen
- Connection pooling for performance
- Heartbeat every 30s

### Voice Ordering
- OpenAI Realtime API (client-side WebRTC)
- Menu queries cached 5 minutes
- Barge-in detection enabled

## DO NOT MODIFY

- `.env.production` (use platform dashboards)
- `server/migrations/*` (use Supabase Dashboard)
- Manual chunks in `vite.config.ts`
- RLS policies without approval

## Code Quality Standards

- TypeScript strict mode (no `any`)
- 0 ESLint errors (warnings OK)
- Test coverage >70% for new features
- Bundle size: main chunk <100KB

## When in Doubt

- Check existing patterns in similar files
- Run type checking before committing
- Test with multiple restaurant IDs
- Ask for clarification on multi-tenancy
