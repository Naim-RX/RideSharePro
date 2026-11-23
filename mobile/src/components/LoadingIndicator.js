import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

export default function LoadingIndicator({ label = 'Loading…' }) {
  return <View accessibilityLiveRegion="polite" style={styles.container}><ActivityIndicator accessibilityRole="progressbar" accessibilityLabel={label} color={colors.primary} /><Text style={styles.label}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm, alignItems: 'center', gap: spacing.xs },
  label: { ...typography.body, color: colors.secondary },
});
