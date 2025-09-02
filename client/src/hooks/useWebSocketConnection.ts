/**
 * React hook for managing WebSocket connections
 * Automatically connects on mount and disconnects on unmount
 * Prevents duplicate connections across components
 */

import { useEffect, useRef } from 'react';
import { connectionManager } from '@/services/websocket/ConnectionManager';
import { logger } from '@/services/logger';

interface UseWebSocketConnectionOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocketConnection(options: UseWebSocketConnectionOptions = {}) {
  const {
    enabled = true,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const connect = async () => {
      try {
        await connectionManager.connect();
        
        if (isMounted && !hasConnectedRef.current) {
          hasConnectedRef.current = true;
          onConnect?.();
        }
      } catch (error) {
        logger.error('Failed to establish WebSocket connection:', error);
        if (isMounted) {
          onError?.(error instanceof Error ? error : new Error('WebSocket connection failed'));
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      
      if (hasConnectedRef.current) {
        hasConnectedRef.current = false;
        connectionManager.disconnect();
        onDisconnect?.();
      }
    };
  }, [enabled, onConnect, onDisconnect, onError]);

  return {
    status: connectionManager.getStatus()
  };
}