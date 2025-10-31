# Authentication Flow Diagrams

## Production Authentication (Supabase JWT)

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant API as API Server
    participant SB as Supabase

    C->>API: POST /auth/login {email, password}
    API->>SB: signInWithPassword()
    SB-->>API: {session, user, JWT}
    API-->>C: {token: supabaseJWT, user}

    Note over C: Store JWT in memory/localStorage

    C->>API: GET /orders (Authorization: Bearer JWT)
    API->>SB: Verify JWT + RLS query
    SB-->>API: Orders (filtered by tenant)
    API-->>C: Orders
```

## Development Authentication (JWT Fallback)

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant API as API Server
    participant DB as Supabase (Direct)

    C->>API: POST /auth/login {email, password}
    API->>DB: Direct query (bypasses RLS)
    DB-->>API: User record
    API->>API: Generate JWT (local secret)
    API-->>C: {token: jwtFallback, user}

    Note over C: Store JWT in memory/localStorage

    C->>API: GET /orders (Authorization: Bearer JWT)
    API->>API: Verify JWT (local)
    API->>DB: Query with restaurant_id filter
    DB-->>API: Orders
    API-->>C: Orders
```

**Key Differences:**
- Production: Supabase handles auth, RLS enforced at database level
- Development: API server handles auth, filtering done in application code
- See [ADR-006](../../ADR-006-dual-authentication-pattern.md) for migration strategy
