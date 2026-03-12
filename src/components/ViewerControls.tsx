import { useState, useEffect, useCallback, useRef } from 'react';

import './ViewerControls.css';

// ── Types ──

interface ViewerControlsProps {
  onFullscreen: () => void;
  onPiP: () => void;
  isFullscreen: boolean;
  isPiP: boolean;
}

// ── Config ──

const AUTO_HIDE_DELAY = 3000;

// ── Component ──

export default function ViewerControls({
  onFullscreen,
  onPiP,
  isFullscreen,
  isPiP,
}: ViewerControlsProps) {
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, AUTO_HIDE_DELAY);
  }, []);

  // Start auto-hide timer on mount
  useEffect(() => {
    resetHideTimer();

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [resetHideTimer]);

  // Listen for mouse movement and touch to show controls
  useEffect(() => {
    const handleActivity = () => {
      resetHideTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [resetHideTimer]);

  return (
    <div className={`viewerControls ${visible ? 'viewerControls--visible' : 'viewerControls--hidden'}`}>
      <div className="viewerControlsBar">
        <img
          className="viewerControlsLogo"
          src="/peeksy-logo.png"
          alt="Peeksy"
          draggable={false}
        />

        <div className="viewerControlsActions">
          <button
            className="viewerControlsButton"
            onClick={onPiP}
            type="button"
            title={isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
          >
            {isPiP ? '\u2716' : '\u25A3'}
          </button>

          <button
            className="viewerControlsButton"
            onClick={onFullscreen}
            type="button"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? '\u2716' : '\u26F6'}
          </button>
        </div>
      </div>
    </div>
  );
}
