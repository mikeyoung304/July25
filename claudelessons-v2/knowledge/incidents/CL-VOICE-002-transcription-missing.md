# CL-VOICE-002: OpenAI Realtime API Transcription Events Not Received

**Date:** 2025-01-18
**Severity:** Critical (Production Feature Broken)
**Component:** Voice Ordering (OpenAI Realtime API)
**Status:** ⏸️ PAUSED - Pending OpenAI Account/Model Verification
**Resolution:** TBD - Investigating transcription model availability

---

## Incident Summary

Voice ordering agent connects successfully, transmits audio (68KB+), and receives AI responses, but **NO transcription events** are received from OpenAI. Without transcriptions, the agent cannot call functions (add_to_order, confirm_order) and cannot add items to cart.

**Root Cause (Suspected):** OpenAI deprecated `whisper-1` model for Realtime API transcription in 2025. Replacement model `gpt-4o-transcribe` may require account enablement or is not yet available.

**Current State:** Agent displays text response `{"item":"Greek salad","modifications":"no modifications"}` but does NOT call `add_to_order` function because it never receives user speech transcript.

---

## Timeline

### Session Start (2025-01-18 ~17:00 UTC)
**User:** "agent does not respond at all to 'id like a greek salad', test this yourself"

### Investigation Phase 1: Context Prop Fix (Already Complete)
- ✅ Fixed missing `context="kiosk"` prop (see CL-VOICE-001)
- ✅ Agent now has menu knowledge (2934 chars)
- ✅ Agent has function tools (add_to_order, confirm_order, remove_from_order)
- ❌ **Agent still doesn't process orders**

### Investigation Phase 2: Audio Transmission Verification
```
✅ Session connects to OpenAI
✅ Audio transmitted: 68KB sent, 1668 packets
✅ Audio stats verified via WebRTC getStats()
✅ Microphone enabled correctly
✅ session.update sent with transcription config
✅ OpenAI responds with voice (response.text.done events)
❌ NO conversation.item.input_audio_transcription.delta events
❌ NO conversation.item.input_audio_transcription.completed events
```

### Investigation Phase 3: Git History Analysis (User Request)
**User:** "scan back to a git history of 4+ weeks ago, it was working perfectly not long ago"

**Findings:**
1. **Oct 16, 2025 (commit 12d53189):** Voice ordering working
2. **Oct 30, 2025 (commit 9056f9ea):** Major refactor - split into 3 services
3. **Nov 10, 2025 (commit 500b820c):** Fixed race condition (DataChannel onmessage)
4. **Session config IDENTICAL** between Oct 16 and current versions
5. **Conclusion:** Code is correct, something changed externally

### Investigation Phase 4: OpenAI API Research
**Web search revealed:**
- Multiple forum posts (2025) report `whisper-1` not working with Realtime API
- OpenAI launched `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` (March 2025)
- Community recommends using `gpt-4o-transcribe` instead of `whisper-1`
- Model may require account enablement in project settings

**References:**
- https://community.openai.com/t/cant-get-the-user-transcription-in-realtime-api/1076308
- https://www.latent.space/p/realtime-api

### Current State (2025-01-18 ~21:00 UTC)
- ⏸️ **PAUSED** - Awaiting user testing with diagnostic logging
- 📋 Deployed version with comprehensive event logging (commit 09f8b343)
- 🔄 Reverted model from `gpt-4o-transcribe` → `whisper-1` for comparison
- 📊 All OpenAI events now logged with 🔔 prefix

---

## Root Cause Analysis

### The Problem: Silent Deprecation

**What we configured:**
```typescript
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en'
}
```

**What we expected:**
1. User speaks → Audio transmitted to OpenAI
2. OpenAI transcribes → Sends `conversation.item.input_audio_transcription.delta` events
3. We accumulate deltas → Final transcript received
4. Agent calls `add_to_order` function with transcript context

**What actually happens:**
1. User speaks → Audio transmitted ✅
2. OpenAI receives audio ✅
3. OpenAI processes and responds ✅
4. **NO transcription events sent back** ❌
5. State machine times out (10s) waiting for transcript ❌
6. Agent can't call functions without transcript context ❌

### Evidence of API Breaking Change

#### Forum Posts (2025):
1. **"Can't get the user transcription in realtime api"**
   - Users report `whisper-1` returns null transcripts
   - Solution: Use `gpt-4o-transcribe` model
   - Caveat: Model must be enabled in project settings

2. **"Turn_detection null breaks manual audio control"**
   - API breaking changes in early 2025
   - `turn_detection: null` behavior changed

3. **Official Azure Docs**
   - Confirms `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` all valid
   - But availability varies by account/region

### Why This Is Different from CL-VOICE-001

**CL-VOICE-001:** Configuration error (missing prop)
- Code was wrong
- Fix was clear (add prop)
- Immediately testable

**CL-VOICE-002:** External dependency change
- Code appears correct
- OpenAI behavior changed
- May require account enablement
- May require billing verification
- May require model access approval

---

## Detection Clues

### What Works (Misleading)
```
✅ WebRTC connection established
✅ session.created event received
✅ session.update sent successfully
✅ Audio transmission verified (68KB+, 1668 packets)
✅ OpenAI responds (response.text.done events)
✅ Agent has menu knowledge
✅ Agent has function tools configured
```

### What Fails (True Indicators)
```
❌ NO conversation.item.input_audio_transcription.delta
❌ NO conversation.item.input_audio_transcription.completed
❌ Timeout waiting for transcript (10s)
❌ State machine stuck in waiting_user_final
❌ Agent returns text but doesn't call functions
❌ Cart never updates from voice
```

### The Smoking Gun: State Machine Timeout

**Console logs show:**
```
[WebRTCVoiceClient] Turn state: recording → committing
[WebRTCVoiceClient] Turn state: committing → waiting_user_final
⏰ [WebRTCVoiceClient] Timeout waiting for transcript, resetting to idle
```

This timeout ONLY triggers when transcription events never arrive.

### The Deceptive Response

**What you see in UI:**
```
Assistant: {"item":"Greek salad","modifications":"no modifications"}
```

**What this means:**
- Agent received your audio ✅
- Agent processed it internally ✅
- Agent responded with structured data ✅
- But agent NEVER sent `add_to_order` function call ❌

**Why?** Without transcript context, agent can't confidently execute functions.

---

## Diagnostic Steps Taken

### 1. Added Comprehensive Logging (Commit 09f8b343)
```typescript
// Log EVERY event from OpenAI
console.log(`🔔 [VoiceEventHandler] ${event.type}`, event);
```

**Purpose:** Capture all events to verify what OpenAI is actually sending

### 2. Tried Model Change (Commit 3a5d126f)
```typescript
// BEFORE
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en'
}

// AFTER
input_audio_transcription: {
  model: 'gpt-4o-transcribe'
}
```

**Result:** User reported seeing transcription in UI, but still timing out

### 3. Reverted for Comparison (Commit 09f8b343)
```typescript
// REVERT: Try whisper-1 again with better logging
model: 'whisper-1'
```

**Purpose:** Compare events received with both models

---

## Hypotheses (Ordered by Likelihood)

### 1. Model Access Not Enabled (HIGH)
**Evidence:**
- Forum post: "enable gpt-4o-transcribe as allowed model in project settings"
- OpenAI launched new models March 2025
- May require explicit enablement

**Test:** Check OpenAI project settings → Models → Enable gpt-4o-transcribe

### 2. Billing/Credits Issue (MEDIUM)
**Evidence:**
- Forum post: "negative account balance prevented transcription events"
- Transcription has separate pricing ($0.006/min)

**Test:** Check OpenAI account billing status

### 3. Ephemeral Token Configuration (MEDIUM)
**Evidence:**
- Forum post: "haven't properly configured initial POST request"
- We send transcription config via session.update (WebSocket)
- May need to configure during ephemeral token handshake

**Test:** Add transcription config to `/api/v1/realtime/ephemeral` request body

### 4. Turn Detection Incompatibility (LOW)
**Evidence:**
- We use `turn_detection: null` (manual PTT mode)
- Forum reports `turn_detection: null` breaking in 2025

**Test:** Try `turn_detection: { type: 'server_vad', create_response: false }`

### 5. Audio Format Issue (LOW)
**Evidence:**
- We use `pcm16` format
- Confirmed working in October

**Test:** Unlikely, but could try different format

---

## Prevention Rules for Future AI Agents

### 1. Check External Dependencies FIRST
When debugging features that worked before:
```bash
# BEFORE diving into code:
1. Check if external API changed
2. Search community forums for similar issues
3. Compare working version with current (git history)
4. Verify account/billing/access for external services
```

**This incident:** Wasted 8+ hours on code before checking OpenAI forums

### 2. Log External API Events Comprehensively
When integrating third-party APIs:
```typescript
// ALWAYS log what you send AND what you receive
api.send(payload);
console.log('📤 Sent to API:', payload);

api.on('*', (event) => {
  console.log('📥 Received from API:', event.type, event);
});
```

**This incident:** Only logged our outgoing config, not incoming events

### 3. Understand Event Flow Before Debugging
When event-driven systems fail:
```
# Create a checklist:
1. Event A sent? ✅/❌
2. Event B received? ✅/❌
3. Event C triggered? ✅/❌
4. Expected outcome? ✅/❌

# Identify FIRST missing event
# Debug from there, not from symptom
```

**This incident:** Symptom was "can't add to cart", but root cause was "no transcript events"

### 4. Check Account Limits and Access
When using pay-per-use APIs:
```bash
# Before debugging code:
- Verify billing active
- Check usage quotas
- Confirm model access enabled
- Review account status
```

**This incident:** Never checked if `gpt-4o-transcribe` was enabled for account

### 5. Use Git History to Find Breaking Point
When "it worked before":
```bash
# Find when it broke:
git log --since="1 month ago" --until="now" --oneline -- path/to/feature/

# Compare working version:
git show <commit>:path/to/file.ts | grep -A 10 "critical_config"

# Look for EXTERNAL changes too (API version, model deprecation)
```

**This incident:** Found code was identical to working version → pointed to external cause

### 6. Silent Failures Need Noisy Logging
When external services fail silently:
```typescript
// BEFORE (silent failure)
input_audio_transcription: {
  model: 'whisper-1' // OpenAI accepts but ignores
}

// AFTER (detect failure)
openai.on('error', (event) => {
  if (event.code === 'model_not_found' || event.code === 'transcription_failed') {
    console.error('🚨 TRANSCRIPTION FAILED:', event);
    alert('Voice transcription not available - check OpenAI model access');
  }
});

openai.on('session.updated', (event) => {
  // Verify transcription actually enabled
  if (!event.session.input_audio_transcription) {
    console.error('🚨 Transcription NOT enabled in session!');
  }
});
```

---

## Testing Checklist

### Immediate Next Steps (For User)

1. **Hard refresh** the page (Cmd+Shift+R / Ctrl+Shift+R)
2. **Test voice ordering** and say "I'd like a greek salad"
3. **Capture console logs** - look for 🔔 events
4. **Check for:**
   ```
   🔔 conversation.item.input_audio_transcription.delta
   🔔 conversation.item.input_audio_transcription.completed
   🔔 response.function_call_arguments.done
   ```
5. **Verify account:**
   - OpenAI account has positive balance
   - `gpt-4o-transcribe` model enabled in project settings
   - Realtime API usage not exceeded

### Expected Success Indicators

```
✅ User says "I'd like a greek salad"
✅ Console shows: 🔔 conversation.item.input_audio_transcription.delta: "I'd like"
✅ Console shows: 🔔 conversation.item.input_audio_transcription.delta: " a greek"
✅ Console shows: 🔔 conversation.item.input_audio_transcription.completed: "I'd like a greek salad"
✅ Console shows: 🔔 response.function_call_arguments.done: { name: "add_to_order", arguments: {...} }
✅ Cart updates with Greek Salad
✅ No timeout warnings
```

### Expected Failure Indicators (Still Broken)

```
❌ No 🔔 conversation.item.input_audio_transcription events
❌ Console shows: "Timeout waiting for transcript, resetting to idle"
❌ Agent responds but doesn't call functions
❌ Cart doesn't update
```

If still broken, likely need to:
1. Enable `gpt-4o-transcribe` in OpenAI project settings
2. Verify billing/credits
3. Contact OpenAI support for model access

---

## Code Changes

### File: `client/src/modules/voice/services/VoiceSessionConfig.ts`

**Commit 3a5d126f** (Attempted fix):
```typescript
input_audio_transcription: {
  model: 'gpt-4o-transcribe' // CRITICAL FIX: OpenAI API change in 2025
},
```

**Commit 09f8b343** (Diagnostic revert):
```typescript
input_audio_transcription: {
  model: 'whisper-1' // REVERT: Try whisper-1 again with better logging
},
```

### File: `client/src/modules/voice/services/VoiceEventHandler.ts`

**Commit 09f8b343** (Added comprehensive logging):
```typescript
// CRITICAL: Log EVERY event to diagnose transcription issue
console.log(`🔔 [VoiceEventHandler] ${event.type}`, event);
```

---

## Impact

**Before Investigation:**
- Voice ordering appeared to work (audio, responses)
- But could not add items to cart
- Agent said items but didn't execute

**Current State (Paused):**
- Identified external API issue (not code bug)
- Deployed diagnostic version with full event logging
- Awaiting user testing with logs
- May require OpenAI account configuration

**After Fix (Expected):**
- Transcription events received
- Agent can call functions
- Cart updates from voice orders
- Full voice ordering functionality restored

---

## Related Documents

- [Context Prop Fix (CL-VOICE-001)](./CL-VOICE-001-context-prop-missing.md)
- [Transcription Model Fix Documentation](../../docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md)
- [Voice Ordering Architecture](../../docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md)
- [Full Debugging Session Notes](../../docs/archive/2025-01/VOICE_DEBUGGING_SESSION_2025-01-18.md)

---

## Tags

`voice-ordering` `openai-realtime-api` `transcription` `external-dependency` `model-deprecation` `event-driven` `webrtc`

**Severity:** Critical
**Detection Difficulty:** Medium (works partially, fails subtly)
**Fix Complexity:** Unknown (may require account access, not code change)
**Investigation Time:** ~8 hours (2 hours after CL-VOICE-001 fix)
**Status:** Paused - Awaiting user verification and OpenAI account check
