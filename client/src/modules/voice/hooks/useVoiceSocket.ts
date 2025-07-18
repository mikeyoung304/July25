import { useRef, useCallback, useEffect, useState } from 'react';
import VoiceSocketManager, { ConnectionStatus } from '../services/VoiceSocketManager';

export interface VoiceSocketMessage {
  type: string;
  [key: string]: any;
}

export interface VoiceSocketOptions {
  url: string;
  maxUnacknowledgedChunks?: number;
  reconnectDelay?: number;
  onMessage?: (message: VoiceSocketMessage) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export function useVoiceSocket({
  url,
  maxUnacknowledgedChunks = 3,
  reconnectDelay = 3000,
  onMessage,
  onConnectionChange,
}: VoiceSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const managerRef = useRef<VoiceSocketManager | null>(null);
  const listenerIdRef = useRef<string>(`voice-socket-${Date.now()}-${Math.random()}`);

  // Get or create the singleton manager
  useEffect(() => {
    const manager = VoiceSocketManager.getInstance(url);
    managerRef.current = manager;

    // Add this component as a listener
    manager.addListener(listenerIdRef.current, {
      onMessage,
      onConnectionChange: (status) => {
        setConnectionStatus(status);
        onConnectionChange?.(status);
      },
    });

    // Connect if not already connected
    manager.connect();

    // Cleanup: remove listener but don't disconnect (other components might be using it)
    return () => {
      manager.removeListener(listenerIdRef.current);
    };
  }, [url, onMessage, onConnectionChange]);

  const send = useCallback((data: string | ArrayBuffer | Blob) => {
    return managerRef.current?.send(data) || false;
  }, []);

  const sendJSON = useCallback((message: VoiceSocketMessage) => {
    return managerRef.current?.sendJSON(message) || false;
  }, []);

  return {
    connectionStatus,
    send,
    sendJSON,
    isConnected: connectionStatus === 'connected',
  };
}

export type { ConnectionStatus };