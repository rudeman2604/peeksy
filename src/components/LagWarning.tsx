import type { ConnectionQuality, QualityPresetName, ToolbarPosition } from '../lib/types';
import { QUALITY_PRESETS } from '../lib/constants';

import './LagWarning.css';

// ── Types ──

interface LagWarningProps {
  quality: ConnectionQuality;
  suggestedPreset: QualityPresetName;
  onSwitch: () => void;
  onDismiss: () => void;
  toolbarPosition: ToolbarPosition;
}

// ── Component ──

export default function LagWarning({
  quality,
  suggestedPreset,
  onSwitch,
  onDismiss,
  toolbarPosition,
}: LagWarningProps) {
  const presetLabel = QUALITY_PRESETS[suggestedPreset].label;
  const isBad = quality === 'bad';

  // Position opposite the toolbar
  const position = toolbarPosition === 'top' ? 'bottom' : 'top';

  return (
    <div className={`lagWarning lagWarning--${position} lagWarning--${quality}`}>
      <img
        className="lagWarningPixie"
        src="/pixie/connection-lost.png"
        alt="Connection issue"
        draggable={false}
      />
      <div className="lagWarningContent">
        <span className="lagWarningText">
          {isBad
            ? 'Connection quality is poor'
            : 'Connection quality is degrading'}
        </span>
        <div className="lagWarningActions">
          <button
            className="lagWarningSwitch"
            onClick={onSwitch}
            type="button"
          >
            Switch to {presetLabel}
          </button>
          <button
            className="lagWarningDismiss"
            onClick={onDismiss}
            type="button"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
