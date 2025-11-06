# Complete API Endpoint Inventory (2025-11-06)

## Actual Implementation vs Documentation Gap Analysis

### HEALTH ROUTES (health.routes.ts)
**Actual:** 6 endpoints
**Documented:** 2 endpoints
**Gap:** 4 missing

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /health | GET | ✅ Yes | HIGH | Primary health check |
| /metrics | GET | ✅ Yes | HIGH | Prometheus metrics |
| / | GET | ❌ No | MEDIUM | Root health check |
| /status | GET | ❌ No | MEDIUM | Detailed status |
| /ready | GET | ❌ No | HIGH | Kubernetes readiness probe |
| /live | GET | ❌ No | HIGH | Kubernetes liveness probe |
| /healthz | GET | ❌ No | MEDIUM | Alternative health check |

---

### AUTH ROUTES (auth.routes.ts)
**Actual:** 8 endpoints
**Documented:** 5 endpoints
**Gap:** 3 missing

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /login | POST | ✅ Yes | HIGH | Email/password login |
| /pin-login | POST | ✅ Yes | HIGH | PIN-based login |
| /station-login | POST | ✅ Yes | HIGH | Station device login |
| /refresh | POST | ✅ Yes | HIGH | Refresh JWT token |
| /logout | POST | ✅ Yes | MEDIUM | Logout user |
| /me | GET | ❌ No | HIGH | Get current user profile |
| /set-pin | POST | ❌ No | MEDIUM | Set user PIN |
| /revoke-stations | POST | ❌ No | LOW | Revoke station tokens |

---

### MENU ROUTES (menu.routes.ts)
**Actual:** 6 endpoints
**Documented:** 5 endpoints (but generic/incorrect paths)
**Gap:** Specific paths missing

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| / | GET | ✅ Partial | HIGH | Get full menu |
| /items | GET | ❌ No | HIGH | Get all menu items |
| /items/:id | GET | ❌ No | HIGH | Get single item |
| /categories | GET | ❌ No | MEDIUM | Get categories |
| /sync-ai | POST | ❌ No | LOW | AI menu sync |
| /cache/clear | POST | ❌ No | LOW | Clear menu cache |

---

### ORDERS ROUTES (orders.routes.ts)
**Actual:** 6 endpoints
**Documented:** 5 endpoints
**Gap:** 1 critical endpoint missing

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| / | GET | ✅ Yes | HIGH | List orders |
| / | POST | ✅ Yes | HIGH | Create order |
| /voice | POST | ❌ No | HIGH | Voice order (CRITICAL!) |
| /:id | GET | ✅ Yes | HIGH | Get order |
| /:id/status | PATCH | ✅ Yes | HIGH | Update status |
| /:id | DELETE | ✅ Yes | MEDIUM | Cancel order |

---

### TABLES ROUTES (tables.routes.ts)
**Actual:** 7 endpoints
**Documented:** 4 endpoints
**Gap:** 3 missing

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| / | GET | ✅ Yes | HIGH | List tables |
| /:id | GET | ✅ Yes | HIGH | Get table |
| / | POST | ✅ Yes | HIGH | Create table |
| /:id | PUT | ✅ Yes | HIGH | Update table |
| /batch | PUT | ❌ No | HIGH | Batch update (CRITICAL!) |
| /:id/status | PATCH | ❌ No | MEDIUM | Update table status |
| /:id | DELETE | ❌ No | MEDIUM | Delete table |

---

### PAYMENTS ROUTES (payments.routes.ts)
**Actual:** 4 endpoints
**Documented:** 3 endpoints (but WRONG PATHS!)
**Gap:** Path mismatch + missing endpoint

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /create | POST | ⚠️ Wrong path | HIGH | Docs say /process |
| /cash | POST | ❌ No | HIGH | Cash payment (MISSING!) |
| /:paymentId | GET | ✅ Yes | HIGH | Get payment |
| /:paymentId/refund | POST | ✅ Partial | MEDIUM | Refund (path wrong in docs) |

---

### TERMINAL ROUTES (terminal.routes.ts)
**Actual:** 5 endpoints
**Documented:** 2 endpoints
**Gap:** 3 missing

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /checkout | POST | ✅ Partial | HIGH | Create checkout |
| /checkout/:checkoutId | GET | ❌ No | HIGH | Get checkout status |
| /checkout/:checkoutId/cancel | POST | ❌ No | MEDIUM | Cancel checkout |
| /checkout/:checkoutId/complete | POST | ❌ No | HIGH | Complete checkout |
| /devices | GET | ❌ No | MEDIUM | List terminal devices |

---

### AI ROUTES (ai.routes.ts)
**Actual:** 10 endpoints
**Documented:** 3 endpoints (vague)
**Gap:** 7 missing, paths don't match

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /menu | POST | ❌ No | MEDIUM | Upload menu for AI |
| /menu | GET | ❌ No | LOW | Get AI menu status |
| /transcribe | POST | ❌ No | HIGH | Transcribe audio |
| /transcribe-with-metadata | POST | ❌ No | MEDIUM | Transcribe with context |
| /parse-order | POST | ❌ No | HIGH | Parse order from text |
| /voice-chat | POST | ⚠️ Vague | HIGH | Voice chat interaction |
| /chat | POST | ❌ No | MEDIUM | Text chat |
| /health | GET | ❌ No | LOW | AI service health |
| /test-tts | POST | ❌ No | DEV-ONLY | Test TTS |
| /test-transcribe | POST | ❌ No | DEV-ONLY | Test transcription |

---

### REALTIME ROUTES (realtime.routes.ts)
**Actual:** 2 endpoints
**Documented:** 2 endpoints (as WebSocket, not REST)
**Gap:** Endpoints exist but documented as WS only

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /session | POST | ❌ No | HIGH | Create realtime session |
| /health | GET | ❌ No | LOW | Realtime service health |

---

### SECURITY ROUTES (security.routes.ts)
**Actual:** 4 endpoints
**Documented:** 3 endpoints (but WRONG PATHS!)
**Gap:** Path mismatch

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /events | GET | ⚠️ Wrong path | MEDIUM | Docs say /audit |
| /stats | GET | ❌ No | LOW | Security stats |
| /test | POST | ❌ No | DEV-ONLY | Test security |
| /config | GET | ❌ No | LOW | Security config |

---

### WEBHOOKS ROUTES (webhook.routes.ts)
**Actual:** 3 endpoints
**Documented:** 2 endpoints (generic)
**Gap:** 1 missing, paths don't match

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /payments | POST | ⚠️ Generic | MEDIUM | Docs say /square |
| /orders | POST | ❌ No | MEDIUM | Order webhooks |
| /inventory | POST | ❌ No | LOW | Inventory webhooks |

---

### RESTAURANTS ROUTES (restaurants.routes.ts)
**Actual:** 1 endpoint
**Documented:** 3 endpoints (but 2 don't exist!)
**Gap:** Docs claim endpoints that don't exist

| Endpoint | Method | Documented | Priority | Notes |
|----------|--------|------------|----------|-------|
| /:id | GET | ✅ Yes | HIGH | Get restaurant by ID/slug |
| / | GET | ⚠️ DOESN'T EXIST | N/A | Docs claim this exists |
| /:id | PUT | ⚠️ DOESN'T EXIST | N/A | Docs claim this exists |

---

## SUMMARY STATISTICS

**Total Actual Endpoints:** 62
**Total Documented in README:** ~35-40 (with many path errors)
**Accurate Documentation:** ~25 endpoints
**Missing Documentation:** ~37 endpoints
**Path Mismatches:** ~10 endpoints
**Documentation Accuracy:** ~40%

---

## PRIORITIZATION FOR DOCUMENTATION

### P0 - CRITICAL (Production-Breaking if Undocumented)
1. POST /orders/voice - Voice ordering endpoint
2. PUT /tables/batch - Batch table updates (Floor Plan Editor depends on this)
3. POST /payments/cash - Cash payment processing
4. POST /ai/transcribe - Voice transcription
5. POST /ai/parse-order - Order parsing from voice
6. GET /auth/me - Current user profile
7. GET /ready, /live - Kubernetes health probes

### P1 - HIGH (Important for Integrations)
8. GET /menu/items - Menu item listing
9. GET /menu/items/:id - Individual menu item
10. POST /terminal/checkout/:id/complete - Complete terminal checkout
11. GET /terminal/checkout/:id - Get checkout status
12. POST /realtime/session - Create realtime session
13. GET /items - Menu items endpoint
14. GET /categories - Menu categories

### P2 - MEDIUM (Nice to Have)
15-37. Remaining endpoints (admin tools, dev endpoints, status checks)

---

## ROOT CAUSE ANALYSIS

### Why This Happened:

1. **Documentation-Last Culture**
   - Features implemented → Merged → (Maybe) documented later
   - No "docs-required" gate in PR process

2. **No Automation**
   - No CI check comparing route definitions to OpenAPI spec
   - Manual sync between code and docs
   - No route → OpenAPI generation

3. **Rapid Development**
   - Voice ordering added ~10 endpoints quickly
   - Floor plan editor added batch endpoints
   - Payment refactor changed paths

4. **Path Refactoring**
   - /process → /create (payments)
   - /audit → /events (security)
   - Generic → specific paths (webhooks)
   - Docs didn't get updated

5. **Dev vs Prod Confusion**
   - Test endpoints (test-tts, test-transcribe) shouldn't be documented
   - But how to distinguish?

### Architectural Anti-Patterns Observed:

1. ❌ **No Single Source of Truth**
   - Route definitions live in code
   - OpenAPI spec is separate
   - README table is third copy
   - All three drift apart

2. ❌ **Manual Sync Process**
   - Developer remembers to update OpenAPI
   - Developer remembers to update README
   - Human error inevitable

3. ❌ **No Validation**
   - Can deploy undocumented endpoints
   - No warning when OpenAPI is stale
   - No coverage metric

4. ❌ **Mixed Concerns**
   - Production endpoints mixed with dev/test
   - No clear separation
   - Docs don't know which to include
