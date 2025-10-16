# Architecture Overview

**For detailed authentication and security architecture, see:**
- [AUTHENTICATION_ARCHITECTURE.md](./AUTHENTICATION_ARCHITECTURE.md) - Complete auth flows, session management, RLS
- [SECURITY.md](./SECURITY.md) - Security measures, compliance, agent safety

---

## System
```mermaid
graph LR
  subgraph Client[client (React+Vite)]
    UI[POS/KDS/Checkout]
    Voice[Voice Controls]
  end
  subgraph Server[server (Express+TS)]
    API[/REST/]
    WS[/WebSocket/]
    RT[/Realtime/]
    Pay[/Square Adapter/]
  end
  subgraph Supabase[DB+Auth+RLS]
    RLS[(Policies)]
    JWT[(Auth)]
  end
  UI --> API
  UI --> WS
  Voice --> RT
  API --> Supabase
  API --> Pay
  Pay --> Square[(Square)]
Order→Pay→KDS
```
mermaid
Copy code
sequenceDiagram
  participant C as Client
  participant S as Server
  participant DB as Supabase (RLS)
  participant SQ as Square
  C->>S: POST /orders (camelCase)
  S->>DB: insert order (tenant-scoped)
  S-->>C: 201
  C->>S: POST /payments {items, qty}  # no client totals
  S->>DB: compute totals
  S->>SQ: CreatePayment(total, idempotency)
  S-->>C: 200
  S-->>C: WS status updates
