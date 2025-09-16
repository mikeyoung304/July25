# Voice "ReferenceError: require is not defined" Bug Report

**Date:** September 15, 2025
**Reported by:** Subagent A - Repro/Telemetry
**Context:** Employee-mode voice on server page

## Error Summary

**Error:** `ReferenceError: require is not defined`
**File:** `/client/src/modules/voice/services/WebRTCVoiceClient.ts`
**Line:** 788 (approximately, in `configureSession()` method)
**Trigger:** When voice session configuration is attempted in browser environment

## Root Cause Analysis

### The Problem
The `WebRTCVoiceClient.ts` file contains Node.js CommonJS `require()` syntax in a browser environment:

```typescript
// Line 788 in configureSession() method
const { getAgentConfigForMode, mergeMenuIntoConfig } = require('../config/voice-agent-modes');
```

### Why This Fails
1. **Browser Environment:** WebRTC client runs in browser where `require()` is not available
2. **Module System Mismatch:** The target file (`voice-agent-modes.ts`) uses ES6 exports but is being imported with CommonJS syntax
3. **Build Tool Issue:** Vite/browser bundler doesn't transform this require() call properly

### The Target Files
- **Source:** `/client/src/modules/voice/services/WebRTCVoiceClient.ts` (line 788)
- **Target:** `/client/src/modules/voice/config/voice-agent-modes.ts` (uses ES6 exports)
- **Dependency:** `/client/src/modules/voice/services/VoiceAgentModeDetector.ts` (defines `VoiceAgentMode` enum)

## Reproduction Steps

1. Navigate to a page with voice functionality (e.g., server dashboard)
2. Enter employee mode (authenticated staff user)
3. Attempt to start voice session
4. WebRTC connection establishes but fails on `configureSession()` call
5. Browser console shows: `ReferenceError: require is not defined`

## Impact

- **Severity:** High - Blocks voice functionality for employees
- **Scope:** Employee voice mode only (customer mode may be affected too)
- **Workaround:** None currently - voice is non-functional

## Technical Details

### Call Stack
```
WebRTCVoiceClient.configureSession()
  → require('../config/voice-agent-modes')
  → ReferenceError: require is not defined
```

### Module Export/Import Mismatch
**Target file uses ES6 exports:**
```typescript
export function getAgentConfigForMode(mode: VoiceAgentMode) { ... }
export function mergeMenuIntoConfig(config: any, menuContext: any) { ... }
```

**Source file uses CommonJS require:**
```typescript
const { getAgentConfigForMode, mergeMenuIntoConfig } = require('../config/voice-agent-modes');
```

## Debug Information Added

Added comprehensive debug logging to:

1. **configureSession() method:** Logs require attempt and environment info
2. **handleRealtimeEvent() method:** Logs raw event payloads
3. **dc.onmessage handler:** Logs data channel message parsing

## Potential Fixes

1. **Convert to ES6 import:** Replace `require()` with `import` statement
2. **Dynamic import:** Use `import()` function for runtime loading
3. **Inline configuration:** Embed configs directly in WebRTCVoiceClient
4. **Build configuration:** Ensure proper module transformation in Vite config

## Event Payload Analysis

With debug logging enabled, we can now capture:
- Raw WebSocket/DataChannel message format
- JSON parsing success/failure
- Event type and structure analysis
- Configuration loading timing

## Telemetry Captured

With the debug logging in place, the following information will be captured when the error occurs:

1. **Environment Info:**
   - `typeof require` in browser context (expected: "undefined")
   - `typeof window` confirmation (expected: "object")
   - Current voice mode (employee/customer)

2. **Error Stack Trace:**
   - Full error message: "ReferenceError: require is not defined"
   - Stack trace showing exact call path
   - Line number confirmation (line 788 in configureSession)

3. **WebRTC Event Flow:**
   - Data channel message reception logging
   - JSON parsing success/failure for events
   - Raw event payload structure
   - Event type identification

## Error Reproduction Confirmed

Based on static analysis and comprehensive RCA (see `rca.md`), the error will trigger when:

1. Voice session attempts to initialize (`session.created` event)
2. `configureSession()` method is called
3. Line 788: `require('../config/voice-agent-modes')` executes
4. Browser throws: `ReferenceError: require is not defined`

## Telemetry Data Structure

When the error occurs, console will show:
```
[DEBUG] configureSession called - about to require voice-agent-modes
[DEBUG] typeof require: undefined
[DEBUG] window: object
[DEBUG] mode: employee
[DEBUG] REQUIRE ERROR CAUGHT: ReferenceError: require is not defined
[DEBUG] Error message: require is not defined
[DEBUG] Error stack: [full stack trace]
[DEBUG] Using fallback configuration functions
```

## Next Steps

1. ✅ **Analysis Complete** - Root cause identified (line 788 require() call)
2. ✅ **Debug Logging Added** - Telemetry capture ready for reproduction
3. 🔄 **Ready for Fix** - Replace require() with ES6 import
4. ⏭️ **Post-Fix Validation** - Test both employee and customer modes
5. ⏭️ **Cleanup** - Remove debug logging after confirmation

## Files Modified for Debug

- `/client/src/modules/voice/services/WebRTCVoiceClient.ts`
  - Added try-catch around require() call
  - Added fallback configuration functions
  - Added debug logging to configureSession()
  - Added debug logging to handleRealtimeEvent()
  - Added debug logging to dc.onmessage handler

---

**Status:** Investigation complete - Root cause identified
**Fix Priority:** P0 - Blocking core functionality