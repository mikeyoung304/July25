# AI Services Memory Leak and Cleanup Analysis Report

## Executive Summary

This comprehensive investigation analyzed all AI service implementations in the rebuild-6.0 codebase for potential memory leaks and cleanup issues. The analysis covered OpenAI integrations, Anthropic services (if present), and voice services including Twilio integration.

**Overall Status:** Several memory leak vectors identified with varying severity levels.

---

## 1. AI Service Implementations and Locations

### 1.1 Main AI Service Container
**Location:** `/server/src/ai/index.ts`

**Structure:**
- Singleton OpenAI client instance (`openaiClient`)
- Lazy initialization pattern with fallback to stubs
- Global service exports: `transcriber`, `tts`, `chat`, `orderNLP`

**Key Characteristics:**
```typescript
let openaiClient: OpenAI | null = null;
let transcriber: Transcriber;
let tts: TTS;
let chat: Chat;
let orderNLP: OrderNLP;

// Initialized at module load time
openaiClient = new OpenAI({ apiKey });
```

**Memory Concern:** The OpenAI client is initialized at module load and never explicitly cleaned up.

---

### 1.2 OpenAI Adapters

#### 1.2.1 OpenAI Chat Adapter
**Location:** `/server/src/ai/adapters/openai/openai-chat.ts`

**Client Management:**
```typescript
export class OpenAIChatAgent implements ChatAgent, Chat {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    this.client = new OpenAI({ apiKey });
  }
```

**Issues Identified:**
- Creates new OpenAI client in constructor
- No cleanup mechanism
- Each instance creates a separate HTTP client
- Error handling swallows detailed errors (lines 82-97)

#### 1.2.2 OpenAI Transcriber
**Location:** `/server/src/ai/adapters/openai/openai-transcriber.ts`

**Client Management:**
```typescript
export class OpenAITranscriber implements Transcriber {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioBuffer: Buffer, options?: TranscriberOptions): Promise<TranscriptionResult> {
    const tmpPath = await bufferToTmpFile(audioBuffer, extension);
    
    try {
      const result = await withRetry(async () => {
        const fileStream = createReadStream(tmpPath);
        const response = await this.client.audio.transcriptions.create({...});
        return response;
      });
      
      return { text: result.text, ... };
    } finally {
      // Clean up temp file
      try {
        await unlink(tmpPath);
      } catch (error) {
        transcriberLogger.warn('Failed to clean up temp file', { tmpPath, error });
      }
    }
  }
}
```

**Stream Cleanup:** 
- Proper cleanup: Temp files are unlinked in finally block
- Issue: ReadStream created but not explicitly closed
- The stream may remain open if OpenAI API call is interrupted

#### 1.2.3 OpenAI TTS
**Location:** `/server/src/ai/adapters/openai/openai-tts.ts`

**Client Management:**
- Similar pattern to Chat adapter
- Creates new OpenAI client in constructor
- No cleanup mechanism
- Buffer conversion handled in-memory (no stream concerns)

#### 1.2.4 OpenAI Order NLP
**Location:** `/server/src/ai/adapters/openai/openai-order-nlp.ts`

**Client Management:**
```typescript
export class OpenAIOrderNLP implements OrderNLP {
  constructor(private client: OpenAI, private match: OrderMatchingService) {}

  async parse({ restaurantId, text }: { restaurantId: string; text: string }) {
    const call = async () => {
      const r = await this.client.chat.completions.create({...});
      // ...
    };

    try { 
      return await withTimeout(retry(call, 1), 15_000); 
    }
    catch { 
      return { items: [], notes: `unparsed: ${text}` }; 
    }
  }
}
```

**Issues:**
- Receives OpenAI client from parent (better pattern)
- Error handling swallows errors (silent catch with fallback)

#### 1.2.5 OpenAI Utilities
**Location:** `/server/src/ai/adapters/openai/utils.ts`

**Timeout/Retry Utilities:**
```typescript
export async function withRetry<T>(
  operation: () => Promise<T>,
  { maxAttempts = 2, timeoutMs = 15000, retryDelayMs = 1000 } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        )
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw lastError;
}
```

**Issues:**
- Timeout timer not explicitly cleared when Promise.race resolves first
- setTimeout timer may orphan if promise resolves before timeout fires
- Multiple retries with delays can stack timers

**Buffer to Stream Pattern:**
```typescript
export async function bufferToStream(buffer: Buffer, extension: string): Promise<{
  stream: fs.ReadStream;
  cleanup: () => Promise<void>;
}> {
  const tmpPath = await bufferToTmpFile(buffer, extension);
  const stream = createReadStream(tmpPath);
  
  return {
    stream,
    cleanup: async () => {
      try {
        await unlink(tmpPath);
      } catch (error) {
        // File may already be deleted
      }
    }
  };
}
```

**Issues:**
- Caller responsible for cleanup (potential for leaks if forgotten)
- Stream not explicitly closed before unlink
- No error if file locked

---

### 1.3 Voice Services

#### 1.3.1 OpenAI Adapter (Voice)
**Location:** `/server/src/voice/openai-adapter.ts`

**Client Lifecycle:**
```typescript
export class OpenAIAdapter extends EventEmitter {
  private ws: WebSocket | undefined;
  private heartbeatInterval?: NodeJS.Timeout;
  
  async connect(): Promise<void> {
    this.ws = new WebSocket(url, { headers: {...} });
    await this.setupWebSocketHandlers();
    this.heartbeatInterval = setInterval(() => { this.sendHeartbeat(); }, 30000);
  }

  private setupWebSocketHandlers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.on('open', () => { resolve(); });
      this.ws.on('message', (data) => { this.handleOpenAIMessage(data); });
      this.ws.on('close', (code, reason) => { this.handleDisconnection(code, reason); });
      this.ws.on('error', (error) => { reject(error); });
      
      setTimeout(() => {
        if (!this.isConnected) { reject(new Error('Connection timeout')); }
      }, 10000);
    });
  }

  private handleDisconnection(code: number, reason: Buffer): void {
    this.isConnected = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    // Attempt reconnect
    if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = undefined;
    }
  }
}
```

**Event Listeners:**
- `.on('open')` - not explicitly removed
- `.on('message')` - not explicitly removed  
- `.on('close')` - not explicitly removed
- `.on('error')` - not explicitly removed
- `.once('open')` in waitForConnection - auto-removed by once()

**Memory Concerns:**
- Event listeners attached via `on()` never removed
- Heartbeat interval properly cleared on disconnect
- WebSocket reference properly nullified
- **CRITICAL:** Listeners persist even after disconnect if reconnection fails

#### 1.3.2 Enhanced OpenAI Adapter
**Location:** `/server/src/ai/voice/EnhancedOpenAIAdapter.ts`

**Additional Features:**
```typescript
export class EnhancedOpenAIAdapter extends OpenAIAdapter {
  private twilioWS?: WebSocket | undefined;
  private streamSid?: string | undefined;
  private metrics = { ... };
  
  setTwilioConnection(ws: WebSocket, streamSid: string): void {
    this.twilioWS = ws;
    this.streamSid = streamSid;
  }
  
  override async disconnect(): Promise<void> {
    // Log metrics
    // Clean up Twilio connection
    if (this.twilioWS) {
      this.twilioWS = undefined;
      this.streamSid = undefined;
    }
    await super.disconnect();
  }
}
```

**Issues:**
- Parent class listeners not cleaned up
- Inherits all parent memory leak issues

#### 1.3.3 Voice WebSocket Server
**Location:** `/server/src/voice/websocket-server.ts`

**Session Management:**
```typescript
export class VoiceWebSocketServer {
  private sessions = new Map<string, VoiceSession>();
  private heartbeatInterval = 30000;
  private sessionTimeout = 300000;

  constructor() {
    // Cleanup inactive sessions every minute
    setInterval(() => this.cleanupInactiveSessions(), 60000);
  }

  async startSession(ws: WebSocket, event: any) {
    const session: VoiceSession = {
      id: sessionId,
      openaiAdapter?: new OpenAIAdapter(sessionId, restaurant_id),
      heartbeatInterval: setInterval(() => {...}, this.heartbeatInterval),
      // ...
    };
    
    // Register event listeners
    session.openaiAdapter.on('transcript', (data) => {...});
    session.openaiAdapter.on('order', (data) => {...});
    session.openaiAdapter.on('audio', (data) => {...});
    session.openaiAdapter.on('error', (error) => {...});
    
    await session.openaiAdapter.connect();
    this.sessions.set(sessionId, session);
  }

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
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > this.sessionTimeout) {
        logger.info(`Cleaning up inactive voice session: ${sessionId}`);
        this.stopSession(sessionId);
      }
    });
  }
}
```

**Cleanup Pattern:**
- Proper: Session heartbeat interval cleared
- Proper: Adapter disconnect called
- Proper: Session removed from Map
- **Issue:** Event listeners on adapter not removed (will persist in adapter)

#### 1.3.4 Twilio Bridge
**Location:** `/server/src/voice/twilio-bridge.ts`

**Session Tracking:**
```typescript
const activeSessions = new Map<string, {
  sessionId: string;
  callSid: string;
  adapter: EnhancedOpenAIAdapter;
  startTime: number;
  lastActivity: number;
}>();

export function attachTwilioWebSocket(server: HTTPServer): void {
  const wss = new WebSocketServer({ server, path: '/voice/stream' });

  wss.on('connection', (ws: WebSocket, req) => {
    ws.on('message', async (data: Buffer) => {
      switch (message.event) {
        case 'start':
          adapter = new EnhancedOpenAIAdapter(sessionId, restaurantId, {...});
          adapter.setTwilioConnection(ws, streamSid);
          await adapter.connect();
          activeSessions.set(streamSid, {
            sessionId, callSid, adapter, startTime, lastActivity
          });
          break;
          
        case 'media':
          if (adapter && streamSid) {
            await adapter.sendAudio(message.media.payload);
          }
          break;
          
        case 'stop':
          if (adapter) {
            await adapter.disconnect();
          }
          if (message.streamSid) {
            activeSessions.delete(message.streamSid);
          }
          break;
      }
    });

    ws.on('close', async () => {
      if (adapter) {
        await adapter.disconnect();
      }
      if (streamSid) {
        activeSessions.delete(streamSid);
      }
    });
  });

  // Periodic cleanup of stale sessions
  setInterval(() => {
    const now = Date.now();
    const maxInactivity = 5 * 60 * 1000;
    for (const [streamSid, session] of activeSessions.entries()) {
      if (now - session.lastActivity > maxInactivity) {
        session.adapter.disconnect();
        activeSessions.delete(streamSid);
      }
    }
  }, 60000);
}
```

**Issues:**
- Module-level setInterval never cleared (cleanup interval orphaned on server shutdown)
- Adapter disconnect not awaited in cleanup (async operation may not complete)
- WebSocket cleanup proper but adapter listeners persist

#### 1.3.5 Main AIService
**Location:** `/server/src/services/ai.service.ts`

**Connection Management:**
```typescript
export class AIService {
  private connections: Map<string, ConnectionState>;

  handleVoiceConnection(ws: WebSocket, connectionId: string) {
    this.connections.set(connectionId, {
      isRecording: false,
      startTime: null,
      audioBuffer: []
    });

    ws.on('close', () => {
      this.connections.delete(connectionId);
    });
  }

  async stopRecording(connectionId: string): Promise<TranscriptionResult> {
    const state = this.connections.get(connectionId);
    // ...
    const audioBuffer = Buffer.concat(state.audioBuffer);
    // Calls ai.transcriber.transcribe() and ai.chat.respond() and ai.tts.synthesize()
  }
}
```

**Issues:**
- Audio buffers stored in memory (unbounded if not cleaned)
- No explicit cleanup if connection errors
- `Buffer.concat()` creates large temporary buffer (GC dependent)

---

### 1.4 Menu Tools and Cache
**Location:** `/server/src/ai/functions/realtime-menu-tools.ts`

**Cache Management:**
```typescript
const menuCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const restaurantCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const cartStorage = new Map<string, Cart>();

// Periodic cleanup
export function cleanupExpiredCarts(): void {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;
  for (const [sessionId, cart] of cartStorage.entries()) {
    if (now - cart.updated_at > maxAge) {
      cartStorage.delete(sessionId);
    }
  }
}

setInterval(cleanupExpiredCarts, 5 * 60 * 1000);
```

**Issues:**
- Module-level setInterval orphaned on shutdown
- In-memory cart storage unbounded during 5-minute cleanup window
- NodeCache checkperiod set to 60s (high overhead for 5-minute TTL)
- **CRITICAL:** setInterval never cleared, will continue running after module unload

---

## 2. Connection/Client Lifecycle Management

### 2.1 OpenAI Client Lifecycle

**Creation Pattern:**
```typescript
// ai/index.ts - Module level
let openaiClient: OpenAI | null = null;

try {
  openaiClient = new OpenAI({ apiKey });
  // Create service instances
} catch (error) {
  // Fall back to stubs
  openaiClient = null;
}
```

**Cleanup Pattern:** NONE - Client never destroyed or closed

**Multiple Client Instances:**
- `ai/index.ts`: One global client
- `openai-chat.ts`: Constructor creates new client (DUPLICATE)
- `openai-transcriber.ts`: Constructor creates new client (DUPLICATE)
- `openai-tts.ts`: Constructor creates new client (DUPLICATE)
- `openai-order-nlp.ts`: Uses shared client (CORRECT)

**Result:** 3+ HTTP clients created, never cleaned up

### 2.2 WebSocket Lifecycle

**Creation:**
```typescript
// voice/openai-adapter.ts
this.ws = new WebSocket(url, { headers: {...} });
```

**Listener Attachment:**
```typescript
this.ws.on('open', () => {...});
this.ws.on('message', () => {...});
this.ws.on('close', () => {...});
this.ws.on('error', () => {...});
```

**Cleanup:**
```typescript
async disconnect(): Promise<void> {
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }
  if (this.ws) {
    this.ws.close(1000);
    this.ws = undefined;
  }
}
```

**Issue:** Event listeners not removed before `ws.close()`

**Proper Cleanup:**
```typescript
// Should be:
private removeWebSocketListeners(): void {
  if (!this.ws) return;
  this.ws.removeListener('open', ...);
  this.ws.removeListener('message', ...);
  this.ws.removeListener('close', ...);
  this.ws.removeListener('error', ...);
}
```

---

## 3. Streaming Response Cleanup

### 3.1 Audio Streaming (Transcriber)

**Pattern:**
```typescript
const fileStream = createReadStream(tmpPath);
const response = await this.client.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
});
```

**Issue:** Stream not explicitly closed after upload

**Proper Pattern:**
```typescript
const fileStream = createReadStream(tmpPath);
try {
  const response = await this.client.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
  });
  return response;
} finally {
  fileStream.destroy(); // Explicitly close stream
  await unlink(tmpPath);  // Delete temp file
}
```

### 3.2 OpenAI Realtime Streaming

**Voice Adapter:**
```typescript
protected flushAudioBuffer(): void {
  if (this.responseBuffer.length > 0) {
    const combinedAudio = this.responseBuffer.join('');
    this.responseBuffer = [];
    this.emit('audio', { audio: combinedAudio });
  }
}
```

**Issue:** Large string concatenation in responseBuffer may cause GC pauses

**Better Pattern:**
```typescript
private responseBuffers: Buffer[] = [];

protected flushAudioBuffer(): void {
  if (this.responseBuffers.length > 0) {
    const combinedAudio = Buffer.concat(this.responseBuffers);
    this.responseBuffers = [];
    this.emit('audio', { audio: combinedAudio.toString('base64') });
  }
}
```

---

## 4. Persistent Connections and Clients

### 4.1 Persistent Connections Identified

1. **OpenAI API Client**
   - Type: HTTP/gRPC persistent connection
   - Count: 3+ instances (duplicate clients)
   - Lifetime: Application lifetime
   - Cleanup: NONE

2. **OpenAI WebSocket Realtime**
   - Type: WebSocket to wss://api.openai.com
   - Count: 1 per active voice session
   - Lifetime: Session duration
   - Cleanup: disconnect() clears interval and nullifies ws, but event listeners remain

3. **Twilio WebSocket**
   - Type: WebSocket from Twilio Media Streams
   - Count: 1 per active call
   - Lifetime: Call duration
   - Cleanup: Proper cleanup on message 'stop' and 'close'

4. **Database Connections (Supabase)**
   - Type: HTTP REST API (via SDK)
   - Count: Multiple instances
   - Lifetime: Application lifetime
   - Cleanup: NONE

### 4.2 Global Intervals

| Interval | Location | Cleanup | Issue |
|----------|----------|---------|-------|
| 30s heartbeat (OpenAI) | openai-adapter.ts | clearInterval on disconnect | GOOD |
| 60s heartbeat (WebSocket) | websocket.ts | clearInterval on ws close | GOOD |
| 60s inactive session cleanup | voice/websocket-server.ts | NONE | **ORPHANED** |
| 60s stale session cleanup | twilio-bridge.ts | NONE | **ORPHANED** |
| 5m cart cleanup | realtime-menu-tools.ts | NONE | **ORPHANED** |

---

## 5. Error Handler Cleanup

### 5.1 Error Handling Patterns

**OpenAI Chat (Lines 82-97):**
```typescript
} catch (error) {
  chatLogger.error('Chat completion failed', {...});
  return {
    message: "I'm having trouble responding right now.",
    metadata: { error: true, degraded: true }
  };
}
```
**Issue:** No cleanup on error, resources not released

**OpenAI Transcriber (Lines 85-95):**
```typescript
} catch (error) {
  transcriberLogger.error('Transcription failed', {...});
  throw new Error(`OpenAI Transcription failed: ${errorMessage}`);
}
```
**Issue:** finally block handles file cleanup, but stream may not be closed

**OpenAI Order NLP (Lines 57-58):**
```typescript
try { 
  return await withTimeout(retry(call, 1), 15_000); 
}
catch { 
  return { items: [], notes: `unparsed: ${text}` }; 
}
```
**Issue:** Silent error suppression, no logging, potential timer orphaning

**Voice Adapter Error Handling (Lines 107-116):**
```typescript
this.ws.on('error', (error) => {
  logger.error('OpenAI WebSocket error:', error);
  this.handleError({
    code: 'OPENAI_CONNECTION_FAILED',
    message: 'OpenAI WebSocket error',
    details: error.message,
  });
  reject(error);
});
```
**Issue:** Error handler doesn't cleanup resources (no clearInterval, no removeListeners)

### 5.2 Promise.race Timer Issues

**Location:** `ai/adapters/openai/utils.ts`

```typescript
const result = await Promise.race([
  operation(),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
  )
]);
```

**Issues:**
1. When operation() completes first, setTimeout timer remains pending
2. Timer callback continues to execute even after promise rejects
3. In withRetry, multiple attempts create multiple pending timers
4. With maxAttempts=2 and retryDelayMs=1000, up to 30,000ms of pending timers

**Memory Impact:** 
- Each timeout timer holds references to reject function
- Reject function holds references to larger scope variables
- With many requests, these accumulate before GC

---

## 6. Timeout Handling and Cleanup

### 6.1 Timeout Mechanisms

**OpenAI Connection (Line 119-123):**
```typescript
setTimeout(() => {
  if (!this.isConnected) {
    reject(new Error('Connection timeout'));
  }
}, 10000);
```
**Issue:** Timer not cleared if connection succeeds; callback only executes if condition met

**Transcriber Retry (utils.ts):**
```typescript
const result = await Promise.race([
  operation(),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Operation timed out')), 15000)
  )
]);
```
**Issue:** Orphaned timeouts accumulate

### 6.2 Missing Timeout Cleanup

The withRetry and withTimeout functions in utils.ts create setTimeout calls that are never explicitly cleared:

```javascript
// LEAK: This timer orphans when operation() completes first
const result = await Promise.race([
  fastOperation(),  // Completes in 100ms
  new Promise((_, reject) => 
    setTimeout(() => reject(...), 15000)  // Stays pending for 15s
  )
]);
// Timer not cleared, continues executing
```

**Proper Pattern:**
```javascript
const timer = setTimeout(() => reject(...), 15000);
try {
  return await operation();
} finally {
  clearTimeout(timer);
}
```

---

## 7. Potential Memory Leak Vectors

### CRITICAL (High Priority)

1. **Multiple OpenAI Client Instances**
   - Location: Multiple adapter classes
   - Issue: 3+ HTTP clients created, never destroyed
   - Impact: Each maintains connection pools and memory
   - Risk: High - connections accumulate
   - Fix: Use singleton pattern or factory

2. **Orphaned Module-Level Intervals**
   - Location: realtime-menu-tools.ts, twilio-bridge.ts, voice/websocket-server.ts
   - Issue: setInterval callbacks never cleared on shutdown
   - Impact: Timers continue executing after server shutdown/restart
   - Risk: Critical in containerized environments with frequent restarts
   - Fix: Store intervals, clear on graceful shutdown

3. **WebSocket Event Listener Leaks**
   - Location: OpenAIAdapter.setupWebSocketHandlers()
   - Issue: .on('message'), .on('close'), .on('error') never removed
   - Impact: Listeners persist even after ws.close()
   - Risk: High - listeners accumulate per session
   - Fix: Call removeListener() in disconnect()

4. **Uncaught Timer References in Promise.race**
   - Location: utils.ts withRetry/withTimeout
   - Issue: setTimeout callbacks hold scope references
   - Impact: Prevents GC of scope variables
   - Risk: High with many API calls
   - Fix: Use AbortController or explicit cleanup

### MEDIUM (Medium Priority)

5. **Stream Not Explicitly Closed**
   - Location: openai-transcriber.ts line 51
   - Issue: createReadStream() created but not explicitly destroyed
   - Impact: File descriptors remain open if upload interrupted
   - Risk: Medium - file descriptor exhaustion possible
   - Fix: Call stream.destroy() in finally block

6. **In-Memory Cart Storage**
   - Location: realtime-menu-tools.ts
   - Issue: No hard limit on Map size
   - Impact: Unbounded growth until cleanup interval runs
   - Risk: Medium - max impact 30 minutes * active sessions
   - Fix: LRU cache or set maximum size

7. **Duplicate Adapter Instances**
   - Location: AIService instances in ai/index.ts
   - Issue: Each adapter creates new OpenAI client
   - Impact: Resource duplication
   - Risk: Medium
   - Fix: Use instance from ai/index.ts

8. **Audio Buffer Concatenation**
   - Location: ai.service.ts line 100
   - Issue: Large temporary buffers from Buffer.concat()
   - Impact: GC pressure during heavy voice traffic
   - Risk: Medium - temporary, but spikes on concurrent sessions
   - Fix: Stream buffers instead of concatenating

### LOW (Lower Priority)

9. **NodeCache Overhead**
   - Location: realtime-menu-tools.ts
   - Issue: checkperiod: 60s for 5m TTL (unnecessary overhead)
   - Impact: Minimal - automatic cleanup handles expiry
   - Risk: Low - GC pressure only
   - Fix: Increase checkperiod or use simpler cache

10. **Silent Error Suppression**
    - Location: openai-order-nlp.ts, realtime-menu-tools.ts
    - Issue: Catch blocks swallow errors
    - Impact: Failures not logged, harder to debug
    - Risk: Low - not a direct leak, but hides issues
    - Fix: Log all errors

---

## 8. Summary Table: Memory Leak Vectors

| ID | Component | Issue | Severity | Impact | Location |
|----|-----------|----|----------|--------|----------|
| 1 | OpenAI Client | Duplicate clients created | CRITICAL | 3+ HTTP clients never closed | adapters/*.ts |
| 2 | Module Intervals | Orphaned timers on shutdown | CRITICAL | Timers run after server stops | multiple |
| 3 | WebSocket Listeners | Event listeners not removed | CRITICAL | Listeners persist per session | openai-adapter.ts |
| 4 | Promise.race Timers | setTimeout not cleared | CRITICAL | Scope refs held, blocks GC | utils.ts |
| 5 | File Streams | createReadStream not destroyed | MEDIUM | FD exhaustion possible | openai-transcriber.ts |
| 6 | Cart Storage | Unbounded in-memory map | MEDIUM | Up to 30m growth | realtime-menu-tools.ts |
| 7 | Duplicate Instances | Adapter instances created separately | MEDIUM | Resource duplication | ai/index.ts, multiple |
| 8 | Buffer Concatenation | Large temporary buffers | MEDIUM | GC pressure | ai.service.ts |
| 9 | Cache Overhead | High checkperiod frequency | LOW | Unnecessary polling | realtime-menu-tools.ts |
| 10 | Error Suppression | Silent error catching | LOW | Hidden failures | multiple |

---

## 9. Code Examples and Fixes

### Fix 1: Single OpenAI Client Instance

**Current (Wrong):**
```typescript
// openai-chat.ts
export class OpenAIChatAgent implements ChatAgent, Chat {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({ apiKey });
  }
}
```

**Fixed:**
```typescript
// ai/index.ts - share singleton
export class OpenAIChatAgent implements ChatAgent, Chat {
  constructor(private client: OpenAI) {}
}

const chatAgent = new OpenAIChatAgent(openaiClient);
```

### Fix 2: Cleanup Intervals on Shutdown

**Current (Wrong):**
```typescript
// realtime-menu-tools.ts
setInterval(cleanupExpiredCarts, 5 * 60 * 1000);
```

**Fixed:**
```typescript
// realtime-menu-tools.ts
let cleanupInterval: NodeJS.Timeout | null = null;

export function startCleanupInterval(): void {
  cleanupInterval = setInterval(cleanupExpiredCarts, 5 * 60 * 1000);
}

export function stopCleanupInterval(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// server.ts
process.on('SIGTERM', async () => {
  stopCleanupInterval();
  // ... other cleanup
});
```

### Fix 3: Remove WebSocket Listeners

**Current (Wrong):**
```typescript
private setupWebSocketHandlers(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.ws.on('open', () => { resolve(); });
    this.ws.on('message', (data) => { this.handleOpenAIMessage(data); });
    this.ws.on('close', () => { this.handleDisconnection(...); });
    this.ws.on('error', (error) => { reject(error); });
  });
}

async disconnect(): Promise<void> {
  if (this.ws) {
    this.ws.close();
    this.ws = undefined;
  }
}
```

**Fixed:**
```typescript
private setupWebSocketHandlers(): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOpen = () => { this.isConnected = true; resolve(); };
    const onMessage = (data) => { this.handleOpenAIMessage(data); };
    const onClose = () => { this.handleDisconnection(...); };
    const onError = (error) => { reject(error); };
    
    // Store handlers for later removal
    this.wsHandlers = { onOpen, onMessage, onClose, onError };
    
    this.ws.on('open', onOpen);
    this.ws.on('message', onMessage);
    this.ws.on('close', onClose);
    this.ws.on('error', onError);
  });
}

async disconnect(): Promise<void> {
  if (this.ws && this.wsHandlers) {
    this.ws.removeListener('open', this.wsHandlers.onOpen);
    this.ws.removeListener('message', this.wsHandlers.onMessage);
    this.ws.removeListener('close', this.wsHandlers.onClose);
    this.ws.removeListener('error', this.wsHandlers.onError);
  }
  
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }
  
  if (this.ws) {
    this.ws.close();
    this.ws = undefined;
  }
}
```

### Fix 4: Clear Orphaned Timers in Promise.race

**Current (Wrong):**
```typescript
return Promise.race([
  operation(),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
  )
]);
```

**Fixed:**
```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  const timer = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  return () => clearTimeout(timer);
});

let timeoutCleaner: (() => void) | null = null;
const result = await Promise.race([
  operation(),
  timeoutPromise
]).finally(() => {
  timeoutCleaner?.();
});
```

**Or Better - Use AbortController:**
```typescript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  return await operation(controller.signal);
} finally {
  clearTimeout(timer);
}
```

### Fix 5: Properly Close File Streams

**Current (Wrong):**
```typescript
const fileStream = createReadStream(tmpPath);
const response = await this.client.audio.transcriptions.create({
  file: fileStream,
  model: 'whisper-1',
});
```

**Fixed:**
```typescript
const fileStream = createReadStream(tmpPath);
try {
  const response = await this.client.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
  });
  return response;
} finally {
  fileStream.destroy();
  await unlink(tmpPath);
}
```

---

## 10. Recommendations

### Immediate Actions (Critical)

1. **Create AI Client Factory**
   - Consolidate to single OpenAI instance
   - Implement in ai/index.ts
   - Pass instance to all adapters
   - **Effort:** 2-3 hours
   - **Impact:** Eliminates duplicate clients

2. **Implement Graceful Shutdown**
   - Store all intervals with references
   - Clear on SIGTERM/SIGINT
   - Add to server.ts
   - **Effort:** 1-2 hours
   - **Impact:** Prevents zombie timers

3. **Fix WebSocket Listener Leaks**
   - Store handler references
   - Remove before close()
   - Apply to openai-adapter.ts
   - **Effort:** 2-3 hours
   - **Impact:** Fixes per-session listener accumulation

4. **Replace Promise.race Timeouts**
   - Use AbortController pattern
   - Apply to utils.ts
   - Update all retry logic
   - **Effort:** 2-3 hours
   - **Impact:** Eliminates timer scope leaks

### Short-term (High Priority)

5. **Add Stream Cleanup**
   - Explicitly destroy file streams
   - Apply in openai-transcriber.ts
   - **Effort:** 1 hour
   - **Impact:** Prevents FD exhaustion

6. **Bounded Cart Storage**
   - Add max size check
   - Implement LRU eviction
   - **Effort:** 1-2 hours
   - **Impact:** Limits unbounded growth

7. **Add Memory Monitoring**
   - Track heap usage per module
   - Alert on growth anomalies
   - **Effort:** 2-3 hours
   - **Impact:** Early detection of leaks

### Medium-term

8. **Implement Redis Cache**
   - Replace in-memory carts
   - Replace NodeCache
   - **Effort:** 4-6 hours
   - **Impact:** Distributed, persistent cache

9. **Add Comprehensive Logging**
   - Log client creation/destruction
   - Log interval start/stop
   - Log session lifecycle
   - **Effort:** 3-4 hours
   - **Impact:** Better debugging

10. **Implement Connection Pooling**
    - Pool OpenAI clients if multi-instance needed
    - Monitor pool health
    - **Effort:** 4-6 hours
    - **Impact:** Better resource utilization

---

## 11. Testing Recommendations

### Memory Leak Tests

```typescript
// Test 1: Client count
describe('AI Client Management', () => {
  it('should use singleton OpenAI client', () => {
    const client1 = new OpenAIChatAgent().getClient();
    const client2 = new OpenAIChatAgent().getClient();
    expect(client1).toBe(client2);
  });
});

// Test 2: Interval cleanup
describe('Module Intervals', () => {
  it('should clean up cleanup interval on stop', () => {
    startCleanupInterval();
    expect(cleanupInterval).toBeDefined();
    stopCleanupInterval();
    expect(cleanupInterval).toBeNull();
  });
});

// Test 3: WebSocket listener cleanup
describe('WebSocket Cleanup', () => {
  it('should remove all listeners on disconnect', async () => {
    const adapter = new OpenAIAdapter('test', 'rest-1');
    await adapter.connect();
    const listenerCount = adapter.listenerCount('message');
    await adapter.disconnect();
    const finalCount = adapter.listenerCount('message');
    expect(finalCount).toBe(0);
  });
});

// Test 4: Memory growth under load
describe('Memory Stability', () => {
  it('should not grow heap with repeated transcriptions', async () => {
    const initialHeap = process.memoryUsage().heapUsed;
    for (let i = 0; i < 100; i++) {
      await transcriber.transcribe(audioBuffer);
    }
    global.gc?.(); // Force GC
    const finalHeap = process.memoryUsage().heapUsed;
    const growth = finalHeap - initialHeap;
    expect(growth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
  });
});
```

### Integration Tests

- Test session lifecycle with 100+ concurrent sessions
- Monitor memory growth and stabilization
- Test rapid connect/disconnect cycles
- Monitor timer count doesn't grow unbounded

---

## 12. Monitoring and Alerting

### Key Metrics to Monitor

1. **Active Timers**
   - Location: Check process._getActiveHandles().filter(h => h instanceof Timeout)
   - Alert if > baseline + 10
   
2. **Active Event Listeners**
   - Track EventEmitter listener counts
   - Alert if max listeners warning triggered

3. **Heap Memory**
   - Track heapUsed trend
   - Alert on sustained growth > 100MB/hour

4. **File Descriptors**
   - Monitor via lsof or /proc/pid/fd
   - Alert if > 80% of ulimit

5. **WebSocket Connections**
   - Track active connections
   - Alert if != expected count

### Example Monitoring Code

```typescript
import { EventEmitter } from 'events';

function captureMemoryMetrics() {
  const mem = process.memoryUsage();
  const handles = (process as any)._getActiveHandles?.() || [];
  const timers = handles.filter((h: any) => h instanceof Timeout);
  
  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    rss: mem.rss,
    activeTimers: timers.length,
    activeHandles: handles.length,
    timestamp: Date.now()
  };
}

// Alert if heap growth > threshold
const metrics = captureMemoryMetrics();
if (metrics.heapUsed > previousMetrics.heapUsed + 50 * 1024 * 1024) {
  logger.warn('Unusual heap growth detected', { metrics });
}
```

---

## Conclusion

The rebuild-6.0 AI services implementation has several critical memory leak vectors, primarily:

1. **Duplicate OpenAI clients** - Multiple instances never destroyed
2. **Orphaned intervals** - Module-level timers never cleared
3. **WebSocket listener leaks** - Event listeners persist after disconnect
4. **Timer scope leaks** - Promise.race timeouts hold scope references

These issues pose increasing risk as:
- Voice services scale with concurrent sessions
- Timers multiply with API retries
- Memory grows unbounded until GC can catch up
- Container restarts trigger cascading leak cleanup

**Recommended approach:** Address CRITICAL items first (1-4), then implement monitoring to catch regressions. Full remediation can be done incrementally without major architectural changes.

