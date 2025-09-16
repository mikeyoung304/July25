# Restaurant OS - Dependency & Route Audit Summary

Generated: 2025-01-15

## Client Module Analysis

- **Total Modules**: 301
- **Isolated Modules**: 25
- **External Dependencies**: 31
- **Circular Dependencies**: 0 found

### Most Imported Client Modules:
- `src/utils`: 104 imports
- `src/components/ui/button`: 78 imports
- `src/services/logger`: 72 imports
- `src/components/ui/card`: 54 imports
- `src/core`: 28 imports

### Client Modules with Most Dependencies:
- `src/App.tsx`: 35 dependencies
- `src/pages/ServerView.tsx`: 24 dependencies
- `src/pages/ExpoPage.tsx`: 22 dependencies
- `src/pages/AdminDashboard.tsx`: 22 dependencies
- `src/components/kiosk/KioskCheckoutPage.tsx`: 20 dependencies

## Server Module Analysis

- **Total Modules**: 441
- **Isolated Modules**: 122
- **External Dependencies**: 41
- **Circular Dependencies**: 0 found

### Most Imported Server Modules:
- `src/utils/logger`: 110 imports
- `dist/server/src/utils/logger`: 59 imports
- `src/middleware/errorHandler`: 44 imports
- `dist/utils/logger`: 37 imports
- `src/config/database`: 35 imports

### Server Modules with Most Dependencies:
- `src/server.ts`: 34 dependencies
- `src/ai/index.ts`: 30 dependencies
- `src/routes/index.ts`: 28 dependencies
- `src/routes/orders.routes.ts`: 24 dependencies
- `src/routes/ai.routes.ts`: 22 dependencies

## Route Analysis

### Routes by HTTP Method:
- **GET**: 130 routes
- **USE**: 87 routes
- **POST**: 154 routes
- **PUT**: 15 routes
- **DELETE**: 12 routes
- **PATCH**: 9 routes

### Authentication Coverage:
- **Authenticated Routes**: 189
- **Public Routes**: 218

### Role-based Access:
- **DatabaseRole.OWNER, DatabaseRole.MANAGER, DatabaseRole.SERVER, DatabaseRole.CUSTOMER**: 7 routes
- **'admin'**: 8 routes
- **'admin', 'manager'**: 11 routes

## Key Files Generated

- `graph_client.json`: Complete client dependency graph
- `graph_server.json`: Complete server dependency graph
- `routes_inventory.csv`: All routes with auth requirements
- `api_endpoints.csv`: API-specific endpoints mapping
- `circulars.txt`: Circular dependency analysis
- `dependency_summary.json`: Comprehensive analysis data
