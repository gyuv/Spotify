# Android TV

The Android APK is already TV-ready:
- `LEANBACK_LAUNCHER` intent, so it appears on the TV home screen.
- A gold **TV banner** (`res/drawable/tv_banner.xml`).
- The touchscreen is marked not required.
- `MainActivity` detects TV mode and switches the app to the 10-foot **TV layout**.

## Install on a TV
1. Build the APK (see [ANDROID.md](ANDROID.md)).
2. On the TV, open **Settings → Device Preferences → About** and click *Build* 7 times to enable developer mode. Then turn on **USB / network debugging**.
3. Install it: `adb connect <tv-ip>:5555 && adb install -r android/app/build/outputs/apk/release/app-release.apk`.

You can also use the Android TV emulator in Android Studio (*Television 1080p* device).

## Remote controls
| Key | Action |
| --- | --- |
| D-pad | Move focus spatially |
| OK | Select / play |
| Back | Close the Live stage, or go back |
| Play/Pause, ⏭, ⏮ | Transport controls |

After 20 s idle while playing, the **Live stage** takes over as an ambient screensaver.

## Signing in on a TV
Typing on a TV is painful, so the easiest way is to sign in once with **adb** + `scrcpy`, or use a
Bluetooth keyboard. Audio plays through the Spotify TV app (Connect). Pick the TV under the speaker icon.

## Web on a TV
You can also open the hosted web app in a TV browser with `?layout=tv`.
