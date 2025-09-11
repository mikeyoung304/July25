# API Contracts Documentation

## Overview

This document defines the exact API contracts between the client and server. **CRITICAL**: Field name mismatches are a primary cause of integration failures.

## Naming Conventions

### Backend Expectations
- **Format**: camelCase for all fields
- **IDs**: Use `menuItemId`, not `menu_item_id`
- **Types**: Use `type`, not `order_type`
- **Names**: Use `customerName`, not `customer_name`

### Common Mistakes
| ❌ Wrong (snake_case) | ✅ Correct (camelCase) |
|-----------------------|------------------------|
| table_number | tableNumber |
| customer_name | customerName |
| order_type | type |
| menu_item_id | menuItemId |
| total_amount | totalAmount |
| created_at | createdAt |

---

## Authentication Endpoints

### POST `/api/v1/auth/login`
**Purpose**: Staff authentication with email/password

**Request**:
```typescript
{
  email: string;        // Required
  password: string;     // Required
  restaurantId?: string; // Optional, defaults to env
}
```

**Response**:
```typescript
{
  user: {
    id: string;
    email: string;
    role: 'owner' | 'manager' | 'server' | 'cashier' | 'kitchen' | 'expo';
    restaurantId: string;
  };
  token: string;         // JWT token
  expiresAt: number;     // Unix timestamp
}
```

### POST `/api/v1/auth/pin`
**Purpose**: Staff authentication with PIN code

**Request**:
```typescript
{
  pin: string;          // 4-6 digits
  restaurantId: string; // Required
}
```

**Response**: Same as `/auth/login`

### POST `/api/v1/auth/kiosk`
**Purpose**: Anonymous customer authentication for self-service

**Request**:
```typescript
{
  restaurantId: string; // Required
  deviceId?: string;    // Optional device identifier
}
```

**Response**:
```typescript
{
  token: string;        // Limited-scope JWT
  expiresAt: number;    // 1 hour from creation
  role: 'kiosk_demo';
}
```

---

## Order Management Endpoints

### POST `/api/v1/orders`
**Purpose**: Create a new order

**Headers**:
```
Authorization: Bearer <token>
X-Restaurant-ID: <restaurant-id>
Content-Type: application/json
```

**Request**:
```typescript
{
  // Table/Customer Info
  tableNumber: string;           // Required (was table_number)
  seatNumber?: number;           // Optional
  customerName: string;          // Required (was customer_name)
  
  // Order Type
  type: 'dine-in' | 'takeout' | 'delivery'; // Required (was order_type)
  
  // Items Array
  items: [
    {
      menuItemId: string;        // Required (was menu_item_id)
      name: string;              // Required - menu item name
      quantity: number;          // Required - must be > 0
      price: number;             // Required - unit price
      modifiers?: [              // Optional (was modifications)
        {
          name: string;          // Required
          price: number;         // Required - can be 0
        }
      ];
      specialInstructions?: string; // Optional
    }
  ];
  
  // Financial Fields (ALL REQUIRED)
  subtotal: number;              // Sum of (item.price * item.quantity)
  tax: number;                   // Calculated tax amount
  tip: number;                   // Tip amount (can be 0)
  total: number;                 // subtotal + tax + tip
  
  // Optional Fields
  notes?: string;                // Order-level notes
  metadata?: {                   // Additional data
    source?: 'voice' | 'kiosk' | 'app' | 'pos';
    seatNumber?: number;
    deviceId?: string;
  };
}
```

**Response**:
```typescript
{
  id: string;                    // Order UUID
  orderNumber: string;           // Human-readable order number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready';
  createdAt: string;             // ISO timestamp
  estimatedReadyTime: string;    // ISO timestamp
}
```

**Common Errors**:
```typescript
// 400 Bad Request - Missing required fields
{
  error: "Missing required field: price",
  fields: ["items[0].price"]
}

// 401 Unauthorized - Invalid token or insufficient permissions
{
  error: "Insufficient permissions",
  requiredRole: "server",
  userRole: "customer"
}

// 422 Unprocessable Entity - Validation failed
{
  error: "Validation failed",
  details: {
    "items[0].quantity": "Must be greater than 0",
    "total": "Does not match calculated total"
  }
}
```

### GET `/api/v1/orders/:id`
**Purpose**: Retrieve order details

**Response**:
```typescript
{
  id: string;
  orderNumber: string;
  status: string;
  items: Array<OrderItem>;
  customerName: string;
  tableNumber: string;
  type: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}
```

### PATCH `/api/v1/orders/:id/status`
**Purpose**: Update order status

**Request**:
```typescript
{
  status: 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  reason?: string; // Required if status is 'cancelled'
}
```

---

## Payment Endpoints

### POST `/api/v1/payments`
**Purpose**: Process payment for an order

**Request**:
```typescript
{
  orderId: string;               // Required
  amount: number;                // Required - must match order total
  method: 'card' | 'cash' | 'digital'; // Required
  
  // For card payments
  cardDetails?: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
  };
  
  // For split payments
  splits?: [
    {
      amount: number;
      method: string;
      cardDetails?: object;
    }
  ];
}
```

### POST `/api/v1/terminal/checkout`
**Purpose**: Initiate Square Terminal payment

**Request**:
```typescript
{
  orderId: string;               // Required
  deviceId: string;              // Square Terminal device ID
}
```

**Response**:
```typescript
{
  checkout: {
    id: string;                  // Checkout ID for polling
    status: 'pending';
    amount: number;
  }
}
```

### GET `/api/v1/terminal/checkout/:id`
**Purpose**: Poll payment status

**Response**:
```typescript
{
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  completedAt?: string;          // ISO timestamp if completed
  error?: string;                // Error message if failed
}
```

---

## Menu Management Endpoints

### GET `/api/v1/menu/items`
**Purpose**: Retrieve all menu items

**Query Parameters**:
```
?category=<category-id>         // Filter by category
&available=true                  // Only available items
&search=<query>                  // Search in name/description
```

**Response**:
```typescript
{
  items: [
    {
      id: string;
      name: string;
      description: string;
      price: number;
      categoryId: string;        // Note: camelCase
      categoryName: string;
      available: boolean;
      imageUrl?: string;
      modifiers?: Array<{
        id: string;
        name: string;
        price: number;
        required: boolean;
      }>;
      allergens?: string[];
      nutritionInfo?: object;
    }
  ];
  total: number;
}
```

---

## WebSocket Events

### Connection
```typescript
// Client → Server
{
  type: 'auth',
  token: string;                 // JWT token
  restaurantId: string;
}

// Server → Client
{
  type: 'auth.success',
  userId: string;
  role: string;
}
```

### Order Updates
```typescript
// Server → Client
{
  type: 'order.updated',
  order: {
    id: string;
    status: string;
    // ... full order object
  }
}
```

### Kitchen Display Events
```typescript
// Server → Kitchen Clients
{
  type: 'order.new',
  order: Order;
}

{
  type: 'order.statusChanged',
  orderId: string;
  oldStatus: string;
  newStatus: string;
}
```

---

## Voice Processing

### WebRTC Session Creation
**POST** `/api/v1/realtime/session`

**Request**:
```typescript
{
  mode: 'server' | 'customer';   // Determines AI behavior
}
```

**Response**:
```typescript
{
  token: string;                 // Ephemeral OpenAI token
  expiresAt: number;             // Expires in 60 seconds
  menuContext: string;           // Menu items for AI context
  restaurantId: string;
}
```

### Voice Order Events
```typescript
// Transcript Event
{
  type: 'transcript',
  text: string;
  isFinal: boolean;
  confidence: number;
}

// Order Detection Event (customer mode only)
{
  type: 'order.detected',
  items: [
    {
      menuItemId: string;
      name: string;
      quantity: number;
      modifiers: string[];
    }
  ]
}
```

---

## Error Response Format

All error responses follow this structure:

```typescript
{
  error: string;                 // Human-readable error message
  code?: string;                 // Machine-readable error code
  details?: object;              // Additional error details
  timestamp: string;             // ISO timestamp
  requestId?: string;            // Request tracking ID
}
```

### Standard HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid fields)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error

---

## Testing Endpoints

### Health Check
**GET** `/api/v1/health`

**Response**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: boolean;
    redis: boolean;
    square: boolean;
    openai: boolean;
  };
}
```

---

## Migration Guide

### From Snake Case to Camel Case
If you have existing code using snake_case, here's how to migrate:

```javascript
// Old way (snake_case)
const orderData = {
  table_number: table.label,
  customer_name: customerName,
  order_type: 'dine-in',
  menu_item_id: item.id,
  total_amount: total
};

// New way (camelCase)
const orderData = {
  tableNumber: table.label,
  customerName: customerName,
  type: 'dine-in',
  menuItemId: item.id,
  totalAmount: total
};

// Helper function for migration
function snakeToCamel(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = value;
    return acc;
  }, {});
}
```

---

## Best Practices

1. **Always validate required fields** before sending requests
2. **Include proper headers** (Authorization, X-Restaurant-ID)
3. **Handle all error cases** explicitly
4. **Use TypeScript interfaces** to ensure type safety
5. **Log failed requests** with full payload for debugging
6. **Implement retry logic** with exponential backoff
7. **Cache menu items** to reduce API calls
8. **Use WebSocket** for real-time updates instead of polling

---

## Common Integration Issues

### Issue 1: Order Submission Fails
**Symptom**: "Failed to submit order" error  
**Cause**: Missing required fields or wrong field names  
**Fix**: Ensure all required fields are present with correct names

### Issue 2: Authentication Failures
**Symptom**: 401 Unauthorized errors  
**Cause**: Token expired or wrong restaurant ID  
**Fix**: Refresh token before expiry, verify restaurant ID

### Issue 3: WebSocket Disconnections
**Symptom**: Real-time updates stop working  
**Cause**: Token expiry or network issues  
**Fix**: Implement reconnection with fresh token

---

*Last Updated: September 10, 2025*  
*Version: 1.0*