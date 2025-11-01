# Client - Restaurant OS Frontend


**Last Updated:** 2025-10-27

## Overview

The client application is a modern React-based restaurant management system featuring a revolutionary Kitchen Display System (KDS), Point of Sale (POS), and Expo station with advanced table consolidation.

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
VITE_DEMO_PANEL=0                    # Enable demo mode (default: 0)
```

## Workspace Landing

The application uses a workspace-based landing page that presents 6 workspace tiles upfront (Server, Kitchen, Kiosk, Online Order, Admin, Expo).

### Architecture
- **Root Route (`/`)**: WorkspaceDashboard with 6 workspace tiles
- **Protected Workspaces**: Server, Kitchen, Admin, Expo (require authentication via modal)
- **Public Workspaces**: Kiosk, Online Order (immediate access, no authentication)

### Demo Mode
When `VITE_DEMO_PANEL=1`, clicking protected workspace tiles pre-fills role-specific credentials:
- Server → server@restaurant.com / Demo123!
- Kitchen → kitchen@restaurant.com / Demo123!
- Expo → expo@restaurant.com / Demo123!
- Admin → manager@restaurant.com / Demo123!

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

## Project Documentation

- [Phase 2 Quick Wins Summary](./PHASE_2_QUICK_WINS_SUMMARY.md) - Summary of Phase 2 optimization improvements

## Contributing

See [CONTRIBUTING.md](../docs/how-to/development/CONTRIBUTING.md) for development guidelines.

## License

Proprietary - All rights reserved