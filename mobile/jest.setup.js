// Provide native safe-area measurements in the JavaScript test environment.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Map = React.forwardRef(function MockMap(props, ref) {
    React.useImperativeHandle(ref, () => ({ fitToCoordinates: jest.fn(), animateToRegion: jest.fn() }));
    return <View {...props} />;
  });
  return { __esModule: true, default: Map, Marker: View, Polyline: View, PROVIDER_GOOGLE: 'google' };
});
