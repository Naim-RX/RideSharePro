export const colors = {
  primary: '#165BB4',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#20242A',
  secondary: '#667085',
  border: '#E5E7EB',
  danger: '#B42318',
  success: '#17663A',
  primarySoft: '#EEF4FC',
  successSoft: '#ECF8F0',
  dangerSoft: '#FFF1F0',
  warning: '#854A0E',
  warningSoft: '#FFF6E8',
  overlay: 'rgba(32, 36, 42, 0.45)',
};

export const spacing = { xs: 8, sm: 16, md: 24, lg: 32, xl: 40 };
export const radius = { sm: 8, md: 12 };
export const sizes = { buttonHeight: 48, inputHeight: 52, screenPadding: 16, contentWidth: 480 };

// No fontFamily override: Android and iOS use their system fonts.
export const typography = {
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  subheading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  button: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 14, lineHeight: 20 },
};

export const borders = {
  default: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.danger },
};
