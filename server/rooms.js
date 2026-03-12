const { nanoid } = require('nanoid');

/**
 * Room data structure (in-memory, ephemeral)
 *
 * rooms: Map<roomId, {
 *   hostWs: WebSocket,          // host's WebSocket connection
 *   viewers: Map<viewerId, WebSocket>, // viewer connections
 *   password: string | null,    // room password (plain, acceptable for ephemeral rooms)
 *   createdAt: number,          // Date.now()
 *   lastActivity: number,       // Date.now(), updated on any event
 * }>
 */

const rooms = new Map();

// Configuration from environment
const config = {
  maxLifetime: parseInt(process.env.ROOM_MAX_LIFETIME || '86400') * 1000,     // convert to ms
  inactivityTimeout: parseInt(process.env.ROOM_INACTIVITY_TIMEOUT || '3600') * 1000,
  maxRooms: parseInt(process.env.MAX_ROOMS || '50'),
  maxViewersPerRoom: parseInt(process.env.MAX_VIEWERS_PER_ROOM || '10'),
};

function createRoom(hostWs) {
  if (rooms.size >= config.maxRooms) {
    return { success: false, reason: 'server_full' };
  }

  const roomId = nanoid(21);
  const now = Date.now();

  rooms.set(roomId, {
    hostWs,
    viewers: new Map(),
    password: null,
    createdAt: now,
    lastActivity: now,
  });

  // Tag the host WebSocket so we know which room it belongs to
  hostWs.roomId = roomId;
  hostWs.role = 'host';

  console.log(`[Room] Created: ${roomId} (${rooms.size} active rooms)`);
  return { success: true, roomId };
}

function joinRoom(roomId, password, viewerWs) {
  const room = rooms.get(roomId);

  if (!room) {
    return { success: false, reason: 'room_not_found' };
  }

  if (room.password && room.password !== password) {
    return { success: false, reason: 'wrong_password' };
  }

  if (room.viewers.size >= config.maxViewersPerRoom) {
    return { success: false, reason: 'room_full' };
  }

  const viewerId = nanoid(8); // shorter ID for viewers, just needs to be unique within room
  room.viewers.set(viewerId, viewerWs);
  room.lastActivity = Date.now();

  // Tag the viewer WebSocket
  viewerWs.roomId = roomId;
  viewerWs.viewerId = viewerId;
  viewerWs.role = 'viewer';

  console.log(`[Room] Viewer ${viewerId} joined ${roomId} (${room.viewers.size} viewers)`);
  return { success: true, viewerId, viewerCount: room.viewers.size };
}

function removeViewer(roomId, viewerId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.viewers.delete(viewerId);
  room.lastActivity = Date.now();

  console.log(`[Room] Viewer ${viewerId} left ${roomId} (${room.viewers.size} viewers)`);
  return { viewerCount: room.viewers.size };
}

function destroyRoom(roomId, reason) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Notify all viewers
  const expireMessage = JSON.stringify({ type: 'room_expired', reason });
  room.viewers.forEach((viewerWs) => {
    try { viewerWs.send(expireMessage); } catch (e) { /* viewer already gone */ }
  });

  rooms.delete(roomId);
  console.log(`[Room] Destroyed: ${roomId} (reason: ${reason}, ${rooms.size} remaining)`);
}

function removeHost(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Notify all viewers that host ended
  const endMessage = JSON.stringify({ type: 'host_ended' });
  room.viewers.forEach((viewerWs) => {
    try { viewerWs.send(endMessage); } catch (e) { /* viewer already gone */ }
  });

  rooms.delete(roomId);
  console.log(`[Room] Host left, destroyed: ${roomId} (${rooms.size} remaining)`);
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function updateRoomSettings(roomId, settings) {
  const room = rooms.get(roomId);
  if (!room) return false;

  if (settings.password !== undefined) {
    room.password = settings.password;
  }

  room.lastActivity = Date.now();
  return true;
}

function touchRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.lastActivity = Date.now();
  }
}

// ── Room Expiry Check ──
// Runs every 60 seconds. Destroys rooms that exceed lifetime or inactivity limits.

function startExpiryChecker() {
  setInterval(() => {
    const now = Date.now();

    rooms.forEach((room, roomId) => {
      const age = now - room.createdAt;
      const idle = now - room.lastActivity;

      if (age > config.maxLifetime) {
        destroyRoom(roomId, 'max_lifetime');
      } else if (idle > config.inactivityTimeout) {
        destroyRoom(roomId, 'inactivity');
      }
    });
  }, 60000); // check every 60 seconds
}

module.exports = {
  createRoom,
  joinRoom,
  removeViewer,
  destroyRoom,
  removeHost,
  getRoom,
  updateRoomSettings,
  touchRoom,
  startExpiryChecker,
  rooms, // exposed for heartbeat access
};
