// RY Music Party server — a tiny WebSocket relay for group listening rooms.
// Run: node server/party.mjs   (PORT env, default 8787)
// It never touches audio: each member plays through their own Spotify account; the host's
// playback state is relayed so everyone stays in sync, and guests can suggest tracks.
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ port: PORT });
/** @type {Map<string, { host: any, members: Map<any, { name: string, id: string }>, state: any, playlist: any }>} */
const rooms = new Map();

const send = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
const roster = (room) => [...room.members.values()].map((m) => ({ ...m, host: room.host && room.members.get(room.host)?.id === m.id }));
const broadcast = (room, msg, except) => room.members.forEach((_, ws) => ws !== except && send(ws, msg));

wss.on('connection', (ws) => {
  let room = null;
  let code = '';
  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.type === 'join') {
      code = String(m.room).toUpperCase().slice(0, 8);
      room = rooms.get(code);
      if (!room) rooms.set(code, (room = { host: ws, members: new Map(), state: null, playlist: null }));
      room.members.set(ws, { name: String(m.name ?? 'Guest').slice(0, 40), id: Math.random().toString(36).slice(2, 9) });
      send(ws, { type: 'welcome', room: code, isHost: room.host === ws, state: room.state, playlist: room.playlist });
      broadcast(room, { type: 'members', members: roster(room) });
      return;
    }
    if (!room) return;
    const me = room.members.get(ws);
    if (m.type === 'state' && room.host === ws) {
      room.state = { ...m.state, at: Date.now() };
      broadcast(room, { type: 'state', state: room.state }, ws);
    } else if (m.type === 'suggest') {
      send(room.host, { type: 'suggest', from: me?.name, track: m.track });
      broadcast(room, { type: 'feed', text: `${me?.name} suggested ${m.track?.name}` });
    } else if (m.type === 'react') {
      broadcast(room, { type: 'react', emoji: String(m.emoji).slice(0, 4), from: me?.name });
    } else if (m.type === 'playlist' && room.host === ws) {
      room.playlist = m.playlist;
      broadcast(room, { type: 'playlist', playlist: m.playlist }, ws);
    }
  });
  ws.on('close', () => {
    if (!room) return;
    room.members.delete(ws);
    if (room.host === ws) {
      room.host = room.members.keys().next().value ?? null; // hand host to the next person
      if (room.host) send(room.host, { type: 'promoted' });
    }
    if (!room.members.size) rooms.delete(code);
    else broadcast(room, { type: 'members', members: roster(room) });
  });
});

console.log(`RY Music party server on ws://0.0.0.0:${PORT}`);
