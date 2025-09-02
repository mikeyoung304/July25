# Frontend Agent Report: Your Restaurant's Dining Room Tour

## Welcome to the Dining Room, Mike!
Your frontend is like the dining room of your restaurant - it's where customers interact, servers work, and the magic becomes visible. Built with React 19.1.0, it's modern, fast, and beautiful!

## The Frontend Map (Restaurant Areas)

```
Restaurant OS Frontend (localhost:5173)
│
├── 🏠 HomePage - The entrance/lobby
├── 🍔 KioskPage - Self-service ordering station  
├── 📱 Dashboard - Manager's office
├── 🖥️ KitchenDisplay - Kitchen screens
├── 📦 ExpoPage - Food pickup counter
├── 💳 CheckoutPage - The cash register
├── 👤 Login/PinLogin - Staff entrance
├── 🚗 DriveThruPage - Drive-thru window
└── 📊 PerformanceDashboard - Analytics room
```

## The Context System (Shared Clipboards)

Think of contexts like clipboards that all staff can see:

### 1. UnifiedCartContext - The Order Clipboard
```typescript
// THE most important context - everyone's cart
import { useUnifiedCart } from '@/contexts/UnifiedCartContext';

const cart = useUnifiedCart();
cart.addItem(item);
cart.removeItem(id);
cart.clearCart();
cart.getTotal();

// Aliases for backward compatibility
useCart() === useUnifiedCart()
useKioskCart() === useUnifiedCart()
```

### 2. RestaurantContext - Which Restaurant?
```typescript
// Knows which restaurant we're in
const { restaurant, setRestaurant } = useRestaurant();
// Every API call uses this automatically!
```

### 3. AuthContext - Who's Working?
```typescript
// Tracks logged-in user
const { user, login, logout, isAuthenticated } = useAuth();
```

### 4. RoleContext - What Can They Do?
```typescript
// Permission checking
const { hasPermission, currentRole } = useRole();
if (hasPermission('payment:process')) {
  // Show payment button
}
```

## The Hook Library (Your Utility Belt)

### Essential Hooks You Must Know

#### useApiRequest - Auto-magic API calls
```typescript
// Handles auth, restaurant context, loading, errors
const api = useApiRequest<Order[]>();
const orders = await api.get('/api/v1/orders');
// No need for headers, tokens, error handling!
```

#### useFormValidation - Smart forms
```typescript
// Built-in validation rules
const form = useFormValidation(
  { email: '', phone: '' },
  {
    email: { rules: [validators.required, validators.email] },
    phone: { rules: [validators.phone] }
  }
);
```

#### useModal - Popup management
```typescript
// Handles escape key, scroll lock, focus trap
const modal = useModal({
  closeOnEscape: true,
  preventScroll: true
});
```

#### useDebounce - Prevent API spam
```typescript
// Wait 500ms after user stops typing
const debouncedSearch = useDebounce(searchTerm, 500);
```

#### useToast - Notifications
```typescript
// User-friendly messages
const toast = useToast();
toast.success('Order placed!');
toast.error('Payment failed');
```

#### useConnectionStatus - Network awareness
```typescript
// Know if we're online
const { isOnline, isReconnecting } = useConnectionStatus();
```

#### useKitchenOrdersRealtime - Live orders
```typescript
// WebSocket + REST fallback
const { orders, updateStatus } = useKitchenOrdersRealtime();
```

## Page Components (The Rooms)

### KioskPage - The Self-Service Station
```typescript
// Location: pages/KioskPage.tsx
// Features:
- Menu browsing
- Cart management  
- Voice ordering
- Checkout flow

// Key components:
<MenuGrid />        // Display menu items
<CartDrawer />      // Shopping cart sidebar
<VoiceControlWebRTC /> // Voice ordering
<CheckoutButton />  // Payment trigger
```

### KitchenDisplay - The Kitchen Screens
```typescript
// Multiple versions for different needs:
KitchenDisplayOptimized // Virtual scrolling, 50+ orders
KitchenDisplayMinimal   // Simple, low-resource
KitchenDisplaySimple    // Basic functionality

// Must handle all 7 statuses!
<OrderCard status={order.status} />
```

### Dashboard - The Manager's Office
```typescript
// Central navigation hub
<NavigationCard title="Kitchen" to="/kitchen" />
<NavigationCard title="Orders" to="/order-history" />
<NavigationCard title="Analytics" to="/performance" />
```

### CheckoutPage - The Cash Register
```typescript
// Payment processing central
<TipSlider />           // Tip selection
<PaymentMethodSelector /> // Cash/Card/Terminal
<SquarePaymentForm />   // Card processing
<OrderSummary />        // Final total
```

## Component Architecture

### Error Boundaries (Safety Nets)
```typescript
// Wrap risky components
<PaymentErrorBoundary>
  <CheckoutForm />
</PaymentErrorBoundary>

<KitchenErrorBoundary>
  <KitchenDisplay />
</KitchenErrorBoundary>
```

### Lazy Loading (Performance)
```typescript
// Load pages only when needed
const KioskPage = lazy(() => import('./pages/KioskPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
```

### Protected Routes (Security)
```typescript
// Require authentication
<ProtectedRoute requiredRole="manager">
  <AdminDashboard />
</ProtectedRoute>
```

## State Management Patterns

### Local State - Component-specific
```typescript
const [isLoading, setIsLoading] = useState(false);
const [search, setSearch] = useState('');
```

### Context State - Shared across app
```typescript
// Cart, auth, restaurant - use contexts
const cart = useUnifiedCart();
```

### Server State - From backend
```typescript
// Use React Query pattern
const { data: orders, isLoading } = useOrderHistory();
```

## The UI Component Library

### Typography System
```typescript
// Consistent text styles
<Typography variant="h1">Restaurant OS</Typography>
<Typography variant="body" muted>Subtitle</Typography>
```

### Button Components
```typescript
// Styled, accessible buttons
<Button variant="primary" size="large">
  Place Order
</Button>
<IconButton icon={<CloseIcon />} />
```

### Card System
```typescript
// Container components
<Card>
  <CardHeader>Order #123</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Form Controls
```typescript
// Styled inputs
<Input label="Email" type="email" />
<Select options={options} />
<Slider min={0} max={30} />
```

## Performance Optimizations

### Virtual Scrolling
```typescript
// For long lists (50+ items)
<VirtualizedOrderGrid 
  orders={orders}
  itemHeight={200}
/>
```

### Memoization
```typescript
// Prevent unnecessary re-renders
const OrderCard = React.memo(({ order }) => {
  // Only re-render if order changes
});
```

### Code Splitting
```typescript
// Separate bundles per route
const routes = [
  { path: '/kiosk', component: lazy(() => import('./KioskPage')) },
  { path: '/kitchen', component: lazy(() => import('./KitchenDisplay')) }
];
```

### Image Optimization
```typescript
// Lazy load images
<OptimizedImage 
  src="/menu/burger.jpg"
  loading="lazy"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## Data Flow Patterns

### API → Component
```typescript
// Typical data fetching
const MenuPage = () => {
  const api = useApiRequest();
  const [items, setItems] = useState([]);
  
  useEffect(() => {
    api.get('/api/v1/menu')
       .then(setItems);
  }, []);
  
  return <MenuGrid items={items} />;
};
```

### User Action → State Update
```typescript
// Click → API → Update UI
const handleAddToCart = async (item) => {
  setLoading(true);
  await cart.addItem(item);
  toast.success('Added to cart!');
  setLoading(false);
};
```

### WebSocket → Real-time Update
```typescript
// Server push → Instant UI update
useEffect(() => {
  ws.on('order:updated', (order) => {
    setOrders(prev => 
      prev.map(o => o.id === order.id ? order : o)
    );
  });
}, []);
```

## Mike's Frontend Cheat Sheet

### Quick Component Creation
```typescript
// New page template
const NewPage = () => {
  const api = useApiRequest();
  const toast = useToast();
  const { restaurant } = useRestaurant();
  
  return (
    <PageLayout>
      <PageHeader title="New Feature" />
      {/* Your content */}
    </PageLayout>
  );
};
```

### Common Patterns
```typescript
// Loading state
{isLoading ? <LoadingSpinner /> : <Content />}

// Empty state
{items.length === 0 ? <EmptyState /> : <ItemList />}

// Error handling
{error ? <ErrorDisplay error={error} /> : null}

// Conditional rendering
{user.role === 'manager' && <AdminPanel />}
```

### Debug Helpers
```javascript
// See what's in context
console.log('Cart:', useUnifiedCart());

// Check renders
console.log('Rendering:', Component.name);

// Monitor performance
<PerformanceOverlay />
```

## Testing Your Frontend

```bash
# Run tests
npm run test:client

# Test specific component
npm test MenuGrid

# Test with coverage
npm run test:coverage

# Visual testing
npm run test:visual
```

## Common Frontend Bugs & Fixes

### "Cannot read property of undefined"
```typescript
// BAD
{order.customer.name}

// GOOD
{order?.customer?.name || 'Guest'}
```

### "Too many re-renders"
```typescript
// BAD - Infinite loop
useEffect(() => {
  setData(newData);
}); // Missing deps!

// GOOD
useEffect(() => {
  setData(newData);
}, [newData.id]);
```

### "Hydration mismatch"
```typescript
// Check for browser-only code
if (typeof window !== 'undefined') {
  // Browser-only code here
}
```

## Summary for Course Creation

The frontend is your restaurant's face to the world. Built with:
- **React 19.1.0** for modern UI
- **TypeScript** for type safety
- **Vite** for instant hot reload
- **TailwindCSS** for rapid styling

Key patterns:
1. **Contexts** for shared state (cart, auth, restaurant)
2. **Hooks** for reusable logic
3. **Error boundaries** for resilience
4. **Lazy loading** for performance
5. **Real-time updates** via WebSocket

The frontend is organized like a real restaurant - each page serves a specific purpose (kiosk for ordering, kitchen for cooking, checkout for payment). Everything is connected through the UnifiedCartContext, ensuring a single source of truth for orders.

Remember: **Always use the existing hooks and utilities!** Don't reinvent the wheel - if you need to validate a form, use `useFormValidation`. Need to call an API? Use `useApiRequest`. This DRY (Don't Repeat Yourself) approach keeps the codebase clean and maintainable!