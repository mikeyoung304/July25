# Restaurant OS - rebuild-6.0 Project Instructions

## Project Overview

- **Type**: Restaurant OS (Point of Sale + Management System)
- **Version**: 6.0.4
- **Stack**: React 19.1.0, TypeScript 5.8.3/5.3.3, Vite 5.4.19, Express 4.18.2, Supabase 2.50.5/2.39.7
- **Architecture**: Unified backend on port 3001
- **Last Updated**: January 30, 2025

## Directory Structure

```
rebuild-6.0/
├── client/          # React frontend (Vite)
├── server/          # Express backend + AI services
├── shared/          # Shared types & utilities
├── docs/           # Documentation
└── scripts/        # Build & deployment scripts
```

## Development Commands

- `npm run dev` - Start development servers (both client & server)
- `npm test` - Run test suite
- `npm run lint:fix` - Fix linting issues
- `npm run typecheck` - TypeScript validation
- `npm run build` - Production build
- `npm run test:coverage` - Run tests with coverage report
- `npm run analyze` - Analyze bundle size
- `npm run test:memory` - Test with memory monitoring

## Quality Requirements

- **Mandatory**: All tests pass, TypeScript strict mode
- **Coverage**: 60% statements, 50% branches, 60% functions/lines (tests currently timeout - needs fix)
- **ESLint**: 0 errors, 573 warnings (down from 952 issues)
- **Pre-commit**: test, lint, typecheck must pass
- **Bundle Size**: Main chunk target <100KB
- **Memory**: 4GB max for builds (optimized from 12GB)
- **TypeScript**: 561 errors (mostly in tests - app still runs, down from 670+)

## Key Features

- Multi-tenant restaurant management
- AI-powered voice ordering (WebSocket + OpenAI Realtime)
- Real-time POS system
- iPad-based tableside payment system
- Menu management with QR codes
- Kitchen display system (KDS) - 3 duplicate implementations need consolidation
- Analytics dashboard
- Split payment functionality (backend only - frontend UI missing)

## Kitchen Display System (KDS) Critical Requirements

### Status Handling (CRITICAL)

- **ALL 7 order statuses MUST be handled**: 'new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
- **Missing status handling = Runtime errors = ErrorBoundary failures**
- Always provide fallback/default cases in switch statements
- Validate status values at runtime, not just compile time

### Data Contract Validation

- Backend sends all 7 statuses - frontend components must handle all
- OrderType database format: 'online' | 'pickup' | 'delivery'
- UI display format: 'dine-in' | 'takeout' | 'delivery' | 'online' | 'drive-thru' | 'kiosk' | 'voice'
- All WebSocket events must include restaurant_id for multi-tenancy

### Error Prevention Checklist

1. Check browser console FIRST for runtime errors (not server logs)
2. Validate all status config objects have all 7 statuses
3. Add fallback cases to all switch statements
4. Test with actual backend data, not mocked data
5. Use ErrorBoundary at section level, not just page level

### WebSocket Stability

- Implement exponential backoff for reconnection
- Handle connection state changes gracefully
- Batch order updates to prevent UI thrashing
- Monitor for memory leaks in long-running connections

## Voice System (UNIFIED - 2025-08-21)

- **Single Implementation**: WebRTC + OpenAI Realtime API only
- **Location**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- **UI Component**: `VoiceControlWebRTC` (used by all pages)
- **API Endpoint**: `/api/v1/realtime/session`
- **No competing systems**: All WebSocket/blob-based voice removed
- Context provider: RestaurantContext (restaurant_id field)
- **Last Updated**: January 30, 2025

## Specialized Agents

- **vite-builder**: Build issues, bundle optimization, HMR
- **react-optimizer**: Performance optimization, React patterns

## Available DRY Utilities (USE THESE!)

### API Requests - `useApiRequest`

```typescript
import { useApiRequest } from '@/hooks/useApiRequest'

// Automatically handles auth, restaurant context, loading/error states
const api = useApiRequest<Order[]>()
await api.get('/api/v1/orders')
await api.post('/api/v1/orders', orderData)
```

### Form Validation - `useFormValidation`

```typescript
import { useFormValidation, validators } from '@/utils/validation'

const form = useFormValidation(
  {
    email: '',
    phone: '',
  },
  {
    email: { rules: [validators.required, validators.email] },
    phone: { rules: [validators.required, validators.phone] },
  }
)
```

### Modal Management - `useModal`

```typescript
import { useModal } from '@/hooks/useModal'

const modal = useModal({
  closeOnEscape: true,
  preventScroll: true,
})
```

### Error Boundaries - `PaymentErrorBoundary`

```typescript
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary';

// Wrap payment components for graceful error recovery
<PaymentErrorBoundary>
  <CheckoutForm />
</PaymentErrorBoundary>
```

## Development Guidelines

1. **File Operations**: Always read files before editing
2. **Testing**: Run tests before commits
3. **Multi-tenancy**: Always consider restaurant_id context
4. **Performance**: Monitor bundle sizes, optimize for mobile
5. **Voice Features**: Test WebSocket connections thoroughly
6. **KDS Stability**: Always handle all 7 order statuses with fallbacks
7. **Runtime Debugging**: Use browser console over server logs for UI issues
8. **Status Validation**: Test components with all possible status values
9. **WebSocket Resilience**: Implement proper reconnection and error handling
10. **USE DRY UTILITIES**: Always check for existing hooks/utilities before creating new ones
11. **Authentication**: All authentication flows use Supabase JWT tokens with proper role-based access control

## Environment

- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Database: Supabase (configured in .env)

## Memory Management

- Use NODE_OPTIONS="--max-old-space-size=4096" for builds (optimized from 8192)
- Clear Vite cache if HMR issues: `rm -rf node_modules/.vite`
- Monitor memory leaks with `npm run test:memory`
- Long-running components use cleanup utilities from `shared/utils/cleanup-manager`

## Common Patterns

- Restaurant context in all data operations
- TypeScript strict mode throughout
- Shared types in `shared/` directory
- Error boundaries for React components
- Proper WebSocket cleanup in useEffect hooks
- **UnifiedCartContext for ALL cart operations** (single source of truth)
- Code splitting with React.lazy() for routes
- WebSocket event handlers use `on`/`off` pattern (not subscribe return)
- Browser API checks: `typeof window !== 'undefined'`
- API responses cast with `as` (not generic parameters)

## React Hooks Pitfalls (CRITICAL for WebRTC/Real-time)

### The Problem (Fixed 2025-09-09)
React hooks with unstable dependencies can cause WebRTC clients and WebSocket connections to be destroyed and recreated on every render, breaking real-time functionality even when the connection succeeds.

### Solution Pattern
```typescript
// ❌ BAD: Callbacks in dependencies cause re-initialization
useEffect(() => {
  client.on('event', onEvent);
}, [onEvent]); // onEvent changes every render!

// ✅ GOOD: Store callbacks in refs
const onEventRef = useRef(onEvent);
useEffect(() => {
  onEventRef.current = onEvent;
}, [onEvent]);

useEffect(() => {
  client.on('event', (data) => onEventRef.current?.(data));
}, []); // Stable dependencies only!
```

### Key Rules
1. **Minimize useEffect dependencies** - Only include truly stable values
2. **Use refs for callbacks** - Prevents triggering re-initialization
3. **Wrap handlers with useCallback** - Stabilizes function references
4. **Monitor for cleanup messages** - Frequent cleanup = component recreation

### Voice System Specific
- WebRTC connections are expensive to create/destroy
- Connection may succeed but UI won't update if component recreates
- Check console for `[useWebRTCVoice] Cleaning up` messages
- Look for "No handlers for event" warnings indicating stale listeners
- See `/docs/voice/TROUBLESHOOTING.md` for debugging steps

## Critical Architecture Decisions (2025-08-28)

### Cart System Unification
- **ONLY use UnifiedCartContext** - no separate cart providers
- Import from `@/contexts/UnifiedCartContext` directly
- Use `useUnifiedCart()` hook (or aliases `useCart()`, `useKioskCart()`)
- **DO NOT create adapter contexts** - they add complexity
- **DO NOT duplicate cart logic** - violates DRY principle
- When refactoring/unifying systems, update ALL usages, not just wrap old ones

## Authentication Architecture (2025-01-30)

### User Roles & Access Levels
- **Owner**: Full system access, financial reports, multi-location
- **Manager**: Restaurant operations, reports, staff management  
- **Server**: Order creation, payment processing, table management
- **Cashier**: Payment processing, limited order access
- **Kitchen**: Kitchen display only, order status updates
- **Expo**: Expo display, order completion
- **Customer**: Self-service ordering (kiosk/online/QR)

### Authentication Methods
- **Email/Password**: Managers and above (with optional MFA) via Supabase
- **PIN Code**: Service staff (4-6 digits, restaurant-scoped) with bcrypt hashing
- **Station Login**: Kitchen/Expo (shared device authentication) with JWT tokens
- **Kiosk/Anonymous**: Customers (JWT tokens with limited scope, HS256 signing)
  - Endpoint: `/api/v1/auth/kiosk`
  - Production feature for self-service ordering
  - 1-hour session tokens with customer role

### Token Management
- Staff tokens: JWT-based via Supabase (RS256 signing)
- Kiosk tokens: JWT with HS256 signing (limited scope)
- Restaurant ID validation required for all authenticated requests
- Automatic token refresh and session management
- Role-based scope validation at API endpoints

### Implementation Priority
1. JWT token infrastructure (RS256 signed)
2. Login page with email/password
3. PIN pad for service staff
4. Protected route wrapper
5. Role-based permission gates

### Security Requirements
- 8-hour sessions for managers, 12-hour for staff
- HttpOnly, Secure, SameSite cookies
- Rate limiting on auth endpoints (5 attempts → 15 min lockout)
- Comprehensive audit logging for all auth events
- CSRF protection with X-CSRF-Token headers
- PIN hashing with bcrypt (12 rounds) + application-level pepper
- Row-level security in Supabase database
