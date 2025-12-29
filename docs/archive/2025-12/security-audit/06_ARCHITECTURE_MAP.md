# ARCHITECTURE MAP

**Audit Date**: 2025-12-28
**System**: Grow / Restaurant OS (rebuild-6.0)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                     GROW / RESTAURANT OS                                 │
│                                     rebuild-6.0 Architecture                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────────┐
                    │                    CLIENT TIER                           │
                    │                 (React 18.3.1 + Vite)                    │
                    ├─────────────────────────────────────────────────────────┤
                    │                                                          │
                    │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
                    │   │   POS   │  │   KDS   │  │  Kiosk  │  │  Admin  │   │
                    │   │ Tablet  │  │ Display │  │ Station │  │   Web   │   │
                    │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │
                    │        │            │            │            │         │
                    │        └────────────┴─────┬──────┴────────────┘         │
                    │                           │                              │
                    │   ┌───────────────────────┴───────────────────────┐     │
                    │   │              SHARED COMPONENTS                 │     │
                    │   │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │     │
                    │   │  │  Auth   │ │  HTTP   │ │   WebSocket     │  │     │
                    │   │  │ Context │ │ Client  │ │     Client      │  │     │
                    │   │  └────┬────┘ └────┬────┘ └────────┬────────┘  │     │
                    │   └───────┼───────────┼───────────────┼───────────┘     │
                    │           │           │               │                  │
                    └───────────┼───────────┼───────────────┼──────────────────┘
                                │           │               │
                    ════════════╪═══════════╪═══════════════╪══════════════════
                      HTTPS/JWT │   REST    │    WS/WSS     │   NETWORK BOUNDARY
                    ════════════╪═══════════╪═══════════════╪══════════════════
                                │           │               │
                    ┌───────────┼───────────┼───────────────┼──────────────────┐
                    │           │           │               │                   │
                    │   ┌───────┴───────────┴───────────────┴───────────┐      │
                    │   │                 EXPRESS SERVER                  │      │
                    │   │              (Node.js + TypeScript)             │      │
                    │   ├─────────────────────────────────────────────────┤      │
                    │   │                                                  │      │
                    │   │   ┌─────────────────────────────────────────┐   │      │
                    │   │   │            MIDDLEWARE LAYER              │   │      │
                    │   │   │  ┌────────┐ ┌────────┐ ┌────────────┐   │   │      │
                    │   │   │  │  Auth  │ │  Rate  │ │ Restaurant │   │   │      │
                    │   │   │  │Validate│ │ Limit  │ │  Access    │   │   │      │
                    │   │   │  └────────┘ └────────┘ └────────────┘   │   │      │
                    │   │   └─────────────────────────────────────────┘   │      │
                    │   │                      │                           │      │
                    │   │   ┌──────────────────┴──────────────────┐       │      │
                    │   │   │           ROUTE LAYER                │       │      │
                    │   │   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│       │      │
                    │   │   │  │Orders│ │Menu  │ │ Auth │ │Paymnt││       │      │
                    │   │   │  │Routes│ │Routes│ │Routes│ │Routes││       │      │
                    │   │   │  └──────┘ └──────┘ └──────┘ └──────┘│       │      │
                    │   │   └─────────────────────────────────────┘       │      │
                    │   │                      │                           │      │
                    │   │   ┌──────────────────┴──────────────────┐       │      │
                    │   │   │          SERVICE LAYER               │       │      │
                    │   │   │  ┌───────────┐  ┌───────────────┐   │       │      │
                    │   │   │  │   Order   │  │    Payment    │   │       │      │
                    │   │   │  │  Machine  │  │    Service    │   │       │      │
                    │   │   │  └───────────┘  └───────────────┘   │       │      │
                    │   │   │  ┌───────────┐  ┌───────────────┐   │       │      │
                    │   │   │  │   Auth    │  │   Embedding   │   │       │      │
                    │   │   │  │  Service  │  │    Service    │   │       │      │
                    │   │   │  └───────────┘  └───────────────┘   │       │      │
                    │   │   └─────────────────────────────────────┘       │      │
                    │   └─────────────────────────────────────────────────┘      │
                    │                          │                                  │
                    │                    SERVER TIER                              │
                    │                  (Render Deployment)                        │
                    └──────────────────────────┼──────────────────────────────────┘
                                               │
                    ═══════════════════════════╪═══════════════════════════════════
                              DATABASE TIER    │    EXTERNAL SERVICES
                    ═══════════════════════════╪═══════════════════════════════════
                                               │
          ┌────────────────────────────────────┼────────────────────────────────────┐
          │                                    │                                     │
          │   ┌────────────────────────────────┴───────────────────────────────┐   │
          │   │                         SUPABASE                                │   │
          │   │                    (Managed PostgreSQL)                         │   │
          │   ├─────────────────────────────────────────────────────────────────┤   │
          │   │                                                                  │   │
          │   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │   │
          │   │   │ PostgreSQL  │  │  Supabase   │  │   RLS Policies      │    │   │
          │   │   │   Tables    │  │    Auth     │  │   (13 tables)       │    │   │
          │   │   │  (13 core)  │  │   Service   │  │  restaurant_id      │    │   │
          │   │   └─────────────┘  └─────────────┘  └─────────────────────┘    │   │
          │   │                                                                  │   │
          │   └──────────────────────────────────────────────────────────────────┘   │
          │                                                                          │
          │   ┌──────────────────────────────────────────────────────────────────┐  │
          │   │                     EXTERNAL SERVICES                             │  │
          │   ├──────────────────────────────────────────────────────────────────┤  │
          │   │                                                                   │  │
          │   │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │  │
          │   │   │ Stripe  │    │ OpenAI  │    │ Twilio  │    │ Resend  │      │  │
          │   │   │Payments │    │Embedding│    │   SMS   │    │  Email  │      │  │
          │   │   └─────────┘    └─────────┘    └─────────┘    └─────────┘      │  │
          │   │                                                                   │  │
          │   └───────────────────────────────────────────────────────────────────┘  │
          │                                                                          │
          └──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Order Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORDER CREATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐                                                    ┌──────────┐
  │   POS    │                                                    │ Supabase │
  │  Client  │                                                    │    DB    │
  └────┬─────┘                                                    └────┬─────┘
       │                                                               │
       │  1. POST /api/orders                                          │
       │     {items, table_id, customer_name}                          │
       │     + JWT token                                               │
       │─────────────────────────────────────────────►┌─────────┐      │
       │                                              │ Express │      │
       │                                              │ Server  │      │
       │                                              └────┬────┘      │
       │                                                   │           │
       │                        2. Validate JWT            │           │
       │                           Extract restaurant_id   │           │
       │                        ◄─────────────────────────►│           │
       │                                                   │           │
       │                        3. Validate items exist    │           │
       │                           Check menu_items table  │           │
       │                                                   │──────────►│
       │                                                   │◄──────────│
       │                                                   │           │
       │                        4. Calculate totals        │           │
       │                           Apply tax rate          │           │
       │                        ◄─────────────────────────►│           │
       │                                                   │           │
       │                        5. OrderStateMachine       │           │
       │                           status = 'new'          │           │
       │                        ◄─────────────────────────►│           │
       │                                                   │           │
       │                        6. INSERT order            │           │
       │                           with restaurant_id      │           │
       │                                                   │──────────►│
       │                                                   │◄──────────│
       │                                                   │           │
       │                        7. Trigger notifications   │           │
       │                           (if hooks configured)   │           │
       │                        ◄─────────────────────────►│           │
       │                                                   │           │
       │  8. Response: Order created                       │           │
       │     {id, status: 'new', ...}                      │           │
       │◄──────────────────────────────────────────────────│           │
       │                                                   │           │
       │  9. WebSocket broadcast                           │           │
       │     ORDER_CREATED event                           │           │
       │◄ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│           │
       │                                                               │
```

### Payment Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PAYMENT PROCESSING FLOW                             │
│                         (Two-Phase Audit Logging)                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
  │  Client  │        │  Server  │        │ Supabase │        │  Stripe  │
  └────┬─────┘        └────┬─────┘        └────┬─────┘        └────┬─────┘
       │                   │                   │                   │
       │ 1. POST /api/payments/create-intent   │                   │
       │    {orderId, amount}                  │                   │
       │──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ 2. Validate order │                   │
       │                   │    Get from DB    │                   │
       │                   │──────────────────►│                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │                   │ 3. Recalculate total                  │
       │                   │    (NEVER trust client)               │
       │                   │◄─────────────────►│                   │
       │                   │                   │                   │
       │                   │ 4. Generate idempotency key           │
       │                   │    pay_{rest}_{order}_{ts}_{nonce}    │
       │                   │◄─────────────────►│                   │
       │                   │                   │                   │
       │                   │ 5. PHASE 1: Log BEFORE charge         │
       │                   │    status = 'initiated'               │
       │                   │──────────────────►│                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │                   │ 6. Create PaymentIntent               │
       │                   │    with idempotency_key               │
       │                   │───────────────────────────────────────►
       │                   │◄───────────────────────────────────────
       │                   │    {client_secret}                    │
       │                   │                   │                   │
       │ 7. Return client_secret               │                   │
       │◄──────────────────│                   │                   │
       │                   │                   │                   │
       │ 8. Stripe.js confirmPayment           │                   │
       │   (client-side)   │                   │                   │
       │───────────────────────────────────────────────────────────►
       │◄───────────────────────────────────────────────────────────
       │                   │                   │                   │
       │ 9. POST /api/payments/confirm         │                   │
       │    {paymentIntentId}                  │                   │
       │──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ 10. Verify with Stripe                │
       │                   │───────────────────────────────────────►
       │                   │◄───────────────────────────────────────
       │                   │                   │                   │
       │                   │ 11. PHASE 2: Update audit log         │
       │                   │     status = 'success'                │
       │                   │──────────────────►│                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │                   │ 12. Update order                      │
       │                   │     payment_status = 'paid'           │
       │                   │──────────────────►│                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │ 13. Payment confirmed                 │                   │
       │◄──────────────────│                   │                   │
       │                   │                   │                   │
```

### Authentication Flow (Multi-Path)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW (4 PATHS)                            │
└─────────────────────────────────────────────────────────────────────────────┘

PATH 1: SUPABASE AUTH (Primary - Admin/Manager Web Access)
═══════════════════════════════════════════════════════════

  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │  Client  │        │ Supabase │        │  Server  │
  └────┬─────┘        └────┬─────┘        └────┬─────┘
       │                   │                   │
       │ signInWithPassword│                   │
       │──────────────────►│                   │
       │◄──────────────────│                   │
       │   {access_token}  │                   │
       │                   │                   │
       │ API request + Bearer token            │
       │───────────────────────────────────────►
       │                   │                   │
       │                   │ Verify JWT        │
       │                   │◄──────────────────│
       │                   │──────────────────►│
       │                   │                   │
       │ Response                              │
       │◄───────────────────────────────────────


PATH 2: PIN AUTH (Shared Devices - Staff)
═════════════════════════════════════════

  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │  Client  │        │  Server  │        │ Supabase │
  └────┬─────┘        └────┬─────┘        └────┬─────┘
       │                   │                   │
       │ POST /api/auth/pin-login              │
       │   {restaurantId, pin}                 │
       │──────────────────►│                   │
       │                   │                   │
       │                   │ Lookup PIN hash   │
       │                   │──────────────────►│
       │                   │◄──────────────────│
       │                   │                   │
       │                   │ Verify bcrypt     │
       │                   │ (⚠️ timing risk)  │
       │                   │◄─────────────────►│
       │                   │                   │
       │                   │ Generate JWT      │
       │                   │ (server-signed)   │
       │                   │◄─────────────────►│
       │                   │                   │
       │ {token}           │                   │
       │◄──────────────────│                   │
       │                   │                   │
       │ Store in localStorage                 │
       │ (⚠️ XSS RISK)     │                   │
       │◄─────────────────►│                   │


PATH 3: STATION AUTH (KDS Displays - No User)
═════════════════════════════════════════════

  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │   KDS    │        │  Server  │        │ Supabase │
  └────┬─────┘        └────┬─────┘        └────┬─────┘
       │                   │                   │
       │ POST /api/auth/station               │
       │   {stationId, secret}                │
       │──────────────────►│                   │
       │                   │                   │
       │                   │ Verify secret     │
       │                   │ (⚠️ weak default)│
       │                   │◄─────────────────►│
       │                   │                   │
       │                   │ Lookup station    │
       │                   │──────────────────►│
       │                   │◄──────────────────│
       │                   │                   │
       │ {stationToken}    │                   │
       │◄──────────────────│                   │
       │                   │                   │
       │ Store in localStorage                 │
       │◄─────────────────►│                   │


PATH 4: DEMO AUTH (Sales/Onboarding - VULNERABLE)
════════════════════════════════════════════════

  ┌──────────┐        ┌──────────┐
  │  Client  │        │  Server  │
  └────┬─────┘        └────┬─────┘
       │                   │
       │ POST /api/auth/demo                   │
       │   {restaurantId}                      │
       │──────────────────►│                   │
       │                   │                   │
       │                   │ Generate JWT      │
       │                   │ sub = "demo:..."  │
       │                   │ (⚠️ NO VALIDATION)│
       │                   │◄─────────────────►│
       │                   │                   │
       │ {demoToken}       │                   │
       │◄──────────────────│                   │
       │                   │                   │
       │                   │                   │
       │ API request       │                   │
       │──────────────────►│                   │
       │                   │                   │
       │                   │ Check sub prefix  │
       │                   │ if "demo:" →      │
       │                   │ SKIP ALL CHECKS   │
       │                   │ (⚠️ CRITICAL)     │
       │                   │◄─────────────────►│
       │                   │                   │
       │ Full access       │                   │
       │◄──────────────────│                   │
```

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA (13 Core Tables)                     │
│                            All with restaurant_id RLS                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│    restaurants    │      │      users        │      │    user_pins      │
├───────────────────┤      ├───────────────────┤      ├───────────────────┤
│ id (PK)           │◄────┐│ id (PK)           │      │ id (PK)           │
│ name              │     ││ email             │      │ user_id (FK)      │
│ slug              │     ││ restaurant_id(FK)─┼──────│ pin_hash          │
│ settings (JSONB)  │     ││ role              │      │ restaurant_id(FK) │
│ tax_rate          │     │└───────────────────┘      │ failed_attempts   │
│ created_at        │     │                           │ locked_until      │
└───────────────────┘     │                           └───────────────────┘
         │                │
         │                │
         ▼                │
┌───────────────────┐     │      ┌───────────────────┐
│   menu_items      │     │      │    categories     │
├───────────────────┤     │      ├───────────────────┤
│ id (PK)           │     │      │ id (PK)           │
│ restaurant_id(FK)─┼─────┘      │ restaurant_id(FK) │
│ category_id (FK)──┼────────────│ name              │
│ name              │            │ sort_order        │
│ price             │            └───────────────────┘
│ description       │
│ modifiers (JSONB) │
│ available         │
└───────────────────┘
         │
         │
         ▼
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│      orders       │      │    order_items    │      │      tables       │
├───────────────────┤      ├───────────────────┤      ├───────────────────┤
│ id (PK)           │◄─────│ order_id (FK)     │      │ id (PK)           │
│ restaurant_id(FK) │      │ menu_item_id (FK) │      │ restaurant_id(FK) │
│ table_id (FK)     │◄─────┼───────────────────┼──────│ number            │
│ user_id (FK)      │      │ quantity          │      │ status            │
│ status            │      │ price             │      │ capacity          │
│ payment_status    │      │ modifiers (JSONB) │      └───────────────────┘
│ total             │      │ notes             │
│ items (JSONB)     │      └───────────────────┘
│ created_at        │
│ updated_at        │
└───────────────────┘
         │
         │
         ▼
┌───────────────────┐      ┌───────────────────┐
│ payment_audit_logs│      │     stations      │
├───────────────────┤      ├───────────────────┤
│ id (PK)           │      │ id (PK)           │
│ order_id (FK)     │      │ restaurant_id(FK) │
│ restaurant_id(FK) │      │ name              │
│ amount            │      │ type              │
│ status            │      │ settings (JSONB)  │
│ payment_id        │      └───────────────────┘
│ idempotency_key   │
│ created_at        │      ┌───────────────────┐
│ updated_at        │      │   role_scopes     │
└───────────────────┘      ├───────────────────┤
                           │ id (PK)           │
┌───────────────────┐      │ restaurant_id(FK) │
│    auth_logs      │      │ role              │
├───────────────────┤      │ scopes (JSONB)    │
│ id (PK)           │      └───────────────────┘
│ restaurant_id(FK) │
│ user_id           │
│ event_type        │
│ ip_address        │
│ created_at        │
└───────────────────┘
```

---

## Component Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPONENT DEPENDENCIES                                │
└─────────────────────────────────────────────────────────────────────────────┘

CLIENT LAYER
════════════

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
  │   │   Pages/    │────►│  Contexts/  │────►│  Services/  │               │
  │   │  Components │     │  Providers  │     │   Clients   │               │
  │   └─────────────┘     └─────────────┘     └──────┬──────┘               │
  │                                                   │                      │
  │                           ┌───────────────────────┼───────────────────┐ │
  │                           │                       │                    │ │
  │                           ▼                       ▼                    │ │
  │                    ┌─────────────┐         ┌─────────────┐            │ │
  │                    │AuthContext  │         │ httpClient  │            │ │
  │                    │ • Supabase  │         │ • Axios     │            │ │
  │                    │ • localStorage│       │ • JWT inject│            │ │
  │                    └─────────────┘         └─────────────┘            │ │
  │                                                                        │ │
  └────────────────────────────────────────────────────────────────────────┘ │
                                                                              │
                                          HTTP/WS                             │
  ═══════════════════════════════════════════════════════════════════════════╪


SERVER LAYER
════════════

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
  │   │   Routes/   │────►│ Middleware/ │────►│  Services/  │               │
  │   │  Endpoints  │     │  Validators │     │   Business  │               │
  │   └─────────────┘     └─────────────┘     └──────┬──────┘               │
  │                                                   │                      │
  │        ┌──────────────────────────────────────────┼──────────────────┐  │
  │        │                                          │                   │  │
  │        ▼                                          ▼                   │  │
  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐│  │
  │ │ auth.ts     │  │rateLimiter  │  │ OrderStateMachine               ││  │
  │ │ • JWT verify│  │ • In-memory │  │ • Transition validation         ││  │
  │ │ • Multi-path│  │ • Rate check│  │ • Side effect hooks             ││  │
  │ └─────────────┘  └─────────────┘  └─────────────────────────────────┘│  │
  │        │                                          │                   │  │
  │        └──────────────────────────────────────────┼───────────────────┘  │
  │                                                   │                      │
  │                                                   ▼                      │
  │                                            ┌─────────────┐               │
  │                                            │   supabase  │               │
  │                                            │   client    │               │
  │                                            └──────┬──────┘               │
  │                                                   │                      │
  └───────────────────────────────────────────────────┼──────────────────────┘
                                                      │
                                           Database Connection


SHARED LAYER
════════════

  ┌─────────────────────────────────────────────────────────────────────────┐
  │   @rebuild/shared                                                        │
  │                                                                          │
  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
  │   │   types/    │     │   config/   │     │  schemas/   │               │
  │   │ • Order     │     │ • browser   │     │ • Zod       │               │
  │   │ • User      │     │ • server    │     │ • Validators│               │
  │   │ • Payment   │     │             │     │             │               │
  │   └─────────────┘     └─────────────┘     └─────────────┘               │
  │                                                                          │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Paths

### Path 1: Order to Kitchen (Latency Critical)

```
POS → Server → DB → WebSocket → KDS

Target: <500ms end-to-end
Risk Points:
  • DB query latency under load
  • WebSocket message delivery
  • KDS reconnection handling
```

### Path 2: Payment Processing (Reliability Critical)

```
Client → Server → Audit Log → Stripe → Audit Log → DB Update

Target: 100% audit coverage
Risk Points:
  • Audit log failure blocks payment
  • Network timeout to Stripe
  • Double-charge prevention
```

### Path 3: PIN Authentication (Security Critical)

```
Client → Server → DB (PIN lookup) → bcrypt verify → JWT sign → Client

Target: No enumeration, no brute force
Risk Points:
  • Timing attack on user lookup
  • Rate limit bypass on restart
  • Weak JWT secret
```

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
