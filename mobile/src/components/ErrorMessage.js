import { StyleSheet, Text, View } from 'react-native';
import SecondaryButton from './SecondaryButton';
import { colors, spacing, typography } from '../theme';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return <View style={styles.container}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>{onRetry ? <SecondaryButton title="Try again" onPress={onRetry} /> : null}</View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  text: { ...typography.body, color: colors.danger },
});
