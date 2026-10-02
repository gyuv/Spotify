# Android (phones and tablets)

The `android/` folder is a ready Capacitor project with the gold RY icons, the `rymusic://callback`
deep link, and Android TV support built into the same APK.

## Requirements
- Android Studio (Ladybug or newer) and JDK 17+
- Node 20+

## Build and run
```bash
npm install
cp .env.example .env
# In .env set: VITE_SPOTIFY_REDIRECT_URI=rymusic://callback
npm run android          # builds the web app, syncs it, and opens Android Studio
```
In Android Studio, press **Run ▶** with a phone or emulator attached.

Release APK or AAB: **Build → Generate Signed App Bundle / APK**.
Command line: `cd android && ./gradlew assembleRelease`.

## Spotify setup
- Add `rymusic://callback` as a Redirect URI in the Spotify dashboard.
- Add the **Android package** `app.rymusic.player` and your signing SHA-1 under *Android packages*.

## How audio works on Android
Spotify doesn't let its Web Playback SDK run inside an Android WebView. RY Music is therefore a
premium **remote** for the official Spotify app.
1. Install Spotify on the phone and play anything once, so the phone shows up as a Connect device.
2. In RY Music, tap the **speaker** icon and pick the phone, or any speaker or TV.

Background play, the lock screen, Bluetooth and Android Auto then work through Spotify's own service.
