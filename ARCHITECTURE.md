# Architecture Decision Record #001: Unified Backend

## Status
**ACTIVE** - This decision is in effect and MUST be followed

## Decision
"For simplicity, let's put it all in the same backend" - Luis, Backend Architect

## What This Means
- ONE backend service on port 3001 (includes API + AI + WebSocket)  
- ONE frontend on port 5173
- NO microservices
- NO separate AI Gateway
- NO port 3002 (this port should not exist anywhere)

## The Law of the Land
1. If documentation conflicts with this, the documentation is WRONG
2. If code conflicts with this, the code is WRONG  
3. This document is the TRUTH

## Architecture Diagram
```mermaid
flowchart LR
  subgraph Client [Client (React/Vite)]
    UI
  end

  subgraph Server [Server (Express on 3001)]
    REST[REST /api/v1/*]
    AI[AI Modules (Transcriber | OrderNLP | Chat | TTS)]
    WS[WebSocket (KDS/stream)]
    Metrics[Metrics & Health]
  end

  DB[(Supabase/Postgres)]
  OpenAI[(OpenAI API)]
  Square[(Square Payments)]

  UI --> REST
  REST --> DB
  REST --> Square
  REST --> AI
  AI --> OpenAI
  UI <--> WS
```
                            ┌─────────────────┐
                            │   Supabase      │
                            │   (Database)    │
                            └─────────────────┘
```

## Historical Context (Why This Matters)
We started with microservices (AI Gateway on 3002) but Luis made the architectural decision to unify. Some code and documentation still references the old architecture. These are BUGS to be fixed, not patterns to follow.

## Enforcement
- Any PR that introduces port 3002 must be rejected
- Any documentation referencing "AI Gateway" as separate service must be corrected
- Any code attempting to connect to port 3002 must be refactored

## Implementation Details

### What Goes Where
- **Frontend** (`client/`): All React/UI code
- **Backend** (`server/`): ALL server-side code including:
  - REST API endpoints
  - AI/Voice processing
  - WebSocket handlers
  - Database operations

### Correct Endpoints
- REST API: `http://localhost:3001/api/v1/*`
- AI endpoints: `http://localhost:3001/api/v1/ai/*`
- WebSocket: `ws://localhost:3001`

### Environment Variables
All environment variables are in the root `.env` file:
```env
# Backend Configuration
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# AI Integration
OPENAI_API_KEY=your_openai_api_key

# Frontend Configuration (VITE_ prefix required)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Common Violations and Fixes

### ❌ WRONG
```javascript
const ws = new WebSocket('ws://localhost:3002/voice-stream');
fetch('http://localhost:3002/chat');
```

### ✅ CORRECT
```javascript
const ws = new WebSocket('ws://localhost:3001/voice-stream');
fetch('http://localhost:3001/api/v1/ai/chat');
```

## Decision Rationale
Luis evaluated microservices architecture and determined:
1. **Unnecessary Complexity**: Multiple services added overhead without benefit
2. **Development Friction**: Developers had to manage multiple services
3. **Deployment Complexity**: More services = more failure points
4. **Performance**: Inter-service communication added latency

## Consequences
- ✅ **Positive**: Simpler development, deployment, and debugging
- ⚠️ **Trade-off**: Less granular scaling (acceptable for our scale)

## Review Date
This decision will be reviewed if we reach 10,000+ concurrent users or require independent scaling of AI services. Until then, this architecture is NON-NEGOTIABLE.

## API Structure (From Unified Backend)

All endpoints served from port 3001:

### Standard REST API
```
GET    /api/v1/health
GET    /api/v1/status
GET    /api/v1/menu
POST   /api/v1/orders
PATCH  /api/v1/orders/:id/status
GET    /api/v1/tables
```

### AI/Voice Endpoints
```
POST   /api/v1/ai/transcribe
POST   /api/v1/ai/chat
POST   /api/v1/ai/parse-order
POST   /api/v1/ai/menu-upload
```

### WebSocket
```
ws://localhost:3001          # Development
wss://production.com         # Production
```

## Security Architecture

### Authentication Flow
1. User authenticates via Supabase Auth
2. Frontend receives JWT token with restaurant claims
3. Token sent with API requests including X-Restaurant-ID header
4. Backend validates token with Supabase and extracts restaurant context
5. RLS policies enforce multi-tenant access control

### Multi-tenancy
- Restaurant ID in JWT claims
- X-Restaurant-ID header validation
- Database RLS policies for tenant isolation
- Service-level restaurant context validation
- AI requests include restaurant_id for context isolation

### AI Service Security
**CRITICAL**: AI service integration maintains strict security boundaries through internal processing.

#### The Golden Rule
**Never expose AI service keys to the frontend**. All AI operations are handled internally by the backend with proper authentication and tenant context.

#### Implementation
```
Frontend                    Backend                     AI Services
─────────                  ─────────                   ──────────
TranscriptionService  →    /api/v1/ai/transcribe  →   OpenAI API
(No AI SDK imports)        (AI Modules)                (Internal)
     ↓                            ↓                           ↓
Authenticated HTTP         Restaurant context          AI Processing
   Request                 + OpenAI integration        (Secure)
```

#### Security Measures
1. **No Direct AI Access**: AI services only accessible from backend
2. **No Client-Side AI Config**: No VITE_OPENAI_KEY or similar
3. **Authentication Required**: All AI endpoints require valid JWT
4. **Restaurant Context**: Every AI request includes restaurant_id
5. **Rate Limiting**: Prevents abuse of expensive AI operations
6. **Service Isolation**: AI failures don't compromise core functionality
7. **File Validation**: Audio/image uploads validated before AI processing

#### Forbidden Patterns
```javascript
// ❌ NEVER in client code - direct AI service access
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': 'Bearer sk-...' }
});

// ❌ NEVER expose AI keys to browser
VITE_OPENAI_API_KEY=sk-...
```

#### Correct Pattern
```javascript
// ✅ Client makes authenticated API call to backend only
const response = await fetch('/api/v1/ai/transcribe', {
  headers: { 
    'Authorization': `Bearer ${token}`,
    'X-Restaurant-ID': restaurantId
  },
  body: audioFormData
});

// ✅ Backend handles AI with restaurant context (server-side only)
const response = await this.aiService.processVoice(
  audioBuffer, 
  restaurantId
);
```

### Environment Security

**Secure Configuration:**
```env
# Backend-only AI configuration
OPENAI_API_KEY=sk-your-secret-key

# Frontend has no AI service access
VITE_API_BASE_URL=http://localhost:3001
```

## Production Deployment

```
┌─────────────────┐
│   CloudFlare    │
│   CDN/WAF       │
└────────┬────────┘
         │
┌────────▼────────┐
│   Load Balancer │
└────────┬────────┘
         │
┌────────▼────────┐
│   Node.js       │
│   Server        │
│   (Port 3001)   │
└────────┬────────┘
         │
┌────────▼────────┐
│   Supabase      │
│   Cloud         │
└─────────────────┘
```

## Shared Types Module

### Decision
To ensure type consistency across client and server, we created a shared types module.

### Implementation
```
shared/
├── types/
│   ├── order.types.ts     # Order, OrderItem, OrderStatus types
│   ├── menu.types.ts      # MenuItem, MenuCategory types
│   ├── customer.types.ts  # Customer, CustomerAddress types
│   ├── table.types.ts     # Table, TableStatus types
│   ├── websocket.types.ts # WebSocket message types
│   └── index.ts          # Central export
├── package.json
└── tsconfig.json
```

### Benefits
1. **Single Source of Truth**: No more duplicate type definitions
2. **Type Safety**: Guaranteed consistency across client/server boundary
3. **Better IDE Support**: Auto-complete and type checking everywhere
4. **Easier Maintenance**: Update types in one place

### Usage
```typescript
// Client or Server
import { Order, MenuItem, WebSocketMessage } from '@rebuild/shared';
```

## Monitoring & Observability

### Performance Monitoring
- Client-side performance metrics collection
- Web Vitals tracking (CLS, FID, FCP, LCP, TTFB)
- Component render time tracking
- API call performance monitoring

### Error Tracking
- Hierarchical error boundaries with recovery
- Structured logging service
- Production error aggregation
- User-friendly error displays

### Endpoints
- `/api/v1/metrics` - Performance metrics collection
- `/api/v1/health` - Basic health check
- `/api/v1/health/detailed` - Comprehensive system status

## Migration Timeline

### Phase 1: Microservices to Unified (July 2024)
- **Before**: Separate AI Gateway (3002) + API Backend (3001)
- **Decision**: "For simplicity, let's put it all in the same backend" - Luis
- **After**: Single backend service on port 3001

### Phase 2: Docker to Cloud (July 2025)
- **Before**: Local Supabase via Docker
- **Decision**: Simplify development with cloud-only approach
- **After**: Direct cloud Supabase connection

### Phase 3: Type Consolidation (January 2025)
- **Before**: Duplicate type definitions in client and server
- **Decision**: Create shared types module for consistency
- **After**: Single source of truth for all types

### Phase 4-6: Production Readiness (January 2025)
- **Component Unification**: BaseOrderCard, UnifiedVoiceRecorder, shared UI
- **Monitoring**: Performance tracking, error boundaries, metrics endpoint
- **Optimization**: Bundle splitting, vendor chunks, modern build targets

---

**Last Updated**: January 2025
**Decision Maker**: Luis, Backend Architect  
**Status**: ENFORCED - This is the law