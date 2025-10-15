import React, { useEffect, useState } from 'react';
import { useWebRTCVoice } from '../hooks/useWebRTCVoice';
// ConnectionIndicator removed - using inline status
import { HoldToRecordButton } from './HoldToRecordButton';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { VoiceDebugPanel } from './VoiceDebugPanel';
import { AlertCircle, Mic, MicOff } from 'lucide-react';

interface VoiceControlWebRTCProps {
  onTranscript?: (text: string) => void;
  onOrderDetected?: (order: any) => void;
  debug?: boolean;
  className?: string;
}

/**
 * WebRTC-based voice control component using OpenAI Realtime API
 * Provides low-latency voice transcription with direct browser-to-OpenAI connection
 */
export const VoiceControlWebRTC: React.FC<VoiceControlWebRTCProps> = ({
  onTranscript,
  onOrderDetected,
  debug = false,
  className = '',
}) => {
  const [showDebug, setShowDebug] = useState(debug);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
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
    autoConnect: false, // We'll connect after permission check
    debug,
    onTranscript: (event) => {
      onTranscript?.(event.text);
    },
    onOrderDetected,
  });
  
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

        // Auto-connect if permission already granted
        if (result.state === 'granted' && connectRef.current) {
          connectRef.current().catch(console.error);
        }
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
    }
  };
  
  // Handle recording button - no event params needed
  const handleRecordStart = () => {
    if (isConnected && !isRecording) {
      startRecording();
    }
  };
  
  const handleRecordStop = () => {
    if (isRecording) {
      stopRecording();
    }
  };
  
  // Render permission prompt
  if (permissionState === 'prompt') {
    return (
      <div className={`voice-control-webrtc ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Microphone Permission Required</p>
              <p className="text-xs text-yellow-600 mt-1">
                We need access to your microphone for voice ordering
              </p>
            </div>
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable Microphone
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render permission denied
  if (permissionState === 'denied') {
    return (
      <div className={`voice-control-webrtc ${className}`}>
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
      </div>
    );
  }
  
  return (
    <div className={`voice-control-webrtc space-y-4 ${className}`}>
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
              <p className="text-sm font-medium text-red-800">Connection Error</p>
              <p className="text-xs text-red-600 mt-1">{error.message}</p>
              <button
                onClick={() => connect()}
                className="text-xs text-red-700 underline mt-2 hover:text-red-800"
              >
                Try reconnecting
              </button>
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
            disabled={!isConnected || connectionState === 'error'}
          />
          
          {/* Status Text */}
          <div className="text-center">
            {!isConnected && connectionState === 'connecting' && (
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
      
      {/* Connection Controls */}
      <div className="flex gap-2">
        {!isConnected && connectionState !== 'connecting' && (
          <button
            onClick={connect}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Connect Voice
          </button>
        )}
        
        {isConnected && (
          <button
            onClick={disconnect}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Disconnect
          </button>
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