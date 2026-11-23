import { StyleSheet } from 'react-native';
import { colors, sizes, spacing, typography } from '../../theme';

export default StyleSheet.create({
  form: { gap: spacing.sm },
  heading: { paddingTop: spacing.md },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  footerText: { ...typography.body, color: colors.secondary },
  link: { minHeight: sizes.buttonHeight, justifyContent: 'center', paddingHorizontal: spacing.xs },
  linkText: { ...typography.button, color: colors.primary },
  note: { ...typography.caption, color: colors.secondary },
  notice: { ...typography.body, color: colors.primary },
});
