import { useState, useCallback, useEffect, useRef } from 'react';

import type { WsMessage, ViewerInfo, PiPPosition } from '../lib/types';

import ScreenPicker from './ScreenPicker';
import PiPCamera from './PiPCamera';
import AudioSettings from './AudioSettings';
import LinkManager from './LinkManager';

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
}: ToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Escape to collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Viewer dots (max 3 shown, "+N more" for extra)
  const viewerEntries = Array.from(viewers.entries());
  const visibleViewers = viewerEntries.slice(0, 3);
  const extraCount = viewerEntries.length - 3;

  return (
    <div
      ref={toolbarRef}
      className={`toolbar ${isExpanded ? 'toolbar--expanded' : 'toolbar--collapsed'}`}
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
            <span className="toolbarLiveDot" />
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
              className="toolbarButton toolbarButton--disabled"
              type="button"
              title="Settings (coming soon)"
              disabled
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
  );
}
