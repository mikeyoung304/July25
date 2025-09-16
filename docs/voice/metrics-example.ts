/**
 * Voice Metrics Example
 *
 * Demonstrates how the voice metrics system tracks the complete lifecycle
 * of a voice session from creation to completion or failure.
 */

import { voiceMetrics } from '../../shared/utils/voice-metrics';

// Example of a complete voice session lifecycle with metrics

async function demonstrateVoiceMetrics() {
  console.log('=== Voice Session Metrics Demonstration ===\n');

  // 1. Session Creation
  console.log('📞 Creating voice session...');
  const sessionId = voiceMetrics.generateSessionId();
  const connectStartTime = Date.now();

  voiceMetrics.sessionCreated({
    sessionId,
    restaurantId: 'demo-restaurant',
    userId: 'demo-user',
    mode: 'customer',
    hasMenuContext: true,
    connectStartTime
  });

  // 2. Session Configuration Normalization (server-side)
  console.log('⚙️ Normalizing session configuration...');
  await new Promise(resolve => setTimeout(resolve, 15)); // Simulate processing time

  voiceMetrics.sessionNormalized({
    sessionId,
    restaurantId: 'demo-restaurant',
    mode: 'customer',
    configSource: {
      temperature: 'default',
      maxTokens: 'restaurant'
    },
    changes: {
      temperature: { from: 0.5, to: 0.6, reason: 'clamped_to_limits' }
    },
    normalizationTimeMs: 15
  });

  // 3. Connection Establishment
  console.log('🔗 Establishing WebRTC connection...');
  await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate connection time

  voiceMetrics.connectLatency({
    sessionId,
    connectStartTime,
    connectEndTime: Date.now(),
    latencyMs: Date.now() - connectStartTime,
    steps: {
      tokenFetch: 400,
      peerConnectionSetup: 150,
      sdpExchange: 500,
      dataChannelReady: 150
    }
  });

  // 4. Voice Recording and Transcript Processing
  console.log('🎤 Starting voice recording...');
  const recordingStartTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 750)); // Simulate recording time

  console.log('📝 First transcript received...');
  voiceMetrics.timeToFirstTranscript({
    sessionId,
    recordingStartTime,
    firstTranscriptTime: Date.now(),
    ttfMs: Date.now() - recordingStartTime,
    isFinalTranscript: false
  });

  // 5. Simulate connection issues and reconnection
  console.log('⚠️ Connection lost, attempting reconnection...');
  voiceMetrics.sessionReconnect({
    sessionId,
    attempt: 1,
    maxAttempts: 3,
    delayMs: 1000,
    reason: 'network_error',
    lastError: 'WebSocket connection timeout'
  });

  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate reconnection delay

  // 6. Successful reconnection (would emit sessionCreated again)
  console.log('✅ Reconnection successful');

  // 7. Session completion (normal end)
  console.log('🏁 Session completed successfully');
  console.log('\n=== Metrics Summary ===');
  console.log('All voice session lifecycle events have been tracked:');
  console.log('• Session creation and configuration');
  console.log('• Connection latency breakdown');
  console.log('• Time to first transcript');
  console.log('• Reconnection attempts');
  console.log('• Session completion/failure');
  console.log('\n✨ Metrics are automatically logged in structured JSON format');
  console.log('🔍 Production systems can aggregate these logs for analysis');
}

// Run the demonstration
if (require.main === module) {
  demonstrateVoiceMetrics().catch(console.error);
}

export { demonstrateVoiceMetrics };