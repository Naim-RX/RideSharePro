import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { borders, colors, sizes, spacing, typography } from '../theme';

export default function Button({ title, onPress, disabled = false, loading = false, variant = 'primary', testID }) {
  const unavailable = disabled || loading;
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      accessibilityLabel={title}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || unavailable) && styles.dimmed]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.primary : colors.surface} /> : null}
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { ...borders.default, borderColor: colors.primary, minHeight: sizes.buttonHeight, padding: spacing.xs, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  label: { ...typography.button, color: colors.surface, flexShrink: 1 },
  secondaryLabel: { color: colors.primary },
  dimmed: { opacity: 0.6 },
});
