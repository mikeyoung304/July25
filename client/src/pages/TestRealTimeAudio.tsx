import React, { useState, useRef, useEffect } from 'react';
import { AudioPipeline } from '@/voice/audio-pipeline';
import { VoiceTransport } from '@/voice/ws-transport';
import { VoiceDebugPanel } from '@/modules/voice/components/VoiceDebugPanel';
import { RealtimeTranscription } from '@/modules/voice/components/RealtimeTranscription';
import { Mic, MicOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/utils';

export const TestRealTimeAudio: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected');
  const [transcript, setTranscript] = useState('');
  const [isFinalTranscript, setIsFinalTranscript] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [messagesSent, setMessagesSent] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const voiceTransportRef = useRef<VoiceTransport | null>(null);

  // Initialize on mount
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        console.log('[TestPage] Initializing real-time audio system...');
        
        // Create audio pipeline
        const pipeline = new AudioPipeline();
        await pipeline.initialize();
        audioPipelineRef.current = pipeline;
        
        // Create WebSocket transport
        const transport = new VoiceTransport({
          url: `ws://localhost:3001/voice-stream`
        });
        
        // Set up event listeners
        transport.on('connectionChange', (state) => {
          console.log('[TestPage] Connection state changed:', state);
          setConnectionState(state);
        });
        
        transport.on('transcript', (data) => {
          console.log('[TestPage] Received transcript:', data);
          setTranscript(data.transcript);
          setIsFinalTranscript(data.is_final);
          setMessagesReceived(prev => prev + 1);
        });
        
        transport.on('response', (data) => {
          console.log('[TestPage] Received response:', data);
          setMessagesReceived(prev => prev + 1);
        });
        
        transport.on('error', (err) => {
          console.error('[TestPage] Transport error:', err);
          setError(err);
        });
        
        transport.on('heartbeat', () => {
          console.log('[TestPage] Heartbeat received');
        });
        
        voiceTransportRef.current = transport;
        
        // Connect WebSocket
        transport.connect();
        
        setIsInitialized(true);
        console.log('[TestPage] System initialized successfully');
      } catch (err) {
        console.error('[TestPage] Failed to initialize:', err);
        setError(err as Error);
      }
    };
    
    initializeSystem();
    
    // Cleanup on unmount
    return () => {
      console.log('[TestPage] Cleaning up...');
      if (audioPipelineRef.current) {
        audioPipelineRef.current.destroy();
      }
      if (voiceTransportRef.current) {
        voiceTransportRef.current.destroy();
      }
    };
  }, []);

  const startRecording = () => {
    if (!audioPipelineRef.current || !voiceTransportRef.current) {
      setError(new Error('System not initialized'));
      return;
    }
    
    console.log('[TestPage] Starting recording...');
    setIsRecording(true);
    setTranscript('');
    setIsFinalTranscript(false);
    setError(null);
    
    // Start audio capture and streaming
    audioPipelineRef.current.start((encodedFrame, hasVoice) => {
      // Update audio level visualization
      if (hasVoice) {
        setAudioLevel(Math.random() * 0.5 + 0.5); // Mock level 0.5-1.0
      } else {
        setAudioLevel(Math.random() * 0.3); // Mock level 0-0.3
      }
      
      // Send audio to server
      const sent = voiceTransportRef.current!.sendAudio(encodedFrame, hasVoice);
      if (sent) {
        setMessagesSent(prev => prev + 1);
      }
    });
  };

  const stopRecording = () => {
    console.log('[TestPage] Stopping recording...');
    setIsRecording(false);
    setAudioLevel(0);
    
    if (audioPipelineRef.current) {
      audioPipelineRef.current.stop();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Real-Time Audio Transcription Test</h1>
        
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">System Status</span>
              {isInitialized ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <p className="mt-2 text-lg font-semibold">
              {isInitialized ? 'Ready' : 'Initializing...'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Connection</span>
              <div className={cn(
                'w-3 h-3 rounded-full',
                connectionState === 'connected' ? 'bg-green-500' :
                connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionState === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              )} />
            </div>
            <p className="mt-2 text-lg font-semibold capitalize">{connectionState}</p>
          </div>
        </div>

        {/* Recording Button */}
        <div className="flex justify-center mb-8">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={!isInitialized || connectionState !== 'connected'}
            className={cn(
              'relative w-32 h-32 rounded-full transition-all duration-200',
              'flex items-center justify-center',
              'shadow-lg hover:shadow-xl',
              isRecording ? 
                'bg-red-500 hover:bg-red-600 scale-110' : 
                'bg-blue-500 hover:bg-blue-600',
              (!isInitialized || connectionState !== 'connected') && 
                'opacity-50 cursor-not-allowed'
            )}
          >
            {isRecording ? (
              <Mic className="w-12 h-12 text-white" />
            ) : (
              <MicOff className="w-12 h-12 text-white" />
            )}
            
            {/* Pulse animation when recording */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
            )}
          </button>
        </div>
        
        <p className="text-center text-gray-600 mb-8">
          {isRecording ? 'Release to stop' : 'Hold to record'}
        </p>

        {/* Transcription Display */}
        <RealtimeTranscription
          text={transcript}
          isFinal={isFinalTranscript}
          isListening={isRecording}
          isProcessing={false}
          showTypingEffect={true}
          className="mb-8"
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-900">Error</h3>
            </div>
            <p className="mt-2 text-red-700">{error.message}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Wait for the system to initialize (Status: Ready)</li>
            <li>Ensure the connection is established (green dot)</li>
            <li>Hold the microphone button and speak clearly</li>
            <li>Release to stop recording</li>
            <li>Watch for transcripts in the display above</li>
            <li>Check the debug panel (bottom-right) for detailed logs</li>
          </ol>
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg font-mono text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>Messages Sent: {messagesSent}</div>
            <div>Messages Received: {messagesReceived}</div>
            <div>Audio Level: {audioLevel.toFixed(2)}</div>
            <div>Session ID: {sessionId || 'Not connected'}</div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <VoiceDebugPanel
        isRecording={isRecording}
        connectionState={connectionState}
        audioLevel={audioLevel}
        transcript={transcript}
        error={error}
        sessionId={sessionId}
        messagesSent={messagesSent}
        messagesReceived={messagesReceived}
      />
    </div>
  );
};

export default TestRealTimeAudio;