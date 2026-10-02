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
   | `VITE_YOUTUBE_API_KEY` | Optional: enables Motion (music video) mode |
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
