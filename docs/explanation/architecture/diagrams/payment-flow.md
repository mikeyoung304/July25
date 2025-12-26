# Payment Processing Flow

**Last Updated:** 2025-10-31

## Server-Side Amount Validation

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant DB as Supabase
    participant Stripe as Stripe API

    Client->>API: POST /orders {items, qty}
    Note over Client: Client does NOT send totals
    API->>DB: Fetch menu items
    DB-->>API: Item prices
    API->>API: Calculate total (server-side)
    API->>DB: Insert order
    API-->>Client: {orderId, total}

    Client->>API: POST /payments {orderId, paymentMethodId}
    API->>DB: Fetch order
    DB-->>API: Order with items
    API->>API: Recalculate & validate total
    API->>Stripe: CreatePaymentIntent(total, idempotencyKey)
    Stripe-->>API: {paymentIntentId, status}
    API->>DB: Update order status
    API-->>Client: {paymentId, receiptUrl}
```

**Security Design:**
- Clients send items + quantities only
- Server calculates totals from authoritative menu prices
- Prevents client-side price manipulation
- Idempotency keys prevent duplicate charges
