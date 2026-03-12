import { useState, useEffect, useCallback, useRef } from 'react';

import { WS_MESSAGES } from '../lib/constants';
import type { WsMessage, ViewerInfo } from '../lib/types';

// ── Types ──

interface UseWebRTCProps {
  stream: MediaStream | null;
  send: (message: WsMessage) => void;
  lastMessage: WsMessage | null;
  isHost: boolean;
}

interface UseWebRTCReturn {
  viewerCount: number;
  viewers: Map<string, ViewerInfo>;
  cleanup: () => void;
  replaceVideoTrack: (newTrack: MediaStreamTrack) => void;
  addOrReplaceAudioTrack: (audioTrack: MediaStreamTrack) => void;
  applyBitrateToAll: (maxBitrate: number | undefined) => Promise<void>;
  connectionsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>;
}

// ── Config ──

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ── Hook ──

export function useWebRTC({ stream, send, lastMessage, isHost }: UseWebRTCProps): UseWebRTCReturn {
  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState<Map<string, ViewerInfo>>(new Map());

  const connectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const streamRef = useRef<MediaStream | null>(stream);

  // Keep streamRef in sync
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // ── Replace video track on all PeerConnections ──
  const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
    connectionsRef.current.forEach((pc, viewerId) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        try {
          sender.replaceTrack(newTrack);
          console.log(`[WebRTC] Replaced video track for ${viewerId}`);
        } catch (error) {
          console.error(`[WebRTC] Failed to replace video track for ${viewerId}:`, error);
        }
      }
    });
  }, []);

  // ── Add or replace audio track on all PeerConnections ──
  const addOrReplaceAudioTrack = useCallback((audioTrack: MediaStreamTrack) => {
    connectionsRef.current.forEach((pc, viewerId) => {
      const existingSender = pc.getSenders().find(s => s.track?.kind === 'audio');
      if (existingSender) {
        try {
          existingSender.replaceTrack(audioTrack);
          console.log(`[WebRTC] Replaced audio track for ${viewerId}`);
        } catch (error) {
          console.error(`[WebRTC] Failed to replace audio track for ${viewerId}:`, error);
        }
      } else {
        try {
          if (streamRef.current) {
            pc.addTrack(audioTrack, streamRef.current);
            console.log(`[WebRTC] Added audio track for ${viewerId}`);
          }
        } catch (error) {
          console.error(`[WebRTC] Failed to add audio track for ${viewerId}:`, error);
        }
      }
    });
  }, []);

  // ── Apply bitrate limit to all PeerConnections ──
  const applyBitrateToAll = useCallback(async (maxBitrate: number | undefined) => {
    for (const [viewerId, pc] of connectionsRef.current) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = maxBitrate;
          await sender.setParameters(params);
          console.log(`[WebRTC] Set bitrate for ${viewerId}: ${maxBitrate || 'unlimited'}`);
        } catch (error) {
          console.error(`[WebRTC] Failed to set bitrate for ${viewerId}:`, error);
        }
      }
    }
  }, []);

  // ── Create PeerConnection for a new viewer ──
  const createPeerConnection = useCallback(async (viewerId: string) => {
    if (!streamRef.current) {
      console.warn('[WebRTC] No stream available for creating offer');
      return;
    }

    console.log(`[WebRTC] Creating PeerConnection for viewer ${viewerId}`);
    const pc = new RTCPeerConnection(rtcConfig);

    // Add all tracks from the current stream
    streamRef.current.getTracks().forEach(track => {
      if (streamRef.current) {
        pc.addTrack(track, streamRef.current);
      }
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: WS_MESSAGES.ICE_CANDIDATE,
          candidate: event.candidate.toJSON(),
          viewerId,
        } as WsMessage);
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${viewerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        console.log(`[WebRTC] Connection to viewer ${viewerId} failed/closed`);
      }
    };

    // Store the connection
    connectionsRef.current.set(viewerId, pc);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      send({
        type: WS_MESSAGES.SDP_OFFER,
        sdp: pc.localDescription as RTCSessionDescriptionInit,
        viewerId,
      } as WsMessage);

      console.log(`[WebRTC] Sent SDP offer to viewer ${viewerId}`);
    } catch (error) {
      console.error(`[WebRTC] Failed to create offer for ${viewerId}:`, error);
      pc.close();
      connectionsRef.current.delete(viewerId);
    }
  }, [send]);

  // ── Set remote description and flush queued candidates ──
  const setRemoteAndFlush = useCallback(async (viewerId: string, description: RTCSessionDescriptionInit) => {
    const pc = connectionsRef.current.get(viewerId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(description));

      const queue = pendingCandidatesRef.current.get(viewerId) || [];
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error(`[WebRTC] Failed to add queued ICE candidate for ${viewerId}:`, error);
        }
      }
      pendingCandidatesRef.current.delete(viewerId);
    } catch (error) {
      console.error(`[WebRTC] Failed to set remote description for ${viewerId}:`, error);
    }
  }, []);

  // ── Handle incoming ICE candidate ──
  const handleIceCandidate = useCallback((viewerId: string, candidate: RTCIceCandidateInit) => {
    const pc = connectionsRef.current.get(viewerId);

    if (pc && pc.remoteDescription) {
      try {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error(`[WebRTC] Failed to add ICE candidate for ${viewerId}:`, error);
      }
    } else {
      const queue = pendingCandidatesRef.current.get(viewerId) || [];
      queue.push(candidate);
      pendingCandidatesRef.current.set(viewerId, queue);
    }
  }, []);

  // ── Remove a viewer's PeerConnection ──
  const removeViewerConnection = useCallback((viewerId: string) => {
    const pc = connectionsRef.current.get(viewerId);
    if (pc) {
      pc.close();
      connectionsRef.current.delete(viewerId);
    }
    pendingCandidatesRef.current.delete(viewerId);

    setViewers(prev => {
      const next = new Map(prev);
      next.delete(viewerId);
      return next;
    });
  }, []);

  // ── Cleanup all connections ──
  const cleanup = useCallback(() => {
    connectionsRef.current.forEach((pc) => {
      pc.close();
    });
    connectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    setViewerCount(0);
    setViewers(new Map());
  }, []);

  // ── Process signaling messages ──
  useEffect(() => {
    if (!lastMessage || !isHost) return;

    switch (lastMessage.type) {
      case WS_MESSAGES.VIEWER_NEEDS_OFFER: {
        const msg = lastMessage as { type: string; viewerId: string };
        createPeerConnection(msg.viewerId);
        break;
      }

      case WS_MESSAGES.VIEWER_JOINED: {
        const msg = lastMessage as { type: string; viewerId: string; viewerCount: number };
        setViewerCount(msg.viewerCount);
        setViewers(prev => {
          const next = new Map(prev);
          next.set(msg.viewerId, {
            viewerId: msg.viewerId,
            connectedAt: Date.now(),
            connectionQuality: 'unknown',
          });
          return next;
        });
        console.log(`[WebRTC] Viewer ${msg.viewerId} joined (${msg.viewerCount} total)`);
        break;
      }

      case WS_MESSAGES.VIEWER_LEFT: {
        const msg = lastMessage as { type: string; viewerId: string; viewerCount: number };
        setViewerCount(msg.viewerCount);
        removeViewerConnection(msg.viewerId);
        console.log(`[WebRTC] Viewer ${msg.viewerId} left (${msg.viewerCount} total)`);
        break;
      }

      case WS_MESSAGES.SDP_ANSWER: {
        const msg = lastMessage as { type: string; sdp: RTCSessionDescriptionInit; viewerId: string };
        setRemoteAndFlush(msg.viewerId, msg.sdp);
        break;
      }

      case WS_MESSAGES.ICE_CANDIDATE: {
        const msg = lastMessage as { type: string; candidate: RTCIceCandidateInit; viewerId: string };
        handleIceCandidate(msg.viewerId, msg.candidate);
        break;
      }
    }
  }, [lastMessage, isHost, createPeerConnection, setRemoteAndFlush, handleIceCandidate, removeViewerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      connectionsRef.current.forEach((pc) => pc.close());
      connectionsRef.current.clear();
    };
  }, []);

  return {
    viewerCount,
    viewers,
    cleanup,
    replaceVideoTrack,
    addOrReplaceAudioTrack,
    applyBitrateToAll,
    connectionsRef,
  };
}
