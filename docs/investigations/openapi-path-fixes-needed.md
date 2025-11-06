# OpenAPI Path Prefix Fixes Required

**Generated:** 2025-11-06

## Problem
The OpenAPI spec has 40 routes documented without proper mount prefixes, causing 25% coverage (should be ~95%).

## Path Changes Required

### Auth Routes (need /auth prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/login | /api/v1/auth/login | POST |
| /api/v1/pin-login | /api/v1/auth/pin-login | POST |
| /api/v1/station-login | /api/v1/auth/station-login | POST |
| /api/v1/logout | /api/v1/auth/logout | POST |
| /api/v1/refresh | /api/v1/auth/refresh | POST |
| /api/v1/set-pin | /api/v1/auth/set-pin | POST |
| /api/v1/revoke-stations | /api/v1/auth/revoke-stations | POST |

**Note:** `/api/v1/auth/me` is already correct (added in Phase 1)

### AI Routes (need /ai prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/menu | /api/v1/ai/menu | GET, POST |
| /api/v1/transcribe-with-metadata | /api/v1/ai/transcribe-with-metadata | POST |
| /api/v1/voice-chat | /api/v1/ai/voice-chat | POST |
| /api/v1/chat | /api/v1/ai/chat | POST |
| /api/v1/test-tts | /api/v1/ai/test-tts | POST |
| /api/v1/test-transcribe | /api/v1/ai/test-transcribe | POST |
| /api/v1/demo-session | /api/v1/ai/demo-session | POST |
| /api/v1/health | /api/v1/ai/health | GET |

**Note:** `/api/v1/ai/transcribe` and `/api/v1/ai/parse-order` are already correct (added in Phase 1)

### Menu Routes (need /menu prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/items | /api/v1/menu/items | GET |
| /api/v1/items/{id} | /api/v1/menu/items/{id} | GET |
| /api/v1/categories | /api/v1/menu/categories | GET |
| /api/v1/sync-ai | /api/v1/menu/sync-ai | POST |
| /api/v1/cache/clear | /api/v1/menu/cache/clear | POST |
| /api/v1/ | /api/v1/menu/ | GET |

### Security Routes (need /security prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/events | /api/v1/security/events | GET |
| /api/v1/stats | /api/v1/security/stats | GET |
| /api/v1/config | /api/v1/security/config | GET |
| /api/v1/test | /api/v1/security/test | POST |

### Terminal Routes (need /terminal prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/checkout | /api/v1/terminal/checkout | POST |
| /api/v1/checkout/{checkoutId} | /api/v1/terminal/checkout/{checkoutId} | GET |
| /api/v1/checkout/{checkoutId}/cancel | /api/v1/terminal/checkout/{checkoutId}/cancel | POST |
| /api/v1/checkout/{checkoutId}/complete | /api/v1/terminal/checkout/{checkoutId}/complete | POST |
| /api/v1/devices | /api/v1/terminal/devices | GET |

### Orders Routes (need /orders prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/ | /api/v1/orders/ | GET, POST |
| /api/v1/{id} | /api/v1/orders/{id} | GET, PUT, DELETE |
| /api/v1/{id}/status | /api/v1/orders/{id}/status | PATCH |

**Note:** `/api/v1/orders/voice` is already correct (added in Phase 1)

### Tables Routes (need /tables prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/ | /api/v1/tables/ | GET, POST |
| /api/v1/{id} | /api/v1/tables/{id} | GET, PUT, DELETE |
| /api/v1/{id}/status | /api/v1/tables/{id}/status | PATCH |

**Note:** `/api/v1/tables/batch` is already correct (added in Phase 1)

### Payments Routes (need /payments prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/{paymentId} | /api/v1/payments/{paymentId} | GET |
| /api/v1/{paymentId}/refund | /api/v1/payments/{paymentId}/refund | POST |

**Note:** `/api/v1/payments/create` and `/api/v1/payments/cash` are already correct (added in Phase 1)

### Realtime Routes (need /realtime prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/session | /api/v1/realtime/session | POST |
| (health is actually at /api/v1/realtime/health - need to verify this exists in OpenAPI)

### Restaurants Routes (need /restaurants prefix)
| Current Path | Correct Path | Method |
|--------------|--------------|---------|
| /api/v1/{id} | /api/v1/restaurants/{id} | GET |

### Conflicting Generic Paths to Remove

The OpenAPI spec has several generic paths that conflict with specific routes:

- `/api/v1/` (appears multiple times - conflicts with orders, tables, menu)
- `/api/v1/{id}` (appears multiple times - conflicts with orders, tables, restaurants)
- `/api/v1/{id}/status` (appears multiple times - conflicts with orders, tables)
- `/api/v1/{paymentId}` (generic - should be /api/v1/payments/{paymentId})
- `/api/v1/{paymentId}/refund` (generic - should be /api/v1/payments/{paymentId}/refund)

These need to be removed and replaced with properly prefixed paths.

## Additional Routes to Add

Based on the validation report, these routes exist in code but have NO documentation:

1. GET /api/v1/menu/ (menu root route)
2. GET /api/v1/orders/ (list orders)
3. POST /api/v1/orders/ (create order)
4. GET /api/v1/orders/{id} (get order)
5. PATCH /api/v1/orders/{id}/status (update order status)
6. DELETE /api/v1/orders/{id} (delete order)
7. GET /api/v1/tables/ (list tables)
8. GET /api/v1/tables/{id} (get table)
9. POST /api/v1/tables/ (create table)
10. PUT /api/v1/tables/{id} (update table)
11. DELETE /api/v1/tables/{id} (delete table)
12. PATCH /api/v1/tables/{id}/status (update table status)
13. GET /api/v1/realtime/health (realtime health check)
14. GET /api/v1/restaurants/{id} (get restaurant)

## Health Routes Special Case

Health routes are mounted at `/` (not `/health`), so:
- `/health` → `/api/v1/health` (general health)
- `/ready` → `/api/v1/ready` (readiness probe)
- `/live` → `/api/v1/live` (liveness probe)
- `/healthz` → `/api/v1/healthz` (kubernetes health)
- `/metrics` → `/metrics` (prometheus metrics, NOT under /api/v1)

Current OpenAPI has:
- ✅ /api/v1/ready (correct)
- ✅ /api/v1/live (correct)
- ❌ /api/v1/health (should be for AI health, not general - or needs clarification)
- ❌ /api/v1/health/detailed (doesn't exist - should be removed)
- ❌ /api/v1/status (doesn't exist - should be removed)
- ❌ /api/v1/healthz (should verify this exists)

## Summary

- **Routes needing prefix fixes:** ~35
- **Generic routes to remove:** 5-10
- **New routes to add:** ~14
- **Expected final coverage:** 95%+

## Next Steps

1. Back up current openapi.yaml
2. Fix all path prefixes systematically
3. Remove generic/conflicting paths
4. Add missing route documentation
5. Re-run validation to confirm 95%+ coverage
6. Update API README.md to match
