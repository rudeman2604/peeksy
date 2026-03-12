import { useCallback } from 'react';

import PixieState from './PixieState';

import './SplashScreen.css';

// ── Types ──

interface SplashScreenProps {
  onStartCapture: () => void;
  isFading: boolean;
}

// ── Component ──

export default function SplashScreen({ onStartCapture, isFading }: SplashScreenProps) {
  const handleStartClick = useCallback(() => {
    onStartCapture();
  }, [onStartCapture]);

  return (
    <div className={`splashScreen ${isFading ? 'splashScreen--fadeOut' : ''}`}>
      <div className="splashContent">
        <img
          className="splashLogo"
          src="/peeksy-logo.png"
          alt="Peeksy"
          draggable={false}
        />

        <PixieState state="idle" size="medium" />

        <button
          className="startButton"
          onClick={handleStartClick}
          type="button"
        >
          Start Peeking
        </button>
      </div>
    </div>
  );
}
