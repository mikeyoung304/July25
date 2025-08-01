import React, { useState, useCallback, useEffect } from 'react';
import { useAudioCapture } from '@/modules/voice/hooks/useAudioCapture';
import { useVoiceSocket } from '@/modules/voice/hooks/useVoiceSocket';
import { MicrophonePermission } from '@/modules/voice/components/MicrophonePermission';
import { ConnectionIndicator } from '@/modules/voice/components/ConnectionIndicator';
import { RecordingIndicator } from '@/modules/voice/components/RecordingIndicator';
import { TranscriptionDisplay } from '@/modules/voice/components/TranscriptionDisplay';
import { UnifiedRecordButton } from './UnifiedRecordButton';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  // Customization
  className?: string;
  buttonClassName?: string;
  transcriptionClassName?: string;
  
  // Audio settings
  audioConfig?: {
    sampleRate?: number;
    channelCount?: number;
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
  className,
  buttonClassName,
  transcriptionClassName,
  audioConfig,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
  }, []);

  // Handle recording state changes
  const handleRecordingStart = useCallback(() => {
    setError(null);
    setTranscript('');
    setIsProcessing(true);
    audioCapture.startRecording();
  }, [audioCapture]);

  const handleRecordingStop = useCallback(() => {
    audioCapture.stopRecording();
  }, [audioCapture]);

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

        {/* Transcription Display */}
        {showTranscription && transcript && (
          <div className="mt-6">
            <TranscriptionDisplay
              text={transcript}
              isListening={audioCapture.isRecording}
              className={transcriptionClassName}
            />
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && !audioCapture.isRecording && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">Processing audio...</p>
          </div>
        )}
      </div>
    </MicrophonePermission>
  );
};