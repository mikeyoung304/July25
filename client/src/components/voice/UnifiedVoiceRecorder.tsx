import React, { useState, useCallback, useEffect } from 'react';
import { useAudioCapture } from '@/modules/voice/hooks/useAudioCapture';
import { useVoiceSocket } from '@/modules/voice/hooks/useVoiceSocket';
import { MicrophonePermission } from '@/modules/voice/components/MicrophonePermission';
import { ConnectionIndicator } from '@/modules/voice/components/ConnectionIndicator';
import { RecordingIndicator } from '@/modules/voice/components/RecordingIndicator';
import { TranscriptionDisplay } from '@/modules/voice/components/TranscriptionDisplay';
import { RealtimeTranscription } from '@/modules/voice/components/RealtimeTranscription';
import { UnifiedRecordButton } from './UnifiedRecordButton';
import { AlertCircle, Zap, ZapOff } from 'lucide-react';
import { cn } from '@/utils';

export interface UnifiedVoiceRecorderProps {
  // Core functionality
  mode?: 'hold-to-talk' | 'tap-to-toggle';
  onTranscriptionComplete?: (transcript: string) => void;
  onOrderProcessed?: (result: unknown) => void;
  
  // Feature flags
  showConnectionStatus?: boolean;
  showTranscription?: boolean;
  showRecordingIndicator?: boolean;
  autoProcessOrder?: boolean;
  enableStreaming?: boolean; // NEW: Enable real-time streaming mode
  
  // Customization
  className?: string;
  buttonClassName?: string;
  transcriptionClassName?: string;
  
  // Audio settings
  audioConfig?: {
    sampleRate?: number;
    channelCount?: number;
  };
  
  // Streaming settings
  streamingConfig?: {
    chunkSize?: number; // Chunk size in milliseconds (default 500)
    showRealtimeTranscription?: boolean;
    enableTypingEffect?: boolean;
    confidenceThreshold?: number;
  };
}

export const UnifiedVoiceRecorder: React.FC<UnifiedVoiceRecorderProps> = ({
  mode = 'tap-to-toggle',
  onTranscriptionComplete,
  onOrderProcessed,
  showConnectionStatus = true,
  showTranscription = true,
  showRecordingIndicator = true,
  autoProcessOrder = false,
  enableStreaming = false, // NEW: Default to false for now
  className,
  buttonClassName,
  transcriptionClassName,
  audioConfig,
  streamingConfig = {
    chunkSize: 500,
    showRealtimeTranscription: true, 
    enableTypingEffect: true,
    confidenceThreshold: 0.7
  },
}) => {
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // NEW: Streaming state management
  const [streamingMode, setStreamingMode] = useState(enableStreaming);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [transcriptConfidence, setTranscriptConfidence] = useState(1);
  const [isFinalTranscript, setIsFinalTranscript] = useState(false);
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);

  // Import mock streaming service for UI development
  const [mockStreamingService, setMockStreamingService] = useState<unknown>(null);

  // Initialize mock streaming service
  useEffect(() => {
    if (streamingMode && !mockStreamingService) {
      import('@/services/mock/MockStreamingService').then(({ mockStreamingService }) => {
        setMockStreamingService(mockStreamingService);
      });
    }
  }, [streamingMode, mockStreamingService]);

  // Handle real-time transcription updates
  const handleTranscriptionUpdate = useCallback((text: string, confidence: number, isFinal: boolean) => {
    setRealtimeTranscript(text);
    setTranscriptConfidence(confidence);
    setIsFinalTranscript(isFinal);
    
    if (isFinal) {
      setTranscript(text);
      setIsProcessing(false);
      onTranscriptionComplete?.(text);
    }
  }, [onTranscriptionComplete]);

  // Use existing hooks
  const audioCapture = useAudioCapture({
    onTranscription: (text: string, isInterim: boolean) => {
      if (!isInterim) {
        setTranscript(text);
        setIsProcessing(false);
        onTranscriptionComplete?.(text);
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      setIsProcessing(false);
    },
  });

  const socket = useVoiceSocket({
    url: 'ws://localhost:3001/voice-stream',
    onMessage: (message: { type: string; [key: string]: unknown }) => {
      if (message.type === 'transcription') {
        const text = message.text as string;
        setTranscript(text);
        setIsProcessing(false);
        
        if (onTranscriptionComplete) {
          onTranscriptionComplete(text);
        }
      } else if (message.type === 'order_result') {
        if (onOrderProcessed) {
          onOrderProcessed(message.result);
        }
      }
    },
    onConnectionChange: (status: string) => {
      if (status === 'error') {
        setError('Connection failed');
        setIsProcessing(false);
      }
    },
  });

  // Connect WebSocket on mount
  useEffect(() => {
    // WebSocket connection is handled by the hook
    return () => {
      // Cleanup is handled by the hook
    };
  }, []); // Remove socket dependency to avoid infinite re-renders

  // Handle recording state changes
  const handleRecordingStart = useCallback(() => {
    setError(null);
    setTranscript('');
    setIsProcessing(true);
    
    // Clear streaming state
    setRealtimeTranscript('');
    setTranscriptConfidence(1);
    setIsFinalTranscript(false);
    
    if (streamingMode && mockStreamingService) {
      // Start streaming mode
      const sessionId = `stream-${Date.now()}-${Math.random()}`;
      setStreamingSessionId(sessionId);
      
      // Start mock streaming after short delay to simulate connection
      setTimeout(() => {
        if (mockStreamingService && typeof (mockStreamingService as any).startMockStreaming === 'function') {
          (mockStreamingService as any).startMockStreaming(
            sessionId,
            (update: { text: string; confidence: number; isFinal: boolean }) => {
              handleTranscriptionUpdate(update.text, update.confidence, update.isFinal);
            }
          );
        }
      }, 300);
    }
    
    audioCapture.startRecording();
  }, [audioCapture, streamingMode, mockStreamingService, handleTranscriptionUpdate]);

  const handleRecordingStop = useCallback(() => {
    audioCapture.stopRecording();
    
    if (streamingMode && mockStreamingService && streamingSessionId) {
      // Stop mock streaming
      if (typeof (mockStreamingService as any).stopMockStreaming === 'function') {
        (mockStreamingService as any).stopMockStreaming();
      }
      setStreamingSessionId(null);
    }
  }, [audioCapture, streamingMode, mockStreamingService, streamingSessionId]);

  // Toggle streaming mode
  const toggleStreamingMode = useCallback(() => {
    setStreamingMode(prev => !prev);
    setError(null);
    setTranscript('');
    setRealtimeTranscript('');
  }, []);

  // Clear transcript after a delay
  useEffect(() => {
    if (transcript && !audioCapture.isRecording) {
      const timer = setTimeout(() => {
        setTranscript('');
      }, 10000); // Clear after 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [transcript, audioCapture.isRecording]);

  // Handle recording state changes
  const handleRecordingToggle = useCallback(() => {
    if (audioCapture.isRecording) {
      handleRecordingStop();
    } else {
      handleRecordingStart();
    }
  }, [audioCapture.isRecording, handleRecordingStart, handleRecordingStop]);

  // Handle hold-to-talk mode
  const handleRecordingStartHold = useCallback(() => {
    handleRecordingStart();
  }, [handleRecordingStart]);

  const handleRecordingStopHold = useCallback(() => {
    handleRecordingStop();
  }, [handleRecordingStop]);

  // Determine if we should show streaming controls
  const showStreamingControls = enableStreaming && !streamingMode;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Connection Status */}
      {showConnectionStatus && (
        <ConnectionIndicator 
          status={socket.connectionStatus}
        />
      )}

      {/* Recording Controls */}
      <div className="flex flex-col gap-3">
        {/* Main Record Button */}
        <UnifiedRecordButton
          mode={mode}
          isRecording={audioCapture.isRecording}
          isProcessing={isProcessing}
          onStart={handleRecordingStartHold}
          onStop={handleRecordingStopHold}
          onToggle={handleRecordingToggle}
          className={buttonClassName}
        />

        {/* Streaming Mode Toggle */}
        {showStreamingControls && (
          <button
            onClick={toggleStreamingMode}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            <Zap className="h-4 w-4" />
            Enable Real-time Streaming
          </button>
        )}

        {/* Recording Indicator */}
        {showRecordingIndicator && audioCapture.isRecording && (
          <RecordingIndicator />
        )}
      </div>

      {/* Transcription Display */}
      {showTranscription && (
        <div className={cn('space-y-2', transcriptionClassName)}>
          {/* Real-time Transcription (Streaming Mode) */}
          {streamingMode && streamingConfig.showRealtimeTranscription && (
            <RealtimeTranscription
              text={realtimeTranscript}
              confidence={transcriptConfidence}
              isFinal={isFinalTranscript}
              enableTypingEffect={streamingConfig.enableTypingEffect}
            />
          )}

          {/* Final Transcription */}
          {transcript && (
            <TranscriptionDisplay
              text={transcript}
              isProcessing={isProcessing}
            />
          )}
        </div>
      )}

      {/* Microphone Permission */}
      <MicrophonePermission 
        status={audioCapture.permissionStatus}
      />
    </div>
  );
};