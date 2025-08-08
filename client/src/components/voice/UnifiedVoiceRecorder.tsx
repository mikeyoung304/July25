import React, { useState, useCallback, useEffect } from 'react';
import { useAudioCapture } from '@/modules/voice/hooks/useAudioCapture';
import { useVoiceSocket } from '@/modules/voice/hooks/useVoiceSocket';
import { MicrophonePermission } from '@/modules/voice/components/MicrophonePermission';
import { ConnectionIndicator } from '@/modules/voice/components/ConnectionIndicator';
import { RecordingIndicator } from '@/modules/voice/components/RecordingIndicator';
import { TranscriptionDisplay } from '@/modules/voice/components/TranscriptionDisplay';
import { RealtimeTranscription } from '@/modules/voice/components/RealtimeTranscription';
import { UnifiedRecordButton } from './UnifiedRecordButton';
import { AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/utils';

export interface UnifiedVoiceRecorderProps {
  mode?: 'hold-to-talk' | 'tap-to-toggle';
  onTranscriptionComplete?: (transcript: string) => void;
  onOrderProcessed?: (result: unknown) => void;
  showConnectionStatus?: boolean;
  showTranscription?: boolean;
  showRecordingIndicator?: boolean;
  autoProcessOrder?: boolean;
  enableStreaming?: boolean;
  className?: string;
  buttonClassName?: string;
  transcriptionClassName?: string;
  audioConfig?: { sampleRate?: number; channelCount?: number };
  streamingConfig?: {
    chunkSize?: number;
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
  enableStreaming = false,
  className,
  buttonClassName,
  transcriptionClassName,
  audioConfig,
  streamingConfig = {
    chunkSize: 500,
    showRealtimeTranscription: true,
    enableTypingEffect: true,
    confidenceThreshold: 0.7,
  },
}) => {
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [streamingMode, setStreamingMode] = useState(enableStreaming);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [transcriptConfidence, setTranscriptConfidence] = useState(1);
  const [isFinalTranscript, setIsFinalTranscript] = useState(false);
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);

  const [mockStreamingService, setMockStreamingService] = useState<unknown>(null);

  useEffect(() => {
    if (streamingMode && !mockStreamingService) {
      import('@/services/mock/MockStreamingService').then(({ mockStreamingService }) => {
        setMockStreamingService(mockStreamingService);
      });
    }
  }, [streamingMode, mockStreamingService]);

  const handleTranscriptionUpdate = useCallback(
    (text: string, confidence: number, isFinal: boolean) => {
      setRealtimeTranscript(text);
      setTranscriptConfidence(confidence);
      setIsFinalTranscript(isFinal);

      if (isFinal) {
        setTranscript(text);
        setIsProcessing(false);
        onTranscriptionComplete?.(text);
      }
    },
    [onTranscriptionComplete]
  );

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
        onTranscriptionComplete?.(text);
      } else if (message.type === 'order_result') {
        onOrderProcessed?.(message.result);
      }
    },
    onConnectionChange: (status: string) => {
      if (status === 'error') {
        setError('Connection failed');
        setIsProcessing(false);
      }
    },
  });

  const handleRecordingStart = useCallback(() => {
    setError(null);
    setTranscript('');
    setIsProcessing(true);

    setRealtimeTranscript('');
    setTranscriptConfidence(1);
    setIsFinalTranscript(false);

    if (streamingMode && mockStreamingService) {
      const sessionId = `stream-${Date.now()}-${Math.random()}`;
      setStreamingSessionId(sessionId);

      setTimeout(() => {
        if (
          mockStreamingService &&
          typeof (mockStreamingService as any).startMockStreaming === 'function'
        ) {
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
      if (typeof (mockStreamingService as any).stopMockStreaming === 'function') {
        (mockStreamingService as any).stopMockStreaming();
      }
      setStreamingSessionId(null);
    }
  }, [audioCapture, streamingMode, mockStreamingService, streamingSessionId]);

  useEffect(() => {
    if (transcript && !audioCapture.isRecording) {
      const timer = setTimeout(() => {
        setTranscript('');
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [transcript, audioCapture.isRecording]);

  return (
    <MicrophonePermission status={audioCapture.permissionStatus}>
      <div className={cn('flex flex-col gap-4', className)}>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {showConnectionStatus && (
          <ConnectionIndicator status={socket.connectionStatus} />
        )}

        <div className="flex flex-col gap-3">
          <UnifiedRecordButton
            mode={mode}
            isRecording={audioCapture.isRecording}
            isConnected={socket.isConnected}
            isProcessing={isProcessing}
            onStart={handleRecordingStart}
            onStop={handleRecordingStop}
            className={buttonClassName}
          />

          {enableStreaming && !streamingMode && (
            <button
              onClick={() => setStreamingMode(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <Zap className="h-4 w-4" />
              Enable Real-time Streaming
            </button>
          )}

          {showRecordingIndicator && (
            <RecordingIndicator isRecording={audioCapture.isRecording} />
          )}
        </div>

        {showTranscription && (
          <div className={cn('space-y-2', transcriptionClassName)}>
            {streamingMode && streamingConfig.showRealtimeTranscription && (
              <RealtimeTranscription
                text={realtimeTranscript}
                isFinal={isFinalTranscript}
                isListening={audioCapture.isRecording}
                isProcessing={isProcessing}
                confidence={transcriptConfidence}
                showTypingEffect={!!streamingConfig.enableTypingEffect}
              />
            )}

            {transcript && (
              <TranscriptionDisplay
                transcription={transcript}
                isProcessing={isProcessing}
              />
            )}
          </div>
        )}
      </div>
    </MicrophonePermission>
  );
};