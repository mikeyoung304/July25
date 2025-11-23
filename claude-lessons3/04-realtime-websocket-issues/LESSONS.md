# Lessons: realtime websocket issues

> **💡 Debugging Unknown Issues?** If you're encountering an error not documented here, check the [Debugging Protocols](../00-debugging-protocols/) for systematic troubleshooting methods (HTF, EPL, CSP, DDT, PIT).

## Key Incidents

# Major Real-Time Incidents - Deep Dives

**Context:** Detailed analysis of the 4 major real-time incidents that occurred during the Restaurant OS rebuild-6.0 project.

---

## Incident 1: P0.8 Memory Leaks

### Summary
**Date:** Nov 10, 2025
**Duration:** Multi-week accumulation, 8-hour investigation
**Severity:** P0 (Critical - Stability)
**Impact:** Server instability, forced restarts every 3-5 days, 1-20 MB/day memory growth

### Timeline

#### Week 1-3 (Silent Accumulation)
- Memory growth not noticed (too slow)
- Server restarts every 3-5 days (attributed to "normal operations")
- No monitoring alerts (growth below threshold)

#### Nov 9, 2025 (Detection)
- User reports: "Server feels sluggish"
- Memory check reveals 85% usage
- Heap snapshot shows timer/interval accumulation
- Decision: Launch comprehensive memory leak audit

#### Nov 10, 2025 (Investigation - 8 hours)
**07:00-09:00:** Parallel subagent investigation launched
- 5 agents: Graceful Shutdown, Event Listeners, WebSocket, AI Services, Timers/Intervals
- Scanned 50+ files, 8,000+ lines of code
- Created comprehensive audit reports

**09:00-12:00:** Critical issues identified
1. VoiceWebSocketServer: 60s cleanup interval never cleared
2. AuthRateLimiter: Hourly cleanup interval + unbounded IP maps
3. Error Tracker: 5 window event listeners never removed
4. TwilioBridge: 60s interval leak
5. RealTimeMenuTools: 5min cart cleanup interval

**12:00-15:00:** Fixes implemented
- Added cleanup interval tracking
- Created shutdown methods
- Integrated with graceful shutdown
- Added 16 memory leak prevention tests

**15:00-16:00:** Testing and verification
- All tests passing (16/16 memory leak tests)
- Memory profiling shows stable heap
- Load testing for 2 hours shows <1 MB growth

#### Nov 11-13, 2025 (Monitoring)
- Production deployment
- 72-hour monitoring period
- Memory growth: <1 MB/day (95% improvement)
- No forced restarts required

### Root Cause Analysis

#### Issue 1: VoiceWebSocketServer (CRITICAL)

**File:** `server/src/voice/websocket-server.ts:32`

**Problem:**
```typescript
// Line 32 - NO REFERENCE STORED
constructor() {
  setInterval(() => this.cleanupInactiveSessions(), 60000);
  // ^ This interval runs for entire server lifetime
}
```

**Impact:**
- 60-second interval accumulates
- Prevents clean shutdown (setInterval keeps process alive)
- If multiple instances created (e.g., during testing), intervals multiply

**Fix:**
```typescript
private cleanupInterval: NodeJS.Timeout | null = null;

constructor() {
  this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 60000);
}

public shutdown(): void {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }
  // Stop all active sessions
  for (const sessionId of this.sessions.keys()) {
    this.stopSession(sessionId);
  }
}
```

#### Issue 2: AuthRateLimiter (CRITICAL)

**File:** `server/src/middleware/authRateLimiter.ts:249-259`

**Problem:**
```typescript
// Module-level - NO CLEANUP PATH
setInterval(() => {
  for (const [clientId, attempts] of suspiciousIPs.entries()) {
    if (attempts < 3) {
      suspiciousIPs.delete(clientId);
    }
  }
  logger.info(`[SECURITY] Rate limiter cleanup...`);
}, 60 * 60 * 1000); // Every hour
```

**Impact:**
- Maps (suspiciousIPs, blockedIPs) grow indefinitely
- Under attack: thousands of IP entries accumulate
- Hourly cleanup interval never cleared
- Memory leak from both interval AND unbounded maps

**Fix:**
```typescript
let cleanupInterval: NodeJS.Timeout | null = null;

export function startRateLimiterCleanup(): void {
  if (cleanupInterval) return; // Prevent duplicates

  cleanupInterval = setInterval(() => {
    for (const [clientId, attempts] of suspiciousIPs.entries()) {
      if (attempts < 3) {
        suspiciousIPs.delete(clientId);
      }
    }
    logger.info(`[SECURITY] Rate limiter cleanup ran. Maps size - Suspicious: ${suspiciousIPs.size}, Blocked: ${blockedIPs.size}`);
  }, 60 * 60 * 1000);
}

export function stopRateLimiterCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  suspiciousIPs.clear();
  blockedIPs.clear();
}
```

#### Issue 3: Error Tracker Window Listeners (CRITICAL)

**File:** `shared/monitoring/error-tracker.ts:61,71,278,284,288`

**Problem:**
```typescript
// 5 GLOBAL LISTENERS - NO CLEANUP
window.addEventListener('error', (event) => { ... })              // Line 61
window.addEventListener('unhandledrejection', (event) => { ... }) // Line 71
window.addEventListener('popstate', () => { ... })                // Line 278
window.addEventListener('focus', () => { ... })                   // Line 284
window.addEventListener('blur', () => { ... })                    // Line 288
```

**Impact:**
- Attached at module load (global scope)
- NEVER removed
- Multiple ErrorTracker instances = duplicate listeners
- Memory leak + performance degradation (every error triggers all listeners)

**Fix:**
```typescript
private errorHandler: ((event: ErrorEvent) => void) | null = null;
private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
private popstateHandler: (() => void) | null = null;
private focusHandler: (() => void) | null = null;
private blurHandler: (() => void) | null = null;

private attachListeners(): void {
  if (typeof window === 'undefined') return;

  this.errorHandler = (event) => { /* ... */ };
  this.rejectionHandler = (event) => { /* ... */ };
  this.popstateHandler = () => { /* ... */ };
  this.focusHandler = () => { /* ... */ };
  this.blurHandler = () => { /* ... */ };

  window.addEventListener('error', this.errorHandler);
  window.addEventListener('unhandledrejection', this.rejectionHandler);
  window.addEventListener('popstate', this.popstateHandler);
  window.addEventListener('focus', this.focusHandler);
  window.addEventListener('blur', this.blurHandler);
}

public cleanup(): void {
  if (typeof window === 'undefined') return;

  if (this.errorHandler) {
    window.removeEventListener('error', this.errorHandler);
    this.errorHandler = null;
  }
  // ... repeat for all handlers
}
```

### Detection Clues

**What worked (misleading):**
- Server appeared to run normally
- No crashes or errors
- Features functioned correctly
- Tests all passing

**What indicated issues:**
- Memory usage creeping up slowly (85% after 3 weeks)
- Server "feeling sluggish" (subjective but real)
- Heap snapshots showing timer accumulation
- Process not exiting cleanly (SIGTERM took 5+ seconds)

**The smoking gun:**
```bash
# Check active handles (should be ~10, was 35+)
node -e "console.log(process._getActiveHandles().length)"

# Check active timers
node -e "console.log(process._getActiveHandles().filter(h => h.constructor.name === 'Timeout').length)"
```

### Lessons Learned

1. **Memory leaks are silent killers** - Slow accumulation isn't caught by normal testing
2. **Intervals MUST be tracked** - Every setInterval needs cleanup path
3. **Global listeners are dangerous** - Module-level attachment creates cleanup challenges
4. **Graceful shutdown is essential** - Reveals cleanup gaps immediately
5. **Heap profiling is required** - Unit tests can't catch accumulated state

### Prevention Measures

**Code Review Checklist:**
- [ ] Every `setInterval` has stored reference
- [ ] Every interval has cleanup method
- [ ] Cleanup integrated with graceful shutdown
- [ ] Event listeners have removal path
- [ ] Module-level resources have explicit lifecycle

**Testing Requirements:**
- [ ] Memory leak prevention tests for all timers
- [ ] Graceful shutdown integration test
- [ ] Load test for 24+ hours
- [ ] Heap snapshot comparison (start vs. 24hr)

**Monitoring:**
```typescript
// Add to production monitoring
setInterval(() => {
  const used = process.memoryUsage();
  logger.metric('memory.heap.used', used.heapUsed / 1024 / 1024); // MB
  logger.metric('memory.handles.count', process._getActiveHandles().length);
}, 60000); // Every minute
```

---

## Incident 2: Voice Transcription Race Condition

### Summary
**Date:** Nov 10, 2025
**Duration:** 4-hour investigation, 60+ hours accumulated impact
**Severity:** P0 (Critical - Feature Broken)
**Impact:** Voice ordering 60% failure rate, silent transcript drops, user frustration

### Timeline

#### Oct 16-30, 2025 (Working Period)
- Voice ordering working perfectly
- Success rate: 95%+
- No reported issues

#### Oct 30, 2025 (Breaking Change)
**Commit:** `9056f9ea` - Major refactor, split into 3 services
- Extracted VoiceEventHandler from WebRTCVoiceClient
- Moved event handling logic to separate class
- **INTRODUCED BUG:** Handler attachment moved from setupDataChannel to separate method

#### Oct 31 - Nov 9, 2025 (Degradation Period)
- Voice ordering success rate drops to 40%**
- Symptoms inconsistent (works sometimes, fails others)
- Users report: "Voice doesn't work" or "Agent doesn't respond"
- Multiple attempts to fix (auth, tokens, OpenAI config) - ALL FAILED

***Update (January 2025):** Phase 2 Stabilization eliminated 4 race conditions via FSM, improving expected success rate to 99%+.*

#### Nov 10, 2025 (Investigation Day - 4 hours)

**09:00-10:30:** Initial diagnosis
- Verified: Audio transmission working (68KB+, 1668 packets)
- Verified: OpenAI connection established
- Verified: Agent responds with voice
- **Problem:** NO transcription events received

**10:30-12:00:** Git history analysis
- Compared Oct 16 (working) vs. current code
- Session config IDENTICAL
- Found: Handler attachment moved in Oct 30 refactor
- **Hypothesis:** Timing race in handler attachment

**12:00-13:00:** Timing analysis
```
T+0ms:   DataChannel created
T+0ms:   setupDataChannel() called
T+50ms:  DataChannel opens
T+50ms:  OpenAI sends session.created event
T+60ms:  OpenAI sends conversation.item.created event
T+100ms: VoiceEventHandler.attachToDataChannel() called  TOO LATE
Result:  First 2 events lost, transcript map never initialized
```

**13:00-13:30:** Fix implemented
- Moved `onmessage` handler to WebRTCConnection
- Handler attached BEFORE channel opens
- Messages forwarded via event emission
- Added defensive fallbacks for missed events

**13:30-15:00:** Testing and verification
- Manual testing: 20 voice orders, 20 successes
- Production logs: session.created received immediately
- Transcript map populated correctly before transcript events
- Success rate: 95%+**

***Update (January 2025):** Phase 2 Stabilization eliminated 4 race conditions via FSM, improving expected success rate to 99%+.*

### Root Cause Analysis

#### The Race Condition (50-100ms Window)

**Before (Broken):**
```typescript
// WebRTCConnection.ts (Oct 30 refactor)
private setupDataChannel(): void {
  this.dc = this.pc.createDataChannel('oai-events');

  this.dc.onopen = () => {
    this.emit('dataChannelReady', this.dc);
    //  Event emitted, but handler not attached yet
  };

  // NO onmessage handler here!
}

// VoiceEventHandler.ts (separate class)
constructor() {
  // Handler ready, but not yet attached to channel
}

// WebRTCVoiceClient.ts (orchestrator)
this.connection.on('dataChannelReady', (dc) => {
  this.eventHandler.attachToDataChannel(dc);
  //  By this point, channel already open, events lost
});
```

**The Timing Problem:**
1. `createDataChannel()` creates channel (readyState: 'connecting')
2. ~50ms later: Channel opens (readyState: 'open')
3. OpenAI immediately sends `session.created` event
4. ~10ms later: OpenAI sends `conversation.item.created` event
5. ~50ms later: `dataChannelReady` event propagates to VoiceEventHandler
6. Handler finally attaches, but initial events already lost

**After (Fixed):**
```typescript
// WebRTCConnection.ts (Nov 10 fix)
private setupDataChannel(): void {
  if (!this.dc) return;

  // CRITICAL: Set onmessage BEFORE DataChannel opens
  this.dc.onmessage = (event: MessageEvent) => {
    // Forward to handler via event emission
    this.emit('dataChannelMessage', event.data);
  };

  this.dc.onopen = () => {
    if (this.config.debug) {
      logger.info('[WebRTCConnection] Data channel opened');
    }
    this.setConnectionState('connected');
    this.emit('dataChannelReady', this.dc);
  };
}

// WebRTCVoiceClient.ts (orchestrator)
this.connection.on('dataChannelMessage', (data: string) => {
  this.eventHandler.handleRawMessage(data);
  //  Messages forwarded immediately, no race
});
```

#### Cascade Failure from Lost Events

**Missing `session.created`:**
- Session config not confirmed
- Can't validate configuration acceptance

**Missing `conversation.item.created`:**
- Transcript map entry never created
- When `transcript.delta` arrives, no entry exists
- Transcript silently dropped
- No transcript = no function calls = voice ordering fails

**Defensive Fallback:**
```typescript
// VoiceEventHandler.ts (added Nov 10)
private handleTranscriptDelta(event: any, logPrefix: string): void {
  const itemId = event.item_id;

  // Defensive: Create entry if missing (in case conversation.item.created was lost)
  if (!this.transcriptMap.has(itemId)) {
    if (this.config.debug) {
      logger.warn(`${logPrefix} Creating missing transcript entry for ${itemId}`);
    }
    this.transcriptMap.set(itemId, {
      transcript: '',
      isFinal: false,
      timestamp: Date.now()
    });
  }

  // Now safe to append delta
  const entry = this.transcriptMap.get(itemId)!;
  entry.transcript += event.delta || '';
}
```

### Detection Clues

**What worked (misleading):**
-  WebRTC connection established
-  Audio transmitted (68KB+, 1668 packets)
-  OpenAI responded with voice
-  All configuration sent correctly
-  Session.update acknowledged

**What failed (true indicators):**
-  NO `conversation.item.input_audio_transcription.delta` events
-  NO `conversation.item.input_audio_transcription.completed` events
-  Transcript map remained empty
-  State machine timeout: "Timeout waiting for transcript, resetting to idle"
-  No function calls executed

**The smoking gun:**
```typescript
// Console logs showed (added for diagnosis):
console.log('🔔 Events received:', {
  sessionCreated: false,  //  Lost
  conversationItemCreated: false,  //  Lost
  transcriptDelta: false,  //  Lost
  transcriptCompleted: false,  //  Lost
  responseTextDone: true  //  Received (agent responded)
});
```

### Lessons Learned

1. **Handler timing is critical** - 50-100ms race windows are REAL
2. **Refactoring can introduce subtle races** - What worked as monolith fails when split
3. **Git history is invaluable** - Compare working vs. broken code directly
4. **Defensive programming is essential** - Always have fallbacks for missed events
5. **Comprehensive logging saves hours** - Log ALL events during diagnosis

### Prevention Measures

**Code Review Checklist:**
- [ ] Event handlers attached BEFORE async operations
- [ ] No reliance on event ordering
- [ ] Defensive fallbacks for critical initialization events
- [ ] Test rapid connect/disconnect cycles
- [ ] Test under network latency (throttle to 3G)

**Testing Requirements:**
```typescript
describe('DataChannel Race Condition Prevention', () => {
  test('receives session.created even if channel opens immediately', async () => {
    const connection = new WebRTCConnection(config);
    const receivedEvents: string[] = [];

    connection.on('dataChannelMessage', (data) => {
      const event = JSON.parse(data);
      receivedEvents.push(event.type);
    });

    await connection.connect(ephemeralToken);

    // Wait for events (may arrive in first 100ms)
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(receivedEvents).toContain('session.created');
  });
});
```

---

## Incident 3: KDS Double Initialization

### Summary
**Date:** Oct 15, 2025
**Duration:** 6-hour investigation, 2-day user impact
**Severity:** P1 (High - Feature Unusable)
**Impact:** KDS grid mode infinite loading, duplicate WebSocket subscriptions, UI thrashing

### Timeline

#### Oct 13, 2025 (Initial Implementation)
- KDS grid mode feature added
- Basic WebSocket integration
- Manual testing: works in isolation

#### Oct 14, 2025 (User Testing)
- Users report: "Grid mode stuck on loading"
- Login → Infinite spinner
- Logout/login → Still infinite spinner
- Only page refresh fixes it (temporarily)

#### Oct 15, 2025 (Investigation Day - 6 hours)

**09:00-11:00:** Reproduction and logging
- Added debug logging to WebSocket connections
- Added counter: `window.__dbgWS = { connectCount: 0, subCount: 0 }`
- Reproduced issue: `connectCount: 2` (expected: 1)
- Found: Component mounting twice, triggering two initializations

**11:00-13:00:** Root cause analysis
```
1. Component mounts → useEffect runs → initialize()
2. initialize() calls loadOrders()
3. loadOrders() updates state → triggers re-render
4. Dependencies include loadOrders function
5. Re-render creates NEW loadOrders function (not memoized)
6. useEffect dependency changed → runs again
7. Second initialize() call → duplicate connection attempt
```

**13:00-15:00:** Fix implementation
- Added `isConnecting` + `connectionPromise` guards
- Added `isMounted` flag for cleanup safety
- Made `loadOrders` stable with `useCallback([])`
- Removed `loadOrders` from effect dependencies
- Added `isReconnecting` flag in WebSocketService
- Called `cleanup()` before `initialize()` on reconnect

**15:00-16:00:** Testing
- Manual testing: 50+ login/logout cycles, all successful
- E2E tests: 100% pass rate
- No duplicate connections detected

### Root Cause Analysis

#### The Re-render Race

**Before (Broken):**
```typescript
// App.tsx (KDS component)
function KitchenDisplay() {
  const loadOrders = async () => {
    // NOT memoized - new function on every render
    const orders = await api.getOrders();
    setOrders(orders); // Triggers re-render
  };

  useEffect(() => {
    initialize(); // Calls loadOrders
  }, [loadOrders]); //  Dependency changes every render

  const initialize = async () => {
    await websocketService.connect();
    await loadOrders(); // Updates state → re-render
  };
}

// WebSocketService.ts
async connect(): Promise<void> {
  // NO GUARD - allows concurrent calls
  this.ws = new WebSocket(this.config.url);
  // If called twice, two sockets created
}
```

**The Race Flow:**
```
T+0ms:   Component mounts
T+0ms:   useEffect runs (dependencies: [loadOrders])
T+10ms:  initialize() starts
T+20ms:  websocketService.connect() starts
T+100ms: loadOrders() called
T+120ms: setState triggers re-render
T+130ms: loadOrders NEW FUNCTION CREATED
T+130ms: useEffect sees dependency change
T+130ms: useEffect runs AGAIN
T+140ms: initialize() starts SECOND TIME
T+160ms: websocketService.connect() CONCURRENT CALL
Result:  Two WebSocket connections, duplicate subscriptions
```

**After (Fixed):**
```typescript
// App.tsx (KDS component)
function KitchenDisplay() {
  const [isConnecting, setIsConnecting] = useState(false);
  const connectionPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // Stable function - won't change between renders
  const loadOrders = useCallback(async () => {
    const orders = await api.getOrders();
    if (isMountedRef.current) {
      setOrders(orders);
    }
  }, []); // Empty deps - stable reference

  const initialize = useCallback(async () => {
    // Guard: Already connecting
    if (isConnecting) {
      console.warn('[KDS] Already connecting, awaiting existing...');
      return connectionPromiseRef.current;
    }

    // Guard: Not mounted
    if (!isMountedRef.current) {
      console.warn('[KDS] Component unmounted, skipping init');
      return;
    }

    setIsConnecting(true);
    const promise = (async () => {
      try {
        await websocketService.connect();
        await loadOrders();
      } finally {
        if (isMountedRef.current) {
          setIsConnecting(false);
          connectionPromiseRef.current = null;
        }
      }
    })();

    connectionPromiseRef.current = promise;
    return promise;
  }, [loadOrders]); // loadOrders is stable now

  useEffect(() => {
    isMountedRef.current = true;
    initialize();

    return () => {
      isMountedRef.current = false;
      websocketService.disconnect();
    };
  }, []); // Empty deps - run once
}

// WebSocketService.ts
async connect(): Promise<void> {
  // Guard: Already connected
  if (this.ws && (
    this.ws.readyState === WebSocket.CONNECTING ||
    this.ws.readyState === WebSocket.OPEN
  )) {
    console.warn('[WebSocket] Already connected, skipping...');
    return;
  }

  // Guard: Reconnection in progress
  if (this.isReconnecting) {
    console.warn('[WebSocket] Reconnection in progress, skipping...');
    return;
  }

  // ... connection logic ...
}
```

#### Additional Race: Reconnection Scheduling

**Problem:**
```typescript
//  BAD: Can schedule multiple reconnect timers
private scheduleReconnect(): void {
  this.reconnectTimer = setTimeout(() => {
    this.connect(); // What if this fails and schedules ANOTHER reconnect?
  }, this.config.reconnectInterval);
}
```

**Fix:**
```typescript
//  GOOD: Guard prevents double-scheduling
private isReconnecting = false;

private scheduleReconnect(): void {
  if (this.isReconnecting) return; // Guard

  this.isReconnecting = true;
  this.reconnectTimer = setTimeout(() => {
    this.isReconnecting = false;
    this.connect();
  }, this.config.reconnectInterval);
}
```

### Detection Clues

**What worked (misleading):**
-  Initial render shows UI correctly
-  WebSocket connects (first connection)
-  Orders load (from first connection)
-  Manual testing with hard refresh works

**What failed (true indicators):**
-  Infinite loading spinner after first render
-  DevTools shows TWO WebSocket connections
-  Duplicate order update events
-  `window.__dbgWS.connectCount === 2`
-  Issue persists across logout/login
-  Only page refresh fixes it

**The smoking gun:**
```typescript
// Added debug logging:
if (import.meta.env.DEV) {
  window.__dbgWS = window.__dbgWS || { connectCount: 0, subCount: 0 };
  window.__dbgWS.connectCount++;
  console.warn(`[DEBUG] WebSocket connect #${window.__dbgWS.connectCount}`);
}

// Console showed:
// [DEBUG] WebSocket connect #1 (T+100ms)
// [DEBUG] WebSocket connect #2 (T+230ms)  DUPLICATE
```

### Lessons Learned

1. **useCallback for stability** - Functions in dependencies MUST be memoized
2. **Guard flags prevent races** - Always check if already connecting
3. **isMounted prevents crashes** - Check before setState after async operations
4. **Cleanup before reconnect** - Clear old subscriptions before creating new ones
5. **Debug counters are invaluable** - Simple counters reveal duplication immediately

### Prevention Measures

**Code Review Checklist:**
- [ ] Functions in useEffect deps are memoized with useCallback
- [ ] Connection attempts have guard flags
- [ ] Async operations check isMounted before setState
- [ ] Cleanup called before initialization on reconnect
- [ ] Test rapid login/logout cycles

**Testing Requirements:**
```typescript
// Unit tests
describe('useKitchenOrdersRealtime', () => {
  test('mount/unmount race: setState after unmount throws no error', async () => {
    const { result, unmount } = renderHook(() => useKitchenOrdersRealtime());

    // Unmount immediately
    unmount();

    // Try to update (should be guarded)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // No error thrown
  });
});

// E2E tests
test('KDS login/logout cycles do not cause duplicate connections', async ({ page }) => {
  for (let i = 0; i < 10; i++) {
    await page.goto('/kds/login');
    await page.fill('[name="pin"]', '1234');
    await page.click('[type="submit"]');
    await page.waitForSelector('[data-testid="orders-grid"]');

    // Check connection count
    const connectCount = await page.evaluate(() => (window as any).__dbgWS.connectCount);
    expect(connectCount).toBe(1);

    await page.click('[data-testid="logout"]');
  }
});
```

---

## Incident 4: Voice State Machine Deadlock

### Summary
**Date:** Nov 10, 2025
**Duration:** 2-hour investigation, 1-week user frustration
**Severity:** P1 (High - Feature Permanently Blocked After Failure)
**Impact:** Voice ordering unusable after first failed attempt, required page refresh to recover

### Timeline

#### Nov 3-9, 2025 (User Reports)
- Users report: "Voice button doesn't work after first try"
- Common pattern: Permission denied → button stops working
- Workaround: Refresh page, grant permission, works once
- Issue persists: Any failure → permanent lockout

#### Nov 10, 2025 (Investigation - 2 hours)

**10:00-10:30:** Reproduction
- Deny microphone permission
- Press voice button
- Release button (no audio transmitted)
- Try pressing again: Button doesn't respond
- Console error: "Cannot start recording in state: waiting_user_final"

**10:30-11:00:** State machine analysis
```
Normal flow:
idle → recording → committing → waiting_user_final → idle

Broken flow:
idle → recording → committing → waiting_user_final → STUCK FOREVER
```

**11:00-11:30:** Root cause identified
- When no audio transmitted (permission denied, mic not working)
- User releases button → empty audio buffer committed
- OpenAI receives empty audio → sends NO transcript event
- State stuck in `waiting_user_final` forever
- Next button press fails state guard check

**11:30-12:00:** Fix implemented
- Added 10-second safety timeout when entering `waiting_user_final`
- Timeout cleared when transcript received (normal case)
- Timeout fires → state resets to idle (error case)
- User can retry after timeout

### Root Cause Analysis

#### The State Machine Deadlock

**State Transitions:**
```typescript
type TurnState =
  | 'idle'           // Ready to record
  | 'recording'      // Mic active, capturing audio
  | 'committing'     // User released, sending audio to OpenAI
  | 'waiting_user_final'  // Waiting for transcript from OpenAI
  | 'waiting_response';   // Waiting for AI response
```

**Normal Flow:**
```
User presses button:
  idle → recording

User speaks:
  recording (audio buffered)

User releases button:
  recording → committing (send audio buffer)

OpenAI receives audio:
  committing → waiting_user_final (wait for transcript)

Transcript arrives:
  waiting_user_final → idle (ready for next turn)
```

**Broken Flow (No Audio):**
```
User presses button:
  idle → recording

Mic permission denied OR mic not working:
  recording (no audio buffered)

User releases button:
  recording → committing (send EMPTY audio buffer)

OpenAI receives empty audio:
  committing → waiting_user_final (wait for transcript)

OpenAI sends NO transcript (empty audio):
  waiting_user_final → ??? (NO TRANSITION)

User presses button again:
  State guard check: "Cannot start recording in state: waiting_user_final"
   BLOCKED FOREVER
```

#### Code Before Fix

```typescript
// WebRTCVoiceClient.ts (before fix)
class WebRTCVoiceClient {
  private turnState: TurnState = 'idle';

  startRecording(): void {
    // State guard
    if (this.turnState !== 'idle') {
      logger.error(`Cannot start recording in state: ${this.turnState}`);
      return; //  BLOCKED
    }

    this.turnState = 'recording';
    // ... start recording ...
  }

  commitRecording(): void {
    if (this.turnState !== 'recording') return;

    this.turnState = 'committing';
    // Send audio buffer to OpenAI
    this.sendAudioCommit();

    // Transition to waiting
    this.turnState = 'waiting_user_final';
    //  NO TIMEOUT - waits forever
  }

  handleTranscriptCompleted(): void {
    // Only called if OpenAI sends transcript
    if (this.turnState === 'waiting_user_final') {
      this.turnState = 'idle'; // Reset
    }
  }
}
```

#### Code After Fix

```typescript
// WebRTCVoiceClient.ts (after fix)
class WebRTCVoiceClient {
  private turnState: TurnState = 'idle';
  private turnStateTimeout: ReturnType<typeof setTimeout> | null = null;

  startRecording(): void {
    // Clear any existing timeout (defensive)
    if (this.turnStateTimeout) {
      clearTimeout(this.turnStateTimeout);
      this.turnStateTimeout = null;
    }

    // State guard
    if (this.turnState !== 'idle') {
      logger.error(`Cannot start recording in state: ${this.turnState}`);
      return;
    }

    this.turnState = 'recording';
    // ... start recording ...
  }

  commitRecording(): void {
    if (this.turnState !== 'recording') return;

    this.turnState = 'committing';
    this.sendAudioCommit();

    this.turnState = 'waiting_user_final';

    //  START TIMEOUT - prevents permanent deadlock
    this.turnStateTimeout = setTimeout(() => {
      if (this.turnState === 'waiting_user_final') {
        logger.warn('[WebRTCVoiceClient] Timeout waiting for transcript, resetting to idle');
        this.turnState = 'idle';
        this.emit('timeout', { reason: 'No transcript received within 10s' });
      }
    }, 10000); // 10 seconds
  }

  handleTranscriptCompleted(): void {
    //  CLEAR TIMEOUT on success
    if (this.turnStateTimeout) {
      clearTimeout(this.turnStateTimeout);
      this.turnStateTimeout = null;
    }

    if (this.turnState === 'waiting_user_final') {
      this.turnState = 'idle';
    }
  }

  disconnect(): void {
    //  CLEANUP timeout on disconnect
    if (this.turnStateTimeout) {
      clearTimeout(this.turnStateTimeout);
      this.turnStateTimeout = null;
    }
    this.turnState = 'idle';
  }
}
```

### Detection Clues

**What worked (misleading):**
-  First button press works (enters recording state)
-  State transitions to waiting_user_final (expected)
-  No JavaScript errors or crashes

**What failed (true indicators):**
-  Button doesn't respond on second press
-  Console error: "Cannot start recording in state: waiting_user_final"
-  State never resets to idle
-  Only page refresh fixes it
-  Timeout never fires (because there wasn't one)

**The smoking gun:**
```typescript
// Console logs showed:
[WebRTCVoiceClient] Turn state: idle → recording 
[WebRTCVoiceClient] Turn state: recording → committing 
[WebRTCVoiceClient] Turn state: committing → waiting_user_final 
[WebRTCVoiceClient] Turn state: waiting_user_final → ???  NEVER RESETS

// Next button press:
[WebRTCVoiceClient] Cannot start recording in state: waiting_user_final 
```

### Lessons Learned

1. **State machines need timeouts** - Any waiting state needs recovery path
2. **Test failure scenarios** - Happy path tests don't catch deadlocks
3. **User-triggered failures are common** - Permission denied, mic unplugged, etc.
4. **State guards can trap you** - Guards prevent bad transitions AND recovery
5. **Always provide escape hatch** - Timeout is the escape hatch

### Prevention Measures

**Code Review Checklist:**
- [ ] Every waiting state has timeout
- [ ] Timeout duration is generous (10s, not 1s)
- [ ] Timeout cleared on successful transition
- [ ] Timeout cleaned up on disconnect/unmount
- [ ] State guards allow timeout recovery

**Testing Requirements:**
```typescript
describe('State Machine Timeout Prevention', () => {
  test('timeout resets state after 10 seconds', async () => {
    jest.useFakeTimers();
    const client = new WebRTCVoiceClient(config);

    // Start recording
    client.startRecording();
    expect(client['turnState']).toBe('recording');

    // Commit (no audio)
    client.commitRecording();
    expect(client['turnState']).toBe('waiting_user_final');

    // Fast-forward 10 seconds
    jest.advanceTimersByTime(10000);

    // State should reset
    expect(client['turnState']).toBe('idle');

    // Should be able to start recording again
    client.startRecording();
    expect(client['turnState']).toBe('recording');

    jest.useRealTimers();
  });

  test('successful transcript clears timeout', async () => {
    jest.useFakeTimers();
    const client = new WebRTCVoiceClient(config);
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    client.startRecording();
    client.commitRecording();

    // Simulate transcript arrival
    client['handleTranscriptCompleted']();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(client['turnStateTimeout']).toBeNull();
    expect(client['turnState']).toBe('idle');

    jest.useRealTimers();
  });
});

// Manual testing checklist
// [ ] Deny microphone permission → press/release → wait 10s → press again (should work)
// [ ] Unplug microphone → press/release → wait 10s → press again (should work)
// [ ] Press/release immediately (no audio) → wait 10s → press again (should work)
// [ ] Normal recording → verify timeout cleared on transcript
```

---

## Summary Table

| Incident | Detection Time | Fix Time | Impact Severity | Users Affected | Recovery Path |
|----------|---------------|----------|-----------------|----------------|---------------|
| P0.8 Memory Leaks | 3 weeks | 8 hours | P0 Critical | All (server) | Restart server |
| Voice Race Condition | 11 days | 4 hours | P0 Critical | Voice users | None (silent) |
| KDS Double Init | 1 day | 6 hours | P1 High | KDS users | Page refresh |
| Voice Deadlock | 7 days | 2 hours | P1 High | Voice users | Page refresh |

**Total Engineering Hours:** 70+ hours
**Total Financial Impact:** $20,000+
**Total Commits:** 129 related commits
**Success Rate After Fixes:** 95%+

---

**Last Updated:** 2025-11-19
**Status:** All Incidents Resolved
**Next Review:** 2026-02-19


## Solution Patterns

# Real-Time Patterns - Proven Solutions

**Context:** Real-time WebSocket, WebRTC, and event-driven architecture patterns learned from 129 commits and 70+ hours debugging.

---

## Pattern 1: Timer/Interval Cleanup

### Problem
Timers created but never cleared accumulate indefinitely, causing memory leaks and preventing graceful shutdown.

### Anti-Pattern
```typescript
//  BAD: No reference stored, cannot be cleared
class VoiceWebSocketServer {
  constructor() {
    setInterval(() => this.cleanupInactiveSessions(), 60000);
  }
}

//  BAD: Module-level with no cleanup path
setInterval(() => {
  for (const [clientId, attempts] of suspiciousIPs.entries()) {
    if (attempts < 3) suspiciousIPs.delete(clientId);
  }
}, 60 * 60 * 1000);
```

### Correct Pattern
```typescript
//  GOOD: Reference stored, cleanup method provided
class VoiceWebSocketServer {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(
      () => this.cleanupInactiveSessions(),
      60000
    );
  }

  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    // Clean up all active sessions
    for (const sessionId of this.sessions.keys()) {
      this.stopSession(sessionId);
    }
  }
}

//  GOOD: Module-level with explicit start/stop functions
let cleanupInterval: NodeJS.Timeout | null = null;

export function startRateLimiterCleanup(): void {
  if (cleanupInterval) return; // Prevent duplicates

  cleanupInterval = setInterval(() => {
    for (const [clientId, attempts] of suspiciousIPs.entries()) {
      if (attempts < 3) suspiciousIPs.delete(clientId);
    }
    logger.info('Rate limiter cleanup ran', {
      suspiciousCount: suspiciousIPs.size,
      blockedCount: blockedIPs.size
    });
  }, 60 * 60 * 1000);
}

export function stopRateLimiterCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  suspiciousIPs.clear();
  blockedIPs.clear();
}
```

### Checklist
- [ ] Every `setInterval` has a stored reference
- [ ] Every `setTimeout` has a stored reference (if not one-shot)
- [ ] Cleanup method exists and is called on shutdown
- [ ] Cleanup sets reference to `null` after clearing
- [ ] Test verifies cleanup method clears the timer
- [ ] Integration with graceful shutdown system

---

## Pattern 2: Event Handler Attachment Timing

### Problem
WebRTC DataChannel sends events immediately upon opening. If `onmessage` handler is attached late, initial events are lost, causing cascade failures.

### The Timing Race (50-100ms Window)
```
T+0ms:   DataChannel opens
T+0ms:   OpenAI sends session.created event
T+10ms:  OpenAI sends conversation.item.created event
T+50ms:  Your handler finally attaches  TOO LATE
Result:  Events lost forever, transcript map never initialized
```

### Anti-Pattern
```typescript
//  BAD: Handler attached AFTER channel might already be open
class VoiceEventHandler {
  attachToDataChannel(dc: RTCDataChannel): void {
    // If dc.readyState is already 'open', we've lost initial events
    dc.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }
}

class WebRTCConnection {
  private setupDataChannel(): void {
    this.dc = this.pc.createDataChannel('oai-events');

    this.dc.onopen = () => {
      // Emit event to attach handler
      this.emit('dataChannelReady', this.dc); //  TOO LATE
    };
  }
}
```

### Correct Pattern
```typescript
//  GOOD: Handler attached BEFORE channel opens
class WebRTCConnection {
  private setupDataChannel(): void {
    if (!this.dc) return;

    // CRITICAL: Set onmessage BEFORE DataChannel opens
    this.dc.onmessage = (event: MessageEvent) => {
      // Forward to handler via event emission
      this.emit('dataChannelMessage', event.data);
    };

    this.dc.onopen = () => {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Data channel opened');
      }
      this.setConnectionState('connected');
      this.emit('dataChannelReady', this.dc);
    };

    this.dc.onerror = (event: Event) => {
      console.error('[WebRTCConnection] Data channel error:', event);
      this.emit('error', event);
    };

    this.dc.onclose = (event: Event) => {
      const closeEvent = event as any;
      console.error('[WebRTCConnection] Data channel closed:', {
        code: closeEvent.code,
        reason: closeEvent.reason,
        wasClean: closeEvent.wasClean
      });
      this.handleDisconnection();
    };
  }
}

//  GOOD: Handler receives forwarded messages
class VoiceEventHandler {
  constructor(private config: WebRTCVoiceConfig) {
    // Handler ready before connection even starts
  }

  handleRawMessage(data: string): void {
    try {
      const event = JSON.parse(data);
      this.handleEvent(event);
    } catch (error) {
      logger.error('[VoiceEventHandler] Failed to parse message:', error);
    }
  }
}

// Wire them together
connection.on('dataChannelMessage', (data: string) => {
  eventHandler.handleRawMessage(data);
});
```

### Defensive Fallbacks
```typescript
//  GOOD: Create transcript entries defensively
private handleTranscriptDelta(event: any, logPrefix: string): void {
  const itemId = event.item_id;

  // Defensive: Create entry if missing (in case conversation.item.created was lost)
  if (!this.transcriptMap.has(itemId)) {
    if (this.config.debug) {
      logger.warn(`${logPrefix} Creating missing transcript entry for ${itemId}`);
    }
    this.transcriptMap.set(itemId, {
      transcript: '',
      isFinal: false,
      timestamp: Date.now()
    });
  }

  // Now safe to append delta
  const entry = this.transcriptMap.get(itemId)!;
  entry.transcript += event.delta || '';
}
```

### Checklist
- [ ] Handler attached BEFORE any async operation
- [ ] Handler never relies on events being sent in specific order
- [ ] Defensive fallbacks for missed initialization events
- [ ] Comprehensive logging of all events (use `console.log` prefix for easy filtering)
- [ ] Test rapid connect/disconnect cycles

---

## Pattern 3: Connection Guard Flags

### Problem
Concurrent connection attempts create race conditions: duplicate subscriptions, inconsistent state, infinite loading.

### Anti-Pattern
```typescript
//  BAD: No guard against concurrent calls
class WebSocketService {
  async connect(): Promise<void> {
    this.ws = new WebSocket(this.config.url);
    // If called twice concurrently, two sockets created
  }
}

//  BAD: Re-render triggers re-initialization
useEffect(() => {
  initialize(); // Might be called multiple times
}, [someValue]); // Dependencies not stable
```

### Correct Pattern
```typescript
//  GOOD: Guard flag prevents concurrent attempts
class WebSocketService {
  private ws: WebSocket | null = null;
  private isReconnecting = false;

  async connect(): Promise<void> {
    // Guard: Already connected
    if (this.ws && (
      this.ws.readyState === WebSocket.CONNECTING ||
      this.ws.readyState === WebSocket.OPEN
    )) {
      console.warn('[WebSocket] Already connected, skipping...');
      return;
    }

    // Guard: Reconnection in progress
    if (this.isReconnecting) {
      console.warn('[WebSocket] Reconnection in progress, skipping...');
      return;
    }

    this.isIntentionallyClosed = false;
    this.setConnectionState('connecting');

    try {
      // ... connection logic ...
    } catch (error) {
      logger.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    // Guard: Already reconnecting
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectTimer = setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, this.config.reconnectInterval);
  }
}

//  GOOD: Component-level connection guards
function KitchenDisplay() {
  const [isConnecting, setIsConnecting] = useState(false);
  const connectionPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  const initialize = useCallback(async () => {
    // Guard: Already connecting
    if (isConnecting) {
      console.warn('[KDS] Already connecting, awaiting existing...');
      return connectionPromiseRef.current;
    }

    // Guard: Not mounted
    if (!isMountedRef.current) {
      console.warn('[KDS] Component unmounted, skipping init');
      return;
    }

    setIsConnecting(true);
    const promise = (async () => {
      try {
        await websocketService.connect();
        await loadOrders();
      } finally {
        if (isMountedRef.current) {
          setIsConnecting(false);
          connectionPromiseRef.current = null;
        }
      }
    })();

    connectionPromiseRef.current = promise;
    return promise;
  }, []); // Empty deps - stable reference

  useEffect(() => {
    isMountedRef.current = true;
    initialize();

    return () => {
      isMountedRef.current = false;
      websocketService.disconnect();
    };
  }, []); // Empty deps - run once
}
```

### Checklist
- [ ] `isConnecting` flag prevents concurrent attempts
- [ ] `connectionPromise` allows awaiting existing connection
- [ ] `isMounted` flag prevents state updates after unmount
- [ ] `isReconnecting` flag prevents double-scheduling reconnects
- [ ] Stable callbacks (`useCallback([])` for functions in dependencies)
- [ ] Cleanup before initialization on reconnect
- [ ] Test rapid connect/disconnect/reconnect cycles

---

## Pattern 4: State Machine Timeout Guards

### Problem
State machines waiting for external events can deadlock forever if the event never arrives.

### Anti-Pattern
```typescript
//  BAD: No timeout, can wait forever
type TurnState = 'idle' | 'recording' | 'waiting_user_final';

class WebRTCVoiceClient {
  private turnState: TurnState = 'idle';

  commitRecording(): void {
    this.turnState = 'waiting_user_final';
    // Waits forever for transcript event
  }

  handleTranscriptCompleted(): void {
    this.turnState = 'idle'; // Never called if no transcript
  }
}
```

### Correct Pattern
```typescript
//  GOOD: Timeout ensures recovery
class WebRTCVoiceClient {
  private turnState: TurnState = 'idle';
  private turnStateTimeout: ReturnType<typeof setTimeout> | null = null;

  commitRecording(): void {
    this.turnState = 'waiting_user_final';

    // Start timeout to prevent permanent deadlock
    this.turnStateTimeout = setTimeout(() => {
      if (this.turnState === 'waiting_user_final') {
        logger.warn('[WebRTCVoiceClient] Timeout waiting for transcript, resetting to idle');
        this.turnState = 'idle';
        this.emit('timeout', { reason: 'No transcript received within 10s' });
      }
    }, 10000); // 10 seconds
  }

  handleTranscriptCompleted(): void {
    // Clear timeout on successful completion
    if (this.turnStateTimeout) {
      clearTimeout(this.turnStateTimeout);
      this.turnStateTimeout = null;
    }
    this.turnState = 'idle';
  }

  disconnect(): void {
    // Clean up timeout on disconnect
    if (this.turnStateTimeout) {
      clearTimeout(this.turnStateTimeout);
      this.turnStateTimeout = null;
    }
    this.turnState = 'idle';
  }
}
```

### Timeout Duration Guidelines
```typescript
// Choose timeout based on expected event arrival
const TIMEOUTS = {
  // Network round-trip
  API_RESPONSE: 5000,        // 5 seconds

  // User interaction
  USER_INPUT: 30000,         // 30 seconds

  // AI processing
  TRANSCRIPT: 10000,         // 10 seconds
  AI_RESPONSE: 15000,        // 15 seconds

  // Background tasks
  CLEANUP: 60000,            // 60 seconds
  HEARTBEAT: 35000,          // 35 seconds (server timeout is 30s)
};
```

### Checklist
- [ ] Timeout set when entering waiting state
- [ ] Timeout cleared when expected event arrives
- [ ] Timeout duration is generous but not infinite
- [ ] Timeout handler resets state to safe value
- [ ] Timeout cleanup on disconnect/unmount
- [ ] Test timeout scenario manually (block event, wait for timeout)

---

## Pattern 5: Graceful Shutdown Integration

### Problem
Resources (connections, timers, listeners) not cleaned up on shutdown cause memory leaks and prevent process from exiting cleanly.

### Anti-Pattern
```typescript
//  BAD: No shutdown hook
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

//  BAD: Force exit after timeout
process.on('SIGTERM', () => {
  setTimeout(() => process.exit(0), 3000);
});
```

### Correct Pattern
```typescript
//  GOOD: Comprehensive graceful shutdown
// server/src/server.ts
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // 2. Clean up WebSocket connections (with timeout)
  await Promise.race([
    cleanupWebSocketServer(),
    new Promise((resolve) => setTimeout(resolve, 3000))
  ]);

  // 3. Stop auth rate limiter cleanup
  stopRateLimiterCleanup();

  // 4. Shutdown voice WebSocket server
  if (voiceWsServer) {
    voiceWsServer.shutdown();
  }

  // 5. Close database connections
  await prisma.$disconnect();

  // 6. Final logging
  logger.info('Graceful shutdown complete');

  // 7. Exit cleanly
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Prevent immediate exit on unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, let graceful shutdown handle it
});
```

### Cleanup Manager Pattern
```typescript
//  GOOD: Centralized cleanup registration
// shared/utils/cleanup-manager.ts
class CleanupManager {
  private cleanupFunctions: Array<{
    name: string;
    fn: () => void | Promise<void>;
    priority: number;
  }> = [];

  register(
    name: string,
    fn: () => void | Promise<void>,
    priority: number = 10
  ): void {
    this.cleanupFunctions.push({ name, fn, priority });
  }

  async cleanup(): Promise<void> {
    // Sort by priority (higher = earlier)
    const sorted = this.cleanupFunctions.sort((a, b) => b.priority - a.priority);

    for (const { name, fn } of sorted) {
      try {
        logger.info(`[CleanupManager] Cleaning up: ${name}`);
        await fn();
      } catch (error) {
        logger.error(`[CleanupManager] Cleanup failed for ${name}:`, error);
      }
    }
  }
}

export const cleanupManager = new CleanupManager();

// Usage in components
cleanupManager.register('WebSocketService', () => {
  websocketService.disconnect();
}, 100); // High priority

cleanupManager.register('VoiceWebSocketServer', () => {
  voiceWsServer.shutdown();
}, 90);

cleanupManager.register('AuthRateLimiter', () => {
  stopRateLimiterCleanup();
}, 80);
```

### Checklist
- [ ] Shutdown handler registered for SIGTERM and SIGINT
- [ ] All timers/intervals cleared
- [ ] All event listeners removed
- [ ] All WebSocket/WebRTC connections closed
- [ ] All database connections closed
- [ ] Graceful shutdown timeout (5-10 seconds)
- [ ] Forced exit only after timeout
- [ ] Test with `kill -TERM <pid>`

---

## Pattern 6: Comprehensive Error Logging

### Problem
Silent failures prevent diagnosis. Generic error messages provide no actionable information.

### Anti-Pattern
```typescript
//  BAD: No logging
this.dc.onclose = () => {
  this.handleDisconnection();
};

//  BAD: Generic logging
this.dc.onerror = (error) => {
  logger.error('Data channel error', error);
};

//  BAD: Debug-only logging (production has debug=false)
if (this.config.debug) {
  logger.info('Connection closed');
}
```

### Correct Pattern
```typescript
//  GOOD: Always log errors regardless of debug mode
this.dc.onopen = () => {
  // Normal operation - can be debug-gated
  if (this.config.debug) {
    logger.info('[WebRTCConnection] Data channel opened');
  }
  this.setConnectionState('connected');
};

this.dc.onerror = (event: Event) => {
  // CRITICAL: Always log errors
  console.error('[WebRTCConnection] Data channel error event:', {
    type: event.type,
    target: event.target,
    timestamp: Date.now(),
    readyState: this.dc?.readyState,
    bufferedAmount: this.dc?.bufferedAmount,
    error: event
  });
  this.emit('error', event);
};

this.dc.onclose = (event: Event) => {
  // CRITICAL: Always log close events
  const closeEvent = event as any;
  console.error('[WebRTCConnection] Data channel closed:', {
    code: closeEvent.code,
    reason: closeEvent.reason,
    wasClean: closeEvent.wasClean,
    timestamp: Date.now(),
    connectionState: this.connectionState,
    lastHeartbeat: Date.now() - this.lastHeartbeat
  });
  this.handleDisconnection();
};

//  GOOD: Log ALL events during diagnosis
private handleEvent(event: any): void {
  // Comprehensive event logging (can be temporary for diagnosis)
  console.log(`🔔 [VoiceEventHandler] ${event.type}`, {
    type: event.type,
    timestamp: Date.now(),
    itemId: event.item_id,
    deltaLength: event.delta?.length,
    error: event.error
  });

  // Route to specific handler
  this.routeEvent(event);
}
```

### Structured Logging
```typescript
//  GOOD: Consistent log format
import { logger } from '@/services/logger';

// Success operations (INFO level)
logger.info('[Component] Operation completed', {
  operation: 'connect',
  duration: Date.now() - startTime,
  metadata: { userId, restaurantId }
});

// Expected issues (WARN level)
logger.warn('[Component] Retrying operation', {
  operation: 'fetch',
  attempt: 2,
  maxAttempts: 3,
  lastError: error.message
});

// Unexpected issues (ERROR level)
logger.error('[Component] Operation failed', {
  operation: 'process',
  error: error.message,
  stack: error.stack,
  context: { orderId, itemId }
});

// Critical issues (FATAL level - rare)
logger.fatal('[Component] Unrecoverable error', {
  operation: 'initialize',
  error: error.message,
  willExitProcess: true
});
```

### Checklist
- [ ] Errors always logged (not gated by debug flag)
- [ ] Log includes context (IDs, state, timestamps)
- [ ] Log includes structured data (objects, not strings)
- [ ] Consistent log prefix per component `[ComponentName]`
- [ ] Use `console.error` for errors (shows in red in console)
- [ ] Use `console.log` for trace logging (easy to filter by prefix)
- [ ] Use emoji prefixes for easy visual scanning (🔔 for events,  for errors,  for success)

---

## Pattern 7: WebRTC DataChannel Setup Sequence

### The Complete Correct Sequence

```typescript
//  GOOD: Complete WebRTC connection flow
class WebRTCConnection extends EventEmitter {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private sessionActive = false;

  async connect(ephemeralToken: string): Promise<void> {
    try {
      // Step 1: Create peer connection with ICE servers
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Step 2: Add audio track (if using audio)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      });
      stream.getTracks().forEach(track => {
        this.pc!.addTrack(track, stream);
      });

      // Step 3: Set up ICE candidate collection
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          if (this.config.debug) {
            logger.info('[WebRTCConnection] ICE candidate:', event.candidate.candidate);
          }
        }
      };

      // Step 4: Create data channel (BEFORE creating offer)
      this.dc = this.pc.createDataChannel('oai-events', {
        ordered: true
      });

      // Step 5: Attach handlers BEFORE channel opens
      this.setupDataChannel();

      // Step 6: Create offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Step 7: Send offer to OpenAI with ephemeral token
      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${this.config.model}`,
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            'Authorization': `Bearer ${ephemeralToken}`,
            'Content-Type': 'application/sdp'
          }
        }
      );

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.statusText}`);
      }

      // Step 8: Set remote description
      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      };
      await this.pc.setRemoteDescription(answer);

      // Step 9: Mark session as active
      this.sessionActive = true;

      if (this.config.debug) {
        logger.info('[WebRTCConnection] WebRTC connection established');
      }
    } catch (error) {
      logger.error('[WebRTCConnection] Connection failed:', error);
      this.handleDisconnection();
      throw error;
    }
  }

  private setupDataChannel(): void {
    if (!this.dc) return;

    // CRITICAL: onmessage BEFORE channel opens
    this.dc.onmessage = (event: MessageEvent) => {
      this.emit('dataChannelMessage', event.data);
    };

    this.dc.onopen = () => {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Data channel opened');
      }
      this.setConnectionState('connected');
      this.emit('dataChannelReady', this.dc);
    };

    this.dc.onerror = (event: Event) => {
      console.error('[WebRTCConnection] Data channel error:', {
        type: event.type,
        readyState: this.dc?.readyState,
        timestamp: Date.now()
      });
      this.emit('error', event);
    };

    this.dc.onclose = (event: Event) => {
      const closeEvent = event as any;
      console.error('[WebRTCConnection] Data channel closed:', {
        code: closeEvent.code,
        reason: closeEvent.reason,
        wasClean: closeEvent.wasClean
      });
      this.handleDisconnection();
    };
  }

  disconnect(): void {
    this.sessionActive = false;

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
```

### Sequence Checklist
- [ ] Peer connection created first
- [ ] Audio tracks added (if needed)
- [ ] ICE handlers attached
- [ ] Data channel created BEFORE offer
- [ ] Handlers attached BEFORE channel opens
- [ ] Offer created and set as local description
- [ ] Offer sent to server with auth
- [ ] Answer received and set as remote description
- [ ] Session marked active
- [ ] Error handling at each step
- [ ] Cleanup on disconnect

---

## Testing Real-Time Code

### Unit Tests
```typescript
describe('WebRTCVoiceClient', () => {
  test('cleanup clears state timeout', () => {
    const client = new WebRTCVoiceClient(config);
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Simulate entering waiting state
    client['turnState'] = 'waiting_user_final';
    client['turnStateTimeout'] = setTimeout(() => {}, 10000);

    // Disconnect should clear timeout
    client.disconnect();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(client['turnStateTimeout']).toBeNull();
  });

  test('timeout resets state after 10 seconds', async () => {
    jest.useFakeTimers();
    const client = new WebRTCVoiceClient(config);

    // Enter waiting state
    client['turnState'] = 'waiting_user_final';
    client['startStateTimeout']();

    // Fast-forward 10 seconds
    jest.advanceTimersByTime(10000);

    // State should reset
    expect(client['turnState']).toBe('idle');

    jest.useRealTimers();
  });
});
```

### Integration Tests
```typescript
describe('KDS WebSocket Race Conditions', () => {
  test('concurrent initialize calls are guarded', async () => {
    const component = renderKitchenDisplay();

    // Simulate rapid re-renders
    const promises = [
      component.initialize(),
      component.initialize(),
      component.initialize()
    ];

    await Promise.all(promises);

    // Should only connect once
    expect(mockWebSocketService.connect).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Tests
```typescript
// tests/e2e/voice-ordering.spec.ts
test('voice ordering recovers from timeout', async ({ page }) => {
  await page.goto('/kiosk');

  // Start voice recording
  await page.click('[data-testid="voice-order-button"]');

  // Don't speak (simulate no audio)
  await page.waitForTimeout(500);

  // Release button (commit empty audio)
  await page.click('[data-testid="voice-order-button"]');

  // Wait for timeout (10s)
  await page.waitForTimeout(11000);

  // Should be able to retry
  await page.click('[data-testid="voice-order-button"]');
  await expect(page.locator('[data-testid="voice-status"]')).toHaveText('Recording...');
});
```

---

## Summary Checklist

When implementing real-time features, ensure:

### Timers & Intervals
- [ ] All timers stored in references
- [ ] Cleanup methods implemented
- [ ] Integrated with graceful shutdown
- [ ] Tests verify cleanup

### Event Handlers
- [ ] Handlers attached before async operations
- [ ] Defensive fallbacks for missed events
- [ ] Comprehensive event logging
- [ ] Test rapid sequences

### Connections
- [ ] Guard flags prevent races
- [ ] Connection promises allow awaiting
- [ ] Mounted flags prevent updates after unmount
- [ ] Cleanup before reconnect

### State Machines
- [ ] Timeouts for all waiting states
- [ ] Timeout cleanup on success
- [ ] Graceful recovery on timeout
- [ ] Test timeout scenarios

### Shutdown
- [ ] Signal handlers registered
- [ ] All resources cleaned up
- [ ] Graceful shutdown timeout
- [ ] Test with kill signals

### Logging
- [ ] Errors always logged
- [ ] Structured data included
- [ ] Consistent component prefixes
- [ ] Visual scanning aids (emoji, colors)

---

**Last Updated:** 2025-11-19
**Status:** Production-Proven Patterns
**Next Review:** 2026-02-19


## Quick Reference

# Real-Time Quick Reference Card

**Context:** Fast lookup for real-time debugging and implementation patterns.

---

## WebSocket State Values

### Standard WebSocket ReadyState
```javascript
WebSocket.CONNECTING  // 0 - Connection not yet open
WebSocket.OPEN       // 1 - Connection open, ready to communicate
WebSocket.CLOSING    // 2 - Connection closing
WebSocket.CLOSED     // 3 - Connection closed

// Check state
if (ws.readyState === WebSocket.OPEN) {
  ws.send(data);
}
```

### Custom Connection State (Our Pattern)
```typescript
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Don't confuse with WebSocket readyState!
// This is our application-level state tracking
```

### Voice Turn State Machine
```typescript
type TurnState =
  | 'idle'              // Ready to record
  | 'recording'         // Mic active, capturing audio
  | 'committing'        // Sending audio to OpenAI
  | 'waiting_user_final' // Waiting for transcript
  | 'waiting_response';  // Waiting for AI response
```

---

## Common Race Condition Symptoms

### Symptom: "Cannot start recording in state: waiting_user_final"
**Cause:** State machine stuck, timeout didn't fire
**Check:**
```bash
# Look for:
logger.warn('Timeout waiting for transcript, resetting to idle')

# If not found, state machine has no timeout
```
**Fix:** Add 10-second timeout when entering waiting state

---

### Symptom: Infinite loading spinner in KDS
**Cause:** Duplicate WebSocket connection attempts
**Check:**
```javascript
// Add debug counter
if (import.meta.env.DEV) {
  window.__dbgWS = window.__dbgWS || { connectCount: 0 };
  window.__dbgWS.connectCount++;
  console.log(`WebSocket connect #${window.__dbgWS.connectCount}`);
}

// If connectCount > 1, you have a race condition
```
**Fix:** Add `isConnecting` guard flag

---

### Symptom: Voice transcription never appears
**Cause:** DataChannel `onmessage` handler attached too late
**Check:**
```bash
# Look for these events in console:
🔔 session.created
🔔 conversation.item.created

# If missing, events were lost before handler attached
```
**Fix:** Attach `onmessage` handler BEFORE channel opens

---

### Symptom: Memory usage slowly growing
**Cause:** Timer/interval never cleared
**Check:**
```bash
# Node.js
node -e "console.log(process._getActiveHandles().length)"
# Should be low (< 20), high number (> 50) indicates leaks

# Check for intervals specifically
node -e "console.log(process._getActiveHandles().filter(h => h.constructor.name === 'Timeout').length)"
```
**Fix:** Store interval reference, clear in shutdown

---

### Symptom: Process doesn't exit after SIGTERM
**Cause:** Active timers/listeners preventing exit
**Check:**
```bash
# Send SIGTERM
kill -TERM <pid>

# Wait 5 seconds
# If still running:
kill -9 <pid>  # Force kill

# Check logs for which cleanup failed
```
**Fix:** Integrate all cleanups with graceful shutdown

---

## Memory Leak Indicators

### Heap Growth Check
```bash
# Monitor memory usage
watch -n 5 'ps aux | grep node | grep -v grep | awk "{print \$6/1024\" MB\"}"'

# Acceptable: <5 MB growth per hour
# Warning: >10 MB growth per hour
# Critical: >50 MB growth per hour
```

### Active Handles Check
```javascript
// Add to server monitoring
setInterval(() => {
  const handles = process._getActiveHandles();
  console.log('Active handles:', handles.length);

  // Log handle types
  const types = handles.reduce((acc, h) => {
    const type = h.constructor.name;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  console.log('Handle types:', types);
}, 60000); // Every minute
```

### Expected Handle Counts
```
Normal operation:
- Server: 1
- Socket: 5-20 (depends on active connections)
- Timeout: 3-10 (heartbeats, scheduled tasks)
- FSWatcher: 0-5 (file watching in dev mode)

Warning signs:
- Timeout > 20 (potential interval leaks)
- Socket > 50 (potential connection leaks)
- Any number continuously growing
```

---

## Voice Ordering Debug Commands

### Check Voice Connection Status
```javascript
// In browser console
window.__voiceClient?.getStatus()
// Expected output:
{
  connectionState: 'connected',
  turnState: 'idle',
  transcriptMapSize: 0,
  hasDataChannel: true,
  dataChannelReady: true
}
```

### Force Reset Stuck State
```javascript
// Emergency escape hatch
window.__voiceClient?.forceReset()
// Should reset turnState to 'idle'
```

### Check Transcript Map
```javascript
// See if transcripts are being tracked
window.__voiceClient?._eventHandler?._transcriptMap.size
// Should increase during recording, decrease after completion
```

### Enable Debug Logging
```javascript
// Turn on verbose logging
window.__voiceClient?._config.debug = true;
// Now you'll see all events:
// 🔔 [VoiceEventHandler] session.created
// 🔔 [VoiceEventHandler] conversation.item.created
// 🔔 [VoiceEventHandler] transcript.delta
```

---

## WebSocket Debug Commands

### Check WebSocket Connection
```javascript
// In browser console
window.__wsService?.getStatus()
// Expected output:
{
  state: 'connected',
  reconnectAttempts: 0,
  isReconnecting: false,
  lastHeartbeat: 1700000000000
}
```

### Force Reconnect
```javascript
// Close and reconnect
window.__wsService?.disconnect()
window.__wsService?.connect()
```

### Check Subscription Count
```javascript
// See active subscriptions
window.__wsService?.getSubscriptions()
// Should show:
['order.created', 'order.updated', 'order.status.changed']
```

---

## Common Timing Windows

### Critical Timing Measurements
```
WebRTC DataChannel:
- Channel open → first event: 50-100ms
- Event arrival rate: 10-20 events in first 200ms
- Handler attachment delay (if wrong): 100-150ms
- SUCCESS REQUIREMENT: Handler BEFORE channel opens

KDS Initialization:
- Component mount → first render: 50ms
- loadOrders trigger → re-render: 20-50ms
- Connection establishment: 100-300ms
- RACE WINDOW: 150-350ms (if not guarded)

State Machine Timeouts:
- Normal transcript arrival: 500-1500ms
- Timeout threshold: 10,000ms (10 seconds)
- Margin of safety: 8.5+ seconds

Memory Cleanup:
- SIGTERM received → shutdown starts: 0ms
- HTTP server close: 50-100ms
- WebSocket cleanup: 100-3000ms
- Database disconnect: 50-2000ms
- TOTAL SHUTDOWN TIME: <10 seconds (or force exit)
```

---

## State Guard Pattern Checklist

```typescript
//  Minimal viable guard pattern
class MyService {
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    // Guard 1: Already connecting
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Guard 2: Already connected
    if (this.isConnected()) {
      return;
    }

    this.isConnecting = true;
    this.connectionPromise = (async () => {
      try {
        await this.doConnect();
      } finally {
        this.isConnecting = false;
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }
}
```

---

## Timer Cleanup Pattern Checklist

```typescript
//  Minimal viable timer pattern
class MyService {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    // Guard: Prevent duplicate timers
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.doWork();
    }, 60000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// REMEMBER TO CALL stop() IN SHUTDOWN!
```

---

## Event Handler Pattern Checklist

```typescript
//  Minimal viable handler pattern
class MyConnection {
  setupChannel(): void {
    if (!this.channel) return;

    // CRITICAL: Attach BEFORE async operations
    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.channel.onopen = () => {
      // Channel now open, but handler already attached
      this.emit('ready');
    };
  }
}
```

---

## State Timeout Pattern Checklist

```typescript
//  Minimal viable timeout pattern
class MyStateMachine {
  private state: State = 'idle';
  private timeout: NodeJS.Timeout | null = null;

  transitionToWaiting(): void {
    this.state = 'waiting';

    // Start timeout
    this.timeout = setTimeout(() => {
      if (this.state === 'waiting') {
        this.state = 'idle'; // Reset
      }
    }, 10000); // 10 seconds
  }

  transitionToIdle(): void {
    // Clear timeout on success
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.state = 'idle';
  }
}
```

---

## Emergency Debugging Commands

### Check All Real-Time System Health
```javascript
// Paste this in browser console for full diagnosis
function diagnoseRealtime() {
  console.log('=== REAL-TIME SYSTEM DIAGNOSIS ===');

  // Voice ordering
  console.log('Voice Client:', {
    exists: !!window.__voiceClient,
    connectionState: window.__voiceClient?.getStatus().connectionState,
    turnState: window.__voiceClient?.getStatus().turnState,
    transcriptMapSize: window.__voiceClient?._eventHandler?._transcriptMap.size
  });

  // WebSocket
  console.log('WebSocket Service:', {
    exists: !!window.__wsService,
    state: window.__wsService?.getStatus().state,
    reconnectAttempts: window.__wsService?.getStatus().reconnectAttempts,
    subscriptions: window.__wsService?.getSubscriptions()
  });

  // Memory (server-side check via API)
  fetch('/api/v1/health/memory')
    .then(res => res.json())
    .then(data => console.log('Server Memory:', data));

  console.log('=== END DIAGNOSIS ===');
}

diagnoseRealtime();
```

### Force Clean Slate
```javascript
// Nuclear option: reset everything
function resetRealtime() {
  console.warn('RESETTING ALL REAL-TIME SYSTEMS');

  // Disconnect voice
  window.__voiceClient?.disconnect();

  // Disconnect WebSocket
  window.__wsService?.disconnect();

  // Clear local storage (if needed)
  // localStorage.clear();

  // Reload page
  setTimeout(() => location.reload(), 1000);
}
```

---

## Production Monitoring Queries

### Memory Growth Alert
```sql
-- Grafana/Prometheus query
rate(process_resident_memory_bytes[1h]) > 10000000  -- 10 MB/hour
```

### WebSocket Connection Health
```sql
-- Check connection success rate
(websocket_connections_successful / websocket_connections_attempted) < 0.95
```

### Voice Ordering Success Rate
```sql
-- Check voice success rate
(voice_orders_completed / voice_orders_started) < 0.90
```

### State Machine Timeouts
```sql
-- Alert on frequent timeouts
rate(voice_state_timeouts[5m]) > 0.1  -- More than 6/minute
```

---

## Quick Action Decision Tree

```
Voice ordering not working?
├─ Audio transmitting? (check stats)
│  ├─ YES: Check transcript events
│  │  ├─ NO events: Handler timing race
│  │  └─ Events received: State machine issue
│  └─ NO: Check microphone permissions
│
KDS infinite loading?
├─ Check connection count (window.__dbgWS)
│  ├─ Count > 1: Duplicate initialization
│  └─ Count = 1: Check subscriptions
│
Memory growing?
├─ Check active handles (process._getActiveHandles())
│  ├─ Timeouts growing: Interval leak
│  ├─ Sockets growing: Connection leak
│  └─ Stable but high: Check heap snapshot
│
Process won't exit?
├─ Send SIGTERM
│  ├─ Exits within 10s: Normal
│  └─ Doesn't exit: Check logs for stuck cleanup
│
State machine stuck?
├─ Check current state
│  ├─ waiting_user_final: No transcript received
│  ├─ waiting_response: No AI response
│  └─ Other: Logic bug
```

---

## Resource Limits Reference

### Memory Budgets
```
Development:  3GB (NODE_OPTIONS='--max-old-space-size=3072')
Production:   1GB target (hard limit 2GB)
Client Build: 3GB (vite.config.ts)

Per-Process:
- Voice WebSocket: ~50 MB
- KDS WebSocket: ~20 MB
- API Client: ~10 MB
- Per Connection: ~1 MB
```

### Connection Limits
```
WebSocket:    1 per client (+ reconnect attempts)
Voice WebRTC: 1 per client (ephemeral tokens)
HTTP:         100 concurrent (Express default)

Timeouts:
- Connection: 10 seconds
- Heartbeat:  30 seconds
- State:      10 seconds (voice), 15 seconds (AI response)
- Shutdown:   10 seconds total
```

---

**Last Updated:** 2025-11-19
**Print This:** Keep near your desk for fast debugging
**Next Review:** 2026-02-19


