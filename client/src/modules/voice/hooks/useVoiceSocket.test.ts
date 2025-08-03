import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { useVoiceSocket } from './useVoiceSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  sentMessages: any[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a brief delay
    setTimeout(() => {
      if (this.onopen) {
        this.readyState = MockWebSocket.OPEN;
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

global.WebSocket = MockWebSocket as any;

describe('useVoiceSocket', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Capture the WebSocket instance
    (global.WebSocket as any) = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSocket = this as MockWebSocket;
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should connect to WebSocket on mount', async () => {
    const { result } = renderHook(() => 
      useVoiceSocket({
        url: 'ws://localhost:3001/voice-stream',
      })
    );

    expect(result.current.connectionStatus).toBe('connecting');

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle flow control for audio chunks', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => 
      useVoiceSocket({
        url: 'ws://localhost:3001/voice-stream',
        maxUnacknowledgedChunks: 3,
        onMessage,
      })
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Send 3 audio chunks (should succeed)
    const audioChunk = new Blob(['audio data']);
    act(() => {
      expect(result.current.send(audioChunk)).toBe(true);
      expect(result.current.send(audioChunk)).toBe(true);
      expect(result.current.send(audioChunk)).toBe(true);
    });

    expect(mockWebSocket.sentMessages).toHaveLength(3);

    // 4th chunk should be dropped due to flow control
    act(() => {
      expect(result.current.send(audioChunk)).toBe(false);
    });

    expect(mockWebSocket.sentMessages).toHaveLength(3);

    // Simulate progress message to acknowledge chunks
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'progress', bytesReceived: 100 }),
        }));
      }
    });

    expect(onMessage).toHaveBeenCalledWith({ type: 'progress', bytesReceived: 100 });

    // Now we should be able to send another chunk
    act(() => {
      expect(result.current.send(audioChunk)).toBe(true);
    });

    expect(mockWebSocket.sentMessages).toHaveLength(4);
  });

  it('should handle overrun errors', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => 
      useVoiceSocket({
        url: 'ws://localhost:3001/voice-stream',
        onMessage,
      })
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Fill up the bucket
    const audioChunk = new Blob(['audio data']);
    act(() => {
      result.current.send(audioChunk);
      result.current.send(audioChunk);
      result.current.send(audioChunk);
    });

    // Simulate overrun error
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'error', message: 'overrun' }),
        }));
      }
    });

    expect(onMessage).toHaveBeenCalledWith({ type: 'error', message: 'overrun' });

    // After overrun, bucket should be reset and we can send again
    act(() => {
      expect(result.current.send(audioChunk)).toBe(true);
    });
  });

  it('should handle ping/pong messages', async () => {
    const { result: _result } = renderHook(() => 
      useVoiceSocket({
        url: 'ws://localhost:3001/voice-stream',
      })
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Clear sent messages
    mockWebSocket.sentMessages = [];

    // Simulate ping message
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'ping' }),
        }));
      }
    });

    // Should send pong response
    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(JSON.parse(mockWebSocket.sentMessages[0])).toEqual({ type: 'pong' });
  });

  it('should auto-reconnect after disconnection', async () => {
    const onConnectionChange = vi.fn();
    const { result } = renderHook(() => 
      useVoiceSocket({
        url: 'ws://localhost:3001/voice-stream',
        reconnectDelay: 3000,
        onConnectionChange,
      })
    );

    // Wait for initial connection
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(onConnectionChange).toHaveBeenCalledWith('connected');
    onConnectionChange.mockClear();

    // Simulate disconnection
    act(() => {
      mockWebSocket.close();
    });

    expect(result.current.connectionStatus).toBe('disconnected');
    expect(onConnectionChange).toHaveBeenCalledWith('disconnected');

    // Should attempt to reconnect after delay
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('should send JSON messages when connected', async () => {
    const { result } = renderHook(() => 
      useVoiceSocket({
        url: 'ws://localhost:3001/voice-stream',
      })
    );

    // Wait for connection to be established
    await act(async () => {
      mockWebSocket.readyState = 1; // OPEN
      mockWebSocket.onopen?.(new Event('open'));
      vi.advanceTimersByTime(10);
    });

    // Verify connection is established
    expect(result.current.connectionStatus).toBe('connected');

    // Send JSON message
    act(() => {
      const sent = result.current.sendJSON({ type: 'start_recording' });
      expect(sent).toBe(true);
    });

    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(mockWebSocket.sentMessages[0]).toBe('{"type":"start_recording"}');
  });

  it('should not send when disconnected', () => {
    const { result } = renderHook(() => 
      useVoiceSocket({
        url: 'ws://localhost:3001/voice-stream',
      })
    );

    // Before connection
    expect(result.current.connectionStatus).toBe('connecting');
    
    act(() => {
      expect(result.current.send('test')).toBe(false);
      expect(result.current.sendJSON({ type: 'test' })).toBe(false);
    });
  });
});