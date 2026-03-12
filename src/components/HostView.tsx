import { useState, useEffect, useCallback, useRef } from 'react';

import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';

import { WS_MESSAGES, getRoomUrl } from '../lib/constants';
import type { WsMessage, WsRoomCreated } from '../lib/types';

import Toolbar from './Toolbar';
import Toast from './Toast';

// ── Types ──

interface HostViewProps {
  stream: MediaStream;
  sourceLabel: string;
  onStopSharing: () => void;
  onChangeSource: () => Promise<boolean>;
  replaceStreamTrack: (newTrack: MediaStreamTrack) => void;
}

// ── Component ──

export default function HostView({
  stream,
  sourceLabel,
  onStopSharing,
  onChangeSource,
  replaceStreamTrack,
}: HostViewProps) {
  const [roomUrl, setRoomUrl] = useState<string>('');
  const [roomCreated, setRoomCreated] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const { send, lastMessage, connectionState } = useSignaling(true);

  const {
    viewerCount,
    viewers,
    cleanup,
    replaceVideoTrack,
    addOrReplaceAudioTrack,
  } = useWebRTC({
    stream,
    send,
    lastMessage,
    isHost: true,
  });

  // Create room once connected
  useEffect(() => {
    if (connectionState === 'connected' && !roomCreated) {
      send({ type: WS_MESSAGES.CREATE_ROOM } as WsMessage);
      setRoomCreated(true);
    }
  }, [connectionState, roomCreated, send]);

  // Handle room_created message
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === WS_MESSAGES.ROOM_CREATED) {
      const msg = lastMessage as WsRoomCreated;
      const url = getRoomUrl(msg.roomId);
      setRoomUrl(url);

      // Auto-copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied!');
        console.log('[Host] Link auto-copied to clipboard');
      }).catch(() => {
        console.warn('[Host] Clipboard write failed');
      });
    }
  }, [lastMessage]);

  const showToast = useCallback((text: string) => {
    setToastText(text);
  }, []);

  const handleStopSharing = useCallback(() => {
    send({ type: WS_MESSAGES.HOST_ENDED } as WsMessage);
    cleanup();
    onStopSharing();
  }, [send, cleanup, onStopSharing]);

  // When source changes, propagate new video track to all viewers
  const handleChangeSource = useCallback(async (): Promise<boolean> => {
    const success = await onChangeSource();
    if (success && stream) {
      const newVideoTrack = stream.getVideoTracks()[0];
      if (newVideoTrack) {
        replaceVideoTrack(newVideoTrack);
      }
    }
    return success;
  }, [onChangeSource, stream, replaceVideoTrack]);

  const handleAudioTrackChange = useCallback((track: MediaStreamTrack) => {
    addOrReplaceAudioTrack(track);
  }, [addOrReplaceAudioTrack]);

  // Handle video track replacement (from PiP camera)
  const handleReplaceVideoTrack = useCallback((track: MediaStreamTrack) => {
    replaceVideoTrack(track);
  }, [replaceVideoTrack]);

  const handleRegenerateLink = useCallback(() => {
    // Disconnect all viewers, destroy old room, create new one
    cleanup();
    setRoomCreated(false);
    setRoomUrl('');
    // The useEffect watching connectionState + roomCreated will auto-create a new room
    showToast('Link regenerated!');
  }, [cleanup, showToast]);

  return (
    <>
      <Toolbar
        stream={stream}
        viewerCount={viewerCount}
        viewers={viewers}
        roomUrl={roomUrl}
        sourceLabel={sourceLabel}
        onChangeSource={handleChangeSource}
        onStopSharing={handleStopSharing}
        onAudioTrackChange={handleAudioTrackChange}
        replaceVideoTrack={handleReplaceVideoTrack}
        onRegenerateLink={handleRegenerateLink}
        showToast={showToast}
      />
      <Toast text={toastText} onDone={() => setToastText(null)} />
    </>
  );
}
