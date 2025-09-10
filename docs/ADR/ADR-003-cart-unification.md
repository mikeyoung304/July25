# ADR-003: Cart System Unification

**Status**: Accepted ✅ **IMPLEMENTED & ACTIVE**  
**Date**: September 2, 2025  
**Deciders**: Frontend Team

**Status Update (September 2025)**: UnifiedCartContext is implemented and used throughout the application as designed.

## Context

Multiple cart implementations emerged across different parts of the application:
- KioskCart for self-service
- POSCart for staff terminals
- OnlineCart for web orders
- VoiceCart for AI ordering

This duplication led to:
- Inconsistent cart behavior
- Duplicate business logic
- Synchronization issues
- Maintenance burden

## Decision

We will use a **single UnifiedCartContext** for ALL cart operations across the entire application.

## Consequences

### Positive
- Single source of truth for cart state
- Consistent behavior across all interfaces
- Reduced code duplication
- Easier testing and maintenance
- Simplified state management

### Negative
- All cart features in one context
- Potential for context bloat
- Need to handle all use cases

### Implementation

```typescript
// Always import directly
import { useUnifiedCart } from '@/contexts/UnifiedCartContext';

// Never create adapter contexts
// ❌ BAD: const KioskCartContext = createContext();
// ✅ GOOD: Use UnifiedCartContext directly
```

## Rules

1. **NO adapter contexts** - They add complexity without value
2. **NO duplicate cart logic** - Everything in UnifiedCartContext
3. **Direct imports only** - From `@/contexts/UnifiedCartContext`
4. **Aliases allowed** - `useCart()`, `useKioskCart()` can alias `useUnifiedCart()`

## Migration

When unifying cart systems:
1. Update ALL usages, not just wrap old ones
2. Remove old cart implementations completely
3. Update imports throughout codebase
4. Test all cart operations

## Related
- Cart implementation in `/client/src/contexts/UnifiedCartContext.tsx`
- ADR-002: Unified Backend Architecture