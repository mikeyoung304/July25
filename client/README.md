# Client - Restaurant OS Frontend

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
VITE_WORKSPACE_LANDING_ENABLED=0    # Enable new workspace dashboard (default: 0)
VITE_DEMO_PANEL=0                    # Enable demo mode (default: 0)
```

## Workspace Landing (Feature Flag)

The application supports a new workspace-based landing experience that eliminates authentication confusion by presenting workspace tiles upfront.

### Enabling the Feature
Set `VITE_WORKSPACE_LANDING_ENABLED=1` in your `.env` file to enable the new landing flow.

### Architecture
When enabled:
- **Root Route (`/`)**: Displays WorkspaceDashboard with 6 workspace tiles
- **Old Landing (`/welcome`)**: Preserved for fallback
- **Protected Workspaces**: Server, Kitchen, Admin, Expo (require authentication)
- **Public Workspaces**: Kiosk, Online Order (no authentication required)

### Components
- **WorkspaceDashboard** (`/src/pages/WorkspaceDashboard.tsx`): Main landing page with 6 workspace tiles
- **WorkspaceAuthModal** (`/src/components/auth/WorkspaceAuthModal.tsx`): Authentication modal with focus trap and keyboard navigation
- **useWorkspaceAccess** (`/src/hooks/useWorkspaceAccess.ts`): Hook for workspace access logic

### Demo Mode
When `VITE_DEMO_PANEL=1`, the system pre-fills role-specific credentials:
- **Server Workspace**: server@restaurant.com / Demo123!
- **Kitchen Workspace**: kitchen@restaurant.com / Demo123!
- **Expo Workspace**: expo@restaurant.com / Demo123!
- **Admin Workspace**: manager@restaurant.com / Demo123!

### Deep Links
Deep links to protected workspaces (e.g., `/server`, `/kitchen`) automatically show the authentication modal when the user is not authenticated. After successful login, the user is navigated to their intended destination.

### Accessibility
- Focus trap within modal
- ESC key closes modal
- Keyboard navigation through all interactive elements
- ARIA labels and roles
- Return focus to triggering tile on close

### Testing
```bash
# Unit tests
npm test -- WorkspaceDashboard
npm test -- WorkspaceAuthModal
npm test -- useWorkspaceAccess

# E2E tests
npm run test:e2e -- workspace-landing.spec.ts
```

### Rollback
To disable the feature and revert to the original landing:
```env
VITE_WORKSPACE_LANDING_ENABLED=0
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