# Voice Session Metrics and Observability

This document describes the lightweight voice session metrics system implemented for monitoring and debugging voice ordering functionality.

## Overview

The voice metrics system provides structured logging for key lifecycle events in voice sessions without external dependencies or PII collection. It supports both browser and Node.js environments and emits structured JSON logs that can be aggregated by production logging systems.

## Architecture

### Core Components

1. **VoiceMetrics Class** (`shared/utils/voice-metrics.ts`)
   - Singleton pattern for consistent session tracking
   - Environment-aware logging (browser vs Node.js)
   - Automatic session cleanup to prevent memory leaks

2. **WebRTCVoiceClient Integration** (`client/src/modules/voice/services/WebRTCVoiceClient.ts`)
   - Tracks client-side connection and interaction metrics
   - Measures connection latency and time-to-first-transcript
   - Monitors reconnection attempts and failures

3. **Server Middleware Integration** (`server/src/middleware/normalizeVoiceSession.ts`)
   - Tracks session configuration normalization
   - Monitors fallback chain usage and parameter changes
   - Measures server-side processing time

## Tracked Events

### 1. Session Creation (`voice.session.created`)
```typescript
{
  event: 'voice.session.created',
  sessionId: 'voice_abc123_def456',
  restaurantId: 'restaurant-id',
  userId: 'user-id',
  mode: 'customer',
  hasMenuContext: true,
  connectStartTime: 1632150000000
}
```

### 2. Session Normalization (`voice.session.normalized`)
```typescript
{
  event: 'voice.session.normalized',
  sessionId: 'voice_abc123_def456',
  restaurantId: 'restaurant-id',
  mode: 'customer',
  configSource: {
    temperature: 'default',
    maxTokens: 'restaurant'
  },
  changes: {
    temperature: { from: 0.5, to: 0.6, reason: 'clamped_to_limits' }
  },
  normalizationTimeMs: 15
}
```

### 3. Connection Latency (`voice.session.connect_latency`)
```typescript
{
  event: 'voice.session.connect_latency',
  sessionId: 'voice_abc123_def456',
  latencyMs: 1200,
  steps: {
    tokenFetch: 400,
    peerConnectionSetup: 150,
    sdpExchange: 500,
    dataChannelReady: 150
  }
}
```

### 4. Time to First Transcript (`voice.session.ttf`)
```typescript
{
  event: 'voice.session.ttf',
  sessionId: 'voice_abc123_def456',
  ttfMs: 750,
  isFinalTranscript: false,
  recordingStartTime: 1632150001000,
  firstTranscriptTime: 1632150001750
}
```

### 5. Reconnection Attempts (`voice.session.reconnect`)
```typescript
{
  event: 'voice.session.reconnect',
  sessionId: 'voice_abc123_def456',
  attempt: 2,
  maxAttempts: 3,
  delayMs: 1000,
  reason: 'network_error',
  lastError: 'WebSocket connection timeout'
}
```

### 6. Session Failures (`voice.session.fail`)
```typescript
{
  event: 'voice.session.fail',
  sessionId: 'voice_abc123_def456',
  reason: 'connection_lost',
  lastError: 'Max reconnection attempts exceeded',
  attempts: 3,
  totalDurationMs: 45000
}
```

## Usage

### Basic Usage

```typescript
import { voiceMetrics } from '@/shared/utils/voice-metrics';

// Generate unique session ID
const sessionId = voiceMetrics.generateSessionId();

// Track session creation
voiceMetrics.sessionCreated({
  sessionId,
  restaurantId: 'restaurant-123',
  mode: 'customer',
  hasMenuContext: true,
  connectStartTime: Date.now()
});
```

### Performance Measurement

```typescript
import { measureTimeAsync } from '@/shared/utils/voice-metrics';

// Measure async operations
const { result, durationMs } = await measureTimeAsync(async () => {
  return await someExpensiveOperation();
});

console.log(`Operation took ${durationMs}ms`);
```

### Session Cleanup

```typescript
// Clean up old session tracking data (automatically called)
voiceMetrics.cleanup();
```

## Integration Points

### Client-Side (WebRTCVoiceClient)

1. **Connection Lifecycle**
   - Session creation when connection starts
   - Latency breakdown for each connection step
   - First transcript timing

2. **Error Handling**
   - Reconnection attempts with backoff delays
   - Session failures with categorized reasons

### Server-Side (normalizeVoiceSession middleware)

1. **Configuration Processing**
   - Parameter normalization events
   - Fallback chain tracking
   - Processing time measurement

## Monitoring and Analysis

### Structured Logging

All metrics are emitted as structured JSON logs:

```json
{
  "level": "info",
  "message": "Voice metrics: voice.session.created",
  "event": "voice.session.created",
  "timestamp": "2023-09-20T10:30:00.000Z",
  "sessionId": "voice_abc123_def456",
  "restaurantId": "restaurant-123",
  "mode": "customer",
  "hasMenuContext": true
}
```

### Key Performance Indicators (KPIs)

1. **Connection Success Rate**
   - Ratio of successful connections to attempts
   - Average connection latency

2. **Voice Processing Performance**
   - Time to first transcript (TTF)
   - Session duration and completion rates

3. **Error Patterns**
   - Most common failure reasons
   - Reconnection success rates by error type

4. **Configuration Effectiveness**
   - Parameter normalization frequency
   - Impact of fallback configurations

### Production Aggregation

```bash
# Example log aggregation queries

# Average connection latency
cat app.log | grep "voice.session.connect_latency" | jq '.latencyMs' | awk '{sum+=$1} END {print sum/NR}'

# Most common failure reasons
cat app.log | grep "voice.session.fail" | jq -r '.reason' | sort | uniq -c

# Time to first transcript percentiles
cat app.log | grep "voice.session.ttf" | jq '.ttfMs' | sort -n
```

## Privacy and Security

### No PII Collection

The metrics system is designed to avoid collecting personally identifiable information:

- ✅ Session IDs (generated, not user-derived)
- ✅ Restaurant IDs (business identifiers)
- ✅ Performance timings
- ✅ Error categories and technical details
- ❌ User names, emails, or personal data
- ❌ Actual transcript content
- ❌ Voice recordings or audio data

### Data Retention

- Session tracking data is automatically cleaned up after 1 hour
- Only performance and error metrics are logged permanently
- No sensitive business data is included in metrics

## Development and Testing

### Running Tests

```bash
# Run voice metrics tests
npx vitest run shared/utils/__tests__/voice-metrics.test.ts

# Run metrics demonstration
npx ts-node docs/voice/metrics-example.ts
```

### Adding New Metrics

1. **Define the metric interface** in `voice-metrics.ts`
2. **Add the emission method** to the VoiceMetrics class
3. **Integrate at the appropriate lifecycle point**
4. **Add tests** to verify the metric is emitted correctly
5. **Update this documentation**

### Example Integration

```typescript
// Add to existing lifecycle event
voiceMetrics.customEvent({
  sessionId: this.sessionId,
  eventType: 'transcript_received',
  metadata: {
    length: transcript.length,
    confidence: transcript.confidence,
    processingTimeMs: Date.now() - startTime
  }
});
```

## Troubleshooting

### Common Issues

1. **Missing Metrics in Logs**
   - Check that the session ID is properly generated
   - Verify the metrics are emitted at the right lifecycle points
   - Ensure console.log is not being filtered

2. **Inconsistent Session Tracking**
   - Sessions should use the same ID throughout their lifecycle
   - Check for session ID regeneration on reconnection

3. **Memory Leaks**
   - The cleanup() method should run periodically
   - Monitor session tracking map size in long-running processes

### Debug Mode

```typescript
// Enable debug logging
const voiceMetrics = VoiceMetrics.getInstance();
// All metrics will be logged to console with detailed information
```

## Future Enhancements

1. **Metric Aggregation**
   - Add built-in aggregation for common KPIs
   - Support for metric exporters (Prometheus, etc.)

2. **Real-time Monitoring**
   - WebSocket-based metric streaming
   - Dashboard integration for live monitoring

3. **Advanced Analytics**
   - Correlation analysis between metrics
   - Anomaly detection for performance issues

4. **Custom Metric Types**
   - Business-specific metrics (order accuracy, etc.)
   - Integration with restaurant analytics systems