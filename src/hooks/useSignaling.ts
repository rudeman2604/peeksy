import { useState, useEffect, useCallback, useRef } from 'react';

import { WS_MESSAGES } from '../lib/constants';
import type { WsMessage } from '../lib/types';

// ── Types ──

export type SignalingConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSignalingReturn {
  send: (message: WsMessage) => void;
  lastMessage: WsMessage | null;
  connectionState: SignalingConnectionState;
  connect: () => void;
  disconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;

// ── Hook ──

export function useSignaling(autoConnect: boolean = true): UseSignalingReturn {
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [connectionState, setConnectionState] = useState<SignalingConnectionState>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalCloseRef = useRef(false);

  const getSignalingUrl = useCallback((): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }, []);

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (wsRef.current) {
      isIntentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }

    isIntentionalCloseRef.current = false;
    setConnectionState('connecting');

    try {
      const url = getSignalingUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Signaling] Connected');
        setConnectionState('connected');
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string) as WsMessage;

          // Auto-respond to server pings
          if (message.type === WS_MESSAGES.PING) {
            ws.send(JSON.stringify({ type: WS_MESSAGES.PONG }));
            return;
          }

          setLastMessage(message);
        } catch (error) {
          console.error('[Signaling] Failed to parse message:', error);
        }
      };

      ws.onclose = () => {
        if (isIntentionalCloseRef.current) {
          console.log('[Signaling] Connection closed intentionally');
          setConnectionState('disconnected');
          return;
        }

        console.log('[Signaling] Connection closed');
        wsRef.current = null;
        attemptReconnect();
      };

      ws.onerror = (error: Event) => {
        console.error('[Signaling] WebSocket error:', error);
        setConnectionState('error');
      };
    } catch (error) {
      console.error('[Signaling] Failed to create WebSocket:', error);
      setConnectionState('error');
    }
  }, [getSignalingUrl]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[Signaling] Max reconnect attempts reached');
      setConnectionState('disconnected');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
    reconnectAttemptRef.current += 1;

    console.log(`[Signaling] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    setConnectionState('connecting');

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const send = useCallback((message: WsMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[Signaling] Cannot send — WebSocket not connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    isIntentionalCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  // Auto-connect on mount if requested
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      isIntentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoConnect, connect]);

  return { send, lastMessage, connectionState, connect, disconnect };
}
