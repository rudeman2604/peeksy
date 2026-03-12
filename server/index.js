const express = require('express');
const http = require('http');
const path = require('path');
const { setupSignaling } = require('./signaling');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// Serve React build in production
app.use(express.static(path.join(__dirname, '..', 'build')));

// All non-API routes serve the React app (for client-side routing)
app.get('/room/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

// Setup WebSocket signaling on the same HTTP server
setupSignaling(server);

server.listen(PORT, () => {
  console.log(`[Peeksy] Server running on http://localhost:${PORT}`);
  console.log(`[Peeksy] Share this URL with viewers on the same network`);
  console.log(`[Peeksy] For internet sharing, use Cloudflare Tunnel: cloudflared tunnel --url http://localhost:${PORT}`);
});
