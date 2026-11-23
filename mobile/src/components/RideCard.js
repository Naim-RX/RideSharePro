import { StyleSheet, Text, View } from 'react-native';
import SecondaryButton from './SecondaryButton';
import StatusBadge from './StatusBadge';
import { borders, colors, spacing, typography } from '../theme';

// Presentation only. Labels are formatted by the caller; no ride operations run here.
export default function RideCard({ ride, onPress, actionLabel = 'View ride', disabled = false }) {
  return (
    <View style={styles.card}>
      <StatusBadge status={ride.status || 'open'} />
      <View style={styles.location}><Text style={styles.label}>Pickup</Text><Text style={styles.body}>{ride.pickupLabel}</Text></View>
      <View style={styles.location}><Text style={styles.label}>Destination</Text><Text style={styles.body}>{ride.destinationLabel}</Text></View>
      {ride.distanceLabel || ride.durationLabel ? <Text style={styles.meta}>{[ride.distanceLabel, ride.durationLabel].filter(Boolean).join(' · ')}</Text> : null}
      {ride.fareLabel ? <Text style={styles.fare}>{ride.fareLabel}</Text> : null}
      {onPress ? <SecondaryButton title={actionLabel} onPress={onPress} disabled={disabled} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...borders.default, padding: spacing.sm, gap: spacing.sm, backgroundColor: colors.surface },
  location: { gap: spacing.xs },
  label: { ...typography.label, color: colors.secondary },
  body: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.secondary },
  fare: { ...typography.subheading, color: colors.text },
});
