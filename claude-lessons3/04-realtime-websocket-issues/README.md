# realtime websocket issues

## Files in this category:
- **LESSONS.md** - Incidents, patterns, and quick reference
- **PREVENTION.md** - How to prevent these issues

# Real-Time WebSocket Issues - Executive Summary

**Context:** Restaurant OS rebuild-6.0 project
**Timeline:** Oct-Nov 2025 (129 commits, 70+ hours debugging)
**Financial Impact:** $20,000+ engineering hours
**Outcome:** 90-95% memory leak reduction, 40% → 95%+ voice ordering success rate**

***Update (January 2025):** Phase 2 Stabilization eliminated 4 race conditions via FSM, improving expected success rate to 99%+.*

---

## Overview

Real-time features (voice ordering, KDS updates, order synchronization) experienced cascade failures due to subtle timing races and memory leaks that accumulated over time. The issues were particularly insidious because they **appeared to work** in testing but failed under production load and timing conditions.

---

## Key Incidents

### P0.8 Memory Leaks (90-95% Reduction Achieved)

**Root Cause:** Timer/interval cleanup missing in 5 critical components
**Detection:** Slow memory growth (1-20 MB/day) over weeks
**Impact:** Server instability, forced restarts every 3-5 days

**Critical Fixes:**
1. **VoiceWebSocketServer** - 60-second cleanup interval never cleared
2. **AuthRateLimiter** - Hourly cleanup interval + unbounded IP maps
3. **Error Tracker** - 5 window event listeners never removed
4. **TwilioBridge** - 60-second interval leak
5. **RealTimeMenuTools** - 5-minute cart cleanup interval

**Key Commits:**
- `9c7b548d` - Fix memory leaks (Nov 10, 2025)
- Added 16 memory leak prevention tests
- Integrated cleanup methods in graceful shutdown

---

### Voice Transcription Race (50-100ms Gap)

**Root Cause:** DataChannel `onmessage` handler attached AFTER channel opened
**Detection:** Missing `session.created` and `conversation.item.created` events
**Impact:** Voice ordering completely non-functional, 60% failure rate

**The Timing Window:**
```
T+0ms:  DataChannel opens
T+50ms: Initial OpenAI events arrive (session.created)
T+100ms: onmessage handler finally attached  TOO LATE
Result: Events lost, transcript map never populated, cascade failure
```

**Solution:**
- Moved handler attachment from `VoiceEventHandler` to `WebRTCConnection`
- Handler attached BEFORE channel creation (lines 412-418)
- Messages forwarded via event emission to prevent race
- Added defensive fallbacks for transcript map entries

**Key Commit:** `500b820c` (Nov 10, 2025)

---

### KDS Double Initialization (Infinite Loading)

**Root Cause:** Concurrent WebSocket connection attempts without guard flags
**Detection:** Infinite loading in grid mode, duplicate subscriptions
**Impact:** KDS unusable, duplicate order updates, UI thrashing

**Race Condition Flow:**
```
1. Component mounts → starts initialization
2. loadOrders() triggers → causes re-render
3. Re-render triggers second initialization
4. Both complete, but second overwrites first
5. Subscriptions duplicated, state inconsistent
```

**Solution:**
- Added `isConnecting` + `connectionPromise` guards
- Added `isMounted` flag for cleanup safety
- Made `loadOrders` stable with `useCallback([])`
- Added `isReconnecting` flag in WebSocketService
- Called `cleanup()` before `initialize()` on reconnect

**Key Commit:** `e259222f` (Oct 15, 2025)

---

### Voice State Machine Deadlock

**Root Cause:** No timeout in `waiting_user_final` state
**Detection:** Users permanently blocked after failed recording attempt
**Impact:** Voice ordering unusable after first failure

**Deadlock Scenario:**
```
1. User presses button → state: recording
2. Mic permission denied or no audio
3. User releases → state: committing → waiting_user_final
4. OpenAI receives empty audio → sends NO transcript event
5. State stuck forever in waiting_user_final
6. Next button press fails: "Cannot start recording in state: waiting_user_final"
```

**Solution:**
- Added 10-second safety timeout when entering `waiting_user_final`
- Timeout cleared when transcript received (normal case)
- Timeout fires → state resets to idle (error case)
- User can retry voice ordering after timeout

**Key Commit:** `1a5d9a05` (Nov 10, 2025)

---

## Critical Timing Measurements

### Voice Transcription Race Window
- **DataChannel open → first event:** 50-100ms
- **Event arrival rate:** 10-20 events in first 200ms
- **Handler attachment delay:** 100-150ms (if done wrong)
- **Success requirement:** Handler BEFORE channel opens

### KDS Initialization Race
- **Component mount → first render:** 50ms
- **loadOrders trigger → re-render:** 20-50ms
- **Connection establishment:** 100-300ms
- **Race window:** 150-350ms (if not guarded)

### State Machine Timeout
- **Normal transcript arrival:** 500-1500ms
- **Timeout threshold:** 10,000ms (10 seconds)
- **Margin of safety:** 8.5+ seconds
- **Recovery time:** Immediate (next button press)

---

## Memory Leak Indicators

### Before Fixes
```
Heap growth: 1-20 MB/day
Active intervals: 10-15 unmanaged
Event listeners: 5-10 duplicate globals
Clean shutdown: Incomplete (3s force exit)
```

### After Fixes
```
Heap growth: <1 MB/day (90-95% improvement)
Active intervals: 0 unmanaged
Event listeners: 0 duplicates
Clean shutdown: Complete within 5s
```

### Monitoring Commands
```bash
# Check Node.js memory usage
node --expose-gc --max-old-space-size=4096 server/src/server.ts

# Monitor heap growth
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Heap Used:', Math.round(used.heapUsed / 1024 / 1024), 'MB');
}, 30000);

# Check active handles/timers
process._getActiveHandles().length
process._getActiveRequests().length
```

---

## Success Metrics

### Voice Ordering
- **Before:** 40% success rate (60% silent failures)
- **After:** 95%+ success rate
- **Detection time:** Reduced from "never noticed" to <100ms

### Memory Stability
- **Before:** Restart every 3-5 days
- **After:** Stable for weeks
- **Production uptime:** 99.5%+ (from ~85%)

### KDS Reliability
- **Before:** 30% connection failure rate
- **After:** <1% connection failure rate
- **Infinite loading:** Eliminated

---

## Lessons Learned

### 1. Timer Cleanup is Non-Negotiable
**Every** `setInterval` must have:
- Reference stored
- `clearInterval` in cleanup/shutdown
- Test for cleanup execution

### 2. Event Handler Timing is Critical
WebRTC/WebSocket patterns REQUIRE:
- Handlers attached BEFORE async operations
- Defensive fallbacks for missed events
- Comprehensive event logging

### 3. Connection Guards Prevent Races
Any async connection REQUIRES:
- `isConnecting` flag (prevent concurrent attempts)
- `connectionPromise` (allow awaiting existing)
- `isMounted` flag (prevent updates after unmount)

### 4. State Machines Need Timeouts
Any state machine with external dependencies REQUIRES:
- Timeout for EVERY waiting state
- Clear recovery path on timeout
- Manual testing of timeout scenarios

### 5. Real-Time is Harder Than It Looks
Features that "appear to work" can fail due to:
- Race conditions (50-100ms windows)
- Timing assumptions (network variance)
- Resource leaks (accumulate over time)
- Cascade failures (one missed event → total failure)

---

## Quick Reference Links

- [Patterns & Best Practices](./PATTERNS.md)
- [Incident Deep-Dives](./INCIDENTS.md)
- [Prevention Checklist](./PREVENTION.md)
- [Quick Reference Card](./QUICK-REFERENCE.md)
- [AI Agent Guide](./AI-AGENT-GUIDE.md)

---

## Related Resources

- **P0 Memory Leak Analysis:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/investigations/P0_MEMORY_LEAK_ANALYSIS.md`
- **WebSocket Root Cause:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/archive/2025-11/voice-websocket/WEBSOCKET_DISCONNECTION_ROOT_CAUSE_ANALYSIS.md`
- **Voice Incidents:** `/Users/mikeyoung/CODING/rebuild-6.0/claudelessons-v2/knowledge/incidents/CL-VOICE-*.md`
- **Git History:** Commits `9c7b548d`, `500b820c`, `e259222f`, `1a5d9a05`, `62d40b15`

---

**Last Updated:** 2025-11-19
**Status:** Resolved and Documented
**Maintenance:** Review every 3 months for new patterns

