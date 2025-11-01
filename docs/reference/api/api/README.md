# API Documentation

[Home](../../../../index.md) > [Docs](../../../README.md) > [Reference](../../README.md) > [API](../README.md) > API Reference

**OpenAPI Specification**: [openapi.yaml](../openapi.yaml)
**Interactive Docs**: [View in Swagger Editor](https://editor.swagger.io/?url=https://raw.githubusercontent.com/mikeyoung304/rebuild-6.0/main/docs/reference/api/openapi.yaml)
**Local Viewer**: [index.html](../index.html) - Open in browser for interactive documentation

**Last Updated**: October 31, 2025
**Version**: 6.0.14
**Base URL**: `http://localhost:3001/api/v1` (development) | `https://july25.onrender.com/api/v1` (production)

---

## Overview

Restaurant OS provides a comprehensive RESTful API for restaurant management operations. All endpoints follow REST conventions and return JSON responses.

**For complete endpoint documentation, request/response schemas, and examples, see the [OpenAPI specification](../openapi.yaml).**

This document provides additional context, quick reference, and examples beyond the OpenAPI spec.

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Health & Monitoring

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| GET | `/health` | No | Health check endpoint | [health.routes.ts](../../server/src/routes/health.routes.ts) |
| GET | `/metrics` | No | Prometheus metrics | [metrics.ts](../../server/src/routes/metrics.ts) |

### Authentication

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| POST | `/api/auth/login` | No | Email/password login | [auth.routes.ts](../../server/src/routes/auth.routes.ts) |
| POST | `/api/auth/pin` | No | PIN-based login | [auth.routes.ts](../../server/src/routes/auth.routes.ts) |
| POST | `/api/auth/station` | No | Station device login | [auth.routes.ts](../../server/src/routes/auth.routes.ts) |
| POST | `/api/auth/refresh` | Yes | Refresh JWT token | [auth.routes.ts](../../server/src/routes/auth.routes.ts) |
| POST | `/api/auth/logout` | Yes | Logout user | [auth.routes.ts](../../server/src/routes/auth.routes.ts) |

### Restaurant Management

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| GET | `/api/restaurants` | Yes | List restaurants | [restaurants.routes.ts](../../server/src/routes/restaurants.routes.ts) |
| GET | `/api/restaurants/:id` | Yes | Get restaurant details | [restaurants.routes.ts](../../server/src/routes/restaurants.routes.ts) |
| PUT | `/api/restaurants/:id` | Yes | Update restaurant | [restaurants.routes.ts](../../server/src/routes/restaurants.routes.ts) |

### Menu Management

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| GET | `/api/menu` | Yes | Get menu items | [menu.routes.ts](../../server/src/routes/menu.routes.ts) |
| GET | `/api/menu/:id` | Yes | Get menu item details | [menu.routes.ts](../../server/src/routes/menu.routes.ts) |
| POST | `/api/menu` | Yes | Create menu item | [menu.routes.ts](../../server/src/routes/menu.routes.ts) |
| PUT | `/api/menu/:id` | Yes | Update menu item | [menu.routes.ts](../../server/src/routes/menu.routes.ts) |
| DELETE | `/api/menu/:id` | Yes | Delete menu item | [menu.routes.ts](../../server/src/routes/menu.routes.ts) |

### Order Management

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| GET | `/api/orders` | Yes | List orders | [orders.routes.ts](../../server/src/routes/orders.routes.ts) |
| GET | `/api/orders/:id` | Yes | Get order details | [orders.routes.ts](../../server/src/routes/orders.routes.ts) |
| POST | `/api/orders` | Yes | Create order | [orders.routes.ts](../../server/src/routes/orders.routes.ts) |
| PUT | `/api/orders/:id` | Yes | Update order | [orders.routes.ts](../../server/src/routes/orders.routes.ts) |
| POST | `/api/orders/:id/status` | Yes | Update order status | [orders.routes.ts](../../server/src/routes/orders.routes.ts) |

### Table Management

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| GET | `/api/tables` | Yes | List tables | [tables.routes.ts](../../server/src/routes/tables.routes.ts) |
| GET | `/api/tables/:id` | Yes | Get table details | [tables.routes.ts](../../server/src/routes/tables.routes.ts) |
| POST | `/api/tables` | Yes | Create table | [tables.routes.ts](../../server/src/routes/tables.routes.ts) |
| PUT | `/api/tables/:id` | Yes | Update table | [tables.routes.ts](../../server/src/routes/tables.routes.ts) |

### Payment Processing

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| POST | `/api/payments/process` | Yes | Process payment | [payments.routes.ts](../../server/src/routes/payments.routes.ts) |
| POST | `/api/payments/refund` | Yes | Process refund | [payments.routes.ts](../../server/src/routes/payments.routes.ts) |
| GET | `/api/payments/:id` | Yes | Get payment details | [payments.routes.ts](../../server/src/routes/payments.routes.ts) |

### AI & Voice

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| POST | `/api/v1/ai/voice/handshake` | Yes | Initialize voice session | [ai.routes.ts](../../server/src/routes/ai.routes.ts) |
| POST | `/api/ai/voice/process` | Yes | Process voice command | [ai.routes.ts](../../server/src/routes/ai.routes.ts) |
| GET | `/api/ai/voice/status` | Yes | Voice system status | [ai.routes.ts](../../server/src/routes/ai.routes.ts) |

### Real-time & WebSockets

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| WS | `/ws` | Yes | WebSocket connection | [realtime.routes.ts](../../server/src/routes/realtime.routes.ts) |
| WS | `/voice-stream` | Yes | Voice streaming | [realtime.routes.ts](../../server/src/routes/realtime.routes.ts) |

### Terminal Operations

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| POST | `/api/terminal/checkout` | Yes | Terminal checkout | [terminal.routes.ts](../../server/src/routes/terminal.routes.ts) |
| POST | `/api/terminal/cancel` | Yes | Cancel terminal payment | [terminal.routes.ts](../../server/src/routes/terminal.routes.ts) |

### Security & Audit

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| GET | `/api/security/audit` | Yes | Get audit logs | [security.routes.ts](../../server/src/routes/security.routes.ts) |
| GET | `/api/security/sessions` | Yes | Active sessions | [security.routes.ts](../../server/src/routes/security.routes.ts) |
| POST | `/api/security/validate` | Yes | Validate permissions | [security.routes.ts](../../server/src/routes/security.routes.ts) |

### Webhooks

| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| POST | `/api/webhooks/square` | No* | Square webhooks | [webhook.routes.ts](../../server/src/routes/webhook.routes.ts) |
| POST | `/api/webhooks/stripe` | No* | Stripe webhooks | [webhook.routes.ts](../../server/src/routes/webhook.routes.ts) |

*Webhooks use signature verification instead of JWT auth

## Request/Response Formats

### Standard Request Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
X-Restaurant-ID: <restaurant-uuid>
X-CSRF-Token: <csrf-token>
```

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-09-26T10:00:00Z",
    "version": "6.0.6"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Authentication failed",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-09-26T10:00:00Z",
    "request_id": "uuid"
  }
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limiting

Default rate limits:
- **General**: 100 requests per minute
- **Auth endpoints**: 5 requests per minute
- **Payments**: 10 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1695726400
```

## Data Types & Validation

All endpoints use Zod schemas for validation. Schema definitions can be found in the route source files.

### Common Types

**UUID Format**: `11111111-1111-1111-1111-111111111111`

**Timestamp Format**: ISO 8601 (`2025-09-26T10:00:00Z`)

**Money Format**: Integer cents (e.g., 1000 = $10.00)

## Testing

Use tools like curl, Postman, or httpie:

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get orders (authenticated)
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "X-Restaurant-ID: <uuid>"
```

## SDK & Client Libraries

Client implementations:
- **JavaScript/TypeScript**: See `client/src/services/api/`
- **WebSocket Client**: See `client/src/hooks/useWebSocket.ts`

## Further Information

- [WebSocket Events](../../../how-to/operations/DEPLOYMENT.md#websockets)
- [Database Schema](../../schema/DATABASE.md)
- [Authentication Architecture](../../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md)
- [Security Guidelines](../../../SECURITY.md)

---

## Related Documentation

- [Authentication Architecture](../../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Auth flows
- [Square API Setup](../SQUARE_API_SETUP.md) - Payment integration
- [WebSocket Events](../../../WEBSOCKET_EVENTS.md) - Real-time updates
- [Getting Started](../../../tutorials/GETTING_STARTED.md) - Development setup
- [Deployment Guide](../../../how-to/operations/DEPLOYMENT.md) - Production deployment

---

**Last Updated**: October 30, 2025
**Version**: 6.0.14