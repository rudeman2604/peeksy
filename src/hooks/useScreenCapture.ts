import { useState, useCallback, useRef, useEffect } from 'react';

import type { QualityPreset } from '../lib/types';
import { QUALITY_PRESETS } from '../lib/constants';

// ── Types ──

interface UseScreenCaptureReturn {
  stream: MediaStream | null;
  isCapturing: boolean;
  sourceLabel: string;
  startCapture: (preset?: QualityPreset) => Promise<boolean>;
  stopCapture: () => void;
  changeSource: () => Promise<boolean>;
  changeQuality: (preset: QualityPreset) => Promise<void>;
}

// ── Hook ──

export function useScreenCapture(
  onTrackEnded?: () => void
): UseScreenCaptureReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
    setIsCapturing(false);
    setSourceLabel('');
  }, []);

  const startCapture = useCallback(async (preset?: QualityPreset): Promise<boolean> => {
    const activePreset = preset || QUALITY_PRESETS.balanced;

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: activePreset.width },
        height: { ideal: activePreset.height },
        frameRate: { ideal: activePreset.frameRate },
      },
      audio: false,
    };

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('[ScreenCapture] Track ended (user stopped sharing via browser)');
          stopCapture();
          onTrackEnded?.();
        };
        setSourceLabel(videoTrack.label);
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCapturing(true);
      console.log('[ScreenCapture] Capture started:', videoTrack?.label);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.log('[ScreenCapture] User cancelled the picker');
        return false;
      }
      console.error('[ScreenCapture] Failed:', error);
      return false;
    }
  }, [stopCapture, onTrackEnded]);

  // Change source without stopping the share (triggers new picker, replaces tracks)
  const changeSource = useCallback(async (): Promise<boolean> => {
    const currentPreset = QUALITY_PRESETS.balanced; // Use current preset

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: currentPreset.width },
        height: { ideal: currentPreset.height },
        frameRate: { ideal: currentPreset.frameRate },
      },
      audio: false,
    };

    try {
      const newStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Stop old tracks
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        newVideoTrack.onended = () => {
          console.log('[ScreenCapture] Track ended (user stopped sharing via browser)');
          stopCapture();
          onTrackEnded?.();
        };
        setSourceLabel(newVideoTrack.label);
      }

      streamRef.current = newStream;
      setStream(newStream);
      console.log('[ScreenCapture] Source changed to:', newVideoTrack?.label);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.log('[ScreenCapture] User cancelled source change');
        return false;
      }
      console.error('[ScreenCapture] Failed to change source:', error);
      return false;
    }
  }, [stopCapture, onTrackEnded]);

  // Change quality mid-stream using applyConstraints
  const changeQuality = useCallback(async (preset: QualityPreset): Promise<void> => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      await videoTrack.applyConstraints({
        width: { ideal: preset.width },
        height: { ideal: preset.height },
        frameRate: { ideal: preset.frameRate },
      });
      console.log(`[ScreenCapture] Quality changed to ${preset.label}`);
    } catch (error) {
      console.error('[ScreenCapture] Failed to change quality:', error);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return { stream, isCapturing, sourceLabel, startCapture, stopCapture, changeSource, changeQuality };
}
