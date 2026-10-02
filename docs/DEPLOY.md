# Deploying the web app on Vercel

The repo includes a `vercel.json`. It sets the Vite build, routes `/callback` and invite links like
`/?party=CODE` to the app, and sets long-term caching for hashed assets.

## One-time setup
1. Import the GitHub repo into Vercel. The project is already created as **`ry-music`**, and every
   push to the default branch redeploys it.
2. Go to **Project → Settings → Environment Variables** and add these for Production and Preview:

   | Key | Value |
   | --- | --- |
   | `VITE_SPOTIFY_CLIENT_ID` | Your Spotify app's Client ID (required) |
   | `YOUTUBE_API_KEY` (server-only, no `VITE_` prefix) | Optional: enables Motion (music video) mode |
   | `VITE_PARTY_URL` | Optional: `wss://…` URL of your Party server (see below) |

   Leave `VITE_SPOTIFY_REDIRECT_URI` unset. The app uses `https://<your-domain>/callback` automatically.
3. In the [Spotify dashboard](https://developer.spotify.com/dashboard), add the Redirect URI
   `https://<your-vercel-domain>/callback`. For this project: `https://ry-music.vercel.app/callback`.
4. Redeploy (**Deployments → ⋯ → Redeploy**). `VITE_*` variables are baked in at build time.

## Party Rooms server
Vercel's serverless functions can't keep WebSocket connections open, so `server/party.mjs` needs a
small always-on Node host such as Render, Railway or Fly.io. Deploy it there, then set `VITE_PARTY_URL` in Vercel.
Everything else (lyrics, crossfade, the player and stats) runs entirely in the browser.

## Install it as an app
Open the site on a phone and choose **Add to Home Screen** (iOS Safari) or **Install app**
(Android Chrome). It launches full-screen with the gold RY icon.

## Optional extras, step by step
**Party Rooms server (free, about 3 min):** Go to render.com → New → **Blueprint** → choose this repo. `render.yaml` sets
everything up. Copy the service URL, change `https://` to `wss://`, and set it as `VITE_PARTY_URL` in Vercel. Then redeploy.
The free plan sleeps when idle, so the first connection takes about 30 s.

**Music videos (about 3 min):** Go to console.cloud.google.com → create a project → enable **YouTube Data API v3** →
Credentials → **Create API key**. Restrict it to the `ry-music.vercel.app` website, then add it as `YOUTUBE_API_KEY` (server-only, no `VITE_` prefix) in Vercel and redeploy.

**Android / Android TV APK (no Android Studio needed):** Go to GitHub → repo **Settings → Secrets → Actions** and add
`VITE_SPOTIFY_CLIENT_ID` (plus `VITE_PARTY_URL` if you use Party Rooms). Every push then builds an APK under **Actions → Android APK → Artifacts**.
Install it on a phone, or on a TV with `adb install`. Also add `rymusic://callback` as a Redirect URI in Spotify.

**iOS:** Apple requires a Mac with Xcode and a paid developer account to install native apps. Without one, open
https://ry-music.vercel.app in Safari and choose **Share → Add to Home Screen**, which gives you the full app with the gold icon.

## Troubleshooting
- **"Active premium subscription required for the owner of the app"**: Spotify only lets an app in
  Development mode work if the Spotify account that *created the app* on developer.spotify.com has Premium.
  Upgrade that account, or recreate the app under an account that has Premium, and update `VITE_SPOTIFY_CLIENT_ID`.
- **"redirect_uri: Not matching configuration"**: add `https://ry-music.vercel.app/callback` to the app's
  Redirect URIs, click Save, and open the site at exactly that domain.
