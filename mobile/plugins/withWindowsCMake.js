const { withGradleProperties } = require('expo/config-plugins');

// Expo's SDK 58 guidance: CMake 3.31.6 ships Ninja 1.12.1, which supports
// Windows long paths. Linux/EAS builds retain Expo's default CMake version.
module.exports = function withWindowsCMake(config) {
  if (process.platform !== 'win32') return config;
  return withGradleProperties(config, result => {
    const key = 'android.cmakeVersion';
    result.modResults = result.modResults.filter(item => item.key !== key);
    result.modResults.push({ type: 'property', key, value: '3.31.6' });
    return result;
  });
};
