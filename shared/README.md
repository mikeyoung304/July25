# Shared - Common Types and Utilities


**Last Updated:** 2025-08-26

## Overview

The shared directory contains TypeScript types, interfaces, and utility functions used across both client and server applications. This ensures type safety and consistency throughout the entire restaurant OS system.

## Structure

```
shared/
├── types/                  # TypeScript type definitions
│   ├── order.types.ts      # Order-related types
│   ├── table.types.ts      # Table management types
│   ├── menu.types.ts       # Menu item types
│   ├── restaurant.types.ts # Restaurant configuration
│   └── unified-order.types.ts # Unified order system types
├── utils/                  # Shared utility functions
│   ├── cleanup-manager.ts  # Memory management utilities
│   ├── date.utils.ts       # Date/time helpers
│   ├── validation.ts       # Common validators
│   └── websocket-pool.browser.ts # WebSocket connection pooling
├── constants/              # Shared constants
│   ├── order-status.ts     # Order status definitions
│   └── api-endpoints.ts    # API endpoint constants
└── dist/                   # Compiled JavaScript output
```

## Core Types

### Order Types

```typescript
// Order statuses - ALL must be handled
export type OrderStatus = 
  | 'new' |
  | 'pending' |
  | 'confirmed' |
  | 'preparing' |
  | 'ready' |
  | 'completed' |
  | 'cancelled'; |

// Database-valid order types
export type OrderType = 'online' | 'pickup' | 'delivery';

// UI-friendly order types
export type UIOrderType = 
  | 'dine-in' |
  | 'takeout' |
  | 'delivery' |
  | 'online' |
  | 'drive-thru' |
  | 'kiosk' |
  | 'voice'; |

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  table_number?: string;  // Critical for table grouping
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  estimated_ready_time?: string;
}
```

### Table Types

```typescript
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  section?: string;         // Restaurant zone
  position?: {
    x: number;
    y: number;
  };
  shape?: 'square' | 'round' | 'rectangle';
  current_order_id?: string; // Links to active order
  server_id?: string;        // Assigned server
  created_at: string;
  updated_at: string;
}
```

### Menu Types

```typescript
export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  modifiers?: MenuModifier[];
  allergens?: string[];
  prep_time_minutes?: number;
  station?: KitchenStation;  // Which kitchen station prepares this
  created_at: string;
  updated_at: string;
}

export interface MenuModifier {
  id: string;
  name: string;
  price: number;
  category?: string;
  is_required?: boolean;
}

export type KitchenStation = 
  | 'grill' |
  | 'saute' |
  | 'salad' |
  | 'fry' |
  | 'dessert' |
  | 'beverage'; |
```

## Utility Functions

### Cleanup Manager

Memory management utilities for long-running components:

```typescript
import { CleanupManager } from '@rebuild/shared/utils/cleanup-manager'

const cleanup = new CleanupManager()

// Register cleanup tasks
cleanup.register('websocket', () => ws.close())
cleanup.register('interval', () => clearInterval(intervalId))

// Execute all cleanup
await cleanup.executeAll()
```

### Date Utilities

```typescript
import { formatOrderTime, getElapsedMinutes, isOrderUrgent } from '@rebuild/shared/utils/date'

// Format order time for display
const displayTime = formatOrderTime(order.created_at) // "2:34 PM"

// Get elapsed time in minutes
const minutes = getElapsedMinutes(order.created_at) // 15

// Check urgency
const urgent = isOrderUrgent(order) // true if >15 minutes
```

### Validation Utilities

```typescript
import { validators } from '@rebuild/shared/utils/validation'

// Common validators
validators.required(value)           // Checks non-empty
validators.email(email)              // Email format
validators.phone(phone)              // Phone format
validators.tableNumber(table)        // Valid table number
validators.orderStatus(status)       // Valid order status
```

### WebSocket Pool

Efficient connection management for real-time updates:

```typescript
import { WebSocketPool } from '@rebuild/shared/utils/websocket-pool.browser'

const pool = new WebSocketPool({
  maxConnections: 3,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000
})

// Get or create connection
const connection = await pool.getConnection('orders')

// Subscribe to messages
connection.subscribe('order:*', (message) => {
  console.log('Order event:', message)
})
```

## Constants

### Order Status Constants

```typescript
export const ORDER_STATUSES = {
  NEW: 'new',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export const STATUS_COLORS = {
  [ORDER_STATUSES.NEW]: 'blue',
  [ORDER_STATUSES.PENDING]: 'blue',
  [ORDER_STATUSES.CONFIRMED]: 'purple',
  [ORDER_STATUSES.PREPARING]: 'yellow',
  [ORDER_STATUSES.READY]: 'green',
  [ORDER_STATUSES.COMPLETED]: 'gray',
  [ORDER_STATUSES.CANCELLED]: 'red'
} as const
```

### API Endpoints

```typescript
export const API_ENDPOINTS = {
  ORDERS: '/api/v1/orders',
  MENU: '/api/v1/menu',
  TABLES: '/api/v1/tables',
  PAYMENTS: '/api/v1/payments',
  AUTH: '/api/v1/auth',
  HEALTH: '/api/v1/health'
} as const
```

## Type Safety Guidelines

### Always Handle All Statuses

```typescript
// ❌ Bad - missing statuses
switch(order.status) {
  case 'preparing':
    return 'In Kitchen'
  case 'ready':
    return 'Ready'
}

// ✅ Good - all statuses handled
switch(order.status) {
  case 'new':
  case 'pending':
    return 'Pending'
  case 'confirmed':
  case 'preparing':
    return 'In Kitchen'
  case 'ready':
    return 'Ready'
  case 'completed':
    return 'Complete'
  case 'cancelled':
    return 'Cancelled'
  default:
    return 'Unknown' // Fallback for safety
}
```

### Use Type Guards

```typescript
import { isOrder, isTable, isMenuItem } from '@rebuild/shared/utils/type-guards'

// Type-safe checks
if (isOrder(data)) {
  // data is Order type here
  console.log(data.order_number)
}

if (isTable(data)) {
  // data is Table type here
  console.log(data.table_number)
}
```

### Strict Null Checks

```typescript
// ❌ Bad - assumes table_number exists
const tableNum = order.table_number.toUpperCase()

// ✅ Good - handles optional field
const tableNum = order.table_number?.toUpperCase() ?? 'TAKEOUT'
```

## Building

```bash
# Build TypeScript to JavaScript
npm run build:shared

# Watch mode for development
npm run dev:shared
```

## Testing

```bash
# Run shared tests
npm test shared/

# Type checking
npm run typecheck
```

## Import Examples

### In Client Code
```typescript
import type { Order, OrderStatus } from '@rebuild/shared'
import { formatOrderTime, validators } from '@rebuild/shared'
```

### In Server Code
```typescript
import { Order, Table } from '@rebuild/shared'
import { CleanupManager } from '@rebuild/shared'
```

## Migration Notes

### Field Name Conventions
- **Database**: Uses snake_case (e.g., `table_number`, `customer_name`)
- **TypeScript**: Uses snake_case to match database
- **API**: Accepts both snake_case and camelCase for compatibility

### Order Type Mapping
```typescript
// UI types map to database types
const typeMapping = {
  'dine-in': 'online',
  'takeout': 'pickup',
  'drive-thru': 'pickup',
  'kiosk': 'online',
  'voice': 'online',
  'delivery': 'delivery'
}
```

## Best Practices

1. **Always import types as type-only imports** to reduce bundle size
2. **Use const assertions** for literal types
3. **Provide fallbacks** for optional fields
4. **Handle all enum cases** in switch statements
5. **Use type guards** for runtime type checking
6. **Maintain backward compatibility** when updating types

## Contributing

When adding new types or utilities:
1. Ensure TypeScript strict mode compliance
2. Add JSDoc comments for complex types
3. Include unit tests for utilities
4. Update this README with examples
5. Run `npm run build:shared` before committing

## License

Proprietary - All rights reserved