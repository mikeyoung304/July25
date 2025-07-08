# Architecture Comparison: rebuild-6.0 vs plate-clean-test

## Overview

This document provides a deep technical comparison between the two systems, highlighting architectural patterns, design decisions, and integration considerations.

## Technology Stack Comparison

### rebuild-6.0
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Design Tokens
- **State**: React Context + Custom Hooks
- **Backend**: Express.js (Service Layer Pattern)
- **Database**: Supabase (via Express API)
- **Testing**: Jest + React Testing Library
- **Real-time**: Custom subscription service

### plate-clean-test
- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Context + Server Components
- **Backend**: Direct Supabase Integration
- **Database**: Supabase (Direct)
- **Testing**: Jest + Playwright
- **Real-time**: Supabase Realtime

## Architectural Patterns

### 1. Service Layer Architecture

#### rebuild-6.0 ✅ Superior Pattern
```typescript
// Clean separation of concerns
src/
├── services/          // API integration layer
│   ├── api.ts        // HTTP client
│   ├── orders/       // Order services
│   └── base/         // Base service class
├── modules/          // Feature modules
└── core/            // Core providers
```

**Benefits:**
- Backend can change without frontend impact
- Centralized error handling
- Easy mocking for tests
- Clear API contracts
- Multi-tenant support built-in

#### plate-clean-test ⚠️ Direct Integration
```typescript
// Direct database calls
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data } = await supabase.from('orders').select()
```

**Issues:**
- Tight coupling to Supabase
- Difficult to test
- No centralized error handling
- RLS complexity in components

### 2. Component Architecture

#### rebuild-6.0 - Modular Approach
```typescript
modules/
├── kitchen/
│   ├── components/   // UI components
│   ├── hooks/        // Business logic
│   ├── types/        // TypeScript types
│   └── index.ts      // Public API
```

**Benefits:**
- Clear module boundaries
- Easy to find related code
- Promotes reusability
- Better code splitting

#### plate-clean-test - Feature-Based
```typescript
components/
├── kds/
│   ├── KDSInterface.tsx
│   ├── stations/
│   └── index.ts
```

**Benefits:**
- Simpler structure
- Less abstraction
- Faster initial development

### 3. State Management

#### rebuild-6.0 - Hooks-Based
```typescript
// Centralized subscription management
const { orders } = useOrderSubscription({
  onOrderCreated: handleNewOrder,
  onOrderUpdated: handleUpdate
})

// Async state with loading/error
const { data, loading, error, execute } = useAsyncState()
```

#### plate-clean-test - Mixed Approach
```typescript
// Server components for initial data
export default async function Page() {
  const orders = await getOrders()
}

// Client components for interactivity
'use client'
const [orders, setOrders] = useState([])
```

### 4. Real-time Updates

#### rebuild-6.0 - Abstracted Pattern
```typescript
// services/realtime/orderSubscription.ts
export const orderSubscription = {
  subscribe(id: string, callback: (event: OrderEvent) => void) {
    // Implementation details hidden
  }
}

// In component
useOrderSubscription({
  onOrderCreated: (order) => { /* handle */ }
})
```

#### plate-clean-test - Direct Supabase
```typescript
useEffect(() => {
  const channel = supabase
    .channel('orders')
    .on('postgres_changes', { event: '*', schema: 'public' }, handler)
    .subscribe()
})
```

### 5. Authentication & Multi-tenancy

#### rebuild-6.0 - Restaurant Context
```typescript
// Multi-tenant from the start
const { restaurant } = useRestaurant()
const orders = await api.getOrders(restaurant.id)
```

#### plate-clean-test - User-Based
```typescript
// Single tenant focused
const { user } = await supabase.auth.getUser()
```

## Key Architectural Differences

### 1. Data Flow

**rebuild-6.0:**
```
Component → Hook → Service → Express API → Supabase
                     ↓
                Mock Data (dev)
```

**plate-clean-test:**
```
Component → Supabase Client → Supabase
     ↓
Server Component → Supabase (SSR)
```

### 2. Error Handling

**rebuild-6.0:**
- Centralized in service layer
- Consistent error format
- useErrorHandler hook
- Error boundaries at multiple levels

**plate-clean-test:**
- Try-catch in components
- Mixed error handling
- Basic error boundaries

### 3. Testing Strategy

**rebuild-6.0:**
- Services easily mocked
- Components test UI only
- Clear test boundaries
- 80%+ coverage

**plate-clean-test:**
- Requires Supabase mocking
- Mixed concerns in tests
- E2E focused with Playwright

### 4. Performance Optimizations

**rebuild-6.0:**
- Built-in performance monitoring
- React.memo used strategically
- Custom hooks for optimization
- Bundle analysis tools

**plate-clean-test:**
- Next.js optimizations
- Server components for SSR
- Built-in image optimization
- Automatic code splitting

## Integration Considerations

### What to Adopt from plate-clean-test

1. **UI Components** ✅
   - Station-specific views
   - Multi-view layouts
   - Visual feedback patterns

2. **User Workflows** ✅
   - Table grouping logic
   - Order flow optimizations
   - Station coordination

3. **Visual Design Elements** ✅
   - Layout patterns
   - Animation strategies
   - Information hierarchy

### What NOT to Adopt

1. **Direct Supabase Calls** ❌
   - Breaks service layer pattern
   - Reduces testability
   - Couples to specific database

2. **Server Components** ❌
   - Not applicable to Vite/React
   - Different rendering strategy

3. **Authentication Patterns** ❌
   - rebuild-6.0 has superior multi-tenant approach

4. **File Structure** ❌
   - Modular approach is more scalable

## Adaptation Strategy

### Component Migration Pattern
```typescript
// Original (plate-clean-test)
export default async function ServerPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('orders').select()
}

// Adapted (rebuild-6.0)
export function OrdersPage() {
  const { data, loading } = useAsyncState(
    () => api.getOrders()
  )
}
```

### Hook Migration Pattern
```typescript
// Original (direct subscription)
const channel = supabase.channel('orders')

// Adapted (service pattern)
const { orders } = useOrderSubscription({
  enabled: true
})
```

### Style Migration Pattern
```typescript
// Keep Macon brand colors
// Extract layout patterns only
// Adapt animations to existing system
```

## Architectural Decision Records

### ADR-001: Maintain Service Layer
**Decision**: Keep all data fetching in service layer
**Reason**: Testability, flexibility, multi-tenant support
**Consequences**: Slightly more code, clear boundaries

### ADR-002: Module-Based Structure
**Decision**: Keep feature modules pattern
**Reason**: Scalability, maintainability, code organization
**Consequences**: More folders, clearer ownership

### ADR-003: Hooks for Business Logic
**Decision**: Extract business logic to custom hooks
**Reason**: Reusability, testing, separation of concerns
**Consequences**: More abstraction, better testing

## Conclusion

rebuild-6.0 has a more robust, scalable architecture that's better suited for long-term maintenance and multi-tenant operations. When integrating features from plate-clean-test, we must:

1. Preserve the service layer pattern
2. Maintain module boundaries
3. Adapt UI patterns without architectural changes
4. Keep testing and monitoring infrastructure
5. Respect the multi-tenant design

The goal is to get the best UI/UX improvements from plate-clean-test while maintaining the superior architecture of rebuild-6.0.