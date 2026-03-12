import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ──

export interface AudioDevice {
  deviceId: string;
  label: string;
}

interface UseAudioReturn {
  audioDevices: AudioDevice[];
  selectedDeviceId: string | null;
  isMuted: boolean;
  hasSystemAudio: boolean;
  isSystemAudioEnabled: boolean;
  audioTrack: MediaStreamTrack | null;
  selectDevice: (deviceId: string) => Promise<void>;
  toggleMute: () => void;
  toggleSystemAudio: () => void;
  enumerateDevices: () => Promise<void>;
}

const STORAGE_KEY = 'peeksy-audio-device';

// ── Hook ──

export function useAudio(
  screenStream: MediaStream | null,
  onAudioTrackChange?: (track: MediaStreamTrack) => void
): UseAudioReturn {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [isSystemAudioEnabled, setIsSystemAudioEnabled] = useState(false);
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);

  const micTrackRef = useRef<MediaStreamTrack | null>(null);

  // Check if screen stream has audio (system audio)
  useEffect(() => {
    if (screenStream) {
      const audioTracks = screenStream.getAudioTracks();
      setHasSystemAudio(audioTracks.length > 0);
      if (audioTracks.length > 0) {
        setIsSystemAudioEnabled(true);
      }
    } else {
      setHasSystemAudio(false);
      setIsSystemAudioEnabled(false);
    }
  }, [screenStream]);

  // Enumerate audio input devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.substring(0, 4)}`,
        }));
      setAudioDevices(audioInputs);

      // Restore saved device
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && audioInputs.some(d => d.deviceId === saved)) {
        setSelectedDeviceId(saved);
      }
    } catch (error) {
      console.error('[Audio] Failed to enumerate devices:', error);
    }
  }, []);

  // Select a microphone device
  const selectDevice = useCallback(async (deviceId: string) => {
    // Stop existing mic track
    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });

      const track = stream.getAudioTracks()[0];
      if (!track) return;

      micTrackRef.current = track;
      setSelectedDeviceId(deviceId);
      setAudioTrack(track);
      setIsMuted(false);

      // Save preference
      localStorage.setItem(STORAGE_KEY, deviceId);

      // Notify parent to add/replace track on PeerConnections
      onAudioTrackChange?.(track);

      console.log(`[Audio] Selected device: ${track.label}`);
    } catch (error) {
      console.error('[Audio] Failed to select device:', error);
    }
  }, [onAudioTrackChange]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (micTrackRef.current) {
      micTrackRef.current.enabled = !micTrackRef.current.enabled;
      setIsMuted(!micTrackRef.current.enabled);
      console.log(`[Audio] ${!micTrackRef.current.enabled ? 'Muted' : 'Unmuted'}`);
    }
  }, []);

  // Toggle system audio
  const toggleSystemAudio = useCallback(() => {
    if (!screenStream) return;

    const audioTracks = screenStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const track = audioTracks[0];
    track.enabled = !track.enabled;
    setIsSystemAudioEnabled(track.enabled);
    console.log(`[Audio] System audio ${track.enabled ? 'enabled' : 'disabled'}`);
  }, [screenStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micTrackRef.current) {
        micTrackRef.current.stop();
      }
    };
  }, []);

  return {
    audioDevices,
    selectedDeviceId,
    isMuted,
    hasSystemAudio,
    isSystemAudioEnabled,
    audioTrack,
    selectDevice,
    toggleMute,
    toggleSystemAudio,
    enumerateDevices,
  };
}
