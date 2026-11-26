module.exports = {
  expo: {
    name: 'RideShare Pro',
    slug: 'rideshare-pro',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    backgroundColor: '#F7F8FA',
    plugins: [['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || '' }], './plugins/withWindowsCMake'],
    extra: { googleMapsAndroidConfigured: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY) },
    android: { package: 'com.ridesharepro.app', softwareKeyboardLayoutMode: 'resize' },
    ios: { bundleIdentifier: 'com.ridesharepro.app', supportsTablet: true },
  },
};
