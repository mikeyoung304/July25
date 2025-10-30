# WebRTCVoiceClient Extraction Plan

**Date:** 2025-10-30
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts`
**Current Size:** 1,313 lines
**Target:** 4 focused services (~200-400 lines each)

---

## Executive Summary

The WebRTCVoiceClient is a classic "God Class" violating Single Responsibility Principle. It manages:
- Session configuration and AI instructions (708 lines of instructions!)
- WebRTC connection lifecycle (peer connection, data channels, media streams)
- Event processing and routing (20+ event types)
- State management (turn states, transcripts, connection states)
- Error handling and reconnection logic

**Key Risk:** This is a mission-critical real-time voice ordering system. Breaking changes could impact revenue.

---

## Current Structure Analysis

### Method Inventory (grouped by responsibility)

#### 1. SESSION CONFIGURATION (Target: VoiceSessionConfig)
- **Lines 708-913**: `configureSession()` - Massive method with AI instructions
- **Lines 237-274**: `fetchEphemeralToken()` - Token management
- **Lines 279-302**: `scheduleTokenRefresh()` - Token lifecycle
- **Lines 920-926**: `detectOrderIntent()` - Legacy order detection (deprecated)

**Properties:**
- `ephemeralToken: string | null` (line 50)
- `tokenExpiresAt: number` (line 51)
- `tokenRefreshTimer: NodeJS.Timeout | null` (line 52)
- `menuContext: string` (line 77)

**Estimated Lines:** ~450 (mostly configuration/instructions)

#### 2. WEBRTC CONNECTION (Target: WebRTCConnection)
- **Lines 95-232**: `connect()` - Complex 8-step connection flow
- **Lines 307-337**: `setupMicrophone()` - Media stream setup
- **Lines 1059-1077**: `setupPeerConnectionHandlers()` - Event handlers
- **Lines 1142-1155**: `reconnect()` - Reconnection logic
- **Lines 1160-1254**: `cleanupConnection()` - Resource cleanup (95 lines!)
- **Lines 1259-1298**: `disconnect()` - Disconnection flow

**Properties:**
- `pc: RTCPeerConnection | null` (line 44)
- `dc: RTCDataChannel | null` (line 45)
- `audioElement: HTMLAudioElement | null` (line 46)
- `mediaStream: MediaStream | null` (line 47)
- `connectionState: ConnectionState` (line 49)
- `isConnecting: boolean` (line 60)
- `reconnectAttempts: number` (line 53)
- `maxReconnectAttempts: number` (line 54)
- `reconnectDelay: number` (line 57)
- `sessionActive: boolean` (line 59)

**Estimated Lines:** ~350

#### 3. EVENT HANDLING (Target: VoiceEventHandler)
- **Lines 342-385**: `setupDataChannel()` - Data channel configuration
- **Lines 390-703**: `handleRealtimeEvent()` - Massive 313-line switch statement
  - 20+ event types handled
  - Transcript management
  - Order detection via function calls
  - Turn state transitions
- **Lines 931-946**: `sendEvent()` - Event transmission
- **Lines 1092-1102**: `handleRateLimitError()` - Rate limit handling
- **Lines 1107-1121**: `handleSessionExpired()` - Session expiration
- **Lines 1126-1137**: `handleDisconnection()` - Disconnection handling

**Properties:**
- `dcReady: boolean` (line 63)
- `messageQueue: any[]` (line 62)
- `seenEventIds: Set<string>` (line 69)
- `eventIndex: number` (line 71)
- `turnId: number` (line 70)

**Estimated Lines:** ~400

#### 4. RECORDING/TURN MANAGEMENT (Target: WebRTCVoiceClient - remains)
- **Lines 951-998**: `startRecording()` - Recording initialization
- **Lines 1003-1054**: `stopRecording()` - Recording finalization
- **Lines 1082-1087**: `setConnectionState()` - State management
- **Lines 1303-1313**: Getter methods (getConnectionState, isCurrentlyRecording)

**Properties:**
- `isRecording: boolean` (line 58)
- `turnState: TurnState` (line 67)
- `currentUserItemId: string | null` (line 68)
- `activeResponseId: string | null` (line 61)
- `lastCommitTime: number` (line 64)
- `partialTranscript: string` (line 55)
- `aiPartialTranscript: string` (line 56)
- `transcriptMap: Map<...>` (line 74)
- `config: WebRTCVoiceConfig` (line 48)

**Estimated Lines:** ~300

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   WebRTCVoiceClient                         │
│                   (Orchestrator - 300 lines)                │
│                                                             │
│  - Owns all services                                        │
│  - Delegates to services                                    │
│  - Exposes public API                                       │
│  - Manages recording lifecycle                              │
│  - EventEmitter proxy                                       │
└────────┬──────────────┬─────────────┬────────────┬─────────┘
         │              │             │            │
         │              │             │            │
    ┌────▼───────┐ ┌───▼──────┐ ┌───▼─────┐ ┌───▼──────────┐
    │ VoiceSession│ │ WebRTC   │ │ Voice   │ │ Recording    │
    │ Config      │ │Connection│ │ Event   │ │ State        │
    │ (~200 lines)│ │(~350 lines│ │ Handler │ │ Manager      │
    │             │ │          │ │(~400 l) │ │ (internal)   │
    └─────────────┘ └──────────┘ └─────────┘ └──────────────┘
         │              │             │            │
         │              │             │            │
         └──────────────┴─────────────┴────────────┘
                        │
                   ┌────▼──────┐
                   │  Shared   │
                   │  Types    │
                   └───────────┘
```

### Service Responsibilities

#### 1. VoiceSessionConfig
**Single Responsibility:** Manage OpenAI Realtime session configuration

**Public Interface:**
```typescript
interface IVoiceSessionConfig {
  // Lifecycle
  fetchEphemeralToken(): Promise<void>;
  scheduleTokenRefresh(): void;
  clearTokenRefresh(): void;

  // Session management
  buildSessionConfig(): RealtimeSessionConfig;
  getMenuContext(): string;

  // Token status
  isTokenValid(): boolean;
  getTokenExpiry(): number;
}
```

**Dependencies:**
- `getAuthToken()` from auth service
- `WebRTCVoiceConfig` (restaurant ID, debug settings)

**State:**
- ephemeralToken
- tokenExpiresAt
- tokenRefreshTimer
- menuContext
- config (reference only)

#### 2. WebRTCConnection
**Single Responsibility:** Manage WebRTC peer connection lifecycle

**Public Interface:**
```typescript
interface IWebRTCConnection {
  // Connection lifecycle
  connect(ephemeralToken: string): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;

  // Media management
  setupMicrophone(): Promise<void>;
  enableMicrophone(): void;
  disableMicrophone(): void;

  // State
  getConnectionState(): ConnectionState;
  isConnected(): boolean;

  // Access to underlying connections
  getDataChannel(): RTCDataChannel | null;
  getPeerConnection(): RTCPeerConnection | null;
}
```

**Events Emitted:**
- `connection.change`
- `error`
- `track.received`

**Dependencies:**
- WebRTC APIs (RTCPeerConnection, MediaStream)
- ephemeralToken (provided by caller)

**State:**
- pc (RTCPeerConnection)
- dc (RTCDataChannel)
- audioElement
- mediaStream
- connectionState
- isConnecting
- reconnectAttempts
- sessionActive

#### 3. VoiceEventHandler
**Single Responsibility:** Process and route Realtime API events

**Public Interface:**
```typescript
interface IVoiceEventHandler {
  // Event processing
  handleRealtimeEvent(event: RealtimeEvent): void;
  sendEvent(event: any): void;

  // Queue management
  flushMessageQueue(): void;
  clearMessageQueue(): void;

  // State
  isDataChannelReady(): boolean;
  getCurrentTurnId(): number;
}
```

**Events Emitted:**
- `session.created`
- `transcript`
- `speech.started`
- `speech.stopped`
- `response.text`
- `response.complete`
- `order.detected`
- `order.confirmation`
- `order.item.removed`
- `order.items.added`
- `error`

**Dependencies:**
- RTCDataChannel (provided by WebRTCConnection)
- EventEmitter (for routing events)

**State:**
- dcReady
- messageQueue
- seenEventIds
- eventIndex
- turnId
- transcriptMap (for accumulation)

#### 4. WebRTCVoiceClient (Orchestrator)
**Single Responsibility:** Coordinate services and expose unified API

**Responsibilities:**
- Create and wire services together
- Implement public API methods (connect, disconnect, startRecording, stopRecording)
- Manage turn state machine
- Proxy events from services to external listeners
- Handle recording lifecycle (PTT)

**No longer responsible for:**
- Token management (delegated to VoiceSessionConfig)
- WebRTC setup (delegated to WebRTCConnection)
- Event parsing (delegated to VoiceEventHandler)

---

## Line-by-Line Extraction Mapping

### Phase 1: VoiceSessionConfig (Lines → New File)

**File:** `VoiceSessionConfig.ts` (~200 lines)

**Extract:**
```
Lines 5-11   → Import to shared types
Lines 50-52  → Properties: ephemeralToken, tokenExpiresAt, tokenRefreshTimer
Lines 77     → Property: menuContext
Lines 237-274 → Method: fetchEphemeralToken()
Lines 279-302 → Method: scheduleTokenRefresh()
Lines 708-913 → Method: buildSessionConfig() [REFACTORED]
Lines 920-926 → Remove (deprecated)
```

**New Constructor Parameters:**
```typescript
constructor(
  config: WebRTCVoiceConfig,
  private authService: { getAuthToken: () => Promise<string> }
)
```

**Refactoring Note:** `configureSession()` should be split:
- `buildSessionConfig()`: Pure function returning config object (lines 712-903)
- Caller (WebRTCVoiceClient) will call `sendEvent()` with result

### Phase 2: WebRTCConnection (Lines → New File)

**File:** `WebRTCConnection.ts` (~350 lines)

**Extract:**
```
Lines 30     → Import ConnectionState type
Lines 44-47  → Properties: pc, dc, audioElement, mediaStream
Lines 49     → Property: connectionState
Lines 53-54  → Properties: reconnectAttempts, maxReconnectAttempts
Lines 57     → Property: reconnectDelay
Lines 59-60  → Properties: sessionActive, isConnecting
Lines 113-232 → Method: connect() [REFACTORED to accept token]
Lines 307-337 → Method: setupMicrophone()
Lines 1059-1077 → Method: setupPeerConnectionHandlers()
Lines 1142-1155 → Method: reconnect()
Lines 1160-1254 → Method: cleanupConnection()
Lines 1259-1298 → Method: disconnect() [REFACTORED]
Lines 1082-1087 → Method: setConnectionState()
```

**New Constructor Parameters:**
```typescript
constructor(
  private config: WebRTCVoiceConfig,
  private eventEmitter: EventEmitter
)
```

**Key Changes:**
- `connect()` accepts ephemeralToken as parameter (no longer fetches it)
- Emits events via provided EventEmitter
- Remove lines 120-149 (setupDataChannel - moved to VoiceEventHandler)

### Phase 3: VoiceEventHandler (Lines → New File)

**File:** `VoiceEventHandler.ts` (~400 lines)

**Extract:**
```
Lines 13-28  → Import event types
Lines 32-37  → Import TurnState type
Lines 62-63  → Properties: messageQueue, dcReady
Lines 69-71  → Properties: seenEventIds, turnId, eventIndex
Lines 74     → Property: transcriptMap
Lines 146-149 → Data channel creation (from connect())
Lines 342-385 → Method: setupDataChannel()
Lines 390-703 → Method: handleRealtimeEvent()
Lines 931-946 → Method: sendEvent()
Lines 1092-1102 → Method: handleRateLimitError() [REFACTORED]
Lines 1107-1121 → Method: handleSessionExpired() [REFACTORED]
Lines 1126-1137 → Method: handleDisconnection() [REFACTORED]
```

**New Constructor Parameters:**
```typescript
constructor(
  private config: WebRTCVoiceConfig,
  private eventEmitter: EventEmitter,
  private onRateLimitError: () => void,
  private onSessionExpired: () => Promise<void>,
  private onDisconnection: () => void
)
```

**Key Changes:**
- Accepts RTCDataChannel via `setDataChannel(dc: RTCDataChannel)`
- Error handlers are callbacks to orchestrator
- Emits all events via provided EventEmitter

### Phase 4: WebRTCVoiceClient (Orchestrator)

**File:** `WebRTCVoiceClient.ts` (~300 lines remaining)

**Keeps:**
```
Lines 1-11   → Imports and types
Lines 43     → Class declaration
Lines 48     → Property: config
Lines 55-56  → Properties: partialTranscript, aiPartialTranscript
Lines 58     → Property: isRecording
Lines 61     → Property: activeResponseId
Lines 64     → Property: lastCommitTime
Lines 67-68  → Properties: turnState, currentUserItemId
Lines 79-90  → Constructor [REFACTORED]
Lines 95-232 → connect() [REFACTORED to orchestrate]
Lines 951-998 → startRecording()
Lines 1003-1054 → stopRecording()
Lines 1259-1298 → disconnect() [REFACTORED to orchestrate]
Lines 1303-1313 → Getter methods
```

**New Constructor:**
```typescript
constructor(config: WebRTCVoiceConfig) {
  super();
  this.config = config;

  // Create services
  this.sessionConfig = new VoiceSessionConfig(config, { getAuthToken });
  this.connection = new WebRTCConnection(config, this);
  this.eventHandler = new VoiceEventHandler(
    config,
    this,
    () => this.handleRateLimitError(),
    () => this.handleSessionExpired(),
    () => this.handleDisconnection()
  );

  // Wire event handler to connection
  this.connection.on('dataChannelReady', (dc) => {
    this.eventHandler.setDataChannel(dc);
  });
}
```

**Refactored Methods:**
```typescript
async connect(): Promise<void> {
  // 1. Fetch token via sessionConfig
  await this.sessionConfig.fetchEphemeralToken();

  // 2. Connect via connection service
  const token = this.sessionConfig.getToken();
  await this.connection.connect(token);

  // 3. Wait for data channel ready
  // (handled by event wiring)

  // 4. Configure session via eventHandler
  const sessionConfig = this.sessionConfig.buildSessionConfig();
  this.eventHandler.sendEvent({
    type: 'session.update',
    session: sessionConfig
  });
}

disconnect(): void {
  this.connection.disconnect();
  this.sessionConfig.clearTokenRefresh();
  this.resetState();
}
```

---

## TypeScript Interface Definitions

### Shared Types (`types.ts`)

```typescript
// File: client/src/modules/voice/services/types.ts

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  debug?: boolean;
  enableVAD?: boolean;
  muteAudioOutput?: boolean;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

export interface OrderEvent {
  items: Array<{
    name: string;
    quantity: number;
    modifiers?: string[];
  }>;
  confidence: number;
  timestamp: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type TurnState =
  | 'idle'
  | 'recording'
  | 'committing'
  | 'waiting_user_final'
  | 'waiting_response';

export interface RealtimeSessionConfig {
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription: {
    model: string;
    language: string;
  };
  turn_detection: any;
  temperature: number;
  max_response_output_tokens: number;
  tools?: any[];
  tool_choice?: string;
}

export interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
}
```

### VoiceSessionConfig Interface

```typescript
// File: client/src/modules/voice/services/VoiceSessionConfig.ts

export interface IVoiceSessionConfig {
  // Token management
  fetchEphemeralToken(): Promise<void>;
  scheduleTokenRefresh(): void;
  clearTokenRefresh(): void;
  isTokenValid(): boolean;
  getToken(): string | null;
  getTokenExpiry(): number;

  // Session configuration
  buildSessionConfig(): RealtimeSessionConfig;
  getMenuContext(): string;
}

export class VoiceSessionConfig implements IVoiceSessionConfig {
  private ephemeralToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private menuContext: string = '';

  constructor(
    private config: WebRTCVoiceConfig,
    private authService: { getAuthToken: () => Promise<string> }
  ) {}

  // ... implementation
}
```

### WebRTCConnection Interface

```typescript
// File: client/src/modules/voice/services/WebRTCConnection.ts

export interface IWebRTCConnection {
  // Connection lifecycle
  connect(ephemeralToken: string): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;

  // Media management
  setupMicrophone(): Promise<void>;
  enableMicrophone(): void;
  disableMicrophone(): void;
  getMicrophoneStream(): MediaStream | null;

  // State
  getConnectionState(): ConnectionState;
  isConnected(): boolean;
  isConnecting(): boolean;

  // Access to connections
  getDataChannel(): RTCDataChannel | null;
  getPeerConnection(): RTCPeerConnection | null;
}

export class WebRTCConnection extends EventEmitter implements IWebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000;
  private sessionActive: boolean = false;

  constructor(
    private config: WebRTCVoiceConfig
  ) {
    super();
  }

  // Events emitted:
  // - 'connection.change': (state: ConnectionState)
  // - 'error': (error: Error)
  // - 'dataChannelReady': (dc: RTCDataChannel)
  // - 'track.received': (stream: MediaStream)

  // ... implementation
}
```

### VoiceEventHandler Interface

```typescript
// File: client/src/modules/voice/services/VoiceEventHandler.ts

export interface IVoiceEventHandler {
  // Data channel management
  setDataChannel(dc: RTCDataChannel): void;

  // Event processing
  handleRealtimeEvent(event: RealtimeEvent): void;
  sendEvent(event: any): void;

  // Queue management
  flushMessageQueue(): void;
  clearMessageQueue(): void;

  // State
  isDataChannelReady(): boolean;
  getCurrentTurnId(): number;
  getCurrentEventIndex(): number;

  // Session config
  sendSessionConfig(sessionConfig: RealtimeSessionConfig): void;
}

export class VoiceEventHandler extends EventEmitter implements IVoiceEventHandler {
  private dc: RTCDataChannel | null = null;
  private dcReady: boolean = false;
  private messageQueue: any[] = [];
  private seenEventIds = new Set<string>();
  private turnId: number = 0;
  private eventIndex: number = 0;
  private transcriptMap = new Map<string, {
    text: string;
    final: boolean;
    role: 'user' | 'assistant'
  }>();

  constructor(
    private config: WebRTCVoiceConfig
  ) {
    super();
  }

  // Events emitted (proxied from Realtime API):
  // - 'session.created'
  // - 'transcript': TranscriptEvent
  // - 'speech.started'
  // - 'speech.stopped'
  // - 'response.text': string
  // - 'response.complete'
  // - 'order.detected': OrderEvent
  // - 'order.confirmation'
  // - 'order.item.removed'
  // - 'order.items.added'
  // - 'error': Error

  // ... implementation
}
```

---

## Communication Between Services

```typescript
// Orchestrator wires services together

class WebRTCVoiceClient extends EventEmitter {
  private sessionConfig: VoiceSessionConfig;
  private connection: WebRTCConnection;
  private eventHandler: VoiceEventHandler;

  constructor(config: WebRTCVoiceConfig) {
    super();

    // Create services
    this.sessionConfig = new VoiceSessionConfig(config, { getAuthToken });
    this.connection = new WebRTCConnection(config);
    this.eventHandler = new VoiceEventHandler(config);

    // Wire connection events
    this.connection.on('connection.change', (state) => {
      this.emit('connection.change', state);
    });

    this.connection.on('dataChannelReady', (dc) => {
      this.eventHandler.setDataChannel(dc);

      // Once DC is ready, configure session
      const sessionConfig = this.sessionConfig.buildSessionConfig();
      this.eventHandler.sendEvent({
        type: 'session.update',
        session: sessionConfig
      });
    });

    this.connection.on('error', (error) => {
      this.emit('error', error);
    });

    // Wire event handler events (proxy all to external listeners)
    const eventsToProxy = [
      'session.created',
      'transcript',
      'speech.started',
      'speech.stopped',
      'response.text',
      'response.complete',
      'order.detected',
      'order.confirmation',
      'order.item.removed',
      'order.items.added',
      'error'
    ];

    eventsToProxy.forEach(eventName => {
      this.eventHandler.on(eventName, (...args) => {
        this.emit(eventName, ...args);
      });
    });

    // Wire session expiration from event handler to session config
    this.eventHandler.on('session.expired', async () => {
      await this.sessionConfig.fetchEphemeralToken();
      await this.connection.reconnect();
    });
  }

  async connect(): Promise<void> {
    await this.sessionConfig.fetchEphemeralToken();
    const token = this.sessionConfig.getToken();
    await this.connection.connect(token!);
  }

  disconnect(): void {
    this.connection.disconnect();
    this.sessionConfig.clearTokenRefresh();
    this.eventHandler.clearMessageQueue();
  }

  startRecording(): void {
    // Still managed by orchestrator (PTT logic)
    this.connection.enableMicrophone();
    this.eventHandler.sendEvent({ type: 'input_audio_buffer.clear' });
    // ... rest of turn state logic
  }

  stopRecording(): void {
    this.connection.disableMicrophone();
    this.eventHandler.sendEvent({ type: 'input_audio_buffer.commit' });
    // ... rest of turn state logic
  }
}
```

---

## Step-by-Step Extraction Procedure

### Pre-Flight Checklist
- [ ] Commit current working state
- [ ] Create feature branch: `refactor/webrtc-service-extraction`
- [ ] Run existing tests to establish baseline
- [ ] Back up WebRTCVoiceClient.ts

### Phase 1: Create Shared Types (30 min)
**Goal:** Extract types to shared module

1. Create `client/src/modules/voice/services/types.ts`
2. Copy type definitions:
   - WebRTCVoiceConfig (lines 5-11)
   - TranscriptEvent (lines 13-18)
   - OrderEvent (lines 20-28)
   - ConnectionState (line 30)
   - TurnState (lines 32-37)
3. Add RealtimeSessionConfig type
4. Add RealtimeEvent type
5. Update WebRTCVoiceClient.ts imports
6. Run: `npm run type-check`
7. **Commit:** "refactor: extract shared types for voice services"

### Phase 2: Extract VoiceSessionConfig (2 hours)
**Goal:** Move session configuration to dedicated service

1. Create `client/src/modules/voice/services/VoiceSessionConfig.ts`
2. Implement interface (see TypeScript definitions above)
3. Copy methods:
   - `fetchEphemeralToken()` (lines 237-274)
   - `scheduleTokenRefresh()` (lines 279-302)
   - NEW: `buildSessionConfig()` - extract from `configureSession()` (lines 712-903)
     - Make it pure (no side effects)
     - Return RealtimeSessionConfig object
   - NEW: `clearTokenRefresh()`
   - NEW: `isTokenValid()`
   - NEW: `getToken()`
   - NEW: `getTokenExpiry()`
   - NEW: `getMenuContext()`
4. Copy properties:
   - ephemeralToken, tokenExpiresAt, tokenRefreshTimer, menuContext
5. Write unit tests for VoiceSessionConfig:
   ```typescript
   describe('VoiceSessionConfig', () => {
     it('fetches ephemeral token successfully', async () => {});
     it('schedules token refresh before expiry', () => {});
     it('builds session config with menu context', () => {});
     it('validates token expiry', () => {});
   });
   ```
6. Run tests: `npm run test -- VoiceSessionConfig`
7. **Commit:** "refactor: extract VoiceSessionConfig service"

### Phase 3: Extract WebRTCConnection (3 hours)
**Goal:** Move WebRTC lifecycle to dedicated service

1. Create `client/src/modules/voice/services/WebRTCConnection.ts`
2. Implement interface (see TypeScript definitions above)
3. Copy methods:
   - `connect()` (lines 113-232) - REFACTOR to accept token parameter
   - `setupMicrophone()` (lines 307-337)
   - `setupPeerConnectionHandlers()` (lines 1059-1077)
   - `reconnect()` (lines 1142-1155)
   - `cleanupConnection()` (lines 1160-1254)
   - `disconnect()` (lines 1259-1298) - REFACTOR to remove session config calls
   - `setConnectionState()` (lines 1082-1087)
   - NEW: `enableMicrophone()` - extract from startRecording (lines 982-986)
   - NEW: `disableMicrophone()` - extract from stopRecording (lines 1026-1029)
   - NEW: `isConnected()`
   - NEW: `isConnecting()`
4. Copy properties:
   - pc, dc, audioElement, mediaStream
   - connectionState, isConnecting, sessionActive
   - reconnectAttempts, maxReconnectAttempts, reconnectDelay
5. **Key Changes:**
   - Remove data channel setup (lines 146-149) - move to VoiceEventHandler
   - Remove `fetchEphemeralToken()` calls from connect()
   - Accept token as parameter in `connect(ephemeralToken: string)`
   - Emit 'dataChannelReady' event when DC opens
6. Write unit tests for WebRTCConnection:
   ```typescript
   describe('WebRTCConnection', () => {
     it('connects with valid token', async () => {});
     it('sets up microphone with correct constraints', async () => {});
     it('reconnects after failure', async () => {});
     it('cleans up resources on disconnect', () => {});
     it('emits connection state changes', () => {});
   });
   ```
7. Run tests: `npm run test -- WebRTCConnection`
8. **Commit:** "refactor: extract WebRTCConnection service"

### Phase 4: Extract VoiceEventHandler (3 hours)
**Goal:** Move event processing to dedicated service

1. Create `client/src/modules/voice/services/VoiceEventHandler.ts`
2. Implement interface (see TypeScript definitions above)
3. Copy methods:
   - `setupDataChannel()` (lines 342-385)
   - `handleRealtimeEvent()` (lines 390-703) - THE BIG ONE
   - `sendEvent()` (lines 931-946)
   - NEW: `setDataChannel(dc: RTCDataChannel)`
   - NEW: `flushMessageQueue()`
   - NEW: `clearMessageQueue()`
   - NEW: `isDataChannelReady()`
   - NEW: `sendSessionConfig(config: RealtimeSessionConfig)`
4. Copy properties:
   - dcReady, messageQueue
   - seenEventIds, turnId, eventIndex
   - transcriptMap
5. **Key Changes:**
   - Remove error handler implementations (lines 1092-1137)
   - Replace with callbacks passed to constructor
   - Accept RTCDataChannel via `setDataChannel()` method
   - Extract turn state logic to separate method (used by orchestrator)
6. Write unit tests for VoiceEventHandler:
   ```typescript
   describe('VoiceEventHandler', () => {
     it('handles session.created event', () => {});
     it('accumulates transcript deltas', () => {});
     it('detects orders via function calls', () => {});
     it('deduplicates events by event_id', () => {});
     it('queues messages when DC not ready', () => {});
     it('flushes queue when DC opens', () => {});
     it('emits proper events for each Realtime event', () => {});
   });
   ```
7. Run tests: `npm run test -- VoiceEventHandler`
8. **Commit:** "refactor: extract VoiceEventHandler service"

### Phase 5: Refactor WebRTCVoiceClient (Orchestrator) (2 hours)
**Goal:** Convert God Class to lightweight orchestrator

1. Update WebRTCVoiceClient.ts:
   - Remove extracted methods (keep startRecording, stopRecording, connect, disconnect)
   - Remove extracted properties (keep turn state, recording state)
   - Add service instances:
     ```typescript
     private sessionConfig: VoiceSessionConfig;
     private connection: WebRTCConnection;
     private eventHandler: VoiceEventHandler;
     ```
2. Refactor constructor (see "Communication Between Services" section)
3. Refactor `connect()`:
   ```typescript
   async connect(): Promise<void> {
     if (this.isConnecting || this.connectionState === 'connected') return;

     this.isConnecting = true;

     try {
       // Delegate to services
       await this.sessionConfig.fetchEphemeralToken();
       const token = this.sessionConfig.getToken();

       if (!token) {
         throw new Error('Failed to get session token');
       }

       await this.connection.connect(token);
       // Session configuration happens in dataChannelReady event handler

       this.isConnecting = false;
     } catch (error) {
       this.isConnecting = false;
       this.emit('error', error);
       throw error;
     }
   }
   ```
4. Refactor `disconnect()`:
   ```typescript
   disconnect(): void {
     this.connection.disconnect();
     this.sessionConfig.clearTokenRefresh();
     this.eventHandler.clearMessageQueue();
     this.resetTurnState();
   }
   ```
5. Refactor `startRecording()`:
   ```typescript
   startRecording(): void {
     if (this.turnState !== 'idle') {
       console.warn(`Cannot start recording in state: ${this.turnState}`);
       return;
     }

     this.turnState = 'recording';
     this.connection.enableMicrophone();
     this.eventHandler.sendEvent({ type: 'input_audio_buffer.clear' });
     this.emit('recording.started');
   }
   ```
6. Refactor `stopRecording()`:
   ```typescript
   stopRecording(): void {
     if (this.turnState !== 'recording') {
       console.warn(`Cannot stop recording in state: ${this.turnState}`);
       return;
     }

     this.connection.disableMicrophone();
     this.turnState = 'committing';

     this.eventHandler.sendEvent({ type: 'input_audio_buffer.commit' });
     this.turnState = 'waiting_user_final';

     this.emit('recording.stopped');
   }
   ```
7. Add private helper methods:
   - `resetTurnState()` - clear turn-specific state
   - `handleRateLimitError()` - orchestrate rate limit response
   - `handleSessionExpired()` - orchestrate reconnection
   - `handleDisconnection()` - orchestrate cleanup
8. Update imports to use new services
9. **Commit:** "refactor: convert WebRTCVoiceClient to orchestrator"

### Phase 6: Integration Testing (2 hours)
**Goal:** Ensure all services work together

1. Create integration test: `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.integration.test.ts`
2. Test scenarios:
   ```typescript
   describe('WebRTCVoiceClient Integration', () => {
     it('connects and establishes session', async () => {
       // Mock: fetchEphemeralToken, RTCPeerConnection
       const client = new WebRTCVoiceClient(config);
       await client.connect();

       expect(client.getConnectionState()).toBe('connected');
     });

     it('handles full recording cycle', async () => {
       // Test: startRecording → stopRecording → transcript
       const client = new WebRTCVoiceClient(config);
       await client.connect();

       const transcriptPromise = new Promise(resolve => {
         client.on('transcript', resolve);
       });

       client.startRecording();
       // Simulate speech
       client.stopRecording();

       const transcript = await transcriptPromise;
       expect(transcript.isFinal).toBe(true);
     });

     it('detects orders via function calls', async () => {
       // Test: order.detected event fired
       const client = new WebRTCVoiceClient(config);
       await client.connect();

       const orderPromise = new Promise(resolve => {
         client.on('order.detected', resolve);
       });

       // Simulate function call event
       const order = await orderPromise;
       expect(order.items).toHaveLength(1);
     });

     it('recovers from disconnection', async () => {
       // Test: reconnection logic
       const client = new WebRTCVoiceClient(config);
       await client.connect();

       // Simulate disconnection
       client.disconnect();
       await client.connect();

       expect(client.getConnectionState()).toBe('connected');
     });
   });
   ```
3. Run integration tests: `npm run test -- WebRTCVoiceClient.integration`
4. **Commit:** "test: add integration tests for refactored services"

### Phase 7: Update Dependent Components (1 hour)
**Goal:** Ensure components using WebRTCVoiceClient still work

1. Check for imports of WebRTCVoiceClient:
   ```bash
   grep -r "WebRTCVoiceClient" client/src --include="*.ts" --include="*.tsx"
   ```
2. Update imports if needed (unlikely - public API should be same)
3. Run dependent tests:
   - VoiceOrderProcessor tests
   - VoiceCheckoutOrchestrator tests
   - orderIntegration tests
4. Fix any breaking changes
5. **Commit:** "fix: update dependent components after refactor"

### Phase 8: Manual Testing (1 hour)
**Goal:** Verify real-world functionality

1. Start development server: `npm run dev`
2. Test scenarios:
   - [ ] Connect to voice service
   - [ ] Record audio (PTT)
   - [ ] Receive transcript
   - [ ] Order detection works
   - [ ] AI responses play
   - [ ] Disconnect cleanly
   - [ ] Reconnect after error
3. Check console for errors
4. Verify no memory leaks (DevTools Memory profiler)
5. Document any issues

### Phase 9: Documentation & Cleanup (1 hour)
**Goal:** Update docs and clean up code

1. Update README (if exists) with new architecture
2. Add JSDoc comments to all public methods
3. Remove deprecated methods (detectOrderIntent)
4. Update import paths in barrel exports (if any)
5. Run linter: `npm run lint`
6. Run type checker: `npm run type-check`
7. Run all tests: `npm run test`
8. **Commit:** "docs: update documentation for refactored services"

### Phase 10: Code Review & PR (30 min)
**Goal:** Get team approval

1. Push branch: `git push origin refactor/webrtc-service-extraction`
2. Create PR with description:
   ```markdown
   ## Refactor: WebRTCVoiceClient Service Extraction

   ### Changes
   - Extracted VoiceSessionConfig (session configuration)
   - Extracted WebRTCConnection (WebRTC lifecycle)
   - Extracted VoiceEventHandler (event processing)
   - Converted WebRTCVoiceClient to orchestrator

   ### Benefits
   - Single Responsibility Principle
   - Easier testing (smaller units)
   - Better separation of concerns
   - Reduced file size (1312 → ~300 lines)

   ### Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   - [ ] No breaking changes to public API

   ### Risks
   - Complex refactor of mission-critical code
   - Mitigation: Comprehensive testing, incremental commits
   ```
3. Request review from team
4. Address feedback
5. **Merge:** Once approved

---

## Risk Assessment & Mitigation

### HIGH RISK: Breaking Real-Time Voice Ordering

**Risk:** Extraction could break WebRTC connection, audio streaming, or event processing.

**Mitigation:**
1. **Incremental Commits:** Each phase is independently committable and testable
2. **Public API Preservation:** WebRTCVoiceClient maintains same interface
3. **Integration Tests:** Comprehensive tests verify end-to-end functionality
4. **Manual Testing:** Real-world scenario testing before merge
5. **Rollback Plan:** Feature branch allows easy rollback if issues arise

### MEDIUM RISK: Event Routing Breaks

**Risk:** Events from services might not propagate correctly to external listeners.

**Mitigation:**
1. **Event Proxy Pattern:** Orchestrator explicitly proxies all events
2. **Event Tests:** Unit tests verify each service emits correct events
3. **Integration Tests:** Verify events propagate end-to-end
4. **Debug Mode:** Keep debug logging to trace event flow

### MEDIUM RISK: State Synchronization Issues

**Risk:** Turn state, connection state, or recording state might desync between services.

**Mitigation:**
1. **Single Source of Truth:** Orchestrator owns turn state
2. **Immutable State Sharing:** Services receive state via parameters/callbacks
3. **State Machine Tests:** Verify state transitions in all scenarios
4. **Defensive Programming:** Add state checks before transitions

### LOW RISK: Memory Leaks from Event Listeners

**Risk:** Event listeners might not be cleaned up properly.

**Mitigation:**
1. **Explicit Cleanup:** Each service has `disconnect()` that removes listeners
2. **Memory Profiling:** Manual testing includes memory leak check
3. **Weak References:** Use EventEmitter's `once()` where appropriate
4. **Cleanup Tests:** Verify no lingering references after disconnect

### LOW RISK: Circular Dependencies

**Risk:** Services might accidentally depend on each other.

**Mitigation:**
1. **Dependency Injection:** Services receive dependencies via constructor
2. **Interface-Based Design:** Services depend on interfaces, not implementations
3. **Unidirectional Flow:** Orchestrator → Services (never Services → Orchestrator)
4. **Build Verification:** TypeScript compiler will catch circular imports

---

## Testing Checklist

### Unit Tests (Per Service)

#### VoiceSessionConfig
- [ ] Fetches ephemeral token successfully
- [ ] Handles token fetch errors
- [ ] Schedules token refresh before expiry
- [ ] Clears token refresh timer
- [ ] Validates token expiry correctly
- [ ] Builds session config with menu context
- [ ] Builds session config without menu context
- [ ] Includes tools in session config
- [ ] Handles VAD configuration
- [ ] Handles transcription-only mode

#### WebRTCConnection
- [ ] Connects with valid token
- [ ] Fails gracefully with invalid token
- [ ] Sets up microphone with correct constraints
- [ ] Enables/disables microphone track
- [ ] Creates RTCPeerConnection with correct config
- [ ] Creates data channel
- [ ] Handles ICE connection state changes
- [ ] Reconnects after failure
- [ ] Cleans up resources on disconnect
- [ ] Emits connection state changes
- [ ] Handles audio track reception
- [ ] Mutes audio output if configured

#### VoiceEventHandler
- [ ] Handles session.created event
- [ ] Handles session.updated event
- [ ] Accumulates transcript deltas correctly
- [ ] Finalizes transcript on completed event
- [ ] Detects orders via function calls
- [ ] Parses function call arguments
- [ ] Filters invalid order items
- [ ] Handles order confirmation
- [ ] Handles item removal
- [ ] Deduplicates events by event_id
- [ ] Queues messages when DC not ready
- [ ] Flushes queue when DC opens
- [ ] Emits proper events for each Realtime event type
- [ ] Handles error events
- [ ] Handles rate limit errors
- [ ] Handles session expiration

#### WebRTCVoiceClient (Orchestrator)
- [ ] Creates all services on construction
- [ ] Wires service events correctly
- [ ] Delegates connect to services
- [ ] Delegates disconnect to services
- [ ] Manages turn state machine correctly
- [ ] Starts recording only from idle state
- [ ] Stops recording only from recording state
- [ ] Emits recording events
- [ ] Proxies transcript events
- [ ] Proxies order events
- [ ] Handles errors from services
- [ ] Prevents duplicate connections
- [ ] Cleans up on disconnect

### Integration Tests

- [ ] Full connection cycle works
- [ ] Recording cycle produces transcripts
- [ ] Order detection works end-to-end
- [ ] AI responses play correctly
- [ ] Reconnection after error works
- [ ] Token refresh doesn't break connection
- [ ] Multiple sessions can be created
- [ ] Disconnection cleans up properly
- [ ] No memory leaks after disconnect
- [ ] Events propagate to external listeners

### Manual Testing

- [ ] Connect to voice service in dev environment
- [ ] Record audio using PTT button
- [ ] Verify transcript appears in UI
- [ ] Order items via voice
- [ ] Verify items added to cart
- [ ] Hear AI responses
- [ ] Disconnect cleanly
- [ ] Reconnect after closing browser tab
- [ ] Test with poor network conditions
- [ ] Test with microphone permission denied
- [ ] Check browser console for errors
- [ ] Verify no memory leaks (DevTools)

---

## Rollback Strategy

If issues arise during or after extraction:

### Immediate Rollback (Development)
```bash
# Revert to main branch
git checkout main
git branch -D refactor/webrtc-service-extraction

# Or revert specific commits
git revert <commit-hash>
```

### Post-Merge Rollback (Production)
```bash
# Create revert branch
git checkout main
git checkout -b revert/webrtc-refactor

# Revert the merge commit
git revert -m 1 <merge-commit-hash>

# Push and create emergency PR
git push origin revert/webrtc-refactor
```

### Incremental Rollback (Partial Success)

If some services work but others don't:

1. Keep working services
2. Revert problematic service extraction
3. Create hybrid approach (some extracted, some not)
4. Document technical debt for later

Example: If VoiceEventHandler breaks:
```bash
# Revert just the event handler extraction
git revert <event-handler-commit>

# Move event handling back to orchestrator
# Keep VoiceSessionConfig and WebRTCConnection
```

---

## Success Metrics

### Quantitative
- [ ] Total lines reduced: 1312 → ~300 (77% reduction)
- [ ] Test coverage: >80% for all services
- [ ] Build time: No increase
- [ ] Runtime performance: No degradation
- [ ] Memory usage: Comparable or better

### Qualitative
- [ ] Code is easier to understand
- [ ] Services have single, clear responsibility
- [ ] Adding new features is easier
- [ ] Debugging is simpler (smaller scope)
- [ ] Team members can work on services independently

---

## Timeline Estimate

| Phase | Time | Dependencies |
|-------|------|--------------|
| 0. Pre-flight | 30m | None |
| 1. Shared Types | 30m | Phase 0 |
| 2. VoiceSessionConfig | 2h | Phase 1 |
| 3. WebRTCConnection | 3h | Phase 1 |
| 4. VoiceEventHandler | 3h | Phase 1, 3 |
| 5. Orchestrator Refactor | 2h | Phase 2, 3, 4 |
| 6. Integration Tests | 2h | Phase 5 |
| 7. Update Components | 1h | Phase 6 |
| 8. Manual Testing | 1h | Phase 7 |
| 9. Documentation | 1h | Phase 8 |
| 10. Code Review | 30m | Phase 9 |

**Total: ~16.5 hours (~2 days)**

---

## Key Findings from Analysis

### 1. The configureSession() Monster (Lines 708-913)
**206 lines of AI instructions!** This is the biggest extraction opportunity.
- Contains massive prompt engineering
- Menu context concatenation
- Tool definitions (add_to_order, confirm_order, remove_from_order)
- Should be pure function returning config object

### 2. The cleanup() Nightmare (Lines 1160-1254)
**95 lines of cleanup code!** Shows the connection management complexity.
- Removes event handlers (memory leak prevention)
- Stops media tracks
- Closes peer connection
- Cleans up audio element
- Perfect candidate for dedicated service

### 3. Event Handler Switch Statement (Lines 390-703)
**313 lines handling 20+ event types!**
- Transcript accumulation logic
- Order detection via function calls
- Turn state transitions
- Response streaming
- Needs dedicated service for maintainability

### 4. Turn State Machine Complexity
The turn state machine is tightly coupled to:
- Recording lifecycle (PTT)
- Event processing (transcript.completed → response.create)
- Audio buffer management (commit/clear)

**Decision:** Keep turn state in orchestrator, but delegate operations to services.

### 5. Circular Dependencies Risk
Current structure has potential circular dependencies:
- Connection needs to emit events → EventHandler
- EventHandler needs to send events → Connection (data channel)
- Both need session config

**Mitigation:** Use dependency injection and interfaces.

### 6. Backward Compatibility
Public API is clean:
```typescript
connect(), disconnect(), startRecording(), stopRecording()
getConnectionState(), isCurrentlyRecording()
Events: transcript, order.detected, response.complete, etc.
```

**Good news:** External components shouldn't need changes.

---

## Concerns & Questions for Team

### 1. Testing Strategy
**Question:** Do we have mocks for RTCPeerConnection and MediaStream?
**Impact:** Integration tests will need these mocks.
**Action:** Research existing test utilities or create minimal mocks.

### 2. Feature Freeze During Refactor?
**Question:** Should we freeze new features on this file during extraction?
**Impact:** Merge conflicts could be painful.
**Recommendation:** 2-day sprint with feature freeze.

### 3. Deployment Strategy
**Question:** Deploy to staging first? Gradual rollout?
**Impact:** Risk mitigation for production.
**Recommendation:** Deploy to staging, test 24h, then production.

### 4. Performance Budget
**Question:** Are there performance benchmarks for voice connection time?
**Impact:** Need to verify no regression.
**Action:** Measure current performance before refactor.

### 5. Legacy Compatibility
**Question:** Are there older clients using this service?
**Impact:** Breaking changes might affect old versions.
**Action:** Check if API versioning is needed.

---

## Next Steps

1. **Get Team Approval** - Review this plan with team
2. **Schedule Sprint** - 2-day dedicated refactor sprint
3. **Set Up Monitoring** - Add performance metrics before refactor
4. **Create Feature Branch** - `refactor/webrtc-service-extraction`
5. **Execute Plan** - Follow phases sequentially
6. **Deploy to Staging** - Test thoroughly
7. **Deploy to Production** - With rollback plan ready

---

## Appendix: File Structure After Extraction

```
client/src/modules/voice/services/
├── types.ts                          (NEW - 80 lines)
│   ├── WebRTCVoiceConfig
│   ├── TranscriptEvent
│   ├── OrderEvent
│   ├── ConnectionState
│   ├── TurnState
│   └── RealtimeSessionConfig
│
├── VoiceSessionConfig.ts             (NEW - 250 lines)
│   ├── IVoiceSessionConfig
│   ├── VoiceSessionConfig class
│   ├── fetchEphemeralToken()
│   ├── scheduleTokenRefresh()
│   ├── buildSessionConfig()
│   └── Token management
│
├── WebRTCConnection.ts               (NEW - 380 lines)
│   ├── IWebRTCConnection
│   ├── WebRTCConnection class
│   ├── connect()
│   ├── disconnect()
│   ├── setupMicrophone()
│   ├── cleanupConnection()
│   └── Connection lifecycle
│
├── VoiceEventHandler.ts              (NEW - 450 lines)
│   ├── IVoiceEventHandler
│   ├── VoiceEventHandler class
│   ├── handleRealtimeEvent() [big switch]
│   ├── sendEvent()
│   └── Event processing & routing
│
├── WebRTCVoiceClient.ts              (REFACTORED - 300 lines)
│   ├── WebRTCVoiceClient class
│   ├── Service orchestration
│   ├── startRecording() / stopRecording()
│   ├── Turn state machine
│   └── Public API
│
└── __tests__/
    ├── VoiceSessionConfig.test.ts    (NEW)
    ├── WebRTCConnection.test.ts      (NEW)
    ├── VoiceEventHandler.test.ts     (NEW)
    ├── WebRTCVoiceClient.test.ts     (UPDATE)
    └── WebRTCVoiceClient.integration.test.ts (NEW)
```

**Total Files:** 9 (4 new services + 1 types + 4 test files)
**Total Lines:** ~1460 (vs 1312 original - slight increase due to interfaces/types)
**Average File Size:** ~162 lines (vs 1312 original)

---

## Summary

This extraction plan decomposes the 1,312-line WebRTCVoiceClient into 4 focused services following Single Responsibility Principle:

1. **VoiceSessionConfig** - Session configuration & token management
2. **WebRTCConnection** - WebRTC lifecycle & media streams
3. **VoiceEventHandler** - Realtime API event processing
4. **WebRTCVoiceClient** - Lightweight orchestrator

**Benefits:**
- Easier testing (unit test small services)
- Better maintainability (single responsibility)
- Reduced cognitive load (smaller files)
- Parallel development (team can work on different services)
- Easier debugging (smaller scope)

**Risks Mitigated:**
- Incremental, committable phases
- Comprehensive test coverage
- Backward compatible public API
- Clear rollback strategy
- Integration testing before merge

**Timeline:** ~16.5 hours (~2 days)

**Ready to Execute:** This plan is detailed enough to start coding immediately.
