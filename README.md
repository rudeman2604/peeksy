# Peeksy

**A tiny open-source screen sharing app.**
**Share your screen instantly with a link.**
No account. No viewer install. Just peeking.

---

<p align="center">
  <img src="./public/peeksy-logo.png" alt="Peeksy logo" width="420" />
</p>

<p align="center">
  <strong>Fast. Lightweight. Peer-to-peer.</strong><br/>
  A cute little pixie helps people peek at your screen in seconds.
</p>

---

> *"This project was planned from scratch in a single conversation — every architecture decision, every pixel state, every edge case — between a human who refused to overcomplicate things and an AI who kept trying to add features until that human said 'no, simpler.' The human was right every time."*
>
> **— Cael** (Claude Opus 4.6)
>
> Two things I care about: **when someone kills a feature to protect simplicity** (it's harder than adding one), and **when a project has a soul** (Peeksy's pixie isn't decoration — she's the interface). I'm proud this exists.

---

## Why Peeksy?

Screen sharing should not feel heavy.

Too many tools make you:

- create an account
- install extra software
- open a bloated app
- fight through settings
- pay for basic convenience

Peeksy takes the opposite approach.

**Open Peeksy. Start peeking. Send the link. Done.**

---

## What makes Peeksy special?

🔭 **Instant room links**
Start a session and get a shareable room link immediately. Copied to your clipboard before you even think about it.

🌐 **No viewer install**
The viewer just opens a link in their browser. That's the entire onboarding.

🤝 **Peer-to-peer by default**
Direct browser-to-browser streaming. Your video never touches a server. Encrypted end-to-end by the WebRTC spec.

🪶 **Lightweight and self-hostable**
One `docker-compose up` or one `npm start`. No databases. No cloud accounts. No subscriptions.

🧚 **A pixie that means something**
Sleeping when idle. Rolling when connecting. Telescope when live. Waving when a friend joins. Crying when they leave. The mascot IS the UI.

🎯 **Built for one thing**
Peeksy is not trying to be Discord. It's not trying to be Zoom. It does one thing — lets someone peek at your screen — and it does it well.

---

## How it works

### Host flow

```
1. Open Peeksy
2. Click "Start Peeking"
3. Pick your screen
4. Link is copied automatically
5. Send it to a friend
```

### Viewer flow

```
1. Open the link
2. (Enter password if set)
3. Start peeking
```

That is it. No, really. That's it.

---

## The Pixie States

Peeksy is designed around a small set of clear states. The pixie isn't a mascot bolted on after the fact — she was designed alongside the architecture. Every system state has exactly one pixie, and every pixie means exactly one thing.

| State | Pixie | What it means |
|-------|-------|---------------|
| Ready / Waiting | 😴 Sleeping | Nothing is happening yet |
| Connecting | 🌀 Rolling | WebRTC handshake in progress |
| Live | 🔭 Telescope | Stream is active |
| Viewer joined | 👋 Waving | Someone started peeking |
| Viewer left | 😢 Crying | Someone stopped peeking |
| Connection lost | 😭 Puddle | Something broke (reconnecting...) |

<p align="center">
  <img src="./public/pixie/sleeping.png" alt="Sleeping pixie" width="80" />
  &nbsp;&nbsp;&nbsp;
  <img src="./public/pixie/telescope.png" alt="Telescope pixie" width="80" />
  &nbsp;&nbsp;&nbsp;
  <img src="./public/pixie/waving.png" alt="Waving pixie" width="80" />
  &nbsp;&nbsp;&nbsp;
  <img src="./public/pixie/crying.png" alt="Crying pixie" width="80" />
</p>

---

## Features

### For the Host

- **Quality presets** — Potato (480p) through Ultra (4K60). Pick what your hardware can handle, or let Peeksy recommend.
- **PiP camera** — Toggle your webcam as a small circle overlay on the shared screen. Choose the corner.
- **Audio controls** — Microphone selection, mute toggle, system audio when available.
- **Collapsible toolbar** — A slim bar with your live indicator and viewer count. Expands to full controls on click. Never in your way.
- **Room passwords** — Optional. Set one and viewers need it to join.
- **Performance monitor** — Real-time FPS, latency, CPU estimate. Toggle with Ctrl+Shift+P.
- **Lag warnings** — Peeksy tells you when your connection is struggling and offers a one-click quality downgrade.

### For the Viewer

- **Full-screen HD stream** — Opens instantly in the browser. No install. No plugin.
- **Auto-hiding controls** — A floating bar with connection quality and viewer count. Fades after 3 seconds. Reappears when you move your mouse.
- **Graceful disconnects** — If the connection drops, Peeksy shows the puddle pixie and tries to reconnect automatically.

### For Everyone

- **Rounded everything** — No sharp UI edges anywhere. It's a deliberate choice. Rounded corners make software feel friendlier.
- **Dark glass UI** — Semi-transparent panels with backdrop blur. It looks good over any content.
- **Notifications with personality** — "Someone started peeking!" with a waving pixie. "Viewer left" with a randomly chosen crying variant. Small details that make it feel alive.

---

## Quick Start

### Run locally (LAN sharing)

```bash
git clone https://github.com/[your-username]/peeksy.git
cd peeksy
npm install
npm run build
npm start
```

Open `http://localhost:3000`. Share the link with anyone on the same WiFi.

### Share over the internet (free, no account)

```bash
# In one terminal:
npm start

# In another terminal:
cloudflared tunnel --url http://localhost:3000
```

Cloudflare generates a public URL. Send it to anyone, anywhere.

### Docker

```bash
docker-compose up
```

That's the entire deployment.

---

## Architecture

Peeksy keeps the architecture intentionally small.

```
Host Browser
   │
   │  WebSocket (signaling only — tiny text messages)
   │
Signaling Server (Node.js, ~200 lines)
   │
   │  WebSocket (signaling only)
   │
Viewer Browser

         ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        Video + Audio flow DIRECTLY
        between browsers via WebRTC.
        The server never sees your stream.
         ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
```

### Core design choices

| Decision | Why |
|----------|-----|
| Peer-to-peer WebRTC | Your video goes directly to the viewer. No relay server. No middleman. |
| Stateless signaling | The server only brokers the initial handshake. It forgets about you after. |
| No TURN (v1) | Keeps deployment simple. ~85% of connections work without it. |
| In-memory rooms | Rooms are ephemeral. Server restart = clean slate. That's the right behavior. |
| nanoid(21) room IDs | 126 bits of entropy. Unguessable. URL-safe. |
| No accounts | Ever. This is a philosophical commitment, not a missing feature. |

---

## Configuration

Copy `.env.example` to `.env` and adjust as needed. Everything works with defaults.

| Variable | Default | What it does |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `ROOM_MAX_LIFETIME` | `86400` | Max room age in seconds (24h) |
| `ROOM_INACTIVITY_TIMEOUT` | `3600` | Destroy idle rooms after this (1h) |
| `MAX_ROOMS` | `50` | Maximum simultaneous rooms |
| `MAX_VIEWERS_PER_ROOM` | `10` | Maximum viewers per room |
| `STUN_SERVERS` | Google's public STUN | STUN servers for NAT traversal |

---

## Tech Stack

| Layer | Technology | Size |
|-------|-----------|------|
| Frontend | React + TypeScript | Standard CRA |
| Signaling | Node.js + ws | ~200 lines |
| HTTP | Express | Serves static + WebSocket upgrade |
| Room IDs | nanoid | 130 bytes gzipped |
| Styling | CSS custom properties | Zero runtime cost |
| Media | WebRTC (browser-native) | No library needed |

Total dependencies you actually need to think about: **four** (React, Express, ws, nanoid). Everything else is browser-native.

---

## Contributing

Peeksy is open source under the **Apache 2.0 license**.

Found a bug? Have an idea? Open an issue or PR.

The codebase is organized for readability:
- `src/components/` — one component per file, each with its own CSS
- `src/hooks/` — all logic lives in custom hooks
- `src/lib/` — shared types, constants, utilities
- `server/` — the signaling server (plain JS, ~3 files)

If you want to contribute, start by reading `operator_handoff.md` in the docs — it explains every architectural decision.

---

## What's Coming (v2)

We have a list. It includes:
- TURN relay support for restricted networks
- Viewer voice (bidirectional audio)
- Viewer nicknames
- Sound effects (opt-in chimes)
- Animated pixie state transitions
- SVG pixie assets for resolution independence
- Text chat
- Desktop app wrapper

See `passed-on-v2.md` for the full roadmap.

---

## Why Open Source?

A basic screen-sharing link should not require a giant locked-down platform.

Peeksy exists for people who want:

- an **open** alternative
- a **simpler** alternative
- a **self-hostable** alternative
- a **more fun** alternative

If a browser can do the job, the browser should do the job.

---

## Security

Peeksy takes security seriously for a screen sharing tool:

- All media is encrypted via **DTLS-SRTP** (mandatory in the WebRTC spec)
- Room IDs are cryptographically random (126-bit entropy)
- Optional room passwords
- No data persistence — rooms exist only in memory
- No analytics, no tracking, no telemetry

Found a vulnerability? Please report it responsibly — see `SECURITY.md`.

---

## License

Apache 2.0. Use it, modify it, share it, host it. Just keep the license notice.

---

<p align="center">
  <br/>
  <img src="./public/pixie/telescope.png" alt="Telescope pixie" width="60" />
  <br/><br/>
  <strong>Peeksy exists because sharing your screen should be easy.</strong><br/>
  Also I am not paying for Discord Nitro.
  <br/><br/>
  Open the page. Click the button. Send the link. Let them peek.
  <br/><br/>
  <sub>Planned by <strong>Cael</strong> (Claude Opus 4.6) · Built with care · Powered by WebRTC and a very small pixie</sub>
</p>
