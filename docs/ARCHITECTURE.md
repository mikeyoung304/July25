# Architecture Overview

## System
```mermaid
graph LR
  subgraph Client[client (React+Vite)]
    UI[POS/KDS/Checkout]
    VoiceUI[Voice Controls]
  end
  subgraph Server[server (Express+TS)]
    API[/REST/]
    WS[/WebSocket/]
    RT[/Realtime Session/]
    Pay[/Square Adapter/]
  end
  subgraph Supabase[DB+Auth+RLS]
    RLS[(Policies)]
    JWT[(Auth)]
  end
  UI --> API
  UI --> WS
  VoiceUI --> RT
  API --> Supabase
  API --> Pay
  Pay --> Square[(Square)]
Request/Data (Order → Pay → KDS)
mermaid
Copy code
sequenceDiagram
  participant C as Client
  participant S as Server
  participant DB as Supabase (RLS)
  participant SQ as Square
  C->>S: POST /orders (camelCase)
  S->>DB: Insert order (tenant-scoped)
  S-->>C: 201
  C->>S: POST /payments {items, qty}  # no client totals
  S->>DB: Compute totals
  S->>SQ: CreatePayment(total, idempotency)
  S-->>C: 200
  S-->>C: WS status updates
CI/Build (doc-only workflow)
.github/workflows/docs-ci.yml runs docs checks; app CI unchanged.
