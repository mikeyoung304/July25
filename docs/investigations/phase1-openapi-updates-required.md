# Phase 1: OpenAPI Documentation Updates Required

**Date:** 2025-11-06
**Status:** Ready for Implementation
**Estimated Time:** 6-8 hours

---

## Summary

This document specifies the exact updates needed to `docs/reference/api/openapi.yaml` to document 7 P0 critical endpoints and fix 10 path mismatches.

---

## SECTION 1: P0 Critical Endpoints to Add

### 1. POST /api/v1/orders/voice

**Location in OpenAPI:** `/paths`

**Endpoint Specification:**

```yaml
  /api/v1/orders/voice:
    post:
      tags:
        - Orders
        - Voice & AI
      summary: Create order via voice
      description: |
        Process voice-based order creation using OpenAI Realtime API.
        Accepts audio transcription, parses items using AI, validates against menu,
        and creates an order. Returns confidence score and formatted response.

        **Authentication:** Required
        **Scope:** `orders:create`
        **Rate Limit:** 10 requests/minute
      operationId: createVoiceOrder
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/RestaurantIdHeader'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - transcription
              properties:
                transcription:
                  type: string
                  description: Voice transcription text from client
                  example: "I'd like a Soul Bowl with extra tzatziki"
                audio_url:
                  type: string
                  format: uri
                  description: Optional URL to audio file for audit/playback
                metadata:
                  type: object
                  description: Optional metadata (session ID, client info)
      responses:
        '200':
          description: Order processed (success or failure)
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  order:
                    $ref: '#/components/schemas/Order'
                  confidence:
                    type: number
                    format: float
                    description: AI confidence score (0.0-1.0)
                  message:
                    type: string
                    description: User-friendly response message
                  suggestions:
                    type: array
                    items:
                      type: string
                    description: Suggested alternatives if parsing failed
              example:
                success: true
                order:
                  id: "uuid"
                  order_number: "ORD-1234"
                  items: [...]
                confidence: 0.85
                message: "Perfect! Your Soul Bowl will be ready in about 12 minutes."
        '400':
          description: Bad request (missing transcription)
        '401':
          description: Unauthorized (missing/invalid token)
        '403':
          description: Forbidden (missing scope)
```

---

### 2. PUT /api/v1/tables/batch

**Location in OpenAPI:** `/paths`

**Endpoint Specification:**

```yaml
  /api/v1/tables/batch:
    put:
      tags:
        - Tables
      summary: Batch update tables
      description: |
        Update multiple tables in a single optimized database operation.
        Used by Floor Plan Editor to save layout changes efficiently.
        Uses PostgreSQL RPC function for 40x performance improvement vs sequential updates.

        **Authentication:** Required
        **Scope:** `tables:write`
        **Performance:** ~2ms per table (vs 80ms sequential)
      operationId: batchUpdateTables
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/RestaurantIdHeader'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - tables
              properties:
                tables:
                  type: array
                  description: Array of table objects to update
                  items:
                    type: object
                    required:
                      - id
                    properties:
                      id:
                        type: string
                        format: uuid
                      label:
                        type: string
                      seats:
                        type: integer
                      x:
                        type: number
                        description: X position on canvas
                      y:
                        type: number
                        description: Y position on canvas
                      width:
                        type: number
                      height:
                        type: number
                      rotation:
                        type: integer
                        description: Rotation in degrees (0-360)
                      type:
                        type: string
                        enum: [circle, square, rectangle, chip_monkey]
                      status:
                        type: string
                        enum: [available, occupied, reserved, cleaning, unavailable]
                      z_index:
                        type: integer
                        description: Layer order for overlapping elements
            example:
              tables:
                - id: "uuid-1"
                  label: "T1"
                  seats: 4
                  x: 100
                  y: 200
                  width: 80
                  height: 80
                  rotation: 0
                  type: "circle"
                  status: "available"
                  z_index: 1
      responses:
        '200':
          description: Tables updated successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Table'
        '400':
          description: Bad request (invalid table data or duplicate names)
        '401':
          description: Unauthorized
```

---

### 3. POST /api/v1/payments/cash

**Location in OpenAPI:** `/paths`

**Endpoint Specification:**

```yaml
  /api/v1/payments/cash:
    post:
      tags:
        - Payments
      summary: Process cash payment
      description: |
        Record a cash payment for an order. Tracks amount received, change given,
        and closes the check. Does not integrate with Square (cash-only).

        **Authentication:** Required
        **Scope:** `payments:process`
      operationId: createCashPayment
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/RestaurantIdHeader'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - order_id
                - cash_received
              properties:
                order_id:
                  type: string
                  format: uuid
                cash_received:
                  type: number
                  format: float
                  description: Amount of cash received from customer (in dollars)
                  example: 20.00
            example:
              order_id: "uuid"
              cash_received: 20.00
      responses:
        '201':
          description: Cash payment processed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  order:
                    $ref: '#/components/schemas/Order'
                  payment:
                    type: object
                    properties:
                      payment_amount:
                        type: number
                        description: Actual order total
                      cash_received:
                        type: number
                      change_given:
                        type: number
                        description: Change returned to customer
                      payment_status:
                        type: string
                        enum: [paid]
              example:
                success: true
                order: {...}
                payment:
                  payment_amount: 15.50
                  cash_received: 20.00
                  change_given: 4.50
                  payment_status: "paid"
        '400':
          description: Bad request (missing order_id or insufficient cash)
        '404':
          description: Order not found
```

---

### 4. POST /api/v1/ai/transcribe

**Location in OpenAPI:** `/paths`

**Endpoint Specification:**

```yaml
  /api/v1/ai/transcribe:
    post:
      tags:
        - Voice & AI
      summary: Transcribe audio to text
      description: |
        Process audio file through OpenAI Whisper for transcription.
        Returns MP3 audio response for direct playback.
        Used by voice ordering system.

        **Authentication:** Not required (supports anonymous)
        **Rate Limit:** 100 requests/minute
      operationId: transcribeAudio
      parameters:
        - $ref: '#/components/parameters/RestaurantIdHeader'
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - audio
              properties:
                audio:
                  type: string
                  format: binary
                  description: Audio file (WAV, MP3, M4A, WebM)
      responses:
        '200':
          description: Audio processed successfully
          content:
            audio/mpeg:
              schema:
                type: string
                format: binary
                description: MP3 audio response
        '400':
          description: Bad request (missing audio file)
        '503':
          description: AI provider unavailable
          headers:
            x-ai-degraded:
              schema:
                type: string
                enum: ['true']
```

---

### 5. POST /api/v1/ai/parse-order

**Location in OpenAPI:** `/paths`

**Endpoint Specification:**

```yaml
  /api/v1/ai/parse-order:
    post:
      tags:
        - Voice & AI
      summary: Parse order from text
      description: |
        Use AI to parse natural language order text into structured menu items.
        Matches against restaurant menu, validates items, and returns parsed order.

        **Authentication:** Required
        **Scope:** `orders:create`
      operationId: parseOrder
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/RestaurantIdHeader'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - text
              properties:
                text:
                  type: string
                  description: Natural language order text
                  example: "I want two Greek Bowls with extra tzatziki and a Soul Bowl"
            example:
              text: "I want two Greek Bowls with extra tzatziki and a Soul Bowl"
      responses:
        '200':
          description: Order parsed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      type: object
                      properties:
                        menu_item_id:
                          type: string
                          format: uuid
                        name:
                          type: string
                        quantity:
                          type: integer
                        price:
                          type: number
                        modifications:
                          type: array
                          items:
                            type: string
                  confidence:
                    type: number
                    format: float
        '400':
          description: Bad request
        '401':
          description: Unauthorized
```

---

### 6. GET /api/v1/auth/me

**Location in OpenAPI:** `/paths`

**Endpoint Specification:**

```yaml
  /api/v1/auth/me:
    get:
      tags:
        - Authentication
      summary: Get current user profile
      description: |
        Retrieve the authenticated user's profile information including
        role, scopes, and restaurant access.

        **Authentication:** Required
      operationId: getCurrentUser
      security:
        - BearerAuth: []
      parameters:
        - $ref: '#/components/parameters/RestaurantIdHeader'
      responses:
        '200':
          description: User profile retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    type: object
                    properties:
                      id:
                        type: string
                        format: uuid
                      email:
                        type: string
                        format: email
                      role:
                        type: string
                        enum: [admin, manager, staff, customer]
                      scopes:
                        type: array
                        items:
                          type: string
                        example: ["orders:create", "orders:read", "payments:process"]
                      display_name:
                        type: string
                  restaurant:
                    type: object
                    properties:
                      id:
                        type: string
                        format: uuid
                      name:
                        type: string
                      slug:
                        type: string
        '401':
          description: Unauthorized (missing or invalid token)
```

---

### 7. GET /health/ready & GET /health/live

**Location in OpenAPI:** `/paths`

**Endpoint Specification:**

```yaml
  /health/ready:
    get:
      tags:
        - Health
      summary: Kubernetes readiness probe
      description: |
        Readiness probe for Kubernetes. Checks if the application is ready
        to receive traffic (database connected, dependencies healthy).

        **Authentication:** Not required
      operationId: healthReadiness
      responses:
        '200':
          description: Application is ready
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [ready]
                  timestamp:
                    type: string
                    format: date-time
                  checks:
                    type: object
                    properties:
                      database:
                        type: string
                        enum: [ok, degraded]
                      ai_service:
                        type: string
                        enum: [ok, degraded]
        '503':
          description: Application not ready

  /health/live:
    get:
      tags:
        - Health
      summary: Kubernetes liveness probe
      description: |
        Liveness probe for Kubernetes. Checks if the application process is alive.
        If this fails, Kubernetes will restart the container.

        **Authentication:** Not required
      operationId: healthLiveness
      responses:
        '200':
          description: Application is alive
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [alive]
                  uptime:
                    type: number
                    description: Seconds since startup
```

---

## SECTION 2: Path Mismatches to Fix

### 1. Payments Endpoints

**Current (WRONG):**
- POST /api/v1/payments/process
- POST /api/v1/payments/refund

**Actual (CORRECT):**
- POST /api/v1/payments/create
- POST /api/v1/payments/:paymentId/refund

**Action:**
1. Rename `/api/v1/payments/process` → `/api/v1/payments/create`
2. Update refund path to include `:paymentId` parameter

---

### 2. Menu Endpoints

**Current (INCOMPLETE):**
- Generic menu paths without specificity

**Actual (CORRECT):**
- GET /api/v1/menu (full menu)
- GET /api/v1/menu/items (all items)
- GET /api/v1/menu/items/:id (single item)
- GET /api/v1/menu/categories
- POST /api/v1/menu/sync-ai
- POST /api/v1/menu/cache/clear

**Action:**
Add missing specific paths for items, categories, sync-ai, cache/clear

---

### 3. Security Endpoints

**Current (WRONG):**
- GET /api/v1/security/audit

**Actual (CORRECT):**
- GET /api/v1/security/events
- GET /api/v1/security/stats
- GET /api/v1/security/config
- POST /api/v1/security/test

**Action:**
Rename audit → events, add stats/config/test

---

### 4. Webhook Endpoints

**Current (GENERIC):**
- POST /api/webhooks/square
- POST /api/webhooks/stripe

**Actual (SPECIFIC):**
- POST /api/v1/webhooks/payments
- POST /api/v1/webhooks/orders
- POST /api/v1/webhooks/inventory

**Action:**
Replace generic square/stripe with specific payments/orders/inventory

---

### 5. Tables Endpoints

**Missing:**
- PUT /api/v1/tables/batch (P0 - ALREADY DOCUMENTED ABOVE)
- PATCH /api/v1/tables/:id/status
- DELETE /api/v1/tables/:id

**Action:**
Add missing endpoints (batch already in P0 section)

---

### 6. Terminal Endpoints

**Missing:**
- GET /api/v1/terminal/checkout/:checkoutId
- POST /api/v1/terminal/checkout/:checkoutId/cancel
- POST /api/v1/terminal/checkout/:checkoutId/complete
- GET /api/v1/terminal/devices

**Action:**
Add missing checkout status and device endpoints

---

### 7. Auth Endpoints

**Missing:**
- GET /api/v1/auth/me (P0 - ALREADY DOCUMENTED ABOVE)
- POST /api/v1/auth/set-pin
- POST /api/v1/auth/revoke-stations

**Action:**
Add set-pin and revoke-stations endpoints

---

### 8. Health Endpoints

**Missing:**
- GET /health/ready (P0 - ALREADY DOCUMENTED ABOVE)
- GET /health/live (P0 - ALREADY DOCUMENTED ABOVE)
- GET /health/status
- GET /health/healthz

**Action:**
Add Kubernetes probes and status endpoints

---

### 9. Realtime Endpoints

**Missing:**
- POST /api/v1/realtime/session
- GET /api/v1/realtime/health

**Action:**
Add REST endpoints for realtime session management

---

### 10. Update Info Section

**Current:**
```yaml
info:
  version: 6.0.14
  x-last-updated: '2025-10-31'
```

**New:**
```yaml
info:
  version: 6.0.17
  x-last-updated: '2025-11-06'
```

**Action:**
Update version and date to reflect Phase 1 completion

---

## SECTION 3: Implementation Checklist

### High Priority (P0) - Do First

- [ ] Add POST /orders/voice endpoint
- [ ] Add PUT /tables/batch endpoint
- [ ] Add POST /payments/cash endpoint
- [ ] Add POST /ai/transcribe endpoint
- [ ] Add POST /ai/parse-order endpoint
- [ ] Add GET /auth/me endpoint
- [ ] Add GET /health/ready endpoint
- [ ] Add GET /health/live endpoint

### Medium Priority (Path Fixes) - Do Second

- [ ] Fix POST /payments/process → /payments/create
- [ ] Fix POST /payments/refund → /payments/:paymentId/refund
- [ ] Add GET /menu/items, /items/:id, /categories
- [ ] Fix GET /security/audit → /security/events
- [ ] Add GET /security/stats, /security/config
- [ ] Fix webhook paths (payments, orders, inventory)

### Low Priority (Nice to Have) - Do Third

- [ ] Add PATCH /tables/:id/status
- [ ] Add DELETE /tables/:id
- [ ] Add terminal checkout endpoints
- [ ] Add POST /auth/set-pin
- [ ] Add POST /auth/revoke-stations
- [ ] Add GET /health/status
- [ ] Add realtime endpoints

### Final Steps

- [ ] Update version to 6.0.17
- [ ] Update x-last-updated to 2025-11-06
- [ ] Validate with Swagger Editor
- [ ] Test with Redocly CLI
- [ ] Update API README.md table to match
- [ ] Commit with message: "docs: Phase 1 API documentation - P0 endpoints + path fixes"

---

## Validation Commands

After making changes:

```bash
# Validate OpenAPI spec
npx --yes @redocly/cli lint docs/reference/api/openapi.yaml

# Alternative: swagger-cli
npx @apidevtools/swagger-cli validate docs/reference/api/openapi.yaml

# View in Swagger Editor
# Open: https://editor.swagger.io/
# File → Import URL → Paste your openapi.yaml URL
```

---

## Estimated Time Breakdown

| Task | Time |
|------|------|
| Add 8 P0 endpoints (detailed schemas) | 4 hours |
| Fix 10 path mismatches | 2 hours |
| Validate and test | 1 hour |
| Update README table | 1 hour |
| **Total** | **8 hours** |

---

## Success Criteria

✅ All 7 P0 endpoints fully documented in OpenAPI
✅ All 10 path mismatches corrected
✅ OpenAPI validates without errors (Swagger/Redocly)
✅ README table matches OpenAPI spec
✅ No breaking changes to existing documented endpoints
✅ Version bumped to 6.0.17

---

**Next Step:** Begin implementation by opening `docs/reference/api/openapi.yaml` and adding the P0 endpoint sections from this document.
