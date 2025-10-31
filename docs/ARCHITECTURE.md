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

## Voice Ordering Architecture

The voice ordering system follows a **Service-Oriented Architecture** with clear separation of concerns. Previously implemented as a 1,312-line "God Class", the system was refactored into four focused services that communicate via event-driven patterns.

### Architecture Overview

```
Voice Ordering Service Architecture
├── WebRTCVoiceClient (396 lines - Orchestrator)
│   └── Coordinates 3 specialized services
├── VoiceSessionConfig (374 lines)
│   └── Token management, AI instructions, session configuration
├── WebRTCConnection (536 lines)
│   └── WebRTC lifecycle, media streams, connection management
└── VoiceEventHandler (744 lines)
    └── Event routing, transcript accumulation, order detection
```

### Service Responsibilities

#### 1. WebRTCVoiceClient (Orchestrator)
**Role**: High-level orchestration and public API
- Provides simplified interface for voice session management
- Coordinates lifecycle across all services
- Delegates specialized work to focused services
- Maintains backward compatibility with existing consumers
- **Lines**: 396 (down from 1,312)

**Key Methods**:
- `connect()` - Initialize voice session
- `disconnect()` - Clean teardown
- `sendMessage()` - Text communication
- Event subscription management

#### 2. VoiceSessionConfig
**Role**: Configuration and authentication management
- Ephemeral token acquisition and refresh
- AI instruction generation (menu context, tenant settings)
- Session initialization parameters
- Environment-specific configuration
- **Lines**: 374

**Responsibilities**:
- Fetch session tokens from `/api/ai/realtime/session`
- Build context-aware AI instructions
- Manage OpenAI Realtime API configuration
- Handle voice detection parameters

#### 3. WebRTCConnection
**Role**: WebRTC protocol implementation
- Peer connection lifecycle management
- Media stream handling (audio input/output)
- Connection state monitoring
- Network resilience (reconnection, error recovery)
- **Lines**: 536

**Key Features**:
- Automatic audio track management
- Connection state event emission
- ICE candidate handling
- Cleanup and resource disposal

#### 4. VoiceEventHandler
**Role**: Event routing and business logic
- Real-time event processing from OpenAI Realtime API
- Transcript accumulation and formatting
- Order detection and validation
- Event normalization and dispatch
- **Lines**: 744

**Event Types Handled**:
- `conversation.item.created` - New transcript items
- `response.done` - AI response completion
- `input_audio_buffer.speech_started` - User speaking
- `input_audio_buffer.speech_stopped` - User finished
- Error and connection events

### Communication Pattern

Services communicate via **event emitters** and **dependency injection**:

```typescript
// Orchestrator pattern
class WebRTCVoiceClient extends EventEmitter {
  private config: VoiceSessionConfig;
  private connection: WebRTCConnection;
  private eventHandler: VoiceEventHandler;

  constructor(deps: VoiceClientDependencies) {
    // Services injected, not instantiated
    this.config = deps.config;
    this.connection = deps.connection;
    this.eventHandler = deps.eventHandler;

    // Wire up event forwarding
    this.connection.on('stateChange', (state) => this.emit('stateChange', state));
    this.eventHandler.on('orderDetected', (order) => this.emit('orderDetected', order));
  }
}
```

### Benefits of Service Decomposition

1. **Single Responsibility Principle**
   - Each service has one clear purpose
   - Easier to understand and modify
   - Reduced cognitive load

2. **Testability**
   - 118 unit tests ensure service isolation
   - Mock dependencies easily
   - Test services in isolation

3. **Maintainability**
   - Smaller, focused modules
   - Clear boundaries between concerns
   - Easier debugging and troubleshooting

4. **Reusability**
   - Services can be used independently
   - Compose services in different ways
   - Extract common patterns

5. **Backward Compatibility**
   - Orchestrator maintains same public API
   - Existing consumers unaffected
   - Incremental migration path

### Testing Strategy

The voice ordering system employs comprehensive unit testing:

- **118 total unit tests** across all services
- **Service isolation**: Each service tested independently with mocked dependencies
- **Event validation**: Verify event emission and handling
- **State management**: Test connection states and transitions
- **Error scenarios**: Validate error handling and recovery
- **Integration**: Orchestrator tests verify service coordination

### Integration Points

The voice ordering system integrates with:

1. **OpenAI Realtime API**
   - WebRTC data channel for real-time communication
   - Ephemeral token authentication
   - Event-driven transcript streaming

2. **Backend AI Service** (`/api/ai/realtime/session`)
   - Session token provisioning
   - Menu context injection
   - Tenant-specific configuration

3. **Order Management System**
   - `orderDetected` events trigger order creation
   - Natural language parsing to structured order data
   - Validation against menu availability

4. **UI Components**
   - React hooks consume voice client events
   - Real-time transcript display
   - Connection state indicators

### Future Enhancements

Potential architectural improvements:

- **State Machine**: Formalize connection states with XState
- **Message Queue**: Buffer events during network interruptions
- **Analytics**: Track voice session metrics and success rates
- **Multi-language**: Extend AI instructions for internationalization
- **Voice Biometrics**: User identification via voice patterns
