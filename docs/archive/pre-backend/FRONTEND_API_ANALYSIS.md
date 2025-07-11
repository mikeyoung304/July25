# Frontend API Analysis

## Overview
The frontend's HTTP client implementation is sophisticated and ready for integration with backend services. It follows Luis's API specifications exactly.

## Key Components

### 1. HTTP Client (`src/services/http/httpClient.ts`)

**Authentication:**
- Automatically extracts Supabase JWT from the auth session
- Adds `Authorization: Bearer {token}` header to all requests
- Can skip auth with `skipAuth: true` option

**Multi-tenancy:**
- Uses global `currentRestaurantId` variable (set by RestaurantContext)
- Adds `X-Restaurant-ID` header to all requests
- Can skip with `skipRestaurantId: true` option

**Request Flow:**
1. Get Supabase session token
2. Add Authorization header
3. Add X-Restaurant-ID header
4. Transform request body from camelCase to snake_case
5. Transform query params to snake_case
6. Make HTTP request
7. Transform response from snake_case to camelCase
8. Handle errors (status code-based)

**Configuration:**
- Base URL from `VITE_API_BASE_URL` env var
- Defaults to `http://localhost:3001` (Luis's backend)
- Extends SecureAPIClient for additional security features

### 2. Case Transformation (`src/services/utils/caseTransform.ts`)

**Features:**
- Deep object transformation (handles nested structures)
- Array support
- Preserves Date objects
- Converts ISO date strings to Date objects
- Preserves File objects
- Special handling for query parameters (shallow transform)

**Functions:**
- `toSnakeCase()`: camelCase → snake_case
- `toCamelCase()`: snake_case → camelCase
- `transformQueryParams()`: Shallow transform for URL params

### 3. Service Adapter Pattern (`src/services/base/HttpServiceAdapter.ts`)

**Purpose:**
- Gradual migration from mock to real API
- Fallback mechanism for development
- Consistent error handling

**Features:**
- `execute()` method with mock/real switching
- Automatic fallback to mock on API failure (in dev)
- Error formatting for user display
- Service call logging (dev only)

**Configuration:**
- `VITE_USE_MOCK_DATA` env var
- Per-service override capability
- Defaults to mock if no API URL configured

## Integration Requirements for AI Gateway

### Headers Expected
```
Authorization: Bearer {supabase-jwt-token}
X-Restaurant-ID: {restaurant-id}
Content-Type: application/json
```

### Request Format
- Body: camelCase JSON (will be transformed to snake_case by client)
- Query params: camelCase (will be transformed to snake_case)

### Response Format
- Body: Must be snake_case JSON
- No response envelope - direct data return
- Errors: HTTP status codes (no wrapper)

### Error Handling
Frontend expects standard HTTP status codes:
- 401: Authentication required
- 403: Permission denied
- 404: Not found
- 422: Validation error
- 429: Rate limit
- 500: Server error

### Example Integration

**Frontend sends:**
```javascript
// camelCase request
await httpClient.post('/api/v1/ai/chat', {
  message: "Do you have burgers?",
  sessionId: "abc123",
  restaurantId: "rest_123"
})
```

**HTTP Request:**
```
POST http://localhost:3002/api/v1/ai/chat
Authorization: Bearer eyJ...
X-Restaurant-ID: rest_123
Content-Type: application/json

{
  "message": "Do you have burgers?",
  "session_id": "abc123",
  "restaurant_id": "rest_123"
}
```

**AI Gateway must respond:**
```json
{
  "response": "Yes, we have several burger options...",
  "suggested_items": [
    {
      "item_id": "123",
      "item_name": "Classic Burger",
      "price": 12.99
    }
  ],
  "intent": "menu_query"
}
```

**Frontend receives (after transformation):**
```javascript
{
  response: "Yes, we have several burger options...",
  suggestedItems: [
    {
      itemId: "123",
      itemName: "Classic Burger",
      price: 12.99
    }
  ],
  intent: "menu_query"
}
```

## Critical Notes

1. **Restaurant ID is global**: Set by RestaurantContext, not passed in requests
2. **All responses must be snake_case**: Frontend auto-converts to camelCase
3. **No response envelope**: Return data directly, use status codes for errors
4. **ISO dates become Date objects**: Frontend converts automatically
5. **Mock fallback in dev**: If API fails, frontend may use mock data

## Testing the Integration

1. Ensure AI Gateway runs on port 3002
2. Set `VITE_API_BASE_URL=http://localhost:3002` for AI endpoints
3. Frontend will automatically add auth headers
4. Test with a logged-in Supabase user
5. Verify snake_case responses