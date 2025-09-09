# State Management Guide

## Overview

The Restaurant OS uses a structured state management approach with React Context API, focusing on performance, type safety, and maintainability. The system is built around several key contexts that handle different aspects of the application state.

## Architecture Principles

### 1. Single Source of Truth
Each domain (cart, auth, restaurant) has one primary context provider that serves as the single source of truth for that data.

### 2. Context Separation
Related state is grouped into logical contexts to prevent unnecessary re-renders and maintain clear boundaries.

### 3. Performance Optimization
Contexts are optimized using React.memo, useMemo, and useCallback to minimize re-renders.

### 4. Type Safety
All contexts are fully typed with TypeScript for better developer experience and runtime safety.

## Core Contexts

### UnifiedCartContext (PRIMARY CART SYSTEM)

**Critical**: This is the ONLY cart system - do not create alternatives or adapters.

```typescript
// client/src/contexts/UnifiedCartContext.tsx
interface UnifiedCartState {
  items: CartItem[];
  total: number;
  subtotal: number;
  tax: number;
  isLoading: boolean;
  error: string | null;
}

interface UnifiedCartActions {
  addItem: (item: MenuItem, customizations?: Customization[]) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  applyDiscount: (discount: Discount) => void;
  removeDiscount: () => void;
}

export interface UnifiedCartContextType extends UnifiedCartState, UnifiedCartActions {
  // Computed properties
  itemCount: number;
  isEmpty: boolean;
  hasItems: boolean;
}
```

#### Usage Examples

```typescript
// Standard usage
import { useUnifiedCart } from '@/contexts/UnifiedCartContext';

const CheckoutPage = () => {
  const { 
    items, 
    total, 
    addItem, 
    removeItem, 
    clearCart,
    itemCount,
    isEmpty 
  } = useUnifiedCart();

  return (
    <div>
      <h2>Cart ({itemCount} items)</h2>
      {isEmpty ? (
        <p>Your cart is empty</p>
      ) : (
        <CartItemsList items={items} onRemove={removeItem} />
      )}
      <div>Total: ${total.toFixed(2)}</div>
    </div>
  );
};

// Alternative hooks (aliases for backward compatibility)
import { useCart, useKioskCart } from '@/contexts/UnifiedCartContext';

// Both useCart() and useKioskCart() return the same UnifiedCartContextType
const { items, addItem } = useCart(); // Same as useUnifiedCart()
const { total, clearCart } = useKioskCart(); // Same as useUnifiedCart()
```

#### Implementation Details

```typescript
// Context implementation with performance optimization
export const UnifiedCartProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [state, setState] = useReducer(cartReducer, initialState);
  
  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    addItem: (item: MenuItem, customizations?: Customization[]) => {
      setState({ 
        type: 'ADD_ITEM', 
        payload: { item, customizations } 
      });
    },
    
    removeItem: (itemId: string) => {
      setState({ type: 'REMOVE_ITEM', payload: itemId });
    },
    
    updateQuantity: (itemId: string, quantity: number) => {
      setState({ 
        type: 'UPDATE_QUANTITY', 
        payload: { itemId, quantity } 
      });
    },
    
    clearCart: () => {
      setState({ type: 'CLEAR_CART' });
    },
  }), []);
  
  // Memoized computed values
  const computedValues = useMemo(() => ({
    itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
    isEmpty: state.items.length === 0,
    hasItems: state.items.length > 0,
  }), [state.items]);
  
  const contextValue = useMemo(() => ({
    ...state,
    ...actions,
    ...computedValues,
  }), [state, actions, computedValues]);
  
  return (
    <UnifiedCartContext.Provider value={contextValue}>
      {children}
    </UnifiedCartContext.Provider>
  );
};
```

### AuthContext

```typescript
// client/src/contexts/AuthContext.tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  role: UserRole | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export interface AuthContextType extends AuthState, AuthActions {
  // Permission checking utilities
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}
```

#### Usage Examples

```typescript
import { useAuth } from '@/contexts/AuthContext';

const ProtectedComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    hasPermission, 
    hasRole,
    logout 
  } = useAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      
      {hasPermission('orders:create') && (
        <CreateOrderButton />
      )}
      
      {hasRole('manager') && (
        <ManagerDashboard />
      )}
      
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### RestaurantContext

```typescript
// client/src/contexts/RestaurantContext.tsx
interface RestaurantState {
  currentRestaurant: Restaurant | null;
  restaurants: Restaurant[];
  isLoading: boolean;
  error: string | null;
}

interface RestaurantActions {
  selectRestaurant: (restaurantId: string) => void;
  loadRestaurants: () => Promise<void>;
  updateRestaurant: (restaurant: Partial<Restaurant>) => void;
}

export interface RestaurantContextType extends RestaurantState, RestaurantActions {
  // Computed properties
  restaurantId: string | null;
  isMultiTenant: boolean;
}
```

#### Multi-Tenancy Pattern

```typescript
// Always include restaurant_id in API calls
import { useRestaurant } from '@/contexts/RestaurantContext';

const useApiWithRestaurant = () => {
  const { restaurantId } = useRestaurant();
  
  const apiCall = useCallback(async (endpoint: string, data?: any) => {
    if (!restaurantId) {
      throw new Error('No restaurant selected');
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': restaurantId, // Multi-tenancy header
      },
      body: JSON.stringify({
        ...data,
        restaurant_id: restaurantId, // Also in body for some APIs
      }),
    });
    
    return response.json();
  }, [restaurantId]);
  
  return { apiCall };
};
```

## Performance Optimization Patterns

### 1. Context Splitting

```typescript
// Split large contexts into smaller, focused ones
// BAD: One large context
interface AppState {
  user: User;
  cart: Cart;
  restaurant: Restaurant;
  menu: MenuItem[];
  orders: Order[];
}

// GOOD: Separate contexts
const AuthContext = createContext<AuthContextType>();
const CartContext = createContext<CartContextType>();
const RestaurantContext = createContext<RestaurantContextType>();
```

### 2. Selector Pattern

```typescript
// Use selectors to prevent unnecessary re-renders
export const useCartItems = () => {
  const { items } = useUnifiedCart();
  return items;
};

export const useCartTotal = () => {
  const { total } = useUnifiedCart();
  return total;
};

export const useCartCount = () => {
  const { itemCount } = useUnifiedCart();
  return itemCount;
};
```

### 3. Memoization

```typescript
// Memoize expensive computations
const CartProvider: React.FC = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Expensive calculation memoized
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const customizationTotal = item.customizations?.reduce(
        (cSum, customization) => cSum + customization.price, 
        0
      ) || 0;
      return sum + itemTotal + customizationTotal;
    }, 0);
  }, [items]);
  
  // Actions memoized to prevent recreation
  const addItem = useCallback((newItem: MenuItem) => {
    setItems(prevItems => [...prevItems, newItem]);
  }, []);
  
  return (
    <CartContext.Provider value={{ items, total, addItem }}>
      {children}
    </CartContext.Provider>
  );
};
```

### 4. React.memo for Components

```typescript
// Prevent unnecessary re-renders of child components
export const CartItem = React.memo<CartItemProps>(({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}) => {
  return (
    <div className="cart-item">
      <span>{item.name}</span>
      <span>${item.price.toFixed(2)}</span>
      <QuantityControls 
        quantity={item.quantity}
        onUpdate={onUpdateQuantity}
      />
      <button onClick={() => onRemove(item.id)}>Remove</button>
    </div>
  );
});
```

## State Persistence

### Local Storage Integration

```typescript
// Persist cart state to localStorage
const usePersistedCart = () => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart-items');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('cart-items', JSON.stringify(items));
  }, [items]);
  
  return [items, setItems] as const;
};
```

### Session Storage for Temporary Data

```typescript
// Store demo auth tokens temporarily
const useDemoAuth = () => {
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('DEMO_AUTH_TOKEN');
  });
  
  const clearToken = useCallback(() => {
    sessionStorage.removeItem('DEMO_AUTH_TOKEN');
    setToken(null);
  }, []);
  
  return { token, setToken, clearToken };
};
```

## Error Handling in State

### Context Error Boundaries

```typescript
interface ErrorState {
  hasError: boolean;
  error: Error | null;
}

class ContextErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Context error:', error, errorInfo);
    // Send to error tracking service
    Sentry.captureException(error, {
      contexts: { errorInfo }
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    
    return this.props.children;
  }
}
```

### Graceful Error Recovery

```typescript
const useErrorRecovery = () => {
  const [error, setError] = useState<Error | null>(null);
  
  const handleError = useCallback((error: Error) => {
    setError(error);
    
    // Log error
    console.error('State error:', error);
    
    // Send to monitoring service
    Sentry.captureException(error);
    
    // Auto-recovery after timeout
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return { error, handleError, clearError };
};
```

## Testing State Management

### Context Testing Utilities

```typescript
// test/utils/context-wrapper.tsx
export const createContextWrapper = (contextValue: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <TestContext.Provider value={contextValue}>
      {children}
    </TestContext.Provider>
  );
};

// Usage in tests
import { render, screen } from '@testing-library/react';
import { createContextWrapper } from '@/test/utils/context-wrapper';

describe('CartComponent', () => {
  it('displays cart items correctly', () => {
    const mockCartContext = {
      items: [{ id: '1', name: 'Burger', price: 10.99, quantity: 1 }],
      total: 10.99,
      addItem: jest.fn(),
      removeItem: jest.fn(),
    };
    
    const Wrapper = createContextWrapper(mockCartContext);
    
    render(
      <Wrapper>
        <CartComponent />
      </Wrapper>
    );
    
    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('$10.99')).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
// test/integration/cart-flow.test.tsx
describe('Cart Integration', () => {
  it('should handle complete cart flow', async () => {
    render(
      <UnifiedCartProvider>
        <MenuPage />
        <CartPage />
        <CheckoutPage />
      </UnifiedCartProvider>
    );
    
    // Add item to cart
    await user.click(screen.getByText('Add Burger'));
    
    // Navigate to cart
    await user.click(screen.getByText('View Cart'));
    
    // Verify item in cart
    expect(screen.getByText('Burger')).toBeInTheDocument();
    
    // Proceed to checkout
    await user.click(screen.getByText('Checkout'));
    
    // Verify total
    expect(screen.getByText('Total: $10.99')).toBeInTheDocument();
  });
});
```

## Best Practices

### 1. Context Composition

```typescript
// Compose multiple providers for clean organization
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => (
  <AuthProvider>
    <RestaurantProvider>
      <UnifiedCartProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </UnifiedCartProvider>
    </RestaurantProvider>
  </AuthProvider>
);
```

### 2. Custom Hook Patterns

```typescript
// Create domain-specific hooks
export const useOrderManagement = () => {
  const { user, hasPermission } = useAuth();
  const { restaurantId } = useRestaurant();
  const { items, clearCart } = useUnifiedCart();
  
  const canCreateOrder = hasPermission('orders:create');
  const canModifyOrder = hasPermission('orders:modify');
  
  const createOrder = useCallback(async () => {
    if (!canCreateOrder || !restaurantId) return;
    
    const order = await orderAPI.create({
      restaurant_id: restaurantId,
      items,
      customer_id: user?.id,
    });
    
    clearCart();
    return order;
  }, [canCreateOrder, restaurantId, items, user, clearCart]);
  
  return {
    canCreateOrder,
    canModifyOrder,
    createOrder,
  };
};
```

### 3. Type Safety

```typescript
// Use discriminated unions for actions
type CartAction =
  | { type: 'ADD_ITEM'; payload: { item: MenuItem; customizations?: Customization[] } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'APPLY_DISCOUNT'; payload: Discount }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const cartReducer = (state: UnifiedCartState, action: CartAction): UnifiedCartState => {
  switch (action.type) {
    case 'ADD_ITEM':
      // TypeScript knows payload has item and optional customizations
      return addItemToCart(state, action.payload.item, action.payload.customizations);
      
    case 'REMOVE_ITEM':
      // TypeScript knows payload is a string
      return removeItemFromCart(state, action.payload);
      
    default:
      return state;
  }
};
```

## Common Anti-Patterns to Avoid

### ❌ DON'T: Create Multiple Cart Systems

```typescript
// BAD - Multiple competing cart implementations
const KioskCartContext = createContext();
const OnlineCartContext = createContext();
const RestaurantCartContext = createContext();

// Creates confusion and data sync issues
```

### ❌ DON'T: Put Everything in One Context

```typescript
// BAD - Massive monolithic context
interface AppState {
  user: User;
  cart: Cart;
  menu: MenuItem[];
  orders: Order[];
  payments: Payment[];
  inventory: InventoryItem[];
  settings: AppSettings;
}
```

### ❌ DON'T: Ignore Performance

```typescript
// BAD - Recreating objects on every render
const contextValue = {
  items,
  addItem: (item) => setItems([...items, item]), // New function every render
  total: items.reduce((sum, item) => sum + item.price, 0), // Recalculated every render
};
```

### ✅ DO: Follow Established Patterns

```typescript
// GOOD - Use UnifiedCartContext for all cart operations
import { useUnifiedCart } from '@/contexts/UnifiedCartContext';

const MyComponent = () => {
  const { items, addItem, total } = useUnifiedCart();
  // Single source of truth, optimized performance
};
```