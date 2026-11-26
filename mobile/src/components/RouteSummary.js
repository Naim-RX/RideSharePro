import { StyleSheet, Text, View } from 'react-native';
import { PlaceAttributions } from './LocationField';
import { borders, colors, spacing, typography } from '../theme';

export default function RouteSummary({ pickup, destination, estimate }) {
  return <View style={styles.box}>
    <Text style={styles.label}>Pickup</Text><Text style={styles.text}>{pickup.label}</Text>
    <Text style={styles.label}>Destination</Text><Text style={styles.text}>{destination.label}</Text>
    {estimate ? <>
      <Text style={styles.text}>{(estimate.distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.ceil(estimate.durationSeconds / 60))} min</Text>
      <Text style={styles.label}>{estimate.mode === 'TWO_WHEELER' ? 'Motorcycle route estimate' : 'Driving-route estimate'}</Text>
      <Text style={styles.label}>{estimate.mode === 'TWO_WHEELER' ? 'Two-wheel routes are in beta and might sometimes be missing clear sidewalks, pedestrian paths, or bicycling paths. Use caution and follow local road rules.' : 'Motorcycle routing was unavailable. This driving-route estimate may differ for motorcycles.'}</Text>
      <Text style={styles.attribution}>Google Maps</Text>
      <PlaceAttributions place={pickup} /><PlaceAttributions place={destination} />
    </> : null}
  </View>;
}
const styles = StyleSheet.create({ box: { ...borders.default, padding: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface }, label: { ...typography.caption, color: colors.secondary }, text: { ...typography.body, color: colors.text }, attribution: { fontSize: 12, color: '#5E5E5E' } });
