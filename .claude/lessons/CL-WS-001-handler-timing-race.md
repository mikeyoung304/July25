# CL-WS-001: WebRTC Handler Timing Race Condition

**Severity:** P0 | **Cost:** $1K | **Duration:** 11 days | **Commits:** 500b820c

## Problem

Voice ordering failed 60% of time. DataChannel opens in 50-100ms, but handler attached later. Initial events (`session.created`, `conversation.item.created`) lost, causing transcript map to never initialize.

## Bug Pattern

```typescript
// BROKEN: Handler attached AFTER channel opens
private setupDataChannel(): void {
  this.dc = this.pc.createDataChannel('oai-events');

  this.dc.onopen = () => {
    this.emit('dataChannelReady', this.dc);
    // Event emitted, but no handler yet
  };
  // NO onmessage handler here!
}

// Orchestrator attaches handler too late
this.connection.on('dataChannelReady', (dc) => {
  this.eventHandler.attachToDataChannel(dc);
  // 50-100ms late - initial events LOST
});
```

## Fix Pattern

```typescript
// CORRECT: Attach handler BEFORE channel can receive messages
private setupDataChannel(): void {
  if (!this.dc) return;

  // CRITICAL: Set onmessage IMMEDIATELY
  this.dc.onmessage = (event: MessageEvent) => {
    this.emit('dataChannelMessage', event.data);
  };

  this.dc.onopen = () => {
    this.setConnectionState('connected');
    this.emit('dataChannelReady', this.dc);
  };
}

// Add defensive fallback for missed events
private handleTranscriptDelta(event: any): void {
  if (!this.transcriptMap.has(event.item_id)) {
    // Create entry if conversation.item.created was lost
    this.transcriptMap.set(event.item_id, { transcript: '', isFinal: false });
  }
  // Now safe to append
}
```

## Prevention Checklist

- [ ] Attach event handlers BEFORE async operations complete
- [ ] Attach `onmessage` BEFORE `createDataChannel()` returns
- [ ] Add defensive fallbacks for missed initialization events
- [ ] Log timestamps when handlers attached vs. channel opened
- [ ] Test with simulated 100ms latency

## Detection

- NO transcription events received (delta, completed)
- Audio transmits (68KB+), agent responds, but transcript empty
- State machine timeout: "Waiting for transcript..."
- Session connects successfully but feature doesn't work
