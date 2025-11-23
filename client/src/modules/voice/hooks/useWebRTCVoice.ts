import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCVoiceClient, ConnectionState, TranscriptEvent, OrderEvent } from '../services/WebRTCVoiceClient';
import type { VoiceContext } from '../services/VoiceSessionConfig';
import { logger } from '@/services/logger';

export interface UseWebRTCVoiceOptions {
  autoConnect?: boolean;
  context?: VoiceContext;
  debug?: boolean;
  muteAudioOutput?: boolean;
  onTranscript?: (transcript: TranscriptEvent) => void;
  onOrderDetected?: (order: OrderEvent) => void;
  onError?: (error: Error) => void;
  onTokenRefreshFailed?: () => void;
}

export interface UseWebRTCVoiceReturn {
  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  connectionState: ConnectionState;
  isSessionReady: boolean;  // True when BOTH connected AND session configured

  // Recording
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  isListening: boolean;

  // Data
  transcript: string;
  lastTranscript: TranscriptEvent | null;
  responseText: string;

  // State
  isProcessing: boolean;
  error: Error | null;
}

/**
 * React hook for WebRTC voice integration with OpenAI Realtime API
 */
export function useWebRTCVoice(options: UseWebRTCVoiceOptions = {}): UseWebRTCVoiceReturn {
  const { autoConnect: _autoConnect = true, context, debug = false, muteAudioOutput = false, onTranscript, onOrderDetected, onError, onTokenRefreshFailed } = options;

  // Get restaurant ID from environment or use default
  const restaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'grow';

  const clientRef = useRef<WebRTCVoiceClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastTranscript, setLastTranscript] = useState<TranscriptEvent | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Store callbacks in refs to avoid client re-initialization
  const onTranscriptRef = useRef(onTranscript);
  const onOrderDetectedRef = useRef(onOrderDetected);
  const onErrorRef = useRef(onError);
  const onTokenRefreshFailedRef = useRef(onTokenRefreshFailed);

  // Update callback refs when they change
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onOrderDetectedRef.current = onOrderDetected;
    onErrorRef.current = onError;
    onTokenRefreshFailedRef.current = onTokenRefreshFailed;
  }, [onTranscript, onOrderDetected, onError, onTokenRefreshFailed]);

  // Initialize client ONCE with stable dependencies
  useEffect(() => {
    const client = new WebRTCVoiceClient({
      restaurantId,
      userId: undefined, // Can be added later when auth is properly integrated
      context, // Pass context to configure kiosk vs server mode
      debug,
      muteAudioOutput,
    });

    clientRef.current = client;

    // Cleanup only - listeners attached in separate effect
    return () => {
      client.disconnect();
      client.removeAllListeners();
      clientRef.current = null;
    };
  }, [restaurantId, context, debug, muteAudioOutput]); // Stable deps - client recreated if these change

  // Attach/detach event listeners in separate effect
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    // Define handlers that use refs for callbacks
    const handleConnectionChange = (state: ConnectionState) => {
      setConnectionState(state);
      // Clear any stale text when connection changes
      if (state === 'connected' || state === 'disconnected') {
        setResponseText('');
        setTranscript('');
      }
      // Reset session ready state when disconnected
      if (state === 'disconnected') {
        setIsSessionReady(false);
      }
    };

    const handleSessionConfigured = () => {
      if (debug) logger.debug('[useWebRTCVoice] Session configured - ready for recording');
      setIsSessionReady(true);
    };

    const handleSessionNotReady = () => {
      if (debug) logger.debug('[useWebRTCVoice] Session not ready - still initializing');
    };

    const handleTranscript = (event: TranscriptEvent) => {
      setTranscript(event.text);
      setLastTranscript(event);
      setIsProcessing(false);
      onTranscriptRef.current?.(event);
    };

    const handleOrderDetected = (event: OrderEvent) => {
      onOrderDetectedRef.current?.(event);
    };

    const handleResponseText = (text: string) => {
      if (!text) {
        setResponseText('');
      } else {
        setResponseText(text);
      }
    };

    const handleResponseComplete = () => {
      setIsProcessing(false);
    };

    const handleSpeechStarted = () => {
      setIsProcessing(true);
      setIsListening(true);
      setTranscript('');
      setResponseText('');
    };

    const handleSpeechStopped = () => {
      setIsListening(false);
    };

    const handleRecordingStarted = () => {
      setIsRecording(true);
      setResponseText('');
      setTranscript('');
    };

    const handleRecordingStopped = () => {
      setIsRecording(false);
    };

    const handleError = (err: Error) => {
      console.error('[useWebRTCVoice] Error:', err);
      setError(err);
      setIsProcessing(false);
      onErrorRef.current?.(err);
    };

    const handleTokenRefreshFailed = () => {
      onTokenRefreshFailedRef.current?.();
    };

    // Attach all listeners
    client.on('connection.change', handleConnectionChange);
    client.on('session.configured', handleSessionConfigured);
    client.on('session.not.ready', handleSessionNotReady);
    client.on('transcript', handleTranscript);
    client.on('order.detected', handleOrderDetected);
    client.on('response.text', handleResponseText);
    client.on('response.complete', handleResponseComplete);
    client.on('speech.started', handleSpeechStarted);
    client.on('speech.stopped', handleSpeechStopped);
    client.on('recording.started', handleRecordingStarted);
    client.on('recording.stopped', handleRecordingStopped);
    client.on('error', handleError);
    client.on('token.refresh.failed', handleTokenRefreshFailed);

    // Cleanup: detach all listeners
    return () => {
      client.off('connection.change', handleConnectionChange);
      client.off('session.configured', handleSessionConfigured);
      client.off('session.not.ready', handleSessionNotReady);
      client.off('transcript', handleTranscript);
      client.off('order.detected', handleOrderDetected);
      client.off('response.text', handleResponseText);
      client.off('response.complete', handleResponseComplete);
      client.off('speech.started', handleSpeechStarted);
      client.off('speech.stopped', handleSpeechStopped);
      client.off('recording.started', handleRecordingStarted);
      client.off('recording.stopped', handleRecordingStopped);
      client.off('error', handleError);
      client.off('token.refresh.failed', handleTokenRefreshFailed);
    };
  }, []); // Empty deps - only attach/detach once
  
  // Connect to service
  const connect = useCallback(async () => {
    if (!clientRef.current) {
      throw new Error('Voice client not initialized');
    }
    
    setError(null);
    await clientRef.current.connect();
  }, []);
  
  // Disconnect from service
  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);
  
  // Start recording
  const startRecording = useCallback(() => {
    if (debug) {
      logger.debug('[useWebRTCVoice] startRecording called', {
        hasClient: !!clientRef.current,
        connectionState,
        isSessionReady
      });
    }

    if (!clientRef.current) {
      logger.warn('[useWebRTCVoice] Cannot start recording: client not initialized');
      return;
    }

    if (connectionState !== 'connected') {
      logger.warn('[useWebRTCVoice] Cannot start recording: not connected');
      return;
    }

    if (!isSessionReady) {
      logger.warn('[useWebRTCVoice] Cannot start recording: session not yet configured');
      logger.warn('   Waiting for session.configured event from OpenAI...');
      return;
    }

    if (debug) logger.debug('[useWebRTCVoice] Calling client.startRecording()');
    clientRef.current.startRecording();
  }, [connectionState, isSessionReady, debug]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    clientRef.current?.stopRecording();
  }, []);
  
  return {
    // Connection
    connect,
    disconnect,
    isConnected: connectionState === 'connected',
    connectionState,
    isSessionReady,

    // Recording
    startRecording,
    stopRecording,
    isRecording,
    isListening,

    // Data
    transcript,
    lastTranscript,
    responseText,

    // State
    isProcessing,
    error,
  };
}