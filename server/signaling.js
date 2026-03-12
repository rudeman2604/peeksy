const { WebSocketServer } = require('ws');
const {
  createRoom,
  joinRoom,
  removeViewer,
  removeHost,
  getRoom,
  updateRoomSettings,
  touchRoom,
  startExpiryChecker,
} = require('./rooms');

function setupSignaling(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('[Signaling] WebSocket server ready on /ws');

  wss.on('connection', (ws) => {
    ws.isAlive = true;

    ws.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data);
      } catch (e) {
        console.error('[Signaling] Invalid JSON received');
        return;
      }

      handleMessage(ws, message);
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // ── Heartbeat ──
  // Ping every 5 seconds. If no pong received by next cycle, terminate.
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log('[Heartbeat] Client unresponsive, terminating');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 5000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // Start room expiry checker
  startExpiryChecker();
}

function handleMessage(ws, message) {
  switch (message.type) {
    // ── Host Messages ──

    case 'create_room': {
      const result = createRoom(ws);
      if (result.success) {
        send(ws, { type: 'room_created', roomId: result.roomId });
      } else {
        send(ws, { type: 'join_rejected', reason: result.reason });
      }
      break;
    }

    case 'room_settings': {
      if (ws.role !== 'host' || !ws.roomId) return;
      updateRoomSettings(ws.roomId, {
        password: message.password,
      });
      break;
    }

    case 'host_ended': {
      if (ws.role !== 'host' || !ws.roomId) return;
      removeHost(ws.roomId);
      break;
    }

    // ── Viewer Messages ──

    case 'join_room': {
      const result = joinRoom(message.roomId, message.password, ws);
      if (result.success) {
        send(ws, {
          type: 'join_accepted',
          roomId: message.roomId,
        });

        // Notify host that a viewer joined
        const room = getRoom(message.roomId);
        if (room && room.hostWs) {
          send(room.hostWs, {
            type: 'viewer_joined',
            viewerId: result.viewerId,
            viewerCount: result.viewerCount,
          });

          // Tell the host to create an offer for this viewer
          send(room.hostWs, {
            type: 'viewer_needs_offer',
            viewerId: result.viewerId,
          });
        }
      } else {
        send(ws, { type: 'join_rejected', reason: result.reason });
      }
      break;
    }

    // ── Signaling Relay (SDP + ICE) ──

    case 'sdp_offer': {
      // Host sends offer for a specific viewer
      const room = getRoom(ws.roomId);
      if (!room) return;
      const viewerWs = room.viewers.get(message.viewerId);
      if (viewerWs) {
        send(viewerWs, {
          type: 'sdp_offer',
          sdp: message.sdp,
          viewerId: message.viewerId,
        });
      }
      touchRoom(ws.roomId);
      break;
    }

    case 'sdp_answer': {
      // Viewer sends answer back to host
      const room = getRoom(ws.roomId);
      if (!room || !room.hostWs) return;
      send(room.hostWs, {
        type: 'sdp_answer',
        sdp: message.sdp,
        viewerId: ws.viewerId,
      });
      touchRoom(ws.roomId);
      break;
    }

    case 'ice_candidate': {
      const room = getRoom(ws.roomId);
      if (!room) return;

      if (ws.role === 'host') {
        // Host sends ICE candidate to specific viewer
        const viewerWs = room.viewers.get(message.viewerId);
        if (viewerWs) {
          send(viewerWs, {
            type: 'ice_candidate',
            candidate: message.candidate,
            viewerId: message.viewerId,
          });
        }
      } else if (ws.role === 'viewer') {
        // Viewer sends ICE candidate to host
        if (room.hostWs) {
          send(room.hostWs, {
            type: 'ice_candidate',
            candidate: message.candidate,
            viewerId: ws.viewerId,
          });
        }
      }
      break;
    }

    // ── Heartbeat ──

    case 'pong': {
      ws.isAlive = true;
      break;
    }

    default:
      console.log(`[Signaling] Unknown message type: ${message.type}`);
  }
}

function handleDisconnect(ws) {
  if (ws.role === 'host' && ws.roomId) {
    console.log(`[Signaling] Host disconnected from room ${ws.roomId}`);
    removeHost(ws.roomId);
  } else if (ws.role === 'viewer' && ws.roomId && ws.viewerId) {
    console.log(`[Signaling] Viewer ${ws.viewerId} disconnected from room ${ws.roomId}`);
    const result = removeViewer(ws.roomId, ws.viewerId);

    // Notify host
    const room = getRoom(ws.roomId);
    if (room && room.hostWs && result) {
      send(room.hostWs, {
        type: 'viewer_left',
        viewerId: ws.viewerId,
        viewerCount: result.viewerCount,
      });
    }
  }
}

function send(ws, message) {
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify(message));
  }
}

module.exports = { setupSignaling };
