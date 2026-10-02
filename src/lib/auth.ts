// Spotify Authorization Code + PKCE. No client secret, safe for web and native.
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const REDIRECT_URI =
  (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) ?? `${location.origin}/callback`;

export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
].join(' ');

const KEY = 'pulse.token';
const VERIFIER = 'pulse.verifier';

type Token = { access_token: string; refresh_token: string; expires_at: number };

export const isConfigured = () => Boolean(CLIENT_ID);

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function login() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  localStorage.setItem(VERIFIER, verifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });
  const url = `https://accounts.spotify.com/authorize?${params}`;
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    location.assign(url);
  }
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID!, ...body }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const j = await res.json();
  const prev = read();
  const t: Token = {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? prev?.refresh_token,
    expires_at: Date.now() + (j.expires_in - 60) * 1000,
  };
  localStorage.setItem(KEY, JSON.stringify(t));
  return t;
}

export async function handleCallback(url: string) {
  const code = new URL(url).searchParams.get('code');
  const verifier = localStorage.getItem(VERIFIER);
  if (!code || !verifier) return false;
  await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier });
  localStorage.removeItem(VERIFIER);
  return true;
}

function read(): Token | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

/** Synchronous token read for unload handlers, which cannot await a refresh. */
export function peekToken(): string | null {
  const t = read();
  return t && Date.now() < t.expires_at ? t.access_token : null;
}

let refreshing: Promise<Token> | null = null;

export async function getToken(): Promise<string | null> {
  const t = read();
  if (!t) return null;
  if (Date.now() < t.expires_at) return t.access_token;
  refreshing ??= tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token }).finally(
    () => (refreshing = null),
  );
  return (await refreshing).access_token;
}

export function logout() {
  localStorage.removeItem(KEY);
  location.assign('/');
}
