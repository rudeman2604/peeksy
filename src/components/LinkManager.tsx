import { useState, useCallback, useEffect, useRef } from 'react';

import './Toolbar.css';

// ── Types ──

interface LinkManagerProps {
  roomUrl: string;
  onRegenerate: () => void;
  showToast: (text: string) => void;
}

// ── Component ──

export default function LinkManager({ roomUrl, onRegenerate, showToast }: LinkManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
    setShowConfirm(false);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowConfirm(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      showToast('Link copied!');
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn('[LinkManager] Clipboard write failed');
    }
  }, [roomUrl, showToast]);

  const handleRegenerate = useCallback(() => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setShowConfirm(false);
    setIsOpen(false);
    onRegenerate();
  }, [showConfirm, onRegenerate]);

  const cancelRegenerate = useCallback(() => {
    setShowConfirm(false);
  }, []);

  // Truncate URL for display
  const displayUrl = roomUrl.length > 40
    ? roomUrl.substring(0, 40) + '...'
    : roomUrl;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className={`toolbarButton ${isOpen ? 'toolbarButton--active' : ''}`}
        onClick={toggleDropdown}
        type="button"
      >
        <span className="toolbarButtonIcon">{'\uD83D\uDD17'}</span>
        <span className="toolbarButtonLabel">Link</span>
      </button>

      {isOpen && (
        <div className="toolbarDropdown" style={{ minWidth: '300px' }}>
          <div className="toolbarDropdownItem toolbarDropdownItem--info">
            Room Link
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--pk-space-xs)',
            padding: '0 var(--pk-space-sm)',
          }}>
            <code
              onClick={copyLink}
              style={{
                flex: 1,
                padding: 'var(--pk-space-xs) var(--pk-space-sm)',
                background: 'var(--pk-bg-secondary)',
                borderRadius: 'var(--pk-radius-sm)',
                color: 'var(--pk-text-primary)',
                fontSize: 'var(--pk-font-size-xs)',
                fontFamily: 'var(--pk-font-mono)',
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
                userSelect: 'all' as const,
              }}
              title={roomUrl}
            >
              {displayUrl}
            </code>
            <button
              onClick={copyLink}
              style={{
                padding: 'var(--pk-space-xs) var(--pk-space-sm)',
                background: 'var(--pk-accent)',
                color: 'var(--pk-text-primary)',
                border: 'none',
                borderRadius: 'var(--pk-radius-md)',
                cursor: 'pointer',
                fontFamily: 'var(--pk-font-family)',
                fontSize: 'var(--pk-font-size-xs)',
                fontWeight: 600,
                whiteSpace: 'nowrap' as const,
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="toolbarDropdownSeparator" />

          {!showConfirm ? (
            <button className="toolbarDropdownItem" onClick={handleRegenerate}>
              Regenerate Link
            </button>
          ) : (
            <div style={{ padding: 'var(--pk-space-sm)' }}>
              <p style={{
                color: 'var(--pk-text-secondary)',
                fontSize: 'var(--pk-font-size-xs)',
                marginBottom: 'var(--pk-space-sm)',
              }}>
                This will disconnect all current viewers. Continue?
              </p>
              <div style={{ display: 'flex', gap: 'var(--pk-space-xs)' }}>
                <button
                  onClick={handleRegenerate}
                  style={{
                    flex: 1,
                    padding: 'var(--pk-space-xs)',
                    background: 'var(--pk-live-red)',
                    color: 'var(--pk-text-primary)',
                    border: 'none',
                    borderRadius: 'var(--pk-radius-md)',
                    cursor: 'pointer',
                    fontFamily: 'var(--pk-font-family)',
                    fontSize: 'var(--pk-font-size-xs)',
                  }}
                >
                  Yes, regenerate
                </button>
                <button
                  onClick={cancelRegenerate}
                  style={{
                    flex: 1,
                    padding: 'var(--pk-space-xs)',
                    background: 'transparent',
                    color: 'var(--pk-text-secondary)',
                    border: '1px solid var(--pk-border)',
                    borderRadius: 'var(--pk-radius-md)',
                    cursor: 'pointer',
                    fontFamily: 'var(--pk-font-family)',
                    fontSize: 'var(--pk-font-size-xs)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
