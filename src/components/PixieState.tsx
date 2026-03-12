import { useMemo } from 'react';

import { PIXIE_STATES } from '../lib/constants';
import type { PixieStateConfig } from '../lib/types';

import './PixieState.css';

// ── Types ──

interface PixieStateProps {
  state: string;
  size?: 'small' | 'medium' | 'large';
  statusText?: string; // override the default status text
}

// ── Component ──

export default function PixieState({ state, size = 'medium', statusText }: PixieStateProps) {
  const config: PixieStateConfig | undefined = useMemo(() => {
    return PIXIE_STATES[state];
  }, [state]);

  if (!config) {
    return null;
  }

  const displayText = statusText ?? config.statusText;

  return (
    <div className={`pixieState pixieState--${size}`}>
      {config.isAnimated ? (
        <div
          className="pixieRolling"
          aria-label="Connecting animation"
          style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/pixie/rolling-sprite.png)` }}
        />
      ) : (
        <img
          className="pixieImage"
          src={config.imageSrc}
          alt={config.statusText}
          draggable={false}
        />
      )}
      {displayText && (
        <p className="pixieStatusText">{displayText}</p>
      )}
    </div>
  );
}
