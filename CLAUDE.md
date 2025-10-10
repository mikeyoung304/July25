# Grow App - Restaurant Management System

**Last Updated**: 2025-10-10
**Version**: 6.0.7
**Stack**: React 19.1.0, TypeScript 5.8.3, Vite 5.4.19, Express, Supabase

## Project Overview

Full-stack restaurant management system with AI-powered voice ordering, **professional kitchen display with table grouping**, and multi-tenant architecture. Built for enterprise use with strict data isolation.

### Recent Updates (v6.0.7)
- ✅ Upgraded kitchen display to optimized version with table grouping
- ✅ Added dual view modes (Tables/Grid) for flexible workflows
- ✅ Implemented batch operations for complete table service
- ✅ Fixed auth scopes for kitchen/expo roles (`orders.write`)
- 📄 See `KITCHEN_DISPLAY_UPGRADE.md` for full details

## Critical Architecture Rules

### 1. Multi-Tenancy (ALWAYS ENFORCE)
- **EVERY database operation** must include `restaurant_id`
- Never expose data across restaurant boundaries
- Test with multiple restaurant IDs: `11111111-1111-1111-1111-111111111111`, `22222222-2222-2222-2222-222222222222`
- Verify RLS policies in Supabase

### 2. Data Layer Conventions
- **Database**: snake_case (`restaurant_id`, `order_status`)
- **API**: camelCase (`restaurantId`, `orderStatus`)
- **Transform at boundary**: Use utilities in `/shared/utils`
- Never mix conventions within a layer

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
3. Add types to `/shared/types`
4. Transform snake_case ↔ camelCase at API boundary
5. Add WebSocket events if real-time needed
6. Write tests with multiple restaurant contexts

### API Endpoint Pattern
```typescript
// server/src/routes/example.ts
router.get('/items', async (req, res) => {
  const { restaurantId } = req.user; // From auth middleware
  const items = await db
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId); // ALWAYS filter

  res.json(transformToAPI(items)); // snake_case → camelCase
});
```

### React Component Pattern
```typescript
// client/src/components/Example.tsx
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function Example() {
  const { restaurantId } = useRestaurantContext();

  // Always include restaurantId in queries
  const { data } = useQuery(['items', restaurantId], () =>
    fetchItems(restaurantId)
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
