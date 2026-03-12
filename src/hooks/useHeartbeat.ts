import { useState, useEffect, useCallback, useRef } from 'react';

import type { SignalingConnectionState } from './useSignaling';

// ── Types ──

export type HeartbeatStatus = 'connected' | 'warning' | 'disconnected' | 'reconnecting';

interface UseHeartbeatProps {
  connectionState: SignalingConnectionState;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

interface UseHeartbeatReturn {
  status: HeartbeatStatus;
  reconnectAttempt: number;
  lastPongAt: number | null;
}

// ── Config ──

const HEARTBEAT_INTERVAL = 5000;    // check every 5s (matches server ping)
const PONG_TIMEOUT = 10000;         // consider disconnected after 10s without pong
const MAX_RECONNECT_ATTEMPTS = 5;

// ── Hook ──

export function useHeartbeat({
  connectionState,
  onDisconnect,
  onReconnect,
}: UseHeartbeatProps): UseHeartbeatReturn {
  const [status, setStatus] = useState<HeartbeatStatus>('connected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastPongAt, setLastPongAt] = useState<number | null>(null);

  const lastPongRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasDisconnectedRef = useRef(false);

  // Track connection state changes
  useEffect(() => {
    if (connectionState === 'connected') {
      lastPongRef.current = Date.now();
      setLastPongAt(Date.now());

      if (wasDisconnectedRef.current) {
        // We reconnected
        wasDisconnectedRef.current = false;
        setStatus('connected');
        setReconnectAttempt(0);
        onReconnect?.();
        console.log('[Heartbeat] Reconnected');
      } else {
        setStatus('connected');
      }
    } else if (connectionState === 'disconnected' || connectionState === 'error') {
      if (!wasDisconnectedRef.current) {
        wasDisconnectedRef.current = true;
        setStatus('disconnected');
        onDisconnect?.();
        console.log('[Heartbeat] Disconnected');
      }
    } else if (connectionState === 'connecting') {
      setStatus('reconnecting');
      setReconnectAttempt(prev => prev + 1);
    }
  }, [connectionState, onDisconnect, onReconnect]);

  // Periodic liveness check — if we haven't seen a pong in too long, mark as warning
  useEffect(() => {
    if (connectionState !== 'connected') return;

    checkIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastPongRef.current;

      if (elapsed > PONG_TIMEOUT) {
        setStatus('warning');
      } else {
        setStatus('connected');
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [connectionState]);

  // Record pong receipt (called externally when a pong/any message arrives)
  const recordPong = useCallback(() => {
    const now = Date.now();
    lastPongRef.current = now;
    setLastPongAt(now);
  }, []);

  return {
    status,
    reconnectAttempt,
    lastPongAt,
  };
}
