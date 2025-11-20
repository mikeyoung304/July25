# Prevention Guide - Code Examples and Checklists

**Context:** Actionable prevention measures with complete code examples for avoiding real-time issues.

---

## Prevention 1: Proper Interval Storage and Cleanup

### The Problem
Intervals created without stored references cannot be cleared, causing memory leaks.

### Complete Implementation

```typescript
//  CORRECT: Full lifecycle management
class VoiceWebSocketServer {
  private sessions: Map<string, VoiceSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isShutdown = false;

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    // Defensive: prevent duplicate intervals
    if (this.cleanupInterval) {
      logger.warn('[VoiceWebSocketServer] Cleanup interval already running');
      return;
    }

    this.cleanupInterval = setInterval(() => {
      if (this.isShutdown) {
        // Safety: stop if shutdown was called
        this.stopCleanupInterval();
        return;
      }

      this.cleanupInactiveSessions();
    }, 60000); // 60 seconds

    logger.info('[VoiceWebSocketServer] Cleanup interval started');
  }

  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('[VoiceWebSocketServer] Cleanup interval stopped');
    }
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > inactiveThreshold) {
        logger.info(`[VoiceWebSocketServer] Cleaning up inactive session: ${sessionId}`);
        this.stopSession(sessionId);
      }
    }

    logger.info(`[VoiceWebSocketServer] Cleanup complete. Active sessions: ${this.sessions.size}`);
  }

  public shutdown(): void {
    if (this.isShutdown) {
      logger.warn('[VoiceWebSocketServer] Already shutdown');
      return;
    }

    this.isShutdown = true;
    logger.info('[VoiceWebSocketServer] Shutting down...');

    // 1. Stop cleanup interval
    this.stopCleanupInterval();

    // 2. Stop all active sessions
    for (const sessionId of this.sessions.keys()) {
      this.stopSession(sessionId);
    }

    // 3. Clear sessions map
    this.sessions.clear();

    logger.info('[VoiceWebSocketServer] Shutdown complete');
  }

  public getStatus(): { active: boolean; sessionCount: number } {
    return {
      active: !this.isShutdown && this.cleanupInterval !== null,
      sessionCount: this.sessions.size
    };
  }
}

// Integration with graceful shutdown
// server/src/server.ts
let voiceWsServer: VoiceWebSocketServer | null = null;

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // ... other cleanup ...

  if (voiceWsServer) {
    voiceWsServer.shutdown();
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### Unit Tests

```typescript
// server/tests/voice-websocket-server.test.ts
describe('VoiceWebSocketServer Cleanup', () => {
  let server: VoiceWebSocketServer;

  beforeEach(() => {
    jest.useFakeTimers();
    server = new VoiceWebSocketServer();
  });

  afterEach(() => {
    server.shutdown();
    jest.useRealTimers();
  });

  test('cleanup interval is created on construction', () => {
    const status = server.getStatus();
    expect(status.active).toBe(true);
  });

  test('cleanup interval is cleared on shutdown', () => {
    server.shutdown();

    const status = server.getStatus();
    expect(status.active).toBe(false);
  });

  test('cleanup interval runs every 60 seconds', () => {
    const cleanupSpy = jest.spyOn(server as any, 'cleanupInactiveSessions');

    jest.advanceTimersByTime(60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  test('cleanup stops after shutdown', () => {
    const cleanupSpy = jest.spyOn(server as any, 'cleanupInactiveSessions');

    jest.advanceTimersByTime(60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    server.shutdown();

    jest.advanceTimersByTime(60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1); // Not called again
  });

  test('duplicate shutdown calls are safe', () => {
    server.shutdown();
    expect(() => server.shutdown()).not.toThrow();
  });
});
```

---

## Prevention 2: Handler-Before-Channel Pattern

### The Problem
DataChannel sends events immediately upon opening. Late handler attachment loses events.

### Complete Implementation

```typescript
//  CORRECT: Handler attached before channel opens
class WebRTCConnection extends EventEmitter {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private config: WebRTCConfig;
  private connectionState: ConnectionState = 'disconnected';

  async connect(ephemeralToken: string): Promise<void> {
    try {
      this.setConnectionState('connecting');

      // 1. Create peer connection
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // 2. Add media tracks (if needed)
      await this.addMediaTracks();

      // 3. Set up ICE handlers
      this.setupICEHandlers();

      // 4. Create data channel (not open yet)
      this.dc = this.pc.createDataChannel('oai-events', {
        ordered: true
      });

      // 5. CRITICAL: Attach handlers BEFORE channel opens
      this.setupDataChannel();

      // 6. Create and set local offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // 7. Send offer to server
      const answer = await this.exchangeOffer(offer, ephemeralToken);

      // 8. Set remote answer
      await this.pc.setRemoteDescription(answer);

      // Channel will open asynchronously, but handler is already attached
      logger.info('[WebRTCConnection] Connection established, waiting for channel open');

    } catch (error) {
      logger.error('[WebRTCConnection] Connection failed:', error);
      this.handleDisconnection();
      throw error;
    }
  }

  private setupDataChannel(): void {
    if (!this.dc) {
      logger.error('[WebRTCConnection] Cannot setup data channel: channel not created');
      return;
    }

    // CRITICAL: onmessage handler attached FIRST
    // This ensures we receive all messages from the moment channel opens
    this.dc.onmessage = (event: MessageEvent) => {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Received message', {
          length: event.data.length,
          timestamp: Date.now()
        });
      }

      // Forward to event handler via emission
      // This decouples connection from event processing
      this.emit('dataChannelMessage', event.data);
    };

    // Channel open handler (fires after onmessage attached)
    this.dc.onopen = () => {
      logger.info('[WebRTCConnection] Data channel opened', {
        readyState: this.dc?.readyState,
        label: this.dc?.label
      });

      this.setConnectionState('connected');

      // Notify that channel is ready for sending
      this.emit('dataChannelReady', this.dc);
    };

    // Error handler (always log, regardless of debug mode)
    this.dc.onerror = (event: Event) => {
      console.error('[WebRTCConnection] Data channel error:', {
        type: event.type,
        readyState: this.dc?.readyState,
        bufferedAmount: this.dc?.bufferedAmount,
        timestamp: Date.now()
      });

      this.emit('error', event);
    };

    // Close handler (always log, regardless of debug mode)
    this.dc.onclose = (event: Event) => {
      const closeEvent = event as any;
      console.error('[WebRTCConnection] Data channel closed:', {
        code: closeEvent.code,
        reason: closeEvent.reason,
        wasClean: closeEvent.wasClean,
        timestamp: Date.now(),
        connectionState: this.connectionState
      });

      this.handleDisconnection();
    };
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;

    const oldState = this.connectionState;
    this.connectionState = state;

    logger.info('[WebRTCConnection] State change', {
      from: oldState,
      to: state
    });

    this.emit('connection.change', state);
  }

  disconnect(): void {
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.setConnectionState('disconnected');
  }
}

// Event handler receives forwarded messages
class VoiceEventHandler extends EventEmitter {
  private transcriptMap: Map<string, TranscriptEntry> = new Map();

  handleRawMessage(data: string): void {
    try {
      const event = JSON.parse(data);

      // Log all events for diagnosis (can be gated by debug flag)
      if (this.config.debug) {
        console.log(`🔔 [VoiceEventHandler] ${event.type}`, {
          type: event.type,
          itemId: event.item_id,
          timestamp: Date.now()
        });
      }

      // Route to specific handler
      this.handleEvent(event);
    } catch (error) {
      logger.error('[VoiceEventHandler] Failed to parse message:', error);
    }
  }

  private handleEvent(event: any): void {
    switch (event.type) {
      case 'session.created':
        this.handleSessionCreated(event);
        break;
      case 'conversation.item.created':
        this.handleConversationItemCreated(event);
        break;
      case 'conversation.item.input_audio_transcription.delta':
        this.handleTranscriptDelta(event);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.handleTranscriptCompleted(event);
        break;
      // ... other event types ...
      default:
        if (this.config.debug) {
          logger.warn(`[VoiceEventHandler] Unhandled event type: ${event.type}`);
        }
    }
  }

  private handleConversationItemCreated(event: any): void {
    const itemId = event.item?.id || event.item_id;

    if (!itemId) {
      logger.error('[VoiceEventHandler] Missing item ID in conversation.item.created');
      return;
    }

    // Create transcript entry proactively
    this.transcriptMap.set(itemId, {
      transcript: '',
      isFinal: false,
      timestamp: Date.now()
    });

    if (this.config.debug) {
      logger.info(`[VoiceEventHandler] Created transcript entry for ${itemId}`);
    }
  }

  private handleTranscriptDelta(event: any): void {
    const itemId = event.item_id;

    if (!itemId) {
      logger.error('[VoiceEventHandler] Missing item ID in transcript delta');
      return;
    }

    // DEFENSIVE: Create entry if missing (in case conversation.item.created was lost)
    if (!this.transcriptMap.has(itemId)) {
      logger.warn(`[VoiceEventHandler] Creating missing transcript entry for ${itemId}`);
      this.transcriptMap.set(itemId, {
        transcript: '',
        isFinal: false,
        timestamp: Date.now()
      });
    }

    // Append delta
    const entry = this.transcriptMap.get(itemId)!;
    entry.transcript += event.delta || '';

    // Emit partial transcript
    this.emit('transcript.delta', {
      itemId,
      delta: event.delta,
      transcript: entry.transcript
    });
  }

  private handleTranscriptCompleted(event: any): void {
    const itemId = event.item_id;

    if (!itemId) {
      logger.error('[VoiceEventHandler] Missing item ID in transcript completed');
      return;
    }

    // DEFENSIVE: Create entry if missing
    if (!this.transcriptMap.has(itemId)) {
      logger.warn(`[VoiceEventHandler] Creating missing transcript entry for ${itemId}`);
      this.transcriptMap.set(itemId, {
        transcript: event.transcript || '',
        isFinal: true,
        timestamp: Date.now()
      });
    }

    // Mark as final
    const entry = this.transcriptMap.get(itemId)!;
    entry.transcript = event.transcript || entry.transcript;
    entry.isFinal = true;

    // Emit final transcript
    this.emit('transcript.completed', {
      itemId,
      transcript: entry.transcript
    });
  }
}

// Wire them together in orchestrator
class WebRTCVoiceClient extends EventEmitter {
  private connection: WebRTCConnection;
  private eventHandler: VoiceEventHandler;

  constructor(config: VoiceConfig) {
    super();
    this.connection = new WebRTCConnection(config);
    this.eventHandler = new VoiceEventHandler(config);

    // Forward data channel messages to event handler
    this.connection.on('dataChannelMessage', (data: string) => {
      this.eventHandler.handleRawMessage(data);
    });

    // Forward transcript events to consumers
    this.eventHandler.on('transcript.completed', (event) => {
      this.emit('transcript', event);
    });
  }
}
```

### Unit Tests

```typescript
describe('DataChannel Handler Timing', () => {
  test('onmessage attached before channel opens', async () => {
    const connection = new WebRTCConnection(config);
    const attachSpy = jest.spyOn(connection as any, 'setupDataChannel');

    // Mock peer connection
    const mockPc = {
      createDataChannel: jest.fn(() => ({
        onmessage: null,
        onopen: null,
        onerror: null,
        onclose: null
      })),
      createOffer: jest.fn(),
      setLocalDescription: jest.fn(),
      setRemoteDescription: jest.fn()
    };

    connection['pc'] = mockPc as any;

    await connection.connect('test-token');

    // Verify setupDataChannel called before channel opens
    expect(attachSpy).toHaveBeenCalled();

    // Verify onmessage handler set
    const dc = connection['dc'];
    expect(dc?.onmessage).not.toBeNull();
  });

  test('messages received immediately after channel opens', async () => {
    const connection = new WebRTCConnection(config);
    const receivedMessages: string[] = [];

    connection.on('dataChannelMessage', (data: string) => {
      receivedMessages.push(data);
    });

    await connection.connect('test-token');

    // Simulate channel opening and immediate message
    const dc = connection['dc'];
    dc?.onopen?.(new Event('open'));

    // Simulate message arrives immediately (0ms delay)
    dc?.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify({ type: 'session.created', session: {} })
    }));

    // Message should be received
    expect(receivedMessages).toHaveLength(1);
    expect(JSON.parse(receivedMessages[0]).type).toBe('session.created');
  });
});

describe('VoiceEventHandler Defensive Fallbacks', () => {
  test('creates transcript entry if conversation.item.created was lost', () => {
    const handler = new VoiceEventHandler(config);

    // Simulate lost conversation.item.created event
    // Jump directly to transcript delta
    handler.handleRawMessage(JSON.stringify({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item_123',
      delta: 'Hello '
    }));

    // Entry should be created defensively
    const entry = handler['transcriptMap'].get('item_123');
    expect(entry).toBeDefined();
    expect(entry?.transcript).toBe('Hello ');
  });

  test('appends deltas correctly after defensive creation', () => {
    const handler = new VoiceEventHandler(config);

    // First delta (triggers defensive creation)
    handler.handleRawMessage(JSON.stringify({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item_123',
      delta: 'Hello '
    }));

    // Second delta (should append)
    handler.handleRawMessage(JSON.stringify({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item_123',
      delta: 'world'
    }));

    const entry = handler['transcriptMap'].get('item_123');
    expect(entry?.transcript).toBe('Hello world');
  });
});
```

---

## Prevention 3: Connection Locking Mechanism

### The Problem
Concurrent connection attempts create duplicate subscriptions and inconsistent state.

### Complete Implementation

```typescript
//  CORRECT: Comprehensive connection guards
class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private isIntentionallyClosed = false;

  // Guard flags
  private isConnecting = false;
  private isReconnecting = false;
  private connectionPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    // Guard 1: Already connected
    if (this.ws && (
      this.ws.readyState === WebSocket.CONNECTING ||
      this.ws.readyState === WebSocket.OPEN
    )) {
      logger.warn('[WebSocket] Already connected or connecting, skipping...');
      return;
    }

    // Guard 2: Already connecting (await existing attempt)
    if (this.isConnecting && this.connectionPromise) {
      logger.warn('[WebSocket] Connection in progress, awaiting existing...');
      return this.connectionPromise;
    }

    // Guard 3: Reconnection cycle active
    if (this.isReconnecting) {
      logger.warn('[WebSocket] Reconnection in progress, skipping connect...');
      return;
    }

    // Set guard flag and create promise
    this.isConnecting = true;
    this.isIntentionallyClosed = false;

    this.connectionPromise = (async () => {
      try {
        await this.establishConnection();
      } catch (error) {
        logger.error('[WebSocket] Connection failed:', error);
        this.scheduleReconnect();
        throw error;
      } finally {
        this.isConnecting = false;
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  private async establishConnection(): Promise<void> {
    this.setConnectionState('connecting');

    // Get auth token
    const token = await this.getAuthToken();

    // Build WebSocket URL with token
    const url = `${this.config.url}?token=${encodeURIComponent(token)}`;

    // Create WebSocket
    this.ws = new WebSocket(url);

    // Set up handlers
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket creation failed'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.ws?.close();
      }, 10000); // 10s timeout

      this.ws.onopen = () => {
        clearTimeout(timeout);
        logger.info('[WebSocket] Connected');
        this.setConnectionState('connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[WebSocket] Connection error:', error);
        this.setConnectionState('error');
        reject(error);
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        console.error('[WebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });

        this.setConnectionState('disconnected');

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  private scheduleReconnect(): void {
    // Guard: Already reconnecting
    if (this.isReconnecting) {
      logger.warn('[WebSocket] Reconnect already scheduled');
      return;
    }

    // Guard: Intentionally closed (don't reconnect)
    if (this.isIntentionallyClosed) {
      logger.info('[WebSocket] Skipping reconnect (intentionally closed)');
      return;
    }

    // Guard: Max attempts reached
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('[WebSocket] Max reconnect attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    logger.info(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.isReconnecting = false;
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.isReconnecting = false;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setConnectionState('disconnected');
    logger.info('[WebSocket] Disconnected');
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;

    const oldState = this.connectionState;
    this.connectionState = state;

    logger.info('[WebSocket] State change', { from: oldState, to: state });
    this.emit('connection.change', state);
  }
}

// React component integration
function KitchenDisplay() {
  const [isInitializing, setIsInitializing] = useState(false);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  const initialize = useCallback(async () => {
    // Guard: Already initializing
    if (isInitializing && initializationPromiseRef.current) {
      console.warn('[KDS] Initialization in progress, awaiting existing...');
      return initializationPromiseRef.current;
    }

    // Guard: Component unmounted
    if (!isMountedRef.current) {
      console.warn('[KDS] Component unmounted, skipping initialization');
      return;
    }

    setIsInitializing(true);

    const promise = (async () => {
      try {
        // Connect WebSocket
        await websocketService.connect();

        // Load initial data
        if (isMountedRef.current) {
          await loadOrders();
        }

        logger.info('[KDS] Initialization complete');
      } catch (error) {
        logger.error('[KDS] Initialization failed:', error);
        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsInitializing(false);
          initializationPromiseRef.current = null;
        }
      }
    })();

    initializationPromiseRef.current = promise;
    return promise;
  }, []); // Empty deps - stable reference

  // Stable loadOrders function (won't cause re-initialization)
  const loadOrders = useCallback(async () => {
    try {
      const orders = await api.getOrders();
      if (isMountedRef.current) {
        setOrders(orders);
      }
    } catch (error) {
      logger.error('[KDS] Failed to load orders:', error);
    }
  }, []); // Empty deps - stable reference

  useEffect(() => {
    isMountedRef.current = true;
    initialize();

    return () => {
      isMountedRef.current = false;
      websocketService.disconnect();
    };
  }, []); // Empty deps - run once on mount

  // ... rest of component ...
}
```

### Unit Tests

```typescript
describe('WebSocketService Connection Guards', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService(config);
  });

  afterEach(() => {
    service.disconnect();
  });

  test('concurrent connect calls await same promise', async () => {
    const connectSpy = jest.spyOn(service as any, 'establishConnection');

    // Call connect three times concurrently
    const promises = [
      service.connect(),
      service.connect(),
      service.connect()
    ];

    await Promise.all(promises);

    // establishConnection should only be called once
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  test('connect while reconnecting is skipped', async () => {
    // Trigger reconnection
    service['isReconnecting'] = true;

    const connectSpy = jest.spyOn(service as any, 'establishConnection');

    await service.connect();

    // Should be skipped
    expect(connectSpy).not.toHaveBeenCalled();
  });

  test('reconnect scheduling is guarded', () => {
    const scheduleReconnectSpy = jest.spyOn(service as any, 'scheduleReconnect');

    // First call
    service['scheduleReconnect']();
    expect(service['isReconnecting']).toBe(true);

    // Second call (should be skipped)
    service['scheduleReconnect']();

    expect(scheduleReconnectSpy).toHaveBeenCalledTimes(2);
    // But only one timer should be set
    expect(service['reconnectTimer']).not.toBeNull();
  });
});

describe('React Component Connection Guards', () => {
  test('component mount/unmount race is handled', async () => {
    const { result, unmount } = renderHook(() => ({
      isMounted: useRef(true),
      initialize: useCallback(async () => {
        if (!result.current.isMounted.current) return;
        await websocketService.connect();
      }, [])
    }));

    // Unmount immediately
    unmount();
    result.current.isMounted.current = false;

    // Try to initialize (should be guarded)
    await act(async () => {
      await result.current.initialize();
    });

    // No error thrown, no state updates attempted
  });
});
```

---

## Prevention 4: State Timeout Implementation

### The Problem
State machines waiting for external events can deadlock if the event never arrives.

### Complete Implementation

```typescript
//  CORRECT: Comprehensive state machine with timeouts
type TurnState = 'idle' | 'recording' | 'committing' | 'waiting_user_final' | 'waiting_response';

interface StateTimeouts {
  waiting_user_final: number;  // 10 seconds
  waiting_response: number;     // 15 seconds
}

class WebRTCVoiceClient extends EventEmitter {
  private turnState: TurnState = 'idle';
  private turnStateTimeout: ReturnType<typeof setTimeout> | null = null;
  private stateTimeouts: StateTimeouts = {
    waiting_user_final: 10000,  // 10 seconds
    waiting_response: 15000      // 15 seconds
  };

  private setTurnState(newState: TurnState): void {
    if (this.turnState === newState) return;

    const oldState = this.turnState;
    this.turnState = newState;

    if (this.config.debug) {
      logger.info(`[WebRTCVoiceClient] Turn state: ${oldState} → ${newState}`);
    }

    // Clear any existing timeout
    this.clearStateTimeout();

    // Start timeout for waiting states
    if (newState === 'waiting_user_final' || newState === 'waiting_response') {
      this.startStateTimeout(newState);
    }

    this.emit('turnState.change', { from: oldState, to: newState });
  }

  private startStateTimeout(state: 'waiting_user_final' | 'waiting_response'): void {
    const timeout = this.stateTimeouts[state];

    this.turnStateTimeout = setTimeout(() => {
      if (this.turnState === state) {
        logger.warn(`[WebRTCVoiceClient] Timeout in state ${state}, resetting to idle`);

        this.emit('stateTimeout', {
          state,
          reason: `No response received within ${timeout}ms`
        });

        this.setTurnState('idle');
      }
    }, timeout);

    if (this.config.debug) {
      logger.info(`[WebRTCVoiceClient] Started ${timeout}ms timeout for state ${state}`);
    }
  }

  private clearStateTimeout(): void {
    if (this.turnStateTimeout) {
      clearTimeout(this.turnStateTimeout);
      this.turnStateTimeout = null;

      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Cleared state timeout');
      }
    }
  }

  startRecording(): void {
    // Clear any lingering timeout (defensive)
    this.clearStateTimeout();

    // State guard
    if (this.turnState !== 'idle') {
      logger.error(`[WebRTCVoiceClient] Cannot start recording in state: ${this.turnState}`);
      this.emit('recordingError', {
        reason: `Invalid state: ${this.turnState}`,
        currentState: this.turnState
      });
      return;
    }

    this.setTurnState('recording');
    // ... start recording logic ...
  }

  stopRecording(): void {
    if (this.turnState !== 'recording') {
      logger.warn(`[WebRTCVoiceClient] Cannot stop recording in state: ${this.turnState}`);
      return;
    }

    // Stop recording
    // ... stop recording logic ...

    this.setTurnState('committing');
  }

  commitRecording(): void {
    if (this.turnState !== 'committing') {
      logger.warn(`[WebRTCVoiceClient] Cannot commit recording in state: ${this.turnState}`);
      return;
    }

    // Send audio buffer to OpenAI
    this.sendAudioCommit();

    // Transition to waiting (with timeout)
    this.setTurnState('waiting_user_final');
  }

  private handleTranscriptCompleted(event: any): void {
    // Clear timeout (successful transition)
    this.clearStateTimeout();

    if (this.turnState === 'waiting_user_final') {
      const transcript = event.transcript;

      this.emit('transcript', {
        text: transcript,
        isFinal: true,
        timestamp: Date.now()
      });

      // Reset to idle
      this.setTurnState('idle');
    }
  }

  private handleResponseCompleted(event: any): void {
    // Clear timeout (successful transition)
    this.clearStateTimeout();

    if (this.turnState === 'waiting_response') {
      this.emit('response', {
        text: event.response.text,
        audio: event.response.audio
      });

      // Reset to idle
      this.setTurnState('idle');
    }
  }

  disconnect(): void {
    // Clear timeout on disconnect
    this.clearStateTimeout();

    // Reset state
    this.turnState = 'idle';

    // ... rest of disconnect logic ...
  }

  // Public method to check if stuck
  public isStuck(): boolean {
    const waitingStates: TurnState[] = ['waiting_user_final', 'waiting_response'];
    return waitingStates.includes(this.turnState) && this.turnStateTimeout !== null;
  }

  // Public method to force reset (emergency escape hatch)
  public forceReset(): void {
    logger.warn('[WebRTCVoiceClient] Force reset requested');
    this.clearStateTimeout();
    this.turnState = 'idle';
    this.emit('forceReset', { timestamp: Date.now() });
  }
}
```

### Unit Tests

```typescript
describe('State Machine Timeout Protection', () => {
  let client: WebRTCVoiceClient;

  beforeEach(() => {
    jest.useFakeTimers();
    client = new WebRTCVoiceClient(config);
  });

  afterEach(() => {
    client.disconnect();
    jest.useRealTimers();
  });

  test('waiting_user_final times out after 10 seconds', () => {
    const timeoutSpy = jest.fn();
    client.on('stateTimeout', timeoutSpy);

    // Start recording
    client.startRecording();
    expect(client['turnState']).toBe('recording');

    // Stop and commit
    client.stopRecording();
    client.commitRecording();
    expect(client['turnState']).toBe('waiting_user_final');

    // Fast-forward 10 seconds
    jest.advanceTimersByTime(10000);

    // Should timeout and reset to idle
    expect(client['turnState']).toBe('idle');
    expect(timeoutSpy).toHaveBeenCalledWith({
      state: 'waiting_user_final',
      reason: expect.stringContaining('No response received')
    });
  });

  test('successful transcript clears timeout', () => {
    const timeoutSpy = jest.fn();
    client.on('stateTimeout', timeoutSpy);

    client.startRecording();
    client.stopRecording();
    client.commitRecording();

    // Fast-forward 5 seconds (halfway)
    jest.advanceTimersByTime(5000);

    // Simulate transcript arrival
    client['handleTranscriptCompleted']({
      transcript: 'Test transcript'
    });

    // Should transition to idle without timeout
    expect(client['turnState']).toBe('idle');

    // Fast-forward remaining time
    jest.advanceTimersByTime(5000);

    // Timeout should NOT have fired
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  test('timeout reference is cleared after firing', () => {
    client.startRecording();
    client.stopRecording();
    client.commitRecording();

    expect(client['turnStateTimeout']).not.toBeNull();

    jest.advanceTimersByTime(10000);

    expect(client['turnStateTimeout']).toBeNull();
  });

  test('disconnect clears timeout', () => {
    client.startRecording();
    client.stopRecording();
    client.commitRecording();

    expect(client['turnStateTimeout']).not.toBeNull();

    client.disconnect();

    expect(client['turnStateTimeout']).toBeNull();
    expect(client['turnState']).toBe('idle');
  });

  test('force reset provides emergency escape', () => {
    const resetSpy = jest.fn();
    client.on('forceReset', resetSpy);

    // Get into stuck state somehow
    client['turnState'] = 'waiting_user_final';
    client['turnStateTimeout'] = setTimeout(() => {}, 10000) as any;

    // Force reset
    client.forceReset();

    expect(client['turnState']).toBe('idle');
    expect(client['turnStateTimeout']).toBeNull();
    expect(resetSpy).toHaveBeenCalled();
  });

  test('isStuck() detects deadlock', () => {
    expect(client.isStuck()).toBe(false);

    client['turnState'] = 'waiting_user_final';
    client['turnStateTimeout'] = setTimeout(() => {}, 10000) as any;

    expect(client.isStuck()).toBe(true);

    client.clearStateTimeout();
    expect(client.isStuck()).toBe(false);
  });
});
```

---

## Prevention 5: Graceful Shutdown Integration

### Complete Implementation

```typescript
//  CORRECT: Comprehensive graceful shutdown
// server/src/server.ts

import { logger } from './services/logger';
import { cleanupWebSocketServer } from './utils/websocket';
import { stopRateLimiterCleanup } from './middleware/authRateLimiter';
import { prisma } from './services/database';
import { VoiceWebSocketServer } from './voice/websocket-server';

let server: http.Server | null = null;
let voiceWsServer: VoiceWebSocketServer | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  // Guard: Only shutdown once
  if (isShuttingDown) {
    logger.warn(`${signal} received again, already shutting down...`);
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown...`);

  const shutdownTimeout = 10000; // 10 seconds max
  const shutdownStart = Date.now();

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Shutdown timeout exceeded'));
    }, shutdownTimeout);
  });

  try {
    // Run shutdown sequence with timeout
    await Promise.race([
      runShutdownSequence(),
      timeoutPromise
    ]);

    logger.info(`Graceful shutdown complete (${Date.now() - shutdownStart}ms)`);
    process.exit(0);

  } catch (error) {
    logger.error('Graceful shutdown failed:', error);
    logger.info('Forcing shutdown...');
    process.exit(1);
  }
}

async function runShutdownSequence(): Promise<void> {
  // 1. Stop accepting new connections (no timeout - immediate)
  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  }

  // 2. Clean up WebSocket connections (with 3s timeout)
  try {
    await Promise.race([
      cleanupWebSocketServer(),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);
    logger.info('WebSocket server cleaned up');
  } catch (error) {
    logger.error('WebSocket cleanup error (continuing):', error);
  }

  // 3. Stop auth rate limiter cleanup (immediate)
  try {
    stopRateLimiterCleanup();
    logger.info('Auth rate limiter stopped');
  } catch (error) {
    logger.error('Auth rate limiter cleanup error (continuing):', error);
  }

  // 4. Shutdown voice WebSocket server (immediate)
  if (voiceWsServer) {
    try {
      voiceWsServer.shutdown();
      logger.info('Voice WebSocket server shut down');
    } catch (error) {
      logger.error('Voice WebSocket shutdown error (continuing):', error);
    }
  }

  // 5. Close database connections (with 2s timeout)
  try {
    await Promise.race([
      prisma.$disconnect(),
      new Promise((resolve) => setTimeout(resolve, 2000))
    ]);
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Database cleanup error (continuing):', error);
  }

  // 6. Final cleanup tasks
  try {
    // Clear all intervals/timers
    const activeHandles = (process as any)._getActiveHandles();
    logger.info(`Active handles before cleanup: ${activeHandles.length}`);

    // Log active handles for diagnosis
    if (activeHandles.length > 0) {
      logger.warn('Remaining active handles:', {
        count: activeHandles.length,
        types: activeHandles.map((h: any) => h.constructor.name)
      });
    }
  } catch (error) {
    logger.error('Final cleanup error (continuing):', error);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Prevent immediate exit on unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, let graceful shutdown handle it if triggered
});

// Prevent immediate exit on uncaught exception
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Trigger graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Export for testing
export { gracefulShutdown, runShutdownSequence };
```

### Manual Testing Checklist

```bash
# Test graceful shutdown (SIGTERM)
npm run dev
# In another terminal:
ps aux | grep node | grep server
kill -TERM <pid>
# Check logs: Should see "Graceful shutdown complete" within 10s

# Test graceful shutdown (SIGINT)
npm run dev
# Press Ctrl+C
# Check logs: Should see "Graceful shutdown complete" within 10s

# Test force shutdown (SIGKILL)
npm run dev
# In another terminal:
ps aux | grep node | grep server
kill -9 <pid>
# Check logs: Should NOT see "Graceful shutdown complete" (force killed)

# Test shutdown timeout
npm run dev
# Manually break one cleanup function (e.g., infinite loop in cleanupWebSocketServer)
kill -TERM <pid>
# Check logs: Should see "Shutdown timeout exceeded" after 10s, then force exit

# Check for leaked resources
npm run dev
# Let run for 1 minute
kill -TERM <pid>
# Check logs: "Remaining active handles: 0" (or very few)
```

---

## Summary Checklist

Before committing real-time code, verify:

### Timers & Intervals
- [ ] All `setInterval` calls store reference
- [ ] All `setTimeout` calls (if long-running) store reference
- [ ] Cleanup methods exist and clear references
- [ ] Cleanup integrated with graceful shutdown
- [ ] Tests verify cleanup execution
- [ ] Duplicate start prevention (check if already running)

### Event Handlers
- [ ] Handlers attached BEFORE async operations
- [ ] No reliance on event ordering
- [ ] Defensive fallbacks for missed events
- [ ] Comprehensive event logging (always log errors)
- [ ] Test rapid sequences (connect/disconnect/reconnect)

### Connections
- [ ] `isConnecting` flag prevents concurrent attempts
- [ ] `connectionPromise` allows awaiting existing connection
- [ ] `isMounted` flag prevents updates after unmount
- [ ] `isReconnecting` flag prevents double-scheduling
- [ ] Cleanup called before reconnect
- [ ] Test rapid login/logout cycles

### State Machines
- [ ] Timeout for EVERY waiting state
- [ ] Timeout duration is generous (10s+)
- [ ] Timeout cleared on successful transition
- [ ] Timeout cleaned up on disconnect/unmount
- [ ] Emergency reset method provided
- [ ] Test timeout scenarios manually

### Shutdown
- [ ] SIGTERM and SIGINT handlers registered
- [ ] All resources cleaned up in sequence
- [ ] Individual cleanups have timeouts
- [ ] Overall shutdown has timeout (10s)
- [ ] Force exit only after timeout
- [ ] Test with `kill -TERM` and `kill -INT`
- [ ] Check for leaked resources (`_getActiveHandles()`)

### Logging
- [ ] Errors ALWAYS logged (not gated by debug)
- [ ] Structured data included (IDs, timestamps, state)
- [ ] Consistent component prefixes
- [ ] Visual aids for scanning (emoji, prefixes)
- [ ] Connection state changes logged
- [ ] Timeout events logged

---

**Last Updated:** 2025-11-19
**Status:** Production-Ready Prevention Measures
**Next Review:** 2026-02-19
