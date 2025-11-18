# Voice Code Salvage Document
**Last Updated:** 2025-01-18
**Purpose:** Document valuable components from abandoned voice architectures before removal

## Overview
Before removing ~2,685 lines of abandoned voice ordering code (server-side WebSocket proxy + Twilio phone integration), this document captures salvageable patterns and algorithms for future reference.

## Salvageable Components

### 1. Multi-Tenancy Security Validation
**Source:** `server/src/voice/websocket-server.ts:133-209`
**Value:** Production-ready restaurant isolation with security audit logging

```typescript
/**
 * CRITICAL SECURITY: Validate restaurant isolation
 * Ensures authenticated restaurant matches requested restaurant
 */
private validateRestaurantIsolation(
  ws: AuthenticatedWebSocket,
  requestedRestaurantId: string | undefined,
  operation: string,
  sessionId?: string
): boolean {
  // Normalize restaurant IDs to lowercase for comparison
  const authenticatedRestaurantId = ws.authenticatedRestaurantId?.toLowerCase();
  const normalizedRequestedId = requestedRestaurantId?.toLowerCase();

  // STRICT PERIMETER CONTROL: Reject if no restaurant ID in session
  if (!normalizedRequestedId) {
    this.logSecurityViolation({
      type: 'missing_restaurant_id',
      userId: ws.authenticatedUserId || 'unknown',
      authenticatedRestaurant: authenticatedRestaurantId || 'none',
      attemptedRestaurant: 'missing',
      sessionId,
    });
    ws.close(1008, 'Security policy violation: missing restaurant context');
    return false;
  }

  // CRITICAL: Validate restaurant isolation
  if (normalizedRequestedId !== authenticatedRestaurantId) {
    this.logSecurityViolation({
      type: 'cross_restaurant_access',
      userId: ws.authenticatedUserId || 'unknown',
      authenticatedRestaurant: authenticatedRestaurantId || 'none',
      attemptedRestaurant: normalizedRequestedId,
      sessionId,
    });
    ws.close(1008, 'Security policy violation: cross-restaurant access');
    return false;
  }

  return true;
}

/**
 * Log security violations to database with file fallback
 */
private async logSecurityViolation(violation: SecurityViolation): Promise<void> {
  // Primary: Database logging
  try {
    const { error } = await supabase.from('security_audit_logs').insert({
      event_type: violation.type,
      user_id: violation.userId,
      authenticated_restaurant_id: violation.authenticatedRestaurant,
      attempted_restaurant_id: violation.attemptedRestaurant,
      session_id: violation.sessionId,
      severity: 'CRITICAL',
      created_at: new Date().toISOString(),
    });
    if (!error) return;
  } catch (error) {
    // Fall through to file logging
  }

  // Fallback: File logging
  await fs.promises.appendFile(
    this.securityLogPath,
    JSON.stringify({ ...violation, timestamp: new Date().toISOString(), severity: 'CRITICAL' }) + '\n'
  );
}
```

**Use Case:** Apply to future multi-tenant features (SMS notifications, email campaigns, reporting)

---

### 2. Audio Format Conversion (PCM16 ↔ G.711 μ-law)
**Source:** `server/src/ai/voice/EnhancedOpenAIAdapter.ts:137-228`
**Value:** Telephone audio codec conversion for future phone integrations

```typescript
/**
 * μ-law to PCM16 conversion (8kHz phone → 24kHz OpenAI)
 */
private ulawToPcm16(ulaw: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;

  const processedUlaw = ~ulaw;
  const sign = (processedUlaw & 0x80) ? -1 : 1;
  const exponent = (processedUlaw >> 4) & 0x07;
  const mantissa = processedUlaw & 0x0F;

  let sample = mantissa << ((exponent ?? 0) + 3);
  sample += BIAS << ((exponent ?? 0) + 2);
  sample *= sign;

  return Math.max(-CLIP, Math.min(CLIP, sample));
}

/**
 * PCM16 to μ-law conversion (24kHz OpenAI → 8kHz phone)
 */
private pcm16ToUlaw(pcm16: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;
  const exp_lut = [0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
                   4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
                   5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
                   5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];

  const sign = (pcm16 < 0) ? 0x80 : 0;
  if (sign) pcm16 = -pcm16;

  pcm16 = Math.min(pcm16, CLIP);
  pcm16 += BIAS;

  const exponent = exp_lut[(pcm16 >> 7) & 0xFF] ?? 0;
  const mantissa = (pcm16 >> ((exponent ?? 0) + 3)) & 0x0F;

  return ~(sign | ((exponent ?? 0) << 4) | mantissa);
}
```

**Use Case:** Future Twilio/phone integration, VoIP systems, or voice recording features

---

### 3. Debug Dashboard
**Source:** `server/src/voice/debug-dashboard.ts`
**Value:** Real-time voice system monitoring UI (643 lines)

**Features:**
- Live session monitoring with auto-refresh (2s intervals)
- Transcript viewing by session
- Function call tracking with success/failure indicators
- Error logging with timestamps
- System metrics (tokens used, cost estimation, session durations)
- Audio buffer inspection (if recording enabled)
- Test audio injection
- Export logs as JSON

**Key Routes:**
- `GET /api/voice/debug` - HTML dashboard
- `GET /api/voice/debug/sessions` - Active sessions
- `GET /api/voice/debug/metrics` - System metrics
- `GET /api/voice/debug/transcripts` - Recent transcripts
- `GET /api/voice/debug/functions` - Function call log
- `GET /api/voice/debug/errors` - Error log
- `POST /api/voice/debug/test` - Test OpenAI connection
- `POST /api/voice/debug/inject` - Inject test audio
- `GET /api/voice/debug/export` - Export all debug data

**Adaptation Plan:** Could be repurposed for WebRTC debugging:
1. Replace WebSocket session tracking with WebRTC peer connection tracking
2. Monitor RTCDataChannel messages instead of WebSocket messages
3. Track OpenAI Realtime API events (session.update, response.audio.delta, etc.)
4. Add WebRTC-specific metrics (ICE connection state, DTLS state, audio levels)

---

### 4. Barge-in Detection & Handling
**Source:** `server/src/ai/voice/EnhancedOpenAIAdapter.ts:232-257`
**Value:** User interruption handling pattern

```typescript
/**
 * Handle barge-in (user interruption during AI response)
 */
private handleBargeIn(): void {
  this.metrics.bargeInEvents++;

  logger.info('[EnhancedAdapter] Barge-in detected', {
    sessionId: this.sessionId,
    wasSpeaking: this.isSpeaking
  });

  // Cancel current OpenAI response
  this.sendToOpenAI({ type: 'response.cancel' });

  // Clear audio buffers
  this.responseBuffer = [];
  this.audioChunkCount = 0;

  // Clear Twilio audio buffer if connected
  if (this.twilioWS && this.streamSid) {
    this.sendToTwilio({
      event: 'clear',
      streamSid: this.streamSid
    });
  }

  this.isSpeaking = false;
}

// Trigger barge-in when user speaks during AI response
override async sendAudio(audioData: string, _sampleRate?: number): Promise<void> {
  this.metrics.audioChunksReceived++;

  // Handle barge-in if we're speaking
  if (this.isSpeaking) {
    this.handleBargeIn();
  }

  // Send to OpenAI
  await super.sendAudio(processedAudio, 24000);
}
```

**Current Gap:** WebRTC client doesn't implement barge-in (user can't interrupt AI)
**Enhancement:** Add to `VoiceEventHandler.ts` when `response.audio.delta` is active and user starts speaking

---

### 5. Function Calling with Error Recovery
**Source:** `server/src/ai/voice/EnhancedOpenAIAdapter.ts:338-393`
**Value:** Robust function execution pattern

```typescript
private async handleFunctionCall(event: any): Promise<void> {
  const { name, arguments: args, call_id } = event;
  this.metrics.functionsCallled++;

  logger.info('[EnhancedAdapter] Function call', {
    sessionId: this.sessionId,
    function: name,
    args
  });

  try {
    const tool = this.functionTools[name as keyof typeof this.functionTools];
    if (!tool) {
      throw new Error(`Unknown function: ${name}`);
    }

    const parsedArgs = JSON.parse(args);
    const result = await tool.handler(parsedArgs, {
      sessionId: this.sessionId,
      restaurantId: this.restaurantId
    });

    // Send result back to OpenAI
    this.sendToOpenAI({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify(result)
      }
    });

    // Continue the response
    this.sendToOpenAI({
      type: 'response.create'
    });

  } catch (error) {
    logger.error('[EnhancedAdapter] Function call failed', {
      function: name,
      error
    });

    // Return error to OpenAI so it can handle gracefully
    this.sendToOpenAI({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify({
          error: 'Function call failed',
          message: (error as Error).message
        })
      }
    });
  }
}
```

**Current Implementation:** `VoiceEventHandler.ts:269-331` handles function calls similarly
**Improvement:** Add explicit error responses to OpenAI like server-side version

---

## Why These Architectures Were Abandoned

### Server-Side WebSocket Proxy (~1,665 lines)
**Files:**
- `server/src/voice/websocket-server.ts` (655 lines)
- `server/src/voice/voice-routes.ts` (282 lines)
- `server/src/voice/openai-adapter.ts` (430 lines)
- `server/src/voice/types.ts` (98 lines)
- `server/src/voice/websocket-server.test.ts` (150 lines)
- `server/src/ai/websocket.ts` (23 lines)
- `server/src/voice/debug-dashboard.ts` (643 lines - salvageable)

**Reason for Abandonment:**
- **Latency:** Extra WebSocket hop (Client → Server → OpenAI) added 50-100ms roundtrip
- **Complexity:** Three-way connection management (client WS, server WS, OpenAI WS)
- **Scaling:** Server became bottleneck; needed to proxy all audio streams
- **Better Alternative:** OpenAI released WebRTC support allowing direct browser-to-OpenAI connection

### Twilio Phone Integration (~1,020 lines)
**Files:**
- `server/src/voice/twilio-bridge.ts` (379 lines)
- `server/src/ai/voice/EnhancedOpenAIAdapter.ts` (454 lines)
- `server/src/ai/functions/realtime-menu-tools.ts` (~187 lines - may still be used?)

**Reason for Abandonment:**
- **Never Deployed:** Built in preparation for phone ordering feature that was deprioritized
- **Cost:** Twilio + OpenAI Realtime costs too high for MVP
- **Market Validation:** Need to prove kiosk/web voice ordering works first
- **Complexity:** Audio format conversion, telephony-specific error handling, TwiML generation

---

## Architecture Comparison

| Architecture | Lines | Latency | Complexity | Status |
|---|---|---|---|---|
| Server-Side WS Proxy | ~1,665 | 150-250ms | High (3-way) | ❌ Abandoned |
| Twilio Phone | ~1,020 | 300-400ms | Very High | ❌ Never Deployed |
| **Client WebRTC** | ~2,500 | 50-100ms | Medium | ✅ **ACTIVE** |

---

## Removal Checklist

### Server-Side WebSocket Proxy
- [ ] `server/src/voice/websocket-server.ts`
- [ ] `server/src/voice/websocket-server.test.ts`
- [ ] `server/src/voice/voice-routes.ts`
- [ ] `server/src/voice/openai-adapter.ts`
- [ ] `server/src/voice/types.ts`
- [ ] `server/src/ai/websocket.ts`
- [ ] Remove WebSocket server setup from `server/src/index.ts`

### Twilio Phone Integration
- [ ] `server/src/voice/twilio-bridge.ts`
- [ ] `server/src/ai/voice/EnhancedOpenAIAdapter.ts`
- [ ] Check if `server/src/ai/functions/realtime-menu-tools.ts` is still used
- [ ] Remove Twilio routes from server setup

### Debug Dashboard (Salvage First)
- [ ] Archive `server/src/voice/debug-dashboard.ts` to docs (DONE)
- [ ] Remove from server routes after salvaging

### Shared Types (Check Dependencies)
- [ ] `shared/src/voice-types.ts` - May still be used by client

---

## Future Re-Implementation

If we ever need phone ordering again:
1. **Use this document** to retrieve audio conversion algorithms
2. **Adapt Debug Dashboard** for monitoring
3. **Reuse security validation** patterns
4. **Consider:** Modern alternatives like Twilio's native AI integration or Bland AI

---

## Related Documentation
- [Voice Ordering Architecture](../explanation/architecture/VOICE_ORDERING.md)
- [OpenAI Realtime API Integration](../reference/api/OPENAI_REALTIME.md)
- [WebRTC Implementation](../how-to/voice/WEBRTC_SETUP.md)
