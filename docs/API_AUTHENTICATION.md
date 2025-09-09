# API Authentication Guide

## Overview

Restaurant OS uses JWT-based authentication with multi-tenant restaurant context. This guide explains how authentication works, JWT validation process, and provides examples for API calls.

## Authentication Methods

### 1. Kiosk/Demo Authentication
**Endpoint:** `POST /api/v1/auth/kiosk`

For demo and development environments:

```http
POST /api/v1/auth/kiosk
Content-Type: application/json

{
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Token includes scopes:**
- `menu:read` - View menu items
- `orders:create` - Create orders
- `ai.voice:chat` - Voice ordering
- `payments:process` - Process payments

### 2. Email/Password Authentication
**Endpoint:** `POST /api/v1/auth/login`

For managers and owners:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "manager@restaurant.com",
  "password": "secure_password",
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_uuid",
    "email": "manager@restaurant.com",
    "role": "manager"
  },
  "session": {
    "access_token": "supabase_jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  },
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

### 3. PIN Authentication
**Endpoint:** `POST /api/v1/auth/pin-login`

For servers and cashiers:

```http
POST /api/v1/auth/pin-login
Content-Type: application/json

{
  "pin": "1234",
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_uuid",
    "email": "server@restaurant.com",
    "role": "server"
  },
  "token": "jwt_token",
  "expiresIn": 43200,
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

### 4. Station Authentication
**Endpoint:** `POST /api/v1/auth/station-login`

For kitchen and expo displays:

```http
POST /api/v1/auth/station-login
Authorization: Bearer manager_jwt_token
Content-Type: application/json

{
  "stationType": "kitchen",
  "stationName": "Kitchen Display 1",
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

## JWT Validation Process

### Token Verification Flow

1. **Extract Token**: Parse `Authorization: Bearer <token>` header
2. **Signature Validation**: Verify JWT signature with appropriate secret
3. **Expiry Check**: Ensure token hasn't expired
4. **User Context**: Extract user information from token payload
5. **Restaurant Context**: Set restaurant ID from token or header

### JWT Secrets Priority

The system tries JWT secrets in this order:

1. **KIOSK_JWT_SECRET** - For demo/kiosk tokens
2. **SUPABASE_JWT_SECRET** - For Supabase-issued tokens
3. **Fallback** - Development-only fallback (not for production)

### Token Payload Structure

```json
{
  "sub": "user_id_or_demo:random",
  "email": "user@example.com",
  "role": "manager|server|cashier|kitchen|expo|kiosk_demo",
  "restaurant_id": "uuid",
  "scope": ["menu:read", "orders:create"],
  "iat": 1640995200,
  "exp": 1641081600
}
```

## Restaurant Context Headers

### Required Headers

All API requests must include restaurant context:

```http
Authorization: Bearer <jwt_token>
X-Restaurant-ID: 11111111-1111-1111-1111-111111111111
```

### Context Resolution

Restaurant ID is determined by (in priority order):

1. `X-Restaurant-ID` header
2. `restaurant_id` from JWT payload
3. `DEFAULT_RESTAURANT_ID` environment variable

## API Call Examples

### Creating an Order

```http
POST /api/v1/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Restaurant-ID: 11111111-1111-1111-1111-111111111111
Content-Type: application/json

{
  "items": [
    {
      "menu_item_id": "item_uuid",
      "quantity": 2,
      "customizations": ["extra cheese"]
    }
  ],
  "customer_name": "John Doe",
  "order_type": "pickup",
  "payment_method": "card"
}
```

### Fetching Menu

```http
GET /api/v1/menu
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Restaurant-ID: 11111111-1111-1111-1111-111111111111
```

### Processing Payment

```http
POST /api/v1/payments/process
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Restaurant-ID: 11111111-1111-1111-1111-111111111111
Content-Type: application/json

{
  "orderId": "order_uuid",
  "amount": 2599,
  "paymentMethod": "card",
  "token": "payment_token"
}
```

### WebSocket Authentication

WebSocket connections require token in URL parameters:

```javascript
const socket = new WebSocket(
  `ws://localhost:3001?token=${jwt_token}&restaurant=${restaurantId}`
);
```

## Authentication Middleware

### Protected Routes

Most API endpoints use the `authenticate` middleware:

```typescript
// Requires valid JWT token
router.get('/orders', authenticate, getOrders);
```

### Optional Authentication

Some endpoints use `optionalAuth` middleware:

```typescript
// Works with or without token
router.get('/menu', optionalAuth, getMenu);
```

### Role-Based Access Control

Endpoints can require specific scopes:

```typescript
// Requires payments:process scope
router.post('/payments', authenticate, requireScopes(ApiScope.PAYMENTS_PROCESS), processPayment);
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "No token provided",
  "statusCode": 401
}
```

Common causes:
- Missing `Authorization` header
- Invalid JWT signature
- Expired token
- Missing required scopes

### 403 Forbidden

```json
{
  "error": "Forbidden", 
  "message": "Insufficient permissions",
  "statusCode": 403
}
```

Common causes:
- Valid token but insufficient scopes
- Restaurant access not allowed
- Role-based access denied

## Development Setup

### Environment Variables

```env
# Required for kiosk/demo authentication
KIOSK_JWT_SECRET=your_kiosk_secret_key

# Supabase authentication
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Default restaurant for development
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

### Testing Authentication

#### Get Demo Token

```bash
curl -X POST http://localhost:3001/api/v1/auth/kiosk \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}'
```

#### Test Authenticated Endpoint

```bash
TOKEN="your_jwt_token_here"
curl -X GET http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
```

## Security Considerations

### Production Requirements

1. **Strong Secrets**: Use cryptographically secure JWT secrets
2. **HTTPS Only**: Never send tokens over HTTP in production
3. **Token Expiry**: Keep token lifetimes short (1-12 hours)
4. **Rate Limiting**: Implement auth endpoint rate limiting
5. **Audit Logging**: Log all authentication events

### Best Practices

- Never expose JWT secrets in client code
- Use service role keys only on server side
- Implement token refresh for long-lived sessions
- Validate all JWT claims, not just signature
- Use different secrets for different token types

## Troubleshooting

### Common Issues

#### "Token verification failed"
- Check JWT secret configuration
- Verify token hasn't expired
- Ensure proper token format

#### "No access to this restaurant"
- Verify restaurant ID in token/header
- Check user_restaurants table permissions
- Confirm restaurant exists and is active

#### "Demo authentication not configured"
- Set KIOSK_JWT_SECRET environment variable
- Check demo restaurant ID is allowed
- Verify development environment setup

### Debugging Tools

```bash
# Check token payload (development only)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 -d

# Test database connection
npm run check:integration

# View authentication logs
tail -f logs/server.log | grep auth
```

## Related Documentation

- [Database Migrations Guide](./DATABASE_MIGRATIONS.md)
- [Server README](../server/README.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [API Documentation](./api/)
