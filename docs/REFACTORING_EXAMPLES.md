# Concrete Refactoring Examples

## 1. Component Consolidation

### Before: 3 files, 67 lines
```typescript
// OrderNumber.tsx (28 lines)
export const OrderNumber = ({ orderNumber, prefix = 'Order #', size = 'md', className }) => {
  return <span className={cn(SIZE_CLASSES[size], className)}>{prefix}{orderNumber}</span>
}

// TableLabel.tsx (20 lines)  
export const TableLabel = ({ tableNumber, prefix = 'Table', className }) => {
  return <span className={cn('text-sm text-muted-foreground', className)}>{prefix} {tableNumber}</span>
}

// ElapsedTimer.tsx (19 lines)
export const ElapsedTimer = ({ startTime }) => {
  const elapsed = useElapsedTime(startTime)
  return <span>{elapsed}</span>
}
```

### After: 1 file, 15 lines
```typescript
// OrderIdentity.tsx
export const OrderIdentity = ({ orderNumber, tableNumber, orderTime }) => {
  const elapsed = useElapsedTime(orderTime)
  
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="font-semibold">Order #{orderNumber}</span>
      <span className="text-muted-foreground">Table {tableNumber}</span>
      <span className="text-muted-foreground">{elapsed}</span>
    </div>
  )
}
```

**Savings**: -52 lines, -2 files, clearer intent

## 2. Service Layer Simplification

### Before: ServiceFactory + BaseService + OrderService (150+ lines)
```typescript
// ServiceFactory.ts (61 lines)
class ServiceFactory {
  private static instance: ServiceFactory
  private orderService: IOrderService
  
  private constructor() {
    this.orderService = new OrderService()
  }
  
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }
  
  getOrderService(): IOrderService {
    return this.orderService
  }
}

// BaseService.ts (45 lines)
export abstract class BaseService {
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  protected checkRateLimit(endpoint: string): void {
    // Rate limiting logic
  }
}

// OrderService.ts  
export class OrderService extends BaseService implements IOrderService {
  async getOrders() {
    this.checkRateLimit('orders')
    // Implementation
  }
}
```

### After: Direct service export (40 lines)
```typescript
// orderService.ts
async function getOrders(filters?: OrderFilters) {
  // Direct implementation
  return api.get('/orders', { params: filters })
}

async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return api.patch(`/orders/${orderId}`, { status })
}

export const orderService = {
  getOrders,
  updateOrderStatus,
  // other methods
}
```

**Savings**: -110 lines, -2 files, no inheritance complexity

## 3. Hook Consolidation

### Before: Multiple similar hooks (200+ lines)
```typescript
// useOrderData.ts
export function useOrderData() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    // Fetch logic
  }, [])
  
  return { orders, loading, error }
}

// useOrderHistory.ts
export function useOrderHistory(dateRange: DateRange) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    // Fetch logic
  }, [dateRange])
  
  return { orders, loading, error }
}

// useOrderFilters.ts (similar pattern)
```

### After: Single configurable hook (50 lines)
```typescript
// useOrders.ts
export function useOrders(options: UseOrdersOptions = {}) {
  const { 
    includeHistory = false,
    filters,
    realtime = false,
    dateRange 
  } = options
  
  const query = useQuery({
    queryKey: ['orders', options],
    queryFn: () => includeHistory 
      ? orderService.getOrderHistory(dateRange)
      : orderService.getOrders(filters),
    refetchInterval: realtime ? 5000 : false
  })
  
  return {
    orders: query.data?.orders ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}
```

**Savings**: -150 lines, -2 files, consistent pattern

## 4. Module Structure

### Before: Scattered across features/components/services
```
src/
├── features/
│   ├── kds/
│   └── kiosk-voice-capture/
├── components/
│   ├── shared/
│   └── ui/
├── services/
│   ├── orders/
│   └── api.ts
├── hooks/
└── modules/
    └── orders/
```

### After: Domain-focused modules
```
src/
└── modules/
    ├── orders/
    │   ├── api.ts          # Service layer
    │   ├── types.ts        # Domain types
    │   ├── hooks.ts        # useOrders
    │   ├── components.tsx  # OrderCard, OrderList
    │   └── index.ts        # Public API
    ├── kitchen/
    │   ├── api.ts
    │   ├── types.ts
    │   ├── hooks.ts
    │   ├── components.tsx
    │   └── index.ts
    └── core/              # True shared code only
```

**Savings**: -50% directory nesting, clearer boundaries

## 5. Removing Trivial Tests

### Before: Testing implementation details
```typescript
// OrderNumber.test.tsx (40 lines)
describe('OrderNumber', () => {
  it('renders order number', () => {
    render(<OrderNumber orderNumber="123" />)
    expect(screen.getByText('Order #123')).toBeInTheDocument()
  })
  
  it('applies size classes', () => {
    render(<OrderNumber orderNumber="123" size="lg" />)
    expect(screen.getByText('Order #123')).toHaveClass('text-lg')
  })
  
  // More trivial tests...
})
```

### After: Test business logic only
```typescript
// orders.test.ts (focus on behavior)
describe('Order Management', () => {
  it('updates order status and notifies subscribers', async () => {
    const order = await orderService.updateStatus('123', 'ready')
    expect(order.status).toBe('ready')
    expect(mockSubscriber).toHaveBeenCalledWith(order)
  })
})
```

**Savings**: -60% test files, faster test suite

## Summary Impact

### Before
- 229 files
- ~15,000 lines of code
- 400KB bundle
- 6.5s test suite

### After (Projected)
- ~140 files (-39%)
- ~9,000 lines of code (-40%)
- ~250KB bundle (-37%)
- ~3s test suite (-54%)

### Key Principles Applied
1. **Inline trivial components** - If it's just styled HTML, don't abstract it
2. **Direct exports over factories** - No patterns without purpose
3. **One way to do things** - Consolidate similar patterns
4. **Co-locate by domain** - Keep related code together
5. **Test behavior, not implementation** - Focus on what matters

The result is a leaner, more maintainable codebase that's easier to navigate and understand.