# Voice Module "require is not defined" Error - Root Cause Analysis

**Date**: September 15, 2025
**Severity**: Critical - Blocks voice functionality in browser
**Status**: Identified

## Summary

Static analysis identified direct Node.js `require()` calls in client-side code that will fail in browser environments with "require is not defined" errors.

## Root Cause Classification

**Category A: Direct require(...) calls in client code**

The issue falls squarely into Category A - direct usage of Node.js CommonJS `require()` syntax in client-side code that runs in the browser.

## Specific Issues Found

### 1. WebRTCVoiceClient.ts - Line 779

**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts`
**Line**: 779
**Method**: `configureSession()`

```typescript
// Import agent configurations dynamically
const { getAgentConfigForMode, mergeMenuIntoConfig } = require('../config/voice-agent-modes');
```

**Context**: This code is inside the `configureSession()` method which is called during WebRTC session setup. The require call attempts to dynamically import voice agent configuration functions.

**Impact**:
- Immediate browser error when voice session starts
- Blocks all voice ordering functionality
- Error occurs in production browser environments

### 2. Additional require() Pattern - Line 788

**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts`
**Line**: 788 (commented out but still present)

```typescript
const imported = require('../config/voice-agent-modes');
```

**Status**: This appears to be commented out or in an unused code path, but represents the same pattern.

## Technical Analysis

### Why This Fails
1. **Browser Environment**: Client code runs in browsers which don't have Node.js CommonJS `require()` function
2. **Module System Mismatch**: The project uses ES modules (`import`/`export`) but this code uses CommonJS (`require`)
3. **Runtime Error**: `require is not defined` error thrown when `configureSession()` executes

### Execution Path
1. User initiates voice ordering
2. `WebRTCVoiceClient.connect()` called
3. Session established with OpenAI Realtime API
4. `session.created` event triggers `configureSession()`
5. **FAILURE**: `require('../config/voice-agent-modes')` throws `ReferenceError: require is not defined`

## Target File Analysis

**Voice Agent Modes Configuration**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/config/voice-agent-modes.ts`

The target file is a standard ES module that exports:
- `EMPLOYEE_AGENT_CONFIG` - Configuration for staff voice agent
- `CUSTOMER_AGENT_CONFIG` - Configuration for customer voice agent
- `getAgentConfigForMode()` - Function to get config by mode
- `mergeMenuIntoConfig()` - Function to inject menu context

This file is properly structured as an ES module and should be imported using standard `import` syntax.

## Additional Patterns Checked

✅ **No eval() or new Function() usage** - Searched `client/src/modules/voice` for dynamic code execution
✅ **No other require() calls** - Only the two instances in WebRTCVoiceClient.ts found
✅ **No other Node.js specific APIs** - No process.*, Buffer.*, __dirname, __filename, or module.exports usage

## Risk Assessment

**High Risk**:
- Breaks core voice ordering functionality
- Occurs immediately on voice session start
- Affects all users attempting voice orders
- No fallback or error recovery implemented

## Recommended Fix

Replace the CommonJS `require()` calls with standard ES module `import` statements:

```typescript
// Replace this:
const { getAgentConfigForMode, mergeMenuIntoConfig } = require('../config/voice-agent-modes');

// With this:
import { getAgentConfigForMode, mergeMenuIntoConfig } from '../config/voice-agent-modes';
```

Move the import to the top of the file with other imports, as dynamic imports during runtime are unnecessary since the configuration is always needed.

## Verification Required

After fix implementation:
1. Test voice session initialization in browser
2. Verify no "require is not defined" errors in console
3. Confirm voice agent configurations load correctly
4. Test both employee and customer voice modes

## Notes

- The require() usage appears to be an oversight during development
- The target module is already properly structured as ES module
- No complex dynamic loading requirements - static imports are sufficient
- Fix is straightforward with minimal risk