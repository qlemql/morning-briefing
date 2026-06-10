import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qlemql.morningbriefing',
  appName: '아침 브리핑',
  webDir: 'out',
  server: {
    url: 'https://morning-briefing-mocha.vercel.app',
    cleartext: false,
  },
  backgroundColor: '#f5f5f7',
  ios: {
    scheme: 'App',
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#f5f5f7',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#f5f5f7',
    // 원격 URL(server.url)을 https로 로드 — 평문 트래픽 차단 유지
    allowMixedContent: false,
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
