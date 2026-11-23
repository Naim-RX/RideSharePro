import { StyleSheet, Text, View } from 'react-native';
import { borders, colors, spacing, typography } from '../theme';

const tones = {
  neutral: { backgroundColor: colors.background, color: colors.secondary },
  info: { backgroundColor: colors.primarySoft, color: colors.primary },
  success: { backgroundColor: colors.successSoft, color: colors.success },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  error: { backgroundColor: colors.dangerSoft, color: colors.danger },
};
const statuses = { open: 'info', assigned: 'info', in_progress: 'info', pending: 'warning', accepted: 'success', completed: 'success', cancelled: 'neutral', rejected: 'neutral' };

export default function StatusBadge({ status = 'open', label, tone }) {
  const appearance = tones[tone || statuses[status]] || tones.neutral;
  const text = label || status.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  return <View style={[styles.badge, { backgroundColor: appearance.backgroundColor }]}><Text style={[styles.label, { color: appearance.color }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { ...borders.default, alignSelf: 'flex-start', padding: spacing.xs },
  label: { ...typography.label },
});
