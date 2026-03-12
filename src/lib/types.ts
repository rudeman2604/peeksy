// ── Room and Connection Types ──

export type RoomId = string; // nanoid(21) generated string

export interface RoomConfig {
  maxLifetime: number;       // seconds, from ROOM_MAX_LIFETIME env
  inactivityTimeout: number; // seconds, from ROOM_INACTIVITY_TIMEOUT env
  maxViewers: number;        // from MAX_VIEWERS_PER_ROOM env
}

export interface RoomState {
  roomId: RoomId;
  password: string | null;    // null means no password
  createdAt: number;          // Date.now() timestamp
  lastActivity: number;       // Date.now() timestamp, updated on any event
  viewerCount: number;
}

// ── Quality Presets ──

export type QualityPresetName = "potato" | "balanced" | "quality" | "high" | "ultra" | "custom";

export interface QualityPreset {
  name: QualityPresetName;
  label: string;
  description: string;
  width: number;
  height: number;
  frameRate: number;
  maxBitrate?: number;       // in bps, optional constraint
  warning?: string;          // shown before applying (e.g., Ultra warning)
}

export const QUALITY_PRESETS: Record<QualityPresetName, QualityPreset> = {
  potato: {
    name: "potato",
    label: "Potato",
    description: "For older hardware",
    width: 854,
    height: 480,
    frameRate: 15,
  },
  balanced: {
    name: "balanced",
    label: "Balanced",
    description: "Recommended for most",
    width: 1280,
    height: 720,
    frameRate: 30,
  },
  quality: {
    name: "quality",
    label: "Quality",
    description: "Good hardware",
    width: 1920,
    height: 1080,
    frameRate: 30,
  },
  high: {
    name: "high",
    label: "High",
    description: "Strong hardware + fast internet",
    width: 1920,
    height: 1080,
    frameRate: 60,
  },
  ultra: {
    name: "ultra",
    label: "Ultra",
    description: "Gaming PC + fast upload",
    width: 3840,
    height: 2160,
    frameRate: 60,
    warning: "Ultra requires significant CPU and upload bandwidth. Make sure your hardware can handle it.",
  },
  custom: {
    name: "custom",
    label: "Custom",
    description: "Set your own resolution and framerate",
    width: 1280,
    height: 720,
    frameRate: 30,
  },
};

// ── Pixie States ──

export type PixieStateName =
  | "sleeping"           // Waiting / idle / ready
  | "rolling"            // Connecting (animated sprite)
  | "telescope"          // Live / streaming / watching
  | "waving"             // Viewer joined / positive event
  | "crying"             // Viewer left (normal)
  | "leaving"            // Viewer left (alternate — used randomly)
  | "connection-lost";   // Connection lost (crying + puddle)

export interface PixieStateConfig {
  name: PixieStateName;
  imageSrc: string;        // path relative to /public/pixie/
  statusText: string;      // displayed below the pixie
  isAnimated: boolean;     // true only for rolling (sprite sheet)
  frameCount?: number;     // number of frames in sprite sheet
  frameDuration?: number;  // ms per frame for sprite animation
}

export const PIXIE_STATES: Record<string, PixieStateConfig> = {
  idle: {
    name: "sleeping",
    imageSrc: "/pixie/sleeping.png",
    statusText: "Ready to Peek?",
    isAnimated: false,
  },
  waiting: {
    name: "sleeping",
    imageSrc: "/pixie/sleeping.png",
    statusText: "Waiting for someone to peek...",
    isAnimated: false,
  },
  connecting: {
    name: "rolling",
    imageSrc: "/pixie/rolling-sprite.png",
    statusText: "Connecting...",
    isAnimated: true,
    frameCount: 5,
    frameDuration: 180,
  },
  live: {
    name: "telescope",
    imageSrc: "/pixie/telescope.png",
    statusText: "Screen is live",
    isAnimated: false,
  },
  viewerJoined: {
    name: "waving",
    imageSrc: "/pixie/waving.png",
    statusText: "Someone started peeking!",
    isAnimated: false,
  },
  viewerLeft: {
    name: "crying",
    imageSrc: "/pixie/crying.png",          // randomly alternated with leaving.png at display time
    statusText: "Viewer left",
    isAnimated: false,
  },
  connectionLost: {
    name: "connection-lost",
    imageSrc: "/pixie/connection-lost.png",
    statusText: "Connection lost — reconnecting...",
    isAnimated: false,
  },
  hostStopped: {
    name: "sleeping",
    imageSrc: "/pixie/sleeping.png",
    statusText: "The host stopped sharing",
    isAnimated: false,
  },
  roomExpired: {
    name: "sleeping",
    imageSrc: "/pixie/sleeping.png",
    statusText: "This room has expired",
    isAnimated: false,
  },
  roomFull: {
    name: "sleeping",
    imageSrc: "/pixie/sleeping.png",
    statusText: "This room is full",
    isAnimated: false,
  },
  roomNotFound: {
    name: "sleeping",
    imageSrc: "/pixie/sleeping.png",
    statusText: "This room doesn't exist or has expired",
    isAnimated: false,
  },
};

// ── Application State ──

export type AppState =
  | "idle"              // Splash screen, not sharing
  | "picking"           // Browser screen picker is open
  | "connecting"        // WebRTC handshake in progress
  | "live"              // Streaming to viewer(s)
  | "reconnecting"      // Lost connection, attempting to restore
  | "ended";            // Host stopped sharing

export type ViewerState =
  | "password"          // Entering room password
  | "connecting"        // WebRTC handshake in progress
  | "watching"          // Receiving and displaying stream
  | "reconnecting"      // Lost connection, attempting to restore
  | "disconnected"      // Connection failed permanently
  | "host-stopped"      // Host ended the session
  | "room-not-found"    // Room doesn't exist
  | "room-full"         // Room at max viewers
  | "room-expired";     // Room has expired

// ── WebSocket Message Types ──
// These constants MUST match between client and server.
// Never use raw strings for message types — always reference these constants.

export const WS_MESSAGES = {
  // Host → Server
  CREATE_ROOM: "create_room",
  ROOM_SETTINGS: "room_settings",
  HOST_ENDED: "host_ended",

  // Server → Host
  ROOM_CREATED: "room_created",
  VIEWER_JOINED: "viewer_joined",
  VIEWER_LEFT: "viewer_left",
  ROOM_EXPIRED: "room_expired",

  // Viewer → Server
  JOIN_ROOM: "join_room",

  // Server → Viewer
  JOIN_ACCEPTED: "join_accepted",
  JOIN_REJECTED: "join_rejected",

  // Server → Host (request offer for new viewer)
  VIEWER_NEEDS_OFFER: "viewer_needs_offer",

  // Bidirectional (signaling)
  SDP_OFFER: "sdp_offer",
  SDP_ANSWER: "sdp_answer",
  ICE_CANDIDATE: "ice_candidate",

  // Heartbeat
  PING: "ping",
  PONG: "pong",

  // Quality info (informational, host → server → viewers)
  QUALITY_CHANGED: "quality_changed",
} as const;

// ── WebSocket Message Shapes ──

export interface WsMessageBase {
  type: string;
}

export interface WsCreateRoom extends WsMessageBase {
  type: typeof WS_MESSAGES.CREATE_ROOM;
}

export interface WsRoomCreated extends WsMessageBase {
  type: typeof WS_MESSAGES.ROOM_CREATED;
  roomId: RoomId;
}

export interface WsJoinRoom extends WsMessageBase {
  type: typeof WS_MESSAGES.JOIN_ROOM;
  roomId: RoomId;
  password?: string;
}

export interface WsJoinAccepted extends WsMessageBase {
  type: typeof WS_MESSAGES.JOIN_ACCEPTED;
  roomId: RoomId;
}

export interface WsJoinRejected extends WsMessageBase {
  type: typeof WS_MESSAGES.JOIN_REJECTED;
  reason: "wrong_password" | "room_full" | "room_not_found" | "server_full";
}

export interface WsViewerNeedsOffer extends WsMessageBase {
  type: typeof WS_MESSAGES.VIEWER_NEEDS_OFFER;
  viewerId: string;
}

export interface WsSdpOffer extends WsMessageBase {
  type: typeof WS_MESSAGES.SDP_OFFER;
  sdp: RTCSessionDescriptionInit;
  viewerId: string;
}

export interface WsSdpAnswer extends WsMessageBase {
  type: typeof WS_MESSAGES.SDP_ANSWER;
  sdp: RTCSessionDescriptionInit;
  viewerId: string;
}

export interface WsIceCandidate extends WsMessageBase {
  type: typeof WS_MESSAGES.ICE_CANDIDATE;
  candidate: RTCIceCandidateInit;
  viewerId: string;
}

export interface WsViewerJoined extends WsMessageBase {
  type: typeof WS_MESSAGES.VIEWER_JOINED;
  viewerId: string;
  viewerCount: number;
}

export interface WsViewerLeft extends WsMessageBase {
  type: typeof WS_MESSAGES.VIEWER_LEFT;
  viewerId: string;
  viewerCount: number;
}

export interface WsPing extends WsMessageBase {
  type: typeof WS_MESSAGES.PING;
}

export interface WsPong extends WsMessageBase {
  type: typeof WS_MESSAGES.PONG;
}

export interface WsHostEnded extends WsMessageBase {
  type: typeof WS_MESSAGES.HOST_ENDED;
}

export interface WsRoomExpired extends WsMessageBase {
  type: typeof WS_MESSAGES.ROOM_EXPIRED;
}

export interface WsRoomSettings extends WsMessageBase {
  type: typeof WS_MESSAGES.ROOM_SETTINGS;
  password?: string | null;
}

export type WsMessage =
  | WsCreateRoom
  | WsRoomCreated
  | WsJoinRoom
  | WsJoinAccepted
  | WsJoinRejected
  | WsViewerNeedsOffer
  | WsSdpOffer
  | WsSdpAnswer
  | WsIceCandidate
  | WsViewerJoined
  | WsViewerLeft
  | WsPing
  | WsPong
  | WsHostEnded
  | WsRoomExpired
  | WsRoomSettings;

// ── Settings (localStorage) ──

export type ToolbarPosition = "top" | "bottom";
export type ToolbarExpandMode = "click" | "hover";
export type PiPPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface PeeksySettings {
  toolbarPosition: ToolbarPosition;
  toolbarExpandMode: ToolbarExpandMode;
  showNotifications: boolean;
  showPerformanceMonitor: boolean;
  performanceStats: {
    fps: boolean;
    latency: boolean;
    cpu: boolean;
    bitrate: boolean;
    resolution: boolean;
    packetLoss: boolean;
    encodeTime: boolean;
  };
  qualityPreset: QualityPresetName;
  customQuality: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  };
  pipPosition: PiPPosition;
  connectionColors: {
    healthy: string;
    degrading: string;
    bad: string;
  };
}

export const DEFAULT_SETTINGS: PeeksySettings = {
  toolbarPosition: "top",
  toolbarExpandMode: "click",
  showNotifications: true,
  showPerformanceMonitor: false,
  performanceStats: {
    fps: true,
    latency: true,
    cpu: true,
    bitrate: false,
    resolution: false,
    packetLoss: false,
    encodeTime: false,
  },
  qualityPreset: "balanced",
  customQuality: {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 2500000,
  },
  pipPosition: "bottom-left",
  connectionColors: {
    healthy: "#10b981",
    degrading: "#f59e0b",
    bad: "#ef4444",
  },
};

// ── Viewer Info (for host's viewer list) ──

export type ConnectionQuality = "healthy" | "degrading" | "bad" | "unknown";

export interface ViewerInfo {
  viewerId: string;
  connectedAt: number;
  connectionQuality: ConnectionQuality;
}
