import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { setupAIWebSocket } from '../src/ai/websocket';
import { aiService } from '../src/services/ai.service';

// Mock dependencies
vi.mock('../src/services/ai.service', () => ({
  aiService: {
    handleVoiceConnection: vi.fn(),
    processAudioStream: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn().mockResolvedValue({ success: true, text: 'test' }),
  },
}));

vi.mock('../src/utils/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock global metrics
global.voiceMetrics = {
  voiceChunksTotal: { inc: vi.fn() },
  voiceOverrunTotal: { inc: vi.fn() },
  voiceActiveConnections: { inc: vi.fn(), dec: vi.fn() },
};

describe('WebSocket Flow Control', () => {
  let wss: WebSocketServer;
  let mockWs: any;

  beforeEach(() => {
    // Create a mock WebSocket server
    wss = new WebSocketServer({ noServer: true });
    
    // Mock WebSocket client
    mockWs = {
      send: vi.fn(),
      on: vi.fn(),
      close: vi.fn(),
      terminate: vi.fn(),
      connectionId: undefined, // Will be set by handler
      isAlive: true,
      unacknowledgedChunks: 0,
      totalChunksReceived: 0,
      totalBytesReceived: 0,
    };

    // Setup AI WebSocket handlers
    setupAIWebSocket(wss);
  });

  afterEach(() => {
    vi.clearAllMocks();
    wss.close();
  });

  it('should track and send progress for audio chunks', async () => {
    // Simulate connection with voice-stream path
    const request = { url: '/voice-stream' };
    
    // Get the connection handler
    const connectionHandler = (wss as any)._events.connection;
    connectionHandler(mockWs, request);

    // Get the message handler that was registered
    const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1];
    expect(messageHandler).toBeDefined();

    // Send audio data
    const audioData = Buffer.from('audio chunk data');
    await messageHandler(audioData);

    // Should process audio stream
    expect(aiService.processAudioStream).toHaveBeenCalledWith(mockWs.connectionId, audioData);

    // Should send progress message
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'progress',
      bytesReceived: audioData.length,
      totalBytesReceived: audioData.length,
    }));

    // Should track metrics
    expect(global.voiceMetrics.voiceChunksTotal.inc).toHaveBeenCalled();
  });

  it('should detect and handle overrun when too many unacknowledged chunks', async () => {
    const request = { url: '/voice-stream' };
    const connectionHandler = (wss as any)._events.connection;
    connectionHandler(mockWs, request);

    const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1];

    // Set unacknowledged chunks to the limit
    mockWs.unacknowledgedChunks = 3;

    // Send another audio chunk - should trigger overrun
    const audioData = Buffer.from('audio chunk data');
    await messageHandler(audioData);

    // Should send overrun error
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'error',
      message: 'overrun',
      unacknowledgedChunks: 3,
    }));

    // Should NOT process audio
    expect(aiService.processAudioStream).not.toHaveBeenCalled();

    // Should track overrun metric
    expect(global.voiceMetrics.voiceOverrunTotal.inc).toHaveBeenCalled();
  });

  it('should increment and decrement unacknowledged chunks correctly', async () => {
    const request = { url: '/voice-stream' };
    const connectionHandler = (wss as any)._events.connection;
    connectionHandler(mockWs, request);

    const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1];

    // Send first chunk
    const audioData1 = Buffer.from('chunk 1');
    await messageHandler(audioData1);
    
    // After processing, unacknowledged should be 0 (incremented then decremented after progress)
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"progress"'));

    // Send multiple chunks rapidly
    mockWs.send.mockClear();
    const audioData2 = Buffer.from('chunk 2');
    const audioData3 = Buffer.from('chunk 3');
    
    await messageHandler(audioData2);
    await messageHandler(audioData3);

    // Should have sent 2 progress messages
    expect(mockWs.send).toHaveBeenCalledTimes(2);
    
    // All chunks should be processed
    expect(aiService.processAudioStream).toHaveBeenCalledTimes(3);
  });

  it('should handle control messages correctly', async () => {
    const request = { url: '/voice-stream' };
    const connectionHandler = (wss as any)._events.connection;
    connectionHandler(mockWs, request);

    const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1];

    // Send start_recording message
    await messageHandler(JSON.stringify({ type: 'start_recording' }));
    expect(aiService.startRecording).toHaveBeenCalledWith(mockWs.connectionId);
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringMatching(/"type":"recording_started"/));

    // Send stop_recording message
    mockWs.send.mockClear();
    await messageHandler(JSON.stringify({ type: 'stop_recording' }));
    expect(aiService.stopRecording).toHaveBeenCalledWith(mockWs.connectionId);
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'transcription_result',
      success: true,
      text: 'test',
    }));

    // Send ping message
    mockWs.send.mockClear();
    await messageHandler(JSON.stringify({ type: 'ping' }));
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringMatching(/"type":"pong"/));

    // Send pong message (should update isAlive)
    mockWs.isAlive = false;
    await messageHandler(JSON.stringify({ type: 'pong' }));
    expect(mockWs.isAlive).toBe(true);
  });

  it('should track connection metrics', () => {
    const request = { url: '/voice-stream' };
    const connectionHandler = (wss as any)._events.connection;
    
    // Reset metrics calls
    vi.clearAllMocks();
    
    // Connect
    connectionHandler(mockWs, request);
    expect(global.voiceMetrics.voiceActiveConnections.inc).toHaveBeenCalled();

    // Get close handler
    const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')?.[1];
    expect(closeHandler).toBeDefined();

    // Disconnect
    closeHandler();
    expect(global.voiceMetrics.voiceActiveConnections.dec).toHaveBeenCalled();
  });

  it('should handle binary data when not JSON', async () => {
    const request = { url: '/voice-stream' };
    const connectionHandler = (wss as any)._events.connection;
    connectionHandler(mockWs, request);

    const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1];

    // Send invalid JSON that doesn't start with '{'
    await messageHandler('invalid json data');

    // Should process as binary data and send progress
    expect(aiService.processAudioStream).toHaveBeenCalled();
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"progress"'));
  });

  it('should track total bytes received', async () => {
    const request = { url: '/voice-stream' };
    const connectionHandler = (wss as any)._events.connection;
    connectionHandler(mockWs, request);

    const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')?.[1];

    // Send multiple audio chunks
    const chunk1 = Buffer.from('chunk 1');
    const chunk2 = Buffer.from('chunk 2 longer');
    
    await messageHandler(chunk1);
    expect(mockWs.totalBytesReceived).toBe(chunk1.length);
    
    await messageHandler(chunk2);
    expect(mockWs.totalBytesReceived).toBe(chunk1.length + chunk2.length);

    // Progress messages should include total bytes
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'progress',
      bytesReceived: chunk2.length,
      totalBytesReceived: chunk1.length + chunk2.length,
    }));
  });
});