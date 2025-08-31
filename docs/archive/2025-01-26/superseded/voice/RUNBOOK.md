# Voice System Runbook

**Version:** 1.0  
**Last Updated:** August 14, 2025  
**Status:** Operational

## Quick Start

### Prerequisites
- Node.js 18+ with npm
- OpenAI API key configured in `.env`
- Modern browser with microphone support
- Port 3001 available for WebSocket connections

### Environment Setup

1. **Configure Environment Variables**
   ```bash
   # In root .env file
   OPENAI_API_KEY=sk-your-openai-key-here
   ENABLE_VOICE_STREAMING=true
   ```

2. **Start the System**
   ```bash
   # From project root
   npm run dev
   ```
   This starts both client (port 5173) and server (port 3001)

3. **Verify WebSocket Connection**
   ```bash
   # Test WebSocket endpoint
   cd server && npm run test:voice-websocket
   ```

### Testing Procedures

#### Loopback Mode Testing
Perfect for development and CI environments without OpenAI dependency:

```javascript
// Client: Connect in loopback mode
const config = {
  restaurant_id: 'test-restaurant',
  loopback: true  // Enables echo testing
};

// Server echoes audio back + mock transcript
// Use for integration tests and local development
```

#### Integration Testing
```bash
# Run voice-specific tests
cd server && npm test -- --testNamePattern="voice"
cd client && npm test -- --testNamePattern="voice"

# Full integration check
npm run check:integration
```

#### Manual Testing Flow
1. Open kiosk at `http://localhost:5173/kiosk`
2. Click "Start Voice Order" button
3. Grant microphone permission
4. Speak clearly: "I'd like a burger and fries"
5. Verify transcript appears
6. Listen for audio response
7. Check order detection in UI

### Production Deployment

#### Health Checks

**Server Health Endpoint:**
```bash
curl http://localhost:3001/api/v1/health
```

**Voice-Specific Health:**
```bash
curl http://localhost:3001/api/v1/ai/health
```

Expected response:
```json
{
  "status": "healthy",
  "voice_websocket": {
    "active_sessions": 0,
    "uptime_ms": 12345,
    "openai_status": "connected"
  }
}
```

#### Performance Monitoring

**Key Metrics to Monitor:**
- TTFP (Time to First Packet): < 500ms target
- End-to-end latency: < 2000ms target
- Connection uptime: > 99.9% target
- Error rate: < 5% target
- Active sessions count
- Audio dropout rate: < 1% target

**Metrics Collection:**
```bash
# Check session metrics via API
curl http://localhost:3001/api/v1/voice/metrics

# Example response
{
  "active_sessions": 3,
  "total_sessions_today": 45,
  "avg_session_duration_ms": 87000,
  "error_rate_last_hour": 0.02
}
```

#### Load Testing

```bash
# Simulate multiple concurrent voice sessions
cd server && node scripts/voice-load-test.js --concurrent=10 --duration=60
```

### Troubleshooting Guide

#### Connection Issues

**Symptom:** WebSocket connection fails
```
DIAGNOSIS:
1. Check server is running on port 3001
2. Verify no firewall blocking WebSocket upgrades
3. Check browser DevTools Network tab for 101 Switching Protocols

SOLUTIONS:
- Restart server: npm run dev:server
- Clear browser cache and reload
- Check CORS configuration in server/src/server.ts
```

**Symptom:** "Session not found" errors
```
DIAGNOSIS:
Client trying to send audio before session.start

SOLUTION:
Ensure client sends session.start with restaurant_id before audio
```

#### Audio Issues

**Symptom:** No audio capture
```
DIAGNOSIS:
1. Microphone permission denied
2. Audio format incompatibility 
3. Browser audio context suspended

SOLUTIONS:
- Prompt user to grant microphone access
- Check audio pipeline initialization
- Ensure user interaction before starting audio context
- Verify 16kHz PCM16 format support
```

**Symptom:** Poor audio quality
```
DIAGNOSIS:
1. Network latency causing dropouts
2. CPU overload on client
3. Buffer underrun/overflow

SOLUTIONS:
- Adjust frame size (20-40ms range)
- Implement adaptive bitrate
- Monitor client CPU usage
- Check VAD threshold tuning
```

#### Transcription Issues

**Symptom:** Low transcript accuracy
```
DIAGNOSIS:
1. Poor audio quality
2. Background noise
3. Language/accent mismatch
4. OpenAI model overloaded

SOLUTIONS:
- Enable noise suppression in audio capture
- Adjust VAD threshold
- Configure appropriate OpenAI model/voice
- Implement retry logic with backoff
```

**Symptom:** Slow transcription response
```
DIAGNOSIS:
1. OpenAI API latency
2. Network connectivity
3. Rate limiting

SOLUTIONS:
- Monitor OpenAI status page
- Implement connection pooling
- Add circuit breaker pattern
- Check rate limit headers
```

#### Order Processing Issues

**Symptom:** Orders not detected
```
DIAGNOSIS:
1. NLP model not recognizing menu items
2. Transcript quality issues
3. Menu context missing

SOLUTIONS:
- Update menu context in OpenAI instructions
- Improve order detection patterns
- Implement fallback clarification flow
- Add confidence thresholds
```

### Performance Tuning

#### Client-Side Optimization

```javascript
// Audio Pipeline Configuration
const optimizedConfig = {
  sampleRate: 16000,     // Lower for better performance
  frameSize: 25,         // 25ms frames (balance latency/quality)
  vadThreshold: 0.01,    // Tune based on environment noise
  bufferSize: 4096,      // Larger for stability, smaller for latency
};

// Reduce CPU usage
const audioContext = new AudioContext({
  sampleRate: 16000,     // Match capture rate
  latencyHint: 'interactive'
});
```

#### Server-Side Optimization

```javascript
// WebSocket Server Tuning
const wsConfig = {
  heartbeatInterval: 30000,    // 30s heartbeat
  sessionTimeout: 300000,      // 5min session timeout
  maxSessions: 100,            // Limit concurrent sessions
  backpressureThreshold: 10    // Queue size limit
};

// OpenAI Connection Pooling
const openaiConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
};
```

#### Network Optimization

```bash
# Server-side WebSocket compression
ws.on('connection', (socket) => {
  socket.extensions = {
    'permessage-deflate': {
      threshold: 1024,  // Compress messages > 1KB
      concurrencyLimit: 10
    }
  };
});
```

### Monitoring & Alerting

#### Key Alerts to Set Up

1. **High Error Rate**
   - Threshold: > 5% errors in 5 minutes
   - Action: Page on-call engineer

2. **High Latency**
   - Threshold: TTFP > 1000ms for 95th percentile
   - Action: Investigate OpenAI status

3. **Connection Drops**
   - Threshold: > 10 disconnections per minute
   - Action: Check network/server health

4. **Session Queue Full**
   - Threshold: Active sessions > 90% of limit
   - Action: Scale horizontally or increase limits

#### Logging Best Practices

```javascript
// Structured logging for voice events
logger.info('voice.session.started', {
  sessionId,
  restaurantId,
  timestamp: Date.now(),
  clientIP: req.ip,
  userAgent: req.headers['user-agent']
});

logger.warn('voice.audio.quality', {
  sessionId,
  dropoutRate: 0.05,  // 5% dropout
  avgLatency: 250,    // 250ms
  recommendation: 'Check network stability'
});
```

### Disaster Recovery

#### Service Degradation

1. **OpenAI API Unavailable**
   - Fallback: Switch to text-only mode
   - User message: "Voice ordering temporarily unavailable"
   - Auto-retry every 5 minutes

2. **High Latency**
   - Reduce audio quality automatically
   - Increase frame size to reduce overhead
   - Display "Processing..." indicators

3. **Memory/CPU Issues**
   - Implement session limits
   - Graceful session cleanup
   - Circuit breaker for new connections

#### Data Recovery

Voice system is stateless by design:
- No persistent storage of audio data
- Sessions exist only in memory
- Restart server to clear all sessions

### Security Considerations

#### Audio Data Privacy
- Audio never persisted to disk
- Transmitted encrypted (WSS in production)
- Automatic cleanup after session end
- GDPR/CCPA compliant by design

#### API Security
- OpenAI API key rotated monthly
- Rate limiting on WebSocket connections
- Session-based access control
- Input validation on all messages

### Maintenance

#### Regular Tasks
- **Daily**: Check error rates and latencies
- **Weekly**: Review session metrics and patterns  
- **Monthly**: Update dependencies, rotate API keys
- **Quarterly**: Load test and capacity planning

#### Updates
- Test in loopback mode first
- Deploy server-side changes during low traffic
- Client updates via gradual rollout
- Monitor metrics for 24h after deployment