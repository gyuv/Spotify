import { useState } from 'react';
import { Icon } from '../components/icons';
import { Spotify } from '../lib/api';
import { createSharedPlaylist, joinParty, leaveParty, newCode, react, useParty } from '../lib/party';
import { share } from '../lib/share';
import { act, useStore } from '../lib/store';
import { useLoad } from './hooks';

const EMOJI = ['🔥', '💛', '🙌', '😭', '🕺', '🤯'];

export function Party() {
  const p = useParty();
  const notify = useStore((s) => s.notify);
  const me = useLoad('me', Spotify.me);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('party') ?? '');
  const name = me.data?.display_name ?? 'Guest';
  const link = p.room ? `${location.origin}/?party=${p.room}` : '';

  if (!p.room)
    return (
      <div className="view party">
        <p className="eyebrow">Group listening</p>
        <h1>Party Rooms</h1>
        <p className="muted">
          Listen together in real time — everyone hears the same song at the same moment on their own Spotify. Guests suggest
          tracks, react live, and build a shared playlist together.
        </p>
        <div className="party-start">
          <button className="cta" onClick={() => joinParty(newCode(), name)}>
            Start a room
          </button>
          <div className="party-join">
            <input placeholder="Room code" value={code} maxLength={8} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button className="chip" disabled={code.length < 4} onClick={() => joinParty(code, name)}>
              Join
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="view party">
      <div className="party-reactions" aria-hidden>
        {p.reactions.map((r) => (
          <span key={r.id} style={{ left: `${10 + ((r.id * 997) % 80)}%` }}>
            {r.emoji}
          </span>
        ))}
      </div>
      <p className="eyebrow">{p.isHost ? 'You’re hosting' : 'Listening along'}</p>
      <h1 className="room-code">{p.room}</h1>
      <div className="pl-actions">
        <button className="chip on" onClick={() => share('Join my RY Music party', `Join room ${p.room} 🎧`, link)}>
          <Icon name="share" size={16} /> Invite
        </button>
        {p.isHost && !p.playlist && (
          <button className="chip" onClick={() => createSharedPlaylist().then(() => notify('Shared playlist created')).catch((e) => notify(e.message))}>
            <Icon name="plus" size={16} /> Shared playlist
          </button>
        )}
        {p.isHost && (
          <button className={`chip ${p.autoAccept ? 'on' : ''}`} onClick={() => p.set({ autoAccept: !p.autoAccept })}>
            Auto-queue suggestions
          </button>
        )}
        <button className="chip danger" onClick={leaveParty}>
          Leave
        </button>
      </div>

      {p.playlist && (
        <a className="panel-card shared-pl" href={p.playlist.url} target="_blank" rel="noreferrer">
          <strong>{p.playlist.name}</strong>
          <span className="muted">Collaborative — open in Spotify and everyone can add songs</span>
        </a>
      )}

      <div className="react-bar">
        {EMOJI.map((e) => (
          <button key={e} onClick={() => react(e)}>
            {e}
          </button>
        ))}
      </div>

      <section className="panel-card">
        <h2>In the room · {p.members.length}</h2>
        <div className="members">
          {p.members.map((m) => (
            <div key={m.id} className="member">
              <span className="avatar">{m.name[0]}</span>
              {m.name}
              {m.host && <em>host</em>}
            </div>
          ))}
        </div>
      </section>

      {p.isHost && p.suggestions.length > 0 && (
        <section className="panel-card">
          <h2>Suggestions</h2>
          {p.suggestions.map((s, i) => (
            <div key={i} className="track-row">
              {s.track.art && <img className="cover" src={s.track.art} width={44} alt="" />}
              <div className="meta">
                <div className="title">{s.track.name}</div>
                <div className="sub">
                  {s.track.artist} · from {s.from}
                </div>
              </div>
              <button
                className="chip"
                onClick={() => {
                  act(() => Spotify.enqueue(s.track.uri));
                  p.set({ suggestions: p.suggestions.filter((_, j) => j !== i) });
                }}
              >
                Queue
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="panel-card">
        <h2>Live feed</h2>
        {p.feed.map((f, i) => (
          <div key={i} className="feed-line">
            {f}
          </div>
        ))}
        {!p.isHost && <p className="muted">Tip: tap the 👥 icon next to any song to suggest it to the host.</p>}
      </section>
    </div>
  );
}
