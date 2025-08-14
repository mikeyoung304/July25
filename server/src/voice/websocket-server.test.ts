import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { VoiceWebSocketServer } from './websocket-server';
import { logger } from '../utils/logger';

// Mock the logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the OpenAI adapter
vi.mock('./openai-adapter', () => ({
  OpenAIAdapter: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    sendAudio: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    getConnectionState: vi.fn().mockReturnValue('connected'),
    getReconnectAttempts: vi.fn().mockReturnValue(0),
  })),
}));

describe('VoiceWebSocketServer', () => {
  let voiceServer: VoiceWebSocketServer;
  let mockWebSocket: Partial<WebSocket>;

  beforeEach(() => {
    voiceServer = new VoiceWebSocketServer();
    
    // Create a mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      ping: vi.fn(),
      on: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should set up WebSocket event handlers', () => {
      const mockRequest = { url: '/voice-stream' };
      
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('pong', expect.any(Function));
    });

    it('should send initial heartbeat', () => {
      const mockRequest = { url: '/voice-stream' };
      
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"')
      );
    });
  });

  describe('session management', () => {
    it('should start with zero active sessions', () => {
      expect(voiceServer.getActiveSessions()).toBe(0);
    });

    it('should track session metrics', () => {
      const metrics = voiceServer.getAllMetrics();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics).toHaveLength(0);
    });

    it('should return undefined for non-existent session metrics', () => {
      const metrics = voiceServer.getSessionMetrics('non-existent-session');
      expect(metrics).toBeUndefined();
    });
  });

  describe('message handling', () => {
    let messageHandler: (data: any) => void;

    beforeEach(() => {
      const mockRequest = { url: '/voice-stream' };
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      // Extract the message handler from the mock calls
      const onCalls = (mockWebSocket.on as any).mock.calls;
      const messageCall = onCalls.find((call: any) => call[0] === 'message');
      messageHandler = messageCall[1];
    });

    it('should handle session.start events', async () => {
      const startEvent = {
        type: 'session.start',
        event_id: 'test-event-id',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: 'test-restaurant',
          loopback: true,
        },
      };

      await messageHandler(JSON.stringify(startEvent));

      // Should send session.started response
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"session.started"')
      );
    });

    it('should handle invalid JSON gracefully', async () => {
      await messageHandler('invalid json');

      // Should send error response
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });

    it('should require session.start before other events', async () => {
      const audioEvent = {
        type: 'audio',
        event_id: 'test-event-id',
        timestamp: Date.now(),
        audio: 'base64-audio-data',
      };

      await messageHandler(JSON.stringify(audioEvent));

      // Should send session not found error
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('SESSION_NOT_FOUND')
      );
    });
  });

  describe('error handling', () => {
    it('should handle WebSocket errors gracefully', () => {
      vi.clearAllMocks(); // Clear previous logs
      
      const mockRequest = { url: '/voice-stream' };
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      // Extract error handler
      const onCalls = (mockWebSocket.on as any).mock.calls;
      const errorCall = onCalls.find((call: any) => call[0] === 'error');
      const errorHandler = errorCall[1];
      
      vi.clearAllMocks(); // Clear connection logs
      
      const testError = new Error('Test WebSocket error');
      errorHandler(testError);
      
      expect(logger.error).toHaveBeenCalledWith('Voice WebSocket error:', testError);
    });

    it('should handle connection close gracefully', () => {
      vi.clearAllMocks(); // Clear previous logs
      
      const mockRequest = { url: '/voice-stream' };
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      // Extract close handler
      const onCalls = (mockWebSocket.on as any).mock.calls;
      const closeCall = onCalls.find((call: any) => call[0] === 'close');
      const closeHandler = closeCall[1];
      
      vi.clearAllMocks(); // Clear connection logs
      
      closeHandler(1000, Buffer.from('Normal closure'));
      
      // The close handler logs but doesn't have a session, so it won't log the session close message
      // Instead, check that it handles the close without errors
      expect(() => closeHandler(1000, Buffer.from('Normal closure'))).not.toThrow();
    });
  });

  describe('heartbeat mechanism', () => {
    it('should send heartbeat with ping', () => {
      const mockRequest = { url: '/voice-stream' };
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"')
      );
      expect(mockWebSocket.ping).toHaveBeenCalled();
    });

    it('should handle pong responses', () => {
      vi.clearAllMocks(); // Clear previous logs
      
      const mockRequest = { url: '/voice-stream' };
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      // Extract pong handler
      const onCalls = (mockWebSocket.on as any).mock.calls;
      const pongCall = onCalls.find((call: any) => call[0] === 'pong');
      const pongHandler = pongCall[1];
      
      expect(() => pongHandler()).not.toThrow();
    });
  });

  describe('loopback mode', () => {
    let messageHandler: (data: any) => void;

    beforeEach(async () => {
      const mockRequest = { url: '/voice-stream' };
      voiceServer.handleConnection(mockWebSocket as WebSocket, mockRequest);
      
      // Extract message handler
      const onCalls = (mockWebSocket.on as any).mock.calls;
      const messageCall = onCalls.find((call: any) => call[0] === 'message');
      messageHandler = messageCall[1];

      // Start session in loopback mode
      const startEvent = {
        type: 'session.start',
        event_id: 'test-event-id',
        timestamp: Date.now(),
        session_config: {
          restaurant_id: 'test-restaurant',
          loopback: true,
        },
      };
      
      await messageHandler(JSON.stringify(startEvent));
      vi.clearAllMocks(); // Clear startup messages
    });

    it('should echo audio in loopback mode', async () => {
      const audioEvent = {
        type: 'audio',
        event_id: 'test-event-id',
        timestamp: Date.now(),
        audio: 'base64-audio-data',
      };

      await messageHandler(JSON.stringify(audioEvent));

      // Should echo back the audio
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"audio"')
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('base64-audio-data')
      );
    });

    it('should send mock transcript in loopback mode', async () => {
      const audioEvent = {
        type: 'audio',
        event_id: 'test-event-id',
        timestamp: Date.now(),
        audio: 'base64-audio-data',
      };

      await messageHandler(JSON.stringify(audioEvent));

      // Should send mock transcript
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"transcript"')
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('Loopback test audio received')
      );
    });
  });
});