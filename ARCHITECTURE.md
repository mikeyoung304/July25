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
POST   /api/v1/ai/transcribe       # Voice-to-text via OpenAI Whisper
POST   /api/v1/ai/chat             # Conversational chat via OpenAI GPT
POST   /api/v1/ai/parse-order      # Order extraction with menu matching
POST   /api/v1/ai/menu-upload      # Menu synchronization
GET    /api/v1/ai/health           # AI provider health status
```

### Internal Endpoints
```
GET    /internal/metrics           # Prometheus metrics for AI operations
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
  headers: { 'Authorization': 'Bearer YOUR_API_KEY_HERE' }
});

// ❌ NEVER expose AI keys to browser
VITE_OPENAI_API_KEY=YOUR_API_KEY_HERE
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
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

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
- `/internal/metrics` - Prometheus metrics for AI routes and provider health

### AI Provider Integration

#### Degraded Mode
When `AI_DEGRADED_MODE=true`, the system gracefully handles AI service unavailability:
- Voice transcription returns "[Audio transcription unavailable]"
- Chat responses return helpful fallback messages
- Order parsing uses basic text matching
- All endpoints maintain the same response structure

#### OpenAI Integration
- **Transcription**: Whisper API for voice-to-text
- **Chat**: GPT models for conversational responses
- **TTS**: OpenAI Speech API for text-to-speech
- **Order Parsing**: Structured prompts for menu item extraction
- **Error Mapping**: OpenAI errors mapped to user-friendly messages
- **Health Monitoring**: Provider availability tracked via `/internal/metrics`

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

## OpenAI Realtime PTT Flow

### Overview
The WebRTC voice client implements a deterministic push-to-talk (PTT) flow with OpenAI's Realtime API, ensuring exactly one response per user turn with no duplicate transcripts.

### State Machine

```
┌──────┐ startRecording() ┌───────────┐ stopRecording() ┌────────────┐
│ idle │─────────────────>│ recording │────────────────>│ committing │
└──────┘                  └───────────┘                 └────────────┘
    ▲                                                           │
    │                                                           ▼
    │                     ┌──────────────────┐  transcription ┌─────────────────────┐
    │ response.done       │ waiting_response │<───completed───│ waiting_user_final  │
    └─────────────────────┴──────────────────┘                └─────────────────────┘
```

### Event Flow (Manual PTT)

1. **User holds button** → `turnState: idle → recording`
   - Enable microphone track
   - Clear audio buffer
   - Begin audio transmission

2. **User releases button** → `turnState: recording → committing → waiting_user_final`
   - Disable microphone track immediately
   - Send `input_audio_buffer.commit`
   - Wait for transcription completion

3. **Transcription completes** → `turnState: waiting_user_final → waiting_response`
   - Receive `conversation.item.input_audio_transcription.completed`
   - Send exactly one `response.create`
   - Begin waiting for assistant response

4. **Response completes** → `turnState: waiting_response → idle`
   - Receive `response.done`
   - Reset for next turn
   - Increment turn counter

### Configuration

```typescript
// Default: Manual PTT mode
{
  turn_detection: null,
  input_audio_transcription: { model: 'whisper-1' }
}

// Optional: VAD mode (still manual response trigger)
{
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    silence_duration_ms: 250,
    create_response: false  // Still manual
  }
}
```

### Key Guarantees

1. **No double transcripts**: Single Map<itemId, transcript> with deduplication
2. **Exactly one response per turn**: State machine prevents re-entry
3. **Clean event routing**: All known events handled without "Unhandled" warnings
4. **Deterministic logging**: `[RT] t=<turnId>#<eventIndex>` format for debugging

### Testing Checklist

- [ ] Fresh load → Connect Voice → Hold "Hello" → Release
- [ ] Expect: One user row (streaming → final), one assistant reply
- [ ] Logs show: commit → item.created → delta* → completed → response.create → response.done
- [ ] Rapid clicks: Still only one turn processed
- [ ] Three consecutive turns: State returns to idle each time

---

**Last Updated**: January 2025
**Decision Maker**: Luis, Backend Architect  
**Status**: ENFORCED - This is the law