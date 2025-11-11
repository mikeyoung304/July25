# WebSocket Memory Leak Investigation - Executive Summary

## Overview
Comprehensive analysis of WebSocket implementation identified **3 critical issues** and **2 moderate issues** requiring immediate remediation. The codebase demonstrates strong overall practices with extensive cleanup mechanisms, but specific error handling paths lack proper resource cleanup.

---

## Critical Findings

### 1. Voice Session Error Handler Doesn't Clean Up (HIGHEST PRIORITY)
**File:** `/server/src/voice/websocket-server.ts` (Lines 308-321)
**Severity:** HIGH - Active Memory Leak

**Problem:** 
- `handleError()` method logs the error but never calls `stopSession()`
- Sessions accumulate in the `sessions` Map indefinitely
- Heartbeat intervals continue running for errored sessions
- OpenAI adapter connections persist without cleanup

**Impact:**
- Every WebSocket error creates a permanent memory leak
- Session data, intervals, and adapter connections remain in memory
- Affects voice ordering features directly

**Fix Required (1 line):**
```typescript
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
    this.stopSession(session.id);  // ADD THIS LINE
  }
}
```

---

### 2. Global Cleanup Timer Cannot Be Stopped
**File:** `/server/src/voice/websocket-server.ts` (Line 32)
**Severity:** MEDIUM - Improper Shutdown

**Problem:**
```typescript
constructor() {
  // Cleanup inactive sessions every minute
  setInterval(() => this.cleanupInactiveSessions(), 60000);
  // No reference stored - cannot be cleared on shutdown
}
```

**Impact:**
- Server cannot cleanly shut down the cleanup interval
- If server restarts without proper signal handling, interval may leak
- Timer continues even after all sessions removed

**Fix Required (3 lines):**
```typescript
private globalCleanupInterval?: NodeJS.Timeout;

constructor() {
  this.globalCleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 60000);
}

// Add public cleanup method
public shutdown() {
  if (this.globalCleanupInterval) {
    clearInterval(this.globalCleanupInterval);
  }
}
```

---

### 3. OpenAI Adapter Event Listeners Not Removed
**File:** `/server/src/voice/openai-adapter.ts` (Lines 399-412)
**Severity:** MEDIUM - Circular References

**Problem:**
```typescript
async disconnect(): Promise<void> {
  this.isConnected = false;
  
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }
  
  if (this.ws) {
    this.ws.close(1000, 'Normal closure');
    this.ws = undefined;
  }
  // MISSING: removeAllListeners() call
}
```

**Impact:**
- EventEmitter listeners remain registered after disconnect
- Creates circular references preventing garbage collection
- If OpenAI adapter recreated multiple times, listeners accumulate

**Fix Required (1 line):**
```typescript
async disconnect(): Promise<void> {
  this.isConnected = false;
  
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }
  
  if (this.ws) {
    this.ws.close(1000, 'Normal closure');
    this.ws = undefined;
  }
  
  this.removeAllListeners();  // ADD THIS LINE
}
```

---

## Moderate Issues

### 4. Linear WebSocket Session Lookup (Performance)
**File:** `/server/src/voice/websocket-server.ts` (Lines 361-369)
**Severity:** LOW - Performance Issue

**Current:** O(n) lookup with forEach loop
**Impact:** Inefficient for many concurrent sessions

**Recommended:** Maintain reverse Map<WebSocket, sessionId> for O(1) lookup

---

### 5. Missing One-Time Event Listener Option
**File:** `/shared/utils/websocket-pool.browser.ts` (Lines 236-250)
**Severity:** LOW - Code Quality

**Current:** Manual addEventListener without `{ once: true }`
**Better:** Use `{ once: true }` for connection timeout handlers

---

## Well-Implemented Areas

These components have excellent cleanup patterns and require no changes:

| Component | File | Quality | Notes |
|-----------|------|---------|-------|
| Client WebSocket | `WebSocketService.ts` | EXCELLENT | Comprehensive cleanup(), proper timer management |
| Order Updates | `orderUpdates.ts` | EXCELLENT | Proper subscription cleanup with reinitialization |
| WebRTC Connection | `WebRTCConnection.ts` | EXCELLENT | Multi-stage cleanup (handlers, streams, DOM elements) |
| Server WebSocket | `utils/websocket.ts` | EXCELLENT | Proper cleanup export function available |
| WebSocket Pool | `websocket-pool.browser.ts` | EXCELLENT | Proper Map/Set cleanup in destructor |
| EventEmitter | `EventEmitter.ts` | EXCELLENT | Memory leak warnings, proper listener management |

---

## Implementation Priority

### Phase 1: IMMEDIATE (Next Release)
1. Fix Voice Session Error Handler (Issue #1) - 1 line change
2. Add OpenAI Disconnect Cleanup (Issue #3) - 1 line change

**Effort:** < 5 minutes
**Impact:** Eliminates active memory leaks

### Phase 2: SOON (Next Sprint)
3. Store Global Cleanup Timer Reference (Issue #2) - 3 line change

**Effort:** 10 minutes
**Impact:** Proper shutdown handling

### Phase 3: OPTIONAL (Future Refactor)
4. Optimize WebSocket Lookup (Issue #4)
5. Use One-Time Event Listeners (Issue #5)

**Effort:** 30 minutes
**Impact:** Performance optimization, code cleanliness

---

## Testing Recommendations

After implementing fixes, verify with:

1. **Memory Profiling**
   - Run voice ordering tests
   - Capture heap snapshots before/after
   - Verify no retained objects in Sessions Map

2. **Error Injection**
   - Force WebSocket errors mid-session
   - Verify sessions cleanup properly
   - Monitor for interval leaks

3. **Long-Running Tests**
   - Create 100+ concurrent sessions
   - Force errors periodically
   - Monitor memory growth
   - Verify cleanup intervals work

4. **Graceful Shutdown**
   - Server restart with active sessions
   - Verify all intervals cleared
   - Check no dangling connections

---

## Code Locations Reference

### Files Requiring Changes
- `/server/src/voice/websocket-server.ts` - Issues #1, #2
- `/server/src/voice/openai-adapter.ts` - Issue #3

### Supporting Files (Reference)
- `/server/src/utils/websocket.ts` - Server heartbeat (GOOD)
- `/client/src/services/websocket/WebSocketService.ts` - Client heartbeat (GOOD)
- `/client/src/services/websocket/orderUpdates.ts` - Subscriptions (GOOD)
- `/client/src/modules/voice/services/WebRTCConnection.ts` - Cleanup (GOOD)
- `/shared/utils/cleanup-manager.ts` - Global cleanup (GOOD)

---

## Full Detailed Report

See `WEBSOCKET_MEMORY_LEAK_REPORT.md` for:
- Complete line-by-line analysis
- All heartbeat/interval management details
- Circular reference patterns
- Memory monitoring implementation
- 50+ code snippets with context

---

## Conclusion

The three critical fixes (totaling ~5 minutes of coding) will eliminate active memory leaks in voice WebSocket connections. The codebase demonstrates sophisticated understanding of cleanup patterns, with these issues appearing to be oversight rather than systemic problems.

**Recommended Action:** Implement Issue #1 and #3 immediately before next production deployment. Issue #2 can follow in next sprint.
