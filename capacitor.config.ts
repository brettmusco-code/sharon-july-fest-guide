import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sharonma.july4th',
  appName: 'Sharon Independence Day',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // We hide it manually from JS once the shell mounts.
      launchAutoHide: false,
      launchShowDuration: 2000,
      backgroundColor: '#c5202e', // brand red — matches --primary
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      // iOS uses the LaunchScreen storyboard; this controls Android.
    },
    StatusBar: {
      style: 'DARK', // light content (white icons) on dark/red bar
      backgroundColor: '#c5202e',
      overlaysWebView: false,
    },
  },
};

export default config;
