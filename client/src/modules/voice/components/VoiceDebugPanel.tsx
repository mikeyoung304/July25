import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils';
import { 
  Mic, 
  MicOff, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle,
  Activity,
  Volume2,
  Loader2
} from 'lucide-react';

interface VoiceDebugPanelProps {
  isRecording: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  audioLevel?: number;
  transcript?: string;
  error?: Error | null;
  sessionId?: string;
  messagesSent?: number;
  messagesReceived?: number;
  className?: string;
}

export const VoiceDebugPanel: React.FC<VoiceDebugPanelProps> = ({
  isRecording,
  connectionState,
  audioLevel = 0,
  transcript,
  error,
  sessionId,
  messagesSent = 0,
  messagesReceived = 0,
  className
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Only capture voice-related logs
      if (message.includes('[Audio') || message.includes('[Voice') || message.includes('[OpenAI')) {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev.slice(-50), `[${timestamp}] ${type}: ${message}`]);
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('LOG', ...args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('ERROR', ...args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('WARN', ...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getConnectionColor = () => {
    switch (connectionState) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'connecting':
      case 'reconnecting': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn(
      'fixed bottom-4 right-4 bg-black/90 text-white rounded-lg shadow-2xl',
      'backdrop-blur-sm border border-white/10',
      isExpanded ? 'w-96' : 'w-64',
      className
    )}>
      {/* Header */}
      <div 
        className="p-3 border-b border-white/10 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-sm">Voice Debug Panel</span>
        </div>
        <button className="text-xs text-gray-400 hover:text-white">
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Status Grid */}
      <div className="p-3 grid grid-cols-2 gap-3 text-xs font-mono">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1', getConnectionColor())}>
            {getConnectionIcon()}
            <span>WebSocket:</span>
          </div>
          <span className="text-gray-300">{connectionState}</span>
        </div>

        {/* Recording Status */}
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1', isRecording ? 'text-red-500' : 'text-gray-400')}>
            {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span>Recording:</span>
          </div>
          <span className="text-gray-300">{isRecording ? 'Active' : 'Inactive'}</span>
        </div>

        {/* Audio Level */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-400" />
          <span>Level:</span>
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-100"
              style={{ width: `${Math.min(100, audioLevel * 100)}%` }}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Messages:</span>
          <span className="text-green-400">↑{messagesSent}</span>
          <span className="text-blue-400">↓{messagesReceived}</span>
        </div>

        {/* Session ID */}
        {sessionId && (
          <div className="col-span-2 flex items-center gap-2">
            <span className="text-gray-400">Session:</span>
            <span className="text-xs text-gray-300 truncate">{sessionId.slice(0, 8)}...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="col-span-2 bg-red-900/30 border border-red-600/50 rounded p-2">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertCircle className="w-3 h-3" />
              <span className="text-xs font-semibold">Error</span>
            </div>
            <p className="text-xs text-red-200">{error.message}</p>
          </div>
        )}

        {/* Current Transcript */}
        {transcript && (
          <div className="col-span-2 bg-blue-900/30 border border-blue-600/50 rounded p-2">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Activity className="w-3 h-3" />
              <span className="text-xs font-semibold">Transcript</span>
            </div>
            <p className="text-xs text-blue-200">{transcript}</p>
          </div>
        )}
      </div>

      {/* Console Logs */}
      {isExpanded && (
        <div className="border-t border-white/10">
          <div className="p-2 bg-black/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-mono">Console Logs</span>
              <button 
                onClick={() => setLogs([])}
                className="text-xs text-gray-500 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="h-48 overflow-y-auto text-xs font-mono space-y-1 bg-black/70 rounded p-2">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  Waiting for voice logs...
                </div>
              ) : (
                logs.map((log, index) => {
                  const isError = log.includes('ERROR');
                  const isWarn = log.includes('WARN');
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        'break-all',
                        isError ? 'text-red-400' : 
                        isWarn ? 'text-yellow-400' : 
                        'text-gray-300'
                      )}
                    >
                      {log}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* OpenAI Status */}
      <div className="p-3 border-t border-white/10 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">OpenAI API:</span>
          <div className="flex items-center gap-2">
            {/* OpenAI key is now server-side only for security */}
            <div className="flex items-center gap-1 text-blue-400">
              <CheckCircle className="w-3 h-3" />
              <span>Server-side</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-gray-400">Model:</span>
          <span className="text-gray-300 text-xs">gpt-4o-realtime-preview</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceDebugPanel;
