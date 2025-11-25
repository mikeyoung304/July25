# CL-API-001: Silent OpenAI Model Deprecation

**Severity:** P0 | **Cost:** $1.2K | **Duration:** 8 hours debug, 2 weeks broken

## Problem

OpenAI silently deprecated `whisper-1` for Realtime API transcription. API accepted config but ignored it - no error, no deprecation notice. Voice ordering appeared to work (audio transmitted, agent responded) but transcription never arrived.

## Bug Pattern

```typescript
// BROKEN: Deprecated model - API accepts but ignores
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en'
}
// Result: NO transcription events, NO errors
// 8 hours debugging because everything else worked
```

## Fix Pattern

```typescript
// CORRECT: Current supported model
input_audio_transcription: {
  model: 'gpt-4o-transcribe'
}

// Add version logging for future detection
logger.info('OpenAI session config', {
  transcriptionModel: 'gpt-4o-transcribe',
  configVersion: '2025-11-18',
  lastVerified: new Date().toISOString()
});
```

## Prevention Checklist

- [ ] Monitor OpenAI changelog weekly
- [ ] Subscribe to provider newsletters/Discord
- [ ] Log model versions at startup
- [ ] Test critical flows with production keys weekly
- [ ] Set up alerts for missing expected events

## Detection

- Audio transmits successfully (68KB+, 1668 packets)
- Agent responds with voice
- NO `conversation.item.input_audio_transcription.delta` events
- NO `conversation.item.input_audio_transcription.completed` events
- Session connects, configuration accepted, but transcription silent

## Debugging Approach

When voice ordering stops working:
1. Verify audio transmission (check packet counts)
2. Verify agent responds (check response.text.done events)
3. Check for transcription events specifically
4. If missing: Check OpenAI community forums for model changes
5. Compare session config against OpenAI docs

## Key Insight

**Silent API failures are the hardest to debug.** The API accepts invalid config without error. Log model versions and monitor changelogs proactively.
