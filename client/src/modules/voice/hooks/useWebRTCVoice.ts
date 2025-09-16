import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCVoiceClient, ConnectionState, TranscriptEvent, OrderEvent } from '../services/WebRTCVoiceClient';
import { logger } from '../../../services/monitoring/logger';

export interface UseWebRTCVoiceOptions {
  autoConnect?: boolean;
  debug?: boolean;
  mode?: 'employee' | 'customer';
  enableAudioOutput?: boolean;
  visualFeedbackOnly?: boolean;
  onTranscript?: (transcript: TranscriptEvent) => void;
  onOrderDetected?: (order: OrderEvent) => void;
  onOrderConfirmation?: (confirmation: { action: string; timestamp: number }) => void;
  onVisualFeedback?: (feedback: { text: string; isFinal: boolean }) => void;
  onError?: (error: Error) => void;
}

export interface UseWebRTCVoiceReturn {
  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  connectionState: ConnectionState;
  
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
  const {
    autoConnect: _autoConnect = true,
    debug = false,
    mode = 'customer',
    enableAudioOutput,
    visualFeedbackOnly = false,
    onTranscript,
    onOrderDetected,
    onOrderConfirmation,
    onVisualFeedback,
    onError
  } = options;
  
  // Get restaurant ID from environment or use default
  const restaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';
  
  const clientRef = useRef<WebRTCVoiceClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastTranscript, setLastTranscript] = useState<TranscriptEvent | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  // Store callbacks in refs to prevent re-initialization
  const onTranscriptRef = useRef(onTranscript);
  const onOrderDetectedRef = useRef(onOrderDetected);
  const onOrderConfirmationRef = useRef(onOrderConfirmation);
  const onVisualFeedbackRef = useRef(onVisualFeedback);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onOrderDetectedRef.current = onOrderDetected;
    onOrderConfirmationRef.current = onOrderConfirmation;
    onVisualFeedbackRef.current = onVisualFeedback;
    onErrorRef.current = onError;
  }, [onTranscript, onOrderDetected, onOrderConfirmation, onVisualFeedback, onError]);
  
  // Initialize client
  useEffect(() => {
    const client = new WebRTCVoiceClient({
      restaurantId,
      userId: undefined, // Can be added later when auth is properly integrated
      debug,
      mode,
      enableAudioOutput,
      visualFeedbackOnly,
    });
    
    // Set up event listeners
    client.on('connection.change', (state: ConnectionState) => {
      logger.info('[useWebRTCVoice] Connection state changed:', { state });
      setConnectionState(state);
      // Clear any stale text when connection changes
      if (state === 'connected' || state === 'disconnected') {
        setResponseText('');
        setTranscript('');
      }
      // Connection state changed
    });
    
    client.on('transcript', (event: TranscriptEvent) => {
      setTranscript(event.text);
      setLastTranscript(event);
      setIsProcessing(false);
      
      // Transcript received
      
      // Use ref to call callback
      onTranscriptRef.current?.(event);
    });
    
    client.on('order.detected', (event: OrderEvent) => {
      // Order detected
      // Use ref to call callback
      onOrderDetectedRef.current?.(event);
    });
    
    client.on('order.confirmation', (event: { action: string; timestamp: number }) => {
      // Order confirmation (checkout, review, cancel)
      logger.info('[useWebRTCVoice] Order confirmation received:', { action: event.action });
      // Use ref to call callback
      onOrderConfirmationRef.current?.(event);
    });
    
    client.on('response.text', (text: string) => {
      // If empty text, clear the response (signal to reset)
      if (!text) {
        setResponseText('');
      } else {
        // For actual text, replace (not accumulate) to show current state
        setResponseText(text);
      }
    });

    // Handle visual feedback events for employee mode
    client.on('visual-feedback', (feedback: { text: string; isFinal: boolean }) => {
      logger.info('[useWebRTCVoice] Visual feedback received:', feedback);
      onVisualFeedbackRef.current?.(feedback);
    });
    
    client.on('response.complete', () => {
      setIsProcessing(false);
    });
    
    client.on('speech.started', () => {
      setIsProcessing(true);
      setIsListening(true);
      setTranscript(''); // Clear previous transcript
      setResponseText(''); // Clear previous response
      if (debug) {
        // Speech started
      }
    });
    
    client.on('speech.stopped', () => {
      // User stopped speaking, processing will continue
      setIsListening(false);
      if (debug) {
        // Speech stopped
      }
    });
    
    client.on('recording.started', () => {
      setIsRecording(true);
      // Clear any stale responses when starting to record
      setResponseText('');
      setTranscript('');
    });
    
    client.on('recording.stopped', () => {
      setIsRecording(false);
    });
    
    client.on('error', (err: Error) => {
      console.error('[useWebRTCVoice] Error:', err);
      setError(err);
      setIsProcessing(false);
      // Use ref to call callback
      onErrorRef.current?.(err);
    });
    
    // Add handler for session.created to avoid warning
    client.on('session.created', (session: any) => {
      if (debug) {
        logger.info('[useWebRTCVoice] Session created:', { session });
      }
    });
    
    clientRef.current = client;
    
    // Auto-connect is disabled for WebRTC - user must click button
    // if (autoConnect) {
    //   client.connect().catch(err => {
    //     console.error('[useWebRTCVoice] Auto-connect failed:', err);
    //     setError(err);
    //   });
    // }
    
    // Cleanup
    return () => {
      logger.info('[useWebRTCVoice] Cleaning up WebRTC client');
      client.disconnect();
      client.removeAllListeners();
      clientRef.current = null;
    };
  }, [debug, restaurantId, mode]); // Only stable dependencies - callbacks are handled via refs
  
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
    if (!clientRef.current) {
      logger.warn('[useWebRTCVoice] Cannot start recording: client not initialized');
      return;
    }
    
    if (connectionState !== 'connected') {
      logger.warn('[useWebRTCVoice] Cannot start recording: not connected');
      return;
    }
    
    clientRef.current.startRecording();
  }, [connectionState]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    clientRef.current?.stopRecording();
  }, []);
  
  // Compute isConnected and log changes for debugging
  const isConnected = connectionState === 'connected';
  
  // Debug log when isConnected changes
  useEffect(() => {
    logger.info('[useWebRTCVoice] isConnected changed:', { isConnected, connectionState });
  }, [isConnected, connectionState]);
  
  return {
    // Connection
    connect,
    disconnect,
    isConnected,
    connectionState,
    
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