import type { CapacitorConfig } from '@capacitor/cli';

// RY_WRAPPER=1 builds the "wrapper" APK: the app opens Spotify's own web player (open.spotify.com)
// full screen. Any account works, free included (with Spotify's normal ads); no developer app needed.
const wrapper = process.env.RY_WRAPPER === '1';

const config: CapacitorConfig = {
  appId: 'app.rymusic.player',
  appName: 'RY Music',
  webDir: 'dist',
  backgroundColor: '#0a0805',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
  ...(wrapper && {
    server: {
      url: 'https://open.spotify.com',
      // Spotify's login pages, including "Continue with Google / Facebook / Apple".
      allowNavigation: ['*.spotify.com', 'spotify.com', 'accounts.google.com', '*.facebook.com', 'appleid.apple.com'],
    },
  }),
};

export default config;
