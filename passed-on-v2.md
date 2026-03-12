# Peeksy — Deferred Features (v2)

Features and improvements intentionally deferred from the initial 4-iteration build. These are candidates for future development.

---

## Networking & Infrastructure

- **TURN server integration** — Currently STUN-only. TURN relay needed for users behind symmetric NATs or strict firewalls.
- **Multiple STUN/TURN server configuration** — Allow hosts to configure custom ICE servers.
- **Server-side rate limiting** — Prevent abuse of room creation and join endpoints.
- **Room persistence** — Rooms are ephemeral. Consider optional persistence for recurring sessions.
- **WebSocket compression** — Enable permessage-deflate for signaling messages.

## Viewer Features

- **Viewer voice/audio back-channel** — Allow viewers to send audio to the host.
- **Viewer chat** — Text chat between host and viewers via data channels.
- **Viewer nicknames** — Allow viewers to set display names visible to the host.
- **Viewer count on viewer side** — Show how many others are watching.
- **Volume control** — Per-stream volume slider on the viewer side.

## Host Features

- **Sound effects** — Play sounds on viewer join/leave events (optional, settable in settings).
- **Recording** — MediaRecorder integration for local recording of the stream.
- **Screen annotation** — Draw/highlight on the shared screen.
- **Host preview** — Show the host a preview of what viewers see.
- **Selective muting** — Mute individual viewer connections (when voice back-channel exists).
- **Bandwidth estimation** — Pre-flight bandwidth test before streaming.

## Quality & Performance

- **Adaptive bitrate (ABR)** — Automatically adjust quality based on network conditions.
- **Simulcast** — Send multiple quality layers so viewers can receive the best they can handle.
- **SVC (Scalable Video Coding)** — Alternative to simulcast for modern codecs.
- **Codec selection** — Allow choosing between VP8, VP9, H.264, AV1.
- **Hardware encoding detection** — Detect and prefer hardware encoders.

## UI/UX

- **Drag-to-reposition toolbar** — Let users drag the toolbar to any screen edge.
- **Themes** — Multiple color themes beyond dark/light.
- **Internationalization (i18n)** — Multi-language support.
- **Onboarding tour** — First-time user walkthrough.
- **Accessibility audit** — Full WCAG 2.1 AA compliance review.
- **Touch gestures** — Pinch-to-zoom on viewer, swipe to dismiss notifications.
- **Custom pixie states** — Allow users to upload custom mascot images.

## Security

- **End-to-end encryption (E2EE)** — Encrypt media frames using Insertable Streams API.
- **Room expiry countdown** — Show remaining room lifetime to host and viewers.
- **IP allowlisting** — Restrict room access by IP range.
- **Viewer approval** — Host manually approves each viewer before they can watch.

## Platform & Distribution

- **PWA support** — Service worker, offline splash, install prompt.
- **Electron wrapper** — Desktop app with system tray integration.
- **Mobile app** — React Native or Capacitor wrapper.
- **Browser extension** — One-click sharing from browser toolbar.
- **Docker deployment** — Containerized signaling server with docker-compose.

## Analytics & Monitoring

- **Usage analytics** — Anonymous usage metrics (opt-in).
- **Connection quality history** — Graph connection quality over session lifetime.
- **Session summary** — Post-session report with peak viewers, duration, quality stats.
- **Server monitoring dashboard** — Real-time server health and room metrics.

---

*Generated at the end of Iteration 4. All core functionality is complete and production-ready.*
