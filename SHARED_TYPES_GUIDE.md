# Shared Types Guide

## Overview

The Rebuild 6.0 project uses the `@rebuild/shared` module to share TypeScript types between frontend and backend, ensuring type safety across the full stack.

## Current Implementation

### Module Location
- **Path**: `shared/` directory at project root
- **Import**: `@rebuild/shared` (configured via TypeScript paths)

### Active Usage
The shared types module is currently imported in 4 files:
- `client/src/types/common.ts` - Imports `OrderStatus`
- `client/src/components/orders/BaseOrderCard.tsx` - Imports `Order` type
- `client/src/components/orders/useOrderUrgency.ts` - Imports `Order` type  
- `client/src/services/types/index.ts` - Imports multiple types

## Adding New Shared Types

### 1. Define in Shared Module
```typescript
// shared/types/order.ts
export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  created_at: string;
  // ... other fields
}

export enum OrderStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  preparing = 'preparing',
  ready = 'ready',
  completed = 'completed'
}
```

### 2. Export from Index
```typescript
// shared/index.ts
export * from './types/order';
export * from './types/menu';
export * from './types/user';
```

### 3. Import in Frontend
```typescript
// client/src/components/SomeComponent.tsx
import { Order, OrderStatus } from '@rebuild/shared';
```

### 4. Import in Backend
```typescript
// server/src/services/orders.service.ts
import { Order, OrderStatus } from '@rebuild/shared';
```

## TypeScript Configuration

### Client tsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@rebuild/shared": ["../shared"]
    }
  }
}
```

### Server tsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@rebuild/shared": ["../shared"]
    }
  }
}
```

## Best Practices

1. **Keep Types Pure**: No runtime code in shared types
2. **Use Enums for Constants**: Better than string literals
3. **Document Complex Types**: Add JSDoc comments
4. **Version Carefully**: Changes affect both frontend and backend

## Common Patterns

### Request/Response Types
```typescript
// shared/types/api.ts
export interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  table_id?: string;
  customer_notes?: string;
}
```

### Validation Schemas
```typescript
// Can be shared, but validation logic stays in backend
export interface OrderValidation {
  minItems: number;
  maxItems: number;
  requiredFields: (keyof Order)[];
}
```

## Migration Path

To increase shared type usage:

1. **Identify Duplicated Types**: Find types defined in both client and server
2. **Move to Shared**: Create in shared module
3. **Update Imports**: Replace local imports with `@rebuild/shared`
4. **Test**: Ensure TypeScript compilation passes

## Related Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup