# Hooks Reference Guide

## Overview

This document provides comprehensive documentation for all custom React hooks in the Restaurant OS client application.

## Core Hooks

### useApiRequest
Location: `/client/src/hooks/useApiRequest.ts`

**Purpose**: Provides a unified interface for making API requests with automatic authentication, loading states, and error handling.

**Parameters**: None (uses auth context internally)

**Returns**:
```typescript
{
  get: <T>(url: string) => Promise<T>
  post: <T>(url: string, data: any) => Promise<T>
  put: <T>(url: string, data: any) => Promise<T>
  delete: <T>(url: string) => Promise<T>
  loading: boolean
  error: Error | null
}
```

**Usage**:
```typescript
import { useApiRequest } from '@/hooks/useApiRequest';

function OrderList() {
  const api = useApiRequest();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchOrders() {
      const data = await api.get('/api/v1/orders');
      setOrders(data);
    }
    fetchOrders();
  }, []);

  if (api.loading) return <Spinner />;
  if (api.error) return <Error message={api.error.message} />;
  
  return <OrderGrid orders={orders} />;
}
```

### useFormValidation
Location: `/client/src/utils/validation.ts`

**Purpose**: Handles form state, validation, and error management with built-in validators.

**Parameters**:
```typescript
initialValues: Record<string, any>
validationRules: Record<string, ValidationRule[]>
```

**Returns**:
```typescript
{
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  setFieldValue: (field: string, value: any) => void
  setFieldError: (field: string, error: string) => void
  validateField: (field: string) => boolean
  validateForm: () => boolean
  resetForm: () => void
}
```

**Usage**:
```typescript
import { useFormValidation, validators } from '@/utils/validation';

function LoginForm() {
  const form = useFormValidation(
    { email: '', password: '' },
    {
      email: [validators.required, validators.email],
      password: [validators.required, validators.minLength(8)]
    }
  );

  const handleSubmit = () => {
    if (form.validateForm()) {
      // Submit form
    }
  };

  return (
    <form>
      <Input
        value={form.values.email}
        onChange={(e) => form.setFieldValue('email', e.target.value)}
        error={form.errors.email}
      />
    </form>
  );
}
```

### useModal
Location: `/client/src/hooks/useModal.ts`

**Purpose**: Manages modal state with keyboard shortcuts and focus management.

**Parameters**:
```typescript
{
  closeOnEscape?: boolean
  preventScroll?: boolean
  onOpen?: () => void
  onClose?: () => void
}
```

**Returns**:
```typescript
{
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}
```

**Usage**:
```typescript
import { useModal } from '@/hooks/useModal';

function OrderDetails() {
  const modal = useModal({ closeOnEscape: true });

  return (
    <>
      <Button onClick={modal.open}>View Details</Button>
      {modal.isOpen && (
        <Modal onClose={modal.close}>
          <OrderInfo />
        </Modal>
      )}
    </>
  );
}
```

## Performance Hooks

### useDebounce
Location: `/client/src/hooks/useDebounce.ts`

**Purpose**: Debounces a value to limit update frequency.

**Parameters**:
```typescript
value: T
delay: number (milliseconds)
```

**Returns**: `T` (debounced value)

**Usage**:
```typescript
import { useDebounce } from '@/hooks/useDebounce';

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  return <Input onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

### useThrottle
Location: `/client/src/hooks/useThrottle.ts`

**Purpose**: Throttles a callback function to limit execution frequency.

**Parameters**:
```typescript
callback: (...args: any[]) => void
delay: number
```

**Returns**: Throttled function

**Usage**:
```typescript
import { useThrottle } from '@/hooks/useThrottle';

function ScrollHandler() {
  const handleScroll = useThrottle(() => {
    console.log('Scrolled');
  }, 100);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}
```

### useVirtualization
Location: `/client/src/hooks/useVirtualization.ts`

**Purpose**: Implements virtual scrolling for large lists.

**Parameters**:
```typescript
{
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}
```

**Returns**:
```typescript
{
  visibleItems: T[]
  totalHeight: number
  offsetY: number
  startIndex: number
  endIndex: number
}
```

**Usage**:
```typescript
import { useVirtualization } from '@/hooks/useVirtualization';

function LargeOrderList({ orders }) {
  const { visibleItems, totalHeight, offsetY } = useVirtualization({
    items: orders,
    itemHeight: 100,
    containerHeight: 800
  });

  return (
    <div style={{ height: 800, overflow: 'auto' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      </div>
    </div>
  );
}
```

## State Management Hooks

### useAsyncState
Location: `/client/src/hooks/useAsyncState.ts`

**Purpose**: Manages async operations with loading, error, and data states.

**Parameters**:
```typescript
asyncFunction: () => Promise<T>
immediate?: boolean
```

**Returns**:
```typescript
{
  data: T | null
  loading: boolean
  error: Error | null
  execute: () => Promise<void>
  reset: () => void
}
```

**Usage**:
```typescript
import { useAsyncState } from '@/hooks/useAsyncState';

function UserProfile() {
  const { data: user, loading, error, execute } = useAsyncState(
    () => fetchUserProfile(),
    true // Execute immediately
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <ProfileCard user={user} onRefresh={execute} />;
}
```

### useLocalStorage
Location: `/client/src/hooks/useLocalStorage.ts`

**Purpose**: Syncs state with localStorage with automatic serialization.

**Parameters**:
```typescript
key: string
initialValue: T
```

**Returns**:
```typescript
[value: T, setValue: (value: T) => void, removeValue: () => void]
```

**Usage**:
```typescript
import { useLocalStorage } from '@/hooks/useLocalStorage';

function Settings() {
  const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### useSessionStorage
Location: `/client/src/hooks/useSessionStorage.ts`

**Purpose**: Syncs state with sessionStorage with automatic serialization.

**Parameters**: Same as useLocalStorage

**Returns**: Same as useLocalStorage

**Usage**: Same pattern as useLocalStorage

## UI/UX Hooks

### useIntersectionObserver
Location: `/client/src/hooks/useIntersectionObserver.ts`

**Purpose**: Observes element visibility for lazy loading and animations.

**Parameters**:
```typescript
{
  threshold?: number
  root?: Element
  rootMargin?: string
}
```

**Returns**:
```typescript
{
  ref: RefObject<Element>
  isIntersecting: boolean
  entry: IntersectionObserverEntry | null
}
```

**Usage**:
```typescript
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

function LazyImage({ src, alt }) {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <div ref={ref}>
      {isIntersecting ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="placeholder" />
      )}
    </div>
  );
}
```

### useFocusManagement
Location: `/client/src/hooks/useFocusManagement.ts`

**Purpose**: Manages focus for accessibility and keyboard navigation.

**Parameters**:
```typescript
{
  restoreFocus?: boolean
  autoFocus?: boolean
  trapFocus?: boolean
}
```

**Returns**:
```typescript
{
  setFocus: (element: HTMLElement) => void
  previousFocus: HTMLElement | null
  restorePreviousFocus: () => void
}
```

**Usage**:
```typescript
import { useFocusManagement } from '@/hooks/useFocusManagement';

function Modal({ isOpen, children }) {
  const { setFocus, restorePreviousFocus } = useFocusManagement({
    restoreFocus: true,
    trapFocus: true
  });

  useEffect(() => {
    if (isOpen) {
      const firstInput = document.querySelector('input');
      if (firstInput) setFocus(firstInput);
    }
    return () => restorePreviousFocus();
  }, [isOpen]);

  return isOpen ? <div>{children}</div> : null;
}
```

### useMediaQuery
Location: `/client/src/hooks/useMediaQuery.ts`

**Purpose**: Responds to CSS media query changes.

**Parameters**:
```typescript
query: string
```

**Returns**: `boolean`

**Usage**:
```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery';

function ResponsiveNav() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

## Kitchen Display Hooks

### useKitchenOrdersOptimized
Location: `/client/src/hooks/useKitchenOrdersOptimized.ts`

**Purpose**: Manages kitchen orders with real-time updates and optimizations.

**Parameters**:
```typescript
{
  stationId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}
```

**Returns**:
```typescript
{
  orders: Order[]
  loading: boolean
  error: Error | null
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  refreshOrders: () => void
}
```

**Usage**:
```typescript
import { useKitchenOrdersOptimized } from '@/hooks/useKitchenOrdersOptimized';

function KitchenDisplay() {
  const { orders, updateOrderStatus } = useKitchenOrdersOptimized({
    stationId: 'grill',
    autoRefresh: true
  });

  return (
    <OrderGrid
      orders={orders}
      onStatusChange={updateOrderStatus}
    />
  );
}
```

### useTableGrouping
Location: `/client/src/hooks/useTableGrouping.ts`

**Purpose**: Groups orders by table for consolidated display.

**Parameters**:
```typescript
orders: Order[]
```

**Returns**:
```typescript
Map<string, Order[]>
```

**Usage**:
```typescript
import { useTableGrouping } from '@/hooks/useTableGrouping';

function ExpoStation({ orders }) {
  const groupedOrders = useTableGrouping(orders);

  return (
    <>
      {Array.from(groupedOrders).map(([table, tableOrders]) => (
        <TableGroup key={table} table={table} orders={tableOrders} />
      ))}
    </>
  );
}
```

## Error Handling Hooks

### useErrorHandler
Location: `/client/src/hooks/useErrorHandler.ts`

**Purpose**: Centralized error handling with logging and user feedback.

**Parameters**:
```typescript
{
  logErrors?: boolean
  showToast?: boolean
  onError?: (error: Error) => void
}
```

**Returns**:
```typescript
{
  error: Error | null
  clearError: () => void
  handleError: (error: Error) => void
}
```

**Usage**:
```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function RiskyComponent() {
  const { error, handleError, clearError } = useErrorHandler({
    showToast: true
  });

  const performRiskyOperation = async () => {
    try {
      await riskyApiCall();
    } catch (err) {
      handleError(err);
    }
  };

  if (error) {
    return <ErrorBoundary error={error} onRetry={clearError} />;
  }

  return <Button onClick={performRiskyOperation}>Try It</Button>;
}
```

## Network Hooks

### useOfflineQueue
Location: `/client/src/hooks/useOfflineQueue.ts`

**Purpose**: Queues operations when offline and syncs when online.

**Parameters**:
```typescript
{
  maxRetries?: number
  retryDelay?: number
}
```

**Returns**:
```typescript
{
  isOnline: boolean
  queue: QueuedOperation[]
  addToQueue: (operation: () => Promise<any>) => void
  processQueue: () => Promise<void>
  clearQueue: () => void
}
```

**Usage**:
```typescript
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

function OfflineCapableForm() {
  const { isOnline, addToQueue } = useOfflineQueue();

  const handleSubmit = async (data) => {
    const operation = () => submitOrder(data);
    
    if (isOnline) {
      await operation();
    } else {
      addToQueue(operation);
      toast.info('Order queued - will submit when online');
    }
  };

  return <OrderForm onSubmit={handleSubmit} />;
}
```

## Performance Monitoring Hooks

### usePerformanceMonitor
Location: `/client/src/hooks/usePerformanceMonitor.ts`

**Purpose**: Monitors component performance metrics.

**Parameters**:
```typescript
componentName: string
```

**Returns**:
```typescript
{
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  logPerformance: () => void
}
```

**Usage**:
```typescript
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

function ExpensiveComponent() {
  const perf = usePerformanceMonitor('ExpensiveComponent');

  useEffect(() => {
    if (perf.renderCount > 10 && perf.averageRenderTime > 16) {
      console.warn('Performance issue detected');
    }
  }, [perf]);

  return <ComplexUI />;
}
```

## Authentication Hooks

### useAuth
Location: `/client/src/contexts/auth.hooks.ts`

**Purpose**: Provides authentication state and methods.

**Returns**:
```typescript
{
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithPin: (pin: string, restaurantId: string) => Promise<void>
  loginAsStation: (type: string, name: string, restaurantId: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}
```

**Usage**:
```typescript
import { useAuth } from '@/contexts/auth.hooks';

function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header>
      {isAuthenticated ? (
        <>
          <span>Welcome, {user.name}</span>
          <Button onClick={logout}>Logout</Button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </header>
  );
}
```

## Cart Management Hooks

### useCart / useUnifiedCart
Location: `/client/src/contexts/cart.hooks.ts`

**Purpose**: Manages shopping cart state and operations.

**Returns**:
```typescript
{
  cart: Cart
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}
```

**Usage**:
```typescript
import { useCart } from '@/contexts/cart.hooks';

function ShoppingCart() {
  const { cart, removeItem, total } = useCart();

  return (
    <div>
      {cart.items.map(item => (
        <CartItem
          key={item.id}
          item={item}
          onRemove={() => removeItem(item.id)}
        />
      ))}
      <div>Total: ${total}</div>
    </div>
  );
}
```

## Best Practices

1. **Naming Convention**: Use `use` prefix for all hooks
2. **Single Responsibility**: Each hook should have one clear purpose
3. **Error Handling**: Always handle errors gracefully
4. **Cleanup**: Return cleanup functions in useEffect
5. **Memoization**: Use useMemo/useCallback where appropriate
6. **Testing**: Write unit tests for all hooks
7. **Documentation**: Include JSDoc comments for complex hooks
8. **Type Safety**: Use TypeScript for all hook definitions

## Creating Custom Hooks

### Template
```typescript
import { useState, useEffect, useCallback } from 'react';

export function useCustomHook<T>(
  initialValue: T,
  options?: HookOptions
): HookReturn<T> {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup logic
    };
  }, [/* dependencies */]);

  const updateState = useCallback((newValue: T) => {
    setState(newValue);
  }, []);

  return {
    state,
    updateState
  };
}
```

## Testing Hooks

Use `@testing-library/react-hooks` for testing:

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```