# WebSocket Disconnection - Root Cause Analysis

## Problem Statement

Voice ordering WebSocket shows "disconnected" status immediately or shortly after opening the voice modal, preventing transcription from working.

**Evidence from User Screenshots:**
1. "WebSocket: disconnected" status in Voice Debug Panel
2. Message: "Refreshing ephemeral token..." appears after ~20 seconds
3. Connection fails BEFORE user can record any audio

## Code Flow Analysis

### 1. Token Creation & Session Establishment

**Server:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/realtime.routes.ts:136-168`

```typescript
// Server creates ephemeral token
const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: env.OPENAI_REALTIME_MODEL
  }),
});

// ISSUE #1: Server OVERWRITES OpenAI's actual expiry
const sessionData = {
  ...data,
  restaurant_id: restaurantId,
  menu_context: menuContext,
  expires_at: Date.now() + 60000, // Hardcoded 60 seconds
};
```

**Client:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceSessionConfig.ts:102-129`

```typescript
// Client fetches token and stores hardcoded expiry
const data = await response.json();
this.ephemeralToken = data.client_secret.value;
this.tokenExpiresAt = data.expires_at || Date.now() + 60000;

// Schedules refresh 10 seconds before expiry
this.scheduleTokenRefresh();
```

**CRITICAL ISSUE**: Token refresh CANNOT update active WebRTC session (line 151-152):
```typescript
// Note: We can't update an active WebRTC session token
// This is for the next connection
```

### 2. WebRTC Connection Flow

**Client:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts:191-259`

```typescript
// Step 4: Create data channel
this.dc = this.pc.createDataChannel('oai-events', {
  ordered: true,
});
this.setupDataChannel();

// Step 6: Send SDP to OpenAI with ephemeral token
const sdpResponse = await fetch(
  `https://api.openai.com/v1/realtime?model=${model}`,
  {
    method: 'POST',
    body: offer.sdp,
    headers: {
      'Authorization': `Bearer ${ephemeralToken}`,
      'Content-Type': 'application/sdp',
    },
  }
);

// Step 7: Set remote description and establish connection
await this.pc.setRemoteDescription(answer);
this.sessionActive = true;
```

**Data Channel Setup:** Line 409-434

```typescript
private setupDataChannel(): void {
  if (!this.dc) return;

  this.dc.onopen = () => {
    this.setConnectionState('connected');
    this.emit('dataChannelReady', this.dc);
  };

  this.dc.onerror = (error) => {
    logger.error('[WebRTCConnection] Data channel error:', error);
    this.emit('error', error);
  };

  this.dc.onclose = () => {
    // ISSUE #2: No logging of WHY channel closed
    this.handleDisconnection();
  };
}
```

### 3. Session Configuration

**Client:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts:126-141`

```typescript
// When session.created event received, send configuration
this.eventHandler.on('session.created', () => {
  const sessionConfigObj = this.sessionConfig.buildSessionConfig();
  this.eventHandler.sendEvent({
    type: 'session.update',
    session: sessionConfigObj
  });

  // Clear audio buffer immediately after
  this.eventHandler.sendEvent({
    type: 'input_audio_buffer.clear'
  });
});
```

**Configuration Object:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceSessionConfig.ts:203-250`

```typescript
const sessionConfig: RealtimeSessionConfig = {
  modalities: ['text', 'audio'],
  instructions, // VERY LONG STRING with menu context
  voice: 'alloy',
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  input_audio_transcription: {
    model: 'whisper-1',
    language: 'en'
  },
  turn_detection: turnDetection,
  temperature: 0.6,
  max_response_output_tokens: maxTokens
};

// Add tools if present
if (tools && tools.length > 0) {
  sessionConfig.tools = tools;
  sessionConfig.tool_choice = 'auto';
}
```

## Identified Issues

### ISSUE #1: Token Expiry Mismatch

**Location:** `server/src/routes/realtime.routes.ts:168`

**Problem:**
- Server hardcodes `expires_at: Date.now() + 60000` (60 seconds)
- This may NOT match OpenAI's actual session expiry
- If OpenAI expires the session sooner, connection terminates
- Client cannot refresh token for active WebRTC session

**Impact:** Medium (but doesn't explain immediate disconnection)

### ISSUE #2: Oversized Session Configuration

**Location:** `server/src/routes/realtime.routes.ts:46-94` and `client/src/modules/voice/services/VoiceSessionConfig.ts:256-327`

**Problem:**
- Menu context can be VERY large (all menu items + descriptions + allergen info)
- Instructions string includes full menu context
- OpenAI may have limits on session.update message size
- Large messages could cause rejection and connection termination

**Evidence:**
```typescript
// Server builds large menu context
menuContext = `\n\n📋 FULL MENU (Summer Lunch Menu - prices may vary):\n`;
menuContext += `=====================================\n`;

for (const [category, items] of Object.entries(menuByCategory)) {
  menuContext += `\n${category.toUpperCase()}:\n`;
  items.forEach(item => {
    menuContext += `  • ${item.name} - $${item.price.toFixed(2)}`;
    // ... more context added
  });
}

// Client includes this in instructions
instructions += this.menuContext; // Could be thousands of characters
```

**Impact:** HIGH (likely cause of immediate disconnection)

### ISSUE #3: Missing Disconnection Logging

**Location:**
- `client/src/modules/voice/services/WebRTCConnection.ts:428-433`
- `client/src/modules/voice/services/VoiceEventHandler.ts:179-184`

**Problem:**
- `dc.onclose` handler doesn't log WHY channel closed
- `dc.onerror` logs error but doesn't capture detailed error info
- No distinction between normal close vs. error close

**Current Code:**
```typescript
// WebRTCConnection.ts
this.dc.onclose = () => {
  if (this.config.debug) {
    logger.info('[WebRTCConnection] Data channel closed');
  }
  this.handleDisconnection();
};

// VoiceEventHandler.ts
this.dc.onclose = () => {
  if (this.config.debug) {
    // Debug: '[VoiceEventHandler] Data channel closed'
  }
  this.dcReady = false;
};
```

**Impact:** HIGH (prevents diagnosis of root cause)

### ISSUE #4: No Session Update Error Handling

**Location:** `client/src/modules/voice/services/VoiceEventHandler.ts:651-666`

**Problem:**
- `sendEvent()` queues messages if data channel not ready
- No error handling if session.update is rejected by OpenAI
- No timeout if queued messages never flush

**Impact:** Medium (could contribute to connection failures)

## Recommended Fixes

### Fix #1: Add Comprehensive Data Channel Logging

**File:** `client/src/modules/voice/services/WebRTCConnection.ts:428-433`

```typescript
this.dc.onclose = (event: CloseEvent) => {
  console.error('[WebRTCConnection] Data channel closed', {
    code: event.code,
    reason: event.reason,
    wasClean: event.wasClean,
    timestamp: Date.now()
  });
  this.handleDisconnection();
};
```

### Fix #2: Limit Menu Context Size

**File:** `server/src/routes/realtime.routes.ts:46-94`

```typescript
// Limit menu context to prevent oversized session.update
const MAX_MENU_CONTEXT_LENGTH = 5000; // Conservative limit

// ... build menuContext ...

if (menuContext.length > MAX_MENU_CONTEXT_LENGTH) {
  realtimeLogger.warn('Menu context too large, truncating', {
    originalLength: menuContext.length,
    truncatedLength: MAX_MENU_CONTEXT_LENGTH
  });
  menuContext = menuContext.substring(0, MAX_MENU_CONTEXT_LENGTH) +
    '\n\n[Menu truncated - ask staff for full details]';
}
```

### Fix #3: Use OpenAI's Actual Token Expiry

**File:** `server/src/routes/realtime.routes.ts:161-169`

```typescript
const data = await response.json() as Record<string, any>;

// Don't overwrite OpenAI's expiry - use their value
const sessionData = {
  ...data,
  restaurant_id: restaurantId,
  menu_context: menuContext,
  // Only add expires_at if OpenAI didn't provide one
  expires_at: data.expires_at || (Date.now() + 60000),
};
```

### Fix #4: Add Session Update Error Detection

**File:** `client/src/modules/voice/services/VoiceEventHandler.ts:630-645`

```typescript
private handleError(event: any, logPrefix: string): void {
  console.error('[VoiceEventHandler] API error:', JSON.stringify(event.error, null, 2));
  console.error('[VoiceEventHandler] Full error event:', JSON.stringify(event, null, 2));

  const errorMessage = event.error?.message || event.error?.error?.message || 'OpenAI API error';

  // Check for session configuration errors
  if (errorMessage.includes('session') || errorMessage.includes('configuration')) {
    console.error('[VoiceEventHandler] CRITICAL: Session configuration rejected by OpenAI');
    console.error('[VoiceEventHandler] This may be due to oversized instructions or invalid parameters');
  }

  const error = new Error(errorMessage);
  this.emit('error', error);
  // ... rest of error handling ...
}
```

## Next Steps

1. **Immediate:** Add comprehensive logging to dc.onclose and dc.onerror handlers
2. **High Priority:** Limit menu context size to prevent oversized messages
3. **Medium Priority:** Use OpenAI's actual token expiry instead of hardcoded value
4. **Low Priority:** Add better error detection for session configuration failures

## Testing Strategy

After implementing fixes:
1. Deploy to production
2. Open voice modal and check Chrome DevTools console
3. Look for new error logs showing:
   - Data channel close reason
   - Session update success/failure
   - Menu context size
4. If still failing, error logs will reveal exact cause
