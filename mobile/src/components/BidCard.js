import { StyleSheet, Text, View } from 'react-native';
import PrimaryButton from './PrimaryButton';
import StatusBadge from './StatusBadge';
import { borders, colors, spacing, typography } from '../theme';

export default function BidCard({ bid, onSelect, disabled = false, loading = false }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{bid.bikerName}</Text>
      {bid.motorcycleLabel ? <Text style={styles.meta}>{bid.motorcycleLabel}</Text> : null}
      {bid.ratingLabel ? <Text style={styles.meta}>Rating: {bid.ratingLabel}</Text> : null}
      <StatusBadge status={bid.status || 'pending'} />
      <Text style={styles.fare}>{bid.fareLabel}</Text>
      {onSelect ? <PrimaryButton title="Select biker" onPress={onSelect} disabled={disabled} loading={loading} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...borders.default, padding: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface },
  name: { ...typography.subheading, color: colors.text },
  meta: { ...typography.caption, color: colors.secondary },
  fare: { ...typography.subheading, color: colors.primary, marginVertical: spacing.xs },
});
