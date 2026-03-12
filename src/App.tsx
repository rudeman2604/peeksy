import { useState, useCallback, useMemo } from 'react';

import { useScreenCapture } from './hooks/useScreenCapture';

import type { AppState } from './lib/types';

import SplashScreen from './components/SplashScreen';
import HostView from './components/HostView';
import ViewerView from './components/ViewerView';

// ── Component ──

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [isFading, setIsFading] = useState(false);

  const handleTrackEnded = useCallback(() => {
    setAppState('idle');
  }, []);

  const { stream, sourceLabel, startCapture, stopCapture, changeSource } = useScreenCapture(handleTrackEnded);

  // Parse the URL to determine if this is a viewer
  const viewerRoomId = useMemo(() => {
    const match = window.location.pathname.match(/^\/room\/(.+)$/);
    return match ? match[1] : null;
  }, []);

  const handleStartCapture = useCallback(async () => {
    setAppState('picking');
    const success = await startCapture();

    if (success) {
      // Fade out splash, then show host view
      setIsFading(true);
      setTimeout(() => {
        setAppState('live');
        setIsFading(false);
      }, 300);
    } else {
      // User cancelled — return to idle
      setAppState('idle');
    }
  }, [startCapture]);

  const handleStopSharing = useCallback(() => {
    stopCapture();
    setAppState('idle');
  }, [stopCapture]);

  const handleReplaceStreamTrack = useCallback((newTrack: MediaStreamTrack) => {
    // This is a no-op at the App level — PiPCamera handles track replacement
    // through the WebRTC hook's replaceVideoTrack directly
  }, []);

  // ── Viewer Path ──
  if (viewerRoomId) {
    return <ViewerView roomId={viewerRoomId} />;
  }

  // ── Host Path ──
  if (appState === 'live' && stream) {
    return (
      <HostView
        stream={stream}
        sourceLabel={sourceLabel}
        onStopSharing={handleStopSharing}
        onChangeSource={changeSource}
        replaceStreamTrack={handleReplaceStreamTrack}
      />
    );
  }

  return (
    <SplashScreen
      onStartCapture={handleStartCapture}
      isFading={isFading}
    />
  );
}
