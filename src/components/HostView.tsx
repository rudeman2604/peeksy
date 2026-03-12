import { useState, useEffect, useCallback, useRef } from 'react';

import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSettings } from '../hooks/useSettings';
import { useHeartbeat } from '../hooks/useHeartbeat';

import { WS_MESSAGES, getRoomUrl } from '../lib/constants';
import type { WsMessage, WsRoomCreated, WsViewerJoined, WsViewerLeft } from '../lib/types';

import Toolbar from './Toolbar';
import Toast from './Toast';
import StatusNotificationContainer, {
  createJoinNotification,
  createLeaveNotification,
} from './StatusNotification';
import type { StatusNotificationItem } from './StatusNotification';

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
  const [notifications, setNotifications] = useState<StatusNotificationItem[]>([]);
  const [roomPassword, setRoomPassword] = useState<string | null>(null);

  const { settings, updateSetting, updateNestedSetting, resetSettings } = useSettings();
  const { send, lastMessage, connectionState } = useSignaling(true);

  useHeartbeat({ connectionState });

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

  // Handle room_created and viewer join/leave messages
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

      // Apply saved password if any
      if (roomPassword) {
        send({
          type: WS_MESSAGES.ROOM_SETTINGS,
          password: roomPassword,
        } as WsMessage);
      }
    }

    // Show join/leave notifications
    if (lastMessage.type === WS_MESSAGES.VIEWER_JOINED && settings.showNotifications) {
      setNotifications(prev => [...prev, createJoinNotification()]);
    }

    if (lastMessage.type === WS_MESSAGES.VIEWER_LEFT && settings.showNotifications) {
      setNotifications(prev => [...prev, createLeaveNotification()]);
    }
  }, [lastMessage, settings.showNotifications, roomPassword, send]);

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

  const handleReplaceVideoTrack = useCallback((track: MediaStreamTrack) => {
    replaceVideoTrack(track);
  }, [replaceVideoTrack]);

  const handleRegenerateLink = useCallback(() => {
    cleanup();
    setRoomCreated(false);
    setRoomUrl('');
    showToast('Link regenerated!');
  }, [cleanup, showToast]);

  // Handle password changes from settings
  const handlePasswordChange = useCallback((password: string | null) => {
    setRoomPassword(password);
    send({
      type: WS_MESSAGES.ROOM_SETTINGS,
      password: password,
    } as WsMessage);
    showToast(password ? 'Room password set' : 'Room password removed');
  }, [send, showToast]);

  const handleNotificationExpire = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

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
        settings={settings}
        onUpdateSetting={updateSetting}
        onUpdateNestedSetting={updateNestedSetting}
        onResetSettings={resetSettings}
        roomPassword={roomPassword}
        onPasswordChange={handlePasswordChange}
      />
      <StatusNotificationContainer
        notifications={notifications}
        onExpire={handleNotificationExpire}
        toolbarPosition={settings.toolbarPosition}
      />
      <Toast text={toastText} onDone={() => setToastText(null)} />
    </>
  );
}
