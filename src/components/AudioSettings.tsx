import { useState, useCallback, useEffect, useRef } from 'react';

import { useAudio } from '../hooks/useAudio';

import './Toolbar.css';

// ── Types ──

interface AudioSettingsProps {
  screenStream: MediaStream;
  onAudioTrackChange: (track: MediaStreamTrack) => void;
}

// ── Component ──

export default function AudioSettings({ screenStream, onAudioTrackChange }: AudioSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    audioDevices,
    selectedDeviceId,
    isMuted,
    hasSystemAudio,
    isSystemAudioEnabled,
    selectDevice,
    toggleMute,
    toggleSystemAudio,
    enumerateDevices,
  } = useAudio(screenStream, onAudioTrackChange);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) {
        // Enumerate devices when opening
        enumerateDevices();
      }
      return !prev;
    });
  }, [enumerateDevices]);

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

  const handleSelectDevice = useCallback((deviceId: string) => {
    selectDevice(deviceId);
  }, [selectDevice]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className={`toolbarButton ${isMuted ? '' : selectedDeviceId ? 'toolbarButton--active' : ''}`}
        onClick={toggleDropdown}
        type="button"
        title={isMuted ? 'Microphone muted' : 'Audio settings'}
      >
        <span className="toolbarButtonIcon">
          {isMuted ? '\uD83D\uDD07' : '\uD83C\uDF99'}
        </span>
        <span className="toolbarButtonLabel">Audio</span>
      </button>

      {isOpen && (
        <div className="toolbarDropdown" style={{ minWidth: '260px' }}>
          {/* Microphone section */}
          <div className="toolbarDropdownItem toolbarDropdownItem--info">
            Microphone
          </div>

          {audioDevices.length === 0 ? (
            <div className="toolbarDropdownItem toolbarDropdownItem--info">
              No microphones found
            </div>
          ) : (
            audioDevices.map((device) => (
              <button
                key={device.deviceId}
                className="toolbarDropdownItem"
                onClick={() => handleSelectDevice(device.deviceId)}
              >
                {device.deviceId === selectedDeviceId ? '\u2713 ' : '  '}
                {device.label}
              </button>
            ))
          )}

          {selectedDeviceId && (
            <>
              <div className="toolbarDropdownSeparator" />
              <button
                className="toolbarDropdownItem"
                onClick={toggleMute}
                style={{
                  color: isMuted ? 'var(--pk-live-red)' : 'var(--pk-connection-healthy)',
                  fontWeight: 600,
                }}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            </>
          )}

          <div className="toolbarDropdownSeparator" />

          {/* System Audio section */}
          <div className="toolbarDropdownItem toolbarDropdownItem--info">
            System Audio
          </div>

          {hasSystemAudio ? (
            <button className="toolbarDropdownItem" onClick={toggleSystemAudio}>
              {isSystemAudioEnabled ? '\u2713 Enabled' : 'Disabled'}
            </button>
          ) : (
            <div className="toolbarDropdownItem toolbarDropdownItem--info">
              Not available for this share type
            </div>
          )}

          <div className="toolbarDropdownSeparator" />
          <div className="toolbarDropdownItem toolbarDropdownItem--info">
            Audio output is controlled by the viewer's device
          </div>
        </div>
      )}
    </div>
  );
}
