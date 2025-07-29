import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceControl from './VoiceControl';
import { useToast } from '@/hooks/useToast';
import { useRestaurant } from '@/core/restaurant-hooks';

// Mock dependencies
vi.mock('@/hooks/useToast');
vi.mock('@/core/restaurant-hooks');

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockMediaStream = {
  getTracks: vi.fn(() => [
    { stop: vi.fn() }
  ])
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock navigator.permissions
const mockPermissionStatus = {
  state: 'prompt',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockPermissionsQuery = vi.fn();

Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: mockPermissionsQuery,
  },
});

// Mock MediaRecorder
const mockMediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
}));
(mockMediaRecorder as unknown as { isTypeSupported: vi.Mock }).isTypeSupported = vi.fn().mockReturnValue(true);
global.MediaRecorder = mockMediaRecorder as unknown as typeof MediaRecorder;

// Mock WebSocket
let mockWebSocket: any;

const createMockWebSocket = () => {
  const ws = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: WebSocket.CONNECTING,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  };
  return ws;
};

global.WebSocket = vi.fn().mockImplementation(() => {
  mockWebSocket = createMockWebSocket();
  return mockWebSocket;
}) as unknown as typeof WebSocket;

describe('VoiceControl', () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const mockRestaurant = {
    id: 'test-restaurant-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useToast as vi.Mock).mockReturnValue({ toast: mockToast });
    (useRestaurant as vi.Mock).mockReturnValue({ restaurant: mockRestaurant });
    mockPermissionsQuery.mockResolvedValue(mockPermissionStatus);
    mockPermissionStatus.state = 'prompt';
    // Reset WebSocket mock
    mockWebSocket = undefined;
    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Permission Guard', () => {
    it('renders "Enable microphone" button when permission state is "prompt"', async () => {
      render(<VoiceControl />);
      
      await waitFor(() => {
        expect(screen.getByText('Enable microphone')).toBeInTheDocument();
      });
    });

    it('shows microphone denied message when permission is denied', async () => {
      mockPermissionStatus.state = 'denied';
      
      render(<VoiceControl />);
      
      await waitFor(() => {
        expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
        expect(screen.getByText('Please enable microphone permissions in your browser settings')).toBeInTheDocument();
      });
    });

    it('requests microphone permission when "Enable microphone" is clicked', async () => {
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);
      
      render(<VoiceControl />);
      
      await waitFor(() => {
        expect(screen.getByText('Enable microphone')).toBeInTheDocument();
      });
      
      const enableButton = screen.getByText('Enable microphone');
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      });
    });

    it('shows voice control after permission is granted', async () => {
      mockPermissionStatus.state = 'granted';
      
      render(<VoiceControl />);
      
      await waitFor(() => {
        expect(screen.getByText('HOLD ME')).toBeInTheDocument();
      });
    });
  });

  describe('Voice Recording', () => {
    beforeEach(() => {
      mockPermissionStatus.state = 'granted';
    });

    it.skip('shows connection status indicator', async () => {
      // TODO(luis): enable when Playwright pipeline runs - needs real WebSocket
      const { act } = await import('@testing-library/react');
      
      // Mock navigator.permissions.query to resolve immediately with granted
      (global.navigator as any).permissions = {
        query: vi.fn().mockResolvedValue(mockPermissionStatus)
      };
      
      render(<VoiceControl />);
      
      // Wait for permission check and component to render
      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });
      
      // Initially should show connecting
      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
      
      // Simulate WebSocket connection
      await act(async () => {
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen(new Event('open'));
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Voice Ready')).toBeInTheDocument();
      });
    });

    it('starts recording when button is pressed', async () => {
      const { act } = await import('@testing-library/react');
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);
      
      render(<VoiceControl />);
      
      // Simulate WebSocket connection
      await act(async () => {
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen(new Event('open'));
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Voice Ready')).toBeInTheDocument();
      });
      
      const button = screen.getByText('HOLD ME');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1,
          } 
        });
      });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start_recording' }));
    });

    it('stops recording when button is released', async () => {
      const { act } = await import('@testing-library/react');
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);
      
      render(<VoiceControl />);
      
      // Simulate WebSocket connection
      await act(async () => {
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen(new Event('open'));
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Voice Ready')).toBeInTheDocument();
      });
      
      const button = screen.getByText('HOLD ME');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const mediaRecorder = mockMediaRecorder.mock.results[0].value;
      
      // Simulate MediaRecorder starting
      mediaRecorder.state = 'recording';
      
      await act(async () => {
        fireEvent.mouseUp(button);
      });
      
      expect(mediaRecorder.stop).toHaveBeenCalled();
    });

    it('handles transcription results from WebSocket', async () => {
      const { act } = await import('@testing-library/react');
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);
      
      const onTranscript = vi.fn();
      render(<VoiceControl onTranscript={onTranscript} />);
      
      // Simulate WebSocket connection
      await act(async () => {
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen(new Event('open'));
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Voice Ready')).toBeInTheDocument();
      });
      
      // Simulate transcription message
      const transcriptionMessage = {
        type: 'transcription',
        text: 'One coffee please',
        final: true,
      };
      
      await act(async () => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', {
            data: JSON.stringify(transcriptionMessage),
          }));
        }
      });
      
      expect(onTranscript).toHaveBeenCalledWith('One coffee please', true);
    });

    it('creates an order from transcription result', async () => {
      const { act } = await import('@testing-library/react');
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ name: 'Coffee', quantity: 1 }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'order-123' }),
        });
      
      render(<VoiceControl />);
      
      // Simulate WebSocket connection
      await act(async () => {
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen(new Event('open'));
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Voice Ready')).toBeInTheDocument();
      });
      
      // Simulate transcription result message
      const transcriptionResult = {
        type: 'transcription_result',
        text: 'One coffee please',
        success: true,
      };
      
      await act(async () => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', {
            data: JSON.stringify(transcriptionResult),
          }));
        }
      });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/ai/parse-order', expect.any(Object));
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/orders', expect.any(Object));
        expect(mockToast.success).toHaveBeenCalledWith('Order created!');
      });
    });

    it.skip('disables button when WebSocket is not connected', async () => {
      // TODO(luis): enable when Playwright pipeline runs - needs real WebSocket
      const { act: _act } = await import('@testing-library/react');
      
      // Mock navigator.permissions.query to resolve immediately with granted
      (global.navigator as any).permissions = {
        query: vi.fn().mockResolvedValue(mockPermissionStatus)
      };
      
      // Create a WebSocket that starts closed
      global.WebSocket = vi.fn().mockImplementation(() => {
        mockWebSocket = {
          send: vi.fn(),
          close: vi.fn(),
          readyState: WebSocket.CLOSED,
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
        };
        // Immediately trigger onclose after creation
        setTimeout(() => {
          if (mockWebSocket.onclose) {
            mockWebSocket.onclose(new CloseEvent('close'));
          }
        }, 0);
        return mockWebSocket;
      }) as unknown as typeof WebSocket;
      
      render(<VoiceControl />);
      
      // Wait for disconnected status to appear
      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
      
      // Button should be disabled when disconnected
      const button = screen.getByText('HOLD ME');
      expect(button.parentElement).toBeDisabled();
      
      // Reset WebSocket mock
      global.WebSocket = vi.fn().mockImplementation(() => {
        mockWebSocket = createMockWebSocket();
        return mockWebSocket;
      }) as unknown as typeof WebSocket;
    });
  });

  describe('First Press Callback', () => {
    it('calls onFirstPress when isFirstPress is true', async () => {
      const { act } = await import('@testing-library/react');
      mockPermissionStatus.state = 'granted';
      const onFirstPress = vi.fn();
      
      render(<VoiceControl isFirstPress={true} onFirstPress={onFirstPress} />);
      
      // Simulate WebSocket connection
      await act(async () => {
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen(new Event('open'));
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('Voice Ready')).toBeInTheDocument();
      });
      
      const button = screen.getByText('HOLD ME');
      fireEvent.mouseDown(button);
      
      expect(onFirstPress).toHaveBeenCalled();
    });
  });
});