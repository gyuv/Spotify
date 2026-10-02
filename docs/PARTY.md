# Party Rooms

Real-time group listening: everyone hears the same track at the same moment on their **own** Spotify
account, and each listener needs Premium.

```
 Host app ──state──▶ server/party.mjs ──state──▶ Guest apps ──▶ their own Spotify players
 Guest   ──suggest─▶                  ──────────▶ Host (auto-queue or approve)
 Anyone  ──react───▶                  ──────────▶ everyone (floating emoji)
```

## Run locally
```bash
npm run party            # ws://127.0.0.1:8787
```

## Deploy
Any Node host with WebSockets works (Render, Railway, Fly.io, a VPS):
```bash
PORT=8787 node server/party.mjs
```
Put it behind TLS, then set `VITE_PARTY_URL=wss://party.your-domain` and rebuild.

## Features
- 5-character room codes and invite links (`https://your-app/?party=CODE`), shared through the native share sheet.
- Drift correction: a guest re-seeks if they're more than 3 s from the host.
- Host hand-off when the host leaves.
- Suggestions, with auto-queue on or a manual approval list.
- Collaborative **shared playlist** created on Spotify for the room.
- Live emoji reactions and an activity feed.

Rooms live in memory and disappear when the last member leaves.
