# Voice Ordering - Quick Improvement Reference
**Last Updated:** 2025-11-22
**For:** Developers looking to improve voice ordering implementation

---

## PRIORITY 1: MUST FIX (Before scaling to production)

### 1. Missing OpenAI Rate Limit Handling ⚠️
**File:** `server/src/routes/realtime.routes.ts` (line 386-397)
**Issue:** No exponential backoff for 429 (rate limit) responses
**Fix:** Add retry logic with 1s → 2s → 4s → 8s → 16s → 30s backoff
**Impact:** Prevents hammering OpenAI when rate limited

```typescript
// BEFORE (line 386-397)
if (!response.ok) {
  const errorText = await response.text();
  realtimeLogger.error('OpenAI ephemeral token creation failed', {
    status: response.status,
    error: errorText
  });
  return res.status(response.status).json({...});
}

// AFTER (add rate limit handling)
if (response.status === 429) {
  // Implement exponential backoff
  // Return 503 Service Unavailable (client should retry)
}
```

---

### 2. WebRTC Connection Doesn't Auto-Reconnect ⚠️
**File:** `client/src/modules/voice/services/WebRTCConnection.ts`
**Issue:** When connection drops, user stuck until manual restart
**Fix:** Add auto-reconnection with exponential backoff (max 3 retries)
**Impact:** Better user experience, automatic recovery from network hiccups

```typescript
// Add to WebRTCConnection class
private reconnectAttempts = 0;
private maxReconnectAttempts = 3;
private reconnectBaseDelayMs = 1000;

private handleConnectionError(error: Error) {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    const delay = this.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempts);
    setTimeout(() => this.reconnect(), delay);
    this.reconnectAttempts++;
    this.emit('reconnection.attempt', { attempt: this.reconnectAttempts });
  }
}
```

---

### 3. Token Expires After 60 Seconds (No Recovery) ⚠️
**File:** `client/src/modules/voice/services/VoiceSessionConfig.ts` (line 171-195)
**Issue:** Token refreshed but can't be applied to active WebRTC session
**Fix:** Gracefully close and reconnect with new token when expiring
**Impact:** Sessions don't mysteriously stop working after 60s

```typescript
// Add method to VoiceSessionConfig
handleTokenExpired() {
  // Emit event: "token.expired"
  // WebRTCVoiceClient closes connection
  // Reconnect with new token (acceptable 2-3s gap)
  
  this.emit('token.expired', {
    willReconnect: true,
    reconnectDelayMs: 500
  });
}
```

---

### 4. No Rate Limiting on Token Endpoint 🔓
**File:** `server/src/routes/realtime.routes.ts` (line 179)
**Issue:** Anonymous users can spam token requests
**Fix:** Add rate limiter (10 req/min per IP, 100 req/min per user)
**Impact:** Prevents token request abuse

```typescript
// Add middleware
import rateLimit from 'express-rate-limit';

const tokenLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per IP
  standardHeaders: false,
  skip: (req) => req.user?.id // Allow 100/min if authenticated
});

router.post('/session', tokenLimiter, optionalAuth, async (req, res) => {
  // existing code
});
```

---

### 5. WebRTC Voice Client Not Tested ❌
**File:** `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip`
**Issue:** Orchestrator class has zero test coverage (file is skipped)
**Fix:** Enable tests and add orchestrator test cases
**Impact:** Catch regressions before production

```bash
# Step 1: Rename file
mv client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip \
   client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts

# Step 2: Add tests for:
# - Service initialization
# - Event proxying
# - Connection state management
# - Error handling
```

---

## PRIORITY 2: SHOULD FIX (Next quarter)

### 6. Replace console.log with logger
**Files:** 
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` (lines 141, 150, 182)
- Other voice modules with console calls

**Fix:**
```typescript
// BEFORE
console.log('🎯 [WebRTCVoiceClient] Session created event received');

// AFTER
logger.info('[WebRTCVoiceClient] Session created event received');
```

---

### 7. Add Missing Metrics
**File:** `client/src/services/metrics/VoiceOrderingMetrics.ts`

**Add methods:**
```typescript
trackConnectionLatency(latencyMs: number)
trackMenuLoadTime(restaurantId: string, durationMs: number)
trackTokenRefreshSuccess(success: boolean)
trackErrorRecovery(errorType: string, recovered: boolean)
```

---

### 8. Extract Hardcoded Configuration
**Files:** 
- `client/src/modules/voice/services/VoiceSessionConfig.ts` (lines 281, 289, 254)
- `server/src/routes/realtime.routes.ts` (line 284)
- `server/src/ai/functions/realtime-menu-tools.ts` (line 90)

**Create:** `server/src/config/voice.config.ts`
```typescript
export const VoiceConfig = {
  openai: {
    voice: 'alloy', // or from env
    temperature: 0.6,
    maxTokensKiosk: 500,
    maxTokensServer: 200,
    transcriptionModel: 'gpt-4o-transcribe',
  },
  vad: {
    silenceDurationMs: 1500,
    thresholdDb: 0.5,
    prefixPaddingMs: 300,
  },
  menu: {
    contextLimit: 5000,
    cacheTTL: 300,
  },
  cart: {
    cleanupIntervalMs: 5 * 60 * 1000,
    maxAgeMs: 30 * 60 * 1000,
  },
};
```

---

### 9. Add Error Recovery Tests
**Create:** `client/src/modules/voice/__tests__/ErrorRecovery.test.tsx`

**Test cases:**
- [ ] Token expiration recovery
- [ ] WebRTC reconnection
- [ ] Data channel closure
- [ ] Menu load failure
- [ ] Network timeout handling

---

### 10. Create Operational Runbook
**Create:** `docs/voice/VOICE_ORDERING_RUNBOOK.md`

**Sections:**
- Common issues and fixes
- Health check procedures
- Performance tuning guide
- Monitoring dashboard setup
- Incident response procedures

---

## PRIORITY 3: NICE TO HAVE (Optimizations)

### 11. Compress Menu Context
**File:** `server/src/routes/realtime.routes.ts` (line 235-281)
**Opportunity:** 5-10% size reduction
```typescript
// Use more compact formatting
// Remove unnecessary whitespace
// Use abbreviations for common items
```

### 12. Add Message Queue Limits
**File:** `client/src/modules/voice/services/VoiceEventHandler.ts` (line 114)
**Add:** Cap at 1000 messages, warn if approaching limit

### 13. Implement Barge-in Detection
**Reference:** `docs/archive/2025-01/VOICE_CODE_SALVAGE.md` (line 187-233)
**Note:** User can't interrupt AI in current implementation

### 14. Add Audit Logging
**File:** `server/src/routes/realtime.routes.ts`
**Add:** Log voice session creation with timestamp, userId, restaurantId

### 15. Create Monitoring Dashboard
**Metrics to track:**
- Voice order success rate (target: >95%)
- Session duration (target: 2-5 min kiosk, 30-90s server)
- Error categories and frequencies
- Token refresh success rate (target: 99.9%)

---

## Implementation Order

### Week 1 (Blockers)
- [ ] Fix #1: OpenAI rate limiting
- [ ] Fix #2: WebRTC reconnection
- [ ] Fix #3: Token expiration recovery
- [ ] Fix #5: Enable WebRTC tests

### Week 2
- [ ] Fix #4: Add rate limiting
- [ ] Fix #6: Replace console.log
- [ ] Fix #7: Add metrics

### Week 3-4
- [ ] Fix #8: Extract configuration
- [ ] Fix #9: Error recovery tests
- [ ] Fix #10: Operational runbook

### Ongoing
- [ ] Fixes #11-15 (lower priority)

---

## File Reference

### Critical Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `server/src/routes/realtime.routes.ts` | 1 | Rate limit handling, error messages |
| `client/src/modules/voice/services/WebRTCConnection.ts` | 1 | Auto-reconnection logic |
| `client/src/modules/voice/services/VoiceSessionConfig.ts` | 1 | Token expiration handling |
| `server/src/config/env.ts` | 2 | Add voice configuration |
| `client/src/services/metrics/VoiceOrderingMetrics.ts` | 2 | Add missing metrics |
| `client/src/modules/voice/services/WebRTCVoiceClient.ts` | 2 | Replace console.log |
| `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts` | 1 | Unskip and add tests |

---

## Related Documentation
- Full analysis: `docs/investigations/VOICE_ORDERING_ARCHITECTURAL_ANALYSIS_2025-11-22.md`
- Salvaged patterns: `docs/archive/2025-01/VOICE_CODE_SALVAGE.md`
- Config audit: `docs/archive/2025-11/VOICE_CONFIG_AUDIT.md`
- Recent fixes: `docs/archive/2025-11/VOICE_ORDERING_HANDOFF_COMPLETE.md`

---

**Last Updated:** 2025-11-22
**Status:** Ready for implementation
**Questions?** See full analysis document
