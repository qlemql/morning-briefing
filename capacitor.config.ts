import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.morningbriefing.app',
  appName: '아침 브리핑',
  webDir: 'out',
  server: {
    url: 'https://morning-briefing-mocha.vercel.app',
    cleartext: false,
  },
  backgroundColor: '#f5f5f7',
  ios: {
    scheme: 'App',
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#f5f5f7',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#f5f5f7',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
