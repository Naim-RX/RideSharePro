import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, sizes, spacing, typography } from '../theme';

export default function ScreenHeader({ title, subtitle, onBack, backLabel = 'Back' }) {
  return (
    <View style={styles.container}>
      {onBack ? <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.back}><Text style={styles.link}>Back</Text></Pressable> : null}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  back: { minHeight: sizes.buttonHeight, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: spacing.sm },
  link: { ...typography.button, color: colors.primary },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.secondary },
});
