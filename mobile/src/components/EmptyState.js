import { StyleSheet, Text, View } from 'react-native';
import SecondaryButton from './SecondaryButton';
import { colors, spacing, typography } from '../theme';

export default function EmptyState({ title = 'Nothing here yet', message, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <SecondaryButton title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, paddingVertical: spacing.md },
  title: { ...typography.subheading, color: colors.text },
  message: { ...typography.body, color: colors.secondary },
});
