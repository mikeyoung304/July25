# API Integration Guide - Project Janus

This document describes how the frontend integrates with Luis's Express.js backend API.

## Connection Specification

Per Luis's directives, all API communication follows these rules:

### 1. Authentication
- **Header**: `Authorization: Bearer <supabase-jwt-token>`
- The Supabase JWT token is automatically included in all requests
- Token is retrieved from the active Supabase auth session

### 2. Multi-Tenancy
- **Header**: `X-Restaurant-ID: <restaurant-id>`
- Restaurant ID is automatically included from the RestaurantContext
- Every API request is scoped to the current restaurant

### 3. Data Format
- **Request/Response**: All data uses `snake_case` format
- The HTTP client automatically transforms:
  - Frontend (camelCase) → Backend (snake_case) for requests
  - Backend (snake_case) → Frontend (camelCase) for responses
- Dates are sent as ISO 8601 strings and converted to Date objects

### 4. Error Handling
- **No envelope**: Responses contain data directly (not wrapped in `{data: ...}`)
- **Status codes**: HTTP status codes indicate success/failure
- Common status codes:
  - 200/201: Success
  - 401: Authentication required
  - 403: Permission denied
  - 404: Resource not found
  - 422: Validation error
  - 500: Server error

## Implementation

### HTTP Client

The enhanced HTTP client (`src/services/http/httpClient.ts`) handles all the connection requirements automatically:

```typescript
import { httpClient } from '@/services/http'

// Example: Fetching orders
const response = await httpClient.get('/api/v1/orders', {
  params: { status: 'new' } // Automatically converted to snake_case
})
```

### Service Pattern

Services extend `HttpServiceAdapter` to support both mock data and real API calls:

```typescript
export class OrderService extends HttpServiceAdapter {
  async getOrders(filters?: OrderFilters) {
    return this.execute(
      // Real API call
      async () => {
        const response = await this.httpClient.get('/api/v1/orders', { params: filters })
        return response
      },
      // Mock fallback for development
      async () => {
        return mockOrders
      }
    )
  }
}
```

### Environment Configuration

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:3001  # Luis's Express server
VITE_USE_MOCK_DATA=false                  # Set to true to use mock data
```

## API Endpoints

Expected endpoints from the Express.js server:

### Orders
- `GET /api/v1/orders` - List orders with filters
- `GET /api/v1/orders/:id` - Get single order
- `POST /api/v1/orders` - Create new order
- `PATCH /api/v1/orders/:id/status` - Update order status

### Tables
- `GET /api/v1/tables` - List tables
- `GET /api/v1/tables/:id` - Get single table
- `PATCH /api/v1/tables/:id/status` - Update table status

### Menu
- `GET /api/v1/menu/items` - List menu items
- `GET /api/v1/menu/categories` - List categories

### Floor Plans
- `GET /api/v1/floor-plans/:restaurant_id` - Get floor plan
- `POST /api/v1/floor-plans` - Save floor plan
- `PUT /api/v1/floor-plans/:id` - Update floor plan

## WebSocket Events

Expected WebSocket events for real-time updates:

```typescript
// Order created
{
  "type": "ORDER_CREATED",
  "payload": { /* order data in snake_case */ }
}

// Order status changed
{
  "type": "ORDER_STATUS_CHANGED",
  "payload": {
    "order_id": "...",
    "new_status": "preparing",
    "previous_status": "new"
  }
}

// Table status changed
{
  "type": "TABLE_STATUS_CHANGED",
  "payload": {
    "table_id": "...",
    "new_status": "occupied"
  }
}
```

## Testing

### Using Mock Data
1. Set `VITE_USE_MOCK_DATA=true` in `.env.local`
2. The service layer will use mock implementations
3. No backend server required

### Testing with Real API
1. Ensure Luis's Express server is running on port 3001
2. Set `VITE_USE_MOCK_DATA=false`
3. Configure Supabase auth credentials
4. The service layer will make real API calls

### Gradual Migration
Services can be migrated one at a time. The `HttpServiceAdapter` pattern allows:
- Fallback to mock data if API fails (in development)
- Feature flags to control mock/real mode per service
- Easy rollback if issues arise

## Troubleshooting

### Common Issues

1. **"No auth session available"**
   - Ensure user is logged in via Supabase auth
   - Check Supabase configuration in `.env.local`

2. **"No restaurant ID available"**
   - Ensure RestaurantIdProvider is added to App.tsx
   - Check that restaurant is selected in RestaurantContext

3. **CORS errors**
   - Luis's Express server must allow CORS from the frontend origin
   - Headers needed: Authorization, X-Restaurant-ID, Content-Type

4. **Data format issues**
   - Check browser console for transformation errors
   - Ensure all API responses use snake_case format
   - Date fields should be ISO 8601 strings