# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Investigations

---

# AI Services Memory Leak Investigation - Complete Report

## Quick Start

This investigation identified **10 distinct memory leak vectors** across **13 files** in the AI services layer.

**TL;DR:** 4 CRITICAL issues need immediate attention before production deployment.

## Documents in This Investigation

### Start Here
- **[INVESTIGATION_COMPLETE.md](./INVESTIGATION_COMPLETE.md)** - Overview and next steps

### For Management/Decision Makers
- **[AI_SERVICES_MEMORY_LEAK_SUMMARY.md](ai-services/AI_SERVICES_MEMORY_LEAK_SUMMARY.md)** - Executive summary, risks, timeline

### For Engineers (Fixing Issues)
- **[AFFECTED_FILES_INDEX.md](./AFFECTED_FILES_INDEX.md)** - File-by-file breakdown with exact line numbers
- **[AI_SERVICES_MEMORY_LEAK_REPORT.md](ai-services/AI_SERVICES_MEMORY_LEAK_REPORT.md)** - Complete technical deep dive with code examples

## The 4 Critical Issues

### 1. Multiple OpenAI Client Instances
- **Problem:** 3+ clients created in different files, never destroyed
- **Files:** ai/index.ts, openai-chat.ts, openai-transcriber.ts, openai-tts.ts
- **Fix Time:** 1 hour
- **Impact:** 3+ HTTP connection pools never cleaned up

### 2. Orphaned Module-Level Intervals
- **Problem:** setInterval callbacks never cleared on shutdown
- **Files:** realtime-menu-tools.ts, websocket-server.ts, twilio-bridge.ts
- **Fix Time:** 1.5 hours
- **Impact:** Timers run forever even after server stops

### 3. WebSocket Event Listener Leaks
- **Problem:** Listeners never removed from WebSocket before disconnect
- **Files:** openai-adapter.ts, EnhancedOpenAIAdapter.ts
- **Fix Time:** 2 hours
- **Impact:** Per-session listener accumulation

### 4. Promise.race Timeout Leaks
- **Problem:** setTimeout callbacks never explicitly cleared
- **Files:** utils.ts (withRetry, withTimeout functions)
- **Fix Time:** 2-3 hours
- **Impact:** Scope references held, blocks garbage collection

## Memory Leak Impact by Severity

| Severity | Count | Total Impact |
|----------|-------|--------------|
| CRITICAL | 4 | 3+ clients + 3 orphaned intervals + listener accumulation + timer scope leaks |
| MEDIUM | 4 | Unclosed streams + unbounded storage + duplicates + buffer pressure |
| LOW | 2 | Cache overhead + silent errors |

## Implementation Timeline

```
Phase 1 (P0 - Critical): 8 hours → Week 1
├─ Consolidate OpenAI clients (1h)
├─ Fix Promise.race timers (2-3h)
├─ Fix WebSocket listeners (2h)
├─ Fix orphaned intervals (1.5h)
└─ Add graceful shutdown (1h)

Phase 2 (P1 - Medium): 5.5 hours → Week 1-2
├─ Fix file streams (1h)
├─ Bounded storage (1.5h)
├─ Duplicate adapters (1h)
└─ Memory monitoring (2h)

Phase 3 (P2 - Low): 2-3 hours → Week 2
├─ Buffer optimization (1-2h)
└─ Cache optimization (1h)

TOTAL: 15-18 hours
```

## Risk Assessment

### Current State (No Fixes)
- ❌ 3+ HTTP clients never cleaned up
- ❌ 3 timers run forever on each restart
- ❌ Listeners accumulate per voice session
- ❌ Memory growth unbounded under load
- ❌ File descriptors exhaust under high concurrency
- **Risk Level: HIGH** - Not production-ready

### After Phase 1 (P0 Fixes)
- ✓ Single consolidated OpenAI client
- ✓ Clean graceful shutdown
- ✓ No listener accumulation
- ✓ Explicit timer cleanup
- ⚠️ Still has medium issues
- **Risk Level: MEDIUM** - Safe for production

### After All Phases
- ✓ All resource leaks fixed
- ✓ Bounded memory usage
- ✓ Memory monitoring in place
- ✓ Production-ready
- **Risk Level: LOW** - Fully optimized

## How to Use These Reports

### If you're the Project Manager:
1. Read [AI_SERVICES_MEMORY_LEAK_SUMMARY.md](ai-services/AI_SERVICES_MEMORY_LEAK_SUMMARY.md)
2. Check the timeline and effort estimates
3. Schedule 15-18 hours for engineering team
4. Require Phase 1 completion before production

### If you're the Engineer:
1. Start with [AFFECTED_FILES_INDEX.md](./AFFECTED_FILES_INDEX.md)
2. Pick one critical file to fix
3. Check the full report for code examples
4. Reference the fixes section for solutions
5. Run the testing checklist after each fix

### If you're the QA/Tester:
1. Read the testing checklist in AFFECTED_FILES_INDEX.md
2. Run heap profiler before/after fixes
3. Test with 100+ concurrent sessions
4. Monitor timer count stability
5. Verify graceful shutdown works

## Key Metrics to Monitor

After implementing fixes, verify:

```javascript
// 1. Stable heap usage
const heapUsed = process.memoryUsage().heapUsed;
// Should NOT grow over 1-hour test

// 2. Stable timer count
const activeHandles = process._getActiveHandles().length;
// Should remain constant during session cycling

// 3. Stable listener count
const listenerCount = adapter.listeners('message').length;
// Should be 0 after disconnect

// 4. Graceful shutdown
process.on('SIGTERM', async () => {
  // Should clear all intervals, listeners, connections
  // Should complete in < 5 seconds
});
```

## Testing Your Fixes

```bash
# 1. Memory leak test
node --expose-gc tests/memory-leak.test.js

# 2. Listener leak test
node tests/listener-leak.test.js

# 3. Integration test
node tests/integration-100-sessions.test.js

# 4. Graceful shutdown test
npm run start & sleep 10 && kill -TERM $!
```

## Quick Reference: All Issues

| ID | Issue | Severity | Files | Fix Time |
|----|-------|----------|-------|----------|
| 1 | Duplicate OpenAI clients | CRITICAL | 4 files | 1h |
| 2 | Orphaned intervals | CRITICAL | 3 files | 1.5h |
| 3 | WebSocket listeners | CRITICAL | 2 files | 2h |
| 4 | Promise.race timers | CRITICAL | 1 file | 2-3h |
| 5 | Unclosed streams | MEDIUM | 1 file | 1h |
| 6 | Unbounded storage | MEDIUM | 1 file | 1.5h |
| 7 | Duplicate adapters | MEDIUM | 1 file | 1h |
| 8 | Buffer concat | MEDIUM | 1 file | 1-2h |
| 9 | Cache overhead | LOW | 1 file | 1h |
| 10 | Silent errors | LOW | 2 files | 1h |

## Next Steps

1. **Stakeholder Review** (1 hour)
   - Discuss with engineering and product teams
   - Confirm priority and timeline

2. **Planning & Assignment** (30 minutes)
   - Assign engineers to Phase 1
   - Set up code review process

3. **Implementation** (8 hours)
   - Fix P0 critical issues
   - Run testing checklist for each

4. **Testing & Validation** (4 hours)
   - Integration tests
   - Memory profiling
   - Graceful shutdown verification

5. **Deployment** (1 hour)
   - Deploy to staging
   - Monitor for 24 hours
   - Deploy to production

**Total: ~16 hours including testing & review**

## Questions?

Refer to the detailed reports:
- Technical details: AI_SERVICES_MEMORY_LEAK_REPORT.md
- File-specific guidance: AFFECTED_FILES_INDEX.md
- Executive overview: AI_SERVICES_MEMORY_LEAK_SUMMARY.md

---

**Investigation Date:** November 10, 2025
**Scope:** OpenAI, Voice, Realtime services
**Status:** COMPLETE - Ready for implementation
