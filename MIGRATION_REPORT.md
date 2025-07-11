# MIGRATION REPORT: Port 3002 Violations

## Executive Summary
Found **CRITICAL CODE VIOLATIONS** that will cause runtime failures. The frontend is trying to connect to non-existent port 3002.

## 🔴 CRITICAL: Active Code Violations (Fix Immediately)

### Client Code - WILL CAUSE RUNTIME FAILURES
1. **client/src/modules/voice/components/VoiceControl.tsx** (Line 37)
   - ❌ `const ws = new WebSocket('ws://localhost:3002/voice-stream');`
   - ✅ Should be: `ws://localhost:3001/voice-stream`
   - **Impact**: Voice features completely broken

2. **client/src/pages/KioskPage.tsx** (Line 77)
   - ❌ `fetch('http://localhost:3002/chat'`
   - ✅ Should be: `http://localhost:3001/api/v1/ai/chat`
   - **Impact**: Kiosk chat functionality broken

3. **client/src/pages/DriveThruPage.tsx** (Line 96)
   - ❌ `fetch('http://localhost:3002/chat'`
   - ✅ Should be: `http://localhost:3001/api/v1/ai/chat`
   - **Impact**: Drive-thru ordering broken

### Environment Configuration - CAUSES CONFUSION
4. **Root .env file**
   - ❌ `PORT=3002`
   - ✅ Should be: `PORT=3001`
   - **Impact**: Confusing port configuration

5. **server/.env**
   - ❌ `AI_GATEWAY_URL=http://localhost:3002`
   - ✅ Should be: REMOVE THIS LINE (no separate gateway)
   - **Impact**: Suggests separate service exists

6. **server/.env.example**
   - ❌ `AI_GATEWAY_URL=http://localhost:3002`
   - ✅ Should be: REMOVE THIS LINE
   - **Impact**: New developers will configure wrong

### Server Code - CONFIGURATION ISSUES
7. **server/src/config/environment.ts** (Line 13)
   - ❌ `url: process.env.AI_GATEWAY_URL || 'http://localhost:3002'`
   - ✅ Should be: REMOVE aiGateway config entirely
   - **Impact**: Server thinks AI Gateway is separate

8. **server/scripts/test-voice-flow.ts** (Line 32)
   - ❌ `{ name: 'AI Gateway', url: 'http://localhost:3002/health' }`
   - ✅ Should be: `{ name: 'AI Service', url: 'http://localhost:3001/api/v1/ai/health' }`
   - **Impact**: Tests will fail

## 🟡 MEDIUM: Legacy Files (Should be removed)

9. **server/src/ai/ai-gateway-websocket.js**
   - Contains `PORT = process.env.PORT || 3002`
   - **Action**: DELETE this file (functionality moved to unified backend)

10. **_archive_old_scripts/** (Multiple files)
    - Contains old startup scripts referencing 3002
    - **Action**: These are archived, but consider moving to separate archive repo

## 🟢 LOW: Documentation (Already in archive)

11. **docs/archive/pre-backend/** (Multiple files)
    - Old documentation referencing port 3002
    - **Action**: Already archived, no action needed

## Fix Priority Order

1. **IMMEDIATE** (Breaks runtime):
   - VoiceControl.tsx WebSocket URL
   - KioskPage.tsx API endpoint
   - DriveThruPage.tsx API endpoint

2. **HIGH** (Causes confusion):
   - Root .env PORT setting
   - server/.env AI_GATEWAY_URL
   - server/.env.example
   - server/src/config/environment.ts

3. **MEDIUM** (Cleanup):
   - Delete server/src/ai/ai-gateway-websocket.js
   - Update test-voice-flow.ts

## Verification Commands

After fixes, run these to verify:
```bash
# Should return no results
grep -r "3002" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=_archive_old_scripts --exclude-dir=docs/archive

# Should only show port 3001
grep -r "WebSocket(" client/src | grep -v "3001"
```