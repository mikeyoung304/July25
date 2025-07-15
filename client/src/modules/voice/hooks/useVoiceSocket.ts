import { useRef, useCallback, useEffect, useState } from 'react';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const unacknowledgedChunksRef = useRef(0);
  const messageQueueRef = useRef<(string | ArrayBuffer | Blob)[]>([]);
  const processingRef = useRef(false);

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    onConnectionChange?.(status);
  }, [onConnectionChange]);

  const processMessageQueue = useCallback(async () => {
    if (processingRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    processingRef.current = true;

    while (messageQueueRef.current.length > 0 && unacknowledgedChunksRef.current < maxUnacknowledgedChunks) {
      const message = messageQueueRef.current.shift();
      if (message) {
        if (message instanceof Blob || message instanceof ArrayBuffer || typeof message === 'string') {
          unacknowledgedChunksRef.current++;
          ws.send(message);
        }
      }
    }

    processingRef.current = false;
  }, [maxUnacknowledgedChunks]);

  const connect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    updateConnectionStatus('connecting');
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.warn('Voice WebSocket connected');
      updateConnectionStatus('connected');
      unacknowledgedChunksRef.current = 0;
      messageQueueRef.current = [];

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      processMessageQueue();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.warn('WebSocket message:', data);

        switch (data.type) {
          case 'progress':
            if (unacknowledgedChunksRef.current > 0) {
              unacknowledgedChunksRef.current--;
              console.warn(`Progress: ${data.bytesReceived} bytes received, ${unacknowledgedChunksRef.current} chunks pending`);
            }
            processMessageQueue();
            break;

          case 'error':
            if (data.message === 'overrun') {
              console.error('Audio overrun detected - too many unacknowledged chunks');
              unacknowledgedChunksRef.current = 0;
              messageQueueRef.current = [];
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }

        onMessage?.(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateConnectionStatus('error');
    };

    ws.onclose = () => {
      console.warn('WebSocket disconnected');
      updateConnectionStatus('disconnected');
      wsRef.current = null;
      unacknowledgedChunksRef.current = 0;

      if (shouldReconnectRef.current && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, reconnectDelay);
      }
    };

    wsRef.current = ws;
  }, [url, reconnectDelay, updateConnectionStatus, processMessageQueue, onMessage]);

  const send = useCallback((data: string | ArrayBuffer | Blob) => {
    if (data instanceof Blob || data instanceof ArrayBuffer) {
      if (unacknowledgedChunksRef.current >= maxUnacknowledgedChunks) {
        console.warn(`Flow control: dropping audio chunk, ${unacknowledgedChunksRef.current} unacknowledged chunks`);
        return false;
      }
      messageQueueRef.current.push(data);
      processMessageQueue();
      return true;
    } else if (typeof data === 'string') {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
        return true;
      }
    }
    return false;
  }, [maxUnacknowledgedChunks, processMessageQueue]);

  const sendJSON = useCallback((message: VoiceSocketMessage) => {
    return send(JSON.stringify(message));
  }, [send]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    send,
    sendJSON,
    isConnected: connectionStatus === 'connected',
  };
}