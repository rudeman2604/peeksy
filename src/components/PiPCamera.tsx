import { useState, useCallback, useEffect, useRef } from 'react';

import type { PiPPosition } from '../lib/types';

import './Toolbar.css';

// ── Types ──

interface PiPCameraProps {
  stream: MediaStream;
  replaceVideoTrack: (track: MediaStreamTrack) => void;
}

// ── Constants ──

const PIP_CIRCLE_SIZE = 150;
const PIP_OFFSET = 20;
const PIP_BORDER = 2;

const POSITIONS: { label: string; value: PiPPosition }[] = [
  { label: 'TL', value: 'top-left' },
  { label: 'TR', value: 'top-right' },
  { label: 'BL', value: 'bottom-left' },
  { label: 'BR', value: 'bottom-right' },
];

// ── Component ──

export default function PiPCamera({ stream, replaceVideoTrack }: PiPCameraProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState<PiPPosition>('bottom-left');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const positionRef = useRef<PiPPosition>(position);
  const originalTrackRef = useRef<MediaStreamTrack | null>(null);

  // Keep positionRef in sync
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

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

  // ── Enable PiP camera ──
  const enablePiP = useCallback(async (pos: PiPPosition) => {
    setPosition(pos);
    positionRef.current = pos;
    setCameraError(null);

    try {
      const webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = webcamStream;

      // Create hidden video elements
      const webcamVideo = document.createElement('video');
      webcamVideo.srcObject = webcamStream;
      webcamVideo.muted = true;
      webcamVideo.playsInline = true;
      await webcamVideo.play();
      webcamVideoRef.current = webcamVideo;

      const screenVideo = document.createElement('video');
      const screenTrack = stream.getVideoTracks()[0];
      if (!screenTrack) return;

      originalTrackRef.current = screenTrack;

      const screenOnlyStream = new MediaStream([screenTrack]);
      screenVideo.srcObject = screenOnlyStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      await screenVideo.play();
      screenVideoRef.current = screenVideo;

      // Create canvas
      const settings = screenTrack.getSettings();
      const canvasWidth = settings.width || 1280;
      const canvasHeight = settings.height || 720;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvasRef.current = canvas;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Scale PiP size relative to resolution
      const scale = canvasHeight / 1080;
      const circleSize = Math.round(PIP_CIRCLE_SIZE * scale);
      const offset = Math.round(PIP_OFFSET * scale);
      const border = Math.round(PIP_BORDER * scale);

      // Compositing loop
      const renderFrame = () => {
        if (!screenVideoRef.current || !webcamVideoRef.current || !canvasRef.current) return;

        ctx.drawImage(screenVideoRef.current, 0, 0, canvasWidth, canvasHeight);

        // Calculate PiP position
        const currentPos = positionRef.current;
        let cx: number, cy: number;

        switch (currentPos) {
          case 'top-left':
            cx = offset + circleSize / 2;
            cy = offset + circleSize / 2;
            break;
          case 'top-right':
            cx = canvasWidth - offset - circleSize / 2;
            cy = offset + circleSize / 2;
            break;
          case 'bottom-left':
            cx = offset + circleSize / 2;
            cy = canvasHeight - offset - circleSize / 2;
            break;
          case 'bottom-right':
          default:
            cx = canvasWidth - offset - circleSize / 2;
            cy = canvasHeight - offset - circleSize / 2;
            break;
        }

        // Draw white border circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, circleSize / 2 + border, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Clip and draw webcam
        ctx.beginPath();
        ctx.arc(cx, cy, circleSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          webcamVideoRef.current,
          cx - circleSize / 2,
          cy - circleSize / 2,
          circleSize,
          circleSize
        );
        ctx.restore();

        animFrameRef.current = requestAnimationFrame(renderFrame);
      };

      renderFrame();

      // Capture canvas stream and replace video track
      const canvasStream = canvas.captureStream(30);
      canvasStreamRef.current = canvasStream;

      const canvasTrack = canvasStream.getVideoTracks()[0];
      if (canvasTrack) {
        replaceVideoTrack(canvasTrack);
      }

      setIsActive(true);
      setIsOpen(false);
      console.log(`[PiP] Camera enabled at ${pos}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setCameraError('Camera access denied');
      } else {
        setCameraError('No camera found');
      }
      console.error('[PiP] Failed to enable camera:', error);
    }
  }, [stream, replaceVideoTrack]);

  // ── Disable PiP camera ──
  const disablePiP = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);

    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }

    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach(t => t.stop());
      canvasStreamRef.current = null;
    }

    webcamVideoRef.current = null;
    screenVideoRef.current = null;
    canvasRef.current = null;

    // Restore original screen track
    if (originalTrackRef.current) {
      replaceVideoTrack(originalTrackRef.current);
    }

    setIsActive(false);
    setIsOpen(false);
    console.log('[PiP] Camera disabled');
  }, [replaceVideoTrack]);

  // ── Change position while active ──
  const changePosition = useCallback((pos: PiPPosition) => {
    setPosition(pos);
    positionRef.current = pos;
    // The render loop picks up the new position immediately
    if (!isActive) {
      enablePiP(pos);
    }
  }, [isActive, enablePiP]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className={`toolbarButton ${isActive ? 'toolbarButton--active' : ''} ${cameraError ? 'toolbarButton--disabled' : ''}`}
        onClick={toggleDropdown}
        type="button"
        title={cameraError || (isActive ? 'Camera on' : 'Camera off')}
        disabled={!!cameraError}
      >
        <span className="toolbarButtonIcon">
          {isActive ? '\uD83D\uDCF7' : '\uD83D\uDCF7'}
        </span>
        <span className="toolbarButtonLabel">
          {isActive ? 'Cam On' : 'Camera'}
        </span>
      </button>

      {isOpen && (
        <div className="toolbarDropdown" style={{ minWidth: '180px' }}>
          <div className="toolbarDropdownItem toolbarDropdownItem--info">
            Camera Position
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--pk-space-xs)',
            padding: 'var(--pk-space-xs)',
          }}>
            {POSITIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => changePosition(value)}
                style={{
                  padding: 'var(--pk-space-sm)',
                  borderRadius: 'var(--pk-radius-md)',
                  border: position === value && isActive
                    ? '2px solid var(--pk-accent)'
                    : '1px solid var(--pk-border)',
                  background: position === value && isActive
                    ? 'var(--pk-accent-glow)'
                    : 'transparent',
                  color: 'var(--pk-text-primary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--pk-font-family)',
                  fontSize: 'var(--pk-font-size-sm)',
                  textAlign: 'center' as const,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {isActive && (
            <>
              <div className="toolbarDropdownSeparator" />
              <button
                className="toolbarDropdownItem toolbarDropdownItem--danger"
                onClick={disablePiP}
              >
                Turn Off Camera
              </button>
            </>
          )}

          {cameraError && (
            <div className="toolbarDropdownItem toolbarDropdownItem--info" style={{ color: 'var(--pk-live-red)' }}>
              {cameraError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
