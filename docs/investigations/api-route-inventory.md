# API Route Inventory

**Generated:** 2025-11-06T20:26:26.277Z
**Scanned Files:** 12

## Summary

- **Total Routes:** 62
- **Production Routes:** 57
- **Development Routes:** 4
- **Test Routes:** 3

## Routes by File

### ai.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| POST | /api/v1/ai/menu | PROD | authenticate |
| GET | /api/v1/ai/menu | PROD | authenticate |
| POST | /api/v1/ai/transcribe | PROD | transcriptionLimiter, trackAIMetrics |
| POST | /api/v1/ai/transcribe-with-metadata | PROD | transcriptionLimiter, trackAIMetrics |
| POST | /api/v1/ai/parse-order | PROD | authenticate, trackAIMetrics |
| POST | /api/v1/ai/voice-chat | PROD | authenticate, trackAIMetrics |
| POST | /api/v1/ai/chat | PROD | authenticate, trackAIMetrics |
| GET | /api/v1/ai/health | PROD | trackAIMetrics |
| POST | /api/v1/ai/test-tts | TEST | - |
| POST | /api/v1/ai/test-transcribe | TEST | - |

### auth.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| POST | /api/v1/auth/login | PROD | - |
| POST | /api/v1/auth/pin-login | PROD | - |
| POST | /api/v1/auth/station-login | PROD | - |
| POST | /api/v1/auth/logout | PROD | authenticate |
| GET | /api/v1/auth/me | PROD | authenticate, validateRestaurantAccess |
| POST | /api/v1/auth/refresh | PROD | - |
| POST | /api/v1/auth/set-pin | PROD | authenticate |
| POST | /api/v1/auth/revoke-stations | PROD | authenticate, requireScopes |

### health.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| GET | /api/v1/health | PROD | - |
| GET | /api/v1/ | DEV | - |
| GET | /api/v1/status | DEV | - |
| GET | /api/v1/ready | PROD | - |
| GET | /api/v1/live | PROD | - |
| GET | /api/v1/healthz | PROD | - |

### menu.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| GET | /api/v1/menu/ | PROD | - |
| GET | /api/v1/menu/items | PROD | - |
| GET | /api/v1/menu/items/:id | PROD | - |
| GET | /api/v1/menu/categories | PROD | - |
| POST | /api/v1/menu/sync-ai | PROD | - |
| POST | /api/v1/menu/cache/clear | PROD | - |

### orders.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| GET | /api/v1/orders/ | PROD | authenticate, validateRestaurantAccess |
| POST | /api/v1/orders/ | PROD | - |
| POST | /api/v1/orders/voice | PROD | authenticate, validateRestaurantAccess, requireScopes |
| GET | /api/v1/orders/:id | PROD | authenticate, validateRestaurantAccess |
| PATCH | /api/v1/orders/:id/status | PROD | authenticate, validateRestaurantAccess |
| DELETE | /api/v1/orders/:id | PROD | authenticate, validateRestaurantAccess |

### payments.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| POST | /api/v1/payments/create | PROD | - |
| POST | /api/v1/payments/cash | PROD | - |
| GET | /api/v1/payments/:paymentId | PROD | - |
| POST | /api/v1/payments/:paymentId/refund | PROD | - |

### realtime.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| POST | /api/v1/realtime/session | PROD | authenticate |
| GET | /api/v1/realtime/health | PROD | - |

### restaurants.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| GET | /api/v1/restaurants/:id | PROD | - |

### security.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| GET | /api/v1/security/events | PROD | - |
| GET | /api/v1/security/stats | PROD | - |
| POST | /api/v1/security/test | TEST | - |
| GET | /api/v1/security/config | PROD | - |

### tables.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| GET | /api/v1/tables/ | PROD | - |
| GET | /api/v1/tables/:id | PROD | - |
| POST | /api/v1/tables/ | PROD | - |
| PUT | /api/v1/tables/batch | PROD | - |
| PUT | /api/v1/tables/:id | PROD | - |
| DELETE | /api/v1/tables/:id | PROD | - |
| PATCH | /api/v1/tables/:id/status | PROD | - |

### terminal.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| POST | /api/v1/terminal/checkout | PROD | authenticate, validateRestaurantAccess |
| GET | /api/v1/terminal/checkout/:checkoutId | PROD | authenticate, validateRestaurantAccess |
| POST | /api/v1/terminal/checkout/:checkoutId/cancel | PROD | authenticate, validateRestaurantAccess |
| POST | /api/v1/terminal/checkout/:checkoutId/complete | PROD | authenticate, validateRestaurantAccess |
| GET | /api/v1/terminal/devices | PROD | authenticate, validateRestaurantAccess |

### webhook.routes.ts

| Method | Path | Type | Middleware |
|--------|------|------|------------|
| POST | /api/v1/webhooks/payments | PROD | - |
| POST | /api/v1/webhooks/orders | PROD | - |
| POST | /api/v1/webhooks/inventory | PROD | - |

