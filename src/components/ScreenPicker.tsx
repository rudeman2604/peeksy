import { useState, useCallback, useEffect, useRef } from 'react';

import './Toolbar.css';

// ── Types ──

interface ScreenPickerProps {
  sourceLabel: string;
  onChangeSource: () => Promise<boolean>;
  onStopSharing: () => void;
}

// ── Component ──

export default function ScreenPicker({ sourceLabel, onChangeSource, onStopSharing }: ScreenPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleChangeSource = useCallback(async () => {
    setIsOpen(false);
    await onChangeSource();
  }, [onChangeSource]);

  const handleStopSharing = useCallback(() => {
    setIsOpen(false);
    onStopSharing();
  }, [onStopSharing]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Truncate long source labels
  const displayLabel = sourceLabel.length > 24
    ? sourceLabel.substring(0, 24) + '...'
    : sourceLabel;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className={`toolbarButton ${isOpen ? 'toolbarButton--active' : ''}`}
        onClick={toggleDropdown}
        type="button"
      >
        <span className="toolbarButtonIcon">{'\uD83D\uDCBB'}</span>
        <span className="toolbarButtonLabel">{displayLabel || 'Source'}</span>
      </button>

      {isOpen && (
        <div className="toolbarDropdown">
          <div className="toolbarDropdownItem toolbarDropdownItem--info">
            Sharing: {sourceLabel || 'Unknown'}
          </div>
          <div className="toolbarDropdownSeparator" />
          <button className="toolbarDropdownItem" onClick={handleChangeSource}>
            Change Source
          </button>
          <button className="toolbarDropdownItem toolbarDropdownItem--danger" onClick={handleStopSharing}>
            Stop Sharing
          </button>
        </div>
      )}
    </div>
  );
}
