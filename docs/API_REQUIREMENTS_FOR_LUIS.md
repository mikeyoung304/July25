# API Requirements for AI Features

## Overview
The AI Gateway needs specific endpoints from Luis's backend to function properly. Until these are available, the AI Gateway will provide temporary implementations.

## Required Endpoints

### 1. Menu Data Retrieval
**Endpoint**: `GET /api/v1/restaurants/{restaurant_id}/menu`

**Purpose**: Retrieve complete menu for AI to understand available items

**Response Format** (snake_case):
```json
{
  "menu_categories": [
    {
      "category_id": "cat_123",
      "category_name": "Burgers",
      "display_order": 1,
      "is_active": true,
      "items": [
        {
          "item_id": "item_456",
          "item_name": "Classic Burger",
          "description": "Beef patty with lettuce, tomato, onion",
          "price": 12.99,
          "is_available": true,
          "preparation_time": 15,
          "dietary_flags": ["gluten_free_option"],
          "modifiers": [
            {
              "modifier_id": "mod_789",
              "modifier_name": "Add Cheese",
              "price_adjustment": 1.50,
              "is_default": false
            }
          ],
          "allergens": ["dairy", "gluten"],
          "calories": 650,
          "image_url": "https://..."
        }
      ]
    }
  ],
  "last_updated": "2024-01-10T10:00:00Z"
}
```

### 2. Menu Search
**Endpoint**: `GET /api/v1/restaurants/{restaurant_id}/menu/search`

**Query Parameters**:
- `q` (required): Search query
- `category` (optional): Filter by category
- `dietary` (optional): Filter by dietary restriction
- `max_price` (optional): Price limit

**Purpose**: Enable AI to quickly find specific items

**Example**: `GET /api/v1/restaurants/123/menu/search?q=burger&dietary=gluten_free`

**Response Format**:
```json
{
  "results": [
    {
      "item_id": "item_456",
      "item_name": "Classic Burger",
      "category": "Burgers",
      "price": 12.99,
      "match_score": 0.95,
      "is_available": true
    }
  ],
  "total_results": 1
}
```

### 3. Popular Items Analytics
**Endpoint**: `GET /api/v1/restaurants/{restaurant_id}/analytics/popular`

**Query Parameters**:
- `period` (optional): "today", "week", "month" (default: "week")
- `limit` (optional): Number of items (default: 20)

**Purpose**: AI can recommend popular items

**Response Format**:
```json
{
  "popular_items": [
    {
      "item_id": "item_456",
      "item_name": "Classic Burger",
      "order_count": 234,
      "revenue": 3035.66,
      "rank": 1,
      "trend": "up",
      "category": "Burgers"
    }
  ],
  "period": "week",
  "generated_at": "2024-01-10T10:00:00Z"
}
```

### 4. Item Availability Check
**Endpoint**: `GET /api/v1/restaurants/{restaurant_id}/items/{item_id}/availability`

**Purpose**: Real-time availability for accurate AI responses

**Response Format**:
```json
{
  "item_id": "item_456",
  "is_available": true,
  "quantity_remaining": null,
  "next_available": null,
  "reason": null
}
```

### 5. Order Validation
**Endpoint**: `POST /api/v1/restaurants/{restaurant_id}/orders/validate`

**Purpose**: Validate AI-suggested orders before confirmation

**Request Body**:
```json
{
  "items": [
    {
      "item_id": "item_456",
      "quantity": 1,
      "modifiers": ["mod_789"]
    }
  ],
  "customer_id": "cust_123"
}
```

**Response Format**:
```json
{
  "is_valid": true,
  "total_price": 14.49,
  "estimated_time": 15,
  "errors": [],
  "warnings": []
}
```

### 6. Dietary Restrictions Lookup
**Endpoint**: `GET /api/v1/restaurants/{restaurant_id}/dietary-options`

**Purpose**: Help AI filter menu for dietary needs

**Response Format**:
```json
{
  "dietary_options": [
    {
      "code": "vegetarian",
      "label": "Vegetarian",
      "item_count": 23
    },
    {
      "code": "gluten_free",
      "label": "Gluten Free",
      "item_count": 15
    }
  ]
}
```

## Temporary Solution

Until Luis implements these endpoints, the AI Gateway will:

### 1. Admin Menu Upload Endpoint
`POST /api/admin/restaurants/{restaurant_id}/menu`
- Accepts menu data in the format above
- Stores in Redis with 24-hour TTL
- Requires admin authentication

### 2. Mock Endpoints
The AI Gateway will implement all endpoints above with:
- Same URL structure
- Same response format
- Data from Redis cache

### 3. Migration Path
When Luis's endpoints are ready:
1. AI Gateway will proxy requests to port 3001
2. Remove temporary endpoints
3. Clear Redis cache

## Authentication

All endpoints must:
- Validate Supabase JWT in `Authorization: Bearer` header
- Check restaurant access via `X-Restaurant-ID` header
- Return 401 for invalid auth
- Return 403 for unauthorized restaurant access

## Performance Requirements

- Menu retrieval: < 200ms
- Search: < 100ms  
- Popular items: < 150ms (can be cached)
- Availability: < 50ms (critical for UX)

## Error Handling

Standard HTTP status codes:
- 200: Success
- 400: Bad request (invalid params)
- 401: Authentication required
- 403: Forbidden (wrong restaurant)
- 404: Restaurant or item not found
- 500: Server error

Error response format:
```json
{
  "error": "Item not found",
  "code": "ITEM_NOT_FOUND",
  "details": {
    "item_id": "item_999"
  }
}
```

## Notes for Luis

1. **All responses must be snake_case** - Frontend converts automatically
2. **No response envelope** - Return data directly at root level
3. **ISO date strings** for all timestamps
4. **Consistent ID format** - Prefer prefixed IDs (e.g., "item_123")
5. **Boolean fields** - Use true/false, not 1/0 or "true"/"false"

## Priority Order

1. Menu retrieval (blocking - AI can't work without this)
2. Menu search (high - improves AI accuracy)
3. Popular items (medium - nice for recommendations)
4. Others (low - can be added incrementally)