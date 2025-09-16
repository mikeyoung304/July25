/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceMetrics, voiceMetrics } from '../voice-metrics';

describe('VoiceMetrics', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should generate unique session IDs', () => {
    const id1 = voiceMetrics.generateSessionId();
    const id2 = voiceMetrics.generateSessionId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^voice_[a-z0-9]+_[a-z0-9]+$/);
    expect(id2).toMatch(/^voice_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('should emit session created metrics', () => {
    const sessionId = voiceMetrics.generateSessionId();

    voiceMetrics.sessionCreated({
      sessionId,
      restaurantId: 'test-restaurant',
      userId: 'test-user',
      mode: 'customer',
      hasMenuContext: true,
      connectStartTime: Date.now()
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('voice.session.created')
    );
  });

  it('should emit session normalized metrics', () => {
    const sessionId = voiceMetrics.generateSessionId();

    voiceMetrics.sessionNormalized({
      sessionId,
      restaurantId: 'test-restaurant',
      mode: 'customer',
      configSource: {
        temperature: 'default',
        maxTokens: 'request'
      },
      changes: {
        temperature: { from: 0.5, to: 0.6, reason: 'clamped_to_limits' }
      },
      normalizationTimeMs: 15
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('voice.session.normalized')
    );
  });

  it('should emit connection latency metrics', () => {
    const sessionId = voiceMetrics.generateSessionId();
    const startTime = Date.now();

    voiceMetrics.connectLatency({
      sessionId,
      connectStartTime: startTime,
      connectEndTime: startTime + 1500,
      latencyMs: 1500,
      steps: {
        tokenFetch: 500,
        peerConnectionSetup: 200,
        sdpExchange: 600,
        dataChannelReady: 200
      }
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('voice.session.connect_latency')
    );
  });

  it('should emit time to first transcript metrics', () => {
    const sessionId = voiceMetrics.generateSessionId();
    const startTime = Date.now();

    voiceMetrics.timeToFirstTranscript({
      sessionId,
      recordingStartTime: startTime,
      firstTranscriptTime: startTime + 800,
      ttfMs: 800,
      isFinalTranscript: false
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('voice.session.ttf')
    );
  });

  it('should emit reconnection metrics', () => {
    const sessionId = voiceMetrics.generateSessionId();

    voiceMetrics.sessionReconnect({
      sessionId,
      attempt: 2,
      maxAttempts: 3,
      delayMs: 1000,
      reason: 'network_error',
      lastError: 'Connection timeout'
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('voice.session.reconnect')
    );
  });

  it('should emit session failure metrics', () => {
    const sessionId = voiceMetrics.generateSessionId();

    voiceMetrics.sessionFail({
      sessionId,
      reason: 'connection_lost',
      lastError: 'WebSocket connection failed',
      attempts: 3,
      totalDurationMs: 5000
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('voice.session.fail')
    );
  });

  it('should handle session info storage and retrieval', () => {
    const sessionId = voiceMetrics.generateSessionId();
    const sessionData = {
      sessionId,
      restaurantId: 'test-restaurant',
      userId: 'test-user',
      mode: 'customer' as const,
      hasMenuContext: true,
      connectStartTime: Date.now()
    };

    voiceMetrics.sessionCreated(sessionData);

    const retrieved = voiceMetrics.getSessionInfo(sessionId);
    expect(retrieved).toEqual(sessionData);
  });

  it('should clean up old session data', () => {
    const sessionId = voiceMetrics.generateSessionId();
    const oldTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago

    voiceMetrics.sessionCreated({
      sessionId,
      restaurantId: 'test-restaurant',
      mode: 'customer',
      hasMenuContext: false,
      connectStartTime: oldTime
    });

    expect(voiceMetrics.getSessionInfo(sessionId)).toBeDefined();

    voiceMetrics.cleanup();

    expect(voiceMetrics.getSessionInfo(sessionId)).toBeUndefined();
  });

  it('should emit structured logs with correct format', () => {
    const sessionId = voiceMetrics.generateSessionId();

    voiceMetrics.sessionCreated({
      sessionId,
      restaurantId: 'test-restaurant',
      userId: 'test-user',
      mode: 'customer',
      hasMenuContext: true,
      connectStartTime: Date.now()
    });

    // Check that the log was structured correctly
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('voice.session.created');

    // Parse the JSON log to verify structure
    const logData = JSON.parse(logCall);
    expect(logData).toMatchObject({
      level: 'info',
      event: 'voice.session.created',
      sessionId,
      restaurantId: 'test-restaurant',
      userId: 'test-user',
      mode: 'customer'
    });
  });
});