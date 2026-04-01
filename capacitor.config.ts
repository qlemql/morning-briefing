import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.morningbriefing.app',
  appName: '아침 브리핑',
  webDir: 'out',
  server: {
    url: 'https://morning-briefing-mocha.vercel.app',
    cleartext: false,
  },
  ios: {
    scheme: '아침브리핑',
    contentInset: 'automatic',
  },
};

export default config;
