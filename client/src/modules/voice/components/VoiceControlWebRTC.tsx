import React, { useEffect, useState } from 'react';
import { useWebRTCVoice } from '../hooks/useWebRTCVoice';
import type { VoiceContext } from '../services/VoiceSessionConfig';
// ConnectionIndicator removed - using inline status
import { HoldToRecordButton } from './HoldToRecordButton';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { VoiceDebugPanel } from './VoiceDebugPanel';
import { AlertCircle, Mic, MicOff } from 'lucide-react';
import { logger } from '@/utils/logger';
import { toast } from 'react-hot-toast';

interface VoiceControlWebRTCProps {
  context?: VoiceContext; // 🔧 FIX: Added context prop to configure kiosk vs server mode
  onTranscript?: (event: { text: string; isFinal: boolean }) => void;
  onOrderDetected?: (order: any) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onConnectionStateChange?: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  debug?: boolean;
  className?: string;
  muteAudioOutput?: boolean; // Option to disable voice responses
}

/**
 * WebRTC-based voice control component using OpenAI Realtime API
 * Provides low-latency voice transcription with direct browser-to-OpenAI connection
 */
export const VoiceControlWebRTC: React.FC<VoiceControlWebRTCProps> = ({
  context, // 🔧 FIX: Receive context prop
  onTranscript,
  onOrderDetected,
  onRecordingStateChange,
  onConnectionStateChange,
  debug = false,
  className = '',
  muteAudioOutput = false,
}) => {
  const [showDebug, setShowDebug] = useState(debug);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [shouldStartRecording, setShouldStartRecording] = useState(false);

  const {
    connect,
    disconnect,
    isConnected,
    connectionState,
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    lastTranscript,
    responseText,
    isProcessing,
    error,
  } = useWebRTCVoice({
    autoConnect: context === 'kiosk', // 🔧 FIX: Pre-connect for kiosk context to eliminate delay
    context, // 🔧 FIX: Pass context to hook (kiosk vs server mode)
    debug,
    muteAudioOutput, // Pass through to hook
    onTranscript: (event) => {
      onTranscript?.({ text: event.text, isFinal: event.isFinal });
    },
    onOrderDetected,
    onTokenRefreshFailed: () => {
      toast.error('Voice connection lost. Please refresh the page.');
    },
  });

  // Notify parent when recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  // Notify parent when connection state changes
  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  // Auto-start recording when connection completes (if user is still holding button)
  useEffect(() => {
    if (debug) {
      logger.debug('[VoiceControlWebRTC] Auto-start effect triggered', {
        shouldStartRecording,
        isConnected,
        isRecording
      });
    }
    if (shouldStartRecording && isConnected && !isRecording) {
      if (debug) logger.debug('[VoiceControlWebRTC] Auto-starting recording via useEffect');
      startRecording();
      setShouldStartRecording(false);
    }
  }, [shouldStartRecording, isConnected, isRecording, startRecording, debug]);
  
  // Check microphone permission - store connect in ref to avoid dep loop
  const connectRef = React.useRef(connect);
  React.useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Permission check with proper cleanup
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    const handlePermissionChange = () => {
      if (permissionStatus) {
        setPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
      }
    };

    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((result) => {
        permissionStatus = result;
        setPermissionState(result.state as 'prompt' | 'granted' | 'denied');

        // Add listener with cleanup tracking
        result.addEventListener('change', handlePermissionChange);

        // Don't auto-connect - let user initiate by clicking the button
      })
      .catch((err) => {
        console.warn('Cannot query microphone permission:', err);
        // Assume prompt state if we can't check
        setPermissionState('prompt');
      });

    // Cleanup: remove permission change listener
    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', handlePermissionChange);
      }
    };
  }, []); // Empty deps - only run once on mount
  
  // Handle initial permission request
  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
      setPermissionState('granted');
      await connect();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setPermissionState('denied');
      setShouldStartRecording(false); // Clear flag on error
    }
  };

  // Handle recording button - auto-chain permission → connection → recording
  const handleRecordStart = async () => {
    if (debug) {
      // Debug logging for troubleshooting recording flow
      logger.debug('[VoiceControlWebRTC] handleRecordStart called', {
        permissionState,
        isConnected,
        connectionState,
        isRecording
      });
    }

    // Set flag to start recording (will trigger when connected)
    setShouldStartRecording(true);

    try {
      // If permission not granted yet, request it
      if (permissionState === 'prompt') {
        if (debug) logger.debug('[VoiceControlWebRTC] Requesting permission...');
        await handleRequestPermission();
        // Don't return - the useEffect will start recording when connected
        return;
      }

      // If permission granted but not connected, connect
      if (permissionState === 'granted' && !isConnected && connectionState !== 'connecting') {
        if (debug) logger.debug('[VoiceControlWebRTC] Permission granted, connecting...');
        await connect();
        // Don't return - the useEffect will start recording when connected
        return;
      }

      // If already connected, start recording immediately
      if (isConnected && !isRecording) {
        if (debug) logger.debug('[VoiceControlWebRTC] Already connected, starting recording immediately');
        startRecording();
        setShouldStartRecording(false);
      } else if (debug) {
        logger.debug('[VoiceControlWebRTC] NOT starting recording', {
          isConnected,
          isRecording,
          shouldStartRecording: true
        });
      }
    } catch (err) {
      logger.error('[VoiceControlWebRTC] Failed to start recording:', err);
      setShouldStartRecording(false); // Clear flag on error
      // Error will be displayed via the error state from useWebRTCVoice
    }
  };

  const handleRecordStop = () => {
    // Clear the flag to prevent auto-start if connection completes after release
    setShouldStartRecording(false);

    if (isRecording) {
      stopRecording();
    }
  };
  
  return (
    <div className={`voice-control-webrtc space-y-4 ${className}`}>
      {/* Permission Denied Warning */}
      {permissionState === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MicOff className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Microphone Access Denied</p>
              <p className="text-xs text-red-600 mt-1">
                Please enable microphone access in your browser settings to use voice ordering
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' :
            connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            connectionState === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`} />
          <span className="text-xs text-gray-600 capitalize">{connectionState}</span>
        </div>
        
        {/* Debug Toggle */}
        {debug && (
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDebug ? 'Hide' : 'Show'} Debug
          </button>
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Voice Service Error</p>
              <p className="text-xs text-red-600 mt-1">{error.message}</p>
              {error.message.includes('configuration') || error.message.includes('API') ? (
                <p className="text-xs text-red-500 mt-2 italic">
                  This is a system configuration issue. Please contact support or check the server logs.
                </p>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await connect();
                    } catch (err) {
                      console.error('Reconnection failed:', err);
                    }
                  }}
                  className="text-xs text-red-700 underline mt-2 hover:text-red-800"
                >
                  Try reconnecting
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Voice Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Record Button */}
        <div className="flex flex-col items-center space-y-4">
          <HoldToRecordButton
            onMouseDown={handleRecordStart}
            onMouseUp={handleRecordStop}
            isListening={isRecording}
            isProcessing={isProcessing}
            disabled={permissionState === 'denied' || connectionState === 'error'}
            mode={context === 'kiosk' ? 'toggle' : 'hold'}
            size={context === 'kiosk' ? 'large' : 'normal'}
            showDebounceWarning={debug}
          />

          {/* Status Text */}
          <div className="text-center">
            {permissionState === 'prompt' && !isConnected && (
              <p className="text-sm text-gray-500">Hold button to start voice ordering</p>
            )}
            {permissionState === 'granted' && !isConnected && connectionState === 'connecting' && (
              <p className="text-sm text-gray-500">Connecting to voice service...</p>
            )}
            {isConnected && !isRecording && !isProcessing && (
              <p className="text-sm text-gray-500">Hold button to speak</p>
            )}
            {isRecording && (
              <p className="text-sm text-red-600 font-medium animate-pulse">Recording...</p>
            )}
            {isProcessing && !isRecording && (
              <p className="text-sm text-blue-600">Processing...</p>
            )}
          </div>
        </div>
        
        {/* Transcription Display */}
        {(transcript || responseText) && (
          <div className="mt-6 space-y-3">
            {transcript && (
              <div>
                <p className="text-xs text-gray-500 mb-1">You said:</p>
                <TranscriptionDisplay 
                  transcription={transcript}
                  isInterim={!lastTranscript?.isFinal}
                  confidence={lastTranscript?.confidence}
                />
              </div>
            )}
            
            {responseText && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Assistant:</p>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-900">{responseText}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <VoiceDebugPanel
          connectionState={connectionState}
          isRecording={isRecording}
          transcript={transcript}
          error={error}
        />
      )}
    </div>
  );
};