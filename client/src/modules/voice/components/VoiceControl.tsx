import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/utils';
import { useToast } from '@/hooks/useToast';
import { useRestaurant } from '@/core/restaurant-hooks';
import { HoldToRecordButton } from './HoldToRecordButton';
import { useVoiceSocket, VoiceSocketMessage } from '../hooks/useVoiceSocket';

interface VoiceControlProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAudioData?: (audioData: Blob) => void;
  isFirstPress?: boolean;
  onFirstPress?: () => void;
}

type PermissionState = 'granted' | 'denied' | 'prompt';

const VoiceControl: React.FC<VoiceControlProps> = ({
  onTranscript,
  onAudioData,
  isFirstPress = true,
  onFirstPress,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { restaurant } = useRestaurant();
  
  // Check microphone permission status
  useEffect(() => {
    let mounted = true;
    
    const checkPermission = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (mounted) {
          setPermissionState(permissionStatus.state as PermissionState);
        }
        
        // Listen for permission changes
        const handleChange = () => {
          if (mounted) {
            setPermissionState(permissionStatus.state as PermissionState);
          }
        };
        
        permissionStatus.addEventListener('change', handleChange);
        
        return () => {
          permissionStatus.removeEventListener('change', handleChange);
        };
      } catch (error) {
        // Fallback for browsers that don't support permissions API
        console.log('Permissions API not supported, will check on user interaction');
      }
    };
    
    checkPermission();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  // Handle transcription result by creating an order
  const handleTranscript = useCallback(async (text: string) => {
    try {
      // Step 1: Parse the order
      const parseResponse = await fetch('/api/v1/ai/parse-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, restaurant_id: restaurant?.id }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse order');
      }

      const parsedOrder = await parseResponse.json();

      // Step 2: Create the order
      const orderResponse = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...parsedOrder,
          restaurant_id: restaurant?.id,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      await orderResponse.json();
      toast.success('Order created!');
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process order');
    }
  }, [restaurant?.id, toast]);

  // WebSocket connection with flow control
  const { connectionStatus, send, sendJSON, isConnected } = useVoiceSocket({
    url: 'ws://localhost:3001/voice-stream',
    maxUnacknowledgedChunks: 3,
    reconnectDelay: 3000,
    onMessage: useCallback((data: VoiceSocketMessage) => {
      switch (data.type) {
        case 'connected':
          console.warn('Voice stream ready:', data.message);
          break;
          
        case 'transcription':
          if (onTranscript) {
            onTranscript(data.text, data.final);
          }
          setIsProcessing(false);
          break;
          
        case 'progress':
          console.warn(`Audio progress: ${data.bytesReceived} bytes`);
          break;
          
        case 'error':
          console.error('Voice error:', data.message);
          if (data.message === 'overrun') {
            toast.error('Audio buffer overflow - please speak more slowly');
          }
          setIsProcessing(false);
          break;
          
        case 'transcription_result':
          if (data.text) {
            if (onTranscript) {
              onTranscript(data.text, true);
            }
            handleTranscript(data.text);
          } else if (!data.success) {
            console.error('Transcription failed:', data.error);
          }
          setIsProcessing(false);
          break;
      }
    }, [onTranscript, handleTranscript, toast]),
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,  // Optimal for speech recognition
          channelCount: 1,    // Mono audio is better for speech
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Send start recording message
      sendJSON({ type: 'start_recording' });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunks via WebSocket with flow control
          const sent = send(event.data);
          if (!sent) {
            console.warn('Audio chunk dropped due to flow control');
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (onAudioData) {
          onAudioData(audioBlob);
        }
        
        // Send stop recording message
        sendJSON({ type: 'stop_recording' });
        setIsProcessing(true);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      };
      
      mediaRecorder.start(100); // Send data every 100ms for streaming
      setIsListening(true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setPermissionState('denied');
      }
      alert('Could not access microphone. Please check permissions.');
    }
  }, [onAudioData, send, sendJSON]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    if (isFirstPress && onFirstPress) {
      onFirstPress();
    }
    
    // Check WebSocket connection before recording
    if (!isConnected) {
      console.warn('WebSocket not connected. Current status:', connectionStatus);
      alert('Voice service is not connected. Please wait a moment and try again.');
      return;
    }
    
    startRecording();
  }, [isFirstPress, onFirstPress, startRecording, isConnected, connectionStatus]);

  const handleMouseUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const _handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown();
  }, [handleMouseDown]);

  const _handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Show permission prompt if needed
  if (permissionState === 'prompt') {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          onClick={async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach(track => track.stop());
              setPermissionState('granted');
            } catch (error) {
              if (error instanceof DOMException && error.name === 'NotAllowedError') {
                setPermissionState('denied');
              }
            }
          }}
        >
          Enable microphone
        </button>
      </div>
    );
  }
  
  // Show denied message
  if (permissionState === 'denied') {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-2">Microphone access denied</p>
        <p className="text-sm text-gray-600">Please enable microphone permissions in your browser settings</p>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Connection status indicator */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
        <span className="text-xs text-gray-600">
          {connectionStatus === 'connected' ? 'Voice Ready' : 
           connectionStatus === 'connecting' ? 'Connecting...' : 
           connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
        </span>
      </div>
      
      <HoldToRecordButton
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        isListening={isListening}
        isProcessing={isProcessing}
        disabled={!isConnected}
      />
    </div>
  );
};

export default VoiceControl;