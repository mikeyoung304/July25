# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Investigations

---

# AI Services Memory Leak - Affected Files Index

## Files Requiring Changes

### CRITICAL - Fix Immediately

#### 1. `/server/src/ai/index.ts`
**Issues:**
- Global OpenAI client created but not shared (clients duplicated elsewhere)

**Changes Required:**
- Export singleton OpenAI client instance
- Pass to all adapter constructors instead of letting them create their own
- Add cleanup function for graceful shutdown

**Lines:** 31-44 (client initialization)

---

#### 2. `/server/src/ai/adapters/openai/openai-chat.ts`
**Issues:**
- Creates own OpenAI client in constructor (DUPLICATE #1)
- No cleanup mechanism

**Changes Required:**
- Accept OpenAI client via constructor injection
- Remove client creation from constructor

**Lines:** 9-18

---

#### 3. `/server/src/ai/adapters/openai/openai-transcriber.ts`
**Issues:**
- Creates own OpenAI client in constructor (DUPLICATE #2)
- File stream not explicitly destroyed
- No cleanup mechanism

**Changes Required:**
- Accept OpenAI client via constructor injection
- Add `stream.destroy()` in finally block (line 77-83)
- Remove client creation from constructor

**Lines:** 10-20, 49-84

---

#### 4. `/server/src/ai/adapters/openai/openai-tts.ts`
**Issues:**
- Creates own OpenAI client in constructor (DUPLICATE #3)
- No cleanup mechanism

**Changes Required:**
- Accept OpenAI client via constructor injection
- Remove client creation from constructor

**Lines:** 9-18

---

#### 5. `/server/src/ai/adapters/openai/utils.ts`
**Issues:**
- Promise.race setTimeout callbacks never explicitly cleared
- Orphaned timers hold scope references
- Affects withRetry and withTimeout functions

**Changes Required:**
- Replace with AbortController pattern
- Explicitly clear timeouts in finally blocks
- Test with many concurrent operations

**Lines:** 44-76 (withRetry), 81-91 (withTimeout), 96-115 (retry)

---

#### 6. `/server/src/voice/openai-adapter.ts`
**Issues:**
- Event listeners attached via .on() never removed before disconnect
- 4 listeners: 'open', 'message', 'close', 'error'
- Listeners persist after disconnect

**Changes Required:**
- Store listener references during setupWebSocketHandlers()
- Call removeListener() in disconnect() for all 4 listeners
- Store setTimeout handle from connection timeout and clear

**Lines:** 94-107 (listener attachment), 399-412 (disconnect cleanup)

---

#### 7. `/server/src/ai/functions/realtime-menu-tools.ts`
**Issues:**
- Module-level setInterval never cleared (line 676)
- Runs forever even after server shutdown
- In-memory cart storage unbounded during 5-minute window

**Changes Required:**
- Export cleanup function and export interval reference
- Call cleanup from server graceful shutdown
- Add max size limit to cartStorage Map or use LRU cache

**Lines:** 69 (cartStorage), 663-676 (cleanup and interval)

---

#### 8. `/server/src/voice/websocket-server.ts`
**Issues:**
- Module-level setInterval never cleared (line 32)
- Runs forever even after server shutdown
- Event listeners on adapter not removed in stopSession

**Changes Required:**
- Store interval reference
- Export cleanup function
- Call removeAllListeners() or explicit listener removal on adapter

**Lines:** 31-32 (orphaned interval), 284-298 (stopSession)

---

#### 9. `/server/src/voice/twilio-bridge.ts`
**Issues:**
- Module-level setInterval never cleared (line 312)
- Runs forever even after server shutdown
- Disconnect not awaited (async operation may not complete)

**Changes Required:**
- Store interval reference
- Export cleanup function
- Await adapter.disconnect() calls
- Add error handling for disconnect failures

**Lines:** 312-327 (orphaned interval)

---

### MEDIUM - Fix Soon

#### 10. `/server/src/services/ai.service.ts`
**Issues:**
- Duplicates adapter instances from global ai services
- Audio buffers stored in memory without bounds
- Buffer.concat() creates large temporary buffers

**Changes Required:**
- Use ai services from ai/index.ts singleton
- Implement buffer streaming or size limits
- Add cleanup if connection errors

**Lines:** 28-29 (connections map), 63-70 (processAudioStream), 100 (Buffer.concat)

---

#### 11. `/server/src/ai/voice/EnhancedOpenAIAdapter.ts`
**Issues:**
- Inherits all parent class listener leak issues

**Changes Required:**
- No local changes needed after parent class fixes
- Will inherit listener cleanup from parent

**Lines:** N/A (inherits from openai-adapter.ts)

---

#### 12. `/server/src/voice/voice-routes.ts`
**Issues:**
- No direct leaks, but depends on services with leaks
- Should call cleanup functions on graceful shutdown

**Changes Required:**
- Export voiceServer cleanup function
- Ensure called from server shutdown handler

**Lines:** 8-17 (initialization)

---

### Server Startup/Shutdown

#### 13. `/server/src/server.ts`
**Issues:**
- No graceful shutdown handler
- Cleanup functions not called on SIGTERM/SIGINT

**Changes Required:**
- Add process.on('SIGTERM') handler
- Add process.on('SIGINT') handler
- Call cleanup functions from:
  - realtime-menu-tools.stopCleanupInterval()
  - voice/websocket-server cleanup
  - twilio-bridge cleanup
  - ai services cleanup

**Lines:** N/A (add new handlers)

---

## Summary by Impact

### By File

| File | Issues | Severity | Effort |
|------|--------|----------|--------|
| ai/index.ts | Duplicate clients | CRITICAL | 1h |
| openai-chat.ts | Duplicate client | CRITICAL | 1h |
| openai-transcriber.ts | Duplicate client + stream leak | CRITICAL | 1h |
| openai-tts.ts | Duplicate client | CRITICAL | 1h |
| utils.ts | Timer leak (Promise.race) | CRITICAL | 2-3h |
| openai-adapter.ts | Listener leak | CRITICAL | 2h |
| realtime-menu-tools.ts | Orphaned interval + unbounded storage | CRITICAL | 1.5h |
| websocket-server.ts | Orphaned interval + listeners | CRITICAL | 1.5h |
| twilio-bridge.ts | Orphaned interval | CRITICAL | 1h |
| ai.service.ts | Duplicates + buffer leak | MEDIUM | 2h |
| EnhancedOpenAIAdapter.ts | Inherits parent leak | Inherited | 0h |
| voice-routes.ts | No direct issues | LOW | 0.5h |
| server.ts | Missing shutdown | CRITICAL | 1h |

**Total Effort:** 15-18 hours for all fixes

### By Component

- **AI Clients:** 4 files need consolidation
- **Timers:** 3 module intervals need cleanup + 1 Promise.race timer leak
- **WebSocket:** 1 listener leak + inheritance issue
- **Streams:** 1 unclosed stream
- **Storage:** 1 unbounded map
- **Server:** 1 missing shutdown handler

## Testing Checklist

After each fix:

- [ ] No new TypeScript errors
- [ ] Existing tests pass
- [ ] No heap growth in heap profiler
- [ ] Timer count stable in process._getActiveHandles()
- [ ] Listener count per session stable
- [ ] File descriptor count doesn't grow

Integration tests needed:

- [ ] 100+ concurrent voice sessions
- [ ] Rapid connect/disconnect cycles
- [ ] Graceful server shutdown
- [ ] Memory stability over 1 hour
- [ ] No zombie processes on container restart

## Code Review Checklist

For each fix:

- [ ] No new client creations where shouldn't be
- [ ] All setInterval/setTimeout have corresponding clear calls
- [ ] All .on() listeners have corresponding .removeListener() calls
- [ ] All streams explicitly destroyed or piped to response
- [ ] All Promise.race timeouts explicitly cleared
- [ ] Error handlers don't suppress cleanup
- [ ] Graceful shutdown clears all resources
- [ ] No circular references that prevent GC

## Rollout Plan

### Phase 1 (P0 - Critical)
1. Consolidate OpenAI clients (1 hour)
2. Fix Promise.race timers (2-3 hours)
3. Fix WebSocket listeners (2 hours)
4. Fix orphaned intervals (1.5 hours)
5. Add graceful shutdown (1 hour)
6. **Total: ~8 hours**

### Phase 2 (P1 - Medium)
7. Fix file streams (1 hour)
8. Fix unbounded storage (1.5 hours)
9. Fix duplicate adapters (1 hour)
10. Add memory monitoring (2 hours)
11. **Total: ~5.5 hours**

### Phase 3 (P2 - Low)
12. Fix buffer concatenation (1-2 hours)
13. Cache optimization (1 hour)
14. **Total: ~2-3 hours**

**Recommended:** Complete Phase 1 before production deployment
