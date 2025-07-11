import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/utils';

interface VoiceControlProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAudioData?: (audioData: Blob) => void;
  isFirstPress?: boolean;
  onFirstPress?: () => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const VoiceControl: React.FC<VoiceControlProps> = ({
  onTranscript,
  onAudioData,
  isFirstPress = true,
  onFirstPress,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection management
  useEffect(() => {
    let shouldReconnect = true;
    
    const connectWebSocket = () => {
      if (!shouldReconnect) return;
      
      setConnectionStatus('connecting');
      const ws = new WebSocket('ws://localhost:3002/voice-stream');
      
      ws.onopen = () => {
        console.log('Voice WebSocket connected');
        setConnectionStatus('connected');
        
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          
          switch (data.type) {
            case 'connected':
              console.log('Voice stream ready:', data.message);
              break;
              
            case 'transcription':
              if (onTranscript) {
                onTranscript(data.text, data.final);
              }
              setIsProcessing(false);
              break;
              
            case 'progress':
              console.log(`Audio progress: ${data.bytesReceived} bytes`);
              break;
              
            case 'error':
              console.error('Voice error:', data.message);
              setIsProcessing(false);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        // Attempt reconnection after 3 seconds
        if (shouldReconnect && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };
      
      wsRef.current = ws;
    };
    
    // Connect immediately
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      shouldReconnect = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [onTranscript]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Send start recording message
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'start_recording' }));
      }
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunks via WebSocket for streaming
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (onAudioData) {
          onAudioData(audioBlob);
        }
        
        // Send stop recording message
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop_recording' }));
          setIsProcessing(true);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      };
      
      mediaRecorder.start(100); // Send data every 100ms for streaming
      setIsListening(true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, [onAudioData]);

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
    if (connectionStatus !== 'connected') {
      console.warn('WebSocket not connected. Current status:', connectionStatus);
      alert('Voice service is not connected. Please wait a moment and try again.');
      return;
    }
    
    startRecording();
  }, [isFirstPress, onFirstPress, startRecording, connectionStatus]);

  const handleMouseUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown();
  }, [handleMouseDown]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
      
      <button
        className={cn(
          'relative w-48 h-48 rounded-full text-lg font-bold text-white transition-all duration-300',
          'hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-4',
          'focus:outline-none focus:ring-4 focus:ring-offset-2',
          isListening 
            ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] hover:bg-red-600 focus:ring-red-500' 
            : 'bg-blue-500 shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:bg-blue-600 focus:ring-blue-500',
          isProcessing && 'animate-pulse',
          connectionStatus !== 'connected' && 'opacity-50 cursor-not-allowed'
        )}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={connectionStatus !== 'connected'}
      >
        <Mic className="w-10 h-10" />
        <span>
          {isListening ? 'LISTENING...' : 
           isProcessing ? 'PROCESSING...' : 
           'HOLD ME'}
        </span>
      </button>
    </div>
  );
};

export default VoiceControl;