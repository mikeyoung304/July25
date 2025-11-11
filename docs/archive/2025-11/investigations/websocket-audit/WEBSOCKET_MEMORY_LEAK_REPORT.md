# WebSocket Implementation Memory Leak Analysis Report

## Executive Summary
Comprehensive investigation of WebSocket implementation identified several potential memory leak vectors across server-side voice WebSocket connections, client-side real-time order updates, and WebRTC connections. The codebase demonstrates good overall practices with cleanup mechanisms in place, but has identified specific areas requiring attention.

---

## 1. WebSocket Connection Management Code Locations

### 1.1 Server-Side Voice WebSocket Server
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`

**Key Components:**
- Class: `VoiceWebSocketServer` (Line 25)
- Sessions Map: `private sessions = new Map<string, VoiceSession>()` (Line 26)
- Heartbeat Interval: `private heartbeatInterval = 30000` (Line 27)
- Session Timeout: `private sessionTimeout = 300000` (Line 28)

**Connection Lifecycle:**
1. **Creation:** `handleConnection()` (Line 35) - Receives new WebSocket connections
2. **Message Handling:** `handleMessage()` (Line 74) - Processes client messages
3. **Session Start:** `startSession()` (Line 113) - Creates new VoiceSession
4. **Cleanup:** `stopSession()` (Line 284) - Removes session and clears intervals
5. **Disconnection:** `handleClose()` (Line 300) - Handles connection closure

### 1.2 Client-Side WebSocket Service
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/WebSocketService.ts`

**Key Components:**
- WebSocket Instance: `private ws: WebSocket | null = null` (Line 30)
- Reconnect Timer: `private reconnectTimer: NodeJS.Timeout | null = null` (Line 33)
- Heartbeat Timer: `private heartbeatTimer: NodeJS.Timeout | null = null` (Line 39)
- EventEmitter Base: Extends `EventEmitter` (Line 7, 29)

**Connection Lifecycle:**
1. **Connection:** `connect()` (Line 69) - Establishes WebSocket connection
2. **Message Handling:** `handleMessage()` (Line 258) - Processes server messages
3. **Disconnection:** `disconnect()` (Line 144) - Closes connection
4. **Cleanup:** `cleanup()` (Line 387) - Complete resource cleanup

### 1.3 Client-Side Connection Manager
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/ConnectionManager.ts`

**Key Components:**
- Connection Count: `private connectionCount = 0` (Line 14)
- Connected State: `private isConnected = false` (Line 11)
- Connection Promise: `private connectionPromise: Promise<void> | null = null` (Line 13)

**Lifecycle Management:**
1. **Connection Pooling:** `connect()` (Line 20) - Manages shared connections
2. **Reference Counting:** Tracks multiple consumers
3. **Disconnection:** `disconnect()` (Line 73) - Decrements counter

### 1.4 OpenAI Adapter WebSocket
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/openai-adapter.ts`

**Key Components:**
- WebSocket Instance: `private ws: WebSocket | undefined` (Line 33)
- EventEmitter Base: Extends `EventEmitter` (Line 32)
- Heartbeat Interval: `private heartbeatInterval?: NodeJS.Timeout` (Line 40)

**Connection Lifecycle:**
1. **Setup:** `setupWebSocketHandlers()` (Line 87) - Registers event handlers
2. **Initialization:** `initializeSession()` (Line 137) - Configures OpenAI session
3. **Message Handling:** `handleOpenAIMessage()` (Line 171) - Processes OpenAI events
4. **Disconnection:** `handleDisconnection()` (Line 297) - Handles connection loss
5. **Cleanup:** `disconnect()` (Line 399) - Closes connection

### 1.5 Client-Side Order Updates Handler
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/orderUpdates.ts`

**Key Components:**
- Subscriptions Array: `private subscriptions: Array<() => void> = []` (Line 22)
- Subscription IDs: `private subscriptionIds = new Set<string>()` (Line 26)
- Connection Handlers: `private connectionHandlers = {}` (Line 24)

**Lifecycle Management:**
1. **Initialization:** `initialize()` (Line 31) - Sets up order event subscriptions
2. **Cleanup:** `cleanup()` (Line 123) - Removes all subscriptions
3. **Reinitialization:** `reinitializeSubscriptions()` (Line 324) - Reconnection handling

### 1.6 WebRTC Connection
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts`

**Key Components:**
- Peer Connection: `private pc: RTCPeerConnection | null = null` (Line 57)
- Data Channel: `private dc: RTCDataChannel | null = null` (Line 58)
- Media Stream: `private mediaStream: MediaStream | null = null` (Line 60)
- Audio Element: `private audioElement: HTMLAudioElement | null = null` (Line 59)

**Lifecycle Management:**
1. **Connection:** `_connectInternal()` (Line 149) - Establishes WebRTC connection
2. **Cleanup:** `cleanupConnection()` (Line 513) - Full resource cleanup
3. **Disconnection:** `disconnect()` (Line 601) - Closes connection

---

## 2. Heartbeat/Interval Management and Cleanup

### 2.1 Server-Side Voice WebSocket Heartbeat

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`

**Global Cleanup Timer (Line 32):**
```
setInterval(() => this.cleanupInactiveSessions(), 60000)
```
- **Issue:** No reference stored for this global interval
- **Risk:** Cannot be cleared on server shutdown
- **Impact:** HIGH - Memory leak if server restarts without proper cleanup

**Per-Session Heartbeat (Line 191-193):**
```
session.heartbeatInterval = setInterval(() => {
  this.sendHeartbeat(ws, sessionId);
}, this.heartbeatInterval);
```
- **Cleanup Location:** Line 289 in `stopSession()`
```
if (session.heartbeatInterval) {
  clearInterval(session.heartbeatInterval);
}
```
- **Status:** PROPER - Correctly cleared on session stop

**Cleanup Trigger:** `cleanupInactiveSessions()` (Line 371)
- Iterates through sessions and stops inactive ones (>5 minutes)
- Calls `stopSession()` which clears heartbeat intervals
- **Status:** PROPER - Timeout-based cleanup mechanism

### 2.2 Client-Side WebSocket Heartbeat

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/WebSocketService.ts`

**Heartbeat Timer (Line 449, 454):**
```
startHeartbeat(): void {
  const runHeartbeat = () => {
    if (!this.isConnected()) return;
    
    const now = Date.now();
    if (now - this.lastHeartbeat > this.heartbeatInterval * 2) {
      console.warn('WebSocket heartbeat timeout - connection may be dead');
      if (this.ws) this.ws.close();
      return;
    }
    
    if (this.isConnected()) {
      this.send('ping', { timestamp: now });
    }
    
    if (this.isConnected()) {
      this.heartbeatTimer = setTimeout(runHeartbeat, this.heartbeatInterval);
    }
  };
  
  this.heartbeatTimer = setTimeout(runHeartbeat, this.heartbeatInterval);
}
```
- **Cleanup Location:** Line 461-464 in `stopHeartbeat()`
```
if (this.heartbeatTimer) {
  clearTimeout(this.heartbeatTimer);
  this.heartbeatTimer = null;
}
```
- **Call Sites:** 
  - `handleOpen()` (Line 254) - Starts heartbeat on successful connection
  - `handleError()` (Line 314) - Stops heartbeat on error
  - `handleClose()` (Line 321) - Stops heartbeat on disconnection
  - `cleanup()` (Line 398) - Stops heartbeat during full cleanup
- **Status:** PROPER - Thoroughly cleaned up

### 2.3 OpenAI Adapter Heartbeat

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/openai-adapter.ts`

**Heartbeat Setup (Line 166-168):**
```
this.heartbeatInterval = setInterval(() => {
  this.sendHeartbeat();
}, 30000);
```

**Cleanup in Disconnection (Line 300-302):**
```
if (this.heartbeatInterval) {
  clearInterval(this.heartbeatInterval);
}
```

**Cleanup in Disconnect (Line 402-404):**
```
if (this.heartbeatInterval) {
  clearInterval(this.heartbeatInterval);
}
```
- **Status:** PROPER - Cleared in both error and normal disconnection paths

### 2.4 Reconnection Timer Management

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/WebSocketService.ts`

**Reconnect Scheduling (Line 337-385):**
```
scheduleReconnect(): void {
  if (this.isReconnecting) return;
  
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  
  if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
    this.isReconnecting = false;
    return;
  }
  
  this.isReconnecting = true;
  this.reconnectAttempts++;
  
  const baseDelay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
  const jitterPercent = Math.random() * 0.25;
  const jitter = baseDelay * jitterPercent;
  const delay = Math.min(baseDelay + jitter, 30000);
  
  this.reconnectTimer = setTimeout(async () => {
    try {
      this.reconnectTimer = null;
      if (!this.isConnected() && !this.isIntentionallyClosed) {
        await this.connect();
      }
    } finally {
      this.isReconnecting = false;
    }
  }, delay);
}
```

**Cleanup (Line 391-395):**
```
if (this.reconnectTimer) {
  clearTimeout(this.reconnectTimer);
  this.reconnectTimer = null;
}
```
- **Call Sites:**
  - `cleanup()` - Clears on explicit disconnect
  - `scheduleReconnect()` - Prevents double scheduling (good guard)
  - `disconnect()` (Line 150-152) - Clears before closing
- **Status:** PROPER with guards against double-scheduling

### 2.5 WebSocket Pool Health Check & Heartbeat

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/websocket-pool.browser.ts`

**Health Monitoring (Line 471-484):**
```
startHealthMonitoring(): void {
  this.healthCheckTimer = setInterval(() => {
    this.performHealthCheck();
  }, this.config.healthCheckInterval);
  
  this.heartbeatTimer = setInterval(() => {
    this.sendHeartbeat();
  }, this.config.heartbeatInterval);
}
```

**Cleanup (Line 607-616):**
```
public override async cleanup(): Promise<void> {
  if (this.healthCheckTimer) {
    clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = undefined;
  }
  
  if (this.heartbeatTimer) {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }
  ...
}
```
- **Status:** PROPER - Both timers cleared in cleanup

### 2.6 Server Heartbeat Management

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/utils/websocket.ts`

**Global Heartbeat (Line 14-35):**
```
let heartbeatInterval: NodeJS.Timeout | null = null;

export function setupWebSocketHandlers(wss: WebSocketServer): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        wsLogger.info('Terminating dead connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 60000);
}
```

**Cleanup Function (Line 104-110):**
```
export function cleanupWebSocketServer(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    wsLogger.info('WebSocket heartbeat interval cleared');
  }
}
```
- **Status:** PROPER - Exported cleanup function for explicit cleanup

---

## 3. Connection Cleanup on Disconnect/Error

### 3.1 Server Voice WebSocket Disconnect

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`

**Close Handler (Line 300-306):**
```
private handleClose(ws: WebSocket, code: number, reason: Buffer) {
  const session = this.getSessionByWebSocket(ws);
  if (session) {
    logger.info(`Voice session closed: ${session.id}, code: ${code}, reason: ${reason}`);
    this.stopSession(session.id);
  }
}
```

**Error Handler (Line 308-321):**
```
private handleError(ws: WebSocket, error: Error) {
  const session = this.getSessionByWebSocket(ws);
  logger.error('Voice WebSocket error:', error);
  
  if (session) {
    session.metrics.error_count++;
    this.sendError(ws, {
      code: 'UNKNOWN_ERROR',
      message: 'WebSocket error occurred',
      session_id: session.id,
      details: error.message,
    });
  }
}
```
- **Issue:** Error handler doesn't call `stopSession()` - session persists!
- **Risk:** HIGH - Sessions accumulate on errors without cleanup
- **Impact:** Memory leak for errored connections

**Proper Cleanup in stopSession (Line 284-298):**
```
private async stopSession(sessionId: string) {
  const session = this.sessions.get(sessionId);
  if (!session) return;
  
  if (session.heartbeatInterval) {
    clearInterval(session.heartbeatInterval);
  }
  
  if (session.openaiAdapter) {
    await session.openaiAdapter.disconnect();
  }
  
  this.sessions.delete(sessionId);
  logger.info(`Voice session stopped: ${sessionId}`);
}
```
- **Status:** PROPER when called, but not called in error path

### 3.2 Client WebSocket Disconnect

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/WebSocketService.ts`

**Disconnect Method (Line 144-172):**
```
disconnect(): void {
  this.isIntentionallyClosed = true;
  this.isReconnecting = false;
  this.stopHeartbeat();
  
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  
  if (this.ws) {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(1000, 'Client disconnect');
    }
    this.ws = null;
  }
  
  this.setConnectionState('disconnected');
  this.cleanup();
}
```
- **Status:** PROPER - Comprehensive cleanup

**Close Handler (Line 318-328):**
```
private handleClose(event: CloseEvent): void {
  console.warn('WebSocket closed:', event.code, event.reason);
  this.setConnectionState('disconnected');
  this.stopHeartbeat();
  this.emit('disconnected', event);
  
  if (!this.isIntentionallyClosed) {
    this.scheduleReconnect();
  }
}
```
- **Status:** PROPER - Stops heartbeat and handles reconnection

**Error Handler (Line 310-316):**
```
private handleError(event: Event): void {
  console.error('WebSocket error:', event);
  this.setConnectionState('error');
  this.stopHeartbeat();
  this.emit('error', event);
}
```
- **Status:** PROPER - Stops heartbeat on error

**Cleanup Method (Line 387-417):**
```
private cleanup(): void {
  this.isReconnecting = false;
  
  if (this.reconnectTimer) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  
  this.stopHeartbeat();
  
  if (this.ws) {
    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onerror = null;
    this.ws.onclose = null;
    
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(1000, 'Cleanup');
    }
    
    this.ws = null;
  }
  
  this.removeAllListeners();
}
```
- **Status:** PROPER - Removes event handlers and all listeners

### 3.3 Order Updates Handler Cleanup

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/orderUpdates.ts`

**Cleanup Method (Line 123-150):**
```
cleanup(): void {
  // Unsubscribe from all WebSocket events
  this.subscriptions.forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('[OrderUpdates] Error during unsubscribe:', error);
      }
    }
  });
  this.subscriptions = [];
  this.subscriptionIds.clear();
  this.orderUpdateCallbacks = [];
  
  // Remove connection event listeners
  if (this.connectionHandlers.connected) {
    webSocketService.off('connected', this.connectionHandlers.connected);
  }
  if (this.connectionHandlers.disconnected) {
    webSocketService.off('disconnected', this.connectionHandlers.disconnected);
  }
  if (this.connectionHandlers.error) {
    webSocketService.off('error', this.connectionHandlers.error);
  }
  this.connectionHandlers = {};
  this.isInitialized = false;
}
```
- **Status:** PROPER - Comprehensive cleanup of subscriptions and listeners

**Initialization with Guard (Line 31-36):**
```
initialize(): void {
  if (this.isInitialized) {
    logger.warn('[OrderUpdates] Already initialized, skipping...');
    return;
  }
  
  logger.info('[OrderUpdates] Initializing order updates handler...');
  this.cleanup();
  ...
}
```
- **Status:** PROPER - Cleans up before reinitializing

**Reinitialization (Line 324-334):**
```
private reinitializeSubscriptions(): void {
  logger.info('[OrderUpdates] Reinitializing subscriptions after reconnection...');
  
  this.cleanup();
  this.initialize();
  
  logger.info('[OrderUpdates] Subscriptions reinitialized');
}
```
- **Status:** PROPER - Cleans up old subscriptions before creating new ones

### 3.4 WebRTC Connection Cleanup

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts`

**Cleanup Connection (Line 513-596):**
```
private cleanupConnection(): void {
  // Close data channel
  if (this.dc) {
    try {
      this.dc.onopen = null;
      this.dc.onmessage = null;
      this.dc.onerror = null;
      this.dc.onclose = null;
      this.dc.close();
    } catch {
      // Ignore errors during cleanup
    }
    this.dc = null;
  }
  
  // Close peer connection and clean up event handlers
  if (this.pc) {
    try {
      this.pc.onicecandidate = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onconnectionstatechange = null;
      this.pc.ontrack = null;
      this.pc.onsignalingstatechange = null;
      this.pc.ondatachannel = null;
      
      if (this.pc.signalingState !== 'closed') {
        this.pc.close();
      }
    } catch (e) {
      logger.warn('[WebRTCConnection] Error cleaning up peer connection:', e);
    }
    this.pc = null;
  }
  
  // Stop media stream tracks properly
  if (this.mediaStream) {
    this.mediaStream.getTracks().forEach(track => {
      try {
        track.onended = null;
        track.onmute = null;
        track.onunmute = null;
        track.stop();
      } catch {
        // Ignore errors during cleanup
      }
    });
    this.mediaStream = null;
  }
  
  // Clean up audio element properly to prevent memory leaks
  if (this.audioElement) {
    try {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement.src = '';
      this.audioElement.load();
      
      this.audioElement.onloadedmetadata = null;
      this.audioElement.onplay = null;
      this.audioElement.onpause = null;
      this.audioElement.onerror = null;
      this.audioElement.onended = null;
      this.audioElement.onseeking = null;
      this.audioElement.onseeked = null;
      
      if (this.audioElement.parentNode) {
        this.audioElement.parentNode.removeChild(this.audioElement);
      }
    } catch (e) {
      logger.warn('[WebRTCConnection] Error cleaning up audio element:', e);
    }
    this.audioElement = null;
  }
}
```
- **Status:** PROPER - Comprehensive cleanup with multiple safeguards

**Disconnect (Line 601-614):**
```
disconnect(): void {
  this.sessionActive = false;
  this.isConnectingFlag = false;
  this.cleanupConnection();
  this.setConnectionState('disconnected');
  
  if (this.config.debug) {
    logger.info('[WebRTCConnection] Disconnected');
  }
}
```
- **Status:** PROPER - Calls comprehensive cleanup

---

## 4. Data Structure Cleanup (Removing References from Maps/Arrays)

### 4.1 Voice Session Map Management

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`

**Session Map (Line 26):**
```
private sessions = new Map<string, VoiceSession>();
```

**Session Addition (Line 188):**
```
this.sessions.set(sessionId, session);
```

**Session Removal (Line 296):**
```
this.sessions.delete(sessionId);
```
- **Location:** Called only in `stopSession()` method
- **Risk:** If `stopSession()` not called, entry persists forever
- **Issue:** Error handler (Line 308-321) doesn't call `stopSession()`

**Lookup Method (Line 361-369):**
```
private getSessionByWebSocket(ws: WebSocket): VoiceSession | undefined {
  let foundSession: VoiceSession | undefined;
  this.sessions.forEach(session => {
    if (session.ws === ws) {
      foundSession = session;
    }
  });
  return foundSession;
}
```
- **Status:** POOR - O(n) linear search, inefficient for many sessions
- **Better Practice:** Maintain reverse map (WebSocket → Session ID)

**Cleanup Inactive Sessions (Line 371-379):**
```
private cleanupInactiveSessions() {
  const now = Date.now();
  this.sessions.forEach((session, sessionId) => {
    if (now - session.lastActivity > this.sessionTimeout) {
      logger.info(`Cleaning up inactive voice session: ${sessionId}`);
      this.stopSession(sessionId);
    }
  });
}
```
- **Status:** PROPER - Timeout-based cleanup with 5-minute limit
- **Frequency:** Every 60 seconds (Line 32)

### 4.2 Order Updates Subscriptions

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/orderUpdates.ts`

**Subscriptions Array (Line 22):**
```
private subscriptions: Array<() => void> = [];
```

**Subscription IDs Set (Line 26):**
```
private subscriptionIds = new Set<string>();
```

**Adding Subscriptions (Line 60-91):**
```
this.subscriptionIds.add(eventType);

let unsubscribe: () => void;

switch(eventType) {
  case 'order:created':
    unsubscribe = webSocketService.subscribe('order:created', (payload) => {
      logger.info('[OrderUpdates] Raw order:created payload:', payload);
      this.handleOrderCreated(payload);
    });
    break;
  ...
}

this.subscriptions.push(unsubscribe);
```
- **Status:** PROPER - Stores unsubscribe callbacks

**Cleanup (Line 124-135):**
```
this.subscriptions.forEach(unsubscribe => {
  if (typeof unsubscribe === 'function') {
    try {
      unsubscribe();
    } catch (error) {
      console.warn('[OrderUpdates] Error during unsubscribe:', error);
    }
  }
});
this.subscriptions = [];
this.subscriptionIds.clear();
this.orderUpdateCallbacks = [];
```
- **Status:** PROPER - Clears all arrays and sets

### 4.3 WebSocket Service Listener Cleanup

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/utils/EventEmitter.ts`

**Events Map (Line 15):**
```
private events = new Map<string, Set<EventHandler>>();
```

**Adding Listeners (Line 19-39):**
```
on(event: string, handler: EventHandler): this {
  if (!this.events.has(event)) {
    this.events.set(event, new Set());
  }
  
  const handlers = this.events.get(event)!;
  handlers.add(handler);
  
  // Warn about potential memory leak if too many listeners
  if (handlers.size > this.maxListeners && !this.listenerWarnings.has(event)) {
    console.warn(
      `[EventEmitter] WARNING: Possible memory leak detected. ` +
      `${handlers.size} listeners added for event '${event}'. ` +
      `Consider increasing maxListeners or cleaning up old listeners.`
    );
    this.listenerWarnings.add(event);
  }
  
  logger.info(`[EventEmitter] Handler registered for event '${event}', total handlers: ${handlers.size}`);
  return this;
}
```
- **Status:** PROPER - Includes memory leak detection warnings

**Removing Listeners (Line 42-51):**
```
off(event: string, handler: EventHandler): this {
  const handlers = this.events.get(event);
  if (handlers) {
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.events.delete(event);
    }
  }
  return this;
}
```
- **Status:** PROPER - Removes empty event maps

**Remove All Listeners (Line 76-85):**
```
removeAllListeners(event?: string): this {
  if (event) {
    this.events.delete(event);
    this.listenerWarnings.delete(event);
  } else {
    this.events.clear();
    this.listenerWarnings.clear();
  }
  return this;
}
```
- **Status:** PROPER - Full cleanup capability

### 4.4 WebSocket Pool Subscriptions

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/websocket-pool.browser.ts`

**Subscriptions Map (Line 125):**
```
private subscriptions = new Map<string, MessageSubscription>();
```

**Connections Map (Line 124):**
```
private connections = new Map<string, PooledWebSocketConnection>();
```

**Adding Connections (Line 240):**
```
this.connections.set(connection.id, connection);
```

**Removing Connections (Line 321, 333):**
```
this.connections.delete(connection.id);  // On close
this.connections.delete(connection.id);  // On reconnect
```
- **Status:** PROPER - Removes disconnected connections

**Cleanup (Line 606-635):**
```
public override async cleanup(): Promise<void> {
  if (this.healthCheckTimer) {
    clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = undefined;
  }
  
  if (this.heartbeatTimer) {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }
  
  // Close all connections
  const connections = Array.from(this.connections.values());
  for (const connection of connections) {
    try {
      if (isWebSocketSupported() && connection.socket.readyState === 1) {
        connection.socket.close();
      }
    } catch (error) {
      // Debug: Error closing WebSocket connection
    }
  }
  
  // Clear collections
  this.connections.clear();
  this.subscriptions.clear();
}
```
- **Status:** PROPER - Comprehensive cleanup with collection clearing

---

## 5. Circular Reference Patterns

### 5.1 Voice Session Circular References

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`

**Session Structure (Line 14-23):**
```
interface VoiceSession {
  id: string;
  restaurantId: string;
  ws: WebSocket;              // Reference to WebSocket
  openaiAdapter?: OpenAIAdapter;  // Reference to adapter
  state: SessionState;
  metrics: VoiceMetrics;
  heartbeatInterval?: NodeJS.Timeout;
  lastActivity: number;
}
```

**Potential Circular Reference Chain:**
1. `VoiceWebSocketServer.sessions` Map → `VoiceSession`
2. `VoiceSession.ws` → WebSocket instance
3. WebSocket event handlers registered (Line 62-68) → Closures capture session data
4. `VoiceSession.openaiAdapter` → OpenAIAdapter instance
5. OpenAIAdapter extends EventEmitter with handlers → Captures session reference through emit

**Risk Analysis:**
- **Direct Reference:** `VoiceSession.ws` stored in Map
- **Indirect References:** Event handler closures may capture `this` context
- **OpenAI Reference:** Bidirectional through event emissions

**Mitigation Observed (Line 293):**
```
if (session.openaiAdapter) {
  await session.openaiAdapter.disconnect();
}
```
- Properly disconnects OpenAI adapter before removing session
- Clears WebSocket references (Line 296)

### 5.2 OpenAI Adapter Circular References

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/openai-adapter.ts`

**Event Handler Registrations (Line 87-125):**
```
private setupWebSocketHandlers(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!this.ws) {
      reject(new Error('WebSocket not initialized'));
      return;
    }
    
    this.ws.on('open', () => { ... });
    this.ws.on('message', (data) => { this.handleOpenAIMessage(data); });
    this.ws.on('close', (code, reason) => { this.handleDisconnection(code, reason); });
    this.ws.on('error', (error) => { ... });
    
    setTimeout(() => { ... }, 10000);
  });
}
```

**Circular Pattern:**
1. `OpenAIAdapter.ws` → WebSocket instance
2. WebSocket handlers → Capture `this` (OpenAIAdapter instance)
3. OpenAIAdapter extends EventEmitter
4. Emit events that reference session data
5. Parent VoiceSession holds reference to this adapter

**Risk Factors:**
- EventEmitter instance not cleaned up on disconnect
- No explicit removal of event listeners before closing WebSocket

**Issue:** No explicit event listener removal (Line 399-412)
```
async disconnect(): Promise<void> {
  this.isConnected = false;
  
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }
  
  if (this.ws) {
    this.ws.close(1000, 'Normal closure');
    this.ws = undefined;
  }
  
  logger.info(`OpenAI adapter disconnected for session: ${this.sessionId}`);
}
```
- **Missing:** No `removeAllListeners()` or explicit `.off()` calls
- **Impact:** EventEmitter listeners remain in memory even after disconnect

### 5.3 Client WebSocket Listener Cleanup

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/WebSocketService.ts`

**EventEmitter Base:** Inherits from EventEmitter (Line 7, 29)

**Subscription Pattern (Line 202-232):**
```
subscribe<T = unknown>(
  messageType: string,
  callback: (payload: T) => void
): () => void {
  logger.info(`[WebSocket] Creating subscription for message type: '${messageType}'`);
  
  const handler = (message: WebSocketMessage) => {
    logger.info(`[WebSocket] Subscription handler checking: ${message.type} === ${messageType}?`);
    if (message.type === messageType) {
      logger.info(`[WebSocket] Match! Calling callback for ${messageType}`);
      callback(message.payload as T);
    }
  };
  
  this.on('message', handler);
  
  // Return unsubscribe function
  return () => {
    this.off('message', handler);
    
    // Dev-only: Decrement subscription count
    if (import.meta.env.DEV && (window as any).__dbgWS) {
      (window as any).__dbgWS.subCount--;
    }
  };
}
```

**Cleanup (Line 416):**
```
// Clear all event listeners from EventEmitter
this.removeAllListeners();
```
- **Status:** PROPER - Comprehensive removal of all listeners

### 5.4 Order Updates Listener Chain

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/orderUpdates.ts`

**Handler Closures (Line 95-114):**
```
this.connectionHandlers.connected = () => {
  console.warn('[OrderUpdates] WebSocket connected event received');
  this.reinitializeSubscriptions();
  webSocketService.send('orders:sync', { requestFullSync: true });
};

this.connectionHandlers.disconnected = () => {
  console.warn('Order updates disconnected');
  toast.error('Lost connection to order updates. Reconnecting...');
};

this.connectionHandlers.error = (error) => {
  console.error('Order updates error:', error);
};

webSocketService.on('connected', this.connectionHandlers.connected);
webSocketService.on('disconnected', this.connectionHandlers.disconnected);
webSocketService.on('error', this.connectionHandlers.error);
```

**Circular Reference Risk:**
- Handler closures capture `this` (OrderUpdatesHandler instance)
- OrderUpdatesHandler stored as singleton
- WebSocketService holds references to these handlers
- Both reference each other through event emitters

**Cleanup (Line 139-147):**
```
if (this.connectionHandlers.connected) {
  webSocketService.off('connected', this.connectionHandlers.connected);
}
if (this.connectionHandlers.disconnected) {
  webSocketService.off('disconnected', this.connectionHandlers.disconnected);
}
if (this.connectionHandlers.error) {
  webSocketService.off('error', this.connectionHandlers.error);
}
this.connectionHandlers = {};
```
- **Status:** PROPER - Removes listeners and resets object

### 5.5 WebRTC Connection Circular References

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts`

**Handler Registrations (Line 177-185, 420-458):**
```
this.pc.ontrack = (event) => {
  if (this.config.debug) { ... }
  if (this.audioElement && event.streams[0]) {
    this.audioElement.srcObject = event.streams[0];
    this.emit('track.received', event.streams[0]);
  }
};

this.dc.onopen = () => { ... };
this.dc.onmessage = (event: MessageEvent) => {
  this.emit('dataChannelMessage', event.data);
};
this.dc.onerror = (event: Event) => { ... };
this.dc.onclose = (event: Event) => { ... };
```

**Circular Pattern:**
1. `WebRTCConnection` instance holds `pc` (RTCPeerConnection)
2. Event handlers capture `this` context
3. Data channel callbacks emit events that bubble up
4. External listeners (hooks) subscribe to events
5. Hooks hold references to the connection

**Cleanup (Line 513-596):**
```
private cleanupConnection(): void {
  if (this.dc) {
    this.dc.onopen = null;
    this.dc.onmessage = null;
    this.dc.onerror = null;
    this.dc.onclose = null;
    this.dc.close();
  }
  
  if (this.pc) {
    this.pc.onicecandidate = null;
    this.pc.oniceconnectionstatechange = null;
    this.pc.onconnectionstatechange = null;
    this.pc.ontrack = null;
    this.pc.onsignalingstatechange = null;
    this.pc.ondatachannel = null;
    
    if (this.pc.signalingState !== 'closed') {
      this.pc.close();
    }
  }
  ...
}
```
- **Status:** PROPER - All handler callbacks set to null before closing

---

## 6. Critical Findings and Recommendations

### CRITICAL ISSUES

#### Issue #1: Voice Session Not Cleaned Up on Error
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`
**Location:** Line 308-321 (`handleError` method)
**Severity:** HIGH

**Problem:**
```
private handleError(ws: WebSocket, error: Error) {
  const session = this.getSessionByWebSocket(ws);
  logger.error('Voice WebSocket error:', error);
  
  if (session) {
    session.metrics.error_count++;
    this.sendError(ws, {
      code: 'UNKNOWN_ERROR',
      message: 'WebSocket error occurred',
      session_id: session.id,
      details: error.message,
    });
  }
  // MISSING: this.stopSession(session.id);
}
```

**Impact:** 
- Errored sessions remain in `this.sessions` Map indefinitely
- Heartbeat intervals continue running in background
- OpenAI adapter connections persist
- Memory leaks accumulate with every errored connection

**Fix:** Add `this.stopSession(session.id);` before closing handler

#### Issue #2: Global Cleanup Timer Not Referenced
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`
**Location:** Line 32 (Constructor)
**Severity:** MEDIUM

**Problem:**
```
constructor() {
  // Cleanup inactive sessions every minute
  setInterval(() => this.cleanupInactiveSessions(), 60000);
  // No reference stored - cannot clear on shutdown
}
```

**Impact:**
- Interval ID not stored
- Cannot be cleared on server shutdown
- Server restart doesn't guarantee interval cleanup

**Fix:** Store interval ID and implement server shutdown cleanup

#### Issue #3: OpenAI Adapter Event Listeners Not Removed
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/openai-adapter.ts`
**Location:** Line 399-412 (`disconnect` method)
**Severity:** MEDIUM

**Problem:**
```
async disconnect(): Promise<void> {
  this.isConnected = false;
  
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }
  
  if (this.ws) {
    this.ws.close(1000, 'Normal closure');
    this.ws = undefined;
  }
  // MISSING: this.removeAllListeners();
}
```

**Impact:**
- EventEmitter listeners remain registered
- Circular references with session persist
- Memory accumulates if OpenAI adapter recreated

**Fix:** Add `this.removeAllListeners();` before closing WebSocket

#### Issue #4: Linear Session Lookup
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts`
**Location:** Line 361-369 (`getSessionByWebSocket` method)
**Severity:** LOW

**Problem:**
```
private getSessionByWebSocket(ws: WebSocket): VoiceSession | undefined {
  let foundSession: VoiceSession | undefined;
  this.sessions.forEach(session => {
    if (session.ws === ws) {
      foundSession = session;
    }
  });
  return foundSession;
}
```

**Impact:**
- O(n) lookup complexity
- Inefficient for many concurrent sessions
- Called in hot paths (message handling, disconnection)

**Fix:** Maintain reverse Map<WebSocket, sessionId>

### MODERATE ISSUES

#### Issue #5: Missing Error Handler Cleanup
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/websocket-pool.browser.ts`
**Location:** Line 236-250 (`createConnection` method)
**Severity:** LOW

**Problem:**
```
connection.socket.addEventListener('error', (error: BrowserEvent) => {
  clearTimeout(timeout);
  connection.state = 'failed';
  connection.lastError = new Error(`WebSocket error: ${error.type}`);
  reject(connection.lastError);
});
```

**Impact:**
- Error listener added but never removed (one-time event)
- Not a significant leak (event fires once)
- Better to use `{ once: true }` option

**Fix:** Use `addEventListener('error', handler, { once: true })`

#### Issue #6: Double Cleanup Prevention
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/orderUpdates.ts`
**Location:** Line 42 (in `initialize` method)
**Severity:** LOW

**Problem:**
```
// Clear any existing subscriptions first
this.cleanup();

// But doesn't check if isInitialized is true after cleanup
```

**Impact:**
- Potential for double-initialization
- Handled by guard but defensive code could be cleaner

---

## 7. Best Practices Observed

### Positive Patterns

1. **Explicit Timer Cleanup (Client WebSocket)**
   - All setInterval/setTimeout calls are stored and cleared
   - Proper guards prevent double scheduling
   - Example: `startHeartbeat()` / `stopHeartbeat()`

2. **Comprehensive Resource Cleanup (WebRTC)**
   - Multiple cleanup strategies (set null, close, stop, remove from DOM)
   - Error handling with try/catch
   - Proper ordering of cleanup operations

3. **Subscription Management (Order Updates)**
   - Returns unsubscribe functions from subscribe()
   - Tracks subscription IDs to prevent duplicates
   - Cleanup called on reinitialization

4. **Event Listener Removal (EventEmitter)**
   - Removes empty event maps
   - `removeAllListeners()` capability
   - Memory leak detection warnings

5. **Guard Clauses**
   - Prevent duplicate connections
   - Prevent double reconnection scheduling
   - Prevent multiple initializations

### Anti-Patterns to Avoid

1. **Storing intervals without reference** (Voice WebSocket global timer)
2. **Not calling cleanup on error** (Voice WebSocket error handler)
3. **Not removing event listeners** (OpenAI Adapter disconnect)
4. **Linear lookups in hot paths** (Session by WebSocket lookup)
5. **Closure capturing without cleanup** (Handler functions capturing context)

---

## 8. Specific Line Numbers for Findings

### Critical Areas Requiring Immediate Review

| File | Lines | Issue | Severity |
|------|-------|-------|----------|
| `/server/src/voice/websocket-server.ts` | 308-321 | Error handler doesn't call stopSession | HIGH |
| `/server/src/voice/websocket-server.ts` | 32 | Global interval not stored for cleanup | MEDIUM |
| `/server/src/voice/websocket-server.ts` | 361-369 | O(n) WebSocket lookup | LOW |
| `/server/src/voice/openai-adapter.ts` | 399-412 | No removeAllListeners on disconnect | MEDIUM |
| `/shared/utils/websocket-pool.browser.ts` | 236-250 | Error listener not one-time | LOW |

### Well-Implemented Areas

| File | Lines | Pattern | Quality |
|------|-------|---------|---------|
| `/client/src/services/websocket/WebSocketService.ts` | 387-417 | Cleanup method | EXCELLENT |
| `/client/src/services/websocket/orderUpdates.ts` | 123-150 | Subscription cleanup | EXCELLENT |
| `/client/src/modules/voice/services/WebRTCConnection.ts` | 513-596 | Resource cleanup | EXCELLENT |
| `/shared/utils/cleanup-manager.ts` | 1-600 | Global cleanup manager | EXCELLENT |

---

## 9. Memory Monitoring & Leak Detection

### Implemented Monitoring

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/cleanup-manager.ts`

**CleanupMemoryMonitor (Line 535-593):**
- Tracks heap memory usage over time
- Keeps last 100 measurements
- Detects memory trends (increasing/decreasing/stable)
- Warns on consistent >20% memory increase
- Provides baseline profiling for leak detection

**Usage Pattern:**
```
const memory = CleanupMemoryMonitor.measure();
const trend = CleanupMemoryMonitor.getMemoryTrend();
```

---

## Conclusion

The WebSocket implementation demonstrates strong overall patterns with comprehensive cleanup mechanisms. However, three specific critical issues require immediate remediation:

1. **Voice Session Error Cleanup** - Most critical
2. **Global Timer Reference Storage** - Important for shutdown safety
3. **OpenAI Event Listener Removal** - Prevents circular references

All identified issues have clear fix locations and minimal code changes required. The codebase shows evidence of security-conscious development with multiple cleanup patterns and memory leak prevention strategies in place.

