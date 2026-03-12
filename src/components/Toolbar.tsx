import { useState, useCallback, useEffect, useRef } from 'react';

import type { ViewerInfo, PeeksySettings, ConnectionQuality } from '../lib/types';

import ScreenPicker from './ScreenPicker';
import PiPCamera from './PiPCamera';
import AudioSettings from './AudioSettings';
import LinkManager from './LinkManager';
import SettingsPanel from './SettingsPanel';

import './Toolbar.css';

// ── Types ──

interface ToolbarProps {
  stream: MediaStream;
  viewerCount: number;
  viewers: Map<string, ViewerInfo>;
  roomUrl: string;
  sourceLabel: string;
  onChangeSource: () => Promise<boolean>;
  onStopSharing: () => void;
  onAudioTrackChange: (track: MediaStreamTrack) => void;
  replaceVideoTrack: (track: MediaStreamTrack) => void;
  onRegenerateLink: () => void;
  showToast: (text: string) => void;
  settings: PeeksySettings;
  onUpdateSetting: <K extends keyof PeeksySettings>(key: K, value: PeeksySettings[K]) => void;
  onUpdateNestedSetting: <K extends keyof PeeksySettings, NK extends keyof PeeksySettings[K]>(
    key: K, nestedKey: NK, value: PeeksySettings[K][NK]
  ) => void;
  onResetSettings: () => void;
  roomPassword: string | null;
  onPasswordChange: (password: string | null) => void;
  overallQuality: ConnectionQuality;
  connectionColors: PeeksySettings['connectionColors'];
}

// ── Component ──

export default function Toolbar({
  stream,
  viewerCount,
  viewers,
  roomUrl,
  sourceLabel,
  onChangeSource,
  onStopSharing,
  onAudioTrackChange,
  replaceVideoTrack,
  onRegenerateLink,
  showToast,
  settings,
  onUpdateSetting,
  onUpdateNestedSetting,
  onResetSettings,
  roomPassword,
  onPasswordChange,
  overallQuality,
  connectionColors,
}: ToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Escape to collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
        } else if (isExpanded) {
          setIsExpanded(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, showSettings]);

  // Viewer dots (max 3 shown, "+N more" for extra)
  const viewerEntries = Array.from(viewers.entries());
  const visibleViewers = viewerEntries.slice(0, 3);
  const extraCount = viewerEntries.length - 3;

  // Toolbar position from settings
  const positionStyle = settings.toolbarPosition === 'bottom'
    ? { top: 'auto', bottom: '0', borderRadius: 'var(--pk-radius-lg) var(--pk-radius-lg) 0 0', borderTop: '1px solid var(--pk-border)', borderBottom: 'none' }
    : {};

  return (
    <>
      <div
        ref={toolbarRef}
        className={`toolbar ${isExpanded ? 'toolbar--expanded' : 'toolbar--collapsed'}`}
        style={positionStyle}
      >
        {/* ── Collapsed bar ── */}
        <div className="toolbarCollapsedBar" onClick={toggleExpand}>
          <div className="toolbarLeft">
            <div className="toolbarTelescopeWrap">
              <img
                className="toolbarTelescopeIcon"
                src="/pixie/telescope.png"
                alt="Live"
                draggable={false}
              />
              <span
                className={`toolbarLiveDot toolbarLiveDot--${overallQuality}`}
                style={{
                  backgroundColor: overallQuality === 'bad'
                    ? connectionColors.bad
                    : overallQuality === 'degrading'
                    ? connectionColors.degrading
                    : connectionColors.healthy,
                }}
              />
            </div>
            <span className="toolbarViewerCount">{viewerCount}</span>
          </div>
          <button
            className="toolbarChevron"
            onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
            type="button"
            aria-label={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
          >
            {isExpanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>

        {/* ── Expanded content ── */}
        {isExpanded && (
          <div className="toolbarExpandedContent">
            <div className="toolbarControls">
              <img
                className="toolbarLogo"
                src="/peeksy-logo.png"
                alt="Peeksy"
                draggable={false}
              />

              <ScreenPicker
                sourceLabel={sourceLabel}
                onChangeSource={onChangeSource}
                onStopSharing={onStopSharing}
              />

              <PiPCamera
                stream={stream}
                replaceVideoTrack={replaceVideoTrack}
              />

              <AudioSettings
                screenStream={stream}
                onAudioTrackChange={onAudioTrackChange}
              />

              <LinkManager
                roomUrl={roomUrl}
                onRegenerate={onRegenerateLink}
                showToast={showToast}
              />

              <button
                className={`toolbarButton ${showSettings ? 'toolbarButton--active' : ''}`}
                type="button"
                title="Settings"
                onClick={() => setShowSettings(true)}
              >
                <span className="toolbarButtonIcon">{'\u2699'}</span>
                <span className="toolbarButtonLabel">Options</span>
              </button>
            </div>

            {/* ── Viewer dots sub-row ── */}
            {viewerCount > 0 && (
              <div className="toolbarViewerDots">
                {visibleViewers.map(([id], index) => (
                  <div
                    key={id}
                    className="toolbarViewerDot"
                    title={`Viewer ${index + 1}`}
                    style={{
                      backgroundColor: overallQuality === 'bad'
                        ? connectionColors.bad
                        : overallQuality === 'degrading'
                        ? connectionColors.degrading
                        : connectionColors.healthy,
                    }}
                  />
                ))}
                {extraCount > 0 && (
                  <span className="toolbarViewerExtra">+{extraCount} more</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Settings Panel (modal) ── */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdateSetting={onUpdateSetting}
          onUpdateNestedSetting={onUpdateNestedSetting}
          onResetSettings={onResetSettings}
          onClose={() => setShowSettings(false)}
          roomPassword={roomPassword}
          onPasswordChange={onPasswordChange}
        />
      )}
    </>
  );
}
