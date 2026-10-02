# iOS / iPadOS guide

The `ios/` folder is a ready Capacitor project (Swift Package Manager) with the gold icons and the
`rymusic://` URL scheme registered in `Info.plist`.

## Option A: native app (Xcode)
Requires a Mac with Xcode 16+ and an Apple Developer account for device installs.
```bash
npm install
cp .env.example .env   # VITE_SPOTIFY_REDIRECT_URI=rymusic://callback
npm run ios            # builds the web app, syncs it, and opens Xcode
```
1. In Xcode, select the **App** target. Under *Signing & Capabilities*, pick your Team.
2. Optional: enable **Background Modes → Audio** for richer Now Playing behaviour.
3. Connect your iPhone and press **Run ▶**.
4. In the Spotify dashboard, add `rymusic://callback` and the **iOS bundle ID** `app.rymusic.player`.

Distribution: **Product → Archive → Distribute App** (TestFlight or the App Store).

## Option B: install as a web app (no Mac needed)
1. Deploy `dist/` to any HTTPS host (Vercel, Netlify, Cloudflare Pages).
2. Add `https://your-domain/callback` as a Redirect URI.
3. On the iPhone, open it in **Safari → Share → Add to Home Screen**.

It launches full-screen with the gold icon and the mobile layout.

## How audio works on iOS
Like Android, iOS doesn't allow Spotify's SDK in Safari or WebViews. RY Music controls the
**Spotify app** (or AirPlay and Connect speakers) as a remote. Install Spotify, play something once,
then pick the iPhone from the speaker menu in RY Music. The lock screen, CarPlay and AirPods controls
all keep working.
