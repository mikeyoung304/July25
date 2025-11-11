# AI Services Memory Leak Investigation - Executive Summary

## Overview

A comprehensive analysis of AI service implementations in the rebuild-6.0 codebase has identified **10 distinct memory leak vectors**, with **4 critical severity issues** that require immediate attention.

## Critical Issues (Must Fix)

### 1. Multiple OpenAI Client Instances (CRITICAL)
- **Problem:** OpenAI clients created in 3+ locations (index.ts, openai-chat.ts, openai-transcriber.ts, openai-tts.ts)
- **Impact:** Multiple HTTP connection pools never cleaned up
- **Evidence:** Each adapter constructor creates `new OpenAI({ apiKey })`
- **Files:**
  - `/server/src/ai/index.ts` - Global client (kept but not shared)
  - `/server/src/ai/adapters/openai/openai-chat.ts` - Creates own client
  - `/server/src/ai/adapters/openai/openai-transcriber.ts` - Creates own client
  - `/server/src/ai/adapters/openai/openai-tts.ts` - Creates own client
- **Fix Effort:** 2-3 hours
- **Priority:** P0 - Address first

### 2. Orphaned Module-Level Intervals (CRITICAL)
- **Problem:** setInterval callbacks created at module load time, never cleared
- **Impact:** Timers continue running after server shutdown/restart, consuming memory
- **Evidence:**
  ```typescript
  // realtime-menu-tools.ts:676
  setInterval(cleanupExpiredCarts, 5 * 60 * 1000);
  
  // voice/websocket-server.ts:32
  setInterval(() => this.cleanupInactiveSessions(), 60000);
  
  // voice/twilio-bridge.ts:312
  setInterval(() => { /* stale session cleanup */ }, 60000);
  ```
- **Files:**
  - `/server/src/ai/functions/realtime-menu-tools.ts`
  - `/server/src/voice/websocket-server.ts`
  - `/server/src/voice/twilio-bridge.ts`
- **Fix Effort:** 1-2 hours
- **Priority:** P0 - Prevents graceful shutdown

### 3. WebSocket Event Listener Leaks (CRITICAL)
- **Problem:** Event listeners attached via `.on()` never removed before disconnect
- **Impact:** Listeners persist per voice session, accumulate with concurrent users
- **Evidence:**
  ```typescript
  // voice/openai-adapter.ts:94-107
  this.ws.on('open', () => { resolve(); });
  this.ws.on('message', (data) => { this.handleOpenAIMessage(data); });
  this.ws.on('close', (code, reason) => { this.handleDisconnection(code, reason); });
  this.ws.on('error', (error) => { ... });
  
  // But in disconnect():
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close(1000);
      this.ws = undefined; // Listeners not removed!
    }
  }
  ```
- **Files:**
  - `/server/src/voice/openai-adapter.ts` (lines 94-107, 399-412)
  - `/server/src/ai/voice/EnhancedOpenAIAdapter.ts` (inherits issue)
- **Fix Effort:** 2-3 hours
- **Priority:** P0 - High per-session memory impact

### 4. Uncaught Timers in Promise.race (CRITICAL)
- **Problem:** setTimeout callbacks created in Promise.race never explicitly cleared
- **Impact:** Scope references held by timeout callbacks, blocks garbage collection
- **Evidence:**
  ```typescript
  // ai/adapters/openai/utils.ts:60-64
  const result = await Promise.race([
    operation(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
  // When operation() completes first, setTimeout still pending!
  ```
- **Files:**
  - `/server/src/ai/adapters/openai/utils.ts` (lines 60-64, 85-90)
- **Fix Effort:** 2-3 hours
- **Priority:** P0 - Affects all API calls with retries

## Medium Priority Issues

### 5. Unclosed File Streams
- **Problem:** createReadStream() not explicitly destroyed
- **Files:** `/server/src/ai/adapters/openai/openai-transcriber.ts` (line 51)
- **Fix Effort:** 1 hour
- **Priority:** P1

### 6. Unbounded In-Memory Cart Storage
- **Problem:** Map with no size limit, grows until 5-minute cleanup
- **Files:** `/server/src/ai/functions/realtime-menu-tools.ts` (line 69)
- **Fix Effort:** 1-2 hours
- **Priority:** P1

### 7. Duplicate Adapter Instances
- **Problem:** AIService creates separate instances from global ai services
- **Files:** `/server/src/services/ai.service.ts`
- **Fix Effort:** 1 hour
- **Priority:** P1

### 8. Large Buffer Concatenation
- **Problem:** Buffer.concat() creates temporary buffers under load
- **Files:** `/server/src/services/ai.service.ts` (line 100)
- **Fix Effort:** 1-2 hours
- **Priority:** P2

## All Identified Files

### AI Service Core
1. `/server/src/ai/index.ts` - Global service container
2. `/server/src/ai/adapters/openai/openai-chat.ts` - Chat adapter (creates own client)
3. `/server/src/ai/adapters/openai/openai-transcriber.ts` - Transcriber (creates own client)
4. `/server/src/ai/adapters/openai/openai-tts.ts` - TTS (creates own client)
5. `/server/src/ai/adapters/openai/openai-order-nlp.ts` - Order NLP
6. `/server/src/ai/adapters/openai/utils.ts` - Retry/timeout utilities

### Voice Services
7. `/server/src/voice/openai-adapter.ts` - OpenAI WebSocket adapter
8. `/server/src/ai/voice/EnhancedOpenAIAdapter.ts` - Enhanced adapter with Twilio
9. `/server/src/voice/websocket-server.ts` - Voice session server
10. `/server/src/voice/twilio-bridge.ts` - Twilio integration
11. `/server/src/voice/voice-routes.ts` - Voice endpoints

### Other Services
12. `/server/src/services/ai.service.ts` - High-level AI service
13. `/server/src/ai/functions/realtime-menu-tools.ts` - Menu tools & cart storage

## Quick Fix Checklist

- [ ] Consolidate to single OpenAI client shared from ai/index.ts
- [ ] Store all module intervals with proper cleanup on SIGTERM
- [ ] Add removeListener() calls in OpenAIAdapter.disconnect()
- [ ] Replace Promise.race with AbortController for timeout handling
- [ ] Explicitly call stream.destroy() on file uploads
- [ ] Add max size check to cartStorage Map
- [ ] Use ai services from singleton in AIService
- [ ] Stream audio buffers instead of concatenating
- [ ] Add graceful shutdown handler to server.ts
- [ ] Add memory monitoring and alerts

## Testing Recommendations

1. Memory leak test: 100+ concurrent voice sessions with connects/disconnects
2. Heap profiling before/after each fix
3. Timer count monitoring (process._getActiveHandles())
4. Event listener count per session
5. File descriptor count under load

## Timeline Estimate

| Priority | Items | Effort | Timeline |
|----------|-------|--------|----------|
| P0 (Critical) | 4 items | 7-11 hours | Week 1 |
| P1 (Medium) | 4 items | 4-6 hours | Week 1-2 |
| P2 (Low) | 2 items | 2-3 hours | Week 2 |

## Business Impact

- **Without Fixes:** Memory leaks compound with concurrent voice sessions, especially in containerized environments with frequent restarts
- **Risk Level:** HIGH - Production systems will degrade over time
- **With Fixes:** Stable memory profile, clean shutdown, better scalability

## Report Location

Full detailed report: `/Users/mikeyoung/CODING/rebuild-6.0/AI_SERVICES_MEMORY_LEAK_REPORT.md`
