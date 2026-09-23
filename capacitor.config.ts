import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.scrollshield.mobile',
  appName: 'ScrollShield',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      // res/drawable/ic_stat_shield.xml – a status bar icon must be monochrome.
      smallIcon: 'ic_stat_shield',
    },
  },
};

export default config;
