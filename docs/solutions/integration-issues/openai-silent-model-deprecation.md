---
title: Silent OpenAI Model Deprecation
category: integration-issues
severity: P0
cost: $1.2K
duration: 2 weeks broken
symptoms:
  - Audio transmits successfully
  - Agent responds with voice
  - NO transcription events received
  - Session connects, configuration accepted, but transcription silent
root_cause: OpenAI deprecated whisper-1 for Realtime API without error - API accepts but ignores
tags: [openai, api, deprecation, voice]
created_date: 2025-11-25
---

# Silent OpenAI Model Deprecation

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

## Detection

- Audio transmits successfully (68KB+, 1668 packets)
- Agent responds with voice
- NO `conversation.item.input_audio_transcription.delta` events
- NO `conversation.item.input_audio_transcription.completed` events

## Prevention

- Monitor OpenAI changelog weekly
- Log model versions at startup
- Test critical flows with production keys weekly
- Set up alerts for missing expected events

## Key Insight

**Silent API failures are the hardest to debug.** The API accepts invalid config without error. Log model versions and monitor changelogs proactively.
