# Client - Restaurant OS Frontend

## Overview

The client application is a modern React-based restaurant management system featuring a revolutionary Kitchen Display System (KDS), Point of Sale (POS), and Expo station with advanced table consolidation.

## Authentication

The client uses **Supabase authentication exclusively** - test tokens and demo authentication have been completely removed for security.

### Authentication Methods
- **Email/Password**: For managers and owners
- **PIN Authentication**: For service staff (4-6 digit PINs)
- **Station Login**: For kitchen and expo stations
- **Anonymous Sessions**: For customer kiosks

### Important Notes
- Test tokens (`test-token`) are no longer accepted
- Restaurant ID must be explicitly provided during login
- All API calls require valid Supabase JWT tokens
- WebSocket connections require authentication

## Architecture

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── kitchen/         # KDS components (TableGroupCard, StationStatusBar)
│   │   ├── kiosk/           # Self-service kiosk components
│   │   ├── ui/              # Base UI components (Button, Card, etc.)
│   │   └── errors/          # Error boundaries and handlers
│   ├── pages/              # Route-level components
│   │   ├── KitchenDisplayOptimized.tsx    # Main KDS view
│   │   ├── ExpoConsolidated.tsx          # Table consolidation view
│   │   └── CheckoutPage.tsx              # POS checkout
│   ├── hooks/              # Custom React hooks
│   │   ├── useTableGrouping.ts           # Intelligent order grouping
│   │   ├── useKitchenOrdersOptimized.ts  # Real-time order management
│   │   └── useApiRequest.ts              # DRY API wrapper
│   ├── services/           # External service integrations
│   │   ├── websocket/      # Real-time WebSocket handlers
│   │   ├── api/            # REST API services
│   │   └── logger/         # Logging utilities
│   ├── modules/            # Feature modules
│   │   ├── voice/          # WebRTC voice ordering
│   │   ├── order-system/   # Order management
│   │   └── floor-plan/     # Table management
│   └── contexts/           # React contexts
│       ├── UnifiedCartContext.tsx
│       └── RestaurantContext.tsx
├── public/                 # Static assets
└── dist/                   # Production build output
```

## Key Features

### 🎯 Kitchen Display System (KDS)
- **Prominent Table Badges**: 16x16 pixel badges visible from 10+ feet
- **Intelligent Table Grouping**: Automatic consolidation of same-table orders
- **Station Tracking**: Real-time progress indicators for each kitchen station
- **Urgency Management**: Color-coded and animated alerts for time-sensitive orders
- **Virtual Scrolling**: Handles 1000+ orders without performance degradation

### 📦 Order Management
- **7 Order Statuses**: new, pending, confirmed, preparing, ready, completed, cancelled
- **Real-time Updates**: WebSocket-based instant synchronization
- **Table Association**: Smart linking of orders to tables
- **Batch Operations**: Complete entire tables with one action

### 🎨 Visual Design System
- **Color Coding**:
  - Blue gradient: Dine-in orders
  - Orange gradient: Takeout orders
  - Green gradient: Delivery orders
  - Purple gradient: Drive-thru orders
- **Urgency Indicators**:
  - Green: <10 minutes
  - Yellow: 10-15 minutes
  - Orange: 15-20 minutes
  - Red pulse: >20 minutes

### 🔧 DRY Utilities

#### useApiRequest Hook
```typescript
import { useApiRequest } from '@/hooks/useApiRequest'

const api = useApiRequest<Order[]>()
const orders = await api.get('/api/v1/orders')
```

#### useFormValidation Hook
```typescript
import { useFormValidation, validators } from '@/utils/validation'

const form = useFormValidation(initialValues, validationRules)
```

#### useModal Hook
```typescript
import { useModal } from '@/hooks/useModal'

const modal = useModal({ closeOnEscape: true })
```

## Performance Optimizations

- **Bundle Size**: Main chunk reduced to 93KB (from 1MB)
- **Memory Usage**: Optimized to 4GB max (from 12GB)
- **Code Splitting**: Lazy loading for routes
- **React.memo**: Strategic memoization
- **Virtual Scrolling**: Efficient large list rendering

## Development

### Prerequisites
```bash
# Node.js 18+ required
node --version

# Install dependencies
npm install
```

### Available Scripts
```bash
npm run dev          # Start development server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run typecheck    # TypeScript validation
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix linting issues
npm test            # Run test suite
npm run analyze     # Bundle size analysis
```

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

## Authentication

The client uses a unified authentication system powered by Supabase with multiple authentication methods:

### Authentication Methods

1. **Email/Password Authentication** - For managers and administrative users
2. **PIN Code Authentication** - For service staff (4-6 digits, restaurant-scoped)
3. **Station Authentication** - For Kitchen/Expo stations (shared device authentication)

### User Roles & Access Levels

- **Owner**: Full system access, financial reports, multi-location management
- **Manager**: Restaurant operations, reports, staff management  
- **Server**: Order creation, payment processing, table management
- **Cashier**: Payment processing, limited order access
- **Kitchen**: Kitchen display only, order status updates
- **Expo**: Expo display, order completion
- **Customer**: Self-service ordering (kiosk/online/QR)

### Implementation

The authentication system is implemented through:

- **AuthContext** (`/src/contexts/AuthContext.tsx`) - Main authentication provider
- **useAuth Hook** (`/src/contexts/auth.hooks.ts`) - Hook for accessing auth state
- **JWT Tokens** - RS256 signed tokens with proper expiration handling
- **Auto-refresh** - Automatic token refresh 5 minutes before expiry

### Usage Example

```typescript
import { useAuth } from '@/contexts/auth.hooks'

function MyComponent() {
  const { user, isAuthenticated, hasScope, login, logout } = useAuth()
  
  // Check authentication
  if (!isAuthenticated) {
    return <LoginForm />
  }
  
  // Check permissions
  if (!hasScope('orders:create')) {
    return <AccessDenied />
  }
  
  return <OrderForm />
}
```

### Security Features

- **Session Management**: 8-hour sessions for managers, 12-hour for staff
- **Secure Cookies**: HttpOnly, Secure, SameSite cookies
- **Rate Limiting**: Protection on all auth endpoints
- **Audit Logging**: All authentication events are logged
- **CSRF Protection**: Built-in CSRF token validation

### Migration from Demo Authentication

**IMPORTANT**: Demo authentication tokens are no longer supported. The system now exclusively uses Supabase-based authentication.

- ❌ **Removed**: `getDemoToken()` function calls
- ❌ **Removed**: Test token generation and validation
- ✅ **Current**: Proper Supabase authentication with JWT tokens
- ✅ **Current**: Role-based access control with scopes

If you encounter 403 errors, clear your browser session storage:
```javascript
sessionStorage.removeItem('DEMO_AUTH_TOKEN')
localStorage.clear()
```

## Testing

### Unit Tests
```bash
npm test                     # Run all tests
npm run test:coverage       # With coverage report
npm run test:watch         # Watch mode
```

### E2E Testing
```bash
npm run test:e2e           # Cypress tests
```

## Error Handling

The application implements a 3-tier error boundary system:
1. **Page-level**: Catches route-level errors
2. **Section-level**: Isolates component group failures
3. **Component-level**: Handles individual component errors

## WebSocket Events

### Subscribed Events
- `order:created` - New order received
- `order:updated` - Order details changed
- `order:status_changed` - Status update
- `order:deleted` - Order removed
- `connection:status` - Connection state

### Emitted Events
- `orders:sync` - Request full sync
- `order:update_status` - Change order status
- `table:complete` - Complete all table orders

## Browser Support

- Chrome 90+ (recommended)
- Safari 14+
- Firefox 88+
- Edge 90+

## Troubleshooting

### Common Issues

**WebSocket Connection Failed**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Verify WebSocket URL
echo $VITE_WEBSOCKET_URL
```

**TypeScript Errors**
```bash
# Clear cache and rebuild
rm -rf node_modules/.vite
npm run typecheck
```

**Memory Issues**
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

## Contributing

See [CONTRIBUTING.md](../docs/06-development/contributing.md) for development guidelines.

## License

Proprietary - All rights reserved