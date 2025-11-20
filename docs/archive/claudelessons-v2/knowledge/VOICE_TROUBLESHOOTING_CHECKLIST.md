# Voice Ordering Troubleshooting Checklist

**Quick Reference:** Use this checklist before diving into deep debugging.
**Full Runbook:** See [VOICE_DEBUGGING_RUNBOOK.md](../protocols/VOICE_DEBUGGING_RUNBOOK.md)

---

## 🚨 STOP! Check These First (5 Minutes)

### 1. External Service Status
- [ ] OpenAI account has positive balance
- [ ] OpenAI API key is valid (`OPENAI_API_KEY` in server/.env)
- [ ] `gpt-4o-transcribe` model enabled in OpenAI project settings
- [ ] No rate limiting active
- [ ] Server is running (`curl http://localhost:3001/health`)

### 2. Browser/Permissions
- [ ] Hard refresh page (Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Microphone permission granted (browser lock icon)
- [ ] Try incognito/private mode
- [ ] Check console for errors (F12)

### 3. Quick Console Checks
```javascript
// Run these in browser console:

// 1. Check auth
localStorage.getItem('auth_session')  // Should have value

// 2. Check microphone
navigator.permissions.query({name: 'microphone'})  // Should be 'granted'

// 3. Test mic access
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(s => { console.log('✅ Mic OK'); s.getTracks().forEach(t => t.stop()); })
  .catch(e => console.error('❌ Mic failed:', e))
```

---

## 📋 Systematic Diagnosis (15 Minutes)

### Level 1: Connection
Look for these in console:
```
✅ [WebRTCConnection] WebRTC connection established
✅ [WebRTCConnection] Data channel opened
✅ [VoiceEventHandler] session.created received
```

**If missing:** See Runbook §3 (Connection Issues)

### Level 2: Audio Transmission
Look for (2 seconds after pressing button):
```
✅ [WebRTCConnection] Microphone ENABLED
✅ [WebRTCConnection] Audio transmission stats: { bytesSent: >0, packetsSent: >0 }
```

**If missing:** See Runbook §2 (Audio Input Issues)

### Level 3: Context Configuration
Look for:
```
✅ context: "kiosk"  ← MUST be "kiosk"
✅ toolsCount: 3
✅ hasMenuInInstructions: true
```

**If wrong:** See Runbook §4 (Context Issues) or [CL-VOICE-001](./incidents/CL-VOICE-001-context-prop-missing.md)

### Level 4: Transcription ⚠️ MOST COMMON ISSUE
Look for:
```
✅ 🔔 conversation.item.input_audio_transcription.delta
✅ 🔔 conversation.item.input_audio_transcription.completed
```

**If missing:** See Runbook §5 (Transcription Issues) or [CL-VOICE-002](./incidents/CL-VOICE-002-transcription-missing.md)

### Level 5: Function Calling
Look for:
```
✅ 🔔 response.function_call_arguments.done: { name: "add_to_order", ... }
✅ order.items.added event
✅ Cart updates
```

**If missing:** Check if Level 4 (Transcription) passed first

---

## 🔧 Common Fixes

### Fix 1: Context Prop Missing (CL-VOICE-001)
```bash
# Check:
grep 'context="kiosk"' client/src/components/kiosk/VoiceOrderingMode.tsx

# Should show:
<VoiceControlWebRTC
  context="kiosk"
  ...
/>
```

**If missing, add the prop.**

### Fix 2: Transcription Model Deprecated (CL-VOICE-002)
```typescript
// Edit: client/src/modules/voice/services/VoiceSessionConfig.ts

// Change from:
input_audio_transcription: {
  model: 'whisper-1'
}

// To:
input_audio_transcription: {
  model: 'gpt-4o-transcribe'
}
```

**Then check OpenAI project settings to enable model.**

### Fix 3: Missing Diagnostic Logging
```typescript
// Add to VoiceEventHandler.ts line ~228:
console.log(`🔔 [VoiceEventHandler] ${event.type}`, event);
```

**Redeploy and check console for all events.**

### Fix 4: Authentication Issue
```javascript
// In browser console:
localStorage.clear();
// Then refresh page and try again
```

---

## ⏱️ Quick Decision Tree (Use This Flow)

```
Voice not working?
  ↓
Can you click button? → NO → Fix browser/UI issue
  ↓ YES
Does "Listening..." appear? → NO → Fix microphone permission
  ↓ YES
Does agent respond at all? → NO → Fix connection (check server logs)
  ↓ YES
Does console show "context: kiosk"? → NO → Fix context prop (CL-VOICE-001)
  ↓ YES
Does console show transcription events? → NO → Fix transcription (CL-VOICE-002)
  ↓ YES
Does console show function calls? → NO → Check function handlers
  ↓ YES
Does cart update? → NO → Check cart context/auth
  ↓ YES
✅ WORKING!
```

---

## 📚 Documentation Index

**Start Here:**
- [This Checklist] Quick troubleshooting steps
- [Voice Debugging Runbook](../protocols/VOICE_DEBUGGING_RUNBOOK.md) - Comprehensive guide

**Incidents:**
- [CL-VOICE-001: Context Prop Missing](./incidents/CL-VOICE-001-context-prop-missing.md) - Agent has no menu knowledge
- [CL-VOICE-002: Transcription Missing](./incidents/CL-VOICE-002-transcription-missing.md) - No transcription events from OpenAI

**Architecture:**
- [Voice Ordering Architecture](../../docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md) - How it all works
- [Voice Code Salvage](../../docs/archive/2025-01/VOICE_CODE_SALVAGE.md) - Removed code reference

**Debugging Sessions:**
- [Full Session Notes Jan 18](../../docs/archive/2025-01/VOICE_DEBUGGING_SESSION_2025-01-18.md)
- [Context Fix Details](../../docs/archive/2025-01/VOICE_BUG_FIX_2025-01-18.md)
- [Transcription Fix](../../docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md)

---

## 🆘 When to Escalate

### Escalate to OpenAI Support if:
- Transcription events never received
- Account shows positive balance
- Model enabled but still not working
- Error events indicate OpenAI issue

### Escalate to Senior Developer if:
- Multiple components broken
- Architecture changes needed
- Security/auth issues
- Database migration required

### Just Ask User to Test if:
- Fixed a config issue
- Deployed diagnostic version
- Need to verify external service
- Waiting for cache to clear

---

## 💡 Pro Tips

1. **Always check external services FIRST** before debugging code
2. **Use git history** to find when it broke: `git log --since="1 month ago"`
3. **Add logging early** - don't rely on logger.warn() in production
4. **Test in incognito** to rule out cache/cookies
5. **Check OpenAI forums** - community often hits issues before you
6. **Verify events received** not just events sent
7. **One issue at a time** - fix context before transcription before functions

---

## 🔄 Last Updated

**Date:** 2025-01-18
**Version:** 1.0
**Known Issues:** Transcription model deprecation (CL-VOICE-002)
**Next Review:** After next major voice issue
