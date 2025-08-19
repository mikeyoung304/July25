# Kitchen Display System (KDS) Stability Guide

## Executive Summary

This guide provides comprehensive requirements and best practices to ensure the Kitchen Display System remains stable and functional. It is based on lessons learned from debugging runtime errors that caused ErrorBoundary failures.

## Critical Order Status Requirements

### Complete Status Enum (MUST HANDLE ALL)
The system uses 7 order statuses that ALL components must handle:

```typescript
export type OrderStatus = 
  | 'new'        // Just created, not yet confirmed
  | 'pending'    // Awaiting confirmation or payment
  | 'confirmed'  // Confirmed and ready for preparation  
  | 'preparing'  // Currently being prepared in kitchen
  | 'ready'      // Ready for pickup/delivery
  | 'completed'  // Picked up/delivered successfully
  | 'cancelled'  // Order was cancelled
```

### Status Transition Flow
```
new → pending → confirmed → preparing → ready → completed
   ↓      ↓         ↓          ↓         ↓
 cancelled ← cancelled ← cancelled ← cancelled ← cancelled
```

## Data Contracts

### Order Types (Database vs UI)
**Database Format** (what's stored):
- `'online'` - Online orders
- `'pickup'` - Pickup orders  
- `'delivery'` - Delivery orders

**UI Display Format** (what users see):
- `'dine-in'` - Table service
- `'takeout'` - Pickup orders
- `'delivery'` - Delivery orders
- `'online'` - Online platform orders
- `'drive-thru'` - Drive-through orders
- `'kiosk'` - Self-service kiosk
- `'voice'` - Voice ordering system

### WebSocket Event Requirements
All WebSocket events MUST include:
```typescript
{
  restaurant_id: string,  // Required for multi-tenancy
  order_id: string,       // Required for order updates
  status: OrderStatus,    // Must be one of 7 valid statuses
  timestamp: string       // ISO 8601 timestamp
}
```

## Component Stability Requirements

### 1. StatusBadge Component
**MUST handle all 7 statuses with fallback:**

```typescript
const STATUS_CONFIG = {
  new: { label: 'New', className: 'bg-amber-50 text-amber-700...' },
  pending: { label: 'Pending', className: 'bg-blue-50 text-blue-700...' },
  confirmed: { label: 'Confirmed', className: 'bg-green-50 text-green-700...' },
  preparing: { label: 'Preparing', className: 'bg-macon-navy/10...' },
  ready: { label: 'Ready', className: 'bg-macon-teal/10...' },
  completed: { label: 'Completed', className: 'bg-neutral-100...' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50...' }
}

// ALWAYS provide fallback
const config = STATUS_CONFIG[status] || STATUS_CONFIG.new
```

### 2. StatusActionButton Component
**MUST include all statuses and fallback:**

```typescript
const BUTTON_CONFIG = {
  new: { label: 'Start Preparing', variant: 'secondary', icon: null },
  pending: { label: 'Start Preparing', variant: 'secondary', icon: null },
  confirmed: { label: 'Start Preparing', variant: 'secondary', icon: null },
  preparing: { label: 'Mark Ready', variant: 'teal', icon: CheckCircle },
  ready: { label: 'Ready for Pickup', variant: 'success', icon: CheckCircle },
  completed: { label: 'Completed', variant: 'outline', icon: CheckCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: null }
}

// CRITICAL: Always provide fallback
const config = BUTTON_CONFIG[status] || BUTTON_CONFIG.new
```

### 3. OrderActions Component
**MUST handle all status cases with default:**

```typescript
const getButtonInfo = () => {
  switch (status) {
    case 'new':
    case 'pending':
    case 'confirmed':
      return { label: 'Start Preparing', shortcut: 'Alt+S' }
    case 'preparing':
      return { label: 'Mark as Ready', shortcut: 'Alt+R' }
    case 'ready':
      return { label: 'Order Ready', shortcut: undefined }
    case 'completed':
      return { label: 'Completed', shortcut: undefined }
    case 'cancelled':
      return { label: 'Cancelled', shortcut: undefined }
    default:
      // CRITICAL: Always provide default case
      return { label: 'Start Preparing', shortcut: 'Alt+S' }
  }
}
```

## Error Handling Best Practices

### 1. Context Hook Safety
**NEVER throw errors from context hooks - provide fallbacks:**

```typescript
// ❌ BAD: Throws error, triggers ErrorBoundary
if (context === undefined) {
  throw new Error('useRestaurant must be used within a RestaurantProvider')
}

// ✅ GOOD: Returns safe fallback
if (context === undefined) {
  return {
    restaurant: null,
    setRestaurant: () => {},
    isLoading: true,
    error: new Error('RestaurantProvider not found')
  }
}
```

### 2. Enhanced Error Boundaries
**Use section-level error boundaries with debugging info:**

```typescript
<ErrorBoundary 
  level="section" 
  onError={(error, errorInfo) => {
    console.error('🚨 KDS Section Error:', {
      error: error.message,
      component: errorInfo.componentStack,
      props: { orderId, status, items },
      timestamp: new Date().toISOString()
    })
  }}
>
  <OrdersGrid orders={orders} />
</ErrorBoundary>
```

### 3. Runtime Data Validation
**Validate incoming data at boundaries:**

```typescript
const validateOrderStatus = (status: unknown): OrderStatus => {
  const validStatuses: OrderStatus[] = [
    'new', 'pending', 'confirmed', 'preparing', 
    'ready', 'completed', 'cancelled'
  ]
  
  if (typeof status === 'string' && validStatuses.includes(status as OrderStatus)) {
    return status as OrderStatus
  }
  
  console.warn(`Invalid order status: ${status}. Defaulting to 'new'`)
  return 'new'
}
```

## WebSocket Stability Patterns

### 1. Connection Management
```typescript
class WebSocketService {
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectInterval = 5000
  
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }
    
    // Exponential backoff
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts)
    setTimeout(() => this.connect(), delay)
    this.reconnectAttempts++
  }
}
```

### 2. Batched Updates
```typescript
const batchOrderUpdate = useCallback((updateFn: (prev: Order[]) => Order[]) => {
  if (updateOrdersRef.current) {
    clearTimeout(updateOrdersRef.current)
  }
  
  updateOrdersRef.current = setTimeout(() => {
    setOrders(updateFn)
  }, 50) // Batch updates every 50ms
}, [])
```

## Testing Requirements

### 1. Status Handling Tests
**Test ALL statuses in every component:**

```typescript
describe('StatusBadge', () => {
  const allStatuses: OrderStatus[] = [
    'new', 'pending', 'confirmed', 'preparing', 
    'ready', 'completed', 'cancelled'
  ]
  
  test('handles all order statuses without errors', () => {
    allStatuses.forEach(status => {
      expect(() => render(<StatusBadge status={status} />)).not.toThrow()
    })
  })
  
  test('handles invalid status gracefully', () => {
    expect(() => render(<StatusBadge status={'invalid' as any} />)).not.toThrow()
  })
})
```

### 2. WebSocket Resilience Tests
```typescript
describe('WebSocket Connection', () => {
  test('reconnects automatically after disconnect', async () => {
    // Test reconnection logic
  })
  
  test('handles malformed messages gracefully', () => {
    // Test error handling for bad data
  })
  
  test('batches rapid updates correctly', () => {
    // Test update batching
  })
})
```

## Debugging Checklist

### When KDS Shows ErrorBoundary:
1. **Check browser console FIRST** (not server logs)
2. Look for `Cannot read properties of undefined` errors
3. Identify the failing component from stack trace
4. Check if component handles all 7 order statuses
5. Verify data being passed matches expected format
6. Confirm WebSocket is sending valid status values

### Runtime Error Prevention:
1. ✅ All status configs include all 7 statuses
2. ✅ All switch statements have default cases
3. ✅ All array access operations are safe
4. ✅ All object property access uses optional chaining
5. ✅ All context hooks provide fallbacks
6. ✅ WebSocket events include required fields

## Production Monitoring

### Key Metrics to Track:
- ErrorBoundary trigger frequency
- WebSocket disconnection rate
- Order status transition failures
- Component render error rates
- API response time for status updates

### Alert Conditions:
- ErrorBoundary triggers > 1% of page loads
- WebSocket disconnections > 5% of connections
- Invalid order status values received
- Component errors in production builds

## Emergency Response

### If KDS Fails in Production:
1. **Immediate**: Check browser console errors across different browsers
2. **Quick Fix**: Deploy with additional fallback cases
3. **Root Cause**: Trace data flow from API → WebSocket → Components
4. **Validation**: Add runtime checks for invalid data
5. **Prevention**: Update tests to cover the failure scenario

## Conclusion

KDS stability depends on:
1. **Complete status handling** - All 7 statuses in all components
2. **Safe fallbacks** - Never let undefined values cause crashes
3. **Runtime validation** - Check data at boundaries
4. **Resilient WebSocket** - Handle disconnections gracefully
5. **Browser-first debugging** - Console errors over server logs

Following these guidelines prevents the runtime errors that caused the original KDS ErrorBoundary failures.

---

*Last Updated: 2025-08-19*  
*Based on: Kitchen Display Debugging Post-Mortem findings*