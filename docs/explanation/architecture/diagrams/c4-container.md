# C4 Container Diagram - Restaurant OS

**Level**: Container (Level 2)
**Purpose**: Shows high-level technical architecture

```mermaid
C4Container
  title Restaurant OS - Container Diagram

  Person(customer, "Customer")
  Person(staff, "Restaurant Staff")

  Container_Boundary(restaurantOS, "Restaurant OS") {
    Container(spa, "React SPA", "React 18.3", "POS, KDS, Checkout, Voice UI")
    Container(api, "API Server", "Node.js/Express", "REST API, WebSocket, Auth")
  }

  System_Ext(supabase, "Supabase", "Postgres + RLS")
  System_Ext(square, "Square API", "Payments")
  System_Ext(openai, "OpenAI Realtime", "Voice AI")

  Rel(customer, spa, "Uses", "HTTPS")
  Rel(staff, spa, "Uses", "HTTPS")

  Rel(spa, api, "API calls", "HTTPS/WSS")
  Rel(spa, openai, "Voice stream", "WebRTC")

  Rel(api, supabase, "Read/Write", "HTTPS")
  Rel(api, square, "Process payments", "HTTPS")
  Rel(api, openai, "Get session token", "HTTPS")

  UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

**Architecture Notes:**
- **React SPA**: Client-side application with multiple modules (POS, KDS, Checkout, Voice)
- **API Server**: Node.js backend with Express, handles business logic and integrations
- **Supabase**: Postgres database with Row-Level Security (RLS) for multi-tenancy
- **Direct WebRTC**: Client connects directly to OpenAI for low-latency voice
