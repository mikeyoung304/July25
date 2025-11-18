# Voice Ordering Issue - Quick Summary for New Chat
**Date:** 2025-01-18
**Status:** 🔴 BROKEN - Agent has no menu knowledge or function calling

---

## The Problem

Voice ordering agent connects successfully but:
- ❌ Has NO knowledge of restaurant menu
- ❌ Cannot execute function calls (add_to_order, confirm_order, remove_from_order)
- ❌ Chats generically about food instead of accessing menu

**User can talk to agent, agent responds, but cannot place orders.**

---

## What We Already Fixed (But Didn't Solve It)

1. ✅ Added `context="kiosk"` prop to `client/src/components/kiosk/VoiceOrderingMode.tsx:339`
2. ✅ Removed ~2,685 lines of dead code (server-side WebSocket proxy, Twilio integration)
3. ✅ Fixed menu category names (was showing UUIDs, now shows "SANDWICHES")
4. ✅ Added diagnostic logging (console.log instead of logger.warn)
5. ✅ Verified backend IS sending menu_context (2934 chars)
6. ✅ Verified session.update IS being sent to OpenAI

**Result:** Everything appears to work in logs, but agent still has no menu knowledge.

---

## Console Logs Show (From Latest Test)

### ✅ What Works:
- Session connects to OpenAI
- Menu context loaded: "✓ Object"
- Session config built
- Tools added to session config
- session.update sent
- Audio transmission working
- Microphone enabled

### ❌ What's Missing:
- No `session.updated` event from OpenAI (no confirmation config accepted)
- No actual menu content logged (just "Object")
- No session config contents logged (size, tools, instructions)
- No function call executions
- Timeouts waiting for transcript
- State machine gets stuck in "waiting_user_final"

---

## Five Most Likely Root Causes

### 1. 🔴 Session Config Never Reaches OpenAI Properly
- We send session.update but never receive session.updated
- OpenAI may be rejecting config silently
- Config may be malformed or exceed size limits

**Test:** Log session.updated event to confirm OpenAI accepted config

### 2. 🟡 Context Prop Lost in Transit
- We added `context="kiosk"` to VoiceOrderingMode.tsx
- But no log confirms VoiceSessionConfig actually received it
- May default to undefined/server mode somewhere in chain

**Test:** Add logging at each layer to track context prop

### 3. 🟠 Menu Context Empty or Malformed
- Log shows "Menu context loaded: ✓ Object" but no contents
- Backend may be sending empty string or truncated data
- May contain invalid characters breaking JSON

**Test:** Log actual menu_context contents and size

### 4. 🔵 Multiple Component Instances
- VoiceControlWebRTC is lazy loaded
- React re-renders may create multiple instances
- First instance sends config without context prop

**Test:** Add instance tracking IDs

### 5. 🟣 Race Condition in Config Sending
- session.update sent too early (before OpenAI ready)
- Config queued but never processed
- OpenAI uses default config instead

**Test:** Add delay between session.created and session.update

---

## Architecture ("AI Things Built on AI Things")

**Four layers that may be conflicting:**

1. **VoiceOrderingMode** (UI wrapper) → Passes props
2. **VoiceControlWebRTC** (component) → Lazy loaded, may create multiple instances
3. **useWebRTCVoice** (hook) → May not pass context through
4. **WebRTCVoiceClient + Services** (core logic) → Should receive context

**Risk:** Context prop added to layer 1, but doesn't reach layer 4.

---

## Critical Files to Investigate

### Client-Side:
1. `client/src/components/kiosk/VoiceOrderingMode.tsx` - Where context="kiosk" is set
2. `client/src/modules/voice/components/VoiceControlWebRTC.tsx` - Receives context prop
3. `client/src/modules/voice/hooks/useWebRTCVoice.ts` - Hook wrapper
4. `client/src/modules/voice/services/VoiceSessionConfig.ts` - Builds session config with menu
5. `client/src/modules/voice/services/VoiceEventHandler.ts` - Handles OpenAI events

### Server-Side:
6. `server/src/routes/realtime.routes.ts` - Sends menu_context in ephemeral token response

---

## Immediate Next Steps

### Add Logging to Track Context Prop:
```typescript
// VoiceOrderingMode.tsx
console.log('1️⃣ Rendering with context="kiosk"');

// VoiceControlWebRTC.tsx
console.log('2️⃣ Received context:', props.context);

// useWebRTCVoice.ts
console.log('3️⃣ Creating client with context:', config.context);

// VoiceSessionConfig.ts
console.log('4️⃣ Constructor context:', config.context);
console.log('5️⃣ Building config, using kiosk instructions:', this.context === 'kiosk');
```

### Log session.update Contents:
```typescript
// VoiceSessionConfig.ts buildSessionConfig()
const configJson = JSON.stringify(sessionConfig);
console.log('📤 SESSION CONFIG:', {
  sizeKB: (configJson.length / 1024).toFixed(2),
  toolsCount: sessionConfig.tools?.length,
  toolNames: sessionConfig.tools?.map(t => t.name),
  hasMenuInInstructions: sessionConfig.instructions.includes('📋 FULL MENU'),
  menuContextLength: this.menuContext.length
});
```

### Log OpenAI Response:
```typescript
// VoiceEventHandler.ts
case 'session.updated':
  console.log('✅ OPENAI ACCEPTED:', event.session);
  break;
case 'error':
  console.error('🚨 OPENAI ERROR:', event.error);
  break;
```

---

## Key Questions to Answer

1. **Does VoiceSessionConfig receive context="kiosk"?**
2. **What instructions are in the session config being sent?**
3. **Does OpenAI send back session.updated event?**
4. **What's actually IN menu_context from backend?**
5. **Are there multiple VoiceControlWebRTC instances?**

---

## Related Documentation

- Full debugging session: `docs/archive/2025-01/VOICE_DEBUGGING_SESSION_2025-01-18.md`
- Architecture guide: `docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md`
- Salvaged code: `docs/archive/2025-01/VOICE_CODE_SALVAGE.md`
- Incident lesson: `claudelessons-v2/knowledge/incidents/CL-VOICE-001-context-prop-missing.md`

---

## For New AI Agent

**Start here:**
1. Read this summary
2. Add comprehensive logging as outlined above
3. Test voice ordering and capture full console output
4. Analyze what's actually being sent vs. received
5. Focus on tracking context prop through all 4 layers
6. Verify OpenAI accepts the session config (session.updated event)

**Don't repeat what we already tried:**
- ❌ Don't just add context prop again (already done)
- ❌ Don't remove more dead code (already cleaned)
- ❌ Don't fix category names again (already fixed)
- ✅ DO add logging to verify what's actually happening
- ✅ DO check if context reaches VoiceSessionConfig
- ✅ DO verify OpenAI accepts the config
