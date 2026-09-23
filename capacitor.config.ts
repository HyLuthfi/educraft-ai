import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.educraft.ai',
  appName: 'EduCraft AI',
  webDir: 'public',
  server: {
    url: 'https://educraft.mahya.uno',
    cleartext: true,
    errorPath: 'offline.html',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#0F0F11',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F0F11',
    },
  },
};

export default config;
