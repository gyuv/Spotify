import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rymusic.player',
  appName: 'RY Music',
  webDir: 'dist',
  backgroundColor: '#0a0805',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
};

export default config;
