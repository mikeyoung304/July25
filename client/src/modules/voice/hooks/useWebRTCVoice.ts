import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCVoiceClient, ConnectionState, TranscriptEvent, OrderEvent } from '../services/WebRTCVoiceClient';

export interface UseWebRTCVoiceOptions {
  autoConnect?: boolean;
  debug?: boolean;
  onTranscript?: (transcript: TranscriptEvent) => void;
  onOrderDetected?: (order: OrderEvent) => void;
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
  const { autoConnect: _autoConnect = true, debug = false, onTranscript, onOrderDetected, onError } = options;
  
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
  
  // Initialize client
  useEffect(() => {
    const client = new WebRTCVoiceClient({
      restaurantId,
      userId: undefined, // Can be added later when auth is properly integrated
      debug,
    });
    
    // Set up event listeners
    client.on('connection.change', (state: ConnectionState) => {
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
      
      onTranscript?.(event);
    });
    
    client.on('order.detected', (event: OrderEvent) => {
      // Order detected
      onOrderDetected?.(event);
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
      onError?.(err);
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
      client.disconnect();
      client.removeAllListeners();
      clientRef.current = null;
    };
  }, [debug, onError, onOrderDetected, onTranscript, restaurantId]); // Include all dependencies
  
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
      console.warn('[useWebRTCVoice] Cannot start recording: client not initialized');
      return;
    }
    
    if (connectionState !== 'connected') {
      console.warn('[useWebRTCVoice] Cannot start recording: not connected');
      return;
    }
    
    clientRef.current.startRecording();
  }, [connectionState]);
  
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