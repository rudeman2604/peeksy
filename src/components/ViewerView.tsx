import { useState, useEffect, useCallback, useRef } from 'react';

import { useSignaling } from '../hooks/useSignaling';
import { useHeartbeat } from '../hooks/useHeartbeat';

import { WS_MESSAGES } from '../lib/constants';
import type { WsMessage, ViewerState, WsSdpOffer, WsIceCandidate, WsJoinRejected } from '../lib/types';

import PixieState from './PixieState';
import PasswordEntry from './PasswordEntry';
import ViewerControls from './ViewerControls';

import './ViewerView.css';

// ── Types ──

interface ViewerViewProps {
  roomId: string;
}

// ── Config ──

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CURSOR_HIDE_DELAY = 3000;

// ── Component ──

export default function ViewerView({ roomId }: ViewerViewProps) {
  const [viewerState, setViewerState] = useState<ViewerState>('connecting');
  const [viewerId, setViewerId] = useState<string>('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const joinedRef = useRef(false);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { send, lastMessage, connectionState } = useSignaling(true);

  useHeartbeat({
    connectionState,
    onDisconnect: () => {
      if (viewerState === 'watching') {
        setViewerState('reconnecting');
      }
    },
    onReconnect: () => {
      // Allow re-join after reconnect
      if (joinedRef.current) {
        joinedRef.current = false;
      }
    },
  });

  // Join room once connected to signaling
  useEffect(() => {
    if (connectionState === 'connected' && !joinedRef.current) {
      joinedRef.current = true;
      send({
        type: WS_MESSAGES.JOIN_ROOM,
        roomId,
      } as WsMessage);
      console.log(`[Viewer] Sent join_room for ${roomId}`);
    }
  }, [connectionState, roomId, send]);

  // ── Password submit handler ──
  const handlePasswordSubmit = useCallback((password: string) => {
    setPasswordError(false);
    setPasswordLoading(true);
    send({
      type: WS_MESSAGES.JOIN_ROOM,
      roomId,
      password,
    } as WsMessage);
    console.log(`[Viewer] Sent join_room with password`);
  }, [roomId, send]);

  // ── Handle incoming SDP offer ──
  const handleSdpOffer = useCallback(async (sdp: RTCSessionDescriptionInit, incomingViewerId: string) => {
    console.log(`[Viewer] Received SDP offer, creating answer`);

    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log(`[Viewer] Received track: ${event.track.kind}`);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setViewerState('watching');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: WS_MESSAGES.ICE_CANDIDATE,
          candidate: event.candidate.toJSON(),
          viewerId: incomingViewerId,
        } as WsMessage);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[Viewer] ICE state: ${pc.iceConnectionState}`);
      switch (pc.iceConnectionState) {
        case 'connected':
          setViewerState('watching');
          break;
        case 'disconnected':
          console.log('[Viewer] ICE disconnected — may recover');
          break;
        case 'failed':
          console.log('[Viewer] ICE connection failed');
          setViewerState('disconnected');
          break;
        case 'closed':
          break;
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('[Viewer] Failed to add queued ICE candidate:', error);
        }
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      send({
        type: WS_MESSAGES.SDP_ANSWER,
        sdp: pc.localDescription as RTCSessionDescriptionInit,
        viewerId: incomingViewerId,
      } as WsMessage);

      console.log('[Viewer] Sent SDP answer');
    } catch (error) {
      console.error('[Viewer] Failed to handle SDP offer:', error);
      setViewerState('disconnected');
    }
  }, [send]);

  // ── Handle incoming ICE candidate ──
  const handleIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;

    if (pc && pc.remoteDescription) {
      try {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[Viewer] Failed to add ICE candidate:', error);
      }
    } else {
      pendingCandidatesRef.current.push(candidate);
    }
  }, []);

  // ── Process signaling messages ──
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case WS_MESSAGES.JOIN_ACCEPTED: {
        console.log('[Viewer] Join accepted');
        setViewerState('connecting');
        setPasswordLoading(false);
        setPasswordError(false);
        break;
      }

      case WS_MESSAGES.JOIN_REJECTED: {
        const msg = lastMessage as WsJoinRejected;
        console.log(`[Viewer] Join rejected: ${msg.reason}`);
        setPasswordLoading(false);
        switch (msg.reason) {
          case 'room_not_found':
            setViewerState('room-not-found');
            break;
          case 'room_full':
            setViewerState('room-full');
            break;
          case 'wrong_password':
            setViewerState('password');
            setPasswordError(true);
            break;
          default:
            setViewerState('disconnected');
        }
        break;
      }

      case WS_MESSAGES.SDP_OFFER: {
        const msg = lastMessage as WsSdpOffer;
        setViewerId(msg.viewerId);
        handleSdpOffer(msg.sdp, msg.viewerId);
        break;
      }

      case WS_MESSAGES.ICE_CANDIDATE: {
        const msg = lastMessage as WsIceCandidate;
        handleIceCandidate(msg.candidate);
        break;
      }

      case WS_MESSAGES.HOST_ENDED: {
        console.log('[Viewer] Host stopped sharing');
        setViewerState('host-stopped');
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        break;
      }

      case WS_MESSAGES.ROOM_EXPIRED: {
        console.log('[Viewer] Room expired');
        setViewerState('room-expired');
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        break;
      }
    }
  }, [lastMessage, handleSdpOffer, handleIceCandidate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  // ── Fullscreen toggle ──
  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // ── Picture-in-Picture toggle ──
  const handlePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (error) {
      console.error('[Viewer] PiP failed:', error);
    }
  }, []);

  // ── Auto-hide cursor in watching mode ──
  useEffect(() => {
    if (viewerState !== 'watching') return;

    const resetCursorTimer = () => {
      setCursorHidden(false);
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
      }
      cursorTimerRef.current = setTimeout(() => {
        setCursorHidden(true);
      }, CURSOR_HIDE_DELAY);
    };

    resetCursorTimer();

    window.addEventListener('mousemove', resetCursorTimer);
    window.addEventListener('touchstart', resetCursorTimer);

    return () => {
      window.removeEventListener('mousemove', resetCursorTimer);
      window.removeEventListener('touchstart', resetCursorTimer);
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
      }
      setCursorHidden(false);
    };
  }, [viewerState]);

  // ── Render based on viewer state ──

  if (viewerState === 'password') {
    return (
      <PasswordEntry
        onSubmit={handlePasswordSubmit}
        isLoading={passwordLoading}
        error={passwordError}
      />
    );
  }

  if (viewerState === 'watching') {
    return (
      <div
        ref={containerRef}
        className={`viewerView ${cursorHidden ? 'viewerView--cursorHidden' : ''}`}
      >
        <video
          ref={videoRef}
          className="viewerVideo"
          autoPlay
          playsInline
        />
        <ViewerControls
          onFullscreen={handleFullscreen}
          onPiP={handlePiP}
          isFullscreen={isFullscreen}
          isPiP={isPiP}
        />
      </div>
    );
  }

  if (viewerState === 'connecting') {
    return (
      <div className="viewerView viewerView--centered">
        <PixieState state="connecting" size="large" />
      </div>
    );
  }

  if (viewerState === 'reconnecting') {
    return (
      <div className="viewerView viewerView--centered">
        <PixieState state="connectionLost" size="large" statusText="Reconnecting..." />
      </div>
    );
  }

  if (viewerState === 'host-stopped') {
    return (
      <div className="viewerView viewerView--centered">
        <PixieState state="hostStopped" size="large" />
        <a className="viewerHomeLink" href="/">Go to Peeksy Home</a>
      </div>
    );
  }

  if (viewerState === 'room-not-found') {
    return (
      <div className="viewerView viewerView--centered">
        <PixieState state="roomNotFound" size="large" />
        <a className="viewerHomeLink" href="/">Go to Peeksy Home</a>
      </div>
    );
  }

  if (viewerState === 'room-full') {
    return (
      <div className="viewerView viewerView--centered">
        <PixieState state="roomFull" size="large" />
        <a className="viewerHomeLink" href="/">Go to Peeksy Home</a>
      </div>
    );
  }

  if (viewerState === 'room-expired') {
    return (
      <div className="viewerView viewerView--centered">
        <PixieState state="roomExpired" size="large" />
        <a className="viewerHomeLink" href="/">Go to Peeksy Home</a>
      </div>
    );
  }

  if (viewerState === 'disconnected') {
    return (
      <div className="viewerView viewerView--centered">
        <PixieState state="connectionLost" size="large" />
        <button
          className="viewerRefreshButton"
          onClick={() => window.location.reload()}
          type="button"
        >
          Refresh
        </button>
      </div>
    );
  }

  // Fallback
  return (
    <div className="viewerView viewerView--centered">
      <PixieState state="connecting" size="large" />
    </div>
  );
}
