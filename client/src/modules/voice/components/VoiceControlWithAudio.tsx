import React, { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/services/logger'
import { cn } from '@/utils';
import { useToast } from '@/hooks/useToast';
import { HoldToRecordButton } from './HoldToRecordButton';
import { useVoiceToAudio } from '../hooks/useVoiceToAudio';

interface VoiceControlWithAudioProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onOrderData?: (orderData: any) => void;
  onAudioStart?: (responseText: string) => void;
  onAudioEnd?: () => void;
  isFirstPress?: boolean;
  onFirstPress?: () => void;
  className?: string;
}

type PermissionState = 'granted' | 'denied' | 'prompt';

/**
 * Enhanced Voice Control with full audio response integration
 * Handles: voice input → transcription → AI processing → audio playback
 */
const VoiceControlWithAudio: React.FC<VoiceControlWithAudioProps> = ({
  onTranscript,
  onOrderData,
  onAudioStart,
  onAudioEnd,
  isFirstPress = true,
  onFirstPress,
  className,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  
  // Voice to audio processing hook
  const { processVoiceWithTranscript, isProcessing: isVoiceProcessing } = useVoiceToAudio({
    onTranscriptReceived: (transcript) => {
      logger.info('Transcript received:', transcript);
      setCurrentTranscript(transcript);
      onTranscript?.(transcript, true);
    },
    onOrderDataReceived: (orderData) => {
      logger.info('Order data received:', orderData);
      onOrderData?.(orderData);
    },
    onAudioResponseStart: () => {
      logger.info('AI audio response started');
      setIsPlayingAudio(true);
      onAudioStart?.(''); // TODO: pass actual response text
    },
    onAudioResponseEnd: () => {
      logger.info('AI audio response ended');
      setIsPlayingAudio(false);
      onAudioEnd?.();
      setCurrentTranscript(''); // Clear transcript when done
    },
    onError: (error) => {
      console.error('Voice processing error:', error);
      setIsProcessing(false);
      setIsPlayingAudio(false);
      toast.error(error.message);
    }
  });
  
  // Check microphone permission status
  useEffect(() => {
    let mounted = true;
    
    const checkPermission = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (mounted) {
          setPermissionState(permissionStatus.state as PermissionState);
        }
        
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
        console.warn('Permissions API not supported, will check on user interaction', error);
      }
    };
    
    checkPermission();
    
    return () => {
      mounted = false;
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Clean up media stream
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
        
        setIsListening(false);
        setIsProcessing(true);
        
        try {
          // Process voice through complete pipeline
          await processVoiceWithTranscript(audioBlob);
        } catch (error) {
          console.error('Voice processing failed:', error);
          toast.error('Failed to process voice input');
        } finally {
          setIsProcessing(false);
        }
      };
      
      mediaRecorder.start();
      setIsListening(true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setPermissionState('denied');
      }
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, [processVoiceWithTranscript, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    if (isFirstPress && onFirstPress) {
      onFirstPress();
    }
    
    // Don't allow new recording while processing or playing audio
    if (isProcessing || isPlayingAudio || isVoiceProcessing) {
      return;
    }
    
    startRecording();
  }, [isFirstPress, onFirstPress, startRecording, isProcessing, isPlayingAudio, isVoiceProcessing]);

  const handleMouseUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Show permission prompt if needed
  if (permissionState === 'prompt') {
    return (
      <div className={cn("flex flex-col items-center gap-4", className)}>
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
      <div className={cn("text-center", className)}>
        <p className="text-red-600 mb-2">Microphone access denied</p>
        <p className="text-sm text-gray-600">Please enable microphone permissions in your browser settings</p>
      </div>
    );
  }
  
  // Determine if button should be disabled
  const isButtonDisabled = isPlayingAudio || isProcessing || isVoiceProcessing;
  
  return (
    <div className={cn("relative", className)}>
      <HoldToRecordButton
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        isListening={isListening}
        isProcessing={isProcessing || isVoiceProcessing}
        isPlayingAudio={isPlayingAudio}
        disabled={isButtonDisabled}
        className={cn(
          isPlayingAudio && 'animate-pulse bg-blue-500 hover:bg-blue-600',
          isProcessing && 'animate-spin'
        )}
      />
    </div>
  );
};

export default VoiceControlWithAudio;