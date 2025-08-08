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
  onOrderProcessed?: (result: any) => void;
  
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
  const [mockStreamingService, setMockStreamingService] = useState<any>(null);

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
    onRecordingComplete: async (audioBlob) => {
      if (!socket.isConnected) {
        setError('Not connected to server');
        return;
      }
      
      setError(null);
      // Send audio through WebSocket
      socket.sendAudio(audioBlob);
    },
    audioConfig,
  });

  const socket = useVoiceSocket({
    onTranscription: (text) => {
      setTranscript(text);
      setIsProcessing(false);
      
      if (onTranscriptionComplete) {
        onTranscriptionComplete(text);
      }
    },
    onOrderResult: (result) => {
      if (onOrderProcessed) {
        onOrderProcessed(result);
      }
    },
    onError: (error) => {
      setError(error.message);
      setIsProcessing(false);
    },
    autoProcessOrder,
  });

  // Connect WebSocket on mount
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]); // Add socket dependency to ensure proper cleanup

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
        mockStreamingService.startMockStreaming(
          sessionId,
          (update: any) => {
            handleTranscriptionUpdate(update.text, update.confidence, update.isFinal);
          }
        );
      }, 300);
    }
    
    audioCapture.startRecording();
  }, [audioCapture, streamingMode, mockStreamingService, handleTranscriptionUpdate]);

  const handleRecordingStop = useCallback(() => {
    audioCapture.stopRecording();
    
    if (streamingMode && mockStreamingService && streamingSessionId) {
      // Stop mock streaming
      mockStreamingService.stopMockStreaming();
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

  return (
    <MicrophonePermission>
      <div className={cn('unified-voice-recorder', className)}>
        {/* Connection Status */}
        {showConnectionStatus && (
          <div className="mb-4">
            <ConnectionIndicator
              isConnected={socket.isConnected}
              connectionState={socket.connectionState}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Recording Button */}
        <div className="flex flex-col items-center gap-4">
          <UnifiedRecordButton
            mode={mode}
            isRecording={audioCapture.isRecording}
            isConnected={socket.isConnected}
            isProcessing={isProcessing}
            onStart={handleRecordingStart}
            onStop={handleRecordingStop}
            className={buttonClassName}
          />

          {/* Recording Indicator */}
          {showRecordingIndicator && audioCapture.isRecording && (
            <RecordingIndicator />
          )}
        </div>

        {/* Streaming Mode Toggle */}
        <div className="flex justify-center mt-4">
          <button
            onClick={toggleStreamingMode}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              streamingMode
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {streamingMode ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            {streamingMode ? 'Real-time Mode' : 'Standard Mode'}
          </button>
        </div>

        {/* Real-time Transcription Display */}
        {streamingMode && streamingConfig?.showRealtimeTranscription && (
          <div className="mt-6">
            <RealtimeTranscription
              text={realtimeTranscript}
              isFinal={isFinalTranscript}
              isListening={audioCapture.isRecording}
              isProcessing={isProcessing}
              confidence={transcriptConfidence}
              showTypingEffect={streamingConfig.enableTypingEffect}
              className={transcriptionClassName}
              onTranscriptionComplete={onTranscriptionComplete}
            />
          </div>
        )}

        {/* Standard Transcription Display */}
        {!streamingMode && showTranscription && transcript && (
          <div className="mt-6">
            <TranscriptionDisplay
              text={transcript}
              isListening={audioCapture.isRecording}
              className={transcriptionClassName}
            />
          </div>
        )}

        {/* Processing Indicator (Standard Mode Only) */}
        {!streamingMode && isProcessing && !audioCapture.isRecording && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">Processing audio...</p>
          </div>
        )}
      </div>
    </MicrophonePermission>
  );
};