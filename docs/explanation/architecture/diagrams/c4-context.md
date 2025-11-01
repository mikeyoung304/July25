# C4 Context Diagram - Restaurant OS

**Last Updated:** 2025-10-31

**Level**: Context (Level 1)
**Purpose**: Shows Restaurant OS in context of users and external systems

```mermaid
C4Context
  title Restaurant OS - System Context

  Person(customer, "Customer", "Orders food online or at kiosk")
  Person(staff, "Restaurant Staff", "Manages orders, kitchen, POS")
  Person(manager, "Restaurant Manager", "Configures system, views reports")

  System(restaurantOS, "Restaurant OS", "Multi-tenant restaurant management system")

  System_Ext(supabase, "Supabase", "Database, Auth, RLS")
  System_Ext(square, "Square", "Payment processing")
  System_Ext(openai, "OpenAI Realtime API", "Voice ordering AI")

  Rel(customer, restaurantOS, "Places orders", "HTTPS, WebSocket")
  Rel(staff, restaurantOS, "Manages operations", "HTTPS, WebSocket")
  Rel(manager, restaurantOS, "Configures", "HTTPS")

  Rel(restaurantOS, supabase, "Stores data, authenticates", "HTTPS, WebSocket")
  Rel(restaurantOS, square, "Processes payments", "HTTPS")
  Rel(restaurantOS, openai, "Voice transcription", "WebRTC")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

**Key Relationships:**
- Customers interact via web/kiosk for ordering
- Staff uses POS and KDS interfaces
- Managers configure menus and settings
- System integrates with Supabase (data), Square (payments), OpenAI (voice)
