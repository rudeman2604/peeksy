// Re-export message types for easy access
export { WS_MESSAGES, QUALITY_PRESETS, PIXIE_STATES, DEFAULT_SETTINGS } from './types';

// Server URL construction
export function getSignalingUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

// Room URL construction
export function getRoomUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}`;
}
