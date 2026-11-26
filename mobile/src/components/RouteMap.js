import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, borders } from '../theme';

export default function RouteMap({ pickup, destination, coordinates }) {
  const map = useRef(null); const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) map.current?.fitToCoordinates(coordinates, { edgePadding: { top: 48, right: 40, bottom: 60, left: 40 }, animated: false });
  }, [coordinates, ready]);
  return <View style={{ ...borders.default, height: 320, overflow: 'hidden' }}>
    <MapView ref={map} provider={PROVIDER_GOOGLE} style={{ flex: 1 }} onMapReady={() => setReady(true)}
      initialRegion={{ ...pickup, latitudeDelta: 0.05, longitudeDelta: 0.05 }} showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false}>
      <Marker coordinate={pickup} title="Pickup" pinColor={colors.primary} /><Marker coordinate={destination} title="Destination" />
      <Polyline coordinates={coordinates} strokeColor={colors.primary} strokeWidth={4} />
    </MapView>
  </View>;
}
